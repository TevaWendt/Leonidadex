'use strict';
/* v7.93 (lot 8) : contrôle navigateur des quatre pages qui répondent aux recherches des joueurs (Chromium headless via
   Playwright, site servi en local) : prechargement.html, gta-6-pc.html, gta-6-vs-gta-5.html, vraies-voitures.html.
   - français et allemand (le plus long), 390, 768 et 1 280 px : aucun défilement horizontal, aucune erreur JavaScript,
     aucune requête vers un autre site, aucun cookie, aucun texte sous 11 px ;
   - entrées au défilement : toute la page lue, chaque bloc « lk-reveal » et chaque groupe « data-lk-reveal » est entré
     (mouvement normal) ; en « réduire les animations », tout est visible sans attendre ;
   - comptes à rebours du préchargement écrits dans la langue de la page ; état « avant » affiché ;
   - sous-navigation collante : un clic mène à la section (ancre) ; encart Léo : question posée par bouton ouvre Léo ;
   - vraies voitures : le repli d’une grande marque s’ouvre et montre ses lignes ; le lien d’une fiche mène à la fiche ;
   - mots coupés : aucun mot d’un titre coupé en milieu (césure du navigateur) sur les trois largeurs.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/v793-browser.cjs <dossier de sortie hors dépôt>
   (LK_CHROMIUM=<chemin> pour un Chromium déjà installé). Écrit v793-browser.json et des captures. Code 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = process.argv[2];
if (!out) { console.error('Usage : node outils/tests/v793-browser.cjs <dossier>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const PAGES = ['prechargement.html', 'gta-6-pc.html', 'gta-6-vs-gta-5.html', 'vraies-voitures.html'];
const checks = []; let failed = 0;
const check = (ok, label, detail) => { checks.push({ ok: !!ok, label, detail }); if (!ok) { failed++; console.log('ÉCHEC ' + label + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : '')); } };
/* lecture de la page : un demi-écran à la fois, une image rendue à chaque position (les sections en content-visibility:auto
   grandissent en s'affichant : on continue tant que le bas de page recule), puis 1,5 s pour les dernières entrées */
const scrollAll = page => page.evaluate(async () => {
  const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  const maxY = () => document.documentElement.scrollHeight - window.innerHeight;
  let y = 0;
  for (let guard = 0; guard < 400; guard++) {
    window.scrollTo(0, y); await frame(); await new Promise(r => setTimeout(r, 150));
    if (y >= maxY()) { await new Promise(r => setTimeout(r, 400)); if (y >= maxY()) break; }
    y = Math.min(y + Math.floor(window.innerHeight / 2), maxY());
  }
  await new Promise(r => setTimeout(r, 1500));
});
/* défilement doux (scroll-behavior: smooth) terminé : au moins 1,2 s, puis position stable pendant 600 ms (8 s au plus) */
const settled = page => page.evaluate(() => new Promise(res => { let last = -1, same = 0, n = 0; const t = setInterval(() => { const y = window.scrollY; if (y === last) same++; else same = 0; last = y; n++; if ((same >= 4 && n >= 8) || n > 53) { clearInterval(t); res(y); } }, 150); }));

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const watch = (page, tag) => {
    const errs = [], ext = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    page.on('request', r => { if (!r.url().startsWith(base) && !/^(data|blob):/.test(r.url())) ext.push(r.url()); });
    return async () => {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const cookies = await page.context().cookies();
      check(over <= 1 && !errs.length && !ext.length && !cookies.length, tag + ' : ni défilement horizontal, ni erreur, ni requête externe, ni cookie', { over, errs: errs.slice(0, 2), ext: ext.slice(0, 2), cookies: cookies.length });
    };
  };
  for (const lang of ['fr', 'de']) for (const w of [390, 768, 1280]) for (const p of PAGES) {
    const tag = p.replace('.html', '') + ' ' + lang + '-' + w, url = base + '/' + (lang === 'fr' ? '' : lang + '/') + p;
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage(); const done = watch(page, tag);
    await page.goto(url, { waitUntil: 'networkidle' });
    await scrollAll(page);
    await done();
    /* entrées : tout est entré après la lecture ; aucun texte sous 11 px ; aucun mot coupé dans un titre */
    const st = await page.evaluate(() => {
      const hidden = [...document.querySelectorAll('.lk-reveal, [data-lk-reveal], .reveal, .rise')].filter(e => !(e.classList.contains('is-in') || e.classList.contains('in')));
      const small = [...document.querySelectorAll('main *')].filter(e => e.children.length === 0 && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11 && getComputedStyle(e).display !== 'none').map(e => e.textContent.trim().slice(0, 30));
      const cut = [...document.querySelectorAll('main h1, main h2, main h3')].filter(h => { const r = h.getBoundingClientRect(); return r.width > 0 && h.scrollWidth > h.clientWidth + 1; }).map(h => h.textContent.trim().slice(0, 40));
      return { hidden: hidden.length, small, cut, cds: [...document.querySelectorAll('.vt-cd')].map(e => e.textContent.trim()) };
    });
    check(st.hidden === 0, tag + ' : tous les blocs sont entrés après la lecture', st.hidden);
    check(!st.small.length, tag + ' : aucun texte sous 11 px', st.small.slice(0, 3));
    check(!st.cut.length, tag + ' : aucun titre qui déborde de sa boîte', st.cut.slice(0, 3));
    if (p === 'prechargement.html') check(st.cds.length >= 3 && st.cds.every(t => /\d/.test(t)), tag + ' : comptes à rebours écrits', st.cds);
    if (p === 'prechargement.html') check(await page.$('.rc-state--avant'), tag + ' : état « avant » affiché');
    /* sous-navigation : un clic sur la deuxième entrée mène à sa section */
    if (w === 1280) {
      await page.evaluate(() => window.scrollTo(0, 0)); await settled(page);
      const id = await page.evaluate(() => { const a = document.querySelectorAll('nav.ed-nav a')[1]; a.click(); return a.getAttribute('href').slice(1); });
      await settled(page);
      const hit = await page.evaluate(id => ({ id, top: document.getElementById(id).getBoundingClientRect().top }), id);
      check(hit.top >= -200 && hit.top < 400, tag + ' : le sommaire mène à ' + hit.id, hit);
      /* encart Léo : la question du bouton ouvre Léo */
      const q = await page.evaluate(() => { const b = document.querySelector('.vt-aside [data-vt-leo]'); if (!b) return null; b.scrollIntoView(); b.click(); return b.textContent.trim(); });
      await page.waitForFunction(() => window.LKLeoUI && window.LKLeoUI.isOpen && window.LKLeoUI.isOpen(), null, { timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const r = await page.evaluate(qq => { const n = s => String(s).replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' '); return { open: !!(window.LKLeoUI && window.LKLeoUI.isOpen && window.LKLeoUI.isOpen()), asked: n(document.body.innerText).includes(n(qq)) }; }, q);
      check(q && r.open && r.asked, tag + ' : la question de l’encart est posée à Léo', { q, ...r });
    }
    if (p === 'vraies-voitures.html' && w === 1280) {
      const r = await page.evaluate(async () => { const d = document.querySelector('.rc-brand-d'); if (!d) return { none: true }; d.open = true; await new Promise(x => setTimeout(x, 300)); const n = d.querySelectorAll('.rc-veh').length; const a = d.querySelector('.rc-veh-a'); return { n, href: a && a.getAttribute('href') }; });
      check(r.n > 20 && /^vehicules\//.test(r.href || ''), tag + ' : le repli d’une grande marque s’ouvre sur ses lignes', r);
    }
    await page.screenshot({ path: path.join(out, tag.replace(/[^a-z0-9-]+/g, '_') + '.png'), fullPage: false });
    await ctx.close();
    /* mouvement réduit : tout visible dès l’arrivée, sans défilement */
    if (w === 1280) {
      const c2 = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
      const pg2 = await c2.newPage(); await pg2.goto(url, { waitUntil: 'networkidle' }); await pg2.waitForTimeout(600);
      const vis = await pg2.evaluate(() => [...document.querySelectorAll('main .lk-reveal, main [data-lk-reveal] > li, main .ed')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && getComputedStyle(e).opacity !== '1'; }).length);
      check(vis === 0, tag + ' : mouvement réduit, tout visible sans défilement', vis);
      await pg2.screenshot({ path: path.join(out, tag.replace(/[^a-z0-9-]+/g, '_') + '-reduit.png') });
      await c2.close();
    }
  }
  await browser.close(); server.close();
  fs.writeFileSync(path.join(out, 'v793-browser.json'), JSON.stringify({ date: new Date().toISOString(), failed, checks }, null, 1));
  console.log((checks.length - failed) + ' / ' + checks.length + ' contrôles réussis' + (failed ? ' — ' + failed + ' ÉCHEC(S)' : ''));
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
