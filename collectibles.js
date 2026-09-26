/* Progressive enhancement: catalogue HTML remains useful without JavaScript. */
(function () {
  'use strict';
  const core = window.LKCollectibles;
  if (!core || !Array.isArray(window.LK_COLLECTIBLES?.items)) return;
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const norm = value => String(value ?? '').toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’‘]/g, "'").replace(/[\u00a0\u202f]/g, ' ').trim();
  const data = window.LK_COLLECTIBLES;
  const items = data.items.filter(item => item && item.published !== false && item.status !== 'placeholder' && core.validId(item.id));
  const categories = new Map((data.categories || []).map(category => [category.id, category.name]));
  const statusLabels = {confirmed: 'Confirmé', established: 'Fortement établi', unconfirmed: 'Non confirmé'};
  const categoryName = item => categories.get(item.category) || item.category || 'Catégorie à préciser';
  const fields = ['category', 'region', 'status', 'progress', 'subcategory', 'zone', 'difficulty', 'availability', 'reward'];
  const filterLabels = {q: 'Recherche', category: 'Catégorie', region: 'Région', status: 'Statut', progress: 'Collection', subcategory: 'Sous-catégorie', zone: 'Zone', difficulty: 'Difficulté', availability: 'Disponibilité', reward: 'Récompense'};
  const progressLabels = {missing: 'À trouver', found: 'Trouvés', favorites: 'Favoris', notes: 'Avec une note'};
  const sortModes = ['name', 'updated', 'category', 'region', 'order', 'difficulty'];
  const PREF_KEY = 'lk_collectibles_prefs_v1';
  let prefs = {spoilers: false, view: 'grid'};
  try { const saved = JSON.parse(localStorage.getItem(PREF_KEY) || 'null'); if (saved && typeof saved === 'object') prefs = {spoilers: saved.spoilers === true, view: saved.view === 'list' ? 'list' : 'grid'}; } catch (_) { /* Optional display preferences must never block reading. */ }
  const defaults = {q: '', sort: 'name', view: prefs.view, page: 1};
  fields.forEach(key => { defaults[key] = ''; });
  let filters = {...defaults};
  const results = $('collectibles-results');
  const viewSubscribers = new Set();
  let state = core.getState(), searchTimer;
  const PAGE_SIZE = 12;
  const searchIndex = new Map(items.map(item => [item.id, norm([item.name, categoryName(item), item.subcategory, item.region, item.zone, item.place, item.summary, item.description, ...(Array.isArray(item.keywords) ? item.keywords : [])].filter(Boolean).join(' '))]));
  const setText = (id, value) => { if ($(id)) $(id).textContent = value; };
  function feedback(message) {
    const warning = core.getStorageStatus().message;
    const text = message + (warning && !message.includes(warning) ? ' ' + warning : '');
    document.querySelectorAll('[data-col-feedback]').forEach(node => { node.textContent = text; });
  }
  function savePrefs() {
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }
    catch (_) { feedback('Cette préférence est appliquée pour cet onglet ; le navigateur ne permet pas sa sauvegarde.'); }
  }
  function readParams(params) {
    filters = {...defaults, view: params.get('view') === 'list' ? 'list' : params.get('view') === 'grid' ? 'grid' : prefs.view};
    filters.q = (params.get('q') || '').slice(0, 200);
    fields.forEach(key => { filters[key] = (params.get(key) || '').slice(0, 200); });
    if (!Object.hasOwn(progressLabels, filters.progress)) filters.progress = '';
    if (!Object.hasOwn(statusLabels, filters.status)) filters.status = '';
    filters.sort = sortModes.includes(params.get('sort')) ? params.get('sort') : 'name';
    filters.page = Math.max(1, Math.min(100000, parseInt(params.get('page'), 10) || 1));
  }
  function readURL() { readParams(new URLSearchParams(location.search)); }
  function writeURL() {
    const url = new URL(location.href);
    [...fields, 'q', 'sort', 'view', 'page'].forEach(key => {
      url.searchParams.delete(key);
      const value = filters[key];
      if (value && !(key === 'sort' && value === 'name') && !(key === 'view' && value === 'grid') && !(key === 'page' && value === 1)) url.searchParams.set(key, value);
    });
    try { history.replaceState(null, '', url.pathname + url.search + url.hash); } catch (_) { /* file: previews may disallow history mutation. */ }
  }
  function matches(item, omit) {
    if (filters.q && !norm(filters.q).split(/\s+/).every(word => searchIndex.get(item.id).includes(word))) return false;
    for (const field of fields) {
      if (field === omit || !filters[field]) continue;
      if (field === 'progress') {
        if (filters.progress === 'found' && !(core.isTrackable(item) && state.found[item.id])) return false;
        if (filters.progress === 'missing' && !(core.isTrackable(item) && !state.found[item.id])) return false;
        if (filters.progress === 'favorites' && !state.favorites[item.id]) return false;
        if (filters.progress === 'notes' && !state.notes[item.id]) return false;
      } else if (String(item[field] ?? '') !== filters[field]) return false;
    }
    return true;
  }
  function updateFacets() {
    for (const field of fields.filter(field => field !== 'progress')) {
      const select = $('col-' + field);
      if (!select) continue;
      const values = new Map();
      items.filter(item => matches(item, field)).forEach(item => { if (item[field]) values.set(String(item[field]), (values.get(String(item[field])) || 0) + 1); });
      const selected = filters[field];
      if (selected && !values.has(selected)) values.set(selected, 0);
      const label = value => field === 'category' ? categories.get(value) || value : field === 'status' ? statusLabels[value] || value : value;
      const placeholder = field === 'category' ? 'Toutes les catégories' : field === 'region' ? 'Toutes les régions' : field === 'status' ? 'Tous les statuts' : 'Toutes';
      select.innerHTML = '<option value="">' + placeholder + '</option>' + [...values].sort((a,b) => label(a[0]).localeCompare(label(b[0]), 'fr')).map(([value, count]) => '<option value="' + esc(value) + '">' + esc(label(value)) + ' (' + count + ')</option>').join('');
      select.value = selected;
      select.disabled = values.size === 0;
      if (['category', 'region', 'status'].includes(field)) select.closest('label').hidden = !selected && !items.some(item => !!item[field]);
    }
    let extraVisible = false;
    ['subcategory', 'zone', 'difficulty', 'availability', 'reward'].forEach(field => {
      const wrapper = document.querySelector('[data-col-filter="' + field + '"]');
      if (!wrapper) return;
      const useful = !!filters[field] || items.some(item => !!item[field]);
      wrapper.hidden = !useful;
      extraVisible = extraVisible || useful;
    });
    if ($('col-extra-filters')) $('col-extra-filters').hidden = !extraVisible;
    if (['subcategory', 'zone', 'difficulty', 'availability', 'reward'].some(field => filters[field]) && $('col-extra-filters')) $('col-extra-filters').open = true;
  }
  function syncControls() {
    if ($('col-search')) $('col-search').value = filters.q;
    [...fields, 'sort'].forEach(field => { if ($('col-' + field)) $('col-' + field).value = filters[field]; });
    document.querySelectorAll('[data-col-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.colView === filters.view)));
    document.querySelectorAll('#col-spoilers,[data-col-spoilers-toggle]').forEach(input => { input.checked = prefs.spoilers; });
  }
  function updateActions() {
    document.querySelectorAll('[data-col-found]').forEach(button => {
      const item = core.getItem(button.dataset.colFound), found = !!state.found[item?.id];
      button.disabled = !core.isTrackable(item);
      button.setAttribute('aria-pressed', String(found && core.isTrackable(item)));
      const label = button.querySelector('[data-col-label]') || button;
      label.textContent = !core.isTrackable(item) ? 'Suivi indisponible' : found ? '✓ Trouvé' : 'Marquer trouvé';
      button.setAttribute('aria-label', (found ? 'Marquer non trouvé : ' : 'Marquer trouvé : ') + (item?.name || 'collectible'));
    });
    document.querySelectorAll('[data-col-favorite]').forEach(button => {
      const favorite = !!state.favorites[button.dataset.colFavorite], item = core.getItem(button.dataset.colFavorite);
      button.setAttribute('aria-pressed', String(favorite));
      const label = button.querySelector('[data-col-label]') || button;
      label.textContent = favorite ? '★ Favori' : '☆ Favori';
      button.setAttribute('aria-label', (favorite ? 'Retirer des favoris : ' : 'Ajouter aux favoris : ') + (item?.name || 'collectible'));
    });
    document.querySelectorAll('[data-col-note]').forEach(input => { if (input !== document.activeElement) input.value = state.notes[input.dataset.colNote] || ''; });
    const storage = core.getStorageStatus();
    if ($('col-storage-warning')) { $('col-storage-warning').hidden = !storage.message; $('col-storage-warning').textContent = storage.message; }
    else if (storage.message) feedback(storage.message);
  }
  function updateProgress() {
    const trackable = items.filter(core.isTrackable), found = trackable.filter(item => state.found[item.id]).length;
    const percent = trackable.length ? Math.round(found / trackable.length * 100) : null;
    setText('col-documented', items.length);
    setText('col-confirmed', items.filter(item => item.status === 'confirmed').length);
    setText('col-located', items.filter(item => core.mapUrl(item)).length);
    setText('col-found-count', found);
    setText('col-trackable-label', trackable.length ? '/ ' + trackable.length + ' trouvé' + (trackable.length > 1 ? 's' : '') : 'objet suivi');
    setText('col-percent', percent === null ? '—' : percent + ' %');
    if ($('col-progress-fill')) $('col-progress-fill').style.width = (percent || 0) + '%';
    if ($('col-progress-meter')) {
      $('col-progress-meter').setAttribute('aria-valuenow', percent || 0);
      $('col-progress-meter').setAttribute('aria-valuetext', percent === null ? 'Progression indisponible : aucun collectible suivi' : found + ' sur ' + trackable.length + ' fiches suivies, ' + percent + ' %');
    }
    setText('col-progress-caption', trackable.length ? 'Progression sur les fiches éligibles de ce catalogue. Ce pourcentage ne représente pas la complétion totale du jeu.' : 'Le suivi commencera avec les premières fiches éligibles. Le total du jeu est inconnu.');
    setText('col-favorite-count', items.filter(item => state.favorites[item.id]).length);
    setText('col-note-count', items.filter(item => state.notes[item.id]).length);
    if ($('col-breakdowns')) {
      $('col-breakdowns').hidden = !trackable.length;
      $('col-breakdowns').innerHTML = ['category', 'region'].map(field => {
        const groups = new Map();
        trackable.forEach(item => { const value = item[field]; if (!value) return; if (!groups.has(value)) groups.set(value, []); groups.get(value).push(item); });
        if (!groups.size) return '';
        return '<h3>Par ' + (field === 'category' ? 'catégorie' : 'région') + '</h3><ul>' + [...groups].map(([value, group]) => '<li><button type="button" data-col-group="' + field + '" data-col-value="' + esc(value) + '">' + esc(field === 'category' ? categories.get(value) || value : value) + '</button><b>' + group.filter(item => state.found[item.id]).length + ' / ' + group.length + '</b></li>').join('') + '</ul>';
      }).join('');
    }
  }
  function safeImage(src) {
    if (typeof src !== 'string') return null;
    if (/^\/(?!\/)/.test(src) || /^(?:img|images)\//.test(src)) return src;
    try { const url = new URL(src); return url.protocol === 'https:' && !url.username && !url.password ? url.href : null; } catch (_) { return null; }
  }
  function card(item) {
    const image = safeImage(item.image?.src), url = core.itemUrl(item), map = core.mapUrl(item), noteId = 'col-note-' + item.id;
    const location = [item.zone, item.place].filter(Boolean).join(' · ');
    const spoilers = location || item.reward || map;
    return '<article class="col-card" data-col-item="' + esc(item.id) + '">' +
      '<div class="col-card-media">' + (image ? '<img src="' + esc(image) + '" alt="' + esc(item.image.alt || item.name) + '" width="' + (Number(item.image.width) || 480) + '" height="' + (Number(item.image.height) || 270) + '" loading="lazy" decoding="async">' : '<span class="col-no-image">Visuel GTA VI non documenté</span>') + '</div>' +
      '<div class="col-card-body"><div class="col-tags"><span class="col-tag col-tag-' + esc(item.status) + '">' + esc(statusLabels[item.status] || 'Statut à préciser') + '</span></div>' +
      '<h3>' + (url ? '<a href="' + esc(url) + '">' + esc(item.name) + '</a>' : esc(item.name)) + '</h3>' +
      '<p class="col-card-location">' + esc([categoryName(item), item.region].filter(Boolean).join(' · ')) + '</p>' +
      (item.summary ? '<p class="col-card-summary">' + esc(item.summary) + '</p>' : '') +
      (spoilers ? '<details class="col-card-spoilers" data-col-spoiler' + (prefs.spoilers ? ' open' : '') + '><summary>Emplacement &amp; récompense</summary>' + (location ? '<p>' + esc(location) + '</p>' : '') + (item.reward ? '<p>Récompense : ' + esc(item.reward) + '</p>' : '') + (map ? '<a href="' + esc(map) + '">Voir sur la carte ↗</a>' : '') + '</details>' : '') +
      '<div class="col-card-actions"><button type="button" data-col-found="' + esc(item.id) + '" aria-pressed="false">Marquer trouvé</button><button type="button" data-col-favorite="' + esc(item.id) + '" aria-pressed="false">☆ Favori</button><button type="button" data-col-plan="' + esc(item.id) + '" aria-pressed="false">Ajouter à ma sortie</button></div>' +
      '<details class="col-card-note"><summary>Note personnelle' + (state.notes[item.id] ? ' · enregistrée' : '') + '</summary><label for="' + esc(noteId) + '">Ta note (2 000 caractères maximum)</label><textarea id="' + esc(noteId) + '" data-col-note="' + esc(item.id) + '" maxlength="2000" rows="3" placeholder="Tes repères pour la prochaine visite…">' + esc(state.notes[item.id] || '') + '</textarea></details></div></article>';
  }
  function ordered(list) {
    const alpha = (a,b) => String(a || '').localeCompare(String(b || ''), 'fr', {numeric: true, sensitivity: 'base'});
    const difficulty = value => ({facile: 1, easy: 1, moyenne: 2, moyen: 2, medium: 2, difficile: 3, hard: 3, extreme: 4})[norm(value)] || 99;
    return list.sort((a,b) => {
      let result = 0;
      if (filters.sort === 'updated') result = (Date.parse(b.updatedAt || b.verifiedAt) || 0) - (Date.parse(a.updatedAt || a.verifiedAt) || 0);
      if (filters.sort === 'category') result = alpha(categoryName(a), categoryName(b));
      if (filters.sort === 'region') result = alpha(a.region, b.region);
      if (filters.sort === 'order') result = (Number.isFinite(a.order) ? a.order : Infinity) - (Number.isFinite(b.order) ? b.order : Infinity);
      if (filters.sort === 'difficulty') result = difficulty(a.difficulty) - difficulty(b.difficulty);
      return result || alpha(a.name, b.name) || alpha(a.id, b.id);
    });
  }
  function render(options = {}) {
    if (!results) return;
    const active = document.activeElement;
    const focusKey = active?.dataset.colFound ? ['found', active.dataset.colFound] : active?.dataset.colFavorite ? ['favorite', active.dataset.colFavorite] : null;
    const openNotes = new Set([...results.querySelectorAll('.col-card-note[open]')].map(node => node.querySelector('[data-col-note]')?.dataset.colNote));
    const list = ordered(items.filter(item => matches(item)));
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    filters.page = Math.min(filters.page, pages);
    results.innerHTML = list.slice((filters.page - 1) * PAGE_SIZE, filters.page * PAGE_SIZE).map(card).join('');
    results.querySelectorAll('.col-card-note').forEach(node => { node.open = openNotes.has(node.querySelector('[data-col-note]')?.dataset.colNote); });
    results.classList.toggle('is-list', filters.view === 'list');
    const activeFilters = ['q', ...fields].filter(key => filters[key]);
    setText('col-result-count', items.length ? list.length + ' résultat' + (list.length > 1 ? 's' : '') + ' sur ' + items.length + ' fiche' + (items.length > 1 ? 's' : '') : 'Aucune fiche documentée');
    if ($('col-empty')) $('col-empty').hidden = list.length > 0;
    setText('col-empty-title', items.length ? 'Aucune découverte avec ces filtres.' : 'Le terrain reste à explorer.');
    setText('col-empty-text', items.length ? 'Essaie une autre recherche ou retire un filtre. Tes trouvailles et tes notes sont conservées.' : 'Nous attendons des éléments suffisamment documentés pour publier les premières fiches. Aucun objet, emplacement ou total n’est inventé pour remplir le catalogue.');
    if ($('col-empty-link')) $('col-empty-link').hidden = items.length > 0;
    if ($('col-empty-reset')) $('col-empty-reset').hidden = !activeFilters.length;
    if ($('col-active-filters')) $('col-active-filters').innerHTML = activeFilters.map(key => {
      const value = key === 'category' ? categories.get(filters[key]) || filters[key] : key === 'status' ? statusLabels[filters[key]] : key === 'progress' ? progressLabels[filters[key]] : filters[key];
      return '<button type="button" data-col-remove="' + key + '" aria-label="' + esc('Retirer le filtre ' + filterLabels[key] + ' : ' + value) + '">' + esc(filterLabels[key] + ' : ' + value) + ' <span aria-hidden="true">×</span></button>';
    }).join('');
    if ($('col-pagination')) {
      $('col-pagination').hidden = pages < 2;
      $('col-pagination').innerHTML = '<button type="button" data-col-page="' + (filters.page - 1) + '"' + (filters.page === 1 ? ' disabled' : '') + '>← Précédent</button><span>Page ' + filters.page + ' / ' + pages + '</span><button type="button" data-col-page="' + (filters.page + 1) + '"' + (filters.page === pages ? ' disabled' : '') + '>Suivant →</button>';
    }
    updateFacets(); syncControls(); updateProgress(); updateActions();
    if (options.url !== false) writeURL();
    if (focusKey) {
      const replacement = [...results.querySelectorAll('[data-col-' + focusKey[0] + ']')].find(button => button.getAttribute('data-col-' + focusKey[0]) === focusKey[1]);
      (replacement || results).focus({preventScroll: true});
    }
    const view = {filters: {...filters}, count: list.length};
    viewSubscribers.forEach(fn => { try { fn(view); } catch (_) { /* Isolate supplementary tools. */ } });
    window.dispatchEvent(new CustomEvent('lk:collectibles-view-change', {detail: view}));
  }
  function resetFilters() { clearTimeout(searchTimer); filters = {...defaults, view: filters.view}; render(); $('col-search')?.focus(); }
  document.querySelectorAll('[data-col-controls]').forEach(node => { node.hidden = false; });
  if (!items.length) {
    if ($('col-filters')) $('col-filters').hidden = true;
    document.querySelectorAll('.col-results-tools').forEach(node => { node.hidden = true; });
  }
  document.querySelectorAll('[data-col-spoiler]').forEach(node => { if (node.tagName === 'DETAILS') node.open = prefs.spoilers; });
  document.addEventListener('click', async event => {
    const target = event.target.closest('button,a[data-col-share]');
    if (!target) return;
    if (target.hasAttribute('data-col-found')) {
      const id = target.dataset.colFound, found = !state.found[id];
      if (core.setFound(id, found)) feedback(found ? 'Collectible marqué comme trouvé.' : 'Collectible remis dans les objets à trouver.');
    } else if (target.hasAttribute('data-col-favorite')) {
      const id = target.dataset.colFavorite, favorite = !state.favorites[id];
      if (core.setFavorite(id, favorite)) feedback(favorite ? 'Collectible ajouté aux favoris.' : 'Collectible retiré des favoris.');
    } else if (target.dataset.colView) {
      filters.view = target.dataset.colView === 'list' ? 'list' : 'grid'; prefs.view = filters.view; savePrefs(); render();
    } else if (target.dataset.colPage) {
      filters.page = Math.max(1, Number(target.dataset.colPage)); render(); results?.focus({preventScroll: true}); results?.scrollIntoView({block: 'start', behavior: 'instant'});
    } else if (target.dataset.colRemove) {
      filters[target.dataset.colRemove] = ''; filters.page = 1; render(); $('col-search')?.focus();
    } else if (target.dataset.colGroup) {
      filters = {...defaults, view: filters.view, [target.dataset.colGroup]: target.dataset.colValue}; render(); $('catalogue')?.scrollIntoView({block: 'start'}); $('col-' + target.dataset.colGroup)?.focus({preventScroll: true});
    } else if (target.hasAttribute('data-col-share')) {
      event.preventDefault();
      const item = core.getItem(target.dataset.colShare);
      const url = new URL(core.itemUrl(item) || location.pathname, location.href).href;
      try { if (navigator.share) await navigator.share({title: document.title, url}); else { await navigator.clipboard.writeText(url); feedback('Lien de la fiche copié.'); } }
      catch (error) { if (error.name !== 'AbortError') feedback('Copie l’adresse de cette page dans la barre du navigateur pour la partager.'); }
    }
  });
  document.addEventListener('input', event => {
    const input = event.target;
    if (input.matches('[data-col-note]')) {
      if (input.value.length > core.maxNoteLength) { feedback('Une note ne peut pas dépasser 2 000 caractères.'); return; }
      if (core.setNote(input.dataset.colNote, input.value)) {
        const summary = input.closest('details')?.querySelector('summary');
        if (summary) summary.textContent = 'Note personnelle' + (input.value.trim() ? core.getStorageStatus().status === 'available' ? ' · enregistrée' : ' · dans cet onglet' : '');
      }
    }
  });
  document.addEventListener('change', event => {
    if (event.target.matches('#col-spoilers,[data-col-spoilers-toggle]')) {
      prefs.spoilers = event.target.checked; savePrefs(); syncControls();
      document.querySelectorAll('details[data-col-spoiler]').forEach(node => { node.open = prefs.spoilers; });
      feedback(prefs.spoilers ? 'Emplacements et récompenses affichés.' : 'Emplacements et récompenses repliés.');
    }
  });
  core.subscribe(next => {
    state = next;
    if (results && !document.activeElement?.matches('[data-col-note]')) render({url: false});
    else { updateActions(); updateProgress(); }
  });
  if (results) {
    window.LKCollectiblesView = Object.freeze({
      getFilteredItems: () => ordered(items.filter(item => matches(item))),
      getFilters: () => ({...filters}),
      applyFilters: value => {
        const query = typeof value === 'string' ? value : new URLSearchParams(Object.entries(value || {}).filter(([,entry]) => entry !== '' && entry !== null && entry !== undefined).map(([key,entry]) => [key,String(entry)])).toString();
        const valid = core.validateQuery(query);
        clearTimeout(searchTimer); readParams(new URLSearchParams(valid)); render();
      },
      subscribe: fn => { if (typeof fn !== 'function') return () => {}; viewSubscribers.add(fn); return () => viewSubscribers.delete(fn); }
    });
    readURL(); render();
    $('col-filters')?.addEventListener('submit', event => { event.preventDefault(); clearTimeout(searchTimer); filters.q = $('col-search').value; filters.page = 1; render(); });
    $('col-search')?.addEventListener('input', event => { clearTimeout(searchTimer); filters.q = event.target.value; filters.page = 1; searchTimer = setTimeout(render, 100); });
    [...fields, 'sort'].forEach(field => $('col-' + field)?.addEventListener('change', event => { filters[field] = event.target.value; filters.page = 1; render(); }));
    $('col-reset')?.addEventListener('click', resetFilters);
    $('col-empty-reset')?.addEventListener('click', resetFilters);
    window.addEventListener('popstate', () => { clearTimeout(searchTimer); readURL(); render({url: false}); });
    $('col-export')?.addEventListener('click', () => {
      try {
        const blob = new Blob([JSON.stringify(core.exportData(), null, 2)], {type: 'application/json'}), url = URL.createObjectURL(blob), link = document.createElement('a');
        link.href = url; link.download = 'leonidakit-collectibles-' + new Date().toISOString().slice(0,10) + '.json'; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        feedback('Export de ton carnet préparé. Garde le fichier JSON pour le réimporter.');
      } catch (_) { feedback('Export indisponible dans ce navigateur. Ton carnet n’a pas été modifié.'); }
    });
    $('col-import')?.addEventListener('click', () => $('col-import-file')?.click());
    $('col-import-file')?.addEventListener('change', async event => {
      const input = event.target, file = input.files?.[0];
      if (!file) return;
      try {
        if (file.size > core.maxImportBytes) throw new Error('Le fichier dépasse la limite de 2 Mo.');
        const counts = core.importData(await file.text(), 'merge');
        feedback('Import fusionné : ' + counts.found + ' trouvé(s), ' + counts.favorites + ' favori(s), ' + counts.notes + ' note(s).' + (counts.tools ? ' Outils inclus : ' + counts.tools.savedViews + ' recherche(s), ' + counts.tools.plan + ' étape(s).' : '') + ' Les identifiants absents du catalogue sont conservés pour les futures fiches.');
      } catch (error) { feedback('Import refusé. ' + error.message); }
      input.value = '';
    });
    const dialog = $('col-reset-dialog');
    $('col-clear-progress')?.addEventListener('click', () => {
      if (dialog?.showModal) { dialog.returnValue = ''; dialog.showModal(); }
      else if (window.confirm('Effacer tous les objets trouvés, favoris et notes de ce navigateur ?')) { core.resetProgress(); feedback('Carnet local effacé.'); }
    });
    dialog?.addEventListener('close', () => { if (dialog.returnValue === 'confirm') { core.resetProgress(); feedback('Carnet local effacé.'); } $('col-clear-progress')?.focus(); });
  } else { updateActions(); syncControls(); }
})();
