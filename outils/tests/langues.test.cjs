'use strict';
/* v7.60 (langues), v7.61 (espagnol, tout le site) : versions traduites du site (/en/…, /es/…), sélecteur « Changer la
   langue », bandeau de suggestion. Vérifie sans navigateur, pour chaque langue publiée : configuration, dossier à jour avec
   la mémoire de traduction, pages traduites (langue, liens, hreflang, Léo présent seulement dans les langues de « leo »,
   aucun français visible), pages françaises (barre de langue, hreflang, plan du site), scripts traduits (seules des
   chaînes changent, aucun identifiant comparé par le code n'est traduit d'un seul côté), calculateur anglais et espagnol
   dans jsdom (montants « $1,250 » / « 1.250 $ », nombres de la langue, phrases du hub), clé lk_lang_v1 écrite seulement
   après un clic. Le parcours de chaque outil dans un vrai navigateur est dans langues-browser.cjs.
   v7.64 (fusion) : allemand (calculateur « 1.250 $ », « 1. Oktober 2026 », phrases du hub en allemand ; pages sans
   français ni anglais visible : foreignHits) ; page introuvable de chaque langue ; Léo dans les cinq langues. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('fs'), path = require('path');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../..'));
const L = require(path.join(root, 'outils/langues.cjs'));
const { frenchHits: frOnly, foreignHits } = require('./langues-helper.cjs');
/* une page allemande ne doit montrer ni français ni anglais ; les autres langues : pas de français */
const frenchHits = (text, code = 'en') => code === 'de' ? foreignHits(text, code) : frOnly(text, code);
const { load } = require('./runtime-helper.cjs');
const parse5 = require('parse5');
const ACORN = require('acorn');
const cfg = L.config(root), EN = cfg.langues.find(l => l.code === 'en');
/* langues publiées autres que le français (dossier, pages) */
const LANGS = cfg.langues.filter(l => l.etat === 'publiee' && l.code !== cfg.source);
const url = (l, p) => SITE + (l.dossier ? l.dossier + '/' : '') + (p === 'index.html' ? '' : p.replace(/(^|\/)index\.html$/, '$1'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const SITE = 'https://www.leonidakit.com/';

/* ---- petits outils de lecture HTML ---- */
const attr = (el, n) => (el.attrs || []).find(a => a.name === n)?.value;
function walk(node, fn, ctx = {}) {
  const el = node.tagName ? node : null;
  let c = ctx;
  if (el) {
    const skip = ['script', 'style', 'template', 'svg'].includes(el.tagName) || attr(el, 'translate') === 'no' || attr(el, 'data-lk-langbar') !== undefined || attr(el, 'lang') === 'fr' || attr(el, 'hreflang') === 'fr' && el.tagName === 'link';
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

const OG = { en: 'en_US', es: 'es_ES', it: 'it_IT', de: 'de_DE' };
const LANG_CODES = new Set(cfg.langues.map(l => l.code));
const PARSE = h => parse5.parse(h, { scriptingEnabled: false });
const NOT_INDEXED = h => /<meta name="robots" content="[^"]*noindex/i.test(h) || /http-equiv="refresh"/i.test(h);

test('langues.json : le français est la source, chaque langue publiée a un dossier, des libellés complets et des pages françaises existantes', () => {
  assert.equal(cfg.source, 'fr');
  const codes = cfg.langues.map(l => l.code); assert.equal(new Set(codes).size, codes.length, 'codes uniques');
  for (const l of cfg.langues.filter(x => x.etat === 'publiee')) {
    for (const k of ['changer', 'accueil', 'offre', 'aller', 'rester']) assert.ok(l.libelles && l.libelles[k], l.code + ' : libellé ' + k);
    if (l.code === cfg.source) continue;
    assert.ok(l.libelles.versFr, l.code + ' : libellé versFr');
    assert.ok(/^[a-z]{2}$/.test(l.dossier), l.code + ' : dossier');
    assert.ok(Array.isArray(l.pages) && l.pages.length, l.code + ' : pages (« * » = toutes les pages)');
    for (const p of l.pages) assert.ok(fs.existsSync(path.join(root, p)), l.code + ' : la page française ' + p + ' existe');
  }
  for (const l of cfg.langues.filter(x => x.etat === 'prevue')) assert.ok(!fs.existsSync(path.join(root, l.dossier)), l.code + ' prévue : aucun dossier publié');
  assert.equal(cfg.leo[0], 'fr', 'Léo d’abord en français');
  for (const c of cfg.leo) assert.ok(cfg.langues.some(l => l.code === c && l.etat === 'publiee'), 'Léo en ' + c + ' : langue publiée');
  const es = cfg.langues.find(l => l.code === 'es');
  if (es && es.etat === 'publiee') {
    const all = frPages().filter(p => { const h = read(p); return p !== '404.html' && /<body[\s>]/.test(h) && !/http-equiv=["']refresh/i.test(h); });
    assert.deepEqual(all.filter(p => !es.pages.includes(p)).slice(0, 10), [], 'espagnol : toutes les pages du site');
  }
});

for (const LG of LANGS) {
  const code = LG.code, dir = LG.dossier, leo = cfg.leo.includes(code);

  test(dir + '/ est à jour : la génération sans écriture donne exactement les fichiers présents ; rien sans traduction, aucune balise cassée, aucun conflit', () => {
    const r = L.generer(code, root, { force: true, ecrire: false });
    assert.deepEqual(r.missing.map(m => m.text).slice(0, 10), [], 'textes sans traduction (node outils/langues.cjs ' + code + ' --extraire)');
    assert.deepEqual(r.broken, [], 'balises <n> conservées dans chaque traduction');
    assert.deepEqual(r.conflicts, [], 'une seule traduction par texte');
    for (const [rel, content] of r.outputs) assert.ok(fs.existsSync(path.join(root, rel)) && read(rel) === content, rel + ' à jour (relancer node outils/regenerer.cjs)');
    const expected = new Set([...r.outputs.keys()].filter(k => k.startsWith(dir + '/')).map(k => k.slice(dir.length + 1)));
    const present = []; (function rec(d) { for (const f of fs.readdirSync(path.join(root, dir, d))) { const rel = d ? d + '/' + f : f; if (fs.statSync(path.join(root, dir, rel)).isDirectory()) rec(rel); else present.push(rel); } })('');
    assert.deepEqual(present.filter(f => !expected.has(f)).slice(0, 10), [], dir + '/ : aucun fichier en trop');
  });

  test('pages ' + code + ' : lang, canonical et og:url en /' + dir + '/, hreflang de chaque version, og:locale, Léo ' + (leo ? 'présent' : 'absent') + ', barre de langue', () => {
    for (const p of LG.pages) {
      const html = read(dir + '/' + p), u = url(LG, p), frUrl = url({ dossier: '' }, p);
      assert.match(html, new RegExp('<html lang="' + code + '"'), p);
      /* canonical et og:url : ceux de la page française, portés dans la langue (une fiche fusionnée renvoie à sa liste) */
      const port = fu => { if (!fu.startsWith(SITE)) return fu; const rest = fu.slice(SITE.length), cp = rest.split(/[?#]/)[0] || 'index.html'; return LG.pages.includes(cp) ? url(LG, cp) + rest.slice(rest.split(/[?#]/)[0].length) : fu; };
      const frHtml = read(p), frCanon = (frHtml.match(/<link rel="canonical" href="([^"]+)">/) || [])[1], frOg = (frHtml.match(/property="og:url" content="([^"]+)"/) || [])[1];
      if (frCanon) assert.ok(html.includes('<link rel="canonical" href="' + port(frCanon) + '">'), p + ' : canonical ' + port(frCanon));
      if (frOg) assert.ok(html.includes('property="og:url" content="' + port(frOg) + '"'), p + ' : og:url ' + port(frOg));
      /* v7.64 : une page non indexée (introuvable, redirection) n'a aucun hreflang ; sinon chaque version, x-default = anglais */
      if (NOT_INDEXED(html)) assert.ok(!/<link rel="alternate" hreflang=/.test(html), p + ' : pas de hreflang sur une page non indexée');
      else {
        const xdef = EN && EN.pages.includes(p) ? url(EN, p) : frUrl;
        assert.ok(html.includes('<link rel="alternate" hreflang="fr" href="' + frUrl + '">') && html.includes('<link rel="alternate" hreflang="' + code + '" href="' + u + '">') && html.includes('<link rel="alternate" hreflang="x-default" href="' + xdef + '">'), p + ' : hreflang');
        for (const o of LANGS.filter(x => x.code !== code)) assert.equal(html.includes('<link rel="alternate" hreflang="' + o.code + '" href="' + url(o, p) + '">'), o.pages.includes(p), p + ' : hreflang ' + o.code + ' seulement si la page existe');
        /* og:locale:alternate : les autres versions de la page */
        if (/property="og:locale"/.test(html)) for (const o of [cfg.langues.find(l => l.code === cfg.source), ...LANGS.filter(x => x.code !== code && x.pages.includes(p))]) assert.ok(html.includes('<meta property="og:locale:alternate" content="' + o.og + '">'), p + ' : og:locale:alternate ' + o.og);
      }
      /* v7.64 : titres pour les moteurs de recherche en « GTA 6 » (la page garde « GTA VI ») */
      const tt = (html.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
      assert.ok(!/\bGTA VI\b/.test(tt), p + ' : titre en « GTA 6 » : ' + tt);
      if (/property="og:locale"/.test(html)) assert.ok(html.includes('property="og:locale" content="' + (LG.og || OG[code]) + '"'), p + ' : og:locale');
      if (!leo) { assert.ok(!/<script[^>]+src="[^"]*leo(?:-widget|-core|\.js)/.test(html), p + ' : aucun script de Léo'); assert.ok(!/leo-index\.json/.test(html), p + ' : index de Léo non chargé'); }
      if (/http-equiv="refresh"/i.test(html)) { assert.ok(!html.includes('data-lk-langbar'), p + ' : redirection sans barre'); continue; }
      assert.match(html, /<div class="lk-langbar" data-lk-langbar translate="no">/, p + ' : barre de langue');
      assert.ok(html.includes('<a aria-current="true" hreflang="' + code + '" lang="' + code + '" data-lk-lang="' + code + '">' + LG.nom + '</a>'), p + ' : ' + LG.nom + ' coché');
    }
  });

  test('pages ' + code + ' : chaque lien mène à un fichier qui existe ; page traduite → /' + dir + '/, autre page → page française marquée hreflang="fr"', () => {
    for (const p of LG.pages) {
      const doc = PARSE(read(dir + '/' + p)), bad = [];
      walk(doc, el => {
        if (!el.tagName) return;
        for (const name of ['href', 'src']) {
          const v = attr(el, name); if (!v || /^(?:[a-z]+:|\/\/|#|data:)/i.test(v) || el.tagName === 'link' && attr(el, 'rel') === 'alternate') continue;
          const target = new URL(v, SITE + dir + '/' + p).pathname, file = target.endsWith('/') ? target + 'index.html' : target;
          if (!fs.existsSync(path.join(root, decodeURIComponent(file)))) bad.push(name + '=' + v + ' (introuvable)');
          if (name === 'href' && el.tagName === 'a' && /\.html$|\/$/.test(file) && attr(el, 'data-lk-lang') === undefined) {
            const inL = file.startsWith('/' + dir + '/'), page = file.replace(new RegExp('^/(?:' + dir + '/)?'), '');
            if (/^\/(?:en|es|it|de|pt)\//.test(file) && !inL) bad.push(v + ' : lien vers une autre langue');
            if (inL && !LG.pages.includes(page)) bad.push(v + ' : page non traduite dans /' + dir + '/');
            if (!inL && LG.pages.includes(page)) bad.push(v + ' : la version ' + code + ' existe');
            if (!inL && attr(el, 'hreflang') !== 'fr') bad.push(v + ' : lien vers le français sans hreflang="fr"');
          }
        }
      });
      assert.deepEqual(bad.slice(0, 8), [], p);
    }
  });

  test('pages ' + code + ' : aucun français visible (textes, attributs lus, titre, description, données structurées)', () => {
    const READ = ['title', 'alt', 'aria-label', 'placeholder', 'aria-description', 'data-short', 'data-label', 'data-ask'];
    for (const p of LG.pages) {
      const html = read(dir + '/' + p), doc = PARSE(html), hits = [];
      const see = (text, where) => { const h = frenchHits(text, code); if (h.length) hits.push(where + ' « ' + String(text).trim().slice(0, 90) + ' » [' + h.slice(0, 4).join(', ') + ']'); };
      walk(doc, (n, c) => {
        if (c.skip) return;
        if (n.nodeName === '#text') { if (n.value.trim()) see(n.value, 'texte'); return; }
        for (const a of READ) { const v = attr(n, a); if (v) see(v, a); }
        if (n.tagName === 'meta' && /^(?:description|og:title|og:description|twitter:title|twitter:description|og:image:alt)$/.test(attr(n, 'name') || attr(n, 'property') || '')) see(attr(n, 'content'), 'meta');
      });
      for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
        (function visit(o, k) { if (Array.isArray(o)) o.forEach(x => visit(x, k)); else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) visit(v, kk); else if (typeof o === 'string' && cfg.jsonld.includes(k)) see(o, 'JSON-LD ' + k); })(JSON.parse(m[1]), '');
      }
      /* données de page lues par un script (carnets) : textes affichés */
      for (const [id, spec] of Object.entries(cfg.jsonPages || {})) {
        const m = html.match(new RegExp('<script type="application/json" id="' + id + '">([\\s\\S]*?)</script>')); if (!m) continue;
        (function visit(o, k) { if (Array.isArray(o)) o.forEach(x => visit(x, k)); else if (o && typeof o === 'object') { for (const [kk, v] of Object.entries(o)) if (!(spec.figees || []).includes(kk)) visit(v, kk); } else if (typeof o === 'string' && spec.textes.includes(k)) see(o, 'données ' + k); })(JSON.parse(m[1]), '');
      }
      assert.deepEqual(hits.slice(0, 12), [], p);
    }
  });

  test('scripts ' + code + ' : mêmes jetons que la source (seules des chaînes changent) ; un identifiant comparé par le code est traduit partout ou nulle part', () => {
    const COMPARE = /(?:===|!==|==|!=|\bcase|\.includes\(|\.indexOf\(|\.has\(|\.startsWith\()\s*$/;
    const seen = new Map(), compared = new Map();
    /* règles « si » de la mémoire (fichier::texte → liste) : un même mot, identifiant à un endroit et texte lu à un autre,
       voulu différent ; elles restent vérifiées par les parcours dans le navigateur */
    const ruled = new Set(); for (const f of fs.readdirSync(path.join(root, 'outils/langues', code)).filter(x => x.endsWith('.json') && !x.startsWith('_'))) for (const [k, v] of Object.entries(JSON.parse(read('outils/langues/' + code + '/' + f)))) if (k.includes('::') && Array.isArray(v)) ruled.add(k.replace(/::\s+|\s+$/g, m => m.trim() ? m : '').trim());
    for (const f of fs.readdirSync(path.join(root, dir)).filter(x => x.endsWith('.js'))) {
      const a = read(f), b = read(dir + '/' + f);
      const ta = [...ACORN.tokenizer(a, { ecmaVersion: 'latest' })], tb = [...ACORN.tokenizer(b, { ecmaVersion: 'latest' })];
      assert.equal(ta.length, tb.length, f + ' : même nombre de jetons');
      for (let i = 0; i < ta.length; i++) {
        const x = ta[i], y = tb[i], label = x.type.label;
        assert.equal(label, y.type.label, f + ' : jeton ' + i);
        if (label !== 'string' && label !== 'template') { if (label === 'regexp') continue; assert.equal(String(x.value ?? x.type.label), String(y.value ?? y.type.label), f + ' : seul le texte des chaînes change (' + a.slice(x.start, x.end) + ')'); continue; }
        const v0 = String(x.value || ''), v = v0.trim(); if (!v || /\s/.test(v) || LANG_CODES.has(v)) continue;
        /* v7.64 : la chaîne exacte (« missions » identifiant et « missions » précédé d'une espace, texte lu, sont deux chaînes) */
        const k = f + '|' + v0;
        if (!seen.has(k)) seen.set(k, new Set()); seen.get(k).add(String(y.value || ''));
        if (COMPARE.test(a.slice(Math.max(0, x.start - 40), x.start))) compared.set(k, f + ':' + a.slice(0, x.start).split('\n').length);
      }
    }
    const bad = [];
    for (const [k, where] of compared) { const t = seen.get(k), [f, v] = k.split('|'); if (t.size > 1 && !ruled.has(f + '::' + v)) bad.push(where + ' « ' + v + ' » → ' + [...t].join(' / ')); }
    assert.deepEqual(bad, [], 'une chaîne comparée par le code a des traductions différentes dans le même fichier');
    const ids = s => [...s.matchAll(/"(?:id|cat|st|slot)":"([^"]*)"/g)].map(m => m[1]).join(',');
    for (const f of ['vehicules-data.js', 'armes-data.js']) if (fs.existsSync(path.join(root, dir, f))) assert.equal(ids(read(dir + '/' + f)), ids(read(f)), f + ' : identifiants, catégories et statuts inchangés');
  });

  test('formulaire de contact ' + code + ' : chaque motif garde sa valeur française (celle que api/contact.js accepte) ; les erreurs du serveur ont leur traduction', () => {
    if (!LG.pages.includes('contact.html')) return;
    const html = read(dir + '/contact.html'), api = read('api/contact.js');
    const topics = JSON.parse(api.match(/const TOPICS=(\[[^\]]*\])/)[1].replace(/'/g, '"'));
    const opts = [...html.matchAll(/<option value="([^"]*)">([^<]*)<\/option>/g)];
    assert.ok(opts.length >= topics.length, 'options avec value');
    for (const t of topics) assert.ok(opts.some(o => o[1] === t && o[2] !== t), 'motif « ' + t + ' » : valeur française, libellé traduit');
    const js = read(dir + '/contact.js');
    assert.ok(/localMessage/.test(js) && !/'Choisis un motif dans la liste\.'/.test(js), 'messages du serveur traduits dans ' + dir + '/contact.js');
  });

  test('liens ' + code + ' vers une page encore en français : badge FR sur les liens de texte, « (' + LG.libelles.versFr + ') » pour les lecteurs d’écran sur tous', () => {
    for (const p of LG.pages) {
      const doc = PARSE(read(dir + '/' + p)), bad = [];
      walk(doc, (el, c) => {
        if (!el.tagName || el.tagName !== 'a' || attr(el, 'hreflang') !== 'fr' || attr(el, 'data-lk-lang') !== undefined) return;
        const html = parse5.serialize(el);
        if (!html.includes('<span class="sr-only"> (' + LG.libelles.versFr + ')</span>')) bad.push(attr(el, 'href'));
      });
      assert.deepEqual(bad.slice(0, 5), [], p);
    }
  });

  test('Tuto ' + code + ' : captures prises dans le calculateur de la langue quand elles existent (outils/tuto-captures-' + code + '.json), zones repérées à jour', () => {
    const f = path.join(root, 'outils/tuto-captures-' + code + '.json'); if (!fs.existsSync(f) || !LG.pages.includes('tuto.html')) return;
    const T = JSON.parse(fs.readFileSync(f, 'utf8')), html = read(dir + '/tuto.html'), fr = read('tuto.html');
    for (const [name, d] of Object.entries(T)) {
      assert.ok(fs.existsSync(path.join(root, d.src.slice(1))), d.src);
      if (fr.includes('data-capture="' + name + '"') || fr.includes('data-capture-mobile="' + name + '"')) assert.ok(html.includes(d.src), dir + '/tuto.html utilise ' + d.src);
    }
    assert.ok(!new RegExp('src="/img/tuto/(?!' + code + '/)[^"]+"').test(html), 'aucune capture française dans le Tuto ' + code);
  });
}

test('pages françaises : barre « Changer la langue » en haut de chaque page (sauf redirections), lien vers chaque langue, hreflang sur les pages traduites, plan du site', () => {
  const list = frPages(); assert.ok(list.length > 300, 'pages françaises trouvées');
  const missing = [];
  for (const p of list) {
    const html = read(p);
    if (!/<body[\s>]/.test(html)) continue; // fichier de vérification (google….html) : pas une page
    if (html.includes('http-equiv="refresh"')) { assert.ok(!html.includes('data-lk-langbar'), p + ' : redirection sans barre'); continue; }
    if (!/<div class="lk-langbar" data-lk-langbar translate="no">/.test(html)) { missing.push(p); continue; }
    assert.ok(/<a aria-current="true" hreflang="fr" lang="fr" data-lk-lang="fr">Français<\/a>/.test(html), p + ' : français coché');
    const depth = p.split('/').length - 1;
    for (const LG of LANGS) {
      const tr = LG.pages.includes(p), code = LG.code;
      const href = (p === '404.html' ? '/' : '../'.repeat(depth)) + LG.dossier + '/' + (tr ? p : 'index.html').replace(/(^|\/)index\.html$/, '$1');
      assert.ok(html.includes('href="' + href + '" hreflang="' + code + '" lang="' + code + '" data-lk-lang="' + code + '"'), p + ' : lien vers ' + code + ' ' + href);
      assert.equal(html.includes('<link rel="alternate" hreflang="' + code + '" href="' + url(LG, p) + '">'), tr && !NOT_INDEXED(html), p + ' : hreflang ' + code + (tr ? ' (aucun sur une page non indexée)' : ' absent sans traduction'));
    }
  }
  assert.deepEqual(missing.slice(0, 10), [], 'pages sans barre de langue');
  const sm = read('sitemap.xml');
  for (const LG of LANGS) for (const p of LG.pages) { const h = read(p); if (/name=["']robots["'][^>]*noindex/i.test(h) || !/rel="canonical"/.test(h)) continue; assert.ok(sm.includes('<loc>' + url(LG, p) + '</loc>'), 'sitemap : ' + LG.dossier + '/' + p); }
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
    const bad = text.match(/\d[\d   ]*\$(?![\d{])/); assert.ok(!bad, 'aucun montant écrit « 1 250 $ » : ' + (bad ? text.slice(Math.max(0, bad.index - 40), bad.index + 10) : ''));
    assert.deepEqual(frenchHits(p.d.title), [], 'titre');
  } finally { p.close(); }
});

test('calculateur espagnol (jsdom) : démarre sans erreur, montants « 1.250 $ », nombres espagnols, grands nombres en mots, phrases du hub en espagnol', async () => {
  if (!LANGS.some(l => l.code === 'es')) return;
  const p = await load(root, 'es/calculateurs.html');
  try {
    assert.deepEqual(p.errors.filter(e => !/Not implemented|Could not load/.test(e)), [], 'aucune erreur');
    const E = p.w.LKCalcEngine;
    assert.equal(E.lang, 'es');
    assert.equal(E.dollars('1.250', ' '), '1.250 $');
    assert.equal(E.parseLocalizedNumber('1.250,5').value, 1250.5);
    assert.equal(E.parseLocalizedNumber('200.000').value, 200000);
    assert.equal(E.parseLocalizedNumber('1,5').value, 1.5);
    assert.equal(E.plural(0), true); assert.equal(E.plural(1), false); assert.equal(E.plural(2), true);
    assert.equal(E.dateText(new Date(2026, 11, 1)), '1 de diciembre de 2026');
    const H = p.w.LKCalcHub;
    assert.equal(H.parseMoney('Tengo 200.000 $ y quiero 1,5 millones'), 1500000);
    assert.equal(H.parseMoney('250 mil'), 250000);
    assert.equal(H.parseMinutesPerDay('2 horas al día'), 120);
    const r = H.route('Tengo 200.000 $ y quiero llegar a 1 millón');
    assert.equal(r.tab, 'goal');
    assert.equal(p.d.getElementById('f-goal-capital')?.value, '200000');
    const out = p.d.getElementById('calc-ask-out');
    if (out) { p.d.getElementById('calc-ask-input').value = '¿vale la pena?'; p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit', { cancelable: true })); assert.deepEqual(frenchHits(out.textContent, 'es'), [], 'réponse du hub : ' + out.textContent); }
    const text = p.d.querySelector('main').textContent.replace(/\s+/g, ' ');
    assert.ok(!/\d million\b|\bmillions\b|\bmilliards?\b/.test(text), 'grands nombres en mots espagnols');
    const bad = text.match(/\d{1,3}(?:[   ]\d{3})+\s*\$/); assert.ok(!bad, 'aucun montant écrit « 1 250 $ » à la française : ' + (bad ? bad[0] : ''));
    assert.deepEqual(frenchHits(p.d.title, 'es'), [], 'titre');
  } finally { p.close(); }
});

test('calculateur italien (jsdom) : démarre sans erreur, montants « 12.500 $ », nombres italiens, grands nombres en mots, phrases du hub en italien', async () => {
  if (!LANGS.some(l => l.code === 'it')) return;
  const p = await load(root, 'it/calculateurs.html');
  try {
    assert.deepEqual(p.errors.filter(e => !/Not implemented|Could not load/.test(e)), [], 'aucune erreur');
    const E = p.w.LKCalcEngine;
    assert.equal(E.lang, 'it');
    assert.equal(E.dollars('12.500', ' '), '12.500 $');
    assert.equal(E.parseLocalizedNumber('1.250,5').value, 1250.5);
    assert.equal(E.parseLocalizedNumber('200.000').value, 200000);
    assert.equal(E.parseLocalizedNumber('1,5').value, 1.5);
    assert.equal(E.plural(0), true); assert.equal(E.plural(1), false); assert.equal(E.plural(2), true);
    assert.equal(E.dateText(new Date(2026, 11, 1)), '1 dicembre 2026');
    const H = p.w.LKCalcHub;
    assert.equal(H.parseMoney('Ho 200.000 $ e voglio 1,5 milioni'), 1500000);
    assert.equal(H.parseMoney('250 mila'), 250000);
    assert.equal(H.parseMinutesPerDay('2 ore al giorno'), 120);
    const r = H.route('Ho 200.000 $ e voglio arrivare a 1 milione');
    assert.equal(r.tab, 'goal');
    assert.equal(p.d.getElementById('f-goal-capital')?.value, '200000');
    const out = p.d.getElementById('calc-ask-out');
    if (out) { p.d.getElementById('calc-ask-input').value = 'ne vale la pena?'; p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit', { cancelable: true })); assert.deepEqual(frenchHits(out.textContent, 'it'), [], 'réponse du hub : ' + out.textContent); }
    const text = p.d.querySelector('main').textContent.replace(/\s+/g, ' ');
    assert.ok(!/\d million\b|\bmillions\b|\bmilliards?\b/.test(text), 'grands nombres en mots italiens');
    const bad = text.match(/\d{1,3}(?:[ \u00a0\u202f]\d{3})+\s*\$/); assert.ok(!bad, 'aucun montant écrit « 1 250 $ » à la française : ' + (bad ? bad[0] : ''));
    assert.deepEqual(frenchHits(p.d.title, 'it'), [], 'titre');
  } finally { p.close(); }
});

test('calculateur allemand (jsdom) : démarre sans erreur, montants « 1.250 $ », nombres allemands, date « 1. Oktober 2026 », phrases du hub en allemand', async () => {
  if (!LANGS.some(l => l.code === 'de')) return;
  const p = await load(root, 'de/calculateurs.html');
  try {
    assert.deepEqual(p.errors.filter(e => !/Not implemented|Could not load/.test(e)), [], 'aucune erreur');
    const E = p.w.LKCalcEngine;
    assert.equal(E.lang, 'de');
    assert.equal(E.dollars('1.250', ' '), '1.250 $');
    /* « 1.500 » tapé vaut 1 500 (le point groupe les milliers), jamais 1,5 */
    assert.equal(E.parseLocalizedNumber('1.250,5').value, 1250.5);
    assert.equal(E.parseLocalizedNumber('200.000').value, 200000);
    assert.equal(E.parseLocalizedNumber('1.500').value, 1500);
    assert.equal(E.parseLocalizedNumber('1,5').value, 1.5);
    assert.equal(E.plural(0), true); assert.equal(E.plural(1), false); assert.equal(E.plural(2), true);
    assert.equal(E.dateText(new Date(2026, 9, 1)), '1. Oktober 2026');
    const H = p.w.LKCalcHub;
    assert.equal(H.parseMoney('Ich habe 200.000 $ und will 1,5 Millionen'), 1500000);
    assert.equal(H.parseMoney('250 Tausend'), 250000);
    assert.equal(H.parseMoney('250k'), 250000);
    assert.equal(H.parseMinutesPerDay('2 Stunden am Tag'), 120);
    const r = H.route('Ich habe 200.000 $ und will 1 Million haben, 2 Stunden am Tag');
    assert.equal(r.tab, 'goal');
    assert.equal(p.d.getElementById('f-goal-capital')?.value, '200000');
    assert.equal(p.d.getElementById('f-goal-target')?.value, '1000000');
    assert.equal(p.d.getElementById('f-goal-dailyMinutes')?.value, '120');
    const out = p.d.getElementById('calc-ask-out');
    if (out) { p.d.getElementById('calc-ask-input').value = 'Lohnt sich das?'; p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit', { cancelable: true })); assert.deepEqual(frenchHits(out.textContent, 'de'), [], 'réponse du hub : ' + out.textContent); }
    /* chaque texte de la page à part : jamais « $1,250 » (anglais), ni « 1 250 $ » (français), ni « 1,250 $ » */
    const main = p.d.querySelector('main'), bad = [];
    { const w = p.d.createTreeWalker(main, p.w.NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!t || n.parentElement.closest('script,style,template')) continue;
      if (/\$[   ]?\d/.test(t)) bad.push('« $1,250 » : ' + t.slice(0, 80));
      if (/\d{1,3}(?:[   ]\d{3})+[   ]?\$/.test(t)) bad.push('« 1 250 $ » : ' + t.slice(0, 80));
      if (/\d{1,3}(?:,\d{3})+(?![\d,])[   ]?\$/.test(t)) bad.push('« 1,250 $ » : ' + t.slice(0, 80)); } }
    assert.deepEqual(bad.slice(0, 6), [], 'montants écrits à l’allemande');
    assert.deepEqual(frenchHits(p.d.title, 'de'), [], 'titre');
  } finally { p.close(); }
});

test('page introuvable : sous /<langue>/…, la page 404 de la langue ; liens de langue absolus ; jamais dans le plan du site', () => {
  assert.match(read('common.js'), /document\.querySelector\('\.e404'\)/, 'common.js : bascule de la page introuvable');
  for (const LG of LANGS) {
    const dir = LG.dossier, code = LG.code;
    assert.ok(fs.existsSync(path.join(root, dir, '404.html')), dir + '/404.html');
    assert.ok(read('404.html').includes('href="/' + dir + '/404.html" hreflang="' + code + '"'), 'lien absolu vers la 404 ' + code);
    assert.ok(read(dir + '/404.html').includes('href="/404.html" hreflang="fr"'), code + ' : lien absolu vers la 404 française');
    for (const O of LANGS.filter(l => l !== LG)) assert.ok(read(dir + '/404.html').includes('href="/' + O.dossier + '/404.html" hreflang="' + O.code + '"'), code + ' : lien absolu vers la 404 ' + O.code);
    assert.match(read(dir + '/404.html'), /<meta name="robots" content="noindex/, code + ' : 404 non indexée');
  }
  for (const name of ['sitemap.xml', 'sitemap-fiches.xml']) if (fs.existsSync(path.join(root, name))) assert.ok(!/404\.html<\/loc>/.test(read(name)), name + ' : pas de page introuvable');
});

test('Léo : absent d’une page dans une langue hors de « leo » ; présent en français et dans chaque langue de « leo » (index de la langue)', async () => {
  for (const LG of LANGS) {
    const page = LG.pages.includes('index.html') ? 'index.html' : LG.pages[0];
    const x = await load(root, LG.dossier + '/' + page);
    try {
      if (cfg.leo.includes(LG.code)) {
        assert.ok(x.d.getElementById('leo-style'), LG.code + ' : Léo s’amorce');
        assert.ok(fs.existsSync(path.join(root, LG.dossier, 'leo-index.json')), LG.code + ' : index de Léo de la langue');
        const ix = JSON.parse(read(LG.dossier + '/leo-index.json'));
        assert.equal(ix.lang, LG.code); assert.equal(ix.prefix, '/' + LG.dossier);
        const bad = []; for (const k of ix.knowledge) for (const l of k.links || []) { const u = String(l.url || ''); if (!u.startsWith('/') || u.startsWith('//')) continue; const pg = u.slice(1).split(/[?#]/)[0] || 'index.html'; if (!u.startsWith('/' + LG.dossier + '/') && LG.pages.includes(pg)) bad.push(u); }
        assert.deepEqual(bad.slice(0, 5), [], LG.code + ' : liens de Léo vers les pages de la langue');
      } else {
        assert.equal(x.d.getElementById('leo-style'), null, LG.code + ' : pas de Léo');
        assert.ok(x.requests.every(u => !/leo/.test(u)), LG.code + ' : rien de Léo téléchargé');
      }
    } finally { x.close(); }
  }
  const fr = await load(root, 'index.html');
  try { assert.ok(fr.d.getElementById('leo-style'), 'français : Léo s’amorce'); } finally { fr.close(); }
});

test('clé lk_lang_v1 : rien n’est écrit à l’ouverture (même avec un navigateur dans une autre langue) ; un clic dans le menu, « Read in English » / « Leer en español » / « Leggi in italiano » / « Auf Deutsch lesen » ou « No thanks » l’écrit', async () => {
  const nav = langs => w => Object.defineProperty(w.navigator, 'languages', { value: langs, configurable: true });
  const p = await load(root, 'index.html', { before: nav(['en-US', 'en']) });
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
  const q = await load(root, 'index.html', { before: nav(['en-US', 'en']), storage: { lk_lang_v1: 'fr' } });
  try { assert.equal(q.d.querySelector('.lk-lang-offer'), null, 'choix gardé : plus de bandeau'); } finally { q.close(); }
  if (LANGS.some(l => l.code === 'es')) {
    const e = await load(root, 'vehicules.html', { url: 'https://www.leonidakit.com/vehicules.html', before: nav(['es-ES', 'es']) });
    try {
      const offer = e.d.querySelector('.lk-lang-offer'); assert.ok(offer, 'navigateur espagnol : bandeau proposé');
      assert.equal(offer.lang, 'es'); assert.match(offer.textContent, /Esta página también está disponible en español\.\s*Leer en español/);
      assert.equal(offer.querySelector('button').textContent, 'No, gracias');
      assert.equal(offer.querySelector('a').getAttribute('href'), 'es/vehicules.html');
      assert.equal(e.w.localStorage.getItem('lk_lang_v1'), null);
    } finally { e.close(); }
    if (LANGS.some(l => l.code === 'it')) {
      const i = await load(root, 'armes.html', { url: 'https://www.leonidakit.com/armes.html', before: nav(['it-IT', 'it']) });
      try {
        const offer = i.d.querySelector('.lk-lang-offer'); assert.ok(offer, 'navigateur italien : bandeau proposé');
        assert.equal(offer.lang, 'it'); assert.match(offer.textContent, /Questa pagina è disponibile anche in italiano\.\s*Leggi in italiano/);
        assert.equal(offer.querySelector('button').textContent, 'No, grazie');
        assert.equal(offer.querySelector('a').getAttribute('href'), 'it/armes.html');
        assert.equal(i.w.localStorage.getItem('lk_lang_v1'), null);
      } finally { i.close(); }
    }
    const s = await load(root, 'es/vehicules.html', { before: nav(['fr-FR']) });
    try {
      const offer = s.d.querySelector('.lk-lang-offer'); assert.ok(offer, 'page espagnole, navigateur français : français proposé');
      assert.equal(offer.lang, 'fr'); assert.match(offer.textContent, /Cette page existe aussi en français\.\s*Lire en français/);
      assert.equal(offer.querySelector('a').getAttribute('href'), '../vehicules.html');
    } finally { s.close(); }
  }
  const r = await load(root, 'en/calculateurs.html', { before: nav(['fr-FR']) });
  try {
    const offer = r.d.querySelector('.lk-lang-offer'); assert.ok(offer, 'page anglaise, navigateur français : français proposé');
    assert.equal(offer.lang, 'fr'); assert.match(offer.textContent, /Cette page existe aussi en français\.\s*Lire en français/); assert.equal(offer.querySelector('button').textContent, 'Non merci');
    assert.equal(r.w.localStorage.getItem('lk_lang_v1'), null);
    const fr = r.d.querySelector('.lk-langbar a[data-lk-lang="fr"]'); fr.addEventListener('click', e => e.preventDefault()); fr.click();
    assert.equal(r.w.localStorage.getItem('lk_lang_v1'), 'fr', 'clic sur « Français » : choix écrit');
  } finally { r.close(); }
  const s = await load(root, 'contact.html', { before: nav(['pt-BR', 'fr']) });
  try { assert.equal(s.d.querySelector('.lk-lang-offer'), null, 'langue du navigateur non publiée, puis français : rien à proposer'); } finally { s.close(); }
});

test('pages françaises inchangées par les langues : seule la barre de langue et les hreflang s’ajoutent', () => {
  const strip = h => h.replace(/<div class="lk-langbar"[^>]*>[\s\S]*?<\/details><\/div><\/div>\n?/g, '').replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]*">\n?/g, '');
  for (const p of ['index.html', 'calculateurs.html', 'vehicules.html', 'contact.html']) {
    const h = read(p), s = strip(h);
    assert.ok(!s.includes('data-lk-langbar') && !/hreflang="(?:en|es|it)" href/.test(s), p);
    assert.equal((h.match(/data-lk-langbar/g) || []).length, 1, p + ' : une seule barre');
  }
});
