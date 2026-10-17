'use strict';
/* v7.93 (lot 8) : répondre à ce que les joueurs tapent sur Google.
   - quatre pages nouvelles (prechargement.html, gta-6-pc.html, gta-6-vs-gta-5.html, vraies-voitures.html) présentes dans
     chaque langue publiée, indexables (aucun noindex), avec canonique, hreflang, un seul h1, données structurées
     (BreadcrumbList, WebPage ou CollectionPage, FAQPage dont les questions sont celles affichées), sommaire collant dont
     chaque ancre existe, sources dont chaque renvoi existe ;
   - titres et descriptions des pages visées par les recherches : « GTA 6 » en tête du <title>, 60 signes au plus, uniques
     dans chaque langue ; description de 155 signes au plus, unique ;
   - liens entrants : éditions → préchargement, Ce qui est confirmé → PC, Véhicules et fiches → vraies voitures, accueil →
     GTA 6 et GTA 5, menu et pied de page, recherche du site, Léo ;
   - page des vraies voitures : chaque chiffre égal aux données de vehicules-data.js, une ligne et une fiche par véhicule,
     une ancre par marque, ItemList complet ;
   - préchargement : date égale à outils/acquisitions.json, état « avant » (le lot 4 bascule « ouvert ») et refus d’un état
     « ouvert » sans heure ni taille ;
   - À propos : bloc « Sites amis » (outils/sites-amis.json, un site par ligne) présent dans chaque langue, jamais une
     liste vide, adresses en https, garde-fou du générateur. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
/* jsdom : chaque fenêtre est fermée à la fin du test (la suite complète lance les fichiers en parallèle : des dizaines de
   pages de 400 Ko gardées en mémoire faisaient tuer le processus) */
const open = [];
const doc = f => { const w = new JSDOM(read(f)).window; open.push(w); return w.document; };
test.afterEach(() => { for (const w of open.splice(0)) w.close(); });
const norm = s => String(s).replace(/[  ­]/g, ' ').replace(/\s+/g, ' ').trim();
const LANGS = [''].concat(JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr').map(l => l.dossier + '/'));
const NEW = ['prechargement.html', 'gta-6-pc.html', 'gta-6-vs-gta-5.html', 'vraies-voitures.html'];
/* pages dont le titre répond à une recherche (tableau du lot 8) */
const SEO = ['editions.html', 'videos.html', 'vehicules.html', 'atelier-3d.html', 'carte.html', 'codes-de-triche.html', 'trophees.html', 'radios.html', 'personnages.html', 'gangs.html', 'animaux.html', 'missions.html', 'online.html', 'calculateurs.html', ...NEW];
const ED = JSON.parse(read('outils/informations-editorial.json'));
const ACQ = JSON.parse(read('outils/acquisitions.json'));
const V = (() => { const c = { window: {} }; vm.runInNewContext(read('vehicules-data.js'), c); return c.window.LK_VEHICULES; })();
const titleOf = h => norm((h.match(/<title>([^<]*)<\/title>/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&#39;/g, '’');
const descOf = h => norm((h.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&#39;/g, '’').replace(/&quot;/g, '"');

test('quatre pages nouvelles : présentes, indexables, un h1, canonique, hreflang, briques et feuille du lot, dans chaque langue', () => {
  for (const dir of LANGS) for (const p of NEW) {
    const f = dir + p; assert.ok(exists(f), f + ' absente');
    const h = read(f), d = doc(f);
    assert.doesNotMatch(h, /name="robots" content="[^"]*noindex/, f + ' : noindex');
    assert.equal(d.querySelectorAll('h1').length, 1, f + ' : un seul h1');
    assert.match(h, new RegExp('<link rel="canonical" href="https://www\\.leonidakit\\.com/' + dir.replace('/', '\\/') + p.replace('.', '\\.') + '">'), f + ' : canonique');
    for (const l of LANGS) assert.match(h, new RegExp('hreflang="[a-z]{2}(?:-[A-Z]{2})?" href="https://www\\.leonidakit\\.com/' + l.replace('/', '\\/') + p.replace('.', '\\.') + '"'), f + ' : hreflang ' + (l || 'fr'));
    assert.match(h, /hreflang="x-default" href="https:\/\/www\.leonidakit\.com\/en\//, f + ' : x-default');
    assert.match(h, /<link rel="stylesheet" href="(?:\.\.\/)*recherches\.css\?v=[0-9a-f]{12}">/, f + ' : recherches.css');
    assert.match(h, /<link rel="stylesheet" href="(?:\.\.\/)*vitrine\.css\?v=[0-9a-f]{12}">/, f + ' : vitrine.css');
    assert.match(h, /<script src="(?:\.\.\/)*vitrine\.js\?v=[0-9a-f]{12}"><\/script>/, f + ' : vitrine.js');
    assert.ok(d.querySelector('.lk-stack img[fetchpriority="high"]'), f + ' : première image en priorité');
    assert.match(h, /name="robots" content="[^"]*max-image-preview:large/, f + ' : max-image-preview');
    assert.ok(d.querySelector('meta[property="og:image"]') && d.querySelector('meta[name="twitter:card"]'), f + ' : og/twitter');
    /* sommaire collant : chaque ancre existe */
    const nav = d.querySelector('nav.ed-nav'); assert.ok(nav, f + ' : sommaire collant');
    for (const a of nav.querySelectorAll('a')) { const id = a.getAttribute('href').slice(1); assert.ok(d.getElementById(id), f + ' : ancre #' + id); assert.ok(norm(a.textContent).length > 2, f + ' : intitulé du sommaire'); }
    /* sources : chaque renvoi mène à une entrée de la liste, chaque lien externe est protégé */
    for (const a of d.querySelectorAll('a.rc-ref')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), f + ' : renvoi ' + a.getAttribute('href'));
    for (const a of d.querySelectorAll('main a[href^="http"]')) assert.match(a.getAttribute('rel') || '', /noopener/, f + ' : rel sur ' + a.getAttribute('href'));
    /* images officielles : un texte alternatif */
    for (const img of d.querySelectorAll('main img[src*="img/officiel/"]')) assert.ok((img.getAttribute('alt') || '').trim().length > 3, f + ' : alt de ' + img.getAttribute('src'));
    /* données structurées */
    const lds = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
    const types = lds.flatMap(x => x['@graph'] ? x['@graph'].map(y => y['@type']) : [x['@type']]);
    assert.ok(types.includes('BreadcrumbList'), f + ' : BreadcrumbList');
    assert.ok(types.includes(p === 'vraies-voitures.html' ? 'CollectionPage' : 'WebPage'), f + ' : WebPage / CollectionPage');
    const faq = lds.find(x => x['@type'] === 'FAQPage'); assert.ok(faq, f + ' : FAQPage');
    const shown = [...d.querySelectorAll('.faq details summary')].map(s => norm(s.textContent));
    assert.deepEqual(faq.mainEntity.map(q => norm(q.name)), shown, f + ' : questions de la FAQPage = questions affichées');
    const wp = lds.find(x => x['@type'] === 'WebPage' || x['@type'] === 'CollectionPage');
    assert.match(wp.dateModified, /^\d{4}-\d\d-\d\d$/, f + ' : dateModified'); assert.match(wp.datePublished, /^\d{4}-\d\d-\d\d$/, f + ' : datePublished');
  }
});

test('titres et descriptions des pages visées : « GTA 6 » en tête, 60 et 155 signes au plus, uniques dans chaque langue', () => {
  for (const dir of LANGS) {
    const titles = new Map(), descs = new Map();
    for (const p of SEO) {
      const f = dir + p, h = read(f), t = titleOf(h), dsc = descOf(h);
      assert.match(t, /^GTA[  ]6\b/, f + ' : le titre commence par « GTA 6 » : ' + t);
      assert.ok(t.length <= 60, f + ' : titre de ' + t.length + ' signes : ' + t);
      assert.ok(dsc.length >= 60 && dsc.length <= 155, f + ' : description de ' + dsc.length + ' signes');
      assert.ok(!titles.has(t), f + ' : titre déjà pris par ' + titles.get(t)); titles.set(t, f);
      assert.ok(!descs.has(dsc), f + ' : description déjà prise par ' + descs.get(dsc)); descs.set(dsc, f);
      assert.doesNotMatch(dsc, /\bGTA VI\b/, f + ' : la description écrit « GTA 6 »');
    }
  }
});

test('maillage : chaque page nouvelle est reliée depuis les pages qui en parlent, le menu, la recherche et Léo', () => {
  for (const dir of LANGS) {
    const pre = dir ? '' : '';
    assert.match(read(dir + 'editions.html'), /href="prechargement\.html"/, dir + 'editions.html → préchargement');
    assert.match(read(dir + 'verification.html'), /href="gta-6-pc\.html"/, dir + 'verification.html → PC');
    assert.match(read(dir + 'verification.html'), /href="prechargement\.html#/, dir + 'verification.html → préchargement');
    assert.match(read(dir + 'verification.html'), /href="gta-6-vs-gta-5\.html#carte"/, dir + 'verification.html → GTA 6 et GTA 5');
    assert.match(read(dir + 'vehicules.html'), /href="vraies-voitures\.html"/, dir + 'vehicules.html → vraies voitures');
    assert.match(read(dir + 'index.html'), /href="gta-6-vs-gta-5\.html"/, dir + 'index.html → GTA 6 et GTA 5');
    assert.match(read(dir + 'index.html'), /href="prechargement\.html"/, dir + 'index.html → préchargement');
    assert.match(read(dir + 'index.html'), /href="gta-6-pc\.html"/, dir + 'index.html → PC');
    /* menu « Explorer » et pied de page de n’importe quelle page */
    const d = doc(dir + 'a-propos.html');
    for (const p of ['prechargement.html', 'gta-6-pc.html', 'gta-6-vs-gta-5.html']) {
      assert.ok(d.querySelector('#nav .nav-more-panel a[href$="' + p + '"]'), dir + 'a-propos.html : menu → ' + p);
      assert.ok(d.querySelector('footer a[href$="' + p + '"]'), dir + 'a-propos.html : pied de page → ' + p);
    }
    /* les fiches véhicules renvoient à la marque de la page des vraies voitures */
    const rv = read(dir + 'vraies-voitures.html');
    for (const v of V.slice(0, 40)) {
      const f = dir + 'vehicules/' + v.id + '.html'; if (!exists(f)) continue;
      const m = read(f).match(/href="\.\.\/vraies-voitures\.html#(marque-[a-z0-9-]+)"/); assert.ok(m, f + ' → vraies voitures');
      assert.ok(rv.includes(' id="' + m[1] + '"'), f + ' : ancre ' + m[1] + ' présente');
    }
    /* recherche du site */
    const idx = (() => { const c = { window: {} }; vm.runInNewContext(read(dir + 'search-index.js'), c); return c.window.LK_INDEX; })();
    for (const p of NEW) assert.ok(idx.some(e => e.u === '/' + dir + p), dir + 'search-index.js : ' + p);
    /* Léo : un sujet au moins renvoie vers chaque page */
    const leo = read(dir + 'leo-index.json');
    for (const p of NEW) assert.match(leo, new RegExp('"url":"/' + dir + p.replace('.', '\\.')), dir + 'leo-index.json : ' + p);
  }
});

test('vraies voitures : chiffres égaux aux données, une ligne et une fiche par véhicule, une ancre par marque, ItemList complet', () => {
  const N = { vehicules: V.length, reels: V.filter(v => v.insp).length, officiel: V.filter(v => v.st === 'officiel').length, vu: V.filter(v => v.st === 'vu').length, comm: V.filter(v => v.st === 'comm').length };
  const brands = [...new Set(V.map(v => v.marque).filter(m => m && m !== 'Marque inconnue'))];
  N.marques = brands.length;
  assert.deepEqual(JSON.parse(read('outils/vraies-voitures-chiffres.json')), { ...N, evoques: JSON.parse(read('outils/vraies-voitures-chiffres.json')).evoques, inconnue: V.filter(v => !v.marque || v.marque === 'Marque inconnue').length }, 'chiffres écrits par le générateur');
  for (const dir of LANGS) {
    const f = dir + 'vraies-voitures.html', d = doc(f), h = read(f);
    const figs = [...d.querySelectorAll('.rc-figs .vt-fig b')].map(b => +b.textContent);
    assert.deepEqual(figs, [N.vehicules, N.reels, N.marques, N.officiel, N.vu, N.comm], f + ' : les six chiffres');
    const lines = [...d.querySelectorAll('.rc-veh .rc-veh-a')].map(a => a.getAttribute('href'));
    assert.equal(lines.length, V.length, f + ' : une ligne par véhicule');
    assert.deepEqual([...new Set(lines)].sort(), Array.from(V, v => 'vehicules/' + v.id + '.html').sort(), f + ' : chaque fiche liée'); /* Array.from : V vient d’un autre contexte vm (prototype différent) */
    for (const u of lines) assert.ok(exists(dir + u), f + ' : fiche absente ' + u);
    for (const b of brands) assert.ok(d.getElementById('marque-' + b.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')), f + ' : ancre de ' + b);
    assert.ok(d.getElementById('marque-inconnue'), f + ' : ancre des marques non lues');
    const ld = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)).find(x => x['@type'] === 'CollectionPage');
    assert.equal(ld.mainEntity.numberOfItems, V.length, f + ' : ItemList');
    assert.equal(ld.mainEntity.itemListElement.length, V.length, f + ' : ItemList complet');
    /* aucune marque réelle présentée comme partenaire */
    assert.doesNotMatch(norm(d.querySelector('main').textContent), /partenaire officiel|sous licence officielle/i, f + ' : jamais partenaire');
  }
});

test('préchargement : date des données, état « avant » basculable, refus d’un état « ouvert » sans chiffres', () => {
  const P = ED.prechargement;
  assert.equal(P.dates[0].iso, ACQ.game.preloadDate, 'date du préchargement = acquisitions.json');
  assert.equal(P.etat, 'avant', 'état avant le 12 novembre');
  for (const k of ['heure', 'taillePs5', 'tailleXbox']) assert.equal(P.ouvert[k], null, 'rien d’écrit qui ne soit pas annoncé : ' + k);
  for (const dir of LANGS) {
    const h = read(dir + 'prechargement.html');
    assert.match(h, new RegExp('data-lk-preload="' + ACQ.game.preloadDate + '"'), dir + 'prechargement.html : repère du jour J');
    assert.match(h, new RegExp('data-vt-cd="' + ACQ.game.preloadDate + '"'), dir + 'prechargement.html : compte à rebours du 12');
    assert.match(h, new RegExp('data-vt-cd="' + ACQ.game.releaseDate + '"'), dir + 'prechargement.html : compte à rebours du 19');
    assert.ok(doc(dir + 'prechargement.html').querySelector('.rc-state--avant'), dir + 'prechargement.html : état affiché « avant »');
  }
  /* le générateur refuse un état « ouvert » sans heure ni taille (données testées hors du site) */
  const src = read('outils/gen-recherches.cjs');
  assert.match(src, /X\.etat === 'ouvert'[\s\S]*?throw Error\('prechargement : état « ouvert » sans/, 'garde-fou de l’état « ouvert »');
});

test('sommaires : les pages longues de la liste ont un sommaire collant dont chaque ancre existe (achats compris)', () => {
  for (const dir of LANGS) for (const p of ['achats.html', 'vehicules.html', 'codes-de-triche.html', 'trophees.html', 'radios.html', 'personnages.html', 'gangs.html', 'animaux.html', 'missions.html', 'online.html', 'editions.html', 'videos.html', ...NEW]) {
    /* sans jsdom (96 pages) : la sous-navigation et ses ancres lues au texte */
    const h = read(dir + p), nav = (h.match(/<nav class="ed-nav[^"]*"[\s\S]*?<\/nav>/) || [])[0]; assert.ok(nav, dir + p + ' : sommaire collant');
    const anchors = [...nav.matchAll(/href="#([^"]+)"/g)].map(m => m[1]); assert.ok(anchors.length >= 3, dir + p + ' : au moins trois entrées');
    for (const id of anchors) assert.ok(h.includes(' id="' + id + '"'), dir + p + ' : ancre #' + id);
  }
});

test('sites amis (À propos) : bloc présent dans chaque langue, titre des données, jamais une liste vide, adresses en https', () => {
  const D = JSON.parse(read('outils/sites-amis.json'));
  assert.ok(Array.isArray(D.sites) && D.titre && D.vide, 'outils/sites-amis.json : titre, phrase d’attente, liste');
  for (const x of D.sites) assert.match(x.url || '', /^https:\/\//, 'site ami en https : ' + JSON.stringify(x));
  for (const dir of LANGS) {
    const d = doc(dir + 'a-propos.html'), b = d.getElementById('sites-amis'); assert.ok(b, dir + 'a-propos.html : bloc #sites-amis');
    assert.ok(b.closest('#contribuer'), dir + 'a-propos.html : le bloc est dans la section Contribuer');
    assert.ok(b.querySelector('h3') && norm(b.querySelector('h3').textContent), dir + 'a-propos.html : titre du bloc');
    const ul = b.querySelector('ul'), lis = b.querySelectorAll('li');
    if (D.sites.length) { assert.equal(lis.length, D.sites.length, dir + 'a-propos.html : un site par ligne'); for (const a of b.querySelectorAll('a')) assert.equal(a.getAttribute('rel'), 'noopener', dir + 'a-propos.html : rel du lien'); }
    else { assert.equal(ul, null, dir + 'a-propos.html : pas de liste vide'); assert.ok(b.querySelector('.ed-amis-vide') && norm(b.querySelector('.ed-amis-vide').textContent), dir + 'a-propos.html : phrase d’attente'); }
  }
  assert.match(read('outils/gen-informations.cjs'), /sites-amis\.json : chaque site a un nom et une adresse https/, 'garde-fou du générateur');
});

test('images de partage : chaque page nouvelle a la sienne dans chaque langue, posée en og:image', () => {
  const P = JSON.parse(read('outils/partage.json'));
  for (const dir of LANGS) for (const p of NEW) {
    const lang = dir ? dir.slice(0, -1) : 'fr', img = 'img/partage/' + lang + '/' + p.replace('.html', '.jpg');
    assert.ok(exists(img), img + ' absente');
    assert.match(read(dir + p), new RegExp('<meta property="og:image" content="https://www\\.leonidakit\\.com/' + img.replace(/[.\/]/g, '\\$&') + '\\?v=[0-9a-f]+">'), dir + p + ' : og:image de partage');
  }
});
