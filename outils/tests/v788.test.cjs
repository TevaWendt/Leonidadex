'use strict';
/* v7.88 : images de partage (outils/gen-partage.cjs : une image 1200 × 630 par grande page et par langue, posée en og:image
   par outils/langues.cjs devant l'image d'avant), page Presse et créateurs (presse.html, kit presse dans presse/, écrit par
   outils/gen-presse.cjs), motif de contact « Presse ou partenariat », logo de l'organisation, kit de revenus en sommeil
   (outils/monetisation.json et .cjs). */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const P = require(path.join(root, 'outils/gen-partage.cjs')), K = require(path.join(root, 'outils/gen-presse.cjs'));
const LANGS = JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr');
const SITE = 'https://www.leonidakit.com';
const ogImages = html => [...html.matchAll(/<meta property="og:image" content="([^"]+)">/g)].map(m => m[1]);

test('images de partage : une par grande page et par langue publiée, JPEG 1200 × 630, à jour de leur titre', () => {
  assert.deepEqual(P.verify(root), [], 'outils/gen-partage.cjs --verifier');
  const M = JSON.parse(read('outils/partage.json')), items = P.plan(root);
  assert.equal(items.length, P.PAGES.length * (LANGS.length + 1), 'chaque page de la liste existe dans chaque langue');
  assert.deepEqual(M.taille, { w: 1200, h: 630 });
  for (const x of items) {
    const buf = fs.readFileSync(path.join(root, x.img)), d = K.dims(buf);
    assert.deepEqual(d, { w: 1200, h: 630 }, x.img);
    assert.ok(buf.length > 20000 && buf.length < 300 * 1024, x.img + ' : ' + buf.length + ' octets (WhatsApp refuse au-delà de 300 Ko)');
  }
  /* aucune image orpheline dans img/partage/ */
  const files = fs.readdirSync(path.join(root, 'img/partage')).flatMap(l => fs.readdirSync(path.join(root, 'img/partage', l)).map(f => 'img/partage/' + l + '/' + f));
  assert.deepEqual(files.sort(), items.map(x => x.img).sort());
});

test('images de partage : balises de chaque page (première og:image, dimensions, texte alternatif = titre), image d’avant gardée', () => {
  const M = JSON.parse(read('outils/partage.json'));
  for (const x of P.plan(root)) {
    const html = read(x.file), e = M.pages[x.page][x.lang], imgs = ogImages(html);
    assert.equal(imgs[0], SITE + e.img + '?v=' + e.key, x.file);
    assert.ok(imgs.length === 2 && !imgs[1].includes('/img/partage/'), x.file + ' : l’image d’avant reste en seconde og:image');
    assert.equal((html.match(/property="og:image:width" content="1200"/g) || []).length, 1, x.file);
    assert.equal((html.match(/property="og:image:height" content="630"/g) || []).length, 1, x.file);
    const alt = new JSDOM(html).window.document.querySelector('meta[property="og:image:alt"]').content;
    assert.equal(alt, x.title, x.file);
    /* posées une fois : réappliquer ne change rien, retirer puis réappliquer redonne la page */
    assert.equal(P.applyMeta(html, x.page, x.lang, root), html, x.file + ' : applyMeta idempotent');
    assert.equal(P.applyMeta(P.strip(html), x.page, x.lang, root), html, x.file);
    assert.ok(!P.strip(html).includes('/img/partage/'), x.file);
  }
  /* une page hors de la liste n'a ni image de partage ni propriétés d'image */
  for (const f of ['a-propos.html', 'en/a-propos.html', 'vehicules/grotti-cheetah-classic.html']) assert.ok(!/img\/partage\/|og:image:(?:width|height|alt)/.test(read(f)), f);
  /* titre changé : l'image d'avant revient, rien n'est posé */
  const html = read('carte.html').replace(/<title>[^<]*<\/title>/, '<title>Autre titre | Leonidakit</title>');
  const out = P.applyMeta(html, 'carte.html', 'fr', root);
  assert.ok(!out.includes('/img/partage/') && ogImages(out).length === 1, 'titre changé');
});

test('images de partage : hors du plan du site (Google Images) et du manifeste chargé par les pages', () => {
  for (const f of ['sitemap.xml', 'sitemap-fiches.xml']) assert.ok(!read(f).includes('/img/partage/'), f);
  /* la page de la carte garde son image officielle dans le plan du site si elle en avait une */
  const sm = read('sitemap.xml'), lieux = sm.match(/<loc>https:\/\/www\.leonidakit\.com\/lieux\.html<\/loc>[\s\S]*?<\/url>/)[0];
  assert.match(lieux, /<image:loc>https:\/\/www\.leonidakit\.com\/img\/officiel\//);
  assert.ok(!read('assets-manifest.js').includes('/img/partage/'));
});

test('presse : page en six sections, chiffres posés par la synchronisation, kit téléchargeable et cohérent', () => {
  const d = doc('presse.html'), ab = doc('a-propos.html');
  /* v7.92 : partie « Identité visuelle » (couleurs, police) après le kit */
  assert.deepEqual([...d.querySelectorAll('main section.ed')].map(s => s.id), ['en-bref', 'kit', 'identite', 'citer', 'regles', 'independance', 'ecrire']);
  /* chaque texte de la page est affiché (pas de champ ignoré par le gabarit : « Citer une information » a ses trois textes) */
  const ED = JSON.parse(read('outils/informations-editorial.json')).presse, txt = d.querySelector('main').textContent.replace(/[\u00a0\u202f]/g, ' ');
  const shown = t => txt.includes(String(t).replace(/[\u00a0\u202f]/g, ' ').replace(/\{\w+\}/g, '').split(/(?<=[.:;!?])\s/)[0].slice(0, 40));
  for (const c of ED.citer.cols) for (const t of c.p) assert.ok(shown(t), 'Citer : ' + t);
  for (const t of [...ED.enBref.p, ...ED.regles.oui.liste, ...ED.regles.non.liste, ...ED.independance.p, ...ED.ecrire.p, ED.kit.note, ED.kit.partage, ED.citer.exemple]) assert.ok(shown(t), t);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  assert.equal(d.querySelectorAll('h1').length, 1);
  /* chiffres : les mêmes que l'À propos (data-count), plus les langues publiées ; sur la page Presse, fixes (sans compteur)
     et écrits au format de la langue (« 2 547 », « 2,547 », « 2.547 ») */
  const digits = b => b ? +b.textContent.replace(/\D/g, '') : null;
  const stat = (x, k) => digits(x.querySelector('.fig-n[data-stat="' + k + '"]')), statAb = k => +ab.querySelector('.fig-n[data-stat="' + k + '"]').dataset.count;
  for (const k of ['pages', 'vehicules', 'armes', 'lieux', 'visuels']) { assert.ok(stat(d, k) > 0, k); assert.equal(stat(d, k), statAb(k), k); }
  assert.equal(stat(d, 'langues'), LANGS.length + 1);
  for (const b of d.querySelectorAll('.fig-n')) { assert.ok(!b.hasAttribute('data-count'), 'chiffre fixe : ' + b.dataset.stat); assert.equal(b.textContent, new Intl.NumberFormat('fr-FR').format(digits(b)).replace(/\u00a0/g, '\u202f')); }
  for (const l of LANGS) for (const b of doc(l.dossier + '/presse.html').querySelectorAll('.fig-n')) assert.equal(digits(b), stat(d, b.dataset.stat), l.code + ' : ' + b.dataset.stat);
  /* « en 5 langues » : le nombre de langues publiées, en chiffres (la mémoire de traduction généralise les nombres) */
  assert.ok(d.querySelector('.pr-brief').textContent.includes('en ' + (LANGS.length + 1) + ' langues'), 'en ' + (LANGS.length + 1) + ' langues');
  /* liens de téléchargement : nom accessible = intitulé du fichier (titre de sa carte), puis format et poids */
  for (const a of d.querySelectorAll('.pr-dl')) { const ids = (a.getAttribute('aria-labelledby') || '').split(' '); assert.equal(ids.length, 2, a.getAttribute('href')); assert.equal(ids[1], a.id); const h = d.getElementById(ids[0]); assert.ok(h && h.tagName === 'H3', a.getAttribute('href') + ' : intitulé'); }
  /* kit : fichiers du manifeste, tous présents, à jour, liés depuis la page */
  assert.deepEqual(K.verify(), [], 'outils/gen-presse.cjs --verifier');
  const M = JSON.parse(read('outils/presse.json')).fichiers;
  const links = [...d.querySelectorAll('a[href^="presse/"]')].map(a => a.getAttribute('href'));
  for (const e of M.filter(x => x.role !== 'apercu')) assert.ok(links.includes(e.f), e.f + ' : lien de téléchargement');
  for (const h of links) assert.ok(fs.existsSync(path.join(root, h)), h);
  for (const a of d.querySelectorAll('.pr-dl')) assert.ok(a.hasAttribute('download'), a.getAttribute('href'));
  for (const img of d.querySelectorAll('.pr-file-thumb img')) { assert.ok(fs.existsSync(path.join(root, img.getAttribute('src'))), img.getAttribute('src')); assert.equal(img.getAttribute('alt'), ''); }
  /* chaque fichier du kit a son aperçu (la synchronisation remplace une image qu’elle ne connaît pas par « Visuel à intégrer ») */
  assert.equal(d.querySelectorAll('.pr-file-thumb img').length, d.querySelectorAll('.pr-file').length, 'un aperçu par fichier');
  for (const f of ['presse.html', ...LANGS.map(l => l.dossier + '/presse.html')]) assert.ok(!read(f).includes('image-placeholder'), f + ' : aucun « Visuel à intégrer »');
  /* poids affichés = poids réels */
  for (const a of d.querySelectorAll('.pr-dl')) {
    const e = M.find(x => x.f === a.getAttribute('href')), shown = a.querySelector('.pr-dl-size').textContent.replace(/ | /g, ' ');
    const want = e.octets < 1048576 ? Math.max(1, Math.round(e.octets / 1024)) + ' Ko' : String(Math.round(e.octets / 1048576 * 10) / 10).replace('.', ',') + ' Mo';
    assert.equal(shown, want, e.f);
  }
  /* l'archive : le mode d'emploi, les trois SVG et les fichiers rendus (sans les aperçus), lisible */
  const zip = fs.readFileSync(path.join(root, 'presse/leonidakit-kit-presse.zip')), names = [];
  for (let i = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])), n = zip.readUInt16LE(i + 10), o = zip.readUInt32LE(i + 16), k = 0; k < n; k++) {
    const len = zip.readUInt16LE(o + 28), lo = zip.readUInt32LE(o + 42), name = zip.slice(o + 46, o + 46 + len).toString('utf8'), size = zip.readUInt32LE(o + 24), csize = zip.readUInt32LE(o + 20), crc = zip.readUInt32LE(o + 16);
    const nl = zip.readUInt16LE(lo + 26), el = zip.readUInt16LE(lo + 28), data = zlib.inflateRawSync(zip.slice(lo + 30 + nl + el, lo + 30 + nl + el + csize));
    assert.equal(data.length, size, name); assert.equal(zlib.crc32(data), crc, name);
    if (name !== 'LISEZ-MOI.txt') assert.ok(data.equals(fs.readFileSync(path.join(root, 'presse', name))), name + ' identique au fichier du site');
    names.push(name); o += 46 + len;
  }
  assert.deepEqual(names, ['LISEZ-MOI.txt', ...K.SOURCES.map(s => s.f), ...K.RENDUS.map(r => r.f)]);
  /* logos vectoriels : des tracés, pas du texte (s'affichent pareil sans la police) */
  for (const f of ['presse/leonidakit-logo.svg', 'presse/leonidakit-logo-sombre.svg', 'presse/leonidakit-icone.svg']) { const s = read(f); assert.ok(!/<text\b/.test(s) && /viewBox=/.test(s) && /<title id="t">Leonidakit<\/title>/.test(s), f); }
  assert.deepEqual(K.dims(fs.readFileSync(path.join(root, 'presse/leonidakit-icone-512.png'))), { w: 512, h: 512 });
});

test('presse : dans le menu, le pied de page, la recherche et Léo ; contact ouvert sur « Presse ou partenariat » ; logo de l’organisation', () => {
  /* menu et pied de page : dans la source (outils/site-shell.cjs, groupe « Le site », après Contact) et dans les pages */
  const shell = require(path.join(root, 'outils/site-shell.cjs')), nav = shell.nav('index.html', ''), foot = shell.footer('', '');
  for (const f of ['index.html', 'carte.html', 'presse.html', 'vehicules/grotti-cheetah-classic.html', ...LANGS.map(l => l.dossier + '/presse.html')]) {
    const d = doc(f);
    assert.ok(d.querySelector('#nav a[href$="presse.html"]'), f + ' : menu');
    assert.ok(d.querySelector('footer a[href$="presse.html"]'), f + ' : pied de page');
  }
  assert.match(nav, /<strong>Le site<\/strong>(?:<a [^>]*>[^<]*<\/a>)*<a href="contact\.html">Contact<\/a><a href="presse\.html">Presse<\/a>/, 'menu : Le site › Presse, après Contact');
  assert.match(foot, /<a href="contact\.html">Contact<\/a><a href="presse\.html">Presse<\/a>/, 'pied de page : après Contact');
  assert.equal((foot.match(/href="presse\.html"/g) || []).length, 1, 'une seule fois au pied de page');
  assert.match(read('search-index.js'), /"u":"\/presse\.html"/);
  /* Léo : un sujet qui mène à la page, en français et dans chaque langue (adresses de la langue) */
  const K = JSON.parse(read('outils/leo-knowledge.json')).topics.find(t => t.id === 'presse');
  assert.ok(K && K.links[0].url === '/presse.html', 'sujet « presse » de Léo');
  const leoUrls = dir => { const s = read((dir ? dir + '/' : '') + 'leo-index.json') + (fs.existsSync(path.join(root, dir, 'leo')) ? fs.readdirSync(path.join(root, dir, 'leo')).map(f => read((dir ? dir + '/' : '') + 'leo/' + f)).join('') : ''); return s; };
  assert.ok(leoUrls('').includes('/presse.html'), 'Léo français');
  for (const l of LANGS) assert.ok(leoUrls(l.dossier).includes('/' + l.dossier + '/presse.html'), l.code + ' : Léo vers la page de la langue');
  const api = require(path.join(root, 'api/contact.js'))._test;
  assert.ok(api.TOPICS.includes('Presse ou partenariat'));
  assert.deepEqual([...doc('contact.html').querySelectorAll('#contact-topic option')].map(o => o.textContent), api.TOPICS);
  for (const l of LANGS) {
    const opt = [...doc(l.dossier + '/contact.html').querySelectorAll('#contact-topic option')].find(o => o.value === 'Presse ou partenariat');
    assert.ok(opt && opt.textContent !== 'Presse ou partenariat', l.code + ' : motif traduit, valeur française gardée');
    const p = doc(l.dossier + '/presse.html');
    assert.equal(p.documentElement.lang, l.code);
    assert.ok(p.querySelector('a[href="contact.html#motif=Presse%20ou%20partenariat"]'), l.code + ' : lien vers le formulaire de la langue');
    assert.ok(p.querySelector('a[href="../presse/leonidakit-kit-presse.zip"]'), l.code + ' : archive');
  }
  /* le formulaire choisit bien ce motif depuis le lien */
  assert.match(read('contact.js'), /pick\('motif',60\)/);
  /* logo de l'organisation : l'icône carrée du kit, identique sur l'accueil et l'À propos */
  const org = f => [...doc(f).querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent)).flatMap(x => x['@graph'] || [x]).find(x => x['@type'] === 'Organization' && x['@id']);
  for (const f of ['index.html', 'a-propos.html', 'presse.html']) assert.deepEqual(org(f).logo, { '@type': 'ImageObject', url: SITE + '/presse/leonidakit-icone-512.png', width: 512, height: 512 }, f);
});

test('revenus : kit en sommeil (rien d’affiché, Mentions inchangées) ; une fois activé, liens marqués et sûrs', () => {
  const MON = require(path.join(root, 'outils/monetisation.cjs'));
  assert.equal(MON.config(root).affiliation.actif, false);
  assert.ok(!read('editions.html').includes('lk-aff'), 'aucun lien affilié sur editions.html');
  assert.ok(read('mentions-legales.html').includes('ne contient aucun lien d’affiliation'), 'Mentions');
  const cfg = { affiliation: { actif: true, liens: [
    { boutique: 'Boutique <A>', url: 'https://exemple.fr/gta-6?tag=x&y=1', edition: 'Standard', plateformes: 'PS5' },
    { boutique: 'Sans adresse', url: '' }, { boutique: 'Script', url: 'javascript:alert(1)' }, { boutique: 'En clair', url: 'http://exemple.fr' }, { boutique: '', url: 'https://exemple.fr' }] } };
  assert.equal(MON.liens(cfg).length, 1, 'seulement les liens https avec une boutique');
  const html = MON.blocEditions(cfg), d = new JSDOM(html).window.document, a = d.querySelectorAll('a');
  assert.equal(a.length, 1);
  assert.equal(a[0].getAttribute('rel'), 'sponsored nofollow noopener'); assert.equal(a[0].getAttribute('target'), '_blank');
  assert.ok(a[0].hasAttribute('data-newtab') && a[0].getAttribute('title') === 'S’ouvre dans un nouvel onglet', 'nouvel onglet annoncé');
  assert.equal(a[0].querySelector('.lk-aff-shop').getAttribute('translate'), 'no', 'nom de la boutique non traduit');
  assert.equal(d.querySelector('h2').textContent, 'Où l’acheter');
  assert.equal(a[0].getAttribute('href'), 'https://exemple.fr/gta-6?tag=x&y=1');
  assert.equal(a[0].querySelector('.lk-aff-tag').textContent, 'Lien affilié');
  assert.equal(a[0].querySelector('.lk-aff-shop').textContent, 'Boutique <A>', 'texte échappé');
  assert.match(MON.mentionsEditeur(cfg), /liens affiliés/);
  assert.equal(MON.blocEditions({ affiliation: { actif: false, liens: cfg.affiliation.liens } }), '');
  /* les deux autres phrases des Mentions qui disent « sans activité commerciale » : celles d’aujourd’hui tant que rien n’est
     actif (affichées telles quelles), réécrites à l’activation */
  const sp = t => t.replace(/[\u00a0\u202f]/g, ' '), ment = sp(read('mentions-legales.html'));
  for (const t of [MON.mentionsEditeur(), MON.mentionsProjet(), MON.mentionsClair()]) assert.ok(ment.includes(sp(t)), 'Mentions : ' + t);
  assert.match(MON.mentionsProjet(), /sans activité commerciale/); assert.match(MON.mentionsClair(), /sans but commercial/);
  for (const f of ['mentionsProjet', 'mentionsClair']) { assert.doesNotMatch(MON[f](cfg), /commercial/, f + ' activé'); assert.match(MON[f](cfg), /liens affiliés/, f + ' activé'); }
  /* activés, ces textes sont déjà traduits dans les quatre langues (outils/langues/<code>/v788.json) : rien ne reste en
     français sur editions.html ni sur les Mentions (liste donnée par l’extraction des quatre langues, revenus activés) */
  const LG = require(path.join(root, 'outils/langues.cjs')), phrases = t => t.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ý])/);
  const [clair1, ...clair2] = phrases(MON.mentionsClair(cfg));
  const actifs = ['Où l’acheter', 'Lien affilié', '<1>Standard, PS5, Xbox Series X|S</1><2>Lien affilié</2>', '<1>Édition Ultimate, PS5, Xbox Series X|S</1><2>Lien affilié</2>',
    ...phrases(new JSDOM(MON.blocEditions(cfg)).window.document.querySelector('.ac-lede').textContent), ...phrases(MON.mentionsEditeur(cfg)), ...phrases(MON.mentionsProjet(cfg)), '<1>En clair</1> ' + clair1, ...clair2];
  for (const l of LANGS) { const m = LG.memoire(root, l.code).map; for (const t of actifs) assert.ok(m.has(LG.norm(t)), l.code + ' : traduction prête pour « ' + t + ' »'); }
});

/* un Léo neuf dans la langue voulue (index, scripts et morceaux de son dossier), comme le charge le site */
function leoCore(code) {
  const D = code === 'fr' ? '' : code + '/', own = f => fs.existsSync(path.join(root, D + f)) ? D + f : f;
  const dom = new JSDOM('<!doctype html><html lang="' + code + '"><body><main></main></body></html>', { runScripts: 'outside-only', url: SITE + '/' + D + 'index.html' }), w = dom.window;
  w.fetch = async url => { const file = path.join(root, String(url).replace(SITE, '').replace(/\?.*$/, '').replace(/^\//, '')); if (!fs.existsSync(file)) return { ok: false, status: 404, headers: { get: () => '0' }, text: async () => '' }; const text = fs.readFileSync(file, 'utf8'); return { ok: true, status: 200, headers: { get: () => String(Buffer.byteLength(text)) }, text: async () => text }; };
  for (const f of ['calculateurs-engine.js', 'leo-link.js', 'leo-nlp.js', 'leo-core.js']) w.eval(read(own(f)));
  return w.LKLeoCore.create(JSON.parse(read(D + 'leo-index.json')), { load: async (name, file) => JSON.parse(await (await w.fetch(file)).text()) });
}

test('Léo : la page Presse dans les cinq langues (kit presse, journaliste, citer le site, partenariat, captures, créateurs, interview, ce que dit la presse du jeu), sans capter les questions sur le jeu', async () => {
  const E = require(path.join(root, 'outils/tests/leo-eval.cjs'));
  for (const code of ['fr', ...LANGS.map(l => l.code)]) {
    const file = path.join(root, 'outils/tests/leo-questions-section-presse-' + code + '.json');
    const r = await E.run({ lang: code, questions: file });
    assert.equal(r.correct, r.questions, code + ' : ' + r.correct + '/' + r.questions);
    assert.equal(r.withoutSource, 0, code);
    /* questions sur le jeu (logo du jeu, journaliste ou interview d'un personnage, partenariat avec Lucia, captures du jeu,
       citer une source…) : jamais le sujet presse, ni en réponse, ni parmi deux propositions ; posées chacune à un Léo neuf */
    const neg = JSON.parse(fs.readFileSync(file, 'utf8')).hors_presse;
    assert.ok(Array.isArray(neg) && neg.length >= 8, code + ' : questions hors presse');
    for (const q of neg) {
      const a = await leoCore(code).ask(q, {}, { now: '2026-10-01T12:00:00Z' });
      assert.ok(a.topic !== 'presse' && !(a.topics || []).includes('presse'), code + ' : « ' + q + ' » ne doit pas mener au sujet presse (' + a.kind + ' ' + (a.topic || '') + ')');
    }
  }
});
