'use strict';
/* v7.92 : contrôle navigateur des pages enrichies et de l’Atelier 3D (Chromium headless via Playwright, site servi en local).
   - Devine le lieu (français, allemand ; 390 et 1 280 px) : une réponse fait entrer l’image dans l’album (pastille « nouvelle
     image », devise de la région) ; avec trois parties jouées les jours d’avant, le résultat montre les statistiques (parties,
     réussite, meilleure série, album, sept derniers jours, scores, régions) et l’album des régions les images jouées ;
   - Actualités et Éditions : les filtres ne gardent que le type choisi ; les comptes à rebours sont écrits ;
   - Mode compagnon (1 280 px) : l’écran du téléphone suit l’étape lue ;
   - Encart Léo : une question posée par bouton ouvre Léo avec cette question ;
   - Atelier 3D : changer la peinture ou le véhicule ne recompile aucun nuanceur ; hors de l’écran, rien n’est dessiné ;
   - Images au téléphone (390 px, densité 3 ; les sept pages, en français et deux en anglais ou en allemand) : aucune image
     de 1 280 px, toute la page défilée ; l’image de la partie de Devine le lieu en 800 px ; une autre vidéo choisie, son
     affiche arrive en 800 px ;
   - partout : aucun défilement horizontal, aucune erreur JavaScript, aucune requête vers un autre site, aucun cookie.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/v792-browser.cjs <dossier de sortie hors dépôt>
   (LK_CHROMIUM=<chemin> pour un Chromium déjà installé). Écrit v792-browser.json et des captures. Code 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = process.argv[2];
if (!out) { console.error('Usage : node outils/tests/v792-browser.cjs <dossier>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const D = JSON.parse(fs.readFileSync(path.join(root, 'outils/devine/devine.json'), 'utf8'));
const API = (() => { const c = {}; vm.runInNewContext(fs.readFileSync(path.join(root, 'devine.js'), 'utf8'), c); return c.LKDevine; })();
const POOL = D.images.map(i => ({ id: i.id, r: i.region })).sort((a, b) => (a.id < b.id ? -1 : 1)), REGION = Object.fromEntries(POOL.map(x => [x.id, x.r]));
const checks = []; let failed = 0;
const check = (ok, label, detail) => { checks.push({ ok: !!ok, label, detail }); if (!ok) { failed++; console.log('ÉCHEC ' + label + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : '')); } };
const INSTR = () => { window.__gl = { link: 0, draw: 0 }; for (const P of [window.WebGL2RenderingContext && WebGL2RenderingContext.prototype, window.WebGLRenderingContext && WebGLRenderingContext.prototype]) { if (!P) continue; const l = P.linkProgram, d = P.drawElements; P.linkProgram = function () { window.__gl.link++; return l.apply(this, arguments); }; P.drawElements = function () { window.__gl.draw++; return d.apply(this, arguments); }; } };

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

  /* ---------- Devine le lieu ---------- */
  const today = API.parisDate(Date.now()), t = API.dayIndex(today);
  let seeded = API.blank();
  for (const [k, ok] of [[-3, [1, 1, 0, 1, 1]], [-2, [1, 0, 1, 1, 0]], [-1, [1, 1, 1, 1, 1]]]) {
    const iso = API.isoOfIndex(t + k), ids = API.draw(POOL, iso, { per: D.parPartie, ref: D.debut });
    ids.forEach((id, i) => { const r = REGION[id]; seeded = API.answerDay(seeded, iso, Math.max(1, API.dayIndex(iso) - API.dayIndex(D.debut) + 1), ids, ok[i] ? r : (r === 'vice-city' ? 'ambrosia' : 'vice-city'), REGION); });
  }
  for (const lang of ['fr', 'de']) for (const w of [390, 1280]) {
    const tag = 'devine ' + lang + '-' + w, url = base + '/' + (lang === 'fr' ? '' : lang + '/') + 'devine-le-lieu.html';
    /* partie neuve : la première réponse entre dans l’album */
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: lang === 'fr' ? 'fr-FR' : 'de-DE', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
      const page = await ctx.newPage(), done = watch(page, tag + ' (première réponse)');
      await page.goto(url, { waitUntil: 'load' });
      const id = await page.evaluate(() => (document.querySelector('[data-dv-card] .dv-fig img').getAttribute('src').match(/officiel\/(.+)-\d+\.webp/) || [])[1]);
      await page.click('[data-dv-opt="' + REGION[id] + '"]'); await page.waitForTimeout(400);
      const r = await page.evaluate(i => ({ tag: !document.querySelector('[data-dv-answer-tag]').hidden && document.querySelector('[data-dv-answer-tag]').textContent.trim().length > 10, fresh: !document.querySelector('[data-dv-answer-new]').hidden, seen: !!document.querySelector('[data-dv-slot="' + i + '"].is-seen img'), album: JSON.parse(localStorage.getItem('lk_devine_v1')).st.a, keys: Object.keys(localStorage) }), id);
      check(r.tag && r.fresh && r.seen && r.album.length === 1 && r.album[0] === id && r.keys.join() === 'lk_devine_v1', tag + ' : devise de la région, « nouvelle image », case de l’album remplie, une seule clé', r);
      await done(); await ctx.close();
    }
    /* trois parties les jours d’avant, la partie du jour jouée : résultat et album */
    {
      const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, locale: lang === 'fr' ? 'fr-FR' : 'de-DE', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
      await ctx.addInitScript(v => { try { localStorage.setItem('lk_devine_v1', v); } catch (e) { /* rien */ } }, JSON.stringify(seeded));
      const page = await ctx.newPage(), done = watch(page, tag + ' (statistiques)');
      await page.goto(url, { waitUntil: 'load' });
      for (let i = 0; i < D.parPartie; i++) {
        const id = await page.evaluate(() => (document.querySelector('[data-dv-card] .dv-fig img').getAttribute('src').match(/officiel\/(.+)-\d+\.webp/) || [])[1]);
        await page.click('[data-dv-opt="' + REGION[id] + '"]'); await page.waitForTimeout(150); await page.click('[data-dv-next]'); await page.waitForTimeout(250);
      }
      const r = await page.evaluate(() => {
        const res = document.querySelector('[data-dv-result]'), txt = s => (res.querySelector(s) || {}).textContent || '';
        return { shown: !res.hidden, parties: txt('[data-dv-parties]').trim(), reussite: txt('[data-dv-reussite]').trim(), max: txt('[data-dv-serie-max]').trim(), serie: txt('[data-dv-serie]').trim(), album: txt('[data-dv-album-n]').trim(),
          week: res.querySelectorAll('[data-dv-week] .dv-wk').length, played: res.querySelectorAll('[data-dv-week] .dv-wk:not(.is-empty)').length, today: res.querySelectorAll('[data-dv-dist].is-today').length,
          bars: [...res.querySelectorAll('.dv-rs-bar')].filter(b => parseFloat(b.style.getPropertyValue('--p')) > 0 && b.querySelector('i').getBoundingClientRect().width > 0).length, seen: document.querySelectorAll('[data-dv-slot].is-seen').length, n: JSON.parse(localStorage.getItem('lk_devine_v1')).st.a.length };
      });
      check(r.shown && r.parties.replace(/\D/g, '') === '4' && /\d/.test(r.reussite) && /4/.test(r.serie) && /4/.test(r.max) && r.week === 7 && r.played === 4 && r.today === 1 && r.bars >= 3 && r.seen === r.n && r.n === 20 && /20/.test(r.album), tag + ' : statistiques du résultat et album des régions', r);
      await page.screenshot({ path: path.join(out, 'devine-' + lang + '-' + w + '.png'), fullPage: false });
      await done(); await ctx.close();
    }
  }

  /* ---------- Actualités et Éditions : filtres, comptes à rebours ---------- */
  for (const [pg, scope] of [['actus.html', '#ac-frise'], ['editions.html', '#ultimate']]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(), done = watch(page, pg);
    await page.goto(base + '/' + pg, { waitUntil: 'load' });
    const r = await page.evaluate(sc => {
      const bar = document.querySelector('[data-vt-filters]'), btn = bar && [...bar.querySelectorAll('[data-vt-f]')].find(b => b.getAttribute('data-vt-f'));
      if (!bar || bar.hidden || !btn) return { bar: false };
      const f = btn.getAttribute('data-vt-f'); btn.click();
      const items = [...document.querySelectorAll(sc + ' [data-vt-item]')], vis = items.filter(i => !i.hidden);
      const ok = vis.length > 0 && vis.every(i => (' ' + i.getAttribute('data-vt-t') + ' ').includes(' ' + f + ' ')) && vis.length < items.length;
      bar.querySelector('[data-vt-f=""]').click();
      const back = items.every(i => !i.hidden);
      const cds = [...document.querySelectorAll('[data-vt-cd]')].map(x => x.textContent.trim());
      return { bar: true, ok, back, pressed: bar.querySelector('[data-vt-f=""]').getAttribute('aria-pressed'), cds };
    }, scope);
    check(r.bar && r.ok && r.back && r.pressed === 'true', pg + ' : le filtre ne garde que le type choisi, « tout » rend la liste', r);
    if (r.cds && r.cds.length) check(r.cds.every(x => x.length > 0) || Date.now() > Date.parse('2026-11-20T00:00:00'), pg + ' : comptes à rebours écrits', r.cds);
    await done(); await ctx.close();
  }

  /* ---------- Mode compagnon : l’écran suit l’étape ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage(), done = watch(page, 'compagnon');
    await page.goto(base + '/compagnon.html', { waitUntil: 'load' });
    const on = [];
    for (let i = 0; i < 4; i++) {
      await page.evaluate(k => { const s = document.querySelectorAll('[data-cp-step]')[k]; window.scrollTo(0, s.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.45); }, i);
      await page.waitForTimeout(400);
      on.push(await page.evaluate(() => [...document.querySelectorAll('[data-cp-scr]')].findIndex(s => s.classList.contains('is-on'))));
    }
    check(on.join() === '0,1,2,3', 'compagnon : l’écran du téléphone suit l’étape lue', on);
    await done(); await ctx.close();
  }

  /* ---------- Encart Léo : la question part vers Léo ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await ctx.newPage(), done = watch(page, 'Léo (encart)');
    await page.goto(base + '/editions.html', { waitUntil: 'load' });
    const q = await page.evaluate(() => { const b = document.querySelector('.vt-aside [data-vt-leo]'); b.scrollIntoView(); b.click(); return b.textContent.trim(); });
    await page.waitForFunction(() => window.LKLeoUI && window.LKLeoUI.isOpen && window.LKLeoUI.isOpen(), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const r = await page.evaluate(qq => ({ open: !!(window.LKLeoUI && window.LKLeoUI.isOpen && window.LKLeoUI.isOpen()), asked: document.body.innerText.includes(qq) }), q);
    check(r.open && r.asked, 'encart Léo : la question est posée à Léo', { q, ...r });
    await done(); await ctx.close();
  }

  /* ---------- Atelier 3D ---------- */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    await ctx.addInitScript(INSTR);
    const page = await ctx.newPage(), done = watch(page, 'atelier');
    await page.goto(base + '/atelier-3d.html', { waitUntil: 'load' });
    await page.waitForFunction(() => document.querySelector('[data-at-loading]').hidden && window.__gl.draw > 0, null, { timeout: 90000 });
    await page.waitForTimeout(1500);
    const l0 = await page.evaluate(() => window.__gl.link);
    await page.evaluate(() => { const r = [...document.querySelectorAll('[data-at-menu="v"] input[type="radio"][data-at-k="paint"]')][3]; r.checked = true; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(2500);
    await page.evaluate(() => { const r = [...document.querySelectorAll('[data-at-menu="v"] input[type="radio"][data-at-k="paint"]')][6]; r.checked = true; r.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForTimeout(2500);
    const l1 = await page.evaluate(() => window.__gl.link);
    check(l1 === l0, 'atelier : changer la peinture ne recompile aucun nuanceur', { avant: l0, apres: l1 });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await page.waitForTimeout(1500);
    const d0 = await page.evaluate(() => window.__gl.draw); await page.waitForTimeout(3000); const d1 = await page.evaluate(() => window.__gl.draw);
    check(d1 === d0, 'atelier : hors de l’écran, rien n’est dessiné', { dessins: d1 - d0 });
    await page.evaluate(() => document.querySelector('[data-at-view]').scrollIntoView({ block: 'center' })); await page.waitForTimeout(1500);
    const d2 = await page.evaluate(() => window.__gl.draw);
    check(d2 > d1, 'atelier : la scène est redessinée en revenant à l’écran', { dessins: d2 - d1 });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20000 }), page.click('[data-at-png]')]);
    const png = path.join(out, 'atelier-export.png'); await dl.saveAs(png);
    check(fs.statSync(png).size > 20000, 'atelier : l’image exportée contient la scène', { octets: fs.statSync(png).size });
    await done(); await ctx.close();
  }

  /* ---------- Images au téléphone (390 px, densité 3) : 800 px au plus ---------- */
  for (const pg of ['editions.html', 'videos.html', 'actus.html', 'verification.html', 'presse.html', 'compagnon.html', 'devine-le-lieu.html', 'en/videos.html', 'de/devine-le-lieu.html']) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const page = await ctx.newPage(), done = watch(page, pg + ' (390 px, densité 3)');
    const big = []; page.on('request', r => { if (/-1280\.webp$/.test(r.url().split('?')[0])) big.push(r.url().replace(base, '')); });
    await page.goto(base + '/' + pg, { waitUntil: 'load' });
    /* toute la page défile, chaque image se charge */
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); } });
    await page.waitForTimeout(600);
    const pics = await page.evaluate(() => [...document.querySelectorAll('picture.vt-pic img')].map(i => ({ src: i.currentSrc, w: i.getBoundingClientRect().width })));
    check(pics.length > 0 && !big.length, pg + ' : au téléphone, aucune image de 1 280 px (les visuels arrivent en 480 ou 800 px)', { images: pics.length, gros: big.slice(0, 3) });
    /* Devine le lieu : l’image de la partie (le plus grand élément de l’écran) arrive en 800 px */
    if (/devine-le-lieu/.test(pg)) { const g = await page.evaluate(() => { const i = document.querySelector('[data-dv-card] .dv-fig picture img'); return i && i.currentSrc; }); check(g && /-800\.webp$/.test(g.split('?')[0]), pg + ' : l’image de la partie arrive en 800 px', g); }
    if (pg.endsWith('videos.html')) {
      /* choisir une autre vidéo : l’affiche suit, toujours en 800 px au plus */
      const r = await page.evaluate(async () => {
        const a = [...document.querySelectorAll('[data-ac-pick]')].find(x => x.getAttribute('aria-current') !== 'true'); if (!a) return null;
        a.scrollIntoView({ block: 'center' }); a.click(); await new Promise(res => setTimeout(res, 900));
        const img = document.querySelector('[data-ac-screen] img'), src = document.querySelector('[data-ac-screen] source');
        return { want: a.getAttribute('data-poster-m'), cur: img && img.currentSrc, source: src && src.getAttribute('srcset') };
      });
      check(r && r.want && r.cur && r.cur.split('?')[0].endsWith(r.want.split('/').pop()) && r.source && r.source.includes(r.want), pg + ' : une autre vidéo choisie, son affiche arrive en 800 px', r);
    }
    await done(); await ctx.close();
  }

  await browser.close(); server.close();
  fs.writeFileSync(path.join(out, 'v792-browser.json'), JSON.stringify({ date: new Date().toISOString(), checks }, null, 1));
  console.log('v7.92 dans le navigateur : ' + (checks.length - failed) + '/' + checks.length + ' contrôles');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
