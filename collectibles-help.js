/* Fast answers, optional compact view and accessible local-image viewer. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').trim();
  const feedback = message => {
    const node = document.querySelector('[data-col-feedback]');
    if (node) node.textContent = message;
    else if (window.LK?.status) window.LK.status(message);
  };
  const expressButton = $('col-quick-mode');
  const EXPRESS_KEY = 'lk_collectibles_quick_v1';
  let express = false;
  try { express = localStorage.getItem(EXPRESS_KEY) === '1'; } catch (_) { /* Reading remains available. */ }
  function applyExpress() {
    document.body.classList.toggle('col-quick-mode', express);
    if (expressButton) expressButton.setAttribute('aria-pressed', String(express));
    document.querySelectorAll('a[href="#ambiance"]').forEach(link => { link.hidden = express; });
    window.dispatchEvent(new CustomEvent('lk:collectibles-express', {detail: {enabled: express}}));
  }
  applyExpress();
  expressButton?.addEventListener('click', () => {
    express = !express; applyExpress();
    try { localStorage.setItem(EXPRESS_KEY, express ? '1' : '0'); }
    catch (_) { feedback('Mode appliqué dans cet onglet. Le navigateur ne permet pas d’enregistrer cette préférence.'); return; }
    feedback(express ? 'Mode express activé : visuels d’ambiance masqués et résultats compacts.' : 'Présentation illustrée rétablie.');
  });
  window.addEventListener('storage', event => {
    if (event.key === EXPRESS_KEY || event.key === null) { express = event.newValue === '1'; applyExpress(); }
  });

  const answers = [...document.querySelectorAll('.col-help-answer')];
  const query = $('col-help-query');
  const form = query?.closest('form');
  const count = $('col-help-count');
  const noMatch = $('col-help-empty');
  const published = (window.LK_COLLECTIBLES?.items || []).filter(item => item.published !== false && item.status !== 'placeholder');
  if ($('col-help-catalogue-state') && published.length) {
    const confirmed = published.filter(item => item.status === 'confirmed').length;
    $('col-help-catalogue-state').textContent = 'Le catalogue recense ' + published.length + ' fiche(s), dont ' + confirmed + ' confirmée(s) officiellement. Chaque fiche indique son statut et ses sources. Le nombre documenté reste distinct du total des collectibles du jeu.';
  }
  const answerIndex = new Map(answers.map(answer => [answer.id, norm(answer.textContent + ' ' + answer.dataset.helpKeywords)]));
  const questionWords = new Set(['a','au','aux','avec','ce','ces','c','comment','d','dans','de','des','du','en','est','et','il','ils','je','l','la','le','les','m','ma','mes','moi','mon','ne','on','ou','par','pas','peut','peux','pour','puis','qu','que','quel','quelle','quelles','quels','s','se','son','sont','sur','t','tu','un','une','vos','votre']);
  let beforeSearch = null;
  function searchAnswers() {
    if (!query) return;
    const words = norm(query.value.slice(0, 160)).split(/[\s’'?!,.;:]+/).filter(word => word && !questionWords.has(word)).map(word => word.length > 4 && word.endsWith('s') ? word.slice(0, -1) : word);
    if (words.length && !beforeSearch) beforeSearch = new Map(answers.map(answer => [answer.id, answer.open]));
    const matches = answers.filter(answer => words.every(word => answerIndex.get(answer.id).includes(word)));
    answers.forEach(answer => {
      answer.hidden = !matches.includes(answer);
      if (words.length && !answer.hidden && matches.length <= 3) answer.open = true;
      else if (!words.length && beforeSearch) answer.open = beforeSearch.get(answer.id) || false;
    });
    if (!words.length) beforeSearch = null;
    if (count) count.textContent = matches.length + ' réponse' + (matches.length > 1 ? 's' : '') + (words.length ? ' correspondante' + (matches.length > 1 ? 's' : '') : ' disponible' + (matches.length > 1 ? 's' : ''));
    if (noMatch) noMatch.hidden = matches.length > 0;
  }
  document.querySelectorAll('[data-col-help-controls]').forEach(node => { node.hidden = false; });
  query?.addEventListener('input', searchAnswers);
  form?.addEventListener('submit', event => { event.preventDefault(); searchAnswers(); });
  form?.addEventListener('reset', () => { query.value = ''; searchAnswers(); query.focus(); });
  searchAnswers();
  answers.forEach(answer => {
    const content = answer.querySelector('summary + div');
    if (!content) return;
    const share = document.createElement('button');
    share.type = 'button'; share.className = 'col-help-copy'; share.textContent = 'Copier le lien de cette réponse';
    share.addEventListener('click', async () => {
      const url = new URL(location.pathname, location.origin); url.hash = answer.id;
      try { await navigator.clipboard.writeText(url.href); feedback('Lien de la réponse copié.'); }
      catch (_) { feedback('Copie indisponible. Adresse de la réponse : ' + url.href); }
    });
    content.appendChild(share);
  });
  function followAnswerHash(scroll) {
    let id; try { id = decodeURIComponent(location.hash.slice(1)); } catch (_) { return; }
    const answer = answers.find(item => item.id === id);
    if (!answer) return;
    if (query) { query.value = ''; searchAnswers(); }
    answer.hidden = false; answer.open = true;
    if (scroll) { answer.scrollIntoView({block: 'start', behavior: 'auto'}); answer.querySelector('summary')?.focus({preventScroll: true}); }
  }
  window.addEventListener('hashchange', () => followAnswerHash(true));
  followAnswerHash(true);
  // Keyboard focus can start a smooth scroll just before an anchor is activated.
  // Let the browser update the hash, then finish that keyboard jump immediately.
  $('col-section-nav')?.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.detail !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const target = $(link.getAttribute('href').slice(1));
    if (target) requestAnimationFrame(() => target.scrollIntoView({block: 'start', behavior: 'instant'}));
  });
  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'k' || !event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing || document.querySelector('dialog[open]')) return;
    const catalogueQuery = $('col-search');
    const target = catalogueQuery && !catalogueQuery.closest('[hidden]') ? catalogueQuery : query;
    if (target) { event.preventDefault(); target.scrollIntoView({block: 'center', behavior: 'auto'}); target.focus({preventScroll: true}); }
  });

  let dialog, image, caption, title, sourceLink, previous, next, position, activeIndex = 0, trigger, entries = [];
  function imageURL(raw) {
    try {
      const url = new URL(raw, location.href);
      return url.origin === location.origin && /^\/(?:img|photos)\/.+\.(?:webp|avif|png|jpe?g)$/i.test(url.pathname) ? url.href : null;
    } catch (_) { return null; }
  }
  function sourceURL(raw) {
    if (!raw) return null;
    try { const url = new URL(raw, location.href); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null; } catch (_) { return null; }
  }
  function collectImages() {
    const unique = new Map();
    document.querySelectorAll('[data-col-zoom],.col-detail-image > a[href]').forEach(node => {
      const src = imageURL(node.dataset.colZoom || node.getAttribute('href'));
      if (!src || unique.has(src)) return;
      const figure = node.closest('figure');
      const picture = node.querySelector('img') || figure?.querySelector('img');
      unique.set(src, {src, alt: node.dataset.colZoomAlt || picture?.alt || 'Image du guide', credit: node.dataset.colZoomCredit || figure?.querySelector('figcaption')?.textContent || '', source: sourceURL(node.dataset.colZoomSource || figure?.querySelector('figcaption a[href]')?.getAttribute('href'))});
    });
    return [...unique.values()];
  }
  function buildDialog() {
    dialog = document.createElement('dialog'); dialog.id = 'col-image-dialog'; dialog.className = 'col-image-dialog';
    dialog.setAttribute('aria-labelledby', 'col-image-title');
    dialog.innerHTML = '<div class="col-image-head"><h2 id="col-image-title">Image agrandie</h2><button type="button" id="col-image-close" class="col-btn" autofocus>Fermer <span aria-hidden="true">×</span></button></div><figure><img id="col-image-full" alt=""><figcaption><span id="col-image-credit"></span> <a id="col-image-source" target="_blank" rel="noopener noreferrer" hidden>Source du visuel ↗</a></figcaption></figure><p id="col-image-error" role="status" hidden>Cette image ne peut pas être chargée. Vous pouvez fermer la fenêtre et continuer la lecture.</p><div class="col-image-controls"><button type="button" id="col-image-prev" class="col-btn">← Précédente</button><span id="col-image-position" aria-live="polite"></span><button type="button" id="col-image-next" class="col-btn">Suivante →</button></div>';
    document.body.appendChild(dialog);
    image = $('col-image-full'); caption = $('col-image-credit'); title = $('col-image-title'); sourceLink = $('col-image-source'); previous = $('col-image-prev'); next = $('col-image-next'); position = $('col-image-position');
    $('col-image-close').addEventListener('click', () => dialog.close());
    previous.addEventListener('click', () => { activeIndex = (activeIndex + entries.length - 1) % entries.length; showImage(); });
    next.addEventListener('click', () => { activeIndex = (activeIndex + 1) % entries.length; showImage(); });
    dialog.addEventListener('keydown', event => {
      if (entries.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      event.preventDefault(); activeIndex = (activeIndex + (event.key === 'ArrowLeft' ? entries.length - 1 : 1)) % entries.length; showImage();
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => { document.body.classList.remove('col-image-open'); if (trigger?.isConnected) trigger.focus({preventScroll: true}); });
    image.addEventListener('error', () => { image.hidden = true; $('col-image-error').hidden = false; });
    image.addEventListener('load', () => { image.hidden = false; $('col-image-error').hidden = true; });
  }
  function showImage() {
    const current = entries[activeIndex];
    title.textContent = current.alt; image.alt = current.alt; image.hidden = false; $('col-image-error').hidden = true;
    image.src = current.src; caption.textContent = ''; /* crédits sur medias.html, pas dans la visionneuse */
    sourceLink.hidden = !current.source; if (current.source) sourceLink.href = current.source; else sourceLink.removeAttribute('href');
    previous.hidden = next.hidden = entries.length < 2;
    position.textContent = (activeIndex + 1) + ' / ' + entries.length;
  }
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const node = event.target.closest('[data-col-zoom],.col-detail-image > a[href]');
    if (!node) return;
    const src = imageURL(node.dataset.colZoom || node.getAttribute('href'));
    if (!src || typeof HTMLDialogElement === 'undefined' || !HTMLDialogElement.prototype.showModal) return;
    entries = collectImages(); activeIndex = entries.findIndex(item => item.src === src);
    if (activeIndex < 0) return;
    event.preventDefault(); trigger = node;
    if (!dialog) buildDialog(); showImage(); dialog.showModal(); document.body.classList.add('col-image-open'); $('col-image-close').focus();
  });
})();
