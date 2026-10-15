'use strict';
/* v7.90 (lot 6) : latence avant / après, mesurée comme le demande la charte qualité. Deux copies du site servies en local
   (la base et le travail), Chromium headless (Playwright), téléphone 390 px, réseau « 4G lente » (150 ms aller-retour,
   1,6 Mbit/s descendant, 750 kbit/s montant) et processeur ralenti ×4 (CDP). Pour chaque page : visite à froid (contexte
   neuf, cache vide) puis visite à chaud (même contexte, rechargement), répétées en alternance (base puis travail, puis travail puis base…) ;
   on garde la médiane. Mesures : FCP, DCL,
   LCP (ms), temps processeur des tâches (ms, Performance.getMetrics) et octets reçus (encodedDataLength).
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/v790-latence.cjs <dossier de la base> <dossier du travail>
           <fichier de sortie .json> [pages…] [--tours=3]
   Une page absente de la base (page nouvelle) est mesurée seulement dans le travail. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), opt = Object.fromEntries(process.argv.slice(2).filter(a => a.startsWith('--')).map(a => a.slice(2).split('=')));
const [BASE, WORK, OUT, ...pagesArg] = args;
if (!BASE || !WORK || !OUT) { console.error('Usage : node outils/tests/v790-latence.cjs <base> <travail> <sortie.json> [pages…]'); process.exit(2); }
const PAGES = pagesArg.length ? pagesArg : ['index.html', 'lieux.html', 'lieux/vice-city.html', 'mentions-legales.html', 'radios.html', 'devine-le-lieu.html', 'de/devine-le-lieu.html'];
const TOURS = +(opt.tours || 3);
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
/* serveur statique avec les mêmes en-têtes de cache que l’hébergeur pour les fichiers versionnés (?v=) */
const serve = dir => http.createServer((req, res) => {
  const [p0, q] = req.url.split('?'); let p = decodeURIComponent(p0); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(dir, p);
  if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  const ext = path.extname(f), cache = /\.html$/.test(ext) ? 'public, max-age=0, must-revalidate' : (q && /(^|&)v=/.test(q)) || /\.(woff2|webp|png|jpg|svg)$/.test(ext) ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate';
  res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': cache }); fs.createReadStream(f).pipe(res);
});
const median = a => { const s = a.filter(x => x !== null && x !== undefined).sort((x, y) => x - y); return s.length ? Math.round(s[Math.floor((s.length - 1) / 2)]) : null; };

async function visit(ctx, url, reload) {
  const page = reload || await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await cdp.send('Performance.enable');
  let bytes = 0; cdp.on('Network.loadingFinished', e => { bytes += e.encodedDataLength; });
  await page.addInitScript(() => { window.__lcp = null; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {} });
  const before = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  if (reload) await page.reload({ waitUntil: 'load' }); else await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0], fcp = performance.getEntriesByName('first-contentful-paint')[0]; return { fcp: fcp ? fcp.startTime : null, dcl: n ? n.domContentLoadedEventEnd : null, lcp: window.__lcp }; });
  const after = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  await cdp.detach();
  return { page, r: { ...m, cpu: Math.round(((after.TaskDuration || 0) - (reload ? before.TaskDuration || 0 : 0)) * 1000), bytes } };
}

(async () => {
  const sBase = serve(path.resolve(BASE)), sWork = serve(path.resolve(WORK));
  await new Promise(r => sBase.listen(0, '127.0.0.1', r)); await new Promise(r => sWork.listen(0, '127.0.0.1', r));
  const site = { base: 'http://127.0.0.1:' + sBase.address().port, travail: 'http://127.0.0.1:' + sWork.address().port };
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox'] });
  const result = { conditions: { largeur: 390, reseau: '4G lente : 150 ms, 1,6 Mbit/s, 750 kbit/s', processeur: '×4', tours: TOURS, date: new Date().toISOString() }, pages: {} };
  for (const p of PAGES) {
    result.pages[p] = {};
    const sides = [['base', BASE], ['travail', WORK]].filter(([, dir]) => fs.existsSync(path.join(dir, p)));
    const runs = Object.fromEntries(sides.map(([label]) => [label, { froid: [], chaud: [] }]));
    /* en alternance : la base puis le travail, puis l’inverse au tour suivant (une dérive de la machine, ou l’avantage
       d’arriver en premier, touche les deux pareil) */
    for (let t = 0; t < TOURS; t++) for (const [label] of (t % 2 ? [...sides].reverse() : sides)) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR', timezoneId: 'Europe/Paris' });
      const cold = await visit(ctx, site[label] + '/' + p);
      runs[label].froid.push(cold.r);
      const warm = await visit(ctx, null, cold.page);
      runs[label].chaud.push(warm.r);
      await ctx.close();
    }
    for (const label of ['base', 'travail']) {
      if (!runs[label]) { result.pages[p][label] = null; continue; }
      result.pages[p][label] = Object.fromEntries(Object.entries(runs[label]).map(([k, list]) => [k, Object.fromEntries(['fcp', 'dcl', 'lcp', 'cpu', 'bytes'].map(x => [x, median(list.map(r => r[x]))]))]));
      console.log(p.padEnd(26), label.padEnd(8), JSON.stringify(result.pages[p][label]));
    }
  }
  await browser.close(); sBase.close(); sWork.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
})().catch(e => { console.error(e); process.exit(1); });
