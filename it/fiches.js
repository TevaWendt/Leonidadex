/* Généré depuis outils/sources/fiches.js : modifie la source, pas ce fichier. */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
(function(){
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; };
  var lkDollars = function (s) { return /^pt/.test(document.documentElement.lang || "fr") ? "$\u00a0" + s : /^(fr|de)/.test(document.documentElement.lang || "fr") ? s + "\u00a0$" : "$" + s; };
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
    if (document.querySelector('link[data-calculator-entry], link[rel="stylesheet"][href*="calculator-entry.css"]')) return;
    const link = document.createElement('link'); link.rel = 'stylesheet';
    const main = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).find(l => /(?:^|\/)style\.css(?:\?|$)/.test(l.getAttribute('href') || ''));
    link.href = new URL('calculator-entry.css?v=e178a05bf93e', main ? main.href : calculatorBase).href.replace(/\/[a-z]{2}\/(?=calculator-entry\.css)/, '/');
    link.dataset.calculatorEntry = 'true'; document.head.appendChild(link);
  }
  const VUES_LBL = { face:'Fronte', profil:'Profilo', arriere:'Retro', detail:'Dettaglio', interieur:'Interni', dessus:'Dall’alto' };
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
      if (count) count.textContent = (i + 1) + ' su ' + n;
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
    var medias = [];
    try { medias = gal.dataset.medias ? JSON.parse(gal.dataset.medias) : []; } catch (e) { medias = []; }
    if (medias.length) {
      const firstImage = gal.querySelector('img[src]');
      const trk = document.createElement('div'); trk.className = 'gal-track';
      medias.forEach(function (m, k) {
        const it = document.createElement('div'); it.className = 'gal-item';
        const im = k === 0 && firstImage ? firstImage : document.createElement('img');
        if (im.getAttribute('sizes') !== '(max-width:700px) 100vw, 520px') im.sizes = '(max-width:700px) 100vw, 520px';
        const m800 = m.s && m.l && /-480\.webp$/.test(m.s) && m.l === m.s.replace(/-480\.webp$/, '-1280.webp') ? m.s.replace(/-480\.webp$/, '-800.webp') : '';
        im.dataset.src = m.s; im.dataset.srcset = m.s + ' ' + (m.w || 480) + 'w, ' + (m800 && window.LK.hasAsset(m800) ? m800 + ' 800w, ' : '') + m.l + ' ' + (m.lw || 1280) + 'w';
        if (k === 0) {
          if (im.getAttribute('srcset') !== im.dataset.srcset) im.srcset = im.dataset.srcset;
          if (im.getAttribute('src') !== m.s) im.src = m.s;
          if (im.getAttribute('fetchpriority') !== 'high') im.fetchPriority = 'high';
        }
        if (im.getAttribute('width') !== String(m.w)) im.width = m.w;
        if (im.getAttribute('height') !== String(m.h)) im.height = m.h;
        if (im.getAttribute('decoding') !== 'async') im.decoding = 'async';
        if (m.h > m.w) im.classList.add('gal-portrait');
        im.alt = m.a || ((gal.dataset.nom || '') + ', ' + m.t + ', screenshot ufficiale di Rockstar Games');
        it.appendChild(im);
        const s = document.createElement('span'); s.className = 'gal-lbl'; s.textContent = m.t; it.appendChild(s);
        trk.appendChild(it);
      });
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
          b.setAttribute('aria-label', cls === 'prev' ? 'Vista precedente' : 'Vista successiva'); b.addEventListener('click', function () { goM(j + (cls === 'prev' ? -1 : 1)); }); return b; };
        gal.appendChild(mk('prev', '‹')); gal.appendChild(mk('next', '›'));
        for (let k = 0; k < nSlides; k++) { const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', k < medias.length ? 'Vista ' + (k + 1) : (angSlide.querySelector('[data-ang]').dataset.angDot || 'Vista ' + (k + 1))); d.addEventListener('click', function () { goM(k); }); dts.appendChild(d); }
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
    if (gal.classList.contains('gal--ang')) { initAng(gal.querySelector('[data-ang]')); return; }
    const base = gal.dataset.base;
    const vues = (gal.dataset.vues || 'face,profil').split(',').filter(v => window.LK.hasAsset(base+'-'+v+'.jpg'));
    const art = gal.dataset.art || '';
    if(!vues.length || gal.dataset.vide === '1'){
      gal.innerHTML='<div class="gal-track"><div class="gal-item"><div class="gal-vide">'+art+'<span>'+(gal.dataset.videTxt||'Immagini ufficiali da aggiungere')+'</span></div></div></div>';
      return;
    }
    const track = document.createElement('div'); track.className = 'gal-track';
    let i = 0;
    vues.forEach(function(v, k){
      const it = document.createElement('div'); it.className = 'gal-item';
      const img = new Image();
      img.alt = (gal.dataset.nom || '') + ', ' + (VUES_LBL[v] || v);
      img.onload = function(){ it.innerHTML = ''; it.appendChild(img); it.appendChild(lbl(v)); };
      img.onerror = function(){
        it.innerHTML = '<div class="gal-vide">' + art +
          '<span>' + (VUES_LBL[v] || v) + ', immagine in arrivo</span></div>';
        it.appendChild(lbl(v));
      };
      img.src = base + '-' + v + '.jpg';
      track.appendChild(it);
    });
    function lbl(v){ const s = document.createElement('span'); s.className = 'gal-lbl'; s.textContent = VUES_LBL[v] || v; return s; }
    gal.appendChild(track);
    if(gal.dataset.vide === '1'){
      track.innerHTML = '<div class="gal-item"><div class="gal-vide">' + art + '<span>Immagini ufficiali in arrivo</span></div></div>';
      return;
    }
    const prev = bt('prev', '‹'), next = bt('next', '›');
    gal.appendChild(prev); gal.appendChild(next);
    const dots = document.createElement('div'); dots.className = 'gal-dots';
    vues.forEach(function(_, k){
      const d = document.createElement('button'); d.type = 'button'; d.setAttribute('aria-label', 'Vista ' + (k+1));
      d.addEventListener('click', function(){ go(k); }); dots.appendChild(d);
    });
    gal.parentNode.insertBefore(dots, gal.nextSibling);
    function bt(cls, txt){ const b = document.createElement('button'); b.type = 'button'; b.className = 'gal-btn ' + cls;
      b.textContent = txt; b.setAttribute('aria-label', cls === 'prev' ? 'Vista precedente' : 'Vista successiva');
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
  const type = document.body.dataset.own;
  if(!type) return;
  const KEY = 'lk_own_' + type;
  const lire = () => window.LK.read(KEY,{},window.LK.own);
  const ecrire = o => { const saved = window.LK.write(KEY,o); document.dispatchEvent(new CustomEvent('lk-owned', { detail: { type } })); return saved; };
  let own = lire();
  const MOT = type === 'armes' ? ['arma', 'armes', 'arsenale'] : ['veicolo', 'veicoli', 'garage'];
  const PARTAGE = type === 'armes' ? 'arsenal' : 'garage';
  const TXT = type === 'armes'
    ? { dans: 'Nel mio arsenale', ajouter: 'Aggiungi al mio arsenale', range: 'Spostato nel tuo arsenale e tolto dai tuoi desideri.', envie: 'Salvato nei tuoi desideri. Non vuol dire che ce l’hai: non viene spuntato niente nel tuo arsenale.', vider: 'Svuotare il mio arsenale?' }
    : { dans: 'Nel mio garage', ajouter: 'Aggiungi al mio garage', range: 'Spostato nel tuo garage e tolto dai tuoi desideri.', envie: 'Salvato nei tuoi desideri. Non vuol dire che ce l’hai: non viene spuntato niente nel tuo garage.', vider: 'Svuotare il mio garage?' };
  const bt = document.getElementById('own-bt');
  if(bt){
    const id = bt.dataset.id;
    const maj = () => { const on = !!own[id]; bt.classList.toggle('on', on); bt.setAttribute('aria-pressed',String(on));
      bt.querySelector('span:last-child').textContent = on ? TXT.dans : TXT.ajouter; };
    const carnet = type === 'armes' ? ['arsenal', 'Vedi il mio arsenale'] : ['garage', 'Vedi il mio garage'];
    let wstore = null, wb = null;
    if (window.LKCarnets) { try { wstore = window.LKCarnets.create({ storage: localStorage, notice: m => window.LK.status(m) }); } catch (e) { wstore = null; } }
    const wished = () => { try { return !!wstore && wstore.isWished(type, id); } catch (e) { return false; } };
    const paintW = () => { if (!wb) return; const on = wished(); wb.setAttribute('aria-pressed', String(on)); wb.textContent = on ? 'Nei miei desideri' : (type === 'armes' ? 'La voglio' : 'Lo voglio'); };
    bt.addEventListener('click', function(){ if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); maj();
      if (own[id] && wished()) { let ok = false; try { ok = wstore.setWish(type, id, false); } catch (e) { ok = false; } if (ok) window.LK.status(TXT.range); paintW(); } });
    maj();
    if (wstore && /^[a-z0-9][a-z0-9-]{0,99}$/.test(id)) {
      wb = document.createElement('button'); wb.type = 'button'; wb.className = 'wish-bt';
      wb.addEventListener('click', function(){ const on = wb.getAttribute('aria-pressed') !== 'true'; let ok = false; try { ok = wstore.setWish(type, id, on, 'fiche'); } catch (e) { ok = false; }
        if (!ok) { window.LK.status('Impossibile salvare questo desiderio: lo spazio di archiviazione del browser non è disponibile.'); return; }
        paintW(); window.LK.status(on ? TXT.envie : 'Tolto dai tuoi desideri.'); });
      paintW(); window.addEventListener('storage', e => { if (e.key === 'lk_wish_v1') paintW(); });
    }
    const see = document.createElement('a'); see.className = 'own-see'; see.href = '../carnets/' + carnet[0] + '.html'; see.textContent = carnet[1];
    bt.insertAdjacentElement('afterend', see); if (wb) bt.insertAdjacentElement('afterend', wb);
    window.addEventListener('storage', e => { if (e.key === KEY) { own = lire(); maj(); } });
    if (/^[a-z0-9][a-z0-9-]{0,99}$/.test(id) && !document.getElementById('lk-fiche-calculator')) {
      calculatorStyle();
      const card = document.createElement('aside'); card.id = 'lk-fiche-calculator';
      card.className = 'lk-entry-card lk-fiche-calculator';
      const eyebrow = document.createElement('p'); eyebrow.className = 'lk-entry-eyebrow'; eyebrow.textContent = 'IL CALCOLATORE';
      const title = document.createElement('h2'); title.textContent = type === 'armes' ? 'Vuoi quest’arma?' : 'Vuoi questo veicolo?';
      const prix = Number(bt.dataset.prix), prixStatut = bt.dataset.prixStatut || '';
      const explanation = document.createElement('p'); explanation.textContent = 'Guarda se hai abbastanza soldi e, se no, quanto tempo di gioco ti serve. ' + (bt.dataset.prix !== undefined && Number.isFinite(prix) && prix >= 0 ? 'Il suo prezzo pubblicato (' + lkDollars(new Intl.NumberFormat('it-IT').format(prix)) + (prixStatut === 'official' ? ', ufficiale' : prixStatut === 'verified' ? ', misurato e verificato' : '') + ') è proposto come prezzo di riferimento: puoi scriverne un altro.' : 'Il suo prezzo non è ancora noto: puoi scrivere il prezzo che immagini.');
      const link = document.createElement('a'); link.className = 'lk-entry-button'; link.href = calculatorLink(type, { id }, 'fiche'); link.textContent = 'Posso comprarlo? ↗';
      card.append(eyebrow, title, explanation, link);
      (bt.closest('.fiche-liens') || bt).insertAdjacentElement('afterend', card);
    }
  }
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
  const grid = document.getElementById('vgrid');
  if(grid){
    const cards = Array.from(grid.querySelectorAll('.veh-card'));
    const ownButtons = new Map(), compareButtons = new Map();
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const body = c.querySelector('.veh-body'); if(!body) return;
      let tools = c.querySelector('.veh-tools');
      if(!tools){ tools = document.createElement('div'); tools.className = 'veh-tools'; c.appendChild(tools); }
      const b = document.createElement('button'); b.type = 'button'; b.className = 'own-card';
      b.innerHTML = '<span class="ck"></span><span class="own-lbl-c">' + (type === 'armes' ? 'Arsenale' : 'Garage') + '</span>';
      b.title = 'Segna che ce l’hai'; b.setAttribute('aria-label', (type==='armes'?'Arsenale: ':'Garage: ')+c.querySelector('h3').textContent); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        if(own[id]) delete own[id]; else own[id] = 1; ecrire(own); majCartes(); });
      tools.appendChild(b); ownButtons.set(id, { card: c, button: b });
    });
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
        window.LK.copy(url,exp,'Link copiato');
      });
    }
    const hp = new URLSearchParams(location.hash.slice(1));
    const incoming = hp.get(PARTAGE);
    if(incoming !== null){
      const valid = new Set(cards.map(c=>c.dataset.id));
      incoming.split(',').filter(id=>valid.has(id)).forEach(id=>{own[id]=1;}); ecrire(own);
      hp.delete(PARTAGE); history.replaceState(null,'',location.pathname+location.search+(hp.size?'#'+hp.toString():''));
    }
    majCartes();
    window.addEventListener('storage', function(e){ if(e.key === KEY || e.key === null){ own = lire(); majCartes(); } });
    let sel = [];
    const selectionKey = 'lk-calculator-selection-' + type;
    try { const previous = JSON.parse(sessionStorage.getItem(selectionKey) || '[]');
      if (Array.isArray(previous)) sel = [...new Set(previous)].filter(id => cards.some(card => card.dataset.id === id)).slice(0, 3);
    } catch (e) {  }
    const tray = document.getElementById('cmp-tray');
    let calculatorSelection;
    if (tray) {
      calculatorStyle();
      calculatorSelection = document.createElement('a'); calculatorSelection.className = 'lk-selection-calculator';
      calculatorSelection.textContent = 'Posso comprarli? ↗'; calculatorSelection.hidden = true;
      tray.appendChild(calculatorSelection);
    }
    cards.forEach(function(c){
      const id = c.dataset.id; if(!id) return;
      const tools = c.querySelector('.veh-tools'); if(!tools) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cmp-card';
      b.innerHTML = '<span class="cmp-ico" aria-hidden="true">⇄</span><span>Confronta</span>';
      b.setAttribute('aria-pressed', 'false'); b.setAttribute('aria-label','Confronta: '+c.querySelector('h3').textContent);
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        const k = sel.indexOf(id);
        if(k >= 0) sel.splice(k, 1); else { if(sel.length >= 3){ sel.shift(); } sel.push(id); }
        majSel(); });
      tools.appendChild(b); compareButtons.set(id, b);
    });
    function majSel(){
      try { if (sel.length) sessionStorage.setItem(selectionKey, JSON.stringify(sel)); else if (sessionStorage.getItem(selectionKey) !== null) sessionStorage.removeItem(selectionKey); } catch (e) {  }
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
      tray.querySelector('b').textContent = sel.length + (lkPluriel(sel.length)?' selezionati':' selezionato');
      tray.querySelector('a').href = 'comparateur.html?type=' + type + '&ids=' + sel.join(',');
      tray.querySelector('a').style.visibility = sel.length >= 2 ? 'visible' : 'hidden';
    }
    if(tray) tray.querySelector('button').addEventListener('click', function(){ sel = []; majSel(); });
    majSel();
    cards.forEach(function(c){
      const url = c.dataset.reel; if(!url) return;
      const tools = c.querySelector('.veh-tools'); if(!tools) return;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'reel-card';
      b.innerHTML = '<span class="reel-ico" aria-hidden="true">↗</span><span>Modello reale</span>';
      b.title = 'Vedi {nom} in foto'.replace('{nom}', c.dataset.reelNom || 'il modello reale');
      b.addEventListener('click', function(e){ e.preventDefault(); e.stopPropagation();
        window.open(url, '_blank', 'noopener'); });
      tools.appendChild(b);
    });
  }
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
        img.alt = e.modele || 'Modello reale';
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
          + ', ' + lic + '). Questo veicolo reale non è il modello del gioco, è la sua ispirazione.';
        fig.appendChild(cap);
        sec.insertBefore(fig, sec.querySelector('.fiche-liens'));
      })
      .catch(function(){});
  })();
  const reelBt = document.getElementById('reel-bt');
  if(reelBt && !reelBt.dataset.pret){
    reelBt.dataset.pret = '1';
    reelBt.target = '_blank'; reelBt.rel = 'noopener';
  }
})();
