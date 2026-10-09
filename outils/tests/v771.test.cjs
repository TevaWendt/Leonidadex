'use strict';
/* v7.71 (demande de Téva du 08/10/2026, lot 1) : IA entièrement gratuite (15 questions par visiteur toutes les 12 heures, plus
   aucun crédit payant), compte à rebours du renouvellement, saisie vocale (lk-micro.js) dans la barre du calculateur et dans
   Léo, business plan (blocs « Mes calculs enregistrés » plus dupliqués, « Et si » présent même quand le plan ne se calcule pas),
   À propos et Mentions adaptés (IA, micro, emplacements publicitaires réservés), emplacement publicitaire caché sur les fiches
   du monde. Vérifications sur les fichiers livrés, sans réseau. */
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const doc = f => new JSDOM(read(f)).window.document;
const { load } = require('./runtime-helper.cjs');
const LANGS = ['', 'en/', 'es/', 'it/', 'de/'];

test('serveur : 15 questions gratuites toutes les 12 heures par défaut, plus de fonction d’achat, plus de code de crédit', () => {
  const IA = require(root + '/api/ia.js'), T = IA._test;
  const st = T.settings({});
  assert.equal(st.free, 15); assert.equal(st.windowS, 12 * 3600);
  assert.ok(!('sell' in st) && !('margin' in st), 'plus de vente ni de marge');
  assert.ok(!fs.existsSync(path.join(root, 'api/ia-achat.js')));
  assert.deepEqual(fs.readdirSync(path.join(root, 'api')).sort(), ['contact.js', 'ia.js']);
  assert.ok(!('priceOf' in T) && !('PRICES' in T));
  const src = read('api/ia.js').replace(/\/\*[\s\S]*?\*\//g, ''); assert.doesNotMatch(src, /stripe|jeton|MIN_CREDIT/i);
});

test('page : lk-ia.js sans crédit ni Stripe, compte à rebours (hh:mm:ss) dans la ligne d’état, ancien code de crédit effacé', async () => {
  const src = read('lk-ia.js');
  assert.doesNotMatch(src, /stripe|lkia-shop|Plus de questions|ia-achat|data-lkia-pay/i);
  assert.match(src, /localStorage\.removeItem\('lk_ia_jeton'\)/);
  assert.match(src, /de nouveau \{total\} dans \{timer\}/);
  const p = await load(root, 'calculateurs.html', {});
  try {
    const A = p.w.LKIA; assert.ok(A && typeof A.countdown === 'function');
    assert.equal(A.countdown(Date.now() + 11 * 3600e3 + 59 * 60e3 + 30e3 + 400), '11:59:30');
    assert.equal(A.countdown(Date.now() + 65e3), '01:05');
    assert.equal(A.countdown(Date.now() - 5000), '00:00');
    const ctl = p.d.querySelector('#calc-ask .lkia');
    assert.ok(ctl && !ctl.querySelector('[data-lkia-shop]'), 'plus de bouton « Plus de questions »');
    A.learn(200, { ok: true, acces: { type: 'gratuit', gratuit: 15, heures: 12, restant: 14, reset: Date.now() + 2 * 3600e3 } });
    const st = p.d.querySelector('#calc-ask .lkia-st');
    assert.match(st.textContent, /^IA : 14 questions gratuites sur 15 · de nouveau 15 dans (?:2:00:00|1:59:5\d)\.$/);
    const t = st.querySelector('time.lkia-timer'); assert.ok(t && t.getAttribute('role') === 'timer' && t.dateTime);
    assert.match(A.status().plain, /dans (?:2:00:00|1:59:5\d)\.$/);
    A.learn(402, { ok: false, code: 'quota', gratuit: 15, heures: 12, restant: 0, reset: Date.now() + 3600e3 });
    assert.equal(ctl.dataset.kind, 'quota'); assert.match(st.textContent, /épuisées : mode local, l’IA revient dans (?:59:\d\d|1:00:00)\.$/);
    assert.equal(A.usable(), false);
    A.learn(200, { ok: true, acces: { type: 'gratuit', gratuit: 15, heures: 12, restant: 15, reset: null } });
    assert.equal(st.textContent, 'IA : 15 questions gratuites toutes les 12 h.');
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('micro : module lk-micro.js (navigateur sans reconnaissance vocale : aucun bouton), chargé par le calculateur et par Léo, traduit', async () => {
  const src = read('lk-micro.js');
  assert.match(src, /SpeechRecognition \|\| window\.webkitSpeechRecognition/);
  assert.match(src, /rec\.lang = LOCALE\[lang\]/);
  assert.doesNotMatch(src, /fetch\(|XMLHttpRequest/, 'rien ne part vers le site');
  assert.match(read('calculateurs.html'), /<script src="lk-micro\.js(?:\?v=[a-f0-9]+)?" defer><\/script>/);
  assert.match(read('leo-loader.js'), /script\('lk-micro\.js','LKMicro'\)/);
  assert.match(read('leo-ui.js'), /window\.LKMicro\.attach\(input,\{submit:true\}\)/);
  for (const l of ['en/', 'es/', 'it/', 'de/']) assert.ok(fs.existsSync(path.join(root, l + 'lk-micro.js')), l + 'lk-micro.js');
  assert.match(read('de/lk-micro.js'), /Sprechen statt tippen/);
  const p = await load(root, 'calculateurs.html', {});
  try { assert.ok(p.w.LKMicro && p.w.LKMicro.supported === false, 'jsdom : pas de reconnaissance vocale'); assert.equal(p.d.querySelectorAll('.lk-mic').length, 0); assert.deepEqual(p.errors, []); } finally { p.close(); }
});

test('business plan : « Mes calculs enregistrés » et « Mes business plans » une seule fois même après rechargement d’un calcul ; « Et si » présent en Expert quand le plan ne se calcule pas encore', async () => {
  assert.match(read('calculateurs-workspace.js'), /querySelectorAll\('\.b-legacy-saved'\)\.forEach\(n=>n\.remove\(\)\)/);
  /* v7.74 : le plan pas encore calculable garde le même bloc Expert (cinq points) que le plan calculé */
  assert.equal((read('calculateurs-plan.js').match(/\$\('expert-plan'\)\.innerHTML=expert\?expertBlock\(s,r\):''/g) || []).length, 2);
  const p = await load(root, 'calculateurs.html', {});
  try {
    const count = () => [...p.d.querySelectorAll('summary')].filter(s => /^(Mes calculs enregistrés|Mes business plans)$/.test(s.textContent.trim())).length;
    assert.equal(count(), 2);
    p.d.querySelector('[data-tab="plan"]').click(); p.flush();
    p.d.querySelector('.calc-mode-switch [data-mode="advanced"]').click(); p.flush();
    /* restauration (calcul rechargé) : mount() repasse, le bloc n'est pas dupliqué */
    const calc = p.w.LKCalculator; assert.ok(calc);
    if (typeof calc.restore === 'function') { calc.restore(JSON.parse(JSON.stringify(calc.state())), 'Test'); p.flush(); }
    assert.equal(count(), 2, 'blocs non dupliqués');
    const sens = p.d.querySelector('#expert-plan [data-fold-head="plan-sensitivity"]') || p.d.querySelector('#expert-plan [data-fold="plan-sensitivity"]');
    assert.ok(sens || p.d.querySelector('#expert-plan').textContent.includes('Et si le chiffre bouge'), '« Et si » dans le bloc Expert du plan');
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

test('À propos et Mentions : IA gratuite et micro décrits, publicité annoncée honnêtement, plus de Stripe ni de crédit ; cinq langues', () => {
  for (const l of LANGS) {
    const m = read(l + 'mentions-legales.html'), a = read(l + 'a-propos.html');
    assert.doesNotMatch(m + a, /Stripe|lk_ia_jeton|conditions-de-vente/, l + ' : plus de crédit payant');
    const d = new JSDOM(m).window.document;
    assert.ok(d.getElementById('donnees-micro'), l + ' : ligne micro'); assert.ok(d.getElementById('publicite'), l + ' : publicité');
    assert.ok(d.getElementById('donnees-ia'));
  }
  const fr = read('mentions-legales.html');
  assert.match(fr, /15 questions par visiteur toutes les 12 heures/); assert.match(fr, /aucun script publicitaire/);
  const ap = read('a-propos.html'); assert.match(ap, /15 questions toutes les 12 heures/); assert.match(ap, /emplacements publicitaires/); assert.match(ap, /parler au micro/);
  assert.match(read('tuto.html'), /15 questions IA gratuites toutes les 12 h/); assert.match(read('tuto.html'), /bouton micro/);
  const t = JSON.parse(read('outils/leo-knowledge.json')).topics.find(x => x.id === 'ia-questions');
  assert.match(t.text, /15 questions gratuites/); assert.match(t.text, /micro/);
});

test('fiches du monde : un emplacement publicitaire réservé, caché, sans aucun script publicitaire', () => {
  for (const f of ['personnages/jason.html', 'lieux/vice-city.html', 'entreprises/stock-305.html', 'demeures/brian-keys.html', 'planques/starlet-motel.html', 'gangs/final-chapter-mc.html', 'en/personnages/jason.html']) {
    const d = doc(f); const slot = d.querySelector('aside.lk-pub[data-pub="fiche-monde"]');
    assert.ok(slot && slot.hidden, f + ' : emplacement caché');
    assert.equal(slot.children.length, 0);
  }
  assert.match(read('lk-sections.css'), /\.lk-pub\[hidden\]\{display:none;\}/);
  for (const f of ['personnages/jason.html', 'index.html']) assert.doesNotMatch(read(f), /adsbygoogle|doubleclick|googlesyndication/);
});
