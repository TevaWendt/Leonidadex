#!/usr/bin/env node
'use strict';
/* v7.61 (espagnol, tout le site) — parcours Chromium (Playwright) de TOUTES les pages de chaque langue publiée.
   Pour chaque page /<dossier>/… : à 1 280 px, langue de la page, barre « Changer la langue » dans la langue, aucun mot
   français visible (texte, aria-label, title, placeholder, contenu CSS), aucune erreur JavaScript, aucune requête du site
   en échec (feuille, script, image, données) ; à 390 px, aucun défilement horizontal (une page qui déborde est comparée à
   la page française : seul un débordement propre à la traduction compte).
   Usage : NODE_PATH=<dépendances>/node_modules [LK_CHROMIUM=<chemin>] [SITE_ROOT=<racine>] [LK_LANGUE=es] [LK_PAGES=a.html,b.html]
           node outils/tests/langues-pages-browser.cjs <dossier de sortie>
   Écrit <sortie>/langues-pages-browser.txt. Code de sortie 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http'); const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || path.join(root, '../../qa/langues'));
fs.mkdirSync(out, { recursive: true });
const { frenchHits } = require('./langues-helper.cjs');
const L = require(path.join(root, 'outils/langues.cjs')), CFG = L.config(root);
const LANGS = CFG.langues.filter(l => l.etat === 'publiee' && l.code !== CFG.source && (!process.env.LK_LANGUE || l.code === process.env.LK_LANGUE));
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')), HDR = Object.fromEntries((vercel.headers.find(r => r.source === '/(.*)')?.headers || []).map(h => [h.key, h.value]));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.avif': 'image/avif', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.mp4': 'video/mp4', '.webm': 'video/webm' };
const server = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; } if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, HDR).end(); return; } res.writeHead(200, { ...HDR, 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const lines = []; let passed = 0, failed = 0;
function check(ok, label, detail = '') { ok ? passed++ : failed++; const t = (ok ? 'PASS ' : 'FAIL ') + label + (detail && !ok ? ' — ' + String(detail).slice(0, 900) : ''); lines.push(t); if (!ok) console.log(t); }
const VISIBLE = `()=>{const out=[];
  const shown=el=>{for(let e=el;e&&e!==document.documentElement;e=e.parentElement){const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||e.hidden)return false;}return true;};
  const skip=el=>el.closest('[data-lk-langbar],[lang="fr"],[hreflang="fr"],[translate="no"],script,style,svg,.lk-lang-offer,noscript');
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const t=n.nodeValue.trim();if(!t)continue;const el=n.parentElement;if(!el||skip(el)||!shown(el))continue;out.push(t);}
  for(const el of document.body.querySelectorAll('[aria-label],[title],[placeholder]')){if(skip(el)||!shown(el))continue;for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a);if(v)out.push(v);}}
  for(const el of document.body.querySelectorAll('*')){if(skip(el)||!shown(el))continue;for(const ps of ['::before','::after']){let c=getComputedStyle(el,ps).content;if(!c||c==='none'||c==='normal')continue;c=c.replace(/attr\\(([\\w-]+)\\)/g,(m,a)=>JSON.stringify(el.getAttribute(a)||''));const t=[...c.matchAll(/"((?:[^"\\\\]|\\\\.)*)"/g)].map(m=>m[1]).join('');if(/[A-Za-zÀ-ÿ]{2}/.test(t))out.push(t);}}
  return out;}`;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox', '--disable-background-networking', '--disable-features=Translate'] });
  try {
    for (const LG of LANGS) {
      const code = LG.code, dir = LG.dossier, only = process.env.LK_PAGES ? process.env.LK_PAGES.split(',') : null;
      for (const W of [1280, 390]) {
        const queue = (only || LG.pages).slice(), errors = [], fails = [], french = [], overflow = [], meta = [];
        async function worker() {
          const ctx = await browser.newContext({ viewport: { width: W, height: 900 }, locale: LG.locale, serviceWorkers: 'block' });
          await ctx.route('**/*', r => r.request().url().startsWith(base) ? r.continue() : r.abort());
          while (queue.length) {
            const p = queue.shift(), page = await ctx.newPage(), errs = [], bad = [];
            page.on('pageerror', e => errs.push(e.message));
            page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
            page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) bad.push(r.status() + ' ' + r.url().slice(base.length)); });
            page.on('requestfailed', r => { if (r.url().startsWith(base)) bad.push((r.failure()?.errorText || 'échec') + ' ' + r.url().slice(base.length)); });
            try {
              await page.goto(base + '/' + dir + '/' + p, { waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(400);
              if (W === 1280) {
                const info = await page.evaluate(() => ({ lang: document.documentElement.lang, bar: document.querySelector('[data-lk-langbar] summary')?.textContent.trim() || '' }));
                if (info.lang !== code || !info.bar.includes(LG.libelles.changer)) meta.push(p + ' (lang « ' + info.lang + ' », barre « ' + info.bar + ' »)');
                for (const t of new Set(await page.evaluate(`(${VISIBLE})()`))) { const h = frenchHits(t, code); if (h.length) french.push(p + ' « ' + t.replace(/\s+/g, ' ').slice(0, 120) + ' » [' + h.slice(0, 3).join(', ') + ']'); }
              } else {
                const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
                if (ov > 1) {
                  const fr = await ctx.newPage(); await fr.goto(base + '/' + p, { waitUntil: 'load' }); await fr.waitForTimeout(300);
                  const ovf = await fr.evaluate(() => document.documentElement.scrollWidth - innerWidth); await fr.close();
                  if (ov > ovf + 1) overflow.push(p + ' (' + ov + ' px, français ' + ovf + ' px)');
                }
              }
            } catch (e) { errs.push('ouverture : ' + e.message.split('\n')[0]); }
            if (errs.length) errors.push(p + ' : ' + [...new Set(errs)].slice(0, 3).join(' | '));
            if (bad.length) fails.push(p + ' : ' + [...new Set(bad)].slice(0, 4).join(' | '));
            await page.close();
          }
          await ctx.close();
        }
        await Promise.all(Array.from({ length: Number(process.env.LK_PARALLELE || 6) }, worker));
        const n = (only || LG.pages).length, tag = dir + '/ (' + n + ' pages, ' + W + ' px)';
        check(!errors.length, tag + ' : aucune erreur JavaScript', errors.slice(0, 6).join(' ; '));
        check(!fails.length, tag + ' : aucune requête du site en échec', fails.slice(0, 6).join(' ; '));
        if (W === 1280) {
          check(!meta.length, tag + ' : lang="' + code + '" et barre « ' + LG.libelles.changer + ' »', meta.slice(0, 6).join(' ; '));
          check(!french.length, tag + ' : aucun mot français visible', french.slice(0, 12).join(' ; '));
        } else check(!overflow.length, tag + ' : aucun défilement horizontal propre à la traduction', overflow.slice(0, 8).join(' ; '));
      }
    }
  } catch (e) { check(false, 'exécution', e.stack); }
  finally { await browser.close(); server.close(); }
  lines.push('', passed + ' contrôles passés, ' + failed + ' en échec');
  fs.writeFileSync(path.join(out, 'langues-pages-browser.txt'), lines.join('\n') + '\n');
  console.log(passed + ' passés, ' + failed + ' échecs');
  process.exit(failed ? 1 : 0);
})();
