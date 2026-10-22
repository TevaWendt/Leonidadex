'use strict';
/* v8.04 (chiffres du site) : les nombres que le site affiche sur lui-même suivent les données, et la géolocalisation des lieux
   ne montre jamais « ? » comme lieu réel. Lecture des pages françaises servies (après régénération), sans navigateur. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const txt = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
const n = s => +String(s).replace(/[^\d]/g, '');
function carte() {
  const c = { window: {} }; for (const f of ['vehicules-data.js', 'carte-gtadb.js']) vm.runInNewContext(read(f), c);
  const src = read('carte.js'), P = vm.runInNewContext('(' + src.match(/const POINTS = (\[[\s\S]*?\n  \]);/)[1] + ')');
  const cats = vm.runInNewContext('(' + src.match(/const CATS = (\{[\s\S]*?\n  \});/)[1] + ')');
  return { V: c.window.LK_VEHICULES, G: c.window.LK_GTADB, all: [...P, ...c.window.LK_GTADB.groupes, ...c.window.LK_GTADB.lieux], cats };
}
const FR_DIRS = ['vehicules', 'armes', 'lieux', 'personnages', 'entreprises', 'demeures', 'planques', 'gangs', 'activites', 'animaux', 'radios', 'online', 'codes-de-triche', 'missions', 'trophees', 'carnets'];

test('carte : les quatre chiffres et la phrase qui dit ce que compte « lieux référencés » suivent les données', () => {
  const { all, cats } = carte(), h = read('carte.html');
  const nums = [...h.matchAll(/<span class="n" data-count="(\d+)">(\d+)<\/span><span class="l">([^<]+)<\/span>/g)].map(m => [+m[1], +m[2], m[3]]);
  assert.deepEqual(nums.map(x => x[2]), ['lieux référencés', 'nommés par Rockstar', 'régions officielles', 'catégories']);
  for (const [a, b] of nums) assert.equal(a, b, 'texte sans script = valeur');
  assert.equal(nums[0][0], all.length);
  assert.equal(nums[1][0], all.filter(p => p.s === 'officiel').length);
  assert.equal(nums[2][0], JSON.parse(read('outils/editorial.json')).regions.length);
  assert.equal(nums[3][0], new Set(all.map(p => p.c).filter(c => c in cats)).size, 'catégories qui ont au moins un point');
  const zones = all.filter(p => ['region', 'ville', 'quartier', 'comte'].includes(p.c)).length;
  const note = (h.match(/<p class="vstats-note" data-lk-carte-note>([^<]*)<\/p>/) || [])[1];
  assert.ok(note, 'phrase sous les chiffres');
  const m = note.replace(/[  ]/g, ' ').match(/^Dont (\d+) zones .* et ([\d ]+) autres lieux/);
  assert.ok(m, note); assert.equal(+m[1], zones); assert.equal(n(m[2]), all.length - zones);
});

test('cartes « Continuer la visite » et phrases figées : le nombre de lieux et de véhicules est celui des données, partout', () => {
  const { all, V } = carte();
  const files = [...fs.readdirSync(root).filter(f => f.endsWith('.html')), ...FR_DIRS.filter(d => fs.existsSync(path.join(root, d))).flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.html')).map(f => d + '/' + f))];
  let vus = 0;
  for (const f of files) {
    const h = read(f);
    for (const m of h.matchAll(/<b>La carte<\/b><i>([\d   ]+) lieux repérés, à cocher<\/i>/g)) { vus++; assert.equal(n(m[1]), all.length, f); }
    for (const m of h.matchAll(/à côté des ([\d   ]+) lieux déjà repérés/g)) assert.equal(n(m[1]), all.length, f);
    for (const m of h.matchAll(/<b>Les ([\d   ]+) véhicules<\/b><i>Fiches, photos officielles et schémas<\/i>/g)) assert.equal(n(m[1]), V.length, f);
  }
  assert.ok(vus >= 80, 'cartes trouvées : ' + vus);
  assert.ok(!/2[   ]?547 lieux/.test(files.map(read).join('')), 'plus aucun « 2 547 lieux »');
});

test('véhicules rares : le nombre de véhicules nommés par Rockstar est celui des données ; Tuto : questions IA et langues lues à la source', () => {
  const { V } = carte(), t = txt(read('vehicules-rares.html'));
  const m = t.match(/Rockstar en a nommé (\d+) en tout/); assert.ok(m); assert.equal(+m[1], V.filter(v => v.st === 'officiel').length);
  const ia = read('api/ia.js').match(/const FREE_DEFAULT=(\d+),HOURS_DEFAULT=(\d+)/), tuto = txt(read('tuto.html'));
  assert.ok(tuto.includes(ia[1] + ' questions gratuites toutes les ' + ia[2] + ' h'), 'FAQ du Tuto');
  assert.ok(tuto.includes('Tu as ' + ia[1] + ' questions IA gratuites toutes les ' + ia[2] + ' h'), 'Poser ta question');
  const langues = JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee').length;
  assert.ok(new RegExp('<li><b>' + langues + '</b><span>langues, captures refaites</span></li>').test(read('tuto.html')), 'bandeau du Tuto');
});

test('À propos et Presse : les pages comptées sont celles des six langues, et la marque sans véhicule est dite', () => {
  const langues = JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee').length;
  for (const f of ['a-propos.html', 'presse.html']) {
    const h = read(f), v = [...h.matchAll(/data-stat="pagestotal">([\d ]+)<\/b>/g)].map(m => n(m[1]));
    assert.ok(v.length >= 1, f); for (const x of v) assert.equal(x % langues, 0, f + ' : multiple du nombre de langues');
    assert.ok(!/data-stat="pages"/.test(h), f + ' : plus de chiffre des seules pages françaises');
  }
  const { V } = carte(), marques = txt(read('marques/index.html')), pages = fs.readdirSync(path.join(root, 'marques')).filter(f => f.endsWith('.html') && f !== 'index.html').length;
  const m = marques.match(/(\d+) marques de véhicules ont leur page : (\d+) sont portées/); assert.ok(m, 'phrase des marques');
  assert.equal(+m[1], pages); assert.equal(+m[2], new Set(V.map(v => v.marque).filter(x => x && x !== 'Marque inconnue')).size);
});

test('géolocalisation : « ? » n’est jamais un lieu réel, un rapprochement incertain est dit, les points du site prennent leurs coordonnées', () => {
  const { G } = carte(), dir = path.join(root, 'lieux-carte');
  for (const p of [...G.lieux, ...G.groupes]) { assert.notEqual(String(p.r || '').trim(), '?', p.id); assert.ok(!/Équivalent réel[  ]: \?/.test(p.d || ''), p.id); assert.ok(!/Regroupe \d+ bâtiments? repérés?\./.test(p.d || ''), p.id + ' : « lieux »'); }
  const pages = fs.readdirSync(dir).filter(f => f.endsWith('.html'));
  for (const f of pages) { const t = txt(fs.readFileSync(path.join(dir, f), 'utf8')); assert.ok(!/inspiré : \? |version de \?,|Lieu réel qui semble l’avoir inspiré \?/.test(t), f); }
  const LM = JSON.parse(read('outils/landmarks-leonidakit.json')).reperes;
  assert.equal(LM.filter(r => String(r.reel || '').trim() === '?').length, 0);
  const incertains = LM.filter(r => (r.statuts || []).includes('equivalent_incertain'));
  assert.ok(incertains.length >= 6);
  for (const r of incertains) assert.ok(!/^\?|\?$/.test(r.reel), r.id);
  for (const [id, page] of [['galina-opera', 'galina-ballet-opera-house'], ['sahara-arena', 'sahara-arena'], ['tisha-wocka', 'tisha-wocka-flea-market'], ['autograph-flight', 'autograph-flight-support']]) {
    const f = path.join(dir, page + '.html'); if (!fs.existsSync(f)) continue;
    const h = fs.readFileSync(f, 'utf8'); assert.ok(h.includes('google.com/maps/search/?api=1&amp;query=' + encodeURIComponent(G.enrichit[id].sv)), page);
  }
});
