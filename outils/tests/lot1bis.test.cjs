'use strict';
/* lot 1 bis (corrections de l’audit du 12/10/2026 : langues, mise en page, compteurs, comptes à rebours).
   Ce que les pages générées doivent tenir, sans navigateur (le contrôle dans Chromium est outils/tests/audit-langues-browser.cjs) :
   1. accueil après la sortie : « GTA VI est sorti » et deux liens (les vrais prix, le calculateur), dans chaque langue ;
   2. une seule constante pour la date visée (window.LK_SORTIE, écrite depuis outils/acquisitions.json), « minuit, heure locale » ;
   3. montants du calculateur jamais coupés (.c-number) ; 4. titres animés qui passent à la ligne (.sec-h) ;
   5. libellés allemands des fiches (césure) ; 6. six régions officielles partout ; 7. boutons d’étape empilés sur téléphone ;
   8. et 11. espaces insécables dans les dates et les montants ; 9. espacement de « Le monde de Leonida » ;
   10. pas d’espace avant « : » hors du français ; 12. repli « Sortie le jeudi 19 novembre 2026 » sans script ;
   13. phrase d’attente des collectibles ; 14. rangées de puces équilibrées.
   NODE_PATH=<dépendances>/node_modules SITE_ROOT=$PWD node --test outils/tests/lot1bis.test.cjs */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = process.env.SITE_ROOT || path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const CFG = JSON.parse(read('outils/langues.json'));
const LANGS = CFG.langues.filter(l => l.etat === 'publiee' && l.code !== CFG.source).map(l => l.dossier);
const { insecables } = require(path.join(root, 'outils/insecables.cjs'));
const NB = ' ', sp = s => s.replace(/[  ]/g, ' ');

test('point 2 : la date visée est une seule constante, tirée de outils/acquisitions.json, identique dans chaque langue', () => {
  const g = JSON.parse(read('outils/acquisitions.json')).game;
  const line = 'window.LK_SORTIE = ' + JSON.stringify({ sortie: g.releaseDate + 'T' + (g.releaseTime || '00:00:00'), prechargement: g.preloadDate + 'T00:00:00' }) + ';';
  for (const f of ['app.js', ...LANGS.map(l => l + '/app.js')]) {
    const js = read(f);
    assert.ok(js.split('\n').includes(line), f + ' : ' + line);
    assert.equal((js.match(/2026-11-19T/g) || []).length, 1, f + ' : la date n’est écrite qu’une fois');
    assert.match(js, /new Date\(window\.LK_SORTIE\.sortie\)[\s\S]*new Date\(window\.LK_SORTIE\.sortie\)/, f + ' : accueil et fiches lisent la constante');
  }
  assert.equal(g.releaseTime, '00:00:00', 'minuit, heure du visiteur (sans fuseau)');
  assert.match(read('app.js'), /tz\.textContent = 'minuit, heure locale'/);
});

test('points 1, 2 et 12 : accueil — repli sans script, cases dans un modèle, heure locale, état « GTA VI est sorti » avec deux liens', () => {
  const d = doc('index.html');
  assert.equal(d.getElementById('clock').textContent.trim(), 'Sortie le jeudi 19 novembre' + NB + '2026');
  assert.ok(!/jours|heures/.test(d.getElementById('clock').textContent), 'plus de cases figées dans le HTML');
  assert.equal(d.getElementById('clock-cases').content.querySelectorAll('.cell').length, 4);
  assert.equal(d.getElementById('clock-tz').textContent.trim(), 'Minuit, heure locale');
  const s = d.getElementById('clock-sorti');
  assert.ok(s.hasAttribute('hidden'));
  assert.equal(s.querySelector('.clock-sorti-t').textContent, 'GTA VI est sorti');
  assert.deepEqual([...s.querySelectorAll('a')].map(a => a.getAttribute('href')), ['achats.html', 'calculateurs.html']);
  for (const l of LANGS) {
    const t = doc(l + '/index.html'), txt = sp(t.getElementById('clock').textContent + ' ' + t.getElementById('clock-tz').textContent + ' ' + t.getElementById('clock-sorti').textContent);
    assert.ok(!/Sortie le jeudi|Minuit, heure locale|est sorti|vrais prix|Ouvrir le calculateur/.test(txt), l + ' : traduit — ' + txt);
    assert.match(txt, /2026/, l);
    assert.deepEqual([...t.querySelectorAll('#clock-sorti a')].map(a => a.getAttribute('href')), ['achats.html', 'calculateurs.html'], l + ' : liens dans la langue');
    assert.equal(t.getElementById('clock-cases').content.querySelectorAll('.cell .u').length, 4, l);
  }
});

test('point 3 : un montant du calculateur ne se coupe jamais (nowrap, plus d’overflow-wrap:anywhere)', () => {
  const css = read('calculateurs-motion.css');
  assert.match(css, /\.calculator-page \.c-number,\.calculator-page \[data-c-number\]\{white-space:nowrap;overflow-wrap:normal;word-break:keep-all;\}/);
  assert.match(css, /\.calculator-page \.calc-stat strong\.c-number,\.calculator-page \.calc-result-metrics strong\.c-number\{flex-shrink:0;\}/);
});

test('points 4, 5, 8, 9, 14 : feuille commune (titres animés, césure, titres de fin équilibrés, espacement, puces)', () => {
  const css = read('style.css');
  for (const r of ['.sec-h.lk-words{flex-wrap:wrap;', '.doc-row dt{hyphens:auto;', '.lk-outro h2{text-wrap:balance;}', '.lore-sec#monde{padding-top:58px;}', '.lk-chips{display:block;text-align:center;text-wrap:balance;}']) assert.ok(css.includes(r), r);
  assert.ok(read('fiches.css').includes('.pf-cats{display:block;text-wrap:balance;}'));
  assert.ok(read('calculateurs-brand.css').includes('body.calculator-page main .calc-presets{display:block;text-wrap:balance;}'));
});

test('point 6 : six régions officielles sur la carte et l’accueil, dans chaque langue', () => {
  const n = JSON.parse(read('outils/editorial.json')).regions.length;
  assert.equal(n, 6);
  for (const l of ['', ...LANGS.map(x => x + '/')]) {
    const c = doc(l + 'carte.html'), v = [...c.querySelectorAll('.vstat .n')].map(e => e.getAttribute('data-count'));
    assert.equal(v[2], String(n), l + 'carte.html : ' + v.join(' / '));
    const h = doc(l + 'index.html'), f = [...h.querySelectorAll('.fact .big')].map(e => e.getAttribute('data-count'));
    assert.equal(f[0], String(n), l + 'index.html');
  }
  assert.match(read('carte.html'), /<span class="l">régions officielles<\/span>/);
  assert.match(read('index.html'), /<div class="lbl">régions officielles<\/div>/);
  assert.ok(!/comtés recensés|régions confirmées<\/span>/.test(read('index.html') + read('carte.html')));
});

test('point 7 : sur téléphone, les boutons d’une étape du calculateur s’empilent', () => {
  assert.match(read('calculateurs-brand.css'), /@media\(max-width:600px\)\{body\.calculator-page main \.b-stage-actions\{flex-direction:column;align-items:stretch;\}body\.calculator-page main \.b-stage-actions>\*\{flex:0 0 auto;\}/, 'boutons empilés, chacun à sa hauteur naturelle');
});

test('points 8 et 11 : espaces insécables dans les dates et les montants, dans chaque langue', () => {
  const show = s => s.replace(/ /g, '⍽');
  const cases = [
    ['fr', 'La suite s’écrit le 19 novembre 2026.', 'La suite s’écrit le 19 novembre⍽2026.'],
    ['fr', 'le 19 novembre, puis le 1er décembre 2026', 'le 19⍽novembre, puis le 1er décembre⍽2026'],
    ['en', 'The rest gets written on November 19, 2026.', 'The rest gets written on November 19,⍽2026.'],
    ['en', 'on November 19 and in November 2026', 'on November⍽19 and in November⍽2026'],
    ['de', 'Die Fortsetzung wird am 19. November 2026 geschrieben.', 'Die Fortsetzung wird am 19. November⍽2026 geschrieben.'],
    ['de', 'am 19. November', 'am 19.⍽November'],
    ['es', 'Lo que sigue se escribe el 19 de noviembre de 2026.', 'Lo que sigue se escribe el 19⍽de noviembre de⍽2026.'],
    ['it', 'Il seguito si scrive il 19 novembre 2026.', 'Il seguito si scrive il 19 novembre⍽2026.'],
    ['pt', 'O resto se escreve em 19 de novembro de 2026.', 'O resto se escreve em 19⍽de novembro de⍽2026.'],
    ['de', 'Dein Nettogewinn beträgt 80.000 $.', 'Dein Nettogewinn beträgt 80.000⍽$.'],
    ['de', '1,5 M $ und 10 Mio. $', '1,5⍽M⍽$ und 10⍽Mio.⍽$'],
    ['pt', 'Você ganha $ 200.000', 'Você ganha $⍽200.000'],
    ['fr', '79,99 € et 250k $', '79,99⍽€ et 250k⍽$']
  ];
  for (const [c, a, b] of cases) assert.equal(show(insecables(a, c)), b, c + ' : ' + a);
  assert.equal(insecables('Rien à changer ici.', 'fr'), 'Rien à changer ici.');
  /* dans les pages : le glossaire allemand du calculateur et les titres de fin de page */
  assert.ok(read('de/calculateurs.html').includes('80.000' + NB + '$.'), 'de/calculateurs.html : « 80.000 $. » insécable');
  /* l’année reste attachée (« novembre 2026 », « 19, 2026 », « de 2026 ») ; aucun bloc insécable trop large pour le grand titre
     d’un téléphone de 320 px (« 19 novembre 2026. » d’un seul bloc dépassait de 39 px) */
  for (const l of ['', ...LANGS.map(x => x + '/')]) for (const f of ['armes.html', 'collectibles.html', 'vehicules.html']) {
    const h = doc(l + f).querySelector('.lk-outro h2').textContent;
    assert.ok(!/\d \$|\$ \d|(?:November|novembre|noviembre de|novembro de|19,) 2026/.test(h), l + f + ' : ' + show(h));
    assert.ok(Math.max(...h.trim().split(/[ \n]+/).map(w => w.length)) <= 16, l + f + ' : bloc insécable trop long : ' + show(h));
  }
});

test('point 10 : l’espace avant « : » n’est ajouté qu’en français (tableau du calculateur)', () => {
  const css = read('calculateurs-workspace.css');
  assert.match(css, /body\.calculator-page main \.lk-act--3 td\[data-l\]::before\{content:attr\(data-l\) ": ";/);
  assert.match(css, /html:lang\(fr\) body\.calculator-page main \.lk-act--3 td\[data-l\]::before\{content:attr\(data-l\) "\\00a0: "\}/);
});

test('point 13 : collectibles — une phrase d’attente à la place des trois compteurs à « 0 », tant que le catalogue est vide', () => {
  const c = { window: {} }; vm.runInNewContext(read('collectibles-data.js'), c);
  const empty = !(c.window.LK_COLLECTIBLES.items || []).length;
  for (const l of ['', ...LANGS.map(x => x + '/')]) {
    const d = doc(l + 'collectibles.html'), dash = d.querySelector('.col-dash');
    assert.equal(dash.hasAttribute('data-vide'), empty, l + 'collectibles.html');
    const phrase = d.querySelector('.col-dash-t--vide .col-dash-phrase').textContent;
    if (l) assert.ok(!/Rien n’est encore confirmé/.test(phrase), l + ' : phrase traduite');
  }
  assert.match(read('collectibles-brand.css'), /\.col-dash\[data-vide\] \.col-dash-t:not\(\.col-dash-t--vide\):not\(\.col-dash-t--q\)\{display:none;\}/);
  assert.match(read('collectibles.js'), /toggleAttribute\('data-vide', !items\.length\)/);
});

test('contrôle automatique : le test Chromium de l’audit existe et couvre les vingt pages clés et l’horloge simulée', () => {
  const t = read('outils/tests/audit-langues-browser.cjs');
  for (const p of ['index.html', 'calculateurs.html', 'carte.html', 'vehicules.html', 'armes.html', 'missions.html', 'codes-de-triche.html', 'trophees.html', 'radios.html', 'achats.html', 'progression.html', 'atelier-3d.html', 'a-propos.html', 'mentions-legales.html', 'contact.html', 'personnages.html', 'style.html', 'tuto.html', 'online.html']) assert.ok(t.includes("'" + p + "'"), p);
  for (const s of ['setFixedTime', '23:59:50', '00:00:05', '2026-12-01', 'America/Toronto', 'frenchHits', 'EXPECT']) assert.ok(t.includes(s), s);
});
