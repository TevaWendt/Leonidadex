#!/usr/bin/env node
'use strict';
/* assemblage v7.91 (audit complet) : accessibilité (axe-core, règles WCAG 2.x A et AA) sur une page par gabarit et sur les
   pages nouvelles des cinq travaux (Presse, Mode compagnon, hors connexion, Devine le lieu, Ce qui est confirmé, Actualités,
   Vidéos, Éditions), en français et en allemand (les pages nouvelles aussi en portugais), à 390 et 1 280 px.
   Échoue si une violation « serious » ou « critical » est trouvée. Les violations « minor » / « moderate » sont listées.
   Usage : NODE_PATH=<dépendances>/node_modules [LK_CHROMIUM=<chemin>] [SITE_ROOT=<racine>] node outils/tests/audit-axe-v791.cjs <dossier de sortie>
   Écrit <sortie>/axe.txt et axe.json. */
const { chromium } = require('playwright');
const fs = require('node:fs'), http = require('node:http'), path = require('node:path');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..')), out = path.resolve(process.argv[2] || path.join(require('node:os').tmpdir(), 'lk-axe'));
fs.mkdirSync(out, { recursive: true });
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => { let n; try { n = decodeURIComponent(new URL(req.url, 'http://local').pathname); } catch { res.writeHead(400).end(); return; } if (n.endsWith('/')) n += 'index.html'; const file = path.join(root, n); if (file.startsWith(root) && fs.existsSync(file) && fs.statSync(file).isFile()) { res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' }); fs.createReadStream(file).pipe(res); } else { res.writeHead(404).end('introuvable'); } });
const GABARITS = ['index.html', 'calculateurs.html', 'tuto.html', 'carte.html', 'vehicules.html', 'vehicules/grotti-cheetah-classic.html', 'armes.html', 'armes/batte.html', 'lieux.html', 'lieux/vice-city.html', 'personnages.html', 'nourriture.html', 'achats.html', 'progression.html', 'carnets/garage.html', 'atelier-3d.html', 'missions.html', 'radios.html', 'radios/flash-fm.html', 'codes-de-triche.html', 'trophees.html', 'online.html', 'collectibles.html', 'a-propos.html', 'contact.html', 'mentions-legales.html'];
const NOUVELLES = ['presse.html', 'compagnon.html', 'hors-ligne.html', 'devine-le-lieu.html', 'verification.html', 'actus.html', 'videos.html', 'videos/trailer-2.html', 'editions.html'];
const CAS = [];
for (const p of [...GABARITS, ...NOUVELLES]) { for (const l of ['', 'de/']) CAS.push(l + p); }
for (const p of NOUVELLES) CAS.push('pt/' + p);
const WIDTHS = [390, 1280];
const lines = []; let serious = 0, minor = 0;
(async () => {
  await new Promise(r => server.listen(0, '127.0.0.1', r)); const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ ...(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {}), args: ['--no-sandbox', '--disable-background-networking'] });
  const report = { date: new Date().toISOString(), pages: [] };
  for (const w of WIDTHS) for (const url of CAS) {
    if (!fs.existsSync(path.join(root, url))) { lines.push('ABSENT ' + url); continue; }
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 700 ? 844 : 900 }, bypassCSP: true, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message));
    await p.goto(base + '/' + url, { waitUntil: 'load' }); await p.waitForTimeout(800);
    await p.addScriptTag({ content: axeSource });
    const r = await p.evaluate(async () => { const res = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }, resultTypes: ['violations'] }); return res.violations.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map(n => n.target.join(' ')) })); });
    const bad = r.filter(v => v.impact === 'serious' || v.impact === 'critical'), low = r.filter(v => !(v.impact === 'serious' || v.impact === 'critical'));
    serious += bad.length; minor += low.length;
    report.pages.push({ url, w, violations: r, errors });
    lines.push((bad.length || errors.length ? 'FAIL ' : 'PASS ') + url + ' @' + w + (bad.length ? ' — ' + bad.map(v => v.id + ' (' + v.impact + ') ' + v.nodes.join(' ; ')).join(' | ') : '') + (low.length ? ' — mineures : ' + low.map(v => v.id).join(', ') : '') + (errors.length ? ' — erreurs : ' + errors.join(' | ') : ''));
    await ctx.close();
  }
  await browser.close(); server.close();
  lines.push('', 'Violations sérieuses ou critiques : ' + serious + ' ; mineures ou modérées : ' + minor + ' ; cas : ' + CAS.length * WIDTHS.length);
  fs.writeFileSync(path.join(out, 'axe.txt'), lines.join('\n') + '\n'); fs.writeFileSync(path.join(out, 'axe.json'), JSON.stringify(report, null, 1));
  console.log(lines.filter(l => l.startsWith('FAIL') || l.startsWith('ABSENT')).join('\n')); console.log(lines[lines.length - 1]);
  process.exitCode = serious ? 1 : 0;
})().catch(e => { console.error(e); process.exit(2); });
