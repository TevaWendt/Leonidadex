#!/usr/bin/env node
'use strict';
/* COOKIE-01 (v7.57, lot 4) — audit dynamique des cookies, traceurs et stockages, dans un vrai navigateur (Chromium via Playwright).
   Prérequis : un serveur statique sur la racine du site (python3 -m http.server 8055) et Playwright dans un dossier à part
   (npm install playwright ; NODE_PATH=<dossier>/node_modules). Ce script ne sert pas au site en ligne (outils/ est exclu).
   Usage : NODE_PATH=… node outils/audit-cookies.cjs http://localhost:8055 [sortie.json]
   Pour chaque page : contexte neuf, toutes les requêtes (hôte, type), en-têtes Set-Cookie des réponses, cookies, localStorage,
   sessionStorage, IndexedDB, CacheStorage, service workers — avant toute interaction, puis après les usages principaux
   (calculateur, carte, liste, suivi « Je l'ai », Léo, brouillon de Contact, formulaire d'alerte rempli : l'envoi vers Brevo est
   intercepté, jamais transmis). Résultat : inventaire factuel, aucune interprétation. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const BASE = (process.argv[2] || 'http://localhost:8055').replace(/\/$/, '');
const OUT = process.argv[3] || '';
const EXE = process.env.CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ownHost = new URL(BASE).host;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PAGES = ['index.html', 'calculateurs.html', 'carte.html', 'vehicules.html', 'armes.html', 'nourriture.html', 'style.html', 'personnalisations.html', 'progression.html', 'collectibles.html', 'tuto.html', 'a-propos.html', 'contact.html', 'mentions-legales.html', 'vehicules/vapid-caracara-4x4.html', 'carnets/garage.html', 'achats.html'];
async function snapshot(page, ctx) {
  const cookies = await ctx.cookies();
  const st = await page.evaluate(async () => {
    const ls = {}, ss = {};
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls[k] = (localStorage.getItem(k) || '').length; }
    for (let i = 0; i < sessionStorage.length; i++) { const k = sessionStorage.key(i); ss[k] = (sessionStorage.getItem(k) || '').length; }
    let idb = null; try { idb = (await indexedDB.databases()).map(d => d.name); } catch (_) { idb = 'indisponible'; }
    let caches_ = null; try { caches_ = await caches.keys(); } catch (_) { caches_ = 'indisponible'; }
    let sw = null; try { sw = (await navigator.serviceWorker.getRegistrations()).length; } catch (_) { sw = 'indisponible'; }
    return { localStorage: ls, sessionStorage: ss, indexedDB: idb, cacheStorage: caches_, serviceWorkers: sw, documentCookie: document.cookie };
  });
  return { cookies: cookies.map(c => ({ name: c.name, domain: c.domain, path: c.path, expires: c.expires, httpOnly: c.httpOnly })), ...st };
}
(async () => {
  const browser = await chromium.launch({ executablePath: fs.existsSync(EXE) ? EXE : undefined });
  const report = { date: new Date().toISOString(), base: BASE, pages: [], thirdPartyRequests: [], setCookieHeaders: [], blockedPosts: [] };
  for (const file of PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage();
    const requests = [];
    await ctx.route('**/*', route => {
      const req = route.request(); const u = new URL(req.url());
      requests.push({ host: u.host, path: u.pathname, type: req.resourceType(), method: req.method() });
      if (u.host !== ownHost) { report.blockedPosts.push({ page: file, url: req.url(), method: req.method(), type: req.resourceType() }); return route.abort(); }
      return route.continue();
    });
    page.on('response', r => { const sc = r.headers()['set-cookie']; if (sc) report.setCookieHeaders.push({ page: file, url: r.url(), value: sc.slice(0, 120) }); });
    await page.goto(BASE + '/' + file, { waitUntil: 'load' }); await sleep(800);
    const before = await snapshot(page, ctx);
    const entry = { page: file, before, requestsBefore: requests.length, hostsBefore: [...new Set(requests.map(r => r.host))] };
    /* interactions principales */
    const used = [];
    try {
      if (file === 'index.html') {
        await page.fill('#mail', 'audit@example.invalid'); await page.check('#consent'); used.push('alerte remplie (envoi fait après le relevé, intercepté)');
      }
      if (file === 'calculateurs.html') { const inp = page.locator('input[type="text"], input[type="number"]').first(); await inp.fill('25000'); await sleep(400); used.push('saisie calculateur'); }
      if (file === 'carte.html') { await page.mouse.click(640, 500); await sleep(400); const b = page.locator('button').first(); if (await b.count()) { await b.click().catch(() => {}); } used.push('clic carte'); }
      if (file === 'vehicules.html') { await page.fill('#q, input[type="search"]', 'vapid').catch(() => {}); await sleep(300); const own = page.locator('.track-bt, [data-own], .veh-card button').first(); if (await own.count()) await own.click().catch(() => {}); used.push('recherche + possession'); }
      if (file === 'nourriture.html') { await page.evaluate(() => { const b = document.getElementById('box-consommables'); b.open = true; }); await sleep(200); await page.click('#box-consommables .track-bt'); await page.click('#box-consommables [data-cat-more]'); await page.click('#box-consommables summary[data-cat-sheet]'); await sleep(300); await page.keyboard.press('Escape'); used.push('Je l’ai + description + fiche'); }
      if (file === 'contact.html') { await page.fill('#contact-draft textarea, #contact-draft input[type="text"]', 'Brouillon de test audit').catch(() => {}); await sleep(600); used.push('brouillon de contact'); }
      if (file === 'progression.html') { const b = page.locator('button').first(); if (await b.count()) await b.click().catch(() => {}); used.push('clic progression'); }
      /* Léo sur quelques pages */
      if (['index.html', 'vehicules.html', 'nourriture.html'].includes(file)) {
        const leo = page.locator('#leo-launch').first();
        if (await leo.count()) { await leo.click(); await sleep(1200); const inp = page.locator('.leo-panel input[type="text"], .leo-panel input[type="search"], .leo-panel textarea, #leo-input, [data-leo-input]').first(); if (await inp.count()) { await inp.fill('combien de véhicules ?'); await inp.press('Enter'); await sleep(1500); used.push('Léo : question'); } else used.push('Léo ouvert (champ non trouvé)'); }
      }
    } catch (e) { used.push('interaction interrompue : ' + String(e).slice(0, 80)); }
    await sleep(500);
    const after = await snapshot(page, ctx);
    if (file === 'index.html') { try { await page.click('#sub'); await sleep(1200); } catch (_) { /* navigation interceptée */ } }
    entry.after = after; entry.used = used; entry.requestsAfter = requests.length; entry.hostsAfter = [...new Set(requests.map(r => r.host))];
    entry.thirdParty = requests.filter(r => r.host !== ownHost);
    report.pages.push(entry);
    await ctx.close();
  }
  /* synthèse */
  const allLS = new Set(), allSS = new Set(); let cookiesTotal = 0, idb = 0, cache = 0, sw = 0;
  for (const p of report.pages) { for (const s of [p.before, p.after]) { Object.keys(s.localStorage).forEach(k => allLS.add(k)); Object.keys(s.sessionStorage).forEach(k => allSS.add(k)); cookiesTotal += s.cookies.length + (s.documentCookie ? 1 : 0); if (Array.isArray(s.indexedDB)) idb += s.indexedDB.length; if (Array.isArray(s.cacheStorage)) cache += s.cacheStorage.length; if (typeof s.serviceWorkers === 'number') sw += s.serviceWorkers; } }
  report.summary = { pages: report.pages.length, cookies: cookiesTotal, setCookieHeaders: report.setCookieHeaders.length, localStorageKeys: [...allLS].sort(), sessionStorageKeys: [...allSS].sort(), indexedDB: idb, cacheStorage: cache, serviceWorkers: sw, thirdPartyRequests: report.blockedPosts, nonLkKeys: [...allLS, ...allSS].filter(k => !/^lk[-_]/.test(k)) };
  console.log(JSON.stringify(report.summary, null, 1));
  for (const p of report.pages) console.log(p.page.padEnd(34), 'avant : LS', Object.keys(p.before.localStorage).length, 'SS', Object.keys(p.before.sessionStorage).length, '| après :', 'LS', Object.keys(p.after.localStorage).length, 'SS', Object.keys(p.after.sessionStorage).length, '| hôtes', p.hostsAfter.join(','), '|', p.used.join(' ; '));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(report, null, 1));
  await browser.close();
})().catch(e => { console.error(e); process.exit(2); });
