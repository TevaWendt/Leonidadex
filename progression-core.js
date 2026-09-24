/* Leonidakit : progression v2.
   Une seule source pour le suivi personnel : les cases historiques (lk_own_vehicules, lk_own_armes,
   lk_map_found) restent stockées telles quelles, les nouveaux contenus (bateaux référencés, personnalisations,
   garages) s'y ajoutent, et l'export / import versionné transporte tout, carnets du calculateur compris.
   Aucune donnée n'est réécrite au chargement ; une rubrique abîmée est copiée avant d'être remplacée. */
(function (global) {
  'use strict';
  var SITE = 'leonidakit', VERSION = 2, KEY = 'lk_progression_v2';
  var LEGACY = { vehicules: 'lk_own_vehicules', armes: 'lk_own_armes', lieux: 'lk_map_found' };
  var TRANSPORT = ['lk_collectibles_v1', 'lk_collectibles_tools_v1', 'lk-calculator-notebooks-v3', 'lk-calculator-v1', 'lk-calculator-favorites-v1'];
  var LABELS = { vehicules: 'Véhicules', armes: 'Armes', lieux: 'Lieux de la carte', collectibles: 'Collectibles' };
  function isChecked(v) { return v === true || v === 1; }
  function parseMap(raw) {
    /* Retourne {map, corrupt} : les entrées illisibles ne comptent pas mais ne sont jamais perdues. */
    if (raw === null || raw === undefined || raw === '') return { map: {}, corrupt: false, missing: true };
    var data; try { data = JSON.parse(raw); } catch (e) { return { map: {}, corrupt: true, unreadable: true }; }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return { map: {}, corrupt: true, unreadable: true };
    var map = {}, corrupt = false;
    Object.keys(data).forEach(function (id) {
      if (isChecked(data[id])) map[id] = true;
      else if (data[id] === false || data[id] === 0 || data[id] === null) map[id] = false;
      else corrupt = true;
    });
    return { map: map, corrupt: corrupt };
  }
  function snapshot(storage) {
    var out = {}, i, k;
    for (i = 0; i < storage.length; i++) { k = storage.key(i); out[k] = storage.getItem(k); }
    return out;
  }
  function create(options) {
    var storage = options.storage, acquisitions = options.acquisitions || { categories: [], items: [] };
    var ids = options.ids || global.LK_PROGRESS_IDS || { vehicules: [], armes: [], lieux: [] };
    var collectibles = options.collectibles || (global.LK_COLLECTIBLES && global.LK_COLLECTIBLES.items) || [];
    var notice = typeof options.notice === 'function' ? options.notice : function () {};
    var listeners = [];
    var items = (acquisitions.items || []).filter(function (x) { return x && typeof x.id === 'string'; });
    var categories = acquisitions.categories || [];
    function ref(item) { return item.ref && item.ref.type && item.ref.id ? item.ref : null; }
    function legacyKeyForType(type) { return { vehicle: LEGACY.vehicules, vehicules: LEGACY.vehicules, weapon: LEGACY.armes, armes: LEGACY.armes, place: LEGACY.lieux, lieux: LEGACY.lieux }[type] || null; }
    /* Identifiants référencés par une acquisition : ils quittent leur groupe d'origine pour le dénominateur. */
    var partitioned = {};
    items.forEach(function (item) { var r = ref(item); if (r && item.trackable === true) partitioned[r.type + ':' + r.id] = item.category; });
    function trackable(item) { return item.trackable === true; }
    function known(id) {
      if (items.some(function (x) { return x.id === id; })) return true;
      return ['vehicules', 'armes', 'lieux'].some(function (t) { return (ids[t] || []).indexOf(id) !== -1; });
    }
    function read(key) { try { return storage.getItem(key); } catch (e) { return null; } }
    function v2() { var p = parseMap(read(KEY)); var raw = read(KEY); var data = null; try { data = raw ? JSON.parse(raw) : null; } catch (e) { data = null; }
      return { checked: data && data.checked && typeof data.checked === 'object' ? data.checked : {}, migrated: !!(data && data.migratedAt), corrupt: !!raw && !data }; }
    function writeMap(key, map, previousRaw, corrupt) {
      if (corrupt && previousRaw) { try { storage.setItem('lk_recovery_' + key + '_' + Date.now(), previousRaw); } catch (e) { /* la copie de secours est facultative */ } }
      var out = {}; Object.keys(map).forEach(function (id) { if (map[id]) out[id] = true; });
      storage.setItem(key, JSON.stringify(out));
    }
    function itemById(id) { return items.filter(function (x) { return x.id === id; })[0] || null; }
    function checkedId(id) {
      var item = itemById(id);
      if (item) {
        if (!trackable(item)) return false;
        var r = ref(item);
        if (r) { var key = legacyKeyForType(r.type); return key ? !!parseMap(read(key)).map[r.id] : false; }
        return v2().checked[item.id] === true;
      }
      for (var t in LEGACY) if ((ids[t] || []).indexOf(id) !== -1) return !!parseMap(read(LEGACY[t])).map[id];
      return false;
    }
    function checked(item) { return checkedId(typeof item === 'string' ? item : item && item.id); }
    function summary() {
      var groups = [], done = 0, total = 0;
      ['vehicules', 'armes', 'lieux'].forEach(function (t) {
        var list = Array.from(new Set(ids[t] || [])), map = parseMap(read(LEGACY[t])).map, typeKey = { vehicules: 'vehicle', armes: 'weapon', lieux: 'place' }[t];
        var own = list.filter(function (id) { return !partitioned[typeKey + ':' + id]; });
        var d = own.filter(function (id) { return map[id]; }).length;
        groups.push({ id: t, label: LABELS[t], total: own.length, done: d, percent: own.length ? d / own.length * 100 : null });
        done += d; total += own.length;
      });
      var trackC = collectibles.filter(function (x) { return x && x.trackable === true && x.published !== false && ['confirmed', 'established'].indexOf(x.status) !== -1; });
      var found = {}; try { var c = JSON.parse(read('lk_collectibles_v1') || 'null'); found = c && c.found && typeof c.found === 'object' ? c.found : {}; } catch (e) { found = {}; }
      var dc = trackC.filter(function (x) { return isChecked(found[x.id]); }).length;
      groups.push({ id: 'collectibles', label: LABELS.collectibles, total: trackC.length, done: dc, percent: trackC.length ? dc / trackC.length * 100 : null });
      done += dc; total += trackC.length;
      categories.forEach(function (cat) {
        var mine = items.filter(function (x) { return x.category === cat.id && trackable(x); });
        var d = mine.filter(function (x) { return checked(x); }).length;
        groups.push({ id: cat.id, label: cat.label, total: mine.length, done: d, percent: mine.length ? d / mine.length * 100 : null, pending: mine.length === 0 });
        done += d; total += mine.length;
      });
      return { done: done, total: total, percent: total ? done / total * 100 : 0, groups: groups };
    }
    function emit() { listeners.forEach(function (fn) { try { fn(summary()); } catch (e) { /* un écouteur cassé n'empêche pas les autres */ } }); }
    function toggle(id, value) {
      var item = itemById(id), on = value !== false;
      try {
        if (item) {
          if (!trackable(item)) return false;
          var r = ref(item);
          if (r) { var key = legacyKeyForType(r.type); if (!key) return false; var raw = read(key), p = parseMap(raw); p.map[r.id] = on; writeMap(key, p.map, raw, p.corrupt); }
          else { var raw2 = read(KEY), state = v2(); var data = { version: VERSION, migratedAt: null, checked: {} }; try { var d0 = raw2 ? JSON.parse(raw2) : null; if (d0 && typeof d0 === 'object') data = { version: VERSION, migratedAt: d0.migratedAt || null, checked: state.checked }; } catch (e) { if (raw2) storage.setItem('lk_recovery_' + KEY + '_' + Date.now(), raw2); }
            if (on) data.checked[item.id] = true; else delete data.checked[item.id]; storage.setItem(KEY, JSON.stringify(data)); }
          emit(); return true;
        }
        for (var t in LEGACY) if ((ids[t] || []).indexOf(id) !== -1) { var raw3 = read(LEGACY[t]), p3 = parseMap(raw3); p3.map[id] = on; writeMap(LEGACY[t], p3.map, raw3, p3.corrupt); emit(); return true; }
      } catch (e) { notice('Impossible d’enregistrer cette case : le stockage du navigateur est indisponible.'); return false; }
      return false;
    }
    function migrate() {
      /* Pose seulement le marqueur v2 : les octets des clés historiques ne sont jamais réécrits ici. */
      var state = v2(); if (state.migrated) return false;
      var data = { version: VERSION, migratedAt: new Date().toISOString(), checked: state.checked };
      try { storage.setItem(KEY, JSON.stringify(data)); } catch (e) { notice('Impossible de préparer le suivi : le stockage du navigateur est indisponible.'); return false; }
      return true;
    }
    function exportData() {
      /* Tout le suivi local part dans le fichier : cases, carnets du calculateur, marqueurs et dessins de la carte, classement. */
      var data = {}, keys = Object.keys(LEGACY).map(function (t) { return LEGACY[t]; }).concat([KEY], TRANSPORT), i, k;
      for (i = 0; i < storage.length; i++) { k = storage.key(i); if (k && (k.indexOf('lk_') === 0 || k.indexOf('lk-') === 0) && keys.indexOf(k) === -1 && k.indexOf('lk_recovery_') !== 0) keys.push(k); }
      keys.forEach(function (k) { var v = read(k); if (v !== null && v !== undefined) data[k] = v; });
      var cats = categories.map(function (cat) { return { id: cat.id, checkedIds: items.filter(function (x) { return x.category === cat.id && trackable(x) && checked(x); }).map(function (x) { return x.id; }) }; });
      return { site: SITE, version: VERSION, schemaVersion: VERSION, exportedAt: new Date().toISOString(), categories: cats, data: data };
    }
    function prepareImport(text) {
      var parsed; try { parsed = JSON.parse(text); } catch (e) { throw new Error('Ce fichier n’est pas un fichier de suivi Leonidakit lisible.'); }
      if (!parsed || typeof parsed !== 'object' || parsed.site !== SITE) throw new Error('Ce fichier ne vient pas de Leonidakit.');
      var version = parsed.version === undefined ? 1 : parsed.version;
      if (version !== 1 && version !== 2) throw new Error('Ce fichier vient d’une version plus récente du site : mets le site à jour avant de l’ouvrir.');
      if (!parsed.data || typeof parsed.data !== 'object' || Array.isArray(parsed.data)) throw new Error('Ce fichier ne contient pas de données de suivi.');
      if (version === 2) {
        if (parsed.categories !== undefined) {
          if (!Array.isArray(parsed.categories)) throw new Error('Les catégories du fichier sont illisibles.');
          parsed.categories.forEach(function (c) { if (!c || typeof c.id !== 'string' || !Array.isArray(c.checkedIds) || c.checkedIds.some(function (x) { return typeof x !== 'string'; })) throw new Error('Les catégories du fichier sont illisibles.'); });
        }
        if (parsed.exportedAt !== undefined && (typeof parsed.exportedAt !== 'string' || isNaN(Date.parse(parsed.exportedAt)))) throw new Error('La date du fichier est illisible.');
      }
      var allowed = Object.keys(LEGACY).map(function (t) { return LEGACY[t]; }).concat([KEY], TRANSPORT), issues = [], rubrics = {}, corrupt = {};
      Object.keys(parsed.data).forEach(function (key) {
        var raw = parsed.data[key];
        if (typeof raw !== 'string') { issues.push('Rubrique illisible ignorée : ' + key); return; }
        if (allowed.indexOf(key) === -1) {
          if (key.indexOf('lk_') === 0 || key.indexOf('lk-') === 0) { issues.push('Rubrique non reconnue gardée telle quelle, sans être comptée : ' + key); rubrics[key] = raw; }
          else issues.push('Rubrique inconnue ignorée : ' + key);
          return;
        }
        if (key === LEGACY.vehicules || key === LEGACY.armes || key === LEGACY.lieux) {
          var p = parseMap(raw);
          if (p.unreadable) { issues.push('Rubrique abîmée ignorée (une copie sera gardée) : ' + key); corrupt[key] = raw; return; }
          var t = key === LEGACY.vehicules ? 'vehicules' : key === LEGACY.armes ? 'armes' : 'lieux';
          Object.keys(p.map).forEach(function (id) { if ((ids[t] || []).indexOf(id) === -1) issues.push('Référence inconnue conservée mais non comptée : ' + id); });
          if (p.corrupt) issues.push('Certaines valeurs de ' + key + ' sont illisibles et ne sont pas comptées.');
        } else if (key === KEY) {
          try { var d = JSON.parse(raw); if (!d || typeof d !== 'object' || (d.checked && typeof d.checked !== 'object')) throw 0; Object.keys(d.checked || {}).forEach(function (id) { if (!itemById(id)) issues.push('Référence inconnue conservée mais non comptée : ' + id); }); }
          catch (e) { issues.push('Rubrique abîmée ignorée (une copie sera gardée) : ' + key); corrupt[key] = raw; return; }
        } else { try { JSON.parse(raw); } catch (e) { issues.push('Rubrique abîmée ignorée (une copie sera gardée) : ' + key); corrupt[key] = raw; return; } }
        rubrics[key] = raw;
      });
      return { version: version, rubrics: rubrics, corrupt: corrupt, issues: issues, categories: parsed.categories || [], exportedAt: parsed.exportedAt || parsed.date || null };
    }
    function applyImport(plan, mode) {
      if (!plan || !plan.rubrics) throw new Error('Rien à importer.');
      mode = mode === 'merge' ? 'merge' : 'replace';
      var before = snapshot(storage), written = [];
      try {
        Object.keys(plan.corrupt || {}).forEach(function (key) { storage.setItem('lk_recovery_import_' + key + '_' + Date.now(), plan.corrupt[key]); written.push(key); });
        Object.keys(plan.rubrics).forEach(function (key) {
          var raw = plan.rubrics[key];
          if (mode === 'merge' && (key === LEGACY.vehicules || key === LEGACY.armes || key === LEGACY.lieux)) {
            var cur = parseMap(read(key)), inc = parseMap(raw), merged = {}; Object.keys(cur.map).forEach(function (id) { if (cur.map[id]) merged[id] = true; }); Object.keys(inc.map).forEach(function (id) { if (inc.map[id]) merged[id] = true; });
            storage.setItem(key, JSON.stringify(merged));
          } else if (mode === 'merge' && key === KEY) {
            var curV = v2(), incV = {}; try { incV = (JSON.parse(raw) || {}).checked || {}; } catch (e) { incV = {}; }
            var c2 = {}; Object.keys(curV.checked).forEach(function (id) { c2[id] = true; }); Object.keys(incV).forEach(function (id) { if (incV[id] === true) c2[id] = true; });
            storage.setItem(KEY, JSON.stringify({ version: VERSION, migratedAt: new Date().toISOString(), checked: c2 }));
          } else storage.setItem(key, raw);
          written.push(key);
        });
      } catch (e) {
        /* Retour à l'état d'avant : rien n'est appliqué à moitié. */
        Object.keys(before).forEach(function (k) { try { storage.setItem(k, before[k]); } catch (e2) { /* on continue */ } });
        for (var i = 0; i < storage.length; i++) { var k2 = storage.key(i); if (!(k2 in before)) { try { storage.removeItem(k2); } catch (e3) { /* on continue */ } i--; } }
        notice('Import annulé : le stockage du navigateur a refusé l’écriture. Rien n’a été modifié.');
        throw e;
      }
      emit();
      return { written: written, mode: mode };
    }
    function subscribe(fn) { if (typeof fn === 'function') listeners.push(fn); return function () { listeners = listeners.filter(function (x) { return x !== fn; }); }; }
    return { migrate: migrate, summary: summary, toggle: toggle, checked: checked, known: known, exportData: exportData, prepareImport: prepareImport, applyImport: applyImport, subscribe: subscribe, items: items, categories: categories };
  }
  var api = { create: create, KEY: KEY, VERSION: VERSION };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.LKProgression = api;
}(typeof window !== 'undefined' ? window : globalThis));
