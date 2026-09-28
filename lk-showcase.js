/* Leonidakit — lk-showcase.js (v7.44, lot 7)
   Séquence « effet Rockstar » de la page À propos : chaque carte .lk-show arrive en grand au défilement, son image
   officielle glisse et se dévoile, son titre se compose mot à mot, le texte suit, le lien arrive en dernier ; la carte
   se fige lisible, puis la suivante entre. Composant réutilisable : un conteneur [data-showcase] avec des .lk-show.
   - Lié au défilement (animation-timeline: view() dans style, informations.css) quand le navigateur le sait ; sinon un
     IntersectionObserver pose et retire is-in (réversible quand on remonte), garde-fou : tout visible après 1,5 s.
   - Mouvement réduit : rien ne bouge, tout est visible (informations.css + ce fichier ne posent rien).
   - Clavier : chaque carte est focusable ; le focus la révèle et la centre.
   Compteurs de la section « Le site en chiffres » (data-count) : montent à l'arrivée à l'écran, chiffres groupés à la
   française ; en mouvement réduit la valeur finale s'affiche directement.
   Aucun flou, aucune rotation, aucun transform sur le texte au survol : lisible avant tout. */
(function () {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const io = 'IntersectionObserver' in window;
  const scrollTimeline = !!(window.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  /* --- titres mot à mot (même principe que common.js, classes propres pour ne pas croiser ses transitions) --- */
  function splitWords(el) {
    if (!el || el.dataset.lkSw) return;
    let i = 0;
    Array.prototype.slice.call(el.childNodes).forEach(function (n) {
      if (n.nodeType !== 3 || !n.textContent.trim()) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
        const s = document.createElement('span'); s.className = 'lk-sw'; s.style.setProperty('--lk-i', Math.min(i++, 7)); s.textContent = part; frag.appendChild(s);
      });
      n.parentNode.replaceChild(frag, n);
    });
    el.dataset.lkSw = '1';
  }
  document.querySelectorAll('[data-showcase]').forEach(function (box) {
    const cards = Array.prototype.slice.call(box.querySelectorAll('.lk-show'));
    if (!cards.length) return;
    cards.forEach(function (c) { splitWords(c.querySelector('.lk-show-t')); });
    if (reduced) { box.classList.add('lk-showcase--still'); return; }
    box.classList.add(scrollTimeline ? 'lk-showcase--timeline' : 'lk-showcase--observer');
    if (!scrollTimeline) {
      if (io) {
        /* réversible : la carte perd is-in quand elle ressort par le bas (on remonte), la garde quand elle sort par le haut (déjà lue) */
        const obs = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) en.target.classList.add('is-in');
            else if (en.boundingClientRect.top > 0) en.target.classList.remove('is-in');
          });
        }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
        cards.forEach(function (c) { obs.observe(c); });
        setTimeout(function () { cards.forEach(function (c) { if (c.getBoundingClientRect().top < window.innerHeight) c.classList.add('is-in'); }); }, 1500);
        window.addEventListener('beforeprint', function () { cards.forEach(function (c) { c.classList.add('is-in'); }); });
      } else cards.forEach(function (c) { c.classList.add('is-in'); });
    }
    /* clavier : le focus révèle la carte et la place au centre de l'écran */
    cards.forEach(function (c) {
      c.addEventListener('focus', function () { c.classList.add('is-in'); c.classList.add('is-focus'); if (c.scrollIntoView) c.scrollIntoView({ block: 'center', behavior: 'smooth' }); });
      c.addEventListener('blur', function () { c.classList.remove('is-focus'); });
    });
  });
  /* --- compteurs --- */
  const nf = new Intl.NumberFormat('fr-FR');
  const counters = Array.prototype.slice.call(document.querySelectorAll('.fig-n[data-count][data-stat]'));
  if (!counters.length) return;
  const show = function (node, value) { node.textContent = nf.format(value).replace(/ | /g, ' '); };
  const run = function (node) {
    const end = parseInt(node.dataset.count, 10) || 0;
    if (reduced || !window.requestAnimationFrame || end < 10) { show(node, end); return; }
    const t0 = performance.now(), dur = 900;
    const step = function (t) {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      show(node, Math.round(end * e));
      if (p < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  };
  if (io && !reduced) {
    const co = new IntersectionObserver(function (entries) { entries.forEach(function (en) { if (!en.isIntersecting) return; run(en.target); co.unobserve(en.target); }); }, { threshold: 0.4 });
    counters.forEach(function (n) { show(n, 0); co.observe(n); });
    setTimeout(function () { counters.forEach(function (n) { if (n.textContent === '0' && parseInt(n.dataset.count, 10) > 0) run(n); co.unobserve(n); }); }, 4000);
  } else counters.forEach(function (n) { show(n, parseInt(n.dataset.count, 10) || 0); });
})();
