'use strict';
/* v7.60 (langues) : versions traduites du site (/en/…), sélecteur « Changer la langue », bandeau de suggestion.
   v7.61 : tout le site en anglais (toutes les pages, données posées dans les pages, attributs lus), Léo anglais (noyau
   en/leo-index.json, morceaux en/leo/*.json, question réécrite en français), page introuvable, plan du site.
   Vérifie sans navigateur : configuration, en/ à jour avec la mémoire de traduction, pages anglaises (langue, liens,
   hreflang, Léo absent, aucun français visible), pages françaises (barre de langue, hreflang, plan du site), scripts
   traduits (seules des chaînes changent, aucun identifiant comparé par le code n'est traduit d'un seul côté), calculateur
   anglais dans jsdom (montants « $1,250 », nombres anglais, phrases du hub), clé lk_lang_v1 écrite seulement après un clic.
   Le parcours de chaque outil dans un vrai navigateur est dans langues-browser.cjs. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const L = require(path.join(root, 'outils/langues.cjs'));
const { frenchHits } = require('./langues-helper.cjs');
const { load } = require('./runtime-helper.cjs');
const parse5 = require('parse5');
const ACORN = require('acorn');
const cfg = L.config(root), EN = cfg.langues.find(l => l.code === 'en');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const SITE = 'https://www.leonidakit.com/';

/* ---- petits outils de lecture HTML ---- */
const attr = (el, n) => (el.attrs || []).find(a => a.name === n)?.value;
function walk(node, fn, ctx = {}) {
  const el = node.tagName ? node : null;
  let c = ctx;
  if (el) {
    const skip = ['script', 'style', 'template', 'svg'].includes(el.tagName) || attr(el, 'translate') === 'no' || attr(el, 'data-lk-langbar') !== undefined || attr(el, 'lang') === 'fr' || attr(el, 'hreflang') === 'fr' && el.tagName === 'link' || /\bed-brand-mono\b/.test(attr(el, 'class') || ''); /* monogramme de marque (« DE » pour Declasse) */
    c = { ...ctx, skip: ctx.skip || skip };
    fn(el, c);
  } else if (node.nodeName === '#text') fn(node, ctx);
  for (const k of (node.tagName === 'template' && node.content ? node.content.childNodes : node.childNodes || [])) walk(k, fn, c);
}
function pages(code) { return (cfg.langues.find(l => l.code === code).pages || []).map(p => cfg.langues.find(l => l.code === code).dossier + '/' + p); }
function frPages() {
  const out = [];
  (function rec(dir) { for (const f of fs.readdirSync(path.join(root, dir))) { const rel = dir ? dir + '/' + f : f; const st = fs.statSync(path.join(root, rel)); if (st.isDirectory()) { if (!/^(outils|node_modules|\.|en$|es$|it$|de$|pt$|img|photos|leo|fonts|data|api)/.test(f)) rec(rel); } else if (f.endsWith('.html')) out.push(rel); } })('');
  return out;
}

test('langues.json : le français est la source, chaque langue publiée a un dossier, des libellés complets et des pages françaises existantes', () => {
  assert.equal(cfg.source, 'fr');
  const codes = cfg.langues.map(l => l.code); assert.equal(new Set(codes).size, codes.length, 'codes uniques');
  for (const l of cfg.langues.filter(x => x.etat === 'publiee')) {
    for (const k of ['changer', 'accueil', 'offre', 'aller', 'rester']) assert.ok(l.libelles && l.libelles[k], l.code + ' : libellé ' + k);
    if (l.code === cfg.source) continue;
    assert.ok(/^[a-z]{2}$/.test(l.dossier), l.code + ' : dossier');
    for (const p of l.pages) assert.ok(fs.existsSync(path.join(root, p)), l.code + ' : la page française ' + p + ' existe');
  }
  for (const l of cfg.langues.filter(x => x.etat === 'prevue')) assert.ok(!fs.existsSync(path.join(root, l.dossier)), l.code + ' prévue : aucun dossier publié');
  assert.deepEqual(cfg.leo, ['fr', 'en'], 'Léo en français et en anglais');
  assert.deepEqual(EN.pages.slice().sort(), frPages().filter(p => !(cfg.exclure || []).includes(p) && /<body[\s>]/.test(read(p))).sort(), 'v7.61 : toutes les pages françaises ont leur version anglaise');
});

test('en/ est à jour : la génération sans écriture donne exactement les fichiers présents ; rien sans traduction, aucune balise cassée, aucun conflit', () => {
  const r = L.generer('en', root, { force: true, ecrire: false });
  assert.deepEqual(r.missing.map(m => m.text).slice(0, 10), [], 'textes sans traduction (node outils/langues.cjs --extraire en)');
  assert.deepEqual(r.broken, [], 'balises <n> conservées dans chaque traduction');
  assert.deepEqual(r.conflicts, [], 'une seule traduction par texte');
  for (const [rel, content] of r.outputs) assert.ok(fs.existsSync(path.join(root, rel)) && read(rel) === content, rel + ' à jour (relancer node outils/regenerer.cjs)');
  const expected = new Set([...r.outputs.keys()].filter(k => k.startsWith('en/')).map(k => k.slice(3)));
  (function rec(d) { for (const e of fs.readdirSync(path.join(root, 'en', d), { withFileTypes: true })) { const rel = d ? d + '/' + e.name : e.name; if (e.isDirectory()) rec(rel); else assert.ok(expected.has(rel), 'en/' + rel + ' est attendu (aucun fichier en trop)'); } })('');
});

test('pages anglaises : lang="en", canonical et og:url en /en/, hreflang fr/en/x-default, og:locale en_US, Léo amorcé par common.js', () => {
  for (const p of EN.pages) {
    const html = read('en/' + p), url = SITE + 'en/' + (p === 'index.html' ? '' : p), frUrl = SITE + (p === 'index.html' ? '' : p);
    assert.match(html, /<html lang="en"/, p);
    const frCanon = (read(p).match(/<link rel="canonical" href="https:\/\/www\.leonidakit\.com\/([^"]*)">/) || [])[1];
    if (frCanon !== undefined) assert.ok(html.includes('<link rel="canonical" href="' + SITE + 'en/' + frCanon + '">'), p + ' : canonical');
    else assert.ok(!/<link rel="canonical"/.test(html), p + ' : pas de canonical (comme en français)');
    assert.ok(html.includes('<link rel="alternate" hreflang="fr" href="' + frUrl + '">') && html.includes('<link rel="alternate" hreflang="en" href="' + url + '">') && html.includes('<link rel="alternate" hreflang="x-default" href="' + frUrl + '">'), p + ' : hreflang');
    const frOg = (read(p).match(/property="og:url" content="https:\/\/www\.leonidakit\.com\/([^"]*)"/) || [])[1];
    if (frOg !== undefined) assert.ok(html.includes('property="og:url" content="' + SITE + 'en/' + frOg + '"'), p + ' : og:url');
    if (/property="og:locale"/.test(html)) assert.ok(html.includes('property="og:locale" content="en_US"'), p + ' : og:locale');
    assert.ok(!/<script[^>]+src="[^"]*leo(?:-widget|-core|\.js)/.test(html), p + ' : aucun script de Léo');
    assert.ok(!/leo-index\.json/.test(html), p + ' : index de Léo non chargé');
    if (html.includes('http-equiv="refresh"')) continue; // redirection : pas de barre (comme en français)
    assert.match(html, /<div class="lk-langbar" data-lk-langbar translate="no">/, p + ' : barre de langue');
    assert.match(html, /<a aria-current="true" hreflang="en" lang="en" data-lk-lang="en">English<\/a>/, p + ' : anglais coché');
  }
});

test('pages anglaises : chaque lien mène à un fichier qui existe ; page traduite → /en/, autre page → page française marquée hreflang="fr"', () => {
  for (const p of EN.pages) {
    const doc = parse5.parse(read('en/' + p)), bad = [];
    walk(doc, el => {
      if (!el.tagName) return;
      for (const name of ['href', 'src']) {
        const v = attr(el, name); if (!v || /^(?:[a-z]+:|\/\/|#|data:)/i.test(v) || el.tagName === 'link' && attr(el, 'rel') === 'alternate') continue;
        const target = new URL(v, SITE + 'en/' + p).pathname, file = target.endsWith('/') ? target + 'index.html' : target;
        if (!fs.existsSync(path.join(root, decodeURIComponent(file)))) bad.push(name + '=' + v + ' (introuvable)');
        if (name === 'href' && el.tagName === 'a' && /\.html$|\/$/.test(file)) {
          const inEn = file.startsWith('/en/'), page = file.replace(/^\/(?:en\/)?/, '');
          if (inEn && !EN.pages.includes(page)) bad.push(v + ' : page non traduite dans /en/');
          if (!inEn && EN.pages.includes(page) && attr(el, 'data-lk-lang') !== 'fr') bad.push(v + ' : la version anglaise existe');
          if (!inEn && attr(el, 'hreflang') !== 'fr') bad.push(v + ' : lien vers le français sans hreflang="fr"');
        }
      }
    });
    assert.deepEqual(bad.slice(0, 8), [], p);
  }
});

test('pages anglaises : aucun français visible (textes, attributs lus, titre, description, données structurées, données JSON de la page)', () => {
  /* v7.61 : tous les attributs traduits (data-l, data-loc-*, data-one…), sauf les chaînes de recherche (mots sans accent) */
  const READ = cfg.attributs.filter(a => !/^data-(?:q|search|loc-q|n|help-keywords)$/.test(a));
  const CODE = new Set([...(cfg.jsonCode || []), ...(cfg.jsonCodePages || [])]);
  for (const p of EN.pages) {
    const html = read('en/' + p), doc = parse5.parse(html, { scriptingEnabled: false }), hits = [];
    if (html.includes('http-equiv="refresh"')) continue; // redirection immédiate : rien n'est lu
    const see = (text, where) => { const h = frenchHits(text); if (h.length) hits.push(where + ' « ' + String(text).trim().slice(0, 90) + ' » [' + h.slice(0, 4).join(', ') + ']'); };
    walk(doc, (n, c) => {
      if (c.skip) return;
      if (n.nodeName === '#text') { if (n.value.trim()) see(n.value, 'texte'); return; }
      for (const a of READ) { const v = attr(n, a); if (v) see(v, a); }
      if (n.tagName === 'meta' && /^(?:description|og:title|og:description|twitter:title|twitter:description|og:image:alt)$/.test(attr(n, 'name') || attr(n, 'property') || '')) see(attr(n, 'content'), 'meta');
    });
    for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      (function visit(o, k) { if (Array.isArray(o)) o.forEach(x => visit(x, k)); else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) visit(v, kk); else if (typeof o === 'string' && cfg.jsonld.includes(k)) see(o, 'JSON-LD ' + k); })(JSON.parse(m[1]), '');
    }
    for (const m of html.matchAll(/<script type="application\/json"[^>]*>([\s\S]*?)<\/script>/g)) {
      (function visit(o, k) { if (Array.isArray(o)) o.forEach(x => visit(x, k)); else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) visit(v, kk); else if (typeof o === 'string' && !CODE.has(k) && !/^\s*</.test(o) && !/^[a-z0-9-]+$/.test(o)) see(o, 'JSON ' + k); })(JSON.parse(m[1]), '');
    }
    assert.deepEqual(hits.slice(0, 12), [], p);
  }
});

test('pages françaises : barre « Changer la langue » en haut de chaque page (sauf redirections), hreflang sur les pages traduites, plan du site', () => {
  const list = frPages(); assert.ok(list.length > 300, 'pages françaises trouvées');
  const missing = [];
  for (const p of list) {
    const html = read(p);
    if (!/<body[\s>]/.test(html)) continue; // fichier de vérification (google….html) : pas une page
    if (html.includes('http-equiv="refresh"')) { assert.ok(!html.includes('data-lk-langbar'), p + ' : redirection sans barre'); continue; }
    if (!/<div class="lk-langbar" data-lk-langbar translate="no">/.test(html)) { missing.push(p); continue; }
    assert.ok(/<a aria-current="true" hreflang="fr" lang="fr" data-lk-lang="fr">Français<\/a>/.test(html), p + ' : français coché');
    const depth = p.split('/').length - 1, en = EN.pages.includes(p);
    const href = p === '404.html' ? '/en/404.html' : '../'.repeat(depth) + 'en/' + (en ? p : 'index.html').replace(/(^|\/)index\.html$/, '$1');
    assert.ok(html.includes('href="' + (href || './') + '" hreflang="en" lang="en" data-lk-lang="en"'), p + ' : lien vers l’anglais ' + href);
    if (en) assert.ok(html.includes('<link rel="alternate" hreflang="en" href="' + SITE + 'en/' + (p === 'index.html' ? '' : p) + '">'), p + ' : hreflang en');
    else assert.ok(!/hreflang="en" href="https/.test(html), p + ' : pas de hreflang sans traduction');
  }
  assert.deepEqual(missing.slice(0, 10), [], 'pages sans barre de langue');
  const sm = read('sitemap.xml');
  for (const p of EN.pages) { const u = p === 'index.html' ? '' : p; if (sm.includes('<loc>' + SITE + u + '</loc>')) assert.ok(sm.includes('<loc>' + SITE + 'en/' + u + '</loc>'), 'sitemap : en/' + p); }
});

test('scripts traduits : mêmes jetons que la source (seules des chaînes changent) ; un identifiant comparé par le code est traduit partout ou nulle part', () => {
  const COMPARE = /(?:===|!==|==|!=|\bcase|\.includes\(|\.indexOf\(|\.has\(|\.startsWith\()\s*$/;
  const seen = new Map(); // original → Set(traductions) (sans les règles « si », voulues différentes)
  const compared = new Map();
  for (const f of fs.readdirSync(path.join(root, 'en')).filter(x => x.endsWith('.js'))) {
    const a = read(f), b = read('en/' + f);
    const ta = [...ACORN.tokenizer(a, { ecmaVersion: 'latest' })], tb = [...ACORN.tokenizer(b, { ecmaVersion: 'latest' })];
    assert.equal(ta.length, tb.length, f + ' : même nombre de jetons');
    for (let i = 0; i < ta.length; i++) {
      const x = ta[i], y = tb[i], label = x.type.label;
      assert.equal(label, y.type.label, f + ' : jeton ' + i);
      if (label !== 'string' && label !== 'template') { assert.equal(String(x.value ?? x.type.label), String(y.value ?? y.type.label), f + ' : seul le texte des chaînes change (' + a.slice(x.start, x.end) + ')'); continue; }
      const v = String(x.value || '').trim(); if (!v || /\s/.test(v)) continue;
      const k = f + '|' + v;
      if (!seen.has(k)) seen.set(k, new Set()); seen.get(k).add(String(y.value || '').trim());
      if (COMPARE.test(a.slice(Math.max(0, x.start - 40), x.start))) compared.set(k, f + ':' + a.slice(0, x.start).split('\n').length);
    }
  }
  const bad = [];
  for (const [k, where] of compared) { const t = seen.get(k); if (t.size > 1) bad.push(where + ' « ' + k.split('|')[1] + ' » → ' + [...t].join(' / ')); }
  assert.deepEqual(bad, [], 'une chaîne comparée par le code a des traductions différentes dans le même fichier');
  /* les données lues par le code (statuts, catégories) gardent leurs identifiants */
  global.window = global; delete global.LK_VEHICULES; delete global.LK_ARMES;
  const src = read('vehicules-data.js'), dst = fs.existsSync(path.join(root, 'en/vehicules-data.js')) ? read('en/vehicules-data.js') : src;
  const ids = s => [...s.matchAll(/"(?:id|cat|st|slot)":"([^"]*)"/g)].map(m => m[1]).join(',');
  assert.equal(ids(dst), ids(src), 'vehicules-data.js : identifiants, catégories et statuts inchangés');
  const sa = read('armes-data.js'), da = fs.existsSync(path.join(root, 'en/armes-data.js')) ? read('en/armes-data.js') : sa;
  assert.equal(ids(da), ids(sa), 'armes-data.js : identifiants, catégories et statuts inchangés');
});

test('calculateur anglais (jsdom) : démarre sans erreur, montants « $1,250 », nombres anglais, phrases du hub en anglais', async () => {
  const p = await load(root, 'en/calculateurs.html');
  try {
    assert.deepEqual(p.errors.filter(e => !/Not implemented|Could not load/.test(e)), [], 'aucune erreur');
    const E = p.w.LKCalcEngine;
    assert.equal(E.lang, 'en');
    assert.equal(E.dollars('1,250', ' '), '$1,250');
    assert.equal(E.parseLocalizedNumber('1,250.5').value, 1250.5);
    assert.equal(E.parseLocalizedNumber('200,000').value, 200000);
    assert.equal(E.plural(0), true); assert.equal(E.plural(1), false); assert.equal(E.plural(2), true);
    assert.equal(E.dateText(new Date(2026, 11, 1)), 'December 1, 2026');
    const H = p.w.LKCalcHub;
    assert.equal(H.parseMoney('I have $200,000 and want 1.5 million'), 1500000);
    assert.equal(H.parseMoney('250k'), 250000);
    assert.equal(H.parseMinutesPerDay('2 hours a day'), 120);
    const r = H.route('I have $200,000 and want to reach 1 million');
    assert.equal(r.tab, 'goal');
    assert.equal(p.d.getElementById('f-goal-capital')?.value, '200000');
    const out = p.d.getElementById('calc-ask-out');
    if (out) { p.d.getElementById('calc-ask-input').value = 'is it worth it?'; p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit', { cancelable: true })); assert.deepEqual(frenchHits(out.textContent), [], 'réponse du hub : ' + out.textContent); }
    const text = p.d.querySelector('main').textContent.replace(/\s+/g, ' ');
    const bad = text.match(/\d[\d\u00a0\u202f ]*\$(?![\d{])/); assert.ok(!bad, 'aucun montant écrit « 1 250 $ » : ' + (bad ? text.slice(Math.max(0, bad.index - 40), bad.index + 10) : ''));
    assert.deepEqual(frenchHits(p.d.title), [], 'titre');
  } finally { p.close(); }
});

test('Léo s’amorce sur la page anglaise (fichiers de /en/) comme sur la page française (fichiers de la racine)', async () => {
  const en = await load(root, 'en/index.html'), fr = await load(root, 'index.html');
  try {
    assert.ok(en.d.getElementById('leo-style'), 'anglais : Léo s’amorce');
    assert.ok(fr.d.getElementById('leo-style'), 'français : Léo s’amorce');
    assert.match(en.d.getElementById('leo-style').getAttribute('href'), /^\/leo\.css\?v=/, 'anglais : la feuille de Léo vient de la racine');
  } finally { en.close(); fr.close(); }
  for (const f of cfg.leoScripts) assert.ok(fs.existsSync(path.join(root, 'en', f)), 'en/' + f);
  const loader = read('en/leo-loader.js'), ui = read('en/leo-ui.js');
  assert.match(loader, /href=name=>\(LANG==='fr'\?'\/':'\/'\+LANG\+'\/'\)\+name/, 'leo-loader.js : fichiers de la langue de la page');
  assert.match(ui, /fetchJSON\(PFX\+'\/'\+'leo-index\.json'\+V\)/, 'leo-ui.js : noyau de la langue de la page');
});

test('Léo anglais : noyau et morceaux traduits (textes affichés), jetons de reconnaissance français, table de réécriture, adresses du français', () => {
  const fr = JSON.parse(read('leo-index.json')), en = JSON.parse(read('en/leo-index.json'));
  assert.equal(fr.lang, undefined, 'noyau français sans langue ni table'); assert.equal(fr.pivot, undefined);
  assert.equal(en.lang, 'en'); assert.ok(Array.isArray(en.pivot) && en.pivot.length > 1000, 'table de réécriture');
  assert.equal(en.revision, fr.revision, 'même révision : les morceaux restent valables');
  const hits = [], see = (t, w) => { const h = frenchHits(t); if (h.length) hits.push(w + ' « ' + String(t).slice(0, 80) + ' » [' + h.slice(0, 3).join(', ') + ']'); };
  (function v(o, k) { if (Array.isArray(o)) o.forEach(x => v(x, k)); else if (o && typeof o === 'object') for (const [kk, x] of Object.entries(o)) v(x, kk); else if (typeof o === 'string') see(o, k); })({ texts: en.texts, templates: en.templates, suggestions: en.suggestions }, '');
  en.knowledge.forEach((k, i) => { see(k.q, 'q ' + k.id); see(k.text, 'text ' + k.id); assert.deepEqual(k.d, fr.knowledge[i].d, 'jetons français gardés : ' + k.id); (k.links || []).forEach(l => assert.ok(!l.url.startsWith('/en/'), 'adresse du français : ' + l.url)); });
  en.categories.forEach((c, i) => { see(c.label, 'catégorie'); assert.deepEqual(c.terms, fr.categories[i].terms); assert.equal(c.route, fr.categories[i].route); });
  for (const f of cfg.leoDonnees.fichiers.filter(x => x !== 'leo-index.json')) { const a = JSON.parse(read(f)), b = JSON.parse(read('en/' + f)); assert.equal(b.revision, a.revision, f); assert.equal((b.items || []).length, (a.items || []).length, f + ' : même nombre de fiches'); }
  const veh = JSON.parse(read('en/leo/vehicules.json')).items; veh.slice(0, 40).forEach(x => { see(x.category, 'category'); see(x.proof || '', 'proof'); });
  assert.deepEqual(hits.slice(0, 10), [], 'aucun français dans les textes de Léo anglais');
});

test('Léo anglais (jsdom) : la question anglaise est comprise, la réponse est en anglais ; le jeu de 512 questions anglaises tient les seuils', async () => {
  const { run } = require('./leo-eval.cjs');
  const r = await run({ lang: 'en' });
  assert.ok(r.accuracy >= 95, 'au moins 95 % de bonnes réponses en anglais (' + r.accuracy + ' %)');
  assert.equal(r.offtopic.refused, r.offtopic.n, 'hors sujet refusés');
  assert.equal(r.withoutSource, 0, 'réponses sourcées');
});

test('clé lk_lang_v1 : rien n’est écrit à l’ouverture (même avec un navigateur anglais) ; un clic dans le menu, « Read in English » ou « No thanks » l’écrit', async () => {
  const nav = w => Object.defineProperty(w.navigator, 'languages', { value: ['en-US', 'en'], configurable: true });
  const p = await load(root, 'index.html', { before: nav });
  try {
    assert.equal(p.w.localStorage.getItem('lk_lang_v1'), null, 'rien d’écrit à l’ouverture');
    const offer = p.d.querySelector('.lk-lang-offer');
    assert.ok(offer, 'bandeau proposé (navigateur en anglais, page traduite)');
    assert.equal(offer.lang, 'en'); assert.match(offer.textContent, /This page is also available in English\.\s*Read in English/);
    assert.equal(offer.querySelector('button').textContent, 'No thanks');
    assert.equal(offer.querySelector('a').getAttribute('href'), 'en/');
    offer.querySelector('button').click();
    assert.equal(p.w.localStorage.getItem('lk_lang_v1'), 'fr', '« No thanks » garde le français');
    assert.equal(p.d.querySelector('.lk-lang-offer'), null, 'bandeau retiré');
  } finally { p.close(); }
  const q = await load(root, 'index.html', { before: nav, storage: { lk_lang_v1: 'fr' } });
  try { assert.equal(q.d.querySelector('.lk-lang-offer'), null, 'choix gardé : plus de bandeau'); } finally { q.close(); }
  const r = await load(root, 'en/calculateurs.html', { before: w => Object.defineProperty(w.navigator, 'languages', { value: ['fr-FR'], configurable: true }) });
  try {
    const offer = r.d.querySelector('.lk-lang-offer'); assert.ok(offer, 'page anglaise, navigateur français : français proposé');
    assert.equal(offer.lang, 'fr'); assert.match(offer.textContent, /Cette page existe aussi en français\.\s*Lire en français/); assert.equal(offer.querySelector('button').textContent, 'Non merci');
    assert.equal(r.w.localStorage.getItem('lk_lang_v1'), null);
    const fr = r.d.querySelector('.lk-langbar a[data-lk-lang="fr"]'); fr.addEventListener('click', e => e.preventDefault()); fr.click();
    assert.equal(r.w.localStorage.getItem('lk_lang_v1'), 'fr', 'clic sur « Français » : choix écrit');
  } finally { r.close(); }
  const s = await load(root, 'contact.html', { before: w => Object.defineProperty(w.navigator, 'languages', { value: ['de-DE', 'fr'], configurable: true }) });
  try { assert.equal(s.d.querySelector('.lk-lang-offer'), null, 'langue du navigateur non publiée, puis français : rien à proposer'); } finally { s.close(); }
});

test('pages françaises inchangées par les langues : seule la barre de langue et les hreflang s’ajoutent', () => {
  const strip = h => h.replace(/<div class="lk-langbar"[^>]*>[\s\S]*?<\/details><\/div><\/div>\n?/g, '').replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]*">\n?/g, '');
  for (const p of ['index.html', 'calculateurs.html', 'vehicules.html', 'contact.html']) {
    const h = read(p), s = strip(h);
    assert.ok(!s.includes('data-lk-langbar') && !s.includes('hreflang="en" href'), p);
    assert.equal((h.match(/data-lk-langbar/g) || []).length, 1, p + ' : une seule barre');
  }
});

test('formulaire de contact anglais : chaque motif garde sa valeur française (celle que api/contact.js accepte) ; les erreurs du serveur ont leur traduction', () => {
  const html = read('en/contact.html'), api = read('api/contact.js');
  const topics = JSON.parse(api.match(/const TOPICS=(\[[^\]]*\])/)[1].replace(/'/g, '"'));
  const opts = [...html.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)];
  assert.ok(opts.length >= topics.length, 'options avec value');
  for (const t of topics) assert.ok(opts.some(o => o[1] === t && o[2] !== t), 'motif « ' + t + ' » : valeur française, libellé anglais');
  const js = read('en/contact.js');
  assert.ok(/localMessage/.test(js) && !/'Choisis un motif dans la liste\.'/.test(js), 'messages du serveur traduits dans en/contact.js');
});

test('page introuvable : sous /en/…, la page 404 anglaise ; liens de langue absolus ; plan du site avec les adresses anglaises indexables', () => {
  assert.match(read('common.js'), /document\.querySelector\('\.e404'\)/, 'common.js : bascule de la page introuvable');
  assert.ok(read('404.html').includes('href="/en/404.html" hreflang="en"'), 'lien absolu vers la 404 anglaise');
  assert.ok(read('en/404.html').includes('href="/404.html" hreflang="fr"'), 'lien absolu vers la 404 française');
  const sm = read('sitemap.xml'), locs = [...sm.matchAll(/<loc>https:\/\/www\.leonidakit\.com\/([^<]*)<\/loc>/g)].map(m => m[1]);
  const fr = locs.filter(u => !u.startsWith('en/')), en = locs.filter(u => u.startsWith('en/'));
  assert.equal(en.length, fr.length, 'une adresse anglaise par adresse française');
  for (const u of en) { const f = 'en/' + (u.slice(3) || 'index.html'); assert.ok(fs.existsSync(path.join(root, f.endsWith('/') ? f + 'index.html' : f)), u); assert.ok(fr.includes(u.slice(3)), 'même page en français : ' + u); }
  assert.ok(!en.some(u => /404\.html$/.test(u)), 'pas de page introuvable dans le plan du site');
});

test('liens vers une page encore en français : badge FR sur les liens de texte, « (in French) » pour les lecteurs d’écran sur tous', () => {
  for (const p of EN.pages) {
    const doc = parse5.parse(read('en/' + p)), bad = [];
    walk(doc, (el, c) => {
      if (!el.tagName || el.tagName !== 'a' || attr(el, 'hreflang') !== 'fr' || attr(el, 'data-lk-lang') !== undefined) return;
      const html = parse5.serialize(el);
      if (!html.includes('<span class="sr-only"> (in French)</span>')) bad.push(attr(el, 'href'));
    });
    assert.deepEqual(bad.slice(0, 5), [], p);
  }
});

test('Tuto anglais : captures prises dans le calculateur anglais quand elles existent (outils/tuto-captures-en.json), zones repérées à jour', () => {
  const f = path.join(root, 'outils/tuto-captures-en.json'); if (!fs.existsSync(f)) return;
  const T = JSON.parse(fs.readFileSync(f, 'utf8')), html = read('en/tuto.html'), fr = read('tuto.html');
  for (const [name, d] of Object.entries(T)) {
    assert.ok(fs.existsSync(path.join(root, d.src.slice(1))), d.src);
    if (fr.includes('data-capture="' + name + '"') || fr.includes('data-capture-mobile="' + name + '"')) assert.ok(html.includes(d.src), 'en/tuto.html utilise ' + d.src);
  }
  assert.ok(!/src="\/img\/tuto\/(?!en\/)[^"]+"/.test(html), 'aucune capture française dans le Tuto anglais');
});
