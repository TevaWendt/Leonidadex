#!/usr/bin/env node
'use strict';
/* lot 1 bis (corrections de l’audit du 12/10/2026) — contrôle Chromium (Playwright) à lancer à chaque livraison, pour que les
   défauts relevés par l’audit ne reviennent pas. Pages clés (accueil, calculateur, carte, véhicules, une fiche véhicule,
   armurerie, missions, codes, trophées, radios, achats, progression, Atelier 3D, À propos, Mentions, Contact, personnages,
   style, Tuto, GTA Online) dans chaque langue publiée (outils/langues.json), sur téléphone (390 px) et sur PC (1 440 px).
   Échoue si :
   - la page déborde à l’horizontale, même quand body cache le débordement : bord droit des éléments visibles, hors
     conteneurs qui défilent ou rognent leur contenu en deçà de l’écran (body et html ne comptent pas) ;
   - un libellé recouvre un autre texte (dt / dd, th / td d’une rangée, intitulé et valeur des compteurs, des cases du
     calculateur, des bandeaux de compte à rebours) ;
   - un nombre ou un montant est coupé sur plusieurs lignes (« 800 / 000 / $ ») ;
   - une phrase française apparaît dans une page d’une autre langue (allemand : ni français ni anglais) ;
   - la console affiche une erreur, ou une ressource du site est en échec ;
   - avec une horloge simulée (le 14 octobre, le 2 novembre, le 11 novembre à 23:59:50, le 12 à 00:00:05, le 18 novembre à 23:59:50,
     le 19 à 00:00:05, le 1er décembre ; heure de Paris et de
     Montréal), les comptes à rebours de l’accueil et des fiches n’affichent pas l’état attendu dans chaque langue ;
   - un compteur affiché ne correspond pas aux données (véhicules, armes, carte, régions, accueil), ou diffère d’une langue
     à l’autre ; les compteurs des collectibles restent à « 0 » au lieu de la phrase d’attente.
   Usage : NODE_PATH=<dépendances>/node_modules [LK_CHROMIUM=<chemin>] [SITE_ROOT=<racine>] [LK_LANGUE=de] [LK_PAGES=a.html,b.html]
           node outils/tests/audit-langues-browser.cjs <dossier de sortie>
   Écrit <sortie>/audit-langues.txt et audit-langues.json. Code de sortie 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http'), vm = require('vm');
const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || path.join(root, '../../qa/audit-langues'));
fs.mkdirSync(out, { recursive: true });
const { frenchHits: frOnly, foreignHits } = require('./langues-helper.cjs');
const frenchHits = (text, code) => code === 'de' ? foreignHits(text, code) : frOnly(text, code);
const L = require(path.join(root, 'outils/langues.cjs')), CFG = L.config(root);
const LANGS = [{ code: 'fr', dossier: '', locale: 'fr-FR' }, ...CFG.langues.filter(l => l.etat === 'publiee' && l.code !== CFG.source)].filter(l => !process.env.LK_LANGUE || l.code === process.env.LK_LANGUE);
const PAGES = (process.env.LK_PAGES ? process.env.LK_PAGES.split(',') : ['index.html', 'calculateurs.html', 'carte.html', 'vehicules.html', 'vehicules/grotti-cheetah-classic.html', 'armes.html', 'missions.html', 'codes-de-triche.html', 'trophees.html', 'radios.html', 'achats.html', 'progression.html', 'atelier-3d.html', 'a-propos.html', 'mentions-legales.html', 'contact.html', 'personnages.html', 'style.html', 'tuto.html', 'online.html', 'collectibles.html', 'presse.html' /* v7.88 */, 'compagnon.html' /* v7.89 */, 'devine-le-lieu.html' /* v7.90 */, 'verification.html', 'actus.html', 'videos.html', 'editions.html' /* v7.87.1 */]);
const WIDTHS = [390, 1440];
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.avif': 'image/avif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const server = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; } if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404).end(); return; } res.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const lines = [], report = []; let passed = 0, failed = 0;
function check(ok, label, detail = '') { ok ? passed++ : failed++; const t = (ok ? 'PASS ' : 'FAIL ') + label + (detail && !ok ? ' — ' + String(detail).slice(0, 1200) : ''); lines.push(t); if (!ok) console.log(t); }

/* ---------- chiffres attendus, calculés depuis les données (comme outils/sync-site.cjs) ---------- */
const data = { window: {} };
for (const f of ['vehicules-data.js', 'armes-data.js', 'carte-gtadb.js']) vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), data);
const V = data.window.LK_VEHICULES, A = data.window.LK_ARMES, G = data.window.LK_GTADB;
const carteJs = fs.readFileSync(path.join(root, 'carte.js'), 'utf8');
const POINTS = vm.runInNewContext('(' + carteJs.match(/const POINTS = (\[[\s\S]*?\n  \]);/)[1] + ')'), CATS = vm.runInNewContext('(' + carteJs.match(/const CATS = (\{[\s\S]*?\n  \});/)[1] + ')');
const allPoints = [...POINTS, ...G.groupes, ...G.lieux];
const regions = JSON.parse(fs.readFileSync(path.join(root, 'outils/editorial.json'), 'utf8')).regions.length;
const ast = A.reduce((m, a) => (m[a.st] = (m[a.st] || 0) + 1, m), {});
const EXPECT = {
  'vehicules.html': [V.length, new Set(V.map(v => v.cat)).size, new Set(V.map(v => v.marque).filter(x => x && x !== 'Marque inconnue')).size, V.filter(v => v.insp).length],
  'carte.html': [allPoints.length, allPoints.filter(p => p.s === 'officiel').length, regions, Object.keys(CATS).length],
  'armes.html': [A.length, new Set(A.map(a => a.cat)).size, ast.officiel, 2],
  'index.html': [regions, 2, V.length]
};
const COUNTER_SEL = { 'vehicules.html': '.vstat .n[data-count]', 'carte.html': '.vstat .n[data-count]', 'armes.html': '.vstat .n[data-count]', 'index.html': '.fact .big[data-count]' };

/* ---------- mesures dans la page ---------- */
const MEASURE = `(() => {
  const W = document.documentElement.clientWidth, out = { overflow: document.documentElement.scrollWidth - W, right: [], overlap: [], numbers: [] };
  const sig = el => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  const txt = el => (el.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 40);
  const shown = el => { for (let e = el; e && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden || +cs.opacity === 0) return false; } return true; };
  const ignored = el => !!el.closest('svg, .sr-only, [aria-hidden="true"], [hidden], noscript, template, details:not([open]) > :not(summary), .marquee, .strip, [data-lk-langbar] ul');
  /* un ancêtre (sous body) qui défile ou qui rogne son contenu en deçà du bord de l’écran : l’élément ne sort pas de l’écran */
  const contained = el => { for (let e = el.parentElement; e && e !== document.body && e !== document.documentElement; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll)/.test(cs.overflowX)) return true; if (/(hidden|clip)/.test(cs.overflowX) && e.getBoundingClientRect().right <= W + 1) return true; if (cs.position === 'fixed' && e.getBoundingClientRect().right <= W + 1 && /(hidden|clip)/.test(cs.overflowX)) return true; } return false; };
  for (const el of document.querySelectorAll('body *')) {
    if (out.right.length >= 6) break;
    const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1 || r.right <= W + 1) continue;
    if (ignored(el) || !shown(el) || contained(el)) continue;
    const cs = getComputedStyle(el); if (cs.position === 'fixed' && (r.left >= W || r.right <= 0)) continue;
    out.right.push(sig(el) + ' → +' + Math.round(r.right - W) + ' px « ' + txt(el) + ' »');
  }
  /* recouvrements : libellé et valeur */
  const textRects = el => { const rg = document.createRange(); rg.selectNodeContents(el); return [...rg.getClientRects()].filter(r => r.width > 0.5 && r.height > 0.5); };
  const inter = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const pairs = [];
  document.querySelectorAll('dt').forEach(dt => { const dd = dt.nextElementSibling; if (dd && dd.tagName === 'DD') pairs.push([dt, dd]); });
  document.querySelectorAll('tr').forEach(tr => { const c = [...tr.children]; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) pairs.push([c[i], c[j]]); });
  document.querySelectorAll('.calc-stat, .vstat, .fact, .col-dash-t, .fcount-in, .doc-row, .cell, .lk-act--3 tr, .cat-dlg-fact, .clock-box').forEach(box => { const c = [...box.children]; for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) pairs.push([c[i], c[j]]); });
  const seen = new Set();
  for (const [a, b] of pairs) {
    if (out.overlap.length >= 6) break;
    if (a.contains(b) || b.contains(a) || ignored(a) || ignored(b) || !shown(a) || !shown(b)) continue;
    const k = sig(a) + '|' + sig(b) + '|' + txt(a); if (seen.has(k)) continue; seen.add(k);
    const ra = textRects(a), rb = textRects(b); let area = 0;
    for (const x of ra) for (const y of rb) area += inter(x, y);
    if (area > 4) out.overlap.push('« ' + txt(a) + ' » sur « ' + txt(b) + ' » (' + Math.round(area) + ' px²)');
  }
  /* nombres et montants coupés sur deux lignes */
  const NUM = /(?:[$€][\\s\\u00a0\\u202f]?)?\\d{1,3}(?:[\\s\\u00a0\\u202f.,]\\d{3})+(?:[.,]\\d+)?(?:[\\s\\u00a0\\u202f]?(?:Mio\\.|Mrd\\.|Tsd\\.|M|k))?(?:[\\s\\u00a0\\u202f]?[$€])?|[$€][\\s\\u00a0\\u202f]?\\d+(?:[.,]\\d+)?(?:[\\s\\u00a0\\u202f]?(?:Mio\\.|M|k|mil|mi))?|\\d+(?:[.,]\\d+)?[\\s\\u00a0\\u202f]?(?:Mio\\.|Mrd\\.|Tsd\\.|M|k)?[\\s\\u00a0\\u202f]?[$€]/g;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n;
  while ((n = walker.nextNode()) && out.numbers.length < 6) {
    const t = n.nodeValue; if (!/\\d/.test(t) || !n.parentElement || ignored(n.parentElement) || !shown(n.parentElement)) continue;
    NUM.lastIndex = 0; let m;
    while ((m = NUM.exec(t))) {
      if (m[0].replace(/[^\\d]/g, '').length < 4 && !/[$€]/.test(m[0])) continue;
      const rg = document.createRange(); rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].length);
      const tops = [...rg.getClientRects()].filter(r => r.width > 0.5).map(r => Math.round(r.top));
      const linesN = tops.filter((v, i) => tops.findIndex(w => Math.abs(w - v) <= 3) === i).length;
      if (linesN > 1) { out.numbers.push('« ' + m[0].replace(/\\s/g, ' ') + ' » sur ' + linesN + ' lignes (' + sig(n.parentElement) + ')'); break; }
    }
  }
  return out;
})()`;
const VISIBLE = `(()=>{const out=[];
  const shown=el=>{for(let e=el;e&&e!==document.documentElement;e=e.parentElement){const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||e.hidden)return false;}return true;};
  const skip=el=>el.closest('[data-lk-langbar],[lang="fr"],[hreflang="fr"],[translate="no"],script,style,svg,.lk-lang-offer,noscript');
  const seenW=new Set();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const t=n.nodeValue.trim();if(!t)continue;const el=n.parentElement;if(!el||skip(el)||!shown(el))continue;const wd=el.closest('[data-lk-words]');if(wd){if(!seenW.has(wd)){seenW.add(wd);out.push(wd.textContent.replace(/\\s+/g,' ').trim());}continue;}out.push(t);}
  for(const el of document.body.querySelectorAll('[aria-label],[title],[placeholder]')){if(skip(el)||!shown(el))continue;for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a);if(v)out.push(v);}}
  return out;})()`;

(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox', '--disable-background-networking', '--disable-features=Translate'] });
  const counters = {};
  try {
    /* 1. pages clés : débordement, recouvrements, nombres coupés, français resté, erreurs, compteurs */
    for (const LG of LANGS) for (const W of WIDTHS) {
      const queue = PAGES.slice(), bad = { right: [], overlap: [], numbers: [], french: [], errors: [], counters: [], boutons: [] };
      async function worker() {
        const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, locale: LG.locale, reducedMotion: 'reduce', serviceWorkers: 'block', timezoneId: 'Europe/Paris' });
        await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
        while (queue.length) {
          const p = queue.shift(), url = '/' + (LG.dossier ? LG.dossier + '/' : '') + p, page = await ctx.newPage(), errs = [];
          page.on('pageerror', e => errs.push(e.message));
          page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
          page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) errs.push(r.status() + ' ' + r.url().slice(base.length)); });
          try {
            await page.goto(base + url, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(500);
            const m = await page.evaluate(MEASURE);
            /* calculateur : la réponse affichée, avec les animations (les montants animés sont dans un <span class="c-final"> :
               c'est là qu'ils se coupaient, « 800 / 000 / $ », invisible avec « réduire les animations ») ; le plus grand montant
               proposé, puis le business plan */
            if (p === 'calculateurs.html') {
              const mctx = await browser.newContext({ viewport: { width: W, height: 900 }, locale: LG.locale, serviceWorkers: 'block' });
              await mctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
              const mp = await mctx.newPage(); mp.on('pageerror', e => errs.push(e.message));
              await mp.goto(base + url, { waitUntil: 'load', timeout: 60000 }); await mp.waitForTimeout(500);
              /* boutons d’une étape (« Voir les réglages avancés », « Aller à mon business plan ») : empilés sur téléphone, chacun à sa
                 hauteur naturelle (la base flex de 170 px devenait leur hauteur en colonne) ; jamais plus de trois lignes */
              const tall = await mp.evaluate(() => [...document.querySelectorAll('.b-stage-actions > *')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(), lh = parseFloat(getComputedStyle(b).lineHeight) || 20, pad = parseFloat(getComputedStyle(b).paddingTop) + parseFloat(getComputedStyle(b).paddingBottom); return r.height > 3 * lh + pad + 8 ? (b.textContent || '').trim().slice(0, 40) + ' ' + Math.round(r.height) + ' px' : null; }).filter(Boolean));
              for (const x of tall) bad.boutons.push(p + ' : ' + x);
              for (const which of ['first', 'last']) {
                await mp.evaluate(w => { const c = [...document.querySelectorAll('#panel-goal .calc-presets .calc-chip')]; const ch = w === 'last' ? c[c.length - 1] : c[0]; if (ch) ch.click(); const b = [...document.querySelectorAll('#panel-goal button')].find(x => /↓/.test(x.textContent) && x.offsetParent); if (b) b.click(); }, which);
                await mp.waitForTimeout(2200);
                const mm = await mp.evaluate(MEASURE); m.numbers.push(...mm.numbers.map(x => 'réponse (' + which + ') ' + x)); m.overlap.push(...mm.overlap); m.right.push(...mm.right);
              }
              await mp.evaluate(() => { const t = document.querySelector('[data-tab="plan"]'); if (t) t.click(); }); await mp.waitForTimeout(2200);
              const mm = await mp.evaluate(MEASURE); m.numbers.push(...mm.numbers.map(x => 'plan ' + x)); m.overlap.push(...mm.overlap); m.right.push(...mm.right);
              await mctx.close();
            }
            if (m.overflow > 1) bad.right.push(p + ' : document +' + m.overflow + ' px');
            for (const x of m.right) bad.right.push(p + ' : ' + x);
            for (const x of m.overlap) bad.overlap.push(p + ' : ' + x);
            for (const x of m.numbers) bad.numbers.push(p + ' : ' + x);
            if (LG.code !== 'fr' && W === 1440) for (const t of new Set(await page.evaluate(VISIBLE))) { const h = frenchHits(t, LG.code); if (h.length) bad.french.push(p + ' « ' + t.replace(/\s+/g, ' ').slice(0, 100) + ' » [' + h.slice(0, 3).join(', ') + ']'); }
            if (COUNTER_SEL[p] && W === 1440) {
              const vals = await page.$$eval(COUNTER_SEL[p], els => els.map(e => Number(e.textContent.replace(/[^\d]/g, ''))));
              (counters[p] = counters[p] || {})[LG.code] = vals;
              if (JSON.stringify(vals) !== JSON.stringify(EXPECT[p])) bad.counters.push(p + ' : ' + JSON.stringify(vals) + ' au lieu de ' + JSON.stringify(EXPECT[p]));
            }
            if (p === 'collectibles.html' || p === 'index.html') { /* rien de plus ici : voir 3. */ }
          } catch (e) { errs.push('ouverture : ' + e.message.split('\n')[0]); }
          if (errs.length) bad.errors.push(p + ' : ' + [...new Set(errs)].slice(0, 3).join(' | '));
          await page.close();
        }
        await ctx.close();
      }
      await Promise.all(Array.from({ length: Number(process.env.LK_PARALLELE || 3) }, worker));
      const tag = LG.code + ' ' + W + ' px (' + PAGES.length + ' pages)';
      check(!bad.right.length, tag + ' : aucun débordement horizontal (bord droit des éléments visibles)', bad.right.slice(0, 8).join(' ; '));
      check(!bad.overlap.length, tag + ' : aucun libellé sur un autre texte', bad.overlap.slice(0, 8).join(' ; '));
      check(!bad.numbers.length, tag + ' : aucun nombre coupé sur deux lignes', bad.numbers.slice(0, 8).join(' ; '));
      if (LG.code !== 'fr' && W === 1440) check(!bad.french.length, tag + ' : aucune phrase française visible', bad.french.slice(0, 10).join(' ; '));
      check(!bad.errors.length, tag + ' : aucune erreur de console ni ressource en échec', bad.errors.slice(0, 6).join(' ; '));
      check(!bad.boutons.length, tag + ' : boutons d’étape du calculateur à leur hauteur (aucun bouton étiré)', bad.boutons.slice(0, 6).join(' ; '));
      if (W === 1440) check(!bad.counters.length, tag + ' : compteurs conformes aux données', bad.counters.join(' ; '));
      report.push({ langue: LG.code, largeur: W, ...bad });
    }
    /* 2. compteurs identiques d’une langue à l’autre */
    for (const [p, byLang] of Object.entries(counters)) {
      const ref = JSON.stringify(byLang.fr), diff = Object.entries(byLang).filter(([, v]) => JSON.stringify(v) !== ref).map(([c, v]) => c + ' ' + JSON.stringify(v));
      check(!diff.length, p + ' : mêmes compteurs dans toutes les langues (' + Object.keys(byLang).join(', ') + ')', 'français ' + ref + ' ; ' + diff.join(' ; '));
    }
    /* 3. collectibles : la phrase d’attente à la place des trois « 0 » tant que le catalogue est vide */
    const colItems = (() => { const d = { window: {} }; try { vm.runInNewContext(fs.readFileSync(path.join(root, 'collectibles-data.js'), 'utf8'), d); return (d.window.LK_COLLECTIBLES && d.window.LK_COLLECTIBLES.items || []).length; } catch { return null; } })();
    for (const LG of LANGS) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: LG.locale, reducedMotion: 'reduce' }), page = await ctx.newPage();
      await page.goto(base + '/' + (LG.dossier ? LG.dossier + '/' : '') + 'collectibles.html', { waitUntil: 'load' }); await page.waitForTimeout(400);
      const st = await page.evaluate(() => { const d = document.querySelector('.col-dash'); const vis = e => !!e && e.getClientRects().length > 0; return { vide: d && d.hasAttribute('data-vide'), phrase: vis(document.querySelector('.col-dash-t--vide')) ? document.querySelector('.col-dash-t--vide .col-dash-phrase').textContent.trim() : '', zeros: [...document.querySelectorAll('.col-dash-t .n')].filter(vis).map(e => e.textContent.trim()) }; });
      const ok = colItems === 0 ? st.vide && st.phrase && !st.zeros.includes('0') && (LG.code === 'fr' || !frenchHits(st.phrase, LG.code).length) : !st.vide;
      check(!!ok, LG.code + ' : collectibles, ' + (colItems === 0 ? 'phrase d’attente à la place des compteurs à « 0 »' : 'compteurs du catalogue'), JSON.stringify(st));
      await ctx.close();
    }
    /* 4. comptes à rebours, horloge simulée */
    /* assemblage v7.91 (complément de l’audit) : aussi le 14 octobre (heure d’été : une heure de plus jusqu’à la sortie), la veille
       et le jour du préchargement (jalon « j-avant » → « j-pre » à minuit) */
    const CASES = [
      { nom: 'avant (14 octobre, 12:00)', t: '2026-10-14T12:00:00', etat: 'avant', attendu: ['35', '13', '00', '00'] },
      { nom: 'avant (2 novembre, 12:00)', t: '2026-11-02T12:00:00', etat: 'avant', attendu: ['16', '12', '00', '00'] },
      { nom: '11 novembre, 23:59:50', t: '2026-11-11T23:59:50', etat: 'avant', attendu: ['7', '00', '00', '10'] },
      { nom: '12 novembre, 00:00:05', t: '2026-11-12T00:00:05', etat: 'pre', attendu: ['6', '23', '59', '55'] },
      { nom: '18 novembre, 23:59:50', t: '2026-11-18T23:59:50', etat: 'pre', attendu: ['0', '00', '00', '10'] },
      { nom: '19 novembre, 00:00:05', t: '2026-11-19T00:00:05', etat: 'sorti' },
      { nom: '1er décembre', t: '2026-12-01T12:00:00', etat: 'sorti', recharger: true }
    ];
    const ZONES = [['Europe/Paris', '+01:00', '+02:00'], ['America/Toronto', '-05:00', '-04:00']];
    /* heure d’été jusqu’au 25 octobre à Paris, jusqu’au 1er novembre à Montréal ; tous les cas tombent en heure d’hiver */
    const zonedTo = (t, z) => t + (z[0] === 'America/Toronto' ? (t < '2026-11-01' ? z[2] : z[1]) : (t < '2026-10-25' ? z[2] : z[1]));
    for (const LG of LANGS) for (const z of (LG.code === 'fr' || LG.code === 'en' ? ZONES : ZONES.slice(0, 1))) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, locale: LG.locale, timezoneId: z[0], reducedMotion: 'reduce' });
      const pre = (LG.dossier ? '/' + LG.dossier : '');
      /* accueil : chargé avant la sortie, puis l’horloge avance (passage en direct à minuit), puis rechargé le 1er décembre */
      const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
      await page.clock.setFixedTime(new Date(zonedTo(CASES[0].t, z)));
      await page.goto(base + pre + '/index.html', { waitUntil: 'load' });
      for (const C of CASES) {
        if (C !== CASES[0]) { await page.clock.setFixedTime(new Date(zonedTo(C.t, z))); if (C.recharger) await page.reload({ waitUntil: 'load' }); }
        await page.waitForTimeout(1300);
        const st = await page.evaluate(() => { const vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none'; }; const j = [...document.querySelectorAll('#jalons [data-jalon]')].find(s => !s.hidden); return { clock: vis('clock'), tz: vis('clock-tz'), tzTxt: (document.getElementById('clock-tz') || {}).textContent || '', sorti: vis('clock-sorti'), sortiTxt: (document.getElementById('clock-sorti') || {}).textContent || '', liens: [...document.querySelectorAll('#clock-sorti a')].map(a => a.getAttribute('href')), vals: ['rd', 'rh', 'rm', 'rs'].map(id => (document.getElementById(id) || {}).textContent || ''), jalon: j ? j.dataset.jalon : '', jalonTxt: j ? j.textContent : '' }; });
        let ok, why = JSON.stringify(st);
        if (C.etat === 'sorti') ok = !st.clock && !st.tz && st.sorti && st.jalon === 'j-sorti' && st.liens.length === 2 && /achats\.html$/.test(st.liens[0]) && /calculateurs\.html$/.test(st.liens[1]);
        else ok = st.clock && st.tz && !st.sorti && JSON.stringify(st.vals) === JSON.stringify(C.attendu) && st.jalon === (C.etat === 'pre' ? 'j-pre' : 'j-avant');
        if (ok && LG.code !== 'fr') { const t = [st.tz ? st.tzTxt : '', st.sorti ? st.sortiTxt : '', st.jalonTxt].join(' '); const h = frenchHits(t, LG.code); if (h.length) { ok = false; why = 'français : ' + h.join(', ') + ' — ' + t; } }
        check(ok, LG.code + ' ' + z[0] + ' : accueil, ' + C.nom, why);
      }
      check(!errs.length, LG.code + ' ' + z[0] + ' : accueil sans erreur pendant le passage à la sortie', errs.join(' | '));
      await page.close();
      /* fiche véhicule : compteur avant, « Données en cours de mise à jour » après */
      for (const C of [CASES.find(c => c.nom.startsWith('18 novembre')), CASES.find(c => c.nom.startsWith('19 novembre'))]) {
        const fp = await ctx.newPage(); await fp.clock.setFixedTime(new Date(zonedTo(C.t, z)));
        await fp.goto(base + pre + '/vehicules/grotti-cheetah-classic.html', { waitUntil: 'load' }); await fp.waitForTimeout(1200);
        const st = await fp.evaluate(() => ({ vals: ['fd', 'fh', 'fm', 'fs'].map(id => (document.getElementById(id) || {}).textContent || null), box: (document.getElementById('fcd') || {}).textContent || '', tz: (document.querySelector('.fcount-tz') || {}).textContent || null }));
        let ok = C.etat === 'sorti' ? st.tz === null && st.vals.every(v => v === null) && st.box.trim().length > 3 : JSON.stringify(st.vals) === JSON.stringify(C.attendu) && !!st.tz;
        let why = JSON.stringify(st);
        if (ok && LG.code !== 'fr') { const t = (st.tz || '') + ' ' + st.box; const h = frenchHits(t, LG.code); if (h.length) { ok = false; why = 'français : ' + h.join(', ') + ' — ' + t; } }
        check(ok, LG.code + ' ' + z[0] + ' : fiche véhicule, ' + C.nom, why);
        await fp.close();
      }
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  lines.push('', passed + ' contrôle(s) réussi(s), ' + failed + ' échec(s).');
  fs.writeFileSync(path.join(out, 'audit-langues.txt'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(out, 'audit-langues.json'), JSON.stringify({ passed, failed, report }, null, 1));
  console.log(passed + ' contrôle(s) réussi(s), ' + failed + ' échec(s).');
  process.exit(failed ? 1 : 0);
})();
