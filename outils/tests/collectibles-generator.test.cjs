'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { generate, validateCatalog, isIndexable, MARKER } = require('../gen-collectibles.cjs');
const verifiedSource = { label: 'Source de test isolée', url: 'https://example.org/evidence', kind: 'official', checkedAt: '2026-09-18' };
const catalog = items => ({ schemaVersion: 1, updatedAt: '2026-09-18', sources: [], categories: [], items });
const item = (extra = {}) => ({ id: 'objet-test', slug: 'objet-test', name: 'Objet de test isolé', status: 'confirmed', published: true, trackable: true, verifiedAt: '2026-09-18', sources: [verifiedSource], ...extra });
const rich = () => item({ summary: 'Description factuelle de démonstration, réservée à un test isolé. Elle permet de vérifier que les informations documentées restent lisibles dans le fichier HTML sans JavaScript.', place: 'Emplacement de test, sans rapport avec GTA VI.', reward: 'Récompense fictive de test.', seo: { indexable: true } });
const hub = `<!doctype html><html lang="fr"><head><meta name="robots" content="index, follow"></head><body><a class="skip" href="#main">Contenu</a><header><a href="index.html">Accueil</a></header><main id="main"><h2 id="col-status-title">Vide</h2><p id="col-status-copy">Aucune collection</p><strong id="col-documented">0</strong><strong id="col-confirmed">0</strong><strong id="col-located">0</strong><p id="col-result-count">Aucune fiche documentée</p><div id="collectibles-results"><!-- COLLECTIBLES:START --><!-- COLLECTIBLES:END --></div><div id="col-empty">État vide</div><span id="col-trackable-label">objet suivi</span><span id="col-percent">—</span><p id="col-progress-caption">Vide</p><div id="col-progress-meter" aria-valuetext="Vide"></div><time id="col-review-date" datetime="2026-01-01">Ancien</time><p id="col-review-summary">Aucune collection</p><p id="col-help-catalogue-state">Vide</p></main><footer><a href="contact.html">Contact</a></footer></body></html>`;
function workspace(t, input) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'lk-collectibles-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'outils'));
  fs.writeFileSync(path.join(root, 'outils/collectibles.json'), JSON.stringify(input));
  fs.writeFileSync(path.join(root, 'collectibles.html'), hub);
  const xml = '<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://www.leonidakit.com/armes.html</loc></url>\n  <url><loc>https://www.leonidakit.com/collectibles/obsolete.html</loc></url>\n</urlset>\n';
  fs.writeFileSync(path.join(root, 'sitemap.xml'), xml);
  fs.writeFileSync(path.join(root, 'sitemap-fiches.xml'), xml);
  fs.writeFileSync(path.join(root, 'search-index.js'), '/* preserved comment */\nwindow.LK_INDEX = [{"l":"Armes","k":"Section","u":"/armes.html","s":"armes"},{"l":"Obsolète","k":"Collectible","u":"/collectibles/obsolete.html","s":"obsolete"}];\n');
  return root;
}
const read = (root, file) => fs.readFileSync(path.join(root, file), 'utf8');
function publicData(root) { const context = { window: {} }; vm.runInNewContext(read(root, 'collectibles-data.js'), context); return JSON.parse(JSON.stringify(context.window.LK_COLLECTIBLES)); }

test('normalise les champs manquants sans transformer les inconnues en chiffres', () => {
  const normalized = validateCatalog(catalog([item()])).items[0];
  for (const key of ['category', 'image', 'coordinates', 'quantity', 'order', 'place', 'reward']) assert.equal(normalized[key], null);
  assert.deepEqual(normalized.gallery, []);
  assert.deepEqual(normalized.seo, { indexable: false, description: null });
  assert.equal(normalized.updatedAt, '2026-09-18');
});

test('rejette identifiants, doublons, références et catégories invalides', () => {
  for (const id of ['../escape', '__proto__', 'constructor', 'avec espace']) assert.throws(() => validateCatalog(catalog([item({ id })])), /identifiant/);
  assert.throws(() => validateCatalog(catalog([item(), item()])), /dupliqué/);
  assert.throws(() => validateCatalog(catalog([item({ category: 'inconnue' })])), /non déclarée/);
  assert.throws(() => validateCatalog(catalog([item({ relatedIds: ['absent'] })])), /référence inconnue/);
  assert.throws(() => validateCatalog(catalog([item({ relatedIds: ['objet-test'] })])), /vers soi-même/);
  assert.throws(() => validateCatalog(catalog([item({ unknown: true })])), /champ inconnu/);
});

test('requiert des sources datées et un statut éligible au suivi', () => {
  assert.throws(() => validateCatalog(catalog([item({ sources: [] })])), /source vérifiée/);
  assert.throws(() => validateCatalog(catalog([item({ verifiedAt: null })])), /date de vérification/);
  assert.throws(() => validateCatalog(catalog([item({ sources: [{ ...verifiedSource, kind: 'community' }] })])), /source officielle/);
  assert.throws(() => validateCatalog(catalog([item({ status: 'unconfirmed' })])), /progression/);
  assert.throws(() => validateCatalog(catalog([item({ sources: [{ ...verifiedSource, url: 'javascript:alert(1)' }] })])), /HTTP/);
  assert.throws(() => validateCatalog(catalog([item({ verifiedAt: '2026-02-30' })])), /date ISO réelle/);
});

test('les coordonnées requièrent un repère exact, des bornes et une preuve', () => {
  const coordinates = { system: 'leonidakit-v1', x: 5200, y: 6000, verified: true, sourceUrl: 'https://example.org/map' };
  assert.deepEqual(validateCatalog(catalog([item({ coordinates })])).items[0].coordinates, coordinates);
  for (const invalid of [{ x: -1 }, { y: 6001 }, { x: '10' }, { verified: false }, { system: 'gps' }, { sourceUrl: '' }]) assert.throws(() => validateCatalog(catalog([item({ coordinates: { ...coordinates, ...invalid } })])));
  assert.ok(validateCatalog(catalog([item({ status: 'unconfirmed', trackable: false, coordinates })])).items[0].coordinates);
});

test('refuse les visuels distants, chemins traversants et fichiers absents', t => {
  const root = workspace(t, catalog([]));
  const image = { src: '/img/test.webp', alt: 'Image de test', width: 20, height: 20, credit: 'Auteur de test', sourceUrl: 'https://example.org/image' };
  assert.throws(() => validateCatalog(catalog([item({ image })]), { root }), /introuvable/);
  assert.throws(() => validateCatalog(catalog([item({ image: { ...image, src: '/img/../secret.webp' } })]), { root }), /image locale/);
  assert.throws(() => validateCatalog(catalog([item({ image: { ...image, src: 'https://example.org/image.webp' } })]), { root }), /image locale/);
  fs.mkdirSync(path.join(root, 'img'));
  fs.writeFileSync(path.join(root, 'img/test.webp'), 'fixture');
  assert.equal(validateCatalog(catalog([item({ image })]), { root }).items[0].image.src, '/img/test.webp');
});

test('l’indexation reste une décision explicite avec des informations concrètes', () => {
  assert.equal(isIndexable(validateCatalog(catalog([item({ seo: { indexable: true } })])).items[0]), false);
  assert.equal(isIndexable(validateCatalog(catalog([rich()])).items[0]), true);
  assert.equal(isIndexable(validateCatalog(catalog([{ ...rich(), seo: { indexable: false } }])).items[0]), false);
  assert.equal(isIndexable(validateCatalog(catalog([{ ...rich(), status: 'unconfirmed', trackable: false }])).items[0]), false);
  assert.equal(isIndexable(validateCatalog(catalog([{ ...rich(), place: null, reward: null }])).items[0]), false);
});

test('produit du HTML complet, un état non vide et des index cohérents sans JavaScript', t => {
  const root = workspace(t, catalog([rich()]));
  const result = generate({ root });
  assert.equal(result.published, 1);
  assert.equal(result.indexable, 1);
  const detail = read(root, 'collectibles/objet-test.html');
  assert.match(detail, /<h1>Objet de test isolé<\/h1>/);
  assert.match(detail, /name="robots" content="index, follow"/);
  assert.match(detail, /href="https:\/\/www.leonidakit.com\/collectibles\/objet-test.html"/);
  assert.match(detail, /data-col-note="objet-test"/);
  assert.match(detail, /data-col-share="objet-test"/);
  assert.match(detail, /data-col-spoiler/);
  assert.match(detail, /href="..\/contact.html"/);
  assert.doesNotMatch(detail, /#collectible=/);
  const outputHub = read(root, 'collectibles.html');
  assert.match(outputHub, /id="col-documented">1<\/strong>/);
  assert.match(outputHub, /id="col-empty" hidden/);
  assert.match(outputHub, /id="col-result-count"[^>]*>1 fiche documentée/);
  assert.doesNotMatch(outputHub, /id="col-status-copy">Aucune collection/);
  assert.match(outputHub, /id="col-help-catalogue-state">Le catalogue recense 1 fiche, dont 1 confirmée officiellement/);
  assert.match(read(root, 'sitemap.xml'), /armes.html/);
  assert.match(read(root, 'sitemap.xml'), /collectibles\/objet-test.html/);
  assert.doesNotMatch(read(root, 'sitemap.xml'), /obsolete/);
  assert.match(read(root, 'search-index.js'), /preserved comment/);
  assert.match(read(root, 'search-index.js'), /"u":"\/armes.html"/);
  assert.doesNotMatch(read(root, 'search-index.js'), /obsolete/);
  assert.equal(generate({ root, check: true }).current, true);
});

test('les fiches pauvres restent lisibles et noindex sans entrer dans le sitemap', t => {
  const root = workspace(t, catalog([item()]));
  const result = generate({ root });
  assert.equal(result.published, 1);
  assert.equal(result.indexable, 0);
  assert.match(read(root, 'collectibles/objet-test.html'), /noindex, follow/);
  assert.doesNotMatch(read(root, 'sitemap-collectibles.xml'), /objet-test/);
  assert.match(read(root, 'search-index.js'), /objet-test/);
});

test('les placeholders et brouillons ne laissent aucune entrée publique, même via relatedIds', t => {
  const root = workspace(t, catalog([item({ relatedIds: ['brouillon'] }), { id: 'brouillon', slug: 'modele-prive', name: 'FICTIF A NE PAS PUBLIER', status: 'placeholder', published: true }]));
  generate({ root });
  assert.equal(publicData(root).items.length, 1);
  assert.deepEqual(publicData(root).items[0].relatedIds, []);
  assert.doesNotMatch(read(root, 'collectibles-data.js'), /FICTIF|modele-prive|brouillon/);
  assert.equal(fs.existsSync(path.join(root, 'collectibles/modele-prive.html')), false);
});

test('échappe le HTML et les fins de script dans les descriptions et données structurées', t => {
  const dangerous = '</script><script>alert("test")</script>';
  const root = workspace(t, catalog([item({ name: dangerous, description: dangerous })]));
  generate({ root });
  assert.doesNotMatch(read(root, 'collectibles-data.js'), /<\/script>/);
  const html = read(root, 'collectibles/objet-test.html');
  assert.match(html, /&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert/);
  assert.match(html, /\\u003c/);
});

test('retire ses fiches obsolètes sans supprimer une page manuelle', t => {
  const root = workspace(t, catalog([item()]));
  generate({ root });
  fs.writeFileSync(path.join(root, 'collectibles/manuelle.html'), '<html>Page manuelle</html>');
  fs.writeFileSync(path.join(root, 'outils/collectibles.json'), JSON.stringify(catalog([])));
  const result = generate({ root });
  assert.deepEqual(result.removed, ['collectibles/objet-test.html']);
  assert.equal(fs.existsSync(path.join(root, 'collectibles/manuelle.html')), true);
  assert.doesNotMatch(read(root, 'collectibles.html'), /id="col-empty" hidden/);
  assert.match(read(root, 'collectibles.html'), /id="col-help-catalogue-state">Aucun collectible suffisamment documenté/);
  assert.doesNotMatch(read(root, 'collectibles-data.js'), /objet-test/);
});

test('un échec de validation ne modifie aucune sortie et --check ne crée rien', t => {
  const root = workspace(t, catalog([item()]));
  const original = read(root, 'collectibles.html');
  assert.equal(generate({ root, check: true }).current, false);
  assert.equal(fs.existsSync(path.join(root, 'collectibles-data.js')), false);
  fs.writeFileSync(path.join(root, 'outils/collectibles.json'), JSON.stringify(catalog([item({ verifiedAt: null })])));
  assert.throws(() => generate({ root }), /date de vérification/);
  assert.equal(read(root, 'collectibles.html'), original);
  assert.equal(fs.existsSync(path.join(root, 'collectibles-data.js')), false);
});

test('refuse de remplacer une fiche manuelle portant le nouveau slug', t => {
  const root = workspace(t, catalog([item()]));
  fs.mkdirSync(path.join(root, 'collectibles'));
  fs.writeFileSync(path.join(root, 'collectibles/objet-test.html'), '<html>Contenu manuel</html>');
  assert.throws(() => generate({ root }), /aucun écrasement/);
  assert.equal(fs.existsSync(path.join(root, 'collectibles-data.js')), false);
  assert.equal(read(root, 'collectibles/objet-test.html').includes(MARKER), false);
});

test('résume les faits utiles et renvoie vers les bons filtres sans révéler lieu ni récompense', t => {
  const input = catalog([item({ category: 'test-category', region: 'Région / test & est', zone: 'Zone précise secrète', availability: 'Condition documentée', requirements: ['Prérequis A', 'Prérequis B'], place: 'Lieu précis de test', reward: 'Récompense secrète' })]);
  input.categories = [{ id: 'test-category', name: 'Catégorie de test' }];
  const root = workspace(t, input);
  generate({ root });
  const html = read(root, 'collectibles/objet-test.html');
  const essentials = html.match(/<section class="col-panel col-detail-quick"[\s\S]*?<\/section>/)[0];
  assert.match(essentials, /L’essentiel/);
  assert.match(essentials, /Confirmé officiellement/);
  assert.match(essentials, /Condition documentée/);
  assert.match(essentials, /2 conditions à vérifier/);
  assert.match(essentials, /href="\/collectibles.html\?category=test-category"/);
  assert.match(essentials, /href="\/collectibles.html\?region=R%C3%A9gion%20%2F%20test%20%26%20est"/);
  assert.doesNotMatch(essentials, /Lieu précis|Récompense secrète|Zone précise/);
  assert.match(html, /<details[^>]*id="col-detail-location"[^>]*data-col-spoiler><summary>[\s\S]*?Zone précise secrète[\s\S]*?<\/details>/);
  assert.match(html, /<details[^>]*id="col-detail-reward"[^>]*data-col-spoiler><summary>[\s\S]*?Récompense secrète[\s\S]*?<\/details>/);
  assert.doesNotMatch(html, /<details[^>]*\sopen(?:\s|>)/);
});

test('le sommaire ne pointe que vers des sections effectivement rendues', t => {
  const root = workspace(t, catalog([item({ requirements: ['Prérequis documenté'], hints: ['Indice test'] })]));
  generate({ root });
  const html = read(root, 'collectibles/objet-test.html');
  const navigation = html.match(/<nav class="col-detail-jumps"[\s\S]*?<\/nav>/)[0];
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, new Set(ids).size);
  for (const [, anchor] of navigation.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.includes(anchor), anchor + ' doit avoir une section');
  assert.match(navigation, /#col-detail-essential/);
  assert.match(navigation, /#col-detail-hints/);
  assert.doesNotMatch(navigation, /#col-detail-location|#col-detail-reward|#col-detail-gallery|#col-detail-presentation/);
  assert.doesNotMatch(html, /0 condition à vérifier/);
});

test('chaque indice se révèle indépendamment dans un volet numéroté fermé', t => {
  const root = workspace(t, catalog([item({ hints: ['Premier indice isolé', 'Deuxième indice isolé', 'Troisième indice isolé'] })]));
  generate({ root });
  const html = read(root, 'collectibles/objet-test.html');
  const hints = [...html.matchAll(/<details class="col-hint" data-col-hint="(\d+)" data-col-spoiler>([\s\S]*?)<\/details>/g)];
  assert.equal(hints.length, 3);
  for (let i = 0; i < hints.length; i++) {
    assert.equal(hints[i][1], String(i + 1));
    assert.ok(hints[i][2].includes('<summary>Indice ' + (i + 1) + ' sur 3</summary>'));
    assert.equal((hints[i][2].match(/indice isolé/g) || []).length, 1);
  }
});

test('la fiche branche la sortie et les aides sans dépendre du panneau réservé au hub', t => {
  const root = workspace(t, catalog([item()]));
  generate({ root });
  const html = read(root, 'collectibles/objet-test.html');
  assert.match(html, /data-col-plan="objet-test" aria-pressed="false"/);
  assert.match(html, /data-col-plan-label>Ajouter à ma sortie/);
  assert.match(html, /data-col-plan-status="objet-test" role="status" aria-live="polite"/);
  assert.match(html, /href="..\/collectibles.html#col-tools"/);
  assert.match(html, /href="..\/collectibles-tools.css"/);
  assert.match(html, /href="..\/collectibles-help.css"/);
  assert.ok(html.indexOf('src="../collectibles-tools.js"') > html.indexOf('src="../collectibles.js"'));
  assert.ok(html.indexOf('src="../collectibles-help.js"') > html.indexOf('src="../collectibles-tools.js"'));
  assert.doesNotMatch(html, /id="col-tools"/);
});

test('le zoom garde un vrai lien image utilisable sans JavaScript et le crédit associé', t => {
  const image = { src: '/img/test.webp', alt: 'Vue de test', width: 20, height: 20, credit: 'Crédit test & auteur', sourceUrl: 'https://example.org/image' };
  const root = workspace(t, catalog([item({ image, gallery: [image] })]));
  fs.mkdirSync(path.join(root, 'img'));
  fs.writeFileSync(path.join(root, 'img/test.webp'), 'fixture');
  generate({ root });
  const html = read(root, 'collectibles/objet-test.html');
  assert.match(html, /<a href="\/img\/test.webp" aria-label="Agrandir : Vue de test" data-col-zoom-alt="Vue de test" data-col-zoom-credit="Crédit test &amp; auteur">/);
  assert.equal((html.match(/class="col-detail-image"/g) || []).length, 2);
  assert.match(html, /id="col-detail-gallery" data-col-spoiler/);
  assert.match(html, /href="https:\/\/example.org\/image"/);
});
