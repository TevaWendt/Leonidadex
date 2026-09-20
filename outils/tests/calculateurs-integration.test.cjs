'use strict';
// Dependency-free integration checks for the real data, engine, tools and controller.
// This miniature DOM covers events, form values and rendered strings. It does not
// replace browser checks for layout, keyboard focus, native validation or animations.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const scripts = ['calculateurs-data.js', 'calculateurs-engine.js', 'calculateurs-tools.js', 'calculateurs.js'];
const scriptCode = scripts.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
const decode = value => String(value).replace(/&(?:amp|lt|gt|quot|apos|#39|#(\d+));/g, (match, code) => code ? String.fromCharCode(Number(code)) : ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&#39;': "'" })[match]);

function app(options = {}) {
  const nodes = new Map(), documentListeners = new Map();
  const storage = new Map(Object.entries(options.storage || {}));
  let currentUrl = new URL(options.url || 'https://www.leonidakit.com/calculateurs.html');
  let copied = null;
  function node(id = '') {
    if (nodes.has(id)) return nodes.get(id);
    let html = '';
    const listeners = new Map();
    const value = {
      id, tagName: 'DIV', type: '', value: '', textContent: '', dataset: {}, options: [], style: {},
      hidden: false, checked: false, readOnly: false,
      addEventListener(type, callback) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push(callback); },
      async emit(type, event = {}) { for (const callback of listeners.get(type) || []) await callback({ target: this, ...event }); },
      setAttribute(name, content) { this[name] = String(content); },
      matches(selector) { return selector === '[data-field]' ? !!this.dataset.field : selector === 'select[data-field]' && this.tagName === 'SELECT' && !!this.dataset.field; },
      closest(selector) { return selector === 'button' && this.tagName === 'BUTTON' ? this : null; },
      focus() {}, scrollIntoView() {}, click() {},
      get innerHTML() { return html; },
      set innerHTML(content) { html = String(content); discover(html); }
    };
    nodes.set(id, value);
    return value;
  }
  function attrs(markup) {
    const result = {};
    for (const match of markup.matchAll(/([a-zA-Z][\w-]*)(?:="([^"]*)")?/g)) result[match[1]] = decode(match[2] || '');
    return result;
  }
  function discover(html) {
    for (const match of html.matchAll(/<(input|select|button|section|div|output|progress)\b([^>]*)>/g)) {
      const a = attrs(match[2]);
      if (!a.id) continue;
      const element = node(a.id);
      element.tagName = match[1].toUpperCase();
      element.type = a.type || '';
      if ('value' in a) element.value = a.value;
      element.dataset = Object.fromEntries(Object.entries(a).filter(([key]) => key.startsWith('data-')).map(([key, content]) => [key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()), content]));
    }
    for (const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/g)) {
      const a = attrs(match[1]);
      if (!a.id) continue;
      const select = node(a.id);
      select.options = Array.from(match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g), option => {
        const attributes = attrs(option[1]);
        return { value: attributes.value || '', textContent: decode(option[2]), selected: 'selected' in attributes };
      });
      select.value = (select.options.find(option => option.selected) || select.options[0] || {}).value || '';
    }
  }
  const location = {};
  for (const key of ['href', 'hash', 'pathname', 'search']) Object.defineProperty(location, key, { get: () => currentUrl[key] });
  const document = {
    getElementById: node, querySelector: node, querySelectorAll: () => [],
    addEventListener(type, callback) { if (!documentListeners.has(type)) documentListeners.set(type, []); documentListeners.get(type).push(callback); },
    createElement(tag) { const value = node('created-' + nodes.size); value.tagName = tag.toUpperCase(); return value; }
  };
  const window = {
    LK_VEHICULES: options.vehicles || [], LK_ARMES: [], LK_ACTIVITIES: options.activities || [],
    LK_CALCULATEURS_CATALOGUE: { entries: [], weaponImages: {} },
    LK: {
      esc: value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
      status() {}, async copy(value) { copied = value; }
    },
    addEventListener() {}
  };
  const context = vm.createContext({
    window, globalThis: window, document, location, Intl, URL, console,
    history: { replaceState(_state, _title, url) { currentUrl = new URL(String(url), currentUrl); } },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) },
    matchMedia: () => ({ matches: true }), setTimeout: () => 0, clearTimeout() {}
  });
  for (const [filename, code] of scriptCode) vm.runInContext(code, context, { filename });
  async function dispatch(type, target) { for (const callback of documentListeners.get(type) || []) await callback({ target }); }
  async function edit(field, value) {
    const element = node('f-' + field.replaceAll('.', '-'));
    element.dataset.field = field;
    if (!element.type) element.type = field.endsWith('.name') ? 'text' : 'number';
    element.value = value === null ? '' : String(value);
    await dispatch('input', element);
  }
  async function choose(field, value) {
    const element = node('f-' + field.replaceAll('.', '-'));
    element.tagName = 'SELECT'; element.type = 'select-one'; element.dataset.field = field; element.value = value;
    await dispatch('change', element);
  }
  async function click(dataset) {
    const button = node('test-button'); button.tagName = 'BUTTON'; button.dataset = dataset;
    await dispatch('click', button);
  }
  async function share() {
    await node('calc-share').emit('click');
    assert.ok(copied, 'the UI should copy a share URL');
    return { url: copied, config: JSON.parse(decodeURIComponent(new URL(copied).hash.slice(6))) };
  }
  async function importConfig(config) {
    const text = JSON.stringify(config), input = node('calc-import');
    input.files = [{ size: text.length, text: async () => text }];
    await input.emit('change');
  }
  return { node, edit, choose, click, share, importConfig, dispatch, window, location, storage: () => Object.fromEntries(storage) };
}

test('source adapter distinguishes unknown price from an explicit zero with field provenance', () => {
  const page = app({ vehicles: [
    { id: 'unknown', nom: 'Inconnu', st: 'officiel' },
    { id: 'free', nom: 'Gratuit', price: { value: 0, status: 'verified', source: 'Source de test', verifiedAt: '2026-09-19', unit: '$' } }
  ] });
  const [unknown, free] = page.window.LKCalcData.catalogue();
  assert.equal(unknown.price, null);
  assert.equal(unknown.fieldMeta.price.status, 'unknown');
  assert.equal(free.price, 0);
  assert.equal(free.fieldMeta.price.status, 'verified');
  assert.equal(free.fieldMeta.price.source, 'Source de test');
  assert.equal(free.fieldMeta.price.verifiedAt, '2026-09-19');
  assert.equal(free.fieldMeta.price.unit, '$');
});

test('unknown catalogue prices require a manual amount and do not silently become free purchases', async () => {
  const page = app({ vehicles: [{ id: 'unknown', nom: 'Prix inconnu' }] });
  await page.click({ item: 'unknown' });
  assert.equal(page.node('f-purchase-price').value, '');
  assert.equal(page.node('f-purchase-price').readOnly, false);
  assert.match(page.node('purchase-results').innerHTML, /Renseignez/);
  await page.edit('purchase.price', 12345);
  assert.doesNotMatch(page.node('purchase-results').innerHTML, /Renseignez/);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).purchase.price, 12345);
});

test('future catalogue prices remain authoritative after importing a conflicting manual number', async () => {
  const page = app({ vehicles: [{ id: 'known', nom: 'Prix sourcé', economy: { price: { value: 125000, status: 'verified', source: 'Source de test', verifiedAt: '2026-09-19' } } }] });
  const { config } = await page.share();
  config.purchase.itemId = 'known'; config.purchase.price = 1;
  await page.importConfig(config);
  assert.equal(Number(page.node('f-purchase-price').value), 125000);
  assert.equal(page.node('f-purchase-price').readOnly, true);
  assert.match(page.node('purchase-selection').innerHTML, /Vérifié/);
  assert.match(page.node('purchase-selection').innerHTML, /Source de test/);
  assert.match(page.node('purchase-selection').innerHTML, /2026-09-19/);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).purchase.price, 125000);
});

test('group constraints apply to both forward and inverse planning, and mixed exclusions are disclosed', async () => {
  const page = app();
  await page.edit('activities.1.players', 4);
  await page.edit('activities.2.players', 4);
  await page.choose('goal.selected', 'scenario-b');
  await page.choose('inverse.selected', 'scenario-b');
  assert.match(page.node('goal-results').innerHTML, /4 joueurs/);
  assert.match(page.node('inverse-results').innerHTML, /4 joueurs/);
  assert.doesNotMatch(page.node('inverse-results').innerHTML, /Missions terminées/);
  await page.choose('goal.selected', 'mixed');
  assert.match(page.node('goal-results').innerHTML, /Rotation : Scénario A/);
  assert.match(page.node('goal-results').innerHTML, /Scénarios exclus/);
  await page.edit('goal.players', 1.5);
  assert.match(page.node('goal-results').innerHTML, /nombre entier/);
});

test('missing activity duration remains unknown and does not qualify as a short session', async () => {
  const page = app();
  await page.edit('activities.0.name', 'Mission sans durée');
  await page.edit('activities.0.duration', null);
  assert.match(page.node('goal-results').innerHTML, /Renseignez/);
  const row = page.node('activity-results').innerHTML.match(/<tr><td><strong>Mission sans durée[\s\S]*?<\/tr>/)[0];
  assert.doesNotMatch(row, /0 min/);
  page.node('activity-filter').value = 'short';
  await page.dispatch('change', page.node('activity-filter'));
  assert.doesNotMatch(page.node('activity-results').innerHTML, /Mission sans durée/);
});

test('scenario names refresh both selectors and remain escaped in generated result markup', async () => {
  const page = app(), name = '<img src=x onerror=alert(1)>';
  await page.edit('activities.0.name', name);
  for (const id of ['f-goal-selected', 'f-inverse-selected']) {
    assert.equal(page.node(id).options.find(option => option.value === 'scenario-a').textContent, name + ' · hypothèse');
  }
  assert.match(page.node('activity-results').innerHTML, /&lt;img/);
  assert.doesNotMatch(page.node('activity-results').innerHTML, /<img src=x/);
  assert.doesNotMatch(page.node('goal-routes').innerHTML, /<img src=x/);
});

test('invalid imported numeric strings are rejected without replacing the current scenario', async () => {
  const page = app();
  await page.edit('goal.capital', 345678);
  const { config } = await page.share();
  config.goal.capital = '999999';
  await page.importConfig(config);
  assert.match(page.node('calc-live').textContent, /Import refusé/);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).goal.capital, 345678);
  assert.equal((await page.share()).config.goal.capital, 345678);
});

test('shared configuration roundtrips, then editing clears the stale URL so reloading keeps the edit', async () => {
  const original = app();
  await original.edit('goal.capital', 345678);
  await original.edit('activities.0.share', 25);
  const shared = await original.share();
  const opened = app({ url: shared.url });
  assert.equal(Number(opened.node('f-goal-capital').value), 345678);
  assert.equal((await opened.share()).config.activities[0].share, 25);
  await opened.edit('goal.capital', 456789);
  assert.equal(opened.location.hash, '');
  const reloaded = app({ url: opened.location.href, storage: opened.storage() });
  assert.equal(Number(reloaded.node('f-goal-capital').value), 456789);
});

test('future source activities become selectable without a manual duplicate, while incomplete data stays invalid', async () => {
  const page = app({ activities: [
    { id: 'future-complete', name: 'Activité future sourcée', reward: 100, cost: 0, duration: 10, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1, status: 'verified', source: 'Source de test' },
    { id: 'future-incomplete', name: 'Activité incomplète', reward: 100, duration: null, players: 1 }
  ] });
  assert.ok(page.node('f-goal-selected').options.some(option => option.value === 'future-complete'));
  await page.choose('goal.selected', 'future-complete');
  await page.edit('goal.capital', 0); await page.edit('goal.target', 300);
  assert.match(page.node('goal-results').innerHTML, />3<\/strong><span>missions/);
  assert.match(page.node('activity-results').innerHTML, /Vérifié/);
  await page.choose('goal.selected', 'future-incomplete');
  assert.match(page.node('goal-results').innerHTML, /Renseignez/);
  assert.equal((await page.share()).config.activities.length, 3);
});

test('vehicle comparison preserves source units and does not compute a km/h ratio from mph', async () => {
  const page = app({ vehicles: [{ id: 'mph-car', nom: 'Vitesse impériale', price: 100000, speed: { value: 120, unit: 'mph', status: 'estimated' } }] });
  const checkbox = page.node('test-compare'); checkbox.dataset.compare = 'mph-car'; checkbox.checked = true;
  await page.dispatch('change', checkbox);
  const html = page.node('vehicle-comparison').innerHTML;
  assert.match(html, /mph · Estimation/);
  assert.match(html, /Données insuffisantes/);
  assert.doesNotMatch(html, /Vitesse \(km\/h\)/);
});
