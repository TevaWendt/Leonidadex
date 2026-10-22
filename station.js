/* Généré depuis outils/sources/station.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  if (typeof document === 'undefined' || !window.LKJeux || !window.LKJeux.partie) return;
  const doc = document, J = window.LKJeux;
  const game = doc.querySelector('[data-lkj-game="station"]'); if (!game) return;
  const card = game.querySelector('[data-st-card]'), needle = game.querySelector('[data-st-needle]'), info = game.querySelector('[data-st-info]'), srcBox = game.querySelector('[data-st-src]');
  const opts = Array.from(game.querySelectorAll('[data-st-opt]'));
  const data = doc.getElementById('st-data');
  if (!card || !opts.length || !data || !('content' in data)) return;
  const NAME = Object.fromEntries(opts.map(b => [b.getAttribute('data-st-opt'), ((b.querySelector('.st-opt-t') || b).textContent || '').trim()]));
  const IDX = Object.fromEntries(opts.map((b, i) => [b.getAttribute('data-st-opt'), i]));
  let api = null, cur = null;
  const node = id => api.byId[id].node;
  const station = id => node(id).getAttribute('data-g');
  const clueText = id => Array.from(node(id).querySelectorAll('.st-k, .st-v')).map(n => n.textContent.replace(/\s+/g, ' ').trim()).join(' : ');
  const setNeedle = (k, on) => { if (!needle) return; needle.style.setProperty('--x', ((k + 0.5) / opts.length * 100) + '%'); needle.classList.toggle('is-on', !!on); };
  function show(id, ctx) {
    cur = id;
    const src = node(id), box = doc.createElement('div');
    box.className = 'st-clue';
    for (const n of src.children) box.appendChild(n.cloneNode(true));
    const old = card.querySelector('.st-clue'), verdict = card.querySelector('[data-lkj-verdict]');
    if (old) old.remove();
    card.insertBefore(box, verdict);
    if (ctx.anim) { card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); }
    opts.forEach(b => { b.disabled = false; b.classList.remove('is-right', 'is-wrong', 'is-off'); const sr = b.querySelector('.st-opt-sr'); if (sr) sr.textContent = ''; });
    setNeedle((opts.length - 1) / 2, false);
    if (info) info.textContent = ''; if (srcBox) srcBox.textContent = '';
  }
  function choose(r) {
    if (!cur || api.answered() || !NAME[r]) return;
    api.answer(r, r === station(cur));
  }
  function reveal(id, choice, ok) {
    const f = api.f, right = station(id);
    opts.forEach(b => {
      const r = b.getAttribute('data-st-opt'), sr = b.querySelector('.st-opt-sr');
      b.disabled = true; b.classList.add(r === right ? 'is-right' : r === choice ? 'is-wrong' : 'is-off');
      if (sr) sr.textContent = r === right ? ', ' + f('st-sr-bonne') : r === choice ? ', ' + f('st-sr-ta') : '';
    });
    setNeedle(IDX[right], true);
    const s = data.content.querySelector('[data-st-station="' + right + '"]');
    if (info) { info.textContent = ''; if (s) for (const n of s.children) info.appendChild(n.cloneNode(true)); info.style.setProperty('--c', (opts[IDX[right]].style.getPropertyValue('--c') || '').trim()); }
    const so = data.content.querySelector('[data-st-src="' + node(id).getAttribute('data-src') + '"]');
    if (srcBox) {
      srcBox.textContent = '';
      if (so) {
        const c = so.cloneNode(true), d = c.querySelector('[data-st-date]');
        if (d) d.textContent = api.dateText(so.getAttribute('data-iso'));
        while (c.firstChild) srcBox.appendChild(c.firstChild);
      }
    }
    const fiche = s ? s.getAttribute('data-href') : null;
    return { text: ok ? f('g-juste', { station: NAME[right] }) : f('g-rate', { station: NAME[right], choix: NAME[choice] || '' }), href: fiche, link: f('st-fiche', { station: NAME[right] }) };
  }
  function row(id, choice, ok) {
    const right = station(id), s = data.content.querySelector('[data-st-station="' + right + '"]');
    return { title: NAME[right], no: true, href: s ? s.getAttribute('data-href') : '#', note: clueText(id), choice: NAME[choice] || '' };
  }
  function free(n) { return J.shuffle(api.pool.map(x => x.id), Math.random).slice(0, n); }
  const focus = () => { const b = opts.find(x => !x.disabled); if (b) b.focus({ preventScroll: true }); };
  opts.forEach(b => b.addEventListener('click', () => choose(b.getAttribute('data-st-opt'))));
  api = J.partie({ id: 'station', q0: 0, init: a => { api = a; }, show, reset: () => {}, reveal, row, free, focus });
})();
