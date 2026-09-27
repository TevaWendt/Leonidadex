'use strict';
/* v7.41 (lot 4) : aucune phrase des zones éditoriales des hubs du monde (outils/editorial-hubs.json) ne doit être
   identique à une phrase des 29 fiches (outils/editorial.json : description, tagline, facts, texte, contexte, pratique)
   ni aux textes d'en-tête des hubs. Comparaison après normalisation (minuscules, accents, ponctuation, apostrophes,
   espaces) sur les phrases d'au moins quatre mots. Utilisé par lore-gen.js (refus de générer) et par les tests.
   Usage direct : node outils/hubs-doublons.cjs  → liste les doublons, code de sortie 1 s'il y en a. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[’'`"«»“”()\[\]]/g, ' ').replace(/[^a-z0-9$%]+/g, ' ').replace(/\s+/g, ' ').trim();
const sentences = text => String(text || '').replace(/<[^>]+>/g, ' ').split(/(?<=[.!?…;:])\s+|\n+/).map(norm).filter(s => s.split(' ').length >= 4);

function collectHubStrings(hub) {
  const out = [];
  const push = v => { if (typeof v === 'string') out.push(v); };
  for (const key of ['rockstar', 'communaute', 'confirmer', 'toi']) {
    const s = hub[key]; if (!s) continue;
    push(s.lede); (s.p || []).forEach(push);
    (s.items || []).forEach(x => { push(x.texte); push(x.titre); push(x.etat); push(x.q); });
    (s.pairs || []).forEach(x => { push(x.fiction); push(x.reel); });
    (s.actions || []).forEach(x => { push(x.t); push(x.d); });
  }
  (hub.faq || []).forEach(x => { push(x.q); push(x.a); });
  return out;
}
function collectFicheStrings(ed, extra = []) {
  const out = [...extra];
  for (const group of Object.values(ed)) for (const x of group) for (const k of ['description', 'tagline', 'texte', 'contexte', 'pratique']) if (x[k]) out.push(x[k]);
  for (const group of Object.values(ed)) for (const x of group) (x.facts || []).forEach(f => out.push(f));
  return out;
}
/* Renvoie [{hub, phrase}] : les phrases des hubs qui existent telles quelles dans une fiche (ou dans un autre hub). */
function check(opts = {}) {
  const hubs = opts.hubs || JSON.parse(fs.readFileSync(path.join(root, 'outils/editorial-hubs.json'), 'utf8'));
  const ed = opts.editorial || JSON.parse(fs.readFileSync(path.join(root, 'outils/editorial.json'), 'utf8'));
  const ficheSet = new Set(collectFicheStrings(ed, opts.extra || []).flatMap(sentences));
  const dupes = [], seen = new Map();
  for (const hub of ['lieux', 'personnages', 'demeures', 'planques', 'entreprises']) {
    if (!hubs[hub]) continue;
    for (const s of collectHubStrings(hubs[hub]).flatMap(sentences)) {
      if (ficheSet.has(s)) dupes.push({ hub, phrase: s, ou: 'fiche' });
      else if (seen.has(s) && seen.get(s) !== hub) dupes.push({ hub, phrase: s, ou: 'hub ' + seen.get(s) });
      seen.set(s, hub);
    }
  }
  return dupes;
}
module.exports = { check, sentences, norm, collectHubStrings, collectFicheStrings };
if (require.main === module) {
  const d = check();
  if (d.length) { for (const x of d) console.error(x.hub + ' ↔ ' + x.ou + ' : « ' + x.phrase + ' »'); process.exit(1); }
  console.log('Hubs du monde : aucune phrase identique aux fiches.');
}
