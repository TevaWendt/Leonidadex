#!/usr/bin/env node
'use strict';
/* v7.60 — langues du site (anglais d'abord ; espagnol, italien, allemand, portugais prévus).
   Le français reste la seule source : pages, générateurs, scripts et données sont écrits en français. Ce module produit chaque
   langue publiée (outils/langues.json) dans son dossier (/en/…) à partir des PAGES FRANÇAISES FINALES et des SCRIPTS du site,
   grâce à une mémoire de traduction (outils/langues/<code>/*.json : « texte français normalisé » → traduction).
   - Pages : chaque suite de texte et de balises en ligne (a, strong, em, span, code, br…) est UN segment ; ses balises
     deviennent des repères <1>…</1>, <2/> que la traduction garde (elle peut les déplacer). Attributs lisibles (title, alt,
     aria-label, placeholder, meta description…), JSON-LD (name, description, text…) et <title> suivent la même mémoire.
   - Scripts : chaque chaîne (acorn) dont le texte est dans la mémoire est remplacée ; une chaîne qui contient du HTML est
     découpée en morceaux de texte ; une chaîne JSON (modele-donnees.js) est traduite valeur par valeur. Une chaîne absente de
     la mémoire reste telle quelle : le test outils/tests/langues.test.cjs vérifie, dans les pages rendues, qu'aucun texte
     français ne reste visible. Les décisions « ce n'est pas du texte » sont gardées dans la mémoire (_ignorer).
   - Liens : une page traduite pointe vers les pages traduites de sa langue ; vers une page pas encore traduite, le lien va à
     la page française et porte hreflang="fr" (repère « FR » à l'écran). Feuilles, images et données restent partagées
     (../style.css) ; un script traduit est copié dans le dossier de la langue avec sa propre empreinte ?v=.
   - Pages françaises : liens hreflang vers leur traduction ; sitemap : pages traduites ajoutées.
   Appelé à la fin de sync-site.cjs (donc par node outils/regenerer.cjs). Ligne de commande :
     node outils/langues.cjs --generer [en]      génère la langue (ou toutes les langues publiées)
     node outils/langues.cjs --extraire en       écrit outils/langues/en/_a-traduire.json (textes sans traduction, avec contexte)
     node outils/langues.cjs --verifier en       manques, repères cassés, entrées inutilisées ; code 1 si un manque
   Dépendances (installées à part, comme jsdom pour Léo) : parse5 (fourni avec jsdom) et acorn — NODE_PATH=<dossier>/node_modules. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
let P5 = null, ACORN = null;
function deps() {
  if (!P5) {
    try { P5 = require('parse5'); ACORN = require('acorn'); }
    catch (e) { throw new Error('outils/langues.cjs a besoin de parse5 (fourni avec jsdom) et d’acorn, installés hors du dépôt : NODE_PATH=<dossier>/node_modules et « npm install acorn » dans ce dossier. (' + e.message + ')'); }
  }
  return { P5, ACORN };
}
const readJSON = (root, f) => JSON.parse(fs.readFileSync(path.join(root, f), 'utf8'));
/* v7.61 : « pages »: "*" = toutes les pages françaises publiées (racine et dossiers des fiches), sauf les redirections, la
   page 404 et la vérification Google. La liste est calculée une fois par racine (les redirections ne changent pas pendant
   une génération). Une langue peut aussi exclure des pages (« exclure »). */
const DOSSIERS = ['armes', 'vehicules', 'lieux', 'personnages', 'entreprises', 'demeures', 'planques', 'carnets'];
const toutesCache = new Map();
function toutesLesPages(root = ROOT) {
  if (toutesCache.has(root)) return toutesCache.get(root);
  const list = [...fs.readdirSync(root).filter(f => f.endsWith('.html')), ...DOSSIERS.filter(d => fs.existsSync(path.join(root, d))).flatMap(d => fs.readdirSync(path.join(root, d)).filter(f => f.endsWith('.html')).map(f => d + '/' + f))]
    .filter(f => !/^google/.test(f) && f !== '404.html' && !/http-equiv="refresh"/i.test(fs.readFileSync(path.join(root, f), 'utf8'))).sort();
  toutesCache.set(root, list);
  return list;
}
function config(root = ROOT) {
  const cfg = readJSON(root, 'outils/langues.json');
  for (const l of cfg.langues) if (l.pages === '*') { const ex = new Set(l.exclure || []); l.pages = toutesLesPages(root).filter(p => !ex.has(p)); l.toutes = true; }
  return cfg;
}
function langue(cfg, code) { const l = cfg.langues.find(x => x.code === code); if (!l) throw new Error('Langue inconnue : ' + code); return l; }
const publiees = cfg => cfg.langues.filter(l => l.etat === 'publiee' && l.code !== cfg.source);

/* ---------- normalisation et repérage du texte ---------- */
const norm = s => String(s).replace(/[\u00a0\u202f\u2009\u2007]/g, ' ').replace(/'/g, '’').replace(/\s+/g, ' ').trim();
const LETTERS = /[A-Za-zÀ-ÖØ-öø-ÿŒœ]{2,}|[À-ÖØ-öø-ÿŒœ]/;
const FRNUM = /\d{1,3}(?:[ \u00a0\u202f]\d{3})+|\d,\d/;
function textual(s) { const n = norm(s); if (!n) return false; if (/^(?:https?:|mailto:|tel:|\/|#|\.\.?\/)\S*$/.test(n)) return false; return LETTERS.test(n) || FRNUM.test(n) || /\d\s*[kM]?\s*\$/.test(n); }
const escText = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/* L'espace devant : ; ? ! est une règle française : retirée d'une traduction (jamais du texte d'origine). */
const typo = (s, code) => code === 'fr' ? s : String(s).replace(/(?<=[\p{L}\p{N})\]”’%*])[ \u00a0\u202f]+([:;?!])/gu, '$1').replace(/«\s*/g, '“').replace(/\s*»/g, '”');

/* ---------- mémoire de traduction ---------- */
/* outils/langues/<code>/*.json : { "_note": …, "_ignorer": [chaînes de code à ne pas traduire], "texte": "translation",
   "fichier.js::texte": "traduction propre à ce fichier", "texte": "=" (identique : nom propre, marque) }.
   Un même mot peut être du texte lu et un identifiant dans le même fichier (« joueurs » : unité affichée et nom d'un
   critère) : la valeur est alors une règle ou une liste de règles { "si": "expression", "texte": "traduction" } ; « si »
   est testé sur le code qui précède la chaîne (80 caractères ; pour une valeur JSON, le nom de sa clé). Aucune règle
   vérifiée : la chaîne reste telle quelle (c'est du code), sans être signalée. */
function memoire(root, code) {
  const dir = path.join(root, 'outils/langues', code), map = new Map(), from = new Map(), ignore = new Set(), conflicts = [], rules = [], noScript = new Set();
  if (!fs.existsSync(dir)) return { map, from, ignore, conflicts, files: [], rules, noScript };
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_')).sort();
  for (const f of files) {
    const data = readJSON(root, 'outils/langues/' + code + '/' + f);
    for (const [k, v] of Object.entries(data)) {
      if (k === '_ignorer') { for (const x of v) ignore.add(String(x)); continue; }
      /* v7.61 : « _scriptsJamais » : textes traduits dans les pages mais qui, dans un script, sont des identifiants (« source »,
         « fiche », « calculs ») : jamais remplacés dans un script, sauf entrée propre au fichier (« fichier.js::texte »). */
      if (k === '_scriptsJamais') { for (const x of v) noScript.add(norm(x)); continue; }
      if (k.startsWith('_')) continue;
      if (typeof v === 'string' ? !v.length : !(v && typeof v === 'object')) continue;
      /* v7.61 : « re:<expression> » : motif (données de la carte : « Bâtiment L1441 », « … (nom réel) ») ; la traduction
         reprend les groupes : {1} tel quel, {t1} traduit par la mémoire (ou tel quel s'il n'y est pas). */
      if (k.startsWith('re:')) { rules.push({ re: new RegExp(k.slice(3)), v, key: k }); map.set(k, v); from.set(k, f); continue; }
      const key = k.includes('::') ? k.split('::')[0] + '::' + norm(k.split('::').slice(1).join('::')) : norm(k);
      if (map.has(key) && JSON.stringify(map.get(key)) !== JSON.stringify(v)) conflicts.push(key + ' (' + from.get(key) + ' / ' + f + ')');
      map.set(key, v); from.set(key, f);
    }
  }
  /* Nombres qui changent d'une génération à l'autre (« 617 tests », « 302 véhicules ») : une entrée dont la traduction
     reprend ses nombres dans le même ordre sert aussi pour d'autres nombres (clé avec ⟨#⟩). */
  const locale = (readJSON(root, 'outils/langues.json').langues.find(l => l.code === code) || {}).locale || code;
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 6 });
  const nums = new Map();
  for (const [key, v] of map) {
    if (typeof v !== 'string' || v === '=' || key.startsWith('re:')) continue;
    const found = [...key.matchAll(NUM)].map(m => m[0]); if (!found.length) continue;
    let rest = v, out = '', ok = true;
    for (const n of found) { const t = numText(n, fmt), i = rest.indexOf(t); if (i < 0) { ok = false; break; } out += rest.slice(0, i) + '⟨#⟩'; rest = rest.slice(i + t.length); }
    if (ok) nums.set(key.replace(NUM, '⟨#⟩'), { v: out + rest, key });
  }
  return { map, from, ignore, conflicts, files, nums, fmt, rules, noScript };
}
const NUM = /(?<![<\/\d])(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?![\d\/>])/g;
const numText = (n, fmt) => fmt.format(Number(n.replace(/[ \u00a0\u202f]/g, '').replace(',', '.')));
/* Traduction d'un texte (clé normalisée) ; ctx.file pour les entrées propres à un fichier ; « = » garde le texte ;
   KEEP : une règle « si » existe mais ne s'applique pas ici (identifiant de code). */
const KEEP = Symbol('garder');
/* fin de phrase : pas après une abréviation d'adresse (« St. », « Jr. », « U.S. », une initiale) */
const SENTENCE = /(?<=[.!?])(?<!\b(?:St|Jr|Sr|Dr|Mr|Mrs|Ms|Mt|Ft|Ave|Blvd|Rd|[A-Z])\.)\s+(?=[A-ZÀ-ÝÉ«“(])/;
function lookup(mem, key, file, before, noSplit) {
  const k = norm(key); if (!k) return null;
  if (file && /\.js$/.test(file) && mem.noScript && mem.noScript.has(k) && !mem.map.has(file + '::' + k)) return KEEP;
  let v = (file && mem.map.get(file + '::' + k)) ?? mem.map.get(k);
  if (v === undefined && mem.nums && NUM.test(k)) {
    NUM.lastIndex = 0;
    const w = k.replace(NUM, '⟨#⟩'), hit = (file && mem.nums.get(file + '::' + w)) || mem.nums.get(w);
    if (hit) {
      mem.used.add(hit.key);
      const list = [...k.matchAll(NUM)].map(m => numText(m[0], mem.fmt)); let i = 0;
      return hit.v.replace(/⟨#⟩/g, () => list[i++]);
    }
  }
  NUM.lastIndex = 0;
  if (v === undefined && mem.rules && mem.rules.length) {
    for (const r of mem.rules) {
      const m = k.match(r.re); if (!m) continue;
      mem.used.add(r.key);
      return String(r.v).replace(/\{(t?)(\d+)\}/g, (x, t, n) => { const g = m[n] || ''; if (!t) return g; const tv = lookup(mem, g, file, before, true); return typeof tv === 'string' ? tv : g; });
    }
  }
  /* v7.61 : un texte sans balise fait de plusieurs phrases, toutes connues de la mémoire une à une (descriptions
     assemblées des données : « Bâtiment repéré… . Équivalent réel : … . Type : … . ») */
  if (v === undefined && !noSplit && !/[<>]/.test(k) && SENTENCE.test(k)) {
    const parts = k.split(SENTENCE), out = [];
    for (const part of parts) { const t = lookup(mem, part, file, before, true); if (typeof t !== 'string') return null; out.push(t); }
    return out.join(' ');
  }
  if (v === undefined) return null;
  mem.used.add((file && mem.map.has(file + '::' + k)) ? file + '::' + k : k);
  if (typeof v === 'object') {
    const rule = [].concat(v).find(r => r && typeof r.texte === 'string' && (!r.si || new RegExp(r.si).test(before || '')));
    if (!rule) return KEEP;
    v = rule.texte;
  }
  return v === '=' ? k : v;
}
/* Garde les espaces du début et de la fin d'origine autour d'une traduction. */
function wrap(original, translated, code) {
  let lead = original.match(/^\s*/)[0].replace(/[\u00a0\u202f]/g, ' '), tail = original.match(/\s*$/)[0].replace(/[\u00a0\u202f]/g, ' ');
  /* hors du français : pas d'espace devant : ; ? ! % , . ) ” ni après “ ( (l'espace d'origine venait de la typographie française) */
  if (code && code !== 'fr') { if (/^[:;?!%,.)”]/.test(translated)) lead = ''; if (/[“(]$/.test(translated)) tail = ''; }
  /* v7.61 : l'espagnol garde l'espace (insécable) devant « % » : « 20 % » */
  if (code === 'es' && /^%/.test(translated)) lead = original.match(/^\s*/)[0];
  return lead + translated + tail;
}
/* Chaîne de ponctuation seule (« « », « » », « : », « % ») : sa typographie française devient anglaise. */
const PUNCT_ONLY = /^[\s\u00a0\u202f]*[«»:;?!%][\s\u00a0\u202f«»:;?!%.,×()]*$/;
function punct(value, code) {
  if (code === 'fr' || !PUNCT_ONLY.test(value) || !/[«»]|[\s\u00a0\u202f][:;?!%]/.test(value)) return null;
  /* v7.61 : l'espagnol garde l'espace devant « % » (« 20 % ») */
  return value.replace(/[\u00a0\u202f]/g, ' ').replace(/«\s*/g, '“').replace(/\s*»/g, '”').replace(code === 'es' ? /\s+([:;?!])/g : /\s+([:;?!%])/g, '$1');
}

/* ---------- pages : segments ---------- */
const INLINE = new Set(['a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr', 'img', 'del', 'ins']);
const VOID = new Set(['br', 'wbr', 'img', 'input', 'meta', 'link', 'hr', 'source', 'area', 'col', 'embed', 'param', 'track']);
const SKIP = new Set(['script', 'style', 'textarea', 'pre']);
const SVG_TEXT = new Set(['title', 'desc', 'text']);
const attr = (el, name) => (el.attrs || []).find(a => a.name === name)?.value;
const skipEl = el => SKIP.has(el.tagName) || attr(el, 'translate') === 'no' || attr(el, 'data-lk-langbar') !== undefined;
function inlineOnly(n) {
  if (n.nodeName === '#text') return true;
  if (!n.tagName || !INLINE.has(n.tagName) || skipEl(n)) return false;
  return (n.childNodes || []).every(inlineOnly);
}
function kids(el) { return el.tagName === 'template' && el.content ? el.content.childNodes : (el.childNodes || []); }
/* Parcourt l'arbre et appelle onRun(run) pour chaque suite de nœuds en ligne, onEl(el) pour chaque élément (attributs, liens). */
const SVG_NS = 'http://www.w3.org/2000/svg';
function walk(node, onRun, onEl) {
  let run = [];
  const flush = () => { if (run.length) onRun(run); run = []; };
  for (const c of kids(node)) {
    if (c.nodeName === '#comment' || c.nodeName === '#documentType') { flush(); continue; }
    if (c.tagName && c.namespaceURI === SVG_NS) { flush(); onEl(c); walkSvg(c, onRun, onEl); continue; }
    if (inlineOnly(c)) { run.push(c); if (c.tagName) visitInline(c, onEl); continue; }
    flush();
    if (c.tagName) { onEl(c); if (!skipEl(c)) walk(c, onRun, onEl); }
  }
  flush();
}
/* Dans un dessin SVG, seuls <title>, <desc> et <text> portent du texte lisible. */
function walkSvg(el, onRun, onEl) {
  for (const c of el.childNodes || []) {
    if (!c.tagName) continue;
    onEl(c);
    if (SVG_TEXT.has(c.tagName)) { const t = (c.childNodes || []).filter(x => x.nodeName === '#text'); if (t.length) onRun(t); }
    else walkSvg(c, onRun, onEl);
  }
}
function visitInline(el, onEl) { onEl(el); for (const c of el.childNodes || []) if (c.tagName) visitInline(c, onEl); }
/* Une suite de nœuds → jetons [texte | ouverture n | fermeture n | vide n] avec la source d'origine de chaque balise. */
function tokens(run, html) {
  const out = [];
  const add = n => {
    if (n.nodeName === '#text') { out.push({ t: 'text', v: n.value, src: html.slice(n.sourceCodeLocation.startOffset, n.sourceCodeLocation.endOffset) }); return; }
    const loc = n.sourceCodeLocation;
    if (VOID.has(n.tagName)) { out.push({ t: 'void', el: n, src: html.slice(loc.startTag.startOffset, loc.startTag.endOffset) }); return; }
    out.push({ t: 'open', el: n, src: html.slice(loc.startTag.startOffset, loc.startTag.endOffset) });
    for (const c of n.childNodes) add(c);
    out.push({ t: 'close', el: n, src: loc.endTag ? html.slice(loc.endTag.startOffset, loc.endTag.endOffset) : '' });
  };
  run.forEach(add);
  return out;
}
/* Clé normalisée avec repères : les balises qui entourent tout le segment sont gardées telles quelles (préfixe / suffixe). */
function segmentOf(toks) {
  let a = 0, b = toks.length - 1;
  const blank = t => t.t === 'text' && !t.v.trim();
  for (;;) {
    while (a <= b && blank(toks[a])) a++;
    while (b >= a && blank(toks[b])) b--;
    if (a < b && toks[a].t === 'open' && toks[b].t === 'close' && toks[a].el === toks[b].el) {
      /* l'ouverture et la fermeture de ce même élément entourent-elles tout ? (aucune autre fermeture de lui entre les deux) */
      a++; b--; continue;
    }
    break;
  }
  const inner = toks.slice(a, b + 1), ids = new Map(); let n = 0, key = '';
  for (const t of inner) {
    if (t.t === 'text') key += t.v;
    else { if (!ids.has(t.el)) ids.set(t.el, ++n); const i = ids.get(t.el); key += t.t === 'open' ? '<' + i + '>' : t.t === 'close' ? '</' + i + '>' : '<' + i + '/>'; }
  }
  return { a, b, inner, ids, key: norm(key), raw: key };
}
const marks = s => (String(s).match(/<\/?\d+\/?>/g) || []).sort().join(',');

/* ---------- liens d'une page traduite ---------- */
function linker(cfg, lang, root) {
  const pages = new Set(lang.pages || []), dir = lang.dossier;
  const isPage = p => /\.html$/.test(p);
  /* url telle qu'écrite dans une page française (opts.from : son chemin, racine par défaut) → url dans /<dir>/.
     v7.61 : pages des dossiers (vehicules/x.html…). La page traduite est rangée un dossier plus bas que la française
     (es/vehicules/x.html) : un lien vers une page traduite ou un script traduit garde la même adresse relative (la même
     arborescence existe dans /<dir>/) ; tout le reste (feuilles, images, données, pages non traduites) prend un « ../ »
     de plus. */
  function rel(url, opts = {}) {
    if (!url || /^(?:[a-z]+:|\/\/|#|data:|blob:|javascript:)/i.test(url)) return { url };
    const m = url.match(/^([^?#]*)(.*)$/), p = m[1], rest = m[2];
    if (!p) return { url };
    if (p.startsWith('/')) {
      let q = p.slice(1) || 'index.html'; if (q.endsWith('/')) q += 'index.html';
      if (isPage(q) && pages.has(q)) return { url: '/' + dir + '/' + (q.endsWith('index.html') && p.endsWith('/') ? q.slice(0, -'index.html'.length) : q) + rest, own: true };
      if (p === '/') return { url: '/' + dir + '/' + rest, own: true };
      return { url, fr: isPage(q) };
    }
    const fromDir = path.posix.dirname(opts.from || 'index.html');
    let target = path.posix.normalize(path.posix.join(fromDir, p)); if (p.endsWith('/') || p === '.' || p === './') target = path.posix.join(target, 'index.html');
    if (target.startsWith('../')) return { url: '../' + url, fr: isPage(target) };
    if (isPage(target) && pages.has(target)) return { url, own: true };
    if (opts.script && opts.translated && opts.translated.has(target)) return { url, own: true };
    return { url: '../' + url, fr: isPage(target) };
  }
  function abs(u) { /* https://www.leonidakit.com/x → /en/x si la page est traduite */
    const m = String(u).match(/^(https:\/\/www\.leonidakit\.com)(\/[^?#]*)?(.*)$/); if (!m) return u;
    const p = (m[2] || '/').slice(1) || 'index.html';
    if (pages.has(p)) return m[1] + '/' + dir + '/' + (p === 'index.html' ? '' : p) + m[3];
    return u;
  }
  return { rel, abs, pages, dir };
}

/* ---------- barre « Changer la langue » (posée sur toutes les pages par sync-site.cjs via site-shell.cjs) ---------- */
const GLOBE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9s1.3-6.4 3.8-9z"/></svg>';
/* file : chemin de la page française (racine ou dossier) ; code : langue de la page affichée. Le bandeau qui propose une
   autre langue (common.js) est écrit dans la langue proposée : offre, bouton pour y aller et « Non merci » (data-offre,
   data-aller, data-rester du lien). */
function langBar(file, code, root = ROOT) {
  const cfg = config(root), here = langue(cfg, code), list = cfg.langues.filter(l => l.etat === 'publiee');
  if (list.length < 2) return '';
  const depth = file.split('/').length - 1, inLang = code !== cfg.source;
  const toRoot = (inLang ? '../' : '') + '../'.repeat(depth);
  const items = list.map(l => {
    const has = l.code === cfg.source || (l.pages || []).includes(file);
    const target = l.code === cfg.source ? file : has ? file : 'index.html';
    const href = l.code === code ? '' : (l.code === cfg.source ? toRoot + target : toRoot + l.dossier + '/' + target).replace(/(^|\/)index\.html$/, '$1') || './';
    const lb = l.libelles || {};
    const note = !has && l.code !== code ? ' <small>' + escText((lb.accueil || 'home page')) + '</small>' : '';
    const current = l.code === code;
    return '<li><a ' + (current ? 'aria-current="true" ' : 'href="' + escAttr(href) + '" ') + 'hreflang="' + l.code + '" lang="' + l.code + '" data-lk-lang="' + l.code + '"'
      + (has && !current ? ' data-lk-equiv="1" data-offre="' + escAttr(lb.offre || '') + '" data-aller="' + escAttr(lb.aller || '') + '" data-rester="' + escAttr(lb.rester || '') + '"' : '') + '>'
      + escText(l.nom) + note + '</a></li>';
  }).join('');
  const label = (here.libelles || {}).changer || 'Langue';
  return '<div class="lk-langbar" data-lk-langbar translate="no"><div class="shell lk-langbar-in"><details class="lk-lang"><summary aria-label="' + escAttr(label + ' (' + here.nom + ')') + '">' + GLOBE
    + '<span class="lk-lang-t">' + escText(label) + '</span><span class="lk-lang-code" aria-hidden="true">' + code.toUpperCase() + '</span></summary><ul class="lk-lang-menu">' + items + '</ul></details></div></div>';
}
function placeLangBar(html, file, code, root = ROOT) {
  html = html.replace(/<div class="lk-langbar"[^>]*>[\s\S]*?<\/details><\/div><\/div>\n?/g, '');
  const bar = langBar(file, code, root); if (!bar) return html;
  if (/<a class="skip"[^>]*>[^<]*<\/a>\n?/.test(html)) return html.replace(/(<a class="skip"[^>]*>[^<]*<\/a>\n?)/, '$1' + bar + '\n');
  return html.replace(/(<body[^>]*>\n?)/, '$1' + bar + '\n');
}
/* hreflang dans le <head> d'une page qui a au moins une traduction (idempotent). */
function alternates(file, root = ROOT) {
  const cfg = config(root), base = 'https://www.leonidakit.com/';
  const path0 = file === 'index.html' ? '' : file;
  const list = [['fr', base + path0]];
  for (const l of publiees(cfg)) if ((l.pages || []).includes(file)) list.push([l.code, base + l.dossier + '/' + path0]);
  if (list.length < 2) return '';
  return list.map(([c, u]) => '<link rel="alternate" hreflang="' + c + '" href="' + u + '">').join('\n') + '\n<link rel="alternate" hreflang="x-default" href="' + list[0][1] + '">\n';
}
function placeAlternates(html, file, root = ROOT) {
  html = html.replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]*">\n?/g, '');
  const a = alternates(file, root); if (!a) return html;
  return /<link rel="canonical"[^>]*>\n?/.test(html) ? html.replace(/(<link rel="canonical"[^>]*>\n?)/, '$1' + a) : html.replace('</head>', a + '</head>');
}

/* ---------- traduction d'une page ---------- */
function translatePage(html, file, code, ctx) {
  const { P5 } = deps(), { cfg, mem, link, translatedScripts, report } = ctx;
  const ATTRS = new Set(cfg.attributs), METAS = new Set(cfg.metas), LD = new Set(cfg.jsonld);
  const doc = P5.parse(html, { sourceCodeLocationInfo: true, scriptingEnabled: false });
  const edits = [], tagOverride = new Map();
  const miss = (kind, text, where) => report.missing.push({ kind, text: norm(text), where: file + (where ? ' · ' + where : '') });
  const tr = (text, where) => { if (!textual(text)) return null; let v = lookup(mem, text, file); if (v === KEEP) v = null; if (v === null) { miss('page', text, where); return null; } return typo(v, code); };
  /* attributs d'un élément → nouvelle balise ouvrante (ou null si rien ne change) */
  function startTag(el) {
    const loc = el.sourceCodeLocation; if (!loc || !loc.startTag) return null;
    const src = html.slice(loc.startTag.startOffset, loc.startTag.endOffset), base = loc.startTag.startOffset, changes = [];
    let extra = '';
    for (const a of el.attrs || []) {
      const al = loc.startTag.attrs && loc.startTag.attrs[a.name]; if (!al) continue;
      let v = null;
      const name = a.name, tag = el.tagName;
      if (ATTRS.has(name) || (name === 'value' && tag === 'input' && /^(?:submit|button|reset)$/.test(attr(el, 'type') || ''))
        || (name === 'content' && tag === 'meta' && (METAS.has(attr(el, 'name') || '') || METAS.has(attr(el, 'property') || ''))) || (name === 'label' && /^(?:optgroup|track|option)$/.test(tag))) {
        const t = tr(a.value, '@' + name); if (t !== null) v = t;
      }
      if (name === 'lang' && tag === 'html') v = code;
      if (name === 'value' && tag === 'input' && /^\d{1,3}(?:[ \u00a0\u202f]\d{3})+$/.test(a.value)) v = new Intl.NumberFormat(langue(cfg, code).locale).format(Number(a.value.replace(/\D/g, '')));
      if (name === 'content' && tag === 'meta' && attr(el, 'property') === 'og:locale') v = langue(cfg, code).og;
      if (name === 'content' && tag === 'meta' && /^(?:og:url)$/.test(attr(el, 'property') || '')) v = link.abs(a.value);
      if (name === 'href' && tag === 'link' && /canonical/.test(attr(el, 'rel') || '')) v = link.abs(a.value);
      if ((name === 'href' && tag !== 'link') || (name === 'href' && tag === 'link' && !/canonical|alternate/.test(attr(el, 'rel') || '')) || name === 'src' || name === 'action' || name === 'poster' || name === 'data-base' || name === 'data-big') {
        const r = link.rel(a.value, { script: tag === 'script', translated: translatedScripts, from: file });
        if (r.url !== a.value) v = r.url;
        if (tag === 'a' && r.fr && attr(el, 'hreflang') === undefined) extra += ' hreflang="fr"';
      }
      if (name === 'srcset' || name === 'imagesrcset') { const nv = a.value.split(',').map(part => { const [u, ...d] = part.trim().split(/\s+/); return [link.rel(u, { from: file }).url, ...d].join(' '); }).join(', '); if (nv !== a.value.split(',').map(p => p.trim()).join(', ')) v = nv; }
      if (v !== null && v !== a.value) changes.push([al.startOffset - base, al.endOffset - base, name + '="' + escAttr(v) + '"']);
    }
    /* <option> sans value : le formulaire envoie le texte de l'option ; la page traduite garde le texte français comme valeur
       (le serveur et les scripts attendent celle-là), seul le libellé affiché change */
    if (el.tagName === 'option' && attr(el, 'value') === undefined) { const t = (el.childNodes || []).map(c => c.value || '').join('').trim(); if (textual(t) && lookup(mem, t, file) !== null) extra += ' value="' + escAttr(t) + '"'; }
    if (!changes.length && !extra) return null;
    let s = src; for (const [a, b, r] of changes.sort((x, y) => y[0] - x[0])) s = s.slice(0, a) + r + s.slice(b);
    if (extra) s = s.replace(/\s*\/?>$/, m => extra + m);
    return s;
  }
  const onEl = el => { const s = startTag(el); if (s !== null) tagOverride.set(el, s); };
  const runs = [];
  const onRun = (run) => runs.push(run);
  walk(doc, onRun, onEl);
  /* balises ouvrantes modifiées hors des segments */
  const inRun = new Set(); for (const run of runs) for (const n of run) (function mark(x) { inRun.add(x); for (const c of x.childNodes || []) mark(c); })(n);
  for (const [el, s] of tagOverride) if (!inRun.has(el)) edits.push([el.sourceCodeLocation.startTag.startOffset, el.sourceCodeLocation.startTag.endOffset, s]);
  /* segments */
  for (const run of runs) {
    const toks = tokens(run, html), seg = segmentOf(toks);
    const start = run[0].sourceCodeLocation.startOffset, end = run[run.length - 1].sourceCodeLocation.endOffset;
    const rawText = seg.inner.filter(t => t.t === 'text').map(t => t.v).join('');
    const srcOf = t => (t.t === 'open' || t.t === 'void') && tagOverride.has(t.el) ? tagOverride.get(t.el) : t.src;
    let out = null;
    if (seg.key && textual(rawText)) {
      let v = lookup(mem, seg.key, file); if (v === KEEP) v = null;
      if (v === null) miss('page', seg.key, (run[0].parentNode && run[0].parentNode.tagName) || '');
      else if (marks(v) !== marks(seg.key)) report.broken.push({ where: file, key: seg.key, value: v });
      else {
        const byId = new Map(); for (const t of seg.inner) if (t.t !== 'text') { const i = seg.ids.get(t.el); byId.set((t.t === 'close' ? '/' : '') + i + (t.t === 'void' ? '/' : ''), srcOf(t)); }
        const body = typo(v, code).split(/(<\/?\d+\/?>)/).map(p => { const m = p.match(/^<(\/?)(\d+)(\/?)>$/); return m ? byId.get(m[1] + m[2] + m[3]) : escText(p); }).join('');
        const before = toks.slice(0, seg.a).map(srcOf).join(''), after = toks.slice(seg.b + 1).map(srcOf).join('');
        const lead = seg.inner.length && seg.inner[0].t === 'text' ? seg.inner[0].src.match(/^\s*/)[0] : '';
        const last = seg.inner[seg.inner.length - 1], tail = last && last.t === 'text' ? last.src.match(/\s*$/)[0] : '';
        out = before + lead + body + tail + after;
      }
    }
    if (out === null) { /* pas de traduction : on garde le texte, mais les balises modifiées (liens, attributs) sont posées */
      if (!toks.some(t => (t.t === 'open' || t.t === 'void') && tagOverride.has(t.el))) continue;
      out = toks.map(srcOf).join('');
    }
    edits.push([start, end, out]);
  }
  /* JSON-LD */
  (function ld(node) {
    for (const c of kids(node)) {
      if (c.tagName === 'script' && attr(c, 'type') === 'application/ld+json' && c.childNodes[0]) {
        const t = c.childNodes[0], loc = t.sourceCodeLocation; let data;
        try { data = JSON.parse(t.value); } catch { continue; }
        const fix = (o, k) => {
          if (Array.isArray(o)) return o.map(x => fix(x, k));
          if (o && typeof o === 'object') { const r = {}; for (const [kk, vv] of Object.entries(o)) r[kk] = fix(vv, kk); return r; }
          if (typeof o !== 'string') return o;
          if (k === 'inLanguage') return langue(cfg, code).locale;
          if (/^https:\/\/www\.leonidakit\.com/.test(o)) return link.abs(o);
          if (LD.has(k)) { const v = tr(o, 'ld:' + k); return v === null ? o : v; }
          return o;
        };
        const next = JSON.stringify(fix(data));
        edits.push([loc.startOffset, loc.endOffset, (t.value.startsWith('\n') ? '\n' : '') + next + (t.value.endsWith('\n') ? '\n' : '')]);
      } else if (c.tagName === 'script' && attr(c, 'type') === 'application/json' && c.childNodes[0] && (cfg.jsonPages || {})[attr(c, 'id')]) {
        /* v7.61 : données d'une page lues par son script (carnets : <script type="application/json" id="lk-carnet-data">).
           langues.json → « jsonPages » : clés affichées (« textes », traduites par la mémoire) et clés d'adresse
           (« chemins », écrites depuis la racine du site : une page traduite garde son adresse, le reste prend « ../ »). */
        const spec = cfg.jsonPages[attr(c, 'id')], TX = new Set(spec.textes || []), PATHS = new Set(spec.chemins || []);
        const t = c.childNodes[0], loc = t.sourceCodeLocation; let data;
        try { data = JSON.parse(t.value); } catch { continue; }
        const fix = (o, k) => {
          if (Array.isArray(o)) return o.map(x => fix(x, k));
          if (o && typeof o === 'object') { const r = {}; for (const [kk, vv] of Object.entries(o)) r[kk] = (spec.figees || []).includes(kk) ? vv : fix(vv, kk); return r; }
          if (typeof o !== 'string') return o;
          if (PATHS.has(k)) return link.rel(o, { from: 'index.html' }).url;
          if (TX.has(k)) { const v = tr(o, 'json:' + k); return v === null ? o : v; }
          return o;
        };
        const next = JSON.stringify(fix(data)).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
        edits.push([loc.startOffset, loc.endOffset, (t.value.startsWith('\n') ? '\n' : '') + next + (t.value.endsWith('\n') ? '\n' : '')]);
      } else if (c.tagName || c.nodeName === '#document') ld(c);
    }
  })(doc);
  /* application des modifications (non chevauchantes), de la fin vers le début */
  edits.sort((x, y) => y[0] - x[0]);
  let out = html, lastStart = Infinity;
  for (const [a, b, r] of edits) { if (b > lastStart) { report.broken.push({ where: file, key: 'chevauchement', value: a + '-' + b }); continue; } out = out.slice(0, a) + r + out.slice(b); lastStart = a; }
  /* barre de langue, hreflang, lien de retour */
  out = placeLangBar(out, file, code, ctx.root);
  out = placeAlternates(out, file, ctx.root);
  return markFrench(captures(out, code, ctx.root), code, cfg);
}
/* Captures du Tuto (outils/gen-tuto.cjs : <figure data-capture="nom">) : quand outils/tuto-captures-<code>.json existe
   (python3 outils/tuto-shots.py <racine> <code>), l'image, la version mobile, le lien « agrandir » et les zones repérées
   viennent du calculateur dans cette langue. Sinon, la capture française reste. */
function captures(html, code, root) {
  const f = path.join(root, 'outils/tuto-captures-' + code + '.json'), ffr = path.join(root, 'outils/tuto-captures.json');
  if (!fs.existsSync(f) || !fs.existsSync(ffr)) return html;
  const T = JSON.parse(fs.readFileSync(f, 'utf8')), F = JSON.parse(fs.readFileSync(ffr, 'utf8'));
  const ok = x => x && fs.existsSync(path.join(root, x.src.replace(/^\//, '')));
  const zone = (r, mr) => Object.entries(r).map(([k, v]) => '--z-' + k + ':' + v + '%').join(';') + ';' + Object.entries(mr).map(([k, v]) => '--zm-' + k + ':' + v + '%').join(';');
  return html.replace(/<figure class="t-figure" data-capture="([^"]+)"(?: data-capture-mobile="([^"]+)")?>[\s\S]*?<\/figure>/g, (block, name, mobile) => {
    const d = T[name], fd = F[name], m = mobile ? T[mobile] : null, fm = mobile ? F[mobile] : null;
    if (!ok(d) || !fd || (mobile && (!ok(m) || !fm))) return block;
    let b = block.split('href="' + fd.src + '"').join('href="' + d.src + '"')
      .split('<img src="' + fd.src + '" width="' + fd.width + '" height="' + fd.height + '"').join('<img src="' + d.src + '" width="' + d.width + '" height="' + d.height + '"');
    if (mobile) b = b.split('srcset="' + fm.src + '" width="' + fm.width + '" height="' + fm.height + '"').join('srcset="' + m.src + '" width="' + m.width + '" height="' + m.height + '"');
    for (const key of Object.keys(fd.regions || {})) {
      const r0 = fd.regions[key], r1 = (d.regions || {})[key]; if (!r0 || !r1) continue;
      const before = zone(r0, (fm && fm.regions && fm.regions[key]) || r0), after = zone(r1, (m && m.regions && m.regions[key]) || r1);
      b = b.split('data-t-overlay="' + key + '" aria-hidden="true" hidden style="' + before + '"').join('data-t-overlay="' + key + '" aria-hidden="true" hidden style="' + after + '"');
    }
    return b;
  });
}
/* Lien vers une page pas encore traduite : « FR » visible après un lien de texte simple (menu, pied de page, phrase) et,
   pour tous ces liens (cartes comprises), « (en français) » lu par les lecteurs d'écran. Fait sur la page finie : aucune
   interaction avec les segments traduits. */
function markFrench(html, code, cfg) {
  const { P5 } = deps(), lb = langue(cfg, code).libelles || {}, label = lb.versFr || 'French';
  const doc = P5.parse(html, { sourceCodeLocationInfo: true, scriptingEnabled: false }), ins = [];
  (function visit(n, inBar) {
    if (n.tagName === 'a' && !inBar && attr(n, 'hreflang') === 'fr' && attr(n, 'data-lk-lang') === undefined && n.sourceCodeLocation && n.sourceCodeLocation.endTag) {
      const kids = (n.childNodes || []).filter(c => !(c.nodeName === '#text' && !c.value.trim()));
      const simple = kids.length === 1 && kids[0].nodeName === '#text';
      ins.push([n.sourceCodeLocation.endTag.startOffset, (simple ? '<span class="lk-fr" aria-hidden="true">FR</span>' : '') + '<span class="sr-only"> (' + escText(label) + ')</span>']);
    }
    const bar = inBar || attr(n, 'data-lk-langbar') !== undefined;
    for (const c of (n.tagName === 'template' && n.content ? n.content.childNodes : n.childNodes || [])) visit(c, bar);
  })(doc, false);
  let out = html; for (const [at, s] of ins.sort((x, y) => y[0] - x[0])) out = out.slice(0, at) + s + out.slice(at);
  return out;
}

/* ---------- traduction d'un script ---------- */
const JS_ATTR_OPEN = /((?:^|\s)(?:title|aria-label|alt|placeholder|aria-description|data-short|data-label|data-ask)=")([^"]*)$/;
const JS_ATTR = /((?:^|\s)(?:title|aria-label|alt|placeholder|aria-description|data-short|data-label|data-ask|data-question|data-why|data-teaser)=")([^"]*)(")/g;
/* Une chaîne de script est signalée comme « à traduire » si elle ressemble à du texte lu : lettre accentuée, mot outil français,
   majuscule suivie d'une minuscule, espace au bord (morceau de phrase) ou nombre à la française. Les autres (sélecteurs, classes,
   noms d'évènements) sont du code : jamais signalées, jamais traduites sauf si la mémoire les nomme. */
/* mots français courants du site (sans accent ni mot outil) : « 8 parties », « (8 jours) », « 60 minutes = 1 heure ». */
const FR_VOCAB = new Set('prix achat achats argent gagner gagne jeu partie parties jour jours heure heures oui non rien aucun aucune temps joueur joueurs arme armes objectif calcul calculs fiche fiches avant puis soit dont entre vers chez environ trop tard semaine semaines sem mille milliard milliards'.split(' '));
const STOP = new Set('de la le les du des un une et ou à au aux pour en ton ta tes mon ma mes est sur par avec sans ce cette ces qui que plus pas ne il elle tu je on se sa son ses te ça y dans tout tous toute toutes quand comme si mais donc car déjà encore'.split(' '));
function uiLike(v) {
  const s = String(v); if (!LETTERS.test(s)) return false;
  if (/[À-ÖØ-öø-ÿŒœ’«»]/.test(s) || FRNUM.test(s)) return true;
  const plain = s.replace(/<[^>]*>/g, ' '), words = plain.toLowerCase().split(/[\s,.;:!?()\/]+/).filter(Boolean);
  if (words.some(w => STOP.has(w) || FR_VOCAB.has(w) || /^[ldjtsnqc]’/.test(w))) return true;
  return /(^|\s|>)[A-ZÀ-Ý][a-zà-ÿ]{2,}/.test(plain) && /\s/.test(plain.trim());
}
function translateText(value, file, ctx, where, before) {
  /* chaîne entière d'abord ; sinon, si elle contient du HTML, ses morceaux de texte et ses attributs lisibles */
  const { mem, code } = ctx, report = (ctx.cfg.scriptsDonnees || []).includes(file) ? { missing: [] } : ctx.report;
  /* manque : texte qui ressemble à du français lu ; en mode « tout » (--extraire en --tout), toute chaîne avec des lettres
     est proposée (candidats), pour trier à la main les petits mots (« Oui », « jour », « puis ») que la règle ne voit pas. */
  const miss = t => { if (mem.ignore.has(norm(t))) return; if (uiLike(t)) report.missing.push({ kind: 'script', text: norm(t), where: file + where }); else if (ctx.candidates && !(ctx.cfg.scriptsDonnees || []).includes(file)) ctx.candidates.push({ kind: 'script', text: norm(t), where: file + where }); };
  const p = punct(value, code); if (p !== null) return p;
  if (!textual(value)) return value;
  const whole = lookup(mem, value, file, before);
  if (whole === KEEP) return value;
  if (whole !== null) return wrap(value, typo(whole, code), code);
  /* « " aria-label="Retirer » : attribut lisible ouvert à la fin d'une chaîne sans balise */
  if (!/[<>]/.test(value) && JS_ATTR_OPEN.test(value)) return value.replace(JS_ATTR_OPEN, (m, a, v) => { if (!textual(v)) return m; const tv = lookup(mem, v, file, before); if (tv === KEEP) return m; if (tv === null) { miss(v); return m; } return a + escAttr(wrap(v, typo(tv, code), code)); });
  if (/<[a-z/!][^>]*>|^[^<]*">|<[a-z][^>]*$/i.test(value)) {
    /* Chaîne qui porte du HTML, parfois coupé (« " class="x">Texte », « Texte<span class="y" ») : seules les zones de texte
       (hors balises) et les valeurs des attributs lisibles sont traduites ; le reste est du code. */
    const lt = value.indexOf('<'), gt = value.indexOf('>');
    let inTag = gt !== -1 && (lt === -1 || gt < lt), out = '', i = 0;
    const flushText = t => {
      const pp = punct(t, code); if (pp !== null) return pp;
      if (!textual(t)) return t;
      const v = lookup(mem, t, file, before); if (v === KEEP) return t; if (v === null) { miss(t); return t; }
      return wrap(t, typo(v, code), code);
    };
    const flushTag = t => t.replace(JS_ATTR_OPEN, (m, a, v) => { if (!textual(v)) return m; const tv = lookup(mem, v, file, before); if (tv === KEEP) return m; if (tv === null) { miss(v); return m; } return a + escAttr(wrap(v, typo(tv, code), code)); }).replace(JS_ATTR, (m, a, v, b) => { if (!textual(v)) return m; const tv = lookup(mem, v, file, before); if (tv === KEEP) return m; if (tv === null) { miss(v); return m; } return a + escAttr(typo(tv, code)) + b; });
    /* « de la comparaison">× » : la chaîne commence par la fin d'une valeur d'attribut (avant le premier guillemet) */
    const tailFix = t => t.replace(/^[^"<>=]*[A-Za-zÀ-ÿ][^"<>=]*(?=")/, m => { if (!textual(m)) return m; const tv = lookup(mem, m, file, before); if (tv === KEEP) return m; if (tv === null) { if (uiLike(m)) miss(m); return m; } return escAttr(wrap(m, typo(tv, code), code)); });
    while (i < value.length) {
      const j = inTag ? value.indexOf('>', i) : value.indexOf('<', i);
      const stop = j === -1 ? value.length : (inTag ? j + 1 : j);
      const part = value.slice(i, stop);
      out += inTag ? flushTag(i === 0 ? tailFix(part) : part) : flushText(part);
      i = stop; inTag = !inTag;
    }
    return out;
  }
  miss(value);
  return value;
}
function quote(value, q) {
  let s = String(value).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  if (q === '`') return s.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return s.split(q).join('\\' + q);
}
function translateScript(code0, file, ctx) {
  const { ACORN } = deps(), { link, code } = ctx;
  const edits = []; let changed = false;
  const pages = link.pages, dir = link.dir;
  const urls = v => v.replace(/(^|[^\w./-])\/((?:[a-z0-9-]+\/)?(?:[a-z0-9-]+)\.html)(?=[?#"'\s)]|$)/g, (m, pre, p) => pages.has(p) ? pre + '/' + dir + '/' + p : m);
  /* v7.61 : clés dont la valeur est un identifiant ou une donnée brute dans un fichier de données (« clesFigees » de
     langues.json : adresse réelle, catégorie, statut de la carte) : jamais traduites, jamais signalées */
  const frozen = new Set(((ctx.cfg.clesFigees || {})[file]) || []); let p1 = null, p2 = null;
  const toks = [...ACORN.tokenizer(code0, { ecmaVersion: 'latest', allowHashBang: true })];
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i], label = t.type.label;
    const keyed = frozen.size && p1 && p1.type.label === ':' && p2 && (p2.type.label === 'string' || p2.type.label === 'name') && frozen.has(String(p2.value));
    /* v7.61 : un nom de propriété écrit entre guillemets ({ "sport": …, 'a': … }) est du code : jamais traduit (une clé
       traduite d'un seul côté casse la recherche par identifiant : LK_VEHICULES_CATS[x.cat]) */
    const propName = label === 'string' && p1 && (p1.type.label === '{' || p1.type.label === ',') && toks[i + 1] && toks[i + 1].type.label === ':';
    p2 = p1; p1 = t;
    if (label !== 'string' && label !== 'template') continue;
    if (keyed || propName) continue;
    const raw = code0.slice(t.start, t.end);
    let value = t.value; if (typeof value !== 'string') continue;
    let next = value;
    if (label === 'string' && value.length > 400 && /^\s*[{[]/.test(value)) {
      /* JSON dans une chaîne (modele-donnees.js) : valeur par valeur */
      /* les clés qui portent un identifiant (jsonCode de langues.json : id, genre, rubrique…) ne sont jamais traduites ;
         une unité avec $ ou / (« $/partie ») est comparée par le code : gardée */
      const codeKeys = new Set(ctx.cfg.jsonCode || []);
      try { let touched = false; const data = JSON.parse(value); const fix = (o, key) => { if (Array.isArray(o)) return o.map(x => fix(x, key)); if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fix(v, k)])); if (typeof o !== 'string' || codeKeys.has(key) || (key === 'unite' && /[$\/]/.test(o))) return o; const t = translateText(o, file, ctx, ' (JSON ' + key + ')', key); if (t !== o) touched = true; return t; }; const out = fix(data, ''); next = touched ? JSON.stringify(out) : value; } catch { next = value; }
    } else {
      const line = code0.slice(0, t.start).split('\n').length, ex = code0.slice(Math.max(0, t.start - 70), Math.min(code0.length, t.end + 50)).replace(/\s+/g, ' ');
      /* v7.61 : un morceau fait seulement d'une balise et d'une ponctuation à la française (« </b> : ») perd l'espace avant
         « : ; ? ! » hors du français (« <b>X</b>: … ») */
      if (code !== 'fr' && /^(?:<[^>]+>)*[\s\u00a0\u202f]+[:;?!][\s\u00a0\u202f]*$/.test(value)) next = value.replace(/[\s\u00a0\u202f]+([:;?!])/, '$1');
      else next = translateText(value, file, ctx, ':' + line + ' · ' + ex, code0.slice(Math.max(0, t.start - 80), t.start));
    }
    next = urls(next);
    if (next === value) continue;
    changed = true;
    if (label === 'string') { const q = raw[0]; edits.push([t.start, t.end, q + quote(next, q) + q]); }
    else edits.push([t.start, t.end, quote(next, '`')]);
  }
  if (!changed) return null;
  let out = code0; for (const [a, b, r] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + r + out.slice(b);
  return out;
}

/* ---------- index de recherche (v7.61) ----------
   search-index.js et search-lieux.js : { l: libellé affiché, k: type, u: adresse, s: texte cherché }. Le libellé et le type
   passent par la mémoire (un nom propre absent reste tel quel) ; l'adresse va vers la page traduite ; le texte cherché
   reçoit le libellé et la description traduits, et garde le texte français (on trouve une page dans les deux langues). */
function translateSearch(code0, file, ctx) {
  const m = code0.match(/^([\s\S]*?window\.LK_INDEX(?:_LIEUX)?\s*=\s*)(\[[\s\S]*\])(\s*;?\s*)$/); if (!m) return null;
  const { mem, link, code } = ctx; let list; try { list = JSON.parse(m[2]); } catch { return null; }
  const T = (t, where, quiet) => { if (!textual(t)) return null; const v = lookup(mem, t, file); if (v === KEEP) return null; if (v === null) { if (!quiet && uiLike(t)) ctx.report.missing.push({ kind: 'script', text: norm(t), where: file + where }); return null; } return typo(v, code); };
  const fold = x => String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const out = list.map(e => {
    const r = { ...e };
    const l = typeof e.l === 'string' ? T(e.l, ' (l)', /LIEUX/.test(m[1])) : null; if (l !== null) r.l = l;
    const k = typeof e.k === 'string' ? T(e.k, ' (k)') : null; if (k !== null) r.k = k;
    if (typeof e.u === 'string') r.u = link.abs('https://www.leonidakit.com' + e.u).replace(/^https:\/\/www\.leonidakit\.com/, '');
    if (typeof e.s === 'string') {
      let desc = null;
      if (typeof e.l === 'string' && e.s.startsWith(e.l + ' ')) desc = T(e.s.slice(e.l.length + 1).trim(), ' (s)', true);
      r.s = [r.l !== e.l ? r.l : '', r.k !== e.k ? fold(r.k) : '', desc || '', e.s].filter(Boolean).join(' ');
    }
    return r;
  });
  return m[1] + JSON.stringify(out) + m[3];
}

/* ---------- génération d'une langue ---------- */
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 12);
/* scripts locaux d'une page, en chemins depuis la racine (v7.61 : une page d'un dossier les charge par « ../x.js ») */
function localScripts(html, file = 'index.html') { const dir = path.posix.dirname(file); return [...html.matchAll(/<script\b[^>]*\ssrc="([^"?#]+)(?:\?v=[a-f0-9]+)?"/g)].map(m => m[1]).filter(u => !/^(?:[a-z]+:|\/\/|\/)/.test(u)).map(u => path.posix.normalize(path.posix.join(dir, u))).filter(u => !u.startsWith('../')); }
/* fichiers d'un dossier de langue, sous-dossiers compris (chemins relatifs) */
function filesIn(dir, base = '') { if (!fs.existsSync(dir)) return []; return fs.readdirSync(dir, { withFileTypes: true }).flatMap(x => x.isDirectory() ? filesIn(path.join(dir, x.name), base + x.name + '/') : [base + x.name]); }
function generer(code, root = ROOT, opts = {}) {
  const cfg = config(root), lang = langue(cfg, code);
  if (lang.etat !== 'publiee' && !opts.force) return null;
  const mem = memoire(root, code); mem.used = new Set();
  const report = { code, pages: [], scripts: [], missing: [], broken: [], conflicts: mem.conflicts };
  const link = linker(cfg, lang, root), dir = path.join(root, lang.dossier);
  /* opts.ecrire === false : rien n'est écrit ; report.outputs donne chaque fichier attendu (tests : en/ est-il à jour ?) */
  const dry = opts.ecrire === false, outputs = new Map();
  const put = (rel, content) => { outputs.set(rel, content); if (!dry) { fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); fs.writeFileSync(path.join(root, rel), content); } };
  if (!dry) fs.mkdirSync(dir, { recursive: true });
  const ctx = { cfg, mem, link, report, code, root, translatedScripts: new Set(), candidates: opts.tout ? [] : null };
  /* 1. scripts locaux utilisés par les pages traduites */
  const scripts = new Set();
  for (const p of lang.pages) for (const s of localScripts(fs.readFileSync(path.join(root, p), 'utf8'), p)) scripts.add(s);
  /* v7.61 : scripts chargés par un autre script (Léo : leo-loader.js, leo-ui.js…) : « scriptsEnPlus » de la langue */
  for (const s of lang.scriptsEnPlus || []) scripts.add(s);
  const keepScripts = new Set();
  const shared = new Set(cfg.scriptsPartages || []);
  for (const s of [...scripts].sort()) {
    const src = path.join(root, s); if (!fs.existsSync(src)) continue;
    /* v7.61 : une langue peut traduire aussi des scripts partagés (« traduireAussi » : index de recherche, données de la carte) */
    const also = (lang.traduireAussi || []).includes(s);
    if (shared.has(s) && !also) continue;
    const out = /^search-(?:index|lieux)\.js$/.test(s) && also ? translateSearch(fs.readFileSync(src, 'utf8'), s, ctx) : translateScript(fs.readFileSync(src, 'utf8'), s, ctx);
    if (out !== null) { put(lang.dossier + '/' + s, out); ctx.translatedScripts.add(s); keepScripts.add(s); report.scripts.push(s); }
  }
  /* scripts copiés qui ne sont plus traduits : retirés */
  if (!dry) for (const f of fs.readdirSync(dir)) if (f.endsWith('.js') && !keepScripts.has(f)) fs.rmSync(path.join(dir, f));
  /* 2. pages */
  const keepPages = new Set();
  for (const p of lang.pages) {
    let html = translatePage(fs.readFileSync(path.join(root, p), 'utf8'), p, code, ctx);
    /* empreintes des scripts traduits (les autres gardent celle de la page française) */
    html = html.replace(/(<script\b[^>]*\ssrc=")([^"?#]+)(?:\?v=[a-f0-9]+)?(")/g, (m, a, u, b) => { const t = path.posix.normalize(path.posix.join(path.posix.dirname(p), u)); return ctx.translatedScripts.has(t) ? a + u + '?v=' + hash(outputs.get(lang.dossier + '/' + t)) + b : m; });
    put(lang.dossier + '/' + p, html); keepPages.add(p); report.pages.push(lang.dossier + '/' + p);
  }
  if (!dry) for (const f of filesIn(dir)) if (f.endsWith('.html') && !keepPages.has(f)) fs.rmSync(path.join(dir, f));
  /* 3. pages françaises traduites : hreflang ; sitemap */
  for (const p of lang.pages) { const f = path.join(root, p), s = fs.readFileSync(f, 'utf8'), n = placeAlternates(s, p, root); if (n !== s) put(p, n); }
  /* 4. v7.61 : Léo dans cette langue (outils/langues.json → leo) : index et morceaux tirés de l'index français */
  if ((cfg.leo || []).includes(code) && code !== cfg.source) {
    const r = require('./leo-langues.cjs').build(code, root, module.exports, { mem, outputs });
    for (const [f, content] of r.outputs) put(f, content);
    for (const m of r.missing) report.missing.push(m);
    report.leo = r.outputs.size;
  }
  report.outputs = outputs;
  report.unused = [...mem.map.keys()].filter(k => !mem.used.has(k));
  if (ctx.candidates) report.candidates = ctx.candidates;
  return report;
}
function sitemap(root = ROOT) {
  const cfg = config(root), f = path.join(root, 'sitemap.xml'); if (!fs.existsSync(f)) return;
  let s = fs.readFileSync(f, 'utf8').replace(/\s*<url><loc>https:\/\/www\.leonidakit\.com\/(?:[a-z]{2})\/[^<]*<\/loc><\/url>/g, '');
  /* v7.61 : une page traduite n'entre dans le plan du site que si sa page française y est (pages « noindex » exclues) */
  const fr = new Set([...s.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]));
  const urls = []; for (const l of publiees(cfg)) for (const p of l.pages || []) { const tail = p === 'index.html' ? '' : p; if (fr.has('https://www.leonidakit.com/' + tail)) urls.push('https://www.leonidakit.com/' + l.dossier + '/' + tail); }
  s = s.replace('</urlset>', urls.map(u => '  <url><loc>' + u + '</loc></url>').join('\n') + '\n</urlset>');
  fs.writeFileSync(f, s);
}
/* Appelé par sync-site.cjs : toutes les langues publiées ; écrit outils/langues/_rapport.json (manques). */
function toutGenerer(root = ROOT) {
  const cfg = config(root), reports = [];
  for (const l of publiees(cfg)) reports.push(generer(l.code, root));
  sitemap(root);
  const summary = reports.map(r => ({ code: r.code, pages: r.pages.length, scripts: r.scripts.length, manques: r.missing.length, casses: r.broken.length, conflits: r.conflicts.length }));
  return { reports, summary };
}

/* ---------- extraction (pour traduire) ---------- */
function extraire(code, root = ROOT, opts = {}) {
  const r = generer(code, root, { force: true, tout: !!opts.tout });
  const seen = new Map();
  for (const m of r.missing.concat(r.candidates || [])) { if (!seen.has(m.text)) seen.set(m.text, { kind: m.kind, where: new Set() }); seen.get(m.text).where.add(m.where); }
  const out = {}; for (const [k, v] of seen) out[k] = { kind: v.kind, where: [...v.where].slice(0, 4) };
  fs.writeFileSync(path.join(root, 'outils/langues', code, '_a-traduire.json'), JSON.stringify(out, null, 1) + '\n');
  return { total: seen.size, report: r };
}

module.exports = { config, memoire, norm, textual, typo, langBar, placeLangBar, alternates, placeAlternates, translatePage, translateScript, generer, toutGenerer, extraire, sitemap, linker, segmentOf, tokens, marks, lookup, KEEP, uiLike, langue };

if (require.main === module) {
  const args = process.argv.slice(2), code = args.find(a => !a.startsWith('--'));
  if (args.includes('--extraire')) { const r = extraire(code || 'en', ROOT, { tout: args.includes('--tout') }); console.log('Textes sans traduction : ' + r.total + ' (outils/langues/' + (code || 'en') + '/_a-traduire.json)'); }
  else if (args.includes('--verifier')) {
    const r = generer(code || 'en', ROOT, { force: true });
    console.log(JSON.stringify({ manques: r.missing.length, casses: r.broken, conflits: r.conflicts, inutilisees: r.unused.length }, null, 1));
    process.exit(r.missing.length || r.broken.length || r.conflicts.length ? 1 : 0);
  } else { const r = toutGenerer(); console.log(JSON.stringify(r.summary)); }
}
