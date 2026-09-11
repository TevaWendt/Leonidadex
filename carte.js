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
  const W = 5200, H = 6000;

  /* échelle provisoire : 1 unité de carte = 2,4 mètres dans le jeu.
     À recaler avec les vraies distances après le 19 novembre. */
  const METRES_PAR_UNITE = 2.2;

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
    region:      { nom:'Régions',            col:'#E8452C' },
    ville:       { nom:'Villes',             col:'#F5A524' },
    quartier:    { nom:'Quartiers',          col:'#D96A2C' },
    comte:       { nom:'Comtés',             col:'#8A6A45' },
    batiment:    { nom:'Bâtiments identifiés',col:'#5B4E8C' },
    transport:   { nom:'Transports',         col:'#2F6F8F' },
    nature:      { nom:'Nature et relief',   col:'#4C7A50' },
    lieu:        { nom:'Lieux notables',     col:'#B5762A' },
    collectible: { nom:'Collectibles',       col:'#C2452C' },
    planque:     { nom:'Planques',           col:'#A85B33' },
    mission:     { nom:'Missions',           col:'#CE4B33' }
  };

  /* ---- points confirmés par Rockstar ----
     Positions approximatives, à recaler sur le fond définitif. */
  const POINTS = [
    /* ============ RÉGIONS OFFICIELLES ============ */
    { id:'vice-city', n:'Vice City', c:'ville', x:3560, y:4180, s:'officiel', src:'SITE', z:0,
      d:"La métropole de Leonida et le cœur du jeu. Rockstar la présente comme la capitale ensoleillée et festive du pays, et comme la ville la plus dense jamais construite par le studio." },
    { id:'leonida-keys', n:'Leonida Keys', c:'region', x:2200, y:5560, s:'officiel', src:'SITE', z:0,
      d:"Archipel tropical au sud de l'État, relié par de longues routes au-dessus de l'eau. Plongée, pêche, navigation et contrebande." },
    { id:'grassrivers', n:'Grassrivers', c:'region', x:2700, y:4700, s:'officiel', src:'SITE', z:0,
      d:"La grande zone humide de Leonida. Végétation dense, visibilité réduite, hydroglisseurs et alligators." },
    { id:'port-gellhorn', n:'Port Gellhorn', c:'ville', x:640, y:1380, s:'officiel', src:'SITE', z:0,
      d:"Ville côtière qui a connu des jours meilleurs. Motels bon marché, attractions fermées et économie souterraine." },
    { id:'ambrosia', n:'Ambrosia', c:'region', x:3520, y:2660, s:'officiel', src:'SITE', z:0,
      d:"Comté rural et industriel. La raffinerie Allied Crystal fournit les emplois, le gang de motards local fournit à peu près tout le reste." },
    { id:'mount-kalaga', n:'Mount Kalaga National Park', c:'region', x:3480, y:1220, s:'officiel', src:'SITE', z:0,
      d:"Parc national à la frontière nord, construit autour de la chasse, de la pêche et des pistes tout-terrain. Dans son arrière-pays, une population qui vit volontairement loin des autorités." },

    /* ============ VICE CITY : QUARTIERS ============ */
    { id:'ocean-beach', n:'Ocean Beach', c:'quartier', x:3900, y:4300, s:'officiel', src:'SITE', p:'vice-city', z:1,
      d:"Quartier nommé par Rockstar : hôtels art déco pastel, sable blanc, promenade bordée de palmiers. C'est la scène d'ouverture du premier trailer." },
    { id:'little-cuba', n:'Little Cuba', c:'quartier', x:3400, y:4360, s:'officiel', src:'SITE', p:'vice-city', z:1,
      d:"Quartier nommé par Rockstar, connu pour ses boulangeries et sa culture cubano-américaine." },
    { id:'vice-beach', n:'Vice Beach', c:'quartier', x:3940, y:4060, s:'officiel', src:'T1', p:'vice-city', z:1,
      d:"Île-barrière reliée au continent par une chaussée. Seule sous-région de Vice City confirmée par les supports officiels." },
    { id:'south-beach', n:'South Beach', c:'quartier', x:3920, y:4180, s:'vu', src:'T1', p:'vice-city', z:1,
      d:"Bande de front de mer où se concentrent bars et hôtels illuminés au néon. Plusieurs plans nocturnes des trailers en proviennent." },
    { id:'downtown', n:'Downtown', c:'quartier', x:3560, y:4120, s:'vu', src:'T2', p:'vice-city', z:1,
      d:"Le centre financier : tours de verre et autoroutes surélevées, visibles dans les plans aériens du second trailer." },
    { id:'stockyard', n:'Stockyard', c:'quartier', x:3460, y:3980, s:'vu', src:'T1', p:'vice-city', z:1,
      d:"Quartier d'entrepôts reconvertis, couverts de fresques. Un rassemblement automobile s'y déroule dans le premier trailer." },
    { id:'vc-port', n:'Port de Vice City', c:'transport', x:3640, y:4460, s:'vu', src:'T1', p:'vice-city', z:1,
      d:"Zone portuaire industrielle : conteneurs, entrepôts et ponts, aperçue dans les deux trailers." },
    { id:'marina', n:'Marina', c:'quartier', x:3780, y:4440, s:'vu', src:'T2', p:'vice-city', z:1,
      d:"Secteur résidentiel aisé au bord de l'eau : bateaux, jet-skis et propriétés de luxe." },
    { id:'vcia', n:'Aéroport international', c:'transport', x:3300, y:4240, s:'vu', src:'T2', p:'vice-city', z:1,
      d:"Principal aéroport de la ville, identifié par le train VCIA aperçu dans le second trailer." },
    { id:'causeway', n:'Chaussée de Vice Beach', c:'transport', x:3760, y:4150, s:'vu', src:'T1', p:'vice-city', z:1,
      d:"Pont-chaussée reliant le continent à l'île de Vice Beach, avec péage à l'entrée." },

    /* ============ VICE CITY : BÂTIMENTS IDENTIFIÉS ============ */
    { id:'galina-opera', n:'Galina Ballet Opera House', c:'batiment', x:3580, y:4090, s:'vu', src:'T2', p:'downtown', z:2,
      d:"Opéra à la silhouette anguleuse et au parvis animé, rapproché par les observateurs de l'Adrienne Arsht Center." },
    { id:'sahara-arena', n:'Sahara Arena', c:'batiment', x:3620, y:4160, s:'vu', src:'T2', p:'downtown', z:2,
      d:"Salle omnisports au bord de l'eau, domicile des Vice City Narcos. Forme rapprochée de la Kaseya Center." },
    { id:'twin-towers', n:'Tours jumelles', c:'batiment', x:3540, y:4140, s:'vu', src:'T2', p:'downtown', z:2,
      d:"Double tour reliée par un toit ajouré, rapprochée du 500 Brickell." },
    { id:'autograph-flight', n:'Autograph Flight Support', c:'batiment', x:3280, y:4270, s:'vu', src:'T2', p:'vcia', z:2,
      d:"Terminal d'aviation privée au toit débordant et à la façade vitrée incurvée." },
    { id:'tisha-wocka', n:'Tisha-Wocka Flea Market', c:'lieu', x:3900, y:4230, s:'vu', src:'T1', p:'south-beach', z:2,
      d:"Marché aux puces nommé dans les supports officiels, près de South Beach." },
    { id:'ptt-youngin', n:'PTT YOUNGIN$', c:'lieu', x:3440, y:4340, s:'officiel', src:'SITE', p:'little-cuba', z:2,
      d:"Boutique de biens illicites, lieu d'une mission exclusive à l'Édition Ultime." },
    { id:'penthouse', n:'Penthouse de Vice Beach', c:'batiment', x:3960, y:4020, s:'vu', src:'T1', p:'vice-beach', z:2,
      d:"Terrasse de luxe avec piscine privée et douche extérieure, rapprochée de la Trésor Tower." },
    { id:'jade-condos', n:'Tours ondulées', c:'batiment', x:3970, y:3960, s:'vu', src:'T1', p:'vice-beach', z:2,
      d:"Immeubles à la façade en vagues, visibles dans la skyline de Vice Beach." },

    /* ============ AUTRES VILLES ============ */
    { id:'waning-sands', n:'Waning Sands', c:'ville', x:2760, y:3460, s:'vu', src:'T1', z:0,
      d:"Banlieue tentaculaire : voies rapides, centres commerciaux et vastes parkings." },
    { id:'hamlet', n:'Hamlet', c:'ville', x:2560, y:5080, s:'vu', src:'T1', z:0,
      d:"Localité nommée dans le premier trailer, dans une scène de rue résidentielle." },
    { id:'key-lento', n:'Key Lento', c:'quartier', x:2480, y:5480, s:'officiel', src:'T2', p:'leonida-keys', z:1,
      d:"Île nommée dans l'archipel des Leonida Keys." },

    /* ============ LIEUX NOTABLES ============ */
    { id:'allied-crystal', n:'Raffinerie Allied Crystal', c:'lieu', x:3620, y:2720, s:'officiel', src:'SITE', p:'ambrosia', z:1,
      d:"Raffinerie de sucre citée par Rockstar comme le principal employeur d'Ambrosia." },
    { id:'state-prison', n:'Pénitencier d\'État', c:'lieu', x:3260, y:2340, s:'vu', src:'T1', z:0,
      d:"Prison d'État d'où Lucia sort au début de l'histoire. Rapprochée de la Florida State Prison. Nom exact non confirmé." },
    { id:'tv-tower', n:'Tour de télévision', c:'batiment', x:1400, y:1160, s:'spec', src:'COMM', z:0,
      d:"Hypothèse communautaire d'une très haute antenne, inspirée de la tour WTVY. Non confirmée." },

    /* ============ COMTÉS ============ */
    { id:'vice-dale', n:'Comté de Vice-Dale', c:'comte', x:3400, y:3820, s:'vu', src:'T1', z:0,
      d:"Déduit du marquage Vice-Dale Police Department sur un véhicule de police." },
    { id:'leonard-county', n:'Comté de Leonard', c:'comte', x:2500, y:3100, s:'vu', src:'T1', z:0,
      d:"Identifié par le bureau du shérif du comté de Leonard. Contient Waning Sands." },
    { id:'kelly-county', n:'Comté de Kelly', c:'comte', x:1200, y:2000, s:'vu', src:'T1', z:0,
      d:"Nommé sur un panneau routier. L'une des zones les moins documentées." },
    { id:'mariana-county', n:'Comté de Mariana', c:'comte', x:2500, y:4900, s:'spec', src:'COMM', z:0,
      d:"Comté avancé par la communauté pour la zone des Grassrivers. Non confirmé." },

    /* ============ NATURE ============ */
    { id:'grand-lac', n:'Grand lac intérieur', c:'nature', x:3200, y:3700, s:'spec', src:'COMM', z:0,
      d:"Étendue d'eau centrale déduite des images. Ni son nom ni ses contours ne sont confirmés." },
    { id:'kalaga-summit', n:'Sommet du Kalaga', c:'nature', x:3480, y:1120, s:'spec', src:'COMM', p:'mount-kalaga', z:1,
      d:"Point culminant supposé du parc national." },
    { id:'gloriana', n:'Gloriana', c:'region', x:1900, y:900, s:'spec', src:'COMM', z:0,
      d:"Nom aperçu sur des plaques d'immatriculation. Rockstar n'a jamais annoncé qu'il s'agissait d'une région explorable." }
  ];

  /* ============================================================
     ÉTAT
     ============================================================ */
  let scale = 0.21, minS = 0.10, maxS = 3.0;
  let tx = 0, ty = 0;
  let found = {};
  let visible = {};
  let rulerOn = false;
  let rulerPts = [];

  Object.keys(CATS).forEach(k => visible[k] = true);
  let visStatut = { officiel:true, vu:true, spec:true };
  let visSource = { SITE:true, T1:true, T2:true, EL:true, SHOT:true, COMM:true };

  /* niveau de zoom minimal pour voir chaque profondeur de la hiérarchie */
  const ZOOM_NIVEAU = [0, 0.42, 0.85];
  let expanded = {};      /* parents dépliés manuellement */

  function niveauVisible(p){
    if(!p.z) return true;
    if(scale >= ZOOM_NIVEAU[p.z]) return true;
    /* un enfant reste visible si son parent est déplié */
    let cur = p;
    while(cur && cur.p){
      if(expanded[cur.p]) return true;
      cur = POINTS.find(x => x.id === cur.p);
    }
    return false;
  }

  function enfants(id){ return POINTS.filter(x => x.p === id); }

  try{
    found = JSON.parse(localStorage.getItem('lk_map_found') || '{}');
  }catch(e){ found = {}; }

  function save(){
    try{ localStorage.setItem('lk_map_found', JSON.stringify(found)); }catch(e){}
  }

  /* ============================================================
     RENDU
     ============================================================ */
  let applyTransform = function(){
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    if(zoomLbl) zoomLbl.textContent = Math.round(scale * 100) + ' %';
    layer.style.setProperty('--inv', (1 / scale));
    drawLine();
    updateScaleBar();
    syncHash();
    if(typeof cluster === 'function') clusterSoon();
  };

  let clTimer = null;
  function clusterSoon(){
    clearTimeout(clTimer);
    clTimer = setTimeout(refreshVisibility, 90);
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
    /* lien direct vers un lieu : #lieu=vice-city */
    const l = location.hash.match(/^#lieu=([\w-]+)$/);
    if(l){
      const p = POINTS.find(x => x.id === l[1]);
      if(p){ goTo(p, Math.max(0.6, ZOOM_NIVEAU[p.z || 0] + 0.2)); return true; }
    }
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
      const kids = enfants(p.id).length;
      el.className = 'mk mk--' + p.c + ' st-' + p.s + ' z' + (p.z||0)
                   + (found[p.id] ? ' is-found' : '') + (kids ? ' has-kids' : '');
      el.style.left = p.x + 'px';
      el.style.top  = p.y + 'px';
      el.dataset.id = p.id;
      el.dataset.cat = p.c;
      el.dataset.st = p.s;
      el.setAttribute('aria-label', p.n);
      el.innerHTML = '<span class="mk-dot">' + (kids ? '<i>' + kids + '</i>' : '') + '</span>'
                   + '<span class="mk-lbl">' + p.n + '</span>';
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
      const p = POINTS.find(x => x.id === el.dataset.id);
      el.hidden = !(p && visible[p.c] && visStatut[p.s] && visSource[p.src] && niveauVisible(p));
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

    const actifs = POINTS.filter(p => visible[p.c] && visStatut[p.s] && visSource[p.src] && niveauVisible(p));
    /* taille de case en unités de carte : ~64 px à l'écran */
    const taille = 64 / scale;

    /* au-delà d'un certain zoom, plus de regroupement */
    if(scale > 0.55 || actifs.length < 12){
      layer.querySelectorAll('.mk').forEach(function(el){
        const p = POINTS.find(x => x.id === el.dataset.id);
        if(p && visible[p.c] && visStatut[p.s] && visSource[p.src] && niveauVisible(p)) el.hidden = false;
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
    renderFound();
  }

  /* ---- liste des lieux repérés ---- */
  const fdList = document.getElementById('map-found-list');
  const fdCnt  = document.getElementById('map-found-count');

  function renderFound(){
    if(!fdList) return;
    const liste = POINTS.filter(p => found[p.id]);
    if(fdCnt) fdCnt.textContent = liste.length;

    if(!liste.length){
      fdList.innerHTML = '<p class="fd-empty">Aucun lieu repéré. Ouvre un marqueur et coche-le.</p>';
      return;
    }
    fdList.innerHTML = '<ul>' + liste.map(function(p){
      return '<li><button type="button" class="fd-go" data-goto="' + p.id + '">' +
             '<span class="fd-dot" style="background:' + CATS[p.c].col + '"></span>' +
             '<span class="fd-n">' + p.n + '</span></button>' +
             '<button type="button" class="fd-un" data-un="' + p.id + '" ' +
             'aria-label="Décocher ' + p.n + '" title="Décocher">&times;</button></li>';
    }).join('') + '</ul>';
  }

  if(fdList){
    fdList.addEventListener('click', function(e){
      const go = e.target.closest('[data-goto]');
      if(go){
        const p = POINTS.find(x => x.id === go.dataset.goto);
        if(p) goTo(p, Math.max(0.5, ZOOM_NIVEAU[p.z || 0] + 0.15));
        return;
      }
      const un = e.target.closest('[data-un]');
      if(un){
        delete found[un.dataset.un];
        save();
        const mk = layer.querySelector('[data-id="' + un.dataset.un + '"]');
        if(mk) mk.classList.remove('is-found');
        refreshProgress();
      }
    });
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
      (function(){
        const kids = enfants(p.id);
        const parent = p.p ? POINTS.find(x => x.id === p.p) : null;
        let h = '';
        if(parent){
          h += '<button type="button" class="mp-link" data-goto="' + parent.id + '">' +
               '&larr; ' + parent.n + '</button>';
        }
        if(kids.length){
          h += '<div class="mp-kids"><p class="mp-kids-h">Contient ' + kids.length +
               (kids.length > 1 ? ' lieux' : ' lieu') + '</p>' +
               kids.map(function(k){
                 return '<button type="button" class="mp-kid" data-goto="' + k.id + '">' +
                        '<span class="mp-kid-dot" style="background:' + CATS[k.c].col + '"></span>' +
                        k.n + '<em class="mp-kid-st mp-kid-st--' + k.s + '">' + STATUTS[k.s].court + '</em>' +
                        '</button>';
               }).join('') + '</div>';
        }
        return h;
      })() +
      '<button type="button" class="mp-btn' + (isFound ? ' on' : '') + '" id="mp-toggle">' +
        (isFound ? 'Repéré' : 'Marquer comme repéré') +
      '</button>';
    panel.classList.add('open');

    /* déplier ce lieu : ses enfants deviennent visibles quel que soit le zoom */
    expanded[p.id] = true;
    refreshVisibility();

    panelIn.querySelectorAll('[data-goto]').forEach(function(b){
      b.addEventListener('click', function(){
        const t = POINTS.find(x => x.id === b.dataset.goto);
        if(t) goTo(t, Math.max(scale, ZOOM_NIVEAU[t.z || 0] + 0.1));
      });
    });

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
  if(resetBt) resetBt.addEventListener('click', function(){ scale = 0.21; center(); });

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

  document.querySelectorAll('.map-source').forEach(function(inp){
    inp.addEventListener('change', function(){
      visSource[inp.dataset.src] = inp.checked;
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
     ARBORESCENCE DES LIEUX
     ============================================================ */
  const tree = document.getElementById('map-tree');
  function buildTree(){
    if(!tree) return;
    const racines = POINTS.filter(p => !p.p);
    function node(p, depth){
      const kids = enfants(p.id);
      const st = STATUTS[p.s];
      let h = '<li class="tr-item tr-d' + depth + (kids.length ? ' has-kids' : '') + '">' +
              '<div class="tr-row">' +
              (kids.length ? '<button type="button" class="tr-tog" aria-label="Déplier">›</button>' : '<span class="tr-sp"></span>') +
              '<button type="button" class="tr-go" data-goto="' + p.id + '">' +
              '<span class="tr-dot" style="background:' + CATS[p.c].col + '"></span>' +
              '<span class="tr-n">' + p.n + '</span>' +
              '<em class="tr-st tr-st--' + p.s + '">' + st.court + '</em>' +
              '</button></div>';
      if(kids.length){
        h += '<ul class="tr-kids" hidden>' + kids.map(k => node(k, depth + 1)).join('') + '</ul>';
      }
      return h + '</li>';
    }
    tree.innerHTML = '<ul class="tr-root">' + racines.map(p => node(p, 0)).join('') + '</ul>';

    tree.querySelectorAll('.tr-tog').forEach(function(b){
      b.addEventListener('click', function(){
        const ul = b.closest('.tr-item').querySelector(':scope > .tr-kids');
        if(!ul) return;
        ul.hidden = !ul.hidden;
        b.classList.toggle('open', !ul.hidden);
      });
    });
    tree.querySelectorAll('.tr-go').forEach(function(b){
      b.addEventListener('click', function(){
        const t = POINTS.find(x => x.id === b.dataset.goto);
        if(t) goTo(t, Math.max(0.5, ZOOM_NIVEAU[t.z || 0] + 0.15));
      });
    });
  }
  buildTree();

  /* effectifs affichés dans les filtres */
  (function(){
    const parCat = {}, parSrc = {}, parSt = {};
    POINTS.forEach(function(p){
      parCat[p.c] = (parCat[p.c] || 0) + 1;
      parSrc[p.src] = (parSrc[p.src] || 0) + 1;
      parSt[p.s] = (parSt[p.s] || 0) + 1;
    });
    document.querySelectorAll('.map-filter').forEach(function(i){
      const n = parCat[i.dataset.cat] || 0;
      const lbl = i.closest('label');
      if(lbl && !lbl.querySelector('.fl-n')){
        const s = document.createElement('span');
        s.className = 'fl-n'; s.textContent = n;
        lbl.appendChild(s);
      }
      if(!n && lbl) lbl.classList.add('fl-vide');
    });
    document.querySelectorAll('.map-source').forEach(function(i){
      const n = parSrc[i.dataset.src] || 0;
      const lbl = i.closest('label');
      if(lbl && !lbl.querySelector('.fl-n')){
        const s = document.createElement('span');
        s.className = 'fl-n'; s.textContent = n;
        lbl.appendChild(s);
      }
      if(!n && lbl) lbl.classList.add('fl-vide');
    });
    document.querySelectorAll('.map-statut').forEach(function(i){
      const n = parSt[i.dataset.st] || 0;
      const lbl = i.closest('label');
      if(lbl && !lbl.querySelector('.fl-n')){
        const s = document.createElement('span');
        s.className = 'fl-n'; s.textContent = n;
        lbl.appendChild(s);
      }
    });
  })();

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
      const hits = POINTS.filter(function(p){
        return norm(p.n).includes(v)
            || norm(p.d).includes(v)
            || norm(CATS[p.c].nom).includes(v);
      }).slice(0,8);
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
          : "Clique le point suivant. Tu peux enchaîner jusqu'à 10 étapes.") + '</p>';
      return;
    }

    /* distance cumulée sur l'ensemble du trajet */
    let du = 0;
    const etapes = [];
    for(let i = 1; i < rulerPts.length; i++){
      const seg = Math.hypot(rulerPts[i-1].x - rulerPts[i].x, rulerPts[i-1].y - rulerPts[i].y);
      du += seg;
      etapes.push(seg * METRES_PAR_UNITE);
    }
    const m = du * METRES_PAR_UNITE;

    const chemin = rulerPts.map(function(p, i){
      return '<span class="rl-step"><b>' + LETTRES[i] + '</b>' + (p.lieu || (p.x + ' · ' + p.y)) + '</span>';
    }).join('<i>→</i>');

    rulerBx.innerHTML =
      '<p class="rl-pair">' + chemin + '</p>' +
      '<p class="rl-dist">' + fmtDist(m) + '</p>' +
      (etapes.length > 1
        ? '<p class="rl-seg">' + etapes.length + ' segments · le plus long ' + fmtDist(Math.max.apply(null, etapes)) + '</p>'
        : '') +
      '<ul class="rl-list">' +
      VITESSES.map(function(v){
        return '<li><span class="rl-ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
               'stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + ICONS[v.ico] + '</svg></span>' +
               '<span class="rl-nom">' + v.nom + '</span>' +
               '<span class="rl-t">' + fmtDuree(m / v.v) + '</span></li>';
      }).join('') +
      '</ul>' +
      '<p class="rl-note">Distance à vol d\'oiseau, sans tenir compte des routes ni du relief. Vitesses provisoires calées sur GTA V, recalibrées après le 19 novembre 2026.</p>';
  }

  function drawLine(){
    if(!svgLine) return;
    if(rulerPts.length < 2){ svgLine.setAttribute('d',''); return; }
    svgLine.setAttribute('d',
      'M' + rulerPts.map(p => p.x + ',' + p.y).join(' L'));
  }

  const LETTRES = 'ABCDEFGHIJ';
  function addRulerPoint(p){
    if(rulerPts.length >= 10) return;
    p.n = 'Point ' + LETTRES[rulerPts.length];
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
      el.innerHTML = '<span class="pin-dot">' + LETTRES[i] + '</span>';
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
     VUE D'ENSEMBLE
     ============================================================ */
  const mini = document.getElementById('map-mini');
  const miniBox = document.getElementById('map-mini-box');
  if(mini && miniBox){
    function majMini(){
      const r = stage.getBoundingClientRect();
      const mw = mini.clientWidth, mh = mini.clientHeight;
      const vx = (-tx / scale) / W, vy = (-ty / scale) / H;
      const vw = (r.width / scale) / W, vh = (r.height / scale) / H;
      miniBox.style.left   = Math.max(0, vx * mw) + 'px';
      miniBox.style.top    = Math.max(0, vy * mh) + 'px';
      miniBox.style.width  = Math.min(mw, vw * mw) + 'px';
      miniBox.style.height = Math.min(mh, vh * mh) + 'px';
    }
    const oldApply = applyTransform;
    applyTransform = function(){ oldApply(); majMini(); };

    mini.addEventListener('click', function(e){
      const b = mini.getBoundingClientRect();
      const wx = ((e.clientX - b.left) / b.width) * W;
      const wy = ((e.clientY - b.top) / b.height) * H;
      const r = stage.getBoundingClientRect();
      tx = r.width/2 - wx * scale;
      ty = r.height/2 - wy * scale;
      clamp(); applyTransform();
    });
    majMini();
  }

  /* ============================================================
     AIDE ET RACCOURCIS
     ============================================================ */
  const helpBt = document.getElementById('map-help');
  const helpBx = document.getElementById('map-help-box');
  if(helpBt && helpBx){
    helpBt.addEventListener('click', function(){
      const on = helpBx.hidden;
      helpBx.hidden = !on;
      helpBt.setAttribute('aria-expanded', on);
    });
    helpBx.addEventListener('click', function(e){ e.stopPropagation(); });
    document.addEventListener('keydown', function(e){
      if(e.key === '?' ) helpBt.click();
    });
  }

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
    const ca = document.getElementById('map-perso-clear');
    if(ca) ca.hidden = perso.length === 0;
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
      return '<li>' +
             '<button type="button" class="ed-go" data-go="' + i + '">' +
             '<span class="ed-dot"></span>' +
             '<span class="ed-n">' + esc(p.n) + '</span>' +
             '<span class="ed-c">' + p.x + ' · ' + p.y + '</span></button>' +
             '<button type="button" class="ed-ren" data-ren="' + i + '" ' +
             'aria-label="Renommer" title="Renommer">&#9998;</button>' +
             '<button type="button" class="ed-del" data-del="' + i + '" ' +
             'aria-label="Supprimer" title="Supprimer">&times;</button>' +
             '</li>';
    }).join('');
  }

  if(editList){
    editList.addEventListener('click', function(e){
      const del = e.target.closest('[data-del]');
      if(del){
        const i = parseInt(del.dataset.del, 10);
        if(!confirm('Supprimer « ' + perso[i].n + ' » ?')) return;
        perso.splice(i, 1); savePerso(); renderPerso();
        if(M.panel) M.panel.classList.remove('open');
        return;
      }
      const ren = e.target.closest('[data-ren]');
      if(ren){
        const i = parseInt(ren.dataset.ren, 10);
        const n = prompt('Nom du marqueur', perso[i].n);
        if(n === null) return;
        const note = prompt('Note (facultatif)', perso[i].note || '');
        perso[i].n = n.trim() || perso[i].n;
        perso[i].note = (note || '').trim();
        savePerso(); renderPerso();
        return;
      }
      const go = e.target.closest('[data-go]');
      if(go){
        const p = perso[parseInt(go.dataset.go, 10)];
        if(p) M.goTo(p, 0.8);
      }
    });
  }

  /* tout effacer */
  const clearAll = document.getElementById('map-perso-clear');
  if(clearAll){
    clearAll.addEventListener('click', function(){
      if(!perso.length) return;
      if(!confirm('Supprimer tes ' + perso.length + ' marqueurs ?')) return;
      perso = []; savePerso(); renderPerso();
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
