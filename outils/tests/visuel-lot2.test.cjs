'use strict';
/* v7.55 (lot 2) : VIS-03 (apparition des carnets de Progression par LKMotion), VIS-04 (cartes-fiches alignées),
   CONT-01 (« Méthode et sources » de Collectibles au format « Sources et statuts »), et la correction de la v7.54 :
   un bloc qui porte les deux langages d'apparition (rise + lk-reveal) est montré entièrement. VIS-01 et VIS-02 sont
   couverts par hubs-v740.test.cjs et carte-reference-lot2.test.cjs. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const { load } = require('./runtime-helper.cjs');

test('v7.54 corrigée : un bloc « rise » qui reçoit aussi « lk-reveal » est montré (in + is-in), rien ne reste à opacité 0', async () => {
  /* v7.70 : les hubs du monde (planques.html…) sont « distribués » comme les gangs (lkx-deal), sans bloc rise : une fiche de planque à la place */
  for (const file of ['planques/starlet-motel.html', 'index.html', 'collectibles.html', 'vehicules/vapid-stanier.html']) {
    const p = await load(root, file);
    const both = [...p.d.querySelectorAll('.lk-reveal')].filter(el => el.classList.contains('rise') || el.classList.contains('reveal'));
    assert.ok(both.length > 0, file + ' : des blocs à double langage existent (' + both.length + ')');
    for (const el of both) assert.ok(el.classList.contains('in') && el.classList.contains('is-in'), file + ' : ' + el.className);
    for (const el of p.d.querySelectorAll('.lk-reveal:not(.lk-stack)')) assert.ok(el.classList.contains('is-in'), file + ' : lk-reveal montré : ' + el.className);
  }
  const js = read('common.js');
  assert.match(js, /const modern = el => el\.classList\.contains\('lk-reveal'\)/);
  /* v7.66 (latence) : lectures puis écritures groupées ; le bloc déjà suivi est toujours montré sans transition (show(el, 0, true)) */
  assert.match(js, /legacy\(el\) && el\.classList\.contains\('in'\)\) again\.push\(el\)/, 'bloc déjà suivi : mis de côté pour être montré');
  assert.match(js, /again\.forEach\(function \(el\) \{ show\(el, 0, true\); \}\)/, 'bloc déjà suivi : montré sans transition quand il reçoit lk-reveal');
});

test('VIS-03 : les neuf cartes de Progression entrent par LKMotion (cascade), compteurs écrits sans attendre, données intactes', async () => {
  const p = await load(root, 'progression.html');
  const cards = [...p.d.querySelectorAll('#suivi .cn-dcard')];
  assert.equal(cards.length, 9);
  cards.forEach((c, i) => {
    assert.ok(c.classList.contains('lk-reveal') && c.classList.contains('lk-reveal--zoom'), 'carte ' + i + ' suivie par LKMotion');
    assert.ok(c.classList.contains('is-in'), 'carte ' + i + ' à l’écran : montrée');
    assert.equal(c.dataset.lkStagger, '1'); assert.match(c.style.getPropertyValue('--lk-delay'), /^\d+ms$/);
    assert.ok(!c.querySelector('figure.lk-reveal'), 'pas de rideau séparé sur l’image de la carte');
  });
  /* compteurs écrits par progression.js à l’exécution, indépendamment de l’apparition */
  for (const c of cards) { const n = c.querySelector('.cn-dcard-n, #progress-calc-n'); assert.ok(n && n.textContent.trim().length > 0, 'compteur rempli : ' + c.id); }
  assert.equal(p.d.querySelector('#carnet-collectibles .cn-dcard-n').textContent.trim(), 'À documenter', 'catalogue vide : texte immédiat, pas un 0');
  assert.equal(p.d.querySelector('#carnet-garage [data-cn-total]').textContent.replace(/\s/g, ''), '302');
  const js = read('common.js');
  assert.match(js, /GRID_CARDS = '[^']*\.cn-dcard'/, 'cartes de Progression dans la liste des cartes à cascade');
  assert.match(js, /\.d-card, \.lore-card, \.ed-step, \.cn-dcard'\)\) return; add\(el, 'clip'\)/, 'leurs figures ne reçoivent pas de rideau');
  const css = read('style.css');
  assert.match(css, /\.js \.lk-reveal\.is-in:not\(\.lk-settled\)\{transform:none;transition:/, 'déplacement d’entrée limité à l’apparition : le survol garde ses règles');
  assert.ok(/\.cn-dcard:hover\{transform:translate\(-2px,-2px\)/.test(read('carnets.css')), 'survol des carnets inchangé');
});

test('VIS-04 : cartes-fiches des hubs du monde alignées (cadre 16/9 réel, grilles imbriquées, action en bas)', () => {
  const css = read('style.css');
  assert.match(css, /\.lore-card>img,\.lore-card>\.lore-vide\{height:auto;aspect-ratio:16\/9;object-fit:cover/);
  assert.match(css, /@supports \(grid-template-rows:subgrid\)\{\s*\.lore-grid>\.lore-card\{display:grid;[^}]*grid-template-rows:subgrid;grid-row:span 6;row-gap:0\}/);
  for (const row of ['.veh-marque{grid-row:1}', 'h3{grid-row:2}', '.lore-cardtag{grid-row:3}', 'p:not(.lore-cardtag){grid-row:4}', '.veh-go{grid-row:5;align-self:end']) assert.ok(css.includes('.veh-body>' + row), row);
  const d = doc('planques.html'), cards = [...d.querySelectorAll('#fiches .lore-grid > .lore-card')];
  assert.equal(cards.length, 3);
  for (const c of cards) {
    const img = c.querySelector(':scope > img, :scope > .lore-card-media > img'); assert.ok(img, 'image directe, ou dans son cadre (v7.75 : cartes « pro »)');
    const body = c.querySelector(':scope > .veh-body'); assert.ok(body);
    assert.deepEqual([...body.children].map(x => x.tagName.toLowerCase() + (x.className ? '.' + x.className : '')), ['span.veh-marque', 'h3', 'p.lore-cardtag', 'p', 'span.veh-go'], 'structure attendue par les rangées');
  }
  /* la carte centrale a bien une image d’un autre ratio : c’est le cadre, pas l’image, qui aligne */
  assert.ok(cards.some(c => c.querySelector('img').getAttribute('height') !== cards[0].querySelector('img').getAttribute('height')) || cards.some(c => c.querySelector('img').getAttribute('height') === '216'), 'au moins une image 1280 × 576 dans la grille');
});

test('CONT-01 : « Méthode et sources » de Collectibles est généré au format « Sources et statuts », avec une recherche datée et sourcée', () => {
  const d = doc('collectibles.html'), sec = d.querySelector('section#methode-sources');
  assert.ok(sec && sec.classList.contains('ed') && sec.classList.contains('ed--night') && sec.classList.contains('ed--coral'), 'section nuit, accent corail');
  assert.ok(sec.closest('.ed-zone--collectibles'));
  assert.equal(sec.querySelector('.ed-title').textContent, 'Méthode et sources');
  assert.match(sec.querySelector('.ed-kicker').textContent, /^Sources et statuts · \d+ pages ouvertes$/);
  const levels = [...sec.querySelectorAll('.ed-levels .ed-level h3')].map(h => h.textContent.trim());
  const ED = JSON.parse(read('outils/editorial-hubs.json'));
  assert.deepEqual(levels, ED.statuts.map(s => s.titre), 'les quatre niveaux du site, dans le même ordre que les hubs du monde');
  const etat = [...sec.querySelectorAll('.ed-srcs--etat > li')]; assert.ok(etat.length >= 4, 'état des connaissances');
  for (const li of etat) { assert.ok(li.querySelector('.ed-status .pip')); const a = li.querySelector('a.ed-pair-src'); assert.ok(a && sec.querySelector(a.getAttribute('href')), 'chaque fait renvoie à une page consultée'); }
  assert.ok(sec.querySelector('#methode') && sec.querySelectorAll('.ed-cols .ed-col').length === 3, 'entrer, vérifier, mettre à jour');
  const srcs = [...sec.querySelectorAll('#sources ~ .ed-srcs > li, .ed-srcs:not(.ed-srcs--etat) > li')];
  assert.ok(srcs.length >= 6, 'pages consultées');
  for (const li of srcs) {
    const a = li.querySelector('a.ed-src-link'); assert.match(a.getAttribute('href'), /^https:\/\//); assert.equal(a.getAttribute('rel'), 'noopener nofollow');
    assert.match(li.querySelector('.ed-src-meta').textContent, /consulté le \d{2}\/\d{2}\/\d{4}/); assert.ok(li.querySelector('.ed-status .ed-st'));
  }
  assert.ok(srcs.some(li => /rockstargames\.com/.test(li.querySelector('a').href)), 'Rockstar d’abord');
  assert.ok(sec.querySelector('time#col-review-date[datetime="2026-10-01"]'), 'date de revue');
  assert.match(sec.querySelector('#col-review-summary').textContent, /Aucune collection suffisamment documentée/, 'résumé mis à jour par le générateur');
  assert.match(sec.querySelector('.ed-callout').textContent, /Ce qu’on ne fait pas\./);
  assert.ok(sec.querySelector('.ed-callout a[href="tuto.html#sources"]') && sec.querySelector('.ed-callout a[href="contact.html"]'));
  /* rien d’inventé : aucun objet, aucune quantité, aucun emplacement */
  assert.doesNotMatch(sec.textContent, /\b(\d+)\s+(magazines|cartes à collectionner|paquets|figurines)\b/i);
  const J = JSON.parse(read('outils/collectibles.json'));
  assert.equal(J.items.length, 0); assert.equal(J.updatedAt, J.veille.revueAt);
  for (const s of J.veille.sources) assert.ok(s.consultedAt <= J.veille.revueAt && /^https:\/\//.test(s.url));
  assert.ok(!/veille/.test(read('collectibles-data.js')), 'la veille éditoriale ne part pas dans les données publiques');
  assert.ok(!d.querySelector('.col-method, .lk-fold, aside.col-sources'), 'ancien bloc retiré');
});
