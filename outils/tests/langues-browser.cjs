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
   v7.61 : tout le site — barre de langue sur un échantillon (17 pages, 5 largeurs), aucun mot français visible sur chacune
   des pages anglaises (1 280 px), puis états ouverts : Léo anglais (questions, liens /en/), carte (fiche d’un lieu, liste
   de repères), carnets remplis et vides, comparateur, progression, collectibles, recherche du site, listes filtrées,
   comparaison des consommables, localisateur, page introuvable sous /en/.
   Usage : NODE_PATH=<dépendances>/node_modules [LK_CHROMIUM=<chemin>] [SITE_ROOT=<racine>] [LK_LANGUES_TEXTES=<fichier>] node outils/tests/langues-browser.cjs <dossier de sortie>
   Écrit <sortie>/langues-browser.txt et des captures. Code de sortie 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http'); const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || path.join(root, '../../qa/langues'));
fs.mkdirSync(out, { recursive: true });
const { frenchHits } = require('./langues-helper.cjs');
const L = require(path.join(root, 'outils/langues.cjs')), EN = L.config(root).langues.find(l => l.code === 'en');
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')), HDR = Object.fromEntries((vercel.headers.find(r => r.source === '/(.*)')?.headers || []).map(h => [h.key, h.value]));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; } if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { /* comme Vercel : la page 404 française pour toute adresse inconnue */ if (/\.html$/.test(p)) { res.writeHead(404, { ...HDR, 'content-type': 'text/html; charset=utf-8' }); fs.createReadStream(path.join(root, '404.html')).pipe(res); return; } res.writeHead(404, HDR).end(); return; } res.writeHead(200, { ...HDR, 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
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
  const skip=el=>el.closest('[data-lk-langbar],[lang="fr"],[hreflang="fr"],[translate="no"],script,style,svg,noscript,.lk-lang-offer');
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
    /* v7.61 : toutes les pages sont traduites ; la mise en page est vérifiée sur un échantillon de chaque famille */
    const EN_SAMPLE = ['index.html', 'calculateurs.html', 'tuto.html', 'a-propos.html', 'contact.html', 'mentions-legales.html', 'vehicules.html', 'armes.html', 'carte.html', 'carnets/garage.html', 'lieux/vice-city.html', 'vehicules/albany-emperor.html', 'armes/girardi-es9.html', 'collectibles.html', 'progression.html', 'nourriture.html', '404.html'].filter(p => EN.pages.includes(p));
    for (const W of [360, 390, 768, 1280, 1440]) {
      const ctx = await browser.newContext({ viewport: { width: W, height: 860 }, deviceScaleFactor: 1, locale: 'fr-FR' });
      for (const p of EN_SAMPLE) {
        const page = await openPage(ctx, '/en/' + p);
        await bar(page, W + ' px en/' + p, 'Change language');
        if (W === 390 || W === 1280) await page.screenshot({ path: path.join(out, 'en-' + p.replace('.html', '') + '-' + W + '.png') });
        if (W === 1280) {
          await page.click('.lk-lang summary');
          const menu = await page.evaluate(() => [...document.querySelectorAll('.lk-lang-menu a')].map(a => a.textContent.trim() + '|' + (a.getAttribute('href') || 'current')));
          check(menu.length === 2 && /^Français\|(?:\.\.\/|\/)/.test(menu[0]) && /^English\|current/.test(menu[1]), 'en/' + p + ' : menu Français / English', menu.join(' ; '));
          if (p === 'index.html') await page.screenshot({ path: path.join(out, 'en-menu-ouvert-1280.png') });
          await page.keyboard.press('Escape');
          check(await page.evaluate(() => !document.querySelector('.lk-lang').open), 'en/' + p + ' : Échap ferme le menu');
          check(await page.evaluate(() => !!document.getElementById('leo-style')), 'en/' + p + ' : Léo s’amorce (v7.61)');
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
    /* ---- 4. v7.61 : chaque page anglaise, aucun mot français visible (1 280 px) ---- */
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
      for (const p of EN.pages.filter(x => x !== 'calculateurs.html' && !/http-equiv="refresh"/.test(fs.readFileSync(path.join(root, 'en', x), 'utf8')))) {
        const page = await openPage(ctx, '/en/' + p); await frenchIn(page, 'body', 'en/' + p + ' (page)'); await page.close(); }
      await ctx.close(); }
    /* ---- 5. v7.61 : états ouverts ---- */
    { const now = new Date().toISOString();
      const STORE = { lk_own_vehicules: '{"albany-emperor":1,"karin-sultan":1}', lk_own_armes: '{"girardi-es9":1}', lk_own_munitions: '{"cartouches":1}', lk_own_consommables: '{"sprunk":1}', lk_own_tenues: '{"milliers-de-tenues":1}', 'lk_own_perso-armes': '{"silencieux":1}', lk_map_found: '{"vice-city":true}', lk_wish_v1: JSON.stringify({ version: 1, items: { 'vehicules:vapid-dominator': { at: now, from: 'fiche' } } }), lk_stock_v1: JSON.stringify({ version: 1, items: { 'consommables:sprunk': { q: 2, at: now } } }) };
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'en-US' });
      const visit = async (url, label, act, storage, sel = 'body') => { const page = await openPage(ctx, url, storage); try { if (act) await act(page); await page.waitForTimeout(250); await frenchIn(page, sel, label); } catch (e) { check(false, label, e.message); } return page; };
      for (const c of ['garage', 'arsenal', 'garde-robe', 'consommables', 'personnalisations', 'proprietes', 'lieux', 'collectibles', 'calculs']) {
        (await visit('/en/carnets/' + c + '.html', 'carnet ' + c + ' (rempli)', null, STORE)).close();
        (await visit('/en/carnets/' + c + '.html', 'carnet ' + c + ' (vide)', null, {})).close(); }
      (await visit('/en/progression.html', 'progression (remplie)', null, STORE)).close();
      (await visit('/en/carte.html#lieu=vice-city', 'carte : fiche de Vice City', async pg => { await pg.waitForTimeout(600); })).close();
      (await visit('/en/carte.html#lieu=g-L759', 'carte : lieu réel (nom réel)', async pg => { await pg.waitForTimeout(600); })).close();
      (await visit('/en/carte.html#pins=g-L1074,g-L1091&t=' + encodeURIComponent('Gun stores'), 'carte : liste de repères', async pg => { await pg.waitForTimeout(600); })).close();
      (await visit('/en/comparateur.html?type=vehicules&ids=albany-emperor,albany-primo', 'comparateur véhicules')).close();
      (await visit('/en/comparateur.html?type=armes&ids=girardi-es9,klose-k17', 'comparateur armes')).close();
      (await visit('/en/collectibles.html', 'collectibles : aide filtrée', async pg => { const q = await pg.$('#col-help-q,[data-col-help-q],input[type="search"]'); if (q) { await q.fill('map'); await pg.waitForTimeout(200); } })).close();
      (await visit('/en/vehicules.html', 'véhicules : recherche dans la liste', async pg => { const q = await pg.$('#vq,#q,input[type="search"]'); if (q) { await q.fill('sedan'); await pg.waitForTimeout(300); } })).close();
      (await visit('/en/nourriture.html', 'consommables : comparaison', async pg => { const boxes = await pg.$$('[data-cg-id] input[type="checkbox"], .cg-pick input[type="checkbox"]'); for (const b of boxes.slice(0, 2)) await b.check().catch(() => {}); })).close();
      (await visit('/en/armes/girardi-es9.html', 'fiche arme : localisateur', async pg => { const b = await pg.$('[data-loc-id]'); if (b) await b.click(); })).close();
      { const pg = await visit('/en/index.html', 'recherche du site', async pg => { const q = await pg.$('#q,#search,input[type="search"]'); if (q) { await q.fill('ganado'); await pg.waitForTimeout(500); } }); await pg.close(); }
      /* page introuvable sous /en/ : la page 404 anglaise */
      { const pg = await openPage(ctx, '/en/does-not-exist.html'); await pg.waitForTimeout(500);
        check(/\/en\/404\.html$/.test(pg.url()), 'adresse inconnue sous /en/ : page introuvable anglaise', pg.url()); await frenchIn(pg, 'body', 'page introuvable anglaise'); await pg.close(); }
      /* Léo anglais : questions, réponses en anglais, liens vers /en/ */
      { const pg = await openPage(ctx, '/en/vehicules/albany-emperor.html'); await pg.waitForSelector('#leo-launch');
        check(/open the Leonidakit assistant/.test(await pg.textContent('#leo-launch')), 'Léo : bouton en anglais');
        await pg.click('#leo-launch'); await pg.waitForSelector('#leo-question'); await pg.waitForTimeout(600);
        for (const q of ['when does gta 6 come out', 'where can i find the pump shotgun', 'I have $200,000 and want 1 million', 'who is lucia', 'how big is the map']) {
          await pg.fill('#leo-question', q); await pg.press('#leo-question', 'Enter'); await pg.waitForTimeout(700);
          const links = await pg.evaluate(() => [...document.querySelectorAll('#leo-panel .leo-log a[href^="/"]')].map(a => a.getAttribute('href')));
          check(links.length > 0 && links.every(h => h.startsWith('/en/')), 'Léo « ' + q + ' » : liens vers les pages anglaises', links.filter(h => !h.startsWith('/en/')).join(' '));
        }
        await frenchIn(pg, '#leo-panel', 'Léo : panneau et réponses');
        await pg.screenshot({ path: path.join(out, 'en-leo-1280.png') });
        await pg.close(); }
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
