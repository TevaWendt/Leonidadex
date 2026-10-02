'use strict';
/* v7.42 (lot 5) : catalogues en listes dépliables (consommables, coiffures, tatouages, tenues et accessoires).
   v7.43 (lot 6) : personnalisations des véhicules (perso-vehicules) et des armes (perso-armes), même modèle, avec un champ
   compat (catégories de véhicules ou d'armes, fiches d'armes documentées) qui alimente les filtres « pour ce véhicule /
   cette arme » (catalogue.js, ancres #perso-vehicules=<cat> et #perso-armes=<cat>) et un champ acq qui relie une ligne à
   la case d'une acquisition déjà suivie (même stockage, aucun double compte). Données : outils/catalogues/<famille>.json,
   validées contre outils/catalogues/schema.json (sous-ensemble de JSON Schema implémenté ici, sans dépendance) et contre
   le site : sources connues (outils/catalogues/sources.json), lieux connus de la carte, visuels connus, identifiants
   uniques, colonne GTA VI toujours « à confirmer ». Rendu : boîte details/summary dans la charte, tableau complet écrit à
   la génération (lisible sans JavaScript), filtres et tri activés par catalogue.js, suivi par famille via suivi.js
   (data-track). Projections : recherche interne, index de Léo, ItemList JSON-LD, identifiants et noms pour la page
   Progression. Aucun texte n'est écrit ici : tout vient des JSON. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const S = require('./sections.cjs');
const root = path.resolve(__dirname, '..');
const DIR = path.join(__dirname, 'catalogues');
const FAMILIES = ['consommables', 'coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes'];
const STATUS_ORDER = ['officiel', 'vu', 'comm', 'conf', 'serie'];
const KIND = { consommables: 'Consommable', coiffures: 'Coiffure', tatouages: 'Tatouage', tenues: 'Tenue ou accessoire', 'perso-vehicules': 'Personnalisation de véhicule', 'perso-armes': 'Personnalisation d’arme' };
/* Lot 6 : libellés des catégories de véhicules et d'armes du site (mêmes identifiants que vehicules-data.js / armes-data.js). */
const VEH_CATS = { berline: 'Berlines', sport: 'Voitures de sport', supercar: 'Supercars', muscle: 'Muscle cars', suv: 'SUV et 4x4', pickup: 'Pick-up et tout-terrain', van: 'Vans et cargos', moto: 'Deux-roues et quads', helicoptere: 'Hélicoptères', avion: 'Avions', bateau: 'Bateaux et jet-skis', service: 'Service et urgence', divers: 'Divers' };
const ARM_CATS = { pistolet: 'Pistolets', pompe: 'Fusils à pompe', pm: 'Pistolets-mitrailleurs', assaut: 'Fusils d’assaut', precision: 'Fusils de précision', mitrailleuse: 'Mitrailleuses', melee: 'Corps à corps', projectile: 'Projectiles', speciale: 'Armes spéciales' };
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
  /* v7.59 (check ultime) : « if / then » minimal (JSON Schema) : quand la condition est tenue, les contraintes de « then » s'appliquent
     (sert à prix_gta6 : une valeur écrite exige un statut publié, une source et une date). */
  if (schema.if && schema.then) { const cond = []; check(value, schema.if, at, cond); if (!cond.length) { const sub = []; check(value, schema.then, at, sub); for (const e of sub) errors.push(e.replace(/^([^:]+) :/, '$1 (prix_gta6.valeur écrit) :')); } }
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
  /* Lot 6 : armes recensées (compat.ids), acquisitions suivables (acq) ; leurs identifiants sont aussi réservés. */
  const weapons = new Map(ctx.window.LK_ARMES.map(a => [a.id, a]));
  const acq = json('outils/acquisitions.json');
  const acquisitions = new Map(acq.items.filter(x => x.trackable === true).map(x => [x.id, x]));
  for (const x of acq.items) taken.add(x.id);
  return { places, groups, medias, taken, weapons, acquisitions };
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
      /* v7.59 (check ultime, CALC-15) : un prix GTA VI s'écrit le jour où Rockstar le publie — avec le schéma unique : statut
         « officiel » (publié) ou « verified » (relevé dans le jeu), une source et une date ; sinon la génération s'arrête. */
      if (it.prix_gta6 && it.prix_gta6.valeur !== null && it.prix_gta6.valeur !== undefined) {
        const p = it.prix_gta6;
        if (typeof p.valeur !== 'number' || !Number.isFinite(p.valeur) || p.valeur < 0 || p.valeur > 1e12) errors.push(at + ' : prix_gta6.valeur illisible (nombre ≥ 0 attendu)');
        if (!['officiel', 'official', 'verified', 'vu'].includes(p.statut)) errors.push(at + ' : prix_gta6.valeur écrit exige le statut « officiel » (publié par Rockstar) ou « verified » (relevé dans le jeu), trouvé « ' + p.statut + ' »');
        if (!p.source || typeof p.source !== 'string') errors.push(at + ' : prix_gta6.valeur écrit exige une source (URL ou référence précise)');
        if (!/^\d{4}-\d{2}-\d{2}/.test(p.verifiedAt || '')) errors.push(at + ' : prix_gta6.valeur écrit exige verifiedAt (AAAA-MM-JJ)');
      }
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
      /* Lot 6 : compatibilité et case d'acquisition. */
      if (it.compat) {
        if (!it.compat.vehicules && !it.compat.armes && !it.compat.ids) errors.push(at + ' : compat sans vehicules, armes ni ids');
        if (it.compat.vehicules && fam !== 'perso-vehicules') errors.push(at + ' : compat.vehicules réservé à la famille perso-vehicules');
        if ((it.compat.armes || it.compat.ids) && fam !== 'perso-armes') errors.push(at + ' : compat.armes et compat.ids réservés à la famille perso-armes');
        for (const id of it.compat.ids || []) { const a = ctx.weapons.get(id); if (!a) errors.push(at + ' : arme inconnue « ' + id + ' »'); else if (it.compat.armes && !it.compat.armes.includes(a.cat)) errors.push(at + ' : l’arme « ' + id + ' » n’est pas dans les catégories déclarées'); }
        if (it.compat.ids && !srcs.some(s => s && (s.statut === 'officiel' || s.statut === 'vu'))) errors.push(at + ' : une compatibilité arme par arme doit s’appuyer sur une source officielle ou vue');
      }
      if (it.acq) {
        if (!ctx.acquisitions.has(it.acq)) errors.push(at + ' : acquisition suivable inconnue « ' + it.acq + ' »');
        if (it.suivi !== false) errors.push(at + ' : une ligne reliée à une acquisition porte suivi false (sa case est celle de la carte)');
      }
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
/* Lot 6 : les personnalisations comptent des « postes ». */
const NOUN = { 'perso-vehicules': 'postes ', 'perso-armes': 'postes ' };
function counterText(fam) { const c = counts(fam); return c.n + ' ' + (NOUN[fam] || '') + 'référencés, dont ' + c.confirmes + ' confirmés pour GTA VI'; }
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
/* Le nom vient des données de la carte, où « & » est déjà écrit &amp; : on le rétablit avant de l'échapper au rendu. */
function place(id) { const p = load().ctx.places.get(id); return { id, name: String(p.n).replace(/&amp;/g, '&'), region: load().ctx.groups.get(p.p) || null, statut: PLACE_STATUS[p.s] || 'conf' }; }
/* Lot 6 : compatibilité d'un poste (catégories de véhicules ou d'armes, fiches d'armes) : attributs de filtre + ligne lisible. */
const UNITS = { graisse: ' % de graisse', sante: ' % de vie', armure: ' % d’armure', capacite: ' % de capacité', pourcent: ' %', duree: ' min' };
/* Mots de la compatibilité pour la recherche (libellés des catégories, noms des armes). */
function compatWords(it) { const c = it.compat; if (!c) return []; const d = load(); return [...(c.vehicules || []).map(x => VEH_CATS[x]), ...(c.armes || []).map(x => ARM_CATS[x]), ...(c.ids || []).map(id => d.ctx.weapons.get(id).nom)]; }
function compatOf(it) {
  const c = it.compat; if (!c) return { attrs: '', html: '' };
  const d = load();
  const tags = [...(c.vehicules || []), ...(c.armes || []), ...(c.ids || [])];
  const labels = [...(c.vehicules || []).map(x => VEH_CATS[x]), ...(c.armes || []).map(x => ARM_CATS[x])];
  const fiches = (c.ids || []).map(id => { const a = d.ctx.weapons.get(id); return '<a href="armes/' + esc(id) + '.html">' + esc(a.nom) + '</a>'; });
  const html = '<p class="cat-compat"><span>' + (c.vehicules ? 'Pour' : 'Armes') + ' :</span> ' + esc(labels.join(', '))
    + (fiches.length ? (labels.length ? ' · ' : '') + '<span>fiches :</span> ' + fiches.join(', ') : '')
    + (c.note ? ' <i>(' + esc(c.note) + ')</i>' : '') + '</p>';
  return { attrs: ' data-compat="' + esc(tags.join(' ')) + '"', html };
}
/* Libellés des filtres de compatibilité d'une famille (catégorie → nom), pour catalogue.js. */
function compatLabels(fam) {
  const d = load(), out = {};
  for (const it of d.families[fam].items) { const c = it.compat || {}; for (const x of c.vehicules || []) out[x] = VEH_CATS[x]; for (const x of c.armes || []) out[x] = ARM_CATS[x]; for (const id of c.ids || []) out[id] = d.ctx.weapons.get(id).nom; }
  return out;
}
/* Catégories couvertes par au moins une ligne (pour les liens « Personnaliser ce véhicule » / « Accessoires compatibles » des fiches). */
function coverage(fam) { return new Set(Object.keys(compatLabels(fam))); }
function acqCell(it) {
  const a = load().ctx.acquisitions.get(it.acq);
  return '<label class="d-check cat-acq" hidden><input type="checkbox" data-acq-toggle="' + esc(it.acq) + '" aria-label="J’ai obtenu : ' + esc(a.name) + '"> J’ai obtenu</label><a class="cat-acq-link" href="#' + esc(it.acq) + '">Carte Rockstar</a>';
}
function whereCell(it) {
  /* v7.52 : deux lieux du même nom dans une ligne se distinguent par leur numéro sur la carte (« Xero Gas Station 2 »), sans
     inventer de région ; le lien mène toujours au bon repère. */
  const names = it.ou_le_trouver.filter(o => o.lieu).map(o => place(o.lieu).name), rank = new Map();
  return it.ou_le_trouver.map(o => {
    if (o.lieu) { const p = place(o.lieu), twin = names.filter(n => n === p.name).length > 1, k = (rank.get(p.name) || 0) + 1; rank.set(p.name, k);
      const label = twin ? p.name + ' ' + k + (p.region ? ' (' + p.region + ')' : '') : p.name;
      return '<a class="cat-lieu" href="carte.html#lieu=' + esc(p.id) + '"' + (p.region ? ' title="' + esc(p.region) + '"' : '') + '>' + S.pip(p.statut) + esc(label) + '</a>'; }
    return '<span class="cat-type">' + esc(o.type) + (o.note ? ' <i>' + esc(o.note) + '</i>' : '') + '</span>';
  }).join('');
}
const PERSON = { jason: 'Jason', lucia: 'Lucia', 'jason-lucia': 'Jason et Lucia' };
function rowId(fam, it) { return fam + '-' + it.id; }
/* v7.50 (lot 3) : vignette de la ligne (visuel officiel lié, sinon pictogramme de la catégorie, dit comme tel),
   colonne GTA VI qui distingue « Prix à venir » et « Achat à confirmer », fiche complète dépliable (modèle commun). */
const FD = require('./fiche-doc.cjs');
/* v7.56 (lot 3, UI-01) : la vignette garde l'adresse de la grande version (data-big) pour la fiche paysage ouverte par catalogue.js. */
function thumb(it, cat, media) {
  if (media) { const v = media.variants.find(x => x.w === 480) || media.variants[0], big = media.variants.find(x => x.w === 1280); return '<span class="cat-thumb"><img src="' + esc(v.src.replace(/^\//, '')) + '" width="' + v.w + '" height="' + v.h + '" alt="' + esc(media.alt || media.titre || it.nom) + '" loading="lazy" decoding="async"' + (big ? ' data-big="' + esc(big.src.replace(/^\//, '')) + '"' : '') + '></span>'; }
  return '<span class="cat-thumb cat-thumb--ico" title="Pictogramme de la catégorie, pas un visuel de l’objet">' + S.icon(cat.icon, 'cat-thumb-ico') + '</span>';
}
/* v7.56 (lot 3, UI-01) : la fiche complète reste une boîte details/summary (lisible sans script, repli de secours) ; avec
   script, catalogue.js ouvre son contenu (.cat-fiche-body) dans une fiche paysage commune (<dialog class="cat-dlg">) :
   visuel et identité à gauche, faits et rubriques à droite, empilés sur téléphone. Rien n'est écrit deux fois dans la page. */
function ficheBox(fam, it) {
  return '<details class="cat-fiche"><summary class="cat-fiche-bt" data-cat-sheet aria-label="Fiche complète : ' + esc(it.nom) + '">Fiche complète</summary><div class="cat-fiche-body">' + FD.render(FD.CATEGORY_OF[fam], FD.knownOfRow(fam, it, id => place(id).name), { compact: true, level: 3, title: it.nom }) + '</div></details>';
}
/* v7.56 (lot 3, CONSO-01) : familles dont la description de chaque ligne est repliée au départ (commande « Description »
   propre à la ligne, dépliable et repliable, au clavier aussi). Sans script, tout est visible (feuille <noscript> des pages). */
const FOLDED = new Set(['consommables']);
/* v7.56 (lot 3, UI-02) : légende des statuts en tête de chaque liste — un badge par statut présent, son sens en une ligne et
   son nombre de lignes ; avec script, chaque badge filtre la liste (catalogue.js). Mêmes couleurs sur toutes les pages. */
const KEY = { officiel: 'Nommé ou décrit par Rockstar pour GTA VI', vu: 'Vu dans un trailer ou une capture officielle', comm: 'Rapprochement de joueurs, non confirmé', serie: 'Chiffre d’un autre GTA : ne vaut pas pour GTA VI', conf: 'Rien de publié : on attend Rockstar' };
function keyStrip(fam) {
  const c = counts(fam);
  return '<div class="cat-key" role="group" aria-label="Légende des statuts de la liste"><span class="cat-key-t">Légende</span>'
    + STATUS_ORDER.filter(s => c[s]).map(s => '<button type="button" class="cat-key-bt" data-cat-key="' + s + '" aria-pressed="false" disabled title="' + esc(KEY[s]) + '">' + S.pip(s, true) + '<span class="cat-key-d">' + esc(KEY[s]) + '</span><span class="cat-key-n">' + c[s] + ' ligne' + (c[s] > 1 ? 's' : '') + '</span></button>').join('')
    + '</div>';
}
function accessHtml(it) { const a = FD.accessCell(it); return '<span class="cat-conf">' + S.pip(a.known ? 'officiel' : 'conf') + esc(a.price) + '</span><small class="cat-buy">' + esc(a.buy) + '</small>'; }
function row(fam, it, cat, sources) {
  const d = load(), media = it.media ? d.ctx.medias[it.media] : null, ci = d.families[fam].categories.findIndex(x => x.id === cat.id);
  const srcLinks = it.sources.map((id, i) => '<a href="#src-' + esc(id) + '" class="cat-src" aria-label="Source : ' + esc(sources[id].title) + '">source' + (it.sources.length > 1 ? ' ' + (i + 1) : '') + '</a>').join(' ');
  const q = fold([it.nom, it.description, cat.label, it.effet.texte, ...(it.variantes || []), ...it.ou_le_trouver.map(o => o.lieu ? place(o.lieu).name : o.type), PERSON[it.personnage] || '', ...compatWords(it)].join(' '));
  const rep = repereText(it.prix_repere_serie), repV = repereValue(it.prix_repere_serie), compat = compatOf(it), folded = FOLDED.has(fam);
  return '<tr class="cat-row" id="' + esc(rowId(fam, it)) + '" data-cat="' + esc(it.categorie) + '" data-st="' + esc(it.statut) + '" data-ci="' + ci + '"' + (cat.groupe ? ' data-group="' + esc(cat.groupe) + '"' : '') + ' data-nom="' + esc(fold(it.nom)) + '"' + (repV !== null ? ' data-prix="' + repV + '"' : '') + compat.attrs + ' data-q="' + esc(q) + '">'
    + '<td class="cat-c-st" data-l="Statut">' + S.pip(it.statut, true) + '</td>'
    + '<td class="cat-c-nom" data-l="Élément">' + thumb(it, cat, media) + '<b class="cat-nom">' + esc(it.nom) + '</b>'
    + '<span class="cat-cat">' + S.icon(cat.icon, 'cat-ico') + esc(cat.label) + '</span>'
    + (it.personnage ? '<span class="cat-who">' + esc(PERSON[it.personnage]) + '</span>' : '')
    /* v7.56 : description, variantes, compatibilité et note forment un bloc (.cat-more) ; repliée au départ pour les familles
       de FOLDED (attribut hidden retiré par le bouton « Description » de catalogue.js, ou par la feuille <noscript>). */
    + '<div class="cat-more" id="' + esc(rowId(fam, it)) + '-more"' + (folded ? ' hidden' : '') + '>'
    + '<p class="cat-desc">' + esc(it.description) + '</p>'
    + (it.variantes && it.variantes.length ? '<p class="cat-var"><span>Variantes :</span> ' + esc(it.variantes.join(', ')) + '</p>' : '')
    + compat.html
    + (it.notes ? '<p class="cat-note">' + esc(it.notes) + '</p>' : '')
    + '</div>'
    + '<p class="cat-meta">' + srcLinks + (media ? ' <a class="cat-media" href="medias.html#media-' + esc(it.media) + '">visuel officiel</a>' : '') + (it.lien ? ' <a class="cat-link" href="' + esc(it.lien.href) + '">' + esc(it.lien.label) + '</a>' : '') + '</p>'
    + '<div class="cat-acts">' + (folded ? '<button type="button" class="cat-more-bt" data-cat-more aria-expanded="false" aria-controls="' + esc(rowId(fam, it)) + '-more"><span class="cat-more-l">Description</span></button>' : '') + ficheBox(fam, it) + '</div></td>'
    + '<td class="cat-c-eff" data-l="Effet">' + esc(it.effet.texte) + (it.effet.valeur !== null ? '<b class="cat-eff-n">' + esc(String(it.effet.valeur)) + (UNITS[it.effet.unite] || ' min') + ' <i>(' + esc(it.effet.jeu) + ')</i></b>' : '') + '</td>'
    + '<td class="cat-c-p6" data-l="GTA VI">' + accessHtml(it) + '</td>'
    + '<td class="cat-c-pr" data-l="Repère de la série">' + (rep ? '<b class="cat-repere">' + esc(rep) + '</b>' + (it.prix_repere_serie.note ? '<small>' + esc(it.prix_repere_serie.note) + '</small>' : '') : '<span class="cat-none">Pas de repère</span>') + '</td>'
    + '<td class="cat-c-ou" data-l="Où le trouver">' + whereCell(it) + '</td>'
    + '<td class="cat-c-own" data-l="Suivi"' + (trackable(it) ? ' data-track="' + esc(fam) + '" data-track-id="' + esc(it.id) + '" data-track-name="' + esc(it.nom) + '"' : '') + '>' + (trackable(it) ? '' : it.acq ? acqCell(it) : '<span class="cat-none">—</span>') + '</td></tr>';
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
  const tags = compatLabels(fam);
  return '<details class="cat-box" id="' + esc('box-' + fam) + '" data-catalogue="' + esc(fam) + '"' + (Object.keys(tags).length ? ' data-cat-tags="' + esc(JSON.stringify(tags)) + '"' : '') + (FOLDED.has(fam) ? ' data-cat-desc="fold"' : '') + (opts.open ? ' open' : '') + '>'
    + '<summary class="cat-sum"><span class="cat-sum-t">' + esc(data.titre) + '</span><span class="cat-sum-n"><b>' + c.n + '</b> ' + esc(NOUN[fam] || '') + 'référencés · <b>' + c.confirmes + '</b> confirmés pour GTA VI · ' + c.serie + ' repères de la série</span><span class="cat-chev" aria-hidden="true"></span></summary>'
    + '<div class="cat-body">'
    + (Object.keys(tags).length ? '<p class="cat-filter" data-cat-filter hidden><span>Filtré pour :</span> <b data-cat-filter-label></b> <button type="button" class="cat-reset" data-cat-reset>Tout afficher</button></p>' : '')
    + '<div class="cat-track" data-track-bar="' + esc(fam) + '"><span class="cat-track-l">' + esc(data.suivi.label) + ' :</span> <b>0</b> <span class="cat-track-sep">/</span> <span class="own-total">' + c.suivis + '</span> ' + esc(data.suivi.fait) + '<progress max="' + c.suivis + '" value="0" aria-label="' + esc(data.suivi.label) + '"></progress><a class="cat-track-link" href="' + esc(require('./carnets-source.cjs').carnetHref(fam)) + '">' + esc(require('./carnets-source.cjs').carnetOf(fam).bouton) + '</a></div>'
    + '<form class="cat-tools" data-cat-tools hidden>'
    + '<label class="cat-search"><span class="sr-only">Chercher dans la liste</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg><input type="search" placeholder="Chercher un nom, un effet, un lieu" autocomplete="off" data-cat-q></label>'
    + '<label class="cat-sel"><span>Catégorie</span><select data-cat-f="cat"><option value="">Toutes</option>' + catOptions + '</select></label>'
    + '<label class="cat-sel"><span>Statut</span><select data-cat-f="st"><option value="">Tous</option>' + stOptions + '</select></label>'
    + '<label class="cat-sel"><span>Tri</span><select data-cat-sort><option value="statut">GTA VI d’abord</option><option value="nom">Nom (A → Z)</option><option value="cat">Catégorie</option><option value="prix">Repère de prix</option></select></label>'
    + '<button type="reset" class="cat-reset">Tout afficher</button>'
    + '<p class="cat-count" role="status" aria-live="polite" data-cat-count></p>'
    + chips + '</form>'
    + keyStrip(fam)
    + '<div class="cat-wrap"><table class="cat-table"><caption class="sr-only">' + esc(data.titre) + ' : ' + esc(counterText(fam)) + '</caption><thead><tr><th scope="col">Statut</th><th scope="col">Élément</th><th scope="col">Effet</th><th scope="col">GTA VI</th><th scope="col">Repère de la série</th><th scope="col">Où le trouver</th><th scope="col">Suivi</th></tr></thead><tbody>' + rows + '</tbody></table></div>'
    + '<p class="cat-empty" data-cat-empty hidden>Aucune ligne ne correspond. <button type="button" class="cat-reset" data-cat-reset>Tout afficher</button></p>'
    + '<div class="cat-legend"><p>Un chiffre de GTA V, GTA Online, GTA IV ou San Andreas reste dans la colonne « Repère de la série » : la colonne GTA VI reste à confirmer tant que Rockstar n’a rien publié. « Je l’ai » s’enregistre sur cet appareil et compte dans <a href="' + esc(require('./carnets-source.cjs').carnetHref(fam)) + '">' + esc(require('./carnets-source.cjs').carnetOf(fam).titre) + '</a>, ton carnet sur cet appareil.</p>'
    + (Object.keys(tags).length ? '<p>Les postes venus de la série s’appliquent aux catégories qu’ils indiquent dans GTA V ou GTA Online : rien n’est confirmé pour GTA VI tant que Rockstar n’a rien publié. Une fiche d’arme n’est citée que quand une source officielle la montre.</p>' : '') + '</div>'
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
  return data.items.map(it => ({ l: it.nom, k: KIND[fam] || data.label, u: data.page + '#' + rowId(fam, it), s: fold([it.nom, it.description, cats.get(it.categorie).label, data.label, ...(it.variantes || []), ...it.ou_le_trouver.map(o => o.lieu ? place(o.lieu).name : o.type), ...compatWords(it)].join(' ')), w: 0, t: 'element' }));
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
module.exports = { FAMILIES, STATUS_ORDER, KIND, VEH_CATS, ARM_CATS, FOLDED, KEY, load, check, counts, counterText, listBox, row, rowId, ldItemList, searchEntries, leoRows, progressIds, progressNames, sourcesOf, placesOf, place, repereText, trackable, sortItems, compatLabels, coverage };
if (require.main === module) { const d = load({ fresh: true }); for (const fam of FAMILIES) { const c = counts(fam); console.log(fam + ' : ' + counterText(fam) + ' (officiel ' + c.officiel + ', vu ' + c.vu + ', comm ' + c.comm + ', série ' + c.serie + ', à confirmer ' + c.conf + ', suivis ' + c.suivis + ')'); } }
