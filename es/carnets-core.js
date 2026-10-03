/* LEONIDAKIT — fondations des carnets de progression (v7.48, lot 1).
   Les possessions restent dans leurs clés historiques (lk_own_<famille>, lk_map_found, lk_collectibles_v1,
   lk_progression_v2) : rien n’est réécrit ni renommé. Trois nouvelles rubriques, séparées et facultatives :
   - lk_stock_v1   : quantité encore disponible d’un consommable ou d’une munition. Une ancienne case cochée ne devient
                     jamais une quantité inventée : elle se lit « stock à renseigner » tant que tu n’as rien écrit ;
   - lk_wish_v1    : souhaits et achats prévus. Un souhait n’est jamais une possession, et une prévision du calculateur
                     ne coche jamais une case de progression ;
   - lk_journal_v1 : réalisations déclarées (une étape du plan faite…) avec leur identifiant : appliquer deux fois le même
                     événement ne change rien la seconde fois (pas de double comptage).
   Chaque opération relit le stockage avant d’écrire : deux onglets ouverts ne s’écrasent pas en silence.
   Stockage indisponible : l’opération renvoie false et le message dit quoi faire (exporter), sans annoncer de succès. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LKCarnets = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var KEYS = { stock: 'lk_stock_v1', wish: 'lk_wish_v1', journal: 'lk_journal_v1' };
  var OWN = { vehicules: 'lk_own_vehicules', armes: 'lk_own_armes', equipements: 'lk_own_equipements', munitions: 'lk_own_munitions', consommables: 'lk_own_consommables', coiffures: 'lk_own_coiffures', tatouages: 'lk_own_tatouages', tenues: 'lk_own_tenues', 'perso-vehicules': 'lk_own_perso-vehicules', 'perso-armes': 'lk_own_perso-armes', lieux: 'lk_map_found' };
  var STOCKABLE = { consommables: true, munitions: true };
  /* v7.51 (lot 4) : les lieux de la carte ont des identifiants avec majuscules (g-L1848) : ils sont acceptés tels quels. */
  var ID = /^[A-Za-z0-9][A-Za-z0-9-]{0,99}$/;
  var FAM = /^[a-z][a-z0-9-]{1,30}$/;
  var MAX_JOURNAL = 500;
  function isChecked(v) { return v === true || v === 1; }
  function record(x) { return !!x && typeof x === 'object' && !Array.isArray(x); }
  function validStock(d) { return record(d) && d.version === 1 && record(d.items) && Object.keys(d.items).every(function (k) { var e = d.items[k], p = k.split(':'); return p.length === 2 && FAM.test(p[0]) && ID.test(p[1]) && record(e) && (e.q === null || (typeof e.q === 'number' && Number.isInteger(e.q) && e.q >= 0 && e.q <= 1000000)) && typeof e.at === 'string'; }); }
  function validWish(d) { return record(d) && d.version === 1 && record(d.items) && Object.keys(d.items).every(function (k) { var e = d.items[k], p = k.split(':'); return p.length === 2 && FAM.test(p[0]) && ID.test(p[1]) && record(e) && typeof e.at === 'string' && (e.from === undefined || ['catalogue', 'plan', 'calcul', 'fiche'].indexOf(e.from) >= 0); }); }
  function validJournal(d) { return record(d) && d.version === 1 && record(d.events) && Object.keys(d.events).every(function (k) { return k.length <= 120 && record(d.events[k]) && typeof d.events[k].at === 'string'; }); }
  var VALID = { stock: validStock, wish: validWish, journal: validJournal };
  var EMPTY = { stock: function () { return { version: 1, items: {} }; }, wish: function () { return { version: 1, items: {} }; }, journal: function () { return { version: 1, events: {} }; } };

  function create(options) {
    options = options || {};
    var storage = options.storage, now = options.now || function () { return new Date().toISOString(); };
    var notice = typeof options.notice === 'function' ? options.notice : function () {};
    var modele = options.modele || { carnets: [] }, ids = options.ids || {}, names = options.names || {};
    var listeners = [];
    function raw(key) { try { return storage.getItem(key); } catch (e) { return null; } }
    function load(kind) {
      var text = raw(KEYS[kind]);
      if (text === null || text === undefined) return { data: EMPTY[kind](), broken: null };
      try { var d = JSON.parse(text); if (VALID[kind](d)) return { data: d, broken: null }; } catch (e) { /* abîmé : copié avant remplacement */ }
      return { data: EMPTY[kind](), broken: text };
    }
    function save(kind, data, broken) {
      try {
        if (broken) storage.setItem('lk_recovery_' + KEYS[kind] + '_' + Date.now(), broken);
        storage.setItem(KEYS[kind], JSON.stringify(data));
        emit(kind); return true;
      } catch (e) { notice('No se puede guardar: el almacenamiento del navegador no está disponible. Exporta tu seguimiento para no perder nada.'); return false; }
    }
    function key(famille, id) { if (!FAM.test(famille) || !ID.test(id)) throw new Error('Identificador no válido.'); return famille + ':' + id; }
    /* ---- Possessions : lues dans les clés historiques, jamais recopiées ailleurs. ---- */
    function ownedMap(famille) {
      if (famille === 'collectibles') { try { var c = JSON.parse(raw('lk_collectibles_v1') || 'null'); var f = c && record(c.found) ? c.found : {}; var out = {}; Object.keys(f).forEach(function (k) { if (f[k] === true) out[k] = true; }); return out; } catch (e) { return {}; } }
      if (famille === 'acquisitions') { try { var p = JSON.parse(raw('lk_progression_v2') || 'null'); var ch = p && record(p.checked) ? p.checked : {}; var o2 = {}; Object.keys(ch).forEach(function (k) { if (ch[k] === true) o2[k] = true; }); return o2; } catch (e) { return {}; } }
      var k = OWN[famille]; if (!k) return {};
      try { var d = JSON.parse(raw(k) || '{}'); if (!record(d)) return {}; var out2 = {}; Object.keys(d).forEach(function (id) { if (isChecked(d[id])) out2[id] = true; }); return out2; } catch (e) { return {}; }
    }
    function owned(famille) { return Object.keys(ownedMap(famille)); }
    function isOwned(famille, id) { return !!ownedMap(famille)[id]; }
    /* Déclarer ou retirer une possession : même clé et même valeur (1) que suivi.js, pour que fiche, carnet et tableau de bord
       comptent pareil. Les lieux gardent la valeur true de carte.js. */
    function setOwned(famille, id, on) {
      var k = OWN[famille]; if (!k || !ID.test(id)) return false;
      var d; try { d = JSON.parse(raw(k) || '{}'); if (!record(d)) d = {}; } catch (e) { d = {}; }
      if (on) d[id] = famille === 'lieux' ? true : 1; else delete d[id];
      try { storage.setItem(k, JSON.stringify(d)); emit('own'); return true; } catch (e) { notice('No se puede guardar esta casilla: el almacenamiento del navegador no está disponible.'); return false; }
    }
    /* ---- Stock ---- */
    function stock(famille, id) {
      var e = load('stock').data.items[key(famille, id)];
      if (e) return { qty: e.q, unit: e.u || null, at: e.at, state: e.q === null ? 'a-renseigner' : 'connu' };
      if (STOCKABLE[famille] && isOwned(famille, id)) return { qty: null, unit: null, at: null, state: 'a-renseigner' }; // ancienne case cochée
      return { qty: null, unit: null, at: null, state: 'aucun' };
    }
    function setStock(famille, id, qty, unit) {
      if (!STOCKABLE[famille]) return false;
      if (qty !== null && !(typeof qty === 'number' && Number.isInteger(qty) && qty >= 0 && qty <= 1000000)) throw new Error('Escribe una cantidad entera, 0 o más.');
      var l = load('stock'); var k = key(famille, id);
      l.data.items[k] = { q: qty, at: now() }; if (unit) l.data.items[k].u = String(unit).slice(0, 40);
      return save('stock', l.data, l.broken);
    }
    function clearStock(famille, id) { var l = load('stock'); delete l.data.items[key(famille, id)]; return save('stock', l.data, l.broken); }
    /* ---- Souhaits (prévu ≠ possédé) ---- */
    function wishes(famille) { var items = load('wish').data.items; return Object.keys(items).filter(function (k) { return !famille || k.indexOf(famille + ':') === 0; }).map(function (k) { var p = k.split(':'); return { famille: p[0], id: p[1], at: items[k].at, from: items[k].from || null }; }); }
    function isWished(famille, id) { return !!load('wish').data.items[key(famille, id)]; }
    function setWish(famille, id, on, from) { var l = load('wish'), k = key(famille, id); if (on) l.data.items[k] = { at: now(), from: from || 'catalogue' }; else delete l.data.items[k]; return save('wish', l.data, l.broken); }
    /* ---- Journal des réalisations : idempotent ---- */
    // ops : [{type:'own', famille, id} | {type:'stock', famille, id, delta}]. Un même eventId n’est appliqué qu’une fois.
    function applyEvent(eventId, ops) {
      if (typeof eventId !== 'string' || !eventId || eventId.length > 120) throw new Error('Evento sin identificador.');
      var j = load('journal');
      if (j.data.events[eventId]) return { applied: false, reason: 'ya guardado' };
      var results = [];
      (ops || []).forEach(function (op) {
        if (op.type === 'own') results.push(setOwned(op.famille, op.id, true));
        else if (op.type === 'stock') {
          var cur = stock(op.famille, op.id);
          if (cur.qty === null) { results.push(false); return; } // stock inconnu : on ne retire pas d’un nombre inventé
          results.push(setStock(op.famille, op.id, Math.max(0, cur.qty + (op.delta || 0))));
        }
      });
      if (results.some(function (r) { return r === false; }) && !results.some(Boolean)) return { applied: false, reason: 'nada que aplicar' };
      j = load('journal');
      j.data.events[eventId] = { at: now(), ops: (ops || []).length };
      var ids2 = Object.keys(j.data.events);
      if (ids2.length > MAX_JOURNAL) ids2.sort(function (a, b) { return j.data.events[a].at < j.data.events[b].at ? -1 : 1; }).slice(0, ids2.length - MAX_JOURNAL).forEach(function (k) { delete j.data.events[k]; });
      save('journal', j.data, j.broken);
      return { applied: true, results: results };
    }
    function hasEvent(eventId) { return !!load('journal').data.events[eventId]; }
    /* ---- Carnets ---- */
    function carnet(id) { return (modele.carnets || []).filter(function (k) { return k.id === id; })[0] || null; }
    function entries(carnetId) {
      var k = carnet(carnetId); if (!k) return [];
      var out = [];
      k.familles.forEach(function (fam) {
        var map = ownedMap(fam), known = ids[fam] || [], nm = names[fam] || {};
        Object.keys(map).forEach(function (id) {
          var inCatalogue = known.indexOf(id) >= 0;
          out.push({ famille: fam, id: id, name: nm[id] && nm[id].n || null, category: nm[id] && nm[id].c || null, url: nm[id] && nm[id].u ? '/' + String(nm[id].u).replace(/^\//, '') : null, inCatalogue: inCatalogue, stock: STOCKABLE[fam] ? stock(fam, id) : null });
        });
      });
      return out;
    }
    function summary(carnetId) {
      var k = carnet(carnetId); if (!k) return null;
      var total = 0, done = 0, wish = 0, unknownRefs = 0;
      k.familles.forEach(function (fam) { var known = ids[fam] || [], map = ownedMap(fam); total += known.length; Object.keys(map).forEach(function (id) { if (known.indexOf(id) >= 0) done += 1; else unknownRefs += 1; }); wish += wishes(fam).length; });
      return { id: k.id, titre: k.titre, total: total, done: done, wishes: wish, unknownRefs: unknownRefs, percent: total ? done / total * 100 : null };
    }
    function emit(kind) { listeners.forEach(function (fn) { try { fn({ kind: kind }); } catch (e) { /* un écouteur cassé n’arrête pas les autres */ } }); }
    function subscribe(fn) {
      if (typeof fn !== 'function') return function () {};
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (x) { return x !== fn; }); };
    }
    /* Changement venu d’un autre onglet : on relit, rien n’est écrasé. */
    function onStorage(event) { if (!event || typeof event.key !== 'string') return; if (event.key.indexOf('lk_') === 0) emit('external'); }
    return { KEYS: KEYS, owned: owned, isOwned: isOwned, setOwned: setOwned, stock: stock, setStock: setStock, clearStock: clearStock, wishes: wishes, isWished: isWished, setWish: setWish, applyEvent: applyEvent, hasEvent: hasEvent, carnet: carnet, entries: entries, summary: summary, subscribe: subscribe, onStorage: onStorage };
  }
  return Object.freeze({ create: create, KEYS: KEYS, OWN: OWN, STOCKABLE: STOCKABLE, VALID: VALID });
}));
