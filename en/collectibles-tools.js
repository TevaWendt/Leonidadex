/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
/* Optional local tools. No account, network service, guessed route or external notes. */
(function () {
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; }; /* pluriel selon la langue de la page (français : n > 1) */
  const core = window.LKCollectibles, view = window.LKCollectiblesView;
  if (!core?.getToolsState) return;
  const host = document.getElementById('col-tools');
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const publicItem = id => { const item = core.getItem(id); return item && item.published !== false && item.status !== 'placeholder' ? item : null; };
  const items = () => view ? view.getFilteredItems() : [];
  const categories = new Map((window.LK_COLLECTIBLES?.categories || []).map(category => [category.id, category.name]));
  const statuses = {confirmed: 'Confirmed', established: 'Strongly established', unconfirmed: 'Unconfirmed'};
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
    if (!view || !hasCatalogue) throw new Error('Searches can be saved once the first pages are published.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 64) throw new Error('Give this search a name of 1 to 64 characters.');
    const query = canonicalQuery(), next = core.getToolsState();
    if (next.savedViews.length >= 12) throw new Error('You already have 12 searches. Remove one before saving a new view.');
    const existing = next.savedViews.find(entry => entry.query === query);
    if (existing) throw new Error('This view is already saved as “' + existing.name + '”.');
    const id = 'view-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10));
    next.savedViews.push({id, name: name.trim(), query, createdAt: new Date().toISOString()});
    commit(next); return id;
  }
  function addToPlan(id) {
    if (!publicItem(id)) throw new Error('This page isn’t available in the current catalog.');
    const next = core.getToolsState();
    if (next.plan.includes(id)) return false;
    if (next.plan.length >= 30) throw new Error('Your route already has 30 stops. Remove a stop to add another one.');
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
    const headers = ['ID', 'Name', 'Category', 'Region', 'Status', 'Found', 'Favorite', 'Page'];
    if (options.spoilers) headers.push('Zone', 'Place', 'Reward', 'Map');
    if (options.notes) headers.push('Personal note');
    const rows = list.map(item => {
      const row = [item.id, item.name, categories.get(item.category) || item.category || '', item.region || '', statuses[item.status] || item.status, core.isTrackable(item) ? state.found[item.id] ? 'Yes' : 'No' : 'Tracking unavailable', state.favorites[item.id] ? 'Yes' : 'No', new URL(core.itemUrl(item) || '/en/collectibles.html', location.href).href];
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
      label.textContent = included ? '✓ In my route' : 'Add to my route';
      button.setAttribute('aria-label', (included ? 'Remove from my route: ' : 'Add to my route: ') + (publicItem(id)?.name || 'page unavailable'));
    });
  }
  function renderSavedViews() {
    if (!$('col-saved-views')) return;
    $('col-saved-views').innerHTML = toolState.savedViews.length ? '<ul class="col-tools-list">' + toolState.savedViews.map(entry => '<li><button type="button" class="col-saved-recall" data-col-view-recall="' + esc(entry.id) + '"' + (!hasCatalogue ? ' disabled' : '') + '><strong>' + esc(entry.name) + '</strong><span>Reopen the saved filters ↗</span></button><button type="button" class="col-tools-icon-btn" data-col-view-delete="' + esc(entry.id) + '" aria-label="Delete the search ' + esc(entry.name) + '">×</button></li>').join('') + '</ul>' : '<p class="col-tools-empty">' + (hasCatalogue ? 'Set the catalog filters, then name this view to get it back in one click.' : 'As soon as pages exist, filter the catalog, name the view and find it here.') + '</p>';
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
      const title = item ? item.name : 'Page unavailable: ' + id;
      const description = item ? [found ? 'Found' : core.isTrackable(item) ? 'To find' : 'Tracking unavailable', item.region].filter(Boolean).join(' · ') : 'ID kept for a future page.';
      return '<li data-col-plan-row="' + esc(id) + '"><span class="col-plan-order">' + (index + 1) + '</span><div class="col-plan-copy">' + (item && core.itemUrl(item) ? '<a href="' + esc(core.itemUrl(item)) + '">' + esc(title) + '</a>' : '<strong>' + esc(title) + '</strong>') + '<span>' + esc(description) + '</span></div><div class="col-plan-actions"><button type="button" data-col-plan-up="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Move up the stop ' + esc(title) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-col-plan-down="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Move down the stop ' + esc(title) + '"' + (index === toolState.plan.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-col-plan-remove="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Remove the stop ' + esc(title) + '">×</button></div></li>';
    }).join('') : '<li class="col-tools-empty">' + (hasCatalogue ? 'Add pages with “Add to my route”, then choose their order here.' : 'Your next route will take shape with the first documented pages. No location is made up.') + '</li>';
    const candidates = toolState.plan.map(publicItem).filter(item => item && !(core.isTrackable(item) && state.found[item.id]));
    const next = candidates.find(item => core.mapUrl(item));
    $('col-plan-next').innerHTML = next ? '<a class="col-btn" href="' + esc(core.mapUrl(next)) + '">Next located stop: ' + esc(next.name) + ' ↗</a>' : toolState.plan.length ? '<p class="col-tools-empty">' + (candidates.length ? 'No verified location is available for the remaining stops.' : 'All available, tracked stops are found; unavailable pages are kept.') + '</p>' : '';
  }
  function refresh() {
    toolState = core.getToolsState(); updatePlanButtons();
    if (!host || !view) return;
    renderSavedViews(); renderPlan();
    const count = items().length;
    $('col-tools-result-count').textContent = count + (lkPluriel(count)?' pages':' page') + ' in the current view';
    ['col-export-csv','col-print-checklist'].forEach(id => { $(id).disabled = count === 0; });
    if ($('col-tools-storage')) { const warning = core.getStorageStatus().message; $('col-tools-storage').hidden = !warning; $('col-tools-storage').textContent = warning; }
  }
  function downloadCSV() {
    const list = items(); if (!list.length) { message('No pages in this view to export.'); return; }
    const blob = new Blob([makeCSV(list, exportOptions())], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'leonidakit-checklist-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('CSV checklist ready: ' + list.length + ' page(s).' + (exportOptions().notes ? ' It includes your personal notes.' : ' Personal notes are left out.'));
  }
  function fillPrint() {
    const list = items(), state = core.getState(), options = exportOptions();
    const hasLocalFilters = !!view.getFilters().progress;
    $('col-print-content').innerHTML = '<div class="col-print-heading"><span>LEONIDAKIT · GTA VI</span><h2 id="col-print-title">My collectibles checklist</h2><p>' + list.length + ' page(s) · ' + esc(new Date().toLocaleDateString('en-US')) + ' · ' + (hasLocalFilters ? 'View using your local tracker' : 'Filtered catalog view') + '</p><p>The game’s total is still unknown. Undocumented info stays out.</p></div><ol class="col-print-list">' + list.map(item => {
      const found = core.isTrackable(item) && state.found[item.id];
      return '<li><div class="col-print-item-title"><span aria-label="' + (found ? 'Found' : 'Not found') + '">' + (found ? '☑' : '☐') + '</span><h3>' + esc(item.name) + '</h3></div><p>' + esc([categories.get(item.category) || item.category, item.region, statuses[item.status], !core.isTrackable(item) ? 'Tracking unavailable' : ''].filter(Boolean).join(' · ')) + '</p>' + (options.spoilers && (item.place || item.reward) ? '<p>' + esc([item.place, item.reward ? 'Reward: ' + item.reward : ''].filter(Boolean).join(' · ')) + '</p>' : '') + (options.notes && state.notes[item.id] ? '<p class="col-print-note">Note: ' + esc(state.notes[item.id]) + '</p>' : '') + '</li>';
    }).join('') + '</ol><p class="col-print-footer">Leonidakit · Independent site · Personal checklist, not connected to any GTA save.</p>';
  }
  async function shareView() {
    const url = new URL('/en/collectibles.html', location.href); url.search = canonicalQuery(); url.hash = 'catalogue';
    const localFilter = !!view?.getFilters().progress;
    const note = localFilter ? ' The collection filter will use the local tracker of whoever opens this link; your finds and notes aren’t shared.' : ' The link only contains the filters, no notes or personal save.';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Copy unavailable');
      await navigator.clipboard.writeText(url.href); message('View link copied.' + note);
      if ($('col-share-fallback')) $('col-share-fallback').hidden = true;
    } catch (_) {
      if ($('col-share-fallback')) {
        $('col-share-fallback').hidden = false; $('col-share-url').value = url.href; $('col-share-url').focus(); $('col-share-url').select();
        message('Automatic copy is unavailable. Copy the link shown in the field.' + note);
      } else message('Automatic copy is unavailable. Copy the page address from your browser.');
    }
  }
  if (host && view) {
    host.innerHTML = '<div class="col-tools-heading"><div><p class="col-eyebrow">YOUR WAY</p><h2>Plan your next route.</h2></div><p>Your searches, your exploration order, your checklist.</p></div><div class="col-tools-grid"><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>My searches</h3><p class="col-tools-what">A search is a set of filters (region, family, status, keyword) saved under a name. You bring it back in one click instead of checking everything again.</p><span id="col-saved-count">0 / 12</span></div><div id="col-saved-views"></div><form id="col-save-view-form"><label for="col-view-name">Name of this view</label><div class="col-save-view-row"><input id="col-view-name" maxlength="64" placeholder="E.g. My favorites in Vice City" autocomplete="off" required><button type="submit" id="col-save-view" class="col-btn">Save</button></div></form><p class="col-tools-fine">The filters are saved, not a frozen copy of the results. Your views keep up with new pages as they’re published.</p></section><section class="col-tools-panel col-plan-panel"><div class="col-tools-panel-head"><h3>My route</h3><p class="col-tools-what">Your roadmap for the next session: the items to go get, in the order you choose, up to 30 stops.</p><span id="col-plan-count">0 / 30</span></div><p class="col-tools-intro">Choose your stops and their order. This personal list doesn’t work out the best path or travel time.</p><ol id="col-plan-list" class="col-plan-list"></ol><div id="col-plan-next"></div></section><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Take the checklist with you</h3><p class="col-tools-what">The list on screen, exported as a CSV file or laid out for printing, to check off on a second screen or on paper while you play.</p><span aria-hidden="true">↗</span></div><p id="col-tools-result-count" class="col-tools-intro"></p><div class="col-tools-export-options"><label class="col-checkbox"><input type="checkbox" id="col-export-notes"> Include my personal notes</label><label class="col-checkbox"><input type="checkbox" id="col-export-spoilers"> Include exact locations and rewards</label></div><div class="col-tools-export-actions"><button type="button" id="col-export-csv" class="col-btn">Export the view as CSV ↓</button><button type="button" id="col-print-checklist" class="col-btn">Prepare the printout</button><button type="button" id="col-share-view" class="col-text-button">Share this view ↗</button></div><div id="col-share-fallback" hidden><label for="col-share-url">Link to copy manually</label><input id="col-share-url" type="text" readonly></div><p class="col-tools-fine">The CSV and the printout follow your filters. The tracker’s JSON backup also includes your searches and your route.</p></section></div><p id="col-tools-storage" class="col-notice col-warning" hidden></p><p data-col-tools-feedback class="col-tools-feedback" role="status" aria-live="polite"></p><dialog id="col-print-dialog" class="col-print-dialog" aria-labelledby="col-print-title"><div class="col-print-toolbar"><button type="button" id="col-do-print" class="col-btn col-btn-primary">Print / Save as PDF</button><button type="button" id="col-close-print" class="col-btn">Close the preview</button></div><div id="col-print-content"></div></dialog>';
    // Keep the printable dialog directly under body so print CSS can remove the page flow entirely.
    document.body.appendChild($('col-print-dialog'));
    $('col-plan-list').tabIndex = -1;
    $('col-save-view-form').addEventListener('submit', event => { event.preventDefault(); try { saveView($('col-view-name').value); $('col-view-name').value = ''; message('Search saved in this browser.'); } catch (error) { message(error.message); } });
    $('col-export-csv').addEventListener('click', () => { try { downloadCSV(); } catch (_) { message('The CSV download couldn’t be prepared. Your tracker is kept.'); } });
    $('col-share-view').addEventListener('click', shareView);
    $('col-print-checklist').addEventListener('click', event => {
      if (!items().length) return;
      if (typeof $('col-print-dialog').showModal !== 'function') { message('This preview needs a recent browser. The checklist is still available as a CSV file.'); return; }
      fillPrint(); printTrigger = event.currentTarget; $('col-print-dialog').showModal();
    });
    $('col-close-print').addEventListener('click', () => $('col-print-dialog').close());
    $('col-print-dialog').addEventListener('close', () => { document.body.classList.remove('col-printing'); printTrigger?.focus(); });
    $('col-do-print').addEventListener('click', () => {
      document.body.classList.add('col-printing');
      try { window.print(); } catch (_) { document.body.classList.remove('col-printing'); message('Printing is unavailable in this browser. You can export the view as CSV.'); }
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('col-printing'));
    view.subscribe(refresh);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.hasAttribute('data-col-plan')) {
        const id = button.dataset.colPlan;
        if (core.getToolsState().plan.includes(id)) { removeFromPlan(id); message('Stop removed from your route.'); }
        else { addToPlan(id); message('Page added to your route. Change its order from the catalog.'); }
      } else if (button.hasAttribute('data-col-view-recall')) {
        const entry = toolState.savedViews.find(entry => entry.id === button.dataset.colViewRecall);
        if (entry && view) { view.applyFilters(entry.query); message('View “' + entry.name + '” restored.'); $('catalogue')?.scrollIntoView({block: 'start'}); $('col-search')?.focus({preventScroll: true}); }
      } else if (button.hasAttribute('data-col-view-delete')) {
        const next = core.getToolsState(); next.savedViews = next.savedViews.filter(entry => entry.id !== button.dataset.colViewDelete); commit(next); message('Saved search deleted.'); $('col-view-name')?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-remove')) {
        removeFromPlan(button.dataset.colPlanRemove); message('Stop removed from your route.'); ($('col-plan-list')?.querySelector('button:not(:disabled)') || $('col-plan-list'))?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-up') || button.hasAttribute('data-col-plan-down')) {
        const up = button.hasAttribute('data-col-plan-up'), id = up ? button.dataset.colPlanUp : button.dataset.colPlanDown;
        if (movePlan(id, up ? -1 : 1)) {
          const position = core.getToolsState().plan.indexOf(id) + 1; message('Stop moved to position ' + position + '.');
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
