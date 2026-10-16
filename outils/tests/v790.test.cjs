'use strict';
/* v7.90 (lot 6) : jeu « Devine le lieu » (outils/gen-devine.cjs, outils/devine/devine.json, devine.js, devine.css).
   - chaque image retenue a une région établie par sa série officielle (identifiant, fichier d’origine, page source) ;
   - tirage du jour déterministe (date à Paris), sans doublon, deux images au plus par région, rien deux jours de suite ;
   - score, série de jours joués, meilleur score (une clé, écrite après la première réponse) ; texte de partage ;
   - aucune requête externe ; aucun mot écrit par le script (tout vient de la page) ; page dans les cinq langues ;
   - liens : menu « Jouer », pied de page, page Lieux, fiches des régions, recherche, plan du site, Léo, Mentions. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path'), vm = require('vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const D = JSON.parse(read('outils/devine/devine.json'));
const MED = JSON.parse(read('outils/medias-officiels.json'));
const G = require(path.join(root, 'outils/gen-devine.cjs'));
const LANGS = JSON.parse(read('outils/langues.json')).langues.filter(l => l.etat === 'publiee' && l.code !== 'fr').map(l => l.dossier);
const PAGE = 'devine-le-lieu.html';
/* le script tourne dans ce contexte-ci (mêmes tableaux et objets que le test : comparaisons strictes possibles) */
const API = (() => { vm.runInThisContext(read('devine.js'), { filename: 'devine.js' }); return globalThis.LKDevine; })();
const POOL = D.images.map(i => ({ id: i.id, r: i.region })).sort((a, b) => (a.id < b.id ? -1 : 1));
const REGION = Object.fromEntries(POOL.map(x => [x.id, x.r]));
const N = s => String(s).replace(/[  ]/g, ' ');

test('images : chaque image retenue a sa région établie par la série officielle de Rockstar (identifiant, fichier, source)', () => {
  assert.doesNotThrow(() => G.check(G.load(root), { days: 400 }));
  assert.equal(D.source.url, 'https://www.rockstargames.com/VI/media/screenshots');
  const series = Object.fromEntries(D.series.map(s => [s.region, s]));
  assert.deepEqual(Object.keys(series).sort(), ['ambrosia', 'grassrivers', 'leonida-keys', 'mount-kalaga', 'port-gellhorn', 'vice-city']);
  for (const im of D.images) {
    const s = series[im.region], m = MED[im.id];
    assert.ok(s && m, im.id);
    assert.ok(im.id.startsWith(s.prefixe), im.id + ' : identifiant de la série ' + s.prefixe);
    assert.ok(new URL(m.original).pathname.split('/').pop().startsWith(s.fichier + im.id.slice(s.prefixe.length) + '.'), im.id + ' : fichier d’origine ' + s.fichier);
    assert.equal(m.source, D.source.url, im.id + ' : page des captures officielles');
    assert.match(m.credit, /Rockstar Games/);
    for (const w of [480, 800, 1280]) assert.ok(fs.existsSync(path.join(root, 'img/officiel', im.id + '-' + w + '.webp')), im.id + ' ' + w);
    /* le texte alternatif décrit l’image sans donner la réponse */
    assert.doesNotMatch(im.alt, /\b(?:Vice City|Leonida|Keys|Grassrivers|Gellhorn|Ambrosia|Kalaga)\b/, im.id);
    assert.match(im.alt, /, capture officielle de GTA VI$/);
  }
  /* toutes les images des six séries que le site a sont dans le jeu, et rien d’autre */
  const inSeries = Object.keys(MED).filter(id => D.series.some(s => id.startsWith(s.prefixe) && /^\d{2}$/.test(id.slice(s.prefixe.length)))).sort();
  assert.deepEqual(D.images.map(i => i.id).sort(), inSeries);
  assert.equal(new Set(D.images.map(i => i.id)).size, D.images.length);
});

test('contrôles : une image douteuse arrête la génération', () => {
  const L = G.load(root), bad = (mut, re) => { const C = JSON.parse(JSON.stringify(L)); C.G = L.G; mut(C); assert.throws(() => G.check(C, { days: 30 }), re); };
  bad(C => { C.D.images[0].region = 'vice-city'; }, /hors de la série/);
  bad(C => { C.D.images.find(i => i.id === 'grassrivers-02').alt = 'Un bateau file vers Grassrivers, capture officielle de GTA VI'; }, /donne la réponse/);
  bad(C => { C.MED['vice-city-03'] = { ...C.MED['vice-city-03'], source: 'https://example.com/fan' }; }, /source autre/);
  bad(C => { C.MED['ambrosia-05'] = { ...C.MED['ambrosia-04'], id: 'ambrosia-05' }; }, /ambrosia-05 de la série ambrosia- absente du jeu/);
  bad(C => { C.D.images = C.D.images.filter(i => i.id !== 'leonida-keys-01'); }, /leonida-keys-01/);
});

test('tirage du jour : déterministe, cinq images différentes, deux au plus par région, rien deux jours de suite (trois ans)', () => {
  const opt = { per: D.parPartie, ref: D.debut }, start = API.dayIndex(D.debut);
  assert.deepEqual(API.draw(POOL, '2026-11-19', opt), API.draw(POOL.slice().reverse().sort((a, b) => (a.id < b.id ? -1 : 1)), '2026-11-19', opt), 'même liste, même tirage');
  let prev = null; const seen = {};
  for (let d = 0; d < 3 * 366; d++) {
    const iso = API.isoOfIndex(start + d), list = API.draw(POOL, iso, opt);
    assert.equal(list.length, 5, iso);
    assert.equal(new Set(list).size, 5, iso + ' : sans doublon');
    const per = {}; for (const id of list) per[REGION[id]] = (per[REGION[id]] || 0) + 1;
    assert.ok(Math.max(...Object.values(per)) <= D.parRegionMax, iso + ' : ' + JSON.stringify(per));
    if (prev) assert.ok(!list.some(id => prev.includes(id)), iso + ' : une image de la veille');
    for (const id of list) seen[id] = (seen[id] || 0) + 1;
    prev = list;
  }
  /* chaque image passe une fois par cycle de huit jours : sur 8 × 100 jours, cent fois chacune */
  const counts = {};
  for (let d = 0; d < 800; d++) for (const id of API.draw(POOL, API.isoOfIndex(start + d), opt)) counts[id] = (counts[id] || 0) + 1;
  assert.deepEqual([...new Set(Object.values(counts))], [100]);
  assert.equal(Object.keys(counts).length, D.images.length);
  /* tirage figé : le jour n° 1 (si la liste d’images ou le tirage changent, ce test le dit) */
  assert.deepEqual(API.draw(POOL, D.debut, opt), ['leonida-keys-02', 'grassrivers-04', 'mount-kalaga-national-park-05', 'vice-city-03', 'port-gellhorn-04']);
});

test('jour à Paris : changement à minuit heure de Paris, été comme hiver, et prochain minuit aux changements d’heure', () => {
  assert.equal(API.parisDate(Date.parse('2026-10-12T21:59:59Z')), '2026-10-12');
  assert.equal(API.parisDate(Date.parse('2026-10-12T22:00:00Z')), '2026-10-13');
  assert.equal(API.parisDate(Date.parse('2026-12-31T22:59:59Z')), '2026-12-31');
  assert.equal(API.parisDate(Date.parse('2026-12-31T23:00:00Z')), '2027-01-01');
  /* nuit du 24 au 25 octobre 2026 (journée de 25 h) et du 27 au 28 mars 2027 (23 h) */
  const near = (a, b) => Math.abs(a - b) <= 1000;
  assert.ok(near(API.nextParisMidnight(Date.parse('2026-10-25T08:00:00Z')), Date.parse('2026-10-25T23:00:00Z')));
  assert.ok(near(API.nextParisMidnight(Date.parse('2026-10-24T12:00:00Z')), Date.parse('2026-10-24T22:00:00Z')));
  assert.ok(near(API.nextParisMidnight(Date.parse('2027-03-28T08:00:00Z')), Date.parse('2027-03-28T22:00:00Z')));
  assert.ok(near(API.nextParisMidnight(Date.parse('2027-03-27T12:00:00Z')), Date.parse('2027-03-27T23:00:00Z')));
});

test('score, série de jours joués et meilleur score ; état versionné et validé', () => {
  const play = (st, iso, answers) => { const ids = API.draw(POOL, iso, { per: 5, ref: D.debut }); let s = st; for (const a of answers(ids)) s = API.answerDay(s, iso, 1, ids, a, REGION); return s; };
  const allRight = ids => ids.map(id => REGION[id]), oneWrong = ids => ids.map((id, i) => i ? REGION[id] : (REGION[id] === 'vice-city' ? 'ambrosia' : 'vice-city'));
  let s = API.blank();
  assert.ok(API.valid(s));
  s = play(s, '2026-10-12', oneWrong);
  assert.equal(API.score(s.jour.ids, s.jour.r, REGION), 4); assert.deepEqual(s.serie, { d: '2026-10-12', n: 1 }); assert.equal(s.best, 4);
  s = play(s, '2026-10-13', allRight);
  assert.deepEqual(s.serie, { d: '2026-10-13', n: 2 }); assert.equal(s.best, 5);
  assert.equal(API.streak(s, '2026-10-14'), 2, 'la série tient jusqu’au lendemain');
  assert.equal(API.streak(s, '2026-10-15'), 0, 'un jour sans partie : elle repart de zéro');
  /* partie commencée mais pas finie : ni série ni record */
  const part = (() => { const ids = API.draw(POOL, '2026-10-14', { per: 5, ref: D.debut }); return API.answerDay(s, '2026-10-14', 3, ids, REGION[ids[0]], REGION); })();
  assert.deepEqual(part.serie, s.serie); assert.equal(part.best, 5); assert.equal(part.jour.r.length, 1);
  s = play(s, '2026-10-16', oneWrong);
  assert.deepEqual(s.serie, { d: '2026-10-16', n: 1 }); assert.equal(s.best, 5, 'le meilleur score reste');
  /* une partie finie ne prend plus de réponse */
  const again = API.answerDay(s, '2026-10-16', 1, s.jour.ids, 'vice-city', REGION);
  assert.equal(again.jour.r.length, 5);
  assert.ok(API.valid(JSON.parse(JSON.stringify(s))));
  for (const bad of [null, {}, { v: 2, jour: null, serie: { d: null, n: 0 }, best: null }, { v: 1, jour: { d: 'hier', n: 1, ids: [], r: [] }, serie: { d: null, n: 0 }, best: null }, { v: 1, jour: null, serie: { d: null, n: -1 }, best: null }, { v: 1, jour: null, serie: { d: null, n: 0 }, best: 99 }, { v: 1, jour: { d: '2026-10-12', n: 1, ids: ['<b>'], r: [] }, serie: { d: null, n: 0 }, best: null }]) assert.equal(API.valid(bad), false, JSON.stringify(bad));
  assert.equal(API.KEY, 'lk_devine_v1');
});

test('partage : une ligne par image (✅ / ❌), le numéro du jour et l’adresse, rien d’autre', () => {
  const ids = API.draw(POOL, '2026-10-20', { per: 5, ref: D.debut }), r = ids.map((id, i) => (i === 2 ? (REGION[id] === 'grassrivers' ? 'vice-city' : 'grassrivers') : REGION[id]));
  const t = API.shareText('Leonidakit · Devine le lieu n° 9 : 4/5', ids, r, REGION, 'https://www.leonidakit.com/devine-le-lieu.html');
  assert.equal(t, 'Leonidakit · Devine le lieu n° 9 : 4/5\n1 ✅\n2 ✅\n3 ❌\n4 ✅\n5 ✅\nhttps://www.leonidakit.com/devine-le-lieu.html');
  assert.doesNotMatch(t, /vice|grass|keys|ambrosia|gellhorn|kalaga/i, 'aucune réponse dans le texte partagé');
});

/* une partie dans la page (jsdom) : le script seul, à une date fixée ; les fenêtres sont fermées à la fin (minuteur du compte à rebours) */
const WINDOWS = [];
test.after(() => { for (const w of WINDOWS) w.close(); });
function game(file, when, store) {
  const html = read(file).replace(/<script[^>]*src="[^"]*"><\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://www.leonidakit.com/' + file, pretendToBeVisual: true });
  const w = dom.window, fixed = Date.parse(when);
  WINDOWS.push(w);
  w.Date.now = () => fixed;
  w.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
  w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
  if (store) for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, v);
  const requests = []; w.fetch = u => { requests.push(u); return Promise.reject(new Error('réseau')); };
  /* le script que la page charge (copie traduite de la langue s’il y en a une, sinon celui de la racine) */
  const src = read(file).match(/<script[^>]*src="([^"?]*devine\.js)/)[1];
  w.eval(read(path.posix.normalize(path.posix.join(path.posix.dirname(file), src))));
  return { w, d: w.document, requests };
}
const shown = (d, id) => { const img = d.querySelector('[data-dv-card] .dv-fig img'); return img && (img.getAttribute('src').match(/officiel\/(.+)-\d+\.webp/) || [])[1]; };

const pause = ms => new Promise(r => setTimeout(r, ms));
test('partie complète dans la page : réponses, carte, stockage après la première réponse, résultat, partie libre, reprise', async () => {
  const { w, d, requests } = game(PAGE, '2026-10-12T10:00:00Z');
  const g = d.querySelector('[data-dv]');
  assert.equal(g.querySelector('[data-dv-nojs]').hidden, true, 'message sans script retiré');
  assert.equal(g.querySelector('[data-dv-board]').hidden, false);
  assert.equal(w.localStorage.getItem('lk_devine_v1'), null, 'rien d’écrit avant la première réponse');
  const ids = API.draw(POOL, '2026-10-12', { per: 5, ref: D.debut });
  assert.equal(shown(d), ids[0]);
  assert.match(N(g.querySelector('[data-dv-mode]').textContent), /^Partie du jour n° 1$/);
  assert.match(N(g.querySelector('[data-dv-live]').textContent || ''), /^$|Image 1 sur 5/);
  /* 1 : réponse fausse, sur la carte */
  const wrong = REGION[ids[0]] === 'vice-city' ? 'ambrosia' : 'vice-city';
  g.querySelector('[data-dv-pin="' + wrong + '"]').click();
  assert.equal(g.querySelector('[data-dv-answer]').hidden, false);
  assert.match(N(g.querySelector('[data-dv-answer-t]').textContent), /^Raté : c’était .+, pas .+\.$/);
  assert.ok(g.querySelector('[data-dv-opt="' + REGION[ids[0]] + '"]').classList.contains('is-right'));
  assert.ok(g.querySelector('[data-dv-opt="' + wrong + '"]').classList.contains('is-wrong'));
  assert.ok(g.querySelectorAll('[data-dv-opt]:disabled').length === 6, 'les boutons sont figés');
  assert.equal(g.querySelector('[data-dv-fiche-link]').getAttribute('href'), 'lieux/' + REGION[ids[0]] + '.html');
  assert.ok(N(g.querySelector('[data-dv-tit]').textContent).length > 5, 'titre officiel');
  assert.equal(d.activeElement, g.querySelector('[data-dv-next]'), 'le focus passe à « Image suivante »');
  const st = JSON.parse(w.localStorage.getItem('lk_devine_v1'));
  assert.deepEqual(st.jour, { d: '2026-10-12', n: 1, ids, r: [wrong] });
  /* 2 à 5 : bonnes réponses, au clavier (boutons) */
  for (let i = 1; i < 5; i++) {
    g.querySelector('[data-dv-next]').click();
    assert.equal(shown(d), ids[i]);
    assert.equal(d.activeElement.getAttribute('data-dv-opt') !== null, true, 'le focus revient aux régions');
    g.querySelector('[data-dv-opt="' + REGION[ids[i]] + '"]').click();
    assert.match(N(g.querySelector('[data-dv-answer-t]').textContent), /^Bien vu : .+\.$/);
  }
  assert.match(N(g.querySelector('[data-dv-next]').textContent), /Voir mon résultat/);
  g.querySelector('[data-dv-next]').click();
  const res = g.querySelector('[data-dv-result]');
  assert.equal(res.hidden, false); assert.equal(g.querySelector('[data-dv-board]').hidden, true);
  assert.equal(N(res.querySelector('[data-dv-res-score]').textContent), '4 sur 5');
  assert.equal(res.querySelectorAll('.dv-res-i').length, 5);
  assert.equal(N(res.querySelector('[data-dv-serie]').textContent), '1 jour');
  assert.equal(N(res.querySelector('[data-dv-best]').textContent), '4 sur 5');
  assert.equal(res.querySelector('[data-dv-share-txt]').textContent, 'Leonidakit · Devine le lieu n° 1 : 4/5\n1 ❌\n2 ✅\n3 ✅\n4 ✅\n5 ✅\nhttps://www.leonidakit.com/' + PAGE);
  assert.equal(N(res.querySelector('[data-dv-countdown]').textContent), 'Prochaine partie dans 12 h 0 min.', '12 h à Paris : minuit dans douze heures');
  await pause(150); /* l’annonce arrive après un court délai (le lecteur d’écran relit la zone vidée) */
  assert.match(N(g.querySelector('[data-dv-live]').textContent), /Partie terminée : 4 sur 5\./);
  const saved = w.localStorage.getItem('lk_devine_v1');
  assert.deepEqual(JSON.parse(saved).serie, { d: '2026-10-12', n: 1 });
  /* partie libre : sans limite, rien d’écrit */
  res.querySelector('[data-dv-free]').click();
  assert.equal(g.querySelector('[data-dv-board]').hidden, false);
  assert.match(N(g.querySelector('[data-dv-mode]').textContent), /^Partie libre$/);
  for (let i = 0; i < 12; i++) { const id = shown(d); g.querySelector('[data-dv-opt="' + REGION[id] + '"]').click(); g.querySelector('[data-dv-next]').click(); }
  assert.match(N(g.querySelector('[data-dv-points]').textContent), /12 sur 12/);
  assert.equal(w.localStorage.getItem('lk_devine_v1'), saved, 'la partie libre ne touche pas à la sauvegarde');
  assert.equal(requests.length, 0); assert.equal(d.cookie, '');
  /* reprise le même jour : le résultat ; le lendemain : nouvelle partie, la série continue à la fin */
  const again = game(PAGE, '2026-10-12T21:30:00Z', { lk_devine_v1: saved });
  assert.equal(again.d.querySelector('[data-dv-result]').hidden, false);
  assert.match(N(again.d.querySelector('[data-dv-countdown]').textContent), /^Prochaine partie dans 30 min\.$/);
  const next = game(PAGE, '2026-10-12T22:30:00Z', { lk_devine_v1: saved });
  const g2 = next.d.querySelector('[data-dv]'), ids2 = API.draw(POOL, '2026-10-13', { per: 5, ref: D.debut });
  assert.equal(g2.querySelector('[data-dv-result]').hidden, true);
  assert.match(N(g2.querySelector('[data-dv-mode]').textContent), /n° 2$/);
  for (let i = 0; i < 5; i++) { assert.equal(shown(next.d), ids2[i]); g2.querySelector('[data-dv-opt="' + REGION[ids2[i]] + '"]').click(); g2.querySelector('[data-dv-next]').click(); }
  assert.equal(N(g2.querySelector('[data-dv-serie]').textContent), '2 jours');
  assert.equal(N(g2.querySelector('[data-dv-best]').textContent), '5 sur 5');
  /* sauvegarde abîmée : on repart de zéro sans erreur */
  const broken = game(PAGE, '2026-10-12T10:00:00Z', { lk_devine_v1: '{"v":1,"jour":{"d":"x"}' });
  assert.equal(shown(broken.d), ids[0]);
});

test('page : cinq langues, textes du jeu dans la page (aucun dans le script), aucune ressource externe, accessibilité', () => {
  const lit = src => { const out = []; const acorn = require('acorn'); const walk = n => { if (!n || typeof n !== 'object') return; if (n.type === 'Literal' && typeof n.value === 'string') out.push(n.value); if (n.type === 'TemplateElement') out.push(n.value.cooked); for (const k in n) if (k !== 'parent') walk(n[k]); }; walk(acorn.parse(src, { ecmaVersion: 'latest' })); return out; };
  const fr = lit(read('devine.js')).filter(s => s !== 'use strict');
  for (const s of fr) assert.doesNotMatch(s, /[a-zà-ÿ]{3,} [a-zà-ÿ]{2,}/i, 'texte écrit dans le script : « ' + s + ' »');
  assert.doesNotMatch(read('devine.js'), /\b(?:fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|document\.cookie)\b/);
  for (const dir of ['', ...LANGS.map(l => l + '/')]) {
    const f = dir + PAGE, html = read(f), d = doc(f), lang = dir ? dir.slice(0, 2) : 'fr';
    assert.equal(d.documentElement.lang.slice(0, 2), lang, f);
    assert.equal(d.querySelectorAll('h1').length, 1, f);
    assert.ok(N(d.querySelector('title').textContent).includes('GTA 6'), f + ' : « GTA 6 » dans le titre');
    assert.ok(d.querySelector('meta[name="description"]').content.length <= 160, f);
    assert.equal(d.querySelector('link[rel="canonical"]').href, 'https://www.leonidakit.com/' + f);
    assert.equal(d.querySelectorAll('link[rel="alternate"][hreflang]').length, LANGS.length + 2, f + ' : hreflang des langues publiées et x-default');
    const lds = [...d.querySelectorAll('script[type="application/ld+json"]')].map(s => JSON.parse(s.textContent));
    assert.ok(lds.some(x => x['@type'] === 'WebPage'), f + ' : WebPage'); assert.ok(lds.some(x => x['@type'] === 'BreadcrumbList'), f);
    assert.doesNotMatch(JSON.stringify(lds), /AggregateRating|"Review"|ratingValue/, 'ni note ni avis');
    /* gabarits : les mêmes images (mêmes régions, même ordre) dans chaque langue, tous les messages, mêmes repères {…} */
    const pool = [...d.getElementById('dv-pool').content.querySelectorAll('[data-dv-img]')].map(x => x.getAttribute('data-dv-img') + '/' + x.getAttribute('data-dv-r'));
    assert.deepEqual(pool, POOL.map(x => x.id + '/' + x.r), f + ' : liste des images');
    for (const x of d.getElementById('dv-pool').content.querySelectorAll('[data-dv-img] img')) { assert.ok(x.getAttribute('alt').length > 20, f); assert.match(x.getAttribute('srcset'), /480w, .+800w, .+1280w$/); assert.ok(x.getAttribute('src').startsWith('/img/officiel/')); }
    const msg = Object.fromEntries([...d.getElementById('dv-msg').content.querySelectorAll('[data-k]')].map(p => [p.getAttribute('data-k'), p.textContent]));
    for (const [k, t] of Object.entries(D.msg)) { assert.ok(msg[k], f + ' : message ' + k); assert.deepEqual((msg[k].match(/\{\w+\}/g) || []).sort(), (t.match(/\{\w+\}/g) || []).sort(), f + ' : repères de ' + k); }
    /* aucune ressource d’un autre site ; les captures sont celles du site */
    for (const m of html.matchAll(/\s(?:src|srcset|href)="([^"]+)"/g)) if (/^https?:/.test(m[1])) assert.ok(/^https:\/\/(?:www\.)?(?:leonidakit\.com|rockstargames\.com)\//.test(m[1]) || /<a\b[^>]*href="[^"]*"/.test(html), f + ' : ' + m[1]);
    for (const m of html.matchAll(/<(?:img|script|link|iframe|source|video|audio)\b[^>]*\s(?:src|href|srcset)="(https?:[^"]+)"/g)) assert.ok(/^https:\/\/www\.leonidakit\.com\//.test(m[1]) && !/<link rel="stylesheet"/.test(m[0]), f + ' : ressource externe ' + m[1]);
    /* accessibilité : six régions au clavier, carte (raccourci souris et toucher) hors du clavier et des lecteurs d’écran, annonces */
    assert.equal(d.querySelectorAll('[data-dv-opt]').length, 6, f);
    for (const b of d.querySelectorAll('[data-dv-opt]')) assert.ok(b.tagName === 'BUTTON' && b.textContent.trim(), f);
    assert.equal(d.querySelector('.dv-map').getAttribute('aria-hidden'), 'true');
    for (const p of d.querySelectorAll('[data-dv-pin]')) assert.equal(p.getAttribute('tabindex'), '-1');
    assert.equal(d.querySelector('[data-dv-live]').getAttribute('aria-live'), 'polite');
    assert.ok(d.querySelector('[data-dv-board]').hasAttribute('hidden'), f + ' : sans script, le plateau reste caché');
    /* sans script : la page reste utile (règles, régions avec leur fiche) */
    assert.ok(d.querySelector('[data-dv-nojs]').textContent.trim().length > 40);
    assert.equal(d.querySelectorAll('#regions a[data-dv-fiche]').length, 6, f);
    for (const a of d.querySelectorAll('#regions a[data-dv-fiche]')) assert.ok(fs.existsSync(path.join(root, dir, a.getAttribute('href'))), f + ' : ' + a.getAttribute('href'));
    assert.ok(d.querySelectorAll('#regles .vt-step').length === 4 && d.querySelectorAll('#faq details').length === D.faq.items.length, f);
    if (dir) {
      /* le script n’a aucun texte à traduire : la page de la langue charge celui de la racine ; s’il existait une copie
         dans la langue, elle devrait garder les mêmes chaînes (aucun identifiant traduit) */
      const s = d.querySelector('script[src*="devine.js"]').getAttribute('src');
      assert.match(s, /^(?:\.\.\/)?devine\.js\?v=[0-9a-f]{12}$/, f + ' : ' + s);
      if (s.startsWith('devine.js')) assert.deepEqual(lit(read(dir + 'devine.js')).filter(x => x !== 'use strict'), fr, dir + 'devine.js : mêmes chaînes que devine.js');
      else assert.ok(!fs.existsSync(path.join(root, dir, 'devine.js')), dir + 'devine.js : copie inutile');
    }
  }
});

test('une partie en allemand : textes de la langue, nombres et pluriels de la langue, liens vers les fiches allemandes', () => {
  if (!LANGS.includes('de')) return;
  const { w, d } = game('de/' + PAGE, '2026-10-12T10:00:00Z');
  const g = d.querySelector('[data-dv]'), ids = API.draw(POOL, '2026-10-12', { per: 5, ref: D.debut });
  const fr = doc(PAGE).getElementById('dv-msg').content.querySelector('[data-k="dv-jour"]').textContent;
  assert.notEqual(N(g.querySelector('[data-dv-mode]').textContent), N(fr.replace('{n}', '1')), 'message traduit');
  for (let i = 0; i < 5; i++) { g.querySelector('[data-dv-opt="' + REGION[ids[i]] + '"]').click(); if (!i) assert.equal(g.querySelector('[data-dv-fiche-link]').getAttribute('href'), 'lieux/' + REGION[ids[0]] + '.html'); g.querySelector('[data-dv-next]').click(); }
  const t = g.querySelector('[data-dv-share-txt]').textContent;
  assert.ok(t.endsWith('\nhttps://www.leonidakit.com/de/' + PAGE), 'adresse de la page allemande');
  assert.ok(!/Devine le lieu/.test(t.split('\n')[0]) || /Devine le lieu/.test(read('outils/langues/de/v790.json')), t);
  assert.equal(w.localStorage.getItem('lk_devine_v1') !== null, true);
});

test('liens : menu « Jouer », pied de page, page Lieux, fiches des régions, recherche, plan du site, Léo et Mentions', () => {
  const shell = require(path.join(root, 'outils/site-shell.cjs'));
  assert.deepEqual(shell.play[shell.play.length - 1], [PAGE, 'Devine le lieu']);
  assert.ok(shell.sectionPages.has(PAGE));
  assert.ok(shell.nav('index.html', '').includes('href="' + PAGE + '"') && shell.footer('', '').includes('href="' + PAGE + '"'));
  assert.match(read(PAGE), new RegExp('<a href="' + PAGE.replace('.', '\\.') + '" class="here" aria-current="page">Devine le lieu</a>'));
  for (const dir of ['', ...LANGS.map(l => l + '/')]) {
    const lieux = doc(dir + 'lieux.html');
    assert.ok(lieux.querySelector('.dv-promo a[href="' + PAGE + '"]'), dir + 'lieux.html : encart du jeu');
    for (const s of D.series) assert.ok(doc(dir + 'lieux/' + s.region + '.html').querySelector('.lore-links a[href="../' + PAGE + '"]'), dir + 'lieux/' + s.region + '.html');
    assert.ok(read(dir + 'mentions-legales.html').includes('lk_devine_v1'), dir + 'mentions-legales.html');
  }
  const idx = read('search-index.js');
  assert.ok(idx.includes('"u":"/' + PAGE + '"') && idx.includes('"u":"/' + PAGE + '#jeu"'), 'recherche');
  assert.match(idx.slice(idx.indexOf('"u":"/' + PAGE + '#jeu"') - 400, idx.indexOf('"u":"/' + PAGE + '#jeu"') + 400), /geoguessr/);
  const sm = read('sitemap.xml');
  for (const dir of ['', ...LANGS.map(l => l + '/')]) assert.ok(sm.includes('<loc>https://www.leonidakit.com/' + dir + PAGE + '</loc>'), 'plan ' + dir);
  const K = JSON.parse(read('outils/leo-knowledge.json')).topics, top = id => K.find(t => t.id === id);
  assert.ok(top('devine-le-lieu').links[0].url === '/' + PAGE && top('devine-le-lieu').f.includes('un jeu sur la carte') && top('devine-le-lieu').f.includes('devine le lieu'));
  assert.ok(top('devine-le-lieu-score').links.some(l => l.url === '/mentions-legales.html#donnees-navigateur'));
  const leo = read('leo-index.json');
  assert.ok(leo.includes('"devine-le-lieu"') && leo.includes('"devine-le-lieu-score"'), 'Léo : les deux sujets');
  for (const l of LANGS) if (fs.existsSync(path.join(root, l, 'leo-index.json'))) assert.ok(read(l + '/leo-index.json').includes('/' + l + '/' + PAGE), l + ' : Léo renvoie à la page de la langue');
  assert.ok(JSON.parse(read('outils/leo-editorial.json')).suggestions['devine-le-lieu'].length === 4);
  assert.match(read('leo-core.js'), /path==='\/devine-le-lieu\.html'\)return pick\('devine-le-lieu'\)/);
});

test('Léo connaît le jeu dans les cinq langues (ce que c’est, où est gardé le score)', async () => {
  const { run } = require('./leo-eval.cjs');
  for (const code of ['fr', ...LANGS]) {
    const q = path.join(root, 'outils/tests/leo-questions-section-devine-' + code + '.json');
    assert.ok(fs.existsSync(q), 'questions ' + code);
    const r = await run({ lang: code, questions: q });
    assert.equal(r.correct, r.questions, code + ' : ' + r.correct + '/' + r.questions);
    assert.equal(r.withoutSource, 0, code + ' : réponse sans source');
  }
});
