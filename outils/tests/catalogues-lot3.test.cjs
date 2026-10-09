'use strict';
/* v7.56 (mission « corrections visuelles, fluidité et Léo », lot 3) : Consommables, Vêtements et style, Personnalisation.
   UI-01 fiche paysage commune (contenu déplacé depuis la ligne, repli details sans script), UI-02 légende en badges (couleur +
   pictogramme + libellé, filtre au clic), UI-03 apparition verticale des lignes par LKMotion (Motion+ n'empile plus le tableau),
   CONSO-01/02 descriptions repliées des consommables, STYLE-01 sections de liste opaques, STYLE-03 carrousels des Adresses
   (4e vue officielle de Stock 305 ajoutée), STYLE-04 visuel Goodtime Gear, STYLE-05 grille des collections, PERSO-01/02. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '../..'), { load } = require('./runtime-helper.cjs');
const { JSDOM } = require('jsdom');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const exists = src => fs.existsSync(path.join(root, String(src).replace(/^\//, '').split(/[?#]/)[0]));
const C = require('../catalogues.cjs'), S = require('../sections.cjs');
const PAGES = { 'nourriture.html': ['consommables'], 'style.html': ['coiffures', 'tatouages', 'tenues'], 'personnalisations.html': ['perso-vehicules', 'perso-armes'] };
const fire = (p, node, type = 'click') => node.dispatchEvent(new p.w.Event(type, { bubbles: true, cancelable: true }));

test('UI-02 : la pastille avec libellé porte la classe de son statut ; les cinq statuts ont un badge coloré, un pictogramme et un libellé dans la feuille', () => {
  for (const s of C.STATUS_ORDER) assert.match(S.pip(s, true), new RegExp('^<span class="ed-status ed-status--' + s + '"><span class="pip pip--' + s + '"'));
  assert.match(S.pip('inconnu', true), /ed-status--conf/);
  assert.equal(S.pip('vu'), '<span class="pip pip--vu" aria-hidden="true"></span>', 'la pastille seule ne change pas');
  const css = read('acquisitions.css');
  for (const s of C.STATUS_ORDER) assert.match(css, new RegExp('\\.ed-zone--acq \\.ed-status--' + s + ',\\.cat-dlg \\.ed-status--' + s + '\\{--st-bg:[^;]+;--st-fg:[^;]+;--st-bd:[^;]+;(--st-dash:dashed;)?--st-ico:url\\("data:image/svg\\+xml'), s + ' : badge défini (couleur, texte, bord, pictogramme)');
  assert.match(css, /\.ed-zone--acq \.ed-status \.pip,\.cat-dlg \.ed-status \.pip\{[^}]*mask:var\(--st-ico\)/, 'le pictogramme remplace le point');
  assert.match(css, /\.ed-zone--acq \.ed--night \.ed-status--officiel\{--st-bg:#FDFBF7;--st-fg:#1A1A1E;\}/, 'sur fond nuit, « officiel » reste lisible');
});

test('UI-01 / UI-02 / CONSO-01 : chaque ligne des six listes a son badge, sa barre d’actions, sa fiche complète (details + corps déplaçable) ; les descriptions des consommables sont repliées, les autres visibles', () => {
  let total = 0, fiches = 0;
  for (const [file, fams] of Object.entries(PAGES)) {
    const d = doc(file);
    assert.match(read(file), /<noscript><style>\.cat-more\[hidden\]\{display:block!important\}\.cat-more-bt\{display:none!important\}/, file + ' : feuille sans script (descriptions visibles, bouton masqué)');
    for (const fam of fams) {
      const box = d.getElementById('box-' + fam); const rows = [...box.querySelectorAll('tr.cat-row')];
      assert.equal(rows.length, C.counts(fam).n, file + ' ' + fam);
      assert.ok(box.closest('section.ed').classList.contains('ed--list'), fam + ' : section de liste marquée ed--list (opaque)');
      const key = box.querySelector('.cat-key'); assert.ok(key, fam + ' : légende en tête de liste');
      assert.ok(key.compareDocumentPosition(box.querySelector('table.cat-table')) & 4, fam + ' : la légende précède le tableau');
      const present = [...new Set(rows.map(r => r.dataset.st))], c = C.counts(fam);
      const keys = [...key.querySelectorAll('button[data-cat-key]')];
      assert.deepEqual(keys.map(k => k.dataset.catKey), C.STATUS_ORDER.filter(s => c[s]), fam + ' : un badge par statut présent, dans l’ordre');
      for (const k of keys) {
        assert.ok(present.includes(k.dataset.catKey), fam + ' : ' + k.dataset.catKey + ' présent dans la liste');
        assert.ok(k.disabled && k.getAttribute('aria-pressed') === 'false', fam + ' : inerte sans script, actif ensuite');
        assert.ok(k.querySelector('.ed-status.ed-status--' + k.dataset.catKey + ' .ed-st'), fam + ' : badge dans la légende');
        assert.equal(k.querySelector('.cat-key-d').textContent.replace(/[\u202F\u00A0]/g, ' '), C.KEY[k.dataset.catKey], 'sens du statut (espaces typographiques posées à la synchronisation)');
        assert.match(k.querySelector('.cat-key-n').textContent, new RegExp('^' + c[k.dataset.catKey] + ' ligne'));
      }
      assert.equal(box.querySelectorAll('.cat-legend .pip').length, 0, fam + ' : plus de seconde légende de pastilles en bas (les explications restent)');
      assert.equal(box.dataset.catDesc, C.FOLDED.has(fam) ? 'fold' : undefined);
      for (const r of rows) {
        total++;
        assert.ok(r.querySelector('td.cat-c-st .ed-status.ed-status--' + r.dataset.st + ' .ed-st'), r.id + ' : badge de statut dans la ligne');
        const acts = r.querySelector('td.cat-c-nom .cat-acts'); assert.ok(acts, r.id + ' : barre d’actions');
        const det = acts.querySelector('details.cat-fiche'); const sum = det && det.querySelector(':scope > summary.cat-fiche-bt[data-cat-sheet]');
        assert.ok(sum && /^Fiche complète\s:\s/.test(sum.getAttribute('aria-label')), r.id + ' : « Fiche complète » nommée');
        assert.ok(det.querySelector(':scope > .cat-fiche-body > .doc-fiche .doc-rub'), r.id + ' : corps documentaire déplaçable');
        if (det.querySelector('.doc-fiche')) fiches++;
        const more = r.querySelector('.cat-more'); assert.ok(more && more.id === r.id + '-more' && more.querySelector('.cat-desc'), r.id + ' : bloc description');
        const bt = acts.querySelector('button[data-cat-more]');
        if (C.FOLDED.has(fam)) { assert.ok(more.hidden && bt && bt.getAttribute('aria-expanded') === 'false' && bt.getAttribute('aria-controls') === more.id, r.id + ' : description repliée, commande reliée'); }
        else assert.ok(!more.hidden && !bt, r.id + ' : description visible, pas de commande');
        const img = r.querySelector('.cat-thumb img');
        /* v7.77 : une illustration du site a sa grande version (960 × 600) à côté de la petite (384 × 240) */
        if (img && img.dataset.big) assert.ok(exists(img.dataset.big) && (/-1280\.webp$/.test(img.dataset.big) || /^img\/illus\/[a-z-]+\/[a-z0-9-]+\.webp$/.test(img.dataset.big) && img.getAttribute('src') === img.dataset.big.replace(/\.webp$/, '-p.webp')), r.id + ' : grande version pour la fiche');
        assert.ok(!r.querySelector('td.cat-c-nom > p.cat-desc'), r.id + ' : la description n’est plus un paragraphe nu de la cellule');
      }
    }
  }
  assert.equal(total, 237); assert.equal(fiches, 237);
});

test('catalogue.js (jsdom) : légende filtrante, description dépliable au clavier, fiche en repli details sans <dialog>, lignes suivies par LKMotion et non par Motion+', async () => {
  const p = await load(root, 'nourriture.html');
  assert.deepEqual(p.errors, []);
  const box = p.d.getElementById('box-consommables'), rows = [...box.querySelectorAll('tr.cat-row')];
  assert.ok(rows.every(r => r.classList.contains('lk-reveal')), 'chaque ligne est suivie par le moteur commun');
  assert.ok(!box.querySelector('tbody').classList.contains('lk-reveal--rows'), 'Motion+ n’empile plus le tableau d’un bloc');
  const keys = [...box.querySelectorAll('[data-cat-key]')];
  assert.ok(keys.length >= 3 && keys.every(k => !k.disabled), 'badges de légende activés');
  const k = keys.find(x => x.dataset.catKey === 'serie'); fire(p, k);
  const shown = () => rows.filter(r => !r.hidden);
  assert.ok(shown().length > 0 && shown().every(r => r.dataset.st === 'serie'), 'le badge « repère de la série » filtre');
  assert.equal(k.getAttribute('aria-pressed'), 'true'); assert.equal(box.querySelector('[data-cat-f="st"]').value, 'serie');
  fire(p, k); assert.equal(shown().length, rows.length, 'second clic : tout revient'); assert.equal(k.getAttribute('aria-pressed'), 'false');
  /* description */
  const r0 = rows[0], bt = r0.querySelector('[data-cat-more]'), panel = p.d.getElementById(bt.getAttribute('aria-controls'));
  assert.ok(panel.hidden); fire(p, bt); p.flush();
  assert.ok(!panel.hidden && bt.getAttribute('aria-expanded') === 'true' && r0.classList.contains('is-desc-open') && /Masquer/.test(bt.textContent), 'ouverture locale');
  assert.ok(rows.slice(1).every(r => r.querySelector('.cat-more').hidden), 'les autres restent repliées');
  fire(p, bt); p.flush(); await new Promise(r => setImmediate(r));
  assert.ok(panel.hidden && bt.getAttribute('aria-expanded') === 'false' && !r0.classList.contains('is-desc-open'), 'fermeture');
  /* sans <dialog> (jsdom) : le summary garde son comportement natif, rien n’est intercepté ni déplacé */
  assert.ok(p.w.LKCatalogue && typeof p.w.LKCatalogue.open === 'function');
  assert.equal(p.w.LKCatalogue.open(r0), false, 'sans showModal, la fiche paysage refuse proprement');
  assert.ok(r0.querySelector('details.cat-fiche .cat-fiche-body .doc-fiche'), 'le corps est resté dans la ligne');
  /* tri : l'ordre change, les lignes restent les mêmes nœuds */
  const sort = box.querySelector('[data-cat-sort]'); sort.value = 'nom'; fire(p, sort, 'change');
  const names = [...box.querySelectorAll('tr.cat-row')].map(r => r.querySelector('.cat-nom').textContent);
  assert.deepEqual(names, names.slice().sort((a, b) => a.localeCompare(b, 'fr')));
  assert.equal(box.querySelectorAll('tr.cat-row').length, rows.length);
});

test('STYLE-03 : les trois cartes « Adresses » sont des carrousels (toutes les vues officielles, flèches et position masquées sans script, légende et crédits), la 4e vue de Stock 305 est enregistrée et présente', () => {
  const d = doc('style.html'), medias = JSON.parse(read('outils/medias-officiels.json')), acq = JSON.parse(read('outils/acquisitions.json'));
  const cars = [...d.querySelectorAll('#adresses .d-card--adresse')];
  assert.equal(cars.length, 3);
  for (const card of cars) {
    const car = card.querySelector('figure.d-car[data-car]'); assert.ok(car, 'figure carrousel');
    const n = Number(car.dataset.carN), slides = [...car.querySelectorAll('.d-car-track > .d-car-slide')];
    assert.equal(slides.length, n); assert.ok(n >= 3);
    const name = card.querySelector('h3').textContent.trim();
    const svc = acq.services.find(s => s.category === 'style' && new RegExp(s.ref.split('-')[0], 'i').test(name.toLowerCase().replace(/[’' ]/g, '')) || false);
    assert.ok(slides[0].classList.contains('is-current') && !slides[0].hasAttribute('aria-hidden'));
    slides.slice(1).forEach(s => assert.equal(s.getAttribute('aria-hidden'), 'true'));
    for (const s of slides) { const m = medias[s.dataset.carId]; assert.ok(m, s.dataset.carId + ' enregistré'); assert.equal(s.dataset.carTitle, m.titre); const img = s.querySelector('img'); assert.ok(img && exists(img.getAttribute('src')) && img.getAttribute('alt').includes(m.titre), s.dataset.carId + ' : image existante et décrite'); }
    assert.ok(car.querySelector('[data-car-prev][hidden]') && car.querySelector('[data-car-next][hidden]') && car.querySelector('.d-car-nav[hidden]'), 'flèches et position masquées tant que le script n’est pas là');
    const cap = car.querySelector('figcaption.d-car-cap'); assert.ok(cap && /Rockstar Games/.test(cap.textContent) && cap.querySelector('a[data-car-credit][href^="medias.html#media-"]'), 'crédits et source sous l’image');
    assert.ok(!card.querySelector('.d-gallery'), 'plus de « Voir les autres vues officielles »');
    assert.ok(card.querySelector('.d-source'), 'la source reste consultable');
  }
  const stock = cars.find(c => /Stock 305/.test(c.querySelector('h3').textContent));
  assert.deepEqual([...stock.querySelectorAll('.d-car-slide')].map(s => s.dataset.carId), ['stock-305-clothing-store-01', 'stock-305-clothing-store-02', 'stock-305-clothing-store-03', 'stock-305-clothing-store-04']);
  const m2 = medias['stock-305-clothing-store-02'];
  assert.ok(m2 && /^https:\/\/www\.rockstargames\.com\/VI\/_next\/static\/media\/ULTIMATE_EDITION_STOCK_305_02\./.test(m2.original) && m2.consultedAt === '2026-10-01' && m2.alt);
  for (const v of m2.variants) assert.ok(exists(v.src) && [480, 1280].includes(v.w));
  assert.match(read('acquisitions.js'), /data-car/, 'le script du carrousel est dans acquisitions.js');
  assert.match(read('style.html'), /<noscript><style>[^<]*\.d-car-slide\{position:static!important;opacity:1!important/, 'sans script, toutes les vues s’empilent');
});

test('STYLE-04 / STYLE-05 : « Les articles du bonheur » a le visuel officiel Goodtime Gear (enregistré, crédité, légendé) ; les collections tiennent sur trois colonnes, troisième centrée en rangée incomplète', () => {
  const d = doc('style.html'), medias = JSON.parse(read('outils/medias-officiels.json')), acq = JSON.parse(read('outils/acquisitions.json'));
  const g = medias['goodtime-gear-01'];
  assert.ok(g && g.titre === 'Goodtime Gear' && /ULTIMATE_EDITION_GOODTIME_GEAR_01\./.test(g.original) && g.source === 'https://www.rockstargames.com/VI/media/screenshots' && g.mediaType === 'official-screenshot' && g.consultedAt === '2026-10-01');
  for (const v of g.variants) assert.ok(exists(v.src));
  const item = acq.items.find(x => x.id === 'articles-du-bonheur');
  assert.deepEqual(item.media, ['goodtime-gear-01']); assert.match(item.mediaCaption, /Goodtime Gear/);
  const card = d.getElementById('articles-du-bonheur'); const img = card.querySelector('img');
  assert.ok(img && /goodtime-gear-01-480\.webp/.test(img.getAttribute('src')) && /goodtime-gear-01-1280\.webp/.test(img.getAttribute('srcset')));
  assert.match(card.querySelector('.d-media-cap').textContent, /Capture officielle «\sGoodtime Gear\s»/);
  assert.ok(card.querySelector('.d-media-cap a[href="medias.html#media-goodtime-gear-01"]'));
  const grid = d.querySelector('#collections .d-grid');
  assert.ok(grid.classList.contains('d-grid--collections') && grid.children.length === 3 && [...grid.children].every(c => c.querySelector('img')));
  assert.deepEqual([...grid.children].map(c => c.id), ['style-vice-city', 'articles-du-bonheur', 'vintage-tenues-coiffures'], 'ordre de lecture');
  const css = read('acquisitions.css');
  assert.match(css, /\.d-grid--collections\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\);\}/);
  assert.match(css, /@media\(max-width:1000px\)\{\s*\.d-grid--collections\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\);\}\s*\.d-grid--collections>\.d-card:last-child:nth-child\(odd\)\{grid-column:1\/-1;justify-self:center;width:calc\(50% - 11px\);\}/);
  assert.match(css, /@media\(max-width:700px\)\{\s*\.d-grid--collections\{grid-template-columns:minmax\(0,1fr\);\}/);
  assert.ok([...d.querySelectorAll('medias-html')].length === 0);
  const med = read('medias.html'); assert.ok(med.includes('id="media-goodtime-gear-01"') && med.includes('id="media-stock-305-clothing-store-02"'), 'les deux visuels figurent dans la page des crédits');
});

test('STYLE-01 / UI-03 / UI-01 : feuille — sections de liste opaques, entrée verticale des lignes, fiche paysage (deux colonnes, une seule sous 761 px), carrousel et réduction des mouvements', () => {
  const css = read('acquisitions.css');
  assert.match(css, /\.ed--list\.ed--paper\{background:var\(--paper\);\}/);
  assert.match(css, /\.js tr\.cat-row\.lk-reveal:not\(\.lk-settled\)\{transform:translate3d\(0,12px,0\);\}/);
  assert.match(css, /\.cat-dlg-in\{[^}]*grid-template-columns:minmax\(280px,360px\) minmax\(0,1fr\)/);
  assert.match(css, /@media\(max-width:760px\)\{\s*\.cat-dlg\{width:100vw;/);
  assert.match(css, /\.cat-dlg-in\{grid-template-columns:minmax\(0,1fr\);/);
  assert.ok(!/cat-dlg-open/.test(css) && !/cat-dlg-open/.test(read('catalogue.js')), 'aucun verrou de défilement sur <html> (il forçait une mise en page complète)');
  assert.match(read('catalogue.js'), /addEventListener\('wheel', guard, \{ passive: false \}\)/, 'la molette sur le fond ne fait pas défiler la page');
  assert.match(css, /@keyframes d-car-scan/); assert.match(css, /\.d-car-track\{[^}]*aspect-ratio:16\/9/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.d-car \.d-car-slide,\.d-car-track::after\{animation:none!important;\}/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)\{\.cat-dlg\[open\]::backdrop\{animation:none;\}\}/);
  assert.match(read('common.js'), /el\.closest\('\.lk-reveal, \.cat-table'\)/, 'Motion+ laisse les tableaux des catalogues au moteur des lignes');
  const js = read('catalogue.js');
  for (const k of ['showModal', "dlg.addEventListener('cancel'", 'o.trigger.focus', 'home.parentNode.replaceChild(o.body, o.home)', "motion.observe(rows, { replay: true, initial: false })", 'fiche.open = true', 'scrollBy(0, -(stuck + 12))']) assert.ok(js.includes(k), 'catalogue.js : ' + k);
});

test('carrousel (jsdom) : flèches et points activés, « suivant » / « précédent » bouclent, légende, crédits et libellés suivent la vue', async () => {
  const p = await load(root, 'style.html');
  assert.deepEqual(p.errors, []);
  const cars = [...p.d.querySelectorAll('[data-car]')]; assert.equal(cars.length, 3);
  const car = cars.find(c => c.dataset.carN === '4' && /stock-305/.test(c.querySelector('.d-car-slide').dataset.carId));
  assert.ok(car.classList.contains('is-ready') && !car.querySelector('[data-car-prev]').hidden && !car.querySelector('.d-car-nav').hidden);
  assert.equal(car.querySelectorAll('.d-car-dot').length, 4);
  const pos = () => car.querySelector('[data-car-pos]').textContent, cap = () => car.querySelector('[data-car-cap]').textContent, cur = () => car.querySelector('.d-car-slide.is-current').dataset.carI;
  assert.equal(pos(), '1 / 4');
  fire(p, car.querySelector('[data-car-next]')); assert.equal(pos(), '2 / 4'); assert.equal(cur(), '1'); assert.equal(cap(), 'Stock 305 Clothing Store 02');
  assert.equal(car.querySelector('[data-car-credit]').getAttribute('href'), 'medias.html#media-stock-305-clothing-store-02');
  assert.equal(car.querySelector('[data-car-next]').getAttribute('aria-label'), 'Vue suivante : Stock 305 Clothing Store 03');
  assert.equal(car.querySelector('.d-car-dot[aria-current="true"]').getAttribute('aria-label'), 'Vue 2 sur 4 : Stock 305 Clothing Store 02');
  fire(p, car.querySelector('[data-car-prev]')); fire(p, car.querySelector('[data-car-prev]')); assert.equal(pos(), '4 / 4', 'boucle vers la dernière vue');
  car.dispatchEvent(new p.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); assert.equal(pos(), '1 / 4', 'flèche droite du clavier');
  fire(p, car.querySelectorAll('.d-car-dot')[2]); assert.equal(pos(), '3 / 4');
  assert.ok([...car.querySelectorAll('.d-car-slide:not(.is-current)')].every(s => s.getAttribute('aria-hidden') === 'true'));
});

test('PERSO-01 / PERSO-02 : filtre de compatibilité par l’adresse, lignes réaffichées rejouées, fiche de la ligne filtrée cohérente (jsdom)', async () => {
  const p = await load(root, 'personnalisations.html#perso-vehicules=sport');
  assert.deepEqual(p.errors, []);
  const box = p.d.getElementById('box-perso-vehicules'), rows = [...box.querySelectorAll('tr.cat-row')], shown = rows.filter(r => !r.hidden);
  assert.ok(box.open && shown.length > 0 && shown.every(r => (' ' + r.dataset.compat + ' ').includes(' sport ')));
  assert.ok(!box.querySelector('[data-cat-filter]').hidden);
  for (const r of shown) assert.ok(r.querySelector('td.cat-c-st .ed-status--' + r.dataset.st) && r.querySelector('.cat-compat') && r.querySelector('details.cat-fiche .cat-fiche-body .doc-fiche'));
  fire(p, box.querySelector('[data-cat-reset]'));
  assert.equal(rows.filter(r => !r.hidden).length, rows.length);
  const arm = p.d.getElementById('box-perso-armes');
  assert.ok(arm.querySelector('.cat-key') && [...arm.querySelectorAll('tr.cat-row')].every(r => r.querySelector('.cat-acts summary[data-cat-sheet]')));
});
