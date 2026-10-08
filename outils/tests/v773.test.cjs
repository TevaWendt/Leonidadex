'use strict';
/* v7.73 (demande de Téva du 08/10/2026, lot 3) : les listes des trois catalogues en couleur et en mouvement (visuel officiel de
   la catégorie pour les lignes sans visuel, teinte, cascade à l'ouverture, survol), les cartes « En un regard » illustrées,
   « Personnaliser ce véhicule / cette arme » sur chaque fiche (postes applicables, options en sous-listes, repères de la série,
   configuration sur l'appareil), les grades des trophées cliquables (fiche squelette) et les trophées dans la Progression.
   Pages générées, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const exists = src => fs.existsSync(path.join(root, src.replace(/^\//, '').split(/[?#]/)[0]));
const C = require('../catalogues.cjs'), PF = require('../perso-fiche.cjs');
const run = f => { const ctx = { window: {} }; vm.runInNewContext(read(f), ctx); return ctx.window; };
const PAGES = { consommables: 'nourriture.html', coiffures: 'style.html', tatouages: 'style.html', tenues: 'style.html', 'perso-vehicules': 'personnalisations.html', 'perso-armes': 'personnalisations.html' };

test('listes des catalogues : chaque catégorie a son visuel officiel et sa teinte ; une ligne sans visuel propre montre celui de sa catégorie (illustration dite comme telle), les autres gardent le leur ; barre fermée avec trois visuels', () => {
  const d = C.load();
  for (const fam of C.FAMILIES) {
    const data = d.families[fam];
    for (const c of data.categories) { assert.ok(c.visuel && typeof c.teinte === 'number', fam + '/' + c.id + ' : visuel et teinte'); const v = C.catVisual(c); assert.ok(v && exists(v.src), fam + '/' + c.id + ' : fichier du visuel'); }
    const page = doc(PAGES[fam]), box = page.getElementById('box-' + fam);
    assert.ok(box, fam + ' : boîte');
    assert.equal(box.querySelectorAll('.cat-sum .cat-sum-pile img').length, 3, fam + ' : trois visuels dans la barre');
    assert.ok(box.querySelector('.cat-sum .cat-sum-open'), fam + ' : « Ouvrir la liste »');
    const rows = [...box.querySelectorAll('tr.cat-row')];
    assert.ok(rows.length >= 5);
    const cats = new Map(data.categories.map(c => [c.id, c]));
    for (const r of rows) {
      const it = data.items.find(x => C.rowId(fam, x) === r.id); assert.ok(it, r.id);
      assert.match(r.getAttribute('style') || '', /--ch:\d+/, r.id + ' : teinte');
      const th = r.querySelector('.cat-thumb'); assert.ok(th, r.id + ' : vignette');
      const img = th.querySelector('img'); assert.ok(img && exists(img.getAttribute('src')), r.id + ' : image');
      if (it.media) { assert.ok(!th.classList.contains('cat-thumb--cat'), r.id + ' : garde son visuel'); }
      else { assert.ok(th.classList.contains('cat-thumb--cat') && th.querySelector('.cat-thumb-badge'), r.id + ' : illustration de la catégorie'); assert.match(th.getAttribute('title'), /illustration de la catégorie/); assert.ok(img.getAttribute('alt').includes(cats.get(it.categorie).label), r.id + ' : alt'); assert.equal(img.getAttribute('src'), C.catVisual(cats.get(it.categorie)).src); }
    }
  }
  const css = read('acquisitions.css');
  for (const rule of ['.cat-thumb--cat::after', '.cat-thumb-badge{', '.cat-sum-pile img:nth-child(3)', '.js tr.cat-row.lk-reveal:not(.lk-settled){transform:translate3d(-28px,0,0)', '.cat-row:hover{transform:translate(-2px,-3px)']) assert.ok(css.includes(rule), rule);
  assert.match(css, /prefers-reduced-motion:reduce\)\{[^}]*\.cat-row,\.cat-thumb img,\.cat-nom,\.cat-fiche-bt\{transition:none;\}/, 'mouvement réduit');
  assert.match(read('catalogue.js'), /box\.addEventListener\('toggle'[\s\S]*--lk-delay[\s\S]*Math\.min\(i \* 80, 720\)/, 'cascade à l’ouverture');
});

test('consommables « en un regard » : chaque carte s’ouvre sur un visuel officiel (le sien, sinon celui de sa catégorie dit « illustration »), nom et statut toujours là', () => {
  const d = C.load().families.consommables, page = doc('nourriture.html');
  const cards = [...page.querySelectorAll('#en-un-regard .cg-card')];
  assert.ok(cards.length >= 20);
  for (const c of cards) {
    const it = d.items.find(x => x.id === c.getAttribute('data-cg-id')); assert.ok(it);
    const m = c.querySelector('.cg-media'); assert.ok(m, it.id + ' : visuel');
    assert.ok(m.classList.contains(it.media ? 'cg-media--own' : 'cg-media--cat'), it.id + ' : origine du visuel');
    const img = m.querySelector('img'); assert.ok(img && exists(img.getAttribute('src')), it.id + ' : image');
    assert.ok(m.querySelector('.cg-media-l'), it.id + ' : étiquette');
    assert.ok(c.querySelector('.cg-top .cg-head h4') && c.querySelector('.cg-top .cg-st'), it.id + ' : nom et statut');
    assert.match(c.getAttribute('style') || '', /--ch:\d+/);
  }
});

test('personnaliser ce véhicule / cette arme : section sur chaque fiche (catégorie, ateliers, lien sans script), données perso-data.js cohérentes avec les catalogues, options et déblocages sourcés, script chargé à la demande', () => {
  assert.deepEqual(PF.check(), []);
  const D = run('perso-data.js').LK_PERSO;
  for (const kind of ['vehicules', 'armes']) {
    const fam = PF.FAM[kind], data = C.load().families[fam];
    assert.equal(D[kind].posts.length, data.items.length, kind + ' : tous les postes');
    assert.equal(D[kind].cats.length, data.categories.length);
    const listIds = new Set([...read(data.page.slice(1)).matchAll(/ id="([^"]+)"/g)].map(m => m[1]));
    for (const c of D[kind].cats) assert.ok(c.ico.includes('<svg') && c.img && exists(c.img) && typeof c.h === 'number', c.id);
    for (const p of D[kind].posts) {
      const it = data.items.find(x => x.id === p.id); assert.ok(it);
      assert.equal(p.nom, it.nom); assert.equal(p.st, it.statut);
      assert.ok(p.url.startsWith(data.page.slice(1) + '#') && listIds.has(p.url.split('#')[1]), p.id + ' : ancre de la liste');
      assert.ok(/à venir|Ne s’achète pas|à confirmer/i.test(p.p6) || /\$/.test(p.p6), p.id + ' : prix GTA VI jamais inventé');
      for (const o of p.opts) { assert.ok(o.n); if (o.p !== undefined) assert.ok(p.jeu === 'GTA V' || p.jeu === 'GTA Online', p.id + ' : une option chiffrée dit son jeu'); }
      if (p.deb) assert.match(p.deb, /^GTA Online/, p.id + ' : le déblocage est un repère de GTA Online');
    }
    assert.ok(D[kind].posts.some(p => p.couleurs) === (kind === 'vehicules'), kind + ' : familles de teintes');
  }
  assert.equal(D.vehicules.couleurs.length, 11);
  const V = run('vehicules-data.js').LK_VEHICULES, A = run('armes-data.js').LK_ARMES;
  const checkFiche = (file, kind, item) => {
    const h = read(file), m = h.match(/<section class="shell reveal pf" id="personnaliser"[\s\S]*?<\/section>/);
    assert.ok(m, file + ' : section');
    const sec = new JSDOM(m[0]).window.document.querySelector('section');
    assert.ok(sec.getAttribute('data-pf') === kind && sec.getAttribute('data-pf-id') === item.id && sec.getAttribute('data-pf-cat') === item.cat, file + ' : attributs');
    const list = PF.forItem(kind, item), chips = [...sec.querySelectorAll('.pf-chip-li')];
    const cats = [...new Set(list.map(p => p.cat))];
    assert.equal(chips.length, cats.length, file + ' : un atelier par catégorie qui a un poste');
    for (const ch of chips) { assert.equal(ch.querySelector('.pf-chip').tagName, 'BUTTON', file + ' : puce = bouton (aucune ancre à vérifier)'); const id = ch.querySelector('.pf-chip').getAttribute('data-pf-chip'); assert.equal(+ch.querySelector('.pf-chip-n').textContent, list.filter(p => p.cat === id).length, file + ' : compteur ' + id); assert.match(ch.getAttribute('style'), /--ch:\d+/); }
    assert.match(sec.querySelector('.fiche-txt').textContent, !list.length ? /Aucun poste/ : list.length === 1 && list[0].st === 'conf' ? /^Un seul poste/ : new RegExp('^' + list.length + ' postes'), file + ' : résumé');
    if (list.length) { const a = sec.querySelector('.pf-nojs a'); assert.ok(a && a.getAttribute('href').startsWith('../personnalisations.html?') && a.getAttribute('href').endsWith('#box-' + PF.FAM[kind]), file + ' : lien sans script'); }
    assert.match(h, /<script src="\.\.\/perso-fiche\.js(?:\?v=[a-f0-9]+)?" defer><\/script>/, file + ' : script');
    assert.ok(!/perso-data\.js/.test(h), file + ' : les données ne sont chargées qu’à la demande');
    assert.ok(h.includes('<a href="#personnaliser">'), file + ' : lien du bandeau');
  };
  for (const v of V.filter(v => !v.retire && !v.redirect).slice(0, 40)) if (fs.existsSync(path.join(root, 'vehicules', v.id + '.html'))) checkFiche('vehicules/' + v.id + '.html', 'vehicules', { id: v.id, cat: v.cat });
  for (const a of A) checkFiche('armes/' + a.id + '.html', 'armes', { id: a.id, cat: a.cat });
  const js = read('perso-fiche.js');
  assert.ok(js.includes("'lk_perso_v1'") && js.includes("base + 'perso-data.js'") && js.includes('IntersectionObserver'), 'script : clé, chargement à la demande');
  assert.ok(/honnete: 'Les prix et les déblocages viennent de GTA V ou de GTA Online/.test(js), 'script : phrase d’honnêteté');
  assert.ok(read('fiches.css').includes('.pf-config{') && read('fiches.css').includes('.pf-opt{'), 'styles');
  assert.ok(read('personnalisations.html').includes('>Personnaliser sur sa fiche</a>'), 'liste : le modèle choisi renvoie à sa fiche');
  assert.match(read('catalogue.js'), /state\.item\.url \+ '#personnaliser'/);
});

test('trophées : les cinq grades sont des cartes cliquables avec fiche squelette (GTA VI, ce qu’il faut, repère GTA V, champs) ; la Progression a son bloc « Mes trophées et succès »', () => {
  const d = doc('trophees.html');
  const dets = [...d.querySelectorAll('#grades details.lkx-det.trophees-grade-det')];
  assert.deepEqual(dets.map(x => x.id), ['grade-platine', 'grade-or', 'grade-argent', 'grade-bronze', 'grade-xbox']);
  for (const det of dets) {
    assert.ok(det.querySelector('summary .trophees-grade-card .trophees-badge') && det.querySelector('summary .lkx-card-go'), det.id + ' : carte');
    const src = det.querySelector('.lkx-sheet-src');
    assert.deepEqual([...src.querySelectorAll('h4')].map(h => h.textContent), ['Pour GTA VI', 'Ce qu’il faut, en général', 'Repère de GTA V', 'Ce que dira chaque trophée de ce grade']);
    assert.ok(src.querySelector('.lkx-sheet-vide').textContent.includes('Rien n’est inventé'), det.id + ' : rien d’inventé');
    assert.ok(src.querySelector('.trophees-repere .trophees-v').textContent === 'GTA V');
    assert.equal(src.querySelectorAll('.lkx-skel > div').length, 5, det.id + ' : champs');
    for (const a of src.querySelectorAll('.lkx-sheet-cta a')) { const h = a.getAttribute('href'); if (h.startsWith('#')) assert.ok(d.getElementById(h.slice(1)), h); else assert.ok(exists(h), h); }
  }
  assert.ok(d.querySelector('#grades .lkx-sheet-cta a[href="progression.html#trophees"]'), 'vers le bloc de la Progression');
  assert.ok(read('trophees.html').includes('href="progression.html#trophees">Ma progression</a>'), 'aperçu : vers le bloc');
  const p = doc('progression.html'), sec = p.getElementById('trophees');
  assert.ok(sec && sec.querySelector('h2').textContent === 'Mes trophées et succès');
  assert.equal(sec.querySelectorAll('.tr-prog-g').length, 4);
  assert.deepEqual([...sec.querySelectorAll('[data-tr-g]')].map(x => x.getAttribute('data-tr-g')), ['platine', 'or', 'argent', 'bronze']);
  assert.ok(sec.querySelector('a[href="trophees.html#liste"]') && sec.querySelector('a[href="trophees.html#grades"]'));
  assert.ok(read('progression.js').includes("'lk-trophees-obtenus-v1'") && read('carnets.css').includes('.tr-prog-board{'));
  assert.equal(p.querySelectorAll('.cn-dcard').length, 9, 'les neuf carnets restent');
});

test('langues : listes, cartes, fiches de personnalisation, grades et bloc de la Progression traduits', () => {
  const frData = run('perso-data.js').LK_PERSO;
  for (const l of ['en/', 'es/', 'it/', 'de/']) {
    const D = run(l + 'perso-data.js').LK_PERSO;
    assert.equal(D.vehicules.posts.length, frData.vehicules.posts.length, l + 'perso-data.js');
    const same = D.vehicules.posts.filter((p, i) => p.desc === frData.vehicules.posts[i].desc).length;
    assert.ok(same <= 2, l + ' : descriptions des postes traduites (' + same + ' identiques)');
    const opts = D.vehicules.posts.find(p => p.id === 'peinture-principale').opts.map(o => o.n);
    assert.ok(!opts.includes('Métallisée') && !opts.includes('Classique'), l + ' : options traduites');
    assert.ok(D.vehicules.couleurs.filter((c, i) => c.n !== frData.vehicules.couleurs[i].n).length >= 10, l + ' : familles de teintes traduites (« Oranges » s’écrit pareil en anglais)');
    const js = read(l + 'perso-fiche.js');
    assert.ok(!/titre: 'Ma configuration'/.test(js) && !/prends: 'Je le prends'/.test(js), l + ' : textes du script traduits');
    const v = doc(l + 'vehicules/vapid-ganado.html');
    assert.ok(v.getElementById('personnaliser') && v.querySelector('#personnaliser h2').textContent !== 'Personnaliser ce véhicule', l + ' : fiche');
    const t = doc(l + 'trophees.html');
    assert.equal(t.querySelectorAll('#grades details.lkx-det').length, 5, l + ' : grades');
    assert.notEqual(t.querySelector('#grade-or .lkx-sheet-src h4').textContent, 'Pour GTA VI', l + ' : fiche de grade traduite');
    const pg = doc(l + 'progression.html');
    assert.ok(pg.getElementById('trophees') && pg.querySelector('#trophees h2').textContent !== 'Mes trophées et succès', l + ' : progression');
    const n = doc(l + 'nourriture.html');
    assert.ok(n.querySelector('#en-un-regard .cg-media-l') && n.querySelector('#en-un-regard .cg-media-l').textContent !== 'Visuel officiel' && n.querySelector('#en-un-regard .cg-media-l').textContent !== 'Illustration · visuel officiel', l + ' : étiquette des cartes');
    assert.notEqual(n.querySelector('#box-consommables .cat-sum-open').textContent, 'Ouvrir la liste', l + ' : barre');
  }
});
