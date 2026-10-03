'use strict';
/* v7.61 — Léo dans une autre langue (outils/langues.json → « leo »). Le français reste la seule base : outils/gen-leo.cjs écrit
   leo-index.json et leo/*.json ; ce module en tire l'index de la langue (<dossier>/leo-index.json, <dossier>/leo/*.json) :
   - tout ce que Léo affiche (questions, réponses, gabarits, libellés, preuves, noms traduits…) passe par la mémoire de
     traduction de la langue (outils/langues/<code>/*.json), comme les pages ; un texte absent est signalé ;
   - tout ce qui sert à comprendre (formulations analysées, mots des catégories, lexique, aide par page) reste en français :
     la question du visiteur est ramenée au français par le pont (outils/langues/<code>/leo-pont.json, appliqué par
     leo-core.js) avant d'être comprise ; les noms traduits rejoignent les alias de chaque fiche ;
   - les passages des pages viennent des pages de la langue (même découpage que gen-leo.cjs) et se cherchent avec la
     question d'origine ;
   - les adresses vont vers les pages de la langue (/es/…).
   Appelé par outils/langues.cjs (generer) pour chaque langue publiée de « leo » autre que le français. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const PASSAGE_MIN = 300, PASSAGE_MAX = 600;

function build(code, root, L, ctx) {
  const cfg = L.config(root), lang = cfg.langues.find(l => l.code === code), dir = lang.dossier;
  const read = f => fs.readFileSync(path.join(root, f), 'utf8'), json = f => JSON.parse(read(f));
  if (!fs.existsSync(path.join(root, 'leo-index.json'))) return { outputs: new Map(), missing: [] };
  const N = require(path.join(root, 'leo-nlp.js'));
  const pontFile = path.join(root, 'outils/langues', code, '_leo-pont.json');
  const pont = fs.existsSync(pontFile) ? JSON.parse(fs.readFileSync(pontFile, 'utf8')) : { pont: [], stop: [] };
  const mem = ctx.mem, missing = [];
  let file = 'leo-index.json';
  /* texte affiché → traduction (null si absent : le texte français reste et il est signalé). v7.64 : entrée exacte, puis
     phrase par phrase et motifs (L.deep), texte « à plat » des pages (L.flatLookup), morceaux séparés par « · », « , »
     (L.partsOf) : les mêmes recherches que pour les pages */
  const T = (s, where) => {
    if (typeof s !== 'string' || !L.textual(s) || /^(?:\/|https?:)\S*$/.test(s)) return s;
    let v = L.lookup(mem, s, file);
    if (v === L.KEEP) return s;
    const lost = [];
    if (v === null) { v = L.deep(mem, s, file, null, t => lost.push(t)); if (v === L.KEEP) v = null; }
    if (v === null) { const fv = L.flatLookup(mem, s); if (fv !== null && fv !== L.KEEP) v = fv; }
    if (v === null) { const pv = L.partsOf(mem, L.norm(s), file); if (pv !== null) v = pv; }
    if (v === null) { for (const t of (lost.length ? lost : [s])) missing.push({ kind: 'leo', text: L.norm(t), where: file + ' · ' + where }); return s; }
    /* v7.63 : espaces du début et de la fin gardés (« {name} est » + « Inspiration : … » : « … acheter. Inspiration… ») */
    return L.wrap(s, L.typo(v, code), code);
  };
  /* gabarit à repères {name} : mêmes repères dans la traduction, sinon le français reste */
  const TT = (s, where) => { const t = T(s, where); const marks = x => (String(x).match(/\{\w+\}/g) || []).sort().join(','); return marks(t) === marks(s) ? t : (missing.push({ kind: 'leo', text: L.norm(s), where: 'leo-index.json · ' + where + ' (repères {…} différents)' }), s); };
  const link = L.linker(cfg, lang, root);
  const U = u => typeof u === 'string' && u.startsWith('/') && !u.startsWith('//') ? link.abs('https://www.leonidakit.com' + u).replace(/^https:\/\/www\.leonidakit\.com/, '') : u;
  const deep = (o, where) => Array.isArray(o) ? o.map((x, i) => deep(x, where)) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, v]) => [k, deep(v, where + '.' + k)])) : TT(o, where);
  const fr = json('leo-index.json');
  const lexique = { ...fr.lexique, stop: [...new Set([...(fr.lexique.stop || []), ...(pont.stop || [])])] };
  const analyzer = N.createAnalyzer({ abbreviations: lexique.abbreviations.map(([f, to]) => ({ f, to })), english: lexique.english.map(([f, to]) => ({ f, to })), concepts: lexique.concepts, stop: lexique.stop });
  const terms = s => analyzer.analyze(s).terms.join(' ');
  const links = list => (list || []).map(l => ({ ...l, label: T(l.label, 'lien'), url: U(l.url) }));
  const topic = t => {
    const q = T(t.q, 'sujet ' + t.id);
    const o = { ...t, q, text: T(t.text, 'réponse ' + t.id), status: t.status ? T(t.status, 'statut ' + t.id) : t.status, links: links(t.links) };
    if (t.action && t.action.url) o.action = { ...t.action, url: U(t.action.url) };
    /* la question traduite, ramenée au français par le pont, devient une formulation de plus */
    return o;
  };
  const translated = (name, where) => { const t = T(name, where); return t; };
  /* noms : le nom affiché est traduit ; le nom français rejoint les alias (la question passée par le pont le contient) ;
     v7.64 : le nom traduit est aussi reconnu en entier (alias) et le nom français reste celui que Léo reconnaît (nameFr) */
  const names = [];
  const nameWithAliases = (name, aliases, where, shard) => {
    const n = translated(name, where), al = (aliases || []).flatMap(a => { const ta = typeof a === 'string' ? T(a, where + ' (alias)') : a; return ta !== a ? [a, ta] : [a]; });
    names.push({ shard, name: n, changed: n !== name });
    return { name: n, aliases: n !== name ? [...new Set([name, n, ...al])] : [...new Set(al)], nameFr: n !== name ? name : undefined };
  };
  /* morceaux d'abord (leurs noms traduits servent au noyau : vocabulaire des morceaux, table de réécriture) */
  const shardOut = [];
  for (const f of fs.readdirSync(path.join(root, 'leo')).filter(f => f.endsWith('.json')).sort()) {
    const sh = json('leo/' + f), name = sh.shard;
    if (name === 'passages') continue;
    file = 'leo/' + f;
    const o = { ...sh };
    if (name === 'calculateur') o.knowledge = (sh.knowledge || []).map(topic);
    if (Array.isArray(sh.proofs)) o.proofs = sh.proofs.map(p => T(p, 'preuve'));
    if (Array.isArray(sh.labels)) o.labels = sh.labels.map(p => T(p, 'libellé'));
    if (Array.isArray(sh.items)) {
      if (sh.packed) { const ni = sh.packed.indexOf('name'); o.items = sh.items.map(a => { const b = a.slice(); if (ni >= 0) { b[ni] = T(a[ni], 'lieu'); names.push({ shard: name, name: b[ni], changed: b[ni] !== a[ni] }); } return b; }); }
      else o.items = sh.items.map(x => {
        const r = { ...x }, na = nameWithAliases(x.name, x.aliases, 'fiche ' + x.key, name);
        r.name = na.name; if (na.aliases.length) r.aliases = na.aliases; if (na.nameFr) r.nameFr = na.nameFr;
        /* v7.63 : « inspiration » (modèle réel) aussi ; le texte français reste dans les alias */
        for (const k of ['category', 'description', 'tagline', 'effect', 'repere', 'edition', 'ultimate', 'context', 'ammo', 'range', 'seen', 'proof', 'inspiration'])
          if (typeof x[k] === 'string') r[k] = T(x[k], k + ' ' + x.key);
        for (const k of ['url', 'mapUrl']) if (typeof x[k] === 'string') r[k] = U(x[k]);
        if (Array.isArray(x.places)) r.places = x.places.map(p => p && p.name ? { ...p, name: T(p.name, 'lieu ' + x.key), ...(typeof p.type === 'string' ? { type: T(p.type, 'type de lieu ' + x.key) } : {}) } : p);
        if (x.compat && typeof x.compat.note === 'string') r.compat = { ...x.compat, note: T(x.compat.note, 'compatibilité ' + x.key) };
        return r;
      });
    }
    shardOut.push([f, o]);
  }
  file = 'leo-index.json';
  const core = {
    ...fr, lang: code, prefix: '/' + dir,
    release: { ...fr.release, status: T(fr.release.status, 'sortie') },
    categories: fr.categories.map(c => ({ ...c, label: T(c.label, 'catégorie'), route: U(c.route) })),
    tools: fr.tools.map(t => ({ ...t, label: T(t.label, 'outil') })),
    definitions: fr.definitions.map(d => ({ ...d, title: T(d.title, 'définition'), text: T(d.text, 'définition'), url: U(d.url) })),
    faq: fr.faq.map(f => ({ ...f, text: T(f.text, 'faq'), url: U(f.url) })),
    texts: deep(fr.texts, 'texts'), templates: deep(fr.templates, 'templates'), suggestions: deep(fr.suggestions, 'suggestions'),
    official: Object.fromEntries(Object.entries(fr.official).map(([k, v]) => [k, { ...v, label: T(v.label, 'lien officiel') }])),
    lexique, bridge: pont.pont || [],
    knowledge: fr.knowledge.map(topic),
    names: fr.names.map(([key, name, kind, aliases]) => { const r = nameWithAliases(name, aliases, 'nom ' + key, kind === 'weapon' ? 'armes' : 'monde'); return r.nameFr ? [key, r.name, kind, r.aliases, r.nameFr] : [key, r.name, kind, r.aliases]; }),
    shards: Object.fromEntries(Object.entries(fr.shards).map(([k, v]) => [k, { ...v, file: '/' + dir + v.file, ...(Array.isArray(v.vocab) ? { vocab: v.vocab.slice() } : {}) }]))
  };
  /* v7.64 : les jetons des noms traduits désignent aussi leur morceau (la question « Grenade » charge le morceau des armes) */
  for (const x of names) if (x.changed && core.shards[x.shard] && Array.isArray(core.shards[x.shard].vocab)) { const t = N.nameTokens(analyzer, x.name); if (t) for (const w of t.toks) { const p = w.slice(0, 6); if (p.length >= 3 && !core.shards[x.shard].vocab.includes(p)) core.shards[x.shard].vocab.push(p); } }
  /* v7.64 (anglais, allemand) : table de réécriture de la question vers le français (outils/langues/<code>/leo-pivot.json,
     appliquée par leo-nlp.js → pivot) ; l'espagnol et l'italien passent par le pont (_leo-pont.json) */
  const piv = L.leoPivot(root, code, fr, core, names); if (piv.length) core.pivot = piv;
  delete core.revision;
  core.revision = crypto.createHash('sha256').update(JSON.stringify(core)).digest('hex').slice(0, 12);
  const outputs = new Map();
  outputs.set(dir + '/leo-index.json', JSON.stringify(core));
  for (const [f, o] of shardOut) outputs.set(dir + '/leo/' + f, JSON.stringify({ ...o, revision: core.revision }));
  /* passages des pages de la langue (même découpage que gen-leo.cjs) */
  const passages = [];
  {
    const { JSDOM } = require('jsdom');
    const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
    const pages = lang.pages.filter(p => !p.includes('/') || /^(?:lieux|personnages|entreprises|demeures|planques)\//.test(p)).sort();
    for (const file of pages) {
      const f = path.join(root, dir, file); if (!fs.existsSync(f)) continue;
      const html = (ctx.outputs && ctx.outputs.get(dir + '/' + file)) || fs.readFileSync(f, 'utf8');
      if (/http-equiv=["']refresh/i.test(html) || /name=["']robots["'][^>]*noindex/i.test(html)) continue;
      const dom = new JSDOM(html), dd = dom.window.document, main = dd.querySelector('main'); if (!main) { dom.window.close(); continue; }
      const title = flat(dd.querySelector('title')?.textContent || '').replace(/\s*\|\s*Leonidakit$/, '');
      for (const s of main.querySelectorAll('script,style,noscript,form,nav,table,figure,.lk-stack,.veh-grid,.arm-grid,.cmp-tray,.own-bar,#suggest,.leo-panel,[aria-hidden="true"],#sources,#sources-calc,[id^="src-"],[class*="ed-src"],.ed-sources,.lk-fr,.sr-only')) s.remove();
      const textOf = node => { let out = ''; const visit = n => { for (const ch of n.childNodes) { if (ch.nodeType === 3) out += ch.nodeValue; else if (ch.nodeType === 1) { if (ch.tagName === 'BR') out += ' '; else { out += ' '; visit(ch); out += ' '; } } } }; visit(node); return flat(out); };
      let heading = '', anchor = '', buffer = [], len = 0;
      const flush = () => { if (len >= Math.min(PASSAGE_MIN, 120)) passages.push({ p: '/' + dir + '/' + file, a: anchor, t: title, h: heading, x: buffer.join(' ') }); buffer = []; len = 0; };
      const walk = el => { for (const node of el.children) { const tag = node.tagName.toLowerCase();
        if (/^h[1-3]$/.test(tag)) { flush(); heading = textOf(node).replace(/^\d{2}\s*\/\s*[A-ZÀÁÈÉÌÍÒÓÙÚÑÄÖÜ' ]+\s*/, ''); const anc = node.id || node.closest('[id]')?.id || ''; if (anc && anc !== 'main') anchor = anc; continue; }
        if (['p', 'li', 'dd', 'dt', 'summary', 'blockquote'].includes(tag)) { const t = textOf(node); if (t.length < 25) continue; const anc = node.closest('[id]')?.id || ''; if (anc && anc !== 'main' && !node.closest('section')?.id) anchor = anc;
          for (const sentence of t.split(/(?<=[.!?…])\s+(?=[A-ZÀÁÈÉÌÍÒÓÙÚÑÄÖÜ¿¡«“„0-9])/)) { if (len + sentence.length > PASSAGE_MAX && len >= PASSAGE_MIN) flush(); buffer.push(sentence); len += sentence.length + 1; } if (len >= PASSAGE_MAX) flush(); continue; }
        if (node.children.length) walk(node); } };
      walk(main); flush();
      for (const p of passages) if (p.p === '/' + dir + '/' + file && p.a && !dd.getElementById(p.a)) p.a = '';
      dom.window.close();
    }
  }
  outputs.set(dir + '/leo/passages.json', JSON.stringify({ schemaVersion: 2, shard: 'passages', revision: core.revision, items: passages.map(p => ({ ...p, s: terms(p.h + ' ' + p.x) })) }));
  return { outputs, missing };
}
module.exports = { build };
