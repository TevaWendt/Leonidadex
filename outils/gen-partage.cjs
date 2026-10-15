#!/usr/bin/env node
'use strict';
/* v7.88 : images de partage (1200 × 630, JPEG) des pages principales, une par langue publiée : le titre de la page (sa
   balise <title>, sans « | Leonidakit »), un visuel officiel de Rockstar crédité, la marque et l'adresse du site. Ce sont
   elles qu'affichent WhatsApp, Discord, X, Facebook, LinkedIn ou Reddit quand on colle l'adresse d'une page.
   Rendu par Chromium (Playwright) depuis un gabarit HTML aux polices du site ; lancé à la main après la régénération
   (Chromium n'est pas une dépendance du site) :
     NODE_PATH=<dossier de playwright> node outils/gen-partage.cjs            (rend ce qui manque ou a changé)
     NODE_PATH=… node outils/gen-partage.cjs --tout                            (rend tout)
     node outils/gen-partage.cjs --verifier                                    (sans navigateur : code 1 si une image manque
                                                                                 ou si le titre de sa page a changé)
   puis outils/sync-site.cjs. Écrit img/partage/<langue>/<page>.jpg et outils/partage.json : pour chaque page et chaque
   langue, le titre rendu, l'image et son empreinte.
   outils/langues.cjs (appelé par sync-site) pose, devant l'image de partage d'avant (pages françaises et traduites) :
     og:image (l'image de partage, ?v=empreinte), og:image:width, og:image:height, og:image:alt (le titre) ;
   l'image d'avant reste en seconde og:image (le plan du site la reprend pour Google Images). Seulement si le titre de la
   page est encore celui de l'image : un titre changé garde l'image d'avant jusqu'au prochain rendu. */
const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const SITE = 'https://www.leonidakit.com';
const W = 1200, H = 630, QUALITY = 84;
/* change quand le gabarit change : toutes les images sont alors rendues de nouveau */
const TEMPLATE_VERSION = 3; /* 3 : petits mots de liaison liés au mot suivant (titleHtml), si le titre garde sa taille */
/* pages et visuels officiels (outils/medias-officiels.json) ; cadrage du visuel dans le panneau de droite */
const PAGES = [
  ['index.html', 'jason-and-lucia-01', '50% 40%'],
  ['calculateurs.html', 'ptt-youngin-illegal-goods-store', '50% 50%'],
  ['carte.html', 'carte-postale-vice-city', '50% 50%'],
  ['vehicules.html', '95-grotti-cheetah-01', '62% 50%'],
  ['vehicules-rares.html', 'classic-car-collection-01', '50% 50%'],
  ['armes.html', 'hawk-little-morgan-revolvers-01', '50% 50%'],
  ['lieux.html', 'vice-city-01', '50% 50%'],
  ['personnages.html', 'lucia-caminos-01', '50% 30%'],
  ['entreprises.html', 'electric-fang-tattoo-01', '50% 50%'],
  ['demeures.html', 'leonida-keys-02', '50% 50%'],
  ['planques.html', 'jason-s-safehouse-vehicles', '50% 50%'],
  ['gangs.html', 'real-dimez-01', '50% 35%'],
  ['animaux.html', 'grassrivers-03', '50% 50%'],
  ['missions.html', 'trailer-2-lucia-pm', '50% 40%'],
  ['activites.html', 'trailer-2-seashark-141', '50% 50%'],
  ['radios.html', 'real-dimez-04', '50% 40%'],
  ['codes-de-triche.html', 'trailer-1-tropic-011', '50% 50%'],
  ['trophees.html', 'jason-duval-03', '50% 35%'],
  ['online.html', 'jason-and-lucia-05', '50% 40%'],
  ['collectibles.html', 'vintage-vice-city-pack-01', '50% 50%'],
  ['achats.html', 'stock-305-clothing-store-01', '50% 50%'],
  ['atelier-3d.html', 'rideout-customs-mod-shop-01', '50% 50%'],
  ['progression.html', 'mount-kalaga-national-park-02', '50% 50%'],
  ['verification.html', 'cover-art-officielle', '50% 30%'],
  ['actus.html', 'affiche-trailer-2', '50% 35%'],
  ['videos.html', 'affiche-extended-look', '50% 35%'],
  ['editions.html', 'ultimate-edition-02', '50% 50%'],
  ['presse.html', 'artwork-jason-lucia-beach', '50% 40%'],
  ['compagnon.html', 'jason-and-lucia-02', '50% 40%'] /* assemblage v7.91 : Mode compagnon (lot 5) */,
  ['devine-le-lieu.html', 'vice-city-09', '50% 50%'] /* assemblage v7.91 : jeu « Devine le lieu » (lot 6) */
];
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
const langs = (root = ROOT) => [{ code: 'fr', dossier: '' }, ...JSON.parse(fs.readFileSync(path.join(root, 'outils/langues.json'), 'utf8')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr').map(l => ({ code: l.code, dossier: l.dossier }))];
/* titre tel qu'il s'écrit sur l'image : entités décodées, césures invisibles retirées, sans la marque, espaces normalisés
   (les espaces insécables de la typographie française restent) */
const cleanTitle = t => String(t).replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, '’').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/­/g, '').replace(/[ \t\n\r]*\|[ \t\n\r]*Leonidakit[ \t\n\r]*$/, '').replace(/[ \t\n\r]+/g, ' ').replace(/^ | $/g, '');
const titleIn = html => { const m = String(html).match(/<title>([^<]*)<\/title>/); return m ? cleanTitle(m[1]) : null; };
function titleOf(file, root = ROOT) { const f = path.join(root, file); return fs.existsSync(f) ? titleIn(fs.readFileSync(f, 'utf8')) : null; }
function plan(root = ROOT) {
  const MED = JSON.parse(fs.readFileSync(path.join(root, 'outils/medias-officiels.json'), 'utf8')), out = [];
  for (const [page, media, pos] of PAGES) {
    const m = MED[media]; if (!m) throw new Error('visuel inconnu pour ' + page + ' : ' + media);
    const v = m.variants.find(x => x.w >= 1200) || m.variants[m.variants.length - 1];
    for (const l of langs(root)) {
      const file = (l.dossier ? l.dossier + '/' : '') + page, title = titleOf(file, root);
      if (!title) continue;
      const img = 'img/partage/' + l.code + '/' + page.replace(/\.html$/, '.jpg');
      out.push({ page, lang: l.code, file, title, media, src: v.src, pos, credit: 'Rockstar Games', img, key: sha([title, media, v.src, pos, TEMPLATE_VERSION].join('|')) });
    }
  }
  return out;
}
/* titre de l'image : « GTA 6 » jamais coupé ; un tiret reste en fin de ligne. Version « liée » : un petit mot de liaison
   (article, préposition, conjonction : « la », « de », « et », « the », « und », « di », « y »…) reste avec le mot qui le
   suit, pour qu'aucune ligne ne finisse sur lui (« Actualités GTA 6 : la / chronologie » devient « … : / la chronologie »),
   et un dernier mot de quatre lettres au plus ne reste pas seul sur la dernière ligne (« business / plan »). fit() garde la
   version liée, sauf si elle fait perdre plus de 6 px au titre par rapport à la version libre (« Die Nebenaktivitäten »,
   « and walkthroughs » : des blocs trop longs pour la largeur). */
const LIAISON = new Set(('à a y au aux de du des d l le la les un une et ou en par sur ' /* français */
  + 'an the of in on at to and or by for ' /* anglais */
  + 'al del el las los lo una e o con por su sus ' /* espagnol */
  + 'ad ai il gli i uno di dei ed da per ' /* italien */
  + 'der die das den dem des ein und von zu im am mit für').split(/\s+/)); /* allemand */
/* portugais (à venir) : ses petits mots ne valent que pour un titre portugais (« do », « no », « as », « dos » ont un autre
   sens en anglais ou en espagnol) ; rien ne change pour les cinq langues publiées */
const LIAISON_PT = new Set('a o e as os ao à da do das dos na no nas nos em um uma com de por para'.split(' '));
const titleHtml = (t, lie = true, lang = '') => {
  const small = lang === 'pt' ? LIAISON_PT : LIAISON;
  let h = esc(t).replace(/ ([–—]) /g, '\u00a0$1 ');
  if (lie) {
    h = h.replace(/(?<=^|[\s\u00a0(«“„])(\p{L}{1,3}) (?=\S)/gu, (m, w) => small.has(w.toLowerCase()) ? w + '\u00a0' : m);
    h = h.replace(/ (\p{L}{1,4}[.!?)»”]?)$/u, '\u00a0$1');
  }
  /* un mot composé court ne se coupe pas au trait d'union (« one- / off ») ; un long, si (« Fortschritts- / Tracker ») */
  h = h.replace(/(?<![\p{L}\p{N}-])(?!GTA-)[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)+(?![\p{L}\p{N}-])/gu, m => m.length <= 12 ? '<span class="nw">' + m + '</span>' : m);
  return h.replace(/\bGTA[ \u00a0-](?:6|VI|V|Online)\b(?:-[\p{L}]+)?/gu, m => '<span class="nw">' + m + '</span>');
};
function template(x) {
  return `<!doctype html><html lang="${x.lang}"><head><meta charset="utf-8"><style>
@font-face{font-family:'Archivo';font-weight:100 900;src:url(/fonts/archivo-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+2000-206F,U+20AC,U+2122;}
@font-face{font-family:'Archivo';font-weight:100 900;src:url(/fonts/archivo-latin-ext.woff2) format('woff2');unicode-range:U+0100-0130,U+0132-0151,U+0154-02BA,U+1E00-1E9F;}
:root{--paper:#FDFBF7;--ink:#1A1A1E;--amber:#F5A524;--coral:#B93220;}
*{box-sizing:border-box;margin:0}html,body{width:${W}px;height:${H}px;overflow:hidden;background:var(--paper)}
.card{position:relative;width:${W}px;height:${H}px;font-family:'Archivo',sans-serif;color:var(--ink)}
.pic{position:absolute;top:0;right:0;width:560px;height:${H}px;clip-path:polygon(90px 0,100% 0,100% 100%,0 100%);overflow:hidden;background:#222}
.pic img{width:100%;height:100%;object-fit:cover;object-position:${x.pos}}
.pic::after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 70%,rgba(0,0,0,.45))}
.credit{position:absolute;right:18px;bottom:14px;z-index:2;color:rgba(253,251,247,.88);font:600 15px/1 'Archivo',sans-serif}
.sun{position:absolute;left:560px;top:-120px;width:300px;height:300px;border-radius:50%;background:var(--amber)}
.brand{position:absolute;left:64px;top:56px;font:900 40px/1 'Archivo',sans-serif;letter-spacing:-.03em}.brand span{color:var(--coral)}
h1{position:absolute;left:64px;top:140px;width:560px;height:350px;display:flex;align-items:center;font:900 var(--fs,74px)/1.04 'Archivo',sans-serif;letter-spacing:-.03em;word-spacing:.06em;overflow-wrap:normal;hyphens:manual}
h1>span{display:block;width:100%;text-wrap:balance}.nw{white-space:nowrap}
.stripes{position:absolute;left:0;width:640px;bottom:62px;height:30px;background:repeating-linear-gradient(180deg,var(--ink) 0 5px,transparent 5px 10px)}
.url{position:absolute;left:0;bottom:0;width:640px;height:62px;background:var(--ink);color:var(--paper);display:flex;align-items:center;padding-left:66px;font:700 26px/1 'Archivo',sans-serif}
</style></head><body><div class="card">
<div class="sun"></div>
<div class="pic"><img src="${esc(x.src)}" alt=""><span class="credit">© ${esc(x.credit)}</span></div>
<p class="brand">Leonida<span>kit</span></p>
<h1><span id="t">${titleHtml(x.title, true, x.lang)}</span></h1><template id="libre">${titleHtml(x.title, false, x.lang)}</template>
<div class="stripes"></div><div class="url">leonidakit.com</div>
</div><script>
/* appelé une fois la police chargée : le titre tient dans 560 × 350 px sans couper de mot (la boîte du texte lui-même,
   débordement compris) ; la taille descend de 74 à 40 px. Les deux versions du titre (liée, libre) sont essayées : la
   liée reste si elle garde une taille à 6 px près de la libre. */
window.fit=()=>{
 const t=document.getElementById('t'),h=t.parentElement,box=h.getBoundingClientRect();
 const fits=()=>{const r=document.createRange();r.selectNodeContents(t);const b=r.getBoundingClientRect();return b.left>=box.left-1&&b.right<=box.right+1&&b.height<=box.height;};
 const size=()=>{let fs=74;h.style.setProperty('--fs',fs+'px');while(!fits()&&fs>40){fs-=2;h.style.setProperty('--fs',fs+'px');}return {fs,ok:fits()};};
 const lie=t.innerHTML,a=size();t.innerHTML=document.getElementById('libre').innerHTML;const b=size();
 if(a.ok&&a.fs>=b.fs-6){t.innerHTML=lie;h.style.setProperty('--fs',a.fs+'px');return {fs:a.fs,ok:fits(),lie:true};}
 return {fs:b.fs,ok:b.ok,lie:false};
};
</script></body></html>`;
}
/* ---------- manifeste (outils/partage.json) ---------- */
const cache = new Map();
function readManifest(root = ROOT) {
  const f = path.join(root, 'outils/partage.json');
  let st = null; try { st = fs.statSync(f); } catch { return { _note: '', pages: {} }; }
  const c = cache.get(f); if (c && c.mtime === st.mtimeMs && c.size === st.size) return c.m;
  const m = JSON.parse(fs.readFileSync(f, 'utf8')); cache.set(f, { mtime: st.mtimeMs, size: st.size, m }); return m;
}
function verify(root = ROOT) {
  const M = readManifest(root), bad = [];
  for (const x of plan(root)) {
    const e = M.pages[x.page] && M.pages[x.page][x.lang];
    if (!e || !fs.existsSync(path.join(root, x.img))) bad.push(x.file + ' : image de partage absente');
    else if (e.title !== x.title || e.key !== x.key) bad.push(x.file + ' : titre ou visuel changé depuis le rendu de l’image de partage');
  }
  return bad;
}
/* ---------- balises des pages ---------- */
/* retire ce que applyMeta a posé, et seulement cela : la balise og:image de img/partage/ et les trois propriétés qui la
   suivent (largeur, hauteur, texte alternatif) ; une autre og:image:… (posée ailleurs) reste. La page revient à son image
   d'avant. */
const strip = html => String(html).replace(/<meta property="og:image" content="https:\/\/www\.leonidakit\.com\/img\/partage\/[^"]*">\n(?:<meta property="og:image:(?:width|height)" content="\d+">\n){2}<meta property="og:image:alt" content="[^"]*">\n/g, '');
/* page = nom de la page française (« carte.html »), lang = code de la langue de cette version */
function applyMeta(html, page, lang, root = ROOT) {
  const s = strip(html), M = readManifest(root), e = M.pages && M.pages[page] && M.pages[page][lang];
  if (!e || e.title !== titleIn(s) || !fs.existsSync(path.join(root, e.img.replace(/^\//, '')))) return s;
  const size = M.taille || { w: W, h: H };
  const block = '<meta property="og:image" content="' + SITE + e.img + '?v=' + e.key + '">\n<meta property="og:image:width" content="' + size.w + '">\n<meta property="og:image:height" content="' + size.h + '">\n<meta property="og:image:alt" content="' + esc(e.title) + '">\n';
  const first = s.search(/<meta property="og:image" content="/);
  return first >= 0 ? s.slice(0, first) + block + s.slice(first) : s.replace('</head>', block + '</head>');
}
/* ---------- rendu ---------- */
async function render(all, root = ROOT) {
  const { chromium } = require('playwright');
  const items = plan(root), M = JSON.parse(JSON.stringify(readManifest(root)));
  M.pages = M.pages || {};
  const todo = items.filter(x => all || !(M.pages[x.page] && M.pages[x.page][x.lang] && M.pages[x.page][x.lang].key === x.key && fs.existsSync(path.join(root, x.img))));
  const types = { '.woff2': 'font/woff2', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (u === '/_partage.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(server.page); return; }
    const f = path.join(root, u); if (!f.startsWith(root + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const browser = await chromium.launch(process.env.LK_CHROMIUM ? { executablePath: process.env.LK_CHROMIUM } : {});
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const problems = [];
  try {
    for (const x of todo) {
      server.page = template(x);
      await p.goto('http://127.0.0.1:' + server.address().port + '/_partage.html', { waitUntil: 'networkidle' });
      const st = await p.evaluate(async () => {
        await document.fonts.load('900 74px Archivo'); await document.fonts.ready;
        const font = document.fonts.check('900 74px Archivo'), f = window.fit();
        return { ok: f.ok, fs: f.fs, img: document.querySelector('.pic img').naturalWidth > 0, font };
      });
      if (!st.ok) problems.push(x.file + ' : titre trop long pour l’image');
      if (!st.img) problems.push(x.file + ' : visuel non chargé (' + x.src + ')');
      if (!st.font) problems.push(x.file + ' : police non chargée');
      if (!st.img || !st.font) continue;
      fs.mkdirSync(path.dirname(path.join(root, x.img)), { recursive: true });
      await p.screenshot({ path: path.join(root, x.img), type: 'jpeg', quality: QUALITY });
      (M.pages[x.page] = M.pages[x.page] || {})[x.lang] = { title: x.title, img: '/' + x.img, media: x.media, key: x.key };
    }
  } finally { await browser.close(); server.close(); }
  /* pages ou langues retirées de la liste : leurs images et leurs entrées disparaissent */
  const keep = new Set(items.map(x => x.page + '|' + x.lang));
  for (const pg of Object.keys(M.pages)) {
    for (const lg of Object.keys(M.pages[pg])) if (!keep.has(pg + '|' + lg)) { fs.rmSync(path.join(root, M.pages[pg][lg].img.slice(1)), { force: true }); delete M.pages[pg][lg]; }
    if (!Object.keys(M.pages[pg]).length) delete M.pages[pg];
  }
  const sorted = {}; for (const pg of PAGES.map(x => x[0])) if (M.pages[pg]) { sorted[pg] = {}; for (const l of langs(root)) if (M.pages[pg][l.code]) sorted[pg][l.code] = M.pages[pg][l.code]; }
  const out = { _note: 'v7.88 : images de partage écrites par outils/gen-partage.cjs (1200 × 630, JPEG). Ne pas modifier à la main.', taille: { w: W, h: H }, pages: sorted };
  fs.writeFileSync(path.join(root, 'outils/partage.json'), JSON.stringify(out, null, 1) + '\n');
  console.log('Images de partage : ' + todo.length + ' rendue(s) sur ' + items.length + (problems.length ? '\n- ' + problems.join('\n- ') : ''));
  if (problems.length) process.exitCode = 1;
}
module.exports = { PAGES, W, H, plan, verify, strip, applyMeta, template, titleHtml, cleanTitle, titleIn, readManifest };
if (require.main === module) {
  if (process.argv.includes('--verifier')) { const bad = verify(); console.log(bad.length ? bad.join('\n') : 'Images de partage à jour.'); process.exitCode = bad.length ? 1 : 0; }
  else render(process.argv.includes('--tout')).catch(e => { console.error(e); process.exitCode = 1; });
}
