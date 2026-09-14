/* ============================================================
   LEONIDAKIT — fiches.js : galerie, arsenal / garage, comparaison
   Chargé après app.js sur les fiches et les pages hub.
   ============================================================ */
(function(){
  'use strict';

  /* ---------------------------------------------------------- galerie
     <div class="gal" data-base="img/armes/micro-smg" data-vues="face,profil,arriere,detail">
     Chaque vue cherche <base>-<vue>.jpg ; absente, elle affiche l'emplacement vide
     avec l'illustration provisoire. Clavier ← →, glisser au doigt, points. */
  const VUES_LBL = { face:'Face', profil:'Profil', arriere:'Arrière', detail:'Détail', interieur:'Intérieur', dessus:'Dessus' };

  document.querySelectorAll('.gal').forEach(function(gal){
    const base = gal.dataset.base, vues = (gal.dataset.vues || 'face,profil').split(',');
    const art = gal.dataset.art || '';
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
      dots.querySelectorAll('button').forEach((d, j) => d.classList.toggle('on', j === i)); }
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
  const lire = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch(e){ return {}; } };
  const ecrire = (o) => { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch(e){} };
  let own = lire();
  const MOT = type === 'armes' ? ['arme', 'armes', 'arsenal'] : ['véhicule', 'véhicules', 'garage'];

  /* bouton de fiche */
  const bt = document.getElementById('own-bt');
  if(bt){
    const id = bt.dataset.id;
    const maj = () => { const on = !!own[id]; bt.classList.toggle('on', on);
      bt.querySelector('span:last-child').textContent = on ? 'Dans mon ' + MOT[2] : 'Ajouter à mon ' + MOT[2]; };
    bt.addEventListener('click', function(){ if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); maj(); });
    maj();
  }

  /* cartes du hub */
  const grid = document.getElementById('vgrid');
  if(grid){
    const cards = Array.from(grid.querySelectorAll('.veh-card'));
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const thumb = c.querySelector('.veh-thumb'); if(!thumb) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'own-card';
      b.title = 'Marquer comme possédé'; b.setAttribute('aria-label', b.title);
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); majCartes(); });
      thumb.appendChild(b);
    });
    function majCartes(){
      let n = 0;
      cards.forEach(function(c){ const on = !!own[c.dataset.id]; c.classList.toggle('is-own', on);
        const b = c.querySelector('.own-card'); if(b) b.classList.toggle('on', on); if(on) n++; });
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
        if(navigator.clipboard) navigator.clipboard.writeText(url);
        exp.textContent = 'Lien copié'; setTimeout(() => exp.textContent = 'Partager', 1600);
      });
    }
    /* import depuis un lien partagé */
    const m = location.hash.match(new RegExp('#' + MOT[2] + '=([\\w,-]+)'));
    if(m){ m[1].split(',').forEach(id => { own[id] = 1; }); ecrire(own); history.replaceState(null, '', location.pathname); }
    majCartes();

    /* ------------------------------------------------------ sélection pour comparer */
    let sel = [];
    const tray = document.getElementById('cmp-tray');
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const thumb = c.querySelector('.veh-thumb'); if(!thumb) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cmp-card'; b.textContent = 'Comparer';
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        const k = sel.indexOf(id);
        if(k >= 0) sel.splice(k, 1); else { if(sel.length >= 3){ sel.shift(); } sel.push(id); }
        majSel(); });
      thumb.appendChild(b);
    });
    function majSel(){
      cards.forEach(c => { const b = c.querySelector('.cmp-card'); if(b) b.classList.toggle('on', sel.indexOf(c.dataset.id) >= 0); });
      if(!tray) return;
      tray.classList.toggle('on', sel.length > 0);
      tray.querySelector('b').textContent = sel.length + ' sélectionné' + (sel.length > 1 ? 's' : '');
      tray.querySelector('a').href = 'comparateur.html?type=' + type + '&ids=' + sel.join(',');
      tray.querySelector('a').style.visibility = sel.length >= 2 ? 'visible' : 'hidden';
    }
    if(tray) tray.querySelector('button').addEventListener('click', function(){ sel = []; majSel(); });
  }
})();
