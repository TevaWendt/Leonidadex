/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
/* ============================================================
   LEONIDAKIT — fiches.js : galerie, arsenal / garage, comparaison
   Chargé après app.js sur les fiches et les pages hub.
   ============================================================ */
(function(){
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; }; /* pluriel selon la langue de la page (français : n > 1) */
  var lkDollars = function (s) { return /^(fr|de)/.test(document.documentElement.lang || "fr") ? s + "\u00a0$" : "$" + s; }; /* « 1 250 $ », « 1.250 $ » (allemand) ou « $1,250 » selon la langue de la page */
  const calculatorBase = new URL('calculateurs.html', document.currentScript?.src || document.querySelector('script[src*="fiches.js"]')?.src || new URL('/fiches.js', location.href).href);
  function calculatorLink(type, values, origin) {
    const url = new URL(calculatorBase);
    url.searchParams.set('tool', 'purchase');
    url.searchParams.set('type', type);
    url.searchParams.set('from', origin);
    Object.keys(values || {}).forEach(key => url.searchParams.set(key, values[key]));
    url.hash = 'atelier';
    return url.href;
  }
  /* v7.59 (check ultime, D-03) : la feuille n'est ajoutée que si la page ne la charge pas déjà (sinon elle était chargée
     deux fois, la seconde avec une empreinte écrite à la main, « ?v=20260921 », qui pouvait servir une version en cache
     périmée par-dessus la bonne). L'empreinte ci-dessous est posée par outils/sync-site.cjs à chaque régénération. */
  function calculatorStyle() {
    if (document.querySelector('link[data-calculator-entry], link[rel="stylesheet"][href*="calculator-entry.css"]')) return;
    const link = document.createElement('link'); link.rel = 'stylesheet';
    /* v7.61 : la feuille est à la racine du site, à côté de style.css (une page traduite /es/… charge un fiches.js
       traduit, rangé dans /es/ : la feuille n'y est pas) */
    const main = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(l => /(?:^|\/)style\.css(?:\?|$)/.test(l.getAttribute('href') || ''));
    link.href = new URL('calculator-entry.css?v=cf94b45f1d2d', main ? main.href : calculatorBase).href.replace(/\/[a-z]{2}\/(?=calculator-entry\.css)/, '/'); /* v7.61 : la feuille est à la racine, y compris pour une page traduite (/en/) */
    link.dataset.calculatorEntry = 'true'; document.head.appendChild(link);
  }

  /* ---------------------------------------------------------- galerie
     <div class="gal" data-base="img/armes/micro-smg" data-vues="face,profil,arriere,detail">
     Chaque vue cherche <base>-<vue>.jpg ; absente, elle affiche l'emplacement vide
     avec l'illustration provisoire. Clavier ← →, glisser au doigt, points. */
  const VUES_LBL = { face:'Front', profil:'Side', arriere:'Rear', detail:'Detail', interieur:'Interior', dessus:'Top' };

  /* ---------------------------------------------------------- sous tous les angles (v7.80)
     <div class="ang" data-ang> : l'écran (bouton) porte les schémas de chaque angle (svg.ang-img, data-ang-id) ; un clic
     passe au suivant avec l'effet d'un écran cathodique qui change de chaîne (fiches.css : ang-out, ang-in, ang-scan).
     Onglets (data-ang-go), ← → Début Fin au clavier, glisser au doigt. Tous les mots viennent du balisage. Avec
     « réduire les animations », le changement est immédiat. Aucune requête, rien gardé sur l'appareil. */
  var angReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function initAng(ang) {
    if (!ang || ang.dataset.angReady) return; ang.dataset.angReady = '1';
    var imgs = Array.prototype.slice.call(ang.querySelectorAll('.ang-img')), tabs = Array.prototype.slice.call(ang.querySelectorAll('[data-ang-go]'));
    var view = ang.querySelector('[data-ang-next]'), label = ang.querySelector('[data-ang-label]'), count = ang.querySelector('[data-ang-count]');
    var n = imgs.length, i = 0, busy = false, timer = 0;
    if (n < 2) return;
    imgs.forEach(function (im, k) { im.classList.toggle('is-on', k === 0); });
    function show(k) {
      i = k;
      tabs.forEach(function (t, q) { t.classList.toggle('is-on', q === i); t.setAttribute('aria-pressed', String(q === i)); });
      if (label) label.textContent = tabs[i] ? tabs[i].textContent : imgs[i].getAttribute('data-ang-id');
      if (count) count.textContent = (i + 1) + '/' + n;
      ang.dataset.angI = String(i);
    }
    function go(k) {
      k = ((k % n) + n) % n;
      if (k === i) return;
      var from = imgs[i], to = imgs[k];
      if (angReduced || busy) {
        window.clearTimeout(timer); busy = false;
        imgs.forEach(function (im) { im.classList.remove('is-out', 'is-in'); im.classList.toggle('is-on', im === to); });
        ang.classList.remove('is-switch');
        show(k); return;
      }
      busy = true;
      ang.classList.add('is-switch');
      from.classList.add('is-out');
      to.classList.add('is-on', 'is-in');
      show(k);
      timer = window.setTimeout(function () {
        from.classList.remove('is-on', 'is-out'); to.classList.remove('is-in');
        ang.classList.remove('is-switch'); busy = false;
      }, 460);
    }
    var swiped = false, x0 = null;
    if (view) {
      view.addEventListener('click', function () { if (swiped) { swiped = false; return; } go(i + 1); });
      view.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
      view.addEventListener('pointerup', function (e) {
        if (x0 === null) return; var dx = e.clientX - x0; x0 = null;
        if (Math.abs(dx) > 40) { swiped = true; e.stopPropagation(); go(i + (dx < 0 ? 1 : -1)); window.setTimeout(function () { swiped = false; }, 400); }
      });
    }
    tabs.forEach(function (t, q) { t.addEventListener('click', function () { go(q); }); });
    ang.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowRight' || k === 'ArrowDown') { go(i + 1); } else if (k === 'ArrowLeft' || k === 'ArrowUp') { go(i - 1); }
      else if (k === 'Home') { go(0); } else if (k === 'End') { go(n - 1); } else return;
      e.preventDefault(); e.stopPropagation();
    });
    show(0);
  }

  document.querySelectorAll('.gal').forEach(function(gal){
    /* visuels officiels Rockstar déclarés dans la page : galerie prête, sans requête de test */
    var medias = [];
    try { medias = gal.dataset.medias ? JSON.parse(gal.dataset.medias) : []; } catch (e) { medias = []; }
    if (medias.length) {
      /* v7.54 : le nœud de la première image (déjà en cours de chargement, souvent le plus grand contenu de la page)
         est conservé au lieu d'être recréé : pas de second décodage ni de nouveau candidat LCP */
      const firstImage = gal.querySelector('img[src]');
      const trk = document.createElement('div'); trk.className = 'gal-track';
      /* la première vue est déjà dans le HTML (visible sans JS) ; les suivantes ne sont demandées
         qu'au moment où on les affiche, pour ne pas charger toute la galerie d'un coup */
      medias.forEach(function (m, k) {
        const it = document.createElement('div'); it.className = 'gal-item';
        const im = k === 0 && firstImage ? firstImage : document.createElement('img');
        im.sizes = '(max-width:700px) 100vw, 520px';
        im.dataset.src = m.s; im.dataset.srcset = m.s + ' ' + (m.w || 480) + 'w, ' + m.l + ' ' + (m.lw || 1280) + 'w';
        if (k === 0) {
          if (im.getAttribute('srcset') !== im.dataset.srcset) im.srcset = im.dataset.srcset;
          if (im.getAttribute('src') !== m.s) im.src = m.s;
          im.fetchPriority = 'high';
        }
        im.width = m.w; im.height = m.h; im.decoding = 'async';
        if (m.h > m.w) im.classList.add('gal-portrait');
        im.alt = m.a || ((gal.dataset.nom || '') + ' — ' + m.t + ', official Rockstar Games screenshot');
        it.appendChild(im);
        const s = document.createElement('span'); s.className = 'gal-lbl'; s.textContent = m.t; it.appendChild(s);
        trk.appendChild(it);
      });
      /* v7.80 : le bloc « sous tous les angles » (schéma) devient la dernière vue de la galerie, après les visuels officiels */
      const angSlide = gal.querySelector('.ang-slide');
      if (angSlide) { const it = document.createElement('div'); it.className = 'gal-item gal-item--ang'; angSlide.hidden = false; it.appendChild(angSlide); trk.appendChild(it); }
      const nSlides = medias.length + (angSlide ? 1 : 0);
      gal.replaceChildren(trk);
      if (angSlide) initAng(angSlide.querySelector('[data-ang]'));
      if (nSlides > 1) {
        let j = 0;
        const dts = document.createElement('div'); dts.className = 'gal-dots';
        const goM = function (k) { j = (k + nSlides) % nSlides;
          const cur = trk.children[j].querySelector('img');
          if (cur && !cur.getAttribute('src')) { cur.srcset = cur.dataset.srcset; cur.src = cur.dataset.src; }
          trk.style.transform = 'translateX(-' + (j * 100) + '%)';
          dts.querySelectorAll('button').forEach(function (d, q) { d.classList.toggle('on', q === j); d.setAttribute('aria-current', String(q === j)); }); };
        const mk = function (cls, txt) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gal-btn ' + cls; b.textContent = txt;
          b.setAttribute('aria-label', cls === 'prev' ? 'Previous view' : 'Next view'); b.addEventListener('click', function () { goM(j + (cls === 'prev' ? -1 : 1)); }); return b; };
        gal.appendChild(mk('prev', '‹')); gal.appendChild(mk('next', '›'));
        for (let k = 0; k < nSlides; k++) { const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', k < medias.length ? 'View ' + (k + 1) : (angSlide.querySelector('[data-ang]').dataset.angDot || 'View ' + (k + 1))); d.addEventListener('click', function () { goM(k); }); dts.appendChild(d); }
        gal.parentNode.insertBefore(dts, gal.nextSibling);
        goM(0);
        gal.tabIndex = 0;
        gal.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { goM(j - 1); e.preventDefault(); } if (e.key === 'ArrowRight') { goM(j + 1); e.preventDefault(); } });
        let mx = null;
        gal.addEventListener('pointerdown', function (e) { mx = e.clientX; });
        gal.addEventListener('pointerup', function (e) { if (mx === null) return; const dx = e.clientX - mx; mx = null; if (Math.abs(dx) > 40) goM(j + (dx < 0 ? 1 : -1)); });
      }
      return;
    }
    /* v7.80 : fiche sans visuel officiel : l'écran « sous tous les angles » remplace l'emplacement vide */
    if (gal.classList.contains('gal--ang')) { initAng(gal.querySelector('[data-ang]')); return; }
    const base = gal.dataset.base;
    const vues = (gal.dataset.vues || 'face,profil').split(',').filter(v => window.LK.hasAsset(base+'-'+v+'.jpg'));
    const art = gal.dataset.art || '';
    if(!vues.length || gal.dataset.vide === '1'){
      gal.innerHTML='<div class="gal-track"><div class="gal-item"><div class="gal-vide">'+art+'<span>'+(gal.dataset.videTxt||'Official images to be added')+'</span></div></div></div>';
      return;
    }
    const track = document.createElement('div'); track.className = 'gal-track';
    let i = 0;

    vues.forEach(function(v, k){
      const it = document.createElement('div'); it.className = 'gal-item';
      const img = new Image();
      img.alt = (gal.dataset.nom || '') + ' — ' + (VUES_LBL[v] || v);
      img.onload = function(){ it.innerHTML = ''; it.appendChild(img); it.appendChild(lbl(v)); };
      img.onerror = function(){
        it.innerHTML = '<div class="gal-vide">' + art +
          '<span>' + (VUES_LBL[v] || v) + ' · image to come</span></div>';
        it.appendChild(lbl(v));
      };
      img.src = base + '-' + v + '.jpg';
      track.appendChild(it);
    });
    function lbl(v){ const s = document.createElement('span'); s.className = 'gal-lbl'; s.textContent = VUES_LBL[v] || v; return s; }

    gal.appendChild(track);
    /* aucune image officielle : un seul emplacement, pas de défilement */
    if(gal.dataset.vide === '1'){
      track.innerHTML = '<div class="gal-item"><div class="gal-vide">' + art + '<span>Official images to come</span></div></div>';
      return;
    }
    const prev = bt('prev', '‹'), next = bt('next', '›');
    gal.appendChild(prev); gal.appendChild(next);
    const dots = document.createElement('div'); dots.className = 'gal-dots';
    vues.forEach(function(_, k){
      const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'View ' + (k+1));
      d.addEventListener('click', function(){ go(k); }); dots.appendChild(d);
    });
    gal.parentNode.insertBefore(dots, gal.nextSibling);

    function bt(cls, txt){ const b = document.createElement('button'); b.type = 'button'; b.className = 'gal-btn ' + cls;
      b.textContent = txt; b.setAttribute('aria-label', cls === 'prev' ? 'Previous view' : 'Next view');
      b.addEventListener('click', function(){ go(i + (cls === 'prev' ? -1 : 1)); }); return b; }
    function go(k){ i = (k + vues.length) % vues.length; track.style.transform = 'translateX(-' + (i*100) + '%)';
      dots.querySelectorAll('button').forEach((d,j)=>{d.classList.toggle('on',j===i);d.setAttribute('aria-current',String(j===i));}); }
    go(0);

    gal.tabIndex = 0;
    gal.addEventListener('keydown', function(e){
      if(e.key === 'ArrowLeft'){ go(i-1); e.preventDefault(); }
      if(e.key === 'ArrowRight'){ go(i+1); e.preventDefault(); }
    });
    let x0 = null;
    gal.addEventListener('pointerdown', e => { x0 = e.clientX; });
    gal.addEventListener('pointerup', e => { if(x0 === null) return; const dx = e.clientX - x0; x0 = null;
      if(Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); });
  });

  /* ---------------------------------------------------------- possession
     Clé localStorage par type : lk_own_armes, lk_own_vehicules. */
  const type = document.body.dataset.own;           /* 'armes' | 'vehicules' */
  if(!type) return;
  const KEY = 'lk_own_' + type;
  const lire = () => window.LK.read(KEY,{},window.LK.own);
  /* v7.54 : la page (puce « Mon garage / Mon arsenal », app.js) est prévenue par un événement, plus par un écouteur de clic global */
  const ecrire = o => { const saved = window.LK.write(KEY,o); document.dispatchEvent(new CustomEvent('lk-owned', { detail: { type } })); return saved; };
  let own = lire();
  const MOT = type === 'armes' ? ['weapon', 'armes', 'arsenal'] : ['vehicle', 'vehicles', 'garage'];
  /* v7.61 : clé du lien de partage (#garage=… / #arsenal=…), identique dans toutes les langues ; MOT[2] est le mot affiché */
  const PARTAGE = type === 'armes' ? 'arsenal' : 'garage';
  /* v7.62 : phrases écrites en entier pour chaque carnet (en allemand, « meine Garage » / « mein Arsenal » n'ont pas le même genre) */
  const TXT = type === 'armes'
    ? { dans: 'In my arsenal', ajouter: 'Add to my arsenal', range: 'Added to your arsenal and removed from your wishlist.', envie: 'Saved to your wishlist. It isn’t something you own: nothing is checked in your arsenal.', vider: 'Clear my arsenal?' }
    : { dans: 'In my garage', ajouter: 'Add to my garage', range: 'Added to your garage and removed from your wishlist.', envie: 'Saved to your wishlist. It isn’t something you own: nothing is checked in your garage.', vider: 'Clear my garage?' };

  /* bouton de fiche */
  const bt = document.getElementById('own-bt');
  if(bt){
    const id = bt.dataset.id;
    const maj = () => { const on = !!own[id]; bt.classList.toggle('on', on); bt.setAttribute('aria-pressed',String(on));
      bt.querySelector('span:last-child').textContent = on ? TXT.dans : TXT.ajouter; };
    /* v7.51 (lot 4) : envie (« Je le veux », lk_wish_v1 via carnets-core.js : une envie n’est jamais une possession) et lien
       « Voir mon garage » / « Voir mon arsenal » vers la page du carnet. Une envie devenue possession quitte les envies. */
    const carnet = type === 'armes' ? ['arsenal', 'Open my arsenal'] : ['garage', 'Open my garage'];
    let wstore = null, wb = null;
    if (window.LKCarnets) { try { wstore = window.LKCarnets.create({ storage: localStorage, notice: m => window.LK.status(m) }); } catch (e) { wstore = null; } }
    const wished = () => { try { return !!wstore && wstore.isWished(type, id); } catch (e) { return false; } };
    const paintW = () => { if (!wb) return; const on = wished(); wb.setAttribute('aria-pressed', String(on)); wb.textContent = on ? 'On my wishlist' : (type === 'armes' ? 'I want it' : 'I want it'); };
    bt.addEventListener('click', function(){ if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); maj();
      if (own[id] && wished()) { let ok = false; try { ok = wstore.setWish(type, id, false); } catch (e) { ok = false; } if (ok) window.LK.status(TXT.range); paintW(); } });
    maj();
    if (wstore && /^[a-z0-9][a-z0-9-]{0,99}$/.test(id)) {
      wb = document.createElement('button'); wb.type = 'button'; wb.className = 'wish-bt';
      wb.addEventListener('click', function(){ const on = wb.getAttribute('aria-pressed') !== 'true'; let ok = false; try { ok = wstore.setWish(type, id, on, 'fiche'); } catch (e) { ok = false; }
        if (!ok) { window.LK.status('Can’t keep this wish: browser storage is unavailable.'); return; }
        paintW(); window.LK.status(on ? TXT.envie : 'Removed from your wishlist.'); });
      paintW(); window.addEventListener('storage', e => { if (e.key === 'lk_wish_v1') paintW(); });
    }
    const see = document.createElement('a'); see.className = 'own-see'; see.href = '../carnets/' + carnet[0] + '.html'; see.textContent = carnet[1];
    bt.insertAdjacentElement('afterend', see); if (wb) bt.insertAdjacentElement('afterend', wb);
    window.addEventListener('storage', e => { if (e.key === KEY) { own = lire(); maj(); } });
    if (/^[a-z0-9][a-z0-9-]{0,99}$/.test(id) && !document.getElementById('lk-fiche-calculator')) {
      calculatorStyle();
      const card = document.createElement('aside'); card.id = 'lk-fiche-calculator';
      card.className = 'lk-entry-card lk-fiche-calculator';
      const eyebrow = document.createElement('p'); eyebrow.className = 'lk-entry-eyebrow'; eyebrow.textContent = 'THE CALCULATOR';
      const title = document.createElement('h2'); title.textContent = type === 'armes' ? 'Want this weapon?' : 'Want this vehicle?';
      /* v7.59 (check ultime, CALC-13) : la phrase dépend de la fiche : un prix publié (data-prix posé par le générateur) est annoncé
         comme prix de référence ; sinon le prix reste « pas encore connu ». Rien n’est figé dans ce script. */
      const prix = Number(bt.dataset.prix), prixStatut = bt.dataset.prixStatut || '';
      const explanation = document.createElement('p'); explanation.textContent = 'See if you have enough money, and if not, how much play time you need. ' + (bt.dataset.prix !== undefined && Number.isFinite(prix) && prix >= 0 ? 'Its published price (' + lkDollars(new Intl.NumberFormat('en-US').format(prix)) + (prixStatut === 'official' ? ', official' : prixStatut === 'verified' ? ', measured and verified' : '') + ') is suggested as the reference price: you can enter a different one.' : 'Its price isn’t known yet: you can enter the price you imagine.');
      const link = document.createElement('a'); link.className = 'lk-entry-button'; link.href = calculatorLink(type, { id }, 'fiche'); link.textContent = 'Can I buy it? ↗';
      card.append(eyebrow, title, explanation, link);
      (bt.closest('.fiche-liens') || bt).insertAdjacentElement('afterend', card);
    }
  }

  /* ---------------------------------------------------------- photos manquantes
     Une vignette photo absente laissait l'icône d'image cassée et faussait la
     hauteur de la carte. On retombe sur la silhouette de la catégorie. */
  (function(){
    const photos = document.querySelectorAll('.veh-thumb--photo .veh-photo');
    if(!photos.length) return;
    const parCat = {};
    document.querySelectorAll('.veh-card').forEach(function(c){
      const cat = c.dataset.cat, svg = c.querySelector('.veh-art');
      if(cat && svg && !parCat[cat]) parCat[cat] = svg.outerHTML;
    });
    photos.forEach(function(img){
      const repli = function(){
        const thumb = img.closest('.veh-thumb'); if(!thumb) return;
        const cat = (img.closest('.veh-card') || {}).dataset ? img.closest('.veh-card').dataset.cat : '';
        const badge = thumb.querySelector('.veh-badge');
        thumb.classList.remove('veh-thumb--photo');
        img.remove();
        if(parCat[cat] && !thumb.querySelector('.veh-art')) thumb.insertAdjacentHTML('beforeend', parCat[cat]);
        if(badge) thumb.insertBefore(badge, thumb.firstChild);
      };
      if(img.complete && img.naturalWidth === 0) repli();
      img.addEventListener('error', repli);
    });
  })();

  /* cartes du hub */
  const grid = document.getElementById('vgrid');
  if(grid){
    const cards = Array.from(grid.querySelectorAll('.veh-card'));
    const ownButtons = new Map(), compareButtons = new Map();
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const body = c.querySelector('.veh-body'); if(!body) return;
      /* barre d'actions en pied de carte : l'image reste intacte */
      let tools = c.querySelector('.veh-tools');
      if(!tools){ tools = document.createElement('div'); tools.className = 'veh-tools'; c.appendChild(tools); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'own-card';
      b.innerHTML = '<span class="ck"></span><span class="own-lbl-c">' + (type === 'armes' ? 'Arsenal' : 'Garage') + '</span>';
      b.title = 'Mark as owned'; b.setAttribute('aria-label', (type==='armes'?'Arsenal: ':'Garage: ')+c.querySelector('h3').textContent); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); majCartes(); });
      tools.appendChild(b); ownButtons.set(id, { card: c, button: b });
    });
    /* v7.54 : boutons retenus dans une table (plus de querySelector par carte) et écritures seulement quand l'état change */
    function majCartes(){
      let n = 0;
      ownButtons.forEach(function(entry, id){ const on = !!own[id], b = entry.button;
        if(entry.card.classList.contains('is-own') !== on) entry.card.classList.toggle('is-own', on);
        if(b.classList.contains('on') !== on) b.classList.toggle('on', on);
        if(b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
        if(on) n++;
      });
      const bar = document.getElementById('own-bar');
      if(bar){
        bar.querySelector('b').textContent = n;
        bar.querySelector('progress').value = n;
      }
    }
    const bar = document.getElementById('own-bar');
    if(bar){
      bar.querySelector('progress').max = cards.length;
      bar.querySelector('.own-total').textContent = cards.length;
      const raz = bar.querySelector('[data-raz]');
      if(raz) raz.addEventListener('click', function(){
        if(!confirm(TXT.vider)) return; own = {}; ecrire(own); majCartes(); });
      const exp = bar.querySelector('[data-export]');
      if(exp) exp.addEventListener('click', function(){
        const ids = Object.keys(own).join(',');
        const url = location.origin + location.pathname + '#' + PARTAGE + '=' + ids;
        window.LK.copy(url,exp,'Link copied');
      });
    }
    /* import depuis un lien partagé */
    const hp = new URLSearchParams(location.hash.slice(1));
    const incoming = hp.get(PARTAGE);
    if(incoming !== null){
      const valid = new Set(cards.map(c=>c.dataset.id));
      incoming.split(',').filter(id=>valid.has(id)).forEach(id=>{own[id]=1;}); ecrire(own);
      hp.delete(PARTAGE); history.replaceState(null,'',location.pathname+location.search+(hp.size?'#'+hp.toString():''));
    }
    majCartes();
    /* v7.54 : une possession cochée dans un autre onglet est reflétée ici */
    window.addEventListener('storage', function(e){ if(e.key === KEY || e.key === null){ own = lire(); majCartes(); } });

    /* ------------------------------------------------------ sélection pour comparer */
    let sel = [];
    const selectionKey = 'lk-calculator-selection-' + type;
    try { const previous = JSON.parse(sessionStorage.getItem(selectionKey) || '[]');
      if (Array.isArray(previous)) sel = [...new Set(previous)].filter(id => cards.some(card => card.dataset.id === id)).slice(0, 3);
    } catch (e) { /* Selection remains usable when storage is unavailable. */ }
    const tray = document.getElementById('cmp-tray');
    let calculatorSelection;
    if (tray) {
      calculatorStyle();
      calculatorSelection = document.createElement('a'); calculatorSelection.className = 'lk-selection-calculator';
      calculatorSelection.textContent = 'Can I buy them? ↗'; calculatorSelection.hidden = true;
      tray.appendChild(calculatorSelection);
    }
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const tools = c.querySelector('.veh-tools'); if(!tools) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cmp-card';
      b.innerHTML = '<span class="cmp-ico" aria-hidden="true">⇄</span><span>Compare</span>';
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label','Compare: '+c.querySelector('h3').textContent);
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        const k = sel.indexOf(id);
        if(k >= 0) sel.splice(k, 1); else { if(sel.length >= 3){ sel.shift(); } sel.push(id); }
        majSel(); });
      tools.appendChild(b); compareButtons.set(id, b);
    });
    function majSel(){
      /* v7.57 (lot 4) : une sélection vide ne crée aucune clé au chargement ; la clé disparaît quand la sélection se vide */
      try { if (sel.length) sessionStorage.setItem(selectionKey, JSON.stringify(sel)); else if (sessionStorage.getItem(selectionKey) !== null) sessionStorage.removeItem(selectionKey); } catch (e) { /* Optional persistence. */ }
      if (calculatorSelection) {
        calculatorSelection.hidden = !sel.length;
        calculatorSelection.href = calculatorLink(type, { ids: sel.join(',') }, 'catalogue');
      }
      compareButtons.forEach(function(b, id){ const on = sel.indexOf(id) >= 0;
        if(b.classList.contains('on') !== on) b.classList.toggle('on', on);
        if(b.getAttribute('aria-pressed') !== String(on)) b.setAttribute('aria-pressed', String(on));
      });
      if(!tray) return;
      tray.classList.toggle('on', sel.length > 0);
      tray.querySelector('b').textContent = sel.length + (lkPluriel(sel.length)?' selected items':' selected item');
      tray.querySelector('a').href = 'comparateur.html?type=' + type + '&ids=' + sel.join(',');
      tray.querySelector('a').style.visibility = sel.length >= 2 ? 'visible' : 'hidden';
    }
    if(tray) tray.querySelector('button').addEventListener('click', function(){ sel = []; majSel(); });
    majSel();

    /* ------------------------------------------------------ modèle réel
       Même principe que Street View sur la carte : aucune image n'est
       hébergée ici, le bouton ouvre le modèle réel identifié dans un
       nouvel onglet. Les cartes sans inspiration identifiée n'en ont pas. */
    cards.forEach(function(c){
      const url = c.dataset.reel; if(!url) return;
      const tools = c.querySelector('.veh-tools'); if(!tools) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'reel-card';
      b.innerHTML = '<span class="reel-ico" aria-hidden="true">↗</span><span>Real-world model</span>';
      b.title = 'Real-world model photos: {nom}'.replace('{nom}', c.dataset.reelNom || 'real-world model');
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        window.open(url, '_blank', 'noopener'); });
      tools.appendChild(b);
    });
  }

  /* ---------------------------------------------------------- photo du modèle réel
     Alimentée par photos-reelles.js. Si credits-reels.json est absent ou
     ne contient pas ce véhicule, la section reste telle quelle : la photo
     est un bonus, jamais une dépendance. */
  (function(){
    const sec = document.getElementById('modele-reel');
    const bt  = document.getElementById('reel-bt');
    if(!sec || !bt) return;
    const id = (document.getElementById('own-bt') || {}).dataset;
    if(!id || !id.id) return;
    if(!window.LK.hasAsset('../credits-reels.json')) return;
    fetch('../credits-reels.json')
      .then(r => r.ok ? r.json() : null)
      .then(function(c){
        const e = c && c[id.id]; if(!e || !window.LK.hasAsset('../img/vehicules/'+id.id+'-reel.jpg')) return;
        const esc = window.LK.esc; const url = window.LK.safeUrl;
        const img = new Image();
        img.src = '../img/vehicules/' + id.id + '-reel.jpg';
        img.alt = e.modele || 'Real-world model';
        img.loading = 'lazy';
        img.onerror = function(){ fig.remove(); };
        const fig = document.createElement('figure');
        fig.className = 'reel-photo rise';
        fig.appendChild(img);
        const cap = document.createElement('figcaption');
        const lic = e.licenceUrl
          ? '<a href="' + esc(url(e.licenceUrl)) + '" target="_blank" rel="noopener nofollow">' + esc(e.licence) + '</a>'
          : esc(e.licence);
        cap.innerHTML = '<b>' + esc(e.modele || '') + '</b> (photo '
          + (e.page ? '<a href="' + esc(url(e.page)) + '" target="_blank" rel="noopener nofollow">' + esc(e.auteur) + '</a>' : esc(e.auteur))
          + ', ' + lic + '). This real-world vehicle isn’t the in-game model, it’s what inspired it.';
        fig.appendChild(cap);
        sec.insertBefore(fig, sec.querySelector('.fiche-liens'));
      })
      .catch(function(){});
  })();

  /* ---------------------------------------------------------- fiche : modèle réel
     <a id="reel-bt" href="..." data-nom="Ferrari Testarossa 512 BB"> sur la fiche. */
  const reelBt = document.getElementById('reel-bt');
  if(reelBt && !reelBt.dataset.pret){
    reelBt.dataset.pret = '1';
    reelBt.target = '_blank'; reelBt.rel = 'noopener';
  }
})();
