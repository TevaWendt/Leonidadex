#!/usr/bin/env node
'use strict';
/* v7.60 (langues) — parcours Chromium (Playwright) des versions traduites.
   1. Chaque page anglaise et un échantillon de pages françaises, de 360 à 1 440 px : barre « Changer la langue » tout en
      haut, visible, menu qui s'ouvre au clic et au clavier, aucun défilement horizontal ; captures 390 et 1 280 px.
   2. Calculateur anglais : les neuf outils × trois modes, avec un état rempli puis un état vide, chaque bloc déplié,
      tiroir « My calculations », questions du hub en anglais : aucun mot français visible (texte, aria-label, title,
      placeholder), aucun montant écrit « 1 250 $ », nombres anglais lus (« 1,500 »).
   3. Bandeau de suggestion (navigateur anglais sur une page française et l'inverse), clé lk_lang_v1 écrite seulement
      après un clic ; Léo absent des pages anglaises.
   Usage : NODE_PATH=<dépendances>/node_modules [LK_CHROMIUM=<chemin>] [SITE_ROOT=<racine>] [LK_LANGUES_TEXTES=<fichier>] node outils/tests/langues-browser.cjs <dossier de sortie>
   Écrit <sortie>/langues-browser.txt et des captures. Code de sortie 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http'); const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || path.join(root, '../../qa/langues'));
fs.mkdirSync(out, { recursive: true });
const { frenchHits } = require('./langues-helper.cjs');
const L = require(path.join(root, 'outils/langues.cjs')), EN = L.config(root).langues.find(l => l.code === 'en');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')), HDR = Object.fromEntries((vercel.headers.find(r => r.source === '/(.*)')?.headers || []).map(h => [h.key, h.value]));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; } if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, HDR).end(); return; } res.writeHead(200, { ...HDR, 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const lines = []; let passed = 0, failed = 0, browser, base;
function check(ok, label, detail = '') { ok ? passed++ : failed++; const t = (ok ? 'PASS ' : 'FAIL ') + label + (detail && !ok ? ' — ' + String(detail).slice(0, 600) : ''); lines.push(t); console.log(t); }
const H = require('./check-ultime-helper.cjs'); const B = require(path.join(root, 'calculateurs-scenario.js'));
const { D, catalogue, sourceActivities, presets } = H.siteData(), DV = H.dataVersion(D, catalogue, sourceActivities), initial = B.initial(DV, presets);
const TOOLS = ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan'];
/* état rempli, avec des noms écrits par un joueur anglophone (les noms saisis ne sont jamais traduits) */
function englishState() {
  const s = H.planWithMissions(B, H.baseState(B, initial, catalogue));
  s.name = 'Check'; s.assets[0].name = 'My custom purchase';
  s.plan.goal.name = 'My car'; s.plan.missions[0].name = 'Races'; s.plan.missions[1].name = 'Heist'; s.plan.prerequisites[0].name = 'Garage';
  return { ...s, dataVersion: DV };
}
/* texte visible d'une zone : nœuds texte des éléments affichés + aria-label, title, placeholder ; hors barre de langue,
   hors liens et éléments marqués lang="fr" (lien vers une page française, nom de langue) */
const VISIBLE = `(sel)=>{const rootEl=document.querySelector(sel)||document.body,out=[];
  const shown=el=>{for(let e=el;e&&e!==document.documentElement;e=e.parentElement){const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||e.hidden)return false;}return true;};
  const skip=el=>el.closest('[data-lk-langbar],[lang="fr"],[hreflang="fr"],[translate="no"],script,style,svg,.lk-lang-offer');
  const w=document.createTreeWalker(rootEl,NodeFilter.SHOW_TEXT);let n;while((n=w.nextNode())){const t=n.nodeValue.trim();if(!t)continue;const el=n.parentElement;if(!el||skip(el)||!shown(el))continue;out.push(t);}
  for(const el of rootEl.querySelectorAll('[aria-label],[title],[placeholder]')){if(skip(el)||!shown(el))continue;for(const a of ['aria-label','title','placeholder']){const v=el.getAttribute(a);if(v)out.push(v);}}
  /* texte posé par une feuille de style (::before, ::after) */
  for(const el of rootEl.querySelectorAll('*')){if(skip(el)||!shown(el))continue;for(const ps of ['::before','::after']){let c=getComputedStyle(el,ps).content;if(!c||c==='none'||c==='normal')continue;c=c.replace(/attr\(([\w-]+)\)/g,(m,a)=>JSON.stringify(el.getAttribute(a)||''));const t=[...c.matchAll(/"((?:[^"\\\\]|\\\\.)*)"/g)].map(m=>m[1]).join('');if(/[A-Za-zÀ-ÿ]{2}/.test(t))out.push(t);}}
  return out;}`;
/* LK_LANGUES_TEXTES=<fichier> : écrit aussi chaque texte vu, zone par zone (relecture humaine de l'anglais) */
const DUMP = process.env.LK_LANGUES_TEXTES ? [] : null;
async function frenchIn(page, sel, label) {
  const texts = await page.evaluate(`(${VISIBLE})(${JSON.stringify(sel)})`);
  if (DUMP) DUMP.push('## ' + label, ...[...new Set(texts)].map(t => '- ' + t.replace(/\s+/g, ' ')), '');
  const hits = []; for (const t of texts) { const h = frenchHits(t); if (h.length) hits.push('« ' + t.slice(0, 100) + ' » [' + h.slice(0, 3).join(', ') + ']'); }
  const money = texts.filter(t => /\d[\d.,]*[\s\u00a0\u202f]?\$(?![\d{])/.test(t) && !/\$\d/.test(t.replace(/\d[\d.,]*[\s\u00a0\u202f]?\$(?![\d{])/, ''))).slice(0, 3);
  check(!hits.length, label + ' : aucun mot français visible', [...new Set(hits)].slice(0, 8).join(' ; '));
  check(!money.length, label + ' : montants écrits $1,250 (jamais « 1 250 $ »)', money.join(' ; '));
  return texts;
}
async function openPage(ctx, url, storage) {
  const page = await ctx.newPage();
  page.on('pageerror', e => lines.push('PAGEERROR ' + url + ' : ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) lines.push('CONSOLE ' + url + ' : ' + m.text()); });
  if (storage) { await page.goto(base + url.replace(/[?#].*$/, ''), { waitUntil: 'domcontentloaded' }); await page.evaluate(st => { localStorage.clear(); for (const [k, v] of Object.entries(st)) localStorage.setItem(k, v); }, storage); }
  await page.goto(base + url, { waitUntil: 'load' });
  return page;
}
async function bar(page, label, expect) {
  const r = await page.evaluate(() => { const b = document.querySelector('[data-lk-langbar]'); if (!b) return null; const s = b.querySelector('summary'), rc = s.getBoundingClientRect(), cs = getComputedStyle(b); return { top: b.getBoundingClientRect().top, visible: cs.display !== 'none' && rc.width > 0 && rc.height >= 24, text: s.textContent.trim(), overflow: document.documentElement.scrollWidth - innerWidth, h: rc.height, w: rc.width, right: rc.right, W: innerWidth }; });
  check(!!r, label + ' : barre de langue présente');
  if (!r) return;
  check(r.top <= 2 && r.visible, label + ' : barre tout en haut, visible', JSON.stringify(r));
  check(r.text.includes(expect), label + ' : « ' + expect + ' » affiché', r.text);
  check(r.right <= r.W + 1, label + ' : bouton dans l’écran', JSON.stringify(r));
  check(r.overflow <= 1, label + ' : aucun défilement horizontal', 'débordement ' + r.overflow + ' px');
}
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); base = 'http://127.0.0.1:' + server.address().port;
  browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox', '--disable-background-networking', '--disable-features=Translate'] });
  try {
    /* ---- 1. barre de langue et mise en page ---- */
    const FR_SAMPLE = ['index.html', 'calculateurs.html', 'vehicules.html', 'carte.html', 'carnets/garage.html', 'lieux/vice-city.html', 'mentions-legales.html'];
    for (const W of [360, 390, 768, 1280, 1440]) {
      const ctx = await browser.newContext({ viewport: { width: W, height: 860 }, deviceScaleFactor: 1, locale: 'fr-FR' });
      for (const p of EN.pages) {
        const page = await openPage(ctx, '/en/' + p);
        await bar(page, W + ' px en/' + p, 'Change language');
        if (W === 390 || W === 1280) await page.screenshot({ path: path.join(out, 'en-' + p.replace('.html', '') + '-' + W + '.png') });
        if (W === 1280) {
          await page.click('.lk-lang summary');
          const menu = await page.evaluate(() => [...document.querySelectorAll('.lk-lang-menu a')].map(a => a.textContent.trim() + '|' + (a.getAttribute('href') || 'current')));
          check(menu.length === 2 && /^Français\|\.\.\//.test(menu[0]) && /^English\|current/.test(menu[1]), 'en/' + p + ' : menu Français / English', menu.join(' ; '));
          if (p === 'index.html') await page.screenshot({ path: path.join(out, 'en-menu-ouvert-1280.png') });
          await page.keyboard.press('Escape');
          check(await page.evaluate(() => !document.querySelector('.lk-lang').open), 'en/' + p + ' : Échap ferme le menu');
          check(await page.evaluate(() => !document.getElementById('leo-style')), 'en/' + p + ' : Léo absent');
          if (p !== 'calculateurs.html') await frenchIn(page, 'body', 'en/' + p + ' (page)');
        }
        await page.close();
      }
      for (const p of FR_SAMPLE) {
        if (!fs.existsSync(path.join(root, p))) continue;
        const page = await openPage(ctx, '/' + p);
        await bar(page, W + ' px ' + p, 'Changer la langue');
        if (W === 390 && p === 'index.html') { await page.click('.lk-lang summary'); await page.screenshot({ path: path.join(out, 'fr-menu-ouvert-390.png') }); }
        await page.close();
      }
      await ctx.close();
    }
    /* clavier : Tab jusqu'au sélecteur, Entrée ouvre, flèche/Tab atteint « English » */
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 } }); const page = await openPage(ctx, '/index.html');
      let found = false; for (let i = 0; i < 6 && !found; i++) { await page.keyboard.press('Tab'); found = await page.evaluate(() => document.activeElement?.matches('.lk-lang summary')); }
      check(found, 'clavier : le sélecteur est parmi les premiers arrêts de tabulation');
      await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
      check(await page.evaluate(() => document.activeElement?.getAttribute('data-lk-lang') === 'en'), 'clavier : « English » atteint après ouverture');
      check(await page.evaluate(() => localStorage.getItem('lk_lang_v1')) === null, 'aucune clé écrite sans clic');
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.keyboard.press('Enter')]);
      check(page.url().endsWith('/en/'), 'Entrée sur « English » ouvre /en/', page.url());
      check(await page.evaluate(() => localStorage.getItem('lk_lang_v1')) === 'en', 'choix « en » écrit après le clic');
      await ctx.close(); }
    /* ---- 3. bandeau de suggestion ---- */
    { const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'en-US' }); const page = await openPage(ctx, '/calculateurs.html');
      const offer = await page.evaluate(() => { const o = document.querySelector('.lk-lang-offer'); return o && { text: o.textContent, lang: o.lang, href: o.querySelector('a').getAttribute('href'), top: o.getBoundingClientRect().top }; });
      check(!!offer && /This page is also available in English/.test(offer.text) && offer.lang === 'en' && offer.href === 'en/calculateurs.html', 'navigateur anglais sur une page française : bandeau anglais vers la même page', JSON.stringify(offer));
      check(await page.evaluate(() => localStorage.getItem('lk_lang_v1')) === null, 'bandeau affiché : rien d’écrit');
      await page.screenshot({ path: path.join(out, 'bandeau-390.png') });
      await page.click('.lk-lang-offer button');
      check(await page.evaluate(() => !document.querySelector('.lk-lang-offer') && localStorage.getItem('lk_lang_v1') === 'fr'), '« No thanks » : bandeau retiré, français gardé');
      await page.reload(); check(await page.evaluate(() => !document.querySelector('.lk-lang-offer')), 'après « No thanks » : plus de bandeau');
      await ctx.close(); }
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' }); const page = await openPage(ctx, '/en/tuto.html');
      const offer = await page.evaluate(() => document.querySelector('.lk-lang-offer')?.textContent || '');
      check(/Cette page existe aussi en français.*Lire en français.*Non merci/.test(offer), 'navigateur français sur une page anglaise : bandeau en français', offer);
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('.lk-lang-offer a')]);
      check(/\/tuto\.html$/.test(page.url()) && !page.url().includes('/en/'), '« Lire en français » ouvre la même page en français', page.url());
      check(await page.evaluate(() => localStorage.getItem('lk_lang_v1')) === 'fr', 'choix écrit après le clic');
      await ctx.close(); }
    /* ---- 2. calculateur anglais : chaque outil, chaque mode ---- */
    const states = [['rempli', { 'lk-calculator-v1': JSON.stringify(englishState()) }], ['vide', {}]];
    for (const [name, storage] of states) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
      const page = await openPage(ctx, '/en/calculateurs.html#atelier', storage);
      await frenchIn(page, 'body', 'calculateur (' + name + ') : page');
      for (const tool of TOOLS) {
        await page.click('#tab-' + tool);
        for (const mode of ['quick', 'guided', 'advanced']) {
          const sw = await page.$('.calc-mode-switch [data-mode="' + mode + '"]'); if (sw) { await sw.click(); await page.waitForTimeout(80); }
          await page.evaluate(() => document.querySelectorAll('.calc-panel:not([hidden]) details').forEach(d => { d.open = true; }));
          await page.waitForTimeout(40);
          await frenchIn(page, '.calc-panel:not([hidden])', 'calculateur (' + name + ') ' + tool + ' / ' + mode);
        }
      }
      if (name === 'rempli') {
        await page.click('#tab-plan');
        await page.screenshot({ path: path.join(out, 'en-calculateur-plan-1280.png'), fullPage: false });
        const opener = await page.$('.calc-saved-open'); if (opener) { await opener.click(); await page.waitForTimeout(200); await frenchIn(page, '#calc-drawer', 'calculateur : tiroir My calculations'); await page.keyboard.press('Escape'); }
        /* nombres anglais : « 1,500 » dans « I already have » */
        await page.click('#tab-goal'); await page.click('.calc-mode-switch [data-mode="quick"]');
        const cap = await page.$('#f-goal-capital');
        if (cap) { await cap.fill('1,500'); await cap.dispatchEvent('input'); await page.waitForTimeout(150);
          const st = await page.evaluate(() => JSON.parse(localStorage.getItem('lk-calculator-v1') || '{}').goal?.capital ?? window.LKCalculator?.state?.()?.goal?.capital);
          const err = await page.evaluate(() => { const e = document.querySelector('#f-goal-capital')?.closest('.calc-field')?.querySelector('.calc-error:not([hidden]),[role="alert"]'); return e ? e.textContent : ''; });
          check(st === 1500 || (!err && st !== 1.5), '« 1,500 » est lu 1 500 (anglais)', 'état ' + st + ' ; erreur « ' + err + ' »'); }
        /* hub : questions en anglais */
        for (const [q, tab] of [['How long to reach 1 million playing 1 hour a day?', 'goal'], ['Can I afford a vehicle that costs $250,000?', 'purchase'], ['I have 30 minutes for my session', 'session'], ['Is it worth it to buy a $500,000 business?', 'roi'], ['Which one should I choose?', 'compare']]) {
          const input = await page.$('#calc-ask-input'); if (!input) { check(false, 'hub : champ de question'); break; }
          await input.fill(q); await page.press('#calc-ask-input', 'Enter'); await page.waitForTimeout(150);
          const r = await page.evaluate(() => ({ tab: document.querySelector('.calc-tab[aria-selected="true"],[role="tab"][aria-selected="true"]')?.id || '', out: document.getElementById('calc-ask-out')?.textContent || '' }));
          check(r.tab === 'tab-' + tab, 'hub « ' + q + ' » ouvre ' + tab, r.tab);
          check(!frenchHits(r.out).length, 'hub « ' + q + ' » : réponse en anglais', r.out);
        }
      }
      await ctx.close();
    }
  } catch (e) { check(false, 'exécution', e.stack); }
  finally { await browser.close(); server.close(); }
  const extra = lines.filter(l => /^(PAGEERROR|CONSOLE)/.test(l));
  check(!extra.length, 'aucune erreur JavaScript', extra.slice(0, 5).join(' ; '));
  lines.push('', passed + ' contrôles passés, ' + failed + ' en échec');
  fs.writeFileSync(path.join(out, 'langues-browser.txt'), lines.join('\n') + '\n');
  if (DUMP) fs.writeFileSync(path.resolve(process.env.LK_LANGUES_TEXTES), DUMP.join('\n') + '\n');
  console.log(passed + ' passés, ' + failed + ' échecs');
  process.exit(failed ? 1 : 0);
})();
