#!/usr/bin/env node
'use strict';
/* v7.82 : adaptation à tous les écrans et alignement des cartes et sections, dans un vrai navigateur (Chromium headless
   via Playwright), sur toutes les pages de la racine et un échantillon de fiches, à seize largeurs (320 → 2 560 px).
   Pour chaque page et chaque largeur :
   - débordement horizontal du document ; éléments visibles qui dépassent la fenêtre à droite ou à gauche (hors conteneurs
     qui défilent ou cachent leur débordement, décor, svg, texte pour lecteurs d'écran, details fermés) ;
   - sections : tous les .shell de premier niveau partagent la même marge gauche et droite (la valeur majoritaire) ;
   - cartes : dans une grille ou une rangée flex d'au moins trois cartes de même classe, même hauteur et même largeur
     dans une rangée (sauf alignement en haut ou retour à la ligne volontaires), aucune carte hors de son conteneur ;
   - contrôles ou titres coupés par un ancêtre qui cache son débordement sans défilement ; textes à overflow caché plus
     larges que leur boîte ; textes nowrap qui sortent de la fenêtre ;
   - textes sous 10 px ; cibles tactiles sous 24 px sur téléphone (hors liens dans le texte, cases avec libellé).
   Les bento (tuiles de tailles différentes), les carrousels (pistes qui défilent) et les cartes pannables (carte du monde)
   ressortent par construction : ils sont à lire, pas à corriger.
   Usage : NODE_PATH=<dépendances>/node_modules node outils/tests/ecrans-browser.cjs <dossier hors dépôt> [largeurs…]
   (LK_CHROMIUM=<chemin> pour un Chromium déjà installé). Écrit ecrans.json et ecrans.txt. */
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || path.join(root, '../../qa/ecrans')); fs.mkdirSync(out, { recursive: true });
const W = process.argv.slice(3).map(Number).filter(Boolean); const widths = W.length ? W : [320, 360, 390, 414, 480, 600, 768, 834, 1024, 1180, 1280, 1366, 1440, 1680, 1920, 2560];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
const server = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; } if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const first = d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.html')).sort()[0];
const pages = fs.readdirSync(root).filter(f => f.endsWith('.html') && !/^google|^(accessoires|munitions|tatouages|vetements)\.html$/.test(f)).sort()
  .concat(['vehicules/pegassi-zentorno.html', 'vehicules/albany-manana.html', 'armes/carabine.html', 'armes/batte.html', 'carnets/garage.html', 'carnets/calculs.html', 'carnets/consommables.html', 'lieux/leonida-keys.html', 'personnages/boobie.html', 'animaux/alligator.html', 'demeures/' + first('demeures'), 'planques/' + first('planques'), 'entreprises/' + first('entreprises'), 'gangs/' + first('gangs'), 'online/' + first('online'), 'radios/' + first('radios'), 'trophees/' + first('trophees'), 'activites/' + first('activites'), 'en/index.html', 'de/vehicules.html', 'es/atelier-3d.html'])
  .filter(p => fs.existsSync(path.join(root, p)));

function inspect() {
  const W = document.documentElement.clientWidth;
  const sig = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '');
  const txt = el => (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
  const vis = el => { const cs = getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden'; };
  const scroller = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll' || o === 'hidden' || o === 'clip') return true; } return false; };
  const ignore = el => el.closest('svg, .sr-only, .trap, [aria-hidden="true"], [hidden], noscript') !== null || (el.closest('details:not([open])') && !el.closest('summary'));
  const out = { overflow: document.documentElement.scrollWidth - W, right: [], left: [], shells: [], rows: [], cut: [], clipped: [], small: [], tiny: [] };
  for (const el of document.querySelectorAll('main *, header *, footer *')) {
    if (!vis(el) || ignore(el)) continue; const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
    if (r.right > W + 1 && !scroller(el) && out.right.length < 6) out.right.push(sig(el) + ' → ' + Math.round(r.right - W) + 'px « ' + txt(el) + ' »');
    if (r.left < -1 && !scroller(el) && getComputedStyle(el).position !== 'fixed' && out.left.length < 4) out.left.push(sig(el) + ' ← ' + Math.round(-r.left) + 'px « ' + txt(el) + ' »');
  }
  const shells = [...document.querySelectorAll('main .shell')].filter(e => vis(e) && e.getBoundingClientRect().height > 0 && !e.closest('.shell .shell'));
  const edges = shells.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(W - r.right), sig(e)]; });
  if (edges.length) {
    const L = {}, R = {}; edges.forEach(([l, r]) => { L[l] = (L[l] || 0) + 1; R[r] = (R[r] || 0) + 1; });
    const modeL = +Object.entries(L).sort((a, b) => b[1] - a[1])[0][0], modeR = +Object.entries(R).sort((a, b) => b[1] - a[1])[0][0];
    out.shellMode = [modeL, modeR, shells.length];
    edges.forEach(([l, r, s]) => { if ((Math.abs(l - modeL) > 1 || Math.abs(r - modeR) > 1) && out.shells.length < 5) out.shells.push(s + ' ' + l + '/' + r + ' (attendu ' + modeL + '/' + modeR + ')'); });
  }
  const seen = new Set();
  for (const box of document.querySelectorAll('main *')) {
    const kids = [...box.children].filter(k => vis(k) && k.getBoundingClientRect().height > 0);
    if (kids.length < 3) continue;
    const cls = kids[0].className && typeof kids[0].className === 'string' ? kids[0].className.trim().split(/\s+/)[0] : '';
    if (!cls || !/card|item|tile|cell|col|panel|tool|row|box|fact|stat|kpi|chip/i.test(cls)) continue;
    const same = kids.filter(k => typeof k.className === 'string' && k.className.trim().split(/\s+/)[0] === cls);
    if (same.length < 3 || seen.has(box)) continue; seen.add(box);
    const cs = getComputedStyle(box); if (!/grid|flex/.test(cs.display)) continue;
    const rects = same.map(k => k.getBoundingClientRect()); const br = box.getBoundingClientRect();
    const rows = {}; rects.forEach(r => { const key = Math.round(r.top / 4) * 4; (rows[key] = rows[key] || []).push(r); });
    let bad = null;
    for (const key in rows) { const rr = rows[key]; if (rr.length < 2) continue; const hs = rr.map(r => r.height), ws = rr.map(r => r.width); const dh = Math.max(...hs) - Math.min(...hs), dw = Math.max(...ws) - Math.min(...ws); if (dh > 2 && cs.alignItems !== 'start' && cs.alignItems !== 'flex-start' && !/wrap/.test(cs.flexWrap + '')) { bad = 'hauteurs ' + Math.round(Math.min(...hs)) + '–' + Math.round(Math.max(...hs)) + ' dans une rangée'; break; } if (dw > 2 && cs.display === 'grid') { bad = 'largeurs ' + Math.round(Math.min(...ws)) + '–' + Math.round(Math.max(...ws)); break; } }
    const ox = cs.overflowX; const over = (ox === 'auto' || ox === 'scroll' || ox === 'hidden' || ox === 'clip') ? 0 : rects.filter(r => r.right > br.right + 1 || r.left < br.left - 1).length;
    if (over) bad = (bad ? bad + ' ; ' : '') + over + ' carte(s) hors du conteneur';
    if (bad && out.rows.length < 5) out.rows.push(sig(box) + ' (' + same.length + ' × .' + cls + ') : ' + bad);
  }
  for (const el of document.querySelectorAll('main button, main a, main input, main select, main summary, main h1, main h2, main h3')) {
    if (!vis(el) || ignore(el)) continue; const r = el.getBoundingClientRect(); if (r.width === 0) continue;
    for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll') break; if (o === 'hidden' || o === 'clip') { const pr = e.getBoundingClientRect(); if ((r.right > pr.right + 2 || r.left < pr.left - 2) && out.cut.length < 4) out.cut.push(sig(el) + ' « ' + txt(el) + ' » dépasse ' + sig(e) + ' de ' + Math.round(Math.max(r.right - pr.right, pr.left - r.left)) + 'px'); break; } }
  }
  for (const el of document.querySelectorAll('main h1, main h2, main h3, main h4, main p, main li, main a, main button, main span, main td, main th, main dt, main dd, main b, main strong, main small, main summary')) {
    if (!vis(el) || el.children.length > 2 || ignore(el)) continue; const cs = getComputedStyle(el);
    if (cs.overflow === 'hidden' || cs.overflowX === 'hidden') { if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none') continue; if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 1 && txt(el) && out.clipped.length < 5) out.clipped.push(sig(el) + ' « ' + txt(el) + ' » ' + el.scrollWidth + '>' + el.clientWidth); }
    else if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 20 && cs.whiteSpace === 'nowrap' && !scroller(el) && el.getBoundingClientRect().right > W + 1 && out.clipped.length < 5) out.clipped.push(sig(el) + ' nowrap « ' + txt(el) + ' »');
  }
  for (const el of document.querySelectorAll('main *')) { if (!el.childNodes.length) continue; const t = [...el.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim()); if (!t || !vis(el)) continue; const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 10 && !ignore(el) && el.getBoundingClientRect().height > 0 && out.small.length < 4) out.small.push(sig(el) + ' ' + fs.toFixed(1) + 'px « ' + txt(el) + ' »'); }
  if (W < 700) for (const el of document.querySelectorAll('main a, main button, main input, main select, main summary')) {
    if (!vis(el) || ignore(el)) continue; const cs = getComputedStyle(el);
    if (el.tagName === 'A' && (cs.display === 'inline' || el.closest('p, li, dd, td, figcaption, small'))) continue;
    if (el.tagName === 'INPUT' && /radio|checkbox/.test(el.type) && (el.closest('label') || document.querySelector('label[for="' + el.id + '"]'))) continue;
    const r = el.getBoundingClientRect(); if (r.width > 0 && r.height > 0 && (r.width < 24 || r.height < 24) && out.tiny.length < 4) out.tiny.push(sig(el) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' « ' + txt(el) + ' »');
  }
  return out;
}

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const res = [], lines = []; const t0 = Date.now();
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 760 : 900 }, isMobile: w < 700, hasTouch: w < 700, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    for (const pg of pages) {
      const p = await ctx.newPage(); p.setDefaultTimeout(30000);
      let r;
      try { await p.goto(base + '/' + pg, { waitUntil: 'load' }); await p.waitForTimeout(w < 700 ? 500 : 400); r = await p.evaluate(inspect); } catch (e) { r = { err: e.message.slice(0, 100) }; }
      r.w = w; r.pg = pg; res.push(r);
      const flags = [];
      if (r.overflow > 0) flags.push('DÉBORD ' + r.overflow);
      if (r.right && r.right.length) flags.push('DROITE ' + r.right[0]);
      if (r.left && r.left.length) flags.push('GAUCHE ' + r.left[0]);
      if (r.shells && r.shells.length) flags.push('SECTIONS ' + r.shells[0]);
      if (r.rows && r.rows.length) flags.push('CARTES ' + r.rows[0]);
      if (r.cut && r.cut.length) flags.push('CACHÉ ' + r.cut[0]);
      if (r.clipped && r.clipped.length) flags.push('COUPÉ ' + r.clipped[0]);
      if (r.small && r.small.length) flags.push('PETIT ' + r.small[0]);
      if (r.tiny && r.tiny.length) flags.push('CIBLE ' + r.tiny[0]);
      if (r.err) flags.push('ERR ' + r.err);
      if (flags.length) { const line = String(w).padStart(4) + ' ' + pg.padEnd(32) + ' ' + flags.join(' | '); lines.push(line); console.log(line); }
      await p.close();
    }
    await ctx.close();
  }
  await browser.close(); server.close();
  const tot = {}; for (const k of ['overflow', 'right', 'left', 'shells', 'rows', 'cut', 'clipped', 'small', 'tiny']) tot[k] = res.filter(r => k === 'overflow' ? r.overflow > 0 : (r[k] && r[k].length)).length;
  const head = 'Écrans et alignements — ' + new Date().toISOString() + ' — ' + pages.length + ' pages × ' + widths.length + ' largeurs (' + widths.join(', ') + ') = ' + res.length + ' chargements, ' + Math.round((Date.now() - t0) / 1000) + ' s\nChargements concernés : ' + JSON.stringify(tot);
  fs.writeFileSync(path.join(out, 'ecrans.json'), JSON.stringify(res, null, 1));
  fs.writeFileSync(path.join(out, 'ecrans.txt'), head + '\n' + lines.join('\n') + '\n');
  console.log(head);
})();
