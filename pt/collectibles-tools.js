/* Généré depuis outils/sources/collectibles-tools.js : modifie la source, pas ce fichier. */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
(function () {
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; };
  const core = window.LKCollectibles, view = window.LKCollectiblesView;
  if (!core?.getToolsState) return;
  const host = document.getElementById('col-tools');
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
  const publicItem = id => { const item = core.getItem(id); return item && item.published !== false && item.status !== 'placeholder' ? item : null; };
  const items = () => view ? view.getFilteredItems() : [];
  const categories = new Map((window.LK_COLLECTIBLES?.categories || []).map(category => [category.id, category.name]));
  const statuses = {confirmed: 'Confirmado', established: 'Solidamente comprovado', unconfirmed: 'Não confirmado'};
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
    if (!view || !hasCatalogue) throw new Error('As buscas poderão ser salvas assim que as primeiras fichas forem publicadas.');
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 64) throw new Error('Dê a esta busca um nome de 1 a 64 caracteres.');
    const query = canonicalQuery(), next = core.getToolsState();
    if (next.savedViews.length >= 12) throw new Error('Você já tem 12 buscas. Remova uma antes de salvar uma nova visualização.');
    const existing = next.savedViews.find(entry => entry.query === query);
    if (existing) throw new Error('Esta visualização já está salva como “' + existing.name + '”.');
    const id = 'view-' + (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10));
    next.savedViews.push({id, name: name.trim(), query, createdAt: new Date().toISOString()});
    commit(next); return id;
  }
  function addToPlan(id) {
    if (!publicItem(id)) throw new Error('Esta ficha não está disponível no catálogo atual.');
    const next = core.getToolsState();
    if (next.plan.includes(id)) return false;
    if (next.plan.length >= 30) throw new Error('Seu roteiro já tem 30 paradas. Remova uma parada para adicionar outra.');
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
    if (/^\s*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function makeCSV(list, options = {}) {
    const state = core.getState();
    const headers = ['ID', 'Nome', 'Categoria', 'Região', 'Status', 'Encontrado', 'Favorito', 'Ficha'];
    if (options.spoilers) headers.push('Zona', 'Lugar', 'Recompensa', 'Mapa');
    if (options.notes) headers.push('Anotação pessoal');
    const rows = list.map(item => {
      const row = [item.id, item.name, categories.get(item.category) || item.category || '', item.region || '', statuses[item.status] || item.status, core.isTrackable(item) ? state.found[item.id] ? 'Sim' : 'Não' : 'Acompanhamento indisponível', state.favorites[item.id] ? 'Sim' : 'Não', new URL(core.itemUrl(item) || '/pt/collectibles.html', location.href).href];
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
      label.textContent = included ? '✓ No meu roteiro' : 'Adicionar ao meu roteiro';
      button.setAttribute('aria-label', (included ? 'Remover do meu roteiro: ' : 'Adicionar ao meu roteiro: ') + (publicItem(id)?.name || 'ficha indisponível'));
    });
  }
  function renderSavedViews() {
    if (!$('col-saved-views')) return;
    $('col-saved-views').innerHTML = toolState.savedViews.length ? '<ul class="col-tools-list">' + toolState.savedViews.map(entry => '<li><button type="button" class="col-saved-recall" data-col-view-recall="' + esc(entry.id) + '"' + (!hasCatalogue ? ' disabled' : '') + '><strong>' + esc(entry.name) + '</strong><span>Reabrir os filtros salvos ↗</span></button><button type="button" class="col-tools-icon-btn" data-col-view-delete="' + esc(entry.id) + '" aria-label="Excluir a busca ' + esc(entry.name) + '">×</button></li>').join('') + '</ul>' : '<p class="col-tools-empty">' + (hasCatalogue ? 'Defina os filtros do catálogo e depois dê um nome a esta visualização para reencontrá-la com um clique.' : 'Assim que existirem fichas, filtre o catálogo, dê um nome à visualização e encontre-a aqui.') + '</p>';
    if ($('col-save-view')) $('col-save-view').disabled = !hasCatalogue || toolState.savedViews.length >= 12;
    if ($('col-view-name')) $('col-view-name').disabled = !hasCatalogue;
    $('col-saved-count').textContent = toolState.savedViews.length + ' de 12';
  }
  function renderPlan() {
    if (!$('col-plan-list')) return;
    const state = core.getState();
    $('col-plan-count').textContent = toolState.plan.length + ' de 30';
    $('col-plan-list').innerHTML = toolState.plan.length ? toolState.plan.map((id,index) => {
      const item = publicItem(id), found = item && core.isTrackable(item) && state.found[id];
      const title = item ? item.name : 'Ficha indisponível: ' + id;
      const description = item ? [found ? 'Encontrado' : core.isTrackable(item) ? 'Para encontrar' : 'Acompanhamento indisponível', item.region].filter(Boolean).join(', ') : 'Identificador mantido para uma futura publicação.';
      return '<li data-col-plan-row="' + esc(id) + '"><span class="col-plan-order">' + (index + 1) + '</span><div class="col-plan-copy">' + (item && core.itemUrl(item) ? '<a href="' + esc(core.itemUrl(item)) + '">' + esc(title) + '</a>' : '<strong>' + esc(title) + '</strong>') + '<span>' + esc(description) + '</span></div><div class="col-plan-actions"><button type="button" data-col-plan-up="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Subir a parada ' + esc(title) + '"' + (index === 0 ? ' disabled' : '') + '><svg class="lk-chev lk-chev--up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button><button type="button" data-col-plan-down="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Descer a parada ' + esc(title) + '"' + (index === toolState.plan.length - 1 ? ' disabled' : '') + '><svg class="lk-chev lk-chev--down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button><button type="button" data-col-plan-remove="' + esc(id) + '" class="col-tools-icon-btn" aria-label="Remover a parada ' + esc(title) + '">×</button></div></li>';
    }).join('') : '<li class="col-tools-empty">' + (hasCatalogue ? 'Adicione fichas com “Adicionar ao meu roteiro” e escolha a ordem delas aqui.' : 'Seu próximo roteiro vai tomar forma com as primeiras fichas documentadas. Nenhuma localização é inventada.') + '</li>';
    const candidates = toolState.plan.map(publicItem).filter(item => item && !(core.isTrackable(item) && state.found[item.id]));
    const next = candidates.find(item => core.mapUrl(item));
    $('col-plan-next').innerHTML = next ? '<a class="col-btn" href="' + esc(core.mapUrl(next)) + '">Próxima parada localizada: ' + esc(next.name) + ' ↗</a>' : toolState.plan.length ? '<p class="col-tools-empty">' + (candidates.length ? 'Nenhuma localização verificada está disponível para as paradas restantes.' : 'Todas as paradas disponíveis e acompanhadas foram encontradas; as fichas indisponíveis continuam mantidas.') + '</p>' : '';
  }
  function refresh() {
    toolState = core.getToolsState(); updatePlanButtons();
    if (!host || !view) return;
    renderSavedViews(); renderPlan();
    const count = items().length;
    $('col-tools-result-count').textContent = count + (lkPluriel(count)?' fichas':' ficha') + ' na visualização atual';
    ['col-export-csv','col-print-checklist'].forEach(id => { $(id).disabled = count === 0; });
    if ($('col-tools-storage')) { const warning = core.getStorageStatus().message; $('col-tools-storage').hidden = !warning; $('col-tools-storage').textContent = warning; }
  }
  function downloadCSV() {
    const list = items(); if (!list.length) { message('Nenhuma ficha para exportar nesta visualização.'); return; }
    const blob = new Blob([makeCSV(list, exportOptions())], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob), link = document.createElement('a');
    link.href = url; link.download = 'leonidakit-checklist-' + new Date().toISOString().slice(0,10) + '.csv';
    document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    message('Checklist CSV pronta: ' + list.length + ' ficha(s).' + (exportOptions().notes ? ' Ela inclui suas anotações pessoais.' : ' As anotações pessoais ficam de fora.'));
  }
  function fillPrint() {
    const list = items(), state = core.getState(), options = exportOptions();
    const hasLocalFilters = !!view.getFilters().progress;
    $('col-print-content').innerHTML = '<div class="col-print-heading"><span>LEONIDAKIT, GTA VI</span><h2 id="col-print-title">Minha checklist de colecionáveis</h2><p>' + list.length + ' ficha(s), ' + esc(new Date().toLocaleDateString('pt-BR')) + ', ' + (hasLocalFilters ? 'Visualização com o seu caderno local' : 'Visualização filtrada do catálogo') + '</p><p>O total do jogo continua desconhecido. As informações não documentadas ficam de fora.</p></div><ol class="col-print-list">' + list.map(item => {
      const found = core.isTrackable(item) && state.found[item.id];
      return '<li><div class="col-print-item-title"><span aria-label="' + (found ? 'Encontrado' : 'Não encontrado') + '">' + (found ? '☑' : '☐') + '</span><h3>' + esc(item.name) + '</h3></div><p>' + esc([categories.get(item.category) || item.category, item.region, statuses[item.status], !core.isTrackable(item) ? 'Acompanhamento indisponível' : ''].filter(Boolean).join(', ')) + '</p>' + (options.spoilers && (item.place || item.reward) ? '<p>' + esc([item.place, item.reward ? 'Recompensa: ' + item.reward : ''].filter(Boolean).join(', ')) + '</p>' : '') + (options.notes && state.notes[item.id] ? '<p class="col-print-note">Anotação: ' + esc(state.notes[item.id]) + '</p>' : '') + '</li>';
    }).join('') + '</ol><p class="col-print-footer">Leonidakit, site independente. Checklist pessoal, sem ligação com nenhum save de GTA.</p>';
  }
  async function shareView() {
    const url = new URL('/pt/collectibles.html', location.href); url.search = canonicalQuery(); url.hash = 'catalogue';
    const localFilter = !!view?.getFilters().progress;
    const note = localFilter ? ' O filtro de coleção vai usar o caderno local de quem abrir este link; seus achados e anotações não são compartilhados.' : ' O link contém apenas os filtros, sem anotações nem dados salvos pessoais.';
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Cópia indisponível');
      await navigator.clipboard.writeText(url.href); message('Link da visualização copiado.' + note);
      if ($('col-share-fallback')) $('col-share-fallback').hidden = true;
    } catch (_) {
      if ($('col-share-fallback')) {
        $('col-share-fallback').hidden = false; $('col-share-url').value = url.href; $('col-share-url').focus(); $('col-share-url').select();
        message('A cópia automática está indisponível. Copie o link exibido no campo.' + note);
      } else message('A cópia automática está indisponível. Copie o endereço da página no seu navegador.');
    }
  }
  if (host && view) {
    host.innerHTML = '<div class="col-tools-heading"><div><p class="col-eyebrow">DO SEU JEITO</p><h2>Preparar o próximo roteiro.</h2></div><p>Suas buscas, sua ordem de exploração, sua checklist.</p></div><div class="col-tools-grid"><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Minhas buscas</h3><p class="col-tools-what">Uma busca é um conjunto de filtros (região, categoria, status, palavra-chave) salvo com um nome. Você a recupera com um clique em vez de marcar tudo de novo.</p><span id="col-saved-count">0 de 12</span></div><div id="col-saved-views"></div><form id="col-save-view-form"><label for="col-view-name">Nome desta visualização</label><div class="col-save-view-row"><input id="col-view-name" maxlength="64" placeholder="Ex.: Meus favoritos em Vice City" autocomplete="off" required><button type="submit" id="col-save-view" class="col-btn">Salvar</button></div></form><p class="col-tools-fine">Os filtros são guardados, não uma cópia fixa dos resultados. Suas visualizações acompanham as próximas publicações.</p></section><section class="col-tools-panel col-plan-panel"><div class="col-tools-panel-head"><h3>Meu roteiro</h3><p class="col-tools-what">Seu roteiro para a próxima sessão: os itens que você vai buscar, na ordem que escolher, em até 30 paradas.</p><span id="col-plan-count">0 de 30</span></div><p class="col-tools-intro">Escolha suas paradas e a ordem delas. Esta lista pessoal não calcula trajeto ideal nem tempo de deslocamento.</p><ol id="col-plan-list" class="col-plan-list"></ol><div id="col-plan-next"></div></section><section class="col-tools-panel"><div class="col-tools-panel-head"><h3>Levar a checklist</h3><p class="col-tools-what">A lista exibida, exportada em arquivo CSV ou formatada para impressão, para marcar em uma segunda tela ou no papel enquanto você joga.</p><span aria-hidden="true">↗</span></div><p id="col-tools-result-count" class="col-tools-intro"></p><div class="col-tools-export-options"><label class="col-checkbox"><input type="checkbox" id="col-export-notes"> Incluir minhas anotações pessoais</label><label class="col-checkbox"><input type="checkbox" id="col-export-spoilers"> Incluir os lugares exatos e as recompensas</label></div><div class="col-tools-export-actions"><button type="button" id="col-export-csv" class="col-btn">Exportar a visualização em CSV</button><button type="button" id="col-print-checklist" class="col-btn">Preparar a impressão</button><button type="button" id="col-share-view" class="col-text-button">Compartilhar esta visualização ↗</button></div><div id="col-share-fallback" hidden><label for="col-share-url">Link para copiar manualmente</label><input id="col-share-url" type="text" readonly></div><p class="col-tools-fine">O CSV e a impressão seguem seus filtros. O backup JSON do caderno também inclui suas buscas e seu roteiro.</p></section></div><p id="col-tools-storage" class="col-notice col-warning" hidden></p><p data-col-tools-feedback class="col-tools-feedback" role="status" aria-live="polite"></p><dialog id="col-print-dialog" class="col-print-dialog" aria-labelledby="col-print-title"><div class="col-print-toolbar"><button type="button" id="col-do-print" class="col-btn col-btn-primary">Imprimir ou salvar em PDF</button><button type="button" id="col-close-print" class="col-btn">Fechar a pré-visualização</button></div><div id="col-print-content"></div></dialog>';
    document.body.appendChild($('col-print-dialog'));
    $('col-plan-list').tabIndex = -1;
    $('col-save-view-form').addEventListener('submit', event => { event.preventDefault(); try { saveView($('col-view-name').value); $('col-view-name').value = ''; message('Busca salva neste navegador.'); } catch (error) { message(error.message); } });
    $('col-export-csv').addEventListener('click', () => { try { downloadCSV(); } catch (_) { message('Não foi possível preparar o download do CSV. Seu caderno foi mantido.'); } });
    $('col-share-view').addEventListener('click', shareView);
    $('col-print-checklist').addEventListener('click', event => {
      if (!items().length) return;
      if (typeof $('col-print-dialog').showModal !== 'function') { message('Esta pré-visualização exige um navegador recente. A checklist continua disponível em CSV.'); return; }
      fillPrint(); printTrigger = event.currentTarget; $('col-print-dialog').showModal();
    });
    $('col-close-print').addEventListener('click', () => $('col-print-dialog').close());
    $('col-print-dialog').addEventListener('close', () => { document.body.classList.remove('col-printing'); printTrigger?.focus(); });
    $('col-do-print').addEventListener('click', () => {
      document.body.classList.add('col-printing');
      try { window.print(); } catch (_) { document.body.classList.remove('col-printing'); message('A impressão não está disponível neste navegador. Você pode exportar a visualização em CSV.'); }
    });
    window.addEventListener('afterprint', () => document.body.classList.remove('col-printing'));
    view.subscribe(refresh);
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    try {
      if (button.hasAttribute('data-col-plan')) {
        const id = button.dataset.colPlan;
        if (core.getToolsState().plan.includes(id)) { removeFromPlan(id); message('Parada removida do seu roteiro.'); }
        else { addToPlan(id); message('Ficha adicionada ao seu roteiro. Mude a ordem dela pelo catálogo.'); }
      } else if (button.hasAttribute('data-col-view-recall')) {
        const entry = toolState.savedViews.find(entry => entry.id === button.dataset.colViewRecall);
        if (entry && view) { view.applyFilters(entry.query); message('Visualização “' + entry.name + '” restaurada.'); $('catalogue')?.scrollIntoView({block: 'start'}); $('col-search')?.focus({preventScroll: true}); }
      } else if (button.hasAttribute('data-col-view-delete')) {
        const next = core.getToolsState(); next.savedViews = next.savedViews.filter(entry => entry.id !== button.dataset.colViewDelete); commit(next); message('Busca salva excluída.'); $('col-view-name')?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-remove')) {
        removeFromPlan(button.dataset.colPlanRemove); message('Parada removida do seu roteiro.'); ($('col-plan-list')?.querySelector('button:not(:disabled)') || $('col-plan-list'))?.focus({preventScroll: true});
      } else if (button.hasAttribute('data-col-plan-up') || button.hasAttribute('data-col-plan-down')) {
        const up = button.hasAttribute('data-col-plan-up'), id = up ? button.dataset.colPlanUp : button.dataset.colPlanDown;
        if (movePlan(id, up ? -1 : 1)) {
          const position = core.getToolsState().plan.indexOf(id) + 1; message('Etapa movida para a posição ' + position + '.');
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
