/* Collectibles: versioned, local-only checklist shared by catalogue, fiches and map. */
(function () {
  'use strict';
  const KEY = 'lk_collectibles_v1';
  const TOOLS_KEY = 'lk_collectibles_tools_v1';
  const MAX_BYTES = 2 * 1024 * 1024, MAX_ENTRIES = 20000, MAX_NOTE = 2000;
  const subscribers = new Set();
  const toolsSubscribers = new Set();
  let storageStatus = 'available', storageMessage = '';
  let toolsStorageStatus = 'available', toolsStorageMessage = '';
  const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const validId = id => typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
  const empty = () => ({version: 1, found: Object.create(null), favorites: Object.create(null), notes: Object.create(null)});
  const emptyTools = () => ({version: 1, savedViews: [], plan: []});
  const filterKeys = ['q', 'category', 'region', 'status', 'progress', 'subcategory', 'zone', 'difficulty', 'availability', 'reward', 'sort', 'view', 'page'];
  function validateQuery(query) {
    if (typeof query !== 'string' || query.length > 4000 || /[\r\n\t]/.test(query)) throw new Error('Une recherche enregistrée contient une requête invalide.');
    const params = new URLSearchParams(query), seen = new Set();
    for (const [key, value] of params) {
      if (!filterKeys.includes(key) || seen.has(key) || value.length > 200) throw new Error('Une recherche enregistrée contient un filtre invalide.');
      seen.add(key);
      const choices = {status: ['', 'confirmed', 'established', 'unconfirmed'], progress: ['', 'found', 'missing', 'favorites', 'notes'], sort: ['name', 'updated', 'category', 'region', 'order', 'difficulty'], view: ['grid', 'list']};
      if (choices[key] && !choices[key].includes(value)) throw new Error('Une recherche enregistrée contient une option invalide.');
      if (key === 'page' && (!/^[1-9]\d{0,5}$/.test(value) || Number(value) > 100000)) throw new Error('Numéro de page invalide.');
    }
    const normalized = params.toString();
    if (normalized.length > 4000) throw new Error('Cette recherche contient trop de texte pour être enregistrée.');
    return normalized;
  }
  function validateTools(value) {
    if (!record(value) || value.version !== 1 || !Array.isArray(value.savedViews) || !Array.isArray(value.plan)) throw new Error('Format des outils de collection invalide.');
    if (value.savedViews.length > 12 || value.plan.length > 30) throw new Error('Limite dépassée : 12 recherches et 30 étapes maximum.');
    if (value.plan.some(id => !validId(id)) || new Set(value.plan).size !== value.plan.length) throw new Error('La sortie contient des identifiants invalides ou répétés.');
    const ids = new Set();
    const savedViews = value.savedViews.map(view => {
      if (!record(view) || !validId(view.id) || ids.has(view.id) || typeof view.name !== 'string' || !view.name.trim() || view.name.length > 64 || typeof view.createdAt !== 'string' || view.createdAt.length > 32 || !Number.isFinite(Date.parse(view.createdAt))) throw new Error('Une recherche enregistrée est invalide.');
      ids.add(view.id);
      return {id: view.id, name: view.name.trim(), query: validateQuery(view.query), createdAt: view.createdAt};
    });
    return {version: 1, savedViews, plan: value.plan.slice()};
  }
  const getItems = () => Array.isArray(window.LK_COLLECTIBLES?.items) ? window.LK_COLLECTIBLES.items : [];
  const getItem = id => getItems().find(item => item.id === id);
  const utf8Bytes = text => typeof Blob === 'function' ? new Blob([text]).size : new TextEncoder().encode(text).length;
  function validate(value) {
    if (!record(value) || value.version !== 1) throw new Error('Format incompatible : une sauvegarde Collectibles version 1 est attendue.');
    const result = empty();
    for (const field of ['found', 'favorites', 'notes']) {
      if (!record(value[field])) throw new Error('Sauvegarde incomplète : champ « ' + field + ' » manquant ou invalide.');
      const entries = Object.entries(value[field]);
      if (entries.length > MAX_ENTRIES) throw new Error('Cette sauvegarde contient trop d’entrées.');
      for (const [id, entry] of entries) {
        if (!validId(id)) throw new Error('Un identifiant de collectible est invalide.');
        if (field === 'notes') {
          if (typeof entry !== 'string' || entry.length > MAX_NOTE) throw new Error('Une note dépasse 2 000 caractères ou possède un format invalide.');
          if (entry.trim()) result.notes[id] = entry;
        } else {
          if (typeof entry !== 'boolean') throw new Error('Les états de progression doivent être des booléens.');
          if (entry) result[field][id] = true;
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(value, 'tools')) result.tools = validateTools(value.tools);
    return result;
  }
  function parse(raw) {
    if (typeof raw !== 'string' || raw.length > MAX_BYTES || utf8Bytes(raw) > MAX_BYTES) throw new Error('Sauvegarde trop volumineuse (2 Mo maximum).');
    let value;
    try { value = JSON.parse(raw); } catch (_) { throw new Error('Fichier JSON illisible. Aucun changement n’a été appliqué.'); }
    return validate(value);
  }
  function read() {
    try {
      const raw = window.localStorage.getItem(KEY);
      const result = raw ? parse(raw) : empty();
      delete result.tools;
      storageStatus = 'available'; storageMessage = '';
      return result;
    } catch (error) {
      storageStatus = 'unavailable';
      storageMessage = 'La sauvegarde locale est indisponible ou illisible. Tes changements restent dans cet onglet : exporte-les avant de le fermer.';
      return null;
    }
  }
  let state = read() || empty();
  function readTools() {
    try {
      const raw = window.localStorage.getItem(TOOLS_KEY);
      if (raw && raw.length > 100000) throw new Error('Outils trop volumineux.');
      const result = raw ? validateTools(JSON.parse(raw)) : emptyTools();
      toolsStorageStatus = 'available'; toolsStorageMessage = '';
      return result;
    } catch (_) {
      toolsStorageStatus = 'unavailable';
      toolsStorageMessage = 'Les outils restent disponibles dans cet onglet, mais leur sauvegarde locale est indisponible. Exporte ton carnet avant de fermer la page.';
      return null;
    }
  }
  let toolsState = readTools() || emptyTools();
  function snapshot() { return JSON.parse(JSON.stringify(state)); }
  function toolsSnapshot() { return JSON.parse(JSON.stringify(toolsState)); }
  function portableJSON(base, tools) {
    validate(base);
    const baseJSON = JSON.stringify(base), toolsJSON = JSON.stringify(tools);
    const envelopeJSON = JSON.stringify({...base, tools, app: 'Leonidakit Collectibles', exportedAt: new Date().toISOString()});
    if (utf8Bytes(baseJSON) > MAX_BYTES || utf8Bytes(envelopeJSON) > MAX_BYTES) throw new Error('Le carnet dépasserait la limite de 2 Mo. Aucun changement n’a été appliqué.');
    return {baseJSON, toolsJSON};
  }
  function emitTools() {
    const copy = toolsSnapshot();
    toolsSubscribers.forEach(fn => { try { fn(copy); } catch (_) { /* Isolate views. */ } });
    window.dispatchEvent(new CustomEvent('lk:collectibles-tools-change', {detail: copy}));
  }
  function setToolsState(value) {
    const candidate = validateTools(value);
    portableJSON(state, candidate);
    toolsState = candidate;
    try {
      window.localStorage.setItem(TOOLS_KEY, JSON.stringify(toolsState));
      toolsStorageStatus = 'available'; toolsStorageMessage = '';
    } catch (_) {
      toolsStorageStatus = 'unavailable';
      toolsStorageMessage = 'Tes recherches et ta sortie restent dans cet onglet. Exporte ton carnet : le navigateur ne peut pas les sauvegarder.';
    }
    emitTools(); return toolsSnapshot();
  }
  function emit() {
    const copy = snapshot();
    subscribers.forEach(fn => { try { fn(copy); } catch (_) { /* One view must not block the others. */ } });
    window.dispatchEvent(new CustomEvent('lk:collectibles-change', {detail: copy}));
  }
  function persist() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
      storageStatus = 'available'; storageMessage = '';
    } catch (_) {
      storageStatus = 'unavailable';
      storageMessage = 'Le navigateur ne peut pas enregistrer tes changements. Exporte ta progression avant de fermer cet onglet.';
    }
    emit();
  }
  function isTrackable(item) {
    return !!item && item.published !== false && item.trackable === true && ['confirmed', 'established'].includes(item.status);
  }
  function mutate(field, id, value) {
    if (!validId(id)) return false;
    const item = getItem(id);
    if (!item || item.published === false || item.status === 'placeholder' || (field === 'found' && !isTrackable(item))) return false;
    // Pick up writes from another tab before changing one field; keep volatile state if persistence failed.
    const current = storageStatus === 'available' ? read() || state : state;
    const candidate = empty();
    for (const key of ['found', 'favorites', 'notes']) Object.assign(candidate[key], current[key]);
    if (value === false || value === '') delete candidate[field][id]; else candidate[field][id] = value;
    try { portableJSON(candidate, toolsState); }
    catch (error) { storageMessage = error.message; emit(); return false; }
    state = candidate;
    persist(); return true;
  }
  function itemUrl(item) {
    return item && validId(item.slug) ? '/collectibles/' + encodeURIComponent(item.slug) + '.html' : null;
  }
  function mapUrl(item) {
    const c = item?.coordinates;
    let sourceValid = false;
    try { const url = new URL(c?.sourceUrl); sourceValid = ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch (_) { /* Missing or malformed evidence URL. */ }
    return item && item.published !== false && item.status !== 'placeholder' && validId(item.id) && c?.verified === true && c.system === 'leonidakit-v1' && Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 0 && c.x <= 5200 && c.y >= 0 && c.y <= 6000 && sourceValid ? '/carte.html#collectible=' + encodeURIComponent(item.id) : null;
  }
  function importData(value, mode = 'merge') {
    if (!['merge', 'replace'].includes(mode)) throw new Error('Mode d’importation invalide.');
    const imported = typeof value === 'string' ? parse(value) : validate(value);
    const current = storageStatus === 'available' ? read() || state : state;
    const currentTools = toolsStorageStatus === 'available' ? readTools() || toolsState : toolsState;
    const next = empty();
    for (const field of ['found', 'favorites', 'notes']) Object.assign(next[field], mode === 'merge' ? current[field] : {}, imported[field]);
    let nextTools = currentTools;
    if (imported.tools) {
      if (mode === 'replace') nextTools = imported.tools;
      else {
        const views = new Map(currentTools.savedViews.map(view => [view.id, view]));
        imported.tools.savedViews.forEach(view => views.set(view.id, view));
        nextTools = validateTools({version: 1, savedViews: [...views.values()], plan: [...new Set([...currentTools.plan, ...imported.tools.plan])]});
      }
    }
    // Two individually valid backups can exceed field or byte limits after merging.
    // Reserve the envelope overhead as well so the resulting exported file remains importable.
    const {baseJSON: nextJSON, toolsJSON} = portableJSON(next, nextTools);
    // Validate the complete candidate first. Then commit both stores, rolling back on a partial write.
    let previousBase, previousTools, wroteBase = false, wroteTools = false;
    try {
      previousBase = window.localStorage.getItem(KEY);
      if (imported.tools) previousTools = window.localStorage.getItem(TOOLS_KEY);
      window.localStorage.setItem(KEY, nextJSON); wroteBase = true;
      if (imported.tools) { window.localStorage.setItem(TOOLS_KEY, toolsJSON); wroteTools = true; }
    } catch (_) {
      let rolledBack = true;
      try {
        if (wroteBase) { if (previousBase === null) window.localStorage.removeItem(KEY); else window.localStorage.setItem(KEY, previousBase); }
        if (wroteTools) { if (previousTools === null) window.localStorage.removeItem(TOOLS_KEY); else window.localStorage.setItem(TOOLS_KEY, previousTools); }
      } catch (_) { rolledBack = false; }
      storageStatus = 'unavailable';
      storageMessage = rolledBack ? 'L’import n’a pas été appliqué : le navigateur ne peut pas enregistrer la sauvegarde. Le carnet actuel est conservé.' : 'L’import a échoué et la restauration du stockage n’a pas pu être garantie. Exporte le carnet actuel avant de fermer la page.';
      emit(); throw new Error(storageMessage);
    }
    state = next; toolsState = nextTools;
    storageStatus = 'available'; storageMessage = '';
    if (imported.tools) { toolsStorageStatus = 'available'; toolsStorageMessage = ''; }
    emit(); if (imported.tools) emitTools();
    const counts = {found: Object.keys(imported.found).length, favorites: Object.keys(imported.favorites).length, notes: Object.keys(imported.notes).length};
    if (imported.tools) counts.tools = {savedViews: imported.tools.savedViews.length, plan: imported.tools.plan.length};
    return counts;
  }
  window.addEventListener('storage', event => {
    if (event.key === TOOLS_KEY || event.key === null) {
      try { toolsState = event.newValue ? validateTools(JSON.parse(event.newValue)) : emptyTools(); toolsStorageStatus = 'available'; toolsStorageMessage = ''; emitTools(); }
      catch (_) { toolsStorageMessage = 'Les outils reçus depuis un autre onglet sont illisibles ; tes outils actuels sont conservés.'; emitTools(); }
      if (event.key === TOOLS_KEY) return;
    }
    if (event.key !== KEY && event.key !== null) return;
    try {
      state = event.newValue ? parse(event.newValue) : empty(); delete state.tools;
      storageStatus = 'available'; storageMessage = ''; emit();
    } catch (_) {
      storageMessage = 'Une sauvegarde reçue depuis un autre onglet est illisible. La progression actuelle est conservée.'; emit();
    }
  });
  window.LKCollectibles = Object.freeze({
    key: KEY, maxImportBytes: MAX_BYTES, maxNoteLength: MAX_NOTE, validId, getItem, isTrackable, itemUrl, mapUrl,
    toolsKey: TOOLS_KEY, getToolsState: toolsSnapshot, setToolsState, validateTools, validateQuery,
    subscribeTools: fn => { if (typeof fn !== 'function') return () => {}; toolsSubscribers.add(fn); return () => toolsSubscribers.delete(fn); },
    getState: snapshot,
    getStorageStatus: () => ({status: storageStatus === 'unavailable' || toolsStorageStatus === 'unavailable' ? 'unavailable' : 'available', message: [storageMessage, toolsStorageMessage].filter(Boolean).join(' ')}),
    setFound: (id, value) => mutate('found', id, !!value),
    setFavorite: (id, value) => mutate('favorites', id, !!value),
    setNote: (id, text) => typeof text === 'string' && text.length <= MAX_NOTE && mutate('notes', id, text.trim() ? text : ''),
    exportData: () => ({...snapshot(), tools: toolsSnapshot(), app: 'Leonidakit Collectibles', exportedAt: new Date().toISOString()}),
    importData,
    resetProgress: () => { state = empty(); persist(); },
    subscribe: fn => { if (typeof fn !== 'function') return () => {}; subscribers.add(fn); return () => subscribers.delete(fn); }
  });
})();
