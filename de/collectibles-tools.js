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
  const statuses = {confirmed: 'Bestätigt', established: 'Stark belegt', unconfirmed: 'Unbestätigt'};
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
    if (!view || !hasCatalogue) throw new Error('Suchen können gespeichert werden, sobald die ersten Seiten veröffentlicht sind.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 64) throw new Error('Gib dieser Suche einen Namen mit 1 bis 64 Zeichen.');
    const query = canonicalQuery(), next = core.getToolsState();
    if (next.savedViews.length >= 12) throw new Error('Du hast schon 12 Suchen. Entferne eine, bevor du eine neue Ansicht speicherst.');
    const existing = next.savedViews.find(entry => entry.query === query);
    if (existing) throw new Error('Diese Ansicht ist bereits gespeichert als „' + existing.name + '“.');
    const id = 'view-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10));
    next.savedViews.push({id, name: name.trim(), query, createdAt: new Date().toISOString()});
    commit(next); return id;
  }
  function addToPlan(id) {
    if (!publicItem(id)) throw new Error('Diese Seite ist im aktuellen Katalog nicht verfügbar.');
    const next = core.getToolsState();
    if (next.plan.includes(id)) return false;
    if (next.plan.length >= 30) throw new Error('Deine Tour enthält bereits 30 Stopps. Entferne einen Stopp, um einen neuen hinzuzufügen.');
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
    const headers = ['ID', 'Name', 'Kategorie', 'Region', 'Status', 'Gefunden', 'Favorit', 'Seite'];
    if (options.spoilers) headers.push('Gebiet', 'Ort', 'Belohnung', 'Karte');
    if (options.notes) headers.push('Eigene Notiz');
    const rows = list.map(item => {
      const row = [item.id, item.name, categories.get(item.category) || item.category || '', item.region || '', statuses[item.status] || item.status, core.isTrackable(item) ? state.found[item.id] ? 'Ja' : 'Nein' : 'Tracking nicht verfügbar', state.favorites[item.id] ? 'Ja' : 'Nein', new URL(core.itemUrl(item) || '/de/collectibles.html', location.href).href];
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
      label.textContent = included ? '✓ In meiner Tour' : 'Zu meiner Tour hinzufügen';
      button.setAttribute('aria-label', (included ? 'Aus meiner Tour entfernen: ' : 'Zu meiner Tour hinzufügen: ') + (publicItem(id)?.name || 'Seite nicht verfügbar'));
    });
  }
  function renderSavedViews() {
    if (!$('col-saved-views')) return;
    $('col-saved-views').innerHTML = toolState.savedViews.length ? '<ul class="col-tools-list">' + toolState.savedViews.map(entry => '<li><button type="button" class="col-saved-recall" data-col-view-recall="' + esc(entry.id) + '"' + (!hasCatalogue ? ' disabled' : '') + '><strong>' + esc(entry.name) + '</strong><span>Gespeicherte Filter wieder öffnen ↗</span></button><button type="button" class="col-tools-icon-btn" data-col-view-delete="' + esc(entry.id) + '" aria-label="Suche löschen ' + esc(entry.name) + '">×</button></li>').join('') + '</ul>' : '<p class="col-tools-empty">' + (hasCatalogue ? 'Stell die Filter des Katalogs ein und gib dieser Ansicht dann einen Namen, um sie mit einem Klick wiederzufinden.' : 'Sobald es Seiten gibt, filtere den Katalog, benenne die Ansicht und finde sie hier wieder.') + '</p>';
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
      const title = item ? item.name : 'Seite nicht verfügbar: ' + id;
      const description = item ? [found ? 'Gefunden' : core.isTrackable(item) ? 'Zu finden' : 'Tracking nicht verfügbar', item.region].filter(Boolean).join(' · ') : 'ID für eine künftige Veröffentlichung aufbewahrt.';
      return '<li data-col-plan-row="' + esc(id) + '"><span class="col-plan-order">' + (index + 1) + '</span><div class="col-plan-copy">' + (item && core.itemUrl(item) ? '<a href="' + esc(core.itemUrl(item)) + '">' + esc(title) + '</a>' : '<strong>' + esc(title) + '</strong>') + '<span>' + esc(description) + '</span></div><div class="col-plan-actions"><button type="button" data-col-plan-up="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Stopp nach oben ' + esc(title) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-col-plan-down="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Stopp nach unten ' + esc(title) + '"' + (index === toolState.plan.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-col-plan-remove="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Stopp entfernen ' + esc(title) + '">×</button></div></li>';
    }).join('') : '<li class="col-tools-empty">' + (hasCatalogue ? 'Füge Seiten mit „Zu meiner Tour hinzufügen“ hinzu und wähle hier ihre Reihenfolge.' : 'Deine nächste Tour nimmt mit den ersten dokumentierten Seiten Gestalt an. Kein Standort ist erfunden.') + '</li>';
    const candidates = toolState.plan.map(publicItem).filter(item => item && !(core.isTrackable(item) && state.found[item.id]));
    const next = candidates.find(item => core.mapUrl(item));
    $('col-plan-next').innerHTML = next ? '<a class="col-btn" href="' + esc(core.mapUrl(next)) + '">Nächster Stopp mit Standort: ' + esc(next.name) + ' ↗</a>' : toolState.plan.length ? '<p class="col-tools-empty">' + (candidates.length ? 'Für die übrigen Stopps ist kein geprüfter Standort verfügbar.' : 'Alle verfügbaren und verfolgten Stopps sind gefunden; nicht verfügbare Seiten bleiben erhalten.') + '</p>' : '';
  }
  function refresh() {
    toolState = core.getToolsState(); updatePlanButtons();
    if (!host || !view) return;
    renderSavedViews(); renderPlan();
    const count = items().length;
    $('col-tools-result-count').textContent = count + (lkPluriel(count)?' Seiten':' Seite') + ' in der aktuellen Ansicht';
    ['col-export-csv','col-print-checklist'].forEach(id => { $(id).disabled = count === 0; });
    if ($('col-tools-storage')) { const warning = core.getStorageStatus().message; $('col-tools-storage').hidden = !warning; $('col-tools-storage').textContent = warning; }
  }
  function downloadCSV() {
    const list = items(); if (!list.length) { message('Keine Seite in dieser Ansicht zum Exportieren.'); return; }
    const blob = new Blob([makeCSV(list, exportOptions())], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'leonidakit-checklist-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('CSV-Checkliste bereit: ' + list.length + ' Seite(n).' + (exportOptions().notes ? ' Sie enthält deine eigenen Notizen.' : ' Deine eigenen Notizen sind nicht enthalten.'));
  }
  function fillPrint() {
    const list = items(), state = core.getState(), options = exportOptions();
    const hasLocalFilters = !!view.getFilters().progress;
    $('col-print-content').innerHTML = '<div class="col-print-heading"><span>LEONIDAKIT · GTA VI</span><h2 id="col-print-title">Meine Sammelobjekt-Checkliste</h2><p>' + list.length + ' Seite(n) · ' + esc(new Date().toLocaleDateString('de-DE')) + ' · ' + (hasLocalFilters ? 'Ansicht mit deinem lokalen Tracker' : 'Gefilterte Katalogansicht') + '</p><p>Die Gesamtzahl im Spiel ist noch unbekannt. Nicht dokumentierte Informationen bleiben weg.</p></div><ol class="col-print-list">' + list.map(item => {
      const found = core.isTrackable(item) && state.found[item.id];
      return '<li><div class="col-print-item-title"><span aria-label="' + (found ? 'Gefunden' : 'Nicht gefunden') + '">' + (found ? '☑' : '☐') + '</span><h3>' + esc(item.name) + '</h3></div><p>' + esc([categories.get(item.category) || item.category, item.region, statuses[item.status], !core.isTrackable(item) ? 'Tracking nicht verfügbar' : ''].filter(Boolean).join(' · ')) + '</p>' + (options.spoilers && (item.place || item.reward) ? '<p>' + esc([item.place, item.reward ? 'Belohnung: ' + item.reward : ''].filter(Boolean).join(' · ')) + '</p>' : '') + (options.notes && state.notes[item.id] ? '<p class="col-print-note">Notiz: ' + esc(state.notes[item.id]) + '</p>' : '') + '</li>';
    }).join('') + '</ol><p class="col-print-footer">Leonidakit · Unabhängige Seite · Persönliche Checkliste, ohne Verbindung zu einem GTA-Spielstand.</p>';
  }
  async function shareView() {
    const url = new URL('/de/collectibles.html', location.href); url.search = canonicalQuery(); url.hash = 'catalogue';
    const localFilter = !!view?.getFilters().progress;
    const note = localFilter ? ' Der Sammelfilter nutzt den lokalen Tracker der Person, die diesen Link öffnet; deine Funde und Notizen werden nicht geteilt.' : ' Der Link enthält nur die Filter, keine Notizen und keine persönliche Sicherung.';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Kopieren nicht verfügbar');
      await navigator.clipboard.writeText(url.href); message('Link zur Ansicht kopiert.' + note);
      if ($('col-share-fallback')) $('col-share-fallback').hidden = true;
    } catch (_) {
      if ($('col-share-fallback')) {
        $('col-share-fallback').hidden = false; $('col-share-url').value = url.href; $('col-share-url').focus(); $('col-share-url').select();
        message('Automatisches Kopieren ist nicht verfügbar. Kopiere den Link aus dem Feld.' + note);
      } else message('Automatisches Kopieren ist nicht verfügbar. Kopiere die Adresse der Seite aus deinem Browser.');
    }
  }
  if (host && view) {
    host.innerHTML = '<div class="col-tools-heading"><div><p class="col-eyebrow">AUF DEINE ART</p><h2>Die nächste Tour vorbereiten.</h2></div><p>Deine Suchen, deine Erkundungsreihenfolge, deine Checkliste.</p></div><div class="col-tools-grid"><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Meine Suchen</h3><p class="col-tools-what">Eine Suche ist ein Satz Filter (Region, Gruppe, Status, Stichwort), unter einem Namen gespeichert. Du rufst sie mit einem Klick auf, statt alles neu anzuhaken.</p><span id="col-saved-count">0 / 12</span></div><div id="col-saved-views"></div><form id="col-save-view-form"><label for="col-view-name">Name dieser Ansicht</label><div class="col-save-view-row"><input id="col-view-name" maxlength="64" placeholder="z. B. Meine Favoriten in Vice City" autocomplete="off" required><button type="submit" id="col-save-view" class="col-btn">Speichern</button></div></form><p class="col-tools-fine">Gespeichert werden die Filter, keine eingefrorene Kopie der Ergebnisse. Deine Ansichten passen sich neuen Veröffentlichungen an.</p></section><section class="col-tools-panel col-plan-panel"><div class="col-tools-panel-head"><h3>Meine Tour</h3><p class="col-tools-what">Dein Fahrplan für die nächste Session: die Objekte, die du holen willst, in der Reihenfolge deiner Wahl, bis zu 30 Stopps.</p><span id="col-plan-count">0 / 30</span></div><p class="col-tools-intro">Wähle deine Stopps und ihre Reihenfolge. Diese persönliche Liste berechnet weder die beste Route noch Wegzeiten.</p><ol id="col-plan-list" class="col-plan-list"></ol><div id="col-plan-next"></div></section><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Checkliste mitnehmen</h3><p class="col-tools-what">Die angezeigte Liste, als CSV-Datei exportiert oder druckfertig gesetzt, zum Abhaken auf einem zweiten Bildschirm oder auf Papier, während du spielst.</p><span aria-hidden="true">↗</span></div><p id="col-tools-result-count" class="col-tools-intro"></p><div class="col-tools-export-options"><label class="col-checkbox"><input type="checkbox" id="col-export-notes"> Meine eigenen Notizen einschließen</label><label class="col-checkbox"><input type="checkbox" id="col-export-spoilers"> Genaue Orte und Belohnungen einschließen</label></div><div class="col-tools-export-actions"><button type="button" id="col-export-csv" class="col-btn">Ansicht als CSV exportieren ↓</button><button type="button" id="col-print-checklist" class="col-btn">Druck vorbereiten</button><button type="button" id="col-share-view" class="col-text-button">Diese Ansicht teilen ↗</button></div><div id="col-share-fallback" hidden><label for="col-share-url">Link zum manuellen Kopieren</label><input id="col-share-url" type="text" readonly></div><p class="col-tools-fine">CSV und Ausdruck folgen deinen Filtern. Die JSON-Sicherung des Trackers enthält auch deine Suchen und deine Tour.</p></section></div><p id="col-tools-storage" class="col-notice col-warning" hidden></p><p data-col-tools-feedback class="col-tools-feedback" role="status" aria-live="polite"></p><dialog id="col-print-dialog" class="col-print-dialog" aria-labelledby="col-print-title"><div class="col-print-toolbar"><button type="button" id="col-do-print" class="col-btn col-btn-primary">Drucken / Als PDF speichern</button><button type="button" id="col-close-print" class="col-btn">Vorschau schließen</button></div><div id="col-print-content"></div></dialog>';
    // Keep the printable dialog directly under body so print CSS can remove the page flow entirely.
    document.body.appendChild($('col-print-dialog'));
    $('col-plan-list').tabIndex = -1;
    $('col-save-view-form').addEventListener('submit', event => { event.preventDefault(); try { saveView($('col-view-name').value); $('col-view-name').value = ''; message('Suche in diesem Browser gespeichert.'); } catch (error) { message(error.message); } });
    $('col-export-csv').addEventListener('click', () => { try { downloadCSV(); } catch (_) { message('Der CSV-Download konnte nicht vorbereitet werden. Dein Tracker bleibt erhalten.'); } });
    $('col-share-view').addEventListener('click', shareView);
    $('col-print-checklist').addEventListener('click', event => {
      if (!items().length) return;
      if (typeof $('col-print-dialog').showModal !== 'function') { message('Diese Vorschau braucht einen aktuellen Browser. Die Checkliste bleibt als CSV verfügbar.'); return; }
      fillPrint(); printTrigger = event.currentTarget; $('col-print-dialog').showModal();
    });
    $('col-close-print').addEventListener('click', () => $('col-print-dialog').close());
    $('col-print-dialog').addEventListener('close', () => { document.body.classList.remove('col-printing'); printTrigger?.focus(); });
    $('col-do-print').addEventListener('click', () => {
      document.body.classList.add('col-printing');
      try { window.print(); } catch (_) { document.body.classList.remove('col-printing'); message('Drucken ist in diesem Browser nicht verfügbar. Du kannst die Ansicht als CSV exportieren.'); }
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('col-printing'));
    view.subscribe(refresh);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.hasAttribute('data-col-plan')) {
        const id = button.dataset.colPlan;
        if (core.getToolsState().plan.includes(id)) { removeFromPlan(id); message('Stopp aus deiner Tour entfernt.'); }
        else { addToPlan(id); message('Seite zu deiner Tour hinzugefügt. Ändere ihre Reihenfolge im Katalog.'); }
      } else if (button.hasAttribute('data-col-view-recall')) {
        const entry = toolState.savedViews.find(entry => entry.id === button.dataset.colViewRecall);
        if (entry && view) { view.applyFilters(entry.query); message('Ansicht „' + entry.name + '“ wiederhergestellt.'); $('catalogue')?.scrollIntoView({block: 'start'}); $('col-search')?.focus({preventScroll: true}); }
      } else if (button.hasAttribute('data-col-view-delete')) {
        const next = core.getToolsState(); next.savedViews = next.savedViews.filter(entry => entry.id !== button.dataset.colViewDelete); commit(next); message('Gespeicherte Suche gelöscht.'); $('col-view-name')?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-remove')) {
        removeFromPlan(button.dataset.colPlanRemove); message('Stopp aus deiner Tour entfernt.'); ($('col-plan-list')?.querySelector('button:not(:disabled)') || $('col-plan-list'))?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-up') || button.hasAttribute('data-col-plan-down')) {
        const up = button.hasAttribute('data-col-plan-up'), id = up ? button.dataset.colPlanUp : button.dataset.colPlanDown;
        if (movePlan(id, up ? -1 : 1)) {
          const position = core.getToolsState().plan.indexOf(id) + 1; message('Stopp verschoben auf Position ' + position + '.');
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
