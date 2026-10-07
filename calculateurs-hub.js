/* Intent shortcuts. Calculation and state ownership stay in LKCalculator. */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const normalize = value => String(value || '').replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'").replace(/[\u00a0\u202f]/g, ' ');
  const rules = [
    { tab: 'plan', label: 'Mon business plan', re: /business plan|mon plan|\bun plan\b|\ba plan\b|\bun piano\b|\bpiano per\b|\beinen plan\b|plan pour|dans \d+ jours|plan complet|etape par etape|quoi faire en premier|plan d'action|echeance|d'ici (le|la|\d)|en \d+ jours|avant le \d|prochaine partie|programme de la semaine|ou en suis-je|mission par mission|partie par partie|plan de secours|plan b|debloquer|rang \d|niveau \d|\bxp\b|my plan|step by step|what (?:should i|to) do first|action plan|deadline|in \d+ days|by (?:the )?\d|next session|weekly schedule|backup plan|\bunlock|\brank \d|\blevel \d|plan de negocio|mi plan|paso a paso|que (?:hago|hacer) primero|plan de accion|fecha limite|en \d+ dias|antes del \d|proxima partida|programa de la semana|mision por mision|partida por partida|plan (?:alternativo|de emergencia)|desbloquear|rango \d|nivel \d|piano aziendale|il mio piano|passo dopo passo|cosa fare prima|entro (?:il|la|\d)|in \d+ giorni|prossima partita|missione per missione|partita per partita|piano b|sbloccare|livello \d|grado \d|businessplan|mein plan|schritt fur schritt|was (?:mache|tue) ich zuerst|was zuerst tun|aktionsplan|\bfrist|bis zum \d|in \d+ tagen|nachste session|wochenplan|notfallplan|freischalt|\brang \d/ },
    { tab: 'compare', label: 'Quel achat choisir ?', re: /(?:bunker|hangar|club|boite de nuit|nightclub|night club|discoteca|club nocturno|agence|agency|agencia|agenzia|agentur|bureau|office|oficina|ufficio|buro|arcade|garage|garaje|entrepot|warehouse|almacen|magazzino|lagerhaus|labo(?:ratoire)?|lab|laboratorio|labor|car wash|kosatka|sous-marin|submarine|submarino|sottomarino|yacht|penthouse|atico|attico|villa|appartement|apartment|piso|appartamento|wohnung|maison|house|helico(?:ptere)?|helicopter|helicoptero|elicottero|hubschrauber|moto|motorcycle|motocicleta|motorrad|avion|plane|aereo|flugzeug|voiture|coche|macchina|bateau|boat|barco|barca|boot|jet|sub|bar|appart|jacht)\b[^?.!]{0,60}?\b(?:ou|or|o|oder) (?:[a-z'-]+ ){0,3}?(?:(?:le|la|les|l'|the|a|an|el|los|las|un|una|il|lo|gli|der|die|das|den|ein|eine) ?)?(?:bunker|hangar|club|boite de nuit|nightclub|night club|discoteca|club nocturno|agence|agency|agencia|agenzia|agentur|bureau|office|oficina|ufficio|buro|arcade|garage|garaje|entrepot|warehouse|almacen|magazzino|lagerhaus|labo(?:ratoire)?|lab|laboratorio|labor|car wash|kosatka|sous-marin|submarine|submarino|sottomarino|yacht|penthouse|atico|attico|villa|appartement|apartment|piso|appartamento|wohnung|maison|house|helico(?:ptere)?|helicopter|helicoptero|elicottero|hubschrauber|moto|motorcycle|motocicleta|motorrad|avion|plane|aereo|flugzeug|voiture|coche|macchina|bateau|boat|barco|barca|boot|jet|sub|bar|appart|jacht)|(?:mieux|meilleur|plutot|better|best|rather|mejor|meglio|besser|lieber|choisir|choose|elegir|scegliere|wahlen|acheter|buy|get|kaufen|comprar|comprare|prendre)\b.*\b(?:le|la|les|l'|un|une|the|a|an|el|il|lo|der|die|das|den|ein|eine) ?[a-z'-]+(?: (?:a|at|for|por|fur|zu) [\d.,]+ ?(?:[km]|millions?|millones|milioni|millionen|mille|mil|mila|tausend)?)?,? (?:ou|or|o|oder) (?:le|la|les|l'|un|une|the|a|an|el|il|lo|der|die|das|den|ein|eine) ?[a-z'-]+|\b[a-z'-]+ (?:a|at|for|por|fur|zu) [\d.,]+ ?(?:[km]|millions?|millones|milioni|millionen|mille|mil|mila|tausend)?,? (?:ou|or|o|oder) (?:(?:le|la|l'|the|a|an|el|il|lo|der|die|das) ?)?[a-z'-]+ (?:a|at|for|por|fur|zu) [\d.,]+|\bentre (?:le|la|les|l'|un|une) ?[a-z-]+.*\bet (?:le|la|les|l'|un|une) ?[a-z-]+|\bbetween (?:the|a|an) [a-z-]+.* and (?:the|a|an) [a-z-]+|\bentre (?:el|la|los|las|un|una) [a-z-]+.* y (?:el|la|los|las|un|una) [a-z-]+|\btra (?:il|la|lo|l'|un|una) ?[a-z-]+.* e (?:il|la|lo|l'|un|una) ?[a-z-]+|\bzwischen (?:dem|der|den|einem|einer) [a-z-]+.* und (?:dem|der|den|einem|einer) [a-z-]+|rapporte plus que|plus rentable que|earns more than|more profitable than|rinde mas que|mas rentable que|rende piu di|piu redditizio di|bringt mehr als|rentabler als|choisir|comparer|lequel|laquelle|le mieux|meilleur achat|rapport qualite|le plus rentable|le moins cher|\bou\b.*\bou\b|\bchoose|\bcompare|\bwhich (?:one|is|should)|best (?:buy|purchase|value)|value for money|most profitable|\bcheapest|elegir|\belijo\b|comparar|\bcual (?:compro|elijo|es mejor|me conviene)|el mejor|mejor compra|calidad.precio|mas rentable|mas barato|\bo (?:el|la)\b|scegliere|scelgo|confront|quale (?:compro|scelgo|e meglio|mi conviene|conviene)|il migliore|miglior acquisto|qualita.prezzo|il piu redditizio|il piu economico|il meno caro|\bwahlen|vergleich|\bwelche[nrs]?\s+(?:soll|ist besser|kauf|nehm)|am besten|bester kauf|preis-leistung|am rentabelsten|am billigsten|gunstigste/ },
    { tab: 'order', label: 'Quoi acheter d’abord ?', re: /commence par quoi|commence par quel|par quel achat|en 1er\b|par quoi (?:je )?commence|par quoi commencer|start with which|which (?:one )?first|por cual empiezo|da cosa comincio|womit fange ich an|\bordre\b|priorit|d'abord|en premier|sequence|\border\b|buy first|\bfirst\b|\borden\b|prioridad|primero|antes que nada|\bordine\b|priorita|prima di tutto|per primo|compro prima|cosa compro|reihenfolge|prioritat|\bzuerst\b|als erstes/ },
    { tab: 'roi', label: 'Ça vaut le coup ?', re: /rentab|\broi\b|amorti|retour sur|investi|seuil|vaut le coup|a partir de quand|rembours|vaut-il|ca vaut|profitab|worth it|is it worth|pay(?:s)? (?:for itself|back|off)|break.?even|return on|\binvest|amortiz|retorno|inversion|vale la pena|merece la pena|compensa|a partir de cuando|recupero|recuperar|conviene|ne vale la pena|vale la pena|redditiz|rientr|investiment|investire|da quando|ripag|\blohnt|amortis|zahlt sich|bezahlt gemacht|rendite/ },
    { tab: 'session', label: 'Mon temps de jeu', re: /session|j'ai du temps|ce soir|minutes?\b|temps disponible|i have (?:some )?time|time (?:i have|available)|available time|tonight|partida|tengo tiempo|tiempo disponible|esta noche|minutos?\b|sessione|ho tempo|tempo disponibile|stasera|minuti?\b|ich habe zeit|zeit habe|verfugbare zeit|heute abend|\bminuten\b/ },
    { tab: 'budget', label: 'Mon budget', re: /faire un budget|mon budget est|comment (?:les |le |l')?depenser|(?:que|quoi) faire avec|je mets combien|combien (?:je )?(?:mets|mettre)|how (?:do|should) i (?:budget|spend|split)|budget the rest|como (?:lo )?(?:reparto|gasto)|come (?:li |lo )?(?:spendo|divido)|wie teile ich|teile ich .{0,20}auf|\bdans quoi\b|\bou (?:mettre|placer|investir)\b|where (?:should i )?(?:put|invest|spend)|\bdivido\b|\breparto\b|verteile|repartir(?! de)|repartis\b|repartition|reserve|enveloppe|poste de depense|\bsplit\b|\bspread\b|allocat|divide (?:it|my)|presupuesto|dividir|ripart|suddivid|dividere|aufteil|verteil|rucklage/ },
    { tab: 'purchase', label: 'Mes achats', re: /\bje (?:le |la |l')?prends\b|\bje peux (?:prendre|me prendre|m'acheter|me payer|acheter)\b|\bcan i (?:get|buy|afford|take)\b|\bpuedo (?:comprar|pillar|coger)\b|\bposso (?:comprare|prendere|permettermi)\b|\bkann ich (?:mir )?(?:kaufen|holen|leisten)\b|(?:bunker|hangar|club|boite de nuit|nightclub|agence|agency|agencia|agenzia|agentur|bureau|office|oficina|ufficio|buro|arcade|entrepot|warehouse|kosatka|sous-marin|submarine|penthouse|helico|helicopter|garage|villa|yacht|appart|appartement|jet)\b.{0,20}\b(?:a|at|por|fur|zu|for|is|est|costs?|coute|cuesta|costa|kostet)\s+\$?[\d.,]+\s*(?:[km]\b|millions?|millones|milioni|millionen|mille|mil\b|mila|tausend)|achet|achat|prix|cout|permettre|m'offrir|me payer|villa|appartement|yacht|\bjet\b|helico|avion|vehicule|voiture|moto|bateau|propriete|maison|arme|budget|\bbuy|purchase|price|\bcost|afford|vehicle|\bcar\b|\bbike|motorcycle|\bboat|property|\bhouse|weapon|\bgun|\bcompr(?!en|is|es|eh)[a-z]*|precio|cuesta|coste|permitirme|vehiculo|coche|\bcarro\b|\bauto\b|barco|propiedad|\bcasa\b|\barma\b|pistola|acquist|prezzo|costa\b|costo|permettermi|veicolo|macchina|\bmoto\b|barca|proprieta|\bcasa\b|\barma\b|\bkauf|kaufen|\bpreis|kosten|kostet|leisten|fahrzeug|\bauto\b|wagen|motorrad|\bboot|immobilie|\bhaus\b|waffe/ },
    { tab: 'activities', label: 'Mes activités', re: /meilleur moyen de (?:se faire|gagner|faire)|best way to (?:make|earn)|mejor (?:manera|forma) de (?:ganar|hacer)|modo migliore (?:per|di) (?:guadagnare|fare)|beste weg,? (?:geld )?zu (?:verdienen|machen)|\by a mieux\b|is there (?:something )?better|hay algo mejor|c'e di meglio|gibt es (?:was|etwas) besseres|activit|grind|mission|par heure|rapporte|farm|braquage|gain net|per hour|an hour|\bearn|heist|payout|net gain|actividad|farmear|mision|por hora|rinde|golpe|atraco|ganancia neta|\bganar\b|attivita|missione|all'ora|per ora|\brende\b|\bcolpo\b|rapina|guadagno netto|guadagnare|farmare|aktivitat|pro stunde|verdien|einnahm|\bbringt|raububerfall|nettogewinn/ },
    { tab: 'goal', label: 'Mon objectif', re: /objectif|million|atteindre|capital|economis|epargn|combien de temps|\bgoal|\breach|\bsave|saving|how long|objetivo|millon|llegar a|ahorr|cuanto tiempo|\bmeta\b|obiettivo|milion|arrivare a|raggiungere|risparmi|quanto tempo|\bziel|erreichen|sparen|wie lange/ }
  ];
  /* v7.60 (langues) : la page dit sa langue (<html lang>) : en français « 1 000 000 », « 1,5 million », « 250 k », « j'ai… » ;
     en anglais « 1,000,000 », « 1.5 million », « $200,000 », « 250k », « I have… », « 2 hours a day ». */
  const LANG = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  /* v7.61 : en espagnol, « 200.000 », « 1,5 millones », « 250 mil » (point des milliers, virgule décimale ; « 1.5 » reste un décimal) ;
     v7.63 : de même en italien (« 200.000 », « 1,5 milioni », « 250 mila ») */
  const toNumber = raw => { const t = String(raw).replace(/[\s  ]/g, ''); if (LANG === 'es' || LANG === 'it') return Number(/^\d+\.\d{1,2}$/.test(t) ? t : t.replace(/\./g, '').replace(',', '.')); return Number(LANG === 'fr' ? (/^\d{1,3}(?:\.\d{3})+$/.test(t) ? t.replace(/\./g, '') /* lot 4 : « 200.000 » = 200 000 */ : t.replace(',', '.')) : LANG === 'de' ? t.replace(/\.(?=\d{3}(?!\d))/g, '').replace(',', '.') : t.replace(/,/g, '')); };
  /* v7.62 : en allemand « 1.000.000 », « 1,5 Millionen », « 200.000 $ », « 250 Tausend », « ich habe… », « 2 Stunden am Tag » */
  const UNIT = 'millionen|millions?|mio|millones|millon|milioni|milione|mille|thousand|tausend|milliarden?|milliards?|mrd|miliardi|miliardo|billions?|mila|mil(?![a-z])|k(?![a-z])|m(?![a-z])';
  const scale = unit => /^(m|millions?|millones|millon|milioni|milione|millionen|mio)$/.test(unit) ? 1e6 : /^(k|mille|thousand|mil|mila|tausend)$/.test(unit) ? 1e3 : /^(billions?|miliardi|miliardo|milliarden?|milliards?|mrd)$/.test(unit) ? 1e9 : 1;
  /* lot 5 (seconde relecture) : « dollars » est aussi une unité de montant (« 3 500 dollars ») */
  const CUR = /dollars?\b|dolares\b|dollari\b/.source;
  const SUFFIX = new RegExp('(\\d[\\d\\s\\u00a0\\u202f.,]*?)\\s*(' + UNIT + '|\\$|' + CUR + ')', 'g');
  const PREFIX = new RegExp('\\$\\s*(\\d[\\d,.]*\\d|\\d)\\s*(' + UNIT + ')?', 'g');
  function parseMoney(value) {
    const text = normalize(value);
    const amounts = [];
    const push = (num, unit) => { const amount = toNumber(num) * scale(unit || ''); if (Number.isFinite(amount) && amount >= 0 && amount <= 1e12) amounts.push(amount); };
    for (const match of text.matchAll(SUFFIX)) push(match[1], match[2] === '$' ? '' : match[2]);
    if (LANG === 'en') for (const match of text.matchAll(PREFIX)) push(match[1], match[2]);
    return amounts.length ? Math.max(...amounts) : null;
  }
  /* lot 5 (relecture) : une heure de la journée (« à 21h30 », « vers 20 h », « at 9pm ») n'est pas une durée de jeu ; une durée
     « par semaine » n'est pas une durée par jour : ni l'une ni l'autre n'est lue (avant : 1 290 min, ou 3 h par semaine lues par jour). */
  /* lot 5 (seconde relecture) : aussi « à 20 heures », « a las 9 h », « alle 21 » (avant : 1 200 min, 540 min) */
  const CLOCK = /\b(?:a|vers|des|jusqu'a|avant|apres|at|around|until|before|after|verso|dopo|um|gegen|bis|ab|nach)\s+\d{1,2}\s*(?:h(?:\s*\d{2})?|:\d{2}|heures?(?:\s+\d{2})?|uhr|am|pm)\b(?!\s*(?:par jour|chaque jour|per day|a day|al dia|al giorno|pro tag|am tag|de jeu|de libre|devant moi))|\b(?:a las|hacia las|sobre las|desde las|hasta las|alle|prima delle|dalle|verso le|entro le|fino alle)\s+\d{1,2}(?:[:.]\d{2})?(?:\s*(?:h|horas?|ore)\b)?|\b(?:1[3-9]|2[0-3])\s*h\s*\d{2}\b|\b(?:1[3-9]|2[0-4])\s*(?:h|heures?)\b(?!\s*(?:par|de jeu|de libre|chaque|a jouer|de suite|d'affilee|devant))/g;
  const PAST = /\b(?:mis|pris|fallu|depuis|took(?: me)?|spent|since|for the (?:last|past)|tarde|tardado|desde hace|messo|impiegato|gebraucht|verbracht|seit)\s+(?:environ\s+|about\s+|unos\s+|circa\s+|etwa\s+)?$/;
  const WEEKLY = /^\s*(?:par semaine|chaque semaine|a la semaine|per week|a week|each week|every week|por semana|a la semana|a settimana|alla settimana|ogni settimana|pro woche|die woche|in der woche|jede woche)\b/;
  /* lot 5 (seconde relecture) : toutes les durées de la phrase sont lues. Deux durées différentes : la dernière seulement si un mot de correction
     les sépare (« 1 h par jour, non plutôt 2 h ») ; sinon rien n'est écrit et c'est dit (« 1 h en semaine et 3 h le week-end »). Une durée
     « par mission » ou « chacune » n'est pas un temps de jeu ; une durée passée (« depuis 2 heures », « hier en 2 heures ») non plus. */
  function readMinutes(value) {
    const text = normalize(value).replace(/\b(on|il|elle|ca|qui|y|tu|j'en)\s+a\b/g, '$1 _').replace(CLOCK, ' ');
    const found = [], taken = [], skip = (st, en) => WEEKLY.test(text.slice(en)) || PAST.test(text.slice(0, st)) || EACH.test(text.slice(en)) || YESTERDAY.test(text.slice(Math.max(0, text.slice(0, st).search(/[^.,;:!?]*$/)), st));
    /* lot 4 : « 1h30 », « 1 h 30 » = 90 min (avant : la demi-heure était perdue) ; lot 5 (seconde relecture) : aussi « 1 heure 30 », « 2 heures 5 minutes » */
    for (const hm of text.matchAll(/(\d{1,2})\s*(?:h|heures?|hours?|horas?|ore|ora|stunden?|std)\s*(?:et\s+|and\s+|y\s+|e\s+|und\s+)?(\d{1,2})\s*(?:min(?:utes?|utos?|uti|uten)?\b)?(?!\s*(?:\d|[.,]\d|h\b|heures?|hours?|horas?|ore\b|ora\b|stunden?|jours?|days?|dias?|giorni|tagen?|\$|k\b|m\b|mille|millions?|thousand|tausend|mil\b|mila\b|joueurs?|players?|jugadores?|giocatori|spieler|fois|times|veces|volte|mal\b|ans?\b|years?|%|parties?|games?|sessions?|missions?))/g)) { const st = hm.index, en = st + hm[0].length; if (+hm[2] >= 60 || skip(st, en)) continue; taken.push([st, en]); found.push({ v: +hm[1] * 60 + +hm[2], st, en }); }
    for (const match of text.matchAll(/(\d+(?:[.,]\d+)?)\s*(heures?|hours?|horas?|ore|ora|hrs?|stunden?|std|h|min(?:utes?|utos?|uti|uto|uten)?|mins?)\b/g)) {
      const st = match.index, en = st + match[0].length;
      if (taken.some(([x, y]) => st < y && en > x) || skip(st, en)) continue;
      found.push({ v: Number(match[1].replace(',', '.')) * (/^(?:h|ore|ora|stu|std)/.test(match[2]) ? 60 : 1), st, en });
    }
    const xs = found.filter(d => Number.isFinite(d.v) && d.v > 0 && d.v <= 1e6).sort((x, y) => x.st - y.st);
    if (!xs.length) return { minutes: null };
    if (new Set(xs.map(d => d.v)).size === 1) return { minutes: xs[0].v };
    const p = xs[xs.length - 2], q = xs[xs.length - 1];
    return (CORRECTION[LANG] || CORRECTION.fr).test(text.slice(p.en, q.st)) ? { minutes: q.v, corrected: true } : { minutes: null, ambiguous: true };
  }
  function parseMinutesPerDay(value) { return readMinutes(value).minutes; }
  const EACH = /^\s*(?:par (?:mission|braquage|course|activite|partie)|chacune?\b|each\b|per (?:mission|heist|run|game)|por (?:mision|golpe|partida)|cada un[oa]\b|a (?:missione|colpo|partita)|ciascun[oa]\b|pro (?:mission|raub|runde)|jeweils\b)/;
  const YESTERDAY = /\b(?:hier|avant-hier|la derniere fois|yesterday|last (?:time|night)|ayer|anoche|ieri|stanotte|gestern)\b/;
  /* L'argent que le joueur a déjà : « j'ai 200 000 $ » ; « I have $200,000 », « I've got 250k » */
  const HAVE_FR = /j'ai\s+(\d[\d\s.,]*?)\s*(millions?|mille|k(?![a-z])|m(?![a-z])|\$)/;
  const HAVE_EN = new RegExp("\\bi(?: have| ve got| ve| got| own)\\s+(?:got\\s+)?(\\$\\s*\\d[\\d,.]*(?:\\s*(?:" + UNIT + "))?|\\d[\\d\\s.,]*?\\s*(?:" + UNIT + "|\\$))");
  /* v7.61 : « tengo 200.000 $ », « tengo 1,5 millones » */
  const HAVE_ES = new RegExp('\\btengo\\s+(\\$\\s*\\d[\\d.,]*|\\d[\\d\\s.,]*?\\s*(?:millones|millon|mil(?![a-z])|k(?![a-z])|m(?![a-z])|\\$))');
  /* v7.63 : « ho 200.000 $ », « ho 1,5 milioni » */
  const HAVE_IT = new RegExp('\\bho\\s+(\\$\\s*\\d[\\d.,]*|\\d[\\d\\s.,]*?\\s*(?:milioni|milione|mila|k(?![a-z])|m(?![a-z])|\\$))');
  const HAVE_DE = new RegExp("\\bich\\s+(?:habe|hab|besitze)\\s+(?:schon\\s+|bereits\\s+)?(\\d[\\d\\s.,]*?\\s*(?:" + UNIT + "|\\$))");
  function haveAmount(text) { const m = text.match(HAVE_FR) || (LANG === 'de' ? text.match(HAVE_DE) : null) || (LANG === 'es' ? text.match(HAVE_ES) : null) || (LANG === 'it' ? text.match(HAVE_IT) : null) || (LANG !== 'fr' && LANG !== 'es' && LANG !== 'it' ? text.replace(/i'/g, 'i ').match(HAVE_EN) : null); return m ? parseMoney(m[0].replace(/^.*?(?=\$|\d)/, '')) : null; }
  /* lot 4 (compréhension des demandes) : nombres écrits en lettres (« un million », « deux cent mille », « une demi-heure »),
     transformés en chiffres avant la lecture ; chaque langue de la page a sa petite liste. */
  const WORDS = {
    fr: { n: { un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, quinze: 15, vingt: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, 'deux cents': 200, 'deux cent': 200, 'trois cents': 300, 'trois cent': 300, 'quatre cents': 400, 'quatre cent': 400, 'cinq cents': 500, 'cinq cent': 500 }, scale: 'mille|millions?|milliards?', half: [[/\bun demi[- ]million\b/g, '0,5 million'], [/\bun million et demi\b/g, '1,5 million'], [/\bune demi[- ]heure\b|\bdemi[- ]heure\b/g, '30 min'], [/\b(\d+) ?h(?:eures?)? et demie?\b/g, '$1,5 h'], [/\b(\d+) ?h(?:eures?)? et quart\b/g, (m, h) => (+h * 60 + 15) + ' min'], [/\b(\d+) ?h(?:eures?)? (?:et )?trois quarts\b/g, (m, h) => (+h * 60 + 45) + ' min'], [/\bun (?:petit )?quart d'heure\b/g, '15 min'], [/\btrois quarts d'heure\b/g, '45 min']], hours: /\b(une?|deux|trois|quatre|cinq|six|sept|huit|neuf|dix) heures?\b/g },
    en: { n: { one: 1, a: 1, an: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, 'a hundred': 100, 'one hundred': 100, 'two hundred': 200, 'three hundred': 300, 'five hundred': 500 }, scale: 'thousand|millions?|billions?', half: [[/\bhalf a million\b/g, '0.5 million'], [/\bhalf an hour\b/g, '30 min'], [/\ban hour and a half\b/g, '90 min'], [/\b(\d+) hours? and a half\b/g, (m, h) => (+h * 60 + 30) + ' min'], [/\b(\d+) hours? and a quarter\b/g, (m, h) => (+h * 60 + 15) + ' min'], [/\b(?:a )?quarter of an hour\b/g, '15 min'], [/\bthree quarters of an hour\b/g, '45 min'], [/\ban hour and a quarter\b/g, '75 min']], hours: /\b(an?|one|two|three|four|five|six|seven|eight|nine|ten) hours?\b/g },
    es: { n: { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, quince: 15, veinte: 20, treinta: 30, cincuenta: 50, cien: 100, doscientos: 200, trescientos: 300, quinientos: 500 }, scale: 'mil|millon(?:es)?', half: [[/\bmedio millon\b/g, '0,5 millones'], [/\bmedia hora\b/g, '30 min'], [/\bun cuarto de hora\b/g, '15 min'], [/\btres cuartos de hora\b/g, '45 min'], [/\b(\d+) horas? y media\b/g, '$1,5 h'], [/\b(\d+) horas? y cuarto\b/g, (m, h) => (+h * 60 + 15) + ' min']], hours: /\b(una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez) horas?\b/g },
    it: { n: { un: 1, uno: 1, una: 1, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, quindici: 15, venti: 20, trenta: 30, cinquanta: 50, cento: 100, duecento: 200, trecento: 300, cinquecento: 500 }, scale: 'mila|mille|milion[ei]|miliard[io]', half: [[/\bmezzo milione\b/g, '0,5 milioni'], [/\bun'?ora e mezz[oa]\b/g, '90 min'], [/\bun'?ora e un quarto\b/g, '75 min'], [/\bun'ora\b/g, '1 ora'], [/\bmezz'?ora\b/g, '30 min'], [/\bun quarto d'ora\b/g, '15 min'], [/\btre quarti d'ora\b/g, '45 min'], [/\b(\d+) or[ae] e mezz[oa]\b/g, '$1,5 h'], [/\b(\d+) or[ae] e un quarto\b/g, (m, h) => (+h * 60 + 15) + ' min']], hours: /\b(un'?|una|due|tre|quattro|cinque|sei|sette|otto|nove|dieci) or[ae]\b/g },
    de: { n: { ein: 1, eine: 1, einen: 1, einer: 1, zwei: 2, drei: 3, vier: 4, funf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, funfzehn: 15, zwanzig: 20, dreissig: 30, funfzig: 50, hundert: 100, zweihundert: 200, dreihundert: 300, funfhundert: 500 }, scale: 'tausend|millionen|million|milliarden?', half: [[/\beine halbe million\b/g, '0,5 millionen'], [/\beine halbe stunde\b|\bhalbe stunde\b/g, '30 min'], [/\b(?:anderthalb|eineinhalb) stunden?\b/g, '90 min'], [/\beine viertelstunde\b|\bviertelstunde\b/g, '15 min'], [/\beine dreiviertelstunde\b|\bdreiviertelstunde\b/g, '45 min'], [/\b(\d+)(?:,5| ?einhalb) stunden?\b/g, (m, h) => (+h * 60 + 30) + ' min']], hours: /\b(einer?|zwei|drei|vier|funf|sechs|sieben|acht|neun|zehn) stunden?\b/g }
  };
  /* lot 5 (relecture) : en français, un nombre écrit en lettres est lu en entier (« vingt-cinq », « quatre-vingt », « trois cent
     cinquante », « soixante et onze ») avant son unité ; avant, seul le dernier mot était lu (« vingt-cinq mille » → 5 000). */
  const FR_NUM = { zero: 0, un: 1, une: 1, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60, cent: 100, cents: 100 };
  const FR_SEQ = /\b((?:zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?)(?:(?:[\s-]+et[\s-]+|[\s-]+)(?:zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?))*)\s+(mille|millions?|milliards?|dollars?|heures?|minutes?|joueurs?|parties?|jours?|semaines?|missions?)\b/g;
  function frSmall(seq) {
    let hundreds = 0, rest = 0;
    for (const w of seq.split(/[\s-]+/).filter(x => x && x !== 'et')) {
      const v = FR_NUM[w];
      if (v === 100) { hundreds = (rest || 1) * 100; rest = 0; }
      else if (v === 20 && rest % 10 === 4 && rest < 10) rest = 80; // quatre-vingt(s) = 80
      else rest += v;
    }
    return hundreds + rest;
  }
  const FR_MILLE = /\b(\d{1,3}) mille ((?:zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?)(?:(?:[\s-]+et[\s-]+|[\s-]+)(?:zero|un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingts?|trente|quarante|cinquante|soixante|cents?))*|\d{1,3})\b(?![\s-]*(?:mille|millions?|milliards?|\d|[.,]\d|joueurs?|heures?|h\b|minutes?|min\b|jours?|semaines?|parties?|missions?|ans?\b|fois))/g;
  const MINW = { fr: { cinq: 5, dix: 10, quinze: 15, vingt: 20, 'vingt cinq': 25, trente: 30, 'trente cinq': 35, quarante: 40, 'quarante cinq': 45, cinquante: 50, 'cinquante cinq': 55 }, en: { five: 5, ten: 10, fifteen: 15, twenty: 20, 'twenty five': 25, thirty: 30, 'thirty five': 35, forty: 40, 'forty five': 45, fifty: 50, 'fifty five': 55 }, es: { cinco: 5, diez: 10, quince: 15, veinte: 20, veinticinco: 25, treinta: 30, 'treinta y cinco': 35, cuarenta: 40, 'cuarenta y cinco': 45, cincuenta: 50, 'cincuenta y cinco': 55 }, it: { cinque: 5, dieci: 10, quindici: 15, venti: 20, venticinque: 25, trenta: 30, trentacinque: 35, quaranta: 40, quarantacinque: 45, cinquanta: 50, cinquantacinque: 55 }, de: { funf: 5, zehn: 10, funfzehn: 15, zwanzig: 20, dreissig: 30, vierzig: 40, funfundvierzig: 45, funfzig: 50 } };
  const RANGE_MID = { fr: /\b(?:de|entre)\s+(\d{1,2})\s*(?:h|heures?)(?:\s*(\d{2}))?\s+(?:a|et)\s+(minuit|midi)\b/g, en: /\b(?:from|between)\s+(\d{1,2})(?::(\d{2}))?\s*(?:pm)?\s+(?:to|until|till|and)\s+(midnight|noon)\b/g, es: /\bde(?: las)?\s+(\d{1,2})(?:[:.](\d{2}))?(?: ?h)?\s+a\s+(medianoche|mediodia)\b/g, it: /\bdalle\s+(\d{1,2})(?:[:.](\d{2}))?\s+a\s+(mezzanotte|mezzogiorno)\b/g, de: /\bvon\s+(\d{1,2})(?:[:.](\d{2}))?(?: uhr)?\s+bis\s+(mitternacht|mittag)\b/g };
  const RANGE = { fr: [/\b(?:de|entre)\s+(\d{1,2})\s*(?:h|heures?)(?:\s*(\d{2}))?\s+(?:a|et)\s+(\d{1,2})\s*(?:h|heures?)(?:\s*(\d{2}))?\b/g], en: [/\b(?:from|between)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s+(?:to|until|till|and)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/g, /\b(?:from|between)\s+(\d{1,2}):(\d{2})\s+(?:to|until|till|and)\s+(\d{1,2}):(\d{2})\b/g], es: [/\bde las (\d{1,2})(?:[:.](\d{2}))?(?: ?h)? a las (\d{1,2})(?:[:.](\d{2}))?(?: ?h)?\b/g], it: [/\bdalle (\d{1,2})(?:[:.](\d{2}))? alle (\d{1,2})(?:[:.](\d{2}))?\b/g], de: [/\bvon (\d{1,2})(?:[:.](\d{2}))?(?: uhr)? bis (\d{1,2})(?:[:.](\d{2}))? uhr\b/g] };
  function span(m, ...g) {
    const at = g[g.length - 2], all = g[g.length - 1], en = g.length >= 8, [h1, m1, h2, m2] = en ? [g[0], g[1], g[3], g[4]] : g.slice(0, 4);
    /* « passer de 2 h à 3 h par jour » parle de durées, pas d'heures de la journée : rien n'est changé */
    if (/\b(?:passer|aller|augmenter|monter|baisser|reduire|go|increase|pasar|aumentar|passare|aumentare|erhohen)\s+$/.test(all.slice(Math.max(0, at - 20), at)) || /^\s*(?:par jour|chaque jour|de jeu|per day|a day|al dia|al giorno|pro tag|am tag)/.test(all.slice(at + m.length))) return m;
    if (+h1 > 24 || +h2 > 24 || +(m1 || 0) >= 60 || +(m2 || 0) >= 60) return m;
    const clock = (h, x) => x === 'pm' ? (+h % 12) + 12 : x === 'am' ? +h % 12 : +h;
    const a = (en ? clock(h1, g[2] || g[5]) : +h1) * 60 + +(m1 || 0), b = (en ? clock(h2, g[5]) : +h2) * 60 + +(m2 || 0);
    const d = b > a ? b - a : b - a + 1440;
    return d > 0 && d <= 720 ? d + ' min' : m;
  }
  function wordsToDigits(text) {
    const W = WORDS[LANG] || WORDS.fr; let t = text;
    if (LANG === 'fr') t = t.replace(FR_SEQ, (m, seq, unit) => { const n = frSmall(seq); return n > 0 && n < 1000 ? n + ' ' + unit : m; });
    /* lot 5 (seconde relecture) : « trois mille cinq cents dollars » = 3 500 (avant : 3 000) ; suivi d'un nombre de joueurs, d'heures… : rien */
    if (LANG === 'fr') t = t.replace(FR_MILLE, (m, a, seq) => { const n = /^\d/.test(seq) ? +seq : frSmall(seq); return n > 0 && n < 1000 ? String(+a * 1000 + n) : m; });
    /* lot 5 (seconde relecture) : une plage horaire (« de 20 h à 22 h », « from 8 to 10 pm », « dalle 20 alle 22 ») est une durée */
    for (const re of RANGE[LANG] || RANGE.fr) t = t.replace(re, span);
    t = t.replace(RANGE_MID[LANG] || RANGE_MID.fr, (m, h, mm, end) => { const noon = /^(?:midi|noon|mediodia|mezzogiorno|mittag)$/.test(end), start = (LANG === 'en' && +h < 12 && !noon ? +h + 12 : +h) * 60 + +(mm || 0), stop = noon ? 720 : 1440, d = stop - start; return d > 0 && d <= 720 ? d + ' min' : m; });
    /* une heure en lettres d'abord (« deux heures et demie » → « 2 heures et demie »), puis les demies : avant, la demie était perdue */
    t = t.replace(/\b(\d+)\s?([mk])(\d{1,2})\b/g, (m, a, u, b) => a + (LANG === 'en' ? '.' : ',') + b + ' ' + u); /* lot 5 (seconde relecture) : « 1M2 » = 1,2 M, « 1k5 » = 1 500 */
    t = t.replace(W.hours, (m, w, at, all) => { if (/(?:\d ?[km]?|\$|dollars?|thousand|millions?)\s*$/.test(all.slice(Math.max(0, at - 12), at)) && /^an? /.test(m)) return m; const k = w.replace(/'$/, ''); const n = W.n[k] !== undefined ? W.n[k] : W.n[w]; return n === undefined ? m : n + ' ' + m.slice(m.indexOf(' ') + 1); });
    for (const [re, to] of W.half) t = t.replace(re, to);
    /* lot 5 (seconde relecture) : des minutes en lettres après une heure (« une heure trente », « one hour forty-five ») */
    const MW = MINW[LANG] || MINW.fr, mk = Object.keys(MW).sort((a, b) => b.length - a.length).map(k => k.replace(/[ -]/g, '[\\s-]+'));
    if (mk.length) t = t.replace(new RegExp(/\b(\d{1,2}) (h|heures?|hours?|horas?|ore|ora|stunden?) (?:et |and |y |e |und )?/.source + '(' + mk.join('|') + ')' + /\b(?![\s-]*(?:mille|thousand|mil|mila|tausend|millions?|\d))/.source, 'g'), (m, h, u, w) => h + ' h ' + MW[w.replace(/[\s-]+/g, ' ')]);
    const keys = Object.keys(W.n).sort((a, b) => b.length - a.length).map(k => k.replace(/ /g, '\\s+'));
    /* un mot-nombre collé à un autre (« twenty-five thousand », « two hundred fifty thousand ») : rien n'est lu plutôt qu'un nombre faux */
    const words = new Set(Object.keys(W.n).flatMap(k => k.split(' ')).concat(['hundred', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety', 'veinte', 'treinta', 'cuarenta', 'sesenta', 'setenta', 'ochenta', 'noventa', 'cientos', 'venti', 'trenta', 'quaranta', 'sessanta', 'settanta', 'ottanta', 'novanta', 'zwanzig', 'dreissig', 'vierzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig', 'und']));
    const glued = (s, at) => { const before = s.slice(0, at); return /-\s*$/.test(before) || words.has((before.match(/([a-z']+)[\s-]*$/) || [])[1]); };
    t = t.replace(new RegExp('\\b(' + keys.join('|') + ')\\s+(' + W.scale + ')\\b', 'g'), (m, w, unit, at, s) => glued(s, at) ? m : W.n[w.replace(/\s+/g, ' ')] + ' ' + unit);
    t = t.replace(new RegExp('\\b(' + keys.join('|') + ')\\s+(' + /joueurs?|players?|jugadores?|giocatori|spielern?|amis?|potes?|copains?|copines?|friends?|amig[oa]s?|amici|amiche|freunde?n?/.source + ')\\b', 'g'), (m, w, unit, at, s) => glued(s, at) ? m : W.n[w.replace(/\s+/g, ' ')] + ' ' + unit);
    /* lot 5 (seconde relecture) : « tre settimane », « deux semaines » : un nombre en lettres (2 et plus : jamais un article « a day ») avant des jours ou des semaines */
    const big = Object.keys(W.n).filter(k => W.n[k] >= 2).sort((a, b) => b.length - a.length).map(k => k.replace(/ /g, '\\s+'));
    t = t.replace(new RegExp('\\b(' + big.join('|') + ')\\s+(' + /jours?|semaines?|days|weeks|dias|semanas|giorni|settimane|tage|tagen|wochen/.source + ')\\b', 'g'), (m, w, unit, at, s0) => glued(s0, at) ? m : W.n[w.replace(/\s+/g, ' ')] + ' ' + unit);
    if (LANG === 'fr') {
      t = t.replace(/(\d+(?:,\d+)?) millions? (?:et )?(\d{1,3}) mille\b/g, (m, a, b) => String(Math.round(Number(a.replace(',', '.')) * 1e6 + Number(b) * 1e3)));
      t = t.replace(/(\d+) (millions?) et demi\b/g, '$1,5 $2');
      /* lot 5 (seconde relecture) : « un million deux » = 1,2 million (suivi d'aucune unité) */
      t = t.replace(/\b(\d+) (millions?) (un|deux|trois|quatre|cinq|six|sept|huit|neuf)\b(?![\s-]*(?:cents?|mille|millions?|joueurs?|heures?|h\b|minutes?|jours?|semaines?|parties?|missions?|voitures?|ans?\b|fois|\d|vingt|trente|quarante|cinquante|soixante|dix|onze|douze|treize|quatorze|quinze|seize))/g, (m, a, u, w) => a + ',' + W.n[w] + ' ' + u);
      t = t.replace(/\bon (joue|est|sera) a (deux|trois|quatre|cinq|six|sept|huit)\b/g, (m, v, w) => 'on ' + v + ' a ' + W.n[w]);
    }
    if (LANG === 'en') t = t.replace(/(\d+) (millions?) and a half\b/g, '$1.5 $2');
    /* lot 5 (seconde relecture) : la demie après un million, dans chaque langue */
    if (LANG === 'es') t = t.replace(/(\d+) (millon(?:es)?) y medio\b/g, '$1,5 $2');
    if (LANG === 'it') t = t.replace(/(\d+) (milion[ei]) e mezzo\b/g, '$1,5 $2');
    if (LANG === 'de') t = t.replace(/\b(?:eineinhalb|anderthalb) (millionen|million)\b/g, '1,5 $1');
    /* lot 5 : « 50 000 $ en une heure » est un gain par heure, pas une durée de jeu */
    /* lot 5 (seconde relecture) : sauf « en une heure par jour » (une durée par jour, pas un gain par heure) */
    t = t.replace(/(\$|dollars?|\d ?[km]|\d|thousand|millions?|mille|mil|mila|tausend)\s+(?:en 1 ?(?:h|heure)|in (?:1|one|an) hour|en 1 hora|in 1 or[ae]|in un'?ora|in 1 stunde|in einer stunde)\b(?!\s*(?:de jeu\s+)?(?:par jour|chaque jour|tous les jours|a day|per day|each day|every day|al dia|cada dia|por dia|al giorno|ogni giorno|pro tag|am tag|jeden tag|taglich))/g, '$1 /h');
    return t;
  }
  /* lot 4 : montants avec leur place dans la phrase. En plus des montants avec unité (« 250 k », « 1,5 million », « 200 000 $ »), un
     nombre nu compte comme argent s'il est grand (5 chiffres et plus, ou des milliers séparés : « 200 000 », « 200.000 ») et n'est
     suivi d'aucune unité de temps ou de nombre (minutes, heures, jours, parties, joueurs, fois, %) : une année (« 2026 ») n'en est pas un. */
  const NOT_MONEY = /^[\s,.]*(?:min|h\b|heure|hour|hora|ora\b|ore\b|stund|std|jour|day|dia|giorn|tag|partie|session|game|partida|partit|spiel|joueur|player|jugador|giocator|spieler|fois|times|veces|volte|mal\b|%|km|mph|ans?\b|years?|anos|anni|jahre)/;
  function mentions(text) {
    const out = [], taken = [];
    const add = (start, end, num, unit) => { const amount = toNumber(num) * scale(unit || ''); if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) return; if (taken.some(([a, b]) => start < b && end > a)) return; taken.push([start, end]); out.push({ value: amount, start, end, negative: /(?:^|[\s(:=])[-\u2212]\$?$/.test(text.slice(Math.max(0, start - 3), start)) }); };
    /* lot 5 (seconde relecture) : « $200k » : le « $ » qui précède fait partie du montant (avant, il restait collé à « I have » et le rôle était perdu) */
    for (const m of text.matchAll(SUFFIX)) { const num = m[1].replace(/[\s.,]+$/, ''); if (!/\d/.test(num)) continue; let st = m.index; const pre = text.slice(Math.max(0, st - 2), st).match(/\$\s?$/); if (pre && !taken.some(([a, b]) => st - pre[0].length < b && st > a)) st -= pre[0].length; add(st, m.index + m[0].length, num, /^(?:\$|dollars?|dolares|dollari)$/.test(m[2]) ? '' : m[2]); }
    if (LANG === 'en') for (const m of text.matchAll(PREFIX)) add(m.index, m.index + m[0].length, m[1], m[2]);
    const BARE = LANG === 'en' ? /\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d{5,}/g : LANG === 'fr' ? /\d{1,3}(?:[   .]\d{3})+(?:,\d+)?|\d{5,}/g : /\d{1,3}(?:[.   ]\d{3})+(?:,\d+)?|\d{5,}/g;
    /* lot 4 : un petit nombre juste après « j'ai », « je pars de », « passer de »… (« passer de 0 à 500 000 $ ») est de l'argent ;
       lot 5 (relecture) : seulement 0, ou un nombre suivi de « dollars » (« j'ai 2 voitures », « à 2 missions », « 5 ou 6 heures » : rien) */
    for (const m of text.matchAll(/(?:j'ai|je pars de|passer de|je suis a)\s+(\d{1,4}(?:[.,]\d+)?)\b/g)) { const st = m.index + m[0].length - m[1].length, end = m.index + m[0].length, rest = text.slice(end); if (NOT_MONEY.test(rest) || /^\s*(?:\d|k\b|m\b|mille|million)/.test(rest)) continue; if (toNumber(m[1]) !== 0 && !/^\s*dollars?\b/.test(rest)) continue; add(st, end, m[1], ''); }
    /* lot 5 (seconde relecture) : un grand nombre sans unité n'est de l'argent que s'il est suivi de la fin de la phrase, d'une ponctuation,
       d'une monnaie, d'un petit mot de liaison ou d'un rôle connu (« par heure », « de frais », « en poche »…) : « 25 000 RP » n'en est pas */
    for (const m of text.matchAll(BARE)) { const end = m.index + m[0].length, rest = text.slice(end, end + 40); if (/[\d.,]$/.test(text.slice(m.index - 1, m.index)) && m.index > 0) continue; if (NOT_MONEY.test(rest) || !(BARE_NEXT.test(rest) || HOURLY.test(rest) || OTHER_AFTER.test(rest) || MORE_AFTER.test(rest) || DIST_AFTER.test(rest) || ((ROLE[LANG] || ROLE.fr).haveAfter || /$^/).test(rest))) continue; add(m.index, end, m[0], ''); }
    return out.sort((a, b) => a.start - b.start);
  }
  const BARE_NEXT = /^(?:\s*$|\s*[,.;:!?)\u2026\u2013\u2014-]|\s*\$|\s+(?:dollars?|dolares|dollari|balles|de cash|en cash|cash|en liquide|de cote|et|ou|mais|donc|alors|and|or|but|so|y|o|pero|e|ma|und|oder|aber|pour|avant|d'ici|en|dans|sous|avec|sans|a|au|for|before|by|within|in|with|without|at|para|antes|con|sin|per|prima|entro|senza|fur|vor|bis|mit|ohne|um|maintenant|deja|environ|now|already|ahora|ya|ora|gia|jetzt|schon|je|j'|i|tengo|ho|ich|il|objectif|goal|objetivo|obiettivo|ziel)\b)/;
  /* rôle d'un montant selon les mots juste avant lui (ce qu'on a, ce qu'on vise, ce que coûte un achat) */
  const ROLE = {
    fr: { have: /(?:j'ai|j ai|j'en ai|j en ai|je n'ai que|je n ai que|je possede|il me reste|je dispose de|mon argent est de|je pars de|je commence avec|passer de|je suis a|j'en suis a|je suis deja a|on est a|on en est a|nous sommes a|\bmes|\bmon|\bdoubler|\btripler|\bjai|j'ai (?:deja )?(?:economise|epargne|amasse|accumule|mis de cote)|\bbudget(?: de| :| est de)?|\brepartir|\bfaire avec|\bje repartis|\bpartager|\bdiviser|\bje divise)\s*(?:deja|actuellement|environ|a peu pres|pres de|presque|seulement|que)?\s*$/, target: /(?:veux|voudrais|vise|viser|objectif(?: de| d'| :)?|but(?: de| d'| :)?|atteindre|arriver a|avoir|economiser|epargner|gagner|amasser|mettre de cote|faire|jusqu'a|il me faut|il me faudrait|besoin de)\s*(?:au moins|environ|pres de|un total de)?\s*$/, missing: /(?:il me manque|il m'en manque|m'en manque|il manque|me manque|manque)\s*(?:encore)?\s*$/,  price: /(?:\ba|pour|coute|coutant|prix(?: de| :)?|vaut|valant|payer|achat de|acheter)\s*(?:environ|pres de)?\s*$/, haveAfter: /^\s*(?:\$\s*)?(?:en poche|sur moi|sur mon compte|sur le compte|en banque|a la banque|en cash|en liquide|en especes|d'economies|de cote pour commencer|au depart|au debut|pour commencer)/, haveScope: /(?:j'ai|j ai|je possede|je dispose de)(?:\s*(?:,|et\b|aussi\b|deja\b|actuellement\b|environ\b|en tout\b|au total\b|maintenant\b|aujourd'hui\b|en ce moment\b|seulement\b|juste\b|encore\b|(?:\d[\d\s.,]*|une?|des|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)\s+[a-z']+(?:\s+(?:par|chaque|tous les|toutes les)\s+(?:jours?|semaines?|soirs?|parties?|sessions?))?))*\s*$/ },
    en: { have: /(?:i have|i(?:'| )?ve got|i(?:'| )ve|i got|i own|i already have|i(?:'| )?m starting with|i start with|\bmy|\bdouble|\btriple|\bsplit|\bdivide|\ballocate|\bspread|i ve saved|i have saved|i saved)\s*(?:already|about|around|only|just)?\s*$/, target: /(?:want(?: to (?:have|reach|get|make|save|earn))?|would like|aim(?: for| at)?|goal(?: of| is)?|target(?: of| is)?|reach|get to|\bget|save|make|earn|i need|need)\s*(?:at least|about|around)?\s*$/, missing: /(?:i(?:'m| m| am) missing|missing|still need|i need another|another|short(?: of)?)\s*$/, price: /(?:for|costs?|costing|price(?: of| is)?|priced at|at|buy|pay)\s*(?:about|around)?\s*$/ },
    es: { have: /(?:tengo|ya tengo|dispongo de|cuento con|empiezo con|\bmis|\bduplicar|\bdoblar|\btriplicar|\brepartir|\breparto|\bdividir|\bdivido|\bhe ahorrado|\btengo ahorrados?)\s*(?:ya|unos|unas|casi|solo)?\s*$/, target: /(?:quiero(?: tener| llegar a| ahorrar| ganar)?|quisiera|objetivo(?: de)?|meta(?: de)?|llegar a|ahorrar|ganar|juntar|necesito|me hace falta)\s*(?:al menos|unos|unas)?\s*$/, missing: /(?:me faltan?|faltan?)\s*(?:todavia|aun)?\s*$/, price: /(?:por|cuesta|precio(?: de)?|\ba|comprar|pagar)\s*(?:unos|unas)?\s*$/ },
    it: { have: /(?:\bho|ho gia|dispongo di|parto da|parto con|\bi miei|\bmiei|\braddoppiare|\btriplicare|\bripartire|\bripartisco|\bdividere|\bdivido|\bho risparmiato)\s*(?:gia|circa|quasi|solo)?\s*$/, target: /(?:voglio(?: avere| arrivare a| risparmiare| guadagnare)?|vorrei|obiettivo(?: di)?|arrivare a|raggiungere|risparmiare|guadagnare|mettere da parte|mi serve|mi servono|ho bisogno di)\s*(?:almeno|circa)?\s*$/, missing: /(?:mi mancano|mi manca|mancano|manca)\s*(?:ancora)?\s*$/, price: /(?:\bper|costa|prezzo(?: di)?|\ba|comprare|pagare)\s*(?:circa)?\s*$/ },
    de: { have: /(?:ich habe|ich hab|ich besitze|ich habe schon|ich habe bereits|ich starte mit|\bhabe|\bbesitze|\bmeine[mn]?|\bverteile ich|\bverteilen|\baufteilen|\bteile ich|\bhabe ich gespart|\bich habe gespart)\s*(?:schon|bereits|etwa|ungefahr|nur)?\s*$/, target: /(?:will|mochte|ziel(?: von| ist)?|erreichen|sparen|verdienen|kommen auf|brauche|ich brauche)\s*(?:mindestens|etwa)?\s*$/, missing: /(?:mir fehlen|es fehlen|fehlen|mir fehlt|fehlt)\s*(?:noch)?\s*$/, price: /(?:fur|kostet|preis(?: von)?|zu|kaufen|zahlen)\s*(?:etwa|ungefahr)?\s*$/ }
  };
  const WITH = { fr: /\bavec\s*(?:deja|environ|seulement|a peu pres|mes|mon|ma)?\s*$/, en: /\bwith\s*(?:my|only|about|around)?\s*$/, es: /\bcon\s*(?:mis|solo|unos|unas)?\s*$/, it: /\bcon\s*(?:i miei|solo|circa)?\s*$/, de: /\bmit\s*(?:meinen|nur|etwa)?\s*$/ };
  const WITH_END = /^\s*(?:\$\s*)?(?:$|[,.;:!?)]|et\b|mais\b|je\b|j'|on\b|en poche|de cote|au depart|pour commencer|sur moi|en banque|d'economies|combien|quel|quoi|est-ce|and\b|but\b|how\b|what\b|which\b|can\b|could\b|should\b|in the bank|to start|y\b|pero\b|que\b|cuanto|cual|para empezar|e\b|ma\b|quanto|quale|cosa|per iniziare|und\b|aber\b|wie\b|was\b|welche|zum start)/;
  /* lot 4 : « 200 000 $ par heure », « 80 000 $ de l'heure », « $50k an hour » : c'est un gain par heure, ni un but ni un prix */
  /* lot 5 (seconde relecture) : aussi « 50 000 $ de gain par heure », « toutes les heures » ; « à l'heure actuelle », « à l'heure où… » n'en sont pas */
  const HOURLY = /^\s*(?:\$\s*)?(?:(?:de |d')?(?:gains?|revenus?|benefices?|profits?|bruts?|nets?)\s+|(?:in |of )?(?:profit|income|earnings|revenue|net|gross)\s+|(?:de )?(?:ganancias?|beneficios?|ingresos|netos?)\s+|(?:di )?(?:guadagno|guadagni|profitto|profitti|netti?)\s+|(?:gewinn|einnahmen|netto)\s+)?(?:par heure|de l'heure|a l'heure(?!\s*(?:actuelle|actuel|ou\b|qu|d'aujourd'hui|ci\b))|toutes les heures|chaque heure|\/ ?h\b|\/ ?heure|per hour|an hour|a hour|every hour|each hour|\/ ?hr?\b|por hora|a la hora|cada hora|all'ora|l'ora|ogni ora|pro stunde|die stunde|in der stunde|jede stunde)/;
  /* lot 5 (relecture) : « mais / but / pero / ma / aber » ne corrigent rien (« j'ai 300 000 $ mais il me faut 1 million ») ; une
     correction ne compte que si, entre les deux montants, il n'y a que des mots de correction et de la ponctuation. */
  const CORRECTION = { fr: /\b(?:non|pardon|plutot|en fait|je veux dire|je voulais dire|enfin|correction|oups|je me suis trompe|je corrige)\b/, en: /\b(?:no|sorry|actually|i mean|i meant|rather|correction|oops|make that|wait)\b/, es: /\b(?:no|perdon|mejor dicho|en realidad|quiero decir|queria decir|corrijo)\b/, it: /\b(?:no|scusa|anzi|cioe|in realta|volevo dire|correggo|o meglio)\b/, de: /\b(?:nein|nee|noe|sorry|eigentlich|ich meine|ich meinte|besser gesagt|korrektur|oder besser)\b/ };
  const CORR_WORDS = { fr: /non|pardon|plutot|en fait|je veux dire|je voulais dire|enfin|correction|oups|je me suis trompe|je corrige|euh|heu|bon|oh|ah|ou/, en: /no|sorry|actually|i mean|i meant|rather|correction|oops|make that|wait|uh|um|well|oh|or/, es: /no|perdon|mejor dicho|en realidad|quiero decir|queria decir|corrijo|eh|bueno|o sea|o/, it: /no|scusa|anzi|cioe|in realta|volevo dire|correggo|o meglio|ehm|beh|o/, de: /nein|nee|noe|sorry|eigentlich|ich meine|ich meinte|besser gesagt|korrektur|oder besser|ah|also|oder/ };
  const corrOnly = (between, lang) => new RegExp('^(?:[\\s.,;:!?()\\u2026\\u2013\\u2014-]|\\b(?:' + (CORR_WORDS[lang] || CORR_WORDS.fr).source + ')\\b)*$').test(between);
  /* « et non 50 000 $ », « pas 1 million » : ce montant est écarté, le précédent reste */
  const EXCLUDE = { fr: /(?:\bet\s+non|\bet\s+pas|\bnon\s+pas|\bmais\s+pas|\bpas|\bau lieu de|\bplutot que)\s*$/, en: /(?:\band\s+not|\bnot|\binstead of|\brather than)\s*$/, es: /(?:\by\s+no|\ben lugar de|\ben vez de)\s*$/, it: /(?:\be\s+non|\bnon|\binvece di|\banziche)\s*$/, de: /(?:\bund\s+nicht|\bnicht|\banstatt|\bstatt)\s*$/ };
  /* lot 5 (seconde relecture) : l'argent d'un autre joueur (« mon pote se fait 500k de l'heure », « my friend has 2M ») et l'argent déjà gagné
     ou dépensé (« j'ai gagné 300 000 hier », « j'ai dépensé 300 000 $ ») ne sont ni ton argent, ni un but, ni un gain par heure */
  const THIRD = { fr: /\b(?:mon|ma|mes) (?:potes?|amie?s?|freres?|soeurs?|cousine?s?|colocs?|copains?|copines?|pere|mere|oncle|tante|voisine?s?)(?:\s+[a-z']+){0,3}?\s+(?:a|ont|avait|se fait|se font|gagne|gagnent|fait|font|possede|veut|vise|qui a|qui ont)\s*(?:deja\s+|environ\s+|a peine\s+)?$/, en: /\bmy (?:friends?|buddy|buddies|mates?|brothers?|sisters?|cousins?|dad|mom|roommates?)(?:\s+[a-z']+){0,3}?\s+(?:has|have|makes|make|earns|earn|got|wants|who has)\s*(?:already\s+|about\s+)?$/, es: /\bmi (?:amig[oa]|colega|herman[oa]|prim[oa])(?:\s+[a-z']+){0,3}?\s+(?:tiene|gana|hace|quiere|que tiene)\s*$/, it: /\b(?:il mio|la mia) (?:amic[oa]|fratello|sorella|cugin[oa])(?:\s+[a-z']+){0,3}?\s+(?:ha|guadagna|fa|vuole|che ha)\s*$/, de: /\b(?:mein|meine) (?:freund(?:in)?|kumpel|bruder|schwester|cousine?)(?:\s+[a-z']+){0,3}?\s+(?:hat|verdient|macht|will)\s*$/ };
  const DEBT = /(?:je dois|j'en dois|on doit|tu dois|il me faut rembourser|i owe|we owe|i still owe|debo|le debo|devo|gli devo|ich schulde|schulde ich|schulde)\s*(?:encore\s+|still\s+|aber\s+|noch\s+)?(?:environ\s+|about\s+|unos\s+|circa\s+|etwa\s+)?$/;
  const SPENT = /(?:j'ai|jai|on a|tu as|il a|i|we|i ve|we ve|he|she)\s+(?:deja\s+|already\s+)?(?:gagne|fait|perdu|depense|paye|claque|recupere|earned|made|lost|spent|paid|blew|gane|ganado|perdido|gastado|pagado|guadagnato|perso|speso|pagato|verdient|verloren|ausgegeben|bezahlt)\s*(?:environ\s+|about\s+|unos\s+|circa\s+|etwa\s+)?$/;
  /* « my 1M goal », « mon 1 million d'objectif » : le montant suivi de « objectif » est le but */
  const GOAL_AFTER = /^\s*(?:\$\s*)?(?:goal|target|objectif|d'objectif|de but|objetivo|de objetivo|obiettivo|di obiettivo|ziel)\b/;
  /* un montant suivi de « de frais », « de dettes », « par mois », « par partie », « mis de côté »… n'est ni ton argent, ni un but, ni un prix */
  const OTHER_AFTER = /^\s*(?:\$\s*)?(?:de frais|d'entretien|de dettes?|de pertes?|de charges?|de depenses?|par (?:mois|semaine|jour|partie|session|an)\b|chaque (?:mois|semaine|jour|partie)\b|(?:sont |est )?mis de cote|(?:in |of )?fees\b|of debt|in debt|per (?:month|week|day|session|game)\b|a (?:month|week|session)\b|de gastos|de deudas?|por (?:mes|semana|dia|partida)\b|di spese|di debiti|al (?:mese|giorno)\b|a (?:settimana|partita)\b|an gebuhren|schulden|pro (?:monat|woche|tag|runde|spiel)\b)/;
  /* « 1 000 000 $ de plus », « 500k more » : ce qui s'ajoute à ton argent */
  /* lot 5 (seconde relecture) : « de plus que ça » reste relatif ; « en plus de ma voiture » ne l'est pas, « en plus de mes 300 000 $ » l'est ;
     « de plus que mon pote » compare à un autre joueur : ce montant n'est ni ton argent, ni un but, ni un prix */
  const MORE_AFTER = /^\s*(?:\$\s*)?(?:de plus|en plus(?!\s*(?:de|d'|du|des)\b(?!\s*(?:mes|mon|ma|nos|notre)?\s*\$?\s*\d))|supplementaires?|more\b|extra\b|de mas|mas\b|in piu|di piu|mehr\b|zusatzlich)/;
  const MORE_CMP = /^\s*(?:\$\s*)?(?:de plus|more|de mas|mas|in piu|di piu|mehr)\s+(?:que\b|qu'|than\b|di\b|als\b|de lo que\b|del que\b|che\b)(?!\s*(?:ca\b|cela\b|ce que j|ce que je|ce que l'on|ce qu'on|maintenant|actuellement|aujourd'hui|what i|i have|i ve|that\b|now\b|lo que tengo|ahora\b|eso\b|quello che ho|adesso\b|ora\b|was ich|jetzt\b|das\b|ich habe|\d))/;
  /* lot 5 (seconde relecture) : « je suis à 100 000 $ de mon objectif » : c'est ce qui manque, pas ton argent */
  const DIST_AFTER = /^\s*(?:\$\s*)?(?:(?:de|d'|du)\s*(?:mon|ma|notre|ton|votre|l'|leur)?\s*(?:objectif|but)\b|away from\b|short\b|de\s+(?:mi|nuestro|nuestra|la|el)\s+(?:objetivo|meta)|dal(?:l'|\s+(?:mio|nostro))\s*obiettivo|von\s+(?:meinem|unserem|dem)\s+ziel|vom ziel)/;
  /* lot 5 (seconde relecture) : « je n'ai rien », « I have nothing », « ohne Geld » ne donnent 0 $ qu'en fin de proposition (« je n'ai rien
     gagné », « nothing to buy », « nada que comprar », « ohne Geld auszugeben » : rien n'est écrit) */
  const END = /(?=\s*(?:$|[,.;:!?)\u2026\u2013\u2014-]|et\b|mais\b|donc\b|alors\b|du tout\b|en poche\b|sur moi\b|pour (?:l'instant|le moment|commencer)\b|au depart\b|encore\b|maintenant\b|and\b|but\b|so\b|left\b|yet\b|right now\b|now\b|at the moment\b|to start\b|y\b|pero\b|todavia\b|aun\b|ahora\b|e\b|ma\b|ancora\b|adesso\b|ora\b|und\b|aber\b|noch\b|jetzt\b|im moment\b))/.source;
  const BROKE = { fr: new RegExp(/(?:je n'ai (?:pas d'argent|rien|pas un sou|plus rien|plus d'argent|plus un sou|pas un rond|plus un rond)|je n ai (?:pas d argent|rien|plus rien)|j'?ai (?:rien|pas d'argent|plus rien|zero(?: dollars?)?|pas un (?:rond|sou|dollar)|plus un (?:rond|sou))|sans (?:un sou|argent|un rond))/.source + END + /|je pars de zero|je repars de zero|je commence a zero|je suis fauche/.source), en: new RegExp(/(?:i have (?:no money|nothing|zero(?: dollars)?)|i ve got nothing|i don't have (?:any )?money|i dont have (?:any )?money|no money)/.source + END + /|i'?m broke|i am broke|starting from (?:zero|scratch)|i start from (?:zero|scratch)/.source), es: new RegExp(/(?:no tengo (?:dinero|nada|ni un duro|ni un peso|ni un dolar)|sin dinero)/.source + END + /|empiezo de cero|parto de cero|estoy sin blanca/.source), it: new RegExp(/(?:non ho (?:soldi|niente|nulla|un soldo)|senza soldi)/.source + END + /|parto da zero|sono al verde/.source), de: new RegExp(/(?:ich habe (?:kein geld|nichts)|ohne geld)/.source + END + /|bei null|ich bin pleite/.source) };
  const PLAYERS = { fr: [[/\b(?:je joue seule?|on joue seul|tout seul|toute seule|en solo|solo)\b/, () => 1], [/\ben duo\b/, () => 2], [/\b(\d{1,2}) joueurs?\b/, m => +m[1]], [/\bon (?:joue|est|sera) a (\d{1,2})\b(?!\s?\d|[.,]\d| ?(?:h\b|heures?|min|jours?|\$|k\b|m\b|mille|million))/, m => +m[1]], [/\ben equipe de (\d{1,2})\b/, m => +m[1]], [/\bavec (\d{1,2}) (?:amis?|potes?|copains?|copines?)\b/, m => +m[1] + 1], [/\b(?:on est|on sera|nous sommes|on joue a)\s+(\d{1,2})\b(?!\s?\d|[.,]\d| ?(?:h\b|heures?|min|jours?|\$|k\b|m\b|mille|million|ans?\b|%|fois|semaines?))/, m => +m[1]], [/\b(?:ma copine|mon copain|ma meuf|ma femme|mon mari|mon pote|ma pote|mon frere|ma soeur|mon fils|ma fille) et moi\b|\bmoi et (?:ma copine|mon copain|ma meuf|ma femme|mon mari|mon pote|mon frere|ma soeur)\b/, () => 2]], en: [[/\b(?:i play alone|play alone|solo|by myself|on my own)\b/, () => 1], [/\b(\d{1,2}) players?\b/, m => +m[1]], [/\bwith (\d{1,2}) friends?\b/, m => +m[1] + 1], [/\bme and (\d{1,2}) friends?\b/, m => +m[1] + 1], [/\bwe(?: are|'re| re) (\d{1,2})\b(?!\s?\d|[.,]\d| ?(?:h\b|hours?|min|days?|\$|k\b|m\b|thousand|million|years?|%))/, m => +m[1]], [/\b(?:me and my|my) (?:girlfriend|boyfriend|wife|husband|buddy|friend|brother|sister) and (?:i|me)\b|\bme and my (?:girlfriend|boyfriend|wife|husband|buddy|friend|brother|sister)\b/, () => 2]], es: [[/\b(?:juego sol[oa]|en solitario)\b/, () => 1], [/\b(\d{1,2}) jugador(?:es)?\b/, m => +m[1]], [/\bcon (\d{1,2}) amig[oa]s?\b/, m => +m[1] + 1], [/\bsomos (\d{1,2})\b(?!\s?\d|[.,]\d| ?(?:h\b|horas?|min|dias?|\$|k\b|m\b|mil\b|millon|anos|%))/, m => +m[1]], [/\b(?:mi novia y yo|mi novio y yo|con mi novia|con mi novio|mi pareja y yo|con mi pareja)\b/, () => 2]], it: [[/\b(?:da sol[oa]|in solitaria)\b/, () => 1], [/\b(\d{1,2}) giocator[ei]\b/, m => +m[1]], [/\bcon (\d{1,2}) amic[ih]e?\b/, m => +m[1] + 1], [/\bsiamo (?:in )?(\d{1,2})\b(?!\s?\d|[.,]\d| ?(?:h\b|or[ae]|min|giorni|\$|k\b|m\b|mila|milion|anni|%))/, m => +m[1]], [/\b(?:io e la mia ragazza|io e il mio ragazzo|con la mia ragazza|con il mio ragazzo)\b/, () => 2]], de: [[/\b(?:allein|solo)\b/, () => 1], [/\b(\d{1,2}) spieler(?:n)?\b/, m => +m[1]], [/\bmit (\d{1,2}) freunden?\b/, m => +m[1] + 1], [/\bwir sind (?:zu )?(\d{1,2})\b(?!\s?\d|[.,]\d| ?(?:h\b|stunden?|min|tage|\$|k\b|m\b|tausend|million|jahre|%))/, m => +m[1]], [/\bzu (zweit|dritt|viert|funft|sechst)\b/, m => ({ zweit: 2, dritt: 3, viert: 4, funft: 5, sechst: 6 })[m[1]]], [/\b(?:meine freundin und ich|mein freund und ich|mit meiner freundin|mit meinem freund)\b/, () => 2]] };
  /* lot 4 : une échéance (« d'ici 10 jours », « en 3 jours », « within 30 days ») ; jamais un nombre négatif (« en -3 jours » : rien) */
  /* lot 5 (seconde relecture) : aussi en semaines (« en 2 semaines » = 14 jours) */
  const DEADLINE = { fr: /(?:d'ici|en|dans|sous|sur|j'ai|jai|il me reste|il nous reste|on a)\s+(\d{1,5})\s*(jours?|semaines?|heures?)\b/, en: /(?:within|in|i have|i ve got|we have|i've got)\s+(\d{1,5})\s*(days?|weeks?|hours?)\b/, es: /(?:en|dentro de|tengo|me quedan|nos quedan)\s+(\d{1,5})\s*(dias?|semanas?|horas?)\b/, it: /(?:entro|in|tra|fra|ho|mi restano)\s+(\d{1,5})\s*(giorni|settimane|settimana|ore)\b/, de: /(?:in|innerhalb von|binnen|ich habe|mir bleiben)\s+(\d{1,5})\s*(tagen?|wochen?|stunden)\b/ };
  /* une échéance en heures ne compte que si elle fait un nombre entier de jours (« d'ici 48 heures » = 2 jours ; « j'ai 2 heures » : rien) */
  function parseDeadline(text) { const m = text.match(DEADLINE[LANG] || DEADLINE.fr); if (!m) return null; const hours = /^(?:heure|hour|hora|ore|stunde)/.test(m[2]); const n = hours ? (+m[1] % 24 === 0 && +m[1] >= 24 ? +m[1] / 24 : null) : +m[1] * (/^(?:semaine|week|semana|settiman|woche)/.test(m[2]) ? 7 : 1); return Number.isInteger(n) && n >= 1 && n <= 36500 ? n : null; }
  /* lot 5 (relecture) : « je ne joue pas en solo » n'est pas « solo » ; deux nombres de joueurs différents (« solo ou à 4 ») : rien n'est
     rempli plutôt qu'un choix au hasard */
  /* lot 5 (seconde relecture) : la négation est cherchée dans toute la proposition (« je n'aime pas jouer en solo », « I hate playing solo »,
     « ich spiele nicht gerne allein ») ; une proposition s'arrête à une ponctuation ou à « et / mais » */
  const NOT_BEFORE = { fr: /\b(?:pas|jamais|plus|deteste|horreur)\b|\bn'|\bne\b/, en: /\b(?:not|never|hate|dislike|no)\b|n't\b|\bdont\b/, es: /\b(?:no|nunca|jamas|odio)\b/, it: /\b(?:non|mai|odio)\b/, de: /\b(?:nicht|nie|niemals|kein|keine|ungern|hasse)\b/ };
  const CLAUSE = /(?:[.,;:!?]|\b(?:et|mais|and|but|y|pero|e|ma|und|aber)\b)(?![\s\S]*(?:[.,;:!?]|\b(?:et|mais|and|but|y|pero|e|ma|und|aber)\b))/;
  function playerValues(text) {
    const found = new Set(), neg = NOT_BEFORE[LANG] || NOT_BEFORE.fr;
    for (const [re, f] of PLAYERS[LANG] || PLAYERS.fr) for (const m of text.matchAll(new RegExp(re.source, 'g'))) { const before = text.slice(0, m.index), cut = before.search(CLAUSE); if (neg.test(cut >= 0 ? before.slice(cut + 1) : before)) continue; const n = f(m); if (Number.isInteger(n) && n >= 1 && n <= 32) found.add(n); if (/^[\s,.]*(?:ah |oh |euh |eh )?(?:non|pardon|plutot|enfin|no|sorry|nein|scusa|perdon)\b[\s,]*(?:\d|un|une|deux|trois|quatre|cinq|six|one|two|three|four|five|dos|tres|cuatro|cinco|due|tre|quattro|cinque|zwei|drei|vier|funf)\b/.test(text.slice(m.index + m[0].length, m.index + m[0].length + 25))) found.add(-1); }
    return [...found];
  }
  function parsePlayers(text) { const v = playerValues(text); return v.length === 1 && v[0] > 0 ? v[0] : null; }
  /* lot 4 : la demande comprise, sans rien toucher à la page. Chaque montant prend le rôle des mots juste avant lui ; après un mot
     de correction (« non », « plutôt », « en fait »…), le montant suivant remplace le précédent ; deux montants pour le même rôle
     sans correction : le dernier est gardé et c'est dit (contradiction). Une négation (« je n'ai rien ») donne 0 $ dit, jamais en
     silence. Les montants sans rôle servent de but (Mon objectif, plan) ou de prix (achats), le plus grand d'abord, comme avant. */
  const LOC = /^\s*(?:\$\s*)?(?:en poche|sur moi|sur (?:mon|le) compte|en banque|a la banque|en cash|en liquide|en especes)/;
  const FEES = /^\s*(?:\$\s*)?(?:de frais|de dettes?|a payer|a rembourser|of fees|in fees|to pay|de gastos|a pagar|di spese|da pagare|an gebuhren|zu zahlen)/;
  const REST = /\ble reste\b|ce qui (?:me )?reste|what'?s left|the rest\b|lo que (?:me )?queda|el resto\b|il resto\b|quello che (?:mi )?resta|der rest\b|was (?:mir )?(?:ubrig )?bleibt/;
  /* lot 5 (seconde relecture) : une vraie comparaison de deux achats, cherchée partout dans la phrase */
  const PROP = /bunker|hangar|club|boite de nuit|nightclub|night club|discoteca|club nocturno|agence|agency|agencia|agenzia|agentur|bureau|office|oficina|ufficio|buro|arcade|garage|garaje|entrepot|warehouse|almacen|magazzino|lagerhaus|labo(?:ratoire)?|lab|laboratorio|labor|car wash|kosatka|sous-marin|submarine|submarino|sottomarino|yacht|penthouse|atico|attico|villa|appartement|apartment|piso|appartamento|wohnung|maison|house|helico(?:ptere)?|helicopter|helicoptero|elicottero|hubschrauber|moto|motorcycle|motocicleta|motorrad|avion|plane|aereo|flugzeug|voiture|coche|macchina|bateau|boat|barco|barca|boot|jet|sub|bar|appart|jacht/.source;
  const STRONG_CMP = new RegExp('(?:' + PROP + ')' + /\b[^?.!]{0,60}?\b(?:ou|or|o|oder) (?:[a-z'-]+ ){0,3}?(?:(?:le|la|les|l'|the|a|an|el|los|las|un|una|il|lo|gli|der|die|das|den|ein|eine) ?)?/.source + '(?:' + PROP + ')|' + /\bentre (?:le|la|les|l'|un|une) ?[a-z-]+.*\bet (?:le|la|les|l'|un|une) ?[a-z-]+|\bbetween (?:the|a|an) [a-z-]+.* and (?:the|a|an) [a-z-]+|\bentre (?:el|la|los|las|un|una) [a-z-]+.* y (?:el|la|los|las|un|una) [a-z-]+|\btra (?:il|la|lo|l'|un|una) ?[a-z-]+.* e (?:il|la|lo|l'|un|una) ?[a-z-]+|\bzwischen (?:dem|der|den|einem|einer) [a-z-]+.* und (?:dem|der|den|einem|einer) [a-z-]+/.source);
  const MULT = { fr: /\b(doubler|tripler)\b/, en: /\b(double|triple)\b/, es: /\b(duplicar|doblar|triplicar)\b/, it: /\b(raddoppiare|triplicare)\b/, de: /\b(verdoppeln|verdreifachen)\b/ };
  function interpret(value) {
    const q = String(value || '').trim();
    if (!q) return null;
    const text = wordsToDigits(normalize(q));
    const R = ROLE[LANG] || ROLE.fr, COR = CORRECTION[LANG] || CORRECTION.fr, EXC = EXCLUDE[LANG] || EXCLUDE.fr;
    const list = mentions(text);
    let prevEnd = 0;
    list.forEach((m, i) => {
      const before = text.slice(prevEnd, m.start), near = text.slice(Math.max(prevEnd, m.start - 40), m.start);
      const after = text.slice(m.end, m.end + 30);
      m.role = (THIRD[LANG] || THIRD.fr).test(near) || SPENT.test(near) || DEBT.test(near) ? 'other' : HOURLY.test(after) ? 'hourly' : OTHER_AFTER.test(after) || MORE_CMP.test(after) ? 'other' : DIST_AFTER.test(after) ? 'missing' : GOAL_AFTER.test(after) ? 'target' : R.have.test(near) || (R.haveAfter && R.haveAfter.test(after)) || ((WITH[LANG] || WITH.fr).test(near) && WITH_END.test(after)) ? 'have' : R.target.test(near) ? 'target' : R.price.test(near) ? 'price' : R.missing && R.missing.test(near) ? 'missing' : null;
      /* lot 5 : « 1 000 000 $ de plus » s'ajoute à ton argent ; un montant négatif (« -50 000 $ ») n'est ni ton argent ni un but */
      if (m.role !== 'hourly' && m.role !== 'other' && m.role !== 'have' && m.role !== 'missing' && MORE_AFTER.test(after)) m.role = 'more';
      if (m.negative) m.role = 'other';
      /* « j'ai 2 heures par jour et 100 000 $ » : le montant sans rôle reste dans la phrase de « j'ai », sans mot de but ni de prix entre les deux */
      if (!m.role && R.haveScope && R.haveScope.test(text.slice(Math.max(0, m.start - 60), m.start)) && !list.slice(0, i).some(o => o.role === 'have')) m.role = 'have';
      /* lot 5 : « et non 50 000 $ » écarte ce montant ; une correction (« non, », « pardon », « en fait »…) ne compte que si rien d'autre
         ne sépare les deux montants (« j'ai 300 000 $ mais il me faut 1 million » n'est pas une correction) */
      if (i > 0 && EXC.test(before)) m.role = 'excluded';
      else if (i > 0 && COR.test(before) && corrOnly(before.replace(HOURLY, '').replace(OTHER_AFTER, '').replace(MORE_AFTER, '').replace(R.haveAfter || /$^/, ''), LANG)) { const p = list[i - 1]; if (p.role !== 'excluded' && (!m.role || m.role === p.role)) { m.role = p.role; p.replaced = true; m.corrected = true; } }
      prevEnd = m.end;
    });
    const kept = list.filter(m => !m.replaced && m.role !== 'excluded' && m.role !== 'other'), notes = [];
    const last = role => { const xs = kept.filter(m => m.role === role); if (new Set(xs.map(m => m.value)).size > 1) notes.push(role); return xs.length ? xs[xs.length - 1].value : null; };
    let capital = last('have'), summed = false;
    const haves = kept.filter(m => m.role === 'have'), locs = haves.map(m => (LOC.exec(text.slice(m.end, m.end + 30)) || [''])[0].trim());
    if (haves.length > 1 && locs.every(Boolean) && new Set(locs).size === locs.length) { capital = haves.reduce((t, m) => t + m.value, 0); summed = true; const k = notes.indexOf('have'); if (k >= 0) notes.splice(k, 1); }
    const fees = list.filter(m => m.role === 'other' && FEES.test(text.slice(m.end, m.end + 30))).reduce((t, m) => t + m.value, 0);
    if (capital !== null && fees > 0 && fees <= capital && REST.test(text)) { capital -= fees; summed = 'fees'; }
    /* (« broke » est calculé avant toute déduction : « je n'ai rien » n'est jamais écrasé par un calcul) */
    const broke = capital === null && (BROKE[LANG] || BROKE.fr).test(text);
    if (broke) capital = 0;
    const free = kept.filter(m => !m.role).map(m => m.value).sort((a, b) => b - a);
    const price = last('price'), missing = last('missing'), more = last('more'), big = xs => xs.length ? Math.max(...xs) : null;
    /* lot 5 : « il me manque 800 000 $ » ou « 1 000 000 $ de plus » : le but est ton argent plus ce montant, seulement si ton argent est écrit */
    let target = last('target'), relative = null;
    if (target === null && capital !== null && (missing !== null || more !== null)) { target = capital + (missing !== null ? missing : more); relative = missing !== null ? 'missing' : 'more'; }
    /* lot 5 (seconde relecture) : « il me manque 250 000 $ pour avoir 1 million », « je suis à 100 000 $ de mon objectif de 1 million » :
       ton argent est le but moins ce qui manque ; « doubler mes 500 000 $ » : le but est deux fois ton argent. Chaque calcul est dit. */
    if (capital === null && target !== null && missing !== null && missing <= target) { capital = target - missing; relative = 'capital'; }
    const mult = (MULT[LANG] || MULT.fr).exec(text);
    if (target === null && capital !== null && capital > 0 && mult && relative === null) { const f = /^(?:doubl|dupl|dobl|raddopp|verdopp)/.test(mult[1]) ? 2 : 3; target = capital * f; relative = 'x' + f; }
    const relativeWithoutMoney = target === null && capital === null && (missing !== null || more !== null), minutesRead = readMinutes(text);
    /* sans mot de but : le plus grand des montants restants (« pour 1 million » parle d'un but) ; sans mot de prix : idem ; lot 5 (seconde
       relecture) : un but relatif sans ton argent (« il me faut 1 million de plus ») ne prend jamais un autre montant à sa place */
    const goal = target !== null ? target : relativeWithoutMoney ? null : big(kept.filter(m => !m.role || m.role === 'price').map(m => m.value));
    const cost = price !== null ? price : relative === 'missing' || relative === 'more' ? target : relativeWithoutMoney ? null : big(kept.filter(m => !m.role || m.role === 'target').map(m => m.value));
    return { text, mentions: list, capital, summed, broke, target, price, goal, cost, free, hourly: last('hourly'), relative, corrected: list.some(m => m.corrected), contradictions: notes, minutes: minutesRead.minutes, minutesCorrected: !!minutesRead.corrected, minutesUnclear: !!minutesRead.ambiguous, players: parsePlayers(text), deadlineDays: parseDeadline(text),
      /* lot 5 (cahier § 11) : ce qui reste ambigu ou incomplet est dit, avec la case à remplir, au lieu d’être laissé de côté en silence */
      playersUnclear: playerValues(text).length > 1, relativeWithoutMoney };
  }
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
  /* lot 4 : les valeurs retenues sont redites dans la réponse de la barre (« ton argent est rempli (200 000 $) ») */
  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
  const money = n => { const E = window.LKCalcEngine; return E && E.dollars ? E.dollars(nf.format(n), ' ') : nf.format(n) + ' $'; };
  const time = m => { const E = window.LKCalcEngine; return E && E.durationText ? E.durationText(m / 60) : m + ' min'; };
  function route(value) {
    const q = String(value || '').trim();
    if (!q) return null;
    const full = wordsToDigits(normalize(q));
    /* lot 4 : le business plan d'abord (« plan étape par étape pour un million ») ; un mot de but ouvre Mon objectif ; « million »
       seul aussi, sauf si la phrase parle d'un prix ou d'un achat (« un bateau coûte 1,2 million » → Mes achats) */
    /* lot 5 (seconde relecture) : « sans rien acheter », « à tout prix », « without buying » ne parlent pas d'un achat */
    const text = full.replace(/\b(?:sans|pas|rien|jamais|ne)\s+(?:rien\s+|plus\s+|jamais\s+)?(?:a\s+)?(?:acheter|achat|depenser|achete)\b|\ba tout prix\b|\bat any (?:cost|price)\b|\bwithout (?:buying|spending)(?: anything)?\b|\bnothing to buy\b|\bsin (?:comprar|gastar)(?: nada)?\b|\bnada que comprar\b|\ba toda costa\b|\bsenza (?:comprare|spendere)(?: niente| nulla)?\b|\bniente da comprare\b|\ba (?:ogni|qualsiasi) costo\b|\bohne (?:etwas |geld )?(?:zu )?(?:kaufen|auszugeben)\b|\bnichts zu kaufen\b|\bum jeden preis\b/g, ' ');
    const planRule = rules.find(r => r.tab === 'plan'), sessionRule = rules.find(r => r.tab === 'session'), goalRule = rules[rules.length - 1], daily = /par jour|chaque jour|per day|a day|every day|al dia|cada dia|al giorno|ogni giorno|pro tag|am tag|jeden tag/.test(text);
    /* lot 5 (seconde relecture) : « j'ai économisé 1,8 M » décrit ton argent, pas un but (seuls « économiser », « épargner »… en sont) ; « million »
       n'ouvre plus Mon objectif quand la phrase demande clairement un autre outil (« ça vaut le coup ? », « lequel choisir ? », « par quoi
       commencer ? », « comment répartir ? ») */
    const compareMatch = text.match(rules.find(r => r.tab === 'compare').re);
    /* « le mieux », « lequel », « choisir » seuls ne suffisent pas (« c'est quoi le mieux pour avoir 1 million ? » reste Mon objectif) : seule une
       vraie comparaison de deux achats (« le bunker ou le hangar », « entre le bateau et la voiture ») écarte Mon objectif */
    const strong = /vaut le coup|vaut-il|ca vaut|rentab|amorti|worth it|is it worth|pays? (?:for itself|back|off)|break.?even|vale la pena|merece la pena|redditiz|\blohnt|zahlt sich|acheter d'abord|achete d'abord|acheter en premier|buy first|compro primero|compro prima|kaufe ich zuerst|repartir(?! de)|repartis\b|repartition|\bsplit\b|\bdivide\b|dividir|\breparto\b|ripart|dividere|\bdivido\b|verteil|aufteil|enveloppe|faire un budget|mon budget est|comment (?:les |le |l')?depenser|(?:que|quoi) faire avec|je mets combien|how (?:do|should) i (?:budget|spend|split)|budget the rest|wie teile ich|\bdans quoi\b|\bou (?:mettre|placer|investir)\b|where (?:should i )?(?:put|invest|spend)/.test(text) || STRONG_CMP.test(text) || !!compareMatch && !/^(?:choisir|comparer|lequel|laquelle|le mieux|meilleur|rapport qualite|le plus rentable|le moins cher|ou\b|choose|compare|which|best|value for money|most profitable|cheapest|elegir|elijo|comparar|cual|el mejor|mejor|calidad|mas |scegliere|scelgo|confront|quale|il migliore|miglior|qualita|il piu|il meno|wahlen|vergleich|welche|am besten|bester|preis-leistung|am |gunstigste|mieux|plutot|better|rather|meglio|besser|lieber|acheter|buy|get|kaufen|comprar|comprare|prendre)/.test(compareMatch[0]);
    let intent = planRule.re.test(text) ? planRule : /objectif|atteindre|epargner|economiser|\bgoal\b|objetivo|ahorrar|\bmeta\b|obiettivo|raggiungere|risparmiare|\bziel\b|sparen/.test(text) || (/million|millon|milion/.test(text) && !strong && !/cout|prix|achet|achat|m'offrir|me payer|investi|rentab|vaut le coup|amorti|\bbuy|\bcost|price|purchase|\bcompr(?!en|is|es|eh)[a-z]*|precio|cuesta|invers|acquist|prezzo|costa\b|investiment|kauf|kostet|preis|investi/.test(text)) ? goalRule : rules.find(rule => rule.re.test(text)) || goalRule;
    /* lot 5 (seconde relecture) : « j'achète quoi en premier entre le bureau et le hangar ? » est un ordre d'achat ; « comment répartir au mieux ? »
       un budget : ces mots passent avant « entre … et … », « le mieux » */
    if (intent.tab === 'compare' && rules.find(r => r.tab === 'order').re.test(text)) intent = rules.find(r => r.tab === 'order');
    if (intent.tab === 'compare' && rules.find(r => r.tab === 'budget').re.test(text)) intent = rules.find(r => r.tab === 'budget');
    /* lot 5 (seconde relecture) : « laquelle rapporte le plus ? » à propos de missions ou de braquages parle d'activités, pas d'achats */
    if (intent.tab === 'compare' && /mission|activit|braquage|heist|grind|\bfarm|mision|actividad|golpe|atraco|missione|attivita|colpo|rapina|aktivitat|raububerfall/.test(text) && !/(?:bunker|hangar|club|boite de nuit|nightclub|agence|agency|agencia|agenzia|bureau|office|oficina|ufficio|arcade|garage|entrepot|warehouse|yacht|penthouse|villa|appartement|apartment|maison|house|helico|helicopter|moto|avion|plane|voiture|coche|macchina|bateau|boat)/.test(text)) intent = rules.find(r => r.tab === 'activities');
    /* v7.59 (check ultime, CALC-11) : « quelle mission rapporte le plus en 90 minutes ? » parle d'activités, pas d'une partie ;
       le mot « minutes » seul ne suffit plus à ouvrir Mon temps de jeu quand la phrase parle de missions ou de gains. */
    /* lot 4 : « j'ai 3 heures » (temps disponible maintenant) ouvre Mon temps de jeu ; « 45 minutes par jour » parle de Mon objectif ;
       lot 5 (seconde relecture) : aussi « on a 1 h 30 », « il me reste 1 heure », « we have an hour », « wir haben 90 Minuten », et une heure de
       la journée avec « je fais quoi ? » (« je peux jouer jusqu'à minuit, je fais quoi ? ») quand la phrase ne parle d'aucun montant */
    const haveTime = /(?:j'ai|jai|on a|il me reste|il nous reste|nous avons|i have|i ve got|i've got|we have|we've got|\bhave|\bhaben|tengo|tenemos|me quedan?|nos quedan?|\bho|abbiamo|mi restano|mi resta|ci restano|ci resta|ich habe|wir haben|mir bleiben|uns bleiben)\s+(?:encore\s+|still\s+|noch\s+|only\s+|seulement\s+|que\s+|solo\s+|nur\s+)?\d+(?:[.,]\d+)? ?(?:h(?:\d{2})?\b|heures?|hours?|horas?|or[ae]\b|stunden?|min)/.test(text);
    const clockHere = new RegExp(CLOCK.source).test(text) || /minuit|midnight|medianoche|mezzanotte|mitternacht/.test(text), whatNow = /que faire|quoi faire|je fais quoi|on fait quoi|qu'est-ce que je (?:fais|peux faire)|what should i do|what do i do|what can i do|what's best|whats best|que hago|que puedo hacer|que hacemos|cosa faccio|cosa posso fare|cosa facciamo|was soll ich machen|was mache ich|was kann ich machen|was machen wir|best use of my time|un truc rapide|something quick|algo rapido|qualcosa di veloce|was schnelles|cosa mi conviene fare|que me conviene hacer/.test(text);
    if (intent.tab === 'goal' && !daily && haveTime && !/million|millon|milion|objectif|\bgoal/.test(text)) intent = sessionRule;
    if (intent.tab === 'goal' && !daily && !/million|millon|milion|objectif|\bgoal|objetivo|obiettivo|\bziel/.test(text) && clockHere && (whatNow || parseMinutesPerDay(text) !== null) && !mentions(text).length) intent = sessionRule;
    /* lot 5 (seconde relecture) : une durée disponible maintenant (« ce soir », « today », « stasera… cosa mi conviene fare ? », « heute… was mache
       ich am besten ? »), sans aucun montant ni but : Mon temps de jeu, même si un mot de la phrase fait penser à un autre outil */
    if (['goal', 'roi', 'compare'].includes(intent.tab) && !daily && !/million|millon|milion|objectif|\bgoal|objetivo|obiettivo|\bziel/.test(text) && !mentions(text).length && parseMinutesPerDay(text) !== null && (whatNow || clockHere || haveTime || /ce soir|tonight|esta noche|stasera|heute abend|aujourd'hui|today|\bhoy\b|\boggi\b|\bheute\b|maintenant|right now|ahora|adesso|jetzt/.test(text))) intent = sessionRule;
    /* « l'activité la plus rentable », « quelle activité rapporte le plus » : Mes activités, pas « Ça vaut le coup ? » (aucun achat ni prix) */
    if (intent.tab === 'roi' && /activit|mission|braquage|moyen de|activity|actividad|attivita|aktivitat|heist|golpe|colpo/.test(text) && !mentions(text).length && !/achat|acheter|achete|buy|purchase|compra|acquist|kauf/.test(text)) intent = rules.find(r => r.tab === 'activities');
    if (intent.tab === 'session' && daily && !/session|ce soir|tonight|esta noche|stasera|heute abend/.test(text)) intent = goalRule;
    if (intent.tab === 'session' && !/session|j'ai du temps|temps disponible|ce soir|i have (?:some )?time|tonight|partida|tengo tiempo|tiempo disponible|esta noche|sessione|ho tempo|tempo disponibile|stasera|ich habe zeit|zeit habe|heute abend/.test(text) && rules.find(r => r.tab === 'activities').re.test(text)) intent = rules.find(r => r.tab === 'activities');
    const x = interpret(q), minutes = x.minutes, changed = [], capital = x.capital, wrote = {};
    if ((intent.tab === 'activities' || intent.tab === 'session') && x.target !== null && /how long|combien de temps|en combien de|cuanto tiempo|quanto tempo|wie lange/.test(text)) intent = goalRule;
    /* lot 4 : le but est d'abord ce qui est visé, sinon le plus grand montant sans rôle, sinon un prix ; le prix est d'abord ce que
       coûte l'achat. Avant : le plus grand montant de la phrase, même quand c'était l'argent du joueur. */
    const goalAmount = x.goal, priceAmount = x.cost;
    openTab(intent.tab);
    if (intent.tab === 'goal') {
      const params = {};
      if (capital !== null) { params.capital = capital; wrote.capital = true; changed.push('ton argent est rempli (' + money(capital) + ')'); }
      if (goalAmount !== null) { params.target = goalAmount; wrote.target = true; changed.push('ton objectif est rempli (' + money(goalAmount) + ')'); }
      if (minutes !== null && minutes <= 1440) { params.dailyMinutes = minutes; changed.push('ton temps de jeu est rempli (' + time(minutes) + ')'); }
      if (x.hourly !== null) { params.hourly = x.hourly; changed.push('ton gain par heure est rempli (' + money(x.hourly) + ')'); }
      if (Object.keys(params).length) applyGoal(params);
      if (x.deadlineDays !== null && field('f-goal-deadlineDays', x.deadlineDays)) changed.push('ton échéance est remplie (' + x.deadlineDays + (x.deadlineDays > 1 ? ' jours)' : ' jour)'));
    }
    if (intent.tab === 'session' && minutes !== null && field('f-session-minutes', minutes)) changed.push('ton temps est rempli (' + time(minutes) + ')');
    if (intent.tab === 'plan') {
      /* Le business plan a ses propres cases : on remplit celles-là, jamais celles des huit calculs. */
      if (capital !== null && field('plan-capital', capital)) { wrote.capital = true; changed.push('ton argent est rempli dans le plan (' + money(capital) + ')'); }
      const planAmount = $('plan-price') ? priceAmount : goalAmount;
      if (planAmount !== null && (field('plan-price', planAmount) || field('plan-target', planAmount))) { wrote[$('plan-price') ? 'price' : 'target'] = true; changed.push('ton but est rempli dans le plan (' + money(planAmount) + ')'); }
      if (minutes !== null && minutes <= 1440 && field('plan-daily', minutes)) changed.push('la durée de tes parties est remplie (' + time(minutes) + ')');
      if (x.hourly !== null && field('plan-hourly', x.hourly)) changed.push('ton gain par heure est rempli dans le plan (' + money(x.hourly) + ')');
      if (x.deadlineDays !== null && field('plan-deadline', x.deadlineDays)) changed.push('ton échéance est remplie dans le plan (' + x.deadlineDays + (x.deadlineDays > 1 ? ' jours)' : ' jour)'));
    }
    if (intent.tab === 'purchase' && priceAmount !== null && field('f-purchase-price', priceAmount)) { wrote.price = true; changed.push('le prix est rempli (' + money(priceAmount) + ')'); }
    /* v7.59 (check ultime, CALC-11) : « j'ai X $ » remplit « J'ai déjà » dans l'outil ouvert (même case partagée) ; un prix
       va aussi dans « Ça vaut le coup ? » ; un temps en minutes va dans « Mes activités ». Rien d'autre n'est deviné. */
    if (intent.tab !== 'goal' && intent.tab !== 'plan') {
      const capField = document.querySelector('#panel-' + intent.tab + ' input[data-field="goal.capital"]');
      if (capital !== null && capField && field(capField.id, capital)) { wrote.capital = true; changed.push('ton argent est rempli (' + money(capital) + ')'); }
      if (intent.tab === 'roi' && priceAmount !== null && field('f-roi-purchase', priceAmount)) { wrote.price = true; changed.push('le prix est rempli (' + money(priceAmount) + ')'); }
      if (intent.tab === 'activities' && minutes !== null && minutes <= 1000000 && field('f-inverse-minutes', minutes)) changed.push('ton temps est rempli (' + time(minutes) + ')');
    }
    /* lot 4 : le nombre de joueurs (« seul », « 4 joueurs », « avec 2 amis ») va dans la case de l'outil ouvert, s'il en a une */
    if (x.players !== null) { const pf = document.querySelector('#panel-' + intent.tab + ' input[data-field="goal.players"], #panel-' + intent.tab + ' input[data-field="plan.situation.players"]'); if (pf && field(pf.id, x.players)) changed.push('le nombre de joueurs est rempli (' + x.players + ')'); }
    /* lot 4 : une correction ou deux montants pour la même chose sont dits, jamais gardés en silence */
    const notes = [];
    if (x.corrected) notes.push('j’ai pris le montant corrigé');
    /* lot 5 : un but calculé (« il me manque 800 000 $ », « 1 000 000 $ de plus ») est dit avec sa règle ; seconde relecture : la règle n'est
       dite que pour la case vraiment remplie (but, prix ou argent), jamais pour une case que l'outil ouvert n'a pas */
    const rel = x.relative;
    if ((rel === 'missing' || rel === 'more') && wrote.target) notes.push(rel === 'missing' ? 'objectif = ton argent + ce qui te manque' : 'objectif = ton argent + ce que tu veux en plus');
    if ((rel === 'missing' || rel === 'more') && wrote.price) notes.push('prix = ton argent + ce qui te manque');
    if (rel === 'capital' && wrote.capital) notes.push('ton argent = objectif − ce qui te manque');
    if (x.summed === true && wrote.capital) notes.push('ton argent = la somme de ces montants');
    if (x.summed === 'fees' && wrote.capital) notes.push('ton argent = ce que tu as − les frais à payer');
    if ((rel === 'x2' || rel === 'x3') && wrote.target) notes.push(rel === 'x2' ? 'objectif = 2 × ton argent' : 'objectif = 3 × ton argent');
    if (x.relativeWithoutMoney) { if (intent.tab === 'goal' || (intent.tab === 'plan' && !$('plan-price'))) notes.push('écris aussi ton argent : l’objectif sera ton argent + ce montant'); else if (intent.tab === 'purchase' || intent.tab === 'roi' || intent.tab === 'plan') notes.push('écris aussi ton argent : le prix sera ton argent + ce montant'); }
    if (x.playersUnclear) notes.push('nombre de joueurs pas clair : écris-le dans sa case');
    /* lot 5 (seconde relecture) : une durée corrigée ou deux durées différentes sont dites, comme les montants */
    if (x.minutesCorrected && minutes !== null) notes.push('j’ai pris la durée corrigée');
    if (x.minutesUnclear && ['goal', 'plan', 'session', 'activities'].includes(intent.tab)) notes.push('deux durées différentes : écris la bonne dans sa case');
    const ROLE_NAME = { have: 'ton argent', target: 'ton objectif', price: 'le prix', hourly: 'ton gain par heure', missing: 'ce qui te manque', more: 'ce que tu veux en plus' };
    x.contradictions.forEach(r => notes.push('deux montants pour ' + ROLE_NAME[r] + ' : j’ai gardé le dernier'));
    return { tab: intent.tab, label: intent.label, done: changed, notes, values: { capital, target: goalAmount, price: priceAmount, minutes, players: x.players, hourly: x.hourly, deadlineDays: x.deadlineDays } };
  }
  function focusWorkshop() {
    const workshop = $('atelier');
    if (workshop) workshop.scrollIntoView({ behavior: 'auto', block: 'start' });
  }
  const form = $('calc-ask'), input = $('calc-ask-input'), out = $('calc-ask-out');
  /* v7.67 : IA de la barre (API Claude, par la fonction /api/ia du site). La lecture locale répond d’abord, tout de suite, comme
     avant. L’IA n’est appelée que si cette lecture laisse quelque chose de côté : rien de rempli, une ambiguïté, plus de
     nombres dans la phrase que de cases remplies, ou ce que les cases ne disent pas directement (taux de réussite, intervalle,
     variante « et si », gain par mission, préparation, attente). Elle dit quelles cases remplir ; les chiffres viennent du
     moteur, comme pour une saisie à la main. Sans clé, hors ligne, trop lente (15 s) ou en erreur : la réponse locale reste.
     Les exemples restent locaux. */
  const IA_OFF = 'lk_ia_off';
  const BEYOND = /%|pour ?cent|percent|por ?ciento|per ?cento|prozent|\bchances?\b|\btaux\b|\brate\b|\btasa\b|\btasso\b|\bquote\b|\b\d+ (?:fois )?sur \d+\b|\b\d+ (?:times )?(?:out )?of \d+\b|\bde cada \d+\b|\bsu \d+\b|\bvon \d+\b|\b(?:entre|between|tra|zwischen) \d[^?.!;]{0,40}?\b(?:et|and|y|e|und) \d|\bet si\b|\bwhat if\b|\by si\b|\be se\b|\bund wenn\b|\bpar (?:mission|braquage|coup|course|livraison)\b|\bper (?:mission|heist|run|job|missione|colpo)\b|\bpor (?:mision|golpe|atraco)\b|\bpro (?:mission|coup|raub)\b|\bprepa|\bprep\b|\bsetup\b|\bpreparaci|\bpreparazion|\bvorbereit|\bcooldown|\battente\b|\bespera\b|\battesa\b|\bwartezeit\b|\bechou|\bfail|\bfalla|\bfalli|\bscheiter/;
  let asked = 0;
  function iaOn() { try { return sessionStorage.getItem(IA_OFF) !== '1'; } catch (e) { return true; } }
  function needsAI(q, result) {
    if (!result.done.length || result.notes.length) return true;
    const x = interpret(q);
    if (!x) return false;
    const quantities = x.mentions.filter(m => !m.replaced && m.role !== 'excluded').length + (x.minutes !== null ? 1 : 0) + (x.players !== null ? 1 : 0) + (result.values.deadlineDays !== null ? 1 : 0);
    return quantities > result.done.length || BEYOND.test(x.text);
  }
  /* v7.69 : le visiteur choisit qui lit sa phrase (lk-ia.js : « IA Claude » ou « Local »), voit lequel a répondu, et a
     30 questions IA gratuites par 9 heures ; ensuite la lecture locale répond seule (ou le crédit, si la vente est ouverte). */
  const IA = () => window.LKIA || null;
  const iaUsable = () => { const A = IA(); return A ? A.usable() : iaOn(); };
  async function iaCalc(text) {
    const calc = window.LKCalculator, A = IA();
    if (!iaUsable() || typeof fetch !== 'function' || !calc || typeof calc.applyAI !== 'function') return null;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = setTimeout(() => { if (ctl) ctl.abort(); }, 15000);
    try {
      const payload = { mode: 'calcul', question: text, lang: (document.documentElement.lang || 'fr').slice(0, 2), page: location.pathname, state: calc.brief() };
      const r = await fetch('/api/ia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl ? ctl.signal : undefined, body: JSON.stringify(A ? A.body(payload) : payload) });
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (A) A.learn(r.status, j);
      if (r.status === 503 || r.status === 404 || r.status === 405) { try { sessionStorage.setItem(IA_OFF, '1'); } catch (e) { /* stockage indisponible : on réessaiera */ } return null; }
      if (r.status === 402) return { quota: true };
      if (!r.ok) return null;
      return j && j.ok && j.mode === 'calcul' && Array.isArray(j.cases) ? j : null;
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }
  async function answer(value, localOnly) {
    const result = route(value);
    if (!result) return;
    const localLine = result.label + (result.done.length ? ' · ' + result.done.join(' · ') : ' : remplis les cases juste en dessous.') + (result.notes.length ? ' · ' + result.notes.join(' · ') : '');
    const byLocal = () => { const A = IA(); if (!A) return ''; const st = A.status(); return ' · ' + (st.kind === 'quota' || st.kind === 'off' ? st.text : A.line(false)); };
    if (out) { out.textContent = localLine + byLocal(); out.hidden = false; out.removeAttribute('aria-busy'); }
    focusWorkshop();
    const text = String(value || '').trim(), calc = window.LKCalculator;
    const turn = ++asked;
    if (localOnly || text.length < 2 || !calc || !iaUsable() || typeof fetch !== 'function' || !needsAI(text, result)) return;
    let wait = null;
    if (out) { wait = document.createElement('span'); wait.className = 'calc-ask-wait'; wait.textContent = ' · ' + 'Je lis ta demande…'; out.appendChild(wait); out.setAttribute('aria-busy', 'true'); }
    const r = await iaCalc(text);
    if (wait) wait.remove();
    /* une demande plus récente a déjà répondu : cette réponse arrive trop tard */
    if (turn !== asked) return;
    if (out) out.removeAttribute('aria-busy');
    if (r && r.quota) { if (out) out.textContent = localLine + byLocal(); return; }
    /* v7.69.2 : l'IA a lu la phrase sans rien ajouter : la lecture locale reste, dite comme telle, question non comptée */
    if (r && r.compte === false) { if (out) out.textContent = localLine + ' · ' + 'Réponse locale : l’IA Claude n’avait rien à ajouter (question non comptée).'; return; }
    if (!r || !(r.cases.length || r.question)) return;
    const parts = [];
    if (r.note) parts.push(r.note);
    if (r.cases.length) calc.applyAI(r.outil, r.cases, 'Cases remplies à partir de ta phrase.');
    for (const s of r.scenarios || []) { const v = calc.scenarioSummary(r.outil, s.cases); if (v) parts.push(s.nom + ' : ' + v); }
    if (r.question) parts.push(r.question);
    if (!parts.length) parts.push('Cases remplies à partir de ta phrase.');
    if (IA()) parts.push(IA().line(true));
    if (out) { out.textContent = parts.join(' · '); out.hidden = false; }
    if (r.cases.length) focusWorkshop();
  }
  if (form && input) {
    /* v7.69 : « Qui répond ? » sous la barre */
    if (IA()) { const help = $('calc-ask-help'); const ctl = IA().control('calcul'); if (help) help.after(ctl); else form.appendChild(ctl); input.addEventListener('focus', () => IA().refresh(false), { once: true }); }
    form.addEventListener('submit', event => { event.preventDefault(); answer(input.value); });
    document.querySelectorAll('[data-ask]').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.ask; answer(input.value, true); }));
  }
  document.querySelectorAll('[data-goal-preset]').forEach(button => button.addEventListener('click', () => {
    const target = Number(button.dataset.goalPreset);
    if (!Number.isFinite(target) || target < 0 || target > 1e12) return;
    openTab('goal'); applyGoal({ target }); focusWorkshop();
  }));
  document.querySelectorAll('[data-open-tab]').forEach(button => button.addEventListener('click', event => { event.preventDefault(); openTab(button.dataset.openTab); focusWorkshop(); }));
  window.LKCalcHub = { route, interpret, parseMoney, parseMinutesPerDay, needsAI };
}());
