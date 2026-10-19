#!/usr/bin/env node
/* LEONIDAKIT — couverture-pages.cjs (v7.94, « une page par élément » ; v7.95 : lot A généré, module, décisions)
   L’inventaire de TOUS les éléments du site, famille par famille, et la preuve que chacun a sa page (ou une exclusion
   justifiée). Lit toutes les sources de données, liste chaque élément, cherche sa page dans le dépôt, estime si la page
   atteint le seuil d’indexation (nom + catégorie + description + deux informations réelles ou un visuel officiel), puis écrit
   outils/COUVERTURE-PAGES.md.

   node outils/couverture-pages.cjs             → rapport + code de sortie 1 si un élément n’a ni page ni exclusion
   node outils/couverture-pages.cjs --rapport   → rapport seul (état des lieux), code 0
   node outils/couverture-pages.cjs --json      → l’inventaire complet en JSON sur la sortie standard (pour les générateurs)
   require('./couverture-pages.cjs')            → le même inventaire en module (FAMILLES, sources, slug) : outils/gen-pages-elements.cjs
                                                  (v7.95, lot A) s’en sert pour écrire les pages, l’inventaire reste la seule liste.

   Règles (prompt « Une page par élément », 17 octobre 2026) :
   - un doublon (même élément dans deux sources) a sa page une seule fois, l’autre source renvoie vers elle ;
   - un élément venu d’une fuite est exclu et listé ; aucune source du site n’en marque : la liste est vide ;
   - tout ce qui ne peut pas avoir sa page est signalé « à trancher par Téva », jamais décidé ici.
   v7.95 (lot A, 18 octobre 2026, Téva : « tranche toi-même mais n’oublie aucun élément du site ») : les sept points sont
   tranchés (section « Décisions » du rapport) ; une page générée à l’adresse cible compte comme page de l’élément. */
'use strict';
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const json = f => JSON.parse(read(f));
const exists = f => fs.existsSync(path.join(ROOT, f));
const loadWindow = f => { const w = {}; vm.runInNewContext(read(f), { window: w, document: {} }); return w; };
const ARGS = new Set(process.argv.slice(2));
const LANGUES = json('outils/langues.json').langues.map(l => l.code);

/* ---------- outils communs ---------- */
const slug = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/&/g, ' et ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'sans-nom';
const uniq = (items, key = 'slug') => { const seen = new Map(); for (const it of items) { let s = it[key]; if (seen.has(s)) { const alt = it.suffixe ? s + '-' + slug(it.suffixe) : null; s = alt && !seen.has(alt) ? alt : s + '-' + slug(it.id); } seen.set(s, it); it[key] = s; } return items; };
const pageDe = f => exists(f) ? f : null;
const nb = n => new Intl.NumberFormat('fr-FR').format(n);

/* un élément : { id, nom, slug, page (chemin existant ou null), cible (chemin prévu), exclusion (raison ou null),
   indexable (true si les données atteignent le seuil), faits (nombre d’informations réelles), visuel (true si un visuel officiel),
   note (remarque pour le rapport), doublonDe (élément d’une autre famille qui porte la page) } */
/* v7.96 (Téva, 18 octobre, 20 h 09) : toute page par élément proposée aux moteurs (INDEXER_TOUT = true). v7.97 (Téva, 18 octobre, 23 h 58 :
   « les pages n’étant pas assez appropriées de par le manque d’informations qu’elles possèdent […] doivent être placées sous la balise
   noindex » ; elles seront remplies et indexées quand Rockstar publiera) : le seuil d’informations décide de nouveau (« seuil »,
   le seuil du prompt : un lieu avec deux informations réelles est indexable). */
const INDEXER_TOUT = false;
const elem = (famille, o) => ({ famille, id: String(o.id), nom: o.nom || o.id, slug: o.slug || slug(o.nom || o.id), page: o.page || null, cible: o.cible || null, exclusion: o.exclusion || null, indexable: INDEXER_TOUT ? !o.exclusion : !!o.indexable, seuil: !!o.indexable, strict: o.strict === undefined ? !!o.indexable : !!o.strict, faits: o.faits || 0, visuel: !!o.visuel, note: o.note || '', doublonDe: o.doublonDe || null, suffixe: o.suffixe || '' });

/* ---------- sources ---------- */
const V = loadWindow('vehicules-data.js').LK_VEHICULES;
const A = loadWindow('armes-data.js').LK_ARMES;
const ED = json('outils/editorial.json');
const AN = json('outils/editorial-animaux.json');
const ACT = json('outils/activites/activites.json');
const RAD = json('outils/radios/radios.json');
const ACQ = json('outils/acquisitions.json');
const MED = json('outils/medias-officiels.json');
const MONDE = json('outils/monde-dossiers.json');
const ACTUS = json('outils/actus/actus.json');
const MARQUES = json('outils/marques.json').marques;
const CAT = {}; for (const f of ['consommables', 'coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes']) CAT[f] = json('outils/catalogues/' + f + '.json');
const OPTIONS = json('outils/catalogues/perso-options.json');
const CARNET = JSON.parse(read('carnets/lieux-data.js').match(/window\.LK_CARNET_LIEUX = ([\s\S]*);\s*$/)[1]);
const GTADB = JSON.parse(read('carte-gtadb.js').match(/window\.LK_GTADB = ([\s\S]*?);\s*(?:\n|$)/)[1]); /* le fichier servi : seules les photos présentes dans photos/ y restent */
const LANDMARKS = json('outils/landmarks-leonidakit.json');
const MODELES = { missions: json('outils/missions/missions.json').missions, trophees: json('outils/trophees/trophees.json').trophees, codes: json('outils/codes/codes.json').codes, collectibles: json('outils/collectibles.json').items, online: [].concat(...Object.values(json('outils/online/donnees.json')).filter(Array.isArray)) };

/* ---------- familles ---------- */
const FAMILLES = [];
const famille = (id, label, o) => { const f = Object.assign({ id, label, source: '', dossier: '', items: [], nouvelle: false, modele: false, pagesHors: [], aTrancher: [], volume: true }, o); FAMILLES.push(f); return f; };
const pagesDossier = d => exists(d) ? fs.readdirSync(path.join(ROOT, d)).filter(f => f.endsWith('.html')).map(f => f.slice(0, -5)) : [];

/* 1. Véhicules (fiches déjà en place) */
{
  const f = famille('vehicules', 'Véhicules', { source: 'vehicules-data.js', dossier: 'vehicules' });
  f.items = V.map(v => elem(f.id, { id: v.id, nom: (v.marque ? v.marque + ' ' : '') + v.nom, slug: v.id, page: pageDe('vehicules/' + v.id + '.html'), indexable: true, faits: 3, visuel: true }));
  const ids = new Set(V.map(v => v.id)); f.pagesHors = pagesDossier('vehicules').filter(p => !ids.has(p));
  f.pagesHorsNote = 'redirections (outils/redirections.json) et fiches retirées (outils/retraits.json, pages noindex d’explication)';
}
/* 2. Armes */
{
  const f = famille('armes', 'Armes', { source: 'armes-data.js', dossier: 'armes' });
  f.items = A.map(a => elem(f.id, { id: a.id, nom: a.nom, slug: a.id, page: pageDe('armes/' + a.id + '.html'), indexable: true, faits: 3, visuel: true }));
  const ids = new Set(A.map(a => a.id)); f.pagesHors = pagesDossier('armes').filter(p => !ids.has(p));
  f.pagesHorsNote = 'anciens identifiants gardés en redirection';
}
/* 3. Munitions (types, d’après armes-data.js) : aucune page aujourd’hui */
{
  const f = famille('munitions', 'Types de munitions', { source: 'armes-data.js (champ mun)', dossier: 'munitions', nouvelle: true });
  const types = new Map(); for (const a of A) if (a.mun) types.set(a.mun, (types.get(a.mun) || []).concat(a.nom));
  f.items = [...types].map(([nom, armes]) => elem(f.id, { id: slug(nom), nom, cible: 'munitions/' + slug(nom) + '.html', faits: 1, indexable: false, note: armes.length + ' arme(s) : ' + armes.join(', ') }));
  f.aTrancher.push('Une seule information réelle par type (les armes qui l’utilisent) : pages prévues en noindex,follow tant que Rockstar ne publie rien de plus. Garder cette famille ou la renvoyer vers armes.html#munitions ?');
}
/* 4. Monde : régions, personnages, entreprises, gangs, demeures, planques (lore-gen.js) */
const MONDE_FAM = [['regions', 'Régions et lieux principaux', 'lieux', 'regions'], ['personnages', 'Personnages', 'personnages', 'characters'], ['entreprises', 'Entreprises', 'entreprises', 'businesses'], ['gangs', 'Gangs et factions', 'gangs', 'factions'], ['demeures', 'Demeures', 'demeures', 'residences'], ['planques', 'Planques', 'planques', 'hideouts']];
for (const [id, label, dossier, cle] of MONDE_FAM) {
  const f = famille(id, label, { source: 'outils/editorial.json (' + cle + ')', dossier });
  f.items = ED[cle].map(x => elem(f.id, { id: x.id, nom: x.nom || x.name || x.titre || x.id, slug: x.id, page: pageDe(dossier + '/' + x.id + '.html'), indexable: true, faits: 2, visuel: true }));
  const ids = new Set(ED[cle].map(x => x.id)); f.pagesHors = pagesDossier(dossier).filter(p => !ids.has(p));
}
/* 5. Animaux, activités, radios (générateurs de section) */
{
  const f = famille('animaux', 'Animaux', { source: 'outils/editorial-animaux.json', dossier: 'animaux' });
  f.items = AN.fiches.map(x => elem(f.id, { id: x.id, nom: x.nom || x.titre || x.id, slug: x.id, page: pageDe('animaux/' + x.id + '.html'), indexable: true, faits: 2, visuel: true }));
  const ids = new Set(AN.fiches.map(x => x.id)); f.pagesHors = pagesDossier('animaux').filter(p => !ids.has(p));
}
{
  const f = famille('activites', 'Activités', { source: 'outils/activites/activites.json', dossier: 'activites' });
  f.items = ACT.activites.map(x => elem(f.id, { id: x.id, nom: x.nom || x.titre || x.id, slug: x.id, page: pageDe('activites/' + x.id + '.html'), indexable: true, faits: 2, visuel: true }));
  const ids = new Set(ACT.activites.map(x => x.id)); f.pagesHors = pagesDossier('activites').filter(p => !ids.has(p));
}
{
  const f = famille('radios', 'Stations de radio et album', { source: 'outils/radios/radios.json (stations, fiches)', dossier: 'radios' });
  const all = RAD.stations.map(s => ({ id: s.id, nom: s.name })).concat(RAD.fiches.map(x => ({ id: x.id, nom: x.titre || x.nom || x.id })));
  f.items = all.map(x => elem(f.id, { id: x.id, nom: x.nom, slug: x.id, page: pageDe('radios/' + x.id + '.html'), indexable: true, faits: 2, visuel: true }));
  const ids = new Set(all.map(x => x.id)); f.pagesHors = pagesDossier('radios').filter(p => !ids.has(p));
}
/* 6. Vidéos officielles */
{
  const f = famille('videos', 'Vidéos officielles', { source: 'outils/actus/actus.json (videos.liste)', dossier: 'videos' });
  const liste = ACTUS.videos.liste || [];
  f.items = liste.map(v => elem(f.id, { id: v.id, nom: v.nom || v.titre || v.id, slug: v.id, page: pageDe('videos/' + v.id + '.html'), indexable: true, faits: 3, visuel: true }));
  const ids = new Set(liste.map(v => v.id)); f.pagesHors = pagesDossier('videos').filter(p => !ids.has(p));
}
/* 7. Éditions du jeu (aucune page par édition aujourd’hui : editions.html les liste) */
{
  const f = famille('editions', 'Éditions du jeu', { source: 'outils/actus/actus.json (editions)', dossier: 'editions', nouvelle: true });
  const E = ACTUS.editions;
  const defs = [['standard', E.standard && (E.standard.titre || E.standard.nom) || 'Édition Standard'], ['ultimate', E.ultimate && (E.ultimate.titre || E.ultimate.nom) || 'Édition Ultimate'], ['amelioration', 'Amélioration vers l’Édition Ultimate'], ['collector', 'Coffret collector The Goodtime State – Vice City Collection']];
  f.items = defs.map(([id, nom]) => elem(f.id, { id, nom, cible: 'editions/' + id + '.html', faits: 3, visuel: true, indexable: true, note: 'listée sur editions.html et prix.html' }));
}
/* 8. Lieux de la carte : le carnet (carte.js + carte-gtadb.js) est la liste maîtresse ; les repères gtadb apportent nom en jeu,
      statut et quartier/comté ; les régions/villes/quartiers/comtés deviennent des pages de regroupement (famille suivante). */
const POINTS_SITE = (() => { const src = read('carte.js'); const m = src.match(/const POINTS = (\[[\s\S]*?\n  \]);/); return m ? vm.runInNewContext('(' + m[1] + ')') : []; })(); /* les points placés par le site (régions, villes, quartiers, lieux notables) */
const GTA_BY_ID = new Map(GTADB.lieux.map(p => [p.id, p])); for (const g of GTADB.groupes) GTA_BY_ID.set(g.id, g); for (const p of POINTS_SITE) if (!GTA_BY_ID.has(p.id)) GTA_BY_ID.set(p.id, p);
const LM_BY_ID = new Map(LANDMARKS.reperes.map(r => [r.id, r]));
const GROUP_CATS = new Set(['region', 'ville', 'quartier', 'comte']);
const CARNET_GROUPES = CARNET.groups; // [id, nom] : les 36 groupes gtadb (quartiers, villes, comtés)
{
  const f = famille('lieux-carte', 'Lieux de la carte', { source: 'carnets/lieux-data.js (carte.js + carte-gtadb.js), outils/landmarks-leonidakit.json', dossier: 'lieux-carte', nouvelle: true });
  const rows = CARNET.rows.filter(r => !GROUP_CATS.has(r[2]));
  f.items = rows.map(r => {
    const [id, nom, cat, groupe, fiche] = r; const g = GTA_BY_ID.get(id); const lm = g ? LM_BY_ID.get(id.replace(/^g-/, '')) : null;
    const generique = /^Bâtiment L\d+$/.test(nom) || /\?$/.test(nom); // nom provisoire posé par le site (bâtiment sans nom) ou nom incertain
    const surnom = /^".+"$/.test(nom); // « "Mount Waffles" » : surnom donné par la communauté (guillemets de gtadb), pas un nom en jeu
    const nomme = lm ? lm.nomme && !generique && !surnom : !generique && !surnom; // point de carte.js : nommé par le site
    const visuel = !!(g && g.img); const reel = !!(g && g.r); const quartier = g && g.p ? g.p : null;
    let faits = 1; if (quartier) faits++; if (reel) faits++; if (g && g.sv) faits++; if (lm && lm.comte) faits++; if (g && g.src === 'SITE') faits += 2; /* point du site : description éditoriale sourcée, statut */
    const douteux = lm && lm.statuts.some(s => ['existence_douteuse', 'fictif', 'annule'].includes(s));
    const page = cat === 'planque' ? pageDe('planques/' + id + '.html') : fiche ? pageDe('lieux/' + id + '.html') : null;
    const base = nom.replace(/\s*\((?:nom réel|nom supposé)\)$/, ''); /* v7.95 : l’adresse garde le nom, pas la mention entre parenthèses */
    return elem(f.id, { id, nom, slug: slug(base), cible: page ? null : 'lieux-carte/' + slug(base) + '.html', suffixe: quartier ? (GTA_BY_ID.get(quartier) || { n: quartier }).n : (lm && lm.comte) || '', page, doublonDe: page ? (cat === 'planque' ? 'planques' : 'regions') : null,
      indexable: !!(!douteux && !generique && (visuel || faits >= 2)), strict: !!(nomme && !douteux && (visuel || faits >= 3)), faits, visuel, note: [cat, g && g.src === 'SITE' ? 'point du site, ' + g.s : g ? (g.s === 'vu' ? 'repéré sur un support officiel' : 'position non confirmée') : 'point du site', generique ? 'sans nom (bâtiment numéroté)' : surnom ? 'surnom donné par la communauté' : lm && !lm.nomme ? 'nom en jeu inconnu (nom réel)' : '', douteux ? 'existence douteuse, fictif ou annulé' : ''].filter(Boolean).join(', ') });
  });
  uniq(f.items);
  f.items.forEach(it => { if (it.cible) it.cible = 'lieux-carte/' + it.slug + '.html'; });
  /* repères gtadb absents de la carte du site */
  const surCarte = new Set(GTADB.lieux.map(p => p.id.replace(/^g-/, '')));
  const absents = LANDMARKS.reperes.filter(r => !surCarte.has(r.id));
  f.absents = absents;
  f.aTrancher.push(absents.length + ' repères gtadb ne sont pas sur la carte du site (' + absents.filter(r => !r.nom).length + ' sans nom, ' + absents.filter(r => r.nom).length + ' nommés dont ' + absents.filter(r => r.nom && /\?$/.test(r.nom)).length + ' avec un « ? ») : les ajouter à la carte (donc une page chacun) ou les laisser hors site ? Liste en annexe.');
  const generiques = Object.entries(f.items.reduce((m, it) => { m[it.nom] = (m[it.nom] || 0) + 1; return m; }, {})).filter(([, n]) => n > 1);
  f.generiques = generiques;
  const strict = f.items.filter(it => it.strict).length, reels = f.items.filter(it => /\(nom réel\)$/.test(it.nom)).length;
  const numerotes = f.items.filter(it => /^Bâtiment L\d+$/.test(it.nom)).length;
  f.aTrancher.push('Seuil d’indexation : ' + f.items.filter(it => it.indexable).length + ' lieux atteignent le seuil du prompt (nom, catégorie, quartier ou comté, position, équivalent réel ou capture) ; ' + numerotes + ' bâtiments sans nom (« Bâtiment L924 ») restent en noindex ; ' + reels + ' ne sont connus que par leur nom réel (« (nom réel) ») et ' + (f.items.length - strict) + ' n’ont pas de nom en jeu confirmé. Proposition prudente : indexer les ' + strict + ' lieux au nom en jeu connu (avec capture ou trois informations), créer les autres en noindex,follow et les faire passer en indexable quand leur nom en jeu est confirmé. Les captures gtadb (photos/, CC BY 4.0, déjà sur la carte) sont-elles admises comme visuel sur ces pages, ou seulement l’aperçu de carte et les silhouettes teaser (le prompt ne parle que de img/officiel) ?');
  f.aTrancher.push(generiques.length + ' noms portés par plusieurs lieux (« Bridge » × ' + ((generiques.find(([n]) => n === 'Bridge') || [0, 0])[1]) + ', « Airfield »…) : slug complété par le quartier ou le comté, page en noindex,follow quand le lieu n’a ni nom propre ni capture officielle.');
}
/* 9. Quartiers, villes, comtés, régions (pages de regroupement) */
{
  const f = famille('quartiers-comtes', 'Régions, villes, quartiers et comtés', { source: 'carnets/lieux-data.js (catégories region, ville, quartier, comte), carte-gtadb.js (groupes)', dossier: 'quartiers', nouvelle: true });
  const rows = CARNET.rows.filter(r => GROUP_CATS.has(r[2]));
  const compte = new Map(); for (const p of GTADB.lieux) if (p.p) compte.set(p.p, (compte.get(p.p) || 0) + 1); /* p.p = identifiant du groupe gtadb (g-…) ou du point de carte.js (ambrosia, key-lento…) */
  f.items = rows.map(r => { const [id, nom, cat, , fiche] = r; const n = compte.get(id) || 0; const page = fiche ? pageDe('lieux/' + id + '.html') : null;
    return elem(f.id, { id, nom, cible: page ? null : 'quartiers/' + slug(nom) + '.html', page, doublonDe: page ? 'regions' : null, indexable: n > 0 || !!page, faits: 1 + (n ? 1 : 0), note: cat + (n ? ', ' + n + ' lieux' : ', aucun lieu rattaché dans les données') }); });
  uniq(f.items);
  f.items.forEach(it => { if (it.cible) it.cible = 'quartiers/' + it.slug + '.html'; });
  f.aTrancher.push(f.items.filter(it => !it.indexable).length + ' entrées sans lieu rattaché (régions sans groupe gtadb) : page de regroupement quand même (noindex) ou renvoi vers la carte ?');
}
/* 10. Marques de véhicules */
{
  const f = famille('marques', 'Marques de véhicules', { source: 'outils/marques.json, vehicules-data.js (champ marque)', dossier: 'marques', nouvelle: true });
  const parMarque = new Map(); for (const v of V) if (v.marque) parMarque.set(v.marque, (parMarque.get(v.marque) || 0) + 1);
  f.items = MARQUES.map(m => { const n = parMarque.get(m.name) || 0; return elem(f.id, { id: slug(m.name), nom: m.name, cible: 'marques/' + slug(m.name) + '.html', faits: (n ? 1 : 0) + (m.evoque ? 1 : 0), visuel: n > 0, indexable: n > 0, note: n + ' véhicule(s)' + (m.evoque ? ', ' + m.evoque : '') }); });
  const sansFiche = [...parMarque.keys()].filter(k => k !== 'Marque inconnue' && !MARQUES.some(m => m.name === k));
  /* v7.96 (décision du 18 octobre) : une marque portée par des véhicules mais absente de marques.json a sa page comme les autres, sans rapprochement inventé */
  for (const k of sansFiche) { const n = parMarque.get(k); f.items.push(elem(f.id, { id: slug(k), nom: k, cible: 'marques/' + slug(k) + '.html', faits: 1, visuel: n > 0, indexable: n > 0, note: n + ' véhicule(s), constructeur fictif, pas de rapprochement retenu' })); }
  if (sansFiche.length) f.aTrancher.push('Marques présentes dans vehicules-data.js mais absentes de outils/marques.json : ' + sansFiche.join(', '));
}
/* 11. Catalogues : consommables, coiffures, tatouages, tenues, personnalisations */
const CAT_DOSSIER = { consommables: 'consommables', coiffures: 'coiffures', tatouages: 'tatouages', tenues: 'tenues', 'perso-vehicules': 'perso-vehicules', 'perso-armes': 'perso-armes' };
for (const [cle, C] of Object.entries(CAT)) {
  const f = famille(cle, C.label || cle, { source: 'outils/catalogues/' + cle + '.json', dossier: CAT_DOSSIER[cle], nouvelle: true });
  f.items = C.items.map(it => { let faits = 0; if (it.effet && it.effet.texte) faits++; if (it.prix_repere_serie) faits++; if (it.prix_gta6 && it.prix_gta6.valeur != null) faits++; if (it.ou_le_trouver && it.ou_le_trouver.length) faits++; if (it.personnage) faits++; if (it.sources && it.sources.length) faits++;
    return elem(f.id, { id: it.id, nom: it.nom, slug: slug(it.id), cible: CAT_DOSSIER[cle] + '/' + slug(it.id) + '.html', faits, visuel: !!it.media, indexable: !!it.description && (faits >= 2 || !!it.media), note: it.statut }); });
}
/* 12. Valeurs d’options (chaque type de peinture, chaque couleur de néons…) */
for (const cle of ['perso-vehicules', 'perso-armes']) {
  const f = famille('options-' + cle, 'Options de personnalisation (' + (cle === 'perso-vehicules' ? 'véhicules' : 'armes') + ')', { source: 'outils/catalogues/perso-options.json (' + cle + ')', dossier: 'options-' + cle.replace('perso-', ''), nouvelle: true });
  for (const [fam, o] of Object.entries(OPTIONS[cle])) for (const v of (o.options || [])) f.items.push(elem(f.id, { id: fam + '--' + slug(v.n), nom: v.n, suffixe: fam, slug: slug(fam) + '-' + slug(v.n), cible: f.dossier + '/' + slug(fam) + '-' + slug(v.n) + '.html', faits: (v.p != null ? 1 : 0) + (o.jeu ? 1 : 0), visuel: false, indexable: false, note: fam + (o.jeu ? ', repère ' + o.jeu : '') + (v.p != null ? ', ' + nb(v.p) + ' $' : '') }));
  f.aTrancher.push(f.items.length + ' valeurs dans ' + Object.keys(OPTIONS[cle]).length + ' familles d’options : une ou deux informations chacune (prix repère de GTA V), aucun visuel : pages prévues en noindex,follow. Les créer quand même (demande du prompt) ou ne faire qu’une page par famille d’options ?');
}
/* 13. Achats et services (acquisitions.json) */
{
  const f = famille('achats', 'Achats et services', { source: 'outils/acquisitions.json (items, services, weaponVariants)', dossier: 'achats', nouvelle: true });
  for (const it of ACQ.items) { const ref = it.ref && it.ref.type === 'vehicle' ? pageDe('vehicules/' + it.ref.id + '.html') : it.ref && it.ref.type === 'weapon' ? pageDe('armes/' + it.ref.id + '.html') : null;
    f.items.push(elem(f.id, { id: it.id, nom: it.id, slug: slug(it.id), page: ref, cible: ref ? null : 'achats/' + slug(it.id) + '.html', doublonDe: ref ? (it.ref.type === 'vehicle' ? 'vehicules' : 'armes') : null, faits: 2 + (it.price != null ? 1 : 0), visuel: !!(it.media && it.media.length), indexable: true, note: it.category + ', ' + it.acquisition })); }
  for (const s of ACQ.services) { const page = pageDe('entreprises/' + s.ref + '.html'); f.items.push(elem(f.id, { id: 'service-' + s.ref, nom: s.ref, slug: slug(s.ref), page, cible: page ? null : 'achats/' + slug(s.ref) + '.html', doublonDe: page ? 'entreprises' : null, faits: 2, visuel: !!(s.media && s.media.length), indexable: true, note: 'service, ' + s.category })); }
  for (const w of ACQ.weaponVariants || []) { const id = typeof w === 'string' ? w : w.id; const page = pageDe('armes/' + id + '.html'); f.items.push(elem(f.id, { id: 'variante-' + id, nom: id, slug: slug(id), page, doublonDe: page ? 'armes' : null, cible: page ? null : 'achats/' + slug(id) + '.html', faits: 2, indexable: true, note: 'variante d’arme (bonus d’édition)' })); }
}
/* 14. Visuels officiels */
{
  const f = famille('visuels', 'Visuels officiels', { source: 'outils/medias-officiels.json', dossier: 'visuels', nouvelle: true });
  /* v7.96 : indexable quand une description (alt) a été rédigée pour l’image ; les autres pages existent en noindex,follow (titre de fichier seulement) */
  f.items = Object.values(MED).map(m => elem(f.id, { id: m.id, nom: m.titre || m.id, slug: slug(m.id), cible: 'visuels/' + slug(m.id) + '.html', faits: 1 + (m.source ? 1 : 0) + (m.alt ? 1 : 0), visuel: true, indexable: !!m.alt, note: (m.mediaType || 'image') + (m.alt ? ', décrite' : ', sans description') }));
}
/* 15. Grands moments (monde-dossiers.evenements, recoupés avec actus.json evenements) */
{
  const f = famille('moments', 'Grands moments', { source: 'outils/monde-dossiers.json (evenements), outils/actus/actus.json (evenements)', dossier: 'moments', nouvelle: true });
  /* v7.96 (décision du 18 octobre) : une page par annonce datée de la frise des Actualités ; un moment des dossiers du monde qui est la même
     chose qu’une annonce (trailers, Extended Look, aperçus, entretien, radios, lancement) renvoie vers sa page, les autres ont la leur */
  const JUMEAUX = { t1: 'trailer-1', t2: 'trailer-2', el: 'extended-look', presse: 'apercus-presse', famitsu: 'entretien-famitsu', radio: 'stations-radio', lancement: 'bande-annonce-lancement' };
  f.items = ACTUS.evenements.map(e => elem(f.id, { id: e.id, nom: e.titre, slug: slug(e.id), cible: 'moments/' + slug(e.id) + '.html', faits: 2 + (e.media || e.video ? 1 : 0) + (e.sources && e.sources.length ? 1 : 0), visuel: !!(e.media || e.video), indexable: true, note: e.iso + ', annonce ' + e.type }));
  for (const [id, e] of Object.entries(MONDE.evenements)) f.items.push(elem(f.id, JUMEAUX[id] ? { id, nom: e.titre, slug: slug(e.titre), page: pageDe('moments/' + slug(JUMEAUX[id]) + '.html'), cible: 'moments/' + slug(JUMEAUX[id]) + '.html', doublonDe: 'moments', indexable: true, faits: 2, note: 'moment des dossiers du monde, même chose que l’annonce ' + JUMEAUX[id] } : { id, nom: e.titre, slug: slug(e.titre), cible: 'moments/' + slug(e.titre) + '.html', faits: 1 + (e.iso ? 1 : 0) + (e.media ? 1 : 0), visuel: !!e.media, indexable: !!e.iso, note: 'moment des dossiers du monde, ' + (e.date || '') }));
  const actusIds = ACTUS.evenements.map(e => e.id);
  f.aTrancher.push('actus.json décrit ' + actusIds.length + ' annonces datées (frise des Actualités), monde-dossiers.json ' + f.items.length + ' moments : les deux listes se recoupent (trailers, Extended Look, bande-annonce de lancement…). Proposition : une page par annonce de la frise (' + actusIds.length + '), les moments du monde y renvoient ; à confirmer.');
}
/* 16. Familles sans donnée réelle avant la sortie : modèle seulement */
for (const [id, label, src] of [['missions', 'Missions', 'outils/missions/missions.json'], ['trophees', 'Trophées et succès', 'outils/trophees/trophees.json'], ['codes', 'Codes de triche', 'outils/codes/codes.json'], ['collectibles', 'Collectibles', 'outils/collectibles.json'], ['online', 'GTA Online (activités, achats, entreprises)', 'outils/online/donnees.json']]) {
  const f = famille(id, label, { source: src, dossier: id === 'codes' ? 'codes-de-triche' : id, modele: true });
  f.items = (MODELES[id] || []).map(x => elem(f.id, { id: x.id, nom: x.nom || x.id, cible: f.dossier + '/' + slug(x.id) + '.html', page: pageDe(f.dossier + '/' + slug(x.id) + '.html') }));
}

/* v7.95 (lot A) : une page écrite à l’adresse cible est la page de l’élément (les générateurs écrivent exactement là) */
for (const f of FAMILLES) for (const it of f.items) if (!it.page && it.cible && exists(it.cible)) it.page = it.cible;

/* ---------- décisions (18 octobre 2026 : « tranche toi-même mais n’oublie aucun élément du site ») ---------- */
const DECISIONS = [
  ['Lieux de la carte', 'Les 110 repères gtadb absents de la carte du site restent hors site : 43 n’ont pas de nom, les autres n’ont pas été retenus sur la carte (nom incertain « ? », statut démoli, douteux ou annulé, ou lieu jamais vu sur un support officiel). Ils ne sont pas des éléments du site ; la liste reste en annexe, et un repère ajouté un jour à la carte reçoit sa page à la régénération suivante.'],
  ['Toutes les familles', 'Indexation (Téva, 18 octobre, 23 h 58 : « chaque élément du site doit avoir sa propre page […] les pages n’étant pas assez appropriées de par le manque d’informations qu’elles possèdent […] doivent être placées sous la balise noindex », puis remplies et indexées quand Rockstar publiera) : chaque élément a sa page ; une page sans assez d’informations réelles est en noindex,follow (bâtiments numérotés, noms incertains, existence douteuse, valeurs d’options et types de munitions sans donnée de GTA VI, visuels sans description, quartiers sans lieu, marque sans véhicule) ; les autres sont indexables. La liste des pages en noindex est livrée à part (archive des pages à compléter).'],
  ['Lieux de la carte', 'Seuil d’indexation (Téva, 18 octobre, 19 h 26 : « un lieu avec son quartier, son comté et sa position a déjà deux informations réelles ») : indexable quand l’existence n’est pas douteuse, que le nom n’est pas provisoire (« Bâtiment L924 », nom avec « ? ») et qu’il y a une capture ou au moins deux informations réelles (position, quartier ou comté, équivalent réel, vu en vidéo) : 1 672 pages ; les 828 autres existent en noindex,follow. La v7.95 avait pris le choix prudent du nom en jeu confirmé (588 pages) : corrigé en v7.96.'],
  ['Lieux de la carte', 'Visuel : la capture officielle du lieu déjà montrée sur la carte (photos/<id>,ig.webp, image extraite des supports Rockstar, repérée par gtadb.org, CC BY 4.0) est admise sur la page, créditée ; la photo du lieu réel reste sur la carte seulement. Sans capture : l’aperçu de la carte autour du lieu.'],
  ['Options de personnalisation', 'Une page par valeur d’option (145), en noindex,follow tant qu’elles n’ont qu’une ou deux informations, pour qu’aucun élément ne reste sans page (lot B).'],
  ['Types de munitions', 'Une page par type (6), en noindex,follow, qui renvoie vers armes.html#munitions et les armes qui l’utilisent (lot B).'],
  ['Marques de véhicules', 'LCC, BTN et HVY ont leur page comme les autres marques, construite depuis vehicules-data.js (leurs véhicules), sans rapprochement inventé (lot B).'],
  ['Grands moments', 'Une page par annonce datée de la frise des Actualités (17) ; les 14 moments des dossiers du monde renvoient vers l’annonce qui leur correspond (lot B).'],
  ['Régions, villes, quartiers et comtés', 'Les entrées sans lieu rattaché ont quand même leur page de regroupement (noindex,follow), qui renvoie vers la carte.'],
  ['Lieux de la carte', 'Les 27 noms entre guillemets droits dans les données gtadb (« "Mount Waffles" ») sont des surnoms donnés par la communauté, pas des noms en jeu : la page le dit, les affiche entre guillemets français et reste en noindex,follow.'],
  ['Visuels officiels', 'Lot B (v7.96) : une page par visuel ; indexable seulement quand une description de l’image a été rédigée (31 sur 196), les autres existent en noindex,follow avec leur titre de fichier, leur source, leur crédit et les pages du site qui les reprennent.'],
  ['Grands moments', 'Lot B (v7.96) : une page par annonce datée de la frise (17) ; les sept moments des dossiers du monde qui sont la même chose qu’une annonce (trailers, Extended Look, aperçus, entretien, radios, lancement) renvoient vers sa page, les sept autres (pages « Only in Leonida », captures, jaquette, Édition Ultimate, ses captures, Pack Vintage, 29 captures) ont la leur.'],
  ['Options de personnalisation', 'Lot B (v7.96) : chaque valeur a sa page en noindex,follow (repère de la série seulement) ; le sommaire de chaque famille (options-vehicules/index.html, options-armes/index.html) est indexable, et le poste liste ses valeurs.'],
  ['Types de munitions', 'Lot B (v7.96) : six pages en noindex,follow (usage, armes repérées) et un sommaire indexable relié depuis armes.html#munitions ; les fiches d’armes relient leur type.'],
  ['Marques de véhicules', 'Lot B (v7.96) : 51 pages (48 de marques.json, plus LCC, BTN et HVY portées par des véhicules), indexables quand un véhicule porte la marque ; les fiches de véhicules relient leur marque.']
];

/* ---------- bilan ---------- */
const bilan = f => { const n = f.items.length, page = f.items.filter(i => i.page).length, excl = f.items.filter(i => !i.page && i.exclusion).length, manque = n - page - excl, idx = f.items.filter(i => i.indexable).length; return { n, page, excl, manque, idx, noidx: n - idx }; };
const TOTAL = FAMILLES.reduce((t, f) => { const b = bilan(f); t.n += b.n; t.page += b.page; t.excl += b.excl; t.manque += b.manque; t.idx += b.idx; return t; }, { n: 0, page: 0, excl: 0, manque: 0, idx: 0 });

/* volume : pages à créer (français), puis dans toutes les langues ; poids d’après une fiche véhicule (gabarit actuel) et un gabarit allégé */
const aCreer = FAMILLES.filter(f => !f.modele).reduce((s, f) => s + f.items.filter(i => !i.page && !i.exclusion).length, 0);
const poidsFiche = (() => { const d = path.join(ROOT, 'vehicules'); const fs1 = fs.readdirSync(d).filter(x => x.endsWith('.html')).map(x => fs.statSync(path.join(d, x)).size).filter(s => s > 20000); return Math.round(fs1.reduce((a, b) => a + b, 0) / fs1.length); })();
const POIDS_LEGER = 21 * 1024; /* gabarit allégé : 21 Ko par page en moyenne, mesurés sur les 2 500 lieux du lot A (3,5 Ko compressés) */
const totalPages = (() => { let n = 0; const walk = d => { for (const x of fs.readdirSync(d, { withFileTypes: true })) { if (x.isDirectory()) { if (!['.git', 'node_modules', 'outils'].includes(x.name)) walk(path.join(d, x.name)); } else if (x.name.endsWith('.html')) n++; } }; walk(ROOT); return n; })();
const poidsDepot = (() => { let b = 0; const walk = d => { for (const x of fs.readdirSync(d, { withFileTypes: true })) { if (x.isDirectory()) { if (!['.git', 'node_modules'].includes(x.name)) walk(path.join(d, x.name)); } else b += fs.statSync(path.join(d, x.name)).size; } }; walk(ROOT); return b; })();
const poidsHistorique = (() => { try { const out = require('node:child_process').execSync('git count-objects -v', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString(); const m = out.match(/size-pack: (\d+)/); const l = out.match(/^size: (\d+)/m); return ((m ? +m[1] : 0) + (l ? +l[1] : 0)) * 1024; } catch (e) { return 0; } })();
const VOLUME = { poidsDepot, poidsHistorique, aCreer, langues: LANGUES.length, toutesLangues: aCreer * LANGUES.length, poidsFiche, poidsActuel: aCreer * LANGUES.length * poidsFiche, poidsLeger: aCreer * LANGUES.length * POIDS_LEGER, pagesActuelles: totalPages };

/* ---------- rapport ---------- */
const Mo = b => (b / 1048576).toFixed(0) + ' Mo';
const pct = (a, b) => b ? Math.round(100 * a / b) + ' %' : 'sans donnée';
const lignes = [];
lignes.push('# Couverture des pages : un élément, une page (v7.96)', '', 'Rapport écrit par `node outils/couverture-pages.cjs` le ' + new Date().toISOString().slice(0, 10) + '. Chaque famille liste tous ses éléments ; une famille est couverte quand chacun a sa page ou une exclusion justifiée. « Indexables » estime, d’après les données, les pages qui atteindraient le seuil d’indexation (nom, catégorie, description propre, deux informations réelles ou un visuel officiel) ; les autres seraient créées en `noindex, follow`.', '');
lignes.push('## Tableau des familles', '', '| Famille | Source | Éléments | Avec page | Exclus | Manquants | Couverture | Indexables (estimation) | Non indexables |', '|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const f of FAMILLES) { const b = bilan(f); lignes.push('| ' + f.label + (f.modele ? ' (modèle, données au jour J)' : f.nouvelle ? ' (nouvelle)' : '') + ' | `' + f.source + '` | ' + nb(b.n) + ' | ' + nb(b.page) + ' | ' + nb(b.excl) + ' | ' + nb(b.manque) + ' | ' + (b.n ? pct(b.page + b.excl, b.n) : '—') + ' | ' + nb(b.idx) + ' | ' + nb(b.noidx) + ' |'); }
lignes.push('| **Total** |  | **' + nb(TOTAL.n) + '** | **' + nb(TOTAL.page) + '** | **' + nb(TOTAL.excl) + '** | **' + nb(TOTAL.manque) + '** | **' + pct(TOTAL.page + TOTAL.excl, TOTAL.n) + '** | **' + nb(TOTAL.idx) + '** | **' + nb(TOTAL.n - TOTAL.idx) + '** |', '');
lignes.push('## Volume à créer', '', '- Pages à créer en français : **' + nb(VOLUME.aCreer) + '** (le site compte aujourd’hui ' + nb(VOLUME.pagesActuelles) + ' pages, toutes langues).', '- Dans les ' + VOLUME.langues + ' langues : **' + nb(VOLUME.toutesLangues) + ' pages**.', '- Avec le gabarit actuel des fiches (' + Math.round(poidsFiche / 1024) + ' Ko par page en moyenne) : **' + Mo(VOLUME.poidsActuel) + '**.', '- Avec un gabarit allégé (' + POIDS_LEGER / 1024 + ' Ko par page : CSS et JS partagés, aucun bloc répété) : **' + Mo(VOLUME.poidsLeger) + '**.', '');
lignes.push('## Limites d’hébergement (relevées le 17 octobre 2026)', '', '- Vercel (docs.vercel.com/docs/limits) : aucune limite au nombre de fichiers produits par un déploiement Git ; 15 000 fichiers et 100 Mo (Hobby) ou 1 Go (Pro) seulement pour un envoi par la ligne de commande ; 45 minutes de construction au plus ; 2 048 routes (redirections de vercel.json) par déploiement ; 100 déploiements par jour (Hobby). Le site est publié depuis GitHub sans construction : seul le temps de copie compte.', '- GitHub (docs.github.com, « About large files ») : dépôt idéalement sous 1 Go, 5 Go fortement recommandés au plus ; fichier bloqué au-dessus de 100 Mio, avertissement au-dessus de 50 Mio. Le dépôt pèse aujourd’hui ' + Mo(VOLUME.poidsDepot) + ' (fichiers suivis) et son historique compressé ' + Mo(VOLUME.poidsHistorique) + '.', '');
lignes.push('## Doublons (une seule page, l’autre source renvoie vers elle)', '');
for (const f of FAMILLES) for (const it of f.items) if (it.doublonDe) lignes.push('- ' + f.label + ' : « ' + it.nom + ' » a déjà sa page `' + it.page + '` (famille ' + it.doublonDe + ').');
lignes.push('', '## Exclusions (fuites)', '', 'Aucune source du site ne porte d’élément venu d’une fuite : la liste est vide. Si un élément exclu apparaît un jour, il sera listé ici avec sa raison.', '');
lignes.push('## Décisions (18 octobre 2026, Téva : « tranche toi-même mais n’oublie aucun élément du site »)', '');
for (const [fam, d] of DECISIONS) lignes.push('- **' + fam + '** : ' + d);
lignes.push('', '## À trancher par Téva', '', 'Les points ci-dessous sont ceux relevés par l’inventaire de la v7.94 ; Téva a répondu « tranche toi-même mais n’oublie aucun élément du site » (18 octobre 2026) : chacun est tranché dans la section « Décisions ».', '');
for (const f of FAMILLES) for (const q of f.aTrancher) lignes.push('- **' + f.label + '** : ' + q);
lignes.push('', '## Pages existantes hors inventaire', '');
for (const f of FAMILLES) if (f.pagesHors.length) lignes.push('- ' + f.label + ' : ' + f.pagesHors.length + ' page(s) (' + (f.pagesHorsNote || 'à vérifier') + ') : ' + f.pagesHors.join(', '));
const L = FAMILLES.find(f => f.id === 'lieux-carte');
lignes.push('', '## Annexe : repères gtadb absents de la carte du site (' + L.absents.length + ')', '', '| Identifiant | Nom | Quartier | Comté | Catégories | Statuts |', '|---|---|---|---|---|---|');
for (const r of L.absents) lignes.push('| ' + r.id + ' | ' + (r.nom || '*(sans nom)*') + ' | ' + (r.quartier || '') + ' | ' + (r.comte || '') + ' | ' + r.categories.join(', ') + ' | ' + r.statuts.join(', ') + ' |');
lignes.push('', '## Annexe : noms portés par plusieurs lieux (' + L.generiques.length + ')', '', L.generiques.sort((a, b) => b[1] - a[1]).map(([n, c]) => '« ' + n + ' » × ' + c).join(', '), '');
lignes.push('## Annexe : éléments par famille', '');
for (const f of FAMILLES) { if (!f.items.length) continue; lignes.push('### ' + f.label + ' (' + nb(f.items.length) + ')', ''); if (f.items.length > 400) { lignes.push('*Liste longue : voir `node outils/couverture-pages.cjs --json`. Aperçu :*', ''); } for (const it of f.items.slice(0, 400)) lignes.push('- ' + it.nom + ' : `' + (it.page || it.cible || 'sans page') + '`' + (it.indexable ? '' : ' (noindex)') + (it.note ? ' ; ' + it.note : '')); lignes.push(''); }
/* le rapport est lu par des humains : les tirets longs ci-dessus séparent les colonnes de la liste, pas du texte du site */
const rapport = lignes.join('\n').replace(/ — /g, ' : ');

module.exports = { FAMILLES, TOTAL, VOLUME, DECISIONS, INDEXER_TOUT, bilan, slug, uniq, nb, donnees: { V, A, GTADB, LANDMARKS, CARNET, POINTS_SITE, GTA_BY_ID, LM_BY_ID, CAT, MARQUES, MED, MONDE, ACTUS, ED, OPTIONS, ACQ } };
if (require.main === module) {
if (ARGS.has('--json')) { process.stdout.write(JSON.stringify({ familles: FAMILLES.map(f => ({ id: f.id, label: f.label, source: f.source, dossier: f.dossier, nouvelle: f.nouvelle, modele: f.modele, bilan: bilan(f), items: f.items })), total: TOTAL, volume: VOLUME }, null, 1) + '\n'); } else {
const SORTIE = process.env.COUVERTURE_SORTIE || path.join(ROOT, 'outils/COUVERTURE-PAGES.md'); /* les tests écrivent ailleurs */
fs.writeFileSync(SORTIE, rapport);
console.log('Couverture : ' + nb(TOTAL.n) + ' éléments, ' + nb(TOTAL.page) + ' avec page, ' + nb(TOTAL.excl) + ' exclus, ' + nb(TOTAL.manque) + ' manquants (' + pct(TOTAL.page + TOTAL.excl, TOTAL.n) + ') ; à créer : ' + nb(VOLUME.aCreer) + ' pages en français, ' + nb(VOLUME.toutesLangues) + ' dans les ' + VOLUME.langues + ' langues (' + Mo(VOLUME.poidsLeger) + ' en gabarit allégé, ' + Mo(VOLUME.poidsActuel) + ' avec le gabarit actuel). Rapport : ' + path.relative(ROOT, SORTIE));
for (const f of FAMILLES) { const b = bilan(f); console.log('  ' + f.label.padEnd(52) + String(b.n).padStart(6) + ' éléments ' + String(b.page).padStart(6) + ' pages ' + String(b.manque).padStart(6) + ' manquants ' + String(b.idx).padStart(6) + ' indexables'); }
if (TOTAL.manque && !ARGS.has('--rapport')) { console.error('ÉCHEC : ' + nb(TOTAL.manque) + ' élément(s) sans page ni exclusion.'); process.exit(1); }
}
}
