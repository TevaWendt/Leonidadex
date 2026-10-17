'use strict';
/* v7.92.1 : contrôle navigateur des pages revues et de la nouvelle page Prix et collector (Chromium headless via Playwright,
   site servi en local).
   - Prix et collector (français, anglais ; 390 et 1 280 px) : le total à cocher apparaît avec vitrine.js, au format monétaire
     de la langue de la page (Intl), et suit chaque case cochée ; le coffret ouvert est l’état final ; les totaux écrits
     d’avance se cachent ; au téléphone (densité 3), aucune image de 1 280 px ; les renvois aux sources de la bande de nuit
     (manettes) s’écrivent en clair ;
   - Éditions (français, allemand) : « Quelle édition choisir ? » montre la réponse qui suit les deux boutons cochés ; à
     1 280 px, les titres, listes et sources des deux cartes d’édition sont sur les mêmes lignes (sous-grille) ;
   - Presse : « Copier les trois phrases » copie les trois phrases, dans l’ordre ;
   - « Ce qui est confirmé » (320, 390, 1 280 px ; français, anglais, allemand) : le tampon « Vérifié » ne couvre aucune ligne
     du relevé ; les cartes confirmées d’une même rangée ont la même hauteur ;
   - Actualités : le filtre « Produits dérivés » ne garde que les produits ;
   - Devine le lieu (1 440 px) : dans chaque rangée de cartes postales, les titres, « Ce que montrent les captures », les albums
     et les liens « Sur la carte » sont alignés ;
   - Bande-annonce de lancement : le disque et sa pochette sont visibles, le titre du morceau lisible ;
   - partout (et sur toutes les pages revues en espagnol, italien et portugais, à 320, 390 et 1 440 px) : aucun défilement
     horizontal, aucune erreur JavaScript, aucune requête vers un autre site, aucun cookie.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/v7921-browser.cjs <dossier de sortie hors dépôt>
   (LK_CHROMIUM=<chemin> pour un Chromium déjà installé). Écrit v7921-browser.json. Code 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = process.argv[2];
if (!out) { console.error('Usage : node outils/tests/v7921-browser.cjs <dossier>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const checks = []; let failed = 0;
const check = (ok, label, detail) => { checks.push({ ok: !!ok, label, detail }); if (!ok) { failed++; console.log('ÉCHEC ' + label + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 400) : '')); } };
const LOCALE = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', it: 'it-IT', de: 'de-DE', pt: 'pt-BR' };
const url = (base, lang, f) => base + '/' + (lang === 'fr' ? '' : lang + '/') + f;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox'] });
  const open = async (lang, f, w, opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: opts.dpr || 1, isMobile: w < 600, hasTouch: w < 600, locale: LOCALE[lang], timezoneId: 'Europe/Paris', reducedMotion: opts.motion ? 'no-preference' : 'reduce' });
    if (opts.clipboard) await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await ctx.newPage(), errs = [], ext = [], big = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
    page.on('request', r => { const u = r.url(); if (!u.startsWith(base) && !/^(data|blob):/.test(u)) ext.push(u); if (/-1280\.webp/.test(u)) big.push(u); });
    await page.goto(url(base, lang, f), { waitUntil: 'load' }); await page.waitForTimeout(300);
    const tag = lang + '/' + f + ' @' + w;
    const done = async () => {
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      const cookies = await ctx.cookies();
      check(over <= 1 && !errs.length && !ext.length && !cookies.length, tag + ' : ni défilement horizontal, ni erreur, ni requête externe, ni cookie', { over, errs: errs.slice(0, 2), ext: ext.slice(0, 2), cookies: cookies.length });
      await ctx.close();
    };
    return { page, ctx, tag, done, big };
  };

  /* ---------- Prix et collector : le total à cocher ---------- */
  for (const lang of ['fr', 'en']) for (const w of [390, 1280]) {
    const { page, tag, done, big } = await open(lang, 'prix.html', w, { dpr: w < 600 ? 3 : 1 });
    const fmt = async c => page.evaluate(v => new Intl.NumberFormat(document.documentElement.lang, { style: 'currency', currency: 'EUR' }).format(v / 100), c);
    const total = () => page.evaluate(() => document.querySelector('[data-vt-total]').textContent.trim());
    const r0 = await page.evaluate(() => ({ shown: !document.querySelector('form[data-vt-sum]').hidden, stat: getComputedStyle(document.querySelector('.px-sum-static')).display }));
    check(r0.shown && r0.stat === 'none', tag + ' : le total arrive avec le script, les totaux écrits d’avance se cachent', r0);
    check(await total() === await fmt(7999), tag + ' : total de départ (Édition Standard) au format de la langue', { got: await total(), want: await fmt(7999) });
    await page.check('input[name="collector"]'); await page.check('input[name="blanche"]'); await page.waitForTimeout(100);
    check(await total() === await fmt(7999 + 39999 + 8499), tag + ' : Standard + coffret + manette blanche', { got: await total() });
    await page.check('input[name="jeu"][value="9999"]'); await page.uncheck('input[name="blanche"]'); await page.waitForTimeout(100);
    check(await total() === await fmt(9999 + 39999), tag + ' : Ultimate + coffret', { got: await total() });
    await page.check('input[name="jeu"][value="0"]'); await page.uncheck('input[name="collector"]'); await page.waitForTimeout(100);
    check(await total() === await fmt(0), tag + ' : rien de coché', { got: await total() });
    const box = await page.evaluate(() => ({ open: +getComputedStyle(document.querySelector('.px-box--hero .px-box-o')).opacity, closed: +getComputedStyle(document.querySelector('.px-box--hero .px-box-f')).opacity, loaded: [...document.querySelectorAll('.px-box--hero img')].every(i => i.complete && i.naturalWidth > 0) }));
    check(box.open === 1 && box.closed === 0 && box.loaded, tag + ' : le coffret ouvert est l’état final', box);
    const refs = await page.evaluate(() => [...document.querySelectorAll('.ed--night .ac-refs a')].map(a => getComputedStyle(a).color));
    check(refs.length >= 1 && refs.every(c => (c.match(/\d+/g) || []).slice(0, 3).every(v => +v >= 200)), tag + ' : renvois aux sources en clair sur la nuit', refs);
    /* au téléphone : toute la page défilée, aucune image de 1 280 px */
    if (w < 600) { await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); } }); await page.waitForTimeout(400); check(!big.length, tag + ' : aucune image de 1 280 px au téléphone', big.slice(0, 3)); }
    await done();
  }

  /* ---------- Éditions : « Quelle édition choisir ? » ---------- */
  for (const lang of ['fr', 'de']) for (const w of [390, 1280]) {
    const { page, tag, done } = await open(lang, 'editions.html', w);
    const shown = () => page.evaluate(() => [...document.querySelectorAll('[data-vt-answer]')].filter(a => !a.hidden).map(a => a.getAttribute('data-vt-answer')));
    check(!(await page.evaluate(() => document.querySelector('form[data-vt-pick]').hidden)), tag + ' : questions montrées');
    check((await shown()).join() === 'non-non', tag + ' : réponse de départ', await shown());
    /* on clique l’étiquette, comme le visiteur (le bouton radio lui-même est caché sous son dessin) */
    await page.click('label:has(> input[name="contenus"][value="oui"])'); await page.waitForTimeout(80);
    check((await shown()).join() === 'oui-non', tag + ' : contenus en plus', await shown());
    await page.click('label:has(> input[name="boite"][value="oui"])'); await page.waitForTimeout(80);
    check((await shown()).join() === 'oui-oui', tag + ' : contenus et boîte', await shown());
    const pair = await page.evaluate(() => [...document.querySelectorAll('.ed-pair img')].every(i => i.complete && i.naturalWidth > 0));
    check(pair, tag + ' : les deux éditions du bandeau sont chargées');
    if (w >= 820) {
      const al = await page.evaluate(() => ['h3', '.ac-checks', '.ac-edcard-src'].map(sel => [...document.querySelectorAll('.ac-duo > .ac-edcard')].map(c => Math.round(c.querySelector(sel).getBoundingClientRect().top))));
      check(al.every(t => t.length === 2 && Math.abs(t[0] - t[1]) <= 1), tag + ' : titres, listes et sources des deux éditions alignés', al);
    }
    await done();
  }

  /* ---------- Presse : copier les trois phrases ---------- */
  {
    const { page, tag, done } = await open('fr', 'presse.html', 1280, { clipboard: true });
    const want = await page.evaluate(() => [...document.querySelectorAll('[data-vt-copy-box] [data-vt-copy-src] p')].map(p => p.textContent.replace(/\s+/g, ' ').trim()));
    await page.click('[data-vt-copy-box] button[data-vt-copy]'); await page.waitForTimeout(250);
    const got = await page.evaluate(async () => { try { return await navigator.clipboard.readText(); } catch (e) { return 'ERREUR ' + e.message; } });
    const norm = got.split(/\n+/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    check(want.length === 3 && JSON.stringify(norm) === JSON.stringify(want), tag + ' : les trois phrases copiées, dans l’ordre', { want, got: norm });
    check(await page.evaluate(() => document.querySelector('[data-vt-copy-box] button[data-vt-copy]').classList.contains('is-done')), tag + ' : « Copié »');
    await done();
  }

  /* ---------- « Ce qui est confirmé » : le relevé du jour et les cartes ---------- */
  for (const lang of ['fr', 'en', 'de']) for (const w of [320, 390, 1280]) {
    const { page, tag, done } = await open(lang, 'verification.html', w);
    const r = await page.evaluate(() => {
      const s = document.querySelector('.vf-dos-stamp').getBoundingClientRect();
      const hit = [...document.querySelectorAll('.vf-dos-t, .vf-dos-k')].filter(t => { const b = t.getBoundingClientRect(); return Math.max(0, Math.min(b.right, s.right) - Math.max(b.left, s.left)) * Math.max(0, Math.min(b.bottom, s.bottom) - Math.max(b.top, s.top)) > 4; }).map(t => t.textContent.trim());
      const cards = [...document.querySelectorAll('#confirme .vf-card')].map(c => c.getBoundingClientRect()), rows = {};
      for (const c of cards) (rows[Math.round(c.top)] = rows[Math.round(c.top)] || []).push(Math.round(c.height));
      return { hit, uneven: Object.values(rows).filter(h => Math.max(...h) - Math.min(...h) > 1), n: cards.length };
    });
    check(!r.hit.length, tag + ' : le tampon ne couvre aucune ligne du relevé', r.hit);
    check(r.n === 12 && !r.uneven.length, tag + ' : douze cartes, même hauteur dans chaque rangée', r);
    await done();
  }

  /* ---------- Actualités : le filtre « Produits dérivés » ---------- */
  {
    const { page, tag, done } = await open('fr', 'actus.html', 1280);
    await page.click('[data-vt-filters] [data-vt-f="produit"]'); await page.waitForTimeout(200);
    const r = await page.evaluate(() => { const v = [...document.querySelectorAll('#ac-frise [data-vt-item]')].filter(x => !x.hidden); return { n: v.length, all: v.every(x => (' ' + x.getAttribute('data-vt-t') + ' ').includes(' produit ')) }; });
    check(r.n === 3 && r.all, tag + ' : trois produits dérivés, rien d’autre', r);
    await done();
  }

  /* ---------- Devine le lieu : cartes postales alignées rangée par rangée ---------- */
  for (const lang of ['fr', 'pt']) {
    const { page, tag, done } = await open(lang, 'devine-le-lieu.html', 1440);
    const r = await page.evaluate(() => {
      const rows = {};
      for (const pc of document.querySelectorAll('.dv-pc')) { const t = Math.round(pc.getBoundingClientRect().top); (rows[t] = rows[t] || []).push(pc); }
      const bad = [];
      for (const list of Object.values(rows)) for (const sel of ['.dv-pc-t', '.dv-pc-k', '.dv-pc-album', '.dv-reg-map']) {
        const tops = list.map(pc => Math.round(pc.querySelector(sel).getBoundingClientRect().top));
        if (Math.max(...tops) - Math.min(...tops) > 2) bad.push(sel + ' ' + tops.join('/'));
      }
      return { rows: Object.keys(rows).length, bad };
    });
    check(r.rows === 2 && !r.bad.length, tag + ' : deux rangées de trois, titres, captures, albums et liens alignés', r);
    await done();
  }

  /* ---------- Bande-annonce de lancement : le disque et sa pochette ---------- */
  for (const w of [390, 1280]) {
    const { page, tag, done } = await open('fr', 'videos/bande-annonce-lancement.html', w);
    await page.evaluate(() => document.querySelector('#musique').scrollIntoView()); await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const disc = document.querySelector('.ac-song-disc').getBoundingClientRect(), sl = document.querySelector('.ac-song-sleeve').getBoundingClientRect(), img = document.querySelector('.ac-song-sleeve img'); return { disc: disc.width > 60 && disc.right > sl.right + 10, img: img.complete && img.naturalWidth > 0, cite: document.querySelector('.ac-song--feature cite').getBoundingClientRect().width > 100 }; });
    check(r.disc && r.img && r.cite, tag + ' : le disque sort de la pochette, l’affiche est chargée, le titre se lit', r);
    await done();
  }

  /* ---------- toutes les pages revues, dans les autres langues : rien ne déborde ---------- */
  for (const lang of ['es', 'it', 'pt', 'en']) for (const f of ['prix.html', 'editions.html', 'actus.html', 'videos.html', 'videos/bande-annonce-lancement.html', 'verification.html', 'presse.html', 'devine-le-lieu.html']) for (const w of [320, 390, 1440]) {
    const { done } = await open(lang, f, w); await done();
  }

  await browser.close(); server.close();
  fs.writeFileSync(path.join(out, 'v7921-browser.json'), JSON.stringify({ checks, failed }, null, 1));
  console.log((failed ? failed + ' contrôle(s) en échec' : 'Tous les contrôles passent') + ' (' + checks.length + ' contrôles).');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
