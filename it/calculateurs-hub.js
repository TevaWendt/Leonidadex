/* Intent shortcuts. Calculation and state ownership stay in LKCalculator. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const normalize = value => String(value || '').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'").replace(/[\u00a0\u202f]/g, ' ');
  const rules = [
    { tab: 'plan', label: 'Il mio business plan', re: /business plan|mon plan|plan complet|etape par etape|quoi faire en premier|plan d'action|echeance|d'ici (le|la|\d)|en \d+ jours|avant le \d|prochaine partie|programme de la semaine|ou en suis-je|mission par mission|partie par partie|plan de secours|plan b|debloquer|rang \d|niveau \d|\bxp\b|my plan|step by step|what (?:should i|to) do first|action plan|deadline|in \d+ days|by (?:the )?\d|next session|weekly schedule|backup plan|\bunlock|\brank \d|\blevel \d|plan de negocio|mi plan|paso a paso|que (?:hago|hacer|compro) primero|plan de accion|fecha limite|en \d+ dias|antes del \d|proxima partida|programa de la semana|mision por mision|partida por partida|plan (?:alternativo|de emergencia)|desbloquear|rango \d|nivel \d|piano aziendale|il mio piano|passo dopo passo|cosa fare prima|entro (?:il|la|\d)|in \d+ giorni|prossima partita|missione per missione|partita per partita|piano b|sbloccare|livello \d|grado \d|businessplan|mein plan|schritt fur schritt|was (?:mache|tue) ich zuerst|was zuerst tun|aktionsplan|\bfrist|bis zum \d|in \d+ tagen|nachste session|wochenplan|notfallplan|freischalt|\brang \d/ },
    { tab: 'compare', label: 'Quale acquisto scelgo?', re: /choisir|comparer|lequel|laquelle|le mieux|meilleur achat|rapport qualite|le plus rentable|le moins cher|\bou\b.*\bou\b|\bchoose|\bcompare|\bwhich (?:one|is|should)|best (?:buy|purchase|value)|value for money|most profitable|\bcheapest|elegir|\belijo\b|comparar|\bcual (?:compro|elijo|es mejor|me conviene)|el mejor|mejor compra|calidad.precio|mas rentable|mas barato|\bo (?:el|la)\b|scegliere|scelgo|confront|quale (?:compro|scelgo|e meglio|mi conviene|conviene)|il migliore|miglior acquisto|qualita.prezzo|il piu redditizio|il piu economico|il meno caro|\bwahlen|vergleich|\bwelche[nrs]?\s+(?:soll|ist besser|kauf|nehm)|am besten|bester kauf|preis-leistung|am rentabelsten|am billigsten|gunstigste/ },
    { tab: 'order', label: 'Cosa compro prima?', re: /\bordre\b|priorit|d'abord|en premier|sequence|\border\b|buy first|\bfirst\b|\borden\b|prioridad|primero|antes que nada|\bordine\b|priorita|prima di tutto|per primo|compro prima|cosa compro|reihenfolge|prioritat|\bzuerst\b|als erstes/ },
    { tab: 'roi', label: 'Ne vale la pena?', re: /rentab|\broi\b|amorti|retour sur|investi|seuil|vaut le coup|a partir de quand|rembours|vaut-il|ca vaut|profitab|worth it|is it worth|pay(?:s)? (?:for itself|back|off)|break.?even|return on|\binvest|amortiz|retorno|inversion|vale la pena|merece la pena|compensa|a partir de cuando|recupero|recuperar|conviene|ne vale la pena|vale la pena|redditiz|rientr|investiment|investire|da quando|ripag|\blohnt|amortis|zahlt sich|rendite/ },
    { tab: 'session', label: 'Il mio tempo di gioco', re: /session|j'ai du temps|minutes?\b|temps disponible|i have (?:some )?time|time (?:i have|available)|available time|tonight|partida|tengo tiempo|tiempo disponible|esta noche|minutos?\b|sessione|ho tempo|tempo disponibile|stasera|minuti?\b|ich habe zeit|zeit habe|verfugbare zeit|heute abend|\bminuten\b/ },
    { tab: 'budget', label: 'Il mio budget', re: /repart|reserve|enveloppe|poste de depense|\bsplit\b|\bspread\b|allocat|divide (?:it|my)|repart|presupuesto|dividir|ripart|suddivid|dividere|aufteil|verteil|rucklage/ },
    { tab: 'purchase', label: 'I miei acquisti', re: /achet|achat|prix|cout|permettre|vehicule|voiture|moto|bateau|propriete|maison|arme|budget|\bbuy|purchase|price|\bcost|afford|vehicle|\bcar\b|\bbike|motorcycle|\bboat|property|\bhouse|weapon|\bgun|compr|precio|cuesta|coste|permitirme|vehiculo|coche|\bcarro\b|\bauto\b|barco|propiedad|\bcasa\b|\barma\b|pistola|acquist|prezzo|costa\b|costo|permettermi|veicolo|macchina|\bmoto\b|barca|proprieta|\bcasa\b|\barma\b|\bkauf|kaufen|\bpreis|kosten|kostet|leisten|fahrzeug|\bauto\b|wagen|motorrad|\bboot|immobilie|\bhaus\b|waffe/ },
    { tab: 'activities', label: 'Le mie attività', re: /activit|grind|mission|par heure|rapporte|farm|braquage|gain net|per hour|an hour|\bearn|heist|payout|net gain|actividad|farmear|mision|por hora|rinde|golpe|atraco|ganancia neta|\bganar\b|attivita|missione|all'ora|per ora|\brende\b|\bcolpo\b|rapina|guadagno netto|guadagnare|farmare|aktivitat|pro stunde|verdien|einnahm|\bbringt|raububerfall|nettogewinn/ },
    { tab: 'goal', label: 'Il mio obiettivo', re: /objectif|million|atteindre|capital|economis|epargn|combien de temps|\bgoal|\breach|\bsave|saving|how long|objetivo|millon|llegar a|ahorr|cuanto tiempo|\bmeta\b|obiettivo|milion|arrivare a|raggiungere|risparmi|quanto tempo|\bziel|erreichen|sparen|wie lange/ }
  ];
  /* v7.60 (langues) : la page dit sa langue (<html lang>) : en français « 1 000 000 », « 1,5 million », « 250 k », « j'ai… » ;
     en anglais « 1,000,000 », « 1.5 million », « $200,000 », « 250k », « I have… », « 2 hours a day ». */
  const LANG = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  /* v7.61 : en espagnol, « 200.000 », « 1,5 millones », « 250 mil » (point des milliers, virgule décimale ; « 1.5 » reste un décimal) ;
     v7.63 : de même en italien (« 200.000 », « 1,5 milioni », « 250 mila ») */
  const toNumber = raw => { const t = String(raw).replace(/[\s  ]/g, ''); if (LANG === 'es' || LANG === 'it') return Number(/^\d+\.\d{1,2}$/.test(t) ? t : t.replace(/\./g, '').replace(',', '.')); return Number(LANG === 'fr' ? t.replace(',', '.') : LANG === 'de' ? t.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.') : t.replace(/,/g, '')); };
  /* v7.62 : en allemand « 1.000.000 », « 1,5 Millionen », « 200.000 $ », « 250 Tausend », « ich habe… », « 2 Stunden am Tag » */
  const UNIT = 'millionen|millions?|mio|millones|millon|milioni|milione|mille|thousand|tausend|milliarden?|mrd|miliardi|miliardo|billions?|mila|mil(?![a-z])|k(?![a-z])|m(?![a-z])';
  const scale = unit => /^(m|millions?|millones|millon|milioni|milione|millionen|mio)$/.test(unit) ? 1e6 : /^(k|mille|thousand|mil|mila|tausend)$/.test(unit) ? 1e3 : /^(billions?|miliardi|miliardo|milliarden?|mrd)$/.test(unit) ? 1e9 : 1;
  const SUFFIX = new RegExp('(\\d[\\d\\s\\u00a0\\u202f.,]*?)\\s*(' + UNIT + '|\\$)', 'g');
  const PREFIX = new RegExp('\\$\\s*(\\d[\\d,.]*\\d|\\d)\\s*(' + UNIT + ')?', 'g');
  function parseMoney(value) {
    const text = normalize(value);
    const amounts = [];
    const push = (num, unit) => { const amount = toNumber(num) * scale(unit || ''); if (Number.isFinite(amount) && amount >= 0 && amount <= 1e12) amounts.push(amount); };
    for (const match of text.matchAll(SUFFIX)) push(match[1], match[2] === '$' ? '' : match[2]);
    if (LANG === 'en') for (const match of text.matchAll(PREFIX)) push(match[1], match[2]);
    return amounts.length ? Math.max(...amounts) : null;
  }
  function parseMinutesPerDay(value) {
    const match = normalize(value).match(/(\d+(?:[.,]\d+)?)\s*(heures?|hours?|horas?|ore|ora|hrs?|stunden?|std|h|min(?:utes?|utos?|uti|uto|uten)?|mins?)\b/);
    if (!match) return null;
    const minutes = Number(match[1].replace(',', '.')) * (/^(?:h|ore|ora|stu|std)/.test(match[2]) ? 60 : 1);
    return Number.isFinite(minutes) && minutes > 0 && minutes <= 1e6 ? minutes : null;
  }
  /* L'argent que le joueur a déjà : « j'ai 200 000 $ » ; « I have $200,000 », « I've got 250k » */
  const HAVE_FR = /j'ai\s+(\d[\d\s.,]*?)\s*(millions?|mille|k(?![a-z])|m(?![a-z])|\$)/;
  const HAVE_EN = new RegExp("\\bi(?: have| ve got| ve| got| own)\\s+(?:got\\s+)?(\\$\\s*\\d[\\d,.]*(?:\\s*(?:" + UNIT + "))?|\\d[\\d\\s.,]*?\\s*(?:" + UNIT + "|\\$))");
  /* v7.61 : « tengo 200.000 $ », « tengo 1,5 millones » */
  const HAVE_ES = new RegExp('\\btengo\\s+(\\$\\s*\\d[\\d.,]*|\\d[\\d\\s.,]*?\\s*(?:millones|millon|mil(?![a-z])|k(?![a-z])|m(?![a-z])|\\$))');
  /* v7.63 : « ho 200.000 $ », « ho 1,5 milioni » */
  const HAVE_IT = new RegExp('\\bho\\s+(\\$\\s*\\d[\\d.,]*|\\d[\\d\\s.,]*?\\s*(?:milioni|milione|mila|k(?![a-z])|m(?![a-z])|\\$))');
  const HAVE_DE = new RegExp("\\bich\\s+(?:habe|hab|besitze)\\s+(?:schon\\s+|bereits\\s+)?(\\d[\\d\\s.,]*?\\s*(?:" + UNIT + "|\\$))");
  function haveAmount(text) { const m = text.match(HAVE_FR) || (LANG === 'de' ? text.match(HAVE_DE) : null) || (LANG === 'es' ? text.match(HAVE_ES) : null) || (LANG === 'it' ? text.match(HAVE_IT) : null) || (LANG !== 'fr' && LANG !== 'es' && LANG !== 'it' ? text.replace(/i'/g, 'i ').match(HAVE_EN) : null); return m ? parseMoney(m[0].replace(/^.*?(?=\$|\d)/, '')) : null; }
  function field(id, value) {
    const input = $(id);
    if (!input || value === null || value === undefined) return false;
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }
  function openTab(tab) {
    if (window.LKCalculator && window.LKCalculator.openTab) { window.LKCalculator.openTab(tab); return true; }
    const button = document.querySelector('[data-tab="' + tab + '"]');
    if (button) button.click();
    return !!button;
  }
  function applyGoal(values) {
    if (window.LKCalculator && window.LKCalculator.applyGoal) window.LKCalculator.applyGoal(values);
    else Object.keys(values).forEach(key => field('f-goal-' + key, values[key]));
  }
  function route(value) {
    const q = String(value || '').trim();
    if (!q) return null;
    const text = normalize(q);
    let intent = /objectif|million|atteindre|epargn|economis|\bgoal\b|objetivo|millon|ahorr|\bmeta\b|obiettivo|milion|raggiungere|risparmi|\bziel\b|sparen/.test(text) ? rules[rules.length - 1] : rules.find(rule => rule.re.test(text)) || rules[rules.length - 1];
    /* v7.59 (check ultime, CALC-11) : « quelle mission rapporte le plus en 90 minutes ? » parle d'activités, pas d'une partie ;
       le mot « minutes » seul ne suffit plus à ouvrir Mon temps de jeu quand la phrase parle de missions ou de gains. */
    if (intent.tab === 'session' && !/session|j'ai du temps|temps disponible|ce soir|i have (?:some )?time|tonight|partida|tengo tiempo|tiempo disponible|esta noche|sessione|ho tempo|tempo disponibile|stasera|ich habe zeit|zeit habe|heute abend/.test(text) && rules.find(r => r.tab === 'activities').re.test(text)) intent = rules.find(r => r.tab === 'activities');
    const amount = parseMoney(text), minutes = parseMinutesPerDay(text), changed = [];
    openTab(intent.tab);
    if (intent.tab === 'goal') {
      const params = {};
      const capital = haveAmount(text);
      if (capital !== null) { params.capital = capital; changed.push('i tuoi soldi sono inseriti'); }
      if (amount !== null && amount !== capital) { params.target = amount; changed.push('il tuo obiettivo è inserito'); }
      if (minutes !== null && minutes <= 1440) { params.dailyMinutes = minutes; changed.push('il tuo tempo di gioco è inserito'); }
      if (Object.keys(params).length) applyGoal(params);
    }
    if (intent.tab === 'session' && minutes !== null && field('f-session-minutes', minutes)) changed.push('il tuo tempo è inserito');
    if (intent.tab === 'plan') {
      /* Le business plan a ses propres cases : on remplit celles-là, jamais celles des huit calculs. */
      const capital = haveAmount(text);
      if (capital !== null && field('plan-capital', capital)) changed.push('i tuoi soldi sono inseriti nel piano');
      if (amount !== null && amount !== capital && (field('plan-price', amount) || field('plan-target', amount))) changed.push('il tuo obiettivo è inserito nel piano');
      if (minutes !== null && minutes <= 1440 && field('plan-daily', minutes)) changed.push('la durata delle tue partite è inserita');
    }
    if (intent.tab === 'purchase' && amount !== null && field('f-purchase-price', amount)) changed.push('il prezzo è inserito');
    /* v7.59 (check ultime, CALC-11) : « j'ai X $ » remplit « J'ai déjà » dans l'outil ouvert (même case partagée) ; un prix
       va aussi dans « Ça vaut le coup ? » ; un temps en minutes va dans « Mes activités ». Rien d'autre n'est deviné. */
    if (intent.tab !== 'goal' && intent.tab !== 'plan') {
      const capital = haveAmount(text);
      const capField = document.querySelector('#panel-' + intent.tab + ' input[data-field="goal.capital"]');
      if (capital !== null && capField && field(capField.id, capital)) changed.push('i tuoi soldi sono inseriti');
      if (intent.tab === 'roi' && amount !== null && amount !== capital && field('f-roi-purchase', amount)) changed.push('il prezzo è inserito');
      if (intent.tab === 'activities' && minutes !== null && minutes <= 1000000 && field('f-inverse-minutes', minutes)) changed.push('il tuo tempo è inserito');
    }
    return { tab: intent.tab, label: intent.label, done: changed };
  }
  function focusWorkshop() {
    const workshop = $('atelier');
    if (workshop) workshop.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  const form = $('calc-ask'), input = $('calc-ask-input'), out = $('calc-ask-out');
  function answer(value) {
    const result = route(value);
    if (!result) return;
    if (out) { out.textContent = result.label + (result.done.length ? ' · ' + result.done.join(' · ') : ': compila le caselle qui sotto.'); out.hidden = false; }
    focusWorkshop();
  }
  if (form && input) {
    form.addEventListener('submit', event => { event.preventDefault(); answer(input.value); });
    document.querySelectorAll('[data-ask]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.ask; answer(input.value); }));
  }
  document.querySelectorAll('[data-goal-preset]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.goalPreset);
    if (!Number.isFinite(target) || target < 0 || target > 1e12) return;
    openTab('goal'); applyGoal({ target }); focusWorkshop();
  }));
  document.querySelectorAll('[data-open-tab]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); openTab(button.dataset.openTab); focusWorkshop(); }));
  window.LKCalcHub = { route, parseMoney, parseMinutesPerDay };
}());
