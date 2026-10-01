'use strict';
/* v7.55 (lot 2, VIS-02) : une seule base cartographique. img/leonida-carte.svg est dérivée du dessin de carte.html,
   les localisateurs des hubs et des fiches la posent entière sous des repères aux coordonnées de la carte interactive,
   les vignettes des cartes-lieux viennent du même calque de terres, et chaque lien « voir sur la carte » vise un lieu
   que carte.html connaît. */
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '..', '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const REF = require(path.join(root, 'outils/carte-reference.cjs'));
const C = require(path.join(root, 'outils/carte-vignette.cjs'));
const LOC = require(path.join(root, 'outils/localisateur.cjs'));

test('la référence img/leonida-carte.svg est exactement dérivée du <svg class="map-bg"> de carte.html, sans grille ni légende', () => {
  const file = read(REF.FILE);
  assert.equal(file, REF.build(), 'fichier à jour (régénérer : node outils/carte-reference.cjs)');
  assert.match(file, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 5200 6000" width="5200" height="6000" role="img"/);
  assert.match(file, /<title id="lk-carte-t">[^<]*non officiel[^<]*<\/title>/);
  for (const n of ['lyr-road', 'lyr-spec', 'lyr-county', 'lyr-label']) assert.ok(file.includes('class="' + n + '"'), n + ' conservé');
  for (const n of REF.DROP) assert.ok(!file.includes('class="' + n + '"'), n + ' retiré');
  assert.ok(!file.includes('<!--'), 'commentaires du gabarit retirés');
  /* même géométrie : chaque path du fichier est dans la source, nombre de paths identique hors calques retirés */
  const src = REF.source(), paths = file.match(/<path d="[^"]+"/g);
  assert.ok(paths.length > 1000, 'fond détaillé (' + paths.length + ' tracés)');
  for (const p of paths.slice(0, 50)) assert.ok(src.includes(p));
  assert.ok(file.includes('FOND PROVISOIRE'), 'mention du statut provisoire conservée');
  /* la carte interactive garde son dessin inline (source) */
  const page = doc('carte.html');
  assert.ok(page.querySelector('svg.map-bg g.lyr-grid'), 'carte.html garde ses calques d’outil');
});

test('hubs et fiches : le localisateur pose la référence entière (viewBox 0 0 5200 6000) et ses repères aux coordonnées de la carte', () => {
  const hash = REF.hash();
  const pages = [['armes.html', ''], ['vehicules.html', ''], ['armes/girardi-es9.html', '../'], ['vehicules/vapid-stanier.html', '../'], ['vehicules/shitzu-squalo.html', '../']];
  for (const [file, prefix] of pages) {
    const d = doc(file), svgs = [...d.querySelectorAll('#carte .lk-loc-svg')];
    assert.ok(svgs.length >= 1, file);
    for (const svg of svgs) {
      assert.equal(svg.getAttribute('viewBox'), '0 0 5200 6000', file + ' : Leonida en entier');
      const img = svg.parentElement.querySelector('img.lk-loc-base'); assert.ok(svg.parentElement.classList.contains('lk-loc-stage'), file + ' : scène img + svg');
      assert.equal(img && img.getAttribute('src'), prefix + REF.FILE + '?v=' + hash, file + ' : référence versionnée');
      assert.deepEqual([img.getAttribute('width'), img.getAttribute('height'), img.getAttribute('loading'), img.getAttribute('alt')], ['5200', '6000', 'lazy', '']);
      assert.equal(svg.querySelector('use'), null, file + ' : plus de silhouette simplifiée dans le localisateur');
      for (const pin of svg.querySelectorAll('.lk-loc-pin')) {
        const p = C.point(pin.dataset.place), dot = pin.querySelector('.lk-loc-dot');
        assert.equal(+dot.getAttribute('cx'), p.x, file + ' ' + pin.dataset.place); assert.equal(+dot.getAttribute('cy'), p.y);
      }
    }
    const old = d.querySelector('#lk-leonida');
    if (file.includes('/')) assert.equal(old, null, file + ' : les fiches n’embarquent plus de silhouette');
  }
  /* le hub Véhicules rend 13 lieux, tous numérotés sans recouvrement des numéros */
  const hub = doc('vehicules.html'), labels = [...hub.querySelectorAll('#carte .lk-loc-svg .lk-loc-lab')].map(c => ({ x: +c.getAttribute('cx'), y: +c.getAttribute('cy'), r: +c.getAttribute('r') }));
  assert.equal(labels.length, LOC.data().placesV.length);
  for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) assert.ok(Math.hypot(labels[i].x - labels[j].x, labels[i].y - labels[j].y) > labels[i].r + labels[j].r, 'numéros ' + (i + 1) + ' et ' + (j + 1) + ' se recouvrent');
});

test('vignettes des cartes-lieux : silhouette dérivée du même calque « TERRES », repère au même point', () => {
  const d = doc('armes.html');
  assert.equal(d.querySelectorAll('#lk-leonida').length, 1, 'symbole posé une fois');
  const sym = d.querySelector('#lk-leonida'); assert.equal(sym.getAttribute('viewBox'), '0 0 5200 6000');
  assert.equal(sym.querySelector('path').getAttribute('d'), C.land());
  for (const a of d.querySelectorAll('#carte .ed-place')) {
    const id = decodeURIComponent(a.getAttribute('href').split('#lieu=')[1]), p = C.point(id), pin = a.querySelector('.ed-map-pin');
    assert.equal(+pin.getAttribute('cx'), p.x, id); assert.equal(+pin.getAttribute('cy'), p.y, id);
  }
});

test('liens « voir sur la carte » : chaque #lieu= et chaque #pins= vise des lieux connus de carte.html, avec un titre', () => {
  const known = C.points();
  for (const file of ['armes.html', 'vehicules.html', 'armes/girardi-es9.html', 'vehicules/vapid-stanier.html']) {
    const d = doc(file), links = [...d.querySelectorAll('#carte a[href*="carte.html#"]')];
    assert.ok(links.length >= 3, file);
    for (const a of links) {
      const h = a.getAttribute('href').split('#')[1];
      if (h.startsWith('lieu=')) assert.ok(known[h.slice(5)], file + ' : ' + h);
      else if (h.startsWith('pins=')) { const m = h.match(/^pins=([^&]+)&t=(.+)$/); assert.ok(m, file + ' : ' + h); for (const id of m[1].split(',')) assert.ok(known[decodeURIComponent(id)], file + ' : ' + id); assert.ok(decodeURIComponent(m[2]).length > 3); }
      else assert.fail(file + ' : lien inattendu ' + h);
    }
  }
  /* carte.js lit ces deux formes */
  const js = read('carte.js');
  assert.match(js, /location\.hash\.match\(\/\^#lieu=/); assert.match(js, /location\.hash\.match\(\/\^#pins=/);
});
