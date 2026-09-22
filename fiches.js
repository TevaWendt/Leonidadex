/* ============================================================
   LEONIDAKIT — fiches.js : galerie, arsenal / garage, comparaison
   Chargé après app.js sur les fiches et les pages hub.
   ============================================================ */
(function(){
  'use strict';
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
  function calculatorStyle() {
    if (document.querySelector('link[data-calculator-entry]')) return;
    const link = document.createElement('link'); link.rel = 'stylesheet';
    link.href = new URL('calculator-entry.css?v=20260921', calculatorBase).href;
    link.dataset.calculatorEntry = 'true'; document.head.appendChild(link);
  }

  /* ---------------------------------------------------------- galerie
     <div class="gal" data-base="img/armes/micro-smg" data-vues="face,profil,arriere,detail">
     Chaque vue cherche <base>-<vue>.jpg ; absente, elle affiche l'emplacement vide
     avec l'illustration provisoire. Clavier ← →, glisser au doigt, points. */
  const VUES_LBL = { face:'Face', profil:'Profil', arriere:'Arrière', detail:'Détail', interieur:'Intérieur', dessus:'Dessus' };

  document.querySelectorAll('.gal').forEach(function(gal){
    /* visuels officiels Rockstar déclarés dans la page : galerie prête, sans requête de test */
    var medias = [];
    try { medias = gal.dataset.medias ? JSON.parse(gal.dataset.medias) : []; } catch (e) { medias = []; }
    if (medias.length) {
      const trk = document.createElement('div'); trk.className = 'gal-track';
      /* la première vue est déjà dans le HTML (visible sans JS) ; les suivantes ne sont demandées
         qu'au moment où on les affiche, pour ne pas charger toute la galerie d'un coup */
      medias.forEach(function (m, k) {
        const it = document.createElement('div'); it.className = 'gal-item';
        const im = document.createElement('img');
        im.sizes = '(max-width:700px) 100vw, 520px';
        im.dataset.src = m.s; im.dataset.srcset = m.s + ' ' + (m.w || 480) + 'w, ' + m.l + ' ' + (m.lw || 1280) + 'w';
        if (k === 0) { im.srcset = im.dataset.srcset; im.src = m.s; im.fetchPriority = 'high'; }
        im.width = m.w; im.height = m.h; im.decoding = 'async';
        if (m.h > m.w) im.classList.add('gal-portrait');
        im.alt = m.a || ((gal.dataset.nom || '') + ' — ' + m.t + ', capture officielle Rockstar Games');
        it.appendChild(im);
        const s = document.createElement('span'); s.className = 'gal-lbl'; s.textContent = m.t; it.appendChild(s);
        trk.appendChild(it);
      });
      gal.replaceChildren(trk);
      if (medias.length > 1) {
        let j = 0;
        const dts = document.createElement('div'); dts.className = 'gal-dots';
        const goM = function (k) { j = (k + medias.length) % medias.length;
          const cur = trk.children[j].querySelector('img');
          if (cur && !cur.getAttribute('src')) { cur.srcset = cur.dataset.srcset; cur.src = cur.dataset.src; }
          trk.style.transform = 'translateX(-' + (j * 100) + '%)';
          dts.querySelectorAll('button').forEach(function (d, q) { d.classList.toggle('on', q === j); d.setAttribute('aria-current', String(q === j)); }); };
        const mk = function (cls, txt) { const b = document.createElement('button'); b.type = 'button'; b.className = 'gal-btn ' + cls; b.textContent = txt;
          b.setAttribute('aria-label', cls === 'prev' ? 'Vue précédente' : 'Vue suivante'); b.addEventListener('click', function () { goM(j + (cls === 'prev' ? -1 : 1)); }); return b; };
        gal.appendChild(mk('prev', '‹')); gal.appendChild(mk('next', '›'));
        medias.forEach(function (_, k) { const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Vue ' + (k + 1)); d.addEventListener('click', function () { goM(k); }); dts.appendChild(d); });
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
    const base = gal.dataset.base;
    const vues = (gal.dataset.vues || 'face,profil').split(',').filter(v => window.LK.hasAsset(base+'-'+v+'.jpg'));
    const art = gal.dataset.art || '';
    if(!vues.length || gal.dataset.vide === '1'){
      gal.innerHTML='<div class="gal-track"><div class="gal-item"><div class="gal-vide">'+art+'<span>'+(gal.dataset.videTxt||'Images officielles à intégrer')+'</span></div></div></div>';
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
          '<span>' + (VUES_LBL[v] || v) + ' · image à venir</span></div>';
        it.appendChild(lbl(v));
      };
      img.src = base + '-' + v + '.jpg';
      track.appendChild(it);
    });
    function lbl(v){ const s = document.createElement('span'); s.className = 'gal-lbl'; s.textContent = VUES_LBL[v] || v; return s; }

    gal.appendChild(track);
    /* aucune image officielle : un seul emplacement, pas de défilement */
    if(gal.dataset.vide === '1'){
      track.innerHTML = '<div class="gal-item"><div class="gal-vide">' + art + '<span>Images officielles à venir</span></div></div>';
      return;
    }
    const prev = bt('prev', '‹'), next = bt('next', '›');
    gal.appendChild(prev); gal.appendChild(next);
    const dots = document.createElement('div'); dots.className = 'gal-dots';
    vues.forEach(function(_, k){
      const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Vue ' + (k+1));
      d.addEventListener('click', function(){ go(k); }); dots.appendChild(d);
    });
    gal.parentNode.insertBefore(dots, gal.nextSibling);

    function bt(cls, txt){ const b = document.createElement('button'); b.type = 'button'; b.className = 'gal-btn ' + cls;
      b.textContent = txt; b.setAttribute('aria-label', cls === 'prev' ? 'Vue précédente' : 'Vue suivante');
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
  const ecrire = o => window.LK.write(KEY,o);
  let own = lire();
  const MOT = type === 'armes' ? ['arme', 'armes', 'arsenal'] : ['véhicule', 'véhicules', 'garage'];

  /* bouton de fiche */
  const bt = document.getElementById('own-bt');
  if(bt){
    const id = bt.dataset.id;
    const maj = () => { const on = !!own[id]; bt.classList.toggle('on', on); bt.setAttribute('aria-pressed',String(on));
      bt.querySelector('span:last-child').textContent = on ? 'Dans mon ' + MOT[2] : 'Ajouter à mon ' + MOT[2]; };
    bt.addEventListener('click', function(){ if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); maj(); });
    maj();
    if (/^[a-z0-9][a-z0-9-]{0,99}$/.test(id) && !document.getElementById('lk-fiche-calculator')) {
      calculatorStyle();
      const card = document.createElement('aside'); card.id = 'lk-fiche-calculator';
      card.className = 'lk-entry-card lk-fiche-calculator';
      const eyebrow = document.createElement('p'); eyebrow.className = 'lk-entry-eyebrow'; eyebrow.textContent = 'LE CALCULATEUR';
      const title = document.createElement('h2'); title.textContent = type === 'armes' ? 'Tu veux cette arme ?' : 'Tu veux ce véhicule ?';
      const explanation = document.createElement('p'); explanation.textContent = 'Regarde si tu as assez d’argent, et sinon combien de temps de jeu il te faut. Son prix n’est pas encore connu : tu peux écrire celui que tu imagines.';
      const link = document.createElement('a'); link.className = 'lk-entry-button'; link.href = calculatorLink(type, { id }, 'fiche'); link.textContent = 'Est-ce que je peux l’acheter ? ↗';
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
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const body = c.querySelector('.veh-body'); if(!body) return;
      /* barre d'actions en pied de carte : l'image reste intacte */
      let tools = c.querySelector('.veh-tools');
      if(!tools){ tools = document.createElement('div'); tools.className = 'veh-tools'; c.appendChild(tools); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'own-card';
      b.innerHTML = '<span class="ck"></span><span class="own-lbl-c">' + (type === 'armes' ? 'Arsenal' : 'Garage') + '</span>';
      b.title = 'Marquer comme possédé'; b.setAttribute('aria-label', (type==='armes'?'Arsenal : ':'Garage : ')+c.querySelector('h3').textContent); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); majCartes(); });
      tools.appendChild(b);
    });
    function majCartes(){
      let n = 0;
      cards.forEach(function(c){ const on = !!own[c.dataset.id]; c.classList.toggle('is-own', on);
        const b = c.querySelector('.own-card'); if(b){ b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } if(on) n++; });
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
        if(!confirm('Vider mon ' + MOT[2] + ' ?')) return; own = {}; ecrire(own); majCartes(); });
      const exp = bar.querySelector('[data-export]');
      if(exp) exp.addEventListener('click', function(){
        const ids = Object.keys(own).join(',');
        const url = location.origin + location.pathname + '#' + MOT[2] + '=' + ids;
        window.LK.copy(url,exp,'Lien copié');
      });
    }
    /* import depuis un lien partagé */
    const hp = new URLSearchParams(location.hash.slice(1));
    const incoming = hp.get(MOT[2]);
    if(incoming !== null){
      const valid = new Set(cards.map(c=>c.dataset.id));
      incoming.split(',').filter(id=>valid.has(id)).forEach(id=>{own[id]=1;}); ecrire(own);
      hp.delete(MOT[2]); history.replaceState(null,'',location.pathname+location.search+(hp.size?'#'+hp.toString():''));
    }
    majCartes();

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
      calculatorSelection.textContent = 'Est-ce que je peux les acheter ? ↗'; calculatorSelection.hidden = true;
      tray.appendChild(calculatorSelection);
    }
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const tools = c.querySelector('.veh-tools'); if(!tools) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cmp-card';
      b.innerHTML = '<span class="cmp-ico" aria-hidden="true">⇄</span><span>Comparer</span>';
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label','Comparer : '+c.querySelector('h3').textContent);
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        const k = sel.indexOf(id);
        if(k >= 0) sel.splice(k, 1); else { if(sel.length >= 3){ sel.shift(); } sel.push(id); }
        majSel(); });
      tools.appendChild(b);
    });
    function majSel(){
      try { sessionStorage.setItem(selectionKey, JSON.stringify(sel)); } catch (e) { /* Optional persistence. */ }
      if (calculatorSelection) {
        calculatorSelection.hidden = !sel.length;
        calculatorSelection.href = calculatorLink(type, { ids: sel.join(',') }, 'catalogue');
      }
      cards.forEach(c => { const b = c.querySelector('.cmp-card'); if(b){ const on = sel.indexOf(c.dataset.id) >= 0; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); } });
      if(!tray) return;
      tray.classList.toggle('on', sel.length > 0);
      tray.querySelector('b').textContent = sel.length + ' sélectionné' + (sel.length > 1 ? 's' : '');
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
      b.innerHTML = '<span class="reel-ico" aria-hidden="true">↗</span><span>Modèle réel</span>';
      b.title = 'Voir le ' + (c.dataset.reelNom || 'modèle réel') + ' en photo';
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
        img.alt = e.modele || 'Modèle réel';
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
          + ', ' + lic + '). Ce véhicule réel n\'est pas le modèle du jeu, c\'est son inspiration.';
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
