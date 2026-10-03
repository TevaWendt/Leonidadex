#!/usr/bin/env node
'use strict';
/* v7.60 (langues), v7.61 (espagnol) — parcours Chromium (Playwright) des versions traduites.
   1. Chaque page anglaise, un échantillon de pages espagnoles (toutes les pages /es/ sont parcourues par
      langues-pages-browser.cjs) et un échantillon de pages françaises, de 360 à 1 440 px : barre « Changer la langue »
      tout en haut, visible, menu qui s'ouvre au clic et au clavier, aucun défilement horizontal ; captures 390 et 1 280 px.
   2. Calculateur anglais et espagnol : les neuf outils × trois modes, avec un état rempli puis un état vide, chaque bloc
      déplié, tiroir « Mis cálculos » / « My calculations », questions du hub dans la langue : aucun mot français visible
      (texte, aria-label, title, placeholder), montants de la langue (« $1,250 » en anglais, « 1.250 $ » en espagnol),
      nombres de la langue lus (« 1,500 » / « 1.500 »).
   3. Bandeau de suggestion (navigateur anglais ou espagnol sur une page française et l'inverse), clé lk_lang_v1 écrite
      seulement après un clic ; Léo absent des pages anglaises, présent sur les pages espagnoles.
   Usage : NODE_PATH=<dépendances>/node_modules [LK_CHROMIUM=<chemin>] [SITE_ROOT=<racine>] [LK_LANGUES_TEXTES=<fichier>] node outils/tests/langues-browser.cjs <dossier de sortie>
   Écrit <sortie>/langues-browser.txt et des captures. Code de sortie 1 si un contrôle échoue. */
const fs = require('fs'), path = require('path'), http = require('http'); const { chromium } = require('playwright');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || path.join(root, '../../qa/langues'));
fs.mkdirSync(out, { recursive: true });
const { frenchHits } = require('./langues-helper.cjs');
const L = require(path.join(root, 'outils/langues.cjs')), CFG = L.config(root), EN = CFG.langues.find(l => l.code === 'en');
const LANGS = CFG.langues.filter(l => l.etat === 'publiee' && l.code !== CFG.source), PUB = CFG.langues.filter(l => l.etat === 'publiee');
/* pages vues à chaque largeur : toutes pour une langue partielle, un échantillon pour une langue complète */
const SAMPLE = ['index.html', 'calculateurs.html', 'vehicules.html', 'vehicules/albany-emperor.html', 'armes.html', 'carte.html', 'carnets/garage.html', 'lieux/vice-city.html', 'progression.html', 'comparateur.html', 'contact.html', 'mentions-legales.html', 'tuto.html'];
const shownPages = LG => LG.pages.length > 40 ? SAMPLE.filter(p => LG.pages.includes(p)) : LG.pages;
const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8')), HDR = Object.fromEntries((vercel.headers.find(r => r.source === '/(.*)')?.headers || []).map(h => [h.key, h.value]));
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };
const server = http.createServer((req, res) => { let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; } if (p.endsWith('/')) p += 'index.html'; const f = path.join(root, p); if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, HDR).end(); return; } res.writeHead(200, { ...HDR, 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); });
const lines = []; let passed = 0, failed = 0, browser, base;
function check(ok, label, detail = '') { ok ? passed++ : failed++; const t = (ok ? 'PASS ' : 'FAIL ') + label + (detail && !ok ? ' — ' + String(detail).slice(0, 600) : ''); lines.push(t); console.log(t); }
const H = require('./check-ultime-helper.cjs'); const B = require(path.join(root, 'calculateurs-scenario.js'));
const { D, catalogue, sourceActivities, presets } = H.siteData(), DV = H.dataVersion(D, catalogue, sourceActivities), initial = B.initial(DV, presets);
const TOOLS = ['goal', 'purchase', 'session', 'budget', 'order', 'roi', 'activities', 'compare', 'plan'];
/* état rempli, avec des noms écrits par un joueur de la langue (les noms saisis ne sont jamais traduits) */
const NAMES = { en: ['Check', 'My custom purchase', 'My car', 'Races', 'Heist', 'Garage'], es: ['Prueba', 'Mi compra', 'Mi coche', 'Carreras', 'Golpe', 'Garaje'] };
function filledState(code) {
  const s = H.planWithMissions(B, H.baseState(B, initial, catalogue)), n = NAMES[code] || NAMES.en;
  s.name = n[0]; s.assets[0].name = n[1];
  s.plan.goal.name = n[2]; s.plan.missions[0].name = n[3]; s.plan.missions[1].name = n[4]; s.plan.prerequisites[0].name = n[5];
  return { ...s, dataVersion: DV };
}
/* questions du hub et onglet attendu */
const HUB = {
  en: [['How long to reach 1 million playing 1 hour a day?', 'goal'], ['Can I afford a vehicle that costs $250,000?', 'purchase'], ['I have 30 minutes for my session', 'session'], ['Is it worth it to buy a $500,000 business?', 'roi'], ['Which one should I choose?', 'compare']],
  es: [['¿Cuánto tiempo para llegar a 1 millón jugando 1 hora al día?', 'goal'], ['¿Puedo comprar un vehículo que cuesta 250.000 $?', 'purchase'], ['Tengo 30 minutos para mi sesión', 'session'], ['¿Vale la pena comprar un negocio de 500.000 $?', 'roi'], ['¿Cuál debería elegir?', 'compare'], ['¿En qué orden compro?', 'order'], ['Quiero repartir mi presupuesto', 'budget'], ['¿Qué actividad da más?', 'activities'], ['Quiero hacer un plan de negocio', 'plan']]
};
/* « 1 500 » écrit dans la langue, et la saisie attendue */
const NUM = { en: '1,500', es: '1.500' };
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
async function frenchIn(page, sel, label, code = 'en') {
  const texts = await page.evaluate(`(${VISIBLE})(${JSON.stringify(sel)})`);
  if (DUMP) DUMP.push('## ' + label, ...[...new Set(texts)].map(t => '- ' + t.replace(/\s+/g, ' ')), '');
  const hits = []; for (const t of texts) { const h = frenchHits(t, code); if (h.length) hits.push('« ' + t.slice(0, 100) + ' » [' + h.slice(0, 3).join(', ') + ']'); }
  /* anglais : « $1,250 », jamais « 1 250 $ » ; espagnol : « 1.250 $ », jamais « $1,250 » ni « 1 250 $ » (espaces à la française) */
  const money = code === 'es'
    ? texts.filter(t => /\$\d/.test(t) || /\d{1,3}(?:[\u00a0\u202f ]\d{3})+\s*\$/.test(t)).slice(0, 3)
    : texts.filter(t => /\d[\d.,]*[\s\u00a0\u202f]?\$(?![\d{])/.test(t) && !/\$\d/.test(t.replace(/\d[\d.,]*[\s\u00a0\u202f]?\$(?![\d{])/, ''))).slice(0, 3);
  check(!hits.length, label + ' : aucun mot français visible', [...new Set(hits)].slice(0, 8).join(' ; '));
  check(!money.length, label + (code === 'es' ? ' : montants écrits 1.250 $ (jamais « $1,250 » ni « 1 250 $ »)' : ' : montants écrits $1,250 (jamais « 1 250 $ »)'), money.join(' ; '));
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
      for (const LG of LANGS) for (const p of shownPages(LG)) {
        const code = LG.code, dir = LG.dossier, leo = CFG.leo.includes(code);
        const page = await openPage(ctx, '/' + dir + '/' + p);
        await bar(page, W + ' px ' + dir + '/' + p, LG.libelles.changer);
        if (W === 390 || W === 1280) await page.screenshot({ path: path.join(out, dir + '-' + p.replace(/\//g, '-').replace('.html', '') + '-' + W + '.png') });
        if (W === 1280) {
          await page.click('.lk-lang summary');
          const menu = await page.evaluate(() => [...document.querySelectorAll('.lk-lang-menu a')].map(a => a.textContent.trim() + '|' + (a.getAttribute('href') || 'current')));
          const okMenu = menu.length === PUB.length && PUB.every((l, i) => menu[i].startsWith(l.nom) && (l.code === code ? menu[i].endsWith('|current') : /\|\.\.\//.test(menu[i])));
          check(okMenu, dir + '/' + p + ' : menu ' + PUB.map(l => l.nom).join(' / '), menu.join(' ; '));
          if (p === 'index.html') await page.screenshot({ path: path.join(out, dir + '-menu-ouvert-1280.png') });
          await page.keyboard.press('Escape');
          check(await page.evaluate(() => !document.querySelector('.lk-lang').open), dir + '/' + p + ' : Échap ferme le menu');
          check(await page.evaluate(() => !!document.getElementById('leo-style')) === leo, dir + '/' + p + ' : Léo ' + (leo ? 'présent' : 'absent'));
          if (p !== 'calculateurs.html') await frenchIn(page, 'body', dir + '/' + p + ' (page)', code);
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
      await page.keyboard.press('Enter');
      let onEn = false; for (let i = 0; i < 4 && !onEn; i++) { await page.keyboard.press('Tab'); onEn = await page.evaluate(() => document.activeElement?.getAttribute('data-lk-lang') === 'en'); }
      check(onEn, 'clavier : « English » atteint après ouverture');
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
    if (LANGS.some(l => l.code === 'es')) { const ctx = await browser.newContext({ viewport: { width: 390, height: 800 }, locale: 'es-ES' }); const page = await openPage(ctx, '/vehicules.html');
      const offer = await page.evaluate(() => { const o = document.querySelector('.lk-lang-offer'); return o && { text: o.textContent, lang: o.lang, href: o.querySelector('a').getAttribute('href') }; });
      check(!!offer && /Esta página también está disponible en español/.test(offer.text) && offer.lang === 'es' && offer.href === 'es/vehicules.html', 'navigateur espagnol sur une page française : bandeau espagnol vers la même page', JSON.stringify(offer));
      await page.screenshot({ path: path.join(out, 'bandeau-es-390.png') });
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('.lk-lang-offer a')]);
      check(/\/es\/vehicules\.html$/.test(page.url()), '« Leer en español » ouvre la même page en espagnol', page.url());
      check(await page.evaluate(() => localStorage.getItem('lk_lang_v1')) === 'es', 'choix « es » écrit après le clic');
      await ctx.close(); }
    { const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'fr-FR' }); const page = await openPage(ctx, '/en/tuto.html');
      const offer = await page.evaluate(() => document.querySelector('.lk-lang-offer')?.textContent || '');
      check(/Cette page existe aussi en français.*Lire en français.*Non merci/.test(offer), 'navigateur français sur une page anglaise : bandeau en français', offer);
      await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('.lk-lang-offer a')]);
      check(/\/tuto\.html$/.test(page.url()) && !page.url().includes('/en/'), '« Lire en français » ouvre la même page en français', page.url());
      check(await page.evaluate(() => localStorage.getItem('lk_lang_v1')) === 'fr', 'choix écrit après le clic');
      await ctx.close(); }
    /* ---- 2. calculateur de chaque langue : chaque outil, chaque mode ---- */
    for (const LG of LANGS.filter(l => l.pages.includes('calculateurs.html'))) {
    const code = LG.code, dir = LG.dossier;
    const states = [['rempli', { 'lk-calculator-v1': JSON.stringify(filledState(code)) }], ['vide', {}]];
    for (const [name, storage] of states) {
      const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: LG.locale });
      const page = await openPage(ctx, '/' + dir + '/calculateurs.html#atelier', storage);
      await frenchIn(page, 'body', dir + ' calculateur (' + name + ') : page', code);
      for (const tool of TOOLS) {
        await page.click('#tab-' + tool);
        for (const mode of ['quick', 'guided', 'advanced']) {
          const sw = await page.$('.calc-mode-switch [data-mode="' + mode + '"]'); if (sw) { await sw.click(); await page.waitForTimeout(80); }
          await page.evaluate(() => document.querySelectorAll('.calc-panel:not([hidden]) details').forEach(d => { d.open = true; }));
          await page.waitForTimeout(40);
          await frenchIn(page, '.calc-panel:not([hidden])', dir + ' calculateur (' + name + ') ' + tool + ' / ' + mode, code);
        }
      }
      if (name === 'rempli') {
        await page.click('#tab-plan');
        await page.screenshot({ path: path.join(out, dir + '-calculateur-plan-1280.png'), fullPage: false });
        const opener = await page.$('.calc-saved-open'); if (opener) { await opener.click(); await page.waitForTimeout(200); await frenchIn(page, '#calc-drawer', dir + ' calculateur : tiroir des calculs', code); await page.keyboard.press('Escape'); }
        /* nombres de la langue : « 1,500 » / « 1.500 » dans « J'ai déjà » */
        await page.click('#tab-goal'); await page.click('.calc-mode-switch [data-mode="quick"]');
        const cap = await page.$('#f-goal-capital');
        if (cap) { await cap.fill(NUM[code] || NUM.en); await cap.dispatchEvent('input'); await page.waitForTimeout(150);
          const st = await page.evaluate(() => JSON.parse(localStorage.getItem('lk-calculator-v1') || '{}').goal?.capital ?? window.LKCalculator?.state?.()?.goal?.capital);
          const err = await page.evaluate(() => { const e = document.querySelector('#f-goal-capital')?.closest('.calc-field')?.querySelector('.calc-error:not([hidden]),[role="alert"]'); return e ? e.textContent : ''; });
          check(st === 1500 || (!err && st !== 1.5), '« ' + (NUM[code] || NUM.en) + ' » est lu 1 500 (' + code + ')', 'état ' + st + ' ; erreur « ' + err + ' »'); }
        /* hub : questions dans la langue */
        for (const [q, tab] of HUB[code] || HUB.en) {
          const input = await page.$('#calc-ask-input'); if (!input) { check(false, 'hub : champ de question'); break; }
          await input.fill(q); await page.press('#calc-ask-input', 'Enter'); await page.waitForTimeout(150);
          const r = await page.evaluate(() => ({ tab: document.querySelector('.calc-tab[aria-selected="true"],[role="tab"][aria-selected="true"]')?.id || '', out: document.getElementById('calc-ask-out')?.textContent || '' }));
          check(r.tab === 'tab-' + tab, 'hub « ' + q + ' » ouvre ' + tab, r.tab);
          check(!frenchHits(r.out, code).length, 'hub « ' + q + ' » : réponse en ' + code, r.out);
        }
      }
      await ctx.close();
    }
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
