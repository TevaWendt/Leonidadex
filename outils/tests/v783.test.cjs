'use strict';
/* v7.83 (demande de Téva du 10/10/2026 : « l'Atelier 3D sur la barre directement en haut » ; « quand on clique sur les cartes
   [des six sections du monde], la plupart ne sont pas très enrichies au niveau du texte, ou même au niveau des visuels ») :
   - « Le dossier » de chaque fiche des six sections (outils/monde-dossiers.json → outils/lore-gen.js) : fiche d'identité,
     chronologie des révélations, repères de la série, questions ouvertes, sources ; il remplace le résumé « Ce qu'il faut
     retenir », qui répétait « À retenir » (les animaux le gardent) ;
   - 28 nouveaux visuels officiels (captures de l'Extended Look, jaquette, carte postale, affiches des vidéos) et des galeries
     plus fournies ;
   - légendes et textes corrigés d'après les textes alternatifs officiels de Rockstar (Stock 305, Sara's, Electric Fang,
     Grassrivers 01, Mount Kalaga 05, Brian, Raul…).
   Le menu (Atelier 3D dans la barre du haut) est vérifié par outils/tests/v781.test.cjs. Fichiers lus sur disque, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const DOS = JSON.parse(read('outils/monde-dossiers.json'));
const ED = JSON.parse(read('outils/editorial.json'));
const MED = JSON.parse(read('outils/medias-officiels.json'));
const HUBSRC = JSON.parse(read('outils/editorial-hubs.json')).sources;
const HUB = { regions: 'lieux', characters: 'personnages', businesses: 'entreprises', residences: 'demeures', hideouts: 'planques', factions: 'gangs' };
const FICHES = Object.entries(HUB).flatMap(([sec, hub]) => ED[sec].map(x => ({ sec, hub, x, key: sec + '/' + x.id, file: hub + '/' + x.id + '.html' })));

test('DOS-01 : un dossier complet pour chacune des 35 fiches des six sections du monde (identité, frise datée, série, questions, sources)', () => {
  assert.equal(FICHES.length, 35);
  assert.deepEqual(Object.keys(DOS.fiches).sort(), FICHES.map(f => f.key).sort());
  for (const { key } of FICHES) {
    const d = DOS.fiches[key];
    assert.ok(d.identite.length >= 3, key + ' : identité');
    for (const [t, v] of d.identite) assert.ok(t && v && v.length > 2, key + ' : ligne ' + t);
    assert.ok(d.chrono.length >= 2, key + ' : frise');
    let last = '';
    for (const c of d.chrono) {
      const e = DOS.evenements[c.ev]; assert.ok(e, key + ' : sortie ' + c.ev);
      assert.ok(['officiel', 'vu', 'comm', 'conf'].includes(c.statut), key + ' : statut');
      assert.ok(c.texte.length > 30, key + ' : texte de ' + c.ev);
      const tri = { cover: '2026-06-18', shots: '2026-08-31' }[c.ev] || e.iso; assert.ok(tri >= last, key + ' : frise dans l’ordre'); last = tri;
      if (c.media) { assert.ok(MED[c.media], key + ' : visuel ' + c.media); assert.ok(fs.existsSync(path.join(root, MED[c.media].variants[0].src.slice(1))), c.media); }
    }
    assert.ok(d.serie.length >= 1, key + ' : repères de la série');
    for (const s of d.serie) { assert.match(s.annee, /^(19|20)\d\d$/); assert.ok(Number(s.annee) < 2026, key + ' : un repère de la série est un jeu déjà sorti'); }
    assert.ok(d.questions.length >= 1 && d.questions.every(q => /\?$/.test(q)), key + ' : questions');
    assert.ok(d.sources.length >= 2, key + ' : sources');
    for (const id of d.sources) { const s = HUBSRC[id] || DOS.sources[id]; assert.ok(s, key + ' : source ' + id); assert.match(s.url, /^https:\/\//); assert.ok(['officiel', 'vu', 'comm'].includes(s.statut), id); }
  }
  /* les sorties officielles : dates connues, visuels officiels */
  assert.equal(DOS.evenements.t1.iso, '2023-12-04'); assert.equal(DOS.evenements.t2.iso, '2025-05-06');
  assert.equal(DOS.evenements.el.iso, '2026-08-27'); assert.equal(DOS.evenements.radio.iso, '2026-10-08');
  for (const id of ['affiche-trailer-1', 'affiche-trailer-2', 'affiche-extended-look', 'cover-art-officielle']) assert.ok(MED[id], id);
});

test('DOS-02 : chaque fiche affiche le dossier (lien depuis le haut de page, frise datée avec statuts, galerie ancrée) ; plus de résumé répété', () => {
  for (const { key, file, x } of FICHES) {
    const d = doc(file), D = DOS.fiches[key];
    const s = d.querySelector('section#dossier.lkd'); assert.ok(s, file + ' : dossier');
    assert.equal(s.querySelector('h2').textContent, 'Le dossier');
    assert.ok(d.querySelector('.lore-links a[href="#dossier"]'), file + ' : lien « Lire le dossier »');
    assert.equal(s.querySelectorAll('.lkd-dl > div').length >= D.identite.length, true, file + ' : identité');
    const evs = s.querySelectorAll('ol.lkd-tl > li.lkd-ev'); assert.equal(evs.length, D.chrono.length, file + ' : frise');
    for (const li of evs) {
      assert.match(li.querySelector('time').getAttribute('datetime'), /^\d{4}-\d{2}(-\d{2})?$/);
      assert.ok(li.querySelector('.lkd-st'), file + ' : statut');
      const img = li.querySelector('img'); if (img) { assert.equal(img.getAttribute('alt'), ''); assert.equal(img.getAttribute('loading'), 'lazy'); }
    }
    assert.equal(s.querySelectorAll('.lkd-sc').length, D.serie.length);
    assert.equal(s.querySelectorAll('.lkd-q li').length, D.questions.length);
    assert.equal(s.querySelectorAll('.lkd-src-list a[target="_blank"][rel~="noopener"]').length, D.sources.length);
    /* chaque texte dans son propre bloc (la mémoire de traduction les prend un par un) */
    for (const el of s.querySelectorAll('.lkd-ev-txt > *, .lkd-dl dt, .lkd-dl dd, .lkd-sc > *')) assert.ok(el.children.length <= 1, file + ' : bloc simple');
    assert.equal(d.querySelector('.lk-recap'), null, file + ' : plus de résumé répété');
    const gal = d.querySelector('.lore-gallery'), link = s.querySelector('.lkd-dl a[href="#galerie"]');
    if (gal) { assert.equal(gal.id, 'galerie', file); assert.ok(link, file + ' : nombre de visuels relié à la galerie'); assert.match(link.textContent, new RegExp('^' + gal.querySelectorAll('.lore-slide').length + ' sur cette fiche$')); }
    /* l'ordre de lecture : présentation, dossier, carte, images */
    const body = d.querySelector('.lore-body'); assert.ok(body.compareDocumentPosition(s) & 4, file + ' : après la présentation');
    if (gal) assert.ok(s.compareDocumentPosition(gal) & 4, file + ' : avant la galerie');
  }
  /* les animaux gardent leur résumé */
  assert.ok(doc('animaux/alligator.html').querySelector('.lk-recap'), 'animaux : résumé gardé');
  const css = read('lk-sections.css');
  assert.match(css, /\.lkd-id\{position:sticky;top:104px;/);
  assert.match(css, /@media \(max-width:980px\)\{\.lkd-top\{grid-template-columns:minmax\(0,1fr\);gap:30px;\}\.lkd-id\{position:static;\}/);
});

test('DOS-03 : galeries plus fournies et nouveaux visuels officiels (28, trois tailles chacun, crédit Rockstar)', () => {
  const NEW = ['jason-duval-07', 'jason-duval-08', 'jason-duval-09', 'jason-duval-10', 'lucia-caminos-07', 'lucia-caminos-08', 'lucia-caminos-09', 'lucia-caminos-10',
    'jason-and-lucia-01', 'jason-and-lucia-03', 'jason-and-lucia-04', 'jason-and-lucia-05', 'jason-and-lucia-06', 'jason-and-lucia-07', 'jason-and-lucia-08', 'jason-and-lucia-10', 'jason-and-lucia-11', 'jason-and-lucia-13',
    'vice-city-02', 'vice-city-04', 'port-gellhorn-03', 'vintage-vice-city-pack-01', 'vintage-vice-city-pack-02', 'cover-art-officielle', 'carte-postale-vice-city', 'affiche-trailer-1', 'affiche-trailer-2', 'affiche-extended-look'];
  assert.equal(NEW.length, 28);
  for (const id of NEW) {
    const m = MED[id]; assert.ok(m, id); assert.match(m.credit, /Rockstar Games/); assert.match(m.source, /^https:\/\/www\.rockstargames\.com\/VI\/media\//);
    for (const w of [480, 800, 1280]) assert.ok(fs.existsSync(path.join(root, 'img/officiel/' + id + '-' + w + '.webp')), id + ' ' + w);
  }
  const count = f => doc(f).querySelectorAll('.lore-gallery .lore-slide').length;
  assert.ok(count('personnages/jason.html') >= 12); assert.ok(count('personnages/lucia.html') >= 12); assert.ok(count('lieux/vice-city.html') >= 12);
  assert.ok(count('lieux/grassrivers.html') >= 7); assert.ok(count('lieux/leonida-keys.html') >= 8); assert.ok(count('gangs/forces-de-l-ordre.html') >= 10);
  for (const [f, id] of [['personnages/jason.html', 'jason-duval-07'], ['personnages/lucia.html', 'lucia-caminos-07'], ['lieux/vice-city.html', 'vintage-vice-city-pack-01'], ['lieux/grassrivers.html', 'jason-and-lucia-13'], ['entreprises/stock-305.html', 'stock-305-clothing-store-02']])
    assert.ok(doc(f).querySelector('.lore-gallery a[href="/img/officiel/' + id + '-1280.webp"]'), f + ' : ' + id);
  /* le premier visuel (celui du haut de page) ne change pas */
  assert.equal(ED.characters.find(x => x.id === 'jason').media[0], 'jason-duval-01');
  assert.equal(ED.regions.find(x => x.id === 'vice-city').media[0], 'vice-city-01');
});

test('DOS-04 : légendes et textes corrigés d’après les textes alternatifs officiels de Rockstar', () => {
  const G = JSON.parse(read('outils/galeries-monde.json'));
  assert.match(G['stock-305-clothing-store-01'].alt, /Lucia appuyée contre un van peint, Jason assis sur le toit/);
  assert.match(G['sara-s-unisex-salon-02'].alt, /^Jason regarde par-dessus son épaule, avec une coupe mulet/);
  assert.match(G['electric-fang-tattoo-03'].alt, /^Jason et Lucia posent/);
  assert.match(G['electric-fang-tattoo-04'].alt, /le dos de Jason/);
  assert.match(G['grassrivers-01'].alt, /sur un hydroglisseur avec un alligator et un félin abattus/);
  assert.match(G['mount-kalaga-national-park-05'].alt, /^Un puma/);
  assert.match(G['brian-heder-04'].alt, /tend un pistolet à Jason/);
  for (const [k, v] of Object.entries(G)) if (!k.startsWith('_')) { assert.ok(v.legende && v.legende.length > 3, k); assert.ok(v.alt && v.alt.length > 20, k + ' : texte alternatif'); }
  const all = JSON.stringify(ED);
  for (const wrong of ['Real Dimez sur le toit', 'toit de voiture devant Stock 305', 'que Real Dimez et le scénario traversent', 'Real Dimez et le scénario y trouvent', 'en pleine dispute avec Jason', 'boîte de crevettes', 'sur le toit d’un immeuble de Vice City', 'devant leur atelier', 'Jason en train de se faire couper', 'un client au dos entièrement encré'])
    assert.ok(!all.includes(wrong), 'corrigé : ' + wrong);
  const fang = ED.businesses.find(x => x.id === 'electric-fang');
  assert.ok(fang.facts.some(f => /FAILE/.test(f)));
  assert.ok(ED.businesses.find(x => x.id === 'one-eyed-willie').facts.some(f => /Lake Leonida/.test(f)));
});

test('DOS-05 : le dossier est traduit dans les quatre langues (titres, frise, statuts, repères, questions)', () => {
  const H = { en: ['The file', 'ID card', 'Reveal timeline', 'Series benchmarks'], es: ['El expediente', 'Ficha de identidad', 'Cronología de las revelaciones', 'Referencias de la saga'], it: ['Il dossier', 'Carta d’identità', 'Cronologia delle rivelazioni', 'Riferimenti della serie'], de: ['Das Dossier', 'Steckbrief', 'Chronik der Enthüllungen', 'Referenzen aus der Reihe'] };
  for (const [l, [h2, id, ch, se]] of Object.entries(H)) {
    for (const f of ['lieux/vice-city.html', 'personnages/lucia.html', 'gangs/san4san.html', 'entreprises/electric-fang.html']) {
      const d = doc(l + '/' + f), s = d.querySelector('#dossier'); assert.ok(s, l + '/' + f);
      assert.equal(s.querySelector('h2').textContent.trim(), h2, l + '/' + f);
      const h3 = [...s.querySelectorAll('h3')].map(x => x.textContent.trim());
      assert.ok(h3.includes(id) && h3.includes(ch), l + '/' + f + ' : ' + h3.join(' | '));
      if (s.querySelector('.lkd-serie')) assert.ok(h3.includes(se), l + '/' + f);
      const txt = s.textContent;
      for (const fr of ['Fiche d’identité', 'Chronologie des révélations', 'Repères de la série', 'Sources de ce dossier', 'Vu dans un média', 'sur cette fiche']) assert.ok(!txt.includes(fr), l + '/' + f + ' : « ' + fr + ' » traduit');
    }
    for (const lang of ['en', 'es', 'it', 'de']) {
      const m = JSON.parse(read('outils/langues/' + lang + '/v783.json'));
      assert.ok(Object.keys(m).length > 500, lang);
    }
  }
});
