'use strict';
/* v7.84 : Atelier 3D — pré-listes de la série (GTA V, GTA Online) et vue intérieure / première personne.
   Demandes de Téva du 10/10/2026 : « des pré-listes… qu'on peut cliquer dessus pour voir la liste qui va arriver des
   camouflages, etc., qu'on peut appliquer à la voiture, à la moto » ; « la vue intérieure, ou la vue première personne pour
   les motos ». */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const { JSDOM } = require('jsdom');
const doc = f => new JSDOM(read(f)).window.document;
const sp = s => String(s).replace(/[\s  ]+/g, ' ').trim();
const PRE = JSON.parse(read('outils/atelier-prelistes.json'));
const L = id => PRE.listes.find(x => x.id === id);
const all = x => (x.items || []).concat(...(x.sous || []).map(s => s.items));

test('PRE-01 : données des pré-listes — 28 listes, sources, nombres, couleurs du jeu, libellés officiels', () => {
  assert.equal(PRE.listes.length, 28);
  const groups = { v: ['peinture', 'jantes', 'carrosserie', 'vitres', 'neons', 'phares', 'plaques', 'klaxons', 'interieur'], a: ['finitions', 'viseurs', 'canons', 'munitions'] };
  for (const x of PRE.listes) {
    assert.ok(groups[x.fam] && groups[x.fam].includes(x.groupe), x.id + ' : atelier');
    assert.ok(x.titre && x.note && x.jeu && x.compte && x.sources.length, x.id);
    for (const s of x.sources) assert.match(PRE.sources[s] && PRE.sources[s].url || '', /^https:\/\//, x.id + ' : source ' + s);
    for (const it of all(x)) { assert.ok(it.n, x.id); if (it.hex) assert.match(it.hex, /^[0-9A-F]{6}$/, x.id + ' ' + it.n); if (it.set) for (const k of Object.keys(it.set)) assert.match(k, /^(paint|finish|pearl|camo|trim|accent|tyreWall|tint|neon|neonLayout|neonColor|lights|lightColor|plateStyle|sight|barrel|ammo)$/, x.id + ' : réglage ' + k); }
  }
  /* numéros de couleur recoupés (GTA Wiki + script de Los Santos Customs), teintes des données du jeu */
  const cl = L('peinture-classique').items; assert.equal(cl.length, 75);
  assert.deepEqual(cl.find(i => i.n === 'Torino Red'), { n: 'Torino Red', hex: '8A0B00', set: { paint: '8A0B00', finish: 'gloss' } });
  assert.equal(L('peinture-metallisee').items.find(i => i.n === 'Midnight Purple').hex, '00080F');
  assert.equal(L('peinture-mate').items.length, 20); assert.equal(L('peinture-metaux').items.length, 6);
  assert.equal(L('interieur-habillage').items.length, 68); assert.equal(L('interieur-accent').items.length, 49);
  assert.equal(L('phares-couleurs').items.length, 13); assert.equal(L('phares-couleurs').items[0].hex, 'DEDEFF');
  assert.equal(L('jantes-familles').sous.length, 13); assert.equal(L('jantes-familles').sous.reduce((n, s) => n + +s.compte, 0), 324);
  assert.equal(L('jantes-familles').sous.reduce((n, s) => n + s.items.length, 0), 324 - 15 - 10, 'Bespoke en chrome ou en or, Open Wheel aussi rayées');
  assert.equal(L('klaxons').sous.reduce((n, s) => n + +s.compte, 0), 46);
  assert.equal(L('livrees-camouflage').sous.reduce((n, s) => n + s.items.length, 0), 20);
  /* libellés officiels français (données du jeu) pour les armes, les vitres, les plaques */
  assert.deepEqual(L('armes-teintes').items.map(i => i.n), ['Teinte noire', 'Teinte verte', 'Teinte or', 'Teinte rose', 'Teinte armée', 'Teinte LSPD', 'Teinte orange', 'Teinte platine']);
  assert.equal(all(L('armes-teintes-mk2')).length, 32);
  assert.deepEqual(L('armes-camouflages').items.map(i => i.n).slice(0, 3), ['Camouflage pixel', 'Camouflage pinceau', 'Camouflage forestier']);
  assert.deepEqual(L('vitres-teintes').items.map(i => i.n), ['Aucune', 'Fumé clair', 'Fumé foncé', 'Limousine']);
  assert.equal(L('plaques').sous[0].items[0].n, 'Bleu sur blanc 1');
  /* aucune liste ne prétend être celle de GTA VI */
  for (const x of PRE.listes) assert.doesNotMatch(x.jeu, /GTA VI/, x.id);
  /* motifs génériques seulement quand le nom le dit */
  const camo = all(L('livrees-camouflage')); assert.ok(!camo.find(i => i.n === 'Basic Camo').set); assert.equal(camo.find(i => i.n === 'Winter Camo').set.camo, 'neige');
  for (const l of ['en', 'es', 'it', 'de']) { const m = JSON.parse(read('outils/langues/' + l + '/v784-jeu.json')); assert.ok(m['Teinte noire'] && m['Camouflage pixel'] && m['Fumé clair'], l); }
  assert.equal(JSON.parse(read('outils/langues/en/v784-jeu.json'))['Camouflage pixel'], 'Digital Camo');
});

test('PRE-02 : page — section des pré-listes sous la maquette, onglets, cartes fermées, contenu en modèles, éléments à essayer', () => {
  const d = doc('atelier-3d.html'), pre = d.querySelector('section.at-pre[data-at-pre]');
  assert.ok(pre && pre.closest('[data-at]'), 'dans l’Atelier');
  assert.equal(pre.previousElementSibling.matches('.at-chosen'), true);
  assert.equal(sp(pre.querySelector('h2').textContent), 'Pré-listes de la série');
  assert.equal(d.querySelectorAll('.at-pl').length, 28);
  assert.deepEqual([...d.querySelectorAll('[data-at-pre-fam="v"] [data-at-pre-tab]')].map(b => b.dataset.atPreTab), ['peinture', 'jantes', 'carrosserie', 'vitres', 'neons', 'phares', 'plaques', 'interieur', 'klaxons']);
  assert.deepEqual([...d.querySelectorAll('[data-at-pre-fam="a"] [data-at-pre-tab]')].map(b => b.dataset.atPreTab), ['finitions', 'viseurs', 'canons', 'munitions']);
  for (const card of d.querySelectorAll('.at-pl')) {
    const b = card.querySelector('.at-pl-b'), body = card.querySelector('.at-pl-body'), tpl = body.querySelector('template[data-at-pl-tpl]');
    assert.equal(b.getAttribute('aria-expanded'), 'false'); assert.equal(b.getAttribute('aria-controls'), body.id); assert.ok(body.hasAttribute('hidden'));
    assert.equal(sp(card.querySelector('.at-pl-s').textContent), 'GTA VI : à venir');
    const c = tpl.content; assert.ok(c.querySelector('.at-pl-note') && c.querySelector('.at-pl-src a[rel="noopener nofollow"]'), card.dataset.atPl);
  }
  /* éléments à essayer : boutons, réglages lisibles ; noms anglais du jeu jamais traduits */
  const tpl = d.querySelector('[data-at-pl="peinture-classique"] template').content;
  const b = [...tpl.querySelectorAll('button[data-at-set]')].find(x => x.textContent.trim() === 'Torino Red');
  assert.equal(b.dataset.atSet, 'paint:8A0B00,finish:gloss'); assert.ok(b.querySelector('span[lang="en"][translate="no"]'));
  assert.match(b.querySelector('.at-pi-sw').getAttribute('style'), /--sw:#8A0B00/);
  assert.equal(d.querySelector('[data-at-pl="motos-postes"]').dataset.atCompat, 'moto');
  assert.equal(d.querySelector('[data-at-pl="armes-batte"]').dataset.atIds, 'batte');
  const fin = d.querySelector('[data-at-pl="armes-finitions"] template').content.querySelector('.at-pi--fin');
  assert.equal(sp(fin.querySelector('span').textContent), 'Finition luxe Yusuf Amir'); assert.equal(fin.querySelectorAll('.at-pi-armes li').length, 10);
  assert.ok([...d.querySelectorAll('.at-facts li')].some(li => li.querySelector('b').textContent === '971' && sp(li.querySelector('span').textContent) === 'éléments en pré-liste'), 'compteur des pré-listes');
});

test('PRE-03 : vue intérieure et première personne, nouvelles options (camouflage, jantes, flancs, néons, plaques, intérieur, klaxons, armes)', () => {
  const d = doc('atelier-3d.html');
  assert.deepEqual([...d.querySelectorAll('[data-at-angle]')].map(b => b.dataset.atAngle), ['tq', 'profil', 'face', 'arriere', 'dessus', 'interieur']);
  const ins = d.querySelector('[data-at-angle="interieur"][data-at-inside]');
  assert.equal(sp(ins.querySelector('[data-at-in-car]').textContent), 'Intérieur'); assert.equal(sp(ins.querySelector('[data-at-in-moto]').textContent), 'Première personne');
  assert.ok(d.querySelector('[data-at-help-in][hidden]') && d.querySelector('[data-at-inside-note][hidden] [data-at-note-car]') && d.querySelector('[data-at-note-moto][hidden]'));
  const vals = k => [...d.querySelectorAll('[data-at-menu="v"] input[data-at-k="' + k + '"][type="radio"]')].map(i => i.value);
  assert.deepEqual(vals('camo'), ['none', 'foret', 'desert', 'urbain', 'numerique', 'neige', 'marine']);
  assert.deepEqual(vals('rimStyle'), ['five', 'multi', 'mesh', 'wire', 'steelie', 'disc']);
  assert.deepEqual(vals('tyreWall'), ['none', 'white', 'whiteline', 'redline', 'blueline']);
  assert.deepEqual(vals('neonLayout'), ['all', 'front', 'back', 'sides', 'fb', 'fs', 'bs']);
  assert.ok(vals('plateStyle').includes('yellowblue') && vals('plateStyle').includes('yellowblack'));
  assert.deepEqual(vals('seats'), ['std', 'bucket', 'bench']); assert.deepEqual(vals('wheel'), ['std', 'sport', 'race']);
  assert.equal(d.querySelectorAll('[data-at-menu="v"] input[data-at-k="trim"][type="radio"]').length, 12);
  assert.ok(d.querySelector('[data-at-group="interieur"] [data-at-go="interieur"]'));
  assert.ok(!d.querySelector('#at-v-trim').dataset.atCompat.split(' ').includes('moto'), 'pas d’habitacle de voiture sur une moto');
  assert.deepEqual([...d.querySelectorAll('[data-at-menu="v"] .at-cat')].map(b => b.dataset.atCat), ['peinture', 'jantes', 'carrosserie', 'vitres', 'neons', 'suspension', 'phares', 'plaques', 'interieur', 'klaxons', 'perfs']);
  const a = k => [...d.querySelectorAll('[data-at-menu="a"] input[data-at-k="' + k + '"][type="radio"]')].map(i => i.value);
  assert.ok(a('finish').includes('green')); for (const c of ['digital', 'brush', 'leopard', 'zebra', 'geometric']) assert.ok(a('camo').includes(c), c);
  /* le script : habitacle bâti sur les vitres, guidon, caméra à la place du conducteur, aucun mot */
  const js = read('atelier-3d.js');
  for (const f of ['function buildCabin(', 'function buildBars(', 'function rimGroup(', 'function syncInside(', 'function applySet(', 'function preShow(', 'function preActive(']) assert.ok(js.includes(f), f);
  assert.match(js, /if \(name === 'interieur'\)/);
  assert.match(js, /const look = \{ on: false/);
  assert.match(js, /pearl: '', paint2: '1A1A1E'/);
  assert.match(js, /trim: '1A1A1E', accent: 'F4F1EA', seats: 'std', wheel: 'std'/);
  assert.doesNotMatch(js, /textContent = '[A-Za-zÀ-ÿ]{3,}/);
  const css = read('atelier-3d.css');
  assert.match(css, /grid-template-areas:"pick stage menu" "pick chosen menu" "pick pre menu"/);
  assert.match(css, /\.at-pi--try\.is-on\{/); assert.match(css, /\.at-inside-note\{/);
});

test('PRE-04 : traductions — pré-listes et vue intérieure dans les quatre langues, noms du jeu gardés', () => {
  const T = { en: ['Series pre-lists', 'Classic colors', 'Interior', 'First person', 'Digital Camo'], es: ['Prelistas de la saga', 'Colores clásicos', 'Interior', 'Primera persona', 'Camuflaje digital'], it: ['Preliste della serie', 'Colori classici', 'Interni', 'Prima persona', 'Mimetica digitale'], de: ['Vorlisten aus der Reihe', 'Klassische Farben', 'Innenraum', 'Ego-Perspektive', 'Digitaltarnung'] };
  for (const [l, t] of Object.entries(T)) {
    const d = doc(l + '/atelier-3d.html');
    assert.equal(sp(d.querySelector('.at-pre h2').textContent), t[0], l);
    assert.equal(sp(d.querySelector('[data-at-pl="peinture-classique"] .at-pl-t').textContent), t[1], l);
    assert.equal(sp(d.querySelector('[data-at-in-car]').textContent), t[2], l);
    assert.equal(sp(d.querySelector('[data-at-in-moto]').textContent), t[3], l);
    const c = d.querySelector('[data-at-pl="armes-camouflages"] template').content;
    assert.equal(sp(c.querySelector('[data-at-set="camo:digital"]').textContent), t[4], l);
    const cl = d.querySelector('[data-at-pl="peinture-classique"] template').content;
    assert.ok([...cl.querySelectorAll('[data-at-set]')].some(b => b.textContent.trim() === 'Torino Red'), l + ' : nom du jeu gardé');
    assert.doesNotMatch(sp(d.querySelector('.at-pre').textContent), /à venir|Pré-listes|Couleurs classiques/, l);
  }
});
