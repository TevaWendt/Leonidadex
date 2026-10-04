/* Section « Radios et musique » (section radios) : données, pages, menu, recherche, plan du site, Léo, langues et mouvement.
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/section-radios.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const G = require(path.join(root, 'outils/gen-radios.cjs'));
const D = JSON.parse(read('outils/radios/radios.json'));
const doc = f => new JSDOM(read(f)).window.document;
const ld = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const FICHES = D.fiches.map(x => 'radios/' + x.id + '.html');
const PAGES = ['radios.html', ...FICHES];
/* noms de stations qui ne viennent que des vidéos volées d’août 2026 : jamais écrits sur le site, ni ici. Le test compare des
   empreintes (sha256 des noms en minuscules, 16 premiers caractères) aux suites de 1 à 3 mots des textes contrôlés. */
const FUITES = new Set(["0c9c89ea7a51c508", "126080207d1629c8", "1ece602c1078ef6f", "28bb2b6f4c372f09", "6e176086a62dab27", "739dee15f1ce2470", "8296cd3f1093643f", "8440c6f4a53b63bf", "a0fce2631873a465", "ae98c266767fcd8d", "b35fbea4617e6517", "b6ffa7c7f3454f50", "cc5adf5b09da1d68", "f14c18bc7f7f3c5a"]);
const fuiteDans = t => { const w = String(t).toLowerCase().replace(/[^a-z0-9.\- ]+/g, ' ').split(/\s+/).filter(Boolean); for (let i = 0; i < w.length; i++) for (let n = 1; n <= 3 && i + n <= w.length; n++) { const h = require('node:crypto').createHash('sha256').update(w.slice(i, i + n).join(' ')).digest('hex').slice(0, 16); if (FUITES.has(h)) return true; } return false; };

test('section radios : données complètes, statuts et sources connus, aucune station sans source officielle', () => {
  const { MED } = G.load(root);
  assert.doesNotThrow(() => G.check(D, MED, root));
  assert.equal(D.videos.length, 4);
  for (const v of D.videos) for (const m of v.morceaux) { assert.ok(['officiel', 'vu', 'comm', 'conf'].includes(m.statut), m.titre); assert.ok(m.sources.length >= 1, m.titre); for (const s of m.sources) assert.ok(D.sources[s], s); }
  for (const s of Object.values(D.sources)) { assert.match(s.consultedAt, /^2026-10-04$/); assert.match(s.url, /^https:\/\//); }
  assert.ok(D.zone.sources.some(id => D.sources[id].url.startsWith('https://www.rockstargames.com/')), 'au moins une page Rockstar');
  assert.ok(D.zone.sources.some(id => D.sources[id].statut === 'comm'), 'au moins une source communautaire');
  /* aucune fiche de station : Rockstar n’en a nommé aucune */
  assert.ok(D.fiches.every(x => x.kind !== 'Station de radio'));
  const all = JSON.stringify(D.fiches) + JSON.stringify(D.videos);
  assert.ok(!fuiteDans(all), 'nom tiré des fuites dans les fiches ou les morceaux');
  /* droits : ni paroles, ni extrait, ni pochette */
  /* ni fichier audio ou vidéo, ni paroles ; l’adresse d’un article de presse peut contenir « lyrics » dans son titre */
  for (const s of Object.values(D.sources)) assert.doesNotMatch(s.url, /\.(mp3|ogg|wav|m4a|mp4|webm)\b/i, s.url);
  const sansAdresses = JSON.stringify({ ...D, sources: Object.fromEntries(Object.entries(D.sources).map(([k, s]) => [k, { ...s, url: '' }])) });
  assert.doesNotMatch(sansAdresses, /\.(mp3|ogg|wav|m4a|mp4|webm)\b|lyrics|paroles :/i);
});

test('radios.html : gabarit des hubs, poste à quatre sources, zone éditoriale complète, données structurées', () => {
  const d = doc('radios.html'), html = read('radios.html');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/radios.html');
  const desc = d.querySelector('meta[name="description"]').content; assert.ok(desc.length <= 160, desc.length);
  assert.match(d.title, /GTA 6/);
  const types = ld(d).map(x => x['@type']); for (const t of ['BreadcrumbList', 'CollectionPage', 'FAQPage']) assert.ok(types.includes(t), t);
  const cp = ld(d).find(x => x['@type'] === 'CollectionPage'); assert.equal(cp.mainEntity.numberOfItems, D.fiches.length);
  assert.ok(d.querySelector('.page-head .lk-stack'), 'pile de visuels officiels');
  const presets = d.querySelectorAll('[data-radios-presets] [data-radios-preset]'), panels = d.querySelectorAll('[data-radios-panneau]');
  assert.equal(presets.length, 4); assert.equal(panels.length, 4);
  D.videos.forEach((v, i) => { assert.equal(presets[i].getAttribute('href'), '#radios-' + v.id); assert.equal(panels[i].id, 'radios-' + v.id); assert.equal(panels[i].querySelectorAll('.radios-morceau').length, v.morceaux.length); });
  /* sans JavaScript, tout se lit : aucun panneau caché dans le HTML */
  assert.equal(d.querySelectorAll('[data-radios-panneau][hidden]').length, 0);
  assert.equal(d.querySelector('.radios-facade').getAttribute('aria-hidden'), 'true');
  for (const c of d.querySelectorAll('.radios-morceau-t cite, .radios-morceau-a')) assert.equal(c.closest('[translate="no"]') ? 'no' : c.getAttribute('translate'), 'no', 'titre ou artiste traduisible : ' + c.textContent);
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s => s.id), ['rockstar', 'communaute', 'a-confirmer', 'pour-toi', 'faq', 'sources']);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  assert.equal(d.querySelectorAll('#faq details').length, D.zone.faq.length);
  assert.equal(d.querySelectorAll('#sources .ed-srcs li').length, D.zone.sources.length);
  for (const a of d.querySelectorAll('.radios-src a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), 'renvoi de source ' + a.getAttribute('href'));
  for (const a of d.querySelectorAll('#communaute .ed-pair-src')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  const ids = [...d.querySelectorAll('[id]')].map(x => x.id); assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), [], 'identifiants uniques');
  /* calculateur : pas d’encart (aucun usage publié) */
  assert.equal(d.querySelectorAll('.lk-entry-hub, .lk-entry-card').length, 0);
  assert.equal(d.querySelectorAll('nav.lk-chips').length, 1);
  /* aucun nom de station tiré des fuites, nulle part sur la page (pas même pour l’écarter) */
  assert.ok(!fuiteDans(d.querySelector('main').textContent), 'nom tiré des fuites sur la page');
  assert.match(html, /<link rel="stylesheet" href="radios\.css\?v=[a-f0-9]{12}">/); assert.match(html, /<script src="radios\.js\?v=[a-f0-9]{12}"><\/script>/);
});

test('radios/ : fiche de l’album (sources, liens, gabarit des fiches), aucune autre fiche', () => {
  assert.deepEqual(fs.readdirSync(path.join(root, 'radios')).filter(f => f.endsWith('.html')).sort(), D.fiches.map(x => x.id + '.html').sort());
  for (const f of FICHES) {
    const d = doc(f);
    assert.equal(d.querySelectorAll('h1').length, 1, f);
    assert.ok(d.querySelector('nav.crumbs a[href="../radios.html"]'), f + ' : fil d’Ariane');
    assert.ok(ld(d).some(x => x['@type'] === 'BreadcrumbList'), f);
    const desc = d.querySelector('meta[name="description"]').content; assert.ok(desc.length <= 160, f);
    assert.ok(d.querySelectorAll('.ed-srcs li').length >= 3, f + ' : sources');
    for (const img of d.querySelectorAll('main img')) { assert.ok(img.getAttribute('width') && img.getAttribute('height'), f + ' : dimensions'); assert.ok(img.hasAttribute('alt'), f + ' : alt'); }
    for (const a of d.querySelectorAll('main a[href^="http"]')) { assert.equal(a.getAttribute('target'), '_blank', a.href); assert.match(a.getAttribute('rel'), /noopener/); }
  }
});

test('sécurité et droits : aucun script en ligne, rien de chargé depuis un autre site, aucun lecteur ni extrait', () => {
  for (const f of PAGES) {
    const d = doc(f);
    for (const s of d.querySelectorAll('script')) if (!s.src && s.type !== 'application/ld+json' && s.type !== 'lk/lazy') assert.fail(f + ' : script en ligne');
    for (const el of d.querySelectorAll('[src], link[href]')) { const u = el.getAttribute('src') || el.getAttribute('href'); if (el.tagName === 'LINK' && !/stylesheet|preload|icon/.test(el.rel)) continue; assert.doesNotMatch(u, /^(https?:)?\/\//, f + ' : ressource externe ' + u); }
    assert.equal(d.querySelectorAll('iframe, audio, video, embed, object').length, 0, f);
    assert.doesNotMatch(read(f), /\son[a-z]+="/, f + ' : gestionnaire en ligne');
  }
  /* radios.css et radios.js ne sont chargés que par les pages de la section */
  for (const f of ['index.html', 'gangs.html', 'lieux/vice-city.html', 'personnages/drequan.html']) assert.doesNotMatch(read(f), /radios\.(css|js)/, f);
  assert.doesNotMatch(read('radios.js'), /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest/);
});

test('menu, pied de page, recherche et plan du site : « Radios et musique » dans le groupe « Jouer »', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  assert.deepEqual(shell.play.find(x => x[0] === 'radios.html'), ['radios.html', 'Radios et musique']);
  assert.ok(shell.sectionPages.has('radios.html'));
  assert.equal(shell.entry('radios.html'), '');
  const nav = shell.nav('index.html', ''); assert.match(nav, /<strong>Jouer<\/strong>(?:<a [^>]*>[^<]*<\/a>)*<a href="radios\.html">Radios et musique<\/a>/);
  assert.ok(nav.indexOf('<strong>Le monde</strong>') < nav.indexOf('<strong>Jouer</strong>') && nav.indexOf('<strong>Jouer</strong>') < nav.indexOf('<strong>S’équiper</strong>'));
  const foot = shell.footer('', ''); assert.ok(foot.indexOf('<h2>Explorer</h2>') < foot.indexOf('<h2>Jouer</h2>') && foot.indexOf('<h2>Jouer</h2>') < foot.indexOf('<h2>S’équiper</h2>'));
  for (const f of ['index.html', 'gangs.html', 'radios.html', 'radios/gta-vi-the-album.html']) { const h = read(f); assert.match(h, /Radios et musique<\/a>/, f); }
  assert.match(read('radios.html'), /<a href="radios\.html" class="here" aria-current="page">Radios et musique<\/a>/);
  const ctx = { window: {} }; require('node:vm').runInNewContext(read('search-index.js'), ctx);
  for (const u of ['/radios.html', ...FICHES.map(f => '/' + f)]) assert.ok(ctx.window.LK_INDEX.some(e => e.u === u), 'recherche : ' + u);
  for (const f of PAGES) assert.ok(read('sitemap.xml').includes('<loc>https://www.leonidakit.com/' + f + '</loc>'), 'plan du site : ' + f);
  for (const f of FICHES) assert.ok(read('sitemap-fiches.xml').includes('<loc>https://www.leonidakit.com/' + f + '</loc>'), 'sitemap-fiches : ' + f);
  assert.match(read('style.css'), /sections? [a-z, ]*\bradios\b[a-z, ]* : quatre groupes dans « Explorer »/); /* un seul bloc, marqué « section radios » ou « sections …, radios, … » une fois les sections réunies */
});

test('Léo : morceau de questions de la section, fiche de l’album, réponses sourcées (radios, Trailer 1 et 2, Extended Look, album, fuites)', () => {
  const idx = JSON.parse(read('leo-index.json'));
  assert.ok(idx.shards.radios && idx.shards.radios.knowledge, 'morceau radios');
  const sh = JSON.parse(read('leo/radios.json'));
  assert.equal(sh.revision, idx.revision);
  assert.ok(sh.knowledge.length >= 3 && sh.knowledge.every(t => /^radios-/.test(t.id) && t.links[0].url === '/radios.html#faq'));
  assert.ok(!idx.knowledge.some(t => /^radios-/.test(t.id)), 'les questions de la section ne pèsent pas sur le noyau');
  const radio = idx.knowledge.find(t => t.id === 'radio'); assert.equal(radio.links[0].url, '/radios.html');
  assert.ok(!fuiteDans(radio.text), 'sujet radio : aucun nom tiré des fuites');
  assert.ok(!fuiteDans(read('leo/radios.json')), 'morceau de Léo : aucun nom tiré des fuites');
  /* ni dans les index de Léo des autres langues, ni dans la mémoire de traduction, ni dans les documents de la section */
  const sans = t => String(t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const lus = [...['en', 'es', 'it', 'de'].flatMap(c => [c + '/leo-index.json', c + '/leo/radios.json', ...fs.readdirSync(path.join(root, 'outils/langues', c)).filter(f => f.endsWith('.json')).map(f => 'outils/langues/' + c + '/' + f)]), 'LISEZ-MOI-section-radios.txt', 'outils/CHANGEMENTS-section-radios.txt', 'outils/PREUVES-section-radios.md', 'outils/assemblage/section-radios.diff'].filter(f => fs.existsSync(path.join(root, f)));
  for (const f of lus) { const t = read(f); assert.ok(!fuiteDans(t) && !fuiteDans(sans(t)), 'nom tiré des fuites : ' + f); }
  assert.deepEqual(idx.suggestions.radios.length, 6);
  const core = require(path.join(root, 'outils/tests/leo-complet.cjs')).fullCore(root);
  assert.ok(core.byKey.get('album:gta-vi-the-album'), 'fiche de l’album');
  const cases = [['quelles radios dans gta 6 ?', 'radio'], ['qui chante dans le trailer 1 ?', 'musique-trailer'], ['quelle musique dans le trailer 2 ?', 'musique-trailer'], ['les noms de stations qui circulent sont ils confirmes ?', /^radios-faq-/], ['quelles chansons dans l extended look ?', /^radios-faq-/]];
  for (const [q, want] of cases) { const a = core.answer(q); assert.equal(a.kind, 'answer', q); if (want instanceof RegExp) assert.match(a.topic || '', want, q + ' → ' + a.topic); else assert.equal(a.topic, want, q); assert.ok((a.links || []).length, q + ' : source'); }
  const al = core.answer('c est quoi gta vi the album ?'); assert.ok(al.entity === 'album:gta-vi-the-album' || /^radios-faq-/.test(al.topic || ''), 'album → ' + (al.entity || al.topic));
});

test('cinq langues : pages générées, Léo dans chaque langue, titres et artistes gardés tels quels', () => {
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  for (const l of L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')) {
    for (const f of PAGES) { const p = l.dossier + '/' + f; assert.ok(fs.existsSync(path.join(root, p)), p); const d = doc(p); assert.equal(d.documentElement.lang.slice(0, 2), l.code, p);
      assert.ok(d.querySelector('link[rel="alternate"][hreflang="fr"][href="https://www.leonidakit.com/' + f + '"]'), p + ' : hreflang'); }
    const d = doc(l.dossier + '/radios.html');
    assert.equal(d.querySelector('#radios-trailer-1 .radios-morceau-t cite').textContent, 'Love Is a Long Road');
    assert.ok(fs.existsSync(path.join(root, l.dossier, 'leo/radios.json')), l.code + ' : morceau de Léo');
    const sh = JSON.parse(read(l.dossier + '/leo/radios.json')); assert.ok(sh.knowledge.length >= 3);
  }
});

/* ---------- mouvement : décoratif, coupé avec prefers-reduced-motion ---------- */
test('radios.css : toute animation et toute transition de la section sont coupées sous prefers-reduced-motion: reduce ; seuls transform et opacity bougent', () => {
  const css = read('radios.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const reduce = css.slice(css.indexOf('@media (prefers-reduced-motion:reduce)'));
  assert.ok(reduce.length > 50, 'bloc mouvement réduit');
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)];
  assert.ok(keyframes.length >= 3);
  for (const [, , body] of keyframes) for (const m of body.matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(m[1]), 'propriété animée : ' + m[1]);
  for (const name of keyframes.map(k => k[1])) {
    const users = [...css.matchAll(new RegExp('([^{}]+)\\{[^}]*animation:[^;}]*\\b' + name + '\\b', 'g'))].map(m => m[1].trim()).filter(s => !s.startsWith('@'));
    assert.ok(users.length, name + ' utilisée');
    for (const sel of users) for (const one of sel.split(',')) assert.ok(reduce.includes(one.trim()), 'animation non coupée : ' + one.trim());
  }
  for (const m of css.slice(0, css.indexOf('@media (prefers-reduced-motion:reduce)')).matchAll(/transition:([^;}]+)/g)) for (const part of m[1].split(',')) assert.match(part.trim(), /^(transform|opacity)\b/, 'transition : ' + part);
});

test('radios.js : onglets au clavier, animation arrêtée avec prefers-reduced-motion, et lancée sinon', async () => {
  const { load } = require('./runtime-helper.cjs');
  const run = async reduce => load(root, 'radios.html', { before: w => {
    w.matchMedia = q => ({ matches: reduce && /reduce/.test(q), addEventListener() {}, removeEventListener() {} });
    w.IntersectionObserver = class { constructor(cb) { this.cb = cb; } observe(n) { n.classList.add('in'); this.cb([{ isIntersecting: true, target: n }]); } unobserve() {} disconnect() {} };
  } });
  /* mouvement réduit : rien ne s’anime, tout fonctionne */
  let r = await run(true);
  try {
    const d = r.d, poste = d.querySelector('[data-radios-poste]'), tabs = [...d.querySelectorAll('[data-radios-preset]')], panels = [...d.querySelectorAll('[data-radios-panneau]')];
    assert.deepEqual(r.errors, []);
    assert.equal(d.querySelector('[data-radios-presets]').getAttribute('role'), 'tablist');
    assert.equal(tabs[0].getAttribute('aria-selected'), 'true'); assert.ok(panels.slice(1).every(p => p.hidden));
    assert.ok(!poste.classList.contains('radios-joue'), 'égaliseur à l’arrêt');
    tabs[2].click(); r.flush(); r.flush();
    assert.equal(tabs[2].getAttribute('aria-selected'), 'true'); assert.ok(!panels[2].hidden && panels[0].hidden);
    assert.ok(!panels[2].classList.contains('radios-arrive'), 'pas d’arrivée animée');
    assert.ok(!d.querySelector('.radios-defile').classList.contains('radios-defile--anime'), 'écran fixe');
    assert.ok(d.querySelector('[data-radios-defile]').textContent.length > 5, 'écran rempli');
    assert.match(d.querySelector('[data-radios-annonce]').textContent, /Extended Look/);
    tabs[2].dispatchEvent(new r.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); r.flush();
    assert.equal(tabs[3].getAttribute('aria-selected'), 'true'); assert.equal(d.activeElement, tabs[3]);
    tabs[3].dispatchEvent(new r.w.KeyboardEvent('keydown', { key: 'Home', bubbles: true })); r.flush();
    assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
  } finally { r.close(); }
  /* mouvement normal : l’égaliseur joue, l’écran défile, les morceaux arrivent */
  r = await run(false);
  try {
    const d = r.d, poste = d.querySelector('[data-radios-poste]'), tabs = [...d.querySelectorAll('[data-radios-preset]')], panels = [...d.querySelectorAll('[data-radios-panneau]')];
    assert.deepEqual(r.errors, []);
    r.flush(); r.flush();
    assert.ok(poste.classList.contains('radios-joue'), 'égaliseur actif');
    assert.ok(d.querySelector('.radios-defile').classList.contains('radios-defile--anime'), 'écran qui défile');
    tabs[1].click(); r.flush(); r.flush();
    assert.ok(panels[1].classList.contains('radios-arrive'), 'arrivée des morceaux');
    assert.notEqual(poste.style.getPropertyValue('--radios-angle'), '');
  } finally { r.close(); }
});
