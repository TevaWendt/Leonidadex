'use strict';
/* v7.94 (« une page par élément », étape 1) : l’inventaire outils/couverture-pages.cjs tourne, écrit son rapport, trouve
   chaque fiche des familles déjà en place et compte les familles à créer. v7.95 (lot A) : les familles du lot ont leurs pages
   (outils/tests/pages-elements.test.cjs les contrôle) ; le mode bloquant sera exigé quand le lot B aura écrit les autres. */
const test = require('node:test'), assert = require('node:assert'), { execFileSync } = require('node:child_process'), fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const run = args => JSON.parse(execFileSync(process.execPath, [path.join(ROOT, 'outils/couverture-pages.cjs'), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
const inv = run(['--json']);
const fam = id => inv.familles.find(f => f.id === id);
test('couverture : les familles déjà en place sont couvertes à 100 % (une page par élément, aucune page orpheline inexpliquée)', () => {
  for (const id of ['vehicules', 'armes', 'regions', 'personnages', 'entreprises', 'gangs', 'demeures', 'planques', 'animaux', 'activites', 'radios', 'videos']) {
    const f = fam(id); assert.ok(f, id);
    assert.ok(f.bilan.n > 0, id + ' : des éléments'); assert.equal(f.bilan.manque, 0, id + ' : aucun élément sans page');
    for (const it of f.items) assert.ok(it.page && fs.existsSync(path.join(ROOT, it.page)), id + ' : ' + it.id + ' a sa page');
  }
  assert.equal(fam('vehicules').bilan.n, 302); assert.equal(fam('armes').bilan.n, 27);
});
test('couverture : les familles nouvelles sont inventoriées avec une cible d’adresse stable, sans doublon', () => {
  for (const f of inv.familles.filter(f => f.nouvelle)) {
    assert.ok(f.items.length > 0, f.id);
    const seen = new Set();
    for (const it of f.items) {
      const cible = it.page || it.cible; assert.ok(cible, f.id + ' : ' + it.id + ' sans adresse');
      /* v7.96 : un doublon déclaré (moment des dossiers du monde jumeau d’une annonce) partage l’adresse de l’élément qu’il désigne */
      if (!it.doublonDe) { assert.ok(!seen.has(cible), f.id + ' : adresse en double ' + cible); seen.add(cible); }
      if (it.cible) assert.match(it.cible, /^[a-z-]+\/[a-z0-9-]+\.html$/, f.id + ' : slug ' + it.cible);
    }
  }
  /* v7.99 : 2 500 lieux jusqu’à la v7.98, 3 244 avec l’import gtadb ; chaque adresse publiée reste celle de son lieu
     (outils/lieux-adresses.json) */
  assert.ok(fam('lieux-carte').bilan.n >= 3244, fam('lieux-carte').bilan.n + ' lieux'); assert.ok(fam('quartiers-comtes').bilan.n >= 40);
  const ADR = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/lieux-adresses.json'), 'utf8')).lieux, INV = require(path.join(ROOT, 'outils/couverture-pages.cjs'));
  const lieux = new Map(Object.values(INV.FAMILLES).find(f => f.id === 'lieux-carte').items.map(it => [it.id, it]));
  assert.ok(Object.keys(ADR).length >= 2500);
  for (const [id, slug] of Object.entries(ADR)) { const it = lieux.get(id); assert.ok(it, 'lieu publié disparu : ' + id); if (it.cible) assert.equal(it.cible, 'lieux-carte/' + slug + '.html', id); }
  assert.equal(fam('options-perso-vehicules').bilan.n + fam('options-perso-armes').bilan.n, 145);
});
test('couverture : le rapport est écrit et le volume calculé', () => {
  const out = path.join(require('node:os').tmpdir(), 'couverture-pages-test.md');
  execFileSync(process.execPath, [path.join(ROOT, 'outils/couverture-pages.cjs'), '--rapport'], { cwd: ROOT, encoding: 'utf8', env: { ...process.env, COUVERTURE_SORTIE: out } });
  const md = fs.readFileSync(out, 'utf8'); fs.unlinkSync(out);
  assert.match(md, /## Tableau des familles/); assert.match(md, /## Volume à créer/); assert.match(md, /## Décisions/); assert.match(md, /## À trancher par Téva/);
  /* v7.96 (lot B) : toutes les familles ont leurs pages ; plus rien à créer hors familles modèles */
  assert.equal(inv.volume.aCreer, 0, 'à créer : ' + inv.volume.aCreer); assert.equal(inv.familles.filter(f => !f.modele).reduce((n, f) => n + f.bilan.manque, 0), 0, 'éléments sans page');
  assert.ok(!/ — | · /.test(md), 'rapport sans séparateurs « — » ni « · »');
});
