/* Shared browser helpers. No network service and no tracking. */
(function () {
  'use strict';
  document.documentElement.classList.add('js');
  setTimeout(()=>document.querySelectorAll('.reveal,.rise').forEach(n=>n.classList.add('in')),4000);
  const assets=new Set(window.LK_ASSETS||[]);
  const record = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function status(message) {
    let box = document.getElementById('lk-status');
    if (!box) { box = document.createElement('p'); box.id = 'lk-status'; box.className = 'lk-status'; box.setAttribute('role','status'); document.body.appendChild(box); }
    box.textContent = message;
  }
  function read(key, fallback, valid) {
    try { const raw = localStorage.getItem(key); if (raw === null) return fallback; const value = JSON.parse(raw); return valid(value) ? value : fallback; }
    catch (_) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (_) { status('La sauvegarde sur cet appareil est indisponible. Exporte tes données avant de quitter.'); return false; }
  }
  function writeBatch(values) {
    const previous = {}, written = [];
    try {
      const entries = Object.entries(values).map(([key,value]) => [key,JSON.stringify(value)]);
      for (const [key] of entries) previous[key] = localStorage.getItem(key);
      for (const [key,value] of entries) { localStorage.setItem(key,value); written.push(key); }
      return true;
    } catch (_) {
      let restored = true;
      for (const key of written.reverse()) try {
        if (previous[key] === null) localStorage.removeItem(key); else localStorage.setItem(key,previous[key]);
      } catch (_) { restored = false; }
      status(restored ? 'Import non enregistré : stockage indisponible. Les données précédentes sont conservées.' : 'Import interrompu. Exporte les données affichées avant de quitter : le stockage est indisponible.');
      return false;
    }
  }
  const own = value => record(value) && Object.entries(value).every(([k,v]) => /^[a-zA-Z0-9-]+$/.test(k) && !['__proto__','constructor','prototype'].includes(k) && [0,1,false,true].includes(v));
  const coord = n => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1000000;
  const pair = p => Array.isArray(p) && p.length === 2 && p.every(coord);
  const markers = value => Array.isArray(value) && value.length <= 5000 && value.every(p => record(p) && typeof p.n === 'string' && p.n.length <= 200 && coord(p.x) && coord(p.y) && (p.note === undefined || (typeof p.note === 'string' && p.note.length <= 4000)) && (p.cat === undefined || (typeof p.cat === 'string' && p.cat.length <= 100)));
  const strokes = value => Array.isArray(value) && value.length <= 5000 && value.every(s => record(s) && /^#[\da-f]{6}$/i.test(s.c) && typeof s.w === 'number' && s.w > 0 && s.w <= 100 && typeof s.o === 'number' && s.o >= 0 && s.o <= 1 && (s.t === 'pen' ? Array.isArray(s.p) && s.p.length <= 20000 && s.p.every(pair) : ['line','rect','circle'].includes(s.t) && pair(s.a) && pair(s.b)));
  function mapImport(d) {
    if (!record(d) || ![1,2].includes(d.version) || !markers(d.marqueurs) || !own(d.repere) || (d.traces !== undefined && !strokes(d.traces))) throw new Error('Format de sauvegarde non reconnu ou données invalides.');
    return {marqueurs:d.marqueurs.map(p => ({n:p.n,x:p.x,y:p.y,note:p.note || '',...(p.cat ? {cat:p.cat} : {})})),repere:{...d.repere},traces:d.traces || []};
  }
  async function copy(text, button, success) {
    const label = button?.textContent;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      if (button && success) { button.textContent = success; setTimeout(() => { button.textContent = label; }, 1800); }
      status('Lien ou texte copié.'); return true;
    } catch (_) { status('Copie impossible. Sélectionne et copie ce texte : ' + text); return false; }
  }
  function hasAsset(url) {
    try { return assets.has(new URL(url,location.href).pathname); } catch (_) { return false; }
  }
  function safeUrl(url) { try { const u = new URL(url,location.href); return ['https:','http:'].includes(u.protocol) ? u.href : ''; } catch (_) { return ''; } }
  window.LK = {esc,record,read,write,writeBatch,own,markers,strokes,mapImport,copy,status,hasAsset,safeUrl};
})();

/* Fiches du monde : galerie « En images » épinglée. Le cadre reste fixe le temps de N écrans de défilement ;
   la progression du défilement choisit la vue affichée (t = avancement de la transition vers la suivante).
   La vue suivante arrive depuis la profondeur, la gauche, la droite ou le bas (classe lore-slide--z/l/r/b), l'ancienne se floute. */
(function () {
  const stack = document.querySelector('.lore-stack');
  if (!stack || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const stage = stack.querySelector('.lore-stage');
  const slides = Array.from(stack.querySelectorAll('.lore-slide'));
  if (!stage || slides.length < 2) return;
  const N = slides.length;
  let queued = false, last = -1;
  function update() {
    queued = false;
    const rect = stack.getBoundingClientRect();
    const top = parseFloat(getComputedStyle(stage).top) || 96;
    const travel = Math.max(1, rect.height - stage.offsetHeight);
    const p = Math.min(1, Math.max(0, (top - rect.top) / travel));
    const pos = p * (N - 1), i = Math.min(N - 2, Math.floor(pos)), t = Math.min(1, Math.max(0, pos - i));
    slides.forEach(function (s, k) {
      s.classList.remove('is-active', 'is-out', 'is-next');
      s.style.removeProperty('--t');
      if (k === i) {
        if (t < 0.999) { s.classList.add('is-active'); if (t > 0.001) { s.classList.add('is-out'); s.style.setProperty('--t', t.toFixed(3)); } }
      } else if (k === i + 1) {
        if (t >= 0.999) s.classList.add('is-active');
        else if (t > 0.001) { s.classList.add('is-next'); s.style.setProperty('--t', t.toFixed(3)); }
      }
    });
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  update();
})();

/* Vitrine à deux cartes superposées (.lk-flip) : survol ou clic amène l'autre carte devant. */
(function () {
  document.querySelectorAll('[data-lk-flip]').forEach(function (box) {
    const cards = Array.from(box.querySelectorAll('.lk-flip-card'));
    function front(card) { cards.forEach(function (c) { const on = c === card; c.classList.toggle('is-front', on); c.setAttribute('aria-pressed', on ? 'true' : 'false'); }); }
    cards.forEach(function (c) {
      c.addEventListener('click', function () { front(c.classList.contains('is-front') ? cards[(cards.indexOf(c) + 1) % cards.length] : c); });
      c.addEventListener('mouseenter', function () { if (!c.classList.contains('is-front')) front(c); });
    });
  });
})();

/* Rails animés sur les deux bords, du compte à rebours au pied de page. */
(function () {
  const main = document.getElementById('main'), fc = document.querySelector('.fcount');
  if (!main || !fc || document.querySelector('.lk-rails')) return;
  const rails = document.createElement('div'); rails.className = 'lk-rails'; rails.setAttribute('aria-hidden', 'true');
  rails.innerHTML = '<span class="lk-rail lk-rail--l"></span><span class="lk-rail lk-rail--r"></span>';
  main.appendChild(rails);
  function place() { const m = main.getBoundingClientRect(), f = fc.getBoundingClientRect(); rails.style.top = Math.max(0, f.bottom - m.top) + 'px'; }
  window.addEventListener('resize', place); window.addEventListener('load', place); place();
})();
