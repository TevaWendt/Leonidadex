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
/* v7.61-v7.64 : « pages »: "*" = toutes les pages françaises du site (racine et dossiers), sauf « exclure » (liste globale
   ou propre à la langue) et les dossiers qui ne sont pas des pages (outils, api, images, Léo, dossiers des langues). Les
   redirections et la page 404 sont traduites aussi (une adresse /es/… inconnue montre la page introuvable en espagnol) ;
   elles n'ont ni hreflang ni place dans le plan du site (noindex). Lu une fois par processus, par racine et par version
   du fichier. */
const CFG = new Map();
function frPages(root, cfg) {
  const skip = new Set(['outils', 'api', 'node_modules', 'img', 'photos', 'fonts', 'leo', 'data', ...cfg.langues.map(l => l.dossier).filter(Boolean)]);
  const out = [];
  (function rec(dir) {
    for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = dir ? dir + '/' + e.name : e.name;
      if (e.isDirectory()) { if (!skip.has(e.name) && !e.name.startsWith('.')) rec(rel); }
      else if (e.name.endsWith('.html') && !(cfg.exclure || []).includes(rel)) out.push(rel);
    }
  })('');
  return out.sort();
}
function config(root = ROOT) {
  const f = path.join(root, 'outils/langues.json'), key = root + '|' + fs.statSync(f).mtimeMs;
  if (!CFG.has(key)) {
    const c = readJSON(root, 'outils/langues.json');
    for (const l of c.langues) if (l.pages === '*') { const ex = new Set(l.exclure || []); l.pages = frPages(root, c).filter(p => !ex.has(p)); l.toutes = true; }
    CFG.clear(); CFG.set(key, c);
  }
  return CFG.get(key);
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
/* v7.62 : guillemets de chaque langue (« » français → “ ” en anglais, „ “ en allemand) */
const QUOTES = { en: ['“', '”'], de: ['„', '“'] };
const quotesOf = code => QUOTES[code] || QUOTES.en;
/* langues qui écrivent « 20 % » (espace insécable devant %) ; les autres collent : « 20% » */
const PCT_SPACE = new Set(['es', 'de']);
const typo = (s, code) => code === 'fr' ? s : String(s).replace(/(?<=[\p{L}\p{N})\]”“’%*])[ \u00a0\u202f]+([:;?!])/gu, '$1').replace(/«\s*/g, quotesOf(code)[0]).replace(/\s*»/g, quotesOf(code)[1]);

/* ---------- mémoire de traduction ---------- */
/* outils/langues/<code>/*.json : { "_note": …, "_ignorer": [chaînes de code à ne pas traduire], "texte": "translation",
   "fichier.js::texte": "traduction propre à ce fichier", "texte": "=" (identique : nom propre, marque) }.
   Un même mot peut être du texte lu et un identifiant dans le même fichier (« joueurs » : unité affichée et nom d'un
   critère) : la valeur est alors une règle ou une liste de règles { "si": "expression", "texte": "traduction" } ; « si »
   est testé sur le code qui précède la chaîne (80 caractères ; pour une valeur JSON, le nom de sa clé). Aucune règle
   vérifiée : la chaîne reste telle quelle (c'est du code), sans être signalée. */
function memoire(root, code) {
  const dir = path.join(root, 'outils/langues', code), map = new Map(), from = new Map(), ignore = new Set(), conflicts = [], rules = [], noScript = new Set(), motifs = [];
  if (!fs.existsSync(dir)) return { map, from, ignore, conflicts, files: [], rules, noScript, motifs, nums: new Map(), code };
  /* leo-pivot.json : expressions de la question de Léo (outils/leo-langues.cjs), pas des traductions */
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json') && !f.startsWith('_') && f !== 'leo-pivot.json').sort();
  for (const f of files) {
    const data = readJSON(root, 'outils/langues/' + code + '/' + f);
    for (const [k, v] of Object.entries(data)) {
      if (k === '_ignorer') { for (const x of v) ignore.add(String(x)); continue; }
      /* v7.61 : « _scriptsJamais » : textes traduits dans les pages mais qui, dans un script, sont des identifiants (« source »,
         « fiche », « calculs ») : jamais remplacés dans un script, sauf entrée propre au fichier (« fichier.js::texte »). */
      if (k === '_scriptsJamais') { for (const x of v) noScript.add(norm(x)); continue; }
      if (k === '_motifs') { for (const [pk, pv] of Object.entries(v)) if (typeof pv === 'string' && pv) motifs.push({ key: norm(pk), value: pv, from: f }); continue; }
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
  const lg = readJSON(root, 'outils/langues.json').langues.find(l => l.code === code) || {}, locale = lg.locale || code;
  /* v7.63 : « milliers »: "toujours" (italien) : point des milliers dès 1 000 (« 2.547 »), comme l'écrivent les navigateurs ;
     l'ICU de Node, lui, ne groupe qu'à partir de 10 000 pour it-IT. */
  const fmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 6, ...(lg.milliers === 'toujours' ? { useGrouping: 'always' } : {}) });
  const nums = new Map();
  for (const [key, v] of map) {
    if (typeof v !== 'string' || v === '=' || key.startsWith('re:')) continue;
    const found = [...key.matchAll(NUM)].map(m => m[0]); if (!found.length) continue;
    let rest = v, out = '', ok = true;
    /* v7.64 : un nombre écrit sans séparateur (« 2547 », « 2026 ») peut être repris tel quel par la traduction (allemand :
       « 2547 Orte ») ou au format de la langue (italien : « 2.547 luoghi ») : la forme choisie est gardée pour ce trou */
    const raw = [];
    for (const n of found) { let t = numText(n, fmt), i = rest.indexOf(t), r = false; if (i < 0 && /^\d+$/.test(n)) { t = n; i = rest.indexOf(t); r = true; } if (i < 0) { ok = false; break; } raw.push(r); out += rest.slice(0, i) + '⟨#⟩'; rest = rest.slice(i + t.length); }
    if (ok) nums.set(key.replace(NUM, '⟨#⟩'), { v: out + rest, key, raw });
  }
  /* Motifs (« _motifs » d'un fichier de la mémoire) : une phrase fabriquée par un générateur, avec des trous {1}, {2}…
     (« Nom en jeu inconnu à ce jour. Équivalent réel : {1}. Type : {2}. ») ; chaque trou est traduit à son tour s'il est
     dans la mémoire (« naturel » → « natural »), sinon gardé tel quel (nom propre, adresse). Les plus longs d'abord. */
  const esc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const m of motifs) m.re = new RegExp('^' + m.key.split(/(\{\d+\})/).map(part => /^\{\d+\}$/.test(part) ? '(.+?)' : esc(part)).join('') + '$');
  motifs.sort((a, b) => b.key.replace(/\{\d+\}/g, '').length - a.key.replace(/\{\d+\}/g, '').length);
  /* lexique français de la mémoire : mots des textes français absents de toutes les traductions (« villes », « quartiers ») ;
     sert à repérer un petit texte lu (un seul mot, sans accent) qui manque, comme une étiquette d'un fichier de données */
  const lex = new Set(), seen = new Set(), wordsOf = t => String(t).toLowerCase().replace(/<\/?\d+\/?>/g, ' ').split(/[^a-zà-öø-ÿœæ’'-]+/).filter(w => w.length > 2);
  for (const [key, v] of map) { if (typeof v !== 'string') continue; const k = key.includes('::') ? key.split('::').slice(1).join('::') : key; if (v === '=') { for (const w of wordsOf(k)) seen.add(w); continue; } for (const w of wordsOf(v)) seen.add(w); for (const w of wordsOf(k)) lex.add(w); }
  for (const w of seen) lex.delete(w);
  return { map, from, ignore, conflicts, files, nums, fmt, rules, noScript, motifs, lex, code };
}
const NUM = /(?<![<\/\d])(?:\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?![\d\/>])/g;
/* nombre au format de la langue ; raw : un nombre écrit sans séparateur (« 2026 », « 2547 ») est gardé tel quel */
const numText = (n, fmt, raw) => raw && /^\d+$/.test(n) ? n : fmt.format(Number(n.replace(/[ \u00a0\u202f]/g, '').replace(',', '.')));
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
      const list = [...k.matchAll(NUM)].map((m, j) => numText(m[0], mem.fmt, hit.raw && hit.raw[j])); let i = 0;
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
/* Traduction complète d'un texte : entrée exacte (ou nombres), puis motif, puis phrase par phrase (un paragraphe fabriqué
   par un générateur se traduit avec des phrases déjà connues). onMiss reçoit chaque morceau qui manque (la plus petite unité :
   la phrase ou le trou d'un motif) ; le texte reste alors tel quel (null). */
const SENT = /(?<=[.!?…»”)])\s+(?=[A-ZÀ-ÖØ-Þ«“"(0-9<])/g;
/* v7.62 : dans une traduction allemande, « am 1. Oktober », « z. B. Pumpgun », « 2 Std. Spielzeit » ne finissent pas une phrase */
const SENT_DE = /(?<=[.!?…»”“)])\s+(?=[A-ZÀ-ÖØ-Þ«„"(0-9<])/g;
const DE_NOEND = /(?:(?<![\d.])\d{1,2}|\b(?:z\. B|d\. h|u\. a|Std|Min|Sek|Nr|ca|bzw|usw|vgl|inkl|evtl|ggf|Mio|Mrd|Tsd|Abb|Jh|St))\.$/;
function sentences(k, code) {
  const out = []; let depth = 0, last = 0;
  const marks = [...k.matchAll(/<(\/?)\d+(\/?)>/g)];
  for (const m of k.matchAll(code === 'de' ? SENT_DE : SENT)) {
    if (code === 'de' && DE_NOEND.test(k.slice(0, m.index))) continue;
    depth = 0; for (const t of marks) { if (t.index >= m.index) break; if (t[2]) continue; depth += t[1] ? -1 : 1; }
    if (depth === 0) { out.push(k.slice(last, m.index)); last = m.index + m[0].length; }
  }
  out.push(k.slice(last));
  return out.filter(x => x.trim());
}
/* français probable (accent, mot outil, vocabulaire du site) : la règle de uiLike sans « mot à majuscule », qui prendrait
   un nom propre (« Azimut 85 ») pour du texte */
function frenchy(v) { const s = String(v); if (/[À-ÖØ-öø-ÿŒœ«»]/.test(s.replace(/[’]/g, ''))) return true; return s.toLowerCase().split(/[\s,.;:!?()\/]+/).some(w => STOP.has(w) || FR_VOCAB.has(w) || /^[ldjtsnqc]’/.test(w)); }
/* mot du lexique français de la mémoire (« concessions », « villes ») */
function lexHit(v, mem) { return !!(mem && mem.lex) && String(v).toLowerCase().split(/[^a-zà-öø-ÿœæ’'-]+/).some(w => mem.lex.has(w)); }
const neutral = (v, mem) => !frenchy(v) && !lexHit(v, mem);
/* trou de motif fait de morceaux (« Concessions · Southside », « Fusil semi-automatique, Grassrivers 01 ») : chaque morceau
   traduit s'il est connu, gardé s'il est neutre (nom propre) ; null si un morceau français reste inconnu */
function partsOf(mem, slot, file) {
  const bits = slot.split(/( · |, | \/ | – | — )/); if (bits.length < 3) return null;
  let any = false; const out = [];
  for (let i = 0; i < bits.length; i++) {
    if (i % 2) { out.push(bits[i]); continue; }
    const b = bits[i]; if (!b.trim()) { out.push(b); continue; }
    let t = deep(mem, b, file, null, () => {}, true);
    if ((t === null || t === KEEP) && /^[a-zà-ÿ]/.test(b)) { const u = lowerMap(mem).get(b.toLowerCase()); if (typeof u === 'string' && u !== '=') t = /^[A-Z][a-z]/.test(u) && mem.code !== 'de' ? u.charAt(0).toLowerCase() + u.slice(1) : u; }
    if (t !== null && t !== KEEP) { out.push(t); any = true; continue; }
    if (neutral(b, mem)) { out.push(b); continue; }
    return null;
  }
  return any ? out.join('') : null;
}
function lowerMap(mem) { if (!mem.lower) { mem.lower = new Map(); for (const [k, v] of mem.map) if (!k.includes('::') && typeof v === 'string' && !mem.lower.has(k.toLowerCase())) mem.lower.set(k.toLowerCase(), v === '=' ? k : v); } return mem.lower; }
function motif(mem, k, file, onMiss) {
  for (const m of mem.motifs || []) {
    const r = k.match(m.re); if (!r) continue;
    const slots = []; let ok = true;
    for (const slot of r.slice(1)) {
      /* nombre à la française (« 1 250 », « 2,5 ») : au format de la langue */
      if (/^\d{1,3}(?:[ \u00a0\u202f]\d{3})+(?:,\d+)?$|^\d+,\d+$/.test(slot)) { slots.push(numText(slot, mem.fmt)); continue; }
      if (!LETTERS.test(slot) || /^[\d\s.,:;%$€+×–—-]+$/.test(slot)) { slots.push(slot); continue; }
      let t = deep(mem, slot, file, null, () => {}, true);
      /* trou en minuscules (« bateaux et jet-skis », « suv et 4x4 ») : l'entrée de même texte à la casse près, rendue en minuscules */
      if ((t === null || t === KEEP) && /^[a-zà-ÿ]/.test(slot)) { const u = lowerMap(mem).get(slot.toLowerCase()); if (typeof u === 'string' && u !== '=') t = /^[A-Z][a-z]/.test(u) && mem.code !== 'de' ? u.charAt(0).toLowerCase() + u.slice(1) : u; }
      if (t === null || t === KEEP) { const pv = partsOf(mem, slot, file); if (pv !== null) t = pv; }
      if (t !== null && t !== KEEP) { slots.push(t); continue; }
      if ((frenchy(slot) || lexHit(slot, mem)) && !mem.ignore.has(norm(slot))) { onMiss(slot); ok = false; }
      slots.push(slot);
    }
    if (!ok) return null;
    return m.value.replace(/\{(\d+)\}/g, (x, i) => slots[i - 1] ?? x);
  }
  return null;
}
function deep(mem, key, file, before, onMiss, noSplit) {
  const k = norm(key); if (!k) return null;
  const v = lookup(mem, k, file, before); if (v !== null) return v;
  if (!noSplit) {
    const parts = sentences(k);
    if (parts.length > 1) {
      const lost = [], out = parts.map(p => { const lp = [], t = deep(mem, p, file, before, x => lp.push(x), true); if (t !== null && t !== KEEP) return t; if (neutral(p, mem)) return p; lost.push(...lp); return null; });
      if (out.every((x, i) => x === parts[i])) { onMiss(k); return null; }
      if (!lost.length && out.every(x => x !== null)) return out.join(' ');
      for (const x of lost) onMiss(x);
      return null;
    }
  }
  const lost = [], mv = motif(mem, k, file, x => lost.push(x)); if (mv !== null) return mv;
  if (lost.length) { for (const x of lost) onMiss(x); return null; }
  onMiss(k); return null;
}
/* Garde les espaces du début et de la fin d'origine autour d'une traduction. */
function wrap(original, translated, code) {
  let lead = original.match(/^\s*/)[0].replace(/[\u00a0\u202f]/g, ' '), tail = original.match(/\s*$/)[0].replace(/[\u00a0\u202f]/g, ' ');
  /* hors du français : pas d'espace devant : ; ? ! % , . ) ” ni après “ ( (l'espace d'origine venait de la typographie française) */
  if (code && code !== 'fr') {
    const [o, c] = quotesOf(code), pct = PCT_SPACE.has(code) ? '' : '%';
    if (new RegExp('^[:;?!' + pct + ',.)' + c + ']').test(translated)) lead = '';
    if (new RegExp('[' + o + '(]$').test(translated)) tail = '';
  }
  /* v7.61 : l'espagnol et l'allemand gardent l'espace (insécable) devant « % » : « 20 % » */
  if (PCT_SPACE.has(code) && /^%/.test(translated)) lead = original.match(/^\s*/)[0];
  return lead + translated + tail;
}
/* Chaîne de ponctuation seule (« « », « » », « : », « % ») : sa typographie française devient anglaise. */
const PUNCT_ONLY = /^[\s\u00a0\u202f]*[«»:;?!%][\s\u00a0\u202f«»:;?!%.,×()]*$/;
function punct(value, code) {
  if (code === 'fr' || !PUNCT_ONLY.test(value) || !/[«»]|[\s\u00a0\u202f][:;?!%]/.test(value)) return null;
  const [o, c] = quotesOf(code);
  /* v7.61 : l'espagnol et l'allemand gardent l'espace devant « % » (« 20 % ») */
  return value.replace(/[\u00a0\u202f]/g, ' ').replace(/«\s*/g, o).replace(/\s*»/g, c).replace(PCT_SPACE.has(code) ? /\s+([:;?!])/g : /\s+([:;?!%])/g, '$1');
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
  /* chemin depuis la racine d'une adresse écrite dans la page française « file » (« ../style.css » dans vehicules/x.html →
     style.css ; « carnets/ » → carnets/index.html) ; null si l'adresse sort du site */
  function target(p, file) {
    let t = p.startsWith('/') ? p.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file || 'index.html'), p));
    if (t === '.' || t === './') t = '';
    if (t.startsWith('../')) return null;
    if (t === '' || t.endsWith('/')) t += 'index.html';
    return t;
  }
  /* La langue reproduit l'arborescence du français dans /<dir>/ : une page traduite (ou un fichier traduit) garde son adresse
     relative ; tout le reste (images, styles, pages pas encore traduites) remonte d'un dossier (« ../ ») ou garde son adresse
     absolue. v7.61 : pages des dossiers (vehicules/x.html…) comprises. */
  function rel(url, opts = {}) {
    if (!url || /^(?:[a-z]+:|\/\/|#|data:|blob:|javascript:)/i.test(url)) return { url };
    const m = url.match(/^([^?#]*)(.*)$/), p = m[1], rest = m[2];
    if (!p) return { url };
    const t = target(p, opts.file || opts.from); if (t === null) return { url };
    const own = (isPage(t) && pages.has(t)) || (opts.translated && opts.translated.has(t));
    if (p.startsWith('/')) return own ? { url: '/' + dir + p + rest, own: true } : { url, fr: isPage(t) };
    return own ? { url, own: true } : { url: '../' + url, fr: isPage(t) };
  }
  function abs(u) { /* https://www.leonidakit.com/x → /en/x si la page est traduite */
    const m = String(u).match(/^(https:\/\/www\.leonidakit\.com)(\/[^?#]*)?(.*)$/); if (!m) return u;
    const p = m[2] || '/', t = target(p, '');
    if (t !== null && pages.has(t)) return m[1] + '/' + dir + p + m[3];
    return u;
  }
  return { rel, abs, pages, dir, target };
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
  /* 404.html est servie à n'importe quelle adresse : liens absolus */
  const toRoot = file === '404.html' ? '/' : (inLang ? '../' : '') + '../'.repeat(depth);
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
/* hreflang dans le <head> d'une page qui a au moins une traduction (idempotent).
   v7.64 (référencement) : chaque version liste toutes les autres (fr, en, es, it, de) et elle-même ; « x-default » (visiteur
   dont la langue n'est pas publiée) vise la version anglaise quand elle existe, sinon la française ; une page non indexée
   (noindex : page introuvable, redirections) n'a pas de hreflang (Google ignore et signale les hreflang vers ces pages). */
function versions(file, root = ROOT) {
  const cfg = config(root), base = 'https://www.leonidakit.com/';
  const path0 = file === 'index.html' ? '' : file.replace(/(^|\/)index\.html$/, '$1');
  const list = [[cfg.source, base + path0, cfg.langues.find(l => l.code === cfg.source)]];
  for (const l of publiees(cfg)) if ((l.pages || []).includes(file)) list.push([l.code, base + l.dossier + '/' + path0, l]);
  return list;
}
function alternates(file, root = ROOT) {
  const list = versions(file, root);
  if (list.length < 2) return '';
  const def = list.find(([c]) => c === 'en') || list[0];
  return list.map(([c, u]) => '<link rel="alternate" hreflang="' + c + '" href="' + u + '">').join('\n') + '\n<link rel="alternate" hreflang="x-default" href="' + def[1] + '">\n';
}
const notIndexed = html => /<meta name="robots" content="[^"]*noindex/i.test(html) || /http-equiv="refresh"/i.test(html);
function placeAlternates(html, file, root = ROOT) {
  html = html.replace(/<link rel="alternate" hreflang="[^"]+" href="[^"]*">\n?/g, '').replace(/<meta property="og:locale:alternate" content="[^"]*">\n?/g, '');
  /* v7.64 : nom du site pour les aperçus de partage (og:site_name), une fois */
  if (!/property="og:site_name"/.test(html)) html = html.replace(/(<meta property="og:type" content="[^"]*">)/, '$1<meta property="og:site_name" content="Leonidakit">');
  if (notIndexed(html)) return html;
  const a = alternates(file, root); if (!a) return html;
  html = /<link rel="canonical"[^>]*>\n?/.test(html) ? html.replace(/(<link rel="canonical"[^>]*>\n?)/, '$1' + a) : html.replace('</head>', a + '</head>');
  /* og:locale:alternate : les autres langues de la page (Facebook, LinkedIn…) */
  const m = html.match(/<meta property="og:locale" content="([^"]*)">\n?/);
  if (m) { const others = versions(file, root).map(x => x[2] && x[2].og).filter(o => o && o !== m[1]); if (others.length) html = html.replace(m[0], m[0] + others.map(o => '<meta property="og:locale:alternate" content="' + o + '">').join('\n') + (m[0].endsWith('\n') ? '\n' : '')); }
  return html;
}
/* v7.64 (référencement) : titres pour les moteurs de recherche. Les joueurs cherchent « GTA 6 » bien plus que « GTA VI » :
   le <title> et les titres de partage (og:title, twitter:title) écrivent « GTA 6 » ; la page elle-même (titre h1, textes,
   description, données structurées) garde « GTA VI ». Idempotent ; titleSeo(html, false) revient à « GTA VI » (la mémoire de
   traduction connaît les titres français d'origine). */
function titleSeo(html, on = true) {
  /* « GTA VI » et, dans un mot composé allemand, « GTA-VI-Rechner » → « GTA-6-Rechner » */
  const from = on ? /\bGTA([ -])VI\b/g : /\bGTA([ -])6\b/g, to = on ? 'GTA$16' : 'GTA$1VI', SUFFIX = ' | Leonidakit', idx = !notIndexed(html);
  return html.replace(/(<title>)([^<]*)(<\/title>)/, (m, a, t, b) => {
    let x = t.replace(from, to);
    /* titre long (plus de 65 signes) : Google l'aurait coupé ; le nom du site, qu'il affiche déjà à part, est retiré */
    if (on && idx && x.length > 65 && x.endsWith(SUFFIX)) x = x.slice(0, -SUFFIX.length);
    if (!on && idx && x && !x.endsWith(SUFFIX)) x += SUFFIX;
    return a + x + b;
  }).replace(/(<meta (?:property|name)="(?:og:title|twitter:title)" content=")([^"]*)(")/g, (m, a, t, b) => a + t.replace(from, to) + b);
}

/* JSON porté par un attribut : chaque texte traduit, sauf les clés d'identifiants (jsonCode) et les adresses */
function jsonText(o, cfg, tr, key = '') {
  if (Array.isArray(o)) return o.map(x => jsonText(x, cfg, tr, key));
  if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, jsonText(v, cfg, tr, k)]));
  if (typeof o !== 'string' || (cfg.jsonCode || []).includes(key) || !textual(o)) return o;
  const t = tr(o); return t === null ? o : t;
}
const foldSearch = s => String(s).replace(/ß/g, 'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/’/g, "'").toLowerCase();
/* ---------- traduction d'une page ---------- */
function translatePage(html, file, code, ctx) {
  const { P5 } = deps(), { cfg, mem, link, translatedScripts, report } = ctx;
  html = titleSeo(html, false);
  /* v7.64 : mots de recherche comparés tels quels par le script de la page (catalogue.js, localisateur.js, common.js : la saisie
     est ramenée sans accent ni majuscule, pas le texte cherché) : la traduction est ramenée de la même façon (langues.json →
     « attributsCherches ») */
  const SEARCH_ATTRS = new Set(cfg.attributsCherches || []);
  const ATTRS = new Set(cfg.attributs), METAS = new Set(cfg.metas), LD = new Set(cfg.jsonld);
  const doc = P5.parse(html, { sourceCodeLocationInfo: true, scriptingEnabled: false });
  const edits = [], tagOverride = new Map();
  const miss = (kind, text, where) => report.missing.push({ kind, text: norm(text), where: file + (where ? ' · ' + where : '') });
  const tr = (text, where) => { if (!textual(text)) return null; let v = deep(mem, text, file, null, t => miss('page', t, where)); if (v === KEEP) v = null; if (v === null) return null; return typo(v, code); };
  /* texte porté par une adresse : titre de la carte (« carte.html#pins=…&t=Concessions »), recherche d'images ou Wikipédia
     (« …?q=Pontiac Bonneville fin des années 80 », Wikipédia en anglais pour une page anglaise) */
  const urlPart = enc => { let d; try { d = decodeURIComponent(enc.replace(/\+/g, ' ')); } catch (e) { return null; } if (!textual(d)) return null; const t = tr(d, '@href'); return t === null || t === d ? null : encodeURIComponent(t); };
  function urlText(u) {
    let m = String(u).match(/^([^#]*#(?:[^#]*&)?t=)([^&]*)(.*)$/);
    if (m) { const t = urlPart(m[2]); return t === null ? u : m[1] + t + m[3]; }
    m = String(u).match(/^https:\/\/fr\.wikipedia\.org(\/w\/index\.php\?search=)([^&#]*)(.*)$/);
    if (m && code !== 'fr') { const t = frenchy(decodeURIComponent(m[2])) ? urlPart(m[2]) : null; return 'https://' + code + '.wikipedia.org' + m[1] + (t ?? m[2]) + m[3]; }
    m = String(u).match(/^(https:\/\/www\.google\.com\/search\?(?:[^#]*&)?q=)([^&#]*)(.*)$/);
    if (m && frenchy(decodeURIComponent(m[2]))) { const t = urlPart(m[2]); return t === null ? u : m[1] + t + m[3]; }
    return u;
  }
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
        /* v7.64 : description pour les moteurs de recherche raccourcie dans une langue (« @meta::texte » de la mémoire) sans
           toucher au même texte affiché dans la page */
        const metaKey = name === 'content' && tag === 'meta' && /description$/.test(attr(el, 'name') || attr(el, 'property') || '') ? mem.map.get('@meta::' + norm(a.value)) : undefined;
        const t = typeof metaKey === 'string' ? typo(metaKey, code) : tr(a.value, '@' + name); if (t !== null) v = SEARCH_ATTRS.has(name) ? foldSearch(t) : t;
      }
      /* attribut porteur de JSON lu par un script (langues.json → « attributsJson ») : { attribut : [clés de texte] } (galerie :
         data-medias, légendes « t » et textes alternatifs « a ») ou { attribut : "*" } (chaque texte, sauf identifiants et
         adresses : data-cat-tags) ; une liste d'attributs vaut "*" pour chacun */
      const jspec = Array.isArray(cfg.attributsJson) ? (cfg.attributsJson.includes(name) ? '*' : null) : (cfg.attributsJson || {})[name];
      if (Array.isArray(jspec)) {
        try { const keys = new Set(jspec); let touched = false; const fix = o => Array.isArray(o) ? o.map(fix) : o && typeof o === 'object' ? Object.fromEntries(Object.entries(o).map(([k, x]) => { if (keys.has(k) && typeof x === 'string') { const t = tr(x, '@' + name + '.' + k); if (t !== null && t !== x) { touched = true; return [k, t]; } } return [k, fix(x)]; })) : o; const out = fix(JSON.parse(a.value)); if (touched) v = JSON.stringify(out); } catch (e) { /* JSON illisible : attribut gardé */ }
      } else if (jspec === '*') { let j = null; try { j = JSON.parse(a.value); } catch (e) { j = null; } if (j !== null) { const nj = jsonText(j, cfg, t => tr(t, '@' + name)); if (JSON.stringify(nj) !== JSON.stringify(j)) v = JSON.stringify(nj); } }
      if (name === 'lang' && tag === 'html') v = code;
      if (name === 'content' && tag === 'meta' && /refresh/i.test(attr(el, 'http-equiv') || '')) v = a.value.replace(/(url=)(\S+)/i, (mm, k, u) => k + link.rel(u, { file, translated: translatedScripts }).url);
      if (name === 'value' && tag === 'input' && /^\d{1,3}(?:[ \u00a0\u202f]\d{3})+$/.test(a.value)) v = new Intl.NumberFormat(langue(cfg, code).locale, langue(cfg, code).milliers === 'toujours' ? { useGrouping: 'always' } : {}).format(Number(a.value.replace(/\D/g, '')));
      if (name === 'content' && tag === 'meta' && attr(el, 'property') === 'og:locale') v = langue(cfg, code).og;
      if (name === 'content' && tag === 'meta' && /^(?:og:url)$/.test(attr(el, 'property') || '')) v = link.abs(a.value);
      if (name === 'href' && tag === 'link' && /canonical/.test(attr(el, 'rel') || '')) v = link.abs(a.value);
      if ((name === 'href' && tag !== 'link') || (name === 'href' && tag === 'link' && !/canonical|alternate/.test(attr(el, 'rel') || '')) || name === 'src' || name === 'action' || name === 'poster' || name === 'data-base' || name === 'data-big') {
        const r = link.rel(a.value, { file, translated: translatedScripts });
        if (r.url !== a.value) v = r.url;
        if (name === 'href') { const w = urlText(v ?? a.value); if (w !== (v ?? a.value)) v = w; }
        if (tag === 'a' && r.fr && attr(el, 'hreflang') === undefined) extra += ' hreflang="fr"';
      }
      if (name === 'data-reel') { const w = urlText(a.value); if (w !== a.value) v = w; }
      if (name === 'srcset' || name === 'imagesrcset') { const nv = a.value.split(',').map(part => { const [u, ...d] = part.trim().split(/\s+/); return [link.rel(u, { file }).url, ...d].join(' '); }).join(', '); if (nv !== a.value.split(',').map(p => p.trim()).join(', ')) v = nv; }
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
      const where = (run[0].parentNode && run[0].parentNode.tagName) || '';
      let v = deep(mem, seg.key, file, null, t => miss('page', t, where)); if (v === KEEP) v = null;
      if (v === null) { /* morceaux manquants déjà signalés */ }
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
  /* autres données JSON posées dans la page (<script type="application/json"> sans description dans « jsonPages ») : chaque
     texte traduit, sauf les clés d'identifiants (jsonCode, jsonCodePages), les adresses et le SVG */
  const PAGE_CODE = new Set([...(cfg.jsonCode || []), ...(cfg.jsonCodePages || [])]);
  (function pj(node) {
    for (const c of kids(node)) {
      if (c.tagName === 'script' && attr(c, 'type') === 'application/json' && c.childNodes[0]) {
        if ((cfg.jsonPages || {})[attr(c, 'id')]) continue; /* données décrites dans « jsonPages » : traduites plus bas */
        const t = c.childNodes[0], loc = t.sourceCodeLocation; let data;
        try { data = JSON.parse(t.value); } catch { continue; }
        const fix = (o, k) => {
          if (Array.isArray(o)) return o.map(x => fix(x, k));
          if (o && typeof o === 'object') { const r = {}; for (const [kk, vv] of Object.entries(o)) r[kk] = fix(vv, kk); return r; }
          if (typeof o !== 'string' || PAGE_CODE.has(k) || /^\s*</.test(o) || (/^[\w.#=?&\/-]+$/.test(o) && /[\/.]\w/.test(o))) return o;
          const v = tr(o, 'json:' + k); return v === null ? o : v;
        };
        const next = JSON.stringify(fix(data)).replace(/</g, '\\u003c');
        if (next !== JSON.stringify(data).replace(/</g, '\\u003c')) edits.push([loc.startOffset, loc.endOffset, next]);
      } else pj(c);
    }
  })(doc);
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
  if (!/http-equiv="refresh"/i.test(out)) out = placeLangBar(out, file, code, ctx.root);
  out = placeAlternates(titleSeo(out), file, ctx.root);
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
function uiLike(v, lex) {
  const s = String(v); if (!LETTERS.test(s)) return false;
  if (lex && s.toLowerCase().split(/[^a-zà-öø-ÿœæ’'-]+/).some(w => lex.has(w))) return true;
  if (/[À-ÖØ-öø-ÿŒœ’«»]/.test(s) || FRNUM.test(s)) return true;
  const plain = s.replace(/<[^>]*>/g, ' '), words = plain.toLowerCase().split(/[\s,.;:!?()\/]+/).filter(Boolean);
  if (words.some(w => STOP.has(w) || FR_VOCAB.has(w) || /^[ldjtsnqc]’/.test(w))) return true;
  return /(^|\s|>)[A-ZÀ-Ý][a-zà-ÿ]{2,}/.test(plain) && /\s/.test(plain.trim());
}
/* Identifiant en minuscules sans espace (« divers », « capot », « calcul ») dans un script : c'est presque toujours une clé de
   code (catégorie, famille, adresse) ; il ne change que si la mémoire a une entrée propre au fichier (« fichier.js::mot ») */
const SLUG = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
function slugKept(value, file, mem) { return SLUG.test(value) && !mem.map.has(file + '::' + value); }
function translateText(value, file, ctx, where, before) {
  /* chaîne entière d'abord ; sinon, si elle contient du HTML, ses morceaux de texte et ses attributs lisibles */
  const { mem, code } = ctx, report = (ctx.cfg.scriptsDonnees || []).includes(file) ? { missing: [] } : ctx.report;
  /* v7.64 : le lexique français de la mémoire (mots absents de toute traduction) ne sert à repérer un texte lu que dans les
     langues qui gardent les identifiants en minuscules (« motsCodeGardes ») : ailleurs, ces mots isolés sont des clés de code */
  /* manque : texte qui ressemble à du français lu ; en mode « tout » (--extraire en --tout), toute chaîne avec des lettres
     est proposée (candidats), pour trier à la main les petits mots (« Oui », « jour », « puis ») que la règle ne voit pas. */
  const miss = t => { if (mem.ignore.has(norm(t))) return; if (/^[\w.#=?&\/,+-]+$/.test(t) && /[\/.]\w/.test(t)) return; /* adresse ou chemin (« vehicules/x.html ») */ if (uiLike(t, ctx.lang && ctx.lang.motsCodeGardes ? mem.lex : null)) report.missing.push({ kind: 'script', text: norm(t), where: file + where }); else if (ctx.candidates && !(ctx.cfg.scriptsDonnees || []).includes(file)) ctx.candidates.push({ kind: 'script', text: norm(t), where: file + where }); };
  const p = punct(value, code); if (p !== null) return p;
  /* v7.63 : morceau sans lettre qui ferme ou ouvre une citation (« »" », « » (− », « » · ») : guillemets de la langue */
  if (code !== 'fr' && !LETTERS.test(norm(value)) && /[«»]/.test(value)) return value.replace(/«[\s\u00a0\u202f]*/g, quotesOf(code)[0]).replace(/[\s\u00a0\u202f]*»/g, quotesOf(code)[1]);
  if (!textual(value)) return value;
  const whole = lookup(mem, value, file, before);
  if (whole === KEEP) return value;
  if (whole !== null) return wrap(value, typo(whole, code), code);
  /* phrase entière fabriquée (motif) ou paragraphe (phrase par phrase), seulement pour une chaîne sans HTML */
  if (!/[<>]/.test(value) && uiLike(value, mem.lex)) { const lost = [], dv = deep(mem, value, file, before, x => lost.push(x)); if (dv !== null && dv !== KEEP) return wrap(value, typo(dv, code), code); if (lost.length && !(lost.length === 1 && lost[0] === norm(value))) { for (const x of lost) miss(x); return value; } }
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
      const v = deep(mem, t, file, before, x => miss(x)); if (v === KEEP || v === null) return t;
      return wrap(t, typo(v, code), code);
    };
    const flushTag = t => t.replace(JS_ATTR_OPEN, (m, a, v) => { if (!textual(v)) return m; const tv = lookup(mem, v, file, before); if (tv === KEEP) return m; if (tv === null) { miss(v); return m; } return a + escAttr(wrap(v, typo(tv, code), code)); }).replace(JS_ATTR, (m, a, v, b) => { if (!textual(v)) return m; const tv = lookup(mem, v, file, before); if (tv === KEEP) return m; if (tv === null) { miss(v); return m; } return a + escAttr(typo(tv, code)) + b; });
    /* « de la comparaison">× » : la chaîne commence par la fin d'une valeur d'attribut (avant le premier guillemet) */
    /* v7.62 : fin de valeur d'attribut faite seulement de ponctuation (« \u00a0» » de « aria-label="Supprimer « ' + nom + ' »" ») : guillemet de la langue */
    const tailFix = t => t.replace(/^[\s\u00a0\u202f]*[«»:;?!][\s\u00a0\u202f«»:;?!]*(?=")/, m => { const pp = punct(m, code); return pp === null ? m : pp; }).replace(/^[^"<>=]*[A-Za-zÀ-ÿ][^"<>=]*(?=")/, m => { if (!textual(m)) return m; const tv = lookup(mem, m, file, before); if (tv === KEEP) return m; if (tv === null) { if (uiLike(m)) miss(m); return m; } return escAttr(wrap(m, typo(tv, code), code)); });
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
  const LANG_CODES = new Set(ctx.cfg.langues.map(l => l.code));
  const { ACORN } = deps(), { link, code } = ctx;
  const edits = []; let changed = false;
  const pages = link.pages, dir = link.dir;
  const urls = v => v.replace(/(^|[^\w./-])\/((?:[a-z0-9-]+\/)*[a-z0-9-]+\.html)(?=[?#"'\s)]|$)/g, (m, pre, p) => pages.has(p) ? pre + '/' + dir + '/' + p : m);
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
    /* v7.64 : un code de langue (« de », « it ») est toujours du code (LANG === 'de') : jamais traduit */
    if (label === 'string' && LANG_CODES.has(t.value)) continue;
    const raw = code0.slice(t.start, t.end);
    let value = t.value; if (typeof value !== 'string') continue;
    let next = value;
    if (label === 'string' && value.length > 400 && /^\s*[{[]/.test(value)) {
      /* JSON dans une chaîne (modele-donnees.js) : valeur par valeur */
      /* les clés qui portent un identifiant (jsonCode de langues.json : id, genre, rubrique…) ne sont jamais traduites ;
         une unité avec $ ou / (« $/partie ») est comparée par le code : gardée */
      const codeKeys = new Set(ctx.cfg.jsonCode || []);
      try { let touched = false; const data = JSON.parse(value); const fix = (o, key) => { if (Array.isArray(o)) return o.map(x => fix(x, key)); if (o && typeof o === 'object') return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, fix(v, k)])); if (typeof o !== 'string' || codeKeys.has(key) || (key === 'unite' && /[$\/]/.test(o)) || (ctx.lang.motsCodeGardes && slugKept(o, file, ctx.mem))) return o; const t = translateText(o, file, ctx, ' (JSON ' + key + ')', key); if (t !== o) touched = true; return t; }; const out = fix(data, ''); next = touched ? JSON.stringify(out) : value; } catch { next = value; }
    } else {
      const line = code0.slice(0, t.start).split('\n').length, ex = code0.slice(Math.max(0, t.start - 70), Math.min(code0.length, t.end + 50)).replace(/\s+/g, ' ');
      /* v7.61 : un morceau fait seulement d'une balise et d'une ponctuation à la française (« </b> : ») perd l'espace avant
         « : ; ? ! » hors du français (« <b>X</b>: … ») */
      if (code !== 'fr' && /^(?:<[^>]+>)*[\s\u00a0\u202f]+[:;?!][\s\u00a0\u202f]*$/.test(value)) next = value.replace(/[\s\u00a0\u202f]+([:;?!])/, '$1');
      /* v7.62 (allemand) : identifiant en minuscules sans espace gardé (langues.json → « motsCodeGardes ») */
      else next = (ctx.lang.motsCodeGardes && slugKept(value, file, ctx.mem)) ? value : translateText(value, file, ctx, ':' + line + ' · ' + ex, code0.slice(Math.max(0, t.start - 80), t.start));
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
/* scripts locaux d'une page (chemins depuis la racine : « ../fiches.js » dans vehicules/x.html → fiches.js) */
function localScripts(html, file = 'index.html') { return [...html.matchAll(/<script\b[^>]*\ssrc="([^"?#]+)(?:\?v=[a-f0-9]+)?"/g)].map(m => m[1]).filter(u => !/^(?:[a-z]+:|\/\/)/.test(u)).map(u => { const t = u.startsWith('/') ? u.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(file), u)); return t.startsWith('../') ? null : t; }).filter(Boolean); }
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
  const ctx = { cfg, lang, mem, link, report, code, root, translatedScripts: new Set(), candidates: opts.tout ? [] : null };
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
  /* 2. pages */
  const keepPages = new Set();
  for (const p of lang.pages) {
    let html = translatePage(fs.readFileSync(path.join(root, p), 'utf8'), p, code, ctx);
    /* empreintes des scripts traduits (les autres gardent celle de la page française) */
    html = html.replace(/(<script\b[^>]*\ssrc=")([^"?#]+)(?:\?v=[a-f0-9]+)?(")/g, (m, a, u, b) => { const t = link.target(u, p); return t && ctx.translatedScripts.has(t) ? a + u + '?v=' + hash(outputs.get(lang.dossier + '/' + t)) + b : m; });
    put(lang.dossier + '/' + p, html); keepPages.add(p); report.pages.push(lang.dossier + '/' + p);
  }
  /* 3. pages françaises traduites : hreflang ; sitemap */
  for (const p of lang.pages) { const f = path.join(root, p), s = fs.readFileSync(f, 'utf8'), n = placeAlternates(titleSeo(s), p, root); if (n !== s) put(p, n); }
  /* 4. v7.61 : Léo dans cette langue (outils/langues.json → leo) : index et morceaux tirés de l'index français */
  if ((cfg.leo || []).includes(code) && code !== cfg.source) {
    const r = require('./leo-langues.cjs').build(code, root, module.exports, { mem, outputs });
    for (const [f, content] of r.outputs) put(f, content);
    for (const m of r.missing) report.missing.push(m);
    report.leo = r.outputs.size;
  }
  /* fichiers du dossier de la langue qui ne sont plus produits : retirés (pages, scripts, données de Léo) */
  if (!dry) (function clean(d) {
    for (const e of fs.readdirSync(path.join(dir, d), { withFileTypes: true })) {
      const rel = d ? d + '/' + e.name : e.name;
      if (e.isDirectory()) { clean(rel); if (!fs.readdirSync(path.join(dir, rel)).length) fs.rmdirSync(path.join(dir, rel)); }
      else if (!outputs.has(lang.dossier + '/' + rel)) fs.rmSync(path.join(dir, rel));
    }
  })('');
  report.outputs = outputs;
  report.unused = [...mem.map.keys()].filter(k => !mem.used.has(k));
  if (ctx.candidates) report.candidates = ctx.candidates;
  return report;
}
/* ---------- Léo dans une autre langue : outils/leo-langues.cjs (textes par leoTexte, réécriture par leoPivot) ---------- */
/* Texte de page « à plat » (sans les balises en ligne, comme le lit Léo : « Blouson noir de Jason La fiche … ») : la
   mémoire est relue sans ses repères <n>, entrée par entrée puis phrase par phrase quand les deux langues ont le même
   nombre de phrases. */
const flatText = s => String(s).replace(/<\/?\d+\/?>/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').replace(/ ([,.;:!?…)»”])/g, '$1').replace(/([«“(]) /g, '$1').trim();
function flatMem(mem) {
  if (mem.flat) return mem.flat; const m = new Map();
  const add = (a, b) => { if (a && b && !m.has(a)) m.set(a, b); };
  for (const [k, v] of mem.map) { if (typeof v !== 'string' || k.includes('::')) continue; const fk = flatText(k), fv = flatText(v === '=' ? k : v); add(fk, fv); const sk = sentences(fk), sv = sentences(fv, mem.code); if (sk.length > 1 && sk.length === sv.length) sk.forEach((x, i) => add(x.trim(), sv[i].trim())); }
  return (mem.flat = m);
}
function flatLookup(mem, text) {
  const m = flatMem(mem), t = flatText(norm(text)); if (m.has(t)) return m.get(t);
  const parts = sentences(t); if (parts.length < 2) return null;
  const out = parts.map(p => { const x = p.trim(); if (m.has(x)) return m.get(x); const v = deep(mem, x, null, null, () => {}, true); return v === null || v === KEEP ? (neutral(x, mem) ? x : null) : v; });
  return out.every(x => x !== null) ? out.join(' ') : null;
}
/* table de réécriture de la question (leo-nlp.js → pivot) : expressions écrites à la main (outils/langues/<code>/leo-pivot.json),
   libellés des catégories et des outils, et une entrée identité pour chaque nom de fiche qui contient un mot de la table */
function leoPivot(root, code, core, enCore, names) {
  const f = path.join(root, 'outils/langues', code, 'leo-pivot.json'); if (!fs.existsSync(f)) return [];
  const N = require(path.join(root, 'leo-nlp.js')), n = s => N.norm(s).replace(/[’‘]/g, "'").replace(/[^a-z0-9$'& ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const list = JSON.parse(fs.readFileSync(f, 'utf8')).expressions || [], words = new Set(list.flatMap(([a]) => n(a).split(' ')));
  const out = list.map(([a, b]) => [n(a), b]);
  const pair = (en, fr) => { const a = n(en), b = n(fr); if (a && b && a !== b && !out.some(x => x[0] === a)) out.push([a, b]); };
  core.categories.forEach((c, i) => pair(enCore.categories[i].label, c.terms[0] || c.label));
  core.tools.forEach((t, i) => pair(enCore.tools[i].label, t.label));
  for (const x of names) { const a = n(x.name); if (a && a.includes(' ') && a.split(' ').some(w => words.has(w)) && !out.some(e => e[0] === a)) out.push([a, a]); }
  return out;
}
function sitemap(root = ROOT) {
  /* v7.61 : chaque adresse française du plan du site (pages indexables : ni redirection, ni noindex, ni 404) a sa version
     dans chaque langue publiée, dans le même fichier (sitemap.xml, sitemap-fiches.xml).
     v7.64 (référencement) : chaque adresse porte ses versions (xhtml:link hreflang, comme dans les pages), sa date de dernière
     modification (lastmod : date du jour où le contenu de la page a changé, tenue dans outils/sitemap-dates.json ; les
     empreintes ?v= des fichiers ne comptent pas) et son image de partage quand elle lui est propre (image:image). */
  const cfg = config(root), base = 'https://www.leonidakit.com/', today = new Date().toISOString().slice(0, 10);
  const datesFile = path.join(root, 'outils/sitemap-dates.json');
  const dates = fs.existsSync(datesFile) ? JSON.parse(fs.readFileSync(datesFile, 'utf8')) : {}, seen = {};
  const xml = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fileOf = u => { const r = u.slice(base.length).split('#')[0]; return r === '' ? 'index.html' : r.endsWith('/') ? r + 'index.html' : r; };
  const info = u => {
    if (seen[u]) return seen[u];
    const f = path.join(root, fileOf(u)); let html = ''; try { html = fs.readFileSync(f, 'utf8'); } catch (e) { html = ''; }
    const h = crypto.createHash('sha256').update(html.replace(/\?v=[a-f0-9]{6,}/g, '')).digest('hex').slice(0, 16);
    const old = dates[u]; const d = old && old[0] === h ? old[1] : today;
    const img = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    return (seen[u] = { h, d, img: img && !/\/social-card\.png$/.test(img) ? img : null });
  };
  for (const name of ['sitemap.xml', 'sitemap-fiches.xml']) {
    const f = path.join(root, name); if (!fs.existsSync(f)) continue;
    const src = fs.readFileSync(f, 'utf8');
    const fr = [...new Set([...src.matchAll(/<loc>https:\/\/www\.leonidakit\.com\/([^<]*)<\/loc>/g)].map(m => m[1]).filter(u => !/^[a-z]{2}\//.test(u)))];
    const out = [];
    for (const u of fr) {
      const page = u === '' ? 'index.html' : u.endsWith('/') ? u + 'index.html' : u;
      const list = [[cfg.source, base + u]];
      for (const l of publiees(cfg)) if ((l.pages || []).includes(page)) list.push([l.code, base + l.dossier + '/' + u]);
      const def = (list.find(([c]) => c === 'en') || list[0])[1];
      const links = list.length > 1 ? list.map(([c, x]) => '    <xhtml:link rel="alternate" hreflang="' + c + '" href="' + xml(x) + '"/>').join('\n') + '\n    <xhtml:link rel="alternate" hreflang="x-default" href="' + xml(def) + '"/>\n' : '';
      for (const [, x] of list) { const it = info(x); out.push('  <url>\n    <loc>' + xml(x) + '</loc>\n    <lastmod>' + it.d + '</lastmod>\n' + links + (it.img ? '    <image:image><image:loc>' + xml(it.img) + '</image:loc></image:image>\n' : '') + '  </url>'); }
    }
    fs.writeFileSync(f, '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + out.join('\n') + '\n</urlset>\n');
  }
  const next = {}; for (const [u, it] of Object.entries(seen).sort()) next[u] = [it.h, it.d];
  fs.writeFileSync(datesFile, JSON.stringify(next, null, 0).replace(/\],"/g, '],\n"') + '\n');
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

module.exports = { config, memoire, norm, textual, typo, wrap, quotesOf, langBar, placeLangBar, alternates, placeAlternates, titleSeo, versions, translatePage, translateScript, generer, toutGenerer, extraire, sitemap, linker, segmentOf, tokens, marks, lookup, deep, flatLookup, partsOf, leoPivot, KEEP, uiLike, langue };

if (require.main === module) {
  const args = process.argv.slice(2), code = args.find(a => !a.startsWith('--'));
  if (args.includes('--extraire')) { const r = extraire(code || 'en', ROOT, { tout: args.includes('--tout') }); console.log('Textes sans traduction : ' + r.total + ' (outils/langues/' + (code || 'en') + '/_a-traduire.json)'); }
  else if (args.includes('--verifier')) {
    const r = generer(code || 'en', ROOT, { force: true });
    console.log(JSON.stringify({ manques: r.missing.length, casses: r.broken, conflits: r.conflicts, inutilisees: r.unused.length }, null, 1));
    process.exit(r.missing.length || r.broken.length || r.conflicts.length ? 1 : 0);
  } else { const r = toutGenerer(); console.log(JSON.stringify(r.summary)); }
}
