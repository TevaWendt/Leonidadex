'use strict';
/* v7.91 (portugais) : le calculateur en portugais du Brésil (<html lang="pt-BR">, code « pt »), comme en espagnol et en italien.
   Moteur : « $ 1.250 » (signe devant, espace insécable), pluriel (0 et 2 ou plus au pluriel, moins de 2 au singulier : « 1,5 milhão »),
   saisie « 1.250,50 » (« 1.5 » reste un décimal), date « 19 de novembro de 2026 » ; barre de demande : plus de 80 demandes tapées comme
   un joueur brésilien (« tenho 200 mil », « 1kk », « tô zerado », « das 20h às 22h », « somos em 4 »…), lues par le moteur et la barre
   seuls (page vide en pt-BR, rapide) puis, pour les cases remplies et les règles dites, dans la page française passée en pt-BR (la copie
   /pt/ n'existe pas encore : à la génération seules les chaînes changent, pas la lecture) ; les libellés du
   glossaire § 8 que le code cherche (atelier : case à corriger, étiquette de ce qui bloque) ; boutons « $ 100 mil », « $ 1 mi » ; les
   autres langues lisent exactement comme avant. Montants FICTIFS. */
const test = require('node:test'), assert = require('node:assert/strict'), path = require('node:path'), fs = require('node:fs');
const root = path.resolve(__dirname, '../..');
const E = require(path.join(root, 'calculateurs-engine.js'));
const { load } = require('./runtime-helper.cjs');
const { JSDOM } = require('jsdom');
const NB = '\u00a0';
const langOf = code => w => { w.document.documentElement.lang = code; };
const fire = (p, n, t) => n.dispatchEvent(new p.w.Event(t, { bubbles: true, cancelable: true }));

/* ---------- moteur : dollars, pluriel, nombres, dates ---------- */
test('V791-01 moteur pt : « $ 1.250 », « -$ 1.250 », pluriel brésilien, « 1.250,50 », « 19 de novembro de 2026 », « 1º de outubro »', () => {
  assert.equal(E.dollars('1.250', ' ', 'pt'), '$' + NB + '1.250');
  assert.equal(E.dollars('-1.250', undefined, 'pt'), '-$' + NB + '1.250');
  assert.equal(E.dollars('\u22121.250', ' ', 'pt'), '\u2212$' + NB + '1.250');
  assert.equal(E.dollars('0', ' ', 'pt'), '$' + NB + '0');
  assert.equal(E.dollars('1,5 mi', ' ', 'pt'), '$' + NB + '1,5 mi');
  assert.equal(E.dollars(new Intl.NumberFormat('pt-BR').format(1250000), '\u00a0', 'pt'), '$' + NB + '1.250.000');
  // les autres langues ne changent pas
  // lot 1 bis : espace insécable avant le signe dans les autres langues
  assert.equal(E.dollars('1 250', ' ', 'fr'), '1 250' + NB + '$'); assert.equal(E.dollars('1.250', ' ', 'es'), '1.250' + NB + '$');
  assert.equal(E.dollars('1.250', ' ', 'it'), '1.250' + NB + '$'); assert.equal(E.dollars('1.250', ' ', 'de'), '1.250' + NB + '$'); assert.equal(E.dollars('1,250', ' ', 'en'), '$1,250');
  // pluriel : « 0 horas », « 1 hora », « 1,5 milhão », « 0,5 milhão », « 2 milhões »
  assert.deepEqual([0, 0.5, 1, 1.5, 1.99, 2, 3, -1, -2].map(n => E.plural(n, 'pt')), [true, false, false, false, false, true, true, false, true]);
  assert.deepEqual([0, 1, 1.5, 2].map(n => E.plural(n, 'fr')), [false, false, true, true]);
  assert.deepEqual([0, 1, 1.5, 2].map(n => E.plural(n, 'en')), [true, false, true, true]);
  assert.deepEqual([0, 1, 1.5, 2].map(n => E.plural(n, 'es')), [true, false, true, true]);
  // saisie : point des milliers, virgule décimale ; « 1.5 » reste un décimal (comme l'espagnol et l'italien)
  for (const [t, v] of [['1.250,50', 1250.5], ['1.250', 1250], ['1.5', 1.5], ['1.50', 1.5], ['1,5', 1.5], ['200.000', 200000], ['1.000.000', 1e6], ['200 000', 200000], ['12,5', 12.5], ['0', 0]]) assert.equal(E.parseLocalizedNumber(t, 'pt').value, v, t);
  for (const t of ['1,250.50', 'abc', '1.2.3', '200.000 $', '']) assert.equal(E.parseLocalizedNumber(t, 'pt').valid, false, t);
  // dates : « 19 de novembro de 2026 », le premier du mois en ordinal (« 1º de outubro de 2026 »)
  assert.equal(E.dateText(new Date(2026, 10, 19), {}, 'pt'), '19 de novembro de 2026');
  assert.equal(E.dateText(new Date(2026, 9, 1), {}, 'pt'), '1º de outubro de 2026');
  assert.equal(E.dateText(new Date(2026, 10, 19), { year: false }, 'pt'), '19 de novembro');
  assert.match(E.dateText(new Date(2026, 10, 19, 20, 5), { time: true }, 'pt'), /^19 de novembro de 2026 às 20:05$/);
  assert.match(E.dateText(new Date(2026, 9, 1, 9, 5), { short: true, nbsp: true, time: true }, 'pt'), /^1º de out\. de 2026, 9:05$/);
  assert.equal(E.dateText(new Date(2026, 9, 1), {}, 'fr'), '1er octobre 2026'); assert.equal(E.dateText(new Date(2026, 11, 1), {}, 'es'), '1 de diciembre de 2026');
  // durée inchangée (« 1 h 30 », « 45 min »)
  assert.equal(E.durationText(1.5, 'pt'), '1 h 30'); assert.equal(E.durationText(0.75, 'pt'), '45 min');
});

/* ---------- barre de demande : plus de 80 demandes portugaises ---------- */
// null = rien ne doit être lu pour cette case ; un nombre = la seule valeur juste ; note = phrase qui doit être dite
const PT = [
  // Mon objectif (argent, but, temps par jour, gain par heure, échéance)
  ['quanto tempo pra juntar 1 milhão?', { tab: 'goal', cap: null, target: 1e6 }],
  ['qnto tempo pra juntar 1kk?', { tab: 'goal', target: 1e6 }], // « 1kk » = un million (écriture des joueurs)
  ['tenho 200 mil e quero 1 milhão', { tab: 'goal', cap: 200000, target: 1e6 }],
  ['Tenho $ 200.000 e quero chegar a 1,5 milhão', { tab: 'goal', cap: 200000, target: 1.5e6 }],
  ['Tenho R$ 200.000 e quero 2 milhões', { cap: 200000, target: 2e6 }], // « R$ » par habitude : le dollar du jeu
  ['já tenho 250 mil, quanto tempo pra ter 2 milhões jogando 2 horas por dia?', { tab: 'goal', cap: 250000, target: 2e6, minutes: 120 }],
  ['meu objetivo é 10 milhões, jogo 1 hora e meia por dia', { target: 1e7, minutes: 90 }],
  ['quero economizar meio milhão', { tab: 'goal', target: 500000 }],
  ['tenho um milhão e meio e quero 3 milhões', { cap: 1.5e6, target: 3e6 }],
  ['tenho duzentos e cinquenta mil e quero dois milhões', { cap: 250000, target: 2e6 }],
  ['tenho três mil e quinhentos dólares e quero um milhão', { cap: 3500, target: 1e6 }],
  ['tenho um milhão e duzentos mil, objetivo cinco milhões', { cap: 1.2e6, target: 5e6 }],
  ['tenho vinte e cinquenta mil', { cap: null }], // suite mal formée : rien plutôt qu'un nombre faux
  ['tenho dois mil e quinhentos, quero 1 milhão', { cap: 2500, target: 1e6 }],
  ['tô com 150k, qto tempo pra 1kk?', { cap: 150000, target: 1e6 }],
  ['1,5kk de meta, tenho 300k', { cap: 300000, target: 1.5e6 }],
  ['tenho 1.5 mi e quero 3 mi', { cap: 1.5e6, target: 3e6 }], // « 1.5 » : un décimal
  ['tô zerado, quero juntar 1 milhão', { cap: 0, target: 1e6 }],
  ['n tenho grana, quanto tempo pra 1 milhão?', { cap: 0, target: 1e6 }],
  ['não tenho nada pra comprar, objetivo 1 milhão', { cap: null, target: 1e6 }], // « nada pra comprar » n'est pas « rien »
  ['faltam 300 mil pra 1 milhão', { cap: 700000, target: 1e6 }],
  ['tenho 200 mil e me faltam 800 mil', { cap: 200000, target: 1e6 }],
  ['estou a 100 mil do meu objetivo de 1 milhão', { cap: 900000, target: 1e6 }],
  ['tô a 250 mil da meta de 1 milhão, jogando uma hora por dia', { cap: 750000, target: 1e6, minutes: 60 }],
  ['quanto tempo pra dobrar meus 500 mil?', { cap: 500000, target: 1e6 }],
  ['quero mais 500 mil, tenho 1 milhão', { cap: 1e6, target: 1.5e6 }],
  ['quero 1 milhão a mais, tenho 2 milhões', { cap: 2e6, target: 3e6 }],
  ['preciso de mais 300 mil', { target: null, note: /écris aussi ton argent/ }],
  ['jogo meia hora por dia, meta de 1 milhão', { minutes: 30, target: 1e6 }],
  ['jogo 2h30 por dia, quero 3 milhões', { minutes: 150, target: 3e6 }],
  ['jogo duas horinhas por dia e quero 2 milhões', { minutes: 120, target: 2e6 }],
  ['uma hora e quinze por dia, objetivo 1 milhão', { minutes: 75 }],
  ['jogo das 20h às 22h todo dia, objetivo 1 milhão', { tab: 'goal', minutes: 120, target: 1e6 }],
  ['jogo das 22h à meia-noite, quero 5 milhões', { minutes: 120, target: 5e6 }],
  ['jogo de 20 a 22, quero 1 milhão', { minutes: 120 }],
  ['jogo 10 horas por semana, quanto tempo pra 5 milhões?', { minutes: null, target: 5e6 }], // par semaine : pas un temps par jour
  ['levei 2 horas pra ganhar 100 mil, objetivo 1 milhão', { minutes: null, target: 1e6 }], // une durée passée
  ['jogo 1 h por dia, não, melhor 2 h, pra ter 4 milhões', { minutes: 120, target: 4e6, note: /j’ai pris la durée corrigée/ }],
  ['jogo 1h por dia na semana e 3h no fim de semana, objetivo 1 milhão', { minutes: null, note: /deux durées différentes/ }],
  ['ganho uns 100 mil por hora, quanto tempo pra 2 milhões?', { tab: 'goal', hourly: 100000, target: 2e6 }],
  ['faço 80 mil de lucro por hora, quero 2 milhões', { hourly: 80000, target: 2e6 }],
  ['ganho 50 mil em 1 hora, objetivo 1 milhão', { hourly: 50000, target: 1e6 }],
  ['meu irmão ganha 500 mil por hora, quanto tempo pra 5 milhões?', { hourly: null, target: 5e6 }], // l'argent d'un autre joueur
  ['gastei 300 mil ontem, quero 1 milhão', { cap: null, target: 1e6 }],
  ['quero 1 milhão em 2 semanas', { tab: 'goal', deadline: 14, target: 1e6 }],
  ['tenho 200 mil, não, 300 mil, e quero 1 milhão', { cap: 300000, target: 1e6, note: /j’ai pris le montant corrigé/ }],
  ['tenho 200 mil, quer dizer, 300 mil, objetivo 1 milhão', { cap: 300000, note: /j’ai pris le montant corrigé/ }],
  ['tenho 300 mil mas preciso de 1 milhão', { cap: 300000, target: 1e6, nonote: /corrigé/ }], // « mas » ne corrige rien
  ['tenho 100 mil e não 50 mil, quero 1 milhão', { cap: 100000, target: 1e6 }],
  ['quero 1 milhão mas só jogo 1 hora por dia', { target: 1e6, minutes: 60 }], // « mas » n'est pas « de plus »
  ['tenho 2,4 mi na conta e 100 mil em dinheiro, quero 5 mi', { cap: 2.5e6, target: 5e6 }],
  // joueurs
  ['jogo sozinho, tenho 100 mil e quero 1 milhão', { players: 1, cap: 100000 }],
  ['somos 4 jogadores, objetivo 1 milhão', { players: 4 }],
  ['jogo com 2 amigos, objetivo 1 milhão', { players: 3 }],
  ['jogo com três da galera, objetivo 1 milhão', { players: 4 }],
  ['eu e minha namorada jogamos, quero 1 milhão', { players: 2 }],
  ['somos em quatro, quanto tempo pra 3 milhões?', { players: 4, target: 3e6 }],
  ['não gosto de jogar sozinho, objetivo 1 milhão', { players: null }],
  ['somos 4, não, 5, objetivo 2 milhões', { players: null, note: /nombre de joueurs pas clair/ }],
  // Mon temps de jeu
  ['às 21h tenho 45 minutos', { tab: 'session', minutes: 45 }], // 21h : une heure de la journée
  ['tenho 2 horas hoje à noite, o que eu faço?', { tab: 'session', minutes: 120 }],
  ['hj a noite tenho 2h, q faço?', { tab: 'session', minutes: 120 }],
  ['somos 4 e temos 1h30, o que fazemos?', { tab: 'session', players: 4, minutes: 90 }],
  ['posso jogar até meia-noite, o que faço?', { tab: 'session' }],
  // Mes activités
  ['qual a melhor missão por hora?', { tab: 'activities' }],
  ['qual o melhor jeito de ganhar dinheiro?', { tab: 'activities' }],
  ['qual golpe rende mais?', { tab: 'activities' }],
  ['quero farmar dinheiro rápido', { tab: 'activities' }],
  ['qual missão dá mais dinheiro em 90 minutos?', { tab: 'activities', minutes: 90 }],
  ['20 minutos por missão, quanto ganho por hora?', { tab: 'activities', minutes: null }],
  // Ça vaut le coup ? / Mes achats / Quel achat choisir ? / Quoi acheter d'abord ? / Mon budget / business plan
  ['vale a pena comprar a boate por 1,2 milhão?', { tab: 'roi', price: 1.2e6 }],
  ['o hangar se paga?', { tab: 'roi' }],
  ['compensa comprar o bunker?', { tab: 'roi' }],
  ['posso comprar o iate de 2 milhões? tenho 1,5 milhão', { tab: 'purchase', price: 2e6, cap: 1.5e6 }],
  ['dá pra comprar um carro de 400 mil?', { tab: 'purchase', price: 400000 }],
  ['a mansão custa um milhão e duzentos, tenho 900 mil', { tab: 'purchase', price: 1.2e6, cap: 900000 }],
  ['o bunker custa 1,2 mi ao invés de 1,6 mi essa semana, compro? tenho 1,4 mi', { tab: 'purchase', price: 1.2e6, cap: 1.4e6 }],
  ['é melhor o bunker ou o hangar?', { tab: 'compare' }],
  ['entre o iate e a mansão, qual escolher?', { tab: 'compare' }],
  ['o que comprar primeiro?', { tab: 'order' }],
  ['por onde começo?', { tab: 'order' }],
  ['tenho 3,5 mi, compro o que primeiro: escritório, hangar ou submarino?', { tab: 'order', cap: 3.5e6 }],
  ['tenho 2 milhões, como gastar?', { tab: 'budget', cap: 2e6 }],
  ['orçamento de 1 milhão, onde investir?', { tab: 'budget', cap: 1e6 }],
  ['tenho 1 milhão mas 200 mil de dívidas a pagar, onde coloco o resto?', { tab: 'budget', cap: 800000 }],
  ['plano de negócios para 10 milhões', { tab: 'plan', target: 1e7 }],
  ['meu plano passo a passo pra 5 milhões', { tab: 'plan', target: 5e6 }],
  ['quero 1 milhão daqui a 10 dias, qual o plano?', { tab: 'plan', deadline: 10, target: 1e6 }],
  ['devo 300 mil e não tenho nada, me ajuda com um plano', { tab: 'plan', cap: 0 }], // une dette n'est pas de l'argent
  // les questions d'exemple de la page (data-ask), dans leur traduction portugaise : lues comme les originaux français
  ['Quanto tempo para chegar a 1 milhão com 1 hora por dia?', { tab: 'goal', target: 1e6, minutes: 60 }],
  ['Posso comprar um veículo de $ 250.000?', { tab: 'purchase', price: 250000 }],
  ['Tenho 30 minutos para minha sessão', { tab: 'session', minutes: 30 }],
  ['Em quanto tempo um investimento de $ 500.000 se paga?', { tab: 'roi', price: 500000 }],
];
const VAL = { tab: r => r.tab, cap: r => r.values.capital, target: r => r.values.target, price: r => r.values.price, minutes: r => r.values.minutes, players: r => r.values.players, hourly: r => r.values.hourly, deadline: r => r.values.deadlineDays };
function check(r, exp) {
  const bad = [];
  for (const [k, v] of Object.entries(exp)) {
    if (k === 'note') { if (!v.test(r.notes.join(' · '))) bad.push('note absente : ' + v); continue; }
    if (k === 'nonote') { if (v.test(r.notes.join(' · '))) bad.push('note en trop : ' + r.notes.join(' · ')); continue; }
    const got = VAL[k](r); if (v === null ? got !== null : got !== v) bad.push(k + ' = ' + got + ' au lieu de ' + v);
  }
  return bad;
}
/* le moteur et la barre seuls, dans une page vide de la langue : route() lit la demande sans cases à remplir (rapide) */
function bare(lang) {
  const dom = new JSDOM('<!doctype html><html lang="' + lang + '"><body></body></html>', { runScripts: 'outside-only' });
  for (const f of ['calculateurs-engine.js', 'calculateurs-hub.js']) dom.window.eval(fs.readFileSync(path.join(root, f), 'utf8'));
  return dom.window;
}
// règles dites seulement quand la case est remplie (page complète)
const PT_PAGE = [
  ['faltam 300 mil pra 1 milhão', { cap: 700000, target: 1e6, note: /ton argent = objectif − ce qui te manque/ }],
  ['tenho 200 mil e me faltam 800 mil', { cap: 200000, target: 1e6, note: /objectif = ton argent \+ ce qui te manque/ }],
  ['quanto tempo pra dobrar meus 500 mil?', { cap: 500000, target: 1e6, note: /objectif = 2 × ton argent/ }],
  ['tenho 2,4 mi na conta e 100 mil em dinheiro, quero 5 mi', { cap: 2.5e6, target: 5e6, note: /la somme de ces montants/ }],
  ['tenho 1 milhão mas 200 mil de dívidas a pagar, onde coloco o resto?', { tab: 'budget', cap: 800000, note: /les frais à payer/ }],
];
test('V791-02 barre de demande en portugais : ' + PT.length + ' demandes comprises (outil, argent, but, prix, temps, joueurs, gain par heure, échéance, corrections)', async () => {
  assert.ok(PT.length >= 40);
  const w = bare('pt-BR'), H = w.LKCalcHub, bad = [];
  try {
    assert.equal(w.LKCalcEngine.lang, 'pt');
    for (const [q, exp] of PT) { const r = H.route(q); const b = check(r, exp); if (b.length) bad.push('« ' + q + ' » : ' + b.join(', ') + ' [' + r.tab + ' · ' + r.notes.join(' · ') + ']'); }
    assert.deepEqual(bad, []);
    // montants et durées lus seuls ; un nombre en lettres est lu avec la phrase (interpret), comme dans les autres langues
    assert.equal(H.parseMoney('Tenho $ 200.000 e quero 1,5 milhão'), 1.5e6);
    assert.equal(H.parseMoney('250 mil'), 250000); assert.equal(H.parseMoney('1kk'), 1e6); assert.equal(H.parseMoney('$ 1,5 mi'), 1.5e6);
    assert.equal(H.parseMoney('2 bilhões'), 2e9); assert.equal(H.parseMoney('500 dólares'), 500); assert.equal(H.parseMoney('R$ 200 mil'), 200000);
    assert.equal(H.parseMinutesPerDay('2 horas por dia'), 120); assert.equal(H.parseMinutesPerDay('1 hora e 15 minutos'), 75); assert.equal(H.parseMinutesPerDay('às 21h'), null);
    assert.equal(H.interpret('jogo uma hora e meia por dia').minutes, 90); assert.equal(H.interpret('meia hora').minutes, 30);
    // demande incomplète : l'IA de la barre est appelée (taux, « e se… », « por missão »)
    assert.equal(H.needsAI('e se eu jogar 3 horas por dia?', H.route('e se eu jogar 3 horas por dia?')), true);
    assert.equal(H.needsAI('qual a chance de dar certo o golpe?', H.route('qual a chance de dar certo o golpe?')), true);
  } finally { w.close(); }
  // dans la page : cases remplies, règle dite, montant redit avec le signe devant (« $ 200 000 » ici, « $ 200.000 » dans la copie pt)
  const p = await load(root, 'calculateurs.html', { before: langOf('pt-BR') });
  try {
    assert.equal(p.w.LKCalcEngine.lang, 'pt');
    const fails = [];
    for (const [q, exp] of PT_PAGE) { const r = p.w.LKCalcHub.route(q); p.flush(); const b = check(r, exp); if (b.length) fails.push('« ' + q + ' » : ' + b.join(', ') + ' [' + r.tab + ' · ' + r.notes.join(' · ') + ']'); }
    assert.deepEqual(fails, []);
    const out = p.d.getElementById('calc-ask-out'), input = p.d.getElementById('calc-ask-input');
    input.value = 'tenho 200 mil e quero 1 milhão, jogo 2 horas por dia'; p.d.getElementById('calc-ask').dispatchEvent(new p.w.Event('submit', { cancelable: true })); p.flush();
    const goal = JSON.parse(p.w.localStorage.getItem('lk-calculator-v1')).goal;
    assert.deepEqual([goal.capital, goal.target, goal.dailyMinutes], [200000, 1e6, 120]);
    assert.equal(p.w.LKCalcEngine.parseLocalizedNumber(p.d.getElementById('f-goal-capital').value).value, 200000); // regroupée par la page
    assert.match(out.textContent, /\$ 200[\s ]000/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
});

/* ---------- les autres langues lisent comme avant ; le portugais ne s'ajoute qu'en pt ---------- */
test('V791-03 fr, en, es, it, de : les demandes des tests de chaque langue donnent les mêmes valeurs ; un mot portugais n’y est pas lu', async () => {
  const CASES = {
    fr: [['J’ai 200 000 $, non 300 000 $, et je veux 1 million', { cap: 300000, target: 1e6 }], ['Je joue de 20h à 22h tous les soirs, objectif 1 million', { minutes: 120 }], ['On est 4, on a 1h30, on fait quoi ?', { tab: 'session', players: 4, minutes: 90 }], ['tenho 200 mil e quero 1 milhão', { cap: null }]],
    en: [['I have $300k but I need $1M more', { cap: 300000, target: 1.3e6 }], ['I play 10 hours a week, how long until I hit 5M?', { minutes: null, target: 5e6 }], ['tenho 1kk', { cap: null }]],
    es: [['tengo 200 mil, perdón, 300 mil, y quiero un millón', { cap: 300000, target: 1e6 }], ['a las 9 h tengo 45 minutos', { tab: 'session', minutes: 45 }], ['tengo un millón y medio, ¿cómo lo reparto entre negocios y coches?', { tab: 'budget', cap: 1.5e6 }], ['tenho 200 mil e quero 1 milhão', { cap: null }]],
    it: [['ho 200 mila, anzi 300 mila, e voglio un milione', { cap: 300000, target: 1e6 }], ['Siamo in 4 e abbiamo due ore', { tab: 'session', players: 4, minutes: 120 }]],
    de: [['ich habe 200 Tausend, nein, 300 Tausend, und will eine Million', { cap: 300000, target: 1e6 }], ['Wir sind zu viert und haben anderthalb Stunden', { tab: 'session', players: 4, minutes: 90 }]],
  };
  for (const [lang, list] of Object.entries(CASES)) {
    const w = bare(lang), bad = [];
    try { for (const [q, exp] of list) { const r = w.LKCalcHub.route(q); const b = check(r, exp); if (b.length) bad.push(lang + ' « ' + q + ' » : ' + b.join(', ')); } } finally { w.close(); }
    assert.deepEqual(bad, []);
    const p = await load(root, 'calculateurs.html', { before: langOf(lang) });
    try {
      assert.deepEqual(p.errors, [], lang);
      // les boutons de but gardent leur forme (« 100 k $ » en français, « $100k » en anglais, « 100 Tsd. $ » en allemand)
      const chip = p.d.querySelector('.calc-chip[data-target]').textContent.replace(/[\s\u00a0\u202f]+/g, ' ');
      assert.equal(chip, { fr: '100 k $', en: '$100k', es: '100 k $', it: '100 k $', de: '100 Tsd. $' }[lang], lang + ' : ' + chip);
    } finally { p.close(); }
  }
});

/* ---------- boutons « $ 100 mil », « $ 1 mi » et grands nombres en mots ---------- */
test('V791-04 page pt : boutons « $ 100 mil »… « $ 10 mi », « = $ 1,5 million » au singulier (moins de 2), au pluriel dès 2', async () => {
  const p = await load(root, 'calculateurs.html', { before: langOf('pt-BR') });
  try {
    assert.deepEqual([...p.d.querySelectorAll('.calc-chip[data-target]')].map(b => b.textContent), ['$' + NB + '100 mil', '$' + NB + '500 mil', '$' + NB + '1 mi', '$' + NB + '5 mi', '$' + NB + '10 mi']);
    // les mots viennent de la mémoire à la génération (« milhão », « milhões ») ; ici le choix singulier / pluriel
    const S = p.w.LKCalcSimple; assert.ok(S);
    assert.match(S.words(1500000), /^1,5 million$/); assert.match(S.words(1999999), /million$/); assert.match(S.words(2500000), /^2,5 millions$/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
  const h = await load(root, 'index.html', { before: langOf('pt-BR') });
  try {
    const form = h.d.getElementById('lk-mini-form'); if (!form) return;
    const target = form.elements.namedItem('target'); target.value = '1500000'; fire(h, target, 'input'); fire(h, target, 'focusout'); h.flush();
    assert.match(h.d.getElementById('lk-mini-echo-target').textContent, /^= \$\u00a01,5 million$/);
  } finally { h.close(); }
});

/* ---------- libellés que le code cherche (glossaire § 8) ---------- */
test('V791-05 atelier : un message portugais mène à la bonne case (guardado, Já tenho, por hora, Quero ter, preço…), « Missão 2 » ; étiquette de ce qui bloque', () => {
  const src = fs.readFileSync(path.join(root, 'calculateurs-workspace.js'), 'utf8');
  const KEYS = Function('return ' + src.match(/ const KEYS=(\[[\s\S]*?\]\]);/)[1])(), KEYS_PT = Function('return ' + src.match(/ const KEYS_PT=(\{[\s\S]*?\});/)[1])();
  assert.deepEqual(Object.keys(KEYS_PT), KEYS.map(k => k[0]), 'une expression portugaise pour chaque clé');
  const ptKeys = KEYS.map(([k, re]) => [k, new RegExp(re.source + '|' + KEYS_PT[k].source, 'i')]);
  const first = (list, t) => (list.find(([, re]) => re.test(t)) || [null])[0];
  for (const [t, k] of [['O dinheiro que você deixa guardado (sua reserva) é maior do que o que você tem.', 'reserve'], ['Escreva o que você tem em “Já tenho”.', 'capital'], ['Dinheiro insuficiente para pagar agora.', 'capital'], ['Escreva quanto a compra faz você ganhar a mais por hora.', 'extra'], ['Escreva o que você ganha por hora.', 'hourly'], ['Escreva o valor que você quer ter.', 'target'], ['Escreva o preço desta compra.', 'price'], ['Seu tempo de jogo por dia, em minutos, deve ser maior que 0.', 'daily'], ['Escreva a duração da sessão.', 'minutes'], ['O grupo deve ter de 1 a 100 jogadores.', 'players'], ['Escreva a duração em horas: o tempo em que você usa.', 'hours'], ['Os dias por semana vão de 1 a 7.', 'days'], ['Seus gastos por sessão passam do que rende uma sessão.', 'upkeep'], ['É preciso chegar a 50 pontos.', 'units']]) assert.equal(first(ptKeys, t), k, t);
  // en français, rien ne change (les mots portugais ne s'ajoutent que sur une page portugaise)
  assert.match(src, /if\(h\.E&&h\.E\.lang==='pt'\)KEYS\.forEach/);
  assert.equal(first(KEYS, 'Écris ce que tu gagnes par heure.'), 'hourly'); assert.equal(first(KEYS, 'Escreva o preço desta compra.'), null);
  assert.match(src, /\/\^\(\?:Mission\|Misión\|Missione\|Missão\) \(\\d\+\)\//);
  assert.match(src, /Ganho\|Missões/);
  // étiquette de ce qui bloque (calculateurs-scenario.js) : « Percurso a completar », « Escreva… », « exige », « Nenhum plano »
  const scen = fs.readFileSync(path.join(root, 'calculateurs-scenario.js'), 'utf8');
  const fn = scen.match(/function missingLabel\(reason\)\{[\s\S]*?return 'À corriger';\}/)[0];
  const label = lang => Function('E', 'return (' + fn + ')')({ lang });
  const pt = label('pt'), fr = label('fr');
  assert.equal(pt('Percurso a completar: escreva o preço de “Iate”.'), 'Parcours à compléter');
  for (const t of ['Escreva o que você ganha por hora.', 'Diga o seu objetivo: uma quantia a ter ou uma compra com o seu preço.', 'Escolha uma atividade.', 'Adicione uma missão.']) assert.equal(pt(t), 'À écrire', t);
  for (const t of ['A atividade que você escolheu exige esta compra.', 'Etapa 1 bloqueada: faltam $ 200.000.', 'Nenhum plano pode ser calculado com esses números.', 'Nenhuma missão possível rende mais do que seus gastos.']) assert.equal(pt(t), 'Blocage', t);
  assert.equal(pt('No máximo doze missões no plano.'), 'À corriger'); // « no plano » n'est pas l'anglais « no plan »
  assert.equal(fr('Écris le prix de cet achat.'), 'À écrire'); assert.equal(fr('Aucun plan ne peut être calculé avec ces chiffres.'), 'Blocage'); assert.equal(fr('Percurso a completar'), 'À corriger');
  assert.match(scen, /joueurs\|players\|jugadores\|giocatori\|jogadores/); assert.match(scen, /tempo di gioco al giorno\|tempo de jogo por dia/);
});

/* ---------- autres scripts : consommables (prix par point), fiches, Atelier 3D, IA, dictée ---------- */
test('V791-06 consommables en pt : « 1.250 » tapé vaut 1 250, réponse « $ 25 par point » ; fiches, Atelier 3D, IA et dictée en pt-BR', async () => {
  const p = await load(root, 'nourriture.html', { before: langOf('pt-BR') });
  try {
    const r = p.d.getElementById('en-un-regard'); assert.ok(r);
    const boxes = [...r.querySelectorAll('[data-cg-cmp]')];
    [0, 1, 2].forEach(i => { boxes[i].checked = true; fire(p, boxes[i], 'change'); });
    const table = r.querySelector('.cg-table'), outs = [...table.querySelectorAll('.cg-out')];
    const [price, heal] = [...table.querySelectorAll('tr.cg-sim')].map(tr => tr.querySelector('input'));
    price.value = '1.250'; fire(p, price, 'input'); heal.value = '50'; fire(p, heal, 'input');
    assert.match(outs[0].textContent, /^\$\u00a025 par point \(simulation\)$/);
    assert.deepEqual(p.errors, []);
  } finally { p.close(); }
  // fiches.js : le même signe devant que consommables.js
  const lk = f => fs.readFileSync(path.join(root, f), 'utf8').match(/var lkDollars = function \(s\) \{[^\n]*?\};/)[0];
  assert.equal(lk('fiches.js'), lk('consommables.js')); assert.match(lk('fiches.js'), /\/\^pt\/\.test\(document\.documentElement\.lang \|\| "fr"\) \? "\$\\u00a0" \+ s/);
  // Atelier 3D (module) : total « $ 1.250 » en pt-BR, inchangé ailleurs
  const at = fs.readFileSync(path.join(root, 'atelier-3d.js'), 'utf8').match(/const fmtMoney = (n => \{[^\n]*?\});/)[1];
  const money = lang => Function('document', 'return ' + at)({ documentElement: { lang } });
  assert.equal(money('pt-BR')(1250), '$' + NB + '1.250'); assert.equal(money('pt-BR')(1250000), '$' + NB + '1.250.000');
  assert.equal(money('fr')(1250).replace(/[\s\u00a0\u202f]/g, ' '), '1 250 $'); assert.equal(money('en')(1250), '$1,250'); assert.equal(money('de')(1250).replace(/\u00a0/g, ' '), '1.250 $');
  // IA (nombres, dates) et dictée : pt-BR
  assert.match(fs.readFileSync(path.join(root, 'lk-ia.js'), 'utf8'), /de: 'de-DE', pt: 'pt-BR' \}\[lang\]/);
  assert.match(fs.readFileSync(path.join(root, 'lk-micro.js'), 'utf8'), /LOCALE = \{[^}]*pt: 'pt-BR' \}/);
});
