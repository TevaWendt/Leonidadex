#!/usr/bin/env node
'use strict';
/* v7.89 : mesure de latence avant / après, dans Chromium (Playwright + CDP), méthode des v7.54 et v7.85 : téléphone 390 px,
   processeur ralenti ×4, réseau « 4G lente » (aller-retour 150 ms, 1,6 Mbit/s par requête) simulé par le serveur local
   lui-même, pour que les requêtes de la page ET celles du service worker soient freinées de la même façon ; à froid
   (contexte neuf : ni cache ni service worker) et à chaud (même contexte, seconde visite, 4 s après la première : cache du
   navigateur et, dans la version qui en a un, service worker actif). Mesures : premier rendu (FCP), DOMContentLoaded,
   plus grand élément (LCP), fin du chargement, travail du processeur (TaskDuration), octets envoyés par le serveur pendant la
   visite (à froid, ils comprennent ce que le service worker télécharge à son installation pendant la mesure).
   Versions mesurées en alternance, dans un ordre qui s'inverse à chaque tour (A puis B, B puis A…) pour qu'aucune ne passe
   toujours juste après la fermeture de l'autre ; réponses compressées une seule fois (le serveur ne recompresse pas à chaque
   requête) ; médiane par page.
   Usage : NODE_PATH=…:/opt/npm-tools/node_modules LK_CHROMIUM=/opt/pw-browsers/chromium node outils/tests/latence-browser.cjs
           <racine A (avant)> <racine B (après)> <sortie.json> [pages…] [--tours=4] */
const fs = require('fs'), path = require('path'), http = require('http'), zlib = require('zlib');
const { chromium } = require('playwright');
const args = process.argv.slice(2).filter(a => !a.startsWith('--')), opt = n => { const a = process.argv.find(x => x.startsWith('--' + n + '=')); return a ? a.split('=')[1] : null; };
const [RA, RB, OUT] = args; const PAGES = args.slice(3).length ? args.slice(3) : ['index.html', 'carte.html', 'progression.html', 'vehicules/karin-sultan.html', 'de/index.html'];
const TOURS = +(opt('tours') || 4), RTT = 150, DEBIT = 1.6e6 / 8;
const GZ = new Map();
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serveur(root) {
  const s = { octets: 0, requetes: 0 };
  s.http = http.createServer(async (req, res) => {
    let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(root, p), ok = f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile();
    let body = ok ? fs.readFileSync(f) : Buffer.from('introuvable'); const ext = path.extname(f);
    const headers = { 'Content-Type': ok ? (MIME[ext] || 'application/octet-stream') : 'text/plain', 'Cache-Control': /\.(css|js)$/.test(ext) || /\/(img|fonts|photos|leo)\//.test(p) ? 'public, max-age=604800' : (/sw\.js$|\.webmanifest$/.test(p) ? 'no-cache' : 'public, max-age=0, must-revalidate') };
    /* compression des textes, comme l'hébergeur */
    if (/\.(html|css|js|json|svg|webmanifest)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { const k = f + ':' + body.length; if (!GZ.has(k)) GZ.set(k, zlib.gzipSync(body, { level: 6 })); body = GZ.get(k); headers['Content-Encoding'] = 'gzip'; }
    headers['Content-Length'] = body.length;
    await new Promise(r => setTimeout(r, RTT));
    s.octets += body.length; s.requetes++;
    res.writeHead(ok ? 200 : 404, headers);
    if (req.method === 'HEAD') { res.end(); return; }
    /* débit : morceaux de 16 Ko espacés */
    const morceau = 16384, pas = morceau / DEBIT * 1000;
    for (let i = 0; i < body.length; i += morceau) { res.write(body.subarray(i, i + morceau)); if (i + morceau < body.length) await new Promise(r => setTimeout(r, pas)); }
    res.end();
  });
  return s;
}
const exe = () => { const base = process.env.LK_CHROMIUM || '/opt/pw-browsers/chromium'; for (const c of [base, path.join(base, 'chrome-linux/chrome')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; return undefined; };
async function mesure(ctx, url, S) {
  const page = await ctx.newPage(), cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
  const avant = S.octets;
  await page.addInitScript(() => { window.__lcp = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) {} });
  await page.goto(url, { waitUntil: 'load', timeout: 120000 });
  await page.waitForTimeout(1500);
  const m = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; const fcp = performance.getEntriesByType('paint').find(e => e.name === 'first-contentful-paint'); return { fcp: fcp ? fcp.startTime : null, dcl: n.domContentLoadedEventEnd, load: n.loadEventEnd, lcp: window.__lcp || null, sw: !!navigator.serviceWorker && !!navigator.serviceWorker.controller }; });
  const met = (await cdp.send('Performance.getMetrics')).metrics, td = (met.find(x => x.name === 'TaskDuration') || {}).value || 0;
  m.cpu = td * 1000; m.octets = S.octets - avant;
  await page.close(); return m;
}
const med = a => { const b = a.filter(x => x !== null && !isNaN(x)).sort((x, y) => x - y); return b.length ? b[Math.floor((b.length - 1) / 2)] : null; };
(async () => {
  const SA = serveur(path.resolve(RA)), SB = serveur(path.resolve(RB));
  await new Promise(r => SA.http.listen(0, '127.0.0.1', r)); await new Promise(r => SB.http.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch({ executablePath: exe() });
  const res = {};
  for (const p of PAGES) {
    res[p] = { A: { froid: [], chaud: [] }, B: { froid: [], chaud: [] } };
    for (let t = 0; t < TOURS; t++) for (const [k, S] of (t % 2 ? [['B', SB], ['A', SA]] : [['A', SA], ['B', SB]])) {
      const url = 'http://localhost:' + S.http.address().port + '/' + p;
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
      res[p][k].froid.push(await mesure(ctx, url, S));
      await new Promise(r => setTimeout(r, 4000));
      res[p][k].chaud.push(await mesure(ctx, url, S));
      await ctx.close();
    }
    const ligne = (k, w) => { const l = res[p][k][w]; return ['fcp', 'dcl', 'lcp', 'load', 'cpu', 'octets'].map(x => x + ' ' + Math.round(med(l.map(y => y[x])))).join(' · '); };
    console.log(p.padEnd(30) + '\n  froid  A ' + ligne('A', 'froid') + '\n         B ' + ligne('B', 'froid') + '\n  chaud  A ' + ligne('A', 'chaud') + '\n         B ' + ligne('B', 'chaud') + (res[p].B.chaud.some(x => x.sw) ? '  (service worker actif)' : ''));
  }
  await browser.close(); SA.http.close(); SB.http.close();
  const synth = {}; for (const [p, r] of Object.entries(res)) { synth[p] = {}; for (const k of ['A', 'B']) for (const w of ['froid', 'chaud']) synth[p][k + '-' + w] = Object.fromEntries(['fcp', 'dcl', 'lcp', 'load', 'cpu', 'octets'].map(x => [x, Math.round(med(r[k][w].map(y => y[x])))])); }
  if (OUT) fs.writeFileSync(OUT, JSON.stringify({ date: new Date().toISOString(), rtt: RTT, debit: DEBIT, cpu: 4, tours: TOURS, A: RA, B: RB, synth, brut: res }, null, 1));
})().catch(e => { console.error(e); process.exit(2); });
