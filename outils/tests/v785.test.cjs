'use strict';
/* v7.85 (11 octobre 2026) — latence, deuxième passe, sans changement visuel ; vérification des langues.
   Latence : une seule copie de carnets-core.js sur les fiches d'armes (la v7.73 en ajoutait une à chaque régénération : 17),
   aucune page avec un script ou une feuille en double ; liste des images (assets-manifest.js) gardée devant common.js ; images des fiches plein écran de Missions différées puis préchargées une fois la page chargée ; aucune
   image non différée dans un details fermé ; régions de Lieux différées ; sections éditoriales en content-visibility ;
   galerie des fiches : la variante 800 px reste dans le srcset (plus de second téléchargement en 1 280 px).
   Langues : valeurs des listes de suggestions (datalist) traduites, titres de carte portés par le localisateur des armes
   traduits en entier, aria-valuetext et data-pf-name traduits, recherche de l'Atelier sur le texte affiché, sans clé
   française dans la page. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const L = require(path.join(root, 'outils/langues.cjs')), cfg = L.config(root);
const LANGS = cfg.langues.filter(l => l.etat === 'publiee' && l.code !== cfg.source);
const { frenchHits: frOnly, foreignHits } = require('./langues-helper.cjs');
const hitsOf = (t, code) => code === 'de' ? foreignHits(t, code) : frOnly(t, code);
const SKIP = new Set(['.git', 'outils', 'node_modules', 'img', 'photos', 'fonts', 'vendor', 'atelier', 'leo']);
function pages(dir = '') { const out = []; for (const f of fs.readdirSync(path.join(root, dir))) { const rel = dir ? dir + '/' + f : f; const st = fs.statSync(path.join(root, rel)); if (st.isDirectory()) { if (!SKIP.has(f)) out.push(...pages(rel)); } else if (f.endsWith('.html')) out.push(rel); } return out; }
const ALL = pages();
const scriptsOf = h => [...h.matchAll(/<script[^>]*\ssrc="([^"]+)"/g)].map(m => m[1].replace(/\?v=[a-f0-9]+/, ''));

test('scripts et feuilles : aucune page ne charge deux fois le même fichier ; une seule copie de carnets-core.js sur chaque fiche d’arme (cinq langues)', () => {
  const bad = [];
  for (const p of ALL) {
    const h = read(p), seen = new Map();
    for (const s of scriptsOf(h).concat([...h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(m => m[1].replace(/\?v=[a-f0-9]+/, '')))) seen.set(s, (seen.get(s) || 0) + 1);
    for (const [s, n] of seen) if (n > 1) bad.push(p + ' : ' + s + ' ×' + n);
  }
  assert.deepEqual(bad.slice(0, 10), []);
  /* v7.91 : dossiers des langues lus dans outils/langues.json (portugais compris) */
  const armes = ALL.filter(p => new RegExp('^(?:(?:' + LANGS.map(l => l.dossier).join('|') + ')/)?armes/[^/]+\\.html$').test(p) && !/http-equiv="refresh"/i.test(read(p)));
  assert.ok(armes.length >= 27 * (LANGS.length + 1), 'fiches d’armes : ' + armes.length);
  for (const p of armes) assert.equal((read(p).match(/carnets-core\.js/g) || []).length, 1, p);
  /* le générateur retire toutes les copies avant d'en poser une */
  assert.match(read('outils/gen-armes.cjs'), /carnets-core\\\.js\[\^"\]\*"><\\\/script>\\n\?\/g,''\)/);
});

test('assets-manifest.js : devant common.js sur chaque page qui charge common.js (gardé : il laisse le premier rendu passer avant common.js)', () => {
  let n = 0;
  for (const p of ALL) {
    const h = read(p); if (!/<script[^>]*src="[^"]*common\.js/.test(h)) continue;
    const s = scriptsOf(h), i = s.findIndex(x => /assets-manifest\.js$/.test(x)), j = s.findIndex(x => /common\.js$/.test(x));
    assert.ok(i >= 0 && i < j, p + ' : liste des images devant common.js'); n++;
  }
  assert.ok(n > 2000, 'pages : ' + n);
  assert.match(read('outils/sync-site.cjs'), /v7\.85 : la liste des images \(assets-manifest\.js\) reste devant common\.js/);
});

test('images : aucune image non différée dans un details fermé (téléchargée pour rien au chargement) ; Missions : images des fiches plein écran différées et préchargées après le chargement ; Lieux : régions différées', () => {
  const bad = [];
  for (const p of ALL.filter(p => !new RegExp('^(?:' + LANGS.map(l => l.dossier).join('|') + ')/').test(p))) {
    const h = read(p);
    for (const m of h.matchAll(/<details(?![^>]*\sopen)[^>]*>([\s\S]*?)<\/details>/g)) {
      const inner = m[1].replace(/<summary[\s\S]*?<\/summary>/, '');
      for (const img of inner.matchAll(/<img\b[^>]*>/g)) if (!/loading="lazy"/.test(img[0])) bad.push(p + ' : ' + img[0].slice(0, 90));
    }
  }
  assert.deepEqual(bad.slice(0, 8), []);
  const mi = read('missions.html'), sheets = [...mi.matchAll(/<div class="lkx-sheet-src">[\s\S]*?<\/figure>/g)].map(m => m[0]);
  assert.ok(sheets.length >= 10, 'fiches plein écran : ' + sheets.length);
  for (const s of sheets) for (const img of s.matchAll(/<img\b[^>]*>/g)) { assert.match(img[0], /loading="lazy"/); assert.match(img[0], /data-lkx-pre/); }
  const js = read('lk-sections.js');
  assert.match(js, /img\[data-lkx-pre\]\[loading="lazy"\]/); assert.match(js, /saveData/); assert.match(js, /requestIdleCallback/);
  /* la fiche ouverte rend toujours ses images immédiates */
  assert.match(js, /img\[loading="lazy"\]'\), function \(im\) \{ im\.loading = 'eager'; \}/);
  const li = read('lieux.html'), reg = [...li.matchAll(/<div class="mo-reg-media"><img\b[^>]*>/g)].map(m => m[0]);
  assert.ok(reg.length >= 6); for (const r of reg) assert.match(r, /loading="lazy"/);
});

test('sections éditoriales : content-visibility avec une taille réservée (téléphone et ordinateur) ; aucun élément en position fixe à l’intérieur', () => {
  const css = read('style.css');
  assert.match(css, /\.ed-zone>\.ed\{content-visibility:auto;contain-intrinsic-size:auto 1000px;\}/);
  assert.match(css, /@media \(min-width:900px\)\{\.ed-zone>\.ed\{contain-intrinsic-size:auto 640px;\}\}/);
  /* les éléments fixes connus vivent hors des zones éditoriales (une contenance changerait leur repère) */
  for (const [p, id] of [['radios.html', 'id="lkx-player"'], ['online.html', 'data-online-rail']]) {
    const h = read(p), at = h.indexOf(id), z = h.indexOf('<div class="ed-zone'); assert.ok(at > 0 && z > 0, p);
    let depth = 0, end = -1; const re = /<(\/?)div\b/g; re.lastIndex = z; let m; while ((m = re.exec(h))) { depth += m[1] ? -1 : 1; if (!depth) { end = m.index; break; } }
    assert.ok(at < z || at > end, p + ' : ' + id + ' hors de la zone');
  }
});

test('galerie des fiches (jsdom) : la première image garde son srcset 480 / 800 / 1 280 écrit dans la page (aucun second téléchargement)', async () => {
  const { load } = require('./runtime-helper.cjs');
  const file = 'vehicules/albany-manana.html', html = read(file);
  const first = html.match(/<img src="([^"]+-480\.webp)" srcset="([^"]+)"/); assert.ok(first, 'première image');
  assert.match(first[2], /-800\.webp 800w/);
  const p = await load(root, file);
  const img = p.d.querySelector('.gal-track .gal-item img'); assert.ok(img, 'galerie montée');
  assert.equal(img.getAttribute('srcset'), first[2]);
  /* les vues suivantes aussi proposent la variante 800 px */
  const next = p.d.querySelectorAll('.gal-track .gal-item img')[1]; if (next) assert.match(next.dataset.srcset, /-800\.webp 800w/);
  p.dom.window.close();
});

test('langues : suggestions des champs « Ton véhicule » / « Ton arme » traduites ; titre de carte du localisateur des armes traduit en entier ; aria-valuetext et data-pf-name traduits', () => {
  const NAMES = { en: 'Fishing boat (unknown brand)', es: 'Marca desconocida ', it: 'Marca sconosciuta', de: 'Unbekannte Marke Fischerboot' };
  for (const LG of LANGS) {
    const code = LG.code, dir = LG.dossier;
    const h = read(dir + '/personnalisations.html');
    const vals = [...h.matchAll(/<option value="([^"]*)" data-id=/g)].map(m => m[1]);
    assert.ok(vals.length >= 300, code + ' : options ' + vals.length);
    const fr = vals.filter(v => hitsOf(v.replace(/&#39;/g, '’').replace(/&amp;/g, '&'), code).length);
    assert.deepEqual(fr.slice(0, 5), [], code + ' : suggestions en français');
    if (NAMES[code]) assert.ok(vals.some(v => v.startsWith(NAMES[code])), code + ' : ' + NAMES[code]);
    const ar = read(dir + '/armes.html'), titles = [...ar.matchAll(/data-loc-title="([^"]*)"/g)].map(m => m[1]);
    assert.ok(titles.length >= 20);
    assert.deepEqual(titles.filter(t => hitsOf(t.replace(/&amp;/g, '&'), code).length).slice(0, 4), [], code + ' : titres de carte');
    const co = read(dir + '/collectibles.html').match(/aria-valuetext="([^"]*)"/); assert.ok(co && !hitsOf(co[1], code).length, code + ' : aria-valuetext');
    for (const f of ['fusil-pompe', 'couteau-cran', 'pistolet-custom']) { const n = read(dir + '/armes/' + f + '.html').match(/data-pf-name="([^"]*)"/); assert.ok(n && !hitsOf(n[1], code).length, code + ' : data-pf-name ' + f + ' « ' + (n && n[1]) + ' »'); }
  }
  /* les règles de la mémoire traduisent le nom pris dans le motif ({t1}), pas seulement le reste */
  for (const l of LANGS.map(x => x.code)) for (const f of fs.readdirSync(path.join(root, 'outils/langues', l)).filter(f => f.endsWith('.json'))) {
    const j = JSON.parse(read('outils/langues/' + l + '/' + f));
    for (const k of ['re:^(.+) : armureries repérées$', 're:^(.+) : lieux liés$', 're:^Équivalent réel : (.+)\\.$']) if (j[k]) assert.match(j[k], /\{t1\}/, l + '/' + f + ' : ' + k);
  }
});

test('Atelier 3D : plus de clé de recherche française dans la page ; recherche sur le texte affiché, sans accents ; ordre alphabétique des noms traduits hors du français', () => {
  for (const p of ['atelier-3d.html', ...LANGS.map(l => l.dossier + '/atelier-3d.html')]) assert.ok(!/data-at-q=/.test(read(p)), p);
  const js = read('atelier-3d.js');
  assert.match(js, /normalize\('NFD'\)/);
  assert.match(js, /hay\(it\)\.includes\(q\)/);
  assert.match(js, /new Intl\.Collator\(lang\)/);
  assert.match(js, /if \(!\/\^fr\\b\/i\.test\(lang\)\)/);
});
