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

/* Fiches du monde : galerie empilée. Chaque image reste collée en haut pendant que la suivante la recouvre ;
   l'ancienne se floute et s'efface à mesure que la nouvelle devient nette (défilement à la molette, au doigt ou au clavier). */
(function () {
  const stack = document.querySelector('.lore-stack');
  if (!stack || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const slides = Array.from(stack.querySelectorAll('.lore-slide'));
  if (slides.length < 2) return;
  let queued = false;
  function update() {
    queued = false;
    const top = parseFloat(getComputedStyle(slides[0]).top) || 96;
    for (let i = 0; i < slides.length - 1; i++) {
      const r = slides[i].getBoundingClientRect(), n = slides[i + 1].getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (top + r.height - n.top) / Math.max(1, r.height)));
      slides[i].style.setProperty('--p', p.toFixed(3));
      slides[i].classList.toggle('is-past', p > 0.001);
    }
    const vh = window.innerHeight || 800;
    for (const s of slides) {
      const r = s.getBoundingClientRect();
      const e = Math.min(1, Math.max(0, (r.top - top) / Math.max(1, vh * 0.75)));
      s.style.setProperty('--e', e.toFixed(3));
      if (e < 0.8) s.classList.add('is-in');
    }
  }
  window.addEventListener('scroll', function () { if (!queued) { queued = true; requestAnimationFrame(update); } }, { passive: true });
  window.addEventListener('resize', update);
  slides.forEach(function (s) { s.querySelector('img')?.addEventListener('load', update); });
  update();
})();
