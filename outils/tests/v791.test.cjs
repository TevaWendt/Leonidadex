'use strict';
/* v7.91 (lot 7) : le site en portugais du Brésil (pt-BR), avec Léo.
   - la langue est publiée partout : configuration, dossier pt/ complet, hreflang dans chaque page indexée de chaque langue,
     plans du site, flux RSS pt/actus.xml, barre « Mudar o idioma », Léo en portugais ;
   - nombres, dates et argent à la brésilienne (« $ 200.000 », « 1,5 milhão », « 19 de novembro de 2026 ») ;
   - mots reconnus par le calculateur dans ce que tape le joueur (« tenho », « milhão », « mil », « por hora », « por dia »,
     « jogadores », « sessão ») et pont de Léo (« quando sai », « onde fica », « quanto custa », « vale a pena ») ;
   - mémoire de traduction sans conflit, sans texte manquant ; glossaire présent.
   NODE_PATH=<dépendances>/node_modules SITE_ROOT=$PWD node --test outils/tests/v791.test.cjs */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8'), exists = f => fs.existsSync(path.join(root, f));
const CFG = JSON.parse(read('outils/langues.json'));
const PT = CFG.langues.find(l => l.code === 'pt');
const L = require(path.join(root, 'outils/langues.cjs'));
const sp = s => String(s).replace(/[  ]/g, ' ');

test('configuration : le portugais du Brésil est publié (dossier pt, pt-BR, pt_BR), toutes les pages, Léo en portugais', () => {
  assert.equal(PT.etat, 'publiee'); assert.equal(PT.dossier, 'pt'); assert.equal(PT.locale, 'pt-BR'); assert.equal(PT.og, 'pt_BR');
  assert.equal(PT.libelles.changer, 'Mudar o idioma'); assert.equal(PT.libelles.aller, 'Ler em português'); assert.equal(PT.libelles.versFr, 'em francês');
  const es = CFG.langues.find(l => l.code === 'es');
  assert.deepEqual(PT.traduireAussi, es.traduireAussi); assert.deepEqual(PT.scriptsEnPlus, es.scriptsEnPlus);
  assert.ok(CFG.leo.includes('pt'), 'Léo répond en portugais');
  assert.ok(exists('outils/langues/pt/_glossaire.md'), 'glossaire du portugais');
});

test('Léo s’amorce sur les pages de chaque langue de « leo », portugais compris (common.js)', () => {
  const m = read('common.js').match(/if\(!\/\^\(\?:([a-z|]+)\)\\b\/i\.test\(document\.documentElement\.lang/);
  assert.ok(m, 'test de langue de l’amorçage de Léo');
  const re = new RegExp('^(?:' + m[1] + ')\\b', 'i');
  for (const code of CFG.leo) { const l = CFG.langues.find(x => x.code === code) || {}; assert.ok(re.test(l.locale || code) && re.test(code), code + ' (' + (l.locale || code) + ')'); }
  assert.ok(re.test('pt-BR'), 'pt-BR');
});

test('IA du site (api/ia.js) : une question posée depuis une page portugaise est traitée en portugais du Brésil (plus de repli français)', () => {
  const T = require(path.join(root, 'api/ia.js'))._test;
  const v = T.validate({ mode: 'leo', question: 'quando sai o jogo?', lang: 'pt', page: '/pt/index.html' });
  assert.equal(v.ok, true); assert.equal(v.data.lang, 'pt');
  assert.match(T.userMessage(v.data), /^Langue de la réponse : portugais du Brésil/);
  const c = T.validate({ mode: 'calcul', question: 'tenho 200 mil e quero 1 milhão', lang: 'pt' });
  assert.equal(c.data.lang, 'pt'); assert.match(T.userMessage(c.data), /^Langue de la note : portugais du Brésil/);
  for (const code of CFG.leo) assert.equal(T.validate({ mode: 'leo', question: 'test ok', lang: code }).data.lang, code, 'langue ' + code + ' connue de la fonction');
});

test('vercel.json : les redirections par langue couvrent toutes les langues publiées, portugais compris (/pt/index.html → /pt/)', () => {
  const v = JSON.parse(read('vercel.json')), per = v.redirects.filter(r => r.source.startsWith('/:lang('));
  assert.ok(per.length >= 11, per.length + ' redirections par langue');
  const dirs = CFG.langues.filter(l => l.etat === 'publiee' && l.code !== CFG.source).map(l => l.dossier).sort();
  for (const r of per) { const m = r.source.match(/^\/:lang\(([a-z|]+)\)\//); assert.ok(m, r.source); assert.deepEqual(m[1].split('|').sort(), dirs, r.source); }
  assert.ok(per.some(r => /^\/:lang\([a-z|]*pt[a-z|]*\)\/index\.html$/.test(r.source) && r.destination === '/:lang/'), '/pt/index.html → /pt/');
});

test('dossier pt/ : chaque page française a sa version, en pt-BR, avec la barre « Mudar o idioma »', () => {
  const pages = L.config(root).langues.find(l => l.code === 'pt').pages;
  assert.ok(pages.length >= 460, pages.length + ' pages');
  for (const p of pages) assert.ok(exists('pt/' + p), 'pt/' + p);
  for (const p of ['index.html', 'calculateurs.html', 'carte.html', 'mentions-legales.html', 'vehicules/grotti-cheetah-classic.html']) {
    const h = read('pt/' + p);
    assert.match(h, /<html lang="pt"/, p); /* même règle que les autres langues : le code de la langue (locale pt-BR pour les nombres et og:locale) */
    assert.match(h, /Mudar o idioma/, p + ' : barre de langue');
    assert.match(h, /property="og:locale" content="pt_BR"/, p);
  }
});

test('référencement : hreflang pt dans les pages indexées des six langues, plans du site, flux RSS en portugais', () => {
  for (const f of ['index.html', 'en/index.html', 'es/carte.html', 'it/calculateurs.html', 'de/vehicules.html', 'pt/armes.html']) {
    const h = read(f), href = 'https://www.leonidakit.com/pt/' + f.replace(/^(?:en|es|it|de|pt)\//, '').replace(/^index\.html$/, '');
    assert.ok(h.includes('<link rel="alternate" hreflang="pt" href="' + href + '">'), f + ' → ' + href);
    assert.ok(h.includes('hreflang="x-default" href="https://www.leonidakit.com/en/'), f + ' : x-default anglais');
  }
  const sm = read('sitemap.xml');
  assert.ok(sm.includes('<loc>https://www.leonidakit.com/pt/index.html</loc>') || sm.includes('<loc>https://www.leonidakit.com/pt/</loc>'), 'plan du site : accueil portugais');
  assert.ok((sm.match(/hreflang="pt"/g) || []).length > 100, 'plan du site : versions portugaises');
  const rss = read('pt/actus.xml');
  assert.match(rss, /<language>pt-BR<\/language>|xml:lang="pt-BR"|<language>pt<\/language>/, 'flux RSS en portugais');
  assert.ok(!/Les six stations de radio/.test(rss), 'flux RSS traduit');
});

test('nombres, dates et argent à la brésilienne (moteur du calculateur)', () => {
  const E = require(path.join(root, 'calculateurs-engine.js'));
  assert.equal(E.dollars('1.250', ' ', 'pt'), '$ 1.250');
  assert.equal(E.dollars('-200.000', undefined, 'pt'), '-$ 200.000');
  assert.equal(E.parseLocalizedNumber('1.250,50', 'pt').value, 1250.5);
  assert.equal(E.parseLocalizedNumber('200.000', 'pt').value, 200000);
  assert.equal(E.parseLocalizedNumber('1.5', 'pt').value, 1.5);
  assert.equal(E.plural(0, 'pt'), true); assert.equal(E.plural(1, 'pt'), false); assert.equal(E.plural(1.5, 'pt'), false); assert.equal(E.plural(2, 'pt'), true);
  assert.equal(E.dateText(new Date(2026, 10, 19), {}, 'pt'), '19 de novembro de 2026');
  assert.equal(E.dateText(new Date(2026, 9, 1), {}, 'pt'), '1º de outubro de 2026');
  /* espaces insécables des pages portugaises (outils/insecables.cjs) : le signe, le nombre et son unité restent ensemble */
  const { insecables } = require(path.join(root, 'outils/insecables.cjs')), NB = '\u00a0';
  assert.equal(insecables('de $ 100 mil a $ 10 mi', 'pt'), 'de $' + NB + '100' + NB + 'mil a $' + NB + '10' + NB + 'mi');
  assert.equal(insecables('$ 1,5 milhão', 'pt'), '$' + NB + '1,5' + NB + 'milhão');
  assert.equal(insecables('em 19 de novembro de 2026.', 'pt'), 'em 19' + NB + 'de novembro de' + NB + '2026.');
  assert.equal(insecables('tenho 5 mil', 'pt'), 'tenho 5 mil', 'sans signe, rien ne change');
});

test('pages portugaises : montants « $ 200.000 », jamais « 200.000 $ » ni « 1 250 $ » à la française', () => {
  for (const p of ['pt/calculateurs.html', 'pt/nourriture.html', 'pt/personnalisations.html', 'pt/editions.html', 'pt/verification.html', 'pt/a-propos.html']) {
    const main = sp((read(p).match(/<main\b[\s\S]*?<\/main>/) || [''])[0].replace(/<(script|style|template)\b[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' '));
    const bad = main.match(/\d(?:[\d.,]*\d)?\s?\$(?![\d{])/); /* « $ 900, $ 1.250 » (une liste) n’est pas un montant à la française */
    assert.ok(!bad, p + ' : « ' + (bad ? main.slice(Math.max(0, bad.index - 40), bad.index + 12) : '') + ' »');
  }
});

test('accueil : l’écho du mini-calculateur met le signe à sa place avant le chargement du moteur (« = $ 200 mil » en portugais)', () => {
  const src = read('calculator-entry.js'), m = src.match(/const sign = (s => [^;]+);/);
  assert.ok(m, 'fonction du signe'); assert.match(src, /E\.dollars\(w, ' '\) : sign\(w\)\)/, 'le repli passe par elle');
  const sign = lang => Function('pageLang', 'return ' + m[1])(lang);
  assert.equal(sign('pt')('200 mil'), '$ 200 mil'); assert.equal(sign('en')('200 thousand'), '$200 thousand');
  assert.equal(sign('fr')('200 mille'), '200 mille $'); assert.equal(sign('de')('200 Tausend'), '200 Tausend $');
  assert.match(read('pt/calculator-entry.js'), /const sign = s => pageLang === 'en' \? '\$' \+ s : pageLang === 'pt' \? '\$\\u00a0' \+ s/, 'copie portugaise : code inchangé');
});

test('mots que le calculateur et Léo reconnaissent en portugais (hub, libellés, pont)', () => {
  const hub = read('outils/sources/calculateurs-hub.js'); /* v7.94 : la source commentée (la copie servie n’a plus de commentaires) */
  for (const w of ['milh', 'tenho', 'por hora', 'por dia', 'jogadores', 'sess']) assert.ok(hub.includes(w), 'calculateurs-hub.js : ' + w);
  const ws = read('outils/sources/calculateurs-workspace.js');
  for (const w of ['guardado', 'já tenho', 'quero ter', 'por hora', 'por dia', 'jogadores', 'gastos por sessão', 'é preciso chegar a']) assert.ok(ws.toLowerCase().includes(w), 'calculateurs-workspace.js : ' + w);
  const pont = JSON.parse(read('outils/langues/pt/_leo-pont.json'));
  const has = e => pont.pont.some(([a]) => a === e);
  for (const e of ['quando sai', 'onde fica', 'quanto custa', 'vale a pena']) assert.ok(has(e), 'pont de Léo : ' + e);
  assert.ok(exists('pt/leo-index.json'), 'index de Léo en portugais');
  const idx = JSON.parse(read('pt/leo-index.json'));
  assert.equal(idx.lang, 'pt');
});

test('mémoire portugaise : aucun conflit, aucun texte manquant, aucun repère cassé', () => {
  const mem = L.memoire(root, 'pt');
  assert.deepEqual(mem.conflicts, [], 'une seule traduction par texte');
  assert.ok(mem.map.size > 20000, mem.map.size + ' entrées');
  const r = L.generer('pt', root, { force: true, ecrire: false });
  assert.deepEqual(r.missing.map(m => m.text).slice(0, 10), [], 'textes sans traduction');
  assert.deepEqual(r.broken, [], 'repères conservés');
});

test('contrôle des langues : le détecteur de français connaît le portugais (« sem », lettre « Y »), et repère toujours le français', () => {
  const { frenchHits } = require('./langues-helper.cjs');
  assert.deepEqual(frenchHits('Superesportivo de arestas vivas, entradas de ar em Y, teto afilado.', 'pt'), [], 'la lettre « Y » (une forme) n’est pas le « y » français');
  assert.deepEqual(frenchHits('Grátis, sem conta, sem IA', 'pt'), [], '« sem » est portugais');
  assert.deepEqual(frenchHits('Quanto tempo pra chegar a 1 milhão jogando 1 hora por dia?', 'pt'), []);
  assert.ok(frenchHits('il y a encore une mission', 'pt').length >= 3, 'une phrase française reste repérée');
  assert.deepEqual(frenchHits('activité très', 'pt'), ['activité', 'très'], 'finales et accents propres au français repérés');
  assert.deepEqual(frenchHits('você já é', 'pt'), [], 'accents portugais');
});
