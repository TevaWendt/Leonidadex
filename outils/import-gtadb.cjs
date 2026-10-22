#!/usr/bin/env node
'use strict';
/* v7.99 (Téva, 18 octobre : « reprendre toutes les positions réelles, ce qui est sur la carte, parce qu’il en manque ; nommer les
   autres bâtiments ; compléter la carte ») : mise à jour de la carte depuis la base communautaire gtadb (GTA VI Landmarks Data,
   CC BY 4.0, gtadb.org et ses contributeurs, github.com/rolux/gtadb.org : map/data/6/landmarks.json).
   Ce script n’invente rien : il reprend ce que la base publie, avec les règles de l’import d’origine (relevées sur les données
   en place et vérifiées par --controle : mêmes noms, catégories, descriptions et positions pour les repères inchangés) :
   - repères nouveaux qui ont une position en jeu : ajoutés à outils/data/carte-gtadb-source.json (carte) et à
     outils/landmarks-leonidakit.json (repères) : position projetée sur la carte du site, catégorie, statut, rattachement (celui
     des lieux voisins du même quartier), équivalent réel, description, photos ; un repère sans position en jeu reste hors carte ;
   - repères déjà là : seules les informations que la base a ajoutées ou changées sont reprises (nom en jeu devenu connu ou
     corrigé, équivalent réel et position réelle, statut « position non confirmée », photo devenue disponible, position déplacée
     de plus de 3 pixels) ; un repère dont la base a retiré la position en jeu passe en « position non confirmée » ;
   - un nom inconnu reste inconnu (« Bâtiment L924 », ou le nom réel suivi de « (nom réel) ») : jamais de nom deviné.
   L’adresse d’une page de lieu ne change jamais, même si le nom change : outils/lieux-adresses.json (lu par couverture-pages.cjs).
   Usage : node outils/import-gtadb.cjs <landmarks.json> [--photos <dossier map/photos/6 de gtadb>] [--controle] [--ecrire]
   Sans --ecrire : bilan seulement. Les photos à prendre sont listées dans outils/data/gtadb-photos-a-convertir.txt ; la
   conversion en WebP (960 px au plus) se fait avec Pillow, voir outils/CHANGEMENTS-v7.99.txt. */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2), ECRIRE = args.includes('--ecrire'), CONTROLE = args.includes('--controle');
const SRC = args.find(a => !a.startsWith('--') && a.endsWith('.json'));
const PHOTOS = (() => { const i = args.indexOf('--photos'); return i >= 0 ? args[i + 1] : null; })();
if (!SRC) { console.error('Usage : node outils/import-gtadb.cjs <landmarks.json> [--photos <dossier>] [--controle] [--ecrire]'); process.exit(2); }
const U = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const CARTE_F = path.join(ROOT, 'outils/data/carte-gtadb-source.json'), REP_F = path.join(ROOT, 'outils/landmarks-leonidakit.json');
const carte = JSON.parse(fs.readFileSync(CARTE_F, 'utf8')), rep = JSON.parse(fs.readFileSync(REP_F, 'utf8'));
const NB = ' ';
const round1 = x => Math.round(x * 10) / 10, round2 = x => Math.round(x * 100) / 100;
const enc = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '’'); /* comme les données en place : « & » et les guillemets en entités, apostrophe typographique */
const aPosition = u => Array.isArray(u[1]) && typeof u[1][0] === 'number' && typeof u[1][1] === 'number';

/* ---------- règles de l’import d’origine ---------- */
const DISCRET = /^(l\d+|\/\/.*|@.*|#.*)$/;
const C_SITE = t => t.some(x => ['transportation', 'utilities'].includes(x)) ? 'transport' : t.some(x => ['natural', 'agriculture'].includes(x)) ? 'nature' : t.some(x => ['leisure', 'landmark', 'events'].includes(x)) ? 'lieu' : 'batiment';
const TYPE = { residential: 'résidentiel', industrial: 'industriel', transportation: 'transport', hotel: 'hôtel', retail: 'commerce', supermarket: 'commerce', natural: 'naturel', leisure: 'loisir', utilities: 'infrastructure', government: 'administration', public: 'bâtiment public', landmark: 'monument', restaurant: 'restaurant', fastfood: 'restaurant', office: 'bureaux', construction: 'chantier', agriculture: 'agricole', events: 'événementiel' };
const REM = [['fictional', 'existence incertaine'], ['demolished', 'démoli dans la réalité'], ['cancelled', 'annulé'], ['unconfirmed', 'position non confirmée'], ['reused', 'modèle réutilisé ailleurs'], ['closed', 'fermé']];
const CAT_R = { residential: 'residentiel', retail: 'commerce', supermarket: 'commerce', transportation: 'transport', industrial: 'industriel', natural: 'naturel', hotel: 'hotel', leisure: 'loisir', events: 'evenementiel', utilities: 'infrastructure', government: 'administration', landmark: 'monument', public: 'public', restaurant: 'restaurant', fastfood: 'restaurant', construction: 'chantier', office: 'bureau', agriculture: 'agriculture', service: 'service', 'point-of-interest': 'point-interet' };
const STAT_R = { unconfirmed: 'non_confirme', demolished: 'demoli', reused: 'reutilise', 'reused?': 'reutilise', closed: 'ferme', cancelled: 'annule', fictional: 'fictif' };
const typesDe = tags => [...new Set(tags.map(t => TYPE[t]).filter(Boolean))];
const remarquesDe = tags => REM.filter(([t]) => tags.includes(t)).map(([, r]) => r);
function parseLabel(label) {
  const parts = String(label).split(', ');
  const nom0 = parts[0], reste = parts.slice(1);
  /* « ? », « ? (N) », « ? Flare » : nom en jeu inconnu ; « Dam? », « Bruiser? Skate Shop », « Platinum(?) Plaza » : nom supposé */
  const jeu0 = nom0 === '?' || /^\?/.test(nom0) || /\.\.\.|…/.test(nom0) /* enseigne lue en partie (« Cash... ») */ ? null : nom0.replace(/\(\?\)|\?/g, '').replace(/\s+/g, ' ').trim();
  const jeu = jeu0 && jeu0.replace(/[^\p{L}\p{N}]/gu, '').length >= 2 ? jeu0 : null;
  return { nom: nom0 === '?' ? null : nom0, jeu, suppose: !!jeu && /\?/.test(nom0), brut: nom0, quartier: reste.length >= 2 ? reste[0] : null, comte: reste.length ? reste[reste.length - 1] : null, cle: reste.join(', ') };
}
/* nom affiché sur la carte : nom en jeu ; « Nom (nom supposé) » pour un nom suivi de « ? » ; sinon le nom réel suivi de
   « (nom réel) » ; sinon « Bâtiment L… » */
function nomCarte(id, lab, reel) {
  if (lab.jeu) return enc(lab.jeu) + (lab.suppose ? ' (nom supposé)' : '');
  const r = reel && !/^\?/.test(reel) ? reel.split(', ')[0] : null;
  return r ? enc(r) + ' (nom réel)' : 'Bâtiment ' + id;
}
function description(lab, reel, tags, incert) {
  const ty = typesDe(tags), rem = remarquesDe(tags);
  return [lab.jeu ? 'Bâtiment repéré dans les trailers et captures officielles.' : 'Nom en jeu inconnu à ce jour.',
    reel ? 'Équivalent réel' + (incert ? ' (incertain)' : '') + NB + ': ' + enc(reel) + '.' : 'Équivalent réel non identifié.',
    ty.length ? 'Type' + NB + ': ' + ty.join(', ') + '.' : '',
    rem.length ? 'Remarque' + NB + ': ' + rem.join(', ') + '.' : ''].filter(Boolean).join(' ');
}
/* adresse réelle telle que la base l’écrit, coquille de ponctuation corrigée (« FL 33139. USA ») : la phrase de la page la
   couperait en deux */
/* v8.04 (géolocalisation) : dans gtadb, « ? » seul veut dire « inconnu » : ce n’est pas une adresse (26 lieux affichaient « ? »
   comme lieu réel) ; un « ? » en fin d’adresse ou « ?, » au début marque un rapprochement incertain : l’adresse est gardée sans
   le point d’interrogation, dite « incertaine » (description, statut equivalent_incertain du repère). Le nom affiché sur la carte
   suit toujours l’ancienne règle (nomReel), pour qu’aucune page ne change d’adresse. */
const nomReel = r => r ? String(r).replace(/\.\s+USA$/, ', USA') : null;
const incertaine = r => { const s = String(r || '').trim(); return s !== '?' && (/^\?\s*,/.test(s) || /\?$/.test(s)); };
const adresse = r => { let s = String(r || '').trim(); if (!s || s === '?') return null; s = s.replace(/^\?\s*,\s*/, '').replace(/\s*\?$/, '').trim(); return s ? s.replace(/\.\s+USA$/, ', USA') : null; };
const repere = (k, lab, g, reel, ll, tags, incert) => ({ id: k, nom: lab.nom, quartier: lab.quartier, comte: lab.comte, x: round2(g[0]), y: round2(g[1]), reel, lat: ll && ll.length ? ll[0] : null, lng: ll && ll.length ? ll[1] : null, categories: [...new Set(tags.map(t => CAT_R[t]).filter(Boolean))], statuts: [...new Set([...tags.map(t => STAT_R[t]).filter(Boolean), ...(incert && reel ? ['equivalent_incertain'] : [])])], identifie: !!reel, nomme: !!lab.nom, px: round1(16500 + g[0]), py: round1(12000 - g[1]) });

/* repères qui sont déjà des points du site (carte.js, avec leur description et leur capture officielle) : pas de doublon */
const POINT_DU_SITE = { L186: 'galina-opera', L187: 'sahara-arena', L1006: 'tisha-wocka', L1113: 'autograph-flight', L1491: 'ptt-youngin' };

/* ---------- projection vers la carte du site : moindres carrés entre les coordonnées gtadb gardées dans les repères (x, y de
   l’import d’origine) et la position des mêmes lieux sur la carte (écart maximal : 1 pixel, l’arrondi) ---------- */
const lieux = carte.lieux, parId = new Map(lieux.map(p => [p.id.replace(/^g-/, ''), p]));
const repParId0 = new Map(rep.reperes.map(r => [r.id, r]));
const calage = [...parId.entries()].filter(([k]) => repParId0.has(k) && typeof repParId0.get(k).x === 'number').map(([k, p]) => [[repParId0.get(k).x, repParId0.get(k).y], p]);
const communs = [...parId.entries()].filter(([k]) => U[k] && aPosition(U[k]));
function ajuste(us, vs) { const n = us.length, mu = us.reduce((a, b) => a + b, 0) / n, mv = vs.reduce((a, b) => a + b, 0) / n; let num = 0, den = 0; for (let i = 0; i < n; i++) { num += (us[i] - mu) * (vs[i] - mv); den += (us[i] - mu) ** 2; } const a = num / den; return [a, mv - a * mu]; }
const [ax, bx] = ajuste(calage.map(([g]) => g[0]), calage.map(([, p]) => p.x));
const [ay, by] = ajuste(calage.map(([g]) => g[1]), calage.map(([, p]) => p.y));
const proj = ([gx, gy]) => [Math.round(ax * gx + bx), Math.round(ay * gy + by)];
const ecarts = calage.map(([g, p]) => { const [x, y] = proj(g); return Math.hypot(x - p.x, y - p.y); });
const statut = tags => tags.includes('unconfirmed') || tags.includes('fictional') ? 'spec' : 'vu';

/* ---------- rattachement : celui des 5 lieux en place les plus proches qui portent le même libellé de quartier ou de comté ---------- */
const places = communs.filter(([, p]) => p.p).map(([k, p]) => ({ cle: parseLabel(U[k][0]).cle, x: p.x, y: p.y, p: p.p }));
function groupeDe(lab, x, y) {
  let c = places.filter(q => q.cle === lab.cle); if (!c.length) c = places;
  const v = c.map(q => [Math.hypot(q.x - x, q.y - y), q.p]).sort((a, b) => a[0] - b[0]).slice(0, 5), n = new Map();
  for (const [, p] of v) n.set(p, (n.get(p) || 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || v.findIndex(e => e[1] === a[0]) - v.findIndex(e => e[1] === b[0]))[0][0];
}

/* ---------- photos : une photo existe si le WebP est dans photos/ ; sinon référence .jpg (absente, comme l’import d’origine) ---------- */
const photoLocale = (id, kind) => fs.existsSync(path.join(ROOT, 'photos', id + ',' + kind + '.webp'));
const photoGtadb = (id, kind) => !!PHOTOS && fs.existsSync(path.join(PHOTOS, id + ',' + kind + '.jpg'));
const aConvertir = [];
/* taille d’un JPEG (marqueur SOF) : quelques photos de gtadb n’ont pas leurs dimensions dans landmarks.json */
function tailleJpeg(f) {
  try { const b = fs.readFileSync(f); let i = 2; while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1]; if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); } } catch (e) { /* illisible : pas de photo */ }
  return null;
}
function photo(p, id, kind, dims0) {
  const k = kind === 'ig' ? 'img' : 'img2';
  const dims = dims0 && dims0.length === 2 ? dims0 : photoGtadb(id, kind) ? tailleJpeg(path.join(PHOTOS, id + ',' + kind + '.jpg')) : dims0;
  const local = photoLocale(id, kind), dispo = local || (!!dims && dims.length === 2 && photoGtadb(id, kind));
  if (!local && dispo) aConvertir.push(id + ',' + kind);
  p[k] = 'photos/' + id + ',' + kind + (dispo ? '.webp' : '.jpg'); p[k + 'Src'] = kind === 'ig' ? 'Capture officielle' : 'Lieu réel';
  if (dispo && dims && dims.length === 2) { const s = Math.min(1, 960 / Math.max(dims[0], dims[1])); p[k + 'W'] = Math.round(dims[0] * s); p[k + 'H'] = Math.round(dims[1] * s); }
  return dispo && !local;
}

/* ---------- contrôle : les règles reproduisent-elles les repères inchangés ? ---------- */
if (CONTROLE) {
  const diff = { nom: 0, c: 0, d: 0, s: 0, xy: 0, rep: 0 }, ex = {};
  for (const [k, p] of communs) {
    const u = U[k], tags = u[6].filter(t => !DISCRET.test(t)), lab = parseLabel(u[0]), reel = adresse(u[3]), rn = nomReel(u[3]), incert = incertaine(u[3]), r0 = repParId0.get(k);
    const R = repere(k, lab, u[1], reel, u[4], tags, incert);
    const same = r0 && ['nom', 'quartier', 'comte', 'reel'].every(f => r0[f] === R[f]) && JSON.stringify(r0.statuts) === JSON.stringify(R.statuts);
    if (!same) { diff.rep++; continue; } /* la base a changé ce repère : hors contrôle */
    const t = { nom: nomCarte(k, lab, rn) === p.n || /…/.test(p.n), c: C_SITE(tags) === p.c || p.c === 'planque', d: description(lab, reel, tags, incert) === p.d, s: statut(tags) === p.s, xy: Math.hypot(u[1][0] - r0.x, u[1][1] - r0.y) > 0.01 || Math.hypot(...proj(u[1]).map((v, i) => v - [p.x, p.y][i])) <= 1 };
    for (const f of Object.keys(t)) if (!t[f]) { diff[f]++; (ex[f] = ex[f] || []).length < 3 && ex[f].push(k + ' : ' + JSON.stringify(f === 'nom' ? [p.n, nomCarte(k, lab, rn)] : f === 'd' ? [p.d, description(lab, reel, tags, incert)] : f === 'c' ? [p.c, C_SITE(tags), tags] : f === 's' ? [p.s, tags] : [p.x, p.y, proj(u[1])])); }
  }
  console.log('Contrôle des règles sur ' + communs.length + ' repères communs (' + diff.rep + ' changés par la base, hors contrôle) : écarts nom ' + diff.nom + ', catégorie ' + diff.c + ', description ' + diff.d + ', statut ' + diff.s + ', position ' + diff.xy);
  for (const [f, l] of Object.entries(ex)) console.log('  ' + f + ' : ' + l.join(' | '));
}

const bilan = { pointsSite: 0, nouveaux: 0, horsCarte: 0, nommes: 0, renommes: 0, reels: 0, statuts: 0, photos: 0, positions: 0, retires: 0 };
const repParId = new Map(rep.reperes.map(r => [r.id, r]));
const majRepere = R => { if (repParId.has(R.id)) Object.assign(repParId.get(R.id), R); else { rep.reperes.push(R); repParId.set(R.id, R); } };
for (const [k, u] of Object.entries(U)) {
  const [label, g, dimIg, reel0, ll, dimRl, tags0] = u, tags = tags0.filter(t => !DISCRET.test(t)), lab = parseLabel(label), reel = adresse(reel0), rn = nomReel(reel0), incert = incertaine(reel0);
  const p = parId.get(k);
  if (POINT_DU_SITE[k] && !p) { bilan.pointsSite++; continue; }
  if (!aPosition(u)) {
    /* pas de position en jeu dans la base : hors carte ; un lieu déjà placé passe en « position non confirmée » */
    if (!p) { bilan.horsCarte++; continue; }
    if (p.s !== 'spec') { p.s = 'spec'; p.d = description(lab, reel, [...new Set([...tags, 'unconfirmed'])], incert); bilan.retires++; }
    if (!photoLocale(k, 'ig') && photo(p, k, 'ig', dimIg)) bilan.photos++;
    if (!photoLocale(k, 'rl') && photo(p, k, 'rl', dimRl)) bilan.photos++;
    continue;
  }
  const R = repere(k, lab, g, reel, ll, tags, incert);
  if (!p) {
    const [x, y] = proj(g), np = { id: 'g-' + k, n: nomCarte(k, lab, rn), c: C_SITE(tags), x, y, s: statut(tags), src: 'GTADB', z: 2, d: description(lab, reel, tags, incert) };
    photo(np, k, 'ig', dimIg); photo(np, k, 'rl', dimRl);
    np.p = groupeDe(lab, x, y);
    if (R.lat !== null) np.sv = R.lat + ',' + R.lng;
    if (reel) np.r = enc(reel.split(', ')[0]);
    lieux.push(np); parId.set(k, np); bilan.nouveaux++; majRepere(R);
    continue;
  }
  /* repère déjà sur la carte : seulement ce que la base a ajouté ou changé */
  const r0 = repParId.get(k) || {};
  let change = false;
  const generique = /^Bâtiment L\d+$|\((?:nom réel|nom supposé)\)$/.test(p.n);
  const norm = s => String(s || '').replace(/&quot;|["“”]/g, '');
  /* nom : un nom en jeu sûr remplace un nom provisoire ou un nom changé par la base ; un nom supposé ne remplace qu’un bâtiment
     numéroté ou un nom réel */
  const nouveau = nomCarte(k, lab, rn), provisoire = /^Bâtiment L\d+$|\(nom réel\)$/.test(p.n);
  if (lab.jeu && nouveau !== p.n && norm(r0.nom) !== norm(lab.nom) && (!lab.suppose || provisoire)) { if (generique) bilan.nommes++; else bilan.renommes++; p.n = nouveau; change = true; }
  if (reel && reel !== r0.reel) { p.r = enc(reel.split(', ')[0]); if (!lab.jeu && /^Bâtiment L\d+$|\(nom réel\)$/.test(p.n)) p.n = nomCarte(k, lab, rn); change = true; bilan.reels++; }
  if (!reel && p.r === '?') { delete p.r; change = true; } /* v8.04 : un « ? » d’un ancien import n’est pas un lieu réel */
  if (R.lat !== null && p.sv !== R.lat + ',' + R.lng) { p.sv = R.lat + ',' + R.lng; change = true; }
  const s = statut(tags); if (s !== p.s) { p.s = s; change = true; bilan.statuts++; }
  if (JSON.stringify(R.statuts) !== JSON.stringify(r0.statuts || []) || JSON.stringify(R.categories) !== JSON.stringify(r0.categories || [])) change = true;
  if (!photoLocale(k, 'ig') && photo(p, k, 'ig', dimIg)) { change = true; bilan.photos++; }
  if (!photoLocale(k, 'rl') && photo(p, k, 'rl', dimRl)) { change = true; bilan.photos++; }
  /* position : la base l’a déplacée de plus de 3 pixels de la carte du site depuis l’import */
  if (typeof r0.x === 'number' && Math.hypot((g[0] - r0.x) * ax, (g[1] - r0.y) * ay) > 3) { [p.x, p.y] = proj(g); change = true; bilan.positions++; }
  if (typeof r0.x === 'number' && (g[0] !== r0.x || g[1] !== r0.y)) change = true;
  if (change) { if (['batiment', 'transport', 'nature', 'lieu'].includes(p.c)) p.c = C_SITE(tags); p.d = description(lab, reel, tags, incert); majRepere(R); }
}
/* « Regroupe N lieux repérés. » dans la description d’un groupe (fenêtre de la carte) : le compte des lieux rattachés (v8.04 :
   « lieux » et non plus « bâtiments » : le compte inclut transports, nature et lieux notables) */
let groupesRecomptes = 0;
for (const g of carte.groupes) {
  const n = lieux.filter(p => p.p === g.id).length, m = /Regroupe (\d+) (?:bâtiments?|lieux|lieu) repérés?\./.exec(g.d || '');
  if (m && (+m[1] !== n || !/ lieux? repérés?\./.test(m[0])) && n > 0) { g.d = g.d.replace(m[0], 'Regroupe ' + n + (n > 1 ? ' lieux repérés.' : ' lieu repéré.')); groupesRecomptes++; }
}
console.log('Projection : x = ' + ax.toFixed(6) + ' gx + ' + bx.toFixed(3) + ', y = ' + ay.toFixed(6) + ' gy + ' + by.toFixed(3) + ' (écart médian ' + ecarts.sort((a, b) => a - b)[ecarts.length >> 1].toFixed(2) + ' px sur ' + calage.length + ' lieux calés)');
console.log('Base gtadb : ' + Object.keys(U).length + ' repères ; carte du site : ' + lieux.length + ' lieux (' + bilan.nouveaux + ' nouveaux, ' + bilan.horsCarte + ' repères sans position en jeu laissés hors carte, ' + bilan.pointsSite + ' déjà points du site), ' + bilan.nommes + ' nom(s) en jeu devenu(s) connu(s), ' + bilan.renommes + ' renommé(s), ' + bilan.reels + ' équivalent(s) réel(s) ajouté(s) ou corrigé(s), ' + bilan.statuts + ' statut(s) changé(s), ' + bilan.retires + ' position(s) retirée(s) par la base (position non confirmée), ' + bilan.photos + ' photo(s) ajoutée(s) à des lieux en place, ' + bilan.positions + ' position(s) corrigée(s) ; ' + aConvertir.length + ' photo(s) à convertir ; ' + groupesRecomptes + ' groupe(s) recompté(s).');
if (ECRIRE) {
  fs.writeFileSync(CARTE_F, JSON.stringify(carte));
  fs.writeFileSync(REP_F, JSON.stringify(rep, null, 1));
  fs.writeFileSync(path.join(ROOT, 'outils/data/gtadb-photos-a-convertir.txt'), aConvertir.join('\n') + (aConvertir.length ? '\n' : ''));
  console.log('Écrit : outils/data/carte-gtadb-source.json, outils/landmarks-leonidakit.json, outils/data/gtadb-photos-a-convertir.txt');
}
