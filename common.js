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
  const main = document.getElementById('main');
  if (!main || document.querySelector('.lk-rails')) return;
  const fc = document.querySelector('.fcount') || main.querySelector('.vhero, .hero, .fhero, .lore-hero');
  const rails = document.createElement('div'); rails.className = 'lk-rails'; rails.setAttribute('aria-hidden', 'true');
  rails.innerHTML = '<span class="lk-rail lk-rail--l"></span><span class="lk-rail lk-rail--r"></span>';
  main.appendChild(rails);
  /* Les rails commencent sous le premier bloc pleine largeur (en-tête de page ou compte à rebours) et passent
     derrière tous les blocs pleine largeur suivants (bandeaux, compte à rebours, chiffres clés) : ils ne se
     superposent qu'aux marges des sections centrées. */
  function place() {
    const m = main.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    const kids = Array.from(main.children).filter(el => el !== rails && el.getBoundingClientRect().height >= 4);
    const wide = el => el.getBoundingClientRect().width >= vw - 2;
    let leadEnd = 0, lead = true;
    for (const el of kids) {
      if (!wide(el)) { lead = false; continue; }
      if (lead) leadEnd = el.getBoundingClientRect().bottom - m.top;
      const cs = getComputedStyle(el); if (cs.position === 'static') el.style.position = 'relative'; if (cs.zIndex === 'auto' || cs.zIndex === '0') el.style.zIndex = '1';
    }
    const hero = main.querySelector('.vhero, .hero, .fhero, .lore-hero, .lk-home-hero, .lk-calc-hero');
    let top = hero ? Math.max(0, hero.getBoundingClientRect().bottom - m.top) : 0;
    /* Le compte à rebours sert de repère seulement s'il fait partie du bloc pleine largeur d'ouverture (hubs). */
    if (fc && fc.classList.contains('fcount')) { const fb = fc.getBoundingClientRect().bottom - m.top; if (fb <= leadEnd + 2) top = Math.max(top, fb); }
    rails.style.top = top + 'px';
  }
  window.addEventListener('resize', place); window.addEventListener('load', place); place();
})();

/* Léo : amorçage isolé. Les données ne se chargent qu'à l'ouverture du panneau. */
(function(){'use strict';if(!document.querySelector('main')||document.getElementById('leo-style'))return;const base=(document.currentScript&&document.currentScript.src||'').replace(/[^/]*$/,'')||'/';const css=document.createElement('link');css.id='leo-style';css.rel='stylesheet';css.href=base+'leo.css?v=436b7c4c1eee';css.onload=()=>{const script=document.createElement('script');script.src=base+'leo-loader.js?v=436b7c4c1eee';document.head.append(script);};document.head.append(css);})();

/* Lot C (v7.32) : du mouvement sur toutes les pages. Les blocs de contenu apparaissent au défilement (par vagues,
   avec un léger décalage), les piles d'images s'ouvrent, les titres de section tirent leur trait, l'en-tête prend
   une ombre dès qu'on défile. Sans JavaScript ou avec « réduire les animations », tout est visible immédiatement. */
(function () {
  'use strict';
  const header = document.querySelector('header');
  if (header) {
    let queued = false;
    const onScroll = function () { if (queued) return; queued = true; requestAnimationFrame(function () { header.classList.toggle('is-scrolled', window.scrollY > 8); queued = false; }); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }
  const main = document.querySelector('main');
  if (!main || !('IntersectionObserver' in window)) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const calc = document.body.classList.contains('calculator-page');
  const TITLES = 'main section.shell>h2, main .d-section>h2, main .info-section>h2, main .lore-sec>h2, main .tools-sec>h2, main .counties-sec>h2, main .lk-explore>h2, main .t-chapter>h2';
  const BLOCKS = calc
    ? '.lk-stack, .lk-tool, .lk-outro, .calc-editorial>*, .lk-tool-guide>*:not(h2)'
    : '.lk-stack, .d-card, .info-card, .tool, .lk-her, .lk-feature, .t-chapter, .d-progress-group, .d-empty, .lk-photo-card, .lk-link, .lk-flip, .lk-outro, .col-card, .info-section>p, .info-section>.info-grid, .info-sources dl>div, .d-section>p, .d-section>.d-related, .d-sources>ul, .lore-texte, .d-global, .kit, .rare-card, .lk-entry-card, .faq details, .county, .fq, .t-intro, .t-figure, .t-steps, .t-mode-fields, .t-table-wrap';
  const skip = function (el) { return el.closest('[hidden], template, .reveal, .rise, .lore-stack, .leo-panel') || el.classList.contains('reveal') || el.classList.contains('rise'); };
  const targets = [];
  main.querySelectorAll(TITLES).forEach(function (h) { if (skip(h)) return; h.classList.add('lk-h2'); h.classList.add('lk-reveal'); targets.push(h); });
  main.querySelectorAll(BLOCKS).forEach(function (el) { if (skip(el) || el.classList.contains('lk-reveal')) return; el.classList.add('lk-reveal'); targets.push(el); });
  main.querySelectorAll('.lk-stack').forEach(function (el) { if (!el.classList.contains('lk-reveal')) { el.classList.add('lk-reveal'); targets.push(el); } });
  if (!targets.length) return;
  if (reduced) { targets.forEach(function (el) { el.classList.add('is-in'); }); return; }
  const io = new IntersectionObserver(function (entries) {
    let k = 0;
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.style.setProperty('--lk-delay', Math.min(k * 70, 420) + 'ms'); k++;
      el.classList.add('is-in'); io.unobserve(el);
    });
  }, { threshold: 0.06, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(function (el) { io.observe(el); });
  /* filet de sécurité : tout ce qui n'est pas encore apparu s'affiche après 3 s. */
  setTimeout(function () { targets.forEach(function (el) { if (!el.classList.contains('is-in')) { el.style.setProperty('--lk-delay', '0ms'); el.classList.add('is-in'); } }); }, 3000);
  /* impression : tout visible */
  window.addEventListener('beforeprint', function () { targets.forEach(function (el) { el.classList.add('is-in'); }); });
})();

/* v7.36 : Motion+ — encore plus de vie, toujours sobre. Les titres se composent mot à mot, les images se dévoilent d'un
   rideau (façon bande-annonce), les paragraphes se nettoient d'un flou, les cartes des grilles arrivent en cascade,
   les fonds des bandeaux glissent au défilement (parallaxe), une fine barre ambre suit la lecture, les cartes s'inclinent
   sous la souris, les boutons principaux reçoivent un reflet. Sans JavaScript ou avec « réduire les animations », tout est
   visible immédiatement, rien ne bouge. */
(function () {
  'use strict';
  const main = document.querySelector('main');
  if (!main) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const calc = document.body.classList.contains('calculator-page');
  const io = 'IntersectionObserver' in window;
  /* --- 1. titres mot à mot ------------------------------------------------------------------------------- */
  function splitWords(el) {
    if (!el || el.dataset.lkWords || el.querySelector('input,button,select,textarea,svg,img') || el.textContent.trim().length > 140) return;
    let i = 0;
    const walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (n) {
        if (n.nodeType === 3) {
          if (!n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
            const s = document.createElement('span'); s.className = 'lk-w'; s.style.setProperty('--lk-i', i++); s.textContent = part; frag.appendChild(s);
          });
          n.parentNode.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !/^(BR|SCRIPT|STYLE)$/.test(n.tagName) && !n.classList.contains('lk-w') && !n.classList.contains('w')) walk(n);
      });
    };
    walk(el);
    el.dataset.lkWords = '1';
    el.classList.add('lk-words');
  }
  /* --- 2. bandeaux : entrée en cascade au chargement --------------------------------------------------------- */
  const now = [];
  const HERO = '.page-head, .vhero-in, .fhero-in, .lore-hero, .info-hero, .t-hero, .lk-calc-hero-in, .lk-tool-guide>header';
  const HERO_ITEMS = 'h1, .fiche-cat, .vhero-eyebrow, .info-eyebrow, .calc-kicker, .lk-kicker, .lede, .info-lede, .d-intro-note, .lk-hero-meta, .c-hero-action, .d-actions, .fiche-liens, .lk-stack, figure, p, .lk-calc-hero-scene';
  main.querySelectorAll(HERO).forEach(function (hero) {
    if (hero.closest('.hero, .lore-stack')) return;
    const items = Array.prototype.filter.call(hero.querySelectorAll(HERO_ITEMS), function (el) {
      if (el.matches('.rise, .reveal, [hidden], .vhero-bg, .fhero-bg, .lk-rails') || el.closest('.rise, .reveal, figure figure, .lk-stack figure')) return false;
      const parentItem = el.parentElement && el.parentElement.closest(HERO_ITEMS);
      return !(parentItem && hero.contains(parentItem));
    });
    items.forEach(function (child, i) {
      child.classList.add('lk-hero-item'); child.style.setProperty('--lk-i', Math.min(i, 8));
      if (child.matches('h1')) { splitWords(child); now.push(child); }
    });
  });
  main.querySelectorAll('h1').forEach(function (h) { if (!h.dataset.lkWords && !h.closest('.hero') && !h.querySelector('.w')) { splitWords(h); now.push(h); } });
  const promise = main.querySelector('.lk-home-promise'); if (promise) { splitWords(promise); now.push(promise); }
  /* les mots partent de leur état invisible : la classe qui les fait monter est posée un rendu plus tard */
  const go = function () { now.forEach(function (el) { el.classList.add('lk-now'); }); };
  if (reduced || !window.requestAnimationFrame) go(); else window.requestAnimationFrame(function () { window.requestAnimationFrame(go); });
  if (reduced) return;
  /* --- 3. apparition au défilement, variantes selon la nature du bloc ---------------------------------------- */
  const GRID_CARDS = '.d-card, .info-card, .tool, .lk-feature, .kit, .rare-card, .lk-entry-card, .col-card, .lk-tool, .lk-photo-card, .county, .lore-card, .d-topic, .lk-her';
  const FIGURES = 'main figure';
  const TEXTS = '.lede, .info-lede, .lk-home-support, main .shell>p, main .d-section>p, main .info-section>p, .lore-texte>p, .t-intro>p, .calc-section-desc, .calc-card-desc';
  const ROWS = 'main table>tbody, main .shell>ul, main .shell>ol, .t-steps, .d-sources>ul, .info-grid, .lk-goals';
  const extra = [];
  const add = function (el, variant) { if (!el || el.closest('[hidden], template, .lore-stack, .leo-panel, .hero, header, footer, #calc-panels')) return; if (!el.classList.contains('lk-reveal')) { el.classList.add('lk-reveal'); extra.push(el); } if (variant) el.classList.add('lk-reveal--' + variant); };
  main.querySelectorAll(FIGURES).forEach(function (el) { if (el.closest('.lk-stack, figure figure, .lk-reveal--clip, .lk-hero-item, .d-card, .lore-card')) return; add(el, 'clip'); });
  main.querySelectorAll(TEXTS).forEach(function (el) { if (el.closest('.lk-reveal--clip') || el.classList.contains('lk-hero-item') || el.closest('.lk-hero-item')) return; add(el, 'blur'); });
  main.querySelectorAll(ROWS).forEach(function (el) { if (el.closest('.lk-reveal')) return; if (el.children.length > 1 && el.children.length <= 40) { add(el, 'rows'); Array.prototype.slice.call(el.children).forEach(function (c, i) { c.style.setProperty('--lk-i', i); }); } });
  main.querySelectorAll(GRID_CARDS).forEach(function (el) { el.classList.add('lk-reveal--zoom'); if (!el.classList.contains('lk-reveal')) add(el); });
  main.querySelectorAll('.lk-stack').forEach(function (el) { el.classList.add('lk-reveal--right'); el.querySelectorAll('img').forEach(function (img) { img.classList.add('lk-kb'); }); });
  main.querySelectorAll('.lore-texte, .calc-editorial>div:first-child').forEach(function (el) { el.classList.add('lk-reveal--left'); });
  main.querySelectorAll('.lk-h2').forEach(function (h) { splitWords(h); });
  /* cascade dans les grilles : le rang parmi les frères décide du décalage */
  main.querySelectorAll('.lk-reveal').forEach(function (el) {
    const parent = el.parentElement; if (!parent) return;
    const siblings = Array.prototype.filter.call(parent.children, function (c) { return c.classList.contains('lk-reveal'); });
    if (siblings.length > 1) { const idx = siblings.indexOf(el); el.style.setProperty('--lk-delay', Math.min(idx * 80, 560) + 'ms'); el.dataset.lkStagger = '1'; }
  });
  if (io && extra.length) {
    const obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (!en.isIntersecting) return; en.target.classList.add('is-in'); obs.unobserve(en.target); });
    }, { threshold: 0.05, rootMargin: '0px 0px -5% 0px' });
    extra.forEach(function (el) { obs.observe(el); });
    setTimeout(function () { extra.forEach(function (el) { el.classList.add('is-in'); }); }, 3500);
    window.addEventListener('beforeprint', function () { extra.forEach(function (el) { el.classList.add('is-in'); }); });
  } else extra.forEach(function (el) { el.classList.add('is-in'); });
  /* le calculateur : ses cartes sont créées par calculateurs.js ; elles apparaissent à leur première venue seulement */
  if (calc && io) {
    const panels = document.getElementById('calc-panels'), seen = {};
    if (panels) {
      const reveal = function () {
        panels.querySelectorAll('.calc-panel').forEach(function (panel) {
          const cards = panel.querySelectorAll(':scope>.calc-grid>.calc-card, :scope>.calc-card, :scope>div>.calc-card');
          cards.forEach(function (card, i) {
            if (card.classList.contains('lk-reveal')) return;
            card.classList.add('lk-reveal'); card.classList.add('lk-reveal--zoom');
            if (seen[panel.id]) { card.style.setProperty('--lk-delay', '0ms'); card.classList.add('is-in'); return; }
            card.style.setProperty('--lk-delay', Math.min(i * 90, 360) + 'ms');
            const o = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (!en.isIntersecting) return; en.target.classList.add('is-in'); seen[panel.id] = true; o.disconnect(); }); }, { threshold: 0.02 });
            o.observe(card);
            setTimeout(function () { if (!card.classList.contains('is-in')) { card.style.setProperty('--lk-delay', '0ms'); card.classList.add('is-in'); } }, 4000);
          });
        });
      };
      new MutationObserver(function () { window.requestAnimationFrame(reveal); }).observe(panels, { childList: true });
      reveal();
    }
  }
  /* --- 4. défilement : barre de lecture et parallaxe des bandeaux -------------------------------------------- */
  const bar = document.createElement('div'); bar.className = 'lk-progress'; bar.setAttribute('aria-hidden', 'true'); bar.innerHTML = '<i></i>'; document.body.appendChild(bar);
  const fill = bar.firstChild;
  const parallax = Array.prototype.slice.call(document.querySelectorAll('.calc-hero-image, .vhero-bg, .fhero-bg, .info-hero>img, .t-hero img, .lk-calc-hero-scene img'));
  parallax.forEach(function (el) { el.classList.add('lk-parallax'); });
  const coarse = window.matchMedia('(pointer:coarse)').matches;
  let queued = false;
  const frame = function () {
    queued = false;
    const doc = document.documentElement, max = Math.max(1, doc.scrollHeight - window.innerHeight), p = Math.min(1, Math.max(0, window.scrollY / max));
    fill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (coarse) return;
    const vh = window.innerHeight;
    parallax.forEach(function (el) {
      const box = (el.parentElement || el).getBoundingClientRect();
      if (box.bottom < -80 || box.top > vh + 80) return;
      const shift = (box.top + box.height / 2 - vh / 2) * -0.14;
      el.style.transform = 'translate3d(0,' + shift.toFixed(1) + 'px,0) scale(1.12)';
    });
  };
  const onScroll = function () { if (queued) return; queued = true; window.requestAnimationFrame(frame); };
  window.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onScroll, { passive: true }); onScroll();
  /* --- 5. survol : inclinaison légère des cartes, reflet sur les boutons principaux --------------------------- */
  const CTA = '.lk-cta, .calc-primary, .calc-button.primary, .lk-entry-button, .lk-home-discover, .info-primary, .t-button';
  document.querySelectorAll(CTA).forEach(function (el) { el.classList.add('lk-shine'); });
  if (window.matchMedia('(hover:hover) and (pointer:fine)').matches) {
    const TILT = '.lk-feature, .d-card, .info-card, .tool, .kit, .rare-card, .lk-entry-card, .lk-tool, .col-card, .b-phase>div, .b-alt';
    let active = null;
    document.addEventListener('pointerenter', function (ev) {
      const t = ev.target; if (!t || !t.closest) return; const card = t.closest(TILT); if (!card || card === active) return;
      active = card; card.classList.add('lk-tilt'); card.style.transitionDuration = '.18s';
    }, true);
    document.addEventListener('pointermove', function (ev) {
      if (!active || !active.contains(ev.target)) return;
      const r = active.getBoundingClientRect(); if (!r.width || !r.height) return;
      const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
      active.style.transform = 'perspective(900px) rotateX(' + (-y * 5).toFixed(2) + 'deg) rotateY(' + (x * 6).toFixed(2) + 'deg) translate(-3px,-3px)';
    });
    document.addEventListener('pointerleave', function (ev) {
      const t = ev.target; if (!active || !t || t !== active) return;
      active.style.transform = ''; active.style.transitionDuration = ''; active.classList.remove('lk-tilt'); active = null;
    }, true);
  }
})();
