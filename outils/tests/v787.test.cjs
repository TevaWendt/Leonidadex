'use strict';
/* v7.87 : section « Actualités et vidéos » (outils/gen-actus.cjs, outils/actus/actus.json) — actus.html et son flux RSS dans
   chaque langue, les trois vidéos officielles (lecteur au clic seulement), les éditions, la ligne « Source » des fiches qui
   mène à la vidéo, le groupe « L’actualité » du menu et du pied de page, la recherche, le plan du site, Léo et les Mentions. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const A = JSON.parse(read('outils/actus/actus.json'));
const G = require(path.join(root, 'outils/gen-actus.cjs'));
const LANGS = JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr').map(l => l.dossier);
const PAGES = ['actus.html', 'videos.html', 'editions.html', ...A.videos.liste.map(v => 'videos/' + v.id + '.html')];
const exists = (from, href) => fs.existsSync(path.join(root, path.dirname(from), href.split(/[?#]/)[0]));

test('actualités : données vérifiées (sources connues, dates, ordre, liens), frise complète et sourcée', () => {
  const ctx = G.load(root);
  assert.doesNotThrow(() => G.check(ctx, root));
  const d = doc('actus.html');
  const evs = [...d.querySelectorAll('.ac-evs > li.ac-ev')];
  assert.deepEqual(evs.map(e => e.id), A.evenements.map(e => 'ev-' + e.id));
  const isos = evs.map(e => e.dataset.iso);
  assert.deepEqual(isos, [...isos].sort().reverse(), 'de la plus récente à la plus ancienne');
  for (const e of evs) {
    assert.ok(e.querySelector('.ac-ev-t').textContent.trim(), e.id);
    assert.ok(e.querySelectorAll('.ac-refs a').length >= 1, e.id + ' : au moins une source');
    for (const a of e.querySelectorAll('.ac-refs a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  }
  for (const a of d.querySelectorAll('.ac-evs a[href]')) assert.ok(/^https:/.test(a.getAttribute('href')) || exists('actus.html', a.getAttribute('href')), a.getAttribute('href'));
  /* révélations tirées des dossiers des fiches du monde, sans réécriture */
  const MD = JSON.parse(read('outils/monde-dossiers.json'));
  /* la synchronisation pose les espaces insécables de la typographie française : comparées comme des espaces */
  const N = s => s.replace(/[\u00a0\u202f]/g, ' ');
  const textes = new Set(Object.values(MD.fiches).flatMap(f => (f.chrono || []).map(x => N(x.texte))));
  const rev = [...d.querySelectorAll('.ac-rev-i p')];
  assert.ok(rev.length >= 60, rev.length + ' révélations');
  for (const p of rev) assert.ok(textes.has(N(p.textContent)), p.textContent.slice(0, 60));
  assert.equal(d.querySelectorAll('.ac-ticket').length, A.aVenir.length);
  assert.ok(d.querySelector('link[rel="alternate"][type="application/rss+xml"][href="actus.xml"]'));
  /* aucune donnée des fuites */
  assert.doesNotMatch(read('actus.html'), /fuite de 2022|leak/i);
});

test('flux RSS : actus.xml dans chaque langue, une entrée par annonce, titres traduits, adresses de la langue', () => {
  for (const dir of ['', ...LANGS.map(l => l + '/')]) {
    const x = read(dir + 'actus.xml');
    assert.match(x, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<rss version="2\.0"/, dir);
    const X = new JSDOM(x, { contentType: 'text/xml' }).window.document;
    assert.equal(X.querySelector('parsererror'), null, dir + ' : XML bien formé');
    const items = [...X.querySelectorAll('channel > item')];
    assert.equal(items.length, A.evenements.length, dir);
    const lang = X.querySelector('channel > language').textContent;
    assert.equal(lang, dir ? dir.slice(0, 2) : 'fr');
    for (const it of items) {
      assert.ok(it.querySelector('title').textContent.length > 5);
      assert.match(it.querySelector('link').textContent, new RegExp('^https://www\\.leonidakit\\.com/' + dir.replace('/', '\\/') + 'actus\\.html#ev-[a-z0-9-]+$'));
      assert.ok(!Number.isNaN(Date.parse(it.querySelector('pubDate').textContent)));
    }
    /* la page annonce le flux de sa langue (adresse relative : en/actus.html → en/actus.xml) */
    assert.equal([...new JSDOM(read(dir + 'actus.html')).window.document.querySelectorAll('link[rel="alternate"][type="application/rss+xml"]')].map(l => l.getAttribute('href')).join(), 'actus.xml', dir + 'actus.html : lien vers son flux');
    /* la page traduite et son flux parlent la même langue (aucun titre français dans un flux traduit) */
    if (dir) for (const e of A.evenements) assert.ok(!items.some(it => it.querySelector('title').textContent === e.titre && !/^[A-Z][\w ’'.:&-]+$/.test(e.titre)), dir + ' : « ' + e.titre + ' » non traduit');
  }
});

test('vidéos : trois pages, lecteur de YouTube chargé au clic seulement, liens de secours, VideoObject, moments et musique', () => {
  const R = JSON.parse(read('outils/radios/radios.json'));
  const hub = doc('videos.html');
  assert.equal(hub.querySelectorAll('.ac-vcard').length, A.videos.liste.length);
  for (const v of A.videos.liste) {
    const f = 'videos/' + v.id + '.html', html = read(f), d = doc(f);
    assert.doesNotMatch(html, /<iframe/i, f + ' : aucun cadre avant le clic');
    /* YouTube n'apparaît que dans des liens, des attributs de données et les données structurées (VideoObject), que le
       navigateur ne charge pas */
    assert.doesNotMatch(html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g, '').replace(/<a [^>]*>/g, '').replace(/\sdata-[a-z-]+="[^"]*"/g, ''), /youtube(?:-nocookie)?\.com\/(?:embed|watch)/, f + ' : YouTube seulement dans des liens, des attributs de données et le VideoObject');
    const sc = d.querySelector('[data-ac-screen]');
    assert.equal(sc.dataset.src, 'https://www.youtube-nocookie.com/embed/' + v.youtube + '?autoplay=1&rel=0&playsinline=1');
    assert.equal(d.querySelector('[data-ac-play]').getAttribute('href'), 'https://www.youtube.com/watch?v=' + v.youtube);
    const ld = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)).find(x => x['@type'] === 'VideoObject');
    assert.ok(ld && ld.uploadDate === v.iso && ld.embedUrl.endsWith('/embed/' + v.youtube), f + ' : VideoObject');
    /* moments : chaque bouton « Revoir » relance au bon moment, avec un lien de secours au même moment */
    for (const a of d.querySelectorAll('.ac-replay')) assert.equal(a.getAttribute('href'), 'https://www.youtube.com/watch?v=' + v.youtube + (+a.dataset.acAt ? '&t=' + a.dataset.acAt + 's' : ''));
    const songs = R.videos.find(x => x.id === v.radio).morceaux;
    assert.equal(d.querySelectorAll('.ac-song').length, songs.length, f + ' : morceaux');
    for (const a of d.querySelectorAll('main a[href]')) { const h = a.getAttribute('href'); if (!/^(https?:|#|mailto:)/.test(h)) assert.ok(exists(f, h), f + ' : ' + h); }
    assert.ok(d.querySelectorAll('.ac-chips a').length >= 3, f + ' : modèles repérés');
  }
  /* photogrammes minutés : un moment par photogramme officiel de la vidéo, dans l’ordre du temps */
  const t1 = doc('videos/trailer-1.html'), times = [...t1.querySelectorAll('.ac-moment-t time')].map(t => t.textContent);
  assert.ok(times.length >= 8);
  const sec = s => +s.split(':')[0] * 60 + +s.split(':')[1];
  assert.deepEqual(times.map(sec), times.map(sec).slice().sort((a, b) => a - b));
});

test('lecteur des vidéos (actus.js) : rien avant le clic, YouTube sans cookie au clic, au bon moment, rien écrit sur l’appareil', () => {
  const html = read('videos/trailer-2.html').replace(/<script[^>]*src="[^"]*"><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://www.leonidakit.com/videos/trailer-2.html' });
  const w = dom.window; w.matchMedia = () => ({ matches: true }); w.HTMLElement.prototype.scrollIntoView = () => {};
  w.eval(read('actus.js'));
  const d = w.document;
  assert.equal(d.querySelector('iframe'), null);
  const replay = d.querySelector('.ac-replay[data-ac-at]');
  replay.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  const f = d.querySelector('iframe');
  assert.ok(f, 'cadre créé au clic');
  assert.equal(f.getAttribute('src'), 'https://www.youtube-nocookie.com/embed/' + A.videos.liste.find(v => v.id === 'trailer-2').youtube + '?autoplay=1&rel=0&playsinline=1&start=' + replay.dataset.acAt);
  assert.equal(w.localStorage.length, 0); assert.equal(d.cookie, '');
});

test('éditions : les seize contenus de l’Ultimate (noms officiels), bonus, boîte, préchargement, régions, source de l’assistance', () => {
  const d = doc('editions.html');
  const items = [...d.querySelectorAll('.ac-ue > li')];
  assert.equal(items.length, 16);
  assert.deepEqual(items.map(li => li.querySelector('.ac-ue-en').textContent), A.editions.contenus.map(c => c.nom));
  for (const a of d.querySelectorAll('.ac-ue a, .ac-bonus a')) assert.ok(exists('editions.html', a.getAttribute('href')), a.getAttribute('href'));
  for (const id of ['editions', 'ultimate', 'bonus', 'boite', 'prechargement', 'regions', 'faq', 'sources']) assert.ok(d.getElementById(id), id);
  assert.ok(d.querySelector('#sources a[href^="https://support.rockstargames.com/"]'));
  assert.doesNotMatch(d.querySelector('main').textContent, /\d+,\d\d ?€/, 'aucun prix inventé');
  /* page anglaise : le nom officiel sous un contenu est masqué quand la traduction l’écrit déjà (actus.js) */
  if (fs.existsSync(path.join(root, 'en/editions.html'))) {
    const dom = new JSDOM(read('en/editions.html').replace(/<script[^>]*src="[^"]*"><\/script>/g, ''), { runScripts: 'outside-only', url: 'https://www.leonidakit.com/en/editions.html' });
    dom.window.matchMedia = () => ({ matches: true }); dom.window.eval(read(fs.existsSync(path.join(root, 'en/actus.js')) ? 'en/actus.js' : 'actus.js'));
    const li = [...dom.window.document.querySelectorAll('.ac-ue-i')], hid = li.filter(x => x.querySelector('.ac-ue-en').hidden);
    assert.equal(li.length, 16);
    assert.ok(hid.length >= 5, 'noms répétés masqués : ' + hid.length);
    for (const x of hid) assert.equal(x.querySelector('.ac-ue-fr').textContent.replace(/^(The|An?) /, '').replace(/’/g, "'").toLowerCase(), x.querySelector('.ac-ue-en').textContent.replace(/’/g, "'").toLowerCase());
    dom.window.close();
  }
});

test('fiches : la ligne « Source » mène à la page de la vidéo où le modèle a été vu', () => {
  const c = { window: {} }; vm.runInNewContext(read('vehicules-data.js'), c); vm.runInNewContext(read('armes-data.js'), c);
  const map = { 'Premier trailer': 'trailer-1', 'Second trailer': 'trailer-2', 'Extended Look': 'extended-look', 'Extended Look du 27 août 2026': 'extended-look' };
  for (const [list, dir] of [[c.window.LK_VEHICULES, 'vehicules'], [c.window.LK_ARMES, 'armes']]) {
    let n = 0;
    for (const x of list) { if (!map[x.src]) continue; n++;
      const d = doc(dir + '/' + x.id + '.html'), row = [...d.querySelectorAll('th')].find(th => th.textContent === 'Source');
      assert.ok(row, x.id); const a = row.nextElementSibling.querySelector('a');
      assert.ok(a && a.getAttribute('href') === '../videos/' + map[x.src] + '.html', x.id); }
    assert.ok(n > 10, dir);
  }
});

test('menu, pied de page, recherche, plan du site et langues : la section est partout', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  const nav = shell.nav('index.html', ''), foot = shell.footer('', '');
  for (const href of ['actus.html', 'videos.html', 'editions.html', 'verification.html']) { assert.ok(nav.includes('href="' + href + '"'), 'menu ' + href); assert.ok(foot.includes('href="' + href + '"'), 'pied ' + href); }
  assert.ok(nav.indexOf('<strong>S’équiper</strong>') < nav.indexOf('<strong>L’actualité</strong>') && nav.indexOf('<strong>L’actualité</strong>') < nav.indexOf('<strong>Le site</strong>'));
  assert.equal((foot.match(/href="verification\.html"/g) || []).length, 1, 'une seule fois au pied de page');
  /* accueil : la dernière annonce sous le compte à rebours, tirée de la frise */
  const home = doc('index.html').getElementById('derniere-annonce');
  assert.ok(home, 'accueil : dernière annonce');
  assert.equal(home.querySelector('a').getAttribute('href'), 'actus.html#ev-' + A.evenements[0].id);
  assert.equal(home.querySelector('time').getAttribute('datetime'), A.evenements[0].iso);
  assert.ok(home.querySelector('a[href="actus.html#frise"]'));
  for (const l of LANGS) assert.ok(new JSDOM(read(l + '/index.html')).window.document.querySelector('#derniere-annonce a[href="actus.html#ev-' + A.evenements[0].id + '"]'), l + ' : dernière annonce');
  const idx = read('search-index.js');
  for (const u of ['/actus.html', '/videos.html', '/editions.html', ...A.videos.liste.map(v => '/videos/' + v.id + '.html')]) assert.ok(idx.includes('"u":"' + u + '"'), 'recherche ' + u);
  const sm = read('sitemap.xml') + read('sitemap-fiches.xml');
  for (const p of PAGES) assert.ok(sm.includes('https://www.leonidakit.com/' + p), 'plan ' + p);
  for (const l of LANGS) for (const p of PAGES) { assert.ok(fs.existsSync(path.join(root, l, p)), l + '/' + p); assert.match(read(l + '/' + p), new RegExp('<html lang="' + l.slice(0, 2)), l + '/' + p); }
});

test('$ et € : un prix réel en dollars dit « $ US » (abonnement GTA+) ; « $ » seul reste la monnaie du jeu', () => {
  const sp = '[\\s\\u00a0\\u202f]';
  for (const f of ['online.html', 'online/gta-online-actuel.html'].filter(f => fs.existsSync(path.join(root, f)))) {
    const t = doc(f).querySelector('main').textContent;
    assert.doesNotMatch(t, new RegExp('\\d,99' + sp + '\\$(?!' + sp + 'US)'), f + ' : prix réel sans « US »');
  }
  assert.match(doc('online.html').querySelector('main').textContent, new RegExp('5,99' + sp + '\\$' + sp + 'US'));
});

test('Léo et Mentions : liens vers les nouvelles pages, sujet « dernière annonce », lecteur vidéo cité comme exception aux cookies', () => {
  const K = JSON.parse(read('outils/leo-knowledge.json')), T = K.topics || K, top = id => T.find(t => t.id === id);
  assert.ok(top('trailer1').links.some(l => l.url === '/videos/trailer-1.html'));
  assert.ok(top('extended').links.some(l => l.url === '/videos/extended-look.html'));
  assert.ok(top('editions').links.some(l => l.url === '/editions.html'));
  assert.ok(top('physique').links.some(l => l.url === '/editions.html#boite'));
  assert.ok(top('derniere-annonce') && top('derniere-annonce').links.some(l => l.url === '/actus.html#frise'));
  assert.match(top('cookies').text, /Regarder la vidéo/);
  const m = doc('mentions-legales.html').querySelector('main').textContent;
  assert.match(m, /vidéos officielles, chargés après ton clic/);
  assert.match(m, /les lecteurs de musique et de vidéo/);
});

test('calculateur : les identifiants des critères restent ceux du modèle dans chaque langue (« envie » n’est pas traduit)', () => {
  /* explain() (calculateurs-modele.js) compare les critères utilisés à ceux de modele-donnees.js : un identifiant traduit
     dans un seul des deux fichiers fait passer le critère pour « non pris en compte » */
  const ids = f => [...new Set([...read(f).matchAll(/used\.push\(([^)]*)\)|used=\[([^\]]*)\]/g)].flatMap(m => [...(m[1] || m[2]).matchAll(/'([^']*)'/g)].map(x => x[1])))].sort();
  const fr = ids('calculateurs-scenario.js');
  assert.ok(fr.includes('envie') && fr.length > 20);
  for (const l of LANGS) assert.deepEqual(ids(l + '/calculateurs-scenario.js'), fr, l);
});
