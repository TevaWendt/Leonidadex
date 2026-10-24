#!/usr/bin/env node
'use strict';
/* v8.07 (carte mobile, demande de Téva du 24/10/2026 : « une carte mobile et une carte pour PC, plus de détails sur PC »).
   Fabrique, pour chaque langue publiée, l’image légère du fond de la carte affichée au doigt pendant un glisser ou un pincer
   (img/carte/fond-mobile-<code>.webp, 2 080 × 2 400 px, 0,4 pixel par unité de carte) : le fond vectoriel de <langue>/carte.html
   (1 583 tracés) était retracé à chaque image du geste, la carte devenait presque inutilisable sur un téléphone moyen.
   L’image reprend exactement le fond affiché au doigt à l’arrêt : calques par défaut (grille cachée), sans ombre de côte ni
   vagues (retirées au doigt par carte-page.css), textes de la langue (légende, comtés). Rendue par Chromium (Playwright), donc
   lancée à la main, jamais par le site ni par Vercel : seulement quand le fond de carte.html ou ses traductions changent.
   outils/carte-mobile.json garde l’empreinte du fond de chaque langue et de chaque image ; carte.html porte la version
   (data-fond-v sur #map-stage) qui sert d’empreinte ?v= au navigateur. Le test carte-mobile-v807 échoue si le fond a changé
   sans que les images aient été refaites.
   Usage : NODE_PATH=<dossier avec playwright>/node_modules node outils/carte-mobile.cjs   (puis node outils/sync-site.cjs) */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const OUT_W = 2080, OUT_H = 2400, QUALITY = 0.82;
const JSON_PATH = path.join(__dirname, 'carte-mobile.json');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

function langues(root = ROOT) {
  const cfg = JSON.parse(fs.readFileSync(path.join(root, 'outils/langues.json'), 'utf8'));
  return cfg.langues.filter(l => l.etat === 'publiee').map(l => ({ code: l.code, dossier: l.code === cfg.source ? '' : l.dossier }));
}
/* le <svg class="map-bg"> d’une page carte.html */
function fondDe(html) {
  const i = html.indexOf('<svg class="map-bg"'); if (i < 0) throw new Error('carte.html : <svg class="map-bg"> introuvable');
  const j = html.indexOf('</svg>', i); return html.slice(i, j + 6);
}
/* le fond tel qu’il s’affiche au doigt : grille retirée (calque décoché par défaut), ombre de côte et vagues retirées */
function fondLeger(svg) {
  let s = svg.replace('<g filter="url(#shore)">', '<g>');
  s = s.replace(/<rect width="5200" height="6000" fill="url\(#waves\)"\/>/, '');
  /* calques de grille : deux groupes <g class="lyr-grid" …> … </g> sans groupe imbriqué */
  s = s.replace(/<g class="lyr-grid"[^>]*>[\s\S]*?<\/g>/g, '');
  if (s.includes('lyr-grid') || s.includes('url(#shore)') || s.includes('fill="url(#waves)"')) throw new Error('fond léger : un calque n’a pas pu être retiré');
  return s;
}
function etat(root = ROOT) {
  return langues(root).map(l => { const f = path.join(root, l.dossier, 'carte.html'); const leger = fondLeger(fondDe(fs.readFileSync(f, 'utf8'))); return { code: l.code, page: path.relative(root, f), fond: sha(leger).slice(0, 16), leger }; });
}
const versionDe = list => sha(list.map(x => x.code + ':' + x.fond + ':' + x.image).join('|')).slice(0, 12);

async function generer(root = ROOT) {
  const { chromium } = require('playwright');
  const font = f => 'data:font/woff2;base64,' + fs.readFileSync(path.join(root, 'fonts', f)).toString('base64');
  const css = '@font-face{font-family:Archivo;font-weight:100 900;src:url(' + font('archivo-latin.woff2') + ') format("woff2");unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F;}'
    + '@font-face{font-family:Archivo;font-weight:100 900;src:url(' + font('archivo-latin-ext.woff2') + ') format("woff2");unicode-range:U+0100-0130,U+0132-0151,U+0154-02BA,U+1E00-1EFF;}'
    + 'html,body{margin:0;padding:0;background:#3F8DBF;}svg{display:block;width:' + OUT_W + 'px;height:' + OUT_H + 'px;}';
  const dir = path.join(root, 'img/carte'); fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch(), page = await browser.newPage({ viewport: { width: OUT_W, height: OUT_H }, deviceScaleFactor: 1 });
  const list = [];
  try {
    for (const l of etat(root)) {
      await page.setContent('<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' + l.leger + '</body></html>');
      await page.evaluate(() => document.fonts.ready);
      const png = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: OUT_W, height: OUT_H } });
      /* encodage WebP par le navigateur (canvas), sans dépendance de plus */
      const b64 = await page.evaluate(async ({ src, q }) => { const img = new Image(); img.src = src; await img.decode(); const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); return c.toDataURL('image/webp', q).split(',')[1]; }, { src: 'data:image/png;base64,' + png.toString('base64'), q: QUALITY });
      const buf = Buffer.from(b64, 'base64'), file = path.join(dir, 'fond-mobile-' + l.code + '.webp');
      fs.writeFileSync(file, buf);
      list.push({ code: l.code, page: l.page, fond: l.fond, image: sha(buf).slice(0, 16), fichier: path.relative(root, file), octets: buf.length });
      console.log('fond mobile ' + l.code + ' : ' + Math.round(buf.length / 1024) + ' Kio');
    }
  } finally { await browser.close(); }
  const version = versionDe(list);
  fs.writeFileSync(JSON_PATH, JSON.stringify({ _note: 'Écrit par outils/carte-mobile.cjs (v8.07) : empreinte du fond léger de chaque langue et de son image. À refaire quand le fond de carte.html ou ses traductions changent.', largeur: OUT_W, hauteur: OUT_H, version, langues: list }, null, 1) + '\n');
  /* la version, empreinte ?v= de l’image, dans carte.html (copiée telle quelle dans les traductions par outils/langues.cjs) */
  const fr = path.join(root, 'carte.html'), html = fs.readFileSync(fr, 'utf8');
  const next = html.replace(/<div class="map-stage" id="map-stage"(?: data-fond-v="[a-f0-9]*")?>/, '<div class="map-stage" id="map-stage" data-fond-v="' + version + '">');
  if (next === html && !html.includes('data-fond-v="' + version + '"')) throw new Error('carte.html : #map-stage introuvable');
  if (next !== html) fs.writeFileSync(fr, next);
  console.log('version ' + version + ' (carte.html, outils/carte-mobile.json). Lancer ensuite node outils/sync-site.cjs.');
  return { version, list };
}

module.exports = { fondDe, fondLeger, etat, versionDe, langues, OUT_W, OUT_H, JSON_PATH };
if (require.main === module) generer().catch(e => { console.error(e); process.exit(1); });
