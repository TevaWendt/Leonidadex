'use strict';
/* v7.50 (lot 3) : catalogues, visuels, sélecteurs de carte et page Achats.
   Fiches documentaires (modèle commun), vignettes des lignes, localisateur illustré (hubs et fiches), carnet de style,
   consommables « en un regard », page Achats (visuels, comptes justes, pile verticale), comparateur, galerie épinglée. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..'), { load } = require('./runtime-helper.cjs');
const { JSDOM } = require('jsdom');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const FD = require('../fiche-doc.cjs'), LOC = require('../localisateur.cjs'), C = require('../catalogues.cjs'), carte = require('../carte-vignette.cjs');
const exists = src => fs.existsSync(path.join(root, src.replace(/^(\.\.\/)+/, '').replace(/^\//, '').split(/[?#]/)[0]));
const data = (() => { const c = { window: {} }; vm.createContext(c); for (const f of ['vehicules-data.js', 'armes-data.js']) vm.runInContext(read(f), c); return c.window; })();
const fire = (p, node, type = 'click') => node.dispatchEvent(new p.w.Event(type, { bubbles: true, cancelable: true }));

test('fiche documentaire : chaque catégorie rend ses rubriques ; « Prix à venir », « Achat à confirmer », repère à part, « ne s’applique pas »', () => {
  for (const cat of ['vehicle', 'weapon', 'consumable', 'style', 'customization', 'property', 'business', 'activity']) {
    const html = FD.render(cat, {}); const d = new JSDOM(html).window.document;
    assert.ok(d.querySelectorAll('.doc-rub').length >= 2, cat);
    assert.ok(d.querySelectorAll('.doc-row').length >= 4, cat);
    for (const row of d.querySelectorAll('.doc-row.is-wait .doc-v')) assert.doesNotMatch(row.textContent, /\d/, cat + ' : un état vide ne porte aucun chiffre');
  }
  const sprunk = C.load().families.consommables.items.find(x => x.id === 'sprunk');
  const d = new JSDOM(FD.render('consumable', FD.knownOfRow('consommables', sprunk, id => C.place(id).name))).window.document;
  const row = label => [...d.querySelectorAll('.doc-row')].find(r => r.querySelector('dt').textContent === label);
  assert.equal(row('Prix').querySelector('.doc-v').textContent, 'Prix à venir');
  assert.equal(row('Achetable').querySelector('.doc-v').textContent, 'Achat à confirmer');
  assert.equal(row('Vie rendue').querySelector('.doc-v').textContent, 'Récupération de vie : à confirmer');
  assert.match(row('Vie rendue').querySelector('.doc-rep').textContent, /Repère de la série : 100 % de vie — Chiffre de GTA V/);
  // un bonus d’édition ne « s’achète » pas : ni prix à venir, ni achat à confirmer
  const bonus = C.load().families.tenues.items.find(it => FD.notBought(it));
  assert.ok(bonus, 'au moins une pièce offerte avec une édition');
  const b = new JSDOM(FD.render('style', FD.knownOfRow('tenues', bonus, id => C.place(id).name))).window.document;
  assert.ok([...b.querySelectorAll('.doc-row.is-na dt')].some(x => x.textContent === 'Prix'));
  assert.deepEqual(FD.accessCell(bonus).price, 'Ne s’achète pas');
});

test('listes des catalogues : vignette (visuel officiel ou pictogramme dit comme tel), prix et achat séparés, fiche complète dépliable', () => {
  for (const [file, fams] of [['style.html', ['coiffures', 'tatouages', 'tenues']], ['nourriture.html', ['consommables']], ['personnalisations.html', ['perso-vehicules', 'perso-armes']]]) {
    const d = doc(file);
    for (const fam of fams) {
      const rows = [...d.querySelectorAll('#box-' + fam + ' tr.cat-row')]; assert.equal(rows.length, C.counts(fam).n, file + ' ' + fam);
      for (const r of rows) {
        const th = r.querySelector('td.cat-c-nom .cat-thumb'); assert.ok(th, r.id + ' vignette');
        const img = th.querySelector('img');
        if (img) { assert.ok(exists(img.getAttribute('src')), img.getAttribute('src')); assert.ok(img.getAttribute('alt') && img.getAttribute('width') && img.getAttribute('height'), r.id); }
        else assert.match(th.getAttribute('title'), /pas un visuel de l’objet/, r.id);
        const p6 = r.querySelector('td.cat-c-p6'); assert.ok(p6.querySelector('.cat-conf') && p6.querySelector('.cat-buy'), r.id);
        const f = r.querySelector('details.cat-fiche .doc-fiche'); assert.ok(f, r.id + ' fiche complète'); assert.ok(f.querySelectorAll('.doc-rub').length >= 2);
      }
      const withMedia = C.load().families[fam].items.filter(it => it.media).length;
      /* v7.73 : une ligne sans visuel propre montre celui de sa catégorie (cat-thumb--cat, dit « illustration ») : les photos
         propres restent exactement celles des visuels liés */
      /* v7.76 (lot C) : … et, s'il a été dessiné, l'illustration du site (cat-thumb--illus, dite comme telle) */
      assert.equal(d.querySelectorAll('#box-' + fam + ' .cat-thumb:not(.cat-thumb--cat):not(.cat-thumb--illus) img').length, withMedia, fam + ' : une photo par visuel lié, pas plus');
      assert.equal(d.querySelectorAll('#box-' + fam + ' .cat-thumb--cat img, #box-' + fam + ' .cat-thumb--illus img').length, rows.length - withMedia, fam + ' : illustration (du site, sinon de la catégorie) pour les autres');
    }
  }
});

test('fiches armes : fiche documentaire (4 rubriques) et localisateur illustré, emplacement « à venir », repères numérotés sur la vraie carte', () => {
  /* v7.55 (lot 2, VIS-02) : le fond des fiches est la référence commune img/leonida-carte.svg, dérivée de carte.html */
  assert.ok(exists(LOC.REFERENCE), 'référence cartographique en fichier');
  assert.match(read(LOC.REFERENCE), /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 5200 6000"/);
  assert.ok(!exists('img/leonida-silhouette.svg'), 'ancien sprite de silhouette retiré');
  for (const a of data.LK_ARMES) {
    const d = doc('armes/' + a.id + '.html');
    assert.equal(d.querySelectorAll('.doc-fiche .doc-rub').length, 4, a.id);
    assert.doesNotMatch([...d.querySelectorAll('.doc-row')].find(r => r.querySelector('dt').textContent === 'Prix').textContent, /\d/, a.id);
    const loc = d.querySelector('#carte .lk-loc--single'); assert.ok(loc, a.id);
    assert.match(loc.querySelector('.lk-loc-status').textContent, /Emplacement à venir/);
    const pins = [...loc.querySelectorAll('.lk-loc-pin')]; assert.equal(pins.length, 3, a.id);
    pins.forEach((p, i) => { const pt = carte.point(p.dataset.place); assert.equal(p.querySelector('.lk-loc-dot').getAttribute('cx'), String(pt.x)); assert.equal(p.querySelector('text').textContent, String(i + 1)); });
    const base = loc.querySelector('.lk-loc-stage > img.lk-loc-base'); assert.ok(base, a.id + ' : fond de référence');
    assert.match(base.getAttribute('src'), /^\.\.\/img\/leonida-carte\.svg\?v=[a-f0-9]{12}$/); assert.equal(loc.querySelector('.lk-loc-svg').getAttribute('viewBox'), '0 0 5200 6000');
    assert.equal(loc.querySelector('use'), null, 'plus de silhouette dans le localisateur');
    assert.equal(loc.querySelectorAll('.lk-loc-places a[href^="../carte.html#lieu="]').length, 3);
    assert.equal(d.querySelector('#carte .fiche-liens'), null, 'plus de petits carrés portant seulement un nom');
  }
});

test('fiches véhicules : lieux liés au type (marinas pour un bateau, aucun pour un véhicule de service), jamais un emplacement inventé', () => {
  const byCat = {};
  for (const v of data.LK_VEHICULES) {
    const d = doc('vehicules/' + v.id + '.html'), loc = d.querySelector('#carte .lk-loc--single');
    assert.ok(loc, v.id); assert.equal(d.querySelectorAll('.doc-fiche .doc-rub').length, 4, v.id);
    const ids = [...loc.querySelectorAll('.lk-loc-pin')].map(p => p.dataset.place);
    assert.deepEqual(ids, LOC.vehicleLinks(v), v.id);
    (byCat[v.cat] = byCat[v.cat] || new Set()).add(ids.join(','));
    if (v.cat === 'service') { assert.match(loc.textContent, /aucun lieu d’achat repéré/); assert.ok(loc.querySelector('.lk-loc-svg--empty')); }
    assert.match(loc.querySelector('.lk-loc-status').textContent, /mplacement à venir/);
  }
  assert.deepEqual([...byCat.bateau], ['g-L120,g-L328,g-L326']);
  for (const set of Object.values(byCat)) assert.equal(set.size, 1, 'même règle pour toute une catégorie');
});

test('hubs : sélecteur illustré (vignette, nom, catégorie), un seul objet choisi au départ, lieux en cartes gardés', () => {
  for (const [file, n, cards] of [['armes.html', data.LK_ARMES.length, 3], ['vehicules.html', data.LK_VEHICULES.length, 13]]) {
    const d = doc(file), hub = d.querySelector('#carte .lk-loc--hub');
    assert.ok(hub, file);
    const items = [...hub.querySelectorAll('.lk-loc-item')]; assert.equal(items.length, n, file);
    assert.equal(items.filter(b => b.getAttribute('aria-pressed') === 'true').length, 1);
    for (const b of items) { assert.ok(b.querySelector('.lk-loc-thumb img, .lk-loc-thumb svg'), b.dataset.locId); assert.ok(b.querySelector('.lk-loc-txt b').textContent.trim()); assert.ok(b.dataset.locCatlabel); assert.ok(exists(b.dataset.locUrl), b.dataset.locUrl); }
    for (const img of hub.querySelectorAll('.lk-loc-thumb img')) assert.ok(exists(img.getAttribute('src')), img.getAttribute('src'));
    assert.equal(d.querySelectorAll('#carte .ed-place').length, cards, file + ' : tous les lieux restent en cartes');
    assert.match(hub.querySelector('[data-loc-sum]').textContent, /Emplacement à venir/);
    assert.ok(d.querySelector('script[src^="localisateur.js"]'), file + ' charge le script');
  }
});

test('localisateur (page) : choisir, chercher, filtrer, retrouver le choix au retour ; résumé et repères synchronisés', async () => {
  const p = await load(root, 'armes.html');
  const hub = p.d.querySelector('[data-lk-loc]'); assert.ok(hub.classList.contains('is-ready'));
  const pick = id => p.d.querySelector('[data-loc-id="' + id + '"]');
  fire(p, pick('klose-k17'));
  assert.equal(pick('klose-k17').getAttribute('aria-pressed'), 'true');
  assert.match(hub.querySelector('.lk-loc-name').textContent, /Klose K17/);
  assert.equal(hub.querySelectorAll('.lk-loc-pin.is-on').length, 3);
  assert.match(hub.querySelector('.lk-loc-actions a').getAttribute('href'), /armes\/klose-k17\.html$/);
  const q = hub.querySelector('[data-loc-q]'); q.value = 'fusil à pompe'; fire(p, q, 'input');
  const shown = [...hub.querySelectorAll('.lk-loc-item')].filter(b => !b.parentNode.hidden);
  assert.ok(shown.length >= 1 && shown.every(b => /pompe/i.test(b.textContent)), shown.map(b => b.textContent).join('|'));
  fire(p, hub.querySelector('[data-loc-reset]') || hub.querySelector('[data-loc-catf=""]'));
  fire(p, hub.querySelector('[data-loc-catf="melee"]'));
  assert.ok([...hub.querySelectorAll('.lk-loc-item')].filter(b => !b.parentNode.hidden).every(b => b.dataset.locCat === 'melee'));
  const saved = JSON.parse(p.w.sessionStorage.getItem('lk_loc_armes')); assert.equal(saved.id, 'klose-k17'); assert.equal(saved.cat, 'melee');
  assert.deepEqual(p.errors, []); p.close();
  const again = await load(root, 'armes.html', { before: w => w.sessionStorage.setItem('lk_loc_armes', JSON.stringify(saved)) });
  assert.equal(again.d.querySelector('[data-loc-id="klose-k17"]').getAttribute('aria-pressed'), 'true', 'le choix est retrouvé au retour');
  assert.equal(again.d.querySelector('[data-loc-catf="melee"]').getAttribute('aria-pressed'), 'true');
  assert.deepEqual(again.errors, []); again.close();
});

test('Vêtements et style : carnet de style (5 planches), visuels existants et décrits, « Garder ce style » est un souhait, pas une possession', async () => {
  const d = doc('style.html'), book = d.getElementById('carnet-de-style');
  assert.ok(book); const planches = [...book.querySelectorAll('.lb-planche')]; assert.equal(planches.length, 5);
  for (const pl of planches) {
    const imgs = [...pl.querySelectorAll('img')]; assert.ok(imgs.length >= 2);
    for (const img of imgs) { assert.ok(exists(img.getAttribute('src'))); assert.ok(img.getAttribute('alt').length > 20); }
    assert.equal(pl.querySelectorAll('.lb-vu li').length, imgs.length, 'un « ce qu’on voit » par image');
    assert.ok(pl.querySelector('.lb-wish[data-wish-fam="styles"]'));
    for (const a of pl.querySelectorAll('.lb-links a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  }
  const nav = [...d.querySelectorAll('.ed-nav a')].map(a => a.getAttribute('href'));
  assert.ok(nav.includes('#collections') && nav.includes('#carnet-de-style'), 'sous-navigation complète');
  assert.equal(d.querySelectorAll('#collections .d-card img').length, 3, 'les trois collections illustrées par un visuel officiel (v7.56, STYLE-04 : « Les articles du bonheur » a reçu la capture Goodtime Gear)');
  const p = await load(root, 'style.html');
  const wish = p.d.querySelector('.lb-wish'); assert.equal(wish.hidden, false);
  fire(p, wish);
  const w = JSON.parse(p.w.localStorage.getItem('lk_wish_v1')); assert.ok(w.items['styles:' + wish.dataset.wishId]);
  assert.equal(wish.getAttribute('aria-pressed'), 'true');
  assert.equal(Object.keys(p.w.localStorage).filter(k => k.startsWith('lk_own_')).length, 0, 'aucune possession cochée');
  assert.deepEqual(p.errors, []); p.close();
});

test('Consommables en un regard : cartes par besoin, aucune fausse jauge, comparaison de trois au plus, simulation personnelle signalée', async () => {
  const d = doc('nourriture.html'), box = d.getElementById('en-un-regard');
  const tracked = C.load().families.consommables.items.filter(it => it.suivi !== false);
  assert.equal(box.querySelectorAll('.cg-card').length, tracked.length);
  for (const c of box.querySelectorAll('.cg-card')) {
    const dd = [...c.querySelectorAll('.cg-facts dd')].map(x => x.firstChild.textContent);
    assert.ok(dd.includes('Prix à venir') || dd.includes('Ne s’achète pas'), c.dataset.cgId);
    for (const t of dd) assert.doesNotMatch(t, /\d+\s*%/, 'aucun pourcentage de GTA VI');
    assert.ok(d.getElementById(c.querySelector('.cg-link').getAttribute('href').slice(1)));
  }
  assert.equal(d.querySelectorAll('meter, progress.cg-gauge, .cg-gauge').length, 0);
  const p = await load(root, 'nourriture.html'), r = p.d.getElementById('en-un-regard');
  const boxes = [...r.querySelectorAll('[data-cg-cmp]')];
  [0, 1, 2].forEach(i => { boxes[i].checked = true; fire(p, boxes[i], 'change'); });
  assert.equal(boxes[3].disabled, true, 'trois au plus');
  const table = r.querySelector('.cg-table'); assert.ok(table); assert.equal(table.querySelectorAll('thead th').length, 4);
  const outs = [...table.querySelectorAll('.cg-out')]; assert.ok(outs.every(o => /Écris les deux chiffres/.test(o.textContent)), 'rien de calculé sans tes deux chiffres');
  const [price, heal] = [...table.querySelectorAll('tr.cg-sim')].map(tr => tr.querySelector('input'));
  price.value = '250'; fire(p, price, 'input'); heal.value = '50'; fire(p, heal, 'input');
  assert.match(outs[0].textContent.replace(/\s/g, ' '), /^5 \$ par point · simulation$/);
  assert.deepEqual(p.errors, []); p.close();
});

test('page Achats : un visuel par catégorie, comptes justes, accès rapide, pile verticale et variante grille', async () => {
  const d = doc('achats.html'), cards = [...d.querySelectorAll('.ak-stack > .ak-slot > .ak-card')];
  assert.equal(cards.length, 11);
  for (const c of cards) { const img = c.querySelector('.ak-media img'); assert.ok(img && exists(img.getAttribute('src')) && img.getAttribute('alt'), c.querySelector('h3').textContent); }
  const count = label => cards.find(c => c.querySelector('h3').textContent === label).querySelector('.ak-count').textContent;
  assert.equal(count('Consommables'), C.counts('consommables').n + ' lignes documentées');
  assert.equal(count('Vêtements et style'), ['coiffures', 'tatouages', 'tenues'].reduce((n, f) => n + C.counts(f).n, 0) + ' lignes documentées');
  assert.doesNotMatch(d.getElementById('categories').textContent, /Rien de publié pour l’instant.{0,40}Consommables|Consommables.{0,200}Rien de publié/);
  assert.match(cards.find(c => c.classList.contains('is-pending')).querySelector('figcaption').textContent, /Illustration\s:\srien de confirmé/);
  const jump = [...d.querySelectorAll('.ak-jump a')]; assert.equal(jump.length, 11);
  for (const a of jump) assert.ok(d.getElementById(a.getAttribute('href').slice(1)));
  assert.equal(d.querySelectorAll('.ak-card.lk-arrive').length, 0);
  const css = read('acquisitions.css');
  assert.match(css, /\.ak-stack:not\(\.is-grid\) \.ak-slot\{position:sticky/); assert.match(css, /prefers-reduced-motion:reduce\)\{\.ak-stack\{grid-template-columns/);
  const p = await load(root, 'achats.html'), btn = p.d.querySelector('[data-ak-view]');
  assert.equal(btn.hidden, false); fire(p, btn);
  assert.ok(p.d.querySelector('[data-ak-stack]').classList.contains('is-grid')); assert.equal(p.w.sessionStorage.getItem('lk_achats_vue'), null, 'v7.70 : le choix de la grille n’est plus gardé, la pile revient à chaque ouverture');
  assert.deepEqual(p.errors, []); p.close();
});

test('comparateur, cartes des catalogues et galerie épinglée : mêmes états vides, pont vers « Quel achat choisir ? », texte jamais flouté', async () => {
  const p = await load(root, 'comparateur.html?type=vehicules&ids=albany-emperor,albany-primo');
  const t = p.d.getElementById('cmp-table').textContent;
  for (const s of ['Prix à venir', 'Achat à confirmer', 'Emplacement à venir', 'Mécanique non confirmée', 'Route (déduit du type)']) assert.ok(t.includes(s), s);
  assert.match(p.d.getElementById('cmp-calculator-link').getAttribute('href'), /tool=compare/);
  assert.deepEqual(p.errors, []); p.close();
  assert.equal(doc('vehicules.html').querySelectorAll('#vgrid .veh-doc').length, data.LK_VEHICULES.length);
  assert.equal(doc('armes.html').querySelectorAll('#vgrid .veh-doc').length, data.LK_ARMES.length);
  const css = read('style.css'); const last = css.lastIndexOf('.lore-slide.is-next{filter:none}');
  assert.ok(last > css.lastIndexOf('.lore-slide.is-next{opacity:var(--t,0);filter:blur'), 'la règle nette vient après l’ancienne');
});
