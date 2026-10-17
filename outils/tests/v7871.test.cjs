'use strict';
/* v7.87.1 : passe de qualité des v7.86 et v7.87 (demande de Téva du 12/10/2026 : appliquer à tout ce que ces deux versions
   ont ajouté les exigences de qualité d’avant la v7.86 : mouvement, effets, charte, latence, alignements, référencement).
   Ce qui se vérifie sans navigateur (le contrôle navigateur est outils/tests/v7871-browser.cjs) :
   - gabarit des pages de section sur Actualités, Vidéos (sommaire et pages) et Éditions : sections éditoriales du moteur
     commun (numéro, kicker, titre, icône, fonds alternés), sous-navigation collante, pile d’images officielles, puces
     « Explorer » de « L’actualité » en bas des pages ;
   - mouvement : les blocs nouveaux entrent par le moteur commun (data-lk-reveal, aucun second observateur), animations
     coupées avec « réduire les animations », contenu visible sans script ;
   - « du tac au tac » : au-delà de seize modèles, les listes des vidéos montrent douze puces et déplient le reste ;
   - référencement des pages du périmètre dans les cinq langues : titre (65 signes au plus, « GTA 6 »), description (155 au
     plus, unique), un seul h1, titres sans saut, canonique, hreflang, og: et twitter:, données structurées justes ;
   - images : tailles écrites, première image prioritaire, les autres en différé ;
   - fiches minces (noindex) : image de partage et carte Twitter rétablies ; « Ce qui est confirmé » a sa propre image ;
     chiffres « Personnaliser » des fiches sur une rangée ;
   - maillage : menu, pied de page, sommaires, puces, recherche du site et Léo mènent à chaque page ;
   - Léo : la page « Ce qui est confirmé », les vidéos officielles, la mesure d’audience et la limite du jour de l’IA, dans
     les cinq langues (douze questions par langue, outils/tests/leo-questions-v7871-<code>.json).
   NODE_PATH=<dépendances>/node_modules SITE_ROOT=$PWD node --test outils/tests/v7871.test.cjs */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const cache = new Map();
const doc = f => { if (!cache.has(f)) cache.set(f, new JSDOM(read(f)).window.document); return cache.get(f); };
const A = JSON.parse(read('outils/actus/actus.json')), R = JSON.parse(read('outils/radios/radios.json'));
/* assemblage v7.91 : les langues publiées viennent de outils/langues.json (le portugais s'y ajoute) */
const LANGS = JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr').map(l => l.code), ALL = ['', ...LANGS.map(l => l + '/')];
const VIDEOS = A.videos.liste.map(v => 'videos/' + v.id + '.html');
const STATIONS = R.stations.map(s => 'radios/' + s.id + '.html');
/* v7.92.1 : la page Prix et collector rejoint « L’actualité » (menu, pied de page, puces) et le gabarit des sections ; v7.93 : le groupe s’étend aux trois pages des recherches (outils/site-shell.cjs → news) */
const SECTION_PAGES = ['actus.html', 'videos.html', 'editions.html', 'prix.html', ...VIDEOS];
const NEWS = ['actus.html', 'videos.html', 'editions.html', 'prix.html', 'verification.html', 'prechargement.html', 'gta-6-pc.html', 'gta-6-vs-gta-5.html'];
const PERIMETRE = [...SECTION_PAGES, 'verification.html', 'radios.html', ...STATIONS];
const N = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const lds = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));

test('gabarit : sections éditoriales du moteur commun, numérotées, fonds alternés, sous-navigation, pile d’images et puces', () => {
  for (const f of SECTION_PAGES) {
    const d = doc(f), main = d.querySelector('main');
    const secs = [...main.querySelectorAll(':scope > .ed-zone > section.ed')];
    assert.ok(secs.length >= 2, f + ' : sections éditoriales');
    secs.forEach((s, i) => {
      assert.ok(s.classList.contains('ac-sec') && s.id, f + ' : section ' + i);
      assert.equal(s.querySelector('.ed-num').textContent, String(i + 1).padStart(2, '0'), f + ' : numéro ' + s.id);
      assert.ok(s.querySelector('.ed-kicker') && s.querySelector('h2.ed-title#' + s.id + '-t') && s.querySelector('svg.ed-ico'), f + ' : kicker, titre et icône de ' + s.id);
      assert.equal(s.getAttribute('aria-labelledby'), s.id + '-t');
    });
    /* deux sections voisines n’ont jamais le même fond (papier / papier 2), la nuit marque un moment */
    const tone = s => ['ed--paper', 'ed--paper2', 'ed--night'].find(c => s.classList.contains(c));
    for (let i = 1; i < secs.length; i++) assert.ok(tone(secs[i]) !== tone(secs[i - 1]), f + ' : fonds de ' + secs[i - 1].id + ' et ' + secs[i].id);
    /* sous-navigation collante dès quatre sections, dans l’ordre des sections */
    const nav = main.querySelector('.ed-zone > nav.ed-nav');
    if (secs.length >= 4) { assert.ok(nav, f + ' : sous-navigation'); assert.deepEqual([...nav.querySelectorAll('a')].map(a => a.getAttribute('href')), secs.map(s => '#' + s.id), f); }
    else assert.equal(nav, null, f + ' : pas de sous-navigation pour deux ou trois sections');
    /* en-tête : pile d’images officielles (sommaires) ou écran de la vidéo (pages des vidéos) */
    const head = main.querySelector('section.page-head');
    if (f.startsWith('videos/')) assert.ok(head.querySelector('.ac-screen img[fetchpriority="high"]'), f + ' : affiche de la vidéo prioritaire');
    /* v7.92.1 : Éditions montre ses deux éditions et leur prix, Prix et collector son coffret (ouvert d’abord, prioritaire) */
    else if (f === 'editions.html' || f === 'prix.html') { const imgs = head.querySelectorAll(f === 'editions.html' ? '.ed-pair img' : '.px-hero img'); assert.equal(imgs.length, 2, f + ' : deux visuels'); assert.equal(imgs[0].getAttribute('fetchpriority'), 'high', f + ' : premier visuel prioritaire'); assert.notEqual(imgs[1].getAttribute('loading'), 'lazy', f + ' : second visuel du premier écran sans différé'); for (const im of imgs) assert.match(im.getAttribute('src'), /^img\/officiel\/[a-z0-9-]+-480\.webp$/, f); }
    else { const imgs = head.querySelectorAll('.lk-stack figure img'); assert.equal(imgs.length, 3, f + ' : pile de trois visuels'); for (const im of imgs) assert.match(im.getAttribute('src'), /^img\/officiel\/[a-z0-9-]+-480\.webp$/, f); }
  }
  /* « Ce qui est confirmé » et Radios et musique gardent leur gabarit (sections du moteur commun, sous-navigation) ;
     v7.92.1 : le relevé du jour (.vf-dos) remplace la pile d’images de « Ce qui est confirmé » */
  for (const f of ['verification.html', 'radios.html']) { const d = doc(f); assert.ok(d.querySelector(f === 'verification.html' ? '.page-head .vf-dos' : '.page-head .lk-stack') && d.querySelector('nav.ed-nav') && d.querySelectorAll('section.ed').length >= 5, f); }
  /* puces « Explorer » de « L’actualité » en bas des quatre pages du groupe : les trois autres, Radios et musique, les statuts */
  for (const dir of ALL) for (const f of NEWS) {
    const chips = doc(dir + f).querySelector('main > nav.lk-chips');
    assert.ok(chips, dir + f + ' : puces « Explorer »');
    const hrefs = [...chips.querySelectorAll('a')].map(a => a.getAttribute('href'));
    assert.deepEqual(hrefs, [...NEWS.filter(x => x !== f), 'radios.html', 'tuto.html#sources'], dir + f);
  }
});

test('mouvement : les blocs nouveaux entrent par le moteur commun, rien ne reste caché sans script ni en mouvement réduit', () => {
  /* v7.92 : blocs des pages enrichies ; un bloc entre par lui-même ou par son groupe (data-lk-reveal, cascade de vitrine.css) */
  const sel = { 'actus.html': ['.ac-ticket', '.ac-ev', '.vt-fig', '.faq > details'], 'editions.html': ['.ac-edcard', '#ue-list > li', '.ac-bcard', '.ac-col', '.vt-shot', '.faq > details'], 'videos.html': ['.ac-pl-a', '.ac-bar', '.vt-shot', '.faq > details'] };
  for (const v of VIDEOS) sel[v] = ['.ac-moment', '.ac-song', '.ac-rev-g', '.ac-chips', '.ac-vcard', '.faq > details'];
  for (const [f, list] of Object.entries(sel)) {
    const d = doc(f);
    /* v7.92.1 : une vidéo sans photogramme, sans fiche ni modèle relevés (la bande-annonce de lancement, à sa sortie) n’a pas
       ces sections : leurs blocs ne sont alors exigés nulle part */
    const absent = s => f.startsWith('videos/') && ({ '.ac-moment': !d.getElementById('moments'), '.ac-rev-g': !d.getElementById('fiches'), '.ac-chips': !d.getElementById('vehicules') && !d.getElementById('armes') })[s];
    for (const s of list) { const els = [...d.querySelectorAll('main ' + s)].filter(el => !el.closest('.ac-chips-more')); if (absent(s)) { assert.equal(els.length, 0, f + ' : ' + s); continue; } assert.ok(els.length, f + ' : ' + s); for (const el of els) assert.ok(el.closest('[data-lk-reveal]'), f + ' : ' + s + ' sans entrée'); }
    /* aucun bloc de la section n’utilise encore l’ancien « rise » (deux langages d’apparition sur un même bloc) */
    assert.equal(d.querySelectorAll('main .ac-sec .rise, main .ac-vhead .rise').length, 0, f + ' : ancien « rise »');
  }
  const radios = doc('radios.html');
  assert.equal(radios.querySelectorAll('.radios-station[data-lk-reveal]').length, R.stations.length);
  assert.equal(radios.querySelectorAll('.radios-station.rise').length, 0);
  /* un seul moteur : aucun IntersectionObserver ni bibliothèque d’animation dans le script de la section (radios.js garde son
     observateur d’avant la v7.86, qui met le poste en pause hors de l’écran, sans rien faire apparaître) */
  assert.doesNotMatch(read('actus.js'), /IntersectionObserver|gsap|anime\(|lottie/i, 'actus.js');
  assert.doesNotMatch(read('radios.js'), /gsap|anime\(|lottie/i, 'radios.js');
  /* feuilles : chaque animation de la v7.87.1 vit dans « prefers-reduced-motion: no-preference », les entrées partent du délai
     du moteur commun (--lk-delay) et l’état caché ne vaut que pour une page qui a son script (.js) */
  for (const css of ['actus.css', 'radios.css']) {
    const src = read(css), part = src.slice(src.indexOf('v7.87.1'));
    const blocks = [...part.matchAll(/@media \(prefers-reduced-motion:no-preference\)\{([\s\S]*?)\n\}/g)].map(m => m[1]).join('\n');
    const outside = part.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}/g, '');
    assert.doesNotMatch(outside, /animation:[^;}]*\bac-|animation:[^;}]*radios-(?:tune|onair|jump|in)\b/, css + ' : animation hors de « no-preference »');
    for (const m of blocks.matchAll(/\.js[^{}]*\{[^{}]*animation:([^;}]+)/g)) assert.match(m[1], /var\(--lk-delay/, css + ' : ' + m[1]);
    for (const m of blocks.matchAll(/([^{}]+)\{opacity:0;?\}/g)) assert.match(m[1].trim(), /^\.js /, css + ' : état caché sans .js');
  }
  /* translations des entrées : jetons de motion-tokens.css (--c-rise, 10 px) ; durées et courbes des jetons */
  assert.match(read('actus.css'), /@keyframes ac-rise\{from\{opacity:0;transform:translate3d\(0,var\(--c-rise,10px\),0\)/);
  assert.match(read('radios.css'), /@keyframes radios-in\{from\{opacity:0;transform:translate3d\(0,var\(--c-rise,10px\),0\)/);
  assert.match(read('motion-tokens.css'), /--c-rise:10px/);
});

test('« du tac au tac » : au-delà de seize modèles, douze puces et le reste à déplier, sans en perdre un', () => {
  const c = { window: {} }; vm.runInNewContext(read('vehicules-data.js'), c); vm.runInNewContext(read('armes-data.js'), c);
  for (const v of A.videos.liste) {
    const d = doc('videos/' + v.id + '.html');
    for (const [id, list] of [['vehicules', c.window.LK_VEHICULES.filter(x => x.src === v.src)], ['armes', c.window.LK_ARMES.filter(x => x.src === (v.srcArmes || v.src))]]) {
      const sec = d.getElementById(id); if (!list.length) { assert.equal(sec, null); continue; }
      const shown = sec.querySelector('.ed-body > .ac-chips').querySelectorAll(':scope > a'), more = sec.querySelector('details.ac-chips-more');
      const all = [...sec.querySelectorAll('.ac-chips > a')].map(a => a.getAttribute('href').replace(/^\.\.\/[a-z]+\//, '').replace('.html', ''));
      /* Array.from : les listes viennent du contexte vm, dont le prototype Array diffère (deepEqual strict le compare) */
      assert.deepEqual(all.slice().sort(), Array.from(list, x => x.id).sort(), v.id + ' : tous les modèles de ' + id);
      assert.equal(sec.querySelector('.ac-n').textContent, String(list.length), v.id + ' : pastille de ' + id);
      if (list.length > 16) {
        assert.equal(shown.length, 12, v.id + ' : douze puces montrées');
        assert.equal(N(more.querySelector('summary').textContent), 'Voir les ' + (list.length - 12) + ' autres');
        /* d’abord ce que Rockstar a nommé */
        const named = list.filter(x => x.st === 'officiel').map(x => x.id);
        for (const a of [...shown].slice(0, Math.min(12, named.length))) assert.ok(named.includes(a.getAttribute('href').replace(/^\.\.\/[a-z]+\//, '').replace('.html', '')), v.id + ' : modèles nommés en premier');
      } else { assert.equal(more, null); assert.equal(shown.length, list.length); }
    }
  }
  /* traduit dans chaque langue */
  for (const l of LANGS) assert.doesNotMatch(N(doc(l + '/videos/trailer-1.html').querySelector('.ac-chips-more summary').textContent), /^Voir les/, l);
});

test('référencement : titres, descriptions, h1, titres sans saut, canonique, hreflang, og: et twitter:, dans les cinq langues', () => {
  for (const dir of ALL) {
    const descs = new Map();
    for (const f of PERIMETRE) {
      const p = dir + f, d = doc(p), t = N(d.querySelector('title').textContent), desc = N(d.querySelector('meta[name="description"]').getAttribute('content'));
      assert.ok(t.length <= 65, p + ' : titre de ' + t.length + ' signes');
      assert.match(t, /GTA 6/, p + ' : « GTA 6 » dans le titre');
      assert.ok(desc.length >= 70 && desc.length <= 155, p + ' : description de ' + desc.length + ' signes');
      assert.ok(!descs.has(desc), p + ' : même description que ' + descs.get(desc)); descs.set(desc, p);
      assert.equal(d.querySelectorAll('h1').length, 1, p + ' : un seul h1');
      const levels = [...d.querySelector('main').querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => +h.tagName[1]);
      levels.forEach((l, i) => { if (i) assert.ok(l - levels[i - 1] <= 1, p + ' : saut de titre h' + levels[i - 1] + ' → h' + l); });
      assert.equal(d.querySelector('link[rel="canonical"]').getAttribute('href'), 'https://www.leonidakit.com/' + p, p + ' : canonique');
      assert.deepEqual([...d.querySelectorAll('link[rel="alternate"][hreflang]')].map(l => l.getAttribute('hreflang')).sort(), ['fr', ...LANGS, 'x-default'].sort(), p + ' : hreflang');
      for (const m of ['og:title', 'og:description', 'og:image', 'og:url']) assert.ok(d.querySelector('meta[property="' + m + '"]'), p + ' : ' + m);
      assert.equal(d.querySelector('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image', p);
      assert.match(d.querySelector('meta[name="robots"]').getAttribute('content'), /max-image-preview:large/, p);
      assert.equal(d.documentElement.getAttribute('lang'), dir ? dir.slice(0, 2) : 'fr', p + ' : langue');
    }
    /* accueil : description de 155 signes au plus */
    assert.ok(N(doc(dir + 'index.html').querySelector('meta[name="description"]').getAttribute('content')).length <= 155, dir + 'index.html');
  }
  /* image de partage propre : actualités, vidéos, éditions et « Ce qui est confirmé » ont un visuel officiel */
  /* assemblage v7.91 : depuis la v7.88, la première og:image est l'image de partage (titre sur un visuel officiel, img/partage/) ;
     le visuel officiel lui-même reste en seconde og:image (il sert au plan du site) */
  for (const f of [...SECTION_PAGES, 'verification.html']) {
    const imgs = [...doc(f).querySelectorAll('meta[property="og:image"]')].map(m => m.getAttribute('content'));
    assert.ok(imgs.some(u => /^https:\/\/www\.leonidakit\.com\/img\/officiel\/[a-z0-9-]+-1280\.webp$/.test(u)), f + ' : visuel officiel parmi les og:image (' + imgs.join(', ') + ')');
    if (/\/img\/partage\//.test(imgs[0])) assert.match(imgs[0], /^https:\/\/www\.leonidakit\.com\/img\/partage\/fr\/[a-z0-9-]+\.jpg(\?v=[a-f0-9]+)?$/, f + ' : image de partage');
  }
  /* plan du site : chaque page du périmètre, dans chaque langue, avec son image */
  const sm = read('sitemap.xml');
  for (const f of [...SECTION_PAGES, 'verification.html', 'radios.html']) {
    const m = sm.match(new RegExp('<url>\\s*<loc>https://www\\.leonidakit\\.com/' + f.replace(/[.]/g, '\\.') + '</loc>([\\s\\S]*?)</url>'));
    assert.ok(m, 'plan du site : ' + f); assert.match(m[1], /<image:loc>https:\/\/www\.leonidakit\.com\/img\/officiel\//, f + ' : image du plan du site');
    for (const l of LANGS) assert.ok(sm.includes('<loc>https://www.leonidakit.com/' + l + '/' + f + '</loc>'), l + '/' + f);
  }
});

test('données structurées : fil d’Ariane partout, CollectionPage + ItemList, VideoObject, FAQPage, WebPage, dans chaque langue', () => {
  for (const dir of ALL) {
    for (const f of PERIMETRE) { const x = lds(doc(dir + f)); assert.ok(x.some(o => o['@type'] === 'BreadcrumbList'), dir + f + ' : BreadcrumbList'); }
    const actus = lds(doc(dir + 'actus.html')), col = actus.find(o => o['@type'] === 'CollectionPage');
    assert.equal(col.mainEntity['@type'], 'ItemList'); assert.equal(col.mainEntity.numberOfItems, A.evenements.length); assert.equal(col.mainEntity.itemListElement.length, A.evenements.length);
    assert.ok(actus.some(o => o['@type'] === 'FAQPage' && o.mainEntity.length === A.actus.faq.length), dir + 'actus.html : FAQPage');
    const hub = lds(doc(dir + 'videos.html')).find(o => o['@type'] === 'CollectionPage');
    assert.deepEqual(hub.mainEntity.itemListElement.map(x => x.url), [...A.videos.liste].sort((a, b) => b.iso.localeCompare(a.iso)).map(v => 'https://www.leonidakit.com/' + dir + 'videos/' + v.id + '.html'));
    for (const v of A.videos.liste) {
      const x = lds(doc(dir + 'videos/' + v.id + '.html')), vo = x.find(o => o['@type'] === 'VideoObject');
      assert.ok(vo.name && vo.description && vo.uploadDate === v.iso, v.id + ' : VideoObject');
      for (const u of vo.thumbnailUrl) { assert.match(u, /^https:\/\/www\.leonidakit\.com\/img\/officiel\//); assert.ok(exists(u.replace('https://www.leonidakit.com/', '')), u); }
      assert.equal(vo.embedUrl, 'https://www.youtube-nocookie.com/embed/' + v.youtube); assert.equal(vo.contentUrl, 'https://www.youtube.com/watch?v=' + v.youtube);
      assert.ok(x.some(o => o['@type'] === 'FAQPage'), v.id + ' : FAQPage');
    }
    assert.ok(lds(doc(dir + 'editions.html')).some(o => o['@type'] === 'WebPage') && lds(doc(dir + 'editions.html')).some(o => o['@type'] === 'FAQPage'));
    assert.ok(lds(doc(dir + 'verification.html')).some(o => o['@type'] === 'WebPage'));
    for (const s of R.stations) {
      const wp = lds(doc(dir + 'radios/' + s.id + '.html')).find(o => o['@type'] === 'WebPage');
      assert.ok(wp && wp.about && wp.about.name === s.name && wp.about.isPartOf.name === 'Grand Theft Auto VI', s.id + ' : WebPage sur la station');
      assert.equal(wp.url, 'https://www.leonidakit.com/' + dir + 'radios/' + s.id + '.html');
      assert.match(N(wp.name), /GTA 6/);
      if (dir) assert.notEqual(wp.name, lds(doc('radios/' + s.id + '.html')).find(o => o['@type'] === 'WebPage').name, dir + s.id + ' : nom traduit');
    }
    assert.ok(lds(doc(dir + 'radios.html')).some(o => o['@type'] === 'CollectionPage'));
    /* aucun avis ni note inventés */
    for (const f of PERIMETRE) assert.doesNotMatch(read(dir + f), /"@type":"(?:Review|AggregateRating)"/, dir + f);
  }
});

test('images : tailles écrites, premier visuel prioritaire, les autres en différé, rien d’un autre site', () => {
  for (const dir of ['', 'de/']) for (const f of PERIMETRE) {
    const d = doc(dir + f), imgs = [...d.querySelectorAll('main img')];
    const first = d.querySelector('main .page-head img');
    for (const im of imgs) {
      const p = dir + f + ' : ' + im.getAttribute('src');
      assert.ok(im.getAttribute('width') && im.getAttribute('height'), p + ' : taille');
      assert.equal(im.getAttribute('decoding'), 'async', p);
      assert.doesNotMatch(im.getAttribute('src'), /^(?:https?:)?\/\//, p + ' : image d’un autre site');
      if (im === first) { assert.equal(im.getAttribute('fetchpriority'), 'high', p + ' : prioritaire'); assert.notEqual(im.getAttribute('loading'), 'lazy', p); }
      else if (!im.closest('.page-head')) assert.equal(im.getAttribute('loading'), 'lazy', p + ' : différée');
    }
    /* un même script n’est chargé qu’une fois */
    const scripts = [...d.querySelectorAll('script[src]')].map(s => s.getAttribute('src').split('?')[0]);
    assert.equal(new Set(scripts).size, scripts.length, dir + f + ' : script en double');
  }
});

test('fiches : minces (noindex, follow) avec image de partage et carte Twitter ; chiffres « Personnaliser » sur une rangée', () => {
  const c = { window: {} }; vm.runInNewContext(read('vehicules-data.js'), c);
  let n = 0;
  for (const v of c.window.LK_VEHICULES) for (const dir of ALL) {
    const f = dir + 'vehicules/' + v.id + '.html'; if (!exists(f)) continue;
    const s = read(f); if (!/name="robots" content="noindex, follow"/.test(s)) continue; n++;
    assert.match(s, /<meta property="og:image" content="https:\/\/www\.leonidakit\.com\/img\/social-card\.png">/, f);
    assert.match(s, /<meta name="twitter:card" content="summary_large_image">/, f);
  }
  assert.ok(n >= 1000, 'fiches minces vérifiées : ' + n);
  for (const f of ['vehicules/vehicules.html', 'armes/pistolet-jason.html', '404.html']) assert.doesNotMatch(read(f), /twitter:card/, f);
  assert.match(read('fiches.css'), /\.pf-stats\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
});

test('maillage : menu, pied de page, sommaires, recherche du site et Léo mènent à chaque page du périmètre', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs')), nav = shell.nav('index.html', ''), foot = shell.footer('', '');
  for (const f of ['actus.html', 'videos.html', 'editions.html', 'prix.html', 'verification.html', 'radios.html']) { assert.ok(nav.includes('href="' + f + '"'), 'menu : ' + f); assert.ok(foot.includes('href="' + f + '"'), 'pied de page : ' + f); }
  const hrefs = f => new Set([...doc(f).querySelectorAll('main a[href]')].map(a => a.getAttribute('href').split('#')[0]));
  for (const v of A.videos.liste) assert.ok(hrefs('videos.html').has('videos/' + v.id + '.html'), 'sommaire des vidéos : ' + v.id);
  for (const s of R.stations) assert.ok(hrefs('radios.html').has('radios/' + s.id + '.html'), 'Radios et musique : ' + s.id);
  assert.ok(hrefs('index.html').has('actus.html'), 'accueil → Actualités');
  const search = read('search-index.js');
  for (const f of PERIMETRE) assert.ok(search.includes('"u":"/' + f + '"'), 'recherche : ' + f);
  /* Léo : un sujet mène à chaque page (sujet rédigé ou fiche de station), dans chaque langue */
  for (const dir of ALL) {
    const core = read(dir + 'leo-index.json'), monde = read(dir + 'leo/monde.json'), pre = dir ? '/' + dir.slice(0, 2) : '';
    for (const f of ['actus.html', 'videos.html', 'editions.html', 'prix.html', 'verification.html', 'radios.html', ...VIDEOS]) assert.ok(core.includes('"' + pre + '/' + f), dir + 'Léo : ' + f);
    for (const f of STATIONS) assert.ok(monde.includes('"' + pre + '/' + f + '"'), dir + 'Léo : ' + f);
  }
});

test('Léo : les pages des v7.86 et v7.87 (douze questions par langue : réponse et lien justes)', async () => {
  const { run } = require(path.join(root, 'outils/tests/leo-eval.cjs'));
  const kb = JSON.parse(read('outils/leo-knowledge.json')).topics, byId = Object.fromEntries(kb.map(t => [t.id, t]));
  assert.deepEqual(byId.verification.links.map(l => l.url), ['/verification.html#confirme', '/verification.html#pas-encore']);
  assert.equal(byId['videos-officielles'].links[0].url, '/videos.html');
  assert.ok(byId.cookies.links.some(l => l.url === '/mentions-legales.html#mesure-audience'));
  assert.match(byId['ia-questions'].text, /limite du jour/);
  for (const lang of ['fr', ...LANGS]) {
    const log = console.log; console.log = () => {};
    let r; try { r = await run({ lang, questions: path.join(root, 'outils/tests/leo-questions-v7871-' + lang + '.json') }); } finally { console.log = log; }
    assert.equal(r.correct, r.questions, lang + ' : ' + r.correct + '/' + r.questions);
    assert.equal(r.withoutSource, 0, lang + ' : réponse sans source');
  }
});

test('langues : sous-navigations et en-têtes de section traduits, aucun libellé français resté', () => {
  const FR = ['La frise', 'Date par date', 'En pratique', 'Le contenu en plus', 'Standard ou Ultimate', 'Image par image', 'La bande-son', 'Relié aux fiches', 'Première apparition', 'À voir aussi', 'Autres vidéos', 'Une source ouverte', 'Publiées par Rockstar'];
  for (const l of LANGS) for (const f of SECTION_PAGES) {
    const d = doc(l + '/' + f), texts = [...d.querySelectorAll('main .ed-kicker, main .ed-nav a, main .ac-chips-more summary')].map(e => N(e.textContent));
    /* assemblage v7.91 : « Standard ou Ultimate » est aussi du portugais (« ou » = « ou ») : les noms des éditions restent */
    for (const t of texts) assert.ok(!(FR.includes(t) && !(l === 'pt' && t === 'Standard ou Ultimate')) && !/^Voir les \d+ autres$/.test(t), l + '/' + f + ' : « ' + t + ' » en français');
  }
  /* noms officiels gardés : stations et vidéos ne se traduisent pas */
  for (const l of LANGS) { assert.match(doc(l + '/radios.html').querySelector('#stations').textContent, /Flash FM[\s\S]*Dirty South Classics/); assert.match(N(doc(l + '/videos/extended-look.html').querySelector('h1').textContent), /Extended Look/); }
});

test('relecture des langues : noms traduits par la mémoire, minutages, sources anglaises, « GTA 6 » jamais coupé', () => {
  const L = require(path.join(root, 'outils/langues.cjs'));
  /* noms des fiches (« Ce qu’elle a montré »), modèles vus (moments, puces) et titres des vidéos : plus aucun translate="no" ;
     chacun est le segment que la mémoire traduit (un nom propre y est « = ») ; le statut est un segment à part */
  for (const f of ['actus.html', 'videos.html', ...VIDEOS]) {
    const s = read(f);
    assert.doesNotMatch(s, /class="ac-rev-a"[^>]*translate="no"|class="ac-vcard-t"[^>]*translate="no"|<span translate="no">[^<]*<\/span><\/a>/, f + ' : translate="no" sur un nom');
    assert.doesNotMatch(s, /<p class="ac-moment-items">/, f + ' : type et nom d’un modèle dans un même segment');
  }
  for (const l of LANGS) {
    const mem = L.memoire(root, l); mem.used = new Set();
    for (const f of ['actus.html', ...VIDEOS]) {
      const fr = doc(f), tr = doc(l + '/' + f);
      const pairs = sel => { const a = [...fr.querySelectorAll(sel)].map(e => N(e.textContent)), b = [...tr.querySelectorAll(sel)].map(e => N(e.textContent)); assert.equal(a.length, b.length, l + '/' + f + ' ' + sel); return a.map((x, i) => [x, b[i]]); };
      for (const [a, b] of [...pairs('a.ac-rev-a'), ...pairs('.ac-mi-l'), ...pairs('.ac-chips a.lkx-chip')]) {
        const v = L.lookup(mem, a, f);
        assert.ok(v !== null, l + ' : « ' + a + ' » absent de la mémoire');
        assert.equal(b, v === L.KEEP ? a : N(L.typo(v, l)), l + '/' + f + ' : « ' + a + ' »');
      }
    }
    /* minutages écrits comme en français (le zéro initial ne tombe plus) */
    const songs = N(doc(l + '/videos/extended-look.html').querySelector('#musique').textContent);
    assert.match(songs, /0:06\D+0:45/, l + ' : 0:06 à 0:45'); assert.match(songs, /6:00\D+6:42/, l + ' : 6:00 à 6:42');
    assert.doesNotMatch(songs, /\b\d+:\d\b(?!\d)/, l + ' : minutage à un chiffre');
    /* sources anglaises : titre anglais, rien de français ni d’espace devant « : » */
    for (const f of ['actus.html', 'radios.html', ...STATIONS]) for (const a of doc(l + '/' + f).querySelectorAll('a.ed-src-link')) assert.doesNotMatch(a.textContent, /Newswire\s:|\(site officiel\)/, l + '/' + f + ' : ' + a.textContent);
    /* le kicker « À toi » de verification.html veut dire « à ton tour », pas « le tien » */
    const k = [...doc(l + '/verification.html').querySelectorAll('.ed-kicker')].map(e => N(e.textContent));
    assert.ok(k.includes({ en: 'YOUR TURN', es: 'TE TOCA', it: 'TOCCA A TE', de: 'DU BIST DRAN', pt: 'SUA VEZ' }[l]) || k.includes({ en: 'Your turn', es: 'Te toca', it: 'Tocca a te', de: 'Du bist dran', pt: 'Sua vez' }[l]), l + ' : kicker « À toi » ' + k.join(' | '));
  }
  /* « GTA 6 » / « GTA VI » lié par une espace insécable dans les titres et les questions, dans les cinq langues */
  for (const dir of ALL) for (const f of PERIMETRE) {
    for (const h of doc(dir + f).querySelectorAll('main h1, main h2, main h3, main summary')) assert.doesNotMatch(h.textContent, /GTA (?:6|VI)\b/, dir + f + ' : « ' + N(h.textContent) + ' »');
  }
});
