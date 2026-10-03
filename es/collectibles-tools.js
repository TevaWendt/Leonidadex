/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
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
  const statuses = {confirmed: 'Confirmado', established: 'Bien establecido', unconfirmed: 'No confirmado'};
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
    if (!view || !hasCatalogue) throw new Error('Podrás guardar búsquedas en cuanto se publiquen las primeras fichas.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 64) throw new Error('Dale a esta búsqueda un nombre de 1 a 64 caracteres.');
    const query = canonicalQuery(), next = core.getToolsState();
    if (next.savedViews.length >= 12) throw new Error('Ya tienes 12 búsquedas. Quita una antes de guardar una vista nueva.');
    const existing = next.savedViews.find(entry => entry.query === query);
    if (existing) throw new Error('Esta vista ya está guardada como “' + existing.name + '”.');
    const id = 'view-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10));
    next.savedViews.push({id, name: name.trim(), query, createdAt: new Date().toISOString()});
    commit(next); return id;
  }
  function addToPlan(id) {
    if (!publicItem(id)) throw new Error('Esta ficha no está disponible en el catálogo actual.');
    const next = core.getToolsState();
    if (next.plan.includes(id)) return false;
    if (next.plan.length >= 30) throw new Error('Tu ruta ya tiene 30 paradas. Quita una para añadir otra.');
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
    const headers = ['ID', 'Nombre', 'Categoría', 'Región', 'Estado', 'Encontrado', 'Favorito', 'Ficha'];
    if (options.spoilers) headers.push('Zona', 'Lugar', 'Recompensa', 'Mapa');
    if (options.notes) headers.push('Nota personal');
    const rows = list.map(item => {
      const row = [item.id, item.name, categories.get(item.category) || item.category || '', item.region || '', statuses[item.status] || item.status, core.isTrackable(item) ? state.found[item.id] ? 'Sí' : 'No' : 'Seguimiento no disponible', state.favorites[item.id] ? 'Sí' : 'No', new URL(core.itemUrl(item) || '/es/collectibles.html', location.href).href];
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
      label.textContent = included ? '✓ En mi ruta' : 'Añadir a mi ruta';
      button.setAttribute('aria-label', (included ? 'Quitar de mi ruta: ' : 'Añadir a mi ruta: ') + (publicItem(id)?.name || 'ficha no disponible'));
    });
  }
  function renderSavedViews() {
    if (!$('col-saved-views')) return;
    $('col-saved-views').innerHTML = toolState.savedViews.length ? '<ul class="col-tools-list">' + toolState.savedViews.map(entry => '<li><button type="button" class="col-saved-recall" data-col-view-recall="' + esc(entry.id) + '"' + (!hasCatalogue ? ' disabled' : '') + '><strong>' + esc(entry.name) + '</strong><span>Volver a abrir los filtros guardados ↗</span></button><button type="button" class="col-tools-icon-btn" data-col-view-delete="' + esc(entry.id) + '" aria-label="Eliminar la búsqueda ' + esc(entry.name) + '">×</button></li>').join('') + '</ul>' : '<p class="col-tools-empty">' + (hasCatalogue ? 'Ajusta los filtros del catálogo y ponle un nombre a esta vista para recuperarla con un clic.' : 'En cuanto haya fichas, filtra el catálogo, ponle nombre a la vista y encuéntrala aquí.') + '</p>';
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
      const title = item ? item.name : 'Ficha no disponible: ' + id;
      const description = item ? [found ? 'Encontrado' : core.isTrackable(item) ? 'Por encontrar' : 'Seguimiento no disponible', item.region].filter(Boolean).join(' · ') : 'Identificador conservado para una futura publicación.';
      return '<li data-col-plan-row="' + esc(id) + '"><span class="col-plan-order">' + (index + 1) + '</span><div class="col-plan-copy">' + (item && core.itemUrl(item) ? '<a href="' + esc(core.itemUrl(item)) + '">' + esc(title) + '</a>' : '<strong>' + esc(title) + '</strong>') + '<span>' + esc(description) + '</span></div><div class="col-plan-actions"><button type="button" data-col-plan-up="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Subir la parada ' + esc(title) + '"' + (index === 0 ? ' disabled' : '') + '>↑</button><button type="button" data-col-plan-down="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Bajar la parada ' + esc(title) + '"' + (index === toolState.plan.length - 1 ? ' disabled' : '') + '>↓</button><button type="button" data-col-plan-remove="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Quitar la parada ' + esc(title) + '">×</button></div></li>';
    }).join('') : '<li class="col-tools-empty">' + (hasCatalogue ? 'Añade fichas con “Añadir a mi ruta” y elige aquí su orden.' : 'Tu próxima ruta tomará forma con las primeras fichas documentadas. No se inventa ninguna ubicación.') + '</li>';
    const candidates = toolState.plan.map(publicItem).filter(item => item && !(core.isTrackable(item) && state.found[item.id]));
    const next = candidates.find(item => core.mapUrl(item));
    $('col-plan-next').innerHTML = next ? '<a class="col-btn" href="' + esc(core.mapUrl(next)) + '">Próxima parada localizada: ' + esc(next.name) + ' ↗</a>' : toolState.plan.length ? '<p class="col-tools-empty">' + (candidates.length ? 'No hay ninguna ubicación verificada para las paradas que quedan.' : 'Todas las paradas disponibles y con seguimiento están encontradas; las fichas no disponibles se conservan.') + '</p>' : '';
  }
  function refresh() {
    toolState = core.getToolsState(); updatePlanButtons();
    if (!host || !view) return;
    renderSavedViews(); renderPlan();
    const count = items().length;
    $('col-tools-result-count').textContent = count + ' ficha' + (lkPluriel(count)?'s' : '') + ' en la vista actual';
    ['col-export-csv','col-print-checklist'].forEach(id => { $(id).disabled = count === 0; });
    if ($('col-tools-storage')) { const warning = core.getStorageStatus().message; $('col-tools-storage').hidden = !warning; $('col-tools-storage').textContent = warning; }
  }
  function downloadCSV() {
    const list = items(); if (!list.length) { message('No hay ninguna ficha en esta vista para exportar.'); return; }
    const blob = new Blob([makeCSV(list, exportOptions())], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'leonidakit-checklist-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Checklist CSV preparada: ' + list.length + ' ficha(s).' + (exportOptions().notes ? ' Incluye tus notas personales.' : ' Las notas personales quedan fuera.'));
  }
  function fillPrint() {
    const list = items(), state = core.getState(), options = exportOptions();
    const hasLocalFilters = !!view.getFilters().progress;
    $('col-print-content').innerHTML = '<div class="col-print-heading"><span>LEONIDAKIT · GTA VI</span><h2 id="col-print-title">Mi checklist de coleccionables</h2><p>' + list.length + ' ficha(s) · ' + esc(new Date().toLocaleDateString('es-ES')) + ' · ' + (hasLocalFilters ? 'Vista con tu cuaderno local' : 'Vista filtrada del catálogo') + '</p><p>El total del juego sigue siendo desconocido. La información no documentada no aparece.</p></div><ol class="col-print-list">' + list.map(item => {
      const found = core.isTrackable(item) && state.found[item.id];
      return '<li><div class="col-print-item-title"><span aria-label="' + (found ? 'Encontrado' : 'No encontrado') + '">' + (found ? '☑' : '☐') + '</span><h3>' + esc(item.name) + '</h3></div><p>' + esc([categories.get(item.category) || item.category, item.region, statuses[item.status], !core.isTrackable(item) ? 'Seguimiento no disponible' : ''].filter(Boolean).join(' · ')) + '</p>' + (options.spoilers && (item.place || item.reward) ? '<p>' + esc([item.place, item.reward ? 'Recompensa: ' + item.reward : ''].filter(Boolean).join(' · ')) + '</p>' : '') + (options.notes && state.notes[item.id] ? '<p class="col-print-note">Nota: ' + esc(state.notes[item.id]) + '</p>' : '') + '</li>';
    }).join('') + '</ol><p class="col-print-footer">Leonidakit · Sitio independiente · Checklist personal, sin conexión con ninguna partida guardada de GTA.</p>';
  }
  async function shareView() {
    const url = new URL('/es/collectibles.html', location.href); url.search = canonicalQuery(); url.hash = 'catalogue';
    const localFilter = !!view?.getFilters().progress;
    const note = localFilter ? ' El filtro de colección usará el cuaderno local de quien abra este enlace; tus hallazgos y notas no se comparten.' : ' El enlace solo contiene los filtros: ni notas ni datos guardados personales.';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('No se puede copiar');
      await navigator.clipboard.writeText(url.href); message('Enlace de la vista copiado.' + note);
      if ($('col-share-fallback')) $('col-share-fallback').hidden = true;
    } catch (_) {
      if ($('col-share-fallback')) {
        $('col-share-fallback').hidden = false; $('col-share-url').value = url.href; $('col-share-url').focus(); $('col-share-url').select();
        message('La copia automática no está disponible. Copia el enlace que aparece en el campo.' + note);
      } else message('La copia automática no está disponible. Copia la dirección de la página en tu navegador.');
    }
  }
  if (host && view) {
    host.innerHTML = '<div class="col-tools-heading"><div><p class="col-eyebrow">A TU MANERA</p><h2>Preparar la próxima ruta.</h2></div><p>Tus búsquedas, tu orden de exploración, tu checklist.</p></div><div class="col-tools-grid"><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Mis búsquedas</h3><p class="col-tools-what">Una búsqueda es un conjunto de filtros (región, familia, estado, palabra clave) guardado con un nombre. La recuperas con un clic en lugar de volver a marcarlo todo.</p><span id="col-saved-count">0 / 12</span></div><div id="col-saved-views"></div><form id="col-save-view-form"><label for="col-view-name">Nombre de esta vista</label><div class="col-save-view-row"><input id="col-view-name" maxlength="64" placeholder="Ej.: Mis favoritos en Vice City" autocomplete="off" required><button type="submit" id="col-save-view" class="col-btn">Guardar</button></div></form><p class="col-tools-fine">Se guardan los filtros, no una copia fija de los resultados. Tus vistas se actualizan con las próximas publicaciones.</p></section><section class="col-tools-panel col-plan-panel"><div class="col-tools-panel-head"><h3>Mi ruta</h3><p class="col-tools-what">Tu hoja de ruta para la próxima sesión: los objetos que vas a buscar, en el orden que elijas, hasta 30 paradas.</p><span id="col-plan-count">0 / 30</span></div><p class="col-tools-intro">Elige tus paradas y su orden. Esta lista personal no calcula ni el trayecto óptimo ni el tiempo de desplazamiento.</p><ol id="col-plan-list" class="col-plan-list"></ol><div id="col-plan-next"></div></section><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Llévate la checklist</h3><p class="col-tools-what">La lista que ves, exportada en archivo CSV o maquetada para imprimir, para marcarla en una segunda pantalla o en papel mientras juegas.</p><span aria-hidden="true">↗</span></div><p id="col-tools-result-count" class="col-tools-intro"></p><div class="col-tools-export-options"><label class="col-checkbox"><input type="checkbox" id="col-export-notes"> Incluir mis notas personales</label><label class="col-checkbox"><input type="checkbox" id="col-export-spoilers"> Incluir los lugares exactos y las recompensas</label></div><div class="col-tools-export-actions"><button type="button" id="col-export-csv" class="col-btn">Exportar la vista en CSV ↓</button><button type="button" id="col-print-checklist" class="col-btn">Preparar la impresión</button><button type="button" id="col-share-view" class="col-text-button">Compartir esta vista ↗</button></div><div id="col-share-fallback" hidden><label for="col-share-url">Enlace para copiar a mano</label><input id="col-share-url" type="text" readonly></div><p class="col-tools-fine">El CSV y la impresión siguen tus filtros. La copia de seguridad JSON del cuaderno también incluye tus búsquedas y tu ruta.</p></section></div><p id="col-tools-storage" class="col-notice col-warning" hidden></p><p data-col-tools-feedback class="col-tools-feedback" role="status" aria-live="polite"></p><dialog id="col-print-dialog" class="col-print-dialog" aria-labelledby="col-print-title"><div class="col-print-toolbar"><button type="button" id="col-do-print" class="col-btn col-btn-primary">Imprimir / Guardar en PDF</button><button type="button" id="col-close-print" class="col-btn">Cerrar la vista previa</button></div><div id="col-print-content"></div></dialog>';
    // Keep the printable dialog directly under body so print CSS can remove the page flow entirely.
    document.body.appendChild($('col-print-dialog'));
    $('col-plan-list').tabIndex = -1;
    $('col-save-view-form').addEventListener('submit', event => { event.preventDefault(); try { saveView($('col-view-name').value); $('col-view-name').value = ''; message('Búsqueda guardada en este navegador.'); } catch (error) { message(error.message); } });
    $('col-export-csv').addEventListener('click', () => { try { downloadCSV(); } catch (_) { message('No se ha podido preparar la descarga CSV. Tu cuaderno sigue intacto.'); } });
    $('col-share-view').addEventListener('click', shareView);
    $('col-print-checklist').addEventListener('click', event => {
      if (!items().length) return;
      if (typeof $('col-print-dialog').showModal !== 'function') { message('Esta vista previa necesita un navegador reciente. La checklist sigue disponible en formato CSV.'); return; }
      fillPrint(); printTrigger = event.currentTarget; $('col-print-dialog').showModal();
    });
    $('col-close-print').addEventListener('click', () => $('col-print-dialog').close());
    $('col-print-dialog').addEventListener('close', () => { document.body.classList.remove('col-printing'); printTrigger?.focus(); });
    $('col-do-print').addEventListener('click', () => {
      document.body.classList.add('col-printing');
      try { window.print(); } catch (_) { document.body.classList.remove('col-printing'); message('La impresión no está disponible en este navegador. Puedes exportar la vista en CSV.'); }
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('col-printing'));
    view.subscribe(refresh);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.hasAttribute('data-col-plan')) {
        const id = button.dataset.colPlan;
        if (core.getToolsState().plan.includes(id)) { removeFromPlan(id); message('Parada quitada de tu ruta.'); }
        else { addToPlan(id); message('Ficha añadida a tu ruta. Cambia su orden desde el catálogo.'); }
      } else if (button.hasAttribute('data-col-view-recall')) {
        const entry = toolState.savedViews.find(entry => entry.id === button.dataset.colViewRecall);
        if (entry && view) { view.applyFilters(entry.query); message('Vista “' + entry.name + '” restaurada.'); $('catalogue')?.scrollIntoView({block: 'start'}); $('col-search')?.focus({preventScroll: true}); }
      } else if (button.hasAttribute('data-col-view-delete')) {
        const next = core.getToolsState(); next.savedViews = next.savedViews.filter(entry => entry.id !== button.dataset.colViewDelete); commit(next); message('Búsqueda guardada eliminada.'); $('col-view-name')?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-remove')) {
        removeFromPlan(button.dataset.colPlanRemove); message('Parada quitada de tu ruta.'); ($('col-plan-list')?.querySelector('button:not(:disabled)') || $('col-plan-list'))?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-up') || button.hasAttribute('data-col-plan-down')) {
        const up = button.hasAttribute('data-col-plan-up'), id = up ? button.dataset.colPlanUp : button.dataset.colPlanDown;
        if (movePlan(id, up ? -1 : 1)) {
          const position = core.getToolsState().plan.indexOf(id) + 1; message('Parada movida a la posición ' + position + '.');
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
