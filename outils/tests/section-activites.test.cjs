/* Section « Activités annexes » (section activites) : données (statuts, sources, valeurs publiées), page principale, fiches,
   pont avec le calculateur (décrit, jamais écrit), menu, recherche, plan du site, Léo, langues, filtre de la liste, mouvement.
   NODE_PATH=<dépendances>/node_modules node --test outils/tests/section-activites.test.cjs */
'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const G = require(path.join(root, 'outils/gen-activites.cjs'));
const DP = require(path.join(root, 'outils/donnees-publiees.cjs'));
const doc = f => new JSDOM(read(f)).window.document;
const ld = d => [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
const H = JSON.parse(read('outils/activites/hub.json')), A = JSON.parse(read('outils/activites/activites.json'));
const FICHES = A.activites.map(a => 'activites/' + a.id + '.html');
const PAGES = ['activites.html', ...FICHES];
const AUTRES_SECTIONS = /href="(?:\.\.\/)?(?:missions|radios|animaux|codes|trophees|gta-online)(?:\.html|\/)/;

test('données : sept fiches sourcées, chaque ligne avec statut et sources, aucun montant publié, schéma des valeurs publiées', () => {
  const ctx = G.context(root);
  assert.doesNotThrow(() => G.check(ctx));
  assert.deepEqual(A.activites.map(a => a.id), ['braquages-commerces', 'vol-de-voitures', 'peche', 'chasse', 'activites-nautiques', 'salle-de-sport', 'courses']);
  for (const a of A.activites) {
    assert.deepEqual(G.checkActivite(a, ctx), [], a.id);
    assert.equal(a.rapporte.gain, null, a.id + ' : aucun gain publié au 4 octobre 2026');
    assert.equal(a.rapporte.duree, null, a.id + ' : aucune durée publiée');
    assert.ok(a.montre.some(x => x.statut === 'officiel'), a.id + ' : au moins une phrase officielle');
  }
  const bad = (f, re) => { const a = JSON.parse(JSON.stringify(A.activites[0])); f(a); const e = G.checkActivite(a, ctx); assert.ok(e.some(x => re.test(x)), e.join(' | ')); };
  bad(a => { a.famille = 'sport'; }, /famille inconnue/);
  bad(a => { a.montre[0].sources = ['inventee']; }, /source inconnue/);
  bad(a => { a.montre = a.montre.map(x => ({ ...x, statut: 'vu' })); }, /aucune phrase officielle/);
  bad(a => { a.rapporte.gain = { value: 5000, status: 'official', unit: '$' }; }, /exige source/);
  bad(a => { a.rapporte.duree = { value: 10, status: 'verified', source: 'x', verifiedAt: '2026-10-04', unit: 'h' }; }, /unité/);
  bad(a => { a.besoin[0].vehicules = ['voiture-inventee']; }, /véhicule inconnu/);
  bad(a => { a.resume = 'x'.repeat(161); }, /160 signes/);
  bad(a => { a.calc.tool = 'plan'; }, /calculateur/);
  /* chaque ligne de la liste : statut connu, sources connues ; une fiche est toujours listée */
  const all = H.liste.familles.flatMap(f => f.items);
  assert.ok(all.length >= 25);
  for (const x of all) { assert.ok(['officiel', 'vu', 'comm', 'conf'].includes(x.statut), x.nom); for (const s of x.sources) assert.ok(H.sources[s], x.nom + ' : ' + s); }
  for (const s of Object.values(H.sources)) { assert.match(s.url, /^https:\/\//); assert.equal(s.consultedAt, '2026-10-04'); }
  /* rien des fuites : aucune source écartée n’est citée */
  for (const s of Object.values(H.sources)) assert.doesNotMatch(s.url + ' ' + s.title, /leak|fuite|geleakt/i);
});

test('pont avec le calculateur : décrit, jamais écrit ; une activité au gain et à la durée publiés aurait le format de « Mes activités »', () => {
  assert.deepEqual(G.activitesCalculateur(A.activites), [], 'aucune activité chiffrée au 4 octobre 2026');
  const fictive = { ...JSON.parse(JSON.stringify(A.activites[0])), id: 'test-fictive', nom: 'Activité fictive de test' };
  fictive.rapporte.gain = { value: 1500, status: 'official', source: 'https://www.rockstargames.com/VI', verifiedAt: '2026-12-01', unit: '$' };
  fictive.rapporte.duree = { value: 5, status: 'verified', source: 'Relevé de test', verifiedAt: '2026-12-02', unit: 'min' };
  const acts = G.activitesCalculateur([fictive]); assert.equal(acts.length, 1);
  assert.equal(acts[0].id, 'activite-test-fictive'); assert.equal(acts[0].status, 'verified', 'statut le plus faible des deux valeurs');
  assert.deepEqual(DP.verifierActivite(acts[0], 0), [], 'activité bien formée pour donnees-publiees.cjs');
  const ctx = { window: { LK_ACTIVITIES: acts } }; vm.createContext(ctx); vm.runInContext(read('calculateurs-data.js'), ctx);
  const n = ctx.window.LKCalcData.activities(); assert.equal(n.length, 1); assert.equal(n[0].reward, 1500); assert.equal(n[0].duration, 5);
  assert.doesNotMatch(read('calculateurs-activites.js'), /activite-/, 'calculateurs-activites.js n’est pas modifié par la section');
  /* la fiche affiche « Pas encore publié » tant que rien n’est publié, la valeur avec son statut sinon */
  const html = G.fichePage(G.context(root), fictive), d = new JSDOM(html).window.document;
  assert.match(d.querySelector('.activites-chiffres').textContent.replace(/[  ]/g, ' '), /1 500 \$ · Officiel/);
  assert.match(doc('activites/peche.html').querySelector('.activites-chiffres').textContent, /Pas encore publié/);
});

test('activites.html : fiches, liste complète par famille, ce que ça rapporte, zone éditoriale, encart du calculateur, données structurées', () => {
  const d = doc('activites.html');
  assert.equal(d.querySelectorAll('h1').length, 1);
  assert.ok(d.querySelector('meta[name="description"]').content.length <= 160);
  assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/activites.html');
  assert.equal(d.querySelectorAll('#fiches .activites-tile').length, A.activites.length); /* mosaïque de grandes images (lk-sections) */
  for (const a of A.activites) assert.ok(d.querySelector('#fiches a[href="activites/' + a.id + '.html"]'), a.id);
  assert.deepEqual([...d.querySelectorAll('#toutes .activites-fam')].map(f => f.dataset.famille), ['crime', 'nature', 'ville']);
  assert.equal(d.querySelectorAll('#toutes .activites-item').length, H.liste.familles.reduce((n, f) => n + f.items.length, 0));
  for (const li of d.querySelectorAll('#toutes .activites-item')) { assert.ok(li.querySelector('.ed-status'), 'statut affiché'); assert.ok(li.querySelector('.activites-src a'), 'sources'); }
  /* pas de doublon : les activités déjà couvertes renvoient aux pages existantes */
  for (const href of ['gangs.html', 'planques.html', 'collectibles.html', 'style.html', 'personnalisations.html', 'entreprises/jack-of-hearts.html']) assert.ok(d.querySelector('#toutes a[href="' + href + '"]'), href);
  assert.equal(d.querySelectorAll('#rapporte .activites-cash-card').length, H.rapporte.lignes.length); /* cartes façon calculateur */
  for (const a of d.querySelectorAll('#rapporte .activites-cash-a')) { const h = a.getAttribute('href'); assert.ok(h.startsWith('#') ? d.getElementById(h.slice(1)) : fs.existsSync(path.join(root, h)), h); }
  assert.ok(d.querySelector('#carte-activites [data-lk-loc="activites"]'), 'carte des activités (localisateur)');
  for (const li of d.querySelectorAll('#toutes .activites-item')) assert.ok(li.querySelector('details.lkx-det[id^="act-"] .lkx-sheet-src'), 'fiche plein écran de chaque activité');
  for (const a of d.querySelectorAll('.activites-src a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  assert.deepEqual([...d.querySelectorAll('.ed-zone--monde section.ed')].map(s => s.id), ['rockstar', 'communaute', 'a-confirmer', 'pour-toi', 'faq', 'sources']);
  for (const a of d.querySelectorAll('.ed-nav a')) assert.ok(d.getElementById(a.getAttribute('href').slice(1)), a.getAttribute('href'));
  const acts = [...d.querySelectorAll('#pour-toi .ed-act')].map(a => a.getAttribute('href'));
  assert.ok(acts.some(h => /^carte\.html#pins=[\w,-]+&t=/.test(h))); assert.ok(acts.includes('calculateurs.html?tool=activities&from=activites#atelier'));
  const types = ld(d).map(x => x['@type']); for (const t of ['BreadcrumbList', 'CollectionPage', 'FAQPage']) assert.ok(types.includes(t), t);
  const hub = d.querySelectorAll('.lk-entry-hub'); assert.equal(hub.length, 1);
  const u = new URL(hub[0].querySelector('a').getAttribute('href'), 'https://www.leonidakit.com/activites.html'); assert.equal(u.searchParams.get('tool'), 'activities'); assert.equal(u.searchParams.get('from'), 'activites');
  assert.equal(d.querySelectorAll('nav.lk-chips').length, 1);
  /* filtre : écrit dans la page, caché sans script */
  const f = d.querySelector('[data-activites-filtre]'); assert.ok(f && f.hidden); assert.equal(f.querySelectorAll('button[data-filtre]').length, 5); /* + « Sur la carte » */
  assert.ok(!read('activites.html').includes('{donnees:'));
  const ph = DP.phrases(DP.etat(root)), norm = s => s.replace(/[  ]/g, ' ').replace(/\s+/g, ' ');
  assert.ok(norm(d.getElementById('rapporte').textContent).includes(norm(ph.activites)));
  assert.ok(norm(d.getElementById('faq').textContent).includes(norm(ph.activites)));
  const ids = [...d.querySelectorAll('[id]')].map(x => x.id); assert.deepEqual(ids.filter((x, i) => ids.indexOf(x) !== i), []);
});

test('activites/ : une fiche par activité sourcée, gabarit des fiches, encart du calculateur, liens vers le site, sources', () => {
  assert.deepEqual(fs.readdirSync(path.join(root, 'activites')).filter(f => f.endsWith('.html')).sort(), A.activites.map(a => a.id + '.html').sort());
  for (const a of A.activites) {
    const f = 'activites/' + a.id + '.html', d = doc(f);
    assert.equal(d.querySelectorAll('h1').length, 1, f); assert.equal(d.querySelector('h1').textContent, a.nom);
    assert.ok(!/noindex/.test((d.querySelector('meta[name="robots"]') || { content: '' }).content), f + ' : indexable');
    assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/' + f);
    assert.ok(d.querySelector('meta[name="description"]').content.length <= 160);
    assert.ok(d.querySelector('nav.crumbs a[href="../activites.html"]'), f + ' : fil d’Ariane');
    const btn = d.querySelector('.lk-entry-card a.lk-entry-button'), u = new URL(btn.getAttribute('href'), 'https://www.leonidakit.com/' + f);
    assert.equal(u.pathname, '/calculateurs.html'); assert.equal(u.searchParams.get('tool'), a.calc.tool); assert.equal(u.searchParams.get('from'), 'activites'); assert.equal(u.hash, '#atelier');
    assert.ok(d.querySelector('link[href^="../calculator-entry.css"]'), f);
    assert.equal(d.querySelectorAll('.activites-montre li').length, a.montre.length);
    assert.equal(d.querySelectorAll('.activites-fiche-src .ed-srcs li').length, a.sources.length);
    for (const s of d.querySelectorAll('.activites-src a')) assert.ok(d.getElementById(s.getAttribute('href').slice(1)), f + ' ' + s.getAttribute('href'));
    for (const img of d.querySelectorAll('main img')) { assert.ok(img.getAttribute('width') && img.getAttribute('height'), f + ' : dimensions'); assert.ok(img.hasAttribute('alt'), f + ' : alt'); }
    assert.equal(d.querySelector('.lore-fig img').getAttribute('loading'), 'eager');
    for (const img of d.querySelectorAll('.lore-gallery img')) assert.equal(img.getAttribute('loading'), 'lazy');
    for (const el of d.querySelectorAll('main a[href]')) { const h = el.getAttribute('href'); if (/^(https?:|#|mailto:)/.test(h)) continue; const p = h.startsWith('/') ? h.split(/[?#]/)[0].slice(1) : path.posix.normalize(path.posix.join('activites', h.split(/[?#]/)[0])); assert.ok(fs.existsSync(path.join(root, p)), f + ' → ' + p); }
    assert.doesNotMatch(d.querySelector('main').textContent, /\d[\d\s  ]* \$/, f + ' : aucun montant');
    const types = ld(d).map(x => x['@type']); assert.ok(types.includes('BreadcrumbList'));
  }
});

test('sécurité et droits : aucun script en ligne, rien de chargé depuis un autre site, aucun lecteur ; pas de lien vers les autres sections nouvelles', () => {
  for (const f of PAGES) {
    const d = doc(f), html = read(f);
    for (const s of d.querySelectorAll('script')) if (!s.src && s.type !== 'application/ld+json' && s.type !== 'lk/lazy') assert.fail(f + ' : script en ligne');
    for (const el of d.querySelectorAll('[src], link[href]')) { const u = el.getAttribute('src') || el.getAttribute('href'); if (el.tagName === 'LINK' && !/stylesheet|preload|icon/.test(el.rel)) continue; assert.doesNotMatch(u, /^(https?:)?\/\//, f + ' : ressource externe ' + u); }
    assert.equal(d.querySelectorAll('iframe, audio, video, embed, object').length, 0, f);
    assert.doesNotMatch(html, /\son[a-z]+="/, f + ' : gestionnaire en ligne');
    /* v7.69 : les pastilles de navigation (nav.lk-chips, posées par outils/site-shell.cjs selon la famille de la page)
       relient maintenant les pages « Jouer » entre elles ; la règle vaut pour le contenu de la section. */
    const main = d.querySelector('main').cloneNode(true); main.querySelectorAll('nav.lk-chips').forEach(n => n.remove());
    assert.doesNotMatch(main.innerHTML, AUTRES_SECTIONS, f + ' : lien vers une autre section nouvelle');
  }
  for (const f of ['index.html', 'gangs.html', 'lieux/mount-kalaga.html', 'nourriture.html']) assert.doesNotMatch(read(f), /activites\.(css|js)/, f);
  assert.doesNotMatch(read('activites.js'), /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest/);
});

test('menu, pied de page, recherche et plan du site : « Activités annexes » dans le groupe « Jouer »', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  assert.ok(shell.play.some(x => x[0] === 'activites.html' && x[1] === 'Activités annexes'));
  assert.ok(shell.sectionPages.has('activites.html'));
  assert.match(shell.nav('index.html', ''), /<strong>Jouer<\/strong>[^]*?<a href="activites\.html">Activités annexes<\/a>/);
  const foot = shell.footer('', ''); assert.ok(foot.indexOf('<h2>Explorer</h2>') < foot.indexOf('<h2>Jouer</h2>') && foot.indexOf('<h2>Jouer</h2>') < foot.indexOf('<h2>S’équiper</h2>'));
  assert.match(read('activites.html'), /<a href="activites\.html" class="here" aria-current="page">Activités annexes<\/a>/);
  assert.ok(shell.ENTRY['activites.html'] && shell.ENTRY['activites.html'].tool === 'activities');
  const ctx = { window: {} }; vm.runInNewContext(read('search-index.js'), ctx);
  for (const u of ['/activites.html', ...FICHES.map(f => '/' + f)]) assert.ok(ctx.window.LK_INDEX.some(e => e.u === u), u);
  assert.ok(read('sitemap.xml').includes('<loc>https://www.leonidakit.com/activites.html</loc>'));
  for (const f of FICHES) assert.ok(read('sitemap-fiches.xml').includes('<loc>https://www.leonidakit.com/' + f + '</loc>'), f);
  assert.match(read('style.css'), /sections? [a-z, ]*\bactivites\b[a-z, ]* : cinq groupes dans « Explorer »/); /* un seul bloc, marqué « section activites » ou « sections …, activites, … » une fois les sections réunies */
});

test('Léo : morceau de questions de la section, fiches des activités, sujets existants reliés aux fiches, réponses honnêtes', () => {
  const idx = JSON.parse(read('leo-index.json'));
  assert.ok(idx.shards.activites && idx.shards.activites.knowledge);
  const sh = JSON.parse(read('leo/activites.json')); assert.equal(sh.revision, idx.revision);
  assert.equal(sh.knowledge.length, H.zone.faq.filter(x => !x.leo).length); assert.ok(sh.knowledge.every(t => /^activites-faq-\d$/.test(t.id)));
  for (const [id, url] of [['braquer-magasins', '/activites/braquages-commerces.html'], ['vol-voiture', '/activites/vol-de-voitures.html'], ['poids', '/activites/salle-de-sport.html']]) assert.equal(idx.knowledge.find(t => t.id === id).links[0].url, url, id);
  const monde = JSON.parse(read('leo/monde.json'));
  for (const a of A.activites) assert.ok(JSON.stringify(monde).includes('/activites/' + a.id + '.html'), a.id);
  const core = require(path.join(root, 'outils/tests/leo-complet.cjs')).fullCore(root);
  for (const [q, want] of [['quelles activites annexes dans gta 6', ['activites-faq-1']], ['peut on pecher dans gta 6', ['activites-faq-2']], ['peut on chasser dans gta 6', ['activites-faq-3']], ['les activites annexes rapportent elles de l argent', ['activites-faq-4']], ['peut on aller a la salle de sport dans gta 6', ['poids']], ['on peut braquer des magasins ?', ['braquer-magasins', 'braquage', 'hub-entreprises-3']], ['comment voler une caisse dans gta 6', ['vol-voiture']]]) {
    const a = core.answer(q); assert.equal(a.kind, 'answer', q); assert.ok(want.includes(a.topic), q + ' → ' + a.topic); assert.ok((a.links || []).length, q);
  }
  assert.ok(!core.answer('les activites annexes rapportent elles de l argent').text.includes('{donnees:'));
  /* « où… ? » : la fiche qui a un repère sur la carte l’ouvre dessus */
  const ou = core.answer('ou est la salle de sport'); assert.equal(ou.entity, 'activite:salle-de-sport'); assert.equal(ou.action && ou.action.type, 'map'); assert.match(ou.action.url, /#lieu=g-L1869$/);
});

test('cinq langues : pages générées, morceau de Léo dans chaque langue', () => {
  const L = require(path.join(root, 'outils/langues.cjs')).config(root);
  for (const l of L.langues.filter(x => x.etat === 'publiee' && x.code !== 'fr')) {
    for (const f of PAGES) { const p = l.dossier + '/' + f; assert.ok(fs.existsSync(path.join(root, p)), p); assert.equal(doc(p).documentElement.lang.slice(0, 2), l.code); }
    assert.equal(JSON.parse(read(l.dossier + '/leo/activites.json')).knowledge.length, H.zone.faq.filter(x => !x.leo).length, l.code);
  }
});

/* ---------- mouvement : décoratif, coupé avec prefers-reduced-motion ---------- */
test('activites.css : seuls transform et opacity bougent, et tout est coupé sous prefers-reduced-motion: reduce', () => {
  const css = read('activites.css');
  const at = css.indexOf('@media (prefers-reduced-motion:reduce)'), reduce = css.slice(at);
  assert.ok(at > 0 && reduce.length > 50, 'bloc mouvement réduit');
  const keyframes = [...css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?\})\s*\}/g)];
  assert.ok(keyframes.length >= 1);
  for (const [, , body] of keyframes) for (const m of body.matchAll(/([a-z-]+)\s*:/g)) assert.ok(['transform', 'opacity'].includes(m[1]), 'propriété animée : ' + m[1]);
  for (const name of keyframes.map(k => k[1])) {
    const users = [...css.matchAll(new RegExp('([^{}]+)\\{[^}]*animation:[^;}]*\\b' + name + '\\b', 'g'))].map(m => m[1].trim()).filter(s => !s.startsWith('@'));
    assert.ok(users.length, name + ' utilisée');
    for (const sel of users) for (const one of sel.split(',')) assert.ok(reduce.includes(one.trim()), 'animation non coupée : ' + one.trim());
  }
  for (const m of css.slice(0, at).matchAll(/transition:([^;}]+)/g)) for (const part of m[1].split(',')) assert.match(part.trim(), /^(transform|opacity)\b/, 'transition : ' + part);
});

test('activites.js : filtre de la liste au clavier et à la souris, compteur, familles vides cachées, rien d’enregistré', async () => {
  const { load } = require('./runtime-helper.cjs');
  const run = reduce => load(root, 'activites.html', { before: w => { w.matchMedia = q => ({ matches: reduce && /reduce/.test(q), addEventListener() {}, removeEventListener() {} }); } });
  let r = await run(false);
  try {
    const d = r.d, box = d.querySelector('[data-activites-filtre]'), btn = k => d.querySelector('button[data-filtre="' + k + '"]');
    const visible = () => [...d.querySelectorAll('.activites-item')].filter(x => !x.hidden);
    assert.deepEqual(r.errors, []);
    assert.equal(box.hidden, false, 'le filtre apparaît avec le script');
    const total = d.querySelectorAll('.activites-item').length;
    assert.equal(visible().length, total); assert.equal(d.querySelector('[data-activites-n]').textContent, String(total));
    btn('fiche').click();
    assert.ok(visible().every(x => x.hasAttribute('data-fiche')) && visible().length > 0);
    assert.equal(d.querySelector('[data-activites-n]').textContent, String(visible().length));
    assert.equal(btn('fiche').getAttribute('aria-pressed'), 'true'); assert.equal(btn('all').getAttribute('aria-pressed'), 'false');
    assert.equal(d.querySelector('.activites-fam[data-famille="ville"]').hidden, true, 'famille sans ligne cachée');
    btn('vu').click(); assert.ok(visible().every(x => x.dataset.statut === 'vu'));
    btn('all').click(); assert.equal(visible().length, total);
    assert.ok(d.querySelectorAll('.activites-item.is-in').length > 0, 'les lignes revenues entrent en douceur');
    assert.equal(btn('all').tagName, 'BUTTON', 'de vrais boutons : clavier et lecteurs d’écran');
    assert.equal(r.w.localStorage.length, 0, 'rien sur l’appareil');
  } finally { r.close(); }
  r = await run(true);
  try { r.d.querySelector('button[data-filtre="fiche"]').click(); r.d.querySelector('button[data-filtre="all"]').click(); assert.equal(r.d.querySelectorAll('.activites-item.is-in').length, 0, 'aucune entrée animée avec prefers-reduced-motion'); } finally { r.close(); }
});
