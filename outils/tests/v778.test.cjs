'use strict';
/* v7.78 (demande de Téva du 09/10/2026) : les cartes en tête des cinq hubs du monde refaites, chacune comme un objet du monde
   de GTA (Lieux : la carte routière qui se déplie ; Personnages : la jaquette ; Demeures : les portes ; Planques : la régie ;
   Entreprises : la rue aux rideaux de fer), générées par outils/monde-cartes.cjs, habillées par monde.css, animées par
   monde.js. Pages générées, sans réseau. Rien d'autre ne change. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const exists = src => fs.existsSync(path.join(root, src.replace(/^\//, '').split(/[?#]/)[0]));
const HUBS = ['lieux', 'personnages', 'demeures', 'planques', 'entreprises'];
const LANGS = ['', 'en/', 'es/', 'it/', 'de/'];
const ED = JSON.parse(read('outils/editorial.json'));
const COUNT = { lieux: ED.regions.length, personnages: ED.characters.length, demeures: ED.residences.length, planques: ED.hideouts.length, entreprises: ED.businesses.length };

test('les cinq hubs chargent monde.css et monde.js (dans l’en-tête, avant le premier rendu) ; Gangs, Animaux et les fiches, non', () => {
  for (const l of LANGS) {
    for (const hub of HUBS) {
      const h = read(l + hub + '.html'), head = h.slice(0, h.indexOf('</head>'));
      assert.match(head, /<link rel="stylesheet" href="(?:\.\.\/)?monde\.css\?v=[a-f0-9]{12}">/, l + hub + ' : feuille');
      assert.match(head, /<script src="(?:\.\.\/)?monde\.js\?v=[a-f0-9]{12}"><\/script>/, l + hub + ' : script dans l’en-tête');
      assert.ok(doc(l + hub + '.html').querySelector('#fiches.mo[data-mo], #fiches.mo [data-mo]'), l + hub + ' : module');
    }
    for (const f of ['gangs.html', 'animaux.html', 'lieux/vice-city.html', 'index.html']) assert.doesNotMatch(read(l + f), /monde\.(css|js)/, l + f + ' : inchangé');
  }
});

test('chaque carte : un lien vers sa fiche (le nom), l’accroche de la fiche, un visuel officiel existant avec texte alternatif, « Voir la fiche »', () => {
  for (const hub of HUBS) {
    const d = doc(hub + '.html'), cards = [...d.querySelectorAll('#fiches .mo-card')];
    assert.equal(cards.length, COUNT[hub], hub + ' : une carte par fiche');
    const items = { lieux: ED.regions, personnages: ED.characters, demeures: ED.residences, planques: ED.hideouts, entreprises: ED.businesses }[hub];
    const seen = new Set();
    cards.forEach(c => {
      const a = c.querySelector('h3.mo-name a.mo-link');
      const x = items.find(y => a && a.getAttribute('href') === hub + '/' + y.id + '.html');
      assert.ok(x && !seen.has(x.id), hub + ' : carte reliée à une fiche, une seule fois'); seen.add(x.id);
      assert.ok(a && a.getAttribute('href') === hub + '/' + x.id + '.html', hub + ' : lien de ' + x.id);
      assert.equal(a.textContent.trim(), x.name, hub + ' : nom');
      assert.equal(c.querySelector('.mo-tag').textContent, x.tagline, hub + ' : accroche');
      const img = c.querySelector('img[alt]:not(.mo-who img)');
      assert.ok(img && img.getAttribute('alt').length > 8 && exists(img.getAttribute('src')), hub + ' : visuel officiel de ' + x.id);
      assert.ok(/^\/img\/officiel\//.test(img.getAttribute('src')), hub + ' : capture officielle seulement');
      assert.ok(c.querySelector('.mo-go'), hub + ' : Voir la fiche');
      assert.equal(c.querySelectorAll('a.mo-link').length, 1, hub + ' : un seul lien principal');
    });
    assert.equal(d.querySelector('#fiches h2.sr-only').textContent, 'Les ' + COUNT[hub] + ' fiches');
  }
});

test('pastilles des personnages : vrais liens vers leurs fiches, recadrages img/monde/ présents, seulement des personnages des fiches', () => {
  const AV = require(path.join(root, 'outils/monde-avatars.cjs'));
  for (const id of Object.keys(AV.AVATARS)) { assert.ok(ED.characters.some(c => c.id === id), id); assert.ok(exists(AV.src(id)), 'pastille ' + id); }
  let n = 0;
  for (const hub of HUBS) for (const a of doc(hub + '.html').querySelectorAll('#fiches a.mo-who')) {
    n++;
    assert.match(a.getAttribute('href'), /^personnages\/[a-z]+\.html$/, hub + ' : lien de pastille');
    assert.ok(a.textContent.trim() || a.getAttribute('aria-label'), hub + ' : pastille nommée');
    assert.match(a.querySelector('img').getAttribute('src'), /^\/img\/monde\/[a-z]+\.webp$/);
  }
  assert.ok(n >= 20, 'pastilles');
});

test('Lieux : la carte de Leonida (fond du site, six repères aux coordonnées de la carte interactive), six cartes reliées, « Sur la carte » vers carte.html', () => {
  const d = doc('lieux.html'), carte = require(path.join(root, 'outils/carte-vignette.cjs'));
  const atlas = d.querySelector('#fiches .mo-atlas[data-mo="lieux"]');
  assert.ok(atlas, 'atlas');
  assert.ok(atlas.querySelector('.mo-map[role="group"][aria-label]'), 'carte nommée pour les lecteurs d’écran');
  const pins = [...atlas.querySelectorAll('.mo-pins .mo-pin')];
  assert.equal(pins.length, 6);
  for (const p of pins) {
    const id = p.getAttribute('data-mo-id'), r = ED.regions.find(x => x.id === id), pt = carte.point(r.mapId || id), dot = p.querySelector('.mo-pin-dot');
    assert.equal(+dot.getAttribute('cx'), pt.x, id + ' : x'); assert.equal(+dot.getAttribute('cy'), pt.y, id + ' : y');
    assert.equal(p.getAttribute('href'), 'lieux/' + id + '.html'); assert.equal(p.getAttribute('tabindex'), '-1', 'le repère double le lien de la carte, hors tabulation');
  }
  assert.equal(atlas.querySelector('.mo-pins').getAttribute('viewBox'), '0 0 ' + carte.W + ' ' + carte.H);
  assert.match(read('monde.css'), /url\(img\/leonida-carte\.svg\)/);
  const regs = [...atlas.querySelectorAll('.mo-reg')];
  assert.equal(regs.length, 6);
  for (const r of regs) {
    const id = r.getAttribute('data-mo-id'), x = ED.regions.find(y => y.id === id);
    assert.ok(x, id);
    const m = r.querySelector('a.mo-chip--map');
    assert.equal(m.getAttribute('href'), 'carte.html#lieu=' + encodeURIComponent(x.mapId || id), id + ' : Sur la carte');
    assert.match(r.getAttribute('style'), /--c:#[0-9A-F]{6};--k:\d;--area:[a-z]{2}/);
  }
  assert.match(d.querySelector('#fiches .mo-map-cap').textContent, /non officiel/);
});

test('Personnages : jaquette en huit cases, liens « Ses liens » tirés des fiches (personnages cités et équipes des gangs), jamais inventés', () => {
  const d = doc('personnages.html'), panels = [...d.querySelectorAll('#fiches .mo-cover-grid .mo-panel')];
  assert.equal(panels.length, 8);
  const byId = Object.fromEntries(ED.characters.map(c => [c.id, c]));
  const crews = ED.factions.filter(f => ['equipe-raul', 'reseau-brian'].includes(f.id));
  for (const p of panels) {
    const id = p.getAttribute('data-mo-id'), ties = (p.getAttribute('data-mo-links') || '').split(' ').filter(Boolean);
    const expected = new Set((byId[id].characters || []).filter(c => byId[c]));
    for (const c of ED.characters) if ((c.characters || []).includes(id)) expected.add(c.id);
    for (const f of crews) if ((f.characters || []).includes(id)) for (const o of f.characters) if (o !== id) expected.add(o);
    assert.deepEqual(new Set(ties), expected, id + ' : liens');
    const shown = [...p.querySelectorAll('.mo-ties a.mo-who')].map(a => a.getAttribute('href').replace(/^personnages\/|\.html$/g, ''));
    assert.deepEqual(new Set(shown), expected, id + ' : pastilles');
    assert.match(p.getAttribute('style'), /--c:#[0-9A-F]{6};--area:[a-z]{2}/);
    assert.match(p.querySelector('.mo-panel-media img').getAttribute('style'), /object-position:\d+% \d+%/, id + ' : cadrage');
  }
  assert.ok(d.querySelector('#fiches .mo-hint[aria-hidden="true"]'), 'conseil décoratif');
});

test('Demeures : une porte par demeure (styles distincts, plaque au nom de famille), occupants et lieu tirés des fiches', () => {
  const d = doc('demeures.html'), homes = [...d.querySelectorAll('#fiches .mo-doors .mo-home')];
  assert.equal(homes.length, 4);
  const styles = new Set();
  for (const h of homes) {
    const id = h.getAttribute('data-mo-id'), x = ED.residences.find(y => y.id === id);
    const style = [...h.classList].find(c => /^mo-home--/.test(c)); styles.add(style);
    assert.ok(h.querySelector('.mo-room img') && (h.querySelector('.mo-leaf') || h.querySelector('.mo-bars')), id + ' : porte');
    assert.ok(h.querySelector('.mo-plate').textContent.length >= 4, id + ' : plaque');
    const occ = [...h.querySelectorAll('.mo-people a.mo-who')].map(a => a.getAttribute('href').replace(/^personnages\/|\.html$/g, ''));
    assert.deepEqual(occ, (x.characters || []), id + ' : occupants');
    if (x.mapId) assert.ok(h.querySelector('a.mo-chip--map[href^="carte.html#lieu="]'), id + ' : Sur la carte');
  }
  assert.equal(styles.size, 4, 'quatre portes différentes');
});

test('Planques : trois écrans de surveillance (CAM 01 à 03, quartier de la carte), occupants et repère tirés des fiches', () => {
  const d = doc('planques.html'), cams = [...d.querySelectorAll('#fiches .mo-desk .mo-cam')];
  assert.equal(cams.length, 3);
  cams.forEach((c, i) => {
    const id = c.getAttribute('data-mo-id'), x = ED.hideouts.find(y => y.id === id);
    assert.equal(c.querySelector('.mo-hud-cam').textContent, 'CAM 0' + (i + 1));
    assert.equal(c.querySelector('.mo-hud').getAttribute('aria-hidden'), 'true', 'décor de la caméra, hors lecteur d’écran');
    assert.ok(c.querySelector('.mo-hud-place').textContent.length > 3, id + ' : quartier');
    const occ = [...c.querySelectorAll('.mo-people a.mo-who')].map(a => a.getAttribute('href').replace(/^personnages\/|\.html$/g, ''));
    assert.deepEqual(occ, x.characters || [], id + ' : occupants');
    assert.ok(c.querySelector('a.mo-chip--map[href="carte.html#lieu=' + encodeURIComponent(x.mapId) + '"]'), id + ' : Sur la carte');
  });
});

test('Entreprises : huit enseignes (teinte propre, pictogramme et nature de l’adresse), quartier de la carte ou « Adresse à venir »', () => {
  const d = doc('entreprises.html'), shops = [...d.querySelectorAll('#fiches .mo-street .mo-shop')];
  assert.equal(shops.length, 8);
  const hues = new Set();
  for (const s of shops) {
    const id = s.getAttribute('data-mo-id'), x = ED.businesses.find(y => y.id === id);
    hues.add(s.getAttribute('style').match(/--h:(\d+)/)[1]);
    assert.ok(s.querySelector('.mo-sign svg.mo-sign-ico') && s.querySelector('.mo-sign h3 a.mo-link'), id + ' : enseigne');
    assert.ok(s.querySelector('.mo-kind').textContent.length > 3, id + ' : nature');
    assert.ok(s.querySelector('.mo-shutter[aria-hidden="true"]'), id + ' : rideau');
    if (x.mapId) assert.ok(s.querySelector('a.mo-chip--map') && !s.querySelector('.mo-chip--soon'), id + ' : adresse');
    else assert.ok(s.querySelector('.mo-chip--soon') && !s.querySelector('a.mo-chip--map'), id + ' : adresse à venir, sans lien de carte');
  }
  assert.equal(hues.size, 8, 'huit teintes');
});

test('mouvement : états de départ seulement sous html.mo-js (posé par monde.js, jamais sans script ni en mouvement réduit) ; survol sans déplacement ; focus visible', () => {
  const css = read('monde.css').replace(/\/\*[\s\S]*?\*\//g, ''), js = read('monde.js');
  assert.match(js, /if \(motion\) root\.classList\.add\('mo-js'\)/);
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.match(js, /'IntersectionObserver' in window/);
  /* tout ce qui cache un élément dépend de .mo-js et de :not(.is-in) */
  for (const m of css.matchAll(/([^{}]+)\{[^}]*(?:opacity:0|clip-path:inset\(0 100% 0 0\))[^}]*\}/g)) {
    const sel = m[1].trim();
    if (/@keyframes|from\b|to\b|\d+%|::after|::before|\.mo-power|\.mo-go|\.mo-spot|\.mo-glass|\.mo-panel-media::after|is-in\b/.test(sel) && !/\.mo-js/.test(sel)) continue;
    assert.ok(/^\.mo-js /.test(sel) && /:not\(\.is-in\)/.test(sel), 'état de départ sous mo-js seulement : ' + sel);
  }
  assert.match(css, /@media \(prefers-reduced-motion:reduce\)\{\s*\.mo \*,\.mo \*::before,\.mo \*::after\{animation:none!important;/);
  /* survol : aucune règle :hover ne déplace ni ne redimensionne la carte elle-même */
  for (const m of css.replace(/@media[^{]*\{/g, '').matchAll(/([^{}]*:hover[^{}]*)\{([^}]*)\}/g)) {
    const sel = m[1].trim(), body = m[2];
    if (/img|\.mo-leaf|\.mo-bars|\.mo-lock|\.mo-glass|\.mo-go::after|\.mo-scan|\.mo-name|\.mo-sign-ico|\.mo-light|\.mo-who|\.mo-chip/.test(sel)) continue;
    assert.doesNotMatch(body, /transform:|margin|padding|width|height|top:|left:/, sel + ' : la carte ne bouge pas');
  }
  assert.match(css, /\.mo-link:focus-visible\{outline:3px solid var\(--mo-coral\)/);
  assert.match(css, /\.mo-who:focus-visible,\.mo-chip--map:focus-visible\{outline:3px solid var\(--mo-coral\)/);
  /* aucune requête réseau ni mémoire : rien de tel dans le script */
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|document\.cookie|navigator\.sendBeacon/);
});

test('langues : les cinq hubs sont traduits (nature des adresses, conseils, plaques, caméras), les noms propres restent', () => {
  const KIND = { 'en/': 'Record label', 'es/': 'Sello discográfico', 'it/': 'Etichetta discografica', 'de/': 'Plattenlabel' };
  const SOON = { 'en/': 'Address to come', 'es/': 'Dirección por confirmar', 'it/': 'Indirizzo in arrivo', 'de/': 'Adresse folgt' };
  for (const l of LANGS.slice(1)) {
    const ent = doc(l + 'entreprises.html');
    assert.equal(ent.querySelector('#fiches .mo-shop[data-mo-id="only-raw-records"] .mo-kind').textContent, KIND[l], l);
    assert.equal(ent.querySelector('#fiches .mo-chip--soon span').textContent, SOON[l], l);
    assert.equal(ent.querySelector('#fiches .mo-shop[data-mo-id="jack-of-hearts"] h3 a').textContent, 'Jack of Hearts', l + ' : nom gardé');
    const per = doc(l + 'personnages.html');
    assert.doesNotMatch(per.querySelector('#fiches .mo-ties-k').textContent, /^Ses liens$/, l + ' : « Ses liens » traduit');
    assert.doesNotMatch(per.querySelector('#fiches .mo-hint').textContent, /Pointe un personnage/, l + ' : conseil traduit');
    const lie = doc(l + 'lieux.html');
    assert.doesNotMatch(lie.querySelector('#fiches .mo-map-cap').textContent, /Fond de carte communautaire/, l + ' : légende traduite');
    assert.equal(lie.querySelectorAll('#fiches .mo-reg').length, 6, l + ' : six régions');
    assert.match(read(l + 'lieux.html'), /<link rel="stylesheet" href="\.\.\/monde\.css\?v=/, l + ' : feuille partagée');
    assert.ok(doc(l + 'planques.html').querySelector('#fiches .mo-cam[data-mo-id="starlet-motel"] .mo-hud-place').textContent !== 'Comté de Kelly', l + ' : quartier traduit');
  }
});
