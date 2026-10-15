#!/usr/bin/env node
'use strict';
/* v7.88 : kit presse (presse/) : logo et icône en PNG (rendus depuis leurs SVG : presse/leonidakit-logo.svg,
   presse/leonidakit-logo-sombre.svg, tracés par outils/presse-logo.py ; presse/leonidakit-icone.svg, l'icône du site),
   captures du site (accueil, carte, calculateur, une fiche, l'accueil sur téléphone) et leurs aperçus (presse/apercu/,
   480 px, pour la page Presse), et l'archive qui rassemble le tout
   (presse/leonidakit-kit-presse.zip, octets identiques d'un rendu à l'autre si rien ne change). Écrit outils/presse.json :
   chaque fichier, son format, ses dimensions et son poids, lus par outils/gen-informations.cjs pour la page Presse.
   Rendu par Chromium (Playwright), lancé à la main après la régénération, comme outils/gen-partage.cjs :
     NODE_PATH=<dossier de playwright> node outils/gen-presse.cjs
     node outils/gen-presse.cjs --archive         (sans navigateur : archive et manifeste refaits, fichiers rendus gardés)
     node outils/gen-presse.cjs --verifier        (sans navigateur : code 1 si un fichier manque ou a changé) */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), zlib = require('node:zlib'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const DIR = 'presse';
const MANIFEST = path.join(ROOT, 'outils/presse.json');
/* fichiers rendus : depuis un SVG (fond transparent) ou capture d'une page du site */
const RENDUS = [
  { f: 'leonidakit-logo.png', svg: 'leonidakit-logo.svg', w: 2400, role: 'logo' },
  { f: 'leonidakit-logo-sombre.png', svg: 'leonidakit-logo-sombre.svg', w: 2400, role: 'logo-sombre' },
  { f: 'leonidakit-icone-512.png', svg: 'leonidakit-icone.svg', w: 512, role: 'icone' },
  { f: 'capture-accueil.jpg', page: 'index.html', w: 1440, h: 900, role: 'capture' },
  { f: 'capture-carte.jpg', page: 'carte.html', w: 1440, h: 900, role: 'capture', attente: 2500 },
  { f: 'capture-calculateur.jpg', page: 'calculateurs.html', w: 1440, h: 900, role: 'capture' },
  { f: 'capture-fiche.jpg', page: 'vehicules/grotti-cheetah-classic.html', w: 1440, h: 900, role: 'capture' },
  { f: 'capture-telephone.jpg', page: 'index.html', w: 390, h: 844, dpr: 2, role: 'capture' }
];
/* fichiers écrits à la main, repris tels quels dans l'archive */
const SOURCES = [
  { f: 'leonidakit-logo.svg', role: 'logo' },
  { f: 'leonidakit-logo-sombre.svg', role: 'logo-sombre' },
  { f: 'leonidakit-icone.svg', role: 'icone' }
];
const ZIP = 'leonidakit-kit-presse.zip';
const LISEZ_MOI = `Leonidakit — kit presse / press kit
https://www.leonidakit.com/presse.html

FR
Leonidakit est un site de fans consacré à GTA VI, édité par un particulier, indépendant de Rockstar Games et de
Take-Two Interactive. Ces fichiers se reprennent librement pour parler du site (article, vidéo, live, post), avec un lien
vers https://www.leonidakit.com.
- leonidakit-logo.svg / .png : logo pour fond clair (fond transparent).
- leonidakit-logo-sombre.svg / .png : logo pour fond sombre (fond transparent).
- leonidakit-icone.svg / -512.png : icône du site.
- capture-*.jpg : captures du site (en français). Les visuels du jeu qu'on y voit appartiennent à Rockstar Games : à
  créditer comme tels.
Merci de ne pas modifier le logo (couleurs, proportions) ni de suggérer un partenariat qui n'existe pas. Les visuels
officiels de GTA VI se prennent chez Rockstar Games, crédités « Rockstar Games ».
Contact : https://www.leonidakit.com/contact.html (motif « Presse ou partenariat »).

EN
Leonidakit is a GTA VI fan site run by an individual, independent of Rockstar Games and Take-Two Interactive. These files
may be used freely to talk about the site (article, video, stream, post), with a link to https://www.leonidakit.com.
- leonidakit-logo.svg / .png: logo for light backgrounds (transparent background).
- leonidakit-logo-sombre.svg / .png: logo for dark backgrounds (transparent background).
- leonidakit-icone.svg / -512.png: site icon.
- capture-*.jpg: screenshots of the site (in French). The game visuals shown in them belong to Rockstar Games: credit
  them as such.
Please do not alter the logo (colors, proportions) or suggest a partnership that does not exist. Official GTA VI visuals
should be taken from Rockstar Games and credited "Rockstar Games".
Contact: https://www.leonidakit.com/en/contact.html (reason "Press or partnership").
`;
const sha = b => crypto.createHash('sha256').update(b).digest('hex').slice(0, 16);
/* dimensions d'un PNG ou d'un JPEG, lues dans le fichier */
function dims(buf) {
  if (buf.slice(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1], len = buf.readUInt16BE(i + 2);
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { w: buf.readUInt16BE(i + 7), h: buf.readUInt16BE(i + 5) };
      i += 2 + len;
    }
  }
  return null;
}
function svgDims(s) { const m = s.match(/viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/); return m ? { w: Math.round(+m[3]), h: Math.round(+m[4]) } : null; }
/* archive ZIP sans dépendance (méthode « deflate », date fixe : mêmes fichiers, mêmes octets) */
function zip(entries) {
  const DOS_TIME = 0, DOS_DATE = ((2026 - 1980) << 9) | (10 << 5) | 12; /* 12 octobre 2026 */
  const local = [], central = []; let offset = 0;
  for (const { name, data } of entries) {
    const n = Buffer.from(name, 'utf8'), comp = zlib.deflateRawSync(data, { level: 9 }), crc = zlib.crc32(data);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8);
    h.writeUInt16LE(DOS_TIME, 10); h.writeUInt16LE(DOS_DATE, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(comp.length, 18); h.writeUInt32LE(data.length, 22); h.writeUInt16LE(n.length, 26); h.writeUInt16LE(0, 28);
    local.push(h, n, comp);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE((3 << 8) | 20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10);
    c.writeUInt16LE(DOS_TIME, 12); c.writeUInt16LE(DOS_DATE, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(comp.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE((0o100644 << 16) >>> 0, 38); c.writeUInt32LE(offset, 42);
    central.push(c, n);
    offset += 30 + n.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, cd, end]);
}
function readManifest() { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return null; } }
/* manifeste : un fichier = { f (chemin depuis la racine), role, format, w, h, octets, empreinte } */
function describe(rel, role) {
  const buf = fs.readFileSync(path.join(ROOT, rel)), ext = path.extname(rel).slice(1).toLowerCase();
  const d = ext === 'svg' ? svgDims(buf.toString('utf8')) : ext === 'zip' ? null : dims(buf);
  return { f: rel, role, format: ext === 'jpg' ? 'JPEG' : ext.toUpperCase(), ...(d ? { w: d.w, h: d.h } : {}), octets: buf.length, empreinte: sha(buf) };
}
function verify() {
  const M = readManifest(), bad = [];
  if (!M) return ['outils/presse.json absent'];
  for (const e of M.fichiers) {
    const p = path.join(ROOT, e.f);
    if (!fs.existsSync(p)) { bad.push(e.f + ' : absent'); continue; }
    if (sha(fs.readFileSync(p)) !== e.empreinte) bad.push(e.f + ' : changé depuis le rendu (relancer outils/gen-presse.cjs)');
  }
  for (const s of SOURCES) if (!M.fichiers.some(e => e.f === DIR + '/' + s.f)) bad.push(DIR + '/' + s.f + ' : absent du manifeste');
  return bad;
}
/* v7.88 : --archive refait seulement l'archive (mode d'emploi changé) et le manifeste, avec les fichiers rendus déjà là : les
   captures gardent leur date */
async function render(archiveOnly = process.argv.includes('--archive')) {
  const problems = [];
  if (!archiveOnly) await renderFiles(problems);
  finish(problems);
}
async function renderFiles(problems) {
  const { chromium } = require('playwright');
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
  const server = http.createServer((req, res) => {
    let u = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (u.endsWith('/')) u += 'index.html';
    if (u === '/_svg.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(server.page); return; }
    const f = path.join(ROOT, u); if (!f.startsWith(ROOT + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {});
  try {
    for (const r of RENDUS) {
      const out = path.join(ROOT, DIR, r.f);
      if (r.svg) {
        const svg = fs.readFileSync(path.join(ROOT, DIR, r.svg), 'utf8'), d = svgDims(svg), h = Math.round(r.w * d.h / d.w);
        const ctx = await browser.newContext({ viewport: { width: r.w, height: h }, deviceScaleFactor: 1 });
        const p = await ctx.newPage();
        server.page = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}img{display:block;width:${r.w}px;height:${h}px}</style></head><body><img src="/${DIR}/${r.svg}" alt=""></body></html>`;
        await p.goto(base + '/_svg.html', { waitUntil: 'networkidle' });
        await p.screenshot({ path: out, type: 'png', omitBackground: true });
        await ctx.close();
      } else {
        const ctx = await browser.newContext({ viewport: { width: r.w, height: r.h }, deviceScaleFactor: r.dpr || 1, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' });
        const p = await ctx.newPage(), errors = [];
        p.on('pageerror', e => errors.push(String(e)));
        await p.goto(base + '/' + r.page, { waitUntil: 'networkidle' });
        await p.evaluate(() => document.fonts.ready);
        await p.waitForTimeout(r.attente || 800);
        if (errors.length) problems.push(r.page + ' : ' + errors.join(' | '));
        await p.screenshot({ path: out, type: 'jpeg', quality: 82 });
        await ctx.close();
      }
    }
    /* aperçus des captures pour la page Presse (480 px de large, JPEG) : presse/apercu/<capture>-480.jpg */
    fs.mkdirSync(path.join(ROOT, DIR, 'apercu'), { recursive: true });
    for (const r of RENDUS.filter(x => x.page)) {
      const big = dims(fs.readFileSync(path.join(ROOT, DIR, r.f))), w = 480, h = Math.round(w * big.h / big.w);
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
      const p = await ctx.newPage();
      server.page = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0}img{display:block;width:${w}px;height:${h}px}</style></head><body><img src="/${DIR}/${r.f}" alt=""></body></html>`;
      await p.goto(base + '/_svg.html', { waitUntil: 'networkidle' });
      await p.screenshot({ path: path.join(ROOT, DIR, 'apercu', r.f.replace(/\.jpg$/, '-480.jpg')), type: 'jpeg', quality: 80 });
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
}
function finish(problems) {
  /* archive : le mode d'emploi puis les fichiers, dans un ordre fixe */
  const files = [...SOURCES.map(s => s.f), ...RENDUS.map(r => r.f)];
  const entries = [{ name: 'LISEZ-MOI.txt', data: Buffer.from(LISEZ_MOI, 'utf8') }, ...files.map(f => ({ name: f, data: fs.readFileSync(path.join(ROOT, DIR, f)) }))];
  fs.writeFileSync(path.join(ROOT, DIR, ZIP), zip(entries));
  const M = {
    _note: 'v7.88 : fichiers du kit presse (presse/), écrits par outils/gen-presse.cjs. Ne pas modifier à la main.',
    fichiers: [...SOURCES.map(s => describe(DIR + '/' + s.f, s.role)), ...RENDUS.map(r => ({ ...describe(DIR + '/' + r.f, r.role), ...(r.page ? { page: r.page } : {}) })),
      ...RENDUS.filter(r => r.page).map(r => describe(DIR + '/apercu/' + r.f.replace(/\.jpg$/, '-480.jpg'), 'apercu')), describe(DIR + '/' + ZIP, 'archive')]
  };
  fs.writeFileSync(MANIFEST, JSON.stringify(M, null, 1) + '\n');
  console.log('Kit presse : ' + M.fichiers.length + ' fichiers, archive de ' + Math.round(M.fichiers.at(-1).octets / 1024) + ' Ko' + (problems.length ? '\n- ' + problems.join('\n- ') : ''));
  if (problems.length) process.exitCode = 1;
}
module.exports = { RENDUS, SOURCES, ZIP, readManifest, verify, zip, dims };
if (require.main === module) {
  if (process.argv.includes('--verifier')) { const bad = verify(); console.log(bad.length ? bad.join('\n') : 'Kit presse à jour.'); process.exitCode = bad.length ? 1 : 0; }
  else render().catch(e => { console.error(e); process.exitCode = 1; });
}
