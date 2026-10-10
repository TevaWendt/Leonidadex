'use strict';
/* v7.78 (Téva, 09/10/2026 : « j'aime pas du tout les cartes des sections de gauche ; fais beaucoup mieux, plus moderne, plus
   Rockstar, plus stylé, plus motion design ; des cartes aussi développées que celles des animaux, pas la même forme ;
   toujours pratiques : on clique dessus ; rien d'autre ne change »). Les cartes en tête des cinq hubs du monde deviennent
   chacune un objet du monde de GTA, mis en scène une seule fois à l'arrivée à l'écran (monde.css, monde.js) :
     Lieux        la carte dépliée : la carte routière de Leonida se déplie, ses repères s'allument et un trait relie
                  chaque région à sa carte ; choisir une région la met en lumière sur la carte ;
     Personnages  la jaquette : une grille de cases cerclée d'encre, comme les pochettes de la série ; choisir un
                  personnage allume les cases de ceux qu'il connaît ;
     Demeures     les portes : chaque porte s'ouvre sur sa demeure (la cellule de Lucia coulisse) ;
     Planques     la régie : trois écrans de surveillance qui s'allument, une mire se verrouille au survol ;
     Entreprises  la rue : les rideaux de fer se lèvent et les enseignes s'allument une à une.
   Chaque carte reste un seul lien vers sa fiche (le nom, toute la carte cliquable) ; les pastilles des personnages et
   « Sur la carte » sont de vrais liens. Rien d'inventé : textes, liens, lieux et images viennent des fiches
   (outils/editorial.json), de la carte du site (outils/carte-vignette.cjs) et des captures officielles déjà publiées ;
   seuls l'art de la mise en scène (choix des cadrages, couleurs, portes, enseignes) est propre au site.
   Sans script ou avec « réduire les animations », tout est posé et lisible. */
const carte = require('./carte-vignette.cjs');
const AV = require('./monde-avatars.cjs');

const HUBS = ['lieux', 'personnages', 'demeures', 'planques', 'entreprises'];

/* pictogrammes (traits, couleur du texte) */
const svg = (d, cls) => '<svg class="' + (cls || 'mo-ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + d + '</svg>';
const ICO = {
  pin: svg('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>'),
  map: svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>'),
  photo: svg('<rect x="3" y="6" width="18" height="13" rx="2"/><circle cx="12" cy="12.5" r="3.4"/><path d="M8.5 6l1.5-2h4l1.5 2"/>'),
  car: svg('<path d="M4 16v-3l2-5h12l2 5v3"/><path d="M3 16h18v2H3z"/><circle cx="7.5" cy="16" r="1.6"/><circle cx="16.5" cy="16" r="1.6"/>'),
  /* catégories des entreprises (mot écrit à côté, jamais seul) */
  atelier: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L4 16.8V20h3.2l5.3-5.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  ciseaux: svg('<circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M8.2 7.6L20 18M8.2 16.4L20 6"/>'),
  cintre: svg('<path d="M12 7.5a2 2 0 1 1 2-2"/><path d="M12 7.5v1.3L3 15.5c-.8.6-.4 1.5.5 1.5h17c.9 0 1.3-.9.5-1.5L12 8.8"/>'),
  aiguille: svg('<path d="M5 19l5-5"/><path d="M9 11l4 4"/><rect x="10.5" y="4.5" width="6" height="9" rx="1.5" transform="rotate(45 13.5 9)"/><path d="M17 3l4 4"/>'),
  roue: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="3"/><path d="M12 3.5V9M12 15v5.5M3.5 12H9M15 12h5.5"/>'),
  sac: svg('<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 10V6.5a3 3 0 0 1 6 0V10"/>'),
  disque: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="2.2"/><path d="M12 5.5a6.5 6.5 0 0 1 6.5 6.5"/>'),
  coeur: svg('<rect x="4.5" y="3" width="15" height="18" rx="2"/><path d="M12 16.2s-3.6-2.3-3.6-4.8a1.9 1.9 0 0 1 3.6-.9 1.9 1.9 0 0 1 3.6.9c0 2.5-3.6 4.8-3.6 4.8z"/>')
};

/* ---------- direction artistique (choix du site, pas des données du jeu) ---------- */
/* Lieux : du nord au sud, deux colonnes de part et d'autre de la carte ; une teinte par région (repère et trait) */
const REGIONS = {
  'mount-kalaga': { area: 'mk', c: '#8A7CF5', media: 'mount-kalaga-national-park-02' },
  ambrosia: { area: 'am', c: '#F06A3E', media: 'ambrosia-01' },
  'port-gellhorn': { area: 'pg', c: '#F5A524', media: 'port-gellhorn-04' },
  'vice-city': { area: 'vc', c: '#F2559A', media: 'vice-city-01' },
  grassrivers: { area: 'gr', c: '#5DBE63', media: 'grassrivers-03' },
  'leonida-keys': { area: 'lk', c: '#25B9C8', media: 'leonida-keys-01' }
};
const REGION_ORDER = ['mount-kalaga', 'ambrosia', 'port-gellhorn', 'vice-city', 'grassrivers', 'leonida-keys'];
/* Personnages : cases de la jaquette, capture choisie pour la forme de la case, point de cadrage (x, y en %), teinte */
const CAST = {
  jason: { area: 'ja', media: 'jason-duval-04', fx: 33, fy: 22, c: '#2BB3A8', shape: 'tall' },
  lucia: { area: 'lu', media: 'lucia-caminos-03', fx: 36, fy: 26, c: '#FF7A45', shape: 'tall' },
  cal: { area: 'ca', media: 'cal-hampton-03', fx: 46, fy: 46, c: '#9BD34C', shape: 'small' },
  brian: { area: 'br', media: 'brian-heder-01', fx: 50, fy: 30, c: '#F5A524', shape: 'small' },
  raul: { area: 'ra', media: 'raul-bautista-01', fx: 60, fy: 32, c: '#4F8DF0', shape: 'small' },
  boobie: { area: 'bo', media: 'boobie-ike-01', fx: 45, fy: 30, c: '#E8452C', shape: 'small' },
  drequan: { area: 'dq', media: 'dre-quan-priest-03', fx: 44, fy: 28, c: '#C65BF0', shape: 'wide' },
  dimez: { area: 'di', media: 'real-dimez-04', fx: 46, fy: 34, c: '#F2559A', shape: 'wide' }
};
const CAST_ORDER = ['jason', 'lucia', 'cal', 'brian', 'raul', 'boobie', 'drequan', 'dimez'];
const SHORT = { jason: 'Jason', lucia: 'Lucia', cal: 'Cal', boobie: 'Boobie', drequan: 'Dre’Quan', dimez: 'Real Dimez', raul: 'Raul', brian: 'Brian' };
/* équipes nommées dans les fiches des gangs : leurs membres se connaissent (la police n'est pas un lien) */
const CREWS = ['equipe-raul', 'reseau-brian'];
/* Demeures : style de porte et nom sur la plaque (nom de famille du premier occupant) */
const DOORS = {
  'jason-keys': { style: 'bois', plate: 'Duval' },
  'cal-keys': { style: 'verrous', plate: 'Hampton' },
  'brian-keys': { style: 'hublot', plate: 'Heder' },
  'lucia-avant': { style: 'cellule', plate: 'Caminos' }
};
/* Entreprises : ce qu'est l'adresse (d'après la description officielle de sa fiche), pictogramme, teinte de l'enseigne,
   capture de la vitrine */
const SHOPS = {
  'rideout-customs': { kind: 'Atelier de personnalisation', ico: 'atelier', h: 38, media: 'rideout-customs-mod-shop-01' },
  'saras-unisex-salon': { kind: 'Salon de coiffure', ico: 'ciseaux', h: 330, media: 'sara-s-unisex-salon-01' },
  'stock-305': { kind: 'Boutique de vêtements', ico: 'cintre', h: 188, media: 'stock-305-clothing-store-03' },
  'electric-fang': { kind: 'Salon de tatouage', ico: 'aiguille', h: 356, media: 'electric-fang-tattoo-01' },
  'one-eyed-willie': { kind: 'Atelier tout-terrain', ico: 'roue', h: 112, media: 'one-eyed-willie-s-mod-shop-01' },
  'ptt-youngin': { kind: 'Boutique', ico: 'sac', h: 205, media: 'ptt-youngin-illegal-goods-store' },
  'only-raw-records': { kind: 'Label de musique', ico: 'disque', h: 280, media: 'real-dimez-04' },
  'jack-of-hearts': { kind: 'Club', ico: 'coeur', h: 0, media: 'boobie-ike-02' }
};

function create(ctx) {
  const { ED, MED, esc, placeName } = ctx;
  const byId = {};
  for (const k of Object.keys(ED)) for (const x of ED[k] || []) byId[x.id] = x;
  const fiche = (hub, id) => hub + '/' + id + '.html';
  const mapHref = id => 'carte.html#lieu=' + encodeURIComponent(id);
  const mediaOf = (x, id) => (id && MED[id]) || (x.media || []).map(m => MED[m]).find(Boolean) || null;
  const altOf = (x, m) => x.imageAlt || m.alt || (x.name + ', capture officielle Rockstar Games');
  /* image officielle : 480 px et 1280 px, la taille annoncée dit laquelle charger */
  const pic = (m, alt, o = {}) => {
    if (!m) return '';
    const a = m.variants[0], b = m.variants[1] || a, ss = u => u.replace(/,/g, '%2C');
    return '<img src="' + a.src + '" srcset="' + ss(a.src) + ' ' + a.w + 'w, ' + ss(b.src) + ' ' + b.w + 'w" sizes="' + (o.sizes || '(max-width:720px) 100vw, 480px') + '" width="' + a.w + '" height="' + a.h + '" alt="' + esc(alt) + '" loading="' + (o.eager ? 'eager' : 'lazy') + '" decoding="async"' + (o.high ? ' fetchpriority="high"' : '') + (o.style ? ' style="' + o.style + '"' : '') + '>';
  };
  /* pastille d'un personnage : un vrai lien vers sa fiche */
  const who = (id, o = {}) => {
    const c = byId[id]; if (!c || !AV.AVATARS[id]) return '';
    return '<a class="mo-who' + (o.bare ? ' mo-who--bare' : '') + '" href="' + fiche('personnages', id) + '"' + (o.bare ? ' aria-label="' + esc(c.name) + '" title="' + esc(c.name) + '"' : '') + '><img src="' + AV.src(id) + '" width="' + AV.SIZE + '" height="' + AV.SIZE + '" alt="" loading="lazy" decoding="async">' + (o.bare ? '' : '<span>' + esc(SHORT[id] || c.name) + '</span>') + '</a>';
  };
  const chip = (ico, text, cls) => '<span class="mo-chip' + (cls ? ' ' + cls : '') + '">' + ICO[ico] + '<span>' + esc(text) + '</span></span>';
  const mapChip = id => '<a class="mo-chip mo-chip--map" href="' + mapHref(id) + '">' + ICO.map + '<span>Sur la carte</span></a>';
  const go = '<span class="mo-go" aria-hidden="true">Voir la fiche</span>';
  const name = (hub, x, inner) => '<h3 class="mo-name"><a class="mo-link" href="' + fiche(hub, x.id) + '">' + (inner || esc(x.name)) + '</a></h3>';
  const count = (n, one, many) => n + ' ' + (n > 1 ? many : one);
  const point = id => { try { return id ? carte.point(id) : null; } catch (e) { return null; } };
  const label = id => { const n = placeName(id); if (n && n !== id) return n; const p = point(id); return p ? String(p.n).replace(/&amp;/g, '&') : id; };
  const areaOf = id => { const p = point(id); if (!p) return null; return p.p ? label(p.p) : label(id); };
  /* quartier montré par la caméra : la zone elle-même quand le repère en est une (Key Lento), sinon la zone qui contient le repère */
  const zoneOf = id => { const p = point(id); if (!p) return null; return (!/^g-/.test(id) && placeName(id) !== id) || !p.p ? label(id) : label(p.p); };
  const head = (hub, n) => '<h2 class="sr-only">Les ' + n + ' fiches</h2>';
  const check = (cond, msg) => { if (!cond) throw new Error('monde-cartes : ' + msg); };

  /* ---------- Lieux : la carte dépliée ---------- */
  function lieux() {
    const items = ED.regions;
    check(items.length === REGION_ORDER.length && items.every(x => REGIONS[x.id]), 'les régions ont changé : mets à jour REGIONS et REGION_ORDER');
    const W = carte.W, H = carte.H;
    const pins = REGION_ORDER.map((id, k) => {
      const x = byId[id], R = REGIONS[id], p = point(x.mapId || id); check(p, 'région sans repère : ' + id);
      const left = p.x < W * 0.45, short = x.name.replace(/ National Park$/, '');
      return '<a class="mo-pin" href="' + fiche('lieux', id) + '" tabindex="-1" data-mo-id="' + id + '" style="--c:' + R.c + ';--k:' + k + '">'
        + '<circle class="mo-pin-halo" cx="' + p.x + '" cy="' + p.y + '" r="170"/><circle class="mo-pin-dot" cx="' + p.x + '" cy="' + p.y + '" r="78"/>'
        + '<text class="mo-pin-t" x="' + (p.x + (left ? -130 : 130)) + '" y="' + (p.y + 52) + '" text-anchor="' + (left ? 'end' : 'start') + '">' + esc(short) + '</text></a>';
    }).join('');
    const cards = REGION_ORDER.map((id, i) => {
      const x = byId[id], R = REGIONS[id], m = mediaOf(x, R.media);
      const people = (x.characters || []).filter(c => byId[c]).slice(0, 3).map(c => who(c, { bare: true })).join('');
      const places = (x.relatedPlaces || []).slice(0, 2).map(pl => chip('pin', label(pl))).join('');
      const nVis = (x.media || []).filter(mm => MED[mm]).length;
      /* le corps (nom, lien principal) précède l'image dans la page : au clavier, le nom vient avant « Sur la carte » */
      return '<article class="mo-reg mo-card" data-mo-id="' + id + '" style="--c:' + R.c + ';--k:' + i + ';--area:' + R.area + '">'
        + '<div class="mo-reg-body">' + name('lieux', x, '<span class="mo-dot" aria-hidden="true"></span>' + esc(x.name))
        + '<p class="mo-tag">' + esc(x.tagline) + '</p>'
        + (people || places ? '<div class="mo-meta">' + (people ? '<span class="mo-faces">' + people + '</span>' : '') + places + '</div>' : '')
        + '<div class="mo-act">' + go + '</div></div>'
        + '<div class="mo-reg-media">' + pic(m, altOf(x, m), { sizes: '(max-width:720px) 38vw, (max-width:1359px) 20vw, 170px', eager: i < 2 })
        + mapChip(x.mapId || id) + '<span class="mo-count" title="' + esc(count(nVis, 'visuel officiel', 'visuels officiels')) + '">' + ICO.photo + '<span>' + nVis + '</span></span></div></article>';
    }).join('');
    return '<section class="shell mo mo--lieux" id="fiches">' + head('lieux', items.length)
      + '<div class="mo-frame"><p class="mo-hint" aria-hidden="true">Pointe une région : elle s’allume sur la carte de Leonida.</p>'
      + '<div class="mo-atlas" data-mo="lieux">'
      + '<div class="mo-map" role="group" aria-label="Carte de Leonida : les six régions"><div class="mo-map-box"><div class="mo-map-in">'
      + '<div class="mo-fold" aria-hidden="true"><span class="mo-fold-p mo-fold-p--l"><span class="mo-face mo-face--front"></span><span class="mo-face mo-face--back"></span></span>'
      + '<span class="mo-fold-p mo-fold-p--c"><span class="mo-face mo-face--front"></span></span>'
      + '<span class="mo-fold-p mo-fold-p--r"><span class="mo-face mo-face--front"></span><span class="mo-face mo-face--back"><span class="mo-cover"><span class="mo-cover-k">Carte routière</span><span class="mo-cover-t">Leonida</span><span class="mo-cover-s">Six régions, du nord au sud</span></span></span></span></div></div>'
      + '<span class="mo-crease" aria-hidden="true"></span><span class="mo-spot" aria-hidden="true"></span>'
      + '<svg class="mo-pins" viewBox="0 0 ' + W + ' ' + H + '" aria-hidden="true" focusable="false">' + pins + '</svg>'
      + '<p class="mo-map-cap">Fond de carte communautaire, non officiel</p></div></div>'
      + cards
      + '<svg class="mo-lines" aria-hidden="true" focusable="false"></svg>'
      + '</div></div></section>';
  }

  /* ---------- Personnages : la jaquette ---------- */
  function personnages() {
    const items = ED.characters;
    check(items.length === CAST_ORDER.length && items.every(x => CAST[x.id]), 'les personnages ont changé : mets à jour CAST et CAST_ORDER');
    const links = {};
    for (const x of items) links[x.id] = new Set((x.characters || []).filter(id => CAST[id]));
    for (const x of items) for (const y of items) if ((y.characters || []).includes(x.id)) links[x.id].add(y.id);
    for (const f of ED.factions || []) if (CREWS.includes(f.id)) for (const a of f.characters || []) for (const b of f.characters || []) if (a !== b && CAST[a] && CAST[b]) links[a].add(b);
    const panels = CAST_ORDER.map((id, i) => {
      const x = byId[id], C = CAST[id], m = mediaOf(x, C.media);
      const ties = [...links[id]].sort((a, b) => CAST_ORDER.indexOf(a) - CAST_ORDER.indexOf(b));
      const big = C.shape !== 'small';
      const sizes = C.shape === 'tall' ? '(max-width:720px) 50vw, (max-width:1100px) 50vw, 340px' : C.shape === 'wide' ? '(max-width:720px) 100vw, 680px' : '(max-width:720px) 50vw, 340px';
      return '<li class="mo-panel mo-panel--' + C.shape + '" data-mo-id="' + id + '" data-mo-links="' + ties.join(' ') + '" style="--c:' + C.c + ';--area:' + C.area + '"><article class="mo-card">'
        + '<div class="mo-panel-media">' + pic(m, altOf(x, m), { sizes, eager: i < 2, high: i === 0, style: 'object-position:' + C.fx + '% ' + C.fy + '%' }) + '</div>'
        + '<div class="mo-panel-body">' + name('personnages', x)
        + '<p class="mo-tag">' + esc(x.tagline) + '</p>'
        + (ties.length ? '<div class="mo-ties"><span class="mo-ties-k">Ses liens</span>' + ties.map(t => who(t, { bare: !big })).join('') + '</div>' : '')
        + go + '</div></article></li>';
    }).join('');
    return '<section class="shell mo mo--perso" id="fiches">' + head('personnages', items.length)
      + '<div class="mo-frame"><p class="mo-hint" aria-hidden="true">Pointe un personnage : les cases de ceux qu’il connaît restent allumées.</p>'
      + '<ul class="mo-cover-grid" data-mo="personnages" role="list">' + panels + '</ul></div></section>';
  }

  /* ---------- Demeures : les portes ---------- */
  function demeures() {
    const items = ED.residences;
    check(items.every(x => DOORS[x.id]), 'une demeure sans porte : mets à jour DOORS');
    const homes = items.map((x, i) => {
      const D = DOORS[x.id], m = mediaOf(x);
      const occ = (x.characters || []).filter(c => byId[c]).map(c => who(c)).join('');
      const region = (x.places || []).map(placeName)[0];
      const nVeh = (x.vehicles || []).length;
      const where = x.mapId ? (point(x.mapId) || {}).n : null;
      const leaf = D.style === 'cellule'
        ? '<span class="mo-bars" aria-hidden="true"><span class="mo-plate">' + esc(D.plate) + '</span></span>'
        : '<span class="mo-leaf" aria-hidden="true"><span class="mo-leaf-front"><span class="mo-leaf-panel"></span><span class="mo-leaf-panel"></span>'
          + (D.style === 'hublot' ? '<span class="mo-porthole"></span>' : '') + (D.style === 'verrous' ? '<span class="mo-locks"><i></i><i></i><i></i></span>' : '')
          + '<span class="mo-plate">' + esc(D.plate) + '</span><span class="mo-knob"></span></span><span class="mo-leaf-back"></span></span>';
      return '<li class="mo-home mo-home--' + D.style + '" data-mo-id="' + x.id + '"><article class="mo-card">'
        + '<div class="mo-doorway"><div class="mo-room">' + pic(m, altOf(x, m), { sizes: '(max-width:720px) 40vw, (max-width:1099px) 45vw, 320px' }) + '<span class="mo-light" aria-hidden="true"></span>' + leaf + '</div></div>'
        + '<div class="mo-home-body">' + name('demeures', x)
        + '<p class="mo-tag">' + esc(x.tagline) + '</p>'
        + (occ ? '<div class="mo-people">' + occ + '</div>' : '')
        + '<div class="mo-meta">' + (region ? chip('pin', where && where !== region ? label(x.mapId) : region) : '') + (nVeh ? chip('car', count(nVeh, 'véhicule', 'véhicules')) : '') + '</div>'
        + '<div class="mo-act">' + go + (x.mapId ? mapChip(x.mapId) : '') + '</div></div></article></li>';
    }).join('');
    return '<section class="shell mo mo--demeures" id="fiches">' + head('demeures', items.length)
      + '<div class="mo-frame"><ul class="mo-doors" data-mo="demeures" role="list">' + homes + '</ul></div></section>';
  }

  /* ---------- Planques : la régie ---------- */
  function planques() {
    const items = ED.hideouts;
    const cams = items.map((x, i) => {
      const m = mediaOf(x), p = point(x.mapId);
      const hud = p ? zoneOf(x.mapId) : ((x.places || []).map(placeName)[0] || '');
      const occ = (x.characters || []).filter(c => byId[c]).map(c => who(c)).join('');
      const nVeh = (x.vehicles || []).length;
      return '<li class="mo-cam" data-mo-id="' + x.id + '"><article class="mo-card">'
        + '<div class="mo-screen">' + pic(m, altOf(x, m), { sizes: '(max-width:720px) 100vw, 460px' })
        + '<span class="mo-scan" aria-hidden="true"></span>'
        + '<span class="mo-hud" aria-hidden="true"><span class="mo-hud-cam">CAM ' + String(i + 1).padStart(2, '0') + '</span>' + (hud ? '<span class="mo-hud-place">' + esc(hud) + '</span>' : '') + '<span class="mo-hud-rec">REC</span></span>'
        + '<span class="mo-lock" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="mo-power" aria-hidden="true"></span></div>'
        + '<div class="mo-cam-body">' + name('planques', x)
        + '<p class="mo-tag">' + esc(x.tagline) + '</p>'
        + (occ ? '<div class="mo-people">' + occ + '</div>' : '')
        + '<div class="mo-meta">' + (p ? chip('pin', label(x.mapId)) : '') + (nVeh ? chip('car', count(nVeh, 'véhicule', 'véhicules')) : '') + '</div>'
        + '<div class="mo-act">' + go + (x.mapId ? mapChip(x.mapId) : '') + '</div></div></article></li>';
    }).join('');
    return '<section class="shell mo mo--planques" id="fiches">' + head('planques', items.length)
      + '<div class="mo-desk-wrap"><ul class="mo-desk" data-mo="planques" role="list">' + cams + '</ul></div></section>';
  }

  /* ---------- Entreprises : la rue ---------- */
  function entreprises() {
    const items = ED.businesses;
    check(items.every(x => SHOPS[x.id]), 'une entreprise sans enseigne : mets à jour SHOPS');
    const shops = items.map((x, i) => {
      const S = SHOPS[x.id], m = mediaOf(x, S.media), p = point(x.mapId);
      const area = p ? areaOf(x.mapId) : null;
      return '<li class="mo-shop" data-mo-id="' + x.id + '" style="--h:' + S.h + '"><article class="mo-card">'
        + '<div class="mo-sign">' + ICO[S.ico].replace('class="mo-ico"', 'class="mo-ico mo-sign-ico"') + name('entreprises', x) + '</div>'
        + '<div class="mo-window">' + pic(m, altOf(x, m), { sizes: '(max-width:720px) 82vw, 330px' }) + '<span class="mo-glass" aria-hidden="true"></span><span class="mo-shutter" aria-hidden="true"></span></div>'
        + '<div class="mo-shop-body"><p class="mo-kind">' + esc(S.kind) + '</p>'
        + '<p class="mo-tag">' + esc(x.tagline) + '</p>'
        + '<div class="mo-meta">' + (area ? chip('pin', area) : chip('pin', 'Adresse à venir', 'mo-chip--soon')) + '</div>'
        + '<div class="mo-act">' + go + (p ? mapChip(x.mapId) : '') + '</div></div></article></li>';
    }).join('');
    return '<section class="shell mo mo--entreprises" id="fiches">' + head('entreprises', items.length)
      + '<div class="mo-frame"><ul class="mo-street" data-mo="entreprises" role="list">' + shops + '</ul></div></section>';
  }

  const R = { lieux, personnages, demeures, planques, entreprises };
  return { render: hub => R[hub]() };
}

module.exports = { HUBS, create, REGIONS, CAST, DOORS, SHOPS };
