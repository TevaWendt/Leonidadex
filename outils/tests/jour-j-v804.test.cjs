'use strict';
/* v8.04 (jour J, prompt 2) : les formats qui manquaient pour remplir le calculateur le jour J sans toucher au code.
   1. Statuts d’une valeur chiffrée : « media » (alias presse : chiffre donné par des médias reconnus, au moins deux sources
      concordantes) et « community » (alias comm : chiffre de la communauté), lus de la même façon par calculateurs-data.js,
      calculateurs-modele.js et outils/donnees-publiees.cjs, comptés dans le calcul comme des chiffres non confirmés, jamais
      officiels ; official, verified, media et community exigent une source et une date.
   2. Fourchette (min, max), note et liste de sources : acceptées seulement bien formées, transmises (ponts des missions et des
      activités, listes prix_gta6) et affichées (fiches, listes, Léo) ; le calcul garde value.
   3. Prix d’une munition : outils/acquisitions.json, catégorie « munitions » (type ammo du calculateur), fiche munitions/<id>.html.
   4. Sans ces données, rien ne change : lecture du catalogue, des activités et des règles, empreinte des données, résultats v8.01.
   5. Phrases comptées (prix publiés, activités chiffrées, colonnes des listes) : accord au singulier, jamais « 0 prix », traduites
      dans les cinq langues (outils/langues/<code>/v804-jour-j.json), comme les textes nouveaux des scripts.
   Toutes les valeurs sont FICTIVES (adresses example.test) : elles vérifient les formats, pas une donnée de GTA VI. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '../..');
const DP = require(path.join(root, 'outils/donnees-publiees.cjs')), M = require(path.join(root, 'calculateurs-modele.js'));
const flat = s => String(s === undefined || s === null ? '' : s).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const text = html => flat(String(html).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '’').replace(/&quot;/g, '"')).replace(/ ([,.])/g, '$1');
const A = 'https://example.test/media-a', B = 'https://example.test/media-b', W = 'https://example.test/wiki', R = 'https://example.test/rockstar', DATE = '2026-11-20';
const v = (value, status, unit, more = {}) => ({ value, status, source: more.source === undefined ? null : more.source, verifiedAt: more.source ? DATE : null, unit, ...more });
/* l’adaptateur tourne dans un contexte à part, comme dans la page */
function adapter(extra = {}) {
  const ctx = { window: { ...extra } }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'calculateurs-data.js'), 'utf8'), ctx);
  const D = ctx.window.LKCalcData, plain = x => JSON.parse(JSON.stringify(x));
  return { catalogue: () => plain(D.catalogue()), activities: () => plain(D.activities()), rules: () => plain(D.rules()) };
}
const vehicule = price => adapter({ LK_VEHICULES: [{ id: 'x-1', nom: 'X', cat: 'berline', price }] }).catalogue().find(x => x.id === 'x-1');

/* ---------- 1. statuts ---------- */
test('statuts : « media » (presse) et « community » (comm) donnent le même statut dans les trois lecteurs, comptés mais jamais officiels', () => {
  const SAMPLES = [
    [v(400000, 'media', '$', { source: A, sources: [B] }), 'media', 'Vu dans un média'],
    [v(400000, 'presse', '$', { source: A, sources: [B] }), 'media', 'Vu dans un média'],
    [v(8000, 'community', '$', { source: W }), 'community', 'Communautaire'],
    [v(8000, 'comm', '$', { source: W }), 'community', 'Communautaire']
  ];
  for (const [raw, st, label] of SAMPLES) {
    const row = vehicule(raw), mv = M.V.published(raw), dp = DP.prixDe({ price: raw });
    assert.equal(row.price, raw.value); assert.equal(row.fieldMeta.price.status, st, 'calculateurs-data ' + raw.status);
    assert.equal(mv.s, st, 'calculateurs-modele ' + raw.status); assert.equal(dp.status, st, 'donnees-publiees ' + raw.status);
    assert.equal(M.V.usable(mv), true, 'compté dans le calcul'); assert.notEqual(mv.s, 'official');
    assert.equal(M.V.statusLabel(mv), label === 'Communautaire' ? 'Communautaire' : 'Vu dans un média');
    assert.equal(dp.label, label);
  }
  /* « vu » et « observed » gardent leur sens (repéré dans une vidéo ou une capture officielle) : rien ne change pour eux */
  assert.equal(vehicule(v(5, 'vu', '$')).fieldMeta.price.status, 'observed');
  assert.equal(M.V.published(v(5, 'vu', '$')).s, 'estimated');
  /* le modèle connaît les deux statuts, avec leur explication */
  const S = Object.fromEntries((JSON.parse(fs.readFileSync(path.join(root, 'outils/modele-donnees.json'), 'utf8')).statuts).map(s => [s.id, s]));
  assert.equal(S.media.calcul, true); assert.equal(S.community.calcul, true); assert.equal(S.media.label, 'Vu dans un média'); assert.equal(S.community.label, 'Chiffre de la communauté');
});

test('statuts : source et date exigées pour official, verified, media et community ; « media » demande deux sources, sinon estimated', () => {
  const err = raw => DP.verifierPrix(DP.prixDe({ price: raw }), 'x').join(' | ');
  assert.equal(err(v(45, 'media', '$', { source: A, sources: [B] })), '');
  assert.match(err(v(45, 'media', '$', { source: A })), /deux sources concordantes.*« estimated »/);
  assert.match(err(v(45, 'media', '$', { source: A, sources: [A] })), /deux sources/, 'deux fois la même adresse ne fait pas deux sources');
  assert.match(err({ value: 45, status: 'community', unit: '$' }), /exige une source/);
  assert.match(err({ value: 45, status: 'presse', source: A, sources: [B], unit: '$' }), /exige une date/);
  assert.equal(err({ value: 45, status: 'estimated', unit: '$' }), '', 'une estimation sans source reste possible');
  const GM = require(path.join(root, 'outils/gen-missions.cjs')), GA = require(path.join(root, 'outils/gen-activites.cjs'));
  for (const G of [GM, GA]) {
    assert.deepEqual(G.checkValue(v(400000, 'media', '$', { source: A, sources: [B] }), 'm', '$'), []);
    assert.deepEqual(G.checkValue(v(10, 'comm', 'min', { source: W }), 'm', 'min'), []);
    assert.match(G.checkValue(v(400000, 'presse', '$', { source: A }), 'm', '$').join(), /deux sources/);
    assert.match(G.checkValue({ value: 10, status: 'community', unit: 'min' }, 'm', 'min').join(), /exige source et verifiedAt/);
    assert.match(G.checkValue({ value: 10, status: 'observed', unit: 'min' }, 'm', 'min').join(), /status attendu parmi/);
  }
  /* règles d’argent : mêmes statuts, mêmes exigences */
  const regles = r => DP.verifierRegles(r).join(' | ');
  assert.equal(regles({ amende: v(500, 'community', '$', { source: W }), perteMort: v(10, 'media', '%', { source: A, sources: [B] }) }), '');
  assert.match(regles({ amende: v(500, 'media', '$', { source: A }) }), /deux sources/);
});

/* ---------- 2. fourchette, note, sources ---------- */
test('fourchette, note et sources : gardées seulement bien formées, jamais à la place de la valeur', () => {
  const good = v(45000, 'media', '$', { source: A, sources: [B], min: 40000, max: 50000, note: 'selon la boutique' });
  const row = vehicule(good), mv = M.V.published(good), dp = DP.prixDe({ price: good });
  assert.equal(row.price, 45000, 'le calcul garde value');
  assert.deepEqual([row.fieldMeta.price.min, row.fieldMeta.price.max, row.fieldMeta.price.note, row.fieldMeta.price.sources], [40000, 50000, 'selon la boutique', [B]]);
  assert.deepEqual([mv.v, mv.min, mv.max, mv.note, mv.sources], [45000, 40000, 50000, 'selon la boutique', [B]]);
  assert.deepEqual([dp.value, dp.min, dp.max, dp.note, dp.sources], [45000, 40000, 50000, 'selon la boutique', [B]]);
  /* mal formées : ni dans les lecteurs, et le contrôle les refuse */
  for (const bad of [{ min: 50000, max: 40000 }, { min: 46000, max: 50000 }, { min: 40000 }, { min: -1, max: 50000 }]) {
    const raw = { ...good, min: undefined, max: undefined, ...bad }, r = vehicule(raw), m = M.V.published(raw), d = DP.prixDe({ price: raw });
    assert.ok(!('min' in r.fieldMeta.price) && !('max' in r.fieldMeta.price), 'data ' + JSON.stringify(bad));
    assert.ok(!('min' in m) && !('max' in m), 'modèle ' + JSON.stringify(bad)); assert.ok(!('min' in d) && !('max' in d), 'donnees-publiees ' + JSON.stringify(bad));
    assert.match(DP.verifierExtras(raw, 'x', raw.value).join(), /fourchette|min et max/, JSON.stringify(bad));
  }
  assert.match(DP.verifierExtras({ ...good, note: 'x'.repeat(301) }, 'x', 45000).join(), /300 signes/);
  assert.match(DP.verifierExtras({ ...good, sources: [] }, 'x', 45000).join(), /1 à 10 références/);
  /* activités et règles : la même lecture */
  const D = adapter({ LK_ACTIVITIES: [{ id: 'a', name: 'A', reward: v(3000, 'estimated', '$', { min: 1500, max: 5000, note: 'selon le commerce' }), duration: v(5, 'estimated', 'min') }],
    LK_CALC_REGLES: { amende: v(500, 'verified', '$', { source: 'relevé', min: 250, max: 1000 }), perteMort: v(10, 'presse', '%', { source: A, sources: [B] }) } });
  const a = D.activities()[0];
  assert.equal(a.reward, 3000); assert.deepEqual([a.fieldMeta.reward.min, a.fieldMeta.reward.max, a.fieldMeta.reward.note], [1500, 5000, 'selon le commerce']);
  const E = require(path.join(root, 'calculateurs-engine.js')), res = E.activity({ ...a, cost: 0, prep: 0, cooldown: 0, share: 100, investment: 0, players: 1 });
  assert.equal(res.valid, true); assert.equal(res.net, 3000, 'le moteur compte la valeur, pas la fourchette');
  const rules = D.rules();
  assert.deepEqual([rules.fine.value, rules.fine.meta.min, rules.fine.meta.max], [500, 250, 1000]);
  assert.deepEqual([rules.death.value, rules.death.meta.status, rules.death.meta.sources], [10, 'media', [B]]);
});

test('phrases : sans fourchette ni sources, la phrase d’un prix est celle d’avant ; avec, elles s’ajoutent', () => {
  assert.equal(flat(DP.phrasePrix(DP.prixDe({ price: v(35000, 'official', '$', { source: R }) }))), 'Prix publié : 35 000 $, Officiel, source : ' + R + ', vérifié le 20 novembre 2026');
  assert.equal(flat(DP.phrasePrix(DP.prixDe({ price: v(45000, 'media', '$', { source: A, sources: [B], min: 40000, max: 50000, note: 'selon la boutique' }) }))),
    'Prix publié : 45 000 $ (de 40 000 à 50 000 $), Vu dans un média, sources : ' + A + ' ; ' + B + ', vérifié le 20 novembre 2026. Note : selon la boutique');
  assert.equal(flat(DP.fourchette({ min: 35, max: 60 }, 'min')), '(de 35 à 60 min)');
});

/* ---------- 3. ponts et fiches ---------- */
test('ponts : gen-missions et gen-activites transmettent statut, fourchette, note et sources ; la mission prend le statut le plus faible', () => {
  const GM = require(path.join(root, 'outils/gen-missions.cjs')), GA = require(path.join(root, 'outils/gen-activites.cjs'));
  const m = { id: 'gros-coup', nom: 'Gros coup', type: 'histoire', ordre: 2, recompenses: { argent: v(400000, 'media', '$', { source: A, sources: [B], min: 350000, max: 450000, note: 'selon les objectifs' }) },
    duree: v(45, 'estimated', 'min', { min: 35, max: 60 }), deblocage: { argentMinimum: v(150000, 'presse', '$', { source: A, sources: [B] }), rang: v(3, 'comm', 'rang', { source: W }) } };
  const [x] = GM.activitesDe([m]);
  assert.deepEqual([x.reward.value, x.reward.status, x.reward.min, x.reward.max, x.reward.note, x.reward.sources], [400000, 'media', 350000, 450000, 'selon les objectifs', [B]]);
  assert.deepEqual([x.duration.min, x.duration.max, x.minCash.status, x.minCash.sources, x.minRank.status], [35, 60, 'media', [B], 'community']);
  assert.equal(x.status, 'estimated', 'gain « media » et durée « estimated » : la mission est « estimated »');
  const [y] = GM.activitesDe([{ ...m, recompenses: { argent: v(8000, 'comm', '$', { source: W }) }, duree: v(10, 'official', 'min', { source: R }), deblocage: {} }]);
  assert.equal(y.status, 'community');
  const [z] = GA.activitesCalculateur([{ id: 'braquage', nom: 'Braquage', rapporte: { gain: v(3000, 'estimated', '$', { min: 1500, max: 5000 }), duree: v(5, 'estimated', 'min'), attente: v(10, 'presse', 'min', { source: A, sources: [B] }) } }]);
  assert.deepEqual([z.reward.min, z.reward.max, z.cooldown.status, z.cooldown.sources, z.status], [1500, 5000, 'media', [B], 'estimated']);
  /* sans ces champs, la sortie du pont est celle d’avant (aucune clé de plus) */
  const [plain] = GM.activitesDe([{ id: 'p', nom: 'P', type: 'histoire', recompenses: { argent: v(1000, 'official', '$', { source: R }) }, duree: v(5, 'official', 'min', { source: R }) }]);
  assert.deepEqual(Object.keys(plain.reward), ['value', 'status', 'source', 'verifiedAt', 'unit']);
});

test('fiches : la mission et l’activité affichent statut, fourchette, note et sources de chaque chiffre publié', () => {
  const GM = require(path.join(root, 'outils/gen-missions.cjs')), GA = require(path.join(root, 'outils/gen-activites.cjs'));
  const ctx = GM.context(root);
  const m = { id: 'gros-coup-test', nom: 'Gros coup (test)', type: 'histoire', resume: 'Mission fictive du test.', statut: 'conf', personnages: [], lieux: [], media: [], sources: [],
    recompenses: { argent: v(400000, 'media', '$', { source: A, sources: [B], min: 350000, max: 450000, note: 'selon les objectifs' }) }, duree: v(45, 'estimated', 'min', { min: 35, max: 60 }),
    deblocage: { texte: 'Fictif.', argentMinimum: v(150000, 'media', '$', { source: A, sources: [B] }), rang: v(3, 'community', 'rang', { source: W }) } };
  const t = text(GM.fichePage(ctx, m));
  assert.ok(t.includes('Récompense 400 000 $ (de 350 000 à 450 000 $), Vu dans un média (selon les objectifs) ' + A + ' ; ' + B), t.slice(t.indexOf('Récompense'), t.indexOf('Récompense') + 240));
  assert.ok(t.includes('Durée 45 min (de 35 à 60 min), Estimation'));
  assert.ok(t.includes('Argent à avoir 150 000 $, Vu dans un média, en poche, sans le dépenser ' + A + ' ; ' + B));
  assert.ok(t.includes('Rang demandé 3, Communautaire ' + W));
  const actx = GA.context(root), a0 = actx.A.activites[0];
  const a = { ...a0, rapporte: { ...a0.rapporte, gain: v(3000, 'estimated', '$', { min: 1500, max: 5000, note: 'selon le commerce' }), duree: v(5, 'estimated', 'min'), attente: v(10, 'media', 'min', { source: A, sources: [B] }) } };
  const ta = text(GA.fichePage(actx, a));
  assert.ok(ta.includes('3 000 $ (de 1 500 à 5 000 $), Estimation (selon le commerce)'));
  assert.ok(ta.includes('Attente avant de recommencer 10 min, Vu dans un média'));
  assert.ok(ta.includes('Sources des chiffres ' + A + ' ; ' + B));
  /* sans chiffre publié : pas de ligne « Sources des chiffres » */
  const nu = { ...a0, rapporte: { texte: a0.rapporte.texte, statut: a0.rapporte.statut, sources: a0.rapporte.sources } };
  assert.ok(!text(GA.fichePage(actx, nu)).includes('Sources des chiffres'));
});

test('listes (prix_gta6) : statuts, fourchette, pastille et fiche complète ; le schéma accepte les nouveaux champs', () => {
  const FD = require(path.join(root, 'outils/fiche-doc.cjs')), C = require(path.join(root, 'outils/catalogues.cjs'));
  const it = (p, fam = 'coiffures') => ({ ...C.load().families[fam].items.find(x => !FD.notBought(x)), prix_gta6: p });
  const cell = p => { const c = FD.accessCell(it(p)); return [flat(c.price), c.pip]; };
  assert.deepEqual(cell({ valeur: 45, statut: 'officiel', source: R, verifiedAt: DATE }), ['45 $, Officiel', 'officiel'], 'comme avant');
  assert.deepEqual(cell({ valeur: 45, statut: 'verified', source: 'relevé', verifiedAt: DATE }), ['45 $, Mesuré', 'officiel'], 'comme avant');
  assert.deepEqual(cell({ valeur: 45, statut: 'media', source: A, sources: [B], verifiedAt: DATE, min: 40, max: 50 }), ['45 $ (de 40 à 50 $), Vu dans un média', 'vu']);
  assert.deepEqual(cell({ valeur: 45, statut: 'comm', source: W, verifiedAt: DATE }), ['45 $, Communautaire', 'comm']);
  assert.deepEqual(cell({ valeur: 45, statut: 'estimated', source: A, verifiedAt: DATE }), ['45 $, Estimé', 'conf']);
  /* fiche complète : sources en liens, date, note */
  const row = it({ valeur: 45, statut: 'presse', source: A, sources: [B], verifiedAt: DATE, note: 'coupe simple' });
  const html = FD.render(FD.CATEGORY_OF.coiffures, FD.knownOfRow('coiffures', row, id => id), { compact: true });
  const t = text(html);
  assert.ok(t.includes('45 $') && t.includes('Vu dans un média'), t.slice(0, 300));
  assert.ok(t.includes('Sources : example.test/media-a ; example.test/media-b, vérifié le 20 novembre 2026. Note : coupe simple'), t);
  /* schéma (outils/catalogues/schema.json) */
  const schema = JSON.parse(fs.readFileSync(path.join(root, 'outils/catalogues/schema.json'), 'utf8')), item = schema.properties.items.items;
  const errs = p => { const e = []; C.check(p, item.properties.prix_gta6, 'x', e); return e; };
  for (const statut of ['officiel', 'verified', 'media', 'presse', 'estimated', 'comm', 'community']) assert.deepEqual(errs({ valeur: 45, statut, source: A, verifiedAt: DATE, sources: [B], min: 40, max: 50, note: 'n' }), [], statut);
  assert.ok(errs({ valeur: 45, statut: 'conf', source: A, verifiedAt: DATE }).length, 'un chiffre écrit avec « conf » est refusé');
  assert.ok(errs({ valeur: 45, statut: 'media', source: A, verifiedAt: DATE, fourchette: [40, 50] }).length, 'clé inconnue refusée');
});

/* ---------- 4. munitions ---------- */
test('munitions : le prix s’écrit dans outils/acquisitions.json (catégorie « munitions »), le calculateur le lit comme un achat de type munition', () => {
  const acq = JSON.parse(fs.readFileSync(path.join(root, 'outils/acquisitions.json'), 'utf8')), cat = acq.categories.find(c => c.id === 'munitions');
  assert.equal(cat.type, 'ammo');
  const hub = JSON.parse(fs.readFileSync(path.join(root, 'outils/hubs-editoriaux.json'), 'utf8')).armes.munitions.items;
  assert.ok(hub.length >= 5); for (const x of hub) assert.ok(fs.existsSync(path.join(root, 'munitions', x.id + '.html')), 'fiche de ' + x.id);
  for (const x of acq.items.filter(x => x.category === 'munitions')) assert.ok(hub.some(h => h.id === x.id), 'munition connue : ' + x.id);
  const price = v(60, 'estimated', '$', { source: A, min: 50, max: 80, note: 'une boîte' });
  const entry = { id: hub[0].id, category: 'munitions', type: 'ammo', name: hub[0].nom, evidenceLevel: 1, calculatorCompatible: true, acquisition: 'purchase', condition: 'Achat (test)', price, url: '/munitions/' + hub[0].id + '.html' };
  const row = adapter({ LK_ACQUISITIONS: { categories: acq.categories, items: [entry] } }).catalogue().find(x => x.id === hub[0].id);
  assert.ok(row, 'ligne du catalogue'); assert.equal(row.type, 'ammo'); assert.equal(row.price, 60);
  assert.deepEqual([row.fieldMeta.price.status, row.fieldMeta.price.min, row.fieldMeta.price.max], ['estimated', 50, 80]);
  const p = DP.prixDe({ ...entry, type: undefined });
  assert.equal(flat(DP.phrasePrix(p)), 'Prix publié : 60 $ (de 50 à 80 $), Estimation, source : ' + A + ', vérifié le 20 novembre 2026. Note : une boîte');
  /* le générateur refuse une munition inconnue et mène la ligne à la fiche de la munition */
  const src = fs.readFileSync(path.join(root, 'outils/gen-acquisitions.cjs'), 'utf8');
  assert.match(src, /Munition inconnue/); assert.match(src, /'\/munitions\/'\+item\.id\+'\.html'/);
});

/* ---------- 5. Léo ---------- */
test('Léo : un gabarit « sources » à côté de « source », traduit dans les cinq langues ; le statut d’un prix passe par la traduction', () => {
  const ed = JSON.parse(fs.readFileSync(path.join(root, 'outils/leo-editorial.json'), 'utf8'));
  const groups = Object.entries(ed.templates).filter(([, g]) => g && g.priceSourceLine);
  assert.ok(groups.length >= 4);
  for (const [k, g] of groups) assert.equal(g.priceSourcesLine, ', sources : {source}', k);
  assert.match(fs.readFileSync(path.join(root, 'outils/sources/leo-core.js'), 'utf8'), /it\.priceSources>1&&T\.priceSourcesLine/);
  assert.match(fs.readFileSync(path.join(root, 'outils/leo-langues.cjs'), 'utf8'), /'inspiration', 'priceStatus'/);
  for (const code of ['en', 'es', 'it', 'de', 'pt']) {
    const t = JSON.parse(fs.readFileSync(path.join(root, 'outils/langues', code, 'v804-jour-j.json'), 'utf8'));
    assert.match(t[', sources : {source}'], /^, [^:]+: \{source\}$/, code);
  }
});

/* ---------- 6. sans données, rien ne change (ce test ne vaut que tant que rien n’est publié : le jour J, il se met de côté tout seul) ---------- */
const ETAT0 = DP.etat(root), PUBLIE = ETAT0.prix.connus > 0 || ETAT0.activites.completes > 0;
test('sans données publiées : aucune fourchette, note, liste de sources ni statut nouveau dans ce que lit le calculateur ; résultats v8.01 identiques', { skip: PUBLIE ? 'des données sont publiées : ce contrôle ne vaut que sans données' : false }, () => {
  const H = require('./check-ultime-helper.cjs'), { catalogue, sourceActivities, D } = H.siteData();
  const metas = [...catalogue.flatMap(x => Object.values(x.fieldMeta || {})), ...sourceActivities.flatMap(x => Object.values(x.fieldMeta || {}))];
  assert.ok(metas.length > 300);
  assert.ok(metas.every(m => !['min', 'max', 'note', 'sources'].some(k => k in m)), 'aucune clé nouvelle sans donnée : empreinte inchangée');
  assert.ok(!metas.some(m => m.status === 'media'), 'aucun chiffre « Vu dans un média » sans donnée');
  assert.equal(ETAT0.prix.connus, 0); assert.deepEqual(ETAT0.errors, []);
  assert.ok(D.meta);
});

test('référence v8.01 : le code donne les résultats de la v8.01, données publiées écartées (vrai aussi le jour J)', () => {
  const REF = require('./reference-v801.cjs'), ref = JSON.parse(fs.readFileSync(REF.FILE, 'utf8')).results;
  assert.deepEqual(REF.compare(ref, REF.compute()).map(d => d.key), []);
  /* la lecture « sans publication » écarte bien tout ce que le jour J ajoute */
  const H = require('./check-ultime-helper.cjs'), s = H.siteData({ sansPublication: true });
  assert.deepEqual(s.sourceActivities, []); assert.ok(s.catalogue.every(x => x.price === null));
});

test('traductions : chaque texte nouveau des scripts du calculateur est traduit dans les cinq langues', () => {
  const L = require(path.join(root, 'outils/langues.cjs')), cfg = L.config(root);
  let keys = null;
  const CORE = ['vu dans un média', 'chiffre de la communauté', 'Chiffre de la communauté', 'Chiffre donné par au moins deux médias reconnus qui disent la même chose.', 'Rockstar ne l’a pas publié : il peut changer.', 'Relevé par des joueurs (wiki, site de fans) : utile pour se faire une idée, jamais officiel.', 'Sources des chiffres', ', sources : {source}', 'Capacité dans GTA VI : rien n’est publié par Rockstar ; les fiches gardent les repères de la série à part.', 'Se rejoue', 'Pour la lancer', 'Prix en jeu'];
  for (const code of ['en', 'es', 'it', 'de', 'pt']) {
    const t = JSON.parse(fs.readFileSync(path.join(root, 'outils/langues', code, 'v804-jour-j.json'), 'utf8'));
    /* les textes propres au jour J sont dans chaque langue ; les motifs (valeurs, fourchettes, sources, dates) sont les mêmes partout */
    for (const k of CORE) assert.ok(typeof t[k] === 'string' && t[k].trim(), code + ' : ' + k);
    const k = Object.keys(t._motifs || {}).sort();
    assert.ok(k.length >= 100, code + ' : motifs');
    if (keys === null) keys = k; else assert.deepEqual(k, keys, code + ' : mêmes motifs que l’anglais');
    const lang = cfg.langues.find(l => l.code === code), mem = L.memoire(root, code); mem.used = new Set();
    const report = { code, pages: [], scripts: [], missing: [], broken: [], conflicts: mem.conflicts };
    const ctx = { cfg, lang, mem, link: L.linker(cfg, lang, root), report, code, root, translatedScripts: new Set(), candidates: null };
    for (const f of ['modele-donnees.js', 'calculateurs-workspace.js', 'calculateurs.js']) L.translateScript(fs.readFileSync(path.join(root, f), 'utf8'), f, ctx);
    const mine = report.missing.filter(m => /média|communauté|Chiffre|Relevé par des joueurs/.test(m.text));
    assert.deepEqual(mine, [], code);
  }
});

test('phrases comptées (prix publiés, activités chiffrées, listes) : accord au singulier, jamais « 0 prix », traduites dans les cinq langues', () => {
  const L = require(path.join(root, 'outils/langues.cjs')), TYPES = Object.keys(DP.TYPE_LABEL);
  /* états fictifs en mémoire (aucun fichier n’est écrit) */
  const etat = ({ p = 0, off = 0, a = 0, aoff = 0, types = { vehicle: p }, ct = {} }) => {
    const parType = {}; for (const t of TYPES) parType[t] = { total: 50, connus: types[t] || 0, officiels: 0 };
    const cats = { consommables: [0, 30], coiffures: [0, 56], tatouages: [0, 25], tenues: [0, 30], 'perso-vehicules': [0, 59], 'perso-armes': [0, 41], ...ct };
    return { prix: { connus: p, total: 355, officiels: off, parType, liste: [] }, activites: { completes: a, officielles: aoff }, catalogues: Object.fromEntries(Object.entries(cats).map(([f, [n, t]]) => [f, { connus: n, total: t }])) };
  };
  const un = DP.phrases(etat({ p: 1, a: 1, aoff: 1, ct: { consommables: [29, 30] } }));
  assert.match(un.activites, /la proposent avec sa source/); assert.match(un.prixAchats, /^1 prix publié sur 355 fiches, avec sa source/);
  assert.match(un.etatConsommables, /sur la dernière ligne\.$/); assert.match(un.faqApropos, /^En partie\. Le site connaît 30 prix GTA VI publiés, chacun/); assert.match(DP.phrases(etat({ p: 1 })).faqApropos, /^En partie\. Le site connaît 1 prix GTA VI publié, avec sa source ;/);
  assert.doesNotMatch(DP.phrases(etat({ a: 2 })).faqExemples, /0 prix/); assert.match(DP.phrases(etat({ a: 1 })).faqExemples, /la propose comme référence/);
  assert.doesNotMatch(DP.phrases(etat({ ct: { consommables: [30, 30] } })).etatConsommables, /autres lignes|dernière ligne/, 'plus aucune ligne à confirmer');
  const absent = DP.phrases(etat({}));
  const states = [etat({ p: 3, off: 1, types: { vehicle: 2, ammo: 1 }, a: 2, aoff: 1, ct: { consommables: [1, 30], coiffures: [2, 56], 'perso-vehicules': [1, 59] } }), etat({ p: 1, a: 1, types: { property: 1, hideout: 1 }, ct: { tenues: [1, 30] } })];
  for (const code of ['en', 'es', 'it', 'de', 'pt']) {
    const mem = L.memoire(root, code); mem.used = new Set();
    for (const e of states) for (const [k, fr] of Object.entries(DP.phrases(e))) {
      if (fr === absent[k]) continue; /* l’absence d’aujourd’hui : déjà traduite là où elle s’affiche */
      const t = L.deep(mem, L.norm(fr), 'calculateurs.html', null, () => {});
      assert.equal(typeof t, 'string', code + ' ' + k + ' : ' + fr); assert.notEqual(t, fr, code + ' ' + k);
    }
  }
});
