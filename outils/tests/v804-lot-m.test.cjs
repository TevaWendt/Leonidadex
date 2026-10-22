'use strict';
/* v8.04 (lot M, demandes de Téva du 21/10/2026) : « ajouter la fonction qui permet de voir la configuration directement sur
   la fiche » et « préciser que l'Atelier 3D est en construction ».
   - « Ma configuration » (outils/sources/perso-fiche.js) : bouton « Voir ma configuration », dessin tiré des données de
     l'Atelier (atelier/<famille>/<id>.json, demandées au clic seulement), récapitulatif, lien « Ouvrir ma configuration dans
     l'Atelier 3D » au format du lien de l'Atelier ; familles de teintes à choisir ; réglages de chaque choix dans
     perso-data.js (outils/perso-fiche.cjs : APERCU, vérifié par check()).
   - « En construction » : lien du menu (outils/site-shell.cjs), boutons des fiches, bandeau de atelier-3d.html.
   Pages et scripts générés, lus sur disque, sans réseau. L'essai réel (cocher, voir le dessin changer, recharger) se fait
   dans Chromium, hors de ce fichier. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const sp = t => String(t).replace(/[\s  ]+/g, ' ').trim();
const PF = require('../perso-fiche.cjs');

test('réglages de l’aperçu : postes et options du catalogue, format du lien de l’Atelier, dans perso-data.js', () => {
  assert.deepEqual(PF.check(), []);
  const ctx = { window: {} }; vm.runInNewContext(read('perso-data.js'), ctx);
  const D = ctx.window.LK_PERSO, atelier = read('outils/sources/atelier-3d.js');
  const keys = new Set([...atelier.match(/const DEF = \{[\s\S]*?\n  \};/)[0].matchAll(/(\w+):/g)].map(m => m[1]));
  for (const [kind, fam] of [['vehicules', 'perso-vehicules'], ['armes', 'perso-armes']]) {
    for (const id of Object.keys(PF.APERCU[fam])) {
      const p = D[kind].posts.find(x => x.id === id); assert.ok(p, id);
      const qs = [p.ap, ...p.opts.map(o => o.ap || '')].join('&').split('&').filter(Boolean);
      for (const kv of qs) { const [k, v] = kv.split('='); assert.ok(k.startsWith('_') || keys.has(k), id + ' : réglage « ' + k + ' » inconnu de l’Atelier'); assert.match(v, /^-?[A-Za-z0-9]+$/, id + ' : ' + kv); }
      for (const k of [p.apc, p.apw].filter(Boolean)) assert.ok(k.startsWith('_') || keys.has(k), id + ' : ' + k);
    }
  }
  assert.equal(D.vehicules.posts.find(p => p.id === 'peinture-principale').apc, 'paint');
  assert.equal(D.armes.posts.find(p => p.id === 'silencieux').ap, 'barrel=silencer');
});

test('fiches : « Voir ma configuration » dans le script, données de l’Atelier demandées au clic, étiquette « En construction »', () => {
  const js = read('perso-fiche.js');
  for (const s of ["voirConf: 'Voir ma configuration'", "atelier: 'Ouvrir ma configuration dans l’Atelier 3D'", "'/atelier/' + kind + '/'", "'lk_perso_apercu'", 'data-pf-coul', 'data-pf-jump']) assert.ok(js.includes(s), s);
  assert.ok(!/fetch\(/.test(js.slice(0, js.indexOf('function apOpen'))), 'aucune donnée de l’Atelier demandée avant le clic');
  for (const [f, label] of [['vehicules/pegassi-zentorno.html', 'Essayer ce véhicule dans l’Atelier 3D'], ['armes/klose-k17.html', 'Essayer cette arme dans l’Atelier 3D']]) {
    const d = doc(f), a = d.querySelector('#personnaliser .pf-atelier-link'), w = d.getElementById('pf-wip');
    assert.equal(sp(a.textContent), label, f); assert.equal(a.getAttribute('aria-describedby'), 'pf-wip', f);
    assert.ok(w && sp(w.textContent) === 'En construction' && w.parentNode === a.parentNode, f + ' : étiquette à côté du bouton');
    assert.ok(d.querySelector('#personnaliser .pf-nojs a'), f + ' : sans script, la liste filtrée reste');
  }
  const css = read('fiches.css');
  for (const s of ['.pf-view{', '.pf-stage{', '.pf-jump{', '.pf-wip{', 'prefers-reduced-motion:no-preference){.js .pf-stage.is-hop']) assert.ok(css.includes(s), s);
});

test('Atelier 3D « en construction » : menu (sans toucher à la barre) et bandeau de la page', () => {
  for (const f of ['index.html', 'atelier-3d.html']) {
    const a = doc(f).querySelector('nav#nav > ul > li > a[href="atelier-3d.html"]');
    assert.ok(a && sp(a.querySelector('.nav-wip').textContent) === 'En construction', f + ' : étiquette du menu');
  }
  assert.match(read('style.css'), /\.nav-wip\{position:absolute;[^}]*\}/, 'posée hors du flux dans la barre');
  const d = doc('atelier-3d.html'), b = d.querySelector('section.at-wip');
  assert.ok(b && sp(b.querySelector('h2').textContent) === 'L’Atelier 3D est en construction');
  assert.deepEqual([...b.querySelectorAll('.at-wip-col h3')].map(h => sp(h.textContent)), ['Ce qui marche déjà', 'Ce qui arrive']);
  assert.ok(b.compareDocumentPosition(d.getElementById('atelier')) & 4, 'le bandeau précède l’Atelier');
});
