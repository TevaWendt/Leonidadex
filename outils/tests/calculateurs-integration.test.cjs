'use strict';
// Integration checks use the actual calculator HTML and DOM event propagation.
// JSDOM verifies state, validation and rendered content; browser QA still covers
// layout, native keyboard behavior and accessibility presentation.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const scripts = ['calculateurs-data.js', 'calculateurs-engine.js', 'calculateurs-tools.js', 'calculateurs.js'];
const scriptCode = scripts.map(file => [file, fs.readFileSync(path.join(root, file), 'utf8')]);
const pages = [];
test.afterEach(() => {
  for (const page of pages.splice(0)) {
    const errors = page.errors.slice();
    page.close();
    assert.deepEqual(errors, [], 'calculator scripts and DOM event handlers must not throw');
  }
});
function app(options = {}) {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error.message));
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'calculateurs.html'), 'utf8'), {
    url: options.url || 'https://www.leonidakit.com/calculateurs.html', runScripts: 'outside-only', virtualConsole
  });
  const window = dom.window, document = window.document;
  pages.push({ errors, close: () => window.close() });
  let copied = null;
  window.LK_VEHICULES = options.vehicles || [];
  window.LK_ARMES = [];
  window.LK_ACTIVITIES = options.activities || [];
  window.LK_CALCULATEURS_CATALOGUE = { entries: [], weaponImages: {} };
  window.LK = {
    esc: value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
    status() {}, async copy(value) { copied = value; return true; }
  };
  window.matchMedia = () => ({ matches: true });
  window.HTMLElement.prototype.scrollIntoView = function () {};
  window.setTimeout = () => 0;
  window.clearTimeout = () => {};
  for (const [key, value] of Object.entries(options.storage || {})) window.localStorage.setItem(key, value);
  for (const [filename, code] of scriptCode) window.eval(code + '\n//# sourceURL=' + filename);
  function node(id) {
    const element = document.getElementById(id);
    assert.ok(element, `Expected actual DOM element #${id}`);
    return element;
  }
  async function dispatch(type, target) {
    target.dispatchEvent(new window.Event(type, { bubbles: true, cancelable: true }));
    await Promise.resolve();
    await Promise.resolve();
  }
  async function edit(field, value) {
    const element = node('f-' + field.replaceAll('.', '-'));
    assert.equal(element.dataset.field, field);
    element.value = value === null ? '' : String(value);
    await dispatch('input', element);
  }
  async function choose(field, value) {
    const element = node('f-' + field.replaceAll('.', '-'));
    assert.ok(Array.from(element.options).some(option => option.value === value), `Existing option ${value}`);
    element.value = value;
    await dispatch('change', element);
  }
  async function click(dataset) {
    const button = Array.from(document.querySelectorAll('button')).find(candidate => Object.entries(dataset).every(([key, value]) => candidate.dataset[key] === value));
    assert.ok(button, `Expected real button ${JSON.stringify(dataset)}`);
    await dispatch('click', button);
  }
  async function share() {
    await dispatch('click', node('calc-share'));
    assert.ok(copied, 'the UI should copy a share URL');
    return { url: copied, config: JSON.parse(decodeURIComponent(new URL(copied).hash.slice(6))) };
  }
  async function importConfig(config) {
    const text = JSON.stringify(config), input = node('calc-import');
    Object.defineProperty(input, 'files', { value: [{ size: text.length, text: async () => text }], configurable: true });
    await dispatch('change', input);
  }
  const storage = () => Object.fromEntries(Array.from({ length: window.localStorage.length }, (_, i) => {
    const key = window.localStorage.key(i);
    return [key, window.localStorage.getItem(key)];
  }));
  return { node, edit, choose, click, share, importConfig, dispatch, document, window, location: window.location, storage };
}
const metric = (element, label) => Array.from(element.querySelectorAll('.calc-stat')).find(stat => stat.querySelector('span')?.textContent === label)?.querySelector('strong')?.textContent;

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
  assert.match(page.node('purchase-results').innerHTML, /Écris le prix/);
  await page.edit('purchase.price', 12345);
  assert.doesNotMatch(page.node('purchase-results').innerHTML, /Renseignez/);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).purchase.price, 12345);
});

test('manual purchase prices override a reference only in the scenario and can be reverted', async () => {
  const page = app({ vehicles: [{ id: 'known', nom: 'Prix sourcé', economy: { price: { value: 125000, status: 'verified', source: 'Source de test', verifiedAt: '2026-09-19' } } }] });
  const { config } = await page.share();
  config.purchase.itemId = 'known'; config.purchase.price = 1;
  await page.importConfig(config);
  assert.equal(Number(page.node('f-purchase-price').value), 1);
  assert.equal(page.node('f-purchase-price').readOnly, false);
  assert.match(page.node('purchase-selection').innerHTML, /vérifié/i);
  assert.match(page.node('purchase-selection').innerHTML, /Source de test/);
  assert.match(page.node('purchase-selection').innerHTML, /2026-09-19/);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).purchase.price, 1);
  assert.equal(page.window.LKCalcData.catalogue()[0].price, 125000, 'scenario override cannot mutate source data');
  assert.match(page.node('purchase-results').textContent, /prix personnel remplace la référence/);
  await page.dispatch('click', page.node('purchase-reference'));
  assert.equal(Number(page.node('f-purchase-price').value), 125000);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).purchase.price, 125000);
});

test('group constraints apply to both forward and inverse planning, and mixed exclusions are disclosed', async () => {
  const page = app();
  await page.choose('model', 'cycles');
  await page.edit('activities.1.players', 4);
  await page.edit('activities.2.players', 4);
  await page.choose('goal.selected', 'scenario-b');
  await page.choose('inverse.selected', 'scenario-b');
  assert.match(page.node('goal-results').innerHTML, /4 joueurs/);
  assert.match(page.node('inverse-results').innerHTML, /faisable avec ton nombre de joueurs/);
  assert.equal(metric(page.node('inverse-results'), 'Nombre de missions'), undefined);
  await page.choose('goal.selected', 'mixed');
  assert.equal(metric(page.node('goal-results'), 'Nombre de missions'), '36', 'only the accessible scenario contributes to the rotation');
  const routes = Array.from(page.node('goal-routes').querySelectorAll('.calc-route'));
  assert.equal(routes.length, 3);
  assert.match(routes[1].textContent, /Exemple B.*4 joueurs/s);
  assert.match(routes[2].textContent, /Exemple C.*4 joueurs/s);
  await page.edit('goal.players', 1.5);
  assert.match(page.node('goal-results').innerHTML, /nombre entier/);
});

test('missing activity duration remains unknown and does not qualify as a short session', async () => {
  const page = app();
  await page.choose('model', 'cycles');
  await page.edit('activities.0.name', 'Mission sans durée');
  await page.edit('activities.0.duration', null);
  assert.match(page.node('goal-results').innerHTML, /Renseignez/);
  const row = Array.from(page.node('activity-results').querySelectorAll('tbody tr')).find(row => row.querySelector('th').textContent === 'Mission sans durée');
  assert.ok(row);
  assert.equal(row.querySelectorAll('td')[2].textContent, '—', 'unknown duration is not zero minutes');
  page.node('activity-filter').value = 'short';
  await page.dispatch('change', page.node('activity-filter'));
  assert.doesNotMatch(page.node('activity-results').innerHTML, /Mission sans durée/);
});

test('scenario names refresh both selectors and remain escaped in generated result markup', async () => {
  const page = app(), name = '<img src=x onerror=alert(1)>';
  await page.edit('activities.0.name', name);
  for (const id of ['f-goal-selected', 'f-inverse-selected']) {
    assert.equal(Array.from(page.node(id).options).find(option => option.value === 'scenario-a').textContent, name + ' · à moi');
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
  assert.ok(Array.from(page.node('f-goal-selected').options).some(option => option.value === 'future-complete'));
  await page.choose('model', 'cycles');
  await page.choose('goal.selected', 'future-complete');
  await page.edit('goal.capital', 0); await page.edit('goal.target', 300);
  assert.equal(metric(page.node('goal-results'), 'Nombre de missions'), '3');
  assert.match(page.node('activity-results').innerHTML, /vérifié/i);
  await page.choose('goal.selected', 'future-incomplete');
  assert.match(page.node('goal-results').innerHTML, /Renseignez/);
  assert.equal((await page.share()).config.activities.length, 3);
});

test('vehicle comparison preserves source units and does not compute a km/h ratio from mph', async () => {
  const page = app({ vehicles: [{ id: 'mph-car', nom: 'Vitesse impériale', price: 100000, speed: { value: 120, unit: 'mph', status: 'estimated' } }] });
  const checkbox = page.document.querySelector('[data-compare="mph-car"]');
  assert.ok(checkbox);
  checkbox.checked = true;
  await page.dispatch('change', checkbox);
  const html = page.node('vehicle-comparison').innerHTML;
  assert.match(html, /mph · Estimation/);
  assert.match(html, /Pas de note quand il manque des données/);
  assert.match(html, /On ne donne pas de classement/);
  const speed = Array.from(page.node('vehicle-comparison').querySelectorAll('tbody tr')).find(row => row.querySelector('th').textContent === 'Vitesse');
  assert.equal(speed.querySelector('td').firstChild.textContent, '120', 'preserve the source measurement without unit conversion');
  assert.doesNotMatch(html, /Vitesse \(km\/h\)/);
});
