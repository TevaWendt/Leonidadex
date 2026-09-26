'use strict';
/* Typographie française commune à tout le site (v7.37).
   - apostrophe typographique « ’ » entre deux lettres (l’eau, aujourd’hui, Dre’Quan) ;
   - espace insécable avant « ? ! ; : » et « » », après « « », avant $ et % précédés d'un chiffre ;
   - espace fine insécable entre les groupes de trois chiffres (2 547 lieux, 1 000 000).
   Trois entrées : texte() pour une chaîne, html() pour une page (nœuds texte et attributs lisibles seulement,
   jamais les scripts, styles, code ou URL), js() pour les chaînes littérales d'un fichier JavaScript (acorn,
   dossier de dépendances de développement via NODE_PATH, comme jsdom pour les tests).
   sync-site.cjs applique html() à chaque page : une correction de source reste typographiée après régénération. */
const L = 'A-Za-zÀ-ÖØ-öø-ÿŒœ';
const NBSP = '\u00a0', FINE = '\u202f';
const RE = {
  apos: new RegExp("(?<=[" + L + "])'(?=[" + L + "«(0-9])", 'g'),
  aposEnt: new RegExp('(?<=[' + L + '])(?:&#x27;|&#39;|&apos;)(?=[' + L + '«(0-9])', 'g'),
  aposYear: /(?<=\s|^)(?:'|&#x27;|&#39;)(?=\d{2}(?!\d))/g,
  high: /(?<=\S) ([?!;»])/g,
  colon: /(?<=[^\s:/]) :(?=\s|$|<|&)/g,
  open: /« (?=\S)/g,
  unit: /(?<=\d) ([$%€])/g,
  /* 200 000 $, 2 547 lieux, 1 000 000 de… : le nombre doit être suivi d'une unité, d'un mot ou d'une ponctuation
     (jamais « Porsche 911 930 », une désignation de modèle en fin de chaîne) */
  thousands: /(?<=(?:^|[^\d,.\u202f])\d{1,3}) (?=\d{3}(?: \d{3})*(?![\d,.])(?:\u00a0[$%€]| [a-zà-ÿ]|[.,;:!?)»]|\u00a0))/g
};
function texte(s, options) {
  if (typeof s !== 'string' || !s) return s;
  if (/^(https?:|\/|mailto:|data:)/.test(s) || /^[\w./-]+\.(html|js|css|webp|jpg|png|svg|json)$/.test(s)) return s;
  let out = s.replace(RE.apos, '’').replace(RE.aposEnt, '’').replace(RE.aposYear, '’');
  out = out.replace(RE.high, NBSP + '$1').replace(RE.colon, NBSP + ':').replace(RE.open, '«' + NBSP).replace(RE.unit, NBSP + '$1');
  /* groupes de chiffres : seulement dans du texte pur (jamais dans un fichier JavaScript : viewBox, coordonnées, tracés SVG) */
  if (!(options && options.noThousands)) out = out.replace(RE.thousands, FINE);
  return out;
}
const ATTRS = new Set(['alt', 'title', 'placeholder', 'aria-label', 'content', 'aria-description', 'data-label', 'label']);
function attrs(tag) {
  return tag.replace(/\s([a-zA-Z-]+)="([^"]*)"/g, function (m, name, value) {
    if (!ATTRS.has(name) || !value) return m;
    if (name === 'content' && !/name="(description|twitter:[a-z:]+)"|property="og:(title|description)"/.test(tag)) return m;
    return ' ' + name + '="' + texte(value) + '"';
  });
}
function html(src) {
  const parts = src.split(/(<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<pre\b[\s\S]*?<\/pre>|<code\b[\s\S]*?<\/code>|<textarea\b[\s\S]*?<\/textarea>|<!--[\s\S]*?-->)/);
  return parts.map(function (part, i) {
    if (i % 2 === 1) return part;
    return part.replace(/(<[^>]*>)|([^<]+)/g, function (m, tag, text) { return tag ? attrs(tag) : texte(text); });
  }).join('');
}
function js(src) {
  const acorn = require('acorn');
  const edits = [];
  const opts = { ecmaVersion: 'latest', sourceType: 'script', allowHashBang: true, onToken: function (t) {
    if (t.type.label === 'string' || t.type.label === 'template') {
      const raw = src.slice(t.start, t.end);
      const inner = t.type.label === 'string' ? raw.slice(1, -1) : raw;
      const quote = t.type.label === 'string' ? raw[0] : '`';
      let next = inner;
      if (quote === "'") next = next.replace(new RegExp("(?<=[" + L + "])\\\\'(?=[" + L + "«(0-9])", 'g'), '’');
      next = texte(next, { noThousands: true });
      if (next !== inner) edits.push([t.start + (quote === '`' ? 0 : 1), t.end - (quote === '`' ? 0 : 1), next]);
    }
  } };
  try { acorn.parse(src, opts); } catch (e) { try { acorn.parse(src, Object.assign({}, opts, { sourceType: 'module' })); } catch (e2) { throw new Error('Analyse impossible : ' + e.message); } }
  let out = src;
  for (const [a, b, text] of edits.sort((x, y) => y[0] - x[0])) out = out.slice(0, a) + text + out.slice(b);
  return out;
}
function json(value) {
  if (typeof value === 'string') return texte(value);
  if (Array.isArray(value)) return value.map(json);
  if (value && typeof value === 'object') { const o = {}; for (const k of Object.keys(value)) o[k] = json(value[k]); return o; }
  return value;
}
/* Fichier JSON réécrit sans toucher à sa mise en forme : seules les valeurs texte changent (jamais les clés). */
function jsonText(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c !== '"') { out += c; i++; continue; }
    let j = i + 1;
    while (j < src.length && src[j] !== '"') { if (src[j] === '\\') j++; j++; }
    const raw = src.slice(i + 1, j);
    let k = j + 1; while (k < src.length && /\s/.test(src[k])) k++;
    const isKey = src[k] === ':';
    out += '"' + (isKey ? raw : texte(raw)) + '"';
    i = j + 1;
  }
  return out;
}
module.exports = { texte, html, js, json, jsonText };

if (require.main === module) {
  /* usage : node outils/typographie.cjs fichier… (HTML, JS ou JSON, réécrit en place) */
  const fs = require('node:fs');
  for (const file of process.argv.slice(2)) {
    const src = fs.readFileSync(file, 'utf8');
    const out = /\.html?$/.test(file) ? html(src) : /\.json$/.test(file) ? jsonText(src) : js(src);
    if (out !== src) { fs.writeFileSync(file, out); console.log('typographie : ' + file); }
  }
}
