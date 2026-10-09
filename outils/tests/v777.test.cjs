'use strict';
/* v7.77 (demandes de Téva du 09/10/2026) : « n'implante pas les designs là où il y a déjà les vrais visuels » ; « un dessin qui
   reste dans le thème GTA 6 avec le branding du site », « style rétro Rockstar », « avoir la forme de l'objet » ; puis « plus
   silhouette, comme si on l'attend et qu'il va bientôt venir, en mode suspense ». Les 195 dessins SVG de la v7.76 deviennent
   191 silhouettes « teaser » (WebP) — quatre éléments prennent leur visuel officiel —, faites d'après chaque objet modelé en 3D
   avec Blender (quelques objets et matières Poly Haven, CC0), sur un fond aux couleurs du site ; une par élément des catalogues
   Consommables, Vêtements et style et Personnalisations qui n'a pas de visuel officiel propre. Les éléments qui ont leur visuel
   officiel le gardent ; la barre fermée des listes retrouve les visuels officiels des catégories. Pages générées, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), crypto = require('node:crypto');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const sp = t => String(t).replace(/[  ]/g, ' ');
const C = require(path.join(root, 'outils/catalogues.cjs'));
const IL = require(path.join(root, 'outils/illustrations/index.cjs'));
const fams = C.load().families;
const FAMS = ['consommables', 'coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes'];
const PAGE = { consommables: 'nourriture.html', coiffures: 'style.html', tatouages: 'style.html', tenues: 'style.html', 'perso-vehicules': 'personnalisations.html', 'perso-armes': 'personnalisations.html' };
const TITLE = 'Illustration Leonidakit : silhouette dessinée pour le site en attendant le visuel officiel, pas une image du jeu';

test('chaque élément sans visuel officiel propre a son illustration (deux WebP aux bonnes dimensions), aucune en trop, aucune pour un élément qui a son visuel', () => {
  assert.deepEqual(IL.check(fams, root), []);
  let n = 0;
  for (const fam of FAMS) {
    const d = fams[fam], files = new Set(fs.readdirSync(path.join(root, IL.DIR, fam)));
    for (const it of d.items) {
      if (it.media) { assert.ok(!IL.has(fam, it.id) && !files.has(it.id + '.webp'), fam + '/' + it.id + ' : garde son visuel officiel'); continue; }
      n++;
      assert.ok(IL.has(fam, it.id) && files.has(it.id + '.webp') && files.has(it.id + '-p.webp'), fam + '/' + it.id);
      assert.deepEqual([IL.webpSize(path.join(root, IL.src(fam, it.id))).w, IL.webpSize(path.join(root, IL.src(fam, it.id))).h], [IL.W, IL.H]);
      assert.deepEqual([IL.webpSize(path.join(root, IL.srcSmall(fam, it.id))).w, IL.webpSize(path.join(root, IL.srcSmall(fam, it.id))).h], [IL.PW, IL.PH]);
    }
    assert.equal(files.size, 2 * d.items.filter(it => !it.media).length, fam + ' : aucun fichier en trop');
  }
  assert.equal(n, 191);
  assert.equal(Object.values(IL.IDS).flat().length, 191);
});

test('illustrations : plus aucun dessin SVG ni générateur de dessins ; images légères et toutes différentes', () => {
  for (const f of ['core', 'conso', 'head', 'tattoo', 'wear', 'car', 'gun']) assert.ok(!fs.existsSync(path.join(root, 'outils/illustrations', f + '.cjs')), f + '.cjs retiré');
  let total = 0;
  for (const fam of FAMS) {
    const seen = new Map();
    for (const f of fs.readdirSync(path.join(root, IL.DIR, fam))) {
      assert.match(f, /^[a-z0-9-]+(-p)?\.webp$/, fam + '/' + f);
      const b = fs.readFileSync(path.join(root, IL.DIR, fam, f)); total += b.length;
      assert.ok(b.length < (f.endsWith('-p.webp') ? 40000 : 160000), fam + '/' + f + ' : ' + b.length + ' octets');
      const h = crypto.createHash('sha1').update(b).digest('hex');
      assert.ok(!seen.has(h), fam + ' : « ' + f + ' » identique à « ' + seen.get(h) + ' »'); seen.set(h, f);
    }
  }
  assert.ok(total < 16e6, total + ' octets en tout');
});

test('listes : vignette en silhouette (petite image, grande version pour la fiche) dite comme telle ; visuel officiel gardé sinon', () => {
  const cache = {};
  for (const fam of FAMS) {
    const d = cache[PAGE[fam]] || (cache[PAGE[fam]] = doc(PAGE[fam]));
    for (const it of fams[fam].items) {
      const row = d.getElementById(C.rowId(fam, it)); assert.ok(row, fam + '/' + it.id);
      const th = row.querySelector('.cat-thumb'), img = th.querySelector('img');
      if (it.media) { assert.ok(!th.classList.contains('cat-thumb--illus') && !th.classList.contains('cat-thumb--cat'), it.id + ' : visuel officiel'); assert.doesNotMatch(img.getAttribute('src'), /^img\/illus\//); continue; }
      assert.ok(th.classList.contains('cat-thumb--illus'), it.id);
      assert.equal(img.getAttribute('src'), 'img/illus/' + fam + '/' + it.id + '-p.webp');
      assert.equal(img.getAttribute('data-big'), 'img/illus/' + fam + '/' + it.id + '.webp');
      assert.equal(img.getAttribute('width') + '×' + img.getAttribute('height'), '384×240');
      assert.equal(sp(img.getAttribute('alt')), 'Illustration Leonidakit : ' + sp(it.nom));
      assert.equal(sp(th.getAttribute('title')), TITLE);
      assert.equal(img.getAttribute('loading'), 'lazy');
    }
  }
});

test('barre fermée des listes : de nouveau les visuels officiels des catégories (jamais une illustration)', () => {
  const cache = {};
  for (const fam of FAMS) {
    const d = cache[PAGE[fam]] || (cache[PAGE[fam]] = doc(PAGE[fam]));
    const pile = [...d.querySelectorAll('#box-' + fam + ' .cat-sum-pile img')].map(i => i.getAttribute('src'));
    const want = [], seen = new Set();
    for (const c of fams[fam].categories) { const v = C.catVisual(c); if (!v || seen.has(v.id)) continue; seen.add(v.id); want.push(v.src); if (want.length === 3) break; }
    assert.deepEqual(pile, want, fam);
    assert.ok(pile.every(s => !s.startsWith('img/illus/')), fam);
  }
});

test('« En un regard » (Consommables) : l’illustration de l’élément en petite et grande taille, ou son visuel officiel ; aucune image répétée', () => {
  const d = doc('nourriture.html'), cards = [...d.querySelectorAll('#en-un-regard .cg-card')];
  assert.ok(cards.length >= 25);
  const srcs = new Set();
  for (const c of cards) {
    const id = c.dataset.cgId, it = fams.consommables.items.find(x => x.id === id), m = c.querySelector('.cg-media'), img = m.querySelector('img');
    srcs.add(img.getAttribute('src'));
    if (it.media) { assert.ok(m.classList.contains('cg-media--own'), id); continue; }
    assert.ok(m.classList.contains('cg-media--illus') && !m.classList.contains('cg-media--cat'), id);
    assert.equal(img.getAttribute('src'), 'img/illus/consommables/' + id + '-p.webp');
    assert.equal(img.getAttribute('srcset'), 'img/illus/consommables/' + id + '-p.webp 384w, img/illus/consommables/' + id + '.webp 960w');
    assert.ok(img.getAttribute('sizes'));
    assert.equal(sp(m.getAttribute('title')), TITLE);
    assert.equal(m.querySelector('.cg-media-l').textContent, 'Illustration Leonidakit');
  }
  assert.equal(srcs.size, cards.length, 'aucun visuel répété');
});

test('fiche ouverte : l’illustration est dite « silhouette dessinée pour le site en attendant le visuel officiel », en 960 × 600 ; styles des illustrations', () => {
  const js = sp(read('catalogue.js'));
  assert.match(js, /illus = !!row\.querySelector\('\.cat-thumb--illus'\)/);
  assert.ok(js.includes("illus ? '" + TITLE + "' : 'Visuel officiel Rockstar Games'"));
  assert.match(js, /i\.width = illus \? 960 : 1280; i\.height = illus \? 600 : 720;/);
  assert.match(js, /i\.src = img\.dataset\.big \|\| img\.src;/);
  const css = read('acquisitions.css');
  for (const sel of ['.cat-thumb--illus{background:#141414;}', '.cg-media--illus img', '.cat-dlg-media--illus img{aspect-ratio:16/10;}']) assert.ok(css.includes(sel), sel);
  assert.doesNotMatch(css, /#121a3c/, 'plus le fond bleu des dessins');
});

test('manifeste des médias : les illustrations n’y sont pas (aucun script ne les cherche), les pages les montrent directement', () => {
  const ctx = { window: {} }; vm.runInNewContext(read('assets-manifest.js'), ctx);
  assert.ok(ctx.window.LK_ASSETS.length > 100);
  assert.ok(!ctx.window.LK_ASSETS.some(u => u.startsWith('/img/illus/')));
});

test('Mentions : les illustrations des catalogues sont dites silhouettes dessinées pour le site (objets modelés en 3D, montrés en ombre), avec le crédit Poly Haven (CC0)', () => {
  const p = [...doc('mentions-legales.html').querySelectorAll('#propriete p')].find(x => /Les illustrations des catalogues/.test(x.textContent));
  assert.ok(p, 'paragraphe');
  assert.match(sp(p.textContent), /sont des silhouettes dessinées pour le site, en attendant les visuels officiels : chaque objet est modelé en 3D avec Blender/);
  assert.match(sp(p.textContent), /montré en ombre, avec un liseré de lumière/);
  assert.match(sp(p.textContent), /domaine public, CC0/);
  assert.equal(p.querySelector('a').getAttribute('href'), 'https://polyhaven.com');
  for (const l of ['en', 'es', 'it', 'de']) {
    const q = [...doc(l + '/mentions-legales.html').querySelectorAll('#propriete p')].find(x => x.querySelector('a[href="https://polyhaven.com"]'));
    assert.ok(q && /CC0/.test(q.textContent) && !/synthèse|silhouettes dessinées/.test(q.textContent), l);
  }
});

test('traductions : texte de remplacement, info-bulle et étiquette dans les quatre langues, nom de l’élément traduit', () => {
  const T = { en: ['Leonidakit illustration', 'Leonidakit illustration: silhouette drawn for the site until the official visual is out, not an image from the game'], es: ['Ilustración de Leonidakit', 'Ilustración de Leonidakit: silueta dibujada para el sitio a la espera del visual oficial, no es una imagen del juego'], it: ['Illustrazione Leonidakit', 'Illustrazione Leonidakit: silhouette disegnata per il sito in attesa del visual ufficiale, non è un’immagine del gioco'], de: ['Leonidakit-Illustration', 'Leonidakit-Illustration: für die Website gezeichnete Silhouette bis zum offiziellen Bild, kein Bild aus dem Spiel'] };
  for (const [l, [label, title]] of Object.entries(T)) {
    for (const page of ['nourriture.html', 'style.html', 'personnalisations.html']) {
      const d = doc(l + '/' + page), thumbs = [...d.querySelectorAll('.cat-thumb--illus')];
      assert.ok(thumbs.length >= 20, l + '/' + page);
      for (const th of thumbs) {
        assert.equal(sp(th.getAttribute('title')), title, l + '/' + page);
        const name = sp(th.closest('.cat-row').querySelector('.cat-nom').textContent);
        assert.equal(sp(th.querySelector('img').getAttribute('alt')), label + ': ' + name, l + '/' + page + ' : ' + name);
        assert.match(th.querySelector('img').getAttribute('src'), /^(\.\.\/)?img\/illus\/[a-z-]+\/[a-z0-9-]+-p\.webp$/);
      }
    }
    const g = doc(l + '/nourriture.html').querySelector('#en-un-regard .cg-media--illus .cg-media-l');
    assert.equal(g.textContent, label, l);
    assert.ok(sp(read(l + '/catalogue.js')).includes("illus ? '" + title + "'"), l + '/catalogue.js');
  }
});

test('v7.77 : quatre éléments de plus montrent leur visuel officiel (Goodtime Gear, Hawk & Little Morgan, Pack Vintage de Jason)', () => {
  const want = { 'tenues/goodtime-gear': 'goodtime-gear-01', 'perso-armes/variante-morgan': 'hawk-little-morgan-revolvers-02',
    'tenues/jason-costume-lin-pastel': 'vintage-vice-city-pack-exclusive-looks-03', 'coiffures/jason-coiffure-retro': 'vintage-vice-city-pack-exclusive-looks-03' };
  const cache = {};
  for (const [k, m] of Object.entries(want)) {
    const [fam, id] = k.split('/'), it = fams[fam].items.find(x => x.id === id);
    assert.equal(it.media, m, k);
    assert.ok(!IL.has(fam, id) && !fs.existsSync(path.join(root, IL.DIR, fam, id + '.webp')), k + ' : plus d’illustration');
    const d = cache[PAGE[fam]] || (cache[PAGE[fam]] = doc(PAGE[fam]));
    const img = d.getElementById(C.rowId(fam, it)).querySelector('.cat-thumb img');
    assert.equal(img.getAttribute('src'), 'img/officiel/' + m + '-480.webp', k);
  }
});
