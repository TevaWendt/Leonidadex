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
  const statuses = {confirmed: 'Confermato', established: 'Ben attestato', unconfirmed: 'Non confermato'};
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
    if (!view || !hasCatalogue) throw new Error('Potrai salvare le ricerche appena verranno pubblicate le prime schede.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 64) throw new Error('Dai a questa ricerca un nome da 1 a 64 caratteri.');
    const query = canonicalQuery(), next = core.getToolsState();
    if (next.savedViews.length >= 12) throw new Error('Hai già 12 ricerche. Rimuovine una prima di salvare una nuova vista.');
    const existing = next.savedViews.find(entry => entry.query === query);
    if (existing) throw new Error('Questa vista è già salvata come “' + existing.name + '”.');
    const id = 'view-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10));
    next.savedViews.push({id, name: name.trim(), query, createdAt: new Date().toISOString()});
    commit(next); return id;
  }
  function addToPlan(id) {
    if (!publicItem(id)) throw new Error('Questa scheda non è disponibile nel catalogo attuale.');
    const next = core.getToolsState();
    if (next.plan.includes(id)) return false;
    if (next.plan.length >= 30) throw new Error('Il tuo itinerario ha già 30 tappe. Togline una per aggiungerne un’altra.');
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
    const headers = ['ID', 'Nome', 'Categoria', 'Regione', 'Stato', 'Trovato', 'Preferito', 'Scheda'];
    if (options.spoilers) headers.push('Zona', 'Luogo', 'Ricompensa', 'Mappa');
    if (options.notes) headers.push('Nota personale');
    const rows = list.map(item => {
      const row = [item.id, item.name, categories.get(item.category) || item.category || '', item.region || '', statuses[item.status] || item.status, core.isTrackable(item) ? state.found[item.id] ? 'Sì' : 'No' : 'Monitoraggio non disponibile', state.favorites[item.id] ? 'Sì' : 'No', new URL(core.itemUrl(item) || '/it/collectibles.html', location.href).href];
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
      label.textContent = included ? '✓ Nel mio itinerario' : 'Aggiungi al mio itinerario';
      button.setAttribute('aria-label', (included ? 'Togli dal mio itinerario: ' : 'Aggiungi al mio itinerario: ') + (publicItem(id)?.name || 'scheda non disponibile'));
    });
  }
  function renderSavedViews() {
    if (!$('col-saved-views')) return;
    $('col-saved-views').innerHTML = toolState.savedViews.length ? '<ul class="col-tools-list">' + toolState.savedViews.map(entry => '<li><button type="button" class="col-saved-recall" data-col-view-recall="' + esc(entry.id) + '"' + (!hasCatalogue ? ' disabled' : '') + '><strong>' + esc(entry.name) + '</strong><span>Riapri i filtri salvati ↗</span></button><button type="button" class="col-tools-icon-btn" data-col-view-delete="' + esc(entry.id) + '" aria-label="Elimina la ricerca ' + esc(entry.name) + '">×</button></li>').join('') + '</ul>' : '<p class="col-tools-empty">' + (hasCatalogue ? 'Imposta i filtri del catalogo, poi dai un nome a questa vista per ritrovarla con un clic.' : 'Appena ci saranno delle schede, filtra il catalogo, dai un nome alla vista e ritrovala qui.') + '</p>';
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
      const title = item ? item.name : 'Scheda non disponibile: ' + id;
      const description = item ? [found ? 'Trovato' : core.isTrackable(item) ? 'Da trovare' : 'Monitoraggio non disponibile', item.region].filter(Boolean).join(' · ') : 'ID conservato per una pubblicazione futura.';
      return '<li data-col-plan-row="' + esc(id) + '"><span class="col-plan-order">' + (index + 1) + '</span><div class="col-plan-copy">' + (item && core.itemUrl(item) ? '<a href="' + esc(core.itemUrl(item)) + '">' + esc(title) + '</a>' : '<strong>' + esc(title) + '</strong>') + '<span>' + esc(description) + '</span></div><div class="col-plan-actions"><button type="button" data-col-plan-up="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Sposta in su la tappa ' + esc(title) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-col-plan-down="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Sposta in giù la tappa ' + esc(title) + '"' + (index === toolState.plan.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-col-plan-remove="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Togli la tappa ' + esc(title) + '">×</button></div></li>';
    }).join('') : '<li class="col-tools-empty">' + (hasCatalogue ? 'Aggiungi delle schede con “Aggiungi al mio itinerario”, poi scegli qui il loro ordine.' : 'Il tuo prossimo itinerario prenderà forma con le prime schede documentate. Nessuna posizione viene inventata.') + '</li>';
    const candidates = toolState.plan.map(publicItem).filter(item => item && !(core.isTrackable(item) && state.found[item.id]));
    const next = candidates.find(item => core.mapUrl(item));
    $('col-plan-next').innerHTML = next ? '<a class="col-btn" href="' + esc(core.mapUrl(next)) + '">Prossima tappa localizzata: ' + esc(next.name) + ' ↗</a>' : toolState.plan.length ? '<p class="col-tools-empty">' + (candidates.length ? 'Nessuna posizione verificata è disponibile per le tappe rimanenti.' : 'Tutte le tappe disponibili e monitorate sono state trovate; le schede non disponibili restano salvate.') + '</p>' : '';
  }
  function refresh() {
    toolState = core.getToolsState(); updatePlanButtons();
    if (!host || !view) return;
    renderSavedViews(); renderPlan();
    const count = items().length;
    $('col-tools-result-count').textContent = count + (lkPluriel(count)?' schede':' scheda') + ' nella vista attuale';
    ['col-export-csv','col-print-checklist'].forEach(id => { $(id).disabled = count === 0; });
    if ($('col-tools-storage')) { const warning = core.getStorageStatus().message; $('col-tools-storage').hidden = !warning; $('col-tools-storage').textContent = warning; }
  }
  function downloadCSV() {
    const list = items(); if (!list.length) { message('Nessuna scheda da esportare in questa vista.'); return; }
    const blob = new Blob([makeCSV(list, exportOptions())], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'leonidakit-checklist-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Checklist CSV pronta: ' + list.length + ' scheda/e.' + (exportOptions().notes ? ' Include le tue note personali.' : ' Le note personali restano escluse.'));
  }
  function fillPrint() {
    const list = items(), state = core.getState(), options = exportOptions();
    const hasLocalFilters = !!view.getFilters().progress;
    $('col-print-content').innerHTML = '<div class="col-print-heading"><span>LEONIDAKIT · GTA VI</span><h2 id="col-print-title">La mia checklist dei collezionabili</h2><p>' + list.length + ' scheda/e · ' + esc(new Date().toLocaleDateString('it-IT')) + ' · ' + (hasLocalFilters ? 'Vista basata sul tuo quaderno locale' : 'Vista filtrata del catalogo') + '</p><p>Il totale del gioco resta sconosciuto. Le informazioni non documentate restano fuori.</p></div><ol class="col-print-list">' + list.map(item => {
      const found = core.isTrackable(item) && state.found[item.id];
      return '<li><div class="col-print-item-title"><span aria-label="' + (found ? 'Trovato' : 'Non trovato') + '">' + (found ? '☑' : '☐') + '</span><h3>' + esc(item.name) + '</h3></div><p>' + esc([categories.get(item.category) || item.category, item.region, statuses[item.status], !core.isTrackable(item) ? 'Monitoraggio non disponibile' : ''].filter(Boolean).join(' · ')) + '</p>' + (options.spoilers && (item.place || item.reward) ? '<p>' + esc([item.place, item.reward ? 'Ricompensa: ' + item.reward : ''].filter(Boolean).join(' · ')) + '</p>' : '') + (options.notes && state.notes[item.id] ? '<p class="col-print-note">Nota: ' + esc(state.notes[item.id]) + '</p>' : '') + '</li>';
    }).join('') + '</ol><p class="col-print-footer">Leonidakit · Sito indipendente · Checklist personale, senza collegamento a un salvataggio di GTA.</p>';
  }
  async function shareView() {
    const url = new URL('/it/collectibles.html', location.href); url.search = canonicalQuery(); url.hash = 'catalogue';
    const localFilter = !!view?.getFilters().progress;
    const note = localFilter ? ' Il filtro della collezione userà il quaderno locale di chi apre questo link; i tuoi ritrovamenti e le tue note non vengono condivisi.' : ' Il link contiene solo i filtri, nessuna nota né salvataggio personale.';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Copia non disponibile');
      await navigator.clipboard.writeText(url.href); message('Link della vista copiato.' + note);
      if ($('col-share-fallback')) $('col-share-fallback').hidden = true;
    } catch (_) {
      if ($('col-share-fallback')) {
        $('col-share-fallback').hidden = false; $('col-share-url').value = url.href; $('col-share-url').focus(); $('col-share-url').select();
        message('La copia automatica non è disponibile. Copia il link mostrato nel campo.' + note);
      } else message('La copia automatica non è disponibile. Copia l’indirizzo della pagina dal tuo browser.');
    }
  }
  if (host && view) {
    host.innerHTML = '<div class="col-tools-heading"><div><p class="col-eyebrow">A MODO TUO</p><h2>Prepara il prossimo itinerario.</h2></div><p>Le tue ricerche, il tuo ordine di esplorazione, la tua checklist.</p></div><div class="col-tools-grid"><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Le mie ricerche</h3><p class="col-tools-what">Una ricerca è un insieme di filtri (regione, famiglia, stato, parola chiave) salvato con un nome. La richiami con un clic invece di rispuntare tutto.</p><span id="col-saved-count">0 / 12</span></div><div id="col-saved-views"></div><form id="col-save-view-form"><label for="col-view-name">Nome di questa vista</label><div class="col-save-view-row"><input id="col-view-name" maxlength="64" placeholder="Es. I miei preferiti a Vice City" autocomplete="off" required><button type="submit" id="col-save-view" class="col-btn">Salva</button></div></form><p class="col-tools-fine">Vengono salvati i filtri, non una copia fissa dei risultati. Le tue viste seguono le prossime pubblicazioni.</p></section><section class="col-tools-panel col-plan-panel"><div class="col-tools-panel-head"><h3>Il mio itinerario</h3><p class="col-tools-what">La tua tabella di marcia per la prossima sessione: gli oggetti da andare a prendere, nell’ordine che scegli tu, fino a 30 tappe.</p><span id="col-plan-count">0 / 30</span></div><p class="col-tools-intro">Scegli le tue tappe e il loro ordine. Questa lista personale non calcola né il percorso migliore né il tempo di spostamento.</p><ol id="col-plan-list" class="col-plan-list"></ol><div id="col-plan-next"></div></section><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Porta con te la checklist</h3><p class="col-tools-what">La lista mostrata, esportata in un file CSV o impaginata per la stampa, da spuntare su un secondo schermo o su carta mentre giochi.</p><span aria-hidden="true">↗</span></div><p id="col-tools-result-count" class="col-tools-intro"></p><div class="col-tools-export-options"><label class="col-checkbox"><input type="checkbox" id="col-export-notes"> Includi le mie note personali</label><label class="col-checkbox"><input type="checkbox" id="col-export-spoilers"> Includi luoghi precisi e ricompense</label></div><div class="col-tools-export-actions"><button type="button" id="col-export-csv" class="col-btn">Esporta la vista in CSV ↓</button><button type="button" id="col-print-checklist" class="col-btn">Prepara la stampa</button><button type="button" id="col-share-view" class="col-text-button">Condividi questa vista ↗</button></div><div id="col-share-fallback" hidden><label for="col-share-url">Link da copiare a mano</label><input id="col-share-url" type="text" readonly></div><p class="col-tools-fine">Il CSV e la stampa seguono i tuoi filtri. Il backup JSON del quaderno include anche le tue ricerche e il tuo itinerario.</p></section></div><p id="col-tools-storage" class="col-notice col-warning" hidden></p><p data-col-tools-feedback class="col-tools-feedback" role="status" aria-live="polite"></p><dialog id="col-print-dialog" class="col-print-dialog" aria-labelledby="col-print-title"><div class="col-print-toolbar"><button type="button" id="col-do-print" class="col-btn col-btn-primary">Stampa / Salva in PDF</button><button type="button" id="col-close-print" class="col-btn">Chiudi l’anteprima</button></div><div id="col-print-content"></div></dialog>';
    // Keep the printable dialog directly under body so print CSS can remove the page flow entirely.
    document.body.appendChild($('col-print-dialog'));
    $('col-plan-list').tabIndex = -1;
    $('col-save-view-form').addEventListener('submit', event => { event.preventDefault(); try { saveView($('col-view-name').value); $('col-view-name').value = ''; message('Ricerca salvata in questo browser.'); } catch (error) { message(error.message); } });
    $('col-export-csv').addEventListener('click', () => { try { downloadCSV(); } catch (_) { message('Non è stato possibile preparare il download CSV. Il tuo quaderno resta com’è.'); } });
    $('col-share-view').addEventListener('click', shareView);
    $('col-print-checklist').addEventListener('click', event => {
      if (!items().length) return;
      if (typeof $('col-print-dialog').showModal !== 'function') { message('Questa anteprima richiede un browser recente. La checklist resta disponibile in formato CSV.'); return; }
      fillPrint(); printTrigger = event.currentTarget; $('col-print-dialog').showModal();
    });
    $('col-close-print').addEventListener('click', () => $('col-print-dialog').close());
    $('col-print-dialog').addEventListener('close', () => { document.body.classList.remove('col-printing'); printTrigger?.focus(); });
    $('col-do-print').addEventListener('click', () => {
      document.body.classList.add('col-printing');
      try { window.print(); } catch (_) { document.body.classList.remove('col-printing'); message('La stampa non è disponibile in questo browser. Puoi esportare la vista in CSV.'); }
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('col-printing'));
    view.subscribe(refresh);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.hasAttribute('data-col-plan')) {
        const id = button.dataset.colPlan;
        if (core.getToolsState().plan.includes(id)) { removeFromPlan(id); message('Tappa tolta dal tuo itinerario.'); }
        else { addToPlan(id); message('Scheda aggiunta al tuo itinerario. Cambia il suo ordine dal catalogo.'); }
      } else if (button.hasAttribute('data-col-view-recall')) {
        const entry = toolState.savedViews.find(entry => entry.id === button.dataset.colViewRecall);
        if (entry && view) { view.applyFilters(entry.query); message('Vista “' + entry.name + '” ripristinata.'); $('catalogue')?.scrollIntoView({block: 'start'}); $('col-search')?.focus({preventScroll: true}); }
      } else if (button.hasAttribute('data-col-view-delete')) {
        const next = core.getToolsState(); next.savedViews = next.savedViews.filter(entry => entry.id !== button.dataset.colViewDelete); commit(next); message('Ricerca salvata eliminata.'); $('col-view-name')?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-remove')) {
        removeFromPlan(button.dataset.colPlanRemove); message('Tappa tolta dal tuo itinerario.'); ($('col-plan-list')?.querySelector('button:not(:disabled)') || $('col-plan-list'))?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-up') || button.hasAttribute('data-col-plan-down')) {
        const up = button.hasAttribute('data-col-plan-up'), id = up ? button.dataset.colPlanUp : button.dataset.colPlanDown;
        if (movePlan(id, up ? -1 : 1)) {
          const position = core.getToolsState().plan.indexOf(id) + 1; message('Tappa spostata in posizione ' + position + '.');
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
