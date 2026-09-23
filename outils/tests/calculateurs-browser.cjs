#!/usr/bin/env node
'use strict';
/* Run from the repository root with Playwright available through NODE_PATH.
 * No build or package.json is required. The local server applies Vercel's CSP.
 * Reports and screenshots are written outside the deployable site by default.
 */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = process.argv.includes('--dom') ? {} : require('playwright');

const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const reportFile = path.resolve(process.env.QA_REPORT || path.join(root, '../../qa.txt'));
const screenshotDir = path.resolve(process.env.QA_SCREENSHOTS || path.join(root, '../../qa-screenshots'));
const messages = [];
let passed = 0;
let failed = 0;
function note(message) { messages.push(message); console.log(message); }
function check(condition, message, detail) {
  condition ? passed++ : failed++;
  note(`${condition ? 'PASS' : 'FAIL'} ${message}${detail ? ' — ' + detail : ''}`);
}
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const commonHeaders = Object.fromEntries((vercel.headers.find(rule => rule.source === '/(.*)')?.headers || []).map(header => [header.key, header.value]));

function createServer() {
  return http.createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return; }
    fs.stat(file, (error, stat) => {
      if (error || !stat.isFile()) { response.writeHead(404, commonHeaders).end('Not found'); return; }
      response.writeHead(200, { ...commonHeaders, 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(response);
    });
  });
}

async function overflow(page, label) {
  const result = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const scrollWidth = document.documentElement.scrollWidth;
    const offenders = [...document.querySelectorAll('body *')].filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return rect.width > 0 && (rect.right > width + 2 || rect.left < -2) && style.position !== 'fixed' && style.visibility !== 'hidden';
    }).slice(0, 8).map(el => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${String(el.className).slice(0, 80)}`);
    return { width, scrollWidth, offenders };
  });
  check(result.scrollWidth <= result.width + 2, `No horizontal overflow (${label})`, JSON.stringify(result));
}

async function badNumbers(page, label) {
  const text = await page.locator('main').innerText();
  const bad = text.match(/\b(?:NaN|Infinity|undefined)\b/g);
  check(!bad, `No invalid calculation text (${label})`, bad?.join(', '));
}

async function localReferences(page, origin) {
  const urls = await page.evaluate(() => [...new Set([...document.querySelectorAll('script[src],link[rel="stylesheet"][href],img[src],source[srcset]')].flatMap(el => {
    if (el.hasAttribute('srcset')) return el.getAttribute('srcset').split(',').map(part => new URL(part.trim().split(/\s+/)[0], document.baseURI).href);
    return [el.src || el.href];
  }))]);
  const missing = [];
  for (const url of urls.filter(url => url && url.startsWith(origin))) {
    const response = await page.request.get(url);
    if (!response.ok()) missing.push(`${response.status()} ${url}`);
  }
  check(!missing.length, 'All local script, stylesheet and image references resolve', missing.join('; '));
  const metadata = await page.evaluate(() => ({
    canonical: document.querySelector('link[rel="canonical"]')?.href,
    robots: document.querySelector('meta[name="robots"]')?.content || '',
    scripts: [...document.scripts].filter(script => !script.src && (!script.type || script.type === 'text/javascript')).length,
    handlers: [...document.querySelectorAll('*')].flatMap(el => [...el.attributes].filter(attribute => /^on/i.test(attribute.name)).map(attribute => attribute.name))
  }));
  check(metadata.canonical === 'https://www.leonidakit.com/calculateurs.html', 'Calculator canonical URL');
  check(!/noindex/i.test(metadata.robots), 'Calculator page can be indexed');
  check(metadata.scripts === 0 && metadata.handlers.length === 0, 'No executable inline scripts or inline handlers conflict with CSP', JSON.stringify(metadata));
}

async function navigateTabs(page, viewport) {
  const tabs = await page.locator('button[data-tab]').evaluateAll(buttons => buttons.map(button => ({ id: button.dataset.tab, text: button.textContent.trim() })));
  check(tabs.length >= 4, `Specialized calculator navigation exists (${viewport})`, String(tabs.length));
  for (const tab of tabs) {
    const button = page.locator(`button[data-tab="${tab.id}"]`).first();
    await button.click();
    await page.waitForTimeout(100);
    const panelId = await button.getAttribute('aria-controls');
    check(await button.getAttribute('aria-selected') === 'true' && !!panelId && await page.locator(`#${panelId}`).isVisible(), `Tab activates its labelled panel (${viewport}/${tab.id})`);
    await badNumbers(page, `${viewport}/${tab.id}`);
    await overflow(page, `${viewport}/${tab.id}`);
    if (['goal', 'roi', 'budget'].includes(tab.id)) {
      await page.evaluate(() => window.scrollTo(0, document.getElementById('atelier').offsetTop - 20));
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(screenshotDir, `calculator-${viewport}-${tab.id}.png`) });
    }
  }
  if (tabs.length) await page.locator(`button[data-tab="${tabs[0].id}"]`).first().click();
  if (tabs.length > 1) {
    await page.locator(`button[data-tab="${tabs[0].id}"]`).first().focus();
    await page.keyboard.press('ArrowRight');
    check(await page.locator(`button[data-tab="${tabs[1].id}"]`).first().getAttribute('aria-selected') === 'true', `Arrow keys activate tabs (${viewport})`);
    await page.locator(`button[data-tab="${tabs[0].id}"]`).first().click();
  }
}

async function persistenceAndShare(page, context, browser, origin) {
  await page.locator('button[data-tab="goal"]').click();
  const input = page.locator('#f-goal-capital');
  await input.fill('271828');
  await input.dispatchEvent('change');
  await page.waitForTimeout(400);
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('button[data-tab="goal"]').click();
  check(await page.locator('#f-goal-capital').inputValue().then(v => v.replace(/\s/g, '')) === '271828', 'Current configuration survives reload');
  page.on('dialog', dialog => dialog.accept(dialog.type() === 'prompt' ? 'QA navigateur' : undefined));
  await page.locator('#calc-save').click();
  await page.locator('.calc-saved summary').click();
  check(await page.locator('#saved-list [data-b-load]').count() > 0, 'Saved configuration appears in the notebook');
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('.calc-saved summary').click();
  check(await page.locator('#saved-list [data-b-load]').count() > 0, 'Notebook survives reload');
  await page.locator('#f-goal-capital').fill('222222');
  await page.locator('#saved-list [data-b-load]').first().click();
  check(await page.locator('#f-goal-capital').inputValue().then(v => v.replace(/\s/g, '')) === '271828', 'Opening a favourite restores its parameters');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.locator('#calc-share').click();
  let shared = await page.evaluate(async () => { try { return await navigator.clipboard.readText(); } catch { return ''; } });
  if (!shared.startsWith(origin)) shared = page.url();
  check(shared.startsWith(origin) && shared.includes('#') && shared.split('#')[1].length > 20, 'Share produces an URL containing the configuration');
  if (shared.startsWith(origin) && shared.includes('#')) {
    const clean = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await clean.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const sharedPage = await clean.newPage();
    await sharedPage.goto(shared, { waitUntil: 'networkidle' });
    await sharedPage.locator('button[data-tab="goal"]').click();
    check(await sharedPage.locator('#f-goal-capital').inputValue().then(v => v.replace(/\s/g, '')) === '271828', 'Shared URL restores configuration in a clean browser context');
    await badNumbers(sharedPage, 'shared configuration');
    await clean.close();
  }
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#calc-export').click();
  const download = await downloadPromise;
  const downloadedPath = await download.path();
  let exported;
  try { exported = JSON.parse(fs.readFileSync(downloadedPath, 'utf8')); } catch {}
  check(exported && typeof exported === 'object', 'Configuration export is valid JSON');
  await page.locator('#calc-import').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await badNumbers(page, 'invalid JSON import');
  await page.locator('button[data-tab="purchase"]').click();
  await page.locator('#catalogue-type').selectOption('activity');
  const activity = page.locator('#catalogue-results [data-activity]').first();
  const activityId = await activity.getAttribute('data-activity');
  await activity.click();
  check(await page.locator('#panel-goal').isVisible() && await page.locator('#f-goal-selected').inputValue() === activityId, 'Catalogue activity opens its objective scenario');
}

async function invalidInputs(page) {
  const tabs = await page.locator('button[data-tab]').evaluateAll(buttons => [...new Set(buttons.map(button => button.dataset.tab))]);
  for (const tab of tabs) {
    await page.locator(`button[data-tab="${tab}"]`).first().click();
    const inputs = page.locator('main input[data-number]:visible');
    const count = await inputs.count();
    for (let index = 0; index < Math.min(count, 4); index++) {
      const input = inputs.nth(index);
      if (!(await input.isEnabled())) continue;
      const original = await input.inputValue();
      const name = await input.getAttribute('id') || `${tab}/${index}`;
      for (const value of ['', '-1', '0', '0.25', '999999999999999999999']) {
        await input.fill(value);
        await input.dispatchEvent('change');
        await badNumbers(page, `${name}=${value || 'empty'}`);
      }
      await input.fill(original);
      await input.dispatchEvent('change');
    }
  }
}

async function main() {
  fs.mkdirSync(screenshotDir, { recursive: true });
  const server = createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  try {
    let launchOptions = { headless: true, args: ['--no-sandbox'] };
    if (process.env.QA_CHROMIUM_PACKAGE === '1') {
      const imported = require('@sparticuz/chromium');
      const packaged = imported.default || imported;
      const args = packaged.args.filter(arg => !['--single-process', '--disable-web-security', '--allow-running-insecure-content', '--disable-site-isolation-trials'].includes(arg));
      launchOptions = { ...launchOptions, executablePath: await packaged.executablePath(), args };
    }
    browser = await chromium.launch(launchOptions);
    note(`Calculator browser QA — ${new Date().toISOString()} — ${root}`);
    note(`CSP: ${commonHeaders['Content-Security-Policy'] || 'not configured'}`);
    note('External Google Fonts stylesheet is intentionally replaced by an empty response; screenshots use the installed sans-serif fallback. All site code/assets remain local and original.');
    const jsErrors = [];
    const localFailures = [];
    const cspErrors = [];
    for (const width of (process.env.QA_ANCHOR_ONLY === '1' ? [390, 320] : [1440, 390, 320])) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
      await context.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
      const page = await context.newPage();
      page.on('pageerror', error => jsErrors.push(`${width}: ${error.message}`));
      page.on('response', response => { if (response.url().startsWith(origin) && response.status() >= 400) localFailures.push(`${width}: ${response.status()} ${response.url()}`); });
      page.on('console', message => { if (message.type() === 'error' && /content security policy|violates.*directive/i.test(message.text())) cspErrors.push(`${width}: ${message.text()}`); });
      const response = await page.goto(origin + '/calculateurs.html', { waitUntil: 'networkidle' });
      check(response?.status() === 200, `Calculator loads (${width}px)`);
      if (process.env.QA_ANCHOR_ONLY === '1') {
        await page.locator('a[href="#atelier"]').first().click();
        await page.waitForTimeout(850);
        const anchor = await page.evaluate(() => {
          const heading = document.getElementById('atelier-title').getBoundingClientRect();
          const header = document.querySelector('header').getBoundingClientRect();
          return { headingTop: heading.top, headingBottom: heading.bottom, headerBottom: header.bottom, viewport: innerHeight };
        });
        check(anchor.headingTop >= anchor.headerBottom && anchor.headingBottom < anchor.viewport, `Build my plan anchor leaves the heading visible (${width}px)`, JSON.stringify(anchor));
        await page.screenshot({ path: path.join(screenshotDir, `calculator-${width}-anchor.png`) });
        await context.close();
        continue;
      }
      await page.waitForTimeout(250);
      await page.screenshot({ path: path.join(screenshotDir, `calculator-${width}-top.png`) });
      await page.screenshot({ path: path.join(screenshotDir, `calculator-${width}.png`), fullPage: true });
      await overflow(page, `${width}px initial`);
      await badNumbers(page, `${width}px initial`);
      if (width === 1440) await localReferences(page, origin);
      await navigateTabs(page, `${width}px`);
      if (width === 1440) {
        if (process.env.QA_SKIP_EDGE !== '1') await invalidInputs(page);
        await persistenceAndShare(page, context, browser, origin);
        await localReferences(page, origin);
      }
      await context.close();
    }
    check(!jsErrors.length, 'No browser JavaScript errors', jsErrors.join('; '));
    check(!localFailures.length, 'No failed local runtime requests', [...new Set(localFailures)].join('; '));
    check(!cspErrors.length, 'No CSP execution or resource violations', [...new Set(cspErrors)].join('; '));
    if (process.env.QA_ANCHOR_ONLY !== '1') {
    const reduced = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await reduced.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    const page = await reduced.newPage();
    await page.goto(origin + '/calculateurs.html', { waitUntil: 'networkidle' });
    await page.waitForTimeout(350);
    const motion = await page.evaluate(() => ({
      reduced: matchMedia('(prefers-reduced-motion: reduce)').matches,
      animations: document.getAnimations().filter(animation => animation.playState === 'running' && animation.effect?.getComputedTiming().duration > 100).length,
      hiddenContent: [...document.querySelectorAll('main .reveal,main .rise')].filter(el => getComputedStyle(el).opacity === '0').length
    }));
    check(motion.reduced && motion.animations === 0 && motion.hiddenContent === 0, 'Reduced motion keeps content visible and stops long animations', JSON.stringify(motion));
    await page.screenshot({ path: path.join(screenshotDir, 'calculator-reduced-motion.png'), fullPage: true });
    await reduced.close();
    }
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    note(`SUMMARY ${passed} passed; ${failed} failed.`);
    fs.writeFileSync(reportFile, messages.join('\n') + '\n');
  }
  if (failed) process.exitCode = 1;
}
async function domMain() {
  const { load } = require('./runtime-helper.cjs');
  const pages = [];
  const create = async options => {
    const page = await load(root, 'calculateurs.html', {
      ...options,
      before(window) {
        Object.defineProperty(window.navigator, 'clipboard', { value: { writeText: async value => { window.qaClipboard = value; } }, configurable: true });
        window.URL.createObjectURL = blob => { window.qaExport = { type: blob.type, size: blob.size }; return 'blob:qa-only'; };
        window.HTMLAnchorElement.prototype.click = function () { window.qaDownload = this.download; };
        options?.before?.(window);
      }
    });
    pages.push(page);
    return page;
  };
  const fill = (page, selector, value) => {
    const input = page.d.querySelector(selector);
    if (!input) throw Error('Input not found: ' + selector);
    input.value = value;
    input.dispatchEvent(new page.w.Event('input', { bubbles: true }));
    input.dispatchEvent(new page.w.Event('change', { bubbles: true }));
  };
  const storage = page => Object.fromEntries(Array.from({ length: page.w.localStorage.length }, (_, i) => { const key = page.w.localStorage.key(i); return [key, page.w.localStorage.getItem(key)]; }));
  const sane = (page, label) => check(!/\b(?:NaN|Infinity|undefined)\b/.test(page.d.querySelector('main').textContent), label);
  try {
    note('Calculator DOM QA — ' + new Date().toISOString());
    note('DOM-only mode: no screenshot, real layout, overflow, or rendered reduced-motion check is claimed by this mode.');
    note('The --dom option tests behaviour in jsdom; the default command remains the full Playwright suite.');
    const page = await create();
    check(page.errors.length === 0, 'Scripts initialize without DOM runtime errors', page.errors.join('; '));
    check(page.d.querySelectorAll('[role="tabpanel"]').length === 7, 'Seven calculators are mounted');
    check(page.d.querySelector('#f-goal-capital')?.value === '200000', 'Universal calculator starts with labelled example capital');
    check(/hypothèses|fictifs/.test(page.d.querySelector('main').textContent), 'Examples are identified as hypotheses');
    const tabs = [...page.d.querySelectorAll('button[data-tab]')];
    for (const button of tabs) {
      button.click();
      const panel = page.d.getElementById(button.getAttribute('aria-controls'));
      check(button.getAttribute('aria-selected') === 'true' && !panel.hidden && [...page.d.querySelectorAll('[role="tabpanel"]')].filter(el => !el.hidden).length === 1, 'Tab opens exactly one panel: ' + button.dataset.tab);
      sane(page, 'Valid output for ' + button.dataset.tab);
      const numeric = [...panel.querySelectorAll('input[data-number]')].slice(0, 4);
      for (const input of numeric) {
        const original = input.value;
        for (const value of ['', '-1', '0', '0.25', '999999999999999999999']) {
          fill(page, input.id ? '#' + input.id : '[data-field="' + input.dataset.field + '"]', value);
          sane(page, 'No non-finite text: ' + input.dataset.field + '=' + (value || 'empty'));
        }
        fill(page, input.id ? '#' + input.id : '[data-field="' + input.dataset.field + '"]', original);
      }
    }
    page.d.querySelector('#tab-goal').click();
    page.d.querySelector('#tab-goal').dispatchEvent(new page.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    check(page.d.querySelector('#tab-purchase').getAttribute('aria-selected') === 'true', 'ArrowRight activates the next tab');
    page.d.querySelector('#tab-purchase').dispatchEvent(new page.w.KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    check(page.d.querySelector('#tab-order').getAttribute('aria-selected') === 'true', 'End activates the final tab');
    page.d.querySelector('#tab-goal').click();
    fill(page, '#f-goal-capital', '271828');
    page.d.querySelector('#tab-goal').click();
    const reloaded = await create({ storage: storage(page) });
    check(reloaded.d.querySelector('#f-goal-capital').value === '271828', 'Configuration restores from persisted storage');
    page.d.querySelector('#calc-save').click();
    check(page.d.querySelectorAll('#saved-list [data-b-load]').length === 1, 'Favourite creates a notebook entry');
    fill(page, '#f-goal-capital', '222222');
    page.d.querySelector('#saved-list [data-b-load]').click();
    check(page.d.querySelector('#f-goal-capital').value === '271828', 'Opening a favourite restores the saved value');
    const favouritesReloaded = await create({ storage: storage(page) });
    check(favouritesReloaded.d.querySelectorAll('#saved-list [data-b-load]').length === 1, 'Favourites persist across fresh documents');
    page.d.querySelector('#calc-share').click();
    await new Promise(resolve => setImmediate(resolve));
    check(page.w.qaClipboard?.includes('#plan='), 'Share copies a configuration URL');
    const shared = await create({ url: page.w.qaClipboard });
    check(shared.d.querySelector('#f-goal-capital').value === '271828', 'Configuration URL restores in a clean document');
    check(page.d.querySelectorAll('#saved-list [data-recent]').length >= 1, 'Sharing adds a recent calculation');
    page.d.querySelector('#calc-export').click();
    check(page.w.qaExport?.type === 'application/json' && page.w.qaExport.size > 100 && page.w.qaDownload === 'leonidakit-calcul.json', 'Export creates a downloadable JSON configuration');
    const prior = page.d.querySelector('#f-goal-capital').value;
    const input = page.d.querySelector('#calc-import');
    Object.defineProperty(input, 'files', { value: [{ size: 7, text: async () => '{broken' }], configurable: true });
    input.dispatchEvent(new page.w.Event('change', { bubbles: true }));
    await new Promise(resolve => setImmediate(resolve));
    check(page.d.querySelector('#f-goal-capital').value === prior && /Import refusé/.test(page.d.querySelector('#calc-live').textContent), 'Invalid JSON import is refused without modifying state');
    page.d.querySelector('#tab-purchase').click();
    fill(page, '#catalogue-search', 'Emperor');
    const card = page.d.querySelector('#catalogue-results .calc-product');
    check(card && /Emperor/.test(card.textContent), 'Catalogue search filters existing vehicle records');
    card.querySelector('[data-item]').click();
    check(page.d.querySelector('#f-purchase-price').value === '' && !page.d.querySelector('#f-purchase-price').readOnly, 'Unknown catalogue price remains empty and manually editable');
    check(/Prix à compléter/.test(card.textContent), 'Unknown catalogue price is clearly labelled');
    const selected = page.d.querySelector('#vehicle-comparison');
    card.querySelector('[data-compare]').checked = true;
    card.querySelector('[data-compare]').dispatchEvent(new page.w.Event('change', { bubbles: true }));
    check(/données sont insuffisantes/i.test(selected.textContent), 'Comparison refuses a price/performance ratio without data');
    fill(page, '#catalogue-search', 'Scénario');
    const activityButton = page.d.querySelector('#catalogue-results [data-activity]');
    const activityId = activityButton?.dataset.activity;
    activityButton?.click();
    check(activityId && !page.d.querySelector('#panel-goal').hidden && page.d.querySelector('#f-goal-selected').value === activityId, 'Catalogue activity opens its objective scenario');
    const refs = [...page.d.querySelectorAll('script[src],link[rel="stylesheet"][href],img[src]')].map(el => el.src || el.href).filter(url => url.startsWith('https://www.leonidakit.com/'));
    const missing = refs.filter(url => !fs.existsSync(path.join(root, new URL(url).pathname)));
    check(missing.length === 0, 'All mounted local scripts, styles and image references exist', missing.join('; '));
    const inline = [...page.d.querySelectorAll('script:not([src])')].filter(el => !el.type || el.type === 'text/javascript');
    const handlers = [...page.d.querySelectorAll('*')].flatMap(el => [...el.attributes].filter(attribute => /^on/i.test(attribute.name)));
    check(!inline.length && !handlers.length, 'No executable inline code conflicts with strict script CSP');
    check(page.d.querySelector('link[rel="canonical"]').href === 'https://www.leonidakit.com/calculateurs.html' && !/noindex/.test(page.d.querySelector('meta[name="robots"]')?.content || ''), 'Canonical and indexability are correct');
    const reducedCSS = fs.readFileSync(path.join(root, 'calculateurs.css'), 'utf8');
    check(/prefers-reduced-motion\s*:\s*reduce/.test(reducedCSS), 'Reduced-motion stylesheet exists (static presence, not rendered verification)');
    const denied = await create({ before(window) { window.Storage.prototype.getItem = () => { throw Error('Storage denied in QA'); }; window.Storage.prototype.setItem = () => { throw Error('Storage denied in QA'); }; } });
    fill(denied, '#f-goal-capital', '300000');
    denied.d.querySelector('#calc-save').click();
    denied.d.querySelector('#calc-export').click();
    check(denied.errors.length === 0 && denied.w.qaExport?.size > 100, 'Blocked storage preserves calculation and JSON export');
    check(pages.flatMap(p => p.errors).length === 0, 'No uncaught DOM runtime errors in tested flows', pages.flatMap(p => p.errors).join('; '));
  } finally {
    pages.forEach(page => page.close());
    note(`SUMMARY ${passed} passed; ${failed} failed. Rendering checks remain unexecuted.`);
    fs.writeFileSync(reportFile, messages.join('\n') + '\n');
  }
  if (failed) process.exitCode = 1;
}
(process.argv.includes('--dom') ? domMain() : main()).catch(error => {
  note('FATAL ' + error.stack);
  fs.writeFileSync(reportFile, messages.join('\n') + '\n');
  process.exitCode = 1;
});
