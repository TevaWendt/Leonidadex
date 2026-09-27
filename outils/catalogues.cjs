'use strict';
/* v7.42 (lot 5) : catalogues en listes dépliables (consommables, coiffures, tatouages, tenues et accessoires ; le lot 6
   y ajoutera les personnalisations). Données : outils/catalogues/<famille>.json, validées contre
   outils/catalogues/schema.json (sous-ensemble de JSON Schema implémenté ici, sans dépendance) et contre le site :
   sources connues (outils/catalogues/sources.json), lieux connus de la carte, visuels connus, identifiants uniques,
   colonne GTA VI toujours « à confirmer ». Rendu : boîte details/summary dans la charte, tableau complet écrit à la
   génération (lisible sans JavaScript), filtres et tri activés par catalogue.js, suivi par famille via suivi.js
   (data-track). Projections : recherche interne, index de Léo, ItemList JSON-LD, identifiants et noms pour la page
   Progression. Aucun texte n'est écrit ici : tout vient des JSON. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const S = require('./sections.cjs');
const root = path.resolve(__dirname, '..');
const DIR = path.join(__dirname, 'catalogues');
const FAMILIES = ['consommables', 'coiffures', 'tatouages', 'tenues'];
const STATUS_ORDER = ['officiel', 'vu', 'comm', 'conf', 'serie'];
const KIND = { consommables: 'Consommable', coiffures: 'Coiffure', tatouages: 'Tatouage', tenues: 'Tenue ou accessoire' };
const esc = S.esc;
const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’]/g, "'").toLowerCase();
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const json = f => JSON.parse(read(f));

/* ---------- validation (sous-ensemble de JSON Schema draft-07) ---------- */
function typeOf(v) { return v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v; }
function check(value, schema, at, errors) {
  if (!schema) return;
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const t = typeOf(value);
    if (!types.includes(t) && !(t === 'number' && types.includes('integer'))) { errors.push(at + ' : type ' + t + ' au lieu de ' + types.join('|')); return; }
  }
  if (schema.const !== undefined && value !== schema.const) errors.push(at + ' : doit valoir ' + JSON.stringify(schema.const));
  if (schema.enum && !schema.enum.includes(value)) errors.push(at + ' : valeur « ' + value + ' » hors de ' + schema.enum.map(String).join(', '));
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(at + ' : trop court (' + value.length + ' < ' + schema.minLength + ')');
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(at + ' : trop long (' + value.length + ' > ' + schema.maxLength + ')');
    if (schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(at + ' : « ' + value + ' » ne respecte pas ' + schema.pattern);
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) errors.push(at + ' : au moins ' + schema.minItems + ' élément(s)');
    if (schema.items) value.forEach((v, i) => check(v, schema.items, at + '[' + i + ']', errors));
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const k of schema.required || []) if (!(k in value)) errors.push(at + ' : champ manquant « ' + k + ' »');
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties && schema.properties[k]) check(v, schema.properties[k], at + '.' + k, errors);
      else if (schema.additionalProperties === false) errors.push(at + ' : champ inconnu « ' + k + ' »');
    }
  }
}

let cache = null;
function site() {
  const ctx = { window: {} };
  for (const f of ['vehicules-data.js', 'armes-data.js']) vm.runInNewContext(read(f), ctx);
  const map = json('outils/data/carte-gtadb-source.json');
  const m = read('carte.js').match(/const POINTS\s*=\s*(\[[\s\S]*?\n\s*\]);/);
  const points = [...vm.runInNewContext('(' + m[1] + ')'), ...map.groupes, ...map.lieux];
  const places = new Map(points.filter(p => p.id && p.n).map(p => [p.id, p]));
  const groups = new Map(map.groupes.map(g => [g.id, g.n]));
  const medias = json('outils/medias-officiels.json');
  const taken = new Set([...ctx.window.LK_VEHICULES.map(v => v.id), ...ctx.window.LK_ARMES.map(a => a.id)]);
  if (fs.existsSync(path.join(root, 'armes.html'))) for (const x of read('armes.html').matchAll(/data-track="(?:equipements|munitions)" data-track-id="([a-z0-9-]+)"/g)) taken.add(x[1]);
  return { places, groups, medias, taken };
}

/* Charge et valide toutes les familles. Renvoie {schema, sources, families:{id → données}, all:[…items avec famille]}. */
function load(options = {}) {
  if (cache && !options.fresh) return cache;
  const schema = JSON.parse(fs.readFileSync(path.join(DIR, 'schema.json'), 'utf8'));
  const registry = JSON.parse(fs.readFileSync(path.join(DIR, 'sources.json'), 'utf8')).sources;
  const errors = [], families = {}, all = [], ids = new Map();
  const ctx = site();
  for (const [id, s] of Object.entries(registry)) {
    if (!/^https:\/\//.test(s.url) || !s.title || !s.claim || !/^\d{4}-\d\d-\d\d$/.test(s.consultedAt || '') || !['officiel', 'vu', 'comm', 'serie', 'conf'].includes(s.statut)) errors.push('sources.json : entrée incomplète « ' + id + ' »');
  }
  for (const fam of FAMILIES) {
    const file = path.join(DIR, fam + '.json');
    if (!fs.existsSync(file)) { errors.push('Catalogue absent : ' + fam + '.json'); continue; }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    check(data, schema, fam, errors);
    if (data.famille !== fam) errors.push(fam + ' : le champ famille vaut « ' + data.famille + ' »');
    const cats = new Map((data.categories || []).map(c => [c.id, c]));
    for (const c of data.categories || []) { if (!S.ICONS[c.icon]) errors.push(fam + ' : icône inconnue « ' + c.icon + ' » (catégorie ' + c.id + ')'); }
    for (const it of data.items || []) {
      const at = fam + '/' + it.id;
      if (ids.has(it.id)) errors.push(at + ' : identifiant déjà utilisé dans ' + ids.get(it.id)); else ids.set(it.id, fam);
      if (ctx.taken.has(it.id)) errors.push(at + ' : identifiant déjà pris par un véhicule, une arme ou un équipement');
      if (!cats.has(it.categorie)) errors.push(at + ' : catégorie inconnue « ' + it.categorie + ' »');
      if (it.prix_gta6 && it.prix_gta6.valeur !== null) errors.push(at + ' : un prix GTA VI ne peut pas être écrit tant que Rockstar n’a rien publié');
      if (it.effet && it.effet.valeur !== null && !it.effet.jeu) errors.push(at + ' : un chiffre d’effet doit dire de quel jeu il vient');
      if (it.effet && it.effet.valeur !== null && !it.effet.unite) errors.push(at + ' : un chiffre d’effet doit avoir une unité');
      if (it.statut === 'serie' && !it.prix_repere_serie) errors.push(at + ' : un repère de la série doit porter prix_repere_serie (valeur ou note)');
      if (it.prix_repere_serie && it.prix_repere_serie.valeur === undefined && it.prix_repere_serie.min === undefined) errors.push(at + ' : prix_repere_serie sans valeur ni min/max');
      if (it.prix_repere_serie && it.prix_repere_serie.min !== undefined && !(it.prix_repere_serie.max > it.prix_repere_serie.min)) errors.push(at + ' : prix_repere_serie min/max incohérents');
      const srcs = (it.sources || []).map(id => registry[id]);
      (it.sources || []).forEach((id, i) => { if (!registry[id]) errors.push(at + ' : source inconnue « ' + id + ' »'); });
      if (srcs.every(Boolean) && srcs.length) {
        if (it.statut === 'officiel' && !srcs.some(s => s.statut === 'officiel')) errors.push(at + ' : statut officiel sans source officielle');
        if (it.statut === 'vu' && !srcs.some(s => s.statut === 'vu' || s.statut === 'officiel')) errors.push(at + ' : statut « vu » sans source vue ou officielle');
        if (it.statut === 'serie' && !srcs.some(s => s.statut === 'serie')) errors.push(at + ' : repère de la série sans source de la série');
        if (it.statut === 'comm' && !srcs.some(s => s.statut === 'comm')) errors.push(at + ' : identification communautaire sans source communautaire');
      }
      for (const o of it.ou_le_trouver || []) {
        if (!o.lieu && !o.type) errors.push(at + ' : où_le_trouver sans lieu ni type');
        if (o.lieu && !ctx.places.has(o.lieu)) errors.push(at + ' : lieu de carte inconnu « ' + o.lieu + ' »');
      }
      if (it.media && !ctx.medias[it.media]) errors.push(at + ' : visuel officiel inconnu « ' + it.media + ' »');
      all.push({ ...it, famille: fam });
    }
    families[fam] = data;
  }
  if (errors.length) throw Error('Catalogues invalides :\n- ' + errors.join('\n- '));
  cache = { schema, sources: registry, families, all, ctx };
  return cache;
}

/* ---------- comptes ---------- */
function counts(fam) {
  const d = load().families[fam], by = {};
  for (const s of STATUS_ORDER) by[s] = 0;
  for (const it of d.items) by[it.statut]++;
  const confirmes = by.officiel + by.vu;
  return { n: d.items.length, confirmes, ...by, suivis: d.items.filter(trackable).length };
}
function counterText(fam) { const c = counts(fam); return c.n + ' référencés, dont ' + c.confirmes + ' confirmés pour GTA VI'; }
function trackable(it) { return it.suivi !== false; }

/* ---------- rendu ---------- */
const money = n => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 }).format(n).replace(/[  ]/g, ' ') + ' $';
function repereText(p) {
  if (!p) return null;
  if (p.min !== undefined) return p.jeu + ' : ' + money(p.min) + ' à ' + money(p.max);
  if (p.valeur === null || p.valeur === undefined) return p.jeu + ' : prix non relevé';
  if (p.valeur === 0) return p.jeu + ' : gratuit';
  return p.jeu + ' : ' + money(p.valeur);
}
function repereValue(p) { if (!p) return null; if (p.min !== undefined) return p.min; return typeof p.valeur === 'number' ? p.valeur : null; }
const PLACE_STATUS = { officiel: 'officiel', vu: 'vu', spec: 'comm' };
function place(id) { const p = load().ctx.places.get(id); return { id, name: p.n, region: load().ctx.groups.get(p.p) || null, statut: PLACE_STATUS[p.s] || 'conf' }; }
function whereCell(it) {
  return it.ou_le_trouver.map(o => {
    if (o.lieu) { const p = place(o.lieu); return '<a class="cat-lieu" href="carte.html#lieu=' + esc(p.id) + '"' + (p.region ? ' title="' + esc(p.region) + '"' : '') + '>' + S.pip(p.statut) + esc(p.name) + '</a>'; }
    return '<span class="cat-type">' + esc(o.type) + (o.note ? ' <i>' + esc(o.note) + '</i>' : '') + '</span>';
  }).join('');
}
const PERSON = { jason: 'Jason', lucia: 'Lucia', 'jason-lucia': 'Jason et Lucia' };
function rowId(fam, it) { return fam + '-' + it.id; }
function row(fam, it, cat, sources) {
  const d = load(), media = it.media ? d.ctx.medias[it.media] : null, ci = d.families[fam].categories.findIndex(x => x.id === cat.id);
  const srcLinks = it.sources.map((id, i) => '<a href="#src-' + esc(id) + '" class="cat-src" aria-label="Source : ' + esc(sources[id].title) + '">source' + (it.sources.length > 1 ? ' ' + (i + 1) : '') + '</a>').join(' ');
  const q = fold([it.nom, it.description, cat.label, it.effet.texte, ...(it.variantes || []), ...it.ou_le_trouver.map(o => o.lieu ? place(o.lieu).name : o.type), PERSON[it.personnage] || ''].join(' '));
  const rep = repereText(it.prix_repere_serie), repV = repereValue(it.prix_repere_serie);
  return '<tr class="cat-row" id="' + esc(rowId(fam, it)) + '" data-cat="' + esc(it.categorie) + '" data-st="' + esc(it.statut) + '" data-ci="' + ci + '"' + (cat.groupe ? ' data-group="' + esc(cat.groupe) + '"' : '') + ' data-nom="' + esc(fold(it.nom)) + '"' + (repV !== null ? ' data-prix="' + repV + '"' : '') + ' data-q="' + esc(q) + '">'
    + '<td class="cat-c-st" data-l="Statut">' + S.pip(it.statut, true) + '</td>'
    + '<td class="cat-c-nom" data-l="Élément"><b class="cat-nom">' + esc(it.nom) + '</b>'
    + '<span class="cat-cat">' + S.icon(cat.icon, 'cat-ico') + esc(cat.label) + '</span>'
    + (it.personnage ? '<span class="cat-who">' + esc(PERSON[it.personnage]) + '</span>' : '')
    + '<p class="cat-desc">' + esc(it.description) + '</p>'
    + (it.variantes && it.variantes.length ? '<p class="cat-var"><span>Variantes :</span> ' + esc(it.variantes.join(', ')) + '</p>' : '')
    + (it.notes ? '<p class="cat-note">' + esc(it.notes) + '</p>' : '')
    + '<p class="cat-meta">' + srcLinks + (media ? ' <a class="cat-media" href="medias.html#media-' + esc(it.media) + '">visuel officiel</a>' : '') + (it.lien ? ' <a class="cat-link" href="' + esc(it.lien.href) + '">' + esc(it.lien.label) + '</a>' : '') + '</p></td>'
    + '<td class="cat-c-eff" data-l="Effet">' + esc(it.effet.texte) + (it.effet.valeur !== null ? '<b class="cat-eff-n">' + esc(String(it.effet.valeur)) + (it.effet.unite === 'graisse' ? ' % de graisse' : it.effet.unite === 'sante' ? ' % de vie' : it.effet.unite === 'armure' ? ' % d’armure' : ' min') + ' <i>(' + esc(it.effet.jeu) + ')</i></b>' : '') + '</td>'
    + '<td class="cat-c-p6" data-l="GTA VI"><span class="cat-conf">' + S.pip('conf') + 'À confirmer</span></td>'
    + '<td class="cat-c-pr" data-l="Repère de la série">' + (rep ? '<b class="cat-repere">' + esc(rep) + '</b>' + (it.prix_repere_serie.note ? '<small>' + esc(it.prix_repere_serie.note) + '</small>' : '') : '<span class="cat-none">Pas de repère</span>') + '</td>'
    + '<td class="cat-c-ou" data-l="Où le trouver">' + whereCell(it) + '</td>'
    + '<td class="cat-c-own" data-l="Suivi"' + (trackable(it) ? ' data-track="' + esc(fam) + '" data-track-id="' + esc(it.id) + '" data-track-name="' + esc(it.nom) + '"' : '') + '>' + (trackable(it) ? '' : '<span class="cat-none">—</span>') + '</td></tr>';
}
function sortItems(d) {
  const catIndex = new Map(d.categories.map((c, i) => [c.id, i]));
  return [...d.items].sort((a, b) => STATUS_ORDER.indexOf(a.statut) - STATUS_ORDER.indexOf(b.statut) || catIndex.get(a.categorie) - catIndex.get(b.categorie) || a.nom.localeCompare(b.nom, 'fr'));
}
/* La boîte dépliable d'une famille : summary avec compteur, barre de suivi, outils (inertes sans JS), tableau complet,
   légende. opts.open : ouverte par défaut. */
function listBox(fam, opts = {}) {
  const d = load(), data = d.families[fam], c = counts(fam), cats = new Map(data.categories.map(x => [x.id, x]));
  const groups = [...new Set(data.categories.map(x => x.groupe).filter(Boolean))];
  const catOptions = groups.length
    ? groups.map(g => '<optgroup label="' + esc({ vetements: 'Vêtements', accessoires: 'Accessoires', vehicules: 'Véhicules', armes: 'Armes' }[g] || g) + '">' + data.categories.filter(x => x.groupe === g).map(x => '<option value="' + esc(x.id) + '">' + esc(x.label) + '</option>').join('') + '</optgroup>').join('')
    : data.categories.map(x => '<option value="' + esc(x.id) + '">' + esc(x.label) + '</option>').join('');
  const stOptions = STATUS_ORDER.filter(s => c[s]).map(s => '<option value="' + s + '">' + esc(S.STATUS_LABEL[s]) + ' (' + c[s] + ')</option>').join('');
  const rows = sortItems(data).map(it => row(fam, it, cats.get(it.categorie), d.sources)).join('\n');
  const chips = groups.length ? '<div class="cat-groups" role="group" aria-label="Filtrer par groupe">' + groups.map(g => '<button type="button" class="cat-chip" data-cat-group="' + esc(g) + '" id="' + esc(g === 'accessoires' ? 'accessoires' : fam + '-' + g) + '">' + esc({ vetements: 'Vêtements', accessoires: 'Accessoires', vehicules: 'Véhicules', armes: 'Armes' }[g] || g) + '</button>').join('') + '</div>' : '';
  return '<details class="cat-box" id="' + esc('box-' + fam) + '" data-catalogue="' + esc(fam) + '"' + (opts.open ? ' open' : '') + '>'
    + '<summary class="cat-sum"><span class="cat-sum-t">' + esc(data.titre) + '</span><span class="cat-sum-n"><b>' + c.n + '</b> référencés · <b>' + c.confirmes + '</b> confirmés pour GTA VI · ' + c.serie + ' repères de la série</span><span class="cat-chev" aria-hidden="true"></span></summary>'
    + '<div class="cat-body">'
    + '<div class="cat-track" data-track-bar="' + esc(fam) + '"><span class="cat-track-l">' + esc(data.suivi.label) + ' :</span> <b>0</b> <span class="cat-track-sep">/</span> <span class="own-total">' + c.suivis + '</span> ' + esc(data.suivi.fait) + '<progress max="' + c.suivis + '" value="0" aria-label="' + esc(data.suivi.label) + '"></progress></div>'
    + '<form class="cat-tools" data-cat-tools hidden>'
    + '<label class="cat-search"><span class="sr-only">Chercher dans la liste</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="search" placeholder="Chercher un nom, un effet, un lieu" autocomplete="off" data-cat-q></label>'
    + '<label class="cat-sel"><span>Catégorie</span><select data-cat-f="cat"><option value="">Toutes</option>' + catOptions + '</select></label>'
    + '<label class="cat-sel"><span>Statut</span><select data-cat-f="st"><option value="">Tous</option>' + stOptions + '</select></label>'
    + '<label class="cat-sel"><span>Tri</span><select data-cat-sort><option value="statut">GTA VI d’abord</option><option value="nom">Nom (A → Z)</option><option value="cat">Catégorie</option><option value="prix">Repère de prix</option></select></label>'
    + '<button type="reset" class="cat-reset">Tout afficher</button>'
    + '<p class="cat-count" role="status" aria-live="polite" data-cat-count></p>'
    + chips + '</form>'
    + '<div class="cat-wrap"><table class="cat-table"><caption class="sr-only">' + esc(data.titre) + ' : ' + esc(counterText(fam)) + '</caption><thead><tr><th scope="col">Statut</th><th scope="col">Élément</th><th scope="col">Effet</th><th scope="col">GTA VI</th><th scope="col">Repère de la série</th><th scope="col">Où le trouver</th><th scope="col">Suivi</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '<p class="cat-empty" data-cat-empty hidden>Aucune ligne ne correspond. <button type="button" class="cat-reset" data-cat-reset>Tout afficher</button></p>'
    + '<div class="cat-legend"><p>' + STATUS_ORDER.map(s => S.pip(s, true)).join(' ') + '</p><p>Un chiffre de GTA V, GTA Online, GTA IV ou San Andreas reste dans la colonne « Repère de la série » : la colonne GTA VI reste à confirmer tant que Rockstar n’a rien publié. « Je l’ai » s’enregistre sur cet appareil et compte dans <a href="progression.html#' + esc(data.suivi.ancre) + '">Ma progression</a>.</p></div>'
    + '</div></details>';
}

/* ---------- projections ---------- */
function ldItemList(fam) {
  const d = load(), data = d.families[fam];
  return { '@context': 'https://schema.org', '@type': 'ItemList', name: data.titre + ' (GTA VI, Leonidakit)', numberOfItems: data.items.length,
    itemListElement: sortItems(data).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nom, url: 'https://www.leonidakit.com' + data.page + '#' + rowId(fam, it) })) };
}
function searchEntries(fam) {
  const d = load(), data = d.families[fam], cats = new Map(data.categories.map(x => [x.id, x]));
  return data.items.map(it => ({ l: it.nom, k: KIND[fam] || data.label, u: data.page + '#' + rowId(fam, it), s: fold([it.nom, it.description, cats.get(it.categorie).label, data.label, ...(it.variantes || []), ...it.ou_le_trouver.map(o => o.lieu ? place(o.lieu).name : o.type)].join(' ')), w: 0, t: 'element' }));
}
const PROOF = { officiel: 'Nommé ou décrit par Rockstar pour GTA VI ; prix et effet chiffré non publiés.', vu: 'Vu dans une capture ou une vidéo officielle de GTA VI ; prix et effet chiffré non publiés.', comm: 'Identification communautaire, non confirmée par Rockstar.', serie: 'Repère de la série (GTA V, GTA Online, GTA IV ou San Andreas), présenté comme tel : rien n’est confirmé pour GTA VI.', conf: 'Rien de publié par Rockstar pour GTA VI : à confirmer.' };
function leoRows(fam) {
  const d = load(), data = d.families[fam], cats = new Map(data.categories.map(x => [x.id, x]));
  return data.items.map(it => { const m = it.media ? d.ctx.medias[it.media] : null; const src = d.sources[it.sources[0]];
    return { key: 'catalogue:' + it.id, id: it.id, kind: 'catalogue-' + fam, name: it.nom, aliases: [...(it.variantes || [])], category: data.label + ' · ' + cats.get(it.categorie).label, url: data.page + '#' + rowId(fam, it), image: m ? m.variants[0].src : null, calcId: null, price: null, proof: PROOF[it.statut], source: src.url, verifiedAt: src.consultedAt }; });
}
function progressIds(fam) { return load().families[fam].items.filter(trackable).map(it => it.id); }
function progressNames(fam) {
  const d = load(), data = d.families[fam], cats = new Map(data.categories.map(x => [x.id, x]));
  return Object.fromEntries(data.items.filter(trackable).map(it => [it.id, { n: it.nom, c: cats.get(it.categorie).label, u: data.page.slice(1) + '#' + rowId(fam, it) }]));
}
function sourcesOf(fams) {
  const d = load(), ids = new Set();
  for (const fam of fams) for (const it of d.families[fam].items) for (const s of it.sources) ids.add(s);
  return [...ids].map(id => ({ id, ...d.sources[id] })).sort((a, b) => STATUS_ORDER.indexOf(a.statut) - STATUS_ORDER.indexOf(b.statut) || a.title.localeCompare(b.title, 'fr'));
}
function placesOf(fams) {
  const d = load(), ids = new Set();
  for (const fam of fams) for (const it of d.families[fam].items) for (const o of it.ou_le_trouver) if (o.lieu) ids.add(o.lieu);
  return [...ids].map(place);
}
module.exports = { FAMILIES, STATUS_ORDER, KIND, load, check, counts, counterText, listBox, row, rowId, ldItemList, searchEntries, leoRows, progressIds, progressNames, sourcesOf, placesOf, place, repereText, trackable, sortItems };
if (require.main === module) { const d = load({ fresh: true }); for (const fam of FAMILIES) { const c = counts(fam); console.log(fam + ' : ' + counterText(fam) + ' (officiel ' + c.officiel + ', vu ' + c.vu + ', comm ' + c.comm + ', série ' + c.serie + ', à confirmer ' + c.conf + ', suivis ' + c.suivis + ')'); } }
