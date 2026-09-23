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
const scripts = ['calculateurs-data.js', 'calculateurs-engine.js', 'calculateurs-tools.js', 'calculateurs-scenario.js', 'calculateurs-notebooks.js', 'calculateurs-workspace.js', 'calculateurs.js'];
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
  window.scrollTo = () => {};
  window.setTimeout = () => 0;
  window.clearTimeout = () => {};
  window.requestAnimationFrame = callback => { callback(); return 0; };
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
    if(!field.startsWith('purchase.'))assert.equal(element.dataset.field, field);
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

test('Relecture B: noms et montants du panier suivent la saisie sans perdre le focus',async()=>{
 const page=app();await page.click({bOrderCurrent:'1'});
 const config=(await page.share()).config,key=config.purchase.key,i=config.assets.findIndex(a=>a.key===key);
 const name=page.node('f-assets-'+i+'-name');name.focus();await page.edit('assets.'+i+'.name','Atelier test');
 assert.match(page.document.querySelector('.b-order-head').textContent,/Atelier test/);assert.equal(page.document.activeElement,name);
 await page.edit('assets.'+i+'.fees',12000);assert.match(page.document.querySelector('.b-order-head').textContent,/112\s000/);
 await page.edit('assets.'+i+'.fees',null);assert.match(page.document.querySelector('.b-order-head').textContent,/inconnu|à préciser/i);
 await page.edit('goal.capital',321000);assert.match(page.document.querySelector('#panel-order .calc-grid .calc-card').textContent,/321\s000/);
 await page.click({tab:'roi'});assert.match(page.node('roi-selection').textContent,/Atelier test/);
});
test('Relecture B: les activités renommées se mettent aussi à jour dans les liens de rentabilité',async()=>{
 const page=app();await page.edit('activities.0.name','Mission renommée');
 assert.match(page.document.querySelector('[data-b-roi-activity="scenario-a"]').parentElement.textContent,/Mission renommée/);
});
test('Relecture B: un calendrier vide ne masque pas la progression et indique le bon champ à compléter',async()=>{
 const page=app();await page.click({tab:'session'});await page.click({mode:'advanced'});await page.edit('session.daysPerWeek',null);
 const text=page.node('session-results').textContent;assert.match(text,/Il te manquera encore|Il restera/);assert.match(text,/jours/);assert.doesNotMatch(text,/Définis un objectif|null|undefined/);
 await page.click({mode:'quick'});await page.click({bFocus:'f-session-daysPerWeek'});
 assert.equal(page.node('calc-panels').dataset.mode,'advanced');assert.equal(page.document.activeElement,page.node('f-session-daysPerWeek'));
});
test('Relecture B: le mode Simple signale les frais inconnus et seulement les activités utilisées',async()=>{
 const page=app();await page.edit('activities.1.cost',123);await page.click({tab:'goal'});
 assert.doesNotMatch(page.node('mode-summary-goal').textContent,/Scénario B/);
 await page.click({tab:'purchase'});await page.edit('purchase.fees',null);
 assert.match(page.node('mode-summary-purchase').textContent,/frais.*à préciser/i);
});
test('Relecture B: la limite de carnet est expliquée sans exception au clic Dupliquer',async()=>{
 const original=app(),config=(await original.share()).config,now=new Date().toISOString();
 const entries=Array.from({length:160},(_,i)=>({id:'entry-'+i,tool:'goal',name:'Calcul '+i,createdAt:now,updatedAt:now,config,summary:'OK'}));
 const page=app({storage:{'lk-calculator-notebooks-v3':JSON.stringify({version:3,entries,active:{goal:'entry-0'},references:{}})}});
 await page.click({bDuplicate:'entry-0'});assert.match(page.node('calc-live').textContent,/Carnet plein/);
 assert.equal(page.document.querySelectorAll('.b-notebook-entry').length,160);
});
test('Relecture B: un import composé uniquement d’achats du catalogue peut revenir à un achat libre',async()=>{
 const page=app({vehicles:[{id:'known',nom:'Véhicule témoin'}]});await page.click({item:'known'});
 const config=(await page.share()).config;config.assets=config.assets.filter(a=>a.itemId);config.roi.key=config.purchase.key;
 await page.importConfig(config);await page.dispatch('click',page.node('purchase-manual'));
 assert.match(page.node('purchase-selection').textContent,/MON PRIX À MOI|PERSONNEL/);assert.equal(page.node('f-purchase-price').value,'');
});

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
  assert.match(page.node('purchase-results').innerHTML, /Écris le prix|Écris |Renseignez/);
  await page.edit('purchase.price', 12345);
  assert.doesNotMatch(page.node('purchase-results').innerHTML, /Écris le prix|Écris |Renseignez/);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).assets.find(a=>a.key===JSON.parse(page.storage()['lk-calculator-v1']).purchase.key).price, 12345);
});

test('manual purchase prices override a reference only in the scenario and can be reverted', async () => {
  const page = app({ vehicles: [{ id: 'known', nom: 'Prix sourcé', economy: { price: { value: 125000, status: 'verified', source: 'Source de test', verifiedAt: '2026-09-19' } } }] });
  const { config } = await page.share();
  config.assets.push({key:'known',itemId:'known',name:'Prix sourcé',price:1,referencePrice:125000,extras:0,owned:false,incomeMode:'none',boostHourly:0}); config.purchase.key='known';
  await page.importConfig(config);
  assert.equal(Number(page.node('f-purchase-price').value), 1);
  assert.equal(page.node('f-purchase-price').readOnly, false);
  assert.match(page.node('purchase-selection').innerHTML, /vérifié/i);
  assert.match(page.node('purchase-selection').innerHTML, /Source de test/);
  assert.match(page.node('purchase-selection').innerHTML, /2026-09-19/);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).assets.find(a=>a.key===JSON.parse(page.storage()['lk-calculator-v1']).purchase.key).price, 1);
  assert.equal(page.window.LKCalcData.catalogue()[0].price, 125000, 'scenario override cannot mutate source data');
  assert.match(page.node('purchase-results').textContent, /prix personnel remplace la référence/);
  await page.click({bPriceReset:'known'});
  assert.equal(Number(page.node('f-purchase-price').value), 125000);
  assert.equal(JSON.parse(page.storage()['lk-calculator-v1']).assets.find(a=>a.key===JSON.parse(page.storage()['lk-calculator-v1']).purchase.key).price, 125000);
});

test('group constraints apply to both forward and inverse planning, and mixed exclusions are disclosed', async () => {
  const page = app();
  await page.choose('model', 'cycles');
  await page.edit('activities.1.players', 4);
  await page.edit('activities.2.players', 4);
  await page.choose('goal.selected', 'scenario-b');
  await page.choose('inverse.selected', 'scenario-b');
  assert.match(page.node('goal-results').innerHTML, /4 joueurs/);
  assert.match(page.node('inverse-results').innerHTML, /se joue à 4 joueurs.*vous êtes 1/);
  assert.equal(metric(page.node('inverse-results'), 'Nombre de missions'), undefined);
  await page.choose('goal.selected', 'mixed');
  assert.equal(metric(page.node('goal-results'), 'Nombre de missions'), '36', 'only the accessible scenario contributes to the rotation');
  const routes = Array.from(page.node('goal-routes').querySelectorAll('.calc-route'));
  assert.equal(routes.length, 3);
  assert.match(routes[1].textContent, /Exemple B.*4 joueurs/s);
  assert.match(routes[2].textContent, /Exemple C.*4 joueurs/s);
  await page.edit('goal.players', 1.5);
  assert.match(page.node('goal-results').innerHTML, /entre 1 et 100/);
});

test('missing activity duration remains unknown and does not qualify as a short session', async () => {
  const page = app();
  await page.choose('model', 'cycles');
  await page.edit('activities.0.name', 'Mission sans durée');
  await page.edit('activities.0.duration', null);
  assert.match(page.node('goal-results').innerHTML, /Écris le prix|Écris |Renseignez/);
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
  assert.match(page.node('goal-results').innerHTML, /Écris le prix|Écris |Renseignez/);
  assert.equal((await page.share()).config.activities.length, 3);
});

test('vehicle comparison preserves source units and does not compute a km/h ratio from mph', async () => {
  const page = app({ vehicles: [{ id: 'mph-car', nom: 'Vitesse impériale', price: 100000, speed: { value: 120, unit: 'mph', status: 'estimated' } }, { id: 'unknown-car', nom: 'Autre véhicule' }] });
  const checkbox = page.document.querySelector('[data-compare="mph-car"]');
  assert.ok(checkbox);
  checkbox.checked = true;
  await page.dispatch('change', checkbox);
  assert.match(page.node('vehicle-comparison').innerHTML, /coche encore une fiche/, 'une fiche : invitation à en cocher une deuxième');
  const second = page.document.querySelector('[data-compare="unknown-car"]');
  second.checked = true;
  await page.dispatch('change', second);
  const html = page.node('vehicle-comparison').innerHTML;
  assert.match(html, /120 mph<br><small>Estimation/);
  assert.match(html, /ne donne pas de note ni de classement/);
  assert.match(html, /Pas encore connu/);
  const speed = Array.from(page.node('vehicle-comparison').querySelectorAll('tbody tr')).find(row => row.querySelector('th').textContent === 'Vitesse');
  assert.equal(speed.querySelector('td').firstChild.textContent, '120 mph', 'preserve the source measurement without unit conversion');
  assert.equal(speed.querySelectorAll('td')[1].textContent, 'Pas encore connu', 'une vitesse absente ne devient pas zéro');
  assert.doesNotMatch(html, /Vitesse \(km\/h\)/);
});

test('solo examples B and C restore complete valid contexts after contradictory inputs', async () => {
  const page = app();
  for (const [id, index, runs, profit, capital] of [['scenario-b', 1, '1', 110000, 200000], ['scenario-c', 2, '8', 100000, 600000]]) {
    await page.edit('goal.capital', 0);
    await page.edit('goal.reserve', 500000);
    await page.edit('goal.players', 4);
    await page.edit('activities.' + index + '.duration', 0);
    await page.edit('activities.' + index + '.players', 4);
    await page.edit('inverse.minutes', null);
    await page.click({activityExample: id});
    assert.equal(page.node('inverse-results').querySelector('.calc-warning'), null);
    assert.equal(metric(page.node('inverse-results'), 'Nombre de missions'), runs);
    assert.equal(metric(page.node('inverse-results'), 'Gagné en tout, achats de départ enlevés').replace(/\D/g, ''), String(profit));
    const {config} = await page.share();
    assert.equal(config.goal.players, 1);
    assert.equal(config.activities[index].players, 1);
    assert.equal(config.goal.capital, capital);
    assert.equal(config.goal.reserve, 0);
    assert.equal(config.inverse.selected, id);
    assert.equal(page.node('activity-capital').value, String(capital));
    assert.equal(page.node('f-goal-capital').value, String(capital));
    assert.equal(page.node('activity-group-size').hidden, true);
    assert.ok(page.node('inverse-results').classList.contains('is-highlighted'));
    assert.match(page.node('activity-live').textContent, /Réponse actualisée/);
  }
});

test('visible group control shares goal state and retains precise validation', async () => {
  const page = app();
  const radio = value => page.document.querySelector('[name="activity-play-mode"][value="'+value+'"]');
  radio('group').checked = true;
  await page.dispatch('change', radio('group'));
  assert.equal(page.node('activity-group-size').hidden, false);
  assert.equal(page.node('f-goal-players').value, '2');
  const count = page.node('activity-players');count.value = '4';await page.dispatch('input', count);
  assert.equal(page.node('f-goal-players').value, '4');
  await page.edit('goal.players', 3);
  assert.equal(count.value, '3', 'synchronisation aussi depuis Mon objectif');
  for (const invalid of ['', '1.5', '101']) {
    count.value = invalid;await page.dispatch('input', count);
    assert.equal(count.getAttribute('aria-invalid'), 'true');
    assert.match(page.node('inverse-results').textContent, /joueurs entre 1 et 100/);
  }
  radio('solo').checked = true;await page.dispatch('change', radio('solo'));
  assert.equal(page.node('f-goal-players').value, '1');
  assert.equal(page.node('inverse-results').querySelector('.calc-warning'), null);
  assert.equal(page.node('f-goal-players').getAttribute('aria-invalid'), 'false');
});

test('Lot B: direct ROI route preloads canonical price, survives reload, and handles a removed id', async () => {
  const vehicles=[{id:'known',nom:'Achat pédagogique',price:{value:42000,status:'verified',source:'Fixture de test'}}];
  const page=app({vehicles,url:'https://www.leonidakit.com/calculateurs.html?tool=roi&type=vehicle&id=known'});
  assert.equal(page.node('panel-roi').hidden,false);assert.equal(page.node('f-roi-purchase').value,'42000');
  assert.match(page.node('roi-selection').textContent,/Fixture de test/);
  const input=page.node('f-roi-purchase');input.value='45 000,50';await page.dispatch('input',input);
  assert.equal(page.window.LKCalcData.catalogue()[0].price,42000);
  const reload=app({vehicles,storage:page.storage()});assert.equal(reload.node('f-roi-purchase').value,'45000.5');
  await reload.click({bPriceReset:'known'});assert.equal(reload.node('f-roi-purchase').value,'42000');
  const unknown=app({vehicles,url:'https://www.leonidakit.com/calculateurs.html?tool=roi&id=removed'});assert.equal(unknown.node('panel-roi').hidden,false);assert.match(unknown.node('calc-live').textContent,/n’existe plus/);
});

test('Lot B: order suggestions use canonical aliases, accents, keyboard selection and shared prices', async () => {
 const page=app({vehicles:[{id:'actual',nom:'Modèle du catalogue',insp:'Ferrari 296',price:12345}]});
 await page.click({tab:'order'});const search=page.node('order-search');search.value='FÉ';await page.dispatch('input',search);
 assert.equal(search.getAttribute('aria-expanded'),'true');assert.equal(page.node('order-search-list').querySelectorAll('[role=option]').length,1);
 search.dispatchEvent(new page.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));assert.ok(search.getAttribute('aria-activedescendant'));
 search.dispatchEvent(new page.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 const saved=JSON.parse(page.storage()['lk-calculator-v1']);assert.deepEqual(saved.order.keys,['actual']);assert.equal(saved.assets.find(a=>a.key==='actual').price,12345);
 assert.match(page.node('order-results').textContent,/Modèle du catalogue/);assert.equal(page.node('order-search').getAttribute('aria-expanded'),'false');
});

test('Lot B: notebook isolates tools, updates an entry, restores a plan and retains completion flags', async () => {
 const page=app();page.window.confirm=()=>true;
 await page.dispatch('click',page.node('calc-save'));await page.dispatch('click',page.node('calc-save'));
 assert.equal(page.document.querySelectorAll('.b-notebook-entry').length,1);
 await page.click({tab:'session'});assert.equal(page.document.querySelectorAll('.b-notebook-entry').length,0);
 await page.click({sessionMinutes:'45'});await page.click({bComplete:'session'});await page.click({tab:'plan'});
 await page.dispatch('click',page.node('calc-save'));
 const bundle=JSON.parse(page.storage()['lk-calculator-notebooks-v3']),plan=bundle.entries.find(e=>e.tool==='plan');assert.ok(plan.config.completed.includes('session'));
 const again=app({storage:page.storage()});again.window.confirm=()=>true;assert.equal(again.node('panel-plan').hidden,false);
 await again.click({bLoad:plan.id});assert.equal(again.node('f-session-minutes').value,'45');assert.ok(JSON.parse(again.storage()['lk-calculator-v1']).completed.includes('session'));
 await again.click({tab:'goal'});await again.edit('goal.target',2000000);await again.click({tab:'plan'});assert.equal(JSON.parse(again.storage()['lk-calculator-v1']).completed.length,0);
 assert.match(again.node('plan-summary').textContent,/2.000.000/);
});

test('Lot B: corrupted notebook entry does not hide a valid saved calculation', async () => {
 const page=app();await page.dispatch('click',page.node('calc-save'));const store=page.storage(),bundle=JSON.parse(store['lk-calculator-notebooks-v3']);bundle.entries.push({id:'broken',tool:'goal',config:{version:999}});store['lk-calculator-notebooks-v3']=JSON.stringify(bundle);
 const again=app({storage:store});assert.equal(again.document.querySelectorAll('.b-notebook-entry').length,1);assert.match(again.node('goal-results').textContent,/800.000/);
});
