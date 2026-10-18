'use strict';
/* v7.92.1 : demande de Téva du 16/10/2026 : Presse, Devine le lieu, Actualités, Vidéos officielles, Éditions et « Ce qui
   est confirmé » revus (animations, centrage, alignements, contenu), et une nouvelle page Prix et collector (le prix du jeu,
   le coffret « The Goodtime State – Vice City Collection » et ses onze objets, les manettes, la collection de la boutique).
   Ce qui se vérifie sans navigateur (le contrôle navigateur est outils/tests/v7921-browser.cjs) :
   - Prix et collector : sections, prix et statuts (« Officiel » quand une boutique officielle affiche le prix, « Vu dans un
     média » quand seule la presse le donne), onze objets en photos officielles, total à cocher (montants en centimes tirés
     des données) lisible sans script, sources, données structurées sans avis ni note, menu et pied de page, six langues ;
   - Actualités : dix-sept annonces datées et sourcées, « À la une » = la dernière, filtre « Produits dérivés » ;
   - Vidéos : quatre vidéos, la bande-annonce de lancement (un morceau en grand, sa pochette ; ses questions avec Léo) ;
   - Éditions : les deux éditions et leur prix en tête, « Quelle édition choisir ? » lisible sans script, le coffret en bandeau ;
   - Presse : carte de presse, trois phrases à copier d’un coup, lettre avec ce qu’il faut dire ;
   - « Ce qui est confirmé » : douze points confirmés, chacun avec sa source officielle, relevé du jour en tête, trois règles ;
   - Léo : les nouveaux sujets mènent à des pages et à des ancres qui existent ; plus de « trois vidéos » ni de « Trailer 3 »
     à venir ;
   - feuilles : chaque nouvelle animation vit dans « prefers-reduced-motion: no-preference ».
   NODE_PATH=<dépendances>/node_modules SITE_ROOT=$PWD node --test outils/tests/v7921.test.cjs */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const exists = f => fs.existsSync(path.join(root, f));
const cache = new Map();
const doc = f => { if (!cache.has(f)) cache.set(f, new JSDOM(read(f)).window.document); return cache.get(f); };
const N = s => String(s || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const lds = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const A = JSON.parse(read('outils/actus/actus.json')), X = A.prix, MED = JSON.parse(read('outils/medias-officiels.json'));
const LANGS = JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr').map(l => l.code), ALL = ['', ...LANGS.map(l => l + '/')];
const cents = p => Math.round(parseFloat(String(p).replace(/[^\d,]/g, '').replace(',', '.')) * 100);

test('Prix et collector : sections, prix et statuts, onze objets en photos officielles, sources', () => {
  const d = doc('prix.html'), main = d.querySelector('main');
  assert.deepEqual([...main.querySelectorAll(':scope > .ed-zone > section.ed')].map(s => s.id), ['jeu', 'collector', 'manettes', 'boutique', 'total', 'faq', 'sources']);
  assert.equal(d.querySelectorAll('h1').length, 1);
  /* le bandeau : le coffret ouvert d’abord (prioritaire), le coffret fermé par-dessus, deux étiquettes de prix, « Jeu non inclus » */
  const hero = d.querySelector('.page-head .px-hero'), imgs = hero.querySelectorAll('img');
  assert.equal(imgs.length, 2);
  assert.match(imgs[0].getAttribute('src'), /coffret-collector-ouvert-480\.webp$/); assert.equal(imgs[0].getAttribute('fetchpriority'), 'high');
  assert.match(imgs[1].getAttribute('src'), /coffret-collector-ferme-480\.webp$/); assert.equal(imgs[1].getAttribute('loading'), null, 'coffret fermé : chargé tout de suite');
  assert.deepEqual([...hero.querySelectorAll('.vt-price')].map(b => N(b.textContent)), [X.hero.tag1.prix, X.hero.tag2.prix]);
  assert.equal(N(hero.querySelector('.px-sticker').textContent), X.hero.sticker);
  /* le prix du jeu : deux éditions, le prix du PlayStation Store en France, statut officiel, renvoi à sa source */
  const jeu = d.getElementById('jeu');
  for (const e of X.jeu.editions) assert.ok(N(jeu.textContent).includes(e.prix || e.p || ''), 'prix de ' + (e.t || e.nom));
  assert.ok(jeu.querySelector('a[href="#src-ps-store-fr"]'), 'source du PlayStation Store');
  /* le coffret : onze objets, chacun avec sa photo officielle (texte alternatif), son nom et sa description */
  const objs = [...d.querySelectorAll('#collector .px-obj')];
  assert.equal(objs.length, 11); assert.equal(X.collector.objets.length, 11);
  objs.forEach((o, i) => {
    const x = X.collector.objets[i], img = o.querySelector('img');
    assert.ok(MED[x.media] && img && img.getAttribute('src').includes('img/officiel/' + x.media + '-'), x.t + ' : photo officielle');
    assert.ok(N(img.getAttribute('alt')).length > 10, x.t + ' : texte alternatif');
    assert.ok(N(o.textContent).includes(N(x.t)), x.t);
  });
  /* les photos du coffret viennent de la boutique Rockstar, créditées ; la photo des manettes, de PlayStation */
  for (const x of X.collector.objets) assert.match(MED[x.media].source, /^https:\/\/store\.rockstargames\.com\//, x.media);
  assert.match(MED['manettes-dualsense-gta-vi'].credit, /Sony Interactive Entertainment/);
  /* statuts : le prix en dollars est « Officiel » (boutique Rockstar), celui en euros « Vu dans un média » (presse) */
  const st = [...d.querySelectorAll('#collector .px-st-i')].map(x => ({ st: x.querySelector('.ed-status').className, t: N(x.textContent) }));
  assert.ok(st.some(x => /ed-status--officiel/.test(x.st)) && st.some(x => /ed-status--vu/.test(x.st)), 'statuts du coffret : ' + JSON.stringify(st));
  /* chaque renvoi de source mène à sa ligne, chaque source a son statut */
  for (const a of main.querySelectorAll('a[href^="#src-"]')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  for (const id of ['ps-store-fr', 'rs-collector', 'rs-store-collector', 'ps-blog-dualsense', 'rs-collection']) { const li = d.getElementById('src-' + id); assert.ok(li && li.querySelector('.ed-status--officiel'), id + ' : source officielle'); }
  for (const id of ['iphonesoft-collector', 'xboxygen-collection']) { const li = d.getElementById('src-' + id); assert.ok(li && li.querySelector('.ed-status--vu'), id + ' : prix vu dans un média'); }
  /* aucun avis ni note inventés, aucune offre de vente : le site ne vend rien */
  const types = lds(d).map(x => x['@type']);
  for (const t of ['BreadcrumbList', 'WebPage', 'FAQPage']) assert.ok(types.includes(t), t);
  assert.doesNotMatch(read('prix.html'), /"@type":"(?:Review|AggregateRating|Offer|Product)"/);
  assert.equal(d.querySelectorAll('#faq details').length, X.faq.length);
});

test('Prix et collector : le total à cocher (montants des données), lisible sans script, dans chaque langue', () => {
  const d = doc('prix.html'), form = d.querySelector('form[data-vt-sum]');
  assert.ok(form && form.hasAttribute('hidden'), 'formulaire montré par vitrine.js seulement');
  assert.ok(form.querySelector('output[data-vt-total][aria-live="polite"]'));
  const T = X.total, vals = [...form.querySelectorAll('input')].map(i => +i.getAttribute('data-vt-cents'));
  /* chaque montant est celui d’un prix des données (jeu, coffret en euros, manettes) */
  const known = new Set([0, ...X.jeu.editions.map(e => cents(e.prix || e.p)), cents(X.hero.tag2.prix), cents(X.manettes.prix)]);
  for (const v of vals) assert.ok(known.has(v), 'montant inconnu : ' + v);
  assert.equal(form.querySelectorAll('input[type="radio"][name="jeu"]').length, 3);
  assert.equal(form.querySelectorAll('input[type="radio"]:checked').length, 1);
  /* sans script : quelques totaux déjà calculés, justes */
  const items = [...d.querySelectorAll('.px-sum-static li')];
  assert.ok(items.length >= 3);
  for (const li of items) assert.ok(/\d/.test(li.querySelector('b').textContent), N(li.textContent));
  assert.ok(T && Array.isArray(T.exemples) && T.exemples.length === items.length);
  for (const l of LANGS) {
    const t = doc(l + '/prix.html');
    assert.ok(t.querySelector('form[data-vt-sum][hidden] output[data-vt-total]'), l + ' : total');
    assert.deepEqual([...t.querySelectorAll('form[data-vt-sum] input')].map(i => +i.getAttribute('data-vt-cents')), vals, l + ' : mêmes montants');
  }
  /* le mot « Total » de chaque langue (l’italien disait « Total », qui n’est pas italien) */
  if (LANGS.includes('it')) assert.equal(N(doc('it/prix.html').querySelector('.px-sum-k').textContent), 'Totale');
  /* en anglais, les objets du coffret portent les noms de la boutique Rockstar */
  if (LANGS.includes('en')) { const en = N(doc('en/prix.html').querySelector('#collector').textContent); for (const n of ['Vice City swizzle spoon', 'Vice City razor blade keychain', 'Leonida Keys crossbody bag', 'Chunkee the Manatee shot glass', 'Macca the Gator magnetic mirror']) assert.ok(en.includes(n), 'en : ' + n); }
});

test('Prix et collector : dans le menu, le pied de page, les puces de « L’actualité », le plan du site et Léo, six langues', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  assert.ok(shell.news.some(([u]) => u === 'prix.html'));
  for (const dir of ALL) {
    for (const f of ['index.html', 'editions.html', 'vehicules.html']) {
      const d = doc(dir + f);
      assert.ok(d.querySelector('header a[href$="prix.html"]'), dir + f + ' : menu');
      assert.ok(d.querySelector('footer a[href$="prix.html"]'), dir + f + ' : pied de page');
    }
    const p = doc(dir + 'prix.html');
    assert.equal(p.documentElement.getAttribute('lang'), dir ? dir.slice(0, 2) : 'fr');
    const t = N(p.querySelector('title').textContent), desc = N(p.querySelector('meta[name="description"]').getAttribute('content'));
    assert.ok(t.length <= 65 && /GTA 6/.test(t), dir + 'prix.html : titre « ' + t + ' »');
    assert.ok(desc.length >= 70 && desc.length <= 155, dir + 'prix.html : description de ' + desc.length + ' signes');
    assert.equal(p.querySelector('link[rel="canonical"]').getAttribute('href'), 'https://www.leonidakit.com/' + dir + 'prix.html');
  }
  const sm = read('sitemap.xml');
  for (const dir of ALL) assert.ok(sm.includes('<loc>https://www.leonidakit.com/' + dir + 'prix.html</loc>'), 'plan du site : ' + dir + 'prix.html');
  /* image de partage propre à la page, dans chaque langue (outils/gen-partage.cjs) */
  for (const dir of ALL) assert.ok(exists('img/partage/' + (dir ? dir.slice(0, 2) : 'fr') + '/prix.jpg'), 'image de partage ' + dir + 'prix.html');
  /* Léo : le prix, le coffret, les manettes et la collection mènent à la page et à la bonne section */
  const kb = Object.fromEntries(JSON.parse(read('outils/leo-knowledge.json')).topics.map(t => [t.id, t]));
  assert.equal(kb.prix.links[0].url, '/prix.html');
  assert.equal(kb['coffret-collector'].links[0].url, '/prix.html#collector');
  assert.equal(kb['manettes-dualsense'].links[0].url, '/prix.html#manettes');
  assert.equal(kb['collection-boutique'].links[0].url, '/prix.html#boutique');
  for (const l of ['', ...LANGS.map(c => c + '/')]) assert.ok(read(l + 'leo-index.json').includes('"' + (l ? '/' + l.slice(0, 2) : '') + '/prix.html'), l + 'Léo : prix.html');
});

test('Actualités : dix-sept annonces datées et sourcées, « À la une » = la dernière, filtre « Produits dérivés »', () => {
  const d = doc('actus.html');
  const evs = [...d.querySelectorAll('#ac-frise .ac-ev')];
  assert.equal(evs.length, A.evenements.length); assert.ok(A.evenements.length >= 17);
  /* de la plus récente à la plus ancienne */
  const isos = A.evenements.map(e => e.iso); assert.deepEqual(isos, isos.slice().sort().reverse());
  /* chaque source est dans le registre que lit le générateur (outils/gen-actus.cjs : actus.json et les registres des hubs) */
  const SRC = require(path.join(root, 'outils/gen-actus.cjs')).load(root).SRC;
  for (const e of A.evenements) { assert.ok(e.sources.length >= 1, e.id); for (const s of e.sources) assert.ok(SRC[s] && SRC[s].url, e.id + ' : ' + s); }
  /* À la une : la dernière annonce, avec un lien vers sa source */
  const une = d.getElementById('une'); assert.ok(une, 'section À la une');
  assert.equal(N(une.querySelector('h3').textContent), N(A.evenements[0].titre).replace(/GTA (6|VI)/g, 'GTA $1'));
  assert.ok(une.querySelector('a[href^="#src-"]'));
  assert.equal([...d.querySelectorAll('main section.ed')][0].id, 'une');
  /* filtre « Produits dérivés » : autant d’annonces que de produits dans les données */
  const nProd = A.evenements.filter(e => e.type === 'produit').length; assert.ok(nProd >= 3);
  assert.equal(d.querySelectorAll('#ac-frise [data-vt-item][data-vt-t~="produit"]').length, nProd);
  assert.ok(d.querySelector('[data-vt-filters] [data-vt-f="produit"]'));
});

test('Vidéos : quatre vidéos, la bande-annonce de lancement avec sa musique en grand et ses questions avec Léo', () => {
  assert.equal(A.videos.liste.length, 4);
  const hub = doc('videos.html');
  assert.equal(hub.querySelectorAll('.ac-pl-a').length, 4); assert.equal(hub.querySelectorAll('.ac-th-info').length, 4);
  const v = doc('videos/bande-annonce-lancement.html');
  assert.equal(v.querySelectorAll('h1').length, 1);
  const feat = v.querySelector('#musique .ac-song--feature');
  assert.ok(feat, 'un seul morceau : en grand');
  assert.equal(feat.querySelector('.ac-song-art').getAttribute('aria-hidden'), 'true');
  assert.match(feat.querySelector('.ac-song-sleeve img').getAttribute('src'), /affiche-bande-annonce-lancement-480\.webp$/);
  assert.equal(N(feat.querySelector('cite').textContent), 'Flower in a Hurricane');
  assert.equal(feat.querySelector('cite').closest('[translate="no"]') ? 'no' : feat.querySelector('cite').getAttribute('translate'), 'no');
  /* le Trailer 1 a lui aussi un seul morceau : même présentation ; le Trailer 2 garde sa liste */
  assert.ok(doc('videos/trailer-1.html').querySelector('#musique .ac-song--feature'));
  assert.equal(doc('videos/trailer-2.html').querySelectorAll('#musique .ac-song--feature').length, 0);
  /* questions : l’encart de Léo à côté, trois questions posées par bouton */
  for (const id of A.videos.liste.map(x => x.id)) assert.equal(doc('videos/' + id + '.html').querySelectorAll('#faq .vt-aside button[data-vt-leo]').length, 3, id);
  /* ni photogrammes, ni fiches, ni modèles inventés pour une vidéo que personne n’a encore relevée */
  for (const id of ['moments', 'fiches', 'vehicules', 'armes']) assert.equal(v.getElementById(id), null, id);
  /* les autres vidéos : trois cartes, toute la largeur */
  assert.equal(v.querySelectorAll('#autres .ac-vcard').length, 3);
});

test('Éditions : les deux éditions et leur prix en tête, « Quelle édition choisir ? » lisible sans script, coffret en bandeau', () => {
  const d = doc('editions.html'), E = A.editions;
  const cards = d.querySelectorAll('.page-head .ed-pair .ed-pair-c');
  assert.equal(cards.length, 2);
  assert.deepEqual([...d.querySelectorAll('.page-head .ed-pair .vt-price')].map(b => N(b.textContent)), [E.prix.standard, E.prix.ultimate]);
  const form = d.querySelector('#choisir form[data-vt-pick]');
  assert.ok(form && form.hasAttribute('hidden'), 'les questions arrivent avec vitrine.js');
  assert.equal(form.querySelectorAll('fieldset').length, 2); assert.equal(form.querySelectorAll('input[type="radio"]').length, 4);
  const ans = [...d.querySelectorAll('#choisir [data-vt-answer]')];
  assert.deepEqual(ans.map(a => a.getAttribute('data-vt-answer')).sort(), Object.keys(E.choix.reponses).sort());
  for (const a of ans) assert.ok(!a.hasAttribute('hidden'), 'sans script, chaque réponse se lit');
  /* GTA+ : ses conditions, sa source et la date de fin des bonus en talon */
  const plus = d.querySelector('.ac-bcard--plain');
  assert.ok(plus.querySelectorAll('.ac-bcard-l li').length >= 2 && plus.querySelector('a[href="#src-rs-gtaplus-precommande"]'));
  assert.equal(plus.querySelector('.ac-bcard-end time').getAttribute('datetime'), '2026-11-20');
  const cta = d.querySelector('#bonus a.vt-cta');
  assert.ok(cta && cta.getAttribute('href') === 'prix.html#collector' && cta.querySelector('img[alt=""]') && N(cta.textContent).length > 20);
});

test('Presse : carte de presse, trois phrases à copier d’un coup, lettre avec ce qu’il faut dire', () => {
  for (const dir of ALL) {
    const d = doc(dir + 'presse.html');
    const pass = d.querySelector('.page-head .pr-pass');
    assert.ok(pass, dir + ' : carte de presse');
    const stats = [...pass.querySelectorAll('.pr-pass-stats b.fig-n')];
    assert.equal(stats.length, 3); for (const b of stats) assert.match(N(b.textContent), /^\d[\d  .,]*$/, dir + ' : chiffre posé ' + b.getAttribute('data-stat'));
    const box = d.querySelector('[data-vt-copy-box]');
    assert.ok(box.querySelector('button[data-vt-copy]') && box.querySelectorAll('[data-vt-copy-src] p').length === 3, dir + ' : trois phrases à copier');
    assert.equal(d.querySelectorAll('.pr-letter .pr-letter-l li').length, 3);
    assert.ok(d.querySelector('.pr-letter .pr-letter-stamp img[src$="presse/leonidakit-icone.svg"]'));
    assert.equal(d.querySelectorAll('#independance .vt-point').length, 3);
  }
});

test('« Ce qui est confirmé » : douze points, chacun avec sa source officielle ; relevé du jour en tête ; trois règles', () => {
  const V = JSON.parse(read('outils/informations-editorial.json')).verification;
  assert.equal(V.checkedAt, '2026-10-17');
  const d = doc('verification.html');
  const cards = [...d.querySelectorAll('#confirme .vf-card')];
  assert.equal(cards.length, 12); assert.equal(V.confirme.items.length, 12);
  for (const c of cards) {
    const src = [...c.querySelectorAll('a[target="_blank"]')].map(a => a.href);
    assert.ok(src.length === 1 && /^https:\/\/(?:(?:www|support)\.rockstargames\.com|www\.playstation\.com|blog\.playstation\.com)\//.test(src[0]), src.join());
    const href = c.querySelector('.vf-links a:not([target])').getAttribute('href').split('#'), page = href[0];
    assert.ok(exists(page), page); if (href[1]) assert.ok(doc(page).getElementById(href[1]), href.join('#'));
  }
  /* un point sans photo montre ses prix en étiquettes, aussi écrits dans le texte de la carte */
  const prix = cards.find(c => c.querySelector('.vf-card-prices'));
  assert.ok(prix && prix.querySelector('.vf-card-prices').getAttribute('aria-hidden') === 'true');
  for (const b of prix.querySelectorAll('.vt-price')) assert.ok(N(prix.querySelector('.vf-card-b').textContent).includes(N(b.textContent)), N(b.textContent));
  /* le relevé du jour : une image (aria-hidden) ; la date est celle de la relecture ; points et questions existent */
  const dos = d.querySelector('.page-head .vf-dos');
  assert.equal(dos.getAttribute('aria-hidden'), 'true');
  assert.equal(N(dos.querySelector('.vf-dos-k b').textContent), '17 octobre 2026');
  assert.equal(dos.querySelectorAll('.vf-dos-i--ok').length, V.hero.dossier.ok.length);
  assert.equal(dos.querySelectorAll('.vf-dos-i--wait').length, V.hero.dossier.wait.length);
  assert.ok(dos.querySelector('img[fetchpriority="high"]'));
  /* les modèles réels : trois règles titrées, côte à côte */
  assert.equal(d.querySelectorAll('#modeles .vt-point').length, 3);
  for (const dir of ALL) assert.equal(doc(dir + 'verification.html').querySelectorAll('#confirme .vf-card').length, 12, dir);
});

test('textes à jour : quatre vidéos, la dernière annonce, plus de « Trailer 3 » attendu ni de « deux trailers »', () => {
  const kb = Object.fromEntries(JSON.parse(read('outils/leo-knowledge.json')).topics.map(t => [t.id, t]));
  assert.match(kb['videos-officielles'].text, /quatre vidéos/);
  assert.match(kb['derniere-annonce'].text, /15 octobre 2026/);
  assert.match(kb.trailer3.text, /bande-annonce de lancement/);
  for (const id of ['bande-annonce-lancement', 'coffret-collector', 'manettes-dualsense', 'collection-boutique']) {
    assert.ok(kb[id], id);
    for (const l of kb[id].links) { const [page, hash] = l.url.slice(1).split('#'); assert.ok(exists(page), l.url); if (hash) assert.ok(doc(page).getElementById(hash), l.url); }
  }
  for (const f of ['actus.html', 'videos.html', 'radios.html', 'verification.html', 'editions.html', 'lieux/vice-city.html', 'missions.html']) {
    const t = N(doc(f).querySelector('main').textContent);
    assert.doesNotMatch(t, /\btrois vidéos\b|\bdeux trailers\b|Aucun Trailer 3/i, f);
  }
});

test('feuilles : chaque nouvelle animation vit dans « prefers-reduced-motion: no-preference »', () => {
  /* parties v7.92.1 des feuilles : chaque déclaration « animation: » nommée y est dans un bloc no-preference */
  for (const css of ['actus.css', 'informations.css', 'vitrine.css', 'devine.css']) {
    const src = read(css), at = src.indexOf('v7.92.1'); if (at < 0) continue;
    const part = src.slice(at);
    const outside = part.replace(/@media \(prefers-reduced-motion:no-preference\)\{[\s\S]*?\n\}/g, '').replace(/@media \(prefers-reduced-motion:no-preference\)\{[^\n]*\}\}/g, '');
    for (const m of outside.matchAll(/(?:^|[;{])\s*animation:([^;}]+)/g)) assert.match(m[1].trim(), /^none\b/, css + ' : animation hors de « no-preference » : ' + m[1].trim());
  }
});

test('Léo : dix questions sur ce que la version ajoute, dans les six langues (réponse et lien justes, toujours une source)', async () => {
  const { run } = require(path.join(root, 'outils/tests/leo-eval.cjs'));
  for (const lang of ['fr', ...LANGS]) {
    const log = console.log; console.log = () => {};
    let r; try { r = await run({ lang, questions: path.join(root, 'outils/tests/leo-questions-v7921-' + lang + '.json') }); } finally { console.log = log; }
    assert.equal(r.correct, r.questions, lang + ' : ' + r.correct + '/' + r.questions);
    assert.equal(r.withoutSource, 0, lang + ' : réponse sans source');
  }
});
