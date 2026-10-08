'use strict';
/* v7.69 (demandes de Téva du 06/10/2026) : pile d’images en 3D, visionneuse d’images, calculateur de trajet de la carte, Tuto
   adapté au calculateur actuel (chapitre « Poser ta question », captures refaites), filtres des consommables, pastilles de
   navigation, et les pages qui faisaient « brouillon » : Comparateur, Classement, Logements, Véhicules rares, bandeau « Et
   après ? ». Les traductions des nouveaux textes sont dans outils/langues/<code>/v769.json. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..'), { load } = require('./runtime-helper.cjs');
const { JSDOM } = require('jsdom');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const exists = src => fs.existsSync(path.join(root, String(src).replace(/^(\.\.\/)+/, '').replace(/^\//, '').split(/[?#]/)[0]));
const fire = (p, node, type = 'click') => node.dispatchEvent(new p.w.Event(type, { bubbles: true, cancelable: true }));

test('pile d’images : espace 3D, profondeur par carte, conteneur traversé par la souris, ordre de secours', () => {
  const css = read('style.css');
  assert.match(css, /\.lk-stack\{[^}]*perspective:1100px;transform-style:preserve-3d;pointer-events:none;/);
  assert.match(css, /\.lk-stack figure\{--lk-sx:0%;--lk-sy:0%;--lk-sz:0px;[^}]*pointer-events:auto;/);
  assert.match(css, /translate3d\(var\(--lk-sx\),var\(--lk-sy\),var\(--lk-sz\)\)/);
  for (let i = 1; i <= 3; i++) assert.match(css, new RegExp('\\.lk-stack figure:nth-child\\(' + i + '\\)\\{[^}]*z-index:' + i + ';'));
  assert.match(css, /\.lk-stack figure:has\(>\.lk-stack-link:focus-visible\)\{--lk-sz:56px;/, 'le clavier fait le même mouvement que la souris');
});

test('visionneuse d’images : déclarée en lk/lazy sur les pages qui ont un lien vers une image, textes et clavier', () => {
  const common = read('common.js');
  assert.match(common, /script\[type="lk\/lazy"\]\[src\*="lk-visionneuse\.js"\]/);
  assert.match(common, /window\.LK\.lazyScript\('lk-visionneuse\.js'\)/);
  for (const f of ['tuto.html', 'animaux/alligator.html']) assert.match(read(f), /<script type="lk\/lazy" src="(?:\.\.\/)?lk-visionneuse\.js(?:\?v=[a-f0-9]+)?"><\/script>/, f);
  const js = read('lk-visionneuse.js');
  for (const t of ['Visionneuse d’images', 'Image précédente', 'Image suivante', 'Fermer la visionneuse', 'Image {n} sur {total}']) assert.ok(js.includes(t), t);
  for (const k of ['ArrowLeft', 'ArrowRight', 'Home', 'End']) assert.ok(js.includes("'" + k + "'"), k);
  assert.match(js, /showModal/, 'boîte de dialogue modale : Échap la ferme');
  assert.match(js, /prefers-reduced-motion: reduce/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|document\.cookie/, 'rien n’est enregistré');
});

test('calculateur de trajet : ancre #trajet, panneau, véhicules du site, clé lk_trajet_v1 déclarée dans les Mentions', () => {
  const d = doc('carte.html');
  assert.ok(d.getElementById('trajet') && d.getElementById('trajet').closest('#map-trajet'), 'carte.html#trajet vise le panneau');
  assert.ok(d.getElementById('map-trajet-fab'), 'bouton « Calculer un trajet »');
  const c = { window: {} }; vm.runInNewContext(read('carte-vehicules.js'), c);
  const V = c.window.LK_TRAJET_VEHICULES; assert.ok(Array.isArray(V) && V.length >= 100, 'véhicules du site');
  for (const v of V.slice(0, 20)) { assert.equal(v.length, 3); assert.match(v[0], /^[a-z0-9-]+$/); }
  const js = read('carte.js');
  assert.match(js, /const TRAJET_KEY = 'lk_trajet_v1'/); assert.match(js, /validTrajet/);
  assert.match(read('mentions-legales.html'), /lk_trajet_v1/);
  assert.ok(read('outils/sync-site.cjs').includes("carte-vehicules.js"), 'liste générée par sync-site');
  const leo = JSON.parse(read('outils/leo-knowledge.json')).topics.find(t => t.id === 'carte-distance');
  assert.equal(leo.links[0].url, '/carte.html#trajet');
});

test('consommables : filtre par catégorie (boutons radio, transitions de vue), pastilles de navigation des hubs', () => {
  const d = doc('nourriture.html');
  const f = d.querySelector('fieldset.cg-filter[data-lk-vt]'); assert.ok(f, 'filtre');
  assert.equal(f.querySelector('legend').textContent.trim(), 'Filtrer les consommables par catégorie');
  assert.ok(f.querySelectorAll('input[type="radio"]').length >= 5);
  const shell = require('../site-shell.cjs');
  assert.equal(shell.chipSetOf('lieux.html'), 'monde'); assert.equal(shell.chipSetOf('missions.html'), 'jouer');
  const chips = [...doc('lieux.html').querySelectorAll('nav.lk-chips a')].map(a => a.textContent.trim());
  for (const t of ['Animaux', 'Collectibles', 'La carte de Leonida', 'Mes carnets']) assert.ok(chips.includes(t), t);
  assert.ok(!chips.includes('Lieux'), 'pas de pastille vers la page elle-même');
});

test('Tuto : chapitre « Poser ta question » (IA ou Local), captures refaites, FAQ trajet, lien d’agrandissement', () => {
  const html = read('tuto.html'), d = new JSDOM(html).window.document;
  const ch = d.getElementById('poser-question'); assert.ok(ch, 'chapitre');
  assert.equal(ch.querySelector('h2').textContent.trim(), 'Poser ta question');
  assert.ok(d.querySelector('#sommaire a[href="#poser-question"]'), 'sommaire');
  const fig = ch.querySelector('figure[data-capture="ask"]'); assert.ok(fig, 'capture de la barre');
  assert.ok(exists(fig.querySelector('img').getAttribute('src')));
  assert.match(ch.textContent, /15\s?questions IA gratuites toutes les 12\s?h/); /* v7.71 */
  assert.ok(ch.querySelector('a[href="mentions-legales.html#donnees-ia"]'), 'ce qui part : renvoi aux Mentions');
  assert.ok(doc('mentions-legales.html').getElementById('donnees-ia'));
  const btn = ch.querySelector('a.t-button'); assert.match(btn.getAttribute('href'), /chapter=poser-question#que-calculer$/);
  const faq = d.getElementById('faq'); assert.ok(faq.querySelector('a[href="carte.html#trajet"]'), 'FAQ : calcul de trajet');
  assert.ok(faq.querySelector('a[href="#poser-question"]'));
  assert.doesNotMatch(html, /Agrandir la capture ↗/, 'la capture s’ouvre dans la visionneuse : plus de flèche « nouvel onglet »');
  const shots = JSON.parse(read('outils/tuto-captures.json'));
  for (const k of ['ask', 'ask-mobile']) { assert.ok(shots[k], k); assert.ok(exists(shots[k].src), k); }
  assert.match(read('calculateurs.js'), /tutorialChapters=\['demarrer','poser-question','modes'/);
  assert.match(read('outils/tuto-shots.py'), /'ask':/);
});

test('Tuto : le bouton « Poser ma question » ouvre le calculateur avec le retour vers le chapitre', async () => {
  const p = await load(root, 'calculateurs.html?tool=goal&mode=simple&from=tuto&chapter=poser-question#que-calculer', {});
  const back = p.d.getElementById('calc-tuto-return');
  assert.ok(back && !back.hidden); assert.match(back.getAttribute('href'), /tuto\.html#poser-question$/);
  assert.deepEqual(p.errors, []); p.close();
});

test('Léo : sujet « combien de questions à l’IA », liens vers le Tuto et les Mentions', () => {
  const t = JSON.parse(read('outils/leo-knowledge.json')).topics.find(x => x.id === 'ia-questions');
  assert.ok(t); assert.match(t.text, /15 questions gratuites/); assert.match(t.text, /12 heures/); /* v7.71 */
  assert.deepEqual(t.links.map(l => l.url), ['/tuto.html#poser-question', '/mentions-legales.html#donnees-ia']);
});

test('comparateur : choix Véhicules / Armes, colonnes illustrées, comparaisons toutes prêtes, tableau par thèmes', async () => {
  const p = await load(root, 'comparateur.html?type=vehicules&ids=grotti-cheetah-classic,declasse-mamba-gt', {});
  const d = p.d;
  assert.equal(d.querySelector('[data-cmp-type][aria-current="page"]').dataset.cmpType, 'vehicules');
  const slots = d.querySelectorAll('#cmp-pick .cmp-slot'); assert.equal(slots.length, 3);
  assert.equal(d.querySelectorAll('#cmp-pick .cmp-slot.is-empty').length, 1);
  assert.ok(slots[0].querySelector('.cmp-slot-art img'), 'photo officielle ou schéma');
  assert.equal(slots[0].querySelector('.cmp-slot-name a').getAttribute('href'), 'vehicules/grotti-cheetah-classic.html');
  assert.equal(d.querySelectorAll('#cmp-table tr.cmp-group').length, 3, 'Ce qu’on sait, L’achat, En jeu');
  assert.ok(d.querySelectorAll('#cmp-table .cmp-wait').length >= 10, 'ce qui n’est pas publié est marqué');
  assert.ok(d.getElementById('cmp-empty').hidden); assert.ok(!d.getElementById('cmp-calculator').hidden);
  const quick = [...d.querySelectorAll('#cmp-quick button')]; assert.equal(quick.length, 4);
  fire(p, quick[2]);
  assert.match(p.w.location.search, /ids=shitzu-squalo%2Cspeedophile-seashark%2Cshitzu-tropic/);
  assert.equal(quick[2].getAttribute('aria-pressed'), 'true');
  assert.equal(d.querySelectorAll('#cmp-pick .cmp-slot.is-empty').length, 0);
  fire(p, d.querySelectorAll('#cmp-pick .cmp-slot-x')[0]);
  assert.equal(d.querySelectorAll('#cmp-pick .cmp-slot.is-empty').length, 1, 'le × vide la colonne');
  assert.deepEqual(p.errors, []); p.close();
  const a = await load(root, 'comparateur.html?type=armes', {});
  assert.ok(!a.d.getElementById('cmp-empty').hidden, 'sans fiche : un message');
  assert.ok(a.d.querySelectorAll('#cmp-table .cmp-ghost').length >= 30, 'et le squelette du tableau');
  assert.ok(a.d.getElementById('cmp-calculator').hidden);
  fire(a, a.d.querySelector('#cmp-quick button'));
  assert.ok(a.d.querySelector('#cmp-pick .cmp-slot svg.veh-art--schema'), 'schéma de l’arme');
  assert.deepEqual(a.errors, []); a.close();
  const c = { window: {} }; vm.runInNewContext(read('armes-schemas.js'), c);
  const S = c.window.LK_ARMES_SCHEMAS, A = (() => { const x = { window: {} }; vm.runInNewContext(read('armes-data.js'), x); return x.window.LK_ARMES; })();
  assert.deepEqual(Object.keys(S).sort(), Array.from(A, x => x.id).sort(), 'un schéma par arme');
  assert.ok(Object.values(S).every(s => s.startsWith('<svg') && !/style=/.test(s)));
  assert.ok(JSON.parse(read('outils/langues.json')).scriptsPartages.includes('armes-schemas.js'), 'partagé par toutes les langues');
});

test('classement : places libres numérotées, compte x / 10, plus attendus en cartes qu’un clic ajoute', async () => {
  const p = await load(root, 'classement-vehicules.html', { storage: { lk_classement: '["grotti-cheetah-classic"]' } });
  const d = p.d;
  assert.equal(d.querySelectorAll('#cl-liste .cl-item').length, 1);
  assert.equal(d.querySelectorAll('#cl-liste .cl-slot').length, 9);
  assert.equal(d.getElementById('cl-count').textContent, '1');
  const cards = d.querySelectorAll('.cl-feat'); assert.equal(cards.length, 6);
  for (const c of cards) { const img = c.querySelector('img'); assert.ok(exists(img.getAttribute('src'))); assert.ok(img.getAttribute('alt').length > 20); }
  const add = d.querySelector('[data-cl-add="grotti-cheetah-classic"]'); assert.ok(add.disabled, 'déjà classé');
  const squalo = d.querySelector('[data-cl-add="shitzu-squalo"]'); fire(p, squalo);
  assert.equal(d.querySelectorAll('#cl-liste .cl-item').length, 2); assert.ok(squalo.disabled);
  assert.deepEqual(JSON.parse(p.w.localStorage.getItem('lk_classement')), ['grotti-cheetah-classic', 'shitzu-squalo']);
  assert.ok(d.querySelector('.cl-future-t caption'), 'la future grille, sans chiffres');
  assert.equal(d.querySelectorAll('.cl-future-t tbody tr').length, 3);
  assert.doesNotMatch(d.querySelector('.cl-future-t tbody').textContent, /\d{2,}/, 'aucun chiffre inventé');
  assert.deepEqual(p.errors, []); p.close();
});

test('pages sans contenu vérifié (Logements) : gabarit des futures fiches, sans nom, prix ni image inventés', () => {
  const d = doc('logements.html');
  const sk = d.querySelectorAll('.d-card--skel'); assert.equal(sk.length, 3);
  for (const c of sk) { assert.equal(c.getAttribute('aria-hidden'), 'true'); assert.equal(c.querySelector('img'), null); assert.doesNotMatch(c.textContent, /\$|\d/); }
  assert.ok(d.querySelector('.d-empty .d-skel-note'));
});

test('Véhicules rares : pile d’images reliées aux fiches ; bandeau « Et après ? » lisible partout', () => {
  const links = [...doc('vehicules-rares.html').querySelectorAll('.lk-stack .lk-stack-link')];
  assert.equal(links.length, 3);
  for (const a of links) { assert.match(a.getAttribute('href'), /^vehicules\/[a-z0-9-]+\.html$/); assert.ok(exists(a.getAttribute('href'))); }
  const css = read('style.css');
  assert.match(css, /\.lk-outro \.lk-outro-in>h2\{color:#fff;\}/, 'titre blanc même si la page colore ses h2');
  assert.match(css, /\.lk-outro \.lk-outro-links\{grid-column:2;/);
});

test('traductions v7.69 : une mémoire par langue, les chaînes de code ignorées, les identifiants jamais traduits', () => {
  for (const l of ['en', 'es', 'it', 'de']) {
    const m = JSON.parse(read('outils/langues/' + l + '/v769.json'));
    assert.ok(Object.keys(m).length > 250, l);
    assert.ok((m._ignorer || []).some(x => x.startsWith('.lkia{')), l + ' : feuille de style de lk-ia.js');
    assert.ok(m['lk-ia.js::Copier'] && m['catalogue.js::postes compatibles'], l);
    for (const [k, v] of Object.entries(m)) if (!k.startsWith('_') && typeof v === 'string') assert.doesNotMatch(v, /«|»/, l + ' : ' + k);
  }
  for (const l of ['es', 'it']) assert.equal(JSON.parse(read('outils/langues/' + l + '/v769.json'))['comparateur.js::Ultimate Edition'], '=', l + ' : valeur comparée par le code');
});
