#!/usr/bin/env node
'use strict';
/* Section « Animaux » (section animaux). La page animaux.html et les fiches animaux/<id>.html sont construites par la
   mécanique des hubs du monde : outils/lore-gen.js (grille, fiches, « En lien » des régions) et outils/hubs-monde.cjs
   (zone éditoriale), à partir de outils/editorial-animaux.json. Ce script, appelé par outils/regenerer.cjs juste après
   lore-gen.js :
   - contrôle les données (statuts, sources connues et datées, visuels, recadrages, régions, véhicules) ;
   - ajoute à chaque fiche ce que le gabarit commun n’a pas : la feuille animaux.css, les gros plans (recadrages de captures
     officielles, img/animaux/, crédit et source) et le bloc « Statut et sources » (entre deux marqueurs, refait à chaque
     passage) ;
   - rend à outils/gen-leo.cjs les fiches (morceau « monde ») et les questions de la section (morceau leo/animaux.json).
   Usage : node outils/gen-animaux.cjs */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const esc = S.esc;
const HUB = 'animaux', DATA_FILE = 'outils/editorial-animaux.json';
const ST = ['officiel', 'vu', 'comm', 'conf'];
const START = '<!-- section animaux:start -->', END = '<!-- section animaux:end -->';
const STATUT_PHRASE = { officiel: 'Nommé ou décrit par Rockstar : voir les sources ci-dessous.', vu: 'Vu sur des images ou des vidéos officielles, sans nom d’espèce donné par Rockstar.', comm: 'Identification des joueurs, non confirmée par Rockstar.', conf: 'À confirmer.' };

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const A = JSON.parse(read(DATA_FILE)), HB = JSON.parse(read('outils/editorial-hubs.json'));
  return { A, SRC: { ...HB.sources, ...A.sources }, OLD: HB.sources, MED: JSON.parse(read('outils/medias-officiels.json')), ED: JSON.parse(read('outils/editorial.json')), read };
}

/* ---------- contrôles : une donnée mal formée arrête la génération ---------- */
function check(ctx, root = ROOT) {
  const { A, SRC, OLD, MED, ED } = ctx, err = [], ids = new Set();
  for (const [id, s] of Object.entries(A.sources)) {
    if (OLD[id]) err.push('source ' + id + ' : déjà définie dans editorial-hubs.json, à ne pas redéfinir');
    if (!/^https:\/\//.test(s.url)) err.push('source ' + id + ' : adresse https attendue');
    if (!s.title || !s.claim) err.push('source ' + id + ' : titre ou résumé manquant');
    if (s.consultedAt !== '2026-10-04') err.push('source ' + id + ' : date de consultation attendue 2026-10-04');
    if (s.publishedAt !== null && !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt || '')) err.push('source ' + id + ' : date de publication AAAA-MM-JJ ou null');
    if (!ST.includes(s.statut)) err.push('source ' + id + ' : statut inconnu');
    if (/leak|fuite/i.test(s.url + s.title)) err.push('source ' + id + ' : aucune fuite');
  }
  const c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(root, 'vehicules-data.js'), 'utf8'), c);
  const veh = new Set(c.window.LK_VEHICULES.map(v => v.id)), regions = new Set(ED.regions.map(r => r.id));
  for (const x of A.fiches) {
    const L = 'fiche ' + (x.id || '?');
    if (!/^[a-z0-9][a-z0-9-]*$/.test(x.id || '')) { err.push(L + ' : identifiant invalide'); continue; }
    if (ids.has(x.id)) err.push(L + ' : en double'); ids.add(x.id);
    for (const k of ['name', 'kind', 'tagline', 'description', 'texte', 'contexte', 'pratique', 'imageAlt']) if (!x[k]) err.push(L + ' : champ manquant ' + k);
    if ((x.description || '').length > 160) err.push(L + ' : description de plus de 160 signes (' + x.description.length + ')');
    if (!['m', 'f', 'mp', 'fp'].includes(x.accord)) err.push(L + ' : accord m, f, mp ou fp');
    if (!ST.includes(x.statut)) err.push(L + ' : statut inconnu');
    if (!(x.sources || []).length) err.push(L + ' : aucune source');
    for (const s of x.sources || []) { if (!SRC[s]) err.push(L + ' : source inconnue ' + s); if (!A.hub.sources.includes(s)) err.push(L + ' : source absente de la liste de animaux.html : ' + s); }
    if (x.statut === 'officiel' && !(x.sources || []).some(s => SRC[s] && SRC[s].statut === 'officiel')) err.push(L + ' : statut officiel sans source officielle');
    if (!(x.media || []).length) err.push(L + ' : aucun visuel officiel');
    for (const id of x.media || []) if (!MED[id]) err.push(L + ' : visuel inconnu ' + id);
    for (const id of x.places || []) if (!regions.has(id)) err.push(L + ' : région inconnue ' + id);
    for (const id of x.vehicles || []) if (!veh.has(id)) err.push(L + ' : véhicule inconnu ' + id);
    /* « En lien » : une fiche d’animal ne se rattache qu’aux régions (le groupe « Animaux » n’apparaît que sur les fiches lieux) */
    for (const k of ['characters', 'businesses', 'residences', 'hideouts']) if ((x[k] || []).length) err.push(L + ' : seules les régions (places) sont reliées, pas ' + k);
    for (const z of x.zoom || []) {
      if (!/^\/img\/animaux\/[a-z0-9-]+\.webp$/.test(z.src || '') || !fs.existsSync(path.join(root, z.src.slice(1)))) err.push(L + ' : recadrage introuvable ' + z.src);
      if (!z.w || !z.h || !z.alt || !z.legende || !MED[z.media]) err.push(L + ' : recadrage sans dimensions, texte, légende ou capture d’origine');
    }
  }
  const H = A.hub;
  for (const id of H.sources) if (!SRC[id]) err.push('animaux.html : source inconnue ' + id);
  for (const id of Object.keys(A.sources)) if (!H.sources.includes(id)) err.push('source jamais listée sur animaux.html : ' + id);
  for (const f of H.faq) if (f.leo && !f.k) err.push('FAQ sans mots-clés : ' + f.q);
  if (A.section.desc.length > 160) err.push('description du hub trop longue');
  if (err.length) throw new Error('Section animaux, données à corriger (' + DATA_FILE + ') :\n- ' + err.join('\n- '));
}

/* ---------- ajouts aux fiches générées par lore-gen.js ---------- */
function sourceList(SRC, ids) {
  return S.sourceList(ids.map(id => ({ id, ...SRC[id] })));
}
function block(ctx, x) {
  const { SRC, MED } = ctx;
  const zoom = (x.zoom || []).length ? '<section class="shell animaux-zoom reveal" aria-labelledby="animaux-zoom-t"><h2 class="sec-h" id="animaux-zoom-t">Gros plan</h2><div class="animaux-zoom-grid">'
    + x.zoom.map(z => { const m = MED[z.media]; return '<figure class="animaux-zoom-fig rise"><img src="' + esc(z.src) + '" width="' + z.w + '" height="' + z.h + '" alt="' + esc(z.alt) + '" loading="lazy" decoding="async"><figcaption><b>' + esc(z.legende) + '</b><span>Recadrage de la capture officielle « ' + esc(m.titre) + ' » · ' + esc(m.credit) + ' · <a href="' + esc(m.source) + '" target="_blank" rel="noopener nofollow">Galerie officielle</a></span></figcaption></figure>'; }).join('')
    + '</div></section>' : '';
  const src = '<section class="shell animaux-fiche-src reveal" aria-labelledby="animaux-src-t"><h2 class="sec-h" id="animaux-src-t">Statut et sources</h2><p class="animaux-statut">' + S.pip(x.statut, true) + '<span>' + esc(STATUT_PHRASE[x.statut]) + '</span></p>' + sourceList(SRC, x.sources) + '</section>';
  return START + zoom + src + END;
}
function enrich(ctx, root = ROOT) {
  let n = 0;
  for (const x of ctx.A.fiches) {
    const f = path.join(root, HUB, x.id + '.html');
    if (!fs.existsSync(f)) throw new Error('Fiche absente (lancer outils/lore-gen.js d’abord) : ' + HUB + '/' + x.id + '.html');
    let html = fs.readFileSync(f, 'utf8');
    const i = html.indexOf(START), j = html.indexOf(END);
    if (i >= 0 && j > i) html = html.slice(0, i) + html.slice(j + END.length);
    const at = html.indexOf('<section class="shell lore-body">');
    if (at < 0) throw new Error(HUB + '/' + x.id + '.html : corps de fiche introuvable');
    const close = html.indexOf('</section>', at) + '</section>'.length;
    html = html.slice(0, close) + '\n' + block(ctx, x) + html.slice(close);
    /* la feuille de la section, après celle des fiches (son lien porte déjà son empreinte ?v= quand lore-gen.js a synchronisé) */
    if (!/href="\.\.\/animaux\.css(?:\?v=[a-f0-9]+)?"/.test(html)) html = html.replace(/(<link rel="stylesheet" href="\.\.\/acquisitions\.css(?:\?v=[a-f0-9]+)?">)/, '$1\n<link rel="stylesheet" href="../animaux.css">');
    if (!/href="\.\.\/animaux\.css(?:\?v=[a-f0-9]+)?"/.test(html)) throw new Error(HUB + '/' + x.id + '.html : feuille animaux.css impossible à placer');
    fs.writeFileSync(f, html); n++;
  }
  return n;
}

/* ---------- Léo : fiches (morceau « monde ») et questions de la section (morceau leo/animaux.json) ---------- */
function leo(root = ROOT) {
  const { A, SRC, MED } = load(root);
  const image = ids => (ids || []).flatMap(id => (MED[id] && MED[id].variants) || []).map(v => v.src).find(src => fs.existsSync(path.join(root, src.slice(1)))) || null;
  const verifiedAt = '2026-10-04';
  const fiches = A.fiches.map(x => ({ key: 'animal:' + x.id, id: x.id, kind: 'animal', shard: 'monde', name: x.name, aliases: x.aliases || [], category: A.section.label + ' · ' + x.kind, url: '/' + HUB + '/' + x.id + '.html', image: image(x.media), calcId: null, price: null, proof: { officiel: 'Nommé ou décrit par Rockstar ; sources datées sur la fiche.', vu: 'Vu sur les images officielles, sans nom d’espèce donné par Rockstar.', comm: 'Identification des joueurs, non confirmée par Rockstar.', conf: 'À confirmer.' }[x.statut], source: x.source || (SRC[x.sources[0]] || {}).url || null, verifiedAt, description: x.description, tagline: x.tagline || null, related: { places: x.places || [] } }));
  const topics = A.hub.faq.filter(x => !x.leo).map((x, i) => ({ id: 'animaux-faq-' + (i + 1), q: x.q, f: [x.q, ...(x.f || [])], k: x.k, text: x.a, status: 'Réponse de la FAQ « ' + A.section.label + ' », sources en bas de la page', links: [{ label: 'La FAQ et ses sources', url: '/' + HUB + '.html#faq' }], verifiedAt, min: Number.isInteger(x.min) ? x.min : 2 }));
  return { fiches, topics, suggestions: { animaux: A.leo.suggestions }, inputs: [DATA_FILE] };
}

/* ---------- génération ---------- */
function generate(root = ROOT) {
  const ctx = load(root);
  check(ctx, root);
  const n = enrich(ctx, root);
  console.log('animaux : ' + n + ' fiche(s) complétée(s) (statut, sources, ' + ctx.A.fiches.reduce((k, x) => k + (x.zoom || []).length, 0) + ' gros plans), ' + ctx.A.hub.faq.length + ' questions, ' + ctx.A.hub.sources.length + ' sources');
}

module.exports = { generate, check, load, leo, enrich, block, DATA_FILE, START, END };
if (require.main === module) generate();
