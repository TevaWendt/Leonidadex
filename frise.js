/* Généré depuis outils/sources/frise.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.LKJeux || !window.LKJeux.partie) return;
  const doc = document, J = window.LKJeux;
  const game = doc.querySelector('[data-lkj-game="frise"]'); if (!game) return;
  const card = game.querySelector('[data-fr-card]'), list = game.querySelector('[data-fr-list]'), srcBox = game.querySelector('[data-fr-src]');
  if (!card || !list) return;
  const lang = (doc.documentElement.lang || 'fr').slice(0, 2);
  let shortf = null; try { shortf = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }); } catch (_) {  }
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
  const still = () => reduced.matches || typeof Element.prototype.animate !== 'function';
  const ici = (game.querySelector('[data-fr-ici]') || {}).textContent || '';
  let api = null, frise = [], cur = null;
  const node = id => api.byId[id].node;
  const iso = id => node(id).getAttribute('data-iso');
  const title = id => ((node(id).querySelector('.fr-ev-t') || {}).textContent || '').replace(/\s+/g, ' ').trim();
  const shortDate = id => (shortf ? shortf.format(new Date(iso(id) + 'T12:00:00Z')) : iso(id));
  const sorted = () => frise.slice().sort((a, b) => (iso(a.id) < iso(b.id) ? -1 : 1));
  const rightGap = (id, among) => among.filter(x => iso(x.id) < iso(id)).length;
  function show(id, ctx) {
    cur = id;
    const src = node(id), box = doc.createElement('div'), img = src.querySelector('img');
    box.className = 'fr-ev' + (img ? '' : ' fr-ev--plain');
    if (img) {
      const fig = doc.createElement('figure'), copy = img.cloneNode(false);
      fig.className = 'fr-ev-fig'; copy.setAttribute('decoding', 'async'); if (ctx.first) copy.setAttribute('fetchpriority', 'high'); else copy.setAttribute('loading', 'eager');
      fig.appendChild(copy); box.appendChild(fig);
    } else {
      const ico = src.querySelector('.fr-ev-ico'); if (ico) box.appendChild(ico.cloneNode(true));
    }
    const body = doc.createElement('div'); body.className = 'fr-ev-b';
    for (const sel of ['.fr-ev-t', '.fr-ev-x']) { const n = src.querySelector(sel); if (n) body.appendChild(n.cloneNode(true)); }
    box.appendChild(body);
    const old = card.querySelector('.fr-ev'), verdict = card.querySelector('[data-lkj-verdict]');
    if (old) old.remove();
    card.insertBefore(box, verdict);
    if (ctx.anim && window.LKMotion && window.LKMotion.enter) { card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); }
    if (srcBox) srcBox.textContent = '';
    build(true);
  }
  function build(withGaps, fresh, ghost) {
    const before = new Map();
    if (fresh && !still()) list.querySelectorAll('[data-fr-id]').forEach(li => before.set(li.getAttribute('data-fr-id'), li.getBoundingClientRect().top));
    list.textContent = '';
    const items = sorted(), f = api.f;
    const gap = (i) => {
      const li = doc.createElement('li'); li.className = 'fr-gap';
      const b = doc.createElement('button'); b.type = 'button'; b.className = 'fr-gap-b'; b.setAttribute('data-fr-gap', String(i));
      const a = items[i - 1], c = items[i];
      b.setAttribute('aria-label', !a ? f('fr-avant', { a: title(c.id) }) : !c ? f('fr-apres', { a: title(a.id) }) : f('fr-entre', { a: title(a.id), b: title(c.id) }));
      const t = doc.createElement('span'); t.className = 'fr-gap-t'; t.setAttribute('aria-hidden', 'true'); t.textContent = ici;
      b.appendChild(t); li.appendChild(b); return li;
    };
    const olds = items.filter(x => x.id !== fresh), ghostBefore = ghost === undefined || ghost === null ? null : olds[ghost] ? olds[ghost].id : '';
    const ghostLi = () => { const li = doc.createElement('li'); li.className = 'fr-ghost'; li.setAttribute('aria-hidden', 'true'); li.textContent = f('fr-ta-place'); return li; };
    items.forEach((x, i) => {
      if (withGaps) list.appendChild(gap(i));
      if (ghostBefore === x.id) list.appendChild(ghostLi());
      const li = doc.createElement('li');
      li.className = 'fr-item' + (x.mark === null ? ' is-base' : x.mark ? ' is-ok' : ' is-ko') + (x.id === fresh ? ' is-new' : '');
      li.setAttribute('data-fr-id', x.id);
      const d = doc.createElement('time'); d.className = 'fr-item-d'; d.setAttribute('datetime', iso(x.id)); d.textContent = shortDate(x.id);
      const t = doc.createElement('a'); t.className = 'fr-item-t'; t.href = node(x.id).getAttribute('data-href'); t.textContent = title(x.id);
      li.append(d, t);
      if (x.mark !== null) { const m = doc.createElement('span'); m.className = 'fr-item-m'; m.setAttribute('aria-hidden', 'true'); m.textContent = x.mark ? '✓' : '✗'; li.appendChild(m); }
      else { const k = doc.createElement('span'); k.className = 'fr-item-k'; k.textContent = (game.querySelector('[data-fr-depart]') || {}).textContent || ''; li.appendChild(k); }
      list.appendChild(li);
    });
    if (withGaps) list.appendChild(gap(items.length));
    if (ghostBefore === '') list.appendChild(ghostLi());
    if (fresh && !still()) {
      list.querySelectorAll('[data-fr-id]').forEach(li => {
        const id = li.getAttribute('data-fr-id'), top = li.getBoundingClientRect().top;
        if (id === fresh) li.animate([{ opacity: 0, transform: 'translate3d(-14px,0,0) scale(.97)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.16,1,.3,1)', delay: 90, fill: 'backwards' });
        else if (before.has(id) && Math.abs(before.get(id) - top) > 1) li.animate([{ transform: 'translate3d(0,' + (before.get(id) - top) + 'px,0)' }, { transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.2,.7,.25,1)' });
      });
    }
  }
  function reset(ctx) {
    frise = ctx.base.map(id => ({ id, mark: null })).concat(ctx.placed.map((id, i) => ({ id, mark: ctx.marks[i] ? 1 : 0 })));
    build(false);
  }
  function choose(i) {
    if (!cur || api.answered()) return;
    const c = rightGap(cur, frise), ok = i === c;
    const id = cur;
    if (!api.answer(i, ok)) return;
    frise.push({ id, mark: ok ? 1 : 0 });
    build(false, id, ok ? null : i);
  }
  function reveal(id, choice, ok) {
    const f = api.f, date = api.dateText(iso(id)), src = node(id).querySelector('.fr-ev-src');
    if (srcBox) { srcBox.textContent = ''; if (src) srcBox.appendChild(src.cloneNode(true)); }
    return { text: ok ? f('g-juste', { date }) : f('g-rate', { date }), href: node(id).getAttribute('data-href'), link: f('fr-lien') };
  }
  function row(id, choice, ok, i, ids) {
    const f = api.f, c = rightGap(id, ids.slice(0, api.Q0 + i).map(x => ({ id: x })));
    return { title: title(id), href: node(id).getAttribute('data-href'), note: api.dateText(iso(id)), choice: choice < c ? f('fr-trop-tot') : f('fr-trop-tard') };
  }
  function free(n) {
    const ids = J.shuffle(api.pool.slice(), Math.random), out = [], days = new Set();
    for (const x of ids) { if (days.has(x.g)) continue; days.add(x.g); out.push(x.id); if (out.length === n) break; }
    return out;
  }
  const focus = () => { const b = list.querySelector('.fr-gap-b'); if (b) b.focus({ preventScroll: true }); };
  list.addEventListener('click', ev => { const b = ev.target.closest('[data-fr-gap]'); if (b && list.contains(b)) choose(parseInt(b.getAttribute('data-fr-gap'), 10)); });
  api = J.partie({ id: 'frise', q0: 1, init: a => { api = a; }, show, reset, reveal, row, free, focus });
})();
