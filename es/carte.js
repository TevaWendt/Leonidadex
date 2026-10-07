/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
/* ============================================================
   LEONIDAKIT — moteur de carte
   Déplacement, zoom, marqueurs, filtres, suivi, distance.
   ============================================================ */
(function(){
  const stage = document.getElementById('map-stage');
  const esc = window.LK.esc;
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

  /* échelle : le fond v1.0 est calé sur les coordonnées du jeu (voir carte-gtadb.js).
     À vérifier sur les vraies distances après le 19 novembre. */
  const METRES_PAR_UNITE = 3.04;   /* 1 unité de carte = 3,04 m, calé sur les coordonnées du jeu */

  /* vitesses de GTA V, en mètres par seconde : références du calculateur de trajet (v7.69 : estimation affichée tout de suite, marquée comme telle) */
  const VITESSES = [
    { id:'pied',    nom:'A pie',     v: 2.0,  ico:'walk' },
    { id:'de competición',  nom:'Corriendo', v: 6.0,  ico:'run'  },
    { id:'velo',    nom:'En bici',     v: 9.0,  ico:'bike' },
    { id:'moto',    nom:'En moto',    v: 41.0, ico:'moto' },
    { id:'voiture', nom:'En coche', v: 33.0, ico:'car'  },
    { id:'bateau',  nom:'En barco',  v: 22.0, ico:'boat' },
    { id:'helico',  nom:'En helicóptero', v: 60.0, ico:'heli' },
    { id:'avion',   nom:'En avión',   v: 78.0, ico:'plane'}
  ];

  /* ---- statut de fiabilité ---- */
  const STATUTS = {
    officiel: { nom:'Nombrado por Rockstar', court:'Oficial',
                d:"Lugar nombrado explícitamente por Rockstar, en su web o en su material oficial." },
    vu:       { nom:'Visto en un medio oficial', court:'Visto',
                d:"Visible o nombrado en un tráiler, una captura o una imagen oficial, sin descripción publicada por Rockstar." },
    spec:     { nom:'Reconstrucción de la comunidad', court:'Supuesto',
                d:"Posición o existencia deducida por la comunidad. Tómalo con precaución." }
  };

  const SOURCES = {
    SITE:  'Sitio oficial de Rockstar',
    T1:    'Primer tráiler',
    T2:    'Segundo tráiler',
    EL:    'An Extended Look, 27 de agosto de 2026',
    SHOT:  'Capturas oficiales',
    COMM:  'Análisis de la comunidad',
    GTADB: 'Edificios de la comunidad',
    COLLECTIBLES: 'Fuentes indicadas en la ficha del coleccionable'
  };

  /* ---- personnages officiels ---- */
  const PERSOS = {
    jason:  { n:'Jason Duval',      r:"Exmilitar convertido en transportista para traficantes de los Keys." },
    lucia:  { n:'Lucia Caminos',    r:"Originaria de Liberty City, salida de la penitenciaría de Leonida." },
    cal:    { n:'Cal Hampton',      r:"Amigo de Jason, paranoico y conspiranoico." },
    boobie: { n:'Boobie Ike',       r:"Jefe de un imperio de negocios en Vice City." },
    drequan:{ n:"Dre’Quan Priest",  r:"Copropietario del sello Only Raw Records." },
    dimez:  { n:'Real Dimez',       r:"Dúo musical de Bae-Luxe y Roxy, con contrato en Only Raw." },
    raul:   { n:'Raul Bautista',    r:"Atracador de bancos experimentado." },
    brian:  { n:'Brian Heder',      r:"Traficante veterano de los Keys, dueño de la vivienda de Jason." }
  };

  /* ---- catégories ---- */
  const CATS = {
    region:      { nom:'Regiones',            col:'#E8452C' },
    ville:       { nom:'Ciudades',             col:'#F5A524' },
    quartier:    { nom:'Barrios',          col:'#D96A2C' },
    comte:       { nom:'Condados',             col:'#8A6A45' },
    batiment:    { nom:'Edificios identificados',col:'#5B4E8C' },
    transport:   { nom:'Transportes',         col:'#2F6F8F' },
    nature:      { nom:'Naturaleza y relieve',   col:'#4C7A50' },
    lieu:        { nom:'Lugares destacados',     col:'#B5762A' },
    activite:    { nom:'Actividades',          col:'#2A9D8F' },
    collectible: { nom:'Coleccionables',       col:'#C2452C' },
    planque:     { nom:'Escondites',           col:'#A85B33' },
    mission:     { nom:'Misiones',           col:'#CE4B33' }
  };

  /* ---- points confirmés par Rockstar ----
     Positions approximatives, à recaler sur le fond définitif. */
  const POINTS = [
    /* ============ RÉGIONS OFFICIELLES ============ */
    { id:'vice-city', n:'Vice City', c:'ville', x:3517, y:3214, s:'officiel', src:'SITE', z:0, pers:['boobie','drequan','dimez'],
      d:"La metrópolis de Leonida y el corazón del juego. Rockstar la presenta como la capital soleada y festiva del país, y como la ciudad más densa que el estudio ha construido nunca." },
    { id:'leonida-keys', n:'Leonida Keys', c:'region', x:2889, y:5404, s:'officiel', src:'SITE', z:0, pers:['jason','brian'],
      d:"Archipiélago tropical al sur del estado, unido por largas carreteras sobre el agua. Buceo, pesca, navegación y contrabando." },
    { id:'grassrivers', n:'Grassrivers', c:'region', x:2280, y:4017, s:'officiel', src:'SITE', z:0,
      d:"La gran zona húmeda de Leonida. Vegetación densa, visibilidad reducida, hidrodeslizadores y caimanes." },
    { id:'port-gellhorn', n:'Port Gellhorn', c:'ville', x:1560, y:1988, s:'officiel', src:'SITE', z:0,
      d:"Ciudad costera que ha conocido tiempos mejores. Moteles baratos, atracciones cerradas y economía sumergida." },
    { id:'ambrosia', n:'Ambrosia', c:'region', x:2805, y:1898, s:'officiel', src:'SITE', z:0,
      d:"Condado rural e industrial. La refinería Allied Crystal da los empleos; la banda de moteros local da casi todo lo demás." },
    { id:'mount-kalaga', n:'Mount Kalaga National Park', c:'region', x:2692, y:922, s:'officiel', src:'SITE', z:0,
      d:"Parque nacional en la frontera norte, construido en torno a la caza, la pesca y las pistas todoterreno. En su interior vive una población que se mantiene lejos de las autoridades por decisión propia." },

    /* ============ VICE CITY : QUARTIERS ============ */
    { id:'ocean-beach', n:'Ocean Beach', c:'quartier', x:4295, y:2957, s:'officiel', src:'SITE', p:'vice-city', z:1,
      d:"Barrio nombrado por Rockstar: hoteles art déco en tonos pastel, arena blanca, paseo bordeado de palmeras. Es la escena de apertura del primer tráiler." },
    { id:'little-cuba', n:'Little Cuba', c:'quartier', x:3331, y:3170, s:'officiel', src:'SITE', p:'vice-city', z:1,
      d:"Barrio nombrado por Rockstar, conocido por sus panaderías y su cultura cubanoamericana." },
    { id:'vice-beach', n:'Vice Beach', c:'quartier', x:4258, y:2813, s:'officiel', src:'T1', p:'vice-city', z:1,
      d:"Isla barrera unida al continente por una calzada. Única subregión de Vice City confirmada por los materiales oficiales." },
    { id:'south-beach', n:'South Beach', c:'quartier', x:4295, y:3177, s:'vu', src:'T1', p:'vice-city', z:1,
      d:"Franja frente al mar donde se concentran bares y hoteles iluminados con neones. De aquí salen varios planos nocturnos de los tráileres." },
    { id:'downtown', n:'Downtown', c:'quartier', x:3517, y:3214, s:'vu', src:'T2', p:'vice-city', z:1,
      d:"El centro financiero: torres de cristal y autopistas elevadas, visibles en los planos aéreos del segundo tráiler." },
    { id:'stockyard', n:'Stockyard', c:'quartier', x:3601, y:2609, s:'officiel', src:'SITE', p:'vice-city', z:1,
      d:"Barrio de almacenes reconvertidos, cubiertos de murales. Rockstar ha confirmado que se inspira en Wynwood y que recurrió a más de cincuenta artistas urbanos para sus muros. En el primer tráiler se ve allí una concentración de coches." },
    { id:'vc-port', n:'Puerto de Vice City', c:'transport', x:3971, y:3358, s:'vu', src:'T1', p:'vice-city', z:1,
      d:"Zona portuaria industrial: contenedores, almacenes y puentes, vista en los dos tráileres." },
    { id:'marina', n:'Marina', c:'quartier', x:3603, y:2854, s:'vu', src:'T2', p:'vice-city', z:1,
      d:"Zona residencial acomodada junto al agua: barcos, motos de agua y propiedades de lujo." },
    { id:'vcia', n:'Aeropuerto internacional', c:'transport', x:2960, y:3435, s:'vu', src:'T2', p:'vice-city', z:1,
      d:"Principal aeropuerto de la ciudad, identificado por el tren VCIA que se ve en el segundo tráiler." },
    { id:'causeway', n:'Calzada de Vice Beach', c:'transport', x:4058, y:2813, s:'vu', src:'T1', p:'vice-city', z:1,
      d:"Puente-calzada que une el continente con la isla de Vice Beach, con peaje a la entrada." },

    /* ============ VICE CITY : BÂTIMENTS IDENTIFIÉS ============ */
    { id:'galina-opera', n:'Galina Ballet Opera House', c:'batiment', x:3557, y:2956, s:'vu', src:'T2', p:'downtown', z:2,
      d:"Ópera de silueta angulosa y explanada animada, que los observadores comparan con el Adrienne Arsht Center." },
    { id:'sahara-arena', n:'Sahara Arena', c:'batiment', x:3624, y:3053, s:'vu', src:'T2', p:'downtown', z:2,
      d:"Pabellón polideportivo junto al agua, sede de los Vice City Narcos. Su forma se ha comparado con la del Kaseya Center." },
    { id:'twin-towers', n:'Torres gemelas', c:'batiment', x:3584, y:3123, s:'vu', src:'T2', p:'downtown', z:2,
      d:"Torre doble unida por un tejado calado, comparada con el 500 Brickell." },
    { id:'autograph-flight', n:'Autograph Flight Support', c:'batiment', x:2927, y:3231, s:'vu', src:'T2', p:'vcia', z:2,
      d:"Terminal de aviación privada con tejado en voladizo y fachada acristalada curva." },
    { id:'tisha-wocka', n:'Tisha-Wocka Flea Market', c:'lieu', x:2798, y:2948, s:'vu', src:'T1', p:'south-beach', z:2,
      d:"Mercadillo nombrado en los materiales oficiales, cerca de South Beach." },
    { id:'ptt-youngin', n:'PTT YOUNGIN$', c:'lieu', x:3331, y:3170, s:'officiel', src:'SITE', p:'little-cuba', z:2,
      d:"Tienda de artículos ilícitos, escenario de una misión exclusiva de la edición Ultimate." },
    { id:'penthouse', n:'Ático de Vice Beach', c:'batiment', x:4335, y:2807, s:'vu', src:'T1', p:'vice-beach', z:2,
      d:"Terraza de lujo con piscina privada y ducha exterior, comparada con la Trésor Tower." },
    { id:'jade-condos', n:'Torres onduladas', c:'batiment', x:4355, y:2697, s:'vu', src:'T1', p:'vice-beach', z:2,
      d:"Edificios con fachada en forma de olas, visibles en el skyline de Vice Beach." },

    /* ============ AUTRES VILLES ============ */
    { id:'waning-sands', n:'Waning Sands', c:'ville', x:3681, y:1860, s:'vu', src:'T1', z:0,
      d:"Extrarradio inmenso: vías rápidas, centros comerciales y enormes aparcamientos." },
    { id:'hamlet', n:'Hamlet', c:'ville', x:2832, y:4258, s:'vu', src:'T1', z:0,
      d:"Localidad nombrada en el primer tráiler, en una escena de calle residencial." },
    { id:'key-lento', n:'Key Lento', c:'quartier', x:2889, y:5144, s:'officiel', src:'T2', p:'leonida-keys', z:1,
      d:"Isla con nombre en el archipiélago de los Leonida Keys." },

    /* ============ LIEUX NOTABLES ============ */
    { id:'allied-crystal', n:'Raffinerie Allied Crystal', c:'lieu', x:2773, y:2004, s:'officiel', src:'SITE', p:'ambrosia', z:1,
      d:"Refinería de azúcar citada por Rockstar como el principal empleador de Ambrosia." },
    { id:'leonida-penitentiary', n:'Leonida Penitentiary', c:'lieu', x:2805, y:4133, s:'officiel', src:'SITE', z:0, pers:['lucia'],
      d:"La penitenciaría estatal donde Lucia cumple condena al principio de la historia, tras pelear por su familia en Liberty City. Nombre confirmado por Rockstar. Comparada con la Florida State Prison." },
    { id:'tv-tower', n:'Torre de televisión', c:'batiment', x:3365, y:2037, s:'spec', src:'COMM', z:0,
      d:"Hipótesis de la comunidad sobre una antena muy alta, inspirada en la torre WTVY. No confirmada." },

    /* ============ COMTÉS ============ */
    { id:'vice-dale', n:'Condado de Vice-Dale', c:'comte', x:3431, y:3189, s:'vu', src:'T1', z:0,
      d:"Deducido de la rotulación Vice-Dale Police Department en un vehículo de policía." },
    { id:'leonard-county', n:'Condado de Leonard', c:'comte', x:3132, y:1989, s:'vu', src:'T1', z:0,
      d:"Identificado por la oficina del sheriff del condado de Leonard. Contiene Waning Sands." },
    { id:'kelly-county', n:'Condado de Kelly', c:'comte', x:1865, y:2298, s:'vu', src:'T1', z:0,
      d:"Nombrado en una señal de carretera. Una de las zonas menos documentadas." },
    { id:'mariana-county', n:'Condado de Mariana', c:'comte', x:2360, y:4317, s:'spec', src:'COMM', z:0,
      d:"Condado propuesto por la comunidad para la zona de los Grassrivers. No confirmado." },

    /* ============ NATURE ============ */
    { id:'grand-lac', n:'Gran lago interior', c:'nature', x:3075, y:1639, s:'spec', src:'COMM', z:0,
      d:"Masa de agua central deducida de las imágenes. Ni su nombre ni su contorno están confirmados." },
    { id:'kalaga-summit', n:'Cumbre del Kalaga', c:'nature', x:2732, y:762, s:'spec', src:'COMM', p:'mount-kalaga', z:1,
      d:"Supuesto punto más alto del parque nacional." },
    { id:'gloriana', n:'Gloriana', c:'region', x:1765, y:1398, s:'spec', src:'COMM', z:0,
      d:"Nombre visto en matrículas. Rockstar nunca ha anunciado que se trate de una región explorable." }
  ];

  /* ---- bâtiments de la communauté gtadb (CC BY 4.0), voir carte-gtadb.js ---- */
  if(window.LK_GTADB){
    (window.LK_GTADB.groupes || []).forEach(function(p){ POINTS.push(p); });
    (window.LK_GTADB.lieux   || []).forEach(function(p){ POINTS.push(p); });
    /* photos et Street View ajoutés aux fiches déjà présentes ici */
    const enr = window.LK_GTADB.enrichit || {};
    POINTS.forEach(function(p){
      const x = enr[p.id]; if(!x) return;
      /* un visuel officiel déclaré dans enrichit remplace la photo communautaire du panneau */
      if(x.img){ p.img = x.img; p.imgSrc = x.imgSrc; }
      if(x.img2){ p.img2 = x.img2; p.img2Src = x.img2Src; }
      ['imgW','imgH','img2W','img2H','imgAlt','img2Alt'].forEach(function(k){ if(x[k]) p[k] = x[k]; });
      if(x.sv) p.sv = x.sv;
      if(x.reel) p.reel = x.reel;
    });
  }

  /* Les collectibles gardent leurs identifiants et leur suivi propres.
     Une fiche sans position précise et sourcée ne crée jamais de marqueur. */
  const collectibleApi = window.LKCollectibles;
  let collectibleState = collectibleApi ? collectibleApi.getState() : {found:{}, favorites:{}};
  const collectibleItems = (window.LK_COLLECTIBLES && Array.isArray(window.LK_COLLECTIBLES.items))
    ? window.LK_COLLECTIBLES.items : [];
  const collectibleById = new Map();
  const collectibleStatuses = {
    confirmed: { nom:'Confirmado oficialmente', court:'Confirmado' },
    established: { nom:'Establecido por fuentes fiables', court:'Establecido' },
    unconfirmed: { nom:'Información no confirmada', court:'No confirmado' }
  };
  function sourceUrl(value){
    try{
      const url = new URL(value);
      return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null;
    }catch(e){ return null; }
  }
  collectibleItems.forEach(function(item){
    if(!item || typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(item.id) ||
       typeof item.slug !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(item.slug) ||
       ['__proto__','constructor','prototype'].includes(item.id) || ['__proto__','constructor','prototype'].includes(item.slug) ||
       typeof item.name !== 'string' || item.published === false ||
       !Object.prototype.hasOwnProperty.call(collectibleStatuses, item.status) || collectibleById.has(item.id)) return;
    collectibleById.set(item.id, item);
    const c = item.coordinates;
    if(!c || c.system !== 'leonidakit-v1' || c.verified !== true || !sourceUrl(c.sourceUrl) ||
       !Number.isFinite(c.x) || !Number.isFinite(c.y) || c.x < 0 || c.x > W || c.y < 0 || c.y > H) return;
    POINTS.push({ id:'collectible-' + item.id, n:item.name, c:'collectible',
      x:c.x, y:c.y, z:0, s:item.status === 'confirmed' ? 'officiel' : 'spec',
      src:'COLLECTIBLES', collectible:item });
  });
  function pointStatus(p){ return p.collectible ? collectibleStatuses[p.collectible.status] : STATUTS[p.s]; }
  function pointFound(p){
    return p.collectible ? !!(collectibleApi && collectibleApi.isTrackable(p.collectible) && collectibleState.found[p.collectible.id]) : !!found[p.id];
  }

  /* Ne demander que les fichiers réellement livrés. Les photos de la carte (photos/) sont déjà filtrées à la génération de carte-gtadb.js et ne figurent pas dans le manifeste. */
  POINTS.forEach(p=>{['img','img2'].forEach(k=>{if(p[k] && !/^photos\//.test(p[k]) && !window.LK.hasAsset(p[k])) delete p[k];});});

  /* index : indispensable dès qu'on dépasse quelques centaines de lieux */
  const BY_ID = {}, KIDS = {}, MK = {};
  POINTS.forEach(function(p){ BY_ID[p.id] = p; });
  POINTS.forEach(function(p){ if(p.p){ (KIDS[p.p] = KIDS[p.p] || []).push(p); } });
  function byId(id){ return BY_ID[id]; }

  /* couleurs de la légende appliquées aux points de la carte (style.css n'en
     définit que pour huit catégories sur douze) + règles d'étiquettes */
  (function(){
    const st = document.createElement('style');
    st.textContent =
      Object.keys(CATS).map(k => '.map-markers .mk--' + k + ' .mk-dot{background:' + CATS[k].col + ';}').join('') +
      '.map-markers .mk.lbl-off .mk-lbl{display:none;}' +
      '.map-markers .mk.lbl-off:hover .mk-lbl{display:inline-block;}' +
      '.map-markers .mk.is-open .mk-lbl{display:inline-block !important;}' +
      '.map-markers .mk.lbl-reel .mk-lbl{font-style:italic;font-weight:600;opacity:.9;}' +
      '.map-markers .cl.cl--min .cl-n{width:24px;height:24px;border-width:2px;font-size:.66rem;' +
        'background:#7A5C8F;box-shadow:0 1px 4px rgba(0,0,0,.28);}' +
      '.map-markers .cl.cl--min:hover .cl-n{transform:scale(1.2);}' +
      '.mp-kids-more{width:100%;margin-top:6px;padding:7px;font:inherit;font-size:.78rem;font-weight:700;' +
        'border:1px dashed var(--rule,#d9d0c3);border-radius:8px;background:transparent;cursor:pointer;color:inherit;}';
    document.head.appendChild(st);
  })();

  /* ============================================================
     ÉTAT
     ============================================================ */
  let scale = 0.21, minS = 0.10, maxS = 8.0;
  let tx = 0, ty = 0;
  let found = {};
  let visible = {};
  let rulerOn = false;
  let rulerPts = [];

  Object.keys(CATS).forEach(k => visible[k] = true);
  let visStatut = { officiel:true, vu:true, spec:true };
  let visSource = { SITE:true, T1:true, T2:true, EL:true, SHOT:true, COMM:true, GTADB:true, COLLECTIBLES:true };

  /* niveau de zoom minimal pour voir chaque profondeur de la hiérarchie */
  const ZOOM_NIVEAU = [0, 0.42, 0.6];
  let expanded = {};      /* parents dépliés manuellement */

  function niveauVisible(p){
    if(!p.z) return true;
    if(scale >= ZOOM_NIVEAU[p.z]) return true;
    /* un enfant reste visible si son parent est déplié */
    let cur = p;
    while(cur && cur.p){
      if(expanded[cur.p]) return true;
      cur = byId(cur.p);
    }
    return false;
  }

  function enfants(id){ return KIDS[id] || []; }

  try{
    found = window.LK.read('lk_map_found',{},window.LK.own);
    found = Object.fromEntries(Object.entries(found).filter(([id]) => !id.startsWith('collectible-')));
  }catch(e){ found = {}; }

  function save(){
    window.LK.write('lk_map_found',found);
  }

  /* ============================================================
     RENDU
     ============================================================ */
  let applyTransform = function(){
    world.style.transform = 'translate(' + tx + 'px,' + ty + 'px) scale(' + scale + ')';
    if(zoomLbl) zoomLbl.textContent = Math.round(scale * 100) + ' %';
    layer.style.setProperty('--inv', (1 / scale));
    layer.classList.toggle('lbl-z1', scale < 0.55);
    layer.classList.toggle('lbl-z2', scale < 1.1);
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
  let collectibleHash = null;
  function syncHash(){
    clearTimeout(hashTimer);
    hashTimer = setTimeout(function(){
      const r = stage.getBoundingClientRect();
      const cx = Math.round((r.width/2 - tx) / scale);
      const cy = Math.round((r.height/2 - ty) / scale);
      const h = collectibleHash ? '#collectible=' + encodeURIComponent(collectibleHash)
        : '#' + cx + ',' + cy + ',' + scale.toFixed(2);
      if(location.hash !== h) history.replaceState(null, '', h);
    }, 400);
  }

  function readHash(){
    /* v7.69 : #trajet ouvre le calculateur de trajet sur la carte (liens de l’accueil, du calculateur et de Léo) */
    if(location.hash === '#trajet'){
      setTrajet(true); const ms = document.getElementById('map-trajet-ms'); if(ms) ms.open = true;
      requestAnimationFrame(function(){ stage.scrollIntoView({ block:'start', behavior:'auto' }); });
      return false;
    }
    /* plusieurs lieux à la fois : #pins=g-L1074,g-L1091&t=Armureries (liens « voir les armureries », « voir les concessions ») */
    const multi = location.hash.match(/^#pins=([\w,-]+)(?:&t=([^&]*))?$/);
    if(multi){
      const pts = multi[1].split(',').map(byId).filter(Boolean);
      if(pts.length){
        let titre = 'Lugares'; try{ titre = decodeURIComponent(multi[2] || 'Lugares'); }catch(e){}
        pts.forEach(function(p){ visible[p.c] = true; });
        document.querySelectorAll('.map-filter').forEach(function(input){ if(pts.some(p => p.c === input.dataset.cat)) input.checked = true; });
        refreshVisibility();
        ouvertId = null;
        panelIn.innerHTML = '<p class="mp-cat">' + esc(titre) + '</p><h3>' + pts.length + (lkPluriel(pts.length)?' lugares en el mapa' : ' lugar en el mapa') + '</h3>' +
          '<p class="mp-d">Cada lugar abre su ficha y centra el mapa en él.</p>' +
          pts.map(function(p){ return '<a class="mp-link" href="#lieu=' + p.id + '">' + esc(p.n) + '</a>'; }).join('');
        panel.classList.add('open'); panel.inert = false;
        const cx = pts.reduce((a, p) => a + p.x, 0) / pts.length, cy = pts.reduce((a, p) => a + p.y, 0) / pts.length;
        const spread = Math.max.apply(null, pts.map(p => Math.hypot(p.x - cx, p.y - cy))) || 1;
        const r = stage.getBoundingClientRect();
        scale = Math.max(0.12, Math.min(0.9, Math.min(r.width, r.height) / (spread * 2.6)));
        tx = r.width / 2 - cx * scale; ty = r.height / 2 - cy * scale; clamp(); applyTransform();
        requestAnimationFrame(function(){ stage.scrollIntoView({ block:'start', behavior:'auto' }); });
        return true;
      }
    }
    const collectibleLink = location.hash.match(/^#collectible=([^&]+)$/);
    if(collectibleLink){
      let id;
      try{ id = decodeURIComponent(collectibleLink[1]); }catch(e){ return false; }
      collectibleHash = id;
      const p = byId('collectible-' + id);
      if(p && p.collectible){
        /* Un lien direct rend toujours visible son marqueur, même si un filtre
           avait été désactivé au cours de la visite. */
        visible[p.c] = visStatut[p.s] = visSource[p.src] = true;
        document.querySelectorAll('.map-filter,.map-statut,.map-source').forEach(function(input){
          if(input.dataset.cat === p.c || input.dataset.st === p.s || input.dataset.src === p.src) input.checked = true;
        });
        if(p.s !== 'officiel'){
          const onlyOfficial = document.getElementById('map-only-officiel');
          if(onlyOfficial){ onlyOfficial.classList.remove('on'); onlyOfficial.textContent = 'Solo lo oficial'; }
        }
        goTo(p, 1.1);
        requestAnimationFrame(function(){ stage.scrollIntoView({ block:'start', behavior:'auto' }); });
        return true;
      }
      const item = collectibleById.get(id);
      ouvertId = null;
      panelIn.innerHTML = '<p class="mp-cat">Coleccionables</p><h3>' + esc(item ? item.name : 'Coleccionable no disponible') + '</h3>' +
        '<p class="mp-d" role="status">' + (item ? 'No hay ninguna ubicación precisa y verificada disponible para esta ficha.' :
        'Este enlace no corresponde a ningún coleccionable publicado con una ubicación verificada.') + '</p>' +
        '<a class="mp-link" href="' + (item ? '/collectibles/' + encodeURIComponent(item.slug) + '.html' : '/es/collectibles.html') + '">' +
        (item ? 'Ver la ficha' : 'Ver los coleccionables') + '</a>';
      panel.classList.add('open'); panel.inert = false;
      refreshVisibility();
      return false;
    }
    collectibleHash = null;
    /* lien direct vers un lieu : #lieu=vice-city */
    const l = location.hash.match(/^#lieu=([\w-]+)$/);
    if(l){
      const p = byId(l[1]);
      if(p){
        goTo(p, Math.max(0.6, ZOOM_NIVEAU[p.z || 0] + 0.2));
        /* arrivée par lien direct : on amène la carte à l'écran, sinon le panneau
           s'ouvre sous le pli sur mobile et l'utilisateur ne voit rien */
        requestAnimationFrame(function(){ stage.scrollIntoView({ block: 'start', behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' }); });
        return true;
      }
    }
    const m = location.hash.match(/^#(-?\d+),(-?\d+),(\d+(?:\.\d+)?)$/);
    if(!m || !m.slice(1).every(x=>Number.isFinite(Number(x)))) return false;
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
    montes = new Map();
    POINTS.forEach(function(p){
      const el = document.createElement('button');
      el.type = 'button';
      const kids = enfants(p.id).length;
      el.className = 'mk mk--' + p.c + ' st-' + p.s + ' z' + (p.z||0)
                   + (pointFound(p) ? ' is-found' : '') + (kids ? ' has-kids' : '');
      el.style.left = p.x + 'px';
      el.style.top  = p.y + 'px';
      el.dataset.id = p.id;
      MK[p.id] = el;
      el.dataset.cat = p.c;
      el.dataset.st = p.s;
      el.setAttribute('aria-label', p.n);
      const reel = / \(nom (réel|supposé)\)$/.test(p.n);
      if(reel) el.classList.add('lbl-reel');
      el.innerHTML = '<span class="mk-dot">' + (kids ? '<i>' + kids + '</i>' : '') + '</span>'
                   + '<span class="mk-lbl">' + esc(reel ? p.n.replace(/ \(nom (réel|supposé)\)$/, '') : p.n) + '</span>';
      el.addEventListener('click', function(ev){
        ev.stopPropagation();
        if(rulerOn){
          addRulerPoint({ id:p.id, n:p.n, x:p.x, y:p.y, lieu:p.n });
          return;
        }
        openPanel(p);
      });
      /* pas encore dans la page : refreshVisibility ne monte que les marqueurs visibles */
    });
    refreshVisibility();
    refreshProgress();
  }

  /* ============================================================
     VISIBILITÉ, REGROUPEMENT ET ÉTIQUETTES
     Seuls les marqueurs réellement à l'écran sont dans la page :
     avec plusieurs milliers de lieux, c'est ce qui garde le zoom
     fluide. Les points trop proches sont regroupés en pastilles à
     tous les niveaux de zoom, sauf au zoom maximal.
     ============================================================ */
  const SEUIL_GROUPE = 2;     /* nb de points par case avant regroupement */
  const CASE_PX = 34;         /* taille de case à l'écran, en pixels */
  let montes = new Map();     /* id -> marqueur actuellement dans la page */
  let ouvertId = null;        /* lieu dont la fiche est ouverte : jamais regroupé */

  function passeFiltres(p){
    return visible[p.c] && visStatut[p.s] && visSource[p.src] && niveauVisible(p);
  }

  function refreshVisibility(){
    const r = stage.getBoundingClientRect();
    const marge = 0.6;
    const x0 = (-tx - r.width  * marge) / scale, x1 = (-tx + r.width  * (1 + marge)) / scale;
    const y0 = (-ty - r.height * marge) / scale, y1 = (-ty + r.height * (1 + marge)) / scale;

    const actifs = [];
    for(let i = 0; i < POINTS.length; i++){
      const p = POINTS[i];
      if(p.x < x0 || p.x > x1 || p.y < y0 || p.y > y1) continue;
      if(!passeFiltres(p)) continue;
      actifs.push(p);
    }

    /* regroupement par case */
    const seuls = [], groupes = [];
    const auMax = scale >= maxS * 0.999;
    if(auMax){
      actifs.forEach(p => seuls.push(p));
    } else {
      const taille = CASE_PX / scale;
      const cases = new Map();
      actifs.forEach(function(p){
        if(p.id === ouvertId){ seuls.push(p); return; }
        const k = Math.floor(p.x / taille) + ':' + Math.floor(p.y / taille);
        let g = cases.get(k);
        if(!g){ g = []; cases.set(k, g); }
        g.push(p);
      });
      cases.forEach(function(grp){
        if(grp.length < SEUIL_GROUPE) seuls.push(grp[0]);
        else groupes.push(grp);
      });
    }

    /* montage différentiel : on retire ce qui sort, on ajoute ce qui entre */
    const voulus = new Set(seuls.map(p => p.id));
    montes.forEach(function(el, id){
      if(!voulus.has(id)){ el.remove(); montes.delete(id); }
    });
    const frag = document.createDocumentFragment();
    seuls.forEach(function(p){
      if(montes.has(p.id)) return;
      const el = MK[p.id];
      if(el){ frag.appendChild(el); montes.set(p.id, el); }
    });
    layer.appendChild(frag);

    /* pastilles */
    layer.querySelectorAll('.cl').forEach(el => el.remove());
    groupes.forEach(function(grp){
      const cx = grp.reduce((s,p)=>s+p.x,0) / grp.length;
      const cy = grp.reduce((s,p)=>s+p.y,0) / grp.length;
      const done = grp.filter(pointFound).length;
      const majeur = grp.some(p => p.id.indexOf('g-') !== 0 || p.s === 'officiel');
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cl' + (done === grp.length ? ' is-done' : '') + (majeur ? '' : ' cl--min');
      b.style.left = cx + 'px';
      b.style.top  = cy + 'px';
      b.setAttribute('aria-label', grp.length + ' lugares agrupados');
      b.title = grp.slice(0, 6).map(p => p.n).join(', ') + (grp.length > 6 ? '…' : '');
      b.innerHTML = '<span class="cl-n">' + grp.length + '</span>';
      b.addEventListener('click', function(ev){
        ev.stopPropagation();
        /* approcher pour éclater le groupe */
        const r2 = stage.getBoundingClientRect();
        scale = Math.min(maxS, scale * 2.2);
        tx = r2.width/2 - cx * scale;
        ty = r2.height/2 - cy * scale;
        clamp(); applyTransform(); refreshVisibility();
      });
      layer.appendChild(b);
    });

    trierEtiquettes(seuls);
  }
  function cluster(){ refreshVisibility(); }

  /* ---- étiquettes : on masque celles qui en chevaucheraient une plus
     importante (officiel > tes lieux > bâtiments nommés > noms réels) ---- */
  function prioriteEtiquette(p){
    if(p.id === ouvertId) return -1;
    if(p.s === 'officiel') return 0;
    if(p.id.indexOf('g-') !== 0) return 1;
    if(/\(nom (réel|supposé)\)$/.test(p.n) || /^Bâtiment L\d+$/.test(p.n)) return 3;
    return 2;
  }
  function trierEtiquettes(seuls){
    const lblZ1 = scale < 0.55, lblZ2 = scale < 1.1;
    const cand = [];
    seuls.forEach(function(p){
      const el = MK[p.id];
      if(el) el.classList.toggle('is-open', p.id === ouvertId);
      const z = p.z || 0;
      if((z === 1 && lblZ1) || (z === 2 && lblZ2)) return;   /* déjà masquée par style.css */
      if(prioriteEtiquette(p) === 3 && scale < 3 && p.id !== ouvertId){
        if(el) el.classList.add('lbl-off');                 /* nom réel ou bâtiment anonyme : survol seulement */
        return;
      }
      cand.push(p);
    });
    cand.sort((a, b) => prioriteEtiquette(a) - prioriteEtiquette(b));
    const gardees = [];
    const grille = new Map();
    const cle = (x, y) => Math.floor(x / 120) + ':' + Math.floor(y / 40);
    cand.forEach(function(p){
      const z = p.z || 0;
      const car = z === 2 ? 5.8 : (z === 1 ? 6.4 : 6.9);
      const w = p.n.length * car + (z === 2 ? 10 : 14), h = z === 2 ? 15 : 18;
      const rayon = z === 2 ? 6 : (z === 1 ? 7.5 : 9.5);
      const sx = tx + p.x * scale, sy = ty + p.y * scale;
      const box = { x0: sx - w/2, x1: sx + w/2, y0: sy + rayon + 4, y1: sy + rayon + 4 + h };
      let libre = true;
      const kx0 = Math.floor(box.x0 / 120), kx1 = Math.floor(box.x1 / 120);
      const ky0 = Math.floor(box.y0 / 40),  ky1 = Math.floor(box.y1 / 40);
      for(let kx = kx0; kx <= kx1 && libre; kx++){
        for(let ky = ky0; ky <= ky1 && libre; ky++){
          const l = grille.get(kx + ':' + ky);
          if(!l) continue;
          for(let i = 0; i < l.length; i++){
            const o = l[i];
            if(box.x0 < o.x1 && box.x1 > o.x0 && box.y0 < o.y1 && box.y1 > o.y0){ libre = false; break; }
          }
        }
      }
      const el = MK[p.id];
      if(!el) return;
      if(libre || prioriteEtiquette(p) < 0){
        el.classList.remove('lbl-off');
        for(let kx = kx0; kx <= kx1; kx++) for(let ky = ky0; ky <= ky1; ky++){
          const k = kx + ':' + ky;
          if(!grille.has(k)) grille.set(k, []);
          grille.get(k).push(box);
        }
      } else {
        el.classList.add('lbl-off');
      }
    });
  }

  function refreshProgress(){
    const places = POINTS.filter(p => !p.collectible);
    const total = places.length;
    const done = places.filter(p => found[p.id]).length;
    const pct = total ? Math.round(done / total * 100) : 0;
    if(progBar) progBar.style.width = pct + '%';
    if(progTxt) progTxt.innerHTML = '<strong>' + done + '</strong> / ' + total + ' descubiertos';
    if(progRs) progRs.hidden = done === 0;
    renderFound();
  }

  /* ---- liste des lieux repérés ---- */
  const fdList = document.getElementById('map-found-list');
  const fdCnt  = document.getElementById('map-found-count');

  function renderFound(){
    if(!fdList) return;
    const sec = fdList.closest('details');
    const liste = POINTS.filter(p => !p.collectible && found[p.id]);
    if(fdCnt) fdCnt.textContent = liste.length;

    if(!liste.length){
      fdList.innerHTML = '<p class="fd-empty">Aún no has descubierto ningún lugar. Abre un marcador en el mapa y márcalo.</p>';
      return;
    }
    if(sec && !sec.open) sec.open = true;
    fdList.innerHTML = '<ul>' + liste.map(function(p){
      return '<li><button type="button" class="fd-go" data-goto="' + p.id + '">' +
             '<span class="fd-dot" style="background:' + CATS[p.c].col + '"></span>' +
             '<span class="fd-n">' + esc(p.n) + '</span></button>' +
             '<button type="button" class="fd-un" data-un="' + p.id + '" ' +
             'aria-label="' + 'Desmarcar {nom}'.replace('{nom}', esc(p.n)) + '" title="Desmarcar">&times;</button></li>';
    }).join('') + '</ul>';
  }

  if(fdList){
    fdList.addEventListener('click', function(e){
      const go = e.target.closest('[data-goto]');
      if(go){
        const p = byId(go.dataset.goto);
        if(p) goTo(p, Math.max(0.5, ZOOM_NIVEAU[p.z || 0] + 0.15));
        return;
      }
      const un = e.target.closest('[data-un]');
      if(un){
        delete found[un.dataset.un];
        save();
        const mk = MK[un.dataset.un];
        if(mk) mk.classList.remove('is-found');
        refreshProgress();
      }
    });
  }

  /* ============================================================
     PANNEAU D'INFORMATION
     ============================================================ */
  function openPanel(p){
    ouvertId = p.id;
    collectibleHash = p.collectible ? p.collectible.id : null;
    syncHash();
    if(p.collectible){ openCollectiblePanel(p); return; }
    const isFound = !!found[p.id];
    const st = STATUTS[p.s];
    const VIDE = '<div class="mp-img mp-img--vide" aria-hidden="true">' +
        '<svg viewBox="0 0 64 64"><rect x="8" y="16" width="48" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>' +
        '<circle cx="24" cy="30" r="5" fill="currentColor"/><path d="M12 48l14-14 10 10 8-8 12 12" fill="none" stroke="currentColor" stroke-width="2.5"/></svg>' +
        '<span>Imagen próximamente</span></div>';

    /* lieux gtadb : deux photos possibles, chargées avant affichage pour
       éviter tout cadre vide ; sinon, comportement d'origine */
    const img = p.img2
      ? '<div id="mp-photos">' + VIDE + '</div>'
      : (p.img
        ? '<figure class="mp-img"><img src="' + esc(p.img) + '" alt="' + esc(p.imgAlt || p.n) + '" loading="lazy" decoding="async" ' +
          (p.imgW && p.imgH ? 'width="' + Number(p.imgW) + '" height="' + Number(p.imgH) + '"' : '') + '>' +
          (p.imgSrc ? '<figcaption>' + esc(p.imgSrc) + '</figcaption>' : '') + '</figure>'
        : VIDE);
    const img2 = '';
    /* coordonnées réelles uniquement : jamais une position du plan fictif, jamais une valeur non numérique */
    const svOk = /^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(String(p.sv || '')) &&
      Math.abs(Number(String(p.sv).split(',')[0])) <= 90 && Math.abs(Number(String(p.sv).split(',')[1])) <= 180;
    const streetView = svOk
      ? '<div><span>Lugar real</span><b><a href="https://www.google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(p.sv) +
        '" target="_blank" rel="noopener noreferrer">Ver en Google Maps</a></b></div>'
      : '';

    const persos = (p.pers || []).map(function(k){
      const q = PERSOS[k]; if(!q) return '';
      return '<li><b>' + esc(q.n) + '</b><span>' + esc(q.r) + '</span></li>';
    }).join('');

    panelIn.innerHTML =
      img +
      '<p class="mp-cat" style="color:' + CATS[p.c].col + '">' + CATS[p.c].nom + '</p>' +
      '<h3>' + esc(p.n) + '</h3>' +
      '<span class="mp-st mp-st--' + p.s + '" title="' + st.d + '">' + st.court + '</span>' +
      '<p class="mp-d">' + esc(p.d) + '</p>' +
      img2 +
      (persos ? '<div class="mp-pers"><p class="mp-kids-h">Personajes relacionados</p><ul>' + persos + '</ul></div>' : '') +
      '<div class="mp-meta">' +
        '<div><span>Fiabilidad</span><b>' + st.nom + '</b></div>' +
        '<div><span>Fuente</span><b>' + SOURCES[p.src] + '</b></div>' +
        '<div><span>Posición</span><b>' + p.x + ' · ' + p.y + '</b></div>' +
        streetView +
      '</div>' +
      (function(){
        const kids = enfants(p.id);
        const parent = p.p ? byId(p.p) : null;
        let h = '';
        if(parent){
          h += '<button type="button" class="mp-link" data-goto="' + parent.id + '">' +
               '&larr; ' + esc(parent.n) + '</button>';
        }
        if(kids.length){
          const LIM = 24;
          const tries = kids.slice().sort(function(a, b){
            return prioriteEtiquette(a) - prioriteEtiquette(b) || a.n.localeCompare(b.n, 'fr');
          });
          const ligne = function(k){
            return '<button type="button" class="mp-kid" data-goto="' + k.id + '">' +
                   '<span class="mp-kid-dot" style="background:' + CATS[k.c].col + '"></span>' +
                   esc(k.n) + '<em class="mp-kid-st mp-kid-st--' + k.s + '">' + STATUTS[k.s].court + '</em>' +
                   '</button>';
          };
          h += '<div class="mp-kids"><p class="mp-kids-h">Contiene ' + kids.length +
               (lkPluriel(kids.length)?' lieux' : ' lugar') + '</p>' +
               tries.slice(0, LIM).map(ligne).join('') +
               (tries.length > LIM
                 ? '<div id="mp-kids-suite" hidden>' + tries.slice(LIM).map(ligne).join('') + '</div>' +
                   '<button type="button" class="mp-kids-more" id="mp-kids-more">Mostrar los ' + (tries.length - LIM) + ' autres</button>'
                 : '') +
               '</div>';
        }
        return h;
      })() +
      '<div class="mp-row">' +
        '<button type="button" class="mp-btn' + (isFound ? ' on' : '') + '" id="mp-toggle">' +
          (isFound ? 'Visto' : 'Marcar como descubierto') +
        '</button>' +
        '<button type="button" class="mp-share" id="mp-share" title="Copiar el enlace a este lugar" aria-label="Copiar el enlace">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1"/></svg>' +
        '</button>' +
      '</div>';
    panel.classList.add('open'); panel.inert=false;

    if(p.img2){
      const zone = document.getElementById('mp-photos');
      const figure = function(src, legende, real){
        const w = real ? p.img2W : p.imgW, h = real ? p.img2H : p.imgH;
        return '<figure class="mp-img"><img src="' + esc(src) + '" alt="' + esc(real ? (p.img2Alt || 'Lugar real: ' + (p.reel || p.n)) : (p.imgAlt || p.n)) + '" decoding="async" ' + (w && h ? 'width="' + Number(w) + '" height="' + Number(h) + '"' : '') + '>' +
               (legende ? '<figcaption>' + esc(legende) + '</figcaption>' : '') + '</figure>';
      };
      const charger = function(src){
        if(!src)return Promise.resolve(false);
        return new Promise(function(ok){
          const im = new Image();
          im.onload = function(){ ok(true); };
          im.onerror = function(){ ok(false); };
          im.src = src;
        });
      };
      Promise.all([charger(p.img), charger(p.img2)]).then(function(r){
        /* le panneau a pu changer de lieu entre-temps */
        if(!zone || !zone.isConnected) return;
        let h = '';
        if(r[0]) h += figure(p.img, p.imgSrc);
        if(r[1]) h += figure(p.img2, p.img2Src, true);
        if(h) zone.innerHTML = h;
      });
    }

    const shareBt = document.getElementById('mp-share');
    if(shareBt){
      shareBt.addEventListener('click', function(e){
        e.stopPropagation();
        const url = location.origin + location.pathname + '#lieu=' + p.id;
        window.LK.copy(url).then(ok=>{if(ok){shareBt.classList.add('ok');setTimeout(()=>shareBt.classList.remove('ok'),1500);}});
      });
    }

    /* déplier ce lieu : ses enfants deviennent visibles quel que soit le zoom */
    expanded[p.id] = true;
    refreshVisibility();

    const plusBt = document.getElementById('mp-kids-more');
    if(plusBt){
      plusBt.addEventListener('click', function(){
        const suite = document.getElementById('mp-kids-suite');
        if(suite){ suite.hidden = false; plusBt.remove(); }
      });
    }

    panelIn.querySelectorAll('[data-goto]').forEach(function(b){
      b.addEventListener('click', function(){
        const t = byId(b.dataset.goto);
        if(t) goTo(t, Math.max(scale, ZOOM_NIVEAU[t.z || 0] + 0.1));
      });
    });

    document.getElementById('mp-toggle').addEventListener('click', function(){
      found[p.id] = !found[p.id];
      if(!found[p.id]) delete found[p.id];
      save();
      const mk = MK[p.id];
      if(mk) mk.classList.toggle('is-found', !!found[p.id]);
      refreshProgress();
      openPanel(p);
    });
  }

  function openCollectiblePanel(p){
    const item = p.collectible;
    const state = collectibleApi ? collectibleApi.getState() : {found:{}, favorites:{}};
    const isFound = !!state.found[item.id];
    const favorite = !!state.favorites[item.id];
    const trackable = !!(collectibleApi && collectibleApi.isTrackable(item));
    const storage = collectibleApi && typeof collectibleApi.getStorageStatus === 'function' ? collectibleApi.getStorageStatus() : null;
    const st = pointStatus(p);
    const itemHref = collectibleApi ? collectibleApi.itemUrl(item) : '/collectibles/' + encodeURIComponent(item.slug) + '.html';
    const coordinateSource = sourceUrl(item.coordinates.sourceUrl);
    panelIn.innerHTML = '<p class="mp-cat" style="color:' + CATS.collectible.col + '">Coleccionable</p>' +
      '<h3>' + esc(item.name) + '</h3><span class="mp-st mp-st--' + p.s + '">' + esc(st.court) + '</span>' +
      '<p class="mp-d">' + esc(item.summary || item.description || '') + '</p>' +
      '<div class="mp-meta"><div><span>Fiabilidad</span><b>' + esc(st.nom) + '</b></div>' +
      '<div><span>Ubicación</span><b>Coordenadas verificadas</b></div>' +
      '<div><span>Fuente de la posición</span><b><a href="' + esc(coordinateSource) + '" target="_blank" rel="noopener noreferrer">Ver la fuente</a></b></div></div>' +
      '<a class="mp-link" href="' + esc(itemHref) + '">Ver la ficha del coleccionable →</a>' +
      (trackable ? '<button type="button" class="mp-btn' + (isFound ? ' on' : '') + '" id="mp-collectible-found" aria-pressed="' + isFound + '">' +
        (isFound ? 'Encontrado' : 'Marcar como encontrado') + '</button>' : '<p class="mp-d">El seguimiento de coleccionables no está disponible para esta ficha.</p>') +
      (collectibleApi ? '<button type="button" class="mp-btn' + (favorite ? ' on' : '') + '" id="mp-collectible-favorite" aria-pressed="' + favorite + '">' +
        (favorite ? 'Quitar de favoritos' : 'Añadir a favoritos') + '</button>' : '') +
      '<button type="button" class="mp-btn" id="mp-collectible-share">Copiar el enlace a este coleccionable</button>' +
      '<p class="mp-d" id="mp-collectible-status" role="status">' + esc(storage ? storage.message : '') + '</p>';
    panel.classList.add('open'); panel.inert = false;
    const foundButton = document.getElementById('mp-collectible-found');
    const favoriteButton = document.getElementById('mp-collectible-favorite');
    if(foundButton) foundButton.addEventListener('click', function(){
      collectibleApi.setFound(item.id, !collectibleApi.getState().found[item.id]);
    });
    if(favoriteButton) favoriteButton.addEventListener('click', function(){
      collectibleApi.setFavorite(item.id, !collectibleApi.getState().favorites[item.id]);
    });
    document.getElementById('mp-collectible-share').addEventListener('click', function(){
      window.LK.copy(location.origin + location.pathname + '#collectible=' + encodeURIComponent(item.id)).then(function(ok){
        const status = document.getElementById('mp-collectible-status');
        if(status && ouvertId === p.id) status.textContent = ok ? 'Enlace copiado.' : 'No se puede copiar. El enlace está en la barra de direcciones.';
      });
    });
    refreshVisibility();
    syncHash();
  }

  function refreshCollectibles(){
    if(collectibleApi) collectibleState = collectibleApi.getState();
    POINTS.forEach(function(p){
      if(p.collectible && MK[p.id]) MK[p.id].classList.toggle('is-found', pointFound(p));
    });
    const p = ouvertId && byId(ouvertId);
    if(p && p.collectible){
      const focusedId = panelIn.contains(document.activeElement) ? document.activeElement.id : null;
      openCollectiblePanel(p);
      const button = focusedId && document.getElementById(focusedId);
      if(button) button.focus({preventScroll:true});
    }else refreshVisibility();
  }

  function closePanel(){
    panel.classList.remove('open'); panel.inert=true;
    collectibleHash = null;
    syncHash();
    if(ouvertId || Object.keys(expanded).length){
      ouvertId = null;
      expanded = {};          /* ce qui avait été déplié se replie avec la fiche */
      refreshVisibility();
    }
  }
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
    if(stage.classList.contains('drawing') || e.target.closest('.map-zoom,.map-mini,.map-help,.map-help-box,.map-coord'))return;
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
    if(stage.classList.contains('drawing') || stage.classList.contains('editing') || e.target.closest('.map-panel,.map-zoom,.map-mini,.map-help,.map-help-box,.map-coord'))return;

    if(rulerOn){
      const mk = e.target.closest('.mk');
      if(mk){
        const p = byId(mk.dataset.id);
        if(p) addRulerPoint({ id:p.id, n:p.n, x:p.x, y:p.y, lieu:p.n });
      } else {
        const w = toWorld(e.clientX, e.clientY);
        addRulerPoint({ id:'free-' + w.x + '-' + w.y, n:'Punto ' + (rulerPts.length >= 2 ? 'A' : (rulerPts.length ? 'B' : 'A')), x:w.x, y:w.y, free:true });
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
      fullBt.setAttribute('aria-label', on ? 'Salir de pantalla completa' : 'Pantalla completa');
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
      onlyBt.textContent = on ? 'Mostrar todo' : 'Solo lo oficial';
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
      const st = pointStatus(p);
      let h = '<li class="tr-item tr-d' + depth + (kids.length ? ' has-kids' : '') + '">' +
              '<div class="tr-row">' +
              (kids.length ? '<button type="button" class="tr-tog" aria-label="Desplegar">›</button>' : '<span class="tr-sp"></span>') +
              '<button type="button" class="tr-go" data-goto="' + p.id + '">' +
              '<span class="tr-dot" style="background:' + CATS[p.c].col + '"></span>' +
              '<span class="tr-n">' + esc(p.n) + '</span>' +
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
        const t = byId(b.dataset.goto);
        if(t) goTo(t, Math.max(0.5, ZOOM_NIVEAU[t.z || 0] + 0.15));
      });
    });
  }
  buildTree();

  /* totaux affichés : bandeau du haut et volet "Tous les lieux" */
  (function(){
    const total = POINTS.length;
    const nommes = POINTS.filter(p => p.s === 'officiel').length;
    const stats = document.querySelectorAll('.vstat .n[data-count]');
    if(stats[0]) stats[0].dataset.count = stats[0].textContent = total;
    if(stats[1]) stats[1].dataset.count = stats[1].textContent = nommes;
    document.querySelectorAll('.ms-n').forEach(function(n){ n.textContent = total; });
  })();

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
  try{ layers = window.LK.read(LAYER_KEY,{},v=>window.LK.record(v)&&Object.values(v).every(x=>typeof x==='boolean')); }catch(e){ layers = {}; }

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
      window.LK.write(LAYER_KEY,layers);
      applyLayer(name, inp.checked);
    });
  });

  /* ============================================================
     RECHERCHE
     ============================================================ */
  const norm = s => s.toLowerCase().replace(/ß/g,'ss').normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[’‘]/g,"'").replace(/[\u00a0\u202f]/g," ");

  function goTo(p, z, showPanel = true){
    scale = z || 0.7;
    const r = stage.getBoundingClientRect();
    tx = r.width / 2 - p.x * scale;
    ty = r.height / 2 - p.y * scale;
    clamp(); applyTransform();
    if(showPanel) openPanel(p);
  }

  if(searchI){
    searchI.addEventListener('input', function(){
      const v = norm(searchI.value.trim());
      if(!v){ sugBox.classList.remove('open'); sugBox.innerHTML=''; return; }
      const scores = [];
      POINTS.forEach(function(p){
        const n = norm(p.n);
        let sc;
        if(n.startsWith(v)) sc = 0;
        else if(n.includes(v)) sc = 1;
        else if(norm(CATS[p.c].nom).includes(v)) sc = 2;
        else if(norm(p.d).includes(v)) sc = 3;
        else return;
        scores.push([sc + prioriteEtiquette(p) * 0.1, p]);
      });
      scores.sort((a, b) => a[0] - b[0]);
      const hits = scores.slice(0, 10).map(x => x[1]);
      sugBox.innerHTML = hits.length
        ? hits.map(function(p){
            const parent = p.p ? byId(p.p) : null;
            const detail = (p.r ? p.r + ' · ' : '') + (parent ? parent.n + ' · ' : '') + CATS[p.c].nom;
            return '<button type="button" role="option" aria-selected="false" data-go="'+p.id+'"><span>'+p.n+'</span>'+
              '<span class="kind" style="color:'+CATS[p.c].col+'">'+detail+'</span></button>';
          }).join('')
        : '<div class="none" role="option" aria-disabled="true" aria-selected="false">No se ha encontrado ningún lugar.</div>';
      sugBox.classList.add('open');
    });

    searchI.setAttribute('aria-controls','map-sug');searchI.setAttribute('aria-expanded','false');
    searchI.addEventListener('input',()=>searchI.setAttribute('aria-expanded',String(sugBox.classList.contains('open'))));
    searchI.addEventListener('keydown',function(e){if(e.key==='Escape'){sugBox.classList.remove('open');searchI.setAttribute('aria-expanded','false');}else if(e.key==='ArrowDown' || e.key==='Enter'){const b=sugBox.querySelector('button');if(b){e.preventDefault();if(e.key==='Enter')b.click();else b.focus();}}});
    sugBox.addEventListener('keydown',function(e){const buttons=Array.from(sugBox.querySelectorAll('button'));const i=buttons.indexOf(e.target);if(i<0)return;if(e.key==='Escape'){sugBox.classList.remove('open');searchI.setAttribute('aria-expanded','false');searchI.focus();}else if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(i+(e.key==='ArrowDown'?1:-1)+buttons.length)%buttons.length].focus();}});
    sugBox.addEventListener('focusin',function(e){sugBox.querySelectorAll('[role="option"]').forEach(o=>o.setAttribute('aria-selected',String(o===e.target)));});
    sugBox.addEventListener('click', function(e){
      const b = e.target.closest('[data-go]');
      if(!b) return;
      const p = byId(b.dataset.go);
      if(p){ goTo(p); sugBox.classList.remove('open'); searchI.value = p.n; searchI.setAttribute('aria-expanded','false'); }
    });

    document.addEventListener('click', function(e){
      if(!e.target.closest('.map-searchwrap')) sugBox.classList.remove('open');
    });
  }

  /* ============================================================
     CALCULATEUR DE DISTANCE
     ============================================================ */
  function fmtDuree(sec){
    sec=Math.round(sec);
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
    plane:'<path d="M12 3l2 8 8 3v2l-8-1-1 5 3 2v1l-4-1-4 1v-1l3-2-1-5-8 1v-2l8-3z"/>',
    heli:'<path d="M4 5h16M12 5v4M7 12h7a4 4 0 0 1 4 4v1H9a4 4 0 0 1-4-4v-1zM5 20h10M12 17v3"/>'
  };

  /* ============================================================
     v7.69 : CALCULATEUR DE TRAJET (Téva : « combien ça met à pied, combien en voiture, mais toutes les voitures ne sont
     pas pareilles » ; un outil à part, qui s’ouvre sur la carte). Les points se posent comme avant (départ, arrivée,
     étapes) ; la distance est à vol d’oiseau ; les temps s’affichent tout de suite, marqués « estimation » : vitesses de
     référence de GTA V (une hypothèse, pas des données de GTA VI). Jusqu’à trois véhicules du site à comparer, chacun avec
     SA vitesse : la référence de sa famille, ou celle que tu as mesurée en jeu et écrite ici (gardée sur l’appareil,
     lk_trajet_v1). v7.70 : tous les moyens de déplacement sont listés (à pied, en courant, à vélo, moto, voiture, bateau,
     hélicoptère, avion), chacun avec sa référence de GTA V. Lien direct : carte.html#trajet.
     ============================================================ */
  const trajetBox = document.getElementById('map-trajet');
  const trajetFab = document.getElementById('map-trajet-fab');
  const trajetX = document.getElementById('map-trajet-x');
  const trajetLive = document.getElementById('map-trajet-live');
  const rulerUndo = document.getElementById('map-ruler-undo');
  const TRAJET_KEY = 'lk_trajet_v1';
  const FAMILLE = { berline:'voiture', sport:'voiture', supercar:'voiture', muscle:'voiture', suv:'voiture', pickup:'voiture', van:'voiture', service:'voiture', divers:'voiture', moto:'moto', bateau:'bateau', avion:'avion', helicoptere:'helico' };
  const GENERIQUES = [
    { id:'voiture', nom:'Coche (referencia de GTA V)' },
    { id:'moto',    nom:'Moto (referencia de GTA V)' },
    { id:'bateau',  nom:'Barco (referencia de GTA V)' },
    { id:'helico',  nom:'Helicóptero (referencia de GTA V)' },
    { id:'avion',   nom:'Avión (referencia de GTA V)' }
  ];
  /* v7.70 (Téva : « le calculateur doit prendre en compte tous les moyens de déplacement ») : chaque famille du site a sa référence
     de GTA V, hélicoptères compris (vitesse de croisière moyenne) ; le panneau liste d'abord tous les moyens, puis tes véhicules. */
  const FAM_LABEL = { voiture:'coche medio de GTA V', moto:'moto media de GTA V', bateau:'barco medio de GTA V', helico:'helicóptero medio de GTA V', avion:'avión medio de GTA V' };
  const ICO_FAM = { voiture:'car', moto:'moto', bateau:'boat', avion:'plane', helico:'heli' };
  const SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/;
  const validTrajet = function(v){
    return !!v && typeof v === 'object' && !Array.isArray(v) && Array.isArray(v.choix) && v.choix.length >= 1 && v.choix.length <= 3
      && v.choix.every(function(c){ return typeof c === 'string' && SLUG.test(c); })
      && !!v.vit && typeof v.vit === 'object' && !Array.isArray(v.vit) && Object.keys(v.vit).length <= 400
      && Object.keys(v.vit).every(function(k){ return SLUG.test(k) && typeof v.vit[k] === 'number' && v.vit[k] > 0 && v.vit[k] <= 2000; });
  };
  let trajet = window.LK.read(TRAJET_KEY, { choix:['voiture'], vit:{} }, validTrajet);
  let vehs = null, distM = 0, saveTimer = 0, lastLive = '';
  function vehOf(id){
    const g = GENERIQUES.find(function(x){ return x.id === id; }); if(g) return { id:id, nom:g.nom, fam:id };
    const v = vehs && vehs.get(id); return v ? { id:id, nom:v[1], fam:FAMILLE[v[2]] || 'voiture' } : null;
  }
  function refKmh(fam){ const v = VITESSES.find(function(x){ return x.id === fam; }); return v ? Math.round(v.v * 3.6) : null; }
  function kmhOf(id){ const c = vehOf(id); return c ? (trajet.vit[id] || refKmh(c.fam)) : null; }
  function loadVehs(){
    if(vehs) return Promise.resolve();
    const done = function(){ vehs = new Map((window.LK_TRAJET_VEHICULES || []).map(function(v){ return [v[0], v]; })); };
    if(window.LK_TRAJET_VEHICULES){ done(); return Promise.resolve(); }
    return (window.LK && window.LK.lazyScript ? window.LK.lazyScript('carte-vehicules.js') : Promise.reject(new Error('lazy'))).then(done, function(){ vehs = new Map(); });
  }
  function saveTrajet(){ clearTimeout(saveTimer); saveTimer = setTimeout(function(){ window.LK.write(TRAJET_KEY, trajet); }, 300); }
  function svgIco(k){ return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[k] + '</svg>'; }
  function duree(kmh){ return kmh ? '≈ ' + fmtDuree(distM / (kmh / 3.6)) : 'Escribe una velocidad'; }
  function chemin(){
    return rulerPts.map(function(p, i){
      return '<span class="rl-step"><b>' + LETTRES[i] + '</b>' + esc(p.lieu || (p.x + ' · ' + p.y)) + '</span>';
    }).join('<i aria-hidden="true">→</i>');
  }
  function sourceOf(c){ return trajet.vit[c.id] ? 'Tu velocidad, guardada en este dispositivo' : (refKmh(c.fam) ? 'Referencia: ' + FAM_LABEL[c.fam] : 'Sin referencia publicada: escribe tu velocidad'); }
  function vehRow(id, i){
    const c = vehOf(id) || vehOf('voiture'), k = kmhOf(c.id);
    return '<div class="rl-veh" data-i="' + i + '">'
      + '<span class="rl-ico">' + svgIco(ICO_FAM[c.fam] || 'car') + '</span>'
      + '<span class="rl-veh-main"><label class="sr-only" for="rl-veh-' + i + '">Vehículo ' + (i + 1) + ' para comparar</label>'
      + '<input class="rl-veh-in" id="rl-veh-' + i + '" list="rl-veh-list" value="' + esc(c.nom) + '" autocomplete="off" spellcheck="false" data-i="' + i + '">'
      + '<span class="rl-veh-src" id="rl-src-' + i + '">' + esc(sourceOf(c)) + '</span></span>'
      + '<span class="rl-kmh"><input type="number" class="rl-kmh-in" id="rl-kmh-' + i + '" min="1" max="2000" step="1" inputmode="numeric" value="' + (k || '') + '" placeholder="?" data-i="' + i + '" aria-label="Velocidad en km/h, ' + esc(c.nom) + '"><span aria-hidden="true">km/h</span></span>'
      + '<span class="rl-t" id="rl-t-' + i + '">' + duree(k) + '</span>'
      + (trajet.choix.length > 1 ? '<button type="button" class="rl-veh-x" data-x="' + i + '" aria-label="Quitar ' + esc(c.nom) + ' de la comparación">&times;</button>' : '')
      + '</div>';
  }
  function options(){
    return GENERIQUES.map(function(g){ return '<option value="' + esc(g.nom) + '"></option>'; }).join('')
      + (vehs ? Array.from(vehs.values()).map(function(v){ return '<option value="' + esc(v[1]) + '"></option>'; }).join('') : '');
  }
  function live(){
    if(!trajetLive) return;
    let t = '';
    if(rulerPts.length >= 2){
      const k = kmhOf(trajet.choix[0]), c = vehOf(trajet.choix[0]);
      t = 'Distancia: ' + fmtDist(distM) + '. A pie: ' + fmtDuree(distM / VITESSES[0].v) + '.' + (k && c ? ' ' + c.nom + ': ' + fmtDuree(distM / (k / 3.6)) + '.' : '');
    }
    if(t !== lastLive){ lastLive = t; trajetLive.textContent = t; }
  }

  function renderRuler(){
    if(rulerUndo) rulerUndo.hidden = !rulerPts.length;
    if(rulerPts.length < 2){
      distM = 0;
      rulerBx.innerHTML = '<ol class="rl-how"><li class="' + (rulerPts.length ? 'is-done' : 'is-now') + '">Haz clic en tu <b>salida</b> en cualquier punto del mapa o en un lugar.</li>'
        + '<li class="' + (rulerPts.length ? 'is-now' : '') + '">Haz clic en tu <b>llegada</b>. Puedes añadir etapas, hasta ' + MAX_ETAPES + ' puntos.</li>'
        + '<li>Compara los tiempos a pie, en bici y para <b>tu vehículo</b>.</li></ol>'
        + (rulerPts.length ? '<p class="rl-pair">' + chemin() + '</p>' : '');
      live(); return;
    }
    /* distance cumulée sur l'ensemble du trajet */
    let du = 0;
    const etapes = [];
    for(let i = 1; i < rulerPts.length; i++){
      const seg = Math.hypot(rulerPts[i-1].x - rulerPts[i].x, rulerPts[i-1].y - rulerPts[i].y);
      du += seg;
      etapes.push(seg * METRES_PAR_UNITE);
    }
    distM = du * METRES_PAR_UNITE;
    rulerBx.innerHTML =
      '<p class="rl-pair">' + chemin() + '</p>' +
      '<p class="rl-dist">' + fmtDist(distM) + ' <span class="rl-dist-k">en línea recta</span></p>' +
      (lkPluriel(etapes.length) ? '<p class="rl-seg">' + etapes.length + ' tramos · el más largo ' + fmtDist(Math.max.apply(null, etapes)) + '</p>' : '') +
      '<p class="rl-times-h"><span class="rl-sim-tag">Estimación</span> ¿Cuánto tiempo?</p>' +
      '<ul class="rl-list rl-list--all">' + VITESSES.map(function(v){
        return '<li' + (['pied','de competición','velo'].indexOf(v.id) === -1 ? ' class="rl-li-veh"' : '') + '><span class="rl-ico">' + svgIco(v.ico) + '</span><span class="rl-nom">' + v.nom + (['pied','de competición','velo'].indexOf(v.id) === -1 ? ' <small>ref. GTA V</small>' : '') + '</span><span class="rl-t">≈ ' + fmtDuree(distM / v.v) + '</span></li>';
      }).join('') + '</ul>' +
      '<p class="rl-vehs-h">Con tu vehículo <span>cada uno con su velocidad</span></p>' +
      '<div class="rl-vehs">' + trajet.choix.map(vehRow).join('') + '</div>' +
      (trajet.choix.length < 3 ? '<button type="button" class="rl-veh-add" id="rl-veh-add">+ Comparar otro vehículo</button>' : '') +
      '<datalist id="rl-veh-list">' + options() + '</datalist>' +
      '<p class="rl-note">Distancia en línea recta sobre el mapa base (escala por confirmar después del 19 de noviembre de 2026), sin carreteras ni relieve: el trayecto real será más largo. Velocidades de referencia: GTA V, una hipótesis a la espera de GTA VI. Mide la velocidad de tus vehículos en el juego y escríbela: se queda en este dispositivo.</p>';
    live();
  }
  function updateVeh(i){
    const id = trajet.choix[i], c = vehOf(id); if(!c) return;
    const t = document.getElementById('rl-t-' + i), src = document.getElementById('rl-src-' + i);
    if(t) t.textContent = duree(kmhOf(id));
    if(src) src.textContent = sourceOf(c);
    live();
  }
  function findVeh(text){
    const q = String(text || '').trim().toLowerCase(); if(!q) return null;
    const g = GENERIQUES.find(function(x){ return x.nom.toLowerCase() === q; }); if(g) return g.id;
    if(!vehs) return null;
    let hit = null, n = 0;
    vehs.forEach(function(v){ const name = v[1].toLowerCase(); if(name === q){ hit = v[0]; n = -1; } else if(n >= 0 && name.indexOf(q) !== -1){ hit = hit || v[0]; n++; } });
    return n === -1 || n === 1 ? hit : null;
  }
  if(rulerBx){
    rulerBx.addEventListener('change', function(e){
      const inp = e.target.closest('.rl-veh-in'); if(!inp) return;
      const i = +inp.dataset.i, id = findVeh(inp.value);
      if(id){ trajet.choix[i] = id; saveTrajet(); renderRuler(); const again = document.getElementById('rl-kmh-' + i); if(again) again.focus(); }
      else { const c = vehOf(trajet.choix[i]); inp.value = c ? c.nom : ''; }
    });
    rulerBx.addEventListener('input', function(e){
      const inp = e.target.closest('.rl-kmh-in'); if(!inp) return;
      const i = +inp.dataset.i, id = trajet.choix[i], n = Math.round(Number(inp.value));
      if(inp.value === '' || !Number.isFinite(n) || n <= 0) delete trajet.vit[id];
      else trajet.vit[id] = Math.min(2000, n);
      saveTrajet(); updateVeh(i);
    });
    rulerBx.addEventListener('click', function(e){
      const add = e.target.closest('#rl-veh-add'), x = e.target.closest('.rl-veh-x');
      if(add){
        const next = ['voiture','moto','bateau','avion'].find(function(id){ return trajet.choix.indexOf(id) === -1; }) || 'voiture';
        trajet.choix.push(next); saveTrajet(); renderRuler();
        const inp = document.getElementById('rl-veh-' + (trajet.choix.length - 1)); if(inp){ inp.focus(); inp.select(); }
      } else if(x){
        trajet.choix.splice(+x.dataset.x, 1); saveTrajet(); renderRuler();
        const inp = document.getElementById('rl-veh-0'); if(inp) inp.focus();
      }
    });
  }

  function drawLine(){
    if(!svgLine) return;
    if(rulerPts.length < 2){ svgLine.setAttribute('d',''); return; }
    svgLine.setAttribute('d',
      'M' + rulerPts.map(p => p.x + ',' + p.y).join(' L'));
  }

  const MAX_ETAPES = 50;
  /* A…Z puis AA, AB… */
  const LETTRES = new Proxy({}, { get: function(_, i){
    i = Number(i); let n = i, s = '';
    do { s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26) - 1; } while(n >= 0);
    return s;
  }});
  function addRulerPoint(p){
    if(rulerPts.length >= MAX_ETAPES) return;
    p.n = 'Punto ' + LETTRES[rulerPts.length];
    rulerPts.push(p);

    Object.keys(MK).map(k => MK[k]).forEach(function(el){
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

  function setTrajet(on){
    if(on === rulerOn) return;
    if(on) document.querySelectorAll('#map-edit.on,#dr-on.on').forEach(function(b){ b.click(); });
    rulerOn = on;
    if(rulerBt){ rulerBt.classList.toggle('on', rulerOn); rulerBt.setAttribute('aria-pressed', rulerOn); }
    if(trajetBox) trajetBox.hidden = !rulerOn;
    if(trajetFab){ trajetFab.hidden = rulerOn; trajetFab.setAttribute('aria-expanded', rulerOn); }
    stage.classList.toggle('picking', rulerOn);
    if(rulerOn){
      closePanel(); renderRuler();
      loadVehs().then(function(){ if(rulerOn && rulerPts.length >= 2) renderRuler(); });
    } else {
      rulerPts = []; drawLine(); drawPins(); distM = 0; live();
      Object.keys(MK).map(k => MK[k]).forEach(el => el.classList.remove('is-picked'));
    }
  }
  if(rulerBt) rulerBt.addEventListener('click', function(){ setTrajet(!rulerOn); if(rulerOn && trajetBox) trajetBox.querySelector('.map-trajet-x').focus({ preventScroll:true }); });
  if(trajetFab) trajetFab.addEventListener('click', function(){ setTrajet(true); const ms = document.getElementById('map-trajet-ms'); if(ms) ms.open = true; if(trajetX) trajetX.focus({ preventScroll:true }); });
  if(trajetX) trajetX.addEventListener('click', function(){ setTrajet(false); if(trajetFab) trajetFab.focus({ preventScroll:true }); });
  if(trajetBox){
    /* les interactions dans le calculateur ne déplacent pas la carte et ne posent pas de point */
    ['click','pointerdown','pointerup','wheel','dblclick'].forEach(function(ev){ trajetBox.addEventListener(ev, function(e){ e.stopPropagation(); }); });
    trajetBox.addEventListener('keydown', function(e){ if(e.key === 'Escape'){ e.stopPropagation(); setTrajet(false); if(trajetFab) trajetFab.focus({ preventScroll:true }); } });
  }
  if(trajetFab) ['click','pointerdown','pointerup','dblclick'].forEach(function(ev){ trajetFab.addEventListener(ev, function(e){ e.stopPropagation(); }); });
  if(rulerUndo){
    rulerUndo.addEventListener('click', function(){
      rulerPts.pop(); drawLine(); drawPins(); renderRuler();
      Object.keys(MK).map(k => MK[k]).forEach(function(el){ el.classList.toggle('is-picked', rulerPts.some(r => r.id === el.dataset.id)); });
    });
  }
  if(rulerRs){
    rulerRs.addEventListener('click', function(){
      rulerPts = []; drawLine(); drawPins(); renderRuler();
      Object.keys(MK).map(k => MK[k]).forEach(el => el.classList.remove('is-picked'));
    });
  }

  /* ============================================================
     DÉMARRAGE
     ============================================================ */
  if(progRs){
    progRs.addEventListener('click', function(){
      if(!confirm('¿Desmarcar todos los lugares descubiertos?')) return;
      found = {}; save();
      Object.keys(MK).forEach(id => { if(!BY_ID[id].collectible) MK[id].classList.remove('is-found'); });
      refreshProgress(); closePanel();
    });
  }

  buildMarkers();
  if(!readHash()) center();
  window.addEventListener('hashchange', readHash);
  if(collectibleApi && typeof collectibleApi.subscribe === 'function') collectibleApi.subscribe(refreshCollectibles);
  else window.addEventListener('lk:collectibles-change', refreshCollectibles);
  window.addEventListener('resize', function(){ clamp(); applyTransform(); });

  /* raccourcis clavier */
  document.addEventListener('keydown', function(e){
    if(e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
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
      if(e.key === '?' && !e.target.closest('input,textarea,select,[contenteditable="true"]')) helpBt.click();
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
    centerOn: (p,z)=>goTo(p,z,false),
    closePanel: closePanel,
    wasDrag: function(){ return moved >= 6; },
    scale: function(){ return scale; },
    getFound: function(){ return found; },
    cleanFound: f=>Object.fromEntries(Object.entries(f).filter(([id])=>Object.hasOwn(BY_ID,id) && !BY_ID[id].collectible)),
    setFound: function(f,persist=true){
      if(!window.LK.own(f))throw new Error('Progreso no válido');
      found = Object.fromEntries(Object.entries(f).filter(([id])=>Object.hasOwn(BY_ID,id) && !BY_ID[id].collectible)); if(persist)save();
      Object.keys(MK).map(k => MK[k]).forEach(function(el){
        el.classList.toggle('is-found', pointFound(BY_ID[el.dataset.id]));
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
  try{ perso = window.LK.read(PERSO_KEY,[],window.LK.markers); }catch(e){ perso = []; }
  function savePerso(){ window.LK.write(PERSO_KEY,perso); }

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
    if(perso.length && editList){
      const s = editList.closest('details');
      if(s && !s.open) s.open = true;
    }
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
      '<p class="mp-cat" style="color:#0B8B84">Marcador personal</p>' +
      '<h3>' + esc(p.n) + '</h3>' +
      (p.note ? '<p class="mp-d">' + esc(p.note) + '</p>' : '') +
      '<div class="mp-meta"><div><span>Posición</span><b>' + p.x + ' · ' + p.y + '</b></div>' +
      (p.cat ? '<div><span>Categoría</span><b>' + esc(p.cat) + '</b></div>' : '') + '</div>' +
      '<div class="pm-acts">' +
        '<button type="button" class="mp-btn" id="pm-edit">Editar</button>' +
        '<button type="button" class="mp-btn pm-del" id="pm-del">Eliminar</button>' +
      '</div>';
    M.panel.classList.add('open'); M.panel.inert=false;

    document.getElementById('pm-edit').addEventListener('click', function(){
      const n = prompt('Nombre del marcador', p.n);
      if(n === null) return;
      const note = prompt('Nota (opcional)', p.note || '');
      p.n = n.trim().slice(0,200) || p.n;
      p.note = (note || '').trim().slice(0,4000);
      savePerso(); renderPerso(); openPerso(i);
    });
    document.getElementById('pm-del').addEventListener('click', function(){
      if(!confirm('¿Eliminar este marcador?')) return;
      perso.splice(i, 1);
      savePerso(); renderPerso(); M.panel.classList.remove('open'); M.panel.inert=true;
    });
  }

  function renderList(){
    if(!editList) return;
    if(!perso.length){
      editList.innerHTML = '<p class="ed-empty">Aún no hay marcadores. Activa el modo edición y haz clic en el mapa.</p>';
      return;
    }
    editList.innerHTML = perso.map(function(p, i){
      return '<li>' +
             '<button type="button" class="ed-go" data-go="' + i + '">' +
             '<span class="ed-dot"></span>' +
             '<span class="ed-n">' + esc(p.n) + '</span>' +
             '<span class="ed-c">' + p.x + ' · ' + p.y + '</span></button>' +
             '<button type="button" class="ed-ren" data-ren="' + i + '" ' +
             'aria-label="Renombrar" title="Renombrar">&#9998;</button>' +
             '<button type="button" class="ed-del" data-del="' + i + '" ' +
             'aria-label="Eliminar" title="Eliminar">&times;</button>' +
             '</li>';
    }).join('');
  }

  if(editList){
    editList.addEventListener('click', function(e){
      const del = e.target.closest('[data-del]');
      if(del){
        const i = parseInt(del.dataset.del, 10);
        if(!confirm('Eliminar “' + perso[i].n + '”?')) return;
        perso.splice(i, 1); savePerso(); renderPerso();
        if(M.panel) M.panel.classList.remove('open'); M.panel.inert=true;
        return;
      }
      const ren = e.target.closest('[data-ren]');
      if(ren){
        const i = parseInt(ren.dataset.ren, 10);
        const n = prompt('Nombre del marcador', perso[i].n);
        if(n === null) return;
        const note = prompt('Nota (opcional)', perso[i].note || '');
        perso[i].n = n.trim().slice(0,200) || perso[i].n;
        perso[i].note = (note || '').trim().slice(0,4000);
        savePerso(); renderPerso();
        return;
      }
      const go = e.target.closest('[data-go]');
      if(go){
        const p = perso[parseInt(go.dataset.go, 10)];
        if(p){M.closePanel(); M.centerOn(p,0.8); openPerso(parseInt(go.dataset.go,10));}
      }
    });
  }

  /* tout effacer */
  const clearAll = document.getElementById('map-perso-clear');
  if(clearAll){
    clearAll.addEventListener('click', function(){
      if(!perso.length) return;
      if(!confirm('¿Eliminar tus {n} marcadores?'.replace('{n}', perso.length))) return;
      perso = []; savePerso(); renderPerso(); M.closePanel();
    });
  }

  if(editBt){
    editBt.addEventListener('click', function(){
      if(!editOn)document.querySelectorAll('#map-ruler.on,#dr-on.on').forEach(b=>b.click());
      editOn = !editOn;
      editBt.classList.toggle('on', editOn);
      editBt.setAttribute('aria-pressed', editOn);
      if(editPane) editPane.hidden = !editOn;
      stage.classList.toggle('editing', editOn);
      editBt.textContent = editOn ? 'Salir del modo edición' : 'Añadir mis marcadores';
    });
  }

  /* pose d'un marqueur au clic, en mode édition */
  stage.addEventListener('click', function(e){
    if(!editOn || stage.classList.contains('drawing')) return;
    if(e.target.closest('.map-panel, .map-zoom, .pm, .map-mini, .map-help, .map-help-box, .map-coord')) return;
    if(M.wasDrag()) return;
    const w = M.toWorld(e.clientX, e.clientY);
    const n = prompt('Nombre del marcador', 'Nuevo punto');
    if(n === null) return;
    const note = prompt('Nota (opcional)', '');
    perso.push({ n: n.trim().slice(0,200) || 'Sin nombre', note: (note||'').trim().slice(0,4000), x: w.x, y: w.y });
    savePerso(); renderPerso();
  }, true);

  /* ---------- 3. EXPORT ET IMPORT ---------- */
  const expBt = document.getElementById('map-export');
  const impBt = document.getElementById('map-import');
  const impIn = document.getElementById('map-import-file');

  if(expBt){
    expBt.addEventListener('click', function(){
      const data = {
        version: 2,
        genere: new Date().toISOString(),
        marqueurs: perso,
        repere: M.getFound(),
        traces: M.getDraw ? M.getDraw() : []
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
      if(f.size > 5*1024*1024){alert('Archivo demasiado grande (máximo 5 MB).'); impIn.value=''; return;}
      const fr = new FileReader();
      fr.onerror = function(){alert('No se puede leer el archivo.');impIn.value='';};
      fr.onload = function(){
        try{
          const d = window.LK.mapImport(JSON.parse(fr.result));
          if((perso.length || Object.keys(M.getFound()).length || M.getDraw?.().length) && !confirm('¿Sustituir tus marcadores, lugares descubiertos y trazos por esta copia de seguridad?')) return;
          d.repere=M.cleanFound(d.repere);
          if(!window.LK.writeBatch({lk_map_perso:d.marqueurs,lk_map_found:d.repere,lk_map_draw:d.traces}))throw new Error('No se puede guardar; importación no aplicada.');
          perso=d.marqueurs; M.setFound(d.repere,false); if(M.setDraw)M.setDraw(d.traces,false);
          M.closePanel(); renderPerso(); alert('Importación correcta.');
        }catch(err){alert('Importación rechazada: '+err.message);}
        finally {impIn.value='';}
      };
      fr.readAsText(f);
    });
  }

  /* ---------- 4. COPIE DES COORDONNÉES ---------- */
  const copyBt = document.getElementById('map-copy');
  if(copyBt){
    copyBt.addEventListener('click', function(){
      const t = document.getElementById('map-coord').textContent;
      window.LK.copy(t,copyBt,'Copiado');
    });
  }

  renderPerso();
})();

/* ============================================================
   OUTILS DE DESSIN — tracés enregistrés en coordonnées de carte
   ============================================================ */
(function(){
  const stage = document.getElementById('map-stage');
  const M = window.LK_MAP;
  if(!stage || !M) return;

  const world = document.getElementById('map-world');
  const svgNS = 'http://www.w3.org/2000/svg';

  /* calque SVG dans le monde : il suit le zoom et le déplacement */
  const layer = document.createElementNS(svgNS, 'svg');
  layer.setAttribute('class', 'map-draw');
  layer.setAttribute('viewBox', '0 0 5200 6000');
  world.appendChild(layer);

  const KEY = 'lk_map_draw';
  let strokes = [];
  let redo = [];
  try{ strokes = window.LK.read(KEY,[],window.LK.strokes); }catch(e){ strokes = []; }

  const ui = {
    on:    document.getElementById('dr-on'),
    pane:  document.getElementById('dr-pane'),
    tools: Array.from(document.querySelectorAll('.dr-tool')),
    cols:  Array.from(document.querySelectorAll('.dr-col')),
    hex:   document.getElementById('dr-hex'),
    size:  document.getElementById('dr-size'),
    sizeV: document.getElementById('dr-size-v'),
    op:    document.getElementById('dr-op'),
    opV:   document.getElementById('dr-op-v'),
    undo:  document.getElementById('dr-undo'),
    redo:  document.getElementById('dr-redo'),
    clear: document.getElementById('dr-clear'),
    count: document.getElementById('dr-count')
  };

  let mode = false, tool = 'pen', color = '#E8452C', size = 6, opacity = .85;
  let cur = null, curEl = null, start = null;

  function save(){ window.LK.write(KEY,strokes); }

  function el(tag, attrs){
    const e = document.createElementNS(svgNS, tag);
    Object.keys(attrs).forEach(k => e.setAttribute(k, attrs[k]));
    return e;
  }

  function render(){
    layer.innerHTML = '';
    strokes.forEach(function(s, i){
      let e;
      const common = { stroke: s.c, 'stroke-width': s.w, 'stroke-opacity': s.o, fill: 'none',
                       'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'data-i': i };
      if(s.t === 'pen'){
        e = el('path', Object.assign({ d: 'M' + s.p.map(p => p[0] + ',' + p[1]).join(' L') }, common));
      } else if(s.t === 'line'){
        e = el('line', Object.assign({ x1:s.a[0], y1:s.a[1], x2:s.b[0], y2:s.b[1] }, common));
      } else if(s.t === 'rect'){
        e = el('rect', Object.assign({ x:Math.min(s.a[0],s.b[0]), y:Math.min(s.a[1],s.b[1]),
              width:Math.abs(s.b[0]-s.a[0]), height:Math.abs(s.b[1]-s.a[1]), rx:6 }, common));
      } else if(s.t === 'circle'){
        const r = Math.hypot(s.b[0]-s.a[0], s.b[1]-s.a[1]);
        e = el('circle', Object.assign({ cx:s.a[0], cy:s.a[1], r:r }, common));
      }
      if(e){
        e.classList.add('dr-stroke');
        e.addEventListener('click', function(ev){
          if(!mode || tool !== 'eraser') return;
          ev.stopPropagation();
          redo = []; strokes.splice(i, 1); save(); render();
        });
        layer.appendChild(e);
      }
    });
    if(ui.count) ui.count.textContent = strokes.length;
    if(ui.undo) ui.undo.disabled = !strokes.length;
    if(ui.redo) ui.redo.disabled = !redo.length;
  }

  /* ---- interaction ---- */
  stage.addEventListener('pointerdown', function(e){
    if(!mode || tool === 'eraser') return;
    if(e.target.closest('.map-panel, .map-zoom, .map-help-box, .map-mini, .dr-bar')) return;
    e.stopPropagation(); e.preventDefault();
    const w = M.toWorld(e.clientX, e.clientY);
    start = [w.x, w.y];
    if(tool === 'pen'){
      cur = { t:'pen', c:color, w:size, o:opacity, p:[start] };
      curEl = el('path', { d:'M'+w.x+','+w.y, stroke:color, 'stroke-width':size, 'stroke-opacity':opacity,
                           fill:'none', 'stroke-linecap':'round', 'stroke-linejoin':'round' });
    } else {
      cur = { t:tool, c:color, w:size, o:opacity, a:start, b:start };
      curEl = el(tool === 'line' ? 'line' : (tool === 'rect' ? 'rect' : 'circle'),
                 { stroke:color, 'stroke-width':size, 'stroke-opacity':opacity, fill:'none', 'stroke-linecap':'round' });
    }
    layer.appendChild(curEl);
    stage.setPointerCapture(e.pointerId);
  }, true);

  stage.addEventListener('pointermove', function(e){
    if(!mode || !cur) return;
    e.stopPropagation();
    const w = M.toWorld(e.clientX, e.clientY);
    if(cur.t === 'pen'){
      const last = cur.p[cur.p.length-1];
      if(Math.hypot(w.x-last[0], w.y-last[1]) < 4 / M.scale()) return;
      cur.p.push([w.x, w.y]);
      curEl.setAttribute('d', curEl.getAttribute('d') + ' L' + w.x + ',' + w.y);
    } else {
      cur.b = [w.x, w.y];
      if(cur.t === 'line'){ curEl.setAttribute('x1',cur.a[0]); curEl.setAttribute('y1',cur.a[1]); curEl.setAttribute('x2',w.x); curEl.setAttribute('y2',w.y); }
      else if(cur.t === 'rect'){ curEl.setAttribute('x',Math.min(cur.a[0],w.x)); curEl.setAttribute('y',Math.min(cur.a[1],w.y)); curEl.setAttribute('width',Math.abs(w.x-cur.a[0])); curEl.setAttribute('height',Math.abs(w.y-cur.a[1])); curEl.setAttribute('rx',6); }
      else { curEl.setAttribute('cx',cur.a[0]); curEl.setAttribute('cy',cur.a[1]); curEl.setAttribute('r',Math.hypot(w.x-cur.a[0], w.y-cur.a[1])); }
    }
  }, true);

  function finish(e){
    if(!mode || !cur) return;
    e.stopPropagation();
    const ok = cur.t === 'pen' ? cur.p.length > 1 : (cur.a[0] !== cur.b[0] || cur.a[1] !== cur.b[1]);
    if(ok){ strokes.push(cur); redo = []; save(); }
    if(stage.hasPointerCapture?.(e.pointerId))stage.releasePointerCapture(e.pointerId);
    cur = null; curEl = null; render();
  }
  stage.addEventListener('pointerup', finish, true);
  stage.addEventListener('pointercancel', finish, true);

  /* ---- palette ---- */
  if(ui.on){
    ui.on.addEventListener('click', function(){
      if(!mode)document.querySelectorAll('#map-ruler.on,#map-edit.on').forEach(b=>b.click());
      mode = !mode;
      ui.on.classList.toggle('on', mode);
      ui.on.setAttribute('aria-pressed', mode);
      ui.on.textContent = mode ? 'Dejar de dibujar' : 'Dibujar en el mapa';
      if(ui.pane) ui.pane.hidden = !mode;
      stage.classList.toggle('drawing', mode);
      layer.classList.toggle('erasing', mode && tool === 'eraser');
      stage.classList.toggle('erasing', mode && tool === 'eraser');
    });
  }
  ui.tools.forEach(function(b){
    b.addEventListener('click', function(){
      ui.tools.forEach(x => x.classList.remove('on'));
      b.classList.add('on'); tool = b.dataset.tool;
      layer.classList.toggle('erasing', mode && tool === 'eraser');
      stage.classList.toggle('erasing', mode && tool === 'eraser');
    });
  });
  ui.cols.forEach(function(b){
    b.addEventListener('click', function(){
      ui.cols.forEach(x => x.classList.remove('on'));
      b.classList.add('on'); color = b.dataset.col;
      if(ui.hex) ui.hex.value = color;
    });
  });
  if(ui.hex){
    ui.hex.addEventListener('input', function(){
      const v = ui.hex.value.trim();
      if(/^#[0-9a-fA-F]{6}$/.test(v)){ color = v; ui.cols.forEach(x => x.classList.remove('on')); }
    });
  }
  if(ui.size){ ui.size.addEventListener('input', function(){ size = +ui.size.value; if(ui.sizeV) ui.sizeV.textContent = size; }); }
  if(ui.op){ ui.op.addEventListener('input', function(){ opacity = ui.op.value/100; if(ui.opV) ui.opV.textContent = ui.op.value + ' %'; }); }
  if(ui.undo){ ui.undo.addEventListener('click', function(){ if(!strokes.length) return; redo.push(strokes.pop()); save(); render(); }); }
  if(ui.redo){ ui.redo.addEventListener('click', function(){ if(!redo.length) return; strokes.push(redo.pop()); save(); render(); }); }
  if(ui.clear){ ui.clear.addEventListener('click', function(){ if(!strokes.length || !confirm('¿Borrar todos tus trazos?')) return; strokes = []; redo = []; save(); render(); }); }

  document.addEventListener('keydown', function(e){
    if(!mode || e.target.closest('input,textarea,select,[contenteditable="true"]')) return;
    if((e.ctrlKey || e.metaKey) && e.key === 'z'){ e.preventDefault(); if(ui.undo) ui.undo.click(); }
    if((e.ctrlKey || e.metaKey) && e.key === 'y'){ e.preventDefault(); if(ui.redo) ui.redo.click(); }
  });

  /* export / import : les tracés voyagent avec le reste */
  M.getDraw = function(){ return strokes; };
  M.setDraw = function(s,persist=true){ if(!window.LK.strokes(s))throw new Error('Trazos no válidos'); strokes = s; redo = []; if(persist)save(); render(); };

  render();
})();
