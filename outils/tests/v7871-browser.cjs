#!/usr/bin/env node
'use strict';
/* v7.87.1 : contrôle navigateur des pages des v7.86 et v7.87 (Chromium headless via Playwright, site servi en local, aucune
   requête vers un autre site). Pour chaque page du périmètre, en français et en allemand, à 390, 768 et 1 280 px :
   - mouvement réduit : tout est visible dès le chargement (aucun bloc à opacité réduite), rien ne bouge ;
   - mouvement normal : le premier écran est visible tout de suite ; en descendant, chaque bloc [data-lk-reveal] entre
     (classe is-in posée par le moteur commun) et finit visible ; aucune erreur de script ;
   - sans script : tout le contenu est visible ;
   - « GTA 6 » et « GTA VI » jamais coupés en fin de ligne dans les titres ; aucun défilement horizontal ; textes de 11 px au
     moins ; cibles tactiles de 24 px au moins sur téléphone ; cartes d’une même rangée à la même hauteur ;
   - lecteur des vidéos : rien avant le clic, le cadre au clic (adresse youtube-nocookie au bon moment).
   Écrit rapport.json et des captures (chaque moment de motion design pendant son entrée : début, milieu, fin, et la même vue
   en « réduire les animations ») dans le dossier donné, hors dépôt.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/v7871-browser.cjs <dossier> (LK_CHROMIUM=<chemin>) */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || '/tmp/v7871-browser');
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; } if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const A = JSON.parse(fs.readFileSync(path.join(root, 'outils/actus/actus.json'), 'utf8')), R = JSON.parse(fs.readFileSync(path.join(root, 'outils/radios/radios.json'), 'utf8'));
/* LK_PAGES=a.html,b.html : ces pages seulement (sans lecteur ni films) ; LK_FILMS_SEULS=1 : le lecteur et les films seulement */
const PAGES = process.env.LK_FILMS_SEULS ? [] : (process.env.LK_PAGES ? process.env.LK_PAGES.split(',') : ['actus.html', 'videos.html', ...A.videos.liste.map(v => 'videos/' + v.id + '.html'), 'editions.html', 'verification.html', 'radios.html', ...R.stations.map(s => 'radios/' + s.id + '.html'), 'index.html', 'vehicules/grotti-cheetah-classic.html', 'armes/batte.html', 'mentions-legales.html']);
const WIDTHS = [390, 768, 1280], LANGS = ['', 'de/'];
const SEL = '[data-lk-reveal], .reveal, .rise, .lk-reveal';

/* mesures dans la page (après défilement complet) */
function audit(mobile) {
  const W = document.documentElement.clientWidth, r = { overflow: document.documentElement.scrollWidth - W, hidden: [], split: [], small: [], tiny: [], rows: [] };
  const vis = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && !el.closest('[hidden], details:not([open]) > :not(summary), .sr-only, [aria-hidden="true"]'); };
  const sig = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '');
  for (const el of document.querySelectorAll('main ' + ['[data-lk-reveal]', '.reveal', '.rise', '.lk-reveal'].join(', main '))) { if (!vis(el)) continue; const b = el.getBoundingClientRect(); if (b.height === 0) continue; let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= +getComputedStyle(e).opacity; if (o < 0.99 && r.hidden.length < 6) r.hidden.push(sig(el) + ' ' + o.toFixed(2)); }
  /* « GTA 6 » coupé : le mot « GTA » et son numéro sur deux lignes */
  for (const h of document.querySelectorAll('main h1, main h2, main h3, main summary')) {
    const t = h.textContent; if (!/GTA[\s ]+(?:6|VI)\b/.test(t) || !vis(h)) continue;
    const walker = document.createTreeWalker(h, NodeFilter.SHOW_TEXT); const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    const chars = []; for (const n of nodes) for (let i = 0; i < n.nodeValue.length; i++) chars.push([n, i]);
    const full = chars.map(([n, i]) => n.nodeValue[i]).join('');
    for (const m of full.matchAll(/GTA[\s ]+(6|VI)\b/g)) {
      const top = k => { const [n, i] = chars[k], rg = document.createRange(); rg.setStart(n, i); rg.setEnd(n, i + 1); const rc = rg.getClientRects()[0]; return rc ? rc.top : null; };
      const a = top(m.index), b = top(m.index + m[0].length - m[1].length);
      if (a !== null && b !== null && Math.abs(a - b) > 4 && r.split.length < 4) r.split.push(sig(h) + ' « ' + t.trim().replace(/\s+/g, ' ').slice(0, 70) + ' »');
    }
  }
  for (const el of document.querySelectorAll('main *')) { if (!vis(el) || ![...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim())) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 11 && el.getBoundingClientRect().height > 0 && r.small.length < 6) r.small.push(sig(el) + ' ' + fs.toFixed(1) + 'px « ' + el.textContent.trim().slice(0, 30) + ' »'); }
  if (mobile) for (const el of document.querySelectorAll('main a, main button, main summary')) { if (!vis(el)) continue; const cs = getComputedStyle(el); if (el.tagName === 'A' && (cs.display === 'inline' || el.closest('p, dd, td, figcaption, small'))) continue; const b = el.getBoundingClientRect(); if (b.width > 0 && b.height > 0 && (b.width < 24 || b.height < 24) && r.tiny.length < 6) r.tiny.push(sig(el) + ' ' + Math.round(b.width) + '×' + Math.round(b.height) + ' « ' + el.textContent.trim().slice(0, 24) + ' »'); }
  /* cartes d’une même rangée à la même hauteur (grilles de la section) */
  for (const box of document.querySelectorAll('.ac-moments, .ac-vcards, .ac-next-l, .ac-ue, .ac-bonus, .ac-eds, .vf-list, .vf-rubs, .radios-stations, .ed-cols, .pf-stats')) {
    const kids = [...box.children].filter(k => vis(k) && k.getBoundingClientRect().height > 0); const rows = {};
    for (const k of kids) { const b = k.getBoundingClientRect(); (rows[Math.round(b.top / 4)] = rows[Math.round(b.top / 4)] || []).push(b.height); }
    for (const hs of Object.values(rows)) if (hs.length > 1 && Math.max(...hs) - Math.min(...hs) > 2 && r.rows.length < 4) r.rows.push(sig(box) + ' ' + Math.round(Math.min(...hs)) + '–' + Math.round(Math.max(...hs)));
  }
  return r;
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox', '--disable-background-networking'] });
  const report = { date: new Date().toISOString(), pages: [], player: [], film: [] }; let fails = 0;
  const offsite = route => { const u = new URL(route.request().url()); return u.hostname === '127.0.0.1' ? route.continue() : route.abort(); };
  for (const lang of LANGS) for (const w of WIDTHS) for (const motion of ['reduce', 'no-preference', 'nojs']) {
    const mobile = w < 700;
    const ctx = await browser.newContext({ viewport: { width: w, height: mobile ? 760 : 900 }, isMobile: mobile, hasTouch: mobile, reducedMotion: motion === 'reduce' ? 'reduce' : 'no-preference', javaScriptEnabled: motion !== 'nojs' });
    await ctx.route('**/*', offsite);
    for (const pg of PAGES) {
      const rel = lang + pg; if (!fs.existsSync(path.join(root, rel))) continue;
      const p = await ctx.newPage(), errs = [];
      p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/net::ERR_FAILED|ERR_BLOCKED/.test(m.text())) errs.push(m.text()); });
      const row = { pg: rel, w, motion };
      try {
        await p.goto(base + '/' + rel, { waitUntil: 'load' });
        if (motion === 'no-preference') {
          /* premier écran visible tout de suite : les blocs déjà dans l’écran ne sont jamais cachés */
          row.firstScreenHidden = await p.evaluate(sel => [...document.querySelectorAll('main ' + sel.split(', ').join(', main '))].filter(el => { const b = el.getBoundingClientRect(); return b.top < innerHeight && b.bottom > 0 && b.height > 0 && getComputedStyle(el).opacity === '0' && !el.closest('[hidden]'); }).map(el => el.tagName + '.' + el.className).slice(0, 4), SEL);
          /* les sections lointaines sont allégées (content-visibility: auto) : Chromium y gèle une animation dès qu'elle sort de
             l'écran et la reprend au retour ; pour mesurer le moteur et non ce gel invisible, elles restent rendues ici */
          await p.addStyleTag({ content: 'main *{content-visibility:visible!important}' });
          const h = await p.evaluate(() => document.documentElement.scrollHeight);
          for (let y = 0; y < h; y += 500) { await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y); await p.waitForTimeout(90); }
          await p.waitForTimeout(1400);
          row.notEntered = await p.evaluate(() => [...document.querySelectorAll('main [data-lk-reveal]')].filter(el => !el.classList.contains('is-in') && el.getBoundingClientRect().height > 0 && !el.closest('[hidden]')).length);
          /* un bloc encore transparent après ce passage rapide (500 px toutes les 90 ms) est ramené au milieu de l'écran,
             comme le ferait un visiteur : il doit alors entrer et finir visible (sinon il est compté dans « cachés ») */
          const n = await p.evaluate(sel => { let i = 0; for (const el of document.querySelectorAll('main ' + sel.split(', ').join(', main '))) { if (!el.getBoundingClientRect().height) continue; let o = 1; for (let e = el; e && e !== document.body; e = e.parentElement) o *= +getComputedStyle(e).opacity; if (o < 0.99 && i < 40) el.dataset.lkSeen = i++; } return i; }, SEL);
          for (let i = 0; i < n; i++) { await p.evaluate(i => document.querySelector('[data-lk-seen="' + i + '"]').scrollIntoView({ block: 'center', behavior: 'instant' }), i); await p.waitForTimeout(1300); }
          row.revus = n;
        } else await p.waitForTimeout(300);
        Object.assign(row, await p.evaluate(audit, mobile));
      } catch (e) { row.err = e.message.slice(0, 120); }
      row.errors = errs.slice(0, 3);
      const bad = row.err || row.overflow > 0 || (row.hidden || []).length || (row.split || []).length || (row.small || []).length || (row.tiny || []).length || (row.rows || []).length || (row.firstScreenHidden || []).length || row.notEntered || errs.length;
      if (bad) fails++;
      report.pages.push(row); await p.close();
    }
    await ctx.close();
  }
  /* lecteur des vidéos : aucun cadre avant le clic, le cadre au clic, au bon moment */
  if (!process.env.LK_PAGES) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.route('**/*', offsite);
    for (const v of A.videos.liste) {
      const p = await ctx.newPage(); await p.goto(base + '/videos/' + v.id + '.html', { waitUntil: 'load' });
      const before = await p.evaluate(() => document.querySelectorAll('iframe').length);
      const at = await p.evaluate(() => { const b = document.querySelector('.ac-replay[data-ac-at]'); return b ? b.dataset.acAt : null; });
      if (at) await p.click('.ac-replay[data-ac-at]'); else await p.click('[data-ac-play]');
      const src = await p.evaluate(() => (document.querySelector('.ac-screen iframe') || {}).src || '');
      const ok = before === 0 && src.startsWith('https://www.youtube-nocookie.com/embed/' + v.youtube) && (!at || src.endsWith('&start=' + at));
      if (!ok) fails++; report.player.push({ video: v.id, before, src, ok }); await p.close();
    }
    await ctx.close();
    /* un film par moment de motion design (début, milieu, fin de l’entrée) et la même vue en mouvement réduit : frise des
       actualités, planche des photogrammes, seize contenus de l’Ultimate, accord du poste sur les stations, points
       confirmés ; le bloc visé est amené à 500 px du haut de l’écran, puis capturé à 60, 340 et 1 240 ms */
    const FILMS = [['frise', 'actus.html', '.ac-ev', 3], ['moments', 'videos/trailer-1.html', '.ac-moment', 3], ['ultimate', 'editions.html', '.ac-ue-i', 6],
      ['stations', 'radios.html', '.radios-station', 3], ['confirme', 'verification.html', '.vf-item', 3]];
    for (const [name, pg, sel, idx] of FILMS) for (const motion of ['no-preference', 'reduce']) {
      const c2 = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: motion }); await c2.route('**/*', offsite);
      const p = await c2.newPage(); await p.goto(base + '/' + pg, { waitUntil: 'load' }); await p.waitForTimeout(600);
      const y = await p.evaluate(([sel, idx]) => { const el = document.querySelectorAll(sel)[idx]; return el.getBoundingClientRect().top + scrollY - 500; }, [sel, idx]);
      await p.evaluate(y => scrollTo({ top: y, behavior: 'instant' }), y);
      for (const [i, t] of (motion === 'reduce' ? [[0, 300]] : [[0, 60], [1, 280], [2, 900]])) { await p.waitForTimeout(t); const f = path.join(out, name + '-' + motion + '-' + i + '.png'); await p.screenshot({ path: f }); report.film.push(f); }
      await c2.close();
    }
  }
  report.fails = fails;
  fs.writeFileSync(path.join(out, 'rapport.json'), JSON.stringify(report, null, 1));
  const sum = k => report.pages.filter(r => (Array.isArray(r[k]) ? r[k].length : r[k])).length;
  console.log('Pages : ' + report.pages.length + ' chargements ; débordements ' + sum('overflow') + ', cachés ' + sum('hidden') + ', premier écran caché ' + sum('firstScreenHidden') + ', non entrés ' + sum('notEntered') + ', « GTA 6 » coupés ' + sum('split') + ', petits textes ' + sum('small') + ', petites cibles ' + sum('tiny') + ', rangées inégales ' + sum('rows') + ', erreurs ' + sum('errors') + '.');
  console.log('Lecteur : ' + report.player.filter(x => x.ok).length + '/' + report.player.length + '. Captures des moments (début, milieu, fin, mouvement réduit) : ' + report.film.length + '.');
  console.log(fails ? fails + ' échec(s) : voir ' + path.join(out, 'rapport.json') : 'Tout est bon.');
  await browser.close(); server.close(); process.exitCode = fails ? 1 : 0;
})();
