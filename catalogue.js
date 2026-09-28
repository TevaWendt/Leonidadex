/* Leonidakit — catalogue.js (v7.42, lot 5 ; v7.43, lot 6)
   Listes dépliables des catalogues (Consommables, Coiffures, Tatouages, Tenues et accessoires, Personnalisation des
   véhicules et des armes) : la liste complète est écrite dans la page à la génération (lisible sans script) ; ce module
   ajoute la recherche, les filtres par catégorie, groupe et statut, le tri, le compteur de lignes, et l'ouverture de la
   boîte quand l'adresse vise une ligne (nourriture.html#consommables-sprunk) ou l'ancre Accessoires.
   Lot 6 : filtre de compatibilité par l'adresse (personnalisations.html#perso-vehicules=sport,
   #perso-armes=pistolet ou #perso-armes=girardi-es9) : la boîte s'ouvre sur les postes qui s'appliquent à cette
   catégorie ou à cette arme (attribut data-compat des lignes, libellés dans data-cat-tags de la boîte).
   Le suivi « Je l'ai » est fait par suivi.js. Aucune animation : lisible avant tout. */
(function () {
  'use strict';
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’]/g, "'").toLowerCase().trim();
  const boxes = Array.from(document.querySelectorAll('details.cat-box[data-catalogue]'));
  if (!boxes.length) return;
  const nf = new Intl.NumberFormat('fr-FR');
  const controllers = new Map();

  function setup(box) {
    const tools = box.querySelector('[data-cat-tools]'), tbody = box.querySelector('tbody');
    if (!tools || !tbody) return null;
    const rows = Array.from(tbody.querySelectorAll('tr.cat-row'));
    rows.forEach((r, i) => { r.dataset.i = String(i); });
    const q = tools.querySelector('[data-cat-q]'), fCat = tools.querySelector('[data-cat-f="cat"]'), fSt = tools.querySelector('[data-cat-f="st"]'), sort = tools.querySelector('[data-cat-sort]');
    const count = tools.querySelector('[data-cat-count]'), empty = box.querySelector('[data-cat-empty]'), chips = Array.from(tools.querySelectorAll('[data-cat-group]'));
    const filterNote = box.querySelector('[data-cat-filter]'), filterLabel = box.querySelector('[data-cat-filter-label]');
    let tags = {}; try { tags = box.dataset.catTags ? JSON.parse(box.dataset.catTags) : {}; } catch (_) { tags = {}; }
    const state = { q: '', cat: '', st: '', group: '', tag: '', sort: 'statut' };
    let timer = 0;
    function apply() {
      const needle = fold(state.q);
      let shown = 0;
      rows.forEach(r => {
        const ok = (!needle || r.dataset.q.indexOf(needle) !== -1) && (!state.cat || r.dataset.cat === state.cat) && (!state.group || r.dataset.group === state.group) && (!state.st || r.dataset.st === state.st)
          && (!state.tag || (' ' + (r.dataset.compat || '') + ' ').indexOf(' ' + state.tag + ' ') !== -1);
        r.hidden = !ok; if (ok) shown++;
      });
      if (filterNote) { filterNote.hidden = !state.tag; if (filterLabel) filterLabel.textContent = state.tag ? (tags[state.tag] || state.tag) : ''; }
      const sorted = rows.slice().sort((a, b) => {
        if (state.sort === 'nom') return a.dataset.nom.localeCompare(b.dataset.nom, 'fr');
        if (state.sort === 'cat') return (Number(a.dataset.ci) - Number(b.dataset.ci)) || (Number(a.dataset.i) - Number(b.dataset.i));
        if (state.sort === 'prix') { const pa = 'prix' in a.dataset ? Number(a.dataset.prix) : Infinity, pb = 'prix' in b.dataset ? Number(b.dataset.prix) : Infinity; return (pa - pb) || (Number(a.dataset.i) - Number(b.dataset.i)); }
        return Number(a.dataset.i) - Number(b.dataset.i);
      });
      sorted.forEach(r => tbody.appendChild(r));
      if (count) count.textContent = shown === rows.length ? nf.format(rows.length) + ' lignes' : nf.format(shown) + ' ligne' + (shown > 1 ? 's' : '') + ' sur ' + nf.format(rows.length);
      if (empty) empty.hidden = shown > 0;
      chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.catGroup === state.group)));
      box.classList.toggle('is-filtered', !!(needle || state.cat || state.st || state.group || state.tag));
    }
    function reset() { state.q = ''; state.cat = ''; state.st = ''; state.group = ''; state.tag = ''; state.sort = 'statut'; if (q) q.value = ''; if (fCat) fCat.value = ''; if (fSt) fSt.value = ''; if (sort) sort.value = 'statut'; apply(); }
    if (q) q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { state.q = q.value; apply(); }, 80); });
    if (fCat) fCat.addEventListener('change', () => { state.cat = fCat.value; if (state.cat) state.group = ''; apply(); });
    if (fSt) fSt.addEventListener('change', () => { state.st = fSt.value; apply(); });
    if (sort) sort.addEventListener('change', () => { state.sort = sort.value; apply(); });
    chips.forEach(c => c.addEventListener('click', () => { state.group = state.group === c.dataset.catGroup ? '' : c.dataset.catGroup; if (state.group) { state.cat = ''; if (fCat) fCat.value = ''; } apply(); }));
    tools.addEventListener('reset', e => { e.preventDefault(); reset(); });
    tools.addEventListener('submit', e => e.preventDefault());
    box.querySelectorAll('[data-cat-reset]').forEach(b => b.addEventListener('click', reset));
    tools.hidden = false;
    apply();
    return { box, rows, state, apply, reset, tags, setGroup(g) { state.group = g; state.cat = ''; if (fCat) fCat.value = ''; apply(); }, setTag(t) { reset(); state.tag = t; apply(); } };
  }
  boxes.forEach(box => { const c = setup(box); if (c) controllers.set(box, c); });

  /* Adresse avec une ancre : une ligne (ouvre la boîte, retire les filtres, met la ligne en évidence), l'ancre Accessoires,
     ou un filtre de compatibilité (#<famille>=<catégorie ou arme>, lot 6). */
  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
    document.querySelectorAll('tr.cat-row.is-target').forEach(r => r.classList.remove('is-target'));
    const m = id.match(/^([a-z0-9-]+)=([a-z0-9-]+)$/);
    if (m) {
      const box = document.getElementById('box-' + m[1]), c = box && controllers.get(box);
      if (!c) return;
      if (c.tags[m[2]]) c.setTag(m[2]); else c.reset();
      box.open = true;
      requestAnimationFrame(() => { box.scrollIntoView({ block: 'start' }); });
      return;
    }
    const el = document.getElementById(id); if (!el) return;
    const box = el.closest('details.cat-box'); if (!box) return;
    const c = controllers.get(box);
    if (el.matches('tr.cat-row')) { if (c) c.reset(); box.open = true; el.classList.add('is-target'); requestAnimationFrame(() => { el.scrollIntoView({ block: 'center' }); }); return; }
    if (el.matches('[data-cat-group]')) { box.open = true; if (c) c.setGroup(el.dataset.catGroup); requestAnimationFrame(() => { el.scrollIntoView({ block: 'center' }); }); }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
})();
