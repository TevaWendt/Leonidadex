/* Optional local tools. No account, network service, guessed route or external notes. */
(function () {
  'use strict';
  const core = window.LKCollectibles, view = window.LKCollectiblesView;
  if (!core?.getToolsState) return;
  const host = document.getElementById('col-tools');
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const publicItem = id => { const item = core.getItem(id); return item && item.published !== false && item.status !== 'placeholder' ? item : null; };
  const items = () => view ? view.getFilteredItems() : [];
  const categories = new Map((window.LK_COLLECTIBLES?.categories || []).map(category => [category.id, category.name]));
  const statuses = {confirmed: 'Confirmé', established: 'Fortement établi', unconfirmed: 'Non confirmé'};
  const hasCatalogue = (window.LK_COLLECTIBLES?.items || []).some(item => publicItem(item.id));
  let toolState = core.getToolsState(), printTrigger = null;
  function message(text) {
    const warning = core.getStorageStatus().message;
    document.querySelectorAll('[data-col-tools-feedback],[data-col-plan-status],[data-col-feedback]').forEach(node => { node.textContent = text + (warning ? ' ' + warning : ''); });
  }
  function commit(next) { toolState = core.setToolsState(next); }
  function canonicalQuery() {
    if (!view) return '';
    const filters = view.getFilters(), params = new URLSearchParams();
    Object.entries(filters).forEach(([key,value]) => {
      if (value === '' || (key === 'page' && value === 1) || (key === 'sort' && value === 'name')) return;
      params.set(key, String(value));
    });
    return core.validateQuery(params.toString());
  }
  function saveView(name) {
    if (!view || !hasCatalogue) throw new Error('Les recherches pourront être enregistrées dès la publication des premières fiches.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 64) throw new Error('Donnez un nom de 1 à 64 caractères à cette recherche.');
    const query = canonicalQuery(), next = core.getToolsState();
    if (next.savedViews.length >= 12) throw new Error('Vous avez déjà 12 recherches. Retirez-en une avant d’enregistrer une nouvelle vue.');
    const existing = next.savedViews.find(entry => entry.query === query);
    if (existing) throw new Error('Cette vue est déjà enregistrée sous « ' + existing.name + ' ».');
    const id = 'view-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10));
    next.savedViews.push({id, name: name.trim(), query, createdAt: new Date().toISOString()});
    commit(next); return id;
  }
  function addToPlan(id) {
    if (!publicItem(id)) throw new Error('Cette fiche n’est pas disponible dans le catalogue actuel.');
    const next = core.getToolsState();
    if (next.plan.includes(id)) return false;
    if (next.plan.length >= 30) throw new Error('Votre sortie contient déjà 30 étapes. Retirez une étape pour en ajouter une.');
    next.plan.push(id); commit(next); return true;
  }
  function removeFromPlan(id) {
    const next = core.getToolsState(); next.plan = next.plan.filter(entry => entry !== id); commit(next);
  }
  function movePlan(id, delta) {
    const next = core.getToolsState(), index = next.plan.indexOf(id), target = index + delta;
    if (![-1,1].includes(delta) || index < 0 || target < 0 || target >= next.plan.length) return false;
    [next.plan[index], next.plan[target]] = [next.plan[target], next.plan[index]]; commit(next); return true;
  }
  function csvCell(value) {
    let text = String(value ?? '');
    // A spreadsheet must treat source text and private notes as text, never as a formula.
    if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function makeCSV(list, options = {}) {
    const state = core.getState();
    const headers = ['ID', 'Nom', 'Catégorie', 'Région', 'Statut', 'Trouvé', 'Favori', 'Fiche'];
    if (options.spoilers) headers.push('Zone', 'Lieu', 'Récompense', 'Carte');
    if (options.notes) headers.push('Note personnelle');
    const rows = list.map(item => {
      const row = [item.id, item.name, categories.get(item.category) || item.category || '', item.region || '', statuses[item.status] || item.status, core.isTrackable(item) ? state.found[item.id] ? 'Oui' : 'Non' : 'Suivi indisponible', state.favorites[item.id] ? 'Oui' : 'Non', new URL(core.itemUrl(item) || '/collectibles.html', location.href).href];
      if (options.spoilers) row.push(item.zone || '', item.place || '', item.reward || '', core.mapUrl(item) ? new URL(core.mapUrl(item), location.href).href : '');
      if (options.notes) row.push(state.notes[item.id] || '');
      return row;
    });
    return '\uFEFF' + [headers, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
  }
  function exportOptions() { return {notes: !!$('col-export-notes')?.checked, spoilers: !!$('col-export-spoilers')?.checked}; }
  function updatePlanButtons() {
    document.querySelectorAll('[data-col-plan]').forEach(button => {
      const id = button.dataset.colPlan, included = toolState.plan.includes(id), available = !!publicItem(id);
      button.setAttribute('aria-pressed', String(included)); button.disabled = !available;
      const label = button.querySelector('[data-col-plan-label]') || button;
      label.textContent = included ? '✓ Dans ma sortie' : 'Ajouter à ma sortie';
      button.setAttribute('aria-label', (included ? 'Retirer de ma sortie : ' : 'Ajouter à ma sortie : ') + (publicItem(id)?.name || 'fiche indisponible'));
    });
  }
  function renderSavedViews() {
    if (!$('col-saved-views')) return;
    $('col-saved-views').innerHTML = toolState.savedViews.length ? '<ul class="col-tools-list">' + toolState.savedViews.map(entry => '<li><button type="button" class="col-saved-recall" data-col-view-recall="' + esc(entry.id) + '"' + (!hasCatalogue ? ' disabled' : '') + '><strong>' + esc(entry.name) + '</strong><span>Rouvrir les filtres enregistrés ↗</span></button><button type="button" class="col-tools-icon-btn" data-col-view-delete="' + esc(entry.id) + '" aria-label="Supprimer la recherche ' + esc(entry.name) + '">×</button></li>').join('') + '</ul>' : '<p class="col-tools-empty">' + (hasCatalogue ? 'Réglez les filtres du catalogue, puis donnez un nom à cette vue pour la retrouver en un clic.' : 'Vos vues favorites pourront être enregistrées dès que des fiches documentées seront publiées.') + '</p>';
    if ($('col-save-view')) $('col-save-view').disabled = !hasCatalogue || toolState.savedViews.length >= 12;
    if ($('col-view-name')) $('col-view-name').disabled = !hasCatalogue;
    $('col-saved-count').textContent = toolState.savedViews.length + ' / 12';
  }
  function renderPlan() {
    if (!$('col-plan-list')) return;
    const state = core.getState();
    $('col-plan-count').textContent = toolState.plan.length + ' / 30';
    $('col-plan-list').innerHTML = toolState.plan.length ? toolState.plan.map((id,index) => {
      const item = publicItem(id), found = item && core.isTrackable(item) && state.found[id];
      const title = item ? item.name : 'Fiche indisponible : ' + id;
      const description = item ? [found ? 'Trouvé' : core.isTrackable(item) ? 'À trouver' : 'Suivi indisponible', item.region].filter(Boolean).join(' · ') : 'Identifiant conservé pour une future publication.';
      return '<li data-col-plan-row="' + esc(id) + '"><span class="col-plan-order">' + (index + 1) + '</span><div class="col-plan-copy">' + (item && core.itemUrl(item) ? '<a href="' + esc(core.itemUrl(item)) + '">' + esc(title) + '</a>' : '<strong>' + esc(title) + '</strong>') + '<span>' + esc(description) + '</span></div><div class="col-plan-actions"><button type="button" data-col-plan-up="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Monter l’étape ' + esc(title) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-col-plan-down="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Descendre l’étape ' + esc(title) + '"' + (index === toolState.plan.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-col-plan-remove="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Retirer l’étape ' + esc(title) + '">×</button></div></li>';
    }).join('') : '<li class="col-tools-empty">' + (hasCatalogue ? 'Ajoutez des fiches avec « Ajouter à ma sortie », puis choisissez leur ordre ici.' : 'Votre prochaine sortie prendra forme avec les premières fiches documentées. Aucun emplacement n’est inventé.') + '</li>';
    const candidates = toolState.plan.map(publicItem).filter(item => item && !(core.isTrackable(item) && state.found[item.id]));
    const next = candidates.find(item => core.mapUrl(item));
    $('col-plan-next').innerHTML = next ? '<a class="col-btn" href="' + esc(core.mapUrl(next)) + '">Prochaine étape localisée : ' + esc(next.name) + ' ↗</a>' : toolState.plan.length ? '<p class="col-tools-empty">' + (candidates.length ? 'Aucun emplacement vérifié n’est disponible pour les étapes restantes.' : 'Toutes les étapes disponibles et suivies sont trouvées ; les fiches indisponibles restent conservées.') + '</p>' : '';
  }
  function refresh() {
    toolState = core.getToolsState(); updatePlanButtons();
    if (!host || !view) return;
    renderSavedViews(); renderPlan();
    const count = items().length;
    $('col-tools-result-count').textContent = count + ' fiche' + (count > 1 ? 's' : '') + ' dans la vue actuelle';
    ['col-export-csv','col-print-checklist'].forEach(id => { $(id).disabled = count === 0; });
    if ($('col-tools-storage')) { const warning = core.getStorageStatus().message; $('col-tools-storage').hidden = !warning; $('col-tools-storage').textContent = warning; }
  }
  function downloadCSV() {
    const list = items(); if (!list.length) { message('Aucune fiche dans cette vue à exporter.'); return; }
    const blob = new Blob([makeCSV(list, exportOptions())], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'leonidakit-checklist-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Checklist CSV préparée : ' + list.length + ' fiche(s).' + (exportOptions().notes ? ' Elle inclut vos notes personnelles.' : ' Les notes personnelles restent exclues.'));
  }
  function fillPrint() {
    const list = items(), state = core.getState(), options = exportOptions();
    const hasLocalFilters = !!view.getFilters().progress;
    $('col-print-content').innerHTML = '<div class="col-print-heading"><span>LEONIDAKIT · GTA VI</span><h2 id="col-print-title">Ma checklist de collectibles</h2><p>' + list.length + ' fiche(s) · ' + esc(new Date().toLocaleDateString('fr-FR')) + ' · ' + (hasLocalFilters ? 'Vue utilisant votre carnet local' : 'Vue filtrée du catalogue') + '</p><p>Le total du jeu reste inconnu. Les informations non documentées restent absentes.</p></div><ol class="col-print-list">' + list.map(item => {
      const found = core.isTrackable(item) && state.found[item.id];
      return '<li><div class="col-print-item-title"><span aria-label="' + (found ? 'Trouvé' : 'Non trouvé') + '">' + (found ? '☑' : '☐') + '</span><h3>' + esc(item.name) + '</h3></div><p>' + esc([categories.get(item.category) || item.category, item.region, statuses[item.status], !core.isTrackable(item) ? 'Suivi indisponible' : ''].filter(Boolean).join(' · ')) + '</p>' + (options.spoilers && (item.place || item.reward) ? '<p>' + esc([item.place, item.reward ? 'Récompense : ' + item.reward : ''].filter(Boolean).join(' · ')) + '</p>' : '') + (options.notes && state.notes[item.id] ? '<p class="col-print-note">Note : ' + esc(state.notes[item.id]) + '</p>' : '') + '</li>';
    }).join('') + '</ol><p class="col-print-footer">Leonidakit · Site indépendant · Checklist personnelle, sans connexion à une sauvegarde GTA.</p>';
  }
  async function shareView() {
    const url = new URL('/collectibles.html', location.href); url.search = canonicalQuery(); url.hash = 'catalogue';
    const localFilter = !!view?.getFilters().progress;
    const note = localFilter ? ' Le filtre de collection utilisera le carnet local de la personne qui ouvre ce lien ; vos trouvailles et notes ne sont pas partagées.' : ' Le lien contient uniquement les filtres, aucune note ni sauvegarde personnelle.';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Copie indisponible');
      await navigator.clipboard.writeText(url.href); message('Lien de la vue copié.' + note);
      if ($('col-share-fallback')) $('col-share-fallback').hidden = true;
    } catch (_) {
      if ($('col-share-fallback')) {
        $('col-share-fallback').hidden = false; $('col-share-url').value = url.href; $('col-share-url').focus(); $('col-share-url').select();
        message('La copie automatique est indisponible. Copiez le lien affiché dans le champ.' + note);
      } else message('La copie automatique est indisponible. Copiez l’adresse de la page dans votre navigateur.');
    }
  }
  if (host && view) {
    host.innerHTML = '<div class="col-tools-heading"><div><p class="col-eyebrow">À VOTRE FAÇON</p><h2>Préparer la prochaine sortie.</h2></div><p>Vos recherches, votre ordre d’exploration, votre checklist.</p></div><div class="col-tools-grid"><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Mes recherches</h3><span id="col-saved-count">0 / 12</span></div><div id="col-saved-views"></div><form id="col-save-view-form"><label for="col-view-name">Nom de cette vue</label><div class="col-save-view-row"><input id="col-view-name" maxlength="64" placeholder="Ex. Mes favoris à Vice City" autocomplete="off" required><button type="submit" id="col-save-view" class="col-btn">Enregistrer</button></div></form><p class="col-tools-fine">Les filtres sont conservés, pas une copie figée des résultats. Vos vues suivent les prochaines publications.</p></section><section class="col-tools-panel col-plan-panel"><div class="col-tools-panel-head"><h3>Ma sortie</h3><span id="col-plan-count">0 / 30</span></div><p class="col-tools-intro">Choisissez vos étapes et leur ordre. Cette liste personnelle ne calcule ni trajet optimal ni temps de déplacement.</p><ol id="col-plan-list" class="col-plan-list"></ol><div id="col-plan-next"></div></section><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Emporter la checklist</h3><span aria-hidden="true">↗</span></div><p id="col-tools-result-count" class="col-tools-intro"></p><div class="col-tools-export-options"><label class="col-checkbox"><input type="checkbox" id="col-export-notes"> Inclure mes notes personnelles</label><label class="col-checkbox"><input type="checkbox" id="col-export-spoilers"> Inclure les lieux précis et récompenses</label></div><div class="col-tools-export-actions"><button type="button" id="col-export-csv" class="col-btn">Exporter la vue en CSV ↓</button><button type="button" id="col-print-checklist" class="col-btn">Préparer l’impression</button><button type="button" id="col-share-view" class="col-text-button">Partager cette vue ↗</button></div><div id="col-share-fallback" hidden><label for="col-share-url">Lien à copier manuellement</label><input id="col-share-url" type="text" readonly></div><p class="col-tools-fine">Le CSV et l’impression suivent vos filtres. La sauvegarde JSON du carnet inclut aussi vos recherches et votre sortie.</p></section></div><p id="col-tools-storage" class="col-notice col-warning" hidden></p><p data-col-tools-feedback class="col-tools-feedback" role="status" aria-live="polite"></p><dialog id="col-print-dialog" class="col-print-dialog" aria-labelledby="col-print-title"><div class="col-print-toolbar"><button type="button" id="col-do-print" class="col-btn col-btn-primary">Imprimer / Enregistrer en PDF</button><button type="button" id="col-close-print" class="col-btn">Fermer l’aperçu</button></div><div id="col-print-content"></div></dialog>';
    // Keep the printable dialog directly under body so print CSS can remove the page flow entirely.
    document.body.appendChild($('col-print-dialog'));
    $('col-plan-list').tabIndex = -1;
    $('col-save-view-form').addEventListener('submit', event => { event.preventDefault(); try { saveView($('col-view-name').value); $('col-view-name').value = ''; message('Recherche enregistrée dans ce navigateur.'); } catch (error) { message(error.message); } });
    $('col-export-csv').addEventListener('click', () => { try { downloadCSV(); } catch (_) { message('Le téléchargement CSV n’a pas pu être préparé. Votre carnet est conservé.'); } });
    $('col-share-view').addEventListener('click', shareView);
    $('col-print-checklist').addEventListener('click', event => {
      if (!items().length) return;
      if (typeof $('col-print-dialog').showModal !== 'function') { message('Cet aperçu nécessite un navigateur récent. La checklist reste disponible au format CSV.'); return; }
      fillPrint(); printTrigger = event.currentTarget; $('col-print-dialog').showModal();
    });
    $('col-close-print').addEventListener('click', () => $('col-print-dialog').close());
    $('col-print-dialog').addEventListener('close', () => { document.body.classList.remove('col-printing'); printTrigger?.focus(); });
    $('col-do-print').addEventListener('click', () => {
      document.body.classList.add('col-printing');
      try { window.print(); } catch (_) { document.body.classList.remove('col-printing'); message('L’impression est indisponible dans ce navigateur. Vous pouvez exporter la vue en CSV.'); }
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('col-printing'));
    view.subscribe(refresh);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.hasAttribute('data-col-plan')) {
        const id = button.dataset.colPlan;
        if (core.getToolsState().plan.includes(id)) { removeFromPlan(id); message('Étape retirée de votre sortie.'); }
        else { addToPlan(id); message('Fiche ajoutée à votre sortie. Modifiez son ordre depuis le catalogue.'); }
      } else if (button.hasAttribute('data-col-view-recall')) {
        const entry = toolState.savedViews.find(entry => entry.id === button.dataset.colViewRecall);
        if (entry && view) { view.applyFilters(entry.query); message('Vue « ' + entry.name + ' » restaurée.'); $('catalogue')?.scrollIntoView({block: 'start'}); $('col-search')?.focus({preventScroll: true}); }
      } else if (button.hasAttribute('data-col-view-delete')) {
        const next = core.getToolsState(); next.savedViews = next.savedViews.filter(entry => entry.id !== button.dataset.colViewDelete); commit(next); message('Recherche enregistrée supprimée.'); $('col-view-name')?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-remove')) {
        removeFromPlan(button.dataset.colPlanRemove); message('Étape retirée de votre sortie.'); ($('col-plan-list')?.querySelector('button:not(:disabled)') || $('col-plan-list'))?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-up') || button.hasAttribute('data-col-plan-down')) {
        const up = button.hasAttribute('data-col-plan-up'), id = up ? button.dataset.colPlanUp : button.dataset.colPlanDown;
        if (movePlan(id, up ? -1 : 1)) {
          const position = core.getToolsState().plan.indexOf(id) + 1; message('Étape déplacée en position ' + position + '.');
          const candidates = [...document.querySelectorAll('[data-col-plan-' + (up ? 'up' : 'down') + ']')];
          const replacement = candidates.find(node => node.getAttribute('data-col-plan-' + (up ? 'up' : 'down')) === id);
          (replacement?.disabled ? replacement.parentElement.querySelector('button:not(:disabled)') : replacement)?.focus({preventScroll: true});
        }
      }
    } catch (error) { message(error.message); }
  });
  core.subscribeTools(refresh); core.subscribe(refresh);
  window.addEventListener('lk:collectibles-view-change', updatePlanButtons);
  window.LKCollectiblesTools = Object.freeze({saveView, addToPlan, removeFromPlan, movePlan, csvCell, makeCSV, shareView, getState: core.getToolsState});
  refresh();
})();
