'use strict';
/* v7.90 (lot 6) : contrôle navigateur du jeu « Devine le lieu » (Chromium headless via Playwright, site servi en local).
   Pour chaque langue (français, allemand) et chaque largeur (390 et 1 280 px) :
   - une partie du jour complète : deux réponses au clavier (focus sur une région, Entrée ; le focus passe à « Image
     suivante », Entrée ; il revient aux régions), trois à la souris (repère de la carte, bouton) ; chaque étape annoncée
     (aria-live) ; le verdict ne dépend pas de la couleur (✓ / ✗ et texte) ;
   - le résultat : score, cinq images, série, meilleur score, texte de partage (adresse de la page de la langue), bouton
     « Copier » (presse-papiers de Chromium), compte à rebours ;
   - la partie libre, puis le rechargement (le résultat du jour revient, la sauvegarde ne change pas) ;
   - à chaque étape : aucun défilement horizontal, aucune erreur JavaScript, aucune requête vers un autre site, aucune
     requête en échec, aucun cookie ; une seule clé de stockage (lk_devine_v1), écrite après la première réponse ;
   - « réduire les animations » : la réponse s’affiche sans animation en cours ; sans JavaScript : message et régions.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/v790-browser.cjs <dossier de sortie hors dépôt>
   (LK_CHROMIUM=<chemin> pour un Chromium déjà installé). Écrit v790-browser.json et des captures. Code 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = process.argv[2];
if (!out) { console.error('Usage : node outils/tests/v790-browser.cjs <dossier>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.xml': 'application/xml' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const D = JSON.parse(fs.readFileSync(path.join(root, 'outils/devine/devine.json'), 'utf8'));
const REGION = Object.fromEntries(D.images.map(i => [i.id, i.region]));
const checks = []; let failed = 0;
const check = (ok, label, detail) => { checks.push({ ok: !!ok, label, detail: detail === undefined ? undefined : detail }); if (!ok) { failed++; console.log('ÉCHEC ' + label + (detail !== undefined ? ' — ' + JSON.stringify(detail).slice(0, 300) : '')); } };

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox'] });
  for (const lang of ['fr', 'de']) for (const w of [390, 1280]) {
    const tag = lang + '-' + w, url = base + '/' + (lang === 'fr' ? '' : lang + '/') + 'devine-le-lieu.html';
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, locale: lang === 'fr' ? 'fr-FR' : 'de-DE', timezoneId: 'Europe/Paris' });
    await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: base });
    const page = await ctx.newPage();
    const errors = [], outside = [], failedReq = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:')) outside.push(r.url()); });
    page.on('requestfailed', r => failedReq.push(r.url()));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const state = () => page.evaluate(() => {
      const g = document.querySelector('[data-dv]'), img = g.querySelector('[data-dv-card] .dv-fig img');
      return { id: img ? (img.getAttribute('src').match(/officiel\/(.+)-\d+\.webp/) || [])[1] : null, loaded: img ? img.complete && img.naturalWidth > 0 : false,
        live: g.querySelector('[data-dv-live]').textContent, focus: document.activeElement && (document.activeElement.getAttribute('data-dv-opt') ? 'opt' : document.activeElement.hasAttribute('data-dv-next') ? 'next' : document.activeElement.hasAttribute('data-dv-result') ? 'result' : document.activeElement.tagName),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, storage: localStorage.getItem('lk_devine_v1'), keys: Object.keys(localStorage) };
    });
    let s = await state();
    check(s.id && s.loaded, tag + ' : première image affichée et chargée', s);
    check(s.storage === null, tag + ' : rien d’écrit avant la première réponse');
    check(s.overflow <= 0, tag + ' : aucun défilement horizontal (chargé)', s.overflow);
    await page.waitForTimeout(200);
    check(/\S/.test((await state()).live), tag + ' : annonce de la première image (aria-live)');
    await page.screenshot({ path: path.join(out, tag + '-1-charge.png') });
    /* 1-2 : au clavier (réponse fausse puis juste) */
    for (let i = 0; i < 2; i++) {
      s = await state();
      const right = REGION[s.id], pick = i === 0 ? (right === 'vice-city' ? 'ambrosia' : 'vice-city') : right;
      await page.focus('[data-dv-opt="' + pick + '"]');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(350);
      const a = await page.evaluate(p => { const g = document.querySelector('[data-dv]'); return { t: g.querySelector('[data-dv-answer-t]').textContent, right: g.querySelector('.dv-opt.is-right .dv-opt-t').textContent, mark: getComputedStyle(g.querySelector('.dv-opt.is-right .dv-opt-mark'), '::before').content, wrongMark: g.querySelector('.dv-opt.is-wrong') ? getComputedStyle(g.querySelector('.dv-opt.is-wrong .dv-opt-mark'), '::before').content : null, sr: g.querySelector('.dv-opt.is-right .dv-opt-sr').textContent, disabled: g.querySelectorAll('[data-dv-opt]:disabled').length, verdict: g.querySelector('[data-dv-verdict]').textContent }; }, pick);
      check(a.disabled === 6 && /\S/.test(a.t), tag + ' : réponse ' + (i + 1) + ' au clavier, boutons figés', a);
      check(a.mark.includes('✓') && /\S/.test(a.sr) && (i === 0 ? a.wrongMark && a.wrongMark.includes('✗') : true), tag + ' : verdict sans la seule couleur (✓ / ✗ et texte)', a);
      check(/^[✓✗] /.test(a.verdict), tag + ' : verdict sur l’image', a.verdict);
      s = await state();
      check(s.focus === 'next', tag + ' : focus sur « Image suivante »', s.focus);
      check(s.live === a.t, tag + ' : la réponse est annoncée', [s.live, a.t]);
      if (i === 0) { const st = JSON.parse(s.storage || 'null'); check(st && st.v === 1 && st.jour.r.length === 1 && s.keys.join() === 'lk_devine_v1', tag + ' : une clé, écrite à la première réponse', s.keys); await page.screenshot({ path: path.join(out, tag + '-2-reponse-fausse.png') }); }
      check(s.overflow <= 0, tag + ' : aucun défilement horizontal (réponse)', s.overflow);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      s = await state();
      check(s.focus === 'opt' && s.loaded, tag + ' : Entrée → image suivante, focus sur les régions', s);
    }
    /* 3-5 : à la souris (un repère de la carte, puis les boutons) */
    for (let i = 2; i < 5; i++) {
      s = await state();
      const right = REGION[s.id];
      if (i === 2) await page.click('[data-dv-pin="' + right + '"]', { force: true }); else await page.click('[data-dv-opt="' + right + '"]');
      await page.waitForTimeout(350);
      const ok = await page.evaluate(() => document.querySelector('[data-dv-answer-t]').classList.contains('is-ok'));
      check(ok, tag + ' : réponse ' + (i + 1) + ' à la souris' + (i === 2 ? ' (carte)' : ''));
      if (i === 2) await page.screenshot({ path: path.join(out, tag + '-3-reponse-carte.png') });
      await page.click('[data-dv-next]');
      await page.waitForTimeout(500);
    }
    /* résultat */
    const r = await page.evaluate(() => { const g = document.querySelector('[data-dv]'), res = g.querySelector('[data-dv-result]'); return { hidden: res.hidden, focus: document.activeElement === res, score: res.querySelector('[data-dv-res-score]').textContent, items: res.querySelectorAll('.dv-res-i').length, imgs: [...res.querySelectorAll('.dv-res-i img')].length, serie: res.querySelector('[data-dv-serie]').textContent, best: res.querySelector('[data-dv-best]').textContent, share: res.querySelector('[data-dv-share-txt]').textContent, count: res.querySelector('[data-dv-countdown]').textContent, live: g.querySelector('[data-dv-live]').textContent, links: [...res.querySelectorAll('.dv-res-i a')].map(a => a.getAttribute('href')) }; });
    check(!r.hidden && r.focus && r.items === 5 && r.imgs === 5, tag + ' : résultat affiché, focus dessus', r);
    check(/4/.test(r.score) && /\S/.test(r.serie) && /4/.test(r.best), tag + ' : score 4 sur 5, série, meilleur score', r);
    const lines = r.share.split('\n');
    check(lines.length === 7 && lines.slice(1, 6).join() === '1 ❌,2 ✅,3 ✅,4 ✅,5 ✅' && lines[6] === 'https://www.leonidakit.com/' + (lang === 'fr' ? '' : lang + '/') + 'devine-le-lieu.html', tag + ' : texte de partage (une ligne par image, adresse de la langue)', lines);
    check(/\d/.test(r.count) && /\S/.test(r.live), tag + ' : compte à rebours et annonce de fin', r);
    check(r.links.every(h => /^lieux\/[a-z-]+\.html$/.test(h)), tag + ' : liens vers les fiches des régions', r.links);
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, tag + '-4-resultat.png') });
    await page.click('[data-dv-copy]');
    await page.waitForTimeout(250);
    const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => null);
    check(clip === r.share, tag + ' : « Copier » met le texte du résultat dans le presse-papiers', clip);
    check((await state()).overflow <= 0, tag + ' : aucun défilement horizontal (résultat)');
    const saved = (await state()).storage;
    /* partie libre */
    await page.click('[data-dv-free]');
    await page.waitForTimeout(400);
    for (let i = 0; i < 2; i++) { s = await state(); await page.click('[data-dv-opt="' + REGION[s.id] + '"]'); await page.waitForTimeout(300); await page.click('[data-dv-next]'); await page.waitForTimeout(450); }
    s = await state();
    const free = await page.evaluate(() => ({ mode: document.querySelector('[data-dv-mode]').textContent, points: document.querySelector('[data-dv-points]').textContent, back: !document.querySelector('[data-dv-back]').hidden }));
    check(/2/.test(free.points) && free.back && s.storage === saved, tag + ' : partie libre (sans limite, sauvegarde inchangée)', free);
    await page.screenshot({ path: path.join(out, tag + '-5-libre.png') });
    /* rechargement : le résultat du jour revient */
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const back = await page.evaluate(() => ({ res: !document.querySelector('[data-dv-result]').hidden, board: document.querySelector('[data-dv-board]').hidden }));
    check(back.res && back.board, tag + ' : rechargement → résultat du jour', back);
    check(errors.length === 0, tag + ' : aucune erreur JavaScript', errors);
    check(outside.length === 0, tag + ' : aucune requête vers un autre site', outside);
    check(failedReq.length === 0, tag + ' : aucune requête en échec', failedReq);
    check((await ctx.cookies()).length === 0, tag + ' : aucun cookie');
    await ctx.close();
  }
  /* « réduire les animations » : la réponse est posée, sans animation en cours */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce', timezoneId: 'Europe/Paris' });
    const page = await ctx.newPage(); await page.goto(base + '/devine-le-lieu.html', { waitUntil: 'networkidle' });
    const id = await page.evaluate(() => (document.querySelector('[data-dv-card] .dv-fig img').getAttribute('src').match(/officiel\/(.+)-\d+\.webp/) || [])[1]);
    await page.click('[data-dv-opt="' + REGION[id] + '"]');
    const anims = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').map(a => (a.effect && a.effect.target && a.effect.target.className) || '?'));
    check(anims.length === 0, 'réduire les animations : rien ne bouge après une réponse', anims);
    await page.click('[data-dv-next]');
    const anims2 = await page.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length);
    const swapped = await page.evaluate(() => !!document.querySelector('[data-dv-card] .dv-fig img'));
    check(anims2 === 0 && swapped, 'réduire les animations : l’image suivante est posée sur place', { anims2, swapped });
    await page.screenshot({ path: path.join(out, 'reduit-1280.png') });
    await ctx.close();
  }
  /* sans JavaScript : la page reste utile */
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
    const page = await ctx.newPage(); await page.goto(base + '/devine-le-lieu.html', { waitUntil: 'load' });
    const nojs = await page.evaluate(() => ({ msg: !!document.querySelector('[data-dv-nojs]').offsetHeight, board: !document.querySelector('[data-dv-board]').offsetHeight, regions: [...document.querySelectorAll('#regions a[data-dv-fiche]')].filter(a => a.offsetHeight).length, rules: document.querySelectorAll('#regles .vt-step').length }));
    check(nojs.msg && nojs.board && nojs.regions === 6 && nojs.rules === 4, 'sans JavaScript : message, six régions avec leur fiche, règles', nojs);
    await page.screenshot({ path: path.join(out, 'sans-script-390.png'), fullPage: true });
    await ctx.close();
  }
  await browser.close(); server.close();
  fs.writeFileSync(path.join(out, 'v790-browser.json'), JSON.stringify({ date: new Date().toISOString(), checks }, null, 1));
  console.log('Devine le lieu dans le navigateur : ' + (checks.length - failed) + '/' + checks.length + ' contrôles');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
