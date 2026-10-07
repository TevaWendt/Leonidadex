/* v7.69 : visionneuse d'images de Leonidakit (demande de Téva : « quand on clique sur les images, ce n'est pas très beau »).
   Un clic sur un lien qui mène à une image du site (galeries « En images », aperçus des armes, captures du tuto) ouvre
   l'image dans la page au lieu du fichier brut : l'image grandit depuis sa vignette, flèches et clavier (← →), glisser au
   doigt (côté : image suivante ; vers le bas : fermer), double-clic ou double tap pour voir le détail, vignettes de la
   galerie, légende, lien vers le fichier d'origine. Échap, le fond ou ✕ referment : l'image retourne à sa vignette.
   « Réduire les animations » : fondus seulement. Chargé à la demande par common.js (déclaré dans la page par
   <script type="lk/lazy" src="lk-visionneuse.js">, posé par outils/sync-site.cjs). Rien n'est enregistré. */
(function () {
  'use strict';
  if (window.LKViewer) return;
  const doc = document, html = doc.documentElement;
  const IMG = /\.(?:webp|avif|jpe?g|png)$/i;
  const EASE = 'cubic-bezier(.2,.8,.2,1)';
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = n => String(n).padStart(2, '0');
  const T = {
    dialog: 'Visualizzatore di immagini',
    zoomIn: 'Vedi il dettaglio',
    zoomOut: 'Torna all’immagine intera',
    orig: 'Apri l’immagine originale',
    origTitle: 'Apri l’immagine originale in una nuova scheda',
    close: 'Chiudi il visualizzatore',
    closeTitle: 'Chiudi (Esc)',
    prev: 'Immagine precedente',
    next: 'Immagine successiva',
    thumbs: 'Tutte le immagini della galleria',
    count: 'Immagine {n} di {total}',
    loading: 'Caricamento dell’immagine…'
  };
  const ICON = {
    zoom: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.2"/><path d="M15.5 15.5 21 21M10.5 7.5v6M7.5 10.5h6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    open: '<svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true" focusable="false"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" focusable="false"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  let ui = null, items = [], at = 0, opener = null, state = 'closed', token = 0;
  let zoom = { on: false, s: 1, x: 0, y: 0 }, dragged = false;

  const pathOf = href => { try { const u = new URL(href, location.href); return u.origin === location.origin ? u.pathname : ''; } catch (_) { return ''; } };
  /* même image en plusieurs tailles (grassrivers-03-480.webp, grassrivers-03-1280.webp) */
  const baseOf = p => p.replace(/\.\w+$/, '').replace(/-\d{2,4}$/, '');
  const isImageLink = a => !!(a && a.href && !a.hasAttribute('download') && IMG.test(pathOf(a.href)));
  const textOf = el => el ? el.textContent.replace(/\s+/g, ' ').trim() : '';

  function itemOf(a) {
    const fig = a.closest('figure');
    const img = a.querySelector('img') || (fig && fig.querySelector('img')) || null;
    const slide = a.closest('.lore-slide');
    let kicker = '';
    if (slide) kicker = [textOf(slide.querySelector('.lst-k')), textOf(slide.querySelector('.lore-slide-txt strong'))].filter(Boolean).join(' · ');
    else if (fig && fig.querySelector('.t-figure-bar span')) kicker = textOf(fig.querySelector('.t-figure-bar span'));
    else { const g = a.closest('.lore-gallery-grid[data-kicker], [data-lkv-group][data-kicker]'); if (g) kicker = g.dataset.kicker; }
    const title = (img && img.getAttribute('alt')) || textOf(fig && fig.querySelector('figcaption')) || (a.getAttribute('aria-label') || '').replace(/^[^:]{1,24}:\s*/, '');
    const href = pathOf(a.href), cur = img ? pathOf(img.currentSrc || img.src || '') : '';
    const same = !!(cur && baseOf(cur) === baseOf(href));
    let w = 0, h = 0;
    if (same && img.naturalWidth) { w = img.naturalWidth; h = img.naturalHeight; }
    else if (img && pathOf(img.getAttribute('src') || '') === href) { w = +img.getAttribute('width') || 0; h = +img.getAttribute('height') || 0; }
    return { a, href: a.href, img, w, h, kicker, title, placeholder: same ? (img.currentSrc || img.src) : '', thumb: img ? (img.currentSrc || img.src) : '', big: null };
  }
  function groupOf(a) {
    const box = a.closest('.lore-stage, [data-lkv-group]') || a.closest('main') || doc.body;
    const seen = new Map(), list = [];
    for (const l of box.querySelectorAll('a[href]')) {
      if (!isImageLink(l) || l.closest('[hidden], template')) continue;
      const k = pathOf(l.href); if (seen.has(k)) continue;
      seen.set(k, list.length); list.push(l);
    }
    if (!seen.has(pathOf(a.href))) { seen.set(pathOf(a.href), list.length); list.push(a); }
    return { links: list, index: seen.get(pathOf(a.href)) };
  }

  function css() {
    if (doc.getElementById('lkv-css')) return;
    const s = doc.createElement('style'); s.id = 'lkv-css';
    s.textContent = `
html.lkv-lock{overflow:hidden}
.lkv{position:fixed;inset:0;width:100%;height:100%;max-width:none;max-height:none;margin:0;padding:0;border:0;background:transparent;color:#fff;overflow:hidden;font-family:inherit;display:grid;grid-template-rows:auto minmax(0,1fr) auto;z-index:2147483000}
.lkv:not([open]){display:none}
.lkv::backdrop{background:transparent}
.lkv-bg{position:absolute;inset:0;z-index:-1;background:radial-gradient(ellipse 70% 60% at 50% 42%,#2b2119,#0d0c0f 72%);}
.lkv-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:max(12px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) 6px max(16px,env(safe-area-inset-left))}
.lkv-count{font:800 .9rem/1 'Archivo',system-ui,sans-serif;letter-spacing:.14em;color:#f5a524;font-variant-numeric:tabular-nums}
.lkv-tools{display:flex;gap:8px}
.lkv-btn,.lkv-nav{display:inline-grid;place-items:center;border-radius:50%;border:1.5px solid rgba(255,255,255,.26);background:rgba(255,255,255,.08);color:#fff;cursor:pointer;padding:0;transition:background .2s,border-color .2s,color .2s,transform .2s,opacity .2s;-webkit-tap-highlight-color:transparent}
.lkv-btn{width:44px;height:44px;text-decoration:none}
.lkv-btn:hover,.lkv-nav:hover{background:#f5a524;border-color:#f5a524;color:#1a1a1e}
.lkv-btn:active,.lkv-nav:active{transform:scale(.94)}
.lkv-btn[aria-pressed="true"]{background:#f5a524;border-color:#f5a524;color:#1a1a1e}
.lkv :focus-visible{outline:3px solid #f5a524;outline-offset:3px}
.lkv-stage{position:relative;display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:14px;padding:0 max(14px,env(safe-area-inset-right)) 0 max(14px,env(safe-area-inset-left));min-height:0}
.lkv-nav{width:54px;height:54px}
.lkv-nav[hidden]{display:inline-grid;visibility:hidden}
.lkv-frame{position:relative;height:100%;min-height:0;display:grid;place-items:center;touch-action:none;cursor:default}
.lkv-img{display:block;max-width:none;border-radius:10px;background:#1d1b1f;box-shadow:0 34px 90px -28px rgba(0,0,0,.85),0 0 0 1px rgba(255,255,255,.06);user-select:none;-webkit-user-select:none;-webkit-user-drag:none;cursor:zoom-in;transform-origin:50% 50%;will-change:transform}
.lkv.is-zoom .lkv-img{cursor:grab;box-shadow:none}
.lkv.is-drag .lkv-img{cursor:grabbing}
.lkv.is-wait .lkv-frame::after{content:'';position:absolute;width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.2);border-top-color:#f5a524;animation:lkv-spin .8s linear infinite}
@keyframes lkv-spin{to{transform:rotate(360deg)}}
.lkv-bottom{display:grid;justify-items:center;gap:10px;padding:10px max(16px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
.lkv-cap{margin:0;max-width:74ch;text-align:center;font-size:.95rem;line-height:1.45;color:rgba(255,255,255,.9);min-height:1.45em}
.lkv-k{display:block;margin-bottom:5px;font:800 .7rem/1.2 'Archivo',system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#f5a524}
.lkv-k:empty{display:none}
.lkv-thumbs{display:flex;gap:8px;max-width:100%;overflow-x:auto;padding:4px 2px 2px;scrollbar-width:none}
.lkv-thumbs::-webkit-scrollbar{display:none}
.lkv-thumbs:empty{display:none}
.lkv-th{flex:0 0 auto;width:68px;height:44px;padding:0;border-radius:8px;overflow:hidden;border:2px solid transparent;background:#232026;opacity:.5;cursor:pointer;transition:opacity .2s,border-color .2s,transform .25s}
.lkv-th img{display:block;width:100%;height:100%;object-fit:cover}
.lkv-th:hover{opacity:.85}
.lkv-th[aria-current="true"]{opacity:1;border-color:#f5a524;transform:translateY(-3px)}
@media(max-width:600px){
 .lkv-stage{grid-template-columns:minmax(0,1fr);padding:0 6px}
 .lkv-nav{position:absolute;top:50%;z-index:2;width:42px;height:42px;margin-top:-21px;background:rgba(10,10,12,.55)}
 .lkv-prev{left:8px}.lkv-next{right:8px}
 .lkv-cap{font-size:.88rem}
 .lkv-th{width:54px;height:36px}
}
@media(hover:none){.lkv-nav{opacity:.85}}
@media(prefers-reduced-motion:reduce){.lkv-btn,.lkv-nav,.lkv-th{transition:none}}
`;
    doc.head.appendChild(s);
  }

  function build() {
    css();
    const d = doc.createElement('dialog');
    d.className = 'lkv'; d.setAttribute('aria-label', T.dialog);
    d.innerHTML = '<div class="lkv-bg" aria-hidden="true"></div>'
      + '<div class="lkv-top"><span class="lkv-count" aria-hidden="true"></span><span class="lkv-tools">'
      + '<button type="button" class="lkv-btn lkv-zoom" aria-pressed="false">' + ICON.zoom + '<span class="sr-only"></span></button>'
      + '<a class="lkv-btn lkv-orig" target="_blank" rel="noopener">' + ICON.open + '<span class="sr-only"></span></a>'
      + '<button type="button" class="lkv-btn lkv-close">' + ICON.close + '<span class="sr-only"></span></button></span></div>'
      + '<div class="lkv-stage"><button type="button" class="lkv-nav lkv-prev">' + ICON.prev + '<span class="sr-only"></span></button>'
      + '<div class="lkv-frame"><img class="lkv-img" alt="" decoding="async" draggable="false"></div>'
      + '<button type="button" class="lkv-nav lkv-next">' + ICON.next + '<span class="sr-only"></span></button></div>'
      + '<div class="lkv-bottom"><p class="lkv-cap"><span class="lkv-k"></span><span class="lkv-t"></span></p><div class="lkv-thumbs" role="group"></div></div>'
      + '<p class="sr-only lkv-live" aria-live="polite"></p>';
    const q = sel => d.querySelector(sel);
    ui = { d, bg: q('.lkv-bg'), top: q('.lkv-top'), bottom: q('.lkv-bottom'), stage: q('.lkv-stage'), frame: q('.lkv-frame'), img: q('.lkv-img'),
      count: q('.lkv-count'), k: q('.lkv-k'), t: q('.lkv-t'), thumbs: q('.lkv-thumbs'), live: q('.lkv-live'),
      zoom: q('.lkv-zoom'), orig: q('.lkv-orig'), close: q('.lkv-close'), prev: q('.lkv-prev'), next: q('.lkv-next') };
    ui.zoom.title = T.zoomIn; ui.zoom.querySelector('.sr-only').textContent = T.zoomIn;
    ui.orig.title = T.origTitle; ui.orig.querySelector('.sr-only').textContent = T.orig;
    ui.close.title = T.closeTitle; ui.close.querySelector('.sr-only').textContent = T.close;
    ui.prev.title = T.prev; ui.prev.querySelector('.sr-only').textContent = T.prev;
    ui.next.title = T.next; ui.next.querySelector('.sr-only').textContent = T.next;
    ui.thumbs.setAttribute('aria-label', T.thumbs);
    ui.close.addEventListener('click', close);
    ui.prev.addEventListener('click', () => go(at - 1, -1));
    ui.next.addEventListener('click', () => go(at + 1, 1));
    ui.zoom.addEventListener('click', () => setZoom(!zoom.on));
    ui.thumbs.addEventListener('click', ev => { const b = ev.target.closest('.lkv-th'); if (b) go(+b.dataset.i, +b.dataset.i > at ? 1 : -1); });
    d.addEventListener('cancel', ev => { ev.preventDefault(); close(); });
    d.addEventListener('keydown', onKey);
    /* un clic sur le fond (hors image, boutons et légende) referme */
    d.addEventListener('click', ev => { if (dragged) { dragged = false; return; } if (ev.target === ui.frame || ev.target === ui.stage || ev.target === d || ev.target === ui.bg) close(); });
    ui.img.addEventListener('dblclick', ev => { ev.preventDefault(); setZoom(!zoom.on, ev.clientX, ev.clientY); });
    pointer();
    window.addEventListener('resize', () => { if (state === 'open') { setZoom(false, 0, 0, true); place(items[at]); } });
    doc.body.appendChild(d);
  }

  /* taille de l'image dans le cadre : entière, jamais rognée */
  function place(it) {
    const r = ui.frame.getBoundingClientRect();
    const W = Math.max(80, r.width), H = Math.max(80, r.height);
    const ratio = it.w && it.h ? it.w / it.h : 16 / 10;
    const w = Math.min(W, H * ratio), h = w / ratio;
    ui.img.style.width = Math.round(w) + 'px'; ui.img.style.height = Math.round(h) + 'px';
  }
  function load(it) {
    if (!it.big) it.big = new Promise((resolve, reject) => {
      const im = new Image(); im.decoding = 'async';
      im.onload = () => { if (!it.w || !it.h || Math.abs(it.w / it.h - im.naturalWidth / im.naturalHeight) > 0.01) { it.w = im.naturalWidth; it.h = im.naturalHeight; } it.nw = im.naturalWidth; (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(() => resolve(it)); };
      im.onerror = () => { it.big = null; reject(new Error('image')); };
      im.src = it.href;
    });
    return it.big;
  }
  function text(it) {
    ui.k.textContent = it.kicker || '';
    ui.t.textContent = it.title || '';
    ui.count.textContent = items.length > 1 ? pad(at + 1) + ' / ' + pad(items.length) : '';
    ui.orig.href = it.href;
    ui.img.alt = it.title || '';
    ui.live.textContent = (items.length > 1 ? T.count.replace('{n}', at + 1).replace('{total}', items.length) + ': ' : '') + (it.title || '');
    ui.prev.hidden = ui.next.hidden = items.length < 2;
    ui.thumbs.querySelectorAll('.lkv-th').forEach((b, i) => {
      b.setAttribute('aria-current', i === at ? 'true' : 'false');
      if (i === at && b.scrollIntoView) { const r = b.getBoundingClientRect(), p = ui.thumbs.getBoundingClientRect(); if (r.left < p.left || r.right > p.right) ui.thumbs.scrollLeft += r.left - p.left - (p.width - r.width) / 2; }
    });
  }
  /* affiche l'élément : la vignette déjà chargée sert d'attente, l'image d'origine la remplace dès qu'elle est prête */
  function show(it) {
    const t = ++token;
    text(it);
    place(it);
    ui.d.classList.remove('is-wait');
    if (it.placeholder) ui.img.src = it.placeholder;
    else { ui.img.removeAttribute('src'); ui.d.classList.add('is-wait'); }
    load(it).then(() => {
      if (t !== token || state === 'closed') return;
      place(it); ui.img.src = it.href; ui.d.classList.remove('is-wait');
    }, () => { if (t === token) ui.d.classList.remove('is-wait'); });
    /* voisines préchargées : la flèche répond tout de suite */
    if (items.length > 1) { load(items[(at + 1) % items.length]).catch(() => {}); load(items[(at - 1 + items.length) % items.length]).catch(() => {}); }
  }
  function thumbs() {
    ui.thumbs.textContent = '';
    if (items.length < 2 || items.length > 24) return;
    items.forEach((it, i) => {
      const b = doc.createElement('button'); b.type = 'button'; b.className = 'lkv-th'; b.dataset.i = i;
      b.setAttribute('aria-label', T.count.replace('{n}', i + 1).replace('{total}', items.length) + (it.title ? ': ' + it.title : ''));
      if (it.thumb) { const im = doc.createElement('img'); im.src = it.thumb; im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; b.appendChild(im); }
      ui.thumbs.appendChild(b);
    });
  }

  /* vignette dans la page encore visible à l'écran : point de départ et d'arrivée du mouvement */
  function rectOf(el) {
    if (!el || !el.isConnected) return null;
    const r = el.getBoundingClientRect();
    return r.width > 8 && r.height > 8 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth ? r : null;
  }
  /* de la vignette (recadrée par object-fit: cover) à l'image entière : déplacement, échelle et découpe */
  function morph(rect) {
    const f = ui.img.getBoundingClientRect();
    if (!f.width || !f.height) return null;
    const s = Math.max(rect.width / f.width, rect.height / f.height);
    const dx = rect.left + rect.width / 2 - (f.left + f.width / 2), dy = rect.top + rect.height / 2 - (f.top + f.height / 2);
    const ix = Math.max(0, (f.width - rect.width / s) / 2), iy = Math.max(0, (f.height - rect.height / s) / 2);
    const rad = 10 / s;
    return [
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + s + ')', clipPath: 'inset(' + iy + 'px ' + ix + 'px round ' + rad + 'px)' },
      { transform: 'none', clipPath: 'inset(0px 0px round 10px)' }
    ];
  }
  const fade = (el, from, to, ms, delay) => el.animate([from, to], { duration: ms, delay: delay || 0, easing: EASE, fill: 'both' });
  /* fin d'un groupe d'animations, avec un délai de garde : la visionneuse ne reste jamais bloquée entre deux états */
  const settled = (anims, ms) => Promise.race([Promise.all(anims.map(x => x.finished.catch(() => {}))), new Promise(r => setTimeout(r, ms))]);

  function open(a) {
    if (!a) return;
    if (!ui) build();
    if (state !== 'closed') return;
    const g = groupOf(a);
    items = g.links.map(itemOf); at = g.index; opener = a;
    const it = items[at];
    thumbs();
    state = 'opening';
    const gap = window.innerWidth - html.clientWidth;
    html.classList.add('lkv-lock'); if (gap > 0) html.style.paddingRight = gap + 'px';
    ui.d.showModal();
    ui.close.focus({ preventScroll: true });
    setZoom(false, 0, 0, true);
    show(it);
    const done = () => { if (state === 'opening') state = 'open'; };
    if (reduce()) {
      fade(ui.d, { opacity: 0 }, { opacity: 1 }, 160).finished.then(done, done);
      return;
    }
    const rect = rectOf(it.img), k = rect && morph(rect);
    const anims = [fade(ui.bg, { opacity: 0 }, { opacity: 1 }, 320),
      fade(ui.top, { opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }, 320, 120),
      fade(ui.bottom, { opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }, 340, 140),
      fade(ui.prev, { opacity: 0 }, { opacity: 1 }, 300, 160), fade(ui.next, { opacity: 0 }, { opacity: 1 }, 300, 160)];
    if (k) { if (it.img) it.img.style.visibility = 'hidden'; anims.push(ui.img.animate(k, { duration: 460, easing: 'cubic-bezier(.22,.9,.24,1)' })); }
    else anims.push(fade(ui.img, { opacity: 0, transform: 'scale(.94)' }, { opacity: 1, transform: 'none' }, 320));
    settled(anims, 1200).then(() => {
      anims.forEach(x => { try { x.cancel(); } catch (_) {} });
      if (it.img) it.img.style.visibility = '';
      done();
    });
  }

  function close() {
    if (state === 'closed' || state === 'closing') return;
    state = 'closing'; token++;
    const it = items[at];
    const finish = () => {
      ui.d.close(); html.classList.remove('lkv-lock'); html.style.paddingRight = '';
      ui.img.removeAttribute('src'); ui.d.classList.remove('is-wait', 'is-zoom', 'is-drag');
      ui.img.style.transform = ''; ui.img.style.opacity = '';
      if (it && it.img) it.img.style.visibility = '';
      state = 'closed';
      const back = opener && opener.isConnected ? opener : null; opener = null;
      if (back) { try { back.focus({ preventScroll: true }); } catch (_) {} }
    };
    if (reduce()) { fade(ui.d, { opacity: 1 }, { opacity: 0 }, 140).finished.then(() => { ui.d.getAnimations().forEach(x => x.cancel()); finish(); }, finish); return; }
    const zoomed = zoom.on; setZoom(false, 0, 0, true);
    const rect = !zoomed && it && it.a === opener ? rectOf(it.img) : null, k = rect && morph(rect);
    const anims = [fade(ui.bg, { opacity: 1 }, { opacity: 0 }, 300, 60),
      fade(ui.top, { opacity: 1 }, { opacity: 0 }, 160), fade(ui.bottom, { opacity: 1 }, { opacity: 0 }, 160),
      fade(ui.prev, { opacity: 1 }, { opacity: 0 }, 140), fade(ui.next, { opacity: 1 }, { opacity: 0 }, 140)];
    if (k) {
      if (it.img) it.img.style.visibility = 'hidden';
      anims.push(ui.img.animate(k.slice().reverse(), { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' }));
    } else {
      const cur = getComputedStyle(ui.img).transform;
      anims.push(ui.img.animate([{ opacity: 1, transform: cur === 'none' ? 'none' : cur }, { opacity: 0, transform: (cur === 'none' ? '' : cur + ' ') + 'scale(.94)' }], { duration: 220, easing: 'ease-in', fill: 'both' }));
    }
    settled(anims, 1000).then(() => { finish(); anims.forEach(x => { try { x.cancel(); } catch (_) {} }); });
  }

  function go(k, dir) {
    if (state !== 'open' || items.length < 2) return;
    k = (k + items.length) % items.length; if (k === at) return;
    const d = dir || (k > at ? 1 : -1);
    setZoom(false, 0, 0, true);
    const it = items[k];
    if (reduce()) { at = k; show(it); return; }
    state = 'moving';
    const from = getComputedStyle(ui.img).transform;
    const out = ui.img.animate([{ opacity: 1, transform: from === 'none' ? 'none' : from }, { opacity: 0, transform: 'translateX(' + (-d * 56) + 'px) scale(.97)' }], { duration: 160, easing: 'ease-in', fill: 'both' });
    settled([out], 500).then(() => {
      at = k; ui.img.style.transform = ''; show(it);
      out.cancel();
      const inn = ui.img.animate([{ opacity: 0, transform: 'translateX(' + (d * 56) + 'px) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: EASE });
      settled([inn], 700).then(() => { if (state === 'moving') state = 'open'; });
    });
  }

  /* zoom : double-clic, double tap ou bouton ; on déplace ensuite l'image en la faisant glisser */
  function bounds() {
    const f = ui.frame.getBoundingClientRect(), w = parseFloat(ui.img.style.width) || 0, h = parseFloat(ui.img.style.height) || 0;
    return { x: Math.max(0, (w * zoom.s - f.width) / 2), y: Math.max(0, (h * zoom.s - f.height) / 2) };
  }
  function applyZoom(animate) {
    const b = bounds(); zoom.x = Math.max(-b.x, Math.min(b.x, zoom.x)); zoom.y = Math.max(-b.y, Math.min(b.y, zoom.y));
    ui.img.style.transition = animate && !reduce() ? 'transform .28s cubic-bezier(.2,.8,.2,1)' : 'none';
    ui.img.style.transform = zoom.on ? 'translate(' + zoom.x + 'px,' + zoom.y + 'px) scale(' + zoom.s + ')' : '';
  }
  function setZoom(on, cx, cy, quiet) {
    if (!ui) return;
    const it = items[at];
    if (on && it) {
      const w = parseFloat(ui.img.style.width) || 1;
      zoom.s = Math.max(1.8, Math.min(3, (it.nw || it.w || w) / w));
      const r = ui.img.getBoundingClientRect();
      const px = typeof cx === 'number' && cx ? cx - (r.left + r.width / 2) : 0, py = typeof cy === 'number' && cy ? cy - (r.top + r.height / 2) : 0;
      zoom.x = -px * (zoom.s - 1); zoom.y = -py * (zoom.s - 1);
    } else { zoom.x = zoom.y = 0; zoom.s = 1; }
    zoom.on = !!on && !!it;
    ui.d.classList.toggle('is-zoom', zoom.on);
    ui.zoom.setAttribute('aria-pressed', zoom.on ? 'true' : 'false');
    const label = zoom.on ? T.zoomOut : T.zoomIn; ui.zoom.title = label; ui.zoom.querySelector('.sr-only').textContent = label;
    applyZoom(!quiet);
  }

  /* doigt ou souris : glisser sur le côté change d'image, vers le bas referme ; image agrandie : on la déplace */
  function pointer() {
    let p = null, lastTap = 0, lastX = 0, lastY = 0;
    ui.frame.addEventListener('pointerdown', ev => {
      if (state !== 'open' || (ev.pointerType === 'mouse' && ev.button !== 0) || (ev.target !== ui.img && !zoom.on)) return;
      dragged = false;
      p = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, t: performance.now(), dx: 0, dy: 0, mode: '', zx: zoom.x, zy: zoom.y };
    });
    ui.frame.addEventListener('pointermove', ev => {
      if (!p || ev.pointerId !== p.id) return;
      p.dx = ev.clientX - p.x; p.dy = ev.clientY - p.y;
      if (!p.mode) {
        if (Math.hypot(p.dx, p.dy) < 8) return;
        p.mode = zoom.on ? 'pan' : (Math.abs(p.dx) > Math.abs(p.dy) ? (items.length > 1 ? 'swipe' : 'none') : (p.dy > 0 ? 'down' : 'none'));
        ui.d.classList.add('is-drag');
        /* capture seulement une fois le geste reconnu : un simple clic garde sa cible (l'image ne referme pas) */
        try { ui.frame.setPointerCapture(ev.pointerId); } catch (_) {}
      }
      if (p.mode === 'pan') { zoom.x = p.zx + p.dx; zoom.y = p.zy + p.dy; applyZoom(false); }
      else if (p.mode === 'swipe') { ui.img.style.transition = 'none'; ui.img.style.transform = 'translateX(' + p.dx + 'px) rotate(' + (p.dx / 60) + 'deg)'; }
      else if (p.mode === 'down') { const k = Math.max(0, p.dy); ui.img.style.transition = 'none'; ui.img.style.transform = 'translateY(' + k + 'px) scale(' + Math.max(0.8, 1 - k / 1400) + ')'; ui.bg.style.opacity = String(Math.max(0.35, 1 - k / 420)); }
    });
    const end = ev => {
      if (!p || ev.pointerId !== p.id) return;
      const q = p; p = null; ui.d.classList.remove('is-drag');
      /* le clic qui suit un glissement ne referme pas la visionneuse */
      if (q.mode) { dragged = true; setTimeout(() => { dragged = false; }, 400); }
      const dt = Math.max(1, performance.now() - q.t), v = Math.abs(q.dx) / dt;
      if (q.mode === 'swipe' && (Math.abs(q.dx) > 70 || (v > 0.45 && Math.abs(q.dx) > 24))) { go(at + (q.dx < 0 ? 1 : -1), q.dx < 0 ? 1 : -1); return; }
      if (q.mode === 'down' && q.dy > 110) { ui.bg.style.opacity = ''; close(); return; }
      if (q.mode === 'swipe' || q.mode === 'down') {
        ui.bg.style.opacity = '';
        const from = ui.img.style.transform; ui.img.style.transform = '';
        if (!reduce() && from) ui.img.animate([{ transform: from }, { transform: 'none' }], { duration: 260, easing: EASE });
        return;
      }
      /* double tap (doigt) : zoom à l'endroit touché */
      if (!q.mode && ev.pointerType !== 'mouse' && ev.type === 'pointerup') {
        const now = performance.now();
        if (now - lastTap < 320 && Math.hypot(ev.clientX - lastX, ev.clientY - lastY) < 30) { lastTap = 0; setZoom(!zoom.on, ev.clientX, ev.clientY); }
        else { lastTap = now; lastX = ev.clientX; lastY = ev.clientY; }
      }
    };
    ui.frame.addEventListener('pointerup', end);
    ui.frame.addEventListener('pointercancel', end);
  }

  function onKey(ev) {
    if (state !== 'open' || ev.altKey || ev.ctrlKey || ev.metaKey) return;
    if (ev.key === 'ArrowRight') { ev.preventDefault(); go(at + 1, 1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(at - 1, -1); }
    else if (ev.key === 'Home') { ev.preventDefault(); go(0, -1); }
    else if (ev.key === 'End') { ev.preventDefault(); go(items.length - 1, 1); }
  }

  window.LKViewer = { open, close, isImageLink, state: () => state };
})();
