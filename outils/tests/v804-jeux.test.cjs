'use strict';
/* v8.04 (lot L) : les jeux du site (outils/gen-jeux.cjs, outils/jeux/jeux.json, outils/sources/jeux-core.js, frise.js,
   station.js, jeux.css) et la progression commune, Devine le lieu compris.
   - données : annonces datées et sourcées (outils/actus/actus.json), indices des six stations (outils/radios/radios.json),
     tirages du jour vérifiés (plafond par groupe, rien de la veille) ;
   - progression : points, niveaux, séries, badges, défi du jour, calculés sans réécrire la sauvegarde de Devine le lieu ;
   - parties dans la page (jsdom) : rien d’écrit avant la première réponse, une clé (lk_jeux_v1), résultat, partie libre ;
   - pages : titre, description, canonique, données structurées, gabarits, aucun mot dans les scripts, aucune ressource
     externe ; menu « Jouer », recherche du site, Léo, Mentions. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const J = JSON.parse(read('outils/jeux/jeux.json'));
const GJ = require(path.join(root, 'outils/gen-jeux.cjs'));
/* le script tourne dans ce contexte-ci (mêmes tableaux et objets que le test : comparaisons strictes possibles) */
const API = (() => { vm.runInThisContext(read('outils/sources/jeux-core.js'), { filename: 'jeux-core.js' }); return globalThis.LKJeux; })();
const N = s => String(s).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const CONF = { pts: [J.points.bonne, J.points.sansFaute, J.points.defi], lv: J.niveaux.map(n => n.min), regions: 6, pers: { frise: 5, station: 5 }, defis: J.defis.map(d => d.id), badges: J.badges.map(b => b.id) };

test('données : annonces et indices vérifiés, tirages du jour sur 400 jours', () => {
  const L = GJ.load(root);
  const R = GJ.check(L, { days: 400 });
  assert.ok(R.E.length >= 12 && R.E.every(e => /^\d{4}-\d\d-\d\d$/.test(e.iso) && ['officiel', 'vu'].includes(e.statut) && e.src && e.src.url));
  assert.ok(R.E.every(e => /^(moments\/[a-z0-9-]+\.html|actus\.html#ev-[a-z0-9-]+)$/.test(e.href)), 'chaque annonce mène à une page du site');
  assert.equal(R.ST.length, 6);
  assert.ok(R.C.filter(x => x.t === 'morceau').every(x => x.src === 'gi-radio-morceaux'), 'les morceaux sont « Vu dans un média »');
  assert.ok(R.C.filter(x => x.t !== 'morceau').every(x => x.src === 'rs-radios'), 'animateurs, noms à l’antenne et styles : présentation officielle');
  assert.ok(!R.C.some(x => /dufrene/.test(x.id)), 'le reporter n’est pas donné comme animateur');
  /* même tirage pour tous, jamais deux annonces du même jour dans une partie */
  const pool = R.E.map(e => ({ id: e.id, g: e.iso })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const a = API.draw(pool, '2026-11-19', { per: 6, ref: J.frise.debut, salt: 'frise', max: 1 }), b = API.draw(pool, '2026-11-19', { per: 6, ref: J.frise.debut, salt: 'frise', max: 1 });
  assert.deepEqual(a, b);
  assert.equal(new Set(a.map(id => R.E.find(e => e.id === id).iso)).size, 6);
});

test('progression : points, niveaux, séries, badges et défi, la sauvegarde de Devine le lieu lue sans être réécrite', () => {
  /* une partie de La frise : 4 sur 5 */
  let g = null;
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  [1, 0, 1, 1, 1].forEach((k, i) => { g = API.answerGame(g, '2026-10-21', 1, ids, i, !!k, 5); });
  assert.deepEqual(g.jour.k, [1, 0, 1, 1, 1]);
  assert.equal(g.st.p, 1); assert.equal(g.st.d[4], 1); assert.equal(g.best, 4); assert.deepEqual(g.serie, { d: '2026-10-21', n: 1 });
  const again = API.answerGame(g, '2026-10-21', 1, ids, 0, true, 5);
  assert.deepEqual(again.st, g.st, 'une seule partie du jour compte');
  /* Devine le lieu : 5 sur 5 hier et aujourd’hui (sauvegarde v7.92) */
  const dv = { v: 1, jour: { d: '2026-10-21', n: 10, ids: ['x1', 'x2', 'x3', 'x4', 'x5'], r: ['a', 'b', 'c', 'd', 'e'] }, serie: { d: '2026-10-21', n: 2 }, best: 5, st: { p: 2, m: 2, d: [0, 0, 0, 0, 0, 2], g: { 'vice-city': [3, 3] }, h: [['2026-10-20', 5], ['2026-10-21', 5]], a: ['x1'] } };
  const frozen = JSON.stringify(dv);
  const S = API.summary({ v: 1, g: { frise: g } }, dv, '2026-10-21', CONF);
  assert.equal(JSON.stringify(dv), frozen, 'la sauvegarde de Devine le lieu n’est pas modifiée');
  /* 10 × (4 + 10) + 20 × 2 sans-faute = 180, plus le défi du jour s’il est réussi */
  const base = 10 * 14 + 20 * 2;
  assert.equal(S.pts, base + (S.defiOk ? 50 : 0));
  assert.equal(S.serie, 2, 'deux jours de suite avec une partie finie');
  assert.ok(S.badges.includes('premier-pas') && S.badges.includes('sans-faute') && !S.badges.includes('trois-du-jour'));
  assert.equal(S.level, J.niveaux.filter(n => S.pts >= n.min).length - 1);
  assert.equal(S.today.devine.score, 5); assert.equal(S.today.frise.score, 4); assert.equal(S.today.station.done, 0);
  /* défi du jour : le même pour tous, calculé sur les parties du jour */
  assert.equal(API.defiOf('2026-10-21', CONF.defis), API.defiOf('2026-10-21', CONF.defis));
  assert.equal(API.defiDone('parfait', S.today), true);
  assert.equal(API.defiDone('trois', S.today), false);
  /* sauvegarde abîmée : remise à zéro sans planter */
  assert.deepEqual(API.clean('{"v":1', CONF.pers), API.blank());
  assert.equal(API.summary({ v: 1, g: { frise: { jour: { d: 'x' } } } }, { v: 2 }, '2026-10-21', CONF).pts, 0);
});

/* une partie dans la page (jsdom) : jeux-core.js puis le script du jeu, à une date fixée */
const WINDOWS = [];
test.after(() => { for (const w of WINDOWS) w.close(); });
function game(file, scripts, when, store) {
  const html = read(file).replace(/<script[^>]*src="[^"]*"[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://www.leonidakit.com/' + file, pretendToBeVisual: true });
  const w = dom.window, fixed = Date.parse(when);
  WINDOWS.push(w);
  w.Date.now = () => fixed;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
  if (store) for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, v);
  const requests = []; w.fetch = u => { requests.push(u); return Promise.reject(new Error('réseau')); };
  for (const s of scripts) w.eval(read(s));
  return { w, d: w.document, requests };
}

test('La frise des annonces : partie complète, une clé écrite après la première réponse, résultat, reprise, partie libre', () => {
  const { w, d, requests } = game('frise-des-annonces.html', ['jeux-core.js', 'frise.js'], '2026-10-22T09:00:00Z');
  const g = d.querySelector('[data-lkj-game="frise"]'), isoOf = id => d.getElementById('lkj-pool').content.querySelector('[data-lkj-item="' + id + '"]').getAttribute('data-iso');
  assert.equal(g.querySelector('[data-lkj-nojs]').hidden, true);
  assert.equal(w.localStorage.getItem('lk_jeux_v1'), null, 'rien d’écrit avant la première réponse');
  assert.match(N(g.querySelector('[data-lkj-mode]').textContent), /^Partie du jour n° 2$/);
  const pool = [...d.getElementById('lkj-pool').content.querySelectorAll('[data-lkj-item]')].map(n => ({ id: n.getAttribute('data-lkj-item'), g: n.getAttribute('data-g') })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const ids = API.draw(pool, '2026-10-22', { per: 6, ref: J.frise.debut, salt: 'frise', max: 1 });
  assert.equal(g.querySelectorAll('[data-fr-id]').length, 1, 'le point de départ est posé');
  assert.equal(g.querySelector('[data-fr-id]').getAttribute('data-fr-id'), ids[0]);
  for (let i = 1; i <= 5; i++) {
    const placed = [...g.querySelectorAll('[data-fr-id]')].map(li => isoOf(li.getAttribute('data-fr-id')));
    const right = placed.filter(x => x < isoOf(ids[i])).length, pick = i === 1 ? (right ? 0 : 1) : right;
    const gaps = g.querySelectorAll('[data-fr-gap]');
    assert.equal(gaps.length, placed.length + 1, 'un emplacement de plus que d’annonces posées');
    for (const b of gaps) assert.ok(b.tagName === 'BUTTON' && /Placer (avant|entre|après) « .+ »/.test(N(b.getAttribute('aria-label'))));
    g.querySelector('[data-fr-gap="' + pick + '"]').click();
    assert.equal(g.querySelector('[data-lkj-answer]').hidden, false);
    assert.match(N(g.querySelector('[data-lkj-answer-t]').textContent), i === 1 ? /^Raté : cette annonce date du .+\.$/ : /^Bien placée : .+\.$/);
    assert.match(g.querySelector('[data-lkj-link]').getAttribute('href'), /^(moments\/|actus\.html#ev-)/);
    assert.match(N(g.querySelector('[data-fr-src]').textContent), /(Officiel|Vu dans un média)Source : ?.+/);
    if (i === 1) { assert.ok(g.querySelector('.fr-ghost'), 'la place choisie reste marquée'); assert.ok(JSON.parse(w.localStorage.getItem('lk_jeux_v1')).g.frise.jour.k.length === 1); }
    assert.equal(d.activeElement, g.querySelector('[data-lkj-next]'));
    g.querySelector('[data-lkj-next]').click();
  }
  assert.equal(g.querySelector('[data-lkj-result]').hidden, false);
  assert.match(N(g.querySelector('[data-lkj-res-score]').textContent), /^4 sur 5$/);
  assert.match(N(g.querySelector('[data-lkj-res-pts]').textContent), /^Cette partie te rapporte 40 points\.$/);
  const st = JSON.parse(w.localStorage.getItem('lk_jeux_v1'));
  assert.equal(st.v, 1); assert.deepEqual(st.g.frise.jour.ids, ids); assert.deepEqual(st.g.frise.jour.k, [0, 1, 1, 1, 1]); assert.equal(st.g.frise.st.p, 1);
  assert.match(N(d.querySelector('.lkj-strip [data-lkj-pts]').textContent), /^\d+ points$/);
  assert.match(N(g.querySelector('[data-lkj-share-txt]').textContent), /^Leonidakit, La frise des annonces n° 2 : 4 sur 5 1 ❌ 2 ✅ 3 ✅ 4 ✅ 5 ✅ https:\/\/www\.leonidakit\.com\/frise-des-annonces\.html$/);
  /* partie libre : rien ne change */
  const saved = w.localStorage.getItem('lk_jeux_v1');
  g.querySelector('[data-lkj-free]').click();
  assert.match(N(g.querySelector('[data-lkj-mode]').textContent), /^Partie libre$/);
  g.querySelector('[data-fr-gap="0"]').click();
  assert.equal(w.localStorage.getItem('lk_jeux_v1'), saved, 'la partie libre ne touche pas à la sauvegarde');
  /* reprise : la partie du jour est déjà jouée */
  const again = game('frise-des-annonces.html', ['jeux-core.js', 'frise.js'], '2026-10-22T20:00:00Z', { lk_jeux_v1: saved });
  assert.equal(again.d.querySelector('[data-lkj-result]').hidden, false);
  assert.deepEqual(requests, []);
});

test('Devine la station : partie complète, bonne station, statut et source, fiche de la station', () => {
  const { w, d, requests } = game('devine-la-station.html', ['jeux-core.js', 'station.js'], '2026-10-22T09:00:00Z');
  const g = d.querySelector('[data-lkj-game="station"]'), pool = d.getElementById('lkj-pool').content;
  assert.equal(g.querySelectorAll('[data-st-opt]').length, 6);
  for (let i = 0; i < 5; i++) {
    const k = N(g.querySelector('[data-st-card] .st-k').textContent), v = N(g.querySelector('[data-st-card] .st-v').textContent);
    const item = [...pool.querySelectorAll('[data-lkj-item]')].find(n => N(n.querySelector('.st-k').textContent) === k && N(n.querySelector('.st-v').textContent) === v);
    const right = item.getAttribute('data-g'), pick = i === 0 ? [...g.querySelectorAll('[data-st-opt]')].map(b => b.getAttribute('data-st-opt')).find(x => x !== right) : right;
    g.querySelector('[data-st-opt="' + pick + '"]').click();
    assert.match(N(g.querySelector('[data-lkj-answer-t]').textContent), i === 0 ? /^Raté : c’était .+, pas .+\.$/ : /^Bien vu : .+\.$/);
    assert.ok(g.querySelector('[data-st-opt="' + right + '"]').classList.contains('is-right'));
    assert.equal(g.querySelector('[data-lkj-link]').getAttribute('href'), 'radios/' + right + '.html');
    assert.match(N(g.querySelector('[data-st-src]').textContent), item.getAttribute('data-src') === 'gi-radio-morceaux' ? /^Vu dans un médiaGame Informer/ : /^OfficielRockstar Games/);
    g.querySelector('[data-lkj-next]').click();
  }
  assert.match(N(g.querySelector('[data-lkj-res-score]').textContent), /^4 sur 5$/);
  assert.deepEqual(JSON.parse(w.localStorage.getItem('lk_jeux_v1')).g.station.jour.k, [0, 1, 1, 1, 1]);
  assert.deepEqual(requests, []);
});

test('Devine le lieu : le bandeau de progression suit, sans toucher à ses scores', () => {
  const html = read('devine-le-lieu.html');
  assert.ok(/<script src="jeux-core\.js(?:\?v=[0-9a-f]{12})?" defer><\/script>/.test(html), 'jeux-core.js chargé sans bloquer');
  assert.ok(doc('devine-le-lieu.html').querySelector('.lkj-strip [data-lkj-today="devine"]'));
  const { w, d } = game('devine-le-lieu.html', ['devine.js', 'jeux-core.js'], '2026-10-22T09:00:00Z');
  const opt = d.querySelector('[data-dv-opt]');
  opt.click();
  const dv = JSON.parse(w.localStorage.getItem('lk_devine_v1')), jx = JSON.parse(w.localStorage.getItem('lk_jeux_v1'));
  assert.equal(dv.jour.r.length, 1, 'Devine le lieu garde sa sauvegarde');
  assert.equal(jx.v, 1, 'la progression commune note la réponse');
  assert.equal(jx.g.frise, undefined);
  assert.match(N(d.querySelector('.lkj-strip [data-lkj-today="devine"] [data-lkj-state]').textContent), /^En cours : 1 sur 5$/);
});

test('pages : référencement, gabarits, aucun mot dans les scripts, aucune ressource externe', () => {
  for (const f of Object.values(GJ.PAGES)) {
    const d = doc(f), html = read(f);
    assert.equal(d.querySelectorAll('h1').length, 1, f);
    assert.ok(N(d.querySelector('title').textContent).includes('GTA'), f);
    const desc = d.querySelector('meta[name="description"]').content;
    assert.ok(desc.length >= 60 && desc.length <= 160, f + ' : description ' + desc.length);
    assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/' + f);
    assert.ok(d.querySelector('meta[property="og:image"]').content.startsWith('https://www.leonidakit.com/img/'), f);
    const lds = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
    assert.ok(lds.some(x => x['@type'] === 'WebPage') && lds.some(x => x['@type'] === 'BreadcrumbList'), f);
    for (const m of html.matchAll(/<(?:img|script|link|iframe|source|video|audio)\b[^>]*\s(?:src|href|srcset)="(https?:[^"]+)"/g)) assert.ok(/^https:\/\/www\.leonidakit\.com\//.test(m[1]) && !/<link rel="stylesheet"/.test(m[0]), f + ' : ressource externe ' + m[1]);
    assert.ok(d.getElementById('lkj-core'), f + ' : textes de la progression');
  }
  for (const k of ['frise', 'station']) {
    const d = doc(GJ.PAGES[k]);
    const msg = Object.fromEntries([...d.getElementById('lkj-msg').content.querySelectorAll('[data-k]')].map(p => [p.getAttribute('data-k'), p.textContent]));
    for (const [key, t] of Object.entries(J[k].msg)) assert.deepEqual((msg[key] || '').match(/\{\w+\}/g) || [], t.match(/\{\w+\}/g) || [], k + ' : ' + key);
  }
  const lit = src => { const out = []; const acorn = require('acorn'); const walk = n => { if (!n || typeof n !== 'object') return; if (n.type === 'Literal' && typeof n.value === 'string') out.push(n.value); if (n.type === 'TemplateElement') out.push(n.value.cooked); for (const k in n) if (k !== 'parent') { const v = n[k]; if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v.type === 'string') walk(v); } }; walk(acorn.parse(src, { ecmaVersion: 'latest' })); return out; };
  for (const s of ['outils/sources/jeux-core.js', 'outils/sources/frise.js', 'outils/sources/station.js']) {
    for (const x of lit(read(s)).filter(v => v !== 'use strict')) assert.doesNotMatch(x, /[a-zà-ÿ]{3,} [a-zà-ÿ]{2,}/i, s + ' : texte écrit dans le script : « ' + x + ' »');
    assert.doesNotMatch(read(s), /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|document\.cookie)\b/, s);
  }
});

test('liens : menu « Jouer », recherche du site, Léo, Mentions', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  assert.ok(shell.play.some(([u]) => u === 'jeux.html') && shell.play.some(([u]) => u === 'devine-le-lieu.html'));
  const idx = JSON.parse(read('outils/jeux-index.json'));
  assert.deepEqual(idx.map(x => x.u), ['/jeux.html#progression', '/frise-des-annonces.html#jeu', '/devine-la-station.html#jeu']);
  assert.ok(/outils\/jeux-index\.json/.test(read('outils/sync-site.cjs')));
  assert.ok(/'gen-jeux\.cjs'/.test(read('outils/regenerer.cjs')) && read('outils/regenerer.cjs').indexOf('gen-jeux.cjs') > read('outils/regenerer.cjs').indexOf('gen-devine.cjs'));
  const leo = JSON.parse(read('outils/leo-knowledge.json')).topics;
  for (const id of ['jeux-du-site', 'jeux-progression', 'frise-des-annonces', 'devine-la-station']) assert.ok(leo.some(t => t.id === id && t.links.length), 'Léo : ' + id);
  assert.ok(read('outils/gen-informations.cjs').includes('lk_jeux_v1'), 'Mentions : la clé des jeux');
  assert.ok(doc('devine-le-lieu.html').querySelector('a[href="jeux.html#progression"]'), 'Devine le lieu mène à la progression');
});

test('Léo connaît les jeux (et Devine le lieu garde ses réponses)', async t => {
  if (!read('leo-index.json').includes('"jeux-du-site"')) { t.skip('leo-index.json à régénérer (outils/gen-leo.cjs, dans outils/regenerer.cjs)'); return; }
  const { run } = require('./leo-eval.cjs');
  for (const q of ['outils/tests/leo-questions-section-jeux-fr.json', 'outils/tests/leo-questions-section-devine-fr.json']) {
    const r = await run({ lang: 'fr', questions: path.join(root, q) });
    assert.equal(r.correct, r.questions, q + ' : ' + r.correct + '/' + r.questions);
    assert.equal(r.withoutSource, 0, q + ' : réponse sans source');
  }
});
