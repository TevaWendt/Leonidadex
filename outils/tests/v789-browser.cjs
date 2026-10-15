#!/usr/bin/env node
'use strict';
/* v7.89 (lot 5) : contrôle dans Chromium (Playwright) de l'appli installable, du mode compagnon et du transfert.
   Serveur statique local (localhost : le service worker y est permis, comme en https). « Sans réseau » = context.setOffline(true)
   ET un serveur qui coupe toute connexion (le service worker ne peut rien aller chercher).
   1. Pour le français et l'allemand : installation du service worker depuis une page du site, page vue puis sans réseau : la
      page vue s'ouvre (copie), une page jamais vue montre la page hors connexion de la langue, avec la liste des pages
      gardées ; aucune erreur JavaScript.
   2. « Préparer pour jouer sans réseau » sur la page compagnon : état « prêt », puis sans réseau le calculateur et un carnet
      (jamais ouverts) s'ouvrent et Léo s'ouvre depuis ses fichiers gardés.
   3. Transfert d'un contexte de navigateur à un autre : suivi écrit dans le premier, lien et QR code créés (QR relu par
      jsQR dans la page quand il est installé), lien ouvert dans un second contexte vierge : aperçu, « Fusionner », suivi
      identique, adresse nettoyée ; un lien abîmé est refusé sans rien écrire.
   4. Manifeste lié et valide, icônes servies ; « Garder l'écran allumé » visible quand le navigateur connaît Wake Lock.
   Usage : NODE_PATH=<dépendances>:/opt/npm-tools/node_modules LK_CHROMIUM=/opt/pw-browsers/chromium node outils/tests/v789-browser.cjs <dossier des captures> */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || '/tmp/v789-browser'); fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
let coupe = false;
const server = http.createServer((req, res) => {
  if (coupe) { req.socket.destroy(); return; }
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
  if (p.startsWith('/api/') || p.startsWith('/_vercel/')) { res.writeHead(404).end(); return; }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.readFileSync(path.join(root, '404.html'))); return; }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': /\/sw\.js$|\.webmanifest$/.test(f) ? 'no-cache' : 'public, max-age=600' });
  res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(f));
});
const exe = () => { const base = process.env.LK_CHROMIUM || '/opt/pw-browsers/chromium'; for (const c of [base, path.join(base, 'chrome-linux/chrome')]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return c; return undefined; };
const results = []; const ok = (name, cond, detail) => { results.push({ name, ok: !!cond, detail: detail || '' }); console.log((cond ? 'OK   ' : 'ÉCHEC') + ' ' + name + (detail ? ' — ' + detail : '')); };
let jsqr = null; try { jsqr = require.resolve('jsqr'); } catch (e) { jsqr = null; }

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://localhost:' + server.address().port;
  const browser = await chromium.launch({ executablePath: exe() });
  const contexte = async (opts = {}) => { const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, ...opts }); const errors = []; ctx.on('page', p => p.on('pageerror', e => errors.push(String(e)))); return { ctx, errors }; };
  const horsReseau = async (ctx, on) => { coupe = on; await ctx.setOffline(on); };
  const swPret = page => page.evaluate(() => new Promise((resolve, reject) => { const t = setTimeout(() => reject(new Error('service worker pas prêt')), 20000); navigator.serviceWorker.ready.then(r => { clearTimeout(t); resolve(!!r.active); }); }));
  const controle = page => page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 }).then(() => true, () => false);

  /* ---------- 1. service worker, page vue, page jamais vue, dans deux langues ---------- */
  for (const [lg, base, h1] of [['fr', '/', /Pas de réseau/], ['de', '/de/', /\S/]]) {
    const { ctx, errors } = await contexte(); const page = await ctx.newPage();
    await page.goto(BASE + base, { waitUntil: 'load' });
    ok(lg + ' : manifeste lié', await page.evaluate(b => document.querySelector('link[rel="manifest"]').getAttribute('href') === b + 'manifest.webmanifest', base));
    const man = await (await page.request.get(BASE + base + 'manifest.webmanifest')).json();
    ok(lg + ' : manifeste valide', man.start_url === base && man.display === 'standalone' && man.icons.length === 3, man.name + ' · ' + man.shortcuts.map(s => s.name).join(', '));
    ok(lg + ' : service worker installé', await swPret(page));
    await page.reload({ waitUntil: 'load' }); ok(lg + ' : page contrôlée', await controle(page));
    /* routes fixes (Chromium) : la feuille de style versionnée, gardée dans la coquille, est lue dans le cache sans réveiller
       le service worker (CDP : serviceWorkerRouterInfo) */
    const cdp = await ctx.newCDPSession(page), routes = []; await cdp.send('Network.enable');
    cdp.on('Network.responseReceived', e => { if (/\/style\.css\?v=/.test(e.response.url)) routes.push(e.response.serviceWorkerRouterInfo || null); });
    await page.goto(BASE + base + 'carte.html', { waitUntil: 'load' });
    ok(lg + ' : routes fixes, feuille de style lue dans le cache', routes.some(r => r && r.matchedSourceType === 'cache' && r.actualSourceType === 'cache'), JSON.stringify(routes));
    await cdp.detach().catch(() => {});
    const noms = await page.evaluate(() => caches.keys());
    ok(lg + ' : caches du site seulement (lk-…)', noms.length && noms.every(n => /^lk-/.test(n)), noms.join(', '));
    await horsReseau(ctx, true);
    await page.goto(BASE + base + 'carte.html', { waitUntil: 'load' });
    ok(lg + ' : page vue, ouverte sans réseau', await page.locator('#map-stage, .map-stage').count() > 0, await page.title());
    await page.goto(BASE + base + 'vehicules.html', { waitUntil: 'load' });
    const hors = await page.evaluate(() => ({ lang: document.documentElement.lang, h1: document.querySelector('h1') && document.querySelector('h1').textContent, liste: !!document.querySelector('[data-hl-liste]') }));
    ok(lg + ' : page jamais vue → page hors connexion de la langue', hors.lang === lg && hors.liste && h1.test(hors.h1), JSON.stringify(hors));
    await page.waitForFunction(() => document.querySelectorAll('[data-hl-liste] a').length > 0, null, { timeout: 8000 }).catch(() => {});
    const liens = await page.$$eval('[data-hl-liste] a', a => a.map(x => x.getAttribute('href')));
    ok(lg + ' : pages gardées listées', liens.includes(base + 'carte.html'), liens.join(' '));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, 'hors-ligne-' + lg + '-390.png'), fullPage: false });
    ok(lg + ' : aucune erreur JavaScript', !errors.length, errors.join(' | '));
    await horsReseau(ctx, false);
    await ctx.close();
  }

  /* ---------- 2. préparer pour jouer sans réseau ---------- */
  {
    const { ctx, errors } = await contexte(); const page = await ctx.newPage();
    await page.goto(BASE + '/compagnon.html', { waitUntil: 'load' });
    await swPret(page);
    await page.click('[data-cp-preparer]');
    const pret = await page.waitForFunction(() => document.querySelector('[data-cp-etat]').dataset.cpEtat === 's-pret', null, { timeout: 120000 }).then(() => true, () => false);
    ok('préparation : état « prêt »', pret, await page.textContent('[data-cp-etat-detail]'));
    await page.screenshot({ path: path.join(out, 'compagnon-pret-fr-390.png') });
    await horsReseau(ctx, true);
    await page.goto(BASE + '/calculateurs.html', { waitUntil: 'load' });
    ok('préparation : calculateur jamais ouvert, ouvert sans réseau', await page.locator('#atelier').count() > 0);
    await page.goto(BASE + '/carnets/garage.html', { waitUntil: 'load' });
    ok('préparation : carnet ouvert sans réseau', /garage/i.test(page.url()) && await page.locator('main h1').count() === 1);
    await page.goto(BASE + '/compagnon.html', { waitUntil: 'load' });
    await page.click('#leo-launch');
    const leo = await page.waitForSelector('.leo-panel', { timeout: 15000 }).then(() => true, () => false);
    ok('préparation : Léo s’ouvre sans réseau', leo);
    ok('préparation : aucune erreur JavaScript', !errors.length, errors.join(' | '));
    await horsReseau(ctx, false);
    await ctx.close();
  }

  /* ---------- 3. transfert d'un contexte à l'autre ---------- */
  {
    const A = await contexte(), pa = await A.ctx.newPage();
    await pa.goto(BASE + '/progression.html', { waitUntil: 'load' });
    const suivi = await pa.evaluate(() => { const v = (window.LK_PROGRESS_IDS.vehicules || []).slice(0, 5), o = {}; v.forEach(x => { o[x] = true; }); localStorage.setItem('lk_own_vehicules', JSON.stringify(o)); localStorage.setItem('lk-calculator-notebooks-v3', JSON.stringify({ version: 3, entries: [{ tool: 'goal', id: 'a' }, { tool: 'plan', id: 'b' }] })); localStorage.setItem('lk_contact_brouillon', 'prive'); return { v: localStorage.getItem('lk_own_vehicules'), n: localStorage.getItem('lk-calculator-notebooks-v3') }; });
    /* depuis la page Progression : transfert.js arrive une fois la page chargée et montre le bouton ; le lien se crée */
    await pa.goto(BASE + '/progression.html', { waitUntil: 'load' });
    const btnProg = await pa.waitForSelector('#sauvegarde [data-tr-creer]', { state: 'visible', timeout: 15000 }).then(() => true, () => false);
    ok('transfert : bouton visible sur la page Progression', btnProg);
    if (btnProg) {
      await pa.click('#sauvegarde [data-tr-creer]');
      const lienProg = await pa.waitForFunction(() => { const b = document.querySelector('#sauvegarde [data-tr-resultat]'); return b && !b.hidden && /#transfert=1/.test(document.querySelector('#sauvegarde [data-tr-lien]').value) && !!document.querySelector('#sauvegarde [data-tr-qr] svg'); }, null, { timeout: 15000 }).then(() => true, () => false);
      ok('transfert : lien et QR code créés depuis la page Progression', lienProg);
      await pa.locator('#sauvegarde .cp-tr-progression').screenshot({ path: path.join(out, 'progression-lien-fr-390.png') }).catch(() => {});
    }
    await pa.goto(BASE + '/compagnon.html', { waitUntil: 'load' });
    await pa.click('#changer-d-appareil [data-tr-creer]');
    /* le résultat (lien, QR code, boutons) ne s'affiche qu'une fois le QR code dessiné (encodeur chargé à la demande) */
    await pa.waitForFunction(() => /#transfert=1/.test(document.querySelector('#changer-d-appareil [data-tr-lien]').value) && !document.querySelector('#changer-d-appareil [data-tr-resultat]').hidden, null, { timeout: 15000 });
    const lien = await pa.inputValue('#changer-d-appareil [data-tr-lien]');
    ok('transfert : lien créé', /\/compagnon\.html#transfert=1z[A-Za-z0-9_-]+$/.test(lien), lien.length + ' caractères');
    ok('transfert : QR code dessiné', await pa.locator('#changer-d-appareil [data-tr-qr] svg').count() === 1);
    if (jsqr) {
      await pa.addScriptTag({ path: jsqr });
      const lu = await pa.evaluate(async () => { const svg = document.querySelector('#changer-d-appareil [data-tr-qr] svg'); const s = new XMLSerializer().serializeToString(svg).replace('fill="currentColor"', 'fill="#000"'); const img = new Image(); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s); await img.decode(); const c = document.createElement('canvas'); c.width = c.height = 600; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 600); g.drawImage(img, 0, 0, 600, 600); const d = g.getImageData(0, 0, 600, 600); const r = window.jsQR(d.data, 600, 600); return r ? r.data : null; });
      ok('transfert : QR code relu (jsQR) identique au lien', lu === lien);
    } else ok('transfert : QR code relu', true, 'jsqr absent : relecture faite dans les tests Node');
    await pa.waitForTimeout(500);
    await pa.locator('#changer-d-appareil').screenshot({ path: path.join(out, 'compagnon-lien-fr-390.png') });
    const B = await contexte(), pb = await B.ctx.newPage();
    await pb.goto(lien.replace(/^https?:\/\/[^/]+/, BASE), { waitUntil: 'load' });
    await pb.waitForFunction(() => !document.querySelector('[data-tr-choix]').hidden, null, { timeout: 15000 });
    const apercu = (await pb.textContent('[data-tr-apercu]')).replace(/[  ]/g, ' ');
    ok('transfert : aperçu avant d’écrire', /5 cases cochées/.test(apercu) && /1 calcul/.test(apercu) && /1 plan/.test(apercu) && await pb.evaluate(() => !localStorage.getItem('lk_own_vehicules')), apercu);
    await pb.waitForTimeout(500);
    await pb.screenshot({ path: path.join(out, 'compagnon-reception-fr-390.png') });
    await pb.click('[data-tr-fusionner]');
    await pb.waitForFunction(() => !!localStorage.getItem('lk_own_vehicules'), null, { timeout: 5000 });
    const recu = await pb.evaluate(() => ({ v: localStorage.getItem('lk_own_vehicules'), n: localStorage.getItem('lk-calculator-notebooks-v3'), prive: localStorage.getItem('lk_contact_brouillon'), hash: location.hash }));
    ok('transfert : suivi identique dans le second navigateur', recu.v === suivi.v && recu.n === suivi.n);
    ok('transfert : brouillon de Contact jamais transporté', recu.prive === null);
    ok('transfert : adresse nettoyée', recu.hash === '');
    const C = await contexte(), pc = await C.ctx.newPage();
    await pc.goto(lien.replace(/^https?:\/\/[^/]+/, BASE).slice(0, -12), { waitUntil: 'load' });
    await pc.waitForFunction(() => document.querySelector('[data-tr-reception]').dataset.trEtat === 'refus', null, { timeout: 10000 }).catch(() => {});
    ok('transfert : lien abîmé refusé sans rien écrire', await pc.evaluate(() => document.querySelector('[data-tr-reception]').dataset.trEtat === 'refus' && !localStorage.getItem('lk_own_vehicules') && location.hash === ''));
    ok('transfert : aucune erreur JavaScript', !A.errors.length && !B.errors.length && !C.errors.length, [...A.errors, ...B.errors, ...C.errors].join(' | '));
    for (const x of [A, B, C]) await x.ctx.close();
  }

  /* ---------- 4. écran allumé, icônes ---------- */
  {
    const { ctx } = await contexte(); const page = await ctx.newPage();
    await page.goto(BASE + '/compagnon.html', { waitUntil: 'load' });
    const wl = await page.evaluate(() => 'wakeLock' in navigator);
    const visible = await page.evaluate(() => !document.querySelector('[data-cp-ecran]').hidden);
    ok('écran allumé : option visible si Wake Lock existe, cachée sinon', wl === visible, 'wakeLock ' + wl);
    for (const f of ['/img/app/icone-192.png', '/img/app/icone-512.png', '/img/app/icone-maskable-512.png', '/img/app/apple-touch-icon-180.png']) ok('icône servie ' + f, (await page.request.get(BASE + f)).ok());
    await ctx.close();
  }
  await browser.close(); server.close();
  const echecs = results.filter(r => !r.ok);
  fs.writeFileSync(path.join(out, 'v789-browser.json'), JSON.stringify(results, null, 1));
  console.log('\n' + (results.length - echecs.length) + '/' + results.length + ' contrôles réussis' + (echecs.length ? ' — ÉCHECS : ' + echecs.map(e => e.name).join(' ; ') : ''));
  process.exitCode = echecs.length ? 1 : 0;
})().catch(e => { console.error(e); process.exit(2); });
