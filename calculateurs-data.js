/* LEONIDAKIT — adaptateur du calculateur. Sources originales inchangées.
   Les champs inconnus restent null : une fiche reconnue n'a pas nécessairement de prix connu. */
(function (global) {
  'use strict';
  var owns = function (o, k) { return !!o && Object.prototype.hasOwnProperty.call(o, k); };
  var text = function (value, limit) { return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit || 300) : null; };
  var object = function (value) { return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; };
  function number(value, integer) {
    if (typeof value === 'string' && /^\d+(?:[.,]\d+)?$/.test(value.trim())) value = Number(value.trim().replace(',', '.'));
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || (integer && !Number.isInteger(value))) return null;
    return value;
  }
  function safeLocal(value) {
    if (typeof value !== 'string' || !/^\/(?!\/)[a-z0-9][a-z0-9/_.%~-]*$/i.test(value)) return null;
    try {
      var decoded = decodeURIComponent(value);
      if (/[\\\s<>"'`?#]/.test(decoded) || decoded.indexOf('//') >= 0 || decoded.split('/').some(function (p) { return p === '.' || p === '..'; })) return null;
      return value;
    } catch (_) { return null; }
  }
  function date(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(?:T[\d:.+-]+Z?)?$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
  }
  function status(value, fallback) {
    var statuses = { officiel: 'official', official: 'official', vu: 'observed', observed: 'observed', comm: 'community', community: 'community', manual: 'manual', hypothetical: 'manual', verified: 'verified', confirmed: 'verified', estimated: 'estimated', unverified: 'unverified', 'source-listed': 'source-listed', unknown: 'unknown' };
    return statuses[value] || fallback || 'unknown';
  }
  function numericField(entry, name, aliases, integer) {
    var economy = object(entry.economy), selected, selectedKey, containers = [entry, economy];
    for (var i = 0; i < containers.length && selectedKey === undefined; i++) {
      for (var j = 0; j < aliases.length; j++) {
        if (owns(containers[i], aliases[j]) && containers[i][aliases[j]] !== null && containers[i][aliases[j]] !== undefined) {
          selected = containers[i][aliases[j]]; selectedKey = aliases[j]; break;
        }
      }
    }
    var wrapped = object(selected);
    var value = number(owns(wrapped, 'value') ? wrapped.value : selected, integer);
    var meta = Object.assign({}, object(object(economy.fieldMeta)[name]), object(economy[name + 'Meta']), object(object(entry.fieldMeta)[name]), object(entry[name + 'Meta']), object(wrapped.meta));
    for (var k of ['status', 'source', 'verifiedAt', 'unit']) if (owns(wrapped, k)) meta[k] = wrapped[k];
    return {
      value: value,
      meta: {
        status: value === null ? 'unknown' : status(meta.status, 'unverified'),
        source: text(meta.source, 1000),
        verifiedAt: date(meta.verifiedAt),
        unit: text(meta.unit, 40)
      }
    };
  }
  function normalize(entry, type, fallbackImage) {
    if (!entry || !/^[a-z0-9][a-z0-9-]*$/i.test(entry.id || '')) return null;
    var folders = { vehicle: 'vehicules', weapon: 'armes', property: 'demeures', business: 'entreprises', place: 'lieux' };
    var price = numericField(entry, 'price', ['price', 'prix', 'prixAchat']);
    var speed = numericField(entry, 'speed', ['speed', 'vitesseMax', 'vitesse']);
    var acceleration = numericField(entry, 'acceleration', ['acceleration']);
    var seats = numericField(entry, 'seats', ['seats', 'places'], true);
    if (seats.value === 0) { seats.value = null; seats.meta.status = 'unknown'; }
    return {
      id: entry.id, type: type,
      name: text(entry.name || entry.nom, 200) || entry.id,
      brand: text(entry.marque, 100),
      category: text(entry.category || entry.cat, 100) || type,
      image: safeLocal(entry.image) || safeLocal(entry.thumb) || safeLocal(fallbackImage),
      url: safeLocal(entry.url) || '/' + folders[type] + '/' + entry.id + '.html',
      price: price.value, speed: speed.value, acceleration: acceleration.value, seats: seats.value,
      status: status(entry.status || entry.st),
      source: text(entry.source || entry.src, 1000),
      verifiedAt: date(entry.verifiedAt),
      fieldMeta: { price: price.meta, speed: speed.meta, acceleration: acceleration.meta, seats: seats.meta },
      provenance: text(entry.provenance, 300) || (type === 'vehicle' ? 'vehicules-data.js#' : type === 'weapon' ? 'armes-data.js#' : 'outils/editorial.json#') + entry.id
    };
  }
  function catalogue() {
    var generated = object(global.LK_CALCULATEURS_CATALOGUE), images = object(generated.weaponImages);
    var rows = [];
    (Array.isArray(global.LK_VEHICULES) ? global.LK_VEHICULES : []).forEach(function (entry) { rows.push(normalize(entry, 'vehicle')); });
    (Array.isArray(global.LK_ARMES) ? global.LK_ARMES : []).forEach(function (entry) { rows.push(normalize(entry, 'weapon', images[entry.id])); });
    (Array.isArray(generated.entries) ? generated.entries : []).forEach(function (entry) {
      if (['property', 'business', 'place'].indexOf(entry.type) !== -1) rows.push(normalize(entry, entry.type));
    });
    return rows.filter(Boolean);
  }
  function activities() {
    // Absence de table publiée et sourcée : aucun gain fictif ne devient une activité GTA VI.
    return (Array.isArray(global.LK_ACTIVITIES) ? global.LK_ACTIVITIES : []).map(function (entry) {
      if (!entry || !/^[a-z0-9][a-z0-9-]*$/i.test(entry.id || '')) return null;
      var out = {
        id: entry.id, name: text(entry.name || entry.nom, 200) || entry.id,
        beginner: typeof entry.beginner === 'boolean' ? entry.beginner : null,
        source: text(entry.source, 1000), status: status(entry.status, 'unverified'),
        verifiedAt: date(entry.verifiedAt), fieldMeta: {}
      };
      ['reward', 'cost', 'duration', 'prep', 'cooldown', 'share', 'investment', 'players'].forEach(function (key) {
        var field = numericField(entry, key, [key], key === 'players');
        if ((key === 'share' && field.value > 100) || (key === 'players' && field.value === 0)) { field.value = null; field.meta.status = 'unknown'; }
        out[key] = field.value; out.fieldMeta[key] = field.meta;
      });
      return out;
    }).filter(Boolean);
  }
  var presets = [
    { id: 'scenario-a', name: 'Scénario A — missions courtes', reward: 25000, cost: 2500, duration: 12, prep: 3, cooldown: 5, share: 100, investment: 0, players: 1, beginner: true },
    { id: 'scenario-b', name: 'Scénario B — missions longues', reward: 120000, cost: 10000, duration: 40, prep: 10, cooldown: 10, share: 100, investment: 0, players: 1, beginner: false },
    { id: 'scenario-c', name: 'Scénario C — investissement', reward: 90000, cost: 15000, duration: 45, prep: 15, cooldown: 0, share: 100, investment: 500000, players: 1, beginner: false }
  ].map(function (entry) {
    return Object.freeze(Object.assign(entry, { status: 'manual', source: null, verifiedAt: null, hypothetical: true, note: 'Hypothèses pédagogiques modifiables. Aucun montant ni rythme de GTA VI confirmé.' }));
  });
  global.LKCalcData = Object.freeze({
    catalogue: catalogue, activities: activities, presets: Object.freeze(presets),
    meta: Object.freeze({ schemaVersion: 1, currency: '$', durationUnit: 'minute', shareUnit: 'percent', unknown: null, activitiesSource: 'window.LK_ACTIVITIES', presetsAreHypothetical: true, catalogueIsRuntime: true })
  });
})(window);
