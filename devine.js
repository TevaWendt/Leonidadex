/* LEONIDAKIT v7.90 (lot 6) — « Devine le lieu » (devine-le-lieu.html, page générée par outils/gen-devine.cjs).
   Une capture officielle de GTA VI, six régions : le joueur devine où elle a été prise.
   - Partie du jour : cinq images tirées d’après la date à Paris (Europe/Paris), les mêmes pour tout le monde ce jour-là.
     Le tirage ne dépend que de la date et de la liste des images de la page : les images, rangées par région, sont
     réparties en cycles où chacune passe une fois ; une partie n’a jamais deux fois la même image ni plus de deux images
     d’une même région, et une image ne revient jamais le lendemain (vérifié à la génération sur trois ans de tirages).
   - Partie libre ensuite : images au hasard, sans limite ; elle ne touche ni à la série ni au meilleur score.
   - Score, série de jours joués et meilleur score : stockage local, une seule clé (lk_devine_v1, versionnée), écrite
     seulement après la première réponse. Rien n’est envoyé. Le partage est un texte (une ligne par image, ✅ / ❌, le
     numéro du jour et l’adresse), par l’API de partage de l’appareil ou en copie ; aucun visuel.
   - Aucun mot n’est écrit ici : tous les textes viennent de la page (<template id="dv-msg">, boutons, liens), donc de la
     langue de la page. Les images viennent de <template id="dv-pool"> (inerte : rien n’est chargé avant d’être montré).
   - Lecteurs d’écran : chaque étape est annoncée (aria-live) ; la carte est un raccourci pour la souris et le toucher,
     les boutons des régions font la même chose au clavier. « Réduire les animations » : rien ne bouge, tout est posé.
   Les fonctions de tirage et de score sont pures (window.LKDevine) : outils/gen-devine.cjs et les tests les chargent dans
   Node pour vérifier les tirages.
   v7.92 : la même clé garde aussi, en option (champ « st »), tes statistiques des parties du jour (parties finies,
   meilleure série, répartition des scores, bonnes réponses par région, scores des 60 derniers jours) et ton album (les
   images déjà jouées dans une partie du jour) ; un champ abîmé est remis à zéro sans toucher au reste. La page montre
   ton album dans les fiches des régions, tes statistiques dans le résultat, ta série pendant la partie et le jour du
   cycle des images ; la partie libre ne touche toujours à rien. */
(function (root) {
  'use strict';
  const DAY = 86400000;
  /* ---------- dates (jour à Paris) ---------- */
  function dayIndex(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
    return m ? Math.round(Date.UTC(+m[1], +m[2] - 1, +m[3]) / DAY) : NaN;
  }
  function isoOfIndex(n) { return new Date(n * DAY).toISOString().slice(0, 10); }
  let parisFmt = null;
  function parisDate(t) {
    if (!parisFmt) parisFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' });
    const parts = parisFmt.formatToParts(new Date(t)), part = k => (parts.find(x => x.type === k) || {}).value;
    return part('year') + '-' + part('month') + '-' + part('day');
  }
  /* prochain minuit à Paris après t (jours de 23 h et de 25 h compris), à la seconde près */
  function nextParisMidnight(t) {
    const today = parisDate(t);
    let lo = t, hi = t + 26 * 3600000;
    while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (parisDate(mid) === today) lo = mid; else hi = mid; }
    return hi;
  }
  /* ---------- tirage (déterministe) ---------- */
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(list, rnd) { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), x = list[i]; list[i] = list[j]; list[j] = x; } return list; }
  /* un cycle : les images de chaque région mélangées, puis réparties à intervalles réguliers dans la suite (clé (j + u) / n),
     découpée en jours ; pool = [{id, r}] trié par identifiant */
  function rawCycle(pool, c, per) {
    const L = Math.floor(pool.length / per);
    const rnd = prng(hash('lk-devine|' + c + '|' + pool.map(x => x.id).join(',')));
    const groups = new Map();
    for (const x of pool) { if (!groups.has(x.r)) groups.set(x.r, []); groups.get(x.r).push(x.id); }
    const keyed = [];
    for (const r of [...groups.keys()].sort()) {
      const list = shuffle(groups.get(r).slice(), rnd), u = rnd(), n = list.length;
      list.forEach((id, j) => keyed.push([(j + u) / n, rnd(), id]));
    }
    keyed.sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : 1));
    const seq = keyed.map(x => x[2]), days = [];
    for (let d = 0; d < L; d++) days.push(seq.slice(d * per, d * per + per));
    return days;
  }
  /* le premier jour d’un cycle ne reprend aucune image du dernier jour du cycle précédent (échange avec un autre jour du
     cycle, jamais le dernier : le dernier jour d’un cycle reste celui du tirage brut) */
  function cycle(pool, c, per) {
    const days = rawCycle(pool, c, per), L = days.length;
    if (L < 3) return days;
    const prev = new Set(rawCycle(pool, c - 1, per)[L - 1]), hit = d => d.some(id => prev.has(id));
    if (hit(days[0])) for (let j = 1; j < L - 1; j++) if (!hit(days[j])) { const t = days[0]; days[0] = days[j]; days[j] = t; break; }
    return days;
  }
  function draw(pool, iso, opt) {
    const per = opt.per, L = Math.floor(pool.length / per);
    if (!L) return [];
    const D = dayIndex(iso) - dayIndex(opt.ref), c = Math.floor(D / L), k = D - c * L;
    return cycle(pool, c, per)[k].slice();
  }
  /* ---------- score, série, sauvegarde ---------- */
  const KEY = 'lk_devine_v1';
  const okIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const okId = s => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s);
  function blank() { return { v: 1, jour: null, serie: { d: null, n: 0 }, best: null }; }
  /* v7.92 : statistiques (st) — p parties du jour finies, m meilleure série, d[score] nombre de parties par score,
     g[région] = [bonnes réponses, images], h = [[jour, score]…] (60 derniers jours finis), a = album (images jouées) */
  const MAXH = 60, MAXA = 400;
  const okInt = n => Number.isInteger(n) && n >= 0 && n < 1e7;
  function blankSt(per) { return { p: 0, m: 0, d: new Array(per + 1).fill(0), g: {}, h: [], a: [] }; }
  function cleanSt(st, per) {
    const b = blankSt(per);
    if (!st || typeof st !== 'object' || Array.isArray(st)) return b;
    if (okInt(st.p)) b.p = st.p;
    if (okInt(st.m)) b.m = st.m;
    if (Array.isArray(st.d) && st.d.length === per + 1 && st.d.every(okInt)) b.d = st.d.slice();
    if (st.g && typeof st.g === 'object' && !Array.isArray(st.g)) Object.keys(st.g).slice(0, 40).forEach(k => { const v = st.g[k]; if (okId(k) && Array.isArray(v) && v.length === 2 && okInt(v[0]) && okInt(v[1]) && v[0] <= v[1]) b.g[k] = [v[0], v[1]]; });
    if (Array.isArray(st.h)) b.h = st.h.filter(x => Array.isArray(x) && x.length === 2 && okIso(x[0]) && Number.isInteger(x[1]) && x[1] >= 0 && x[1] <= per).slice(-MAXH);
    if (Array.isArray(st.a)) b.a = Array.from(new Set(st.a.filter(okId))).slice(0, MAXA);
    return b;
  }
  function valid(x) {
    if (!x || typeof x !== 'object' || x.v !== 1) return false;
    if (x.jour !== null && !(x.jour && okIso(x.jour.d) && Number.isInteger(x.jour.n) && Array.isArray(x.jour.ids) && x.jour.ids.length <= 10 && x.jour.ids.every(okId) && Array.isArray(x.jour.r) && x.jour.r.length <= x.jour.ids.length && x.jour.r.every(okId))) return false;
    if (!x.serie || !(x.serie.d === null || okIso(x.serie.d)) || !Number.isInteger(x.serie.n) || x.serie.n < 0) return false;
    if (!(x.best === null || (Number.isInteger(x.best) && x.best >= 0 && x.best <= 10))) return false;
    return true;
  }
  function score(ids, answers, regionOf) { let s = 0; answers.forEach((a, i) => { if (a === regionOf[ids[i]]) s++; }); return s; }
  /* série en cours : jours de suite où la partie du jour a été finie (aujourd’hui ou hier compris) */
  function streak(state, today) {
    const d = state.serie.d; if (!d) return 0;
    const gap = dayIndex(today) - dayIndex(d);
    return gap === 0 || gap === 1 ? state.serie.n : 0;
  }
  /* une réponse de la partie du jour : renvoie le nouvel état (l’ancien n’est pas modifié) */
  function answerDay(state, today, n, ids, region, regionOf) {
    const s = JSON.parse(JSON.stringify(state));
    if (!s.jour || s.jour.d !== today) s.jour = { d: today, n, ids: ids.slice(), r: [] };
    if (s.jour.r.length >= s.jour.ids.length) return s;
    const per = s.jour.ids.length;
    s.st = cleanSt(s.st, per);
    s.jour.r.push(region);
    /* l’image jouée rejoint l’album */
    const id = s.jour.ids[s.jour.r.length - 1];
    if (okId(id) && s.st.a.indexOf(id) < 0 && s.st.a.length < MAXA) s.st.a.push(id);
    if (s.jour.r.length === per) {
      const gap = s.serie.d ? dayIndex(today) - dayIndex(s.serie.d) : NaN;
      if (gap !== 0) s.serie = { d: today, n: gap === 1 ? s.serie.n + 1 : 1 };
      const sc = score(s.jour.ids, s.jour.r, regionOf);
      s.best = s.best === null ? sc : Math.max(s.best, sc);
      /* statistiques : une fois par jour */
      const last = s.st.h[s.st.h.length - 1];
      if (!last || last[0] !== today) {
        s.st.p++; s.st.d[sc]++;
        s.jour.ids.forEach((x, i) => { const r = regionOf[x]; if (!okId(r)) return; const g = s.st.g[r] || [0, 0]; s.st.g[r] = [g[0] + (s.jour.r[i] === r ? 1 : 0), g[1] + 1]; });
        s.st.h.push([today, sc]); if (s.st.h.length > MAXH) s.st.h = s.st.h.slice(-MAXH);
      }
      s.st.m = Math.max(s.st.m, s.serie.n);
    }
    return s;
  }
  /* résumé pour l’affichage : parties, séries, réussite (0 à 1, ou null), répartition, régions, sept derniers jours, album */
  function summary(state, today, per) {
    const st = cleanSt(state.st, per), g = st.g, cur = streak(state, today);
    let ok = 0, n = 0; Object.keys(g).forEach(k => { ok += g[k][0]; n += g[k][1]; });
    const t = dayIndex(today), week = [];
    for (let k = 6; k >= 0; k--) { const d = isoOfIndex(t - k), e = st.h.find(x => x[0] === d); week.push({ d, s: e ? e[1] : null }); }
    return { parties: st.p, serie: cur, serieMax: Math.max(st.m, cur), reussite: n ? ok / n : null, best: state.best, dist: st.d, regions: g, week, album: st.a.slice() };
  }
  /* jour du cycle des images (0 au premier jour d’un cycle) et longueur d’un cycle */
  function cycleDay(today, ref, total, per) { const L = Math.floor(total / per); if (!L) return { k: 0, L: 0 }; const D = dayIndex(today) - dayIndex(ref); return { k: ((D % L) + L) % L, L }; }
  function shareText(head, ids, answers, regionOf, url) {
    return [head].concat(ids.map((id, i) => (i + 1) + ' ' + (answers[i] === regionOf[id] ? '✅' : '❌')), [url]).join('\n');
  }
  const API = { KEY, dayIndex, isoOfIndex, parisDate, nextParisMidnight, hash, prng, rawCycle, cycle, draw, blank, valid, score, streak, answerDay, shareText, blankSt, cleanSt, summary, cycleDay, MAXH, MAXA };
  root.LKDevine = API;
  if (typeof document === 'undefined' || !document.querySelector) return;

  /* ====================== la page ====================== */
  const doc = document, game = doc.querySelector('[data-dv]');
  if (!game) return;
  const tplMsg = doc.getElementById('dv-msg'), tplPool = doc.getElementById('dv-pool');
  if (!tplMsg || !tplPool || !('content' in tplMsg)) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduced.matches || typeof Element.prototype.animate !== 'function';
  const $ = (sel, base) => (base || game).querySelector(sel), $$ = (sel, base) => Array.from((base || game).querySelectorAll(sel));
  /* textes de la page */
  const MSG = {};
  tplMsg.content.querySelectorAll('[data-k]').forEach(n => { MSG[n.getAttribute('data-k')] = n.textContent.replace(/\s+/g, ' ').trim(); });
  const lang = (doc.documentElement.lang || 'fr').slice(0, 2);
  const nf = new Intl.NumberFormat(lang), plural = new Intl.PluralRules(lang);
  const num = n => nf.format(n);
  let pf = null, wdf = null, ddf = null, longf = null;
  try { pf = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }); wdf = new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' }); ddf = new Intl.DateTimeFormat(lang, { day: 'numeric', timeZone: 'UTC' }); longf = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); } catch (_) { /* formats par défaut */ }
  const pct = x => (pf ? pf.format(x) : String(Math.round(x * 100))); /* aucun signe écrit ici : le format vient du navigateur */
  const atNoon = iso => new Date(iso + 'T12:00:00Z');
  const days = n => fill(plural.select(n) === 'one' ? 'dv-jours-one' : 'dv-jours-other', { n: num(n) });
  const fill = (k, o) => (MSG[k] || '').replace(/\{(\w+)\}/g, (m, x) => (o && o[x] !== undefined ? String(o[x]) : m));
  /* images (chacune : son image, sa légende et son titre officiel, montrés après la réponse) et régions */
  const POOL = Array.from(tplPool.content.querySelectorAll('[data-dv-img]')).map(f => ({ id: f.getAttribute('data-dv-img'), r: f.getAttribute('data-dv-r'), node: f })).sort((a, b) => (a.id < b.id ? -1 : 1));
  const pool = POOL.map(x => ({ id: x.id, r: x.r })), byId = Object.fromEntries(POOL.map(x => [x.id, x]));
  const regionOf = Object.fromEntries(pool.map(x => [x.id, x.r]));
  const opts = $$('[data-dv-opt]'), pins = $$('[data-dv-pin]');
  const NAME = Object.fromEntries(opts.map(b => [b.getAttribute('data-dv-opt'), ($('.dv-opt-t', b) || b).textContent.trim()]));
  /* v7.92 : le script est chargé juste après le jeu (async), avant que la suite de la page soit lue : la fiche et la devise
     de chaque région (cartes postales, plus bas) sont cherchées au moment voulu, et l’album rempli une fois la page lue */
  const ficheOf = r => { const a = doc.querySelector('a[data-dv-fiche="' + r + '"]'); return a ? a.getAttribute('href') : null; };
  const tagOf = r => { const p = doc.querySelector('[data-dv-tag="' + r + '"]'); return p ? p.textContent.replace(/\s+/g, ' ').trim() : ''; };
  const whenReady = f => { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', f, { once: true }); else f(); };
  const TINT = Object.fromEntries(opts.map(b => [b.getAttribute('data-dv-opt'), (b.style.getPropertyValue('--c') || '').trim()]));
  const PER = Math.max(1, parseInt(game.getAttribute('data-dv-per'), 10) || 5), DEBUT = game.getAttribute('data-dv-debut');
  if (!okIso(DEBUT) || pool.length < PER || pool.some(x => !NAME[x.r])) return;
  /* éléments */
  const board = $('[data-dv-board]'), nojs = $('[data-dv-nojs]'), result = $('[data-dv-result]');
  const live = $('[data-dv-live]'), card = $('[data-dv-card]'), deck = $('[data-dv-deck]'), verdict = $('[data-dv-verdict]');
  const answer = $('[data-dv-answer]'), nextBtn = $('[data-dv-next]'), ficheLink = $('[data-dv-fiche-link]'), line = $('[data-dv-line]');
  /* sauvegarde : lue au chargement, écrite seulement après une réponse */
  function load() { try { const raw = localStorage.getItem(KEY); if (raw === null) return blank(); const x = JSON.parse(raw); return valid(x) ? x : blank(); } catch (_) { return blank(); } }
  function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (_) { /* stockage indisponible : la partie continue sans être gardée */ } }
  let state = load();
  /* statistiques : remises en forme (un champ abîmé repart de zéro) ; l’album reprend les réponses déjà données
     aujourd’hui (sauvegarde d’avant la v7.92). Rien n’est écrit ici : la clé ne change qu’à la prochaine réponse. */
  state.st = cleanSt(state.st, PER);
  if (state.jour && Array.isArray(state.jour.ids)) state.jour.ids.slice(0, state.jour.r.length).forEach(id => { if (byId[id] && state.st.a.indexOf(id) < 0) state.st.a.push(id); });
  let sayTimer = 0;
  const say = text => { if (!live) return; window.clearTimeout(sayTimer); live.textContent = ''; sayTimer = window.setTimeout(() => { live.textContent = text; }, 80); };

  /* ---------- état de la partie ---------- */
  let today = '', dayN = 1, mode = 'day', cur = null, answered = false, lock = false;
  const day = { ids: [], r: [] }, free = { queue: [], last: null, seen: 0, ok: 0 };
  function setupDay() {
    today = parisDate(Date.now()); dayN = Math.max(1, dayIndex(today) - dayIndex(DEBUT) + 1);
    const j = state.jour;
    if (j && j.d === today && j.ids.length === PER && j.ids.every(id => byId[id]) && j.r.every(r => NAME[r])) { day.ids = j.ids.slice(); day.r = j.r.slice(); dayN = Math.max(1, j.n); }
    else { day.ids = draw(pool, today, { per: PER, ref: DEBUT }); day.r = []; }
  }
  const dayDone = () => day.r.length >= day.ids.length;

  /* ---------- affichage ---------- */
  function bar() {
    const isFree = mode === 'free';
    $('[data-dv-mode]').textContent = isFree ? fill('dv-libre') : fill('dv-jour', { n: num(dayN) });
    const count = $('[data-dv-count]');
    count.hidden = isFree;
    if (!isFree) count.textContent = fill('dv-image', { i: num(Math.min(day.r.length + (answered ? 0 : 1), PER)), total: num(PER) });
    $('[data-dv-points]').textContent = fill('dv-points', { score: num(isFree ? free.ok : score(day.ids, day.r, regionOf)), done: num(isFree ? free.seen : day.r.length) });
    const dots = $('[data-dv-dots]');
    dots.hidden = isFree;
    Array.from(dots.children).forEach((li, i) => { li.className = i < day.r.length ? (day.r[i] === regionOf[day.ids[i]] ? 'is-ok' : 'is-ko') : i === day.r.length && !answered ? 'is-now' : ''; });
    const back = $('[data-dv-back]'); if (back) back.hidden = !isFree;
    const chip = $('[data-dv-streak]');
    if (chip) { const st = streak(state, today); chip.hidden = isFree || st < 1; if (!chip.hidden) chip.textContent = fill('dv-serie', { n: days(st) }); }
  }
  function resetChoices() {
    answered = false;
    opts.forEach(b => { b.disabled = false; b.classList.remove('is-right', 'is-wrong', 'is-off'); const sr = $('.dv-opt-sr', b); if (sr) sr.textContent = ''; });
    pins.forEach(p => { p.disabled = false; p.classList.remove('is-right', 'is-wrong', 'is-off'); });
    if (line) line.classList.remove('is-on');
    verdict.hidden = true; verdict.className = 'dv-verdict';
    answer.hidden = true;
    const nw = $('[data-dv-answer-new]'); if (nw) nw.hidden = true;
  }
  /* pose l’image id sur la carte du dessus du paquet ; anim : la carte précédente s’en va, la suivante vient du paquet */
  function figureOf(id, first) {
    const src = byId[id].node.querySelector('img'), img = src.cloneNode(false), fig = doc.createElement('figure');
    fig.className = 'dv-fig';
    img.setAttribute('decoding', 'async'); if (first) img.setAttribute('fetchpriority', 'high');
    /* v7.92 : au téléphone, 800 px au plus (un écran à densité 3 prenait la 1 280 px pour une image de 360 px : deux à trois
       fois plus lourde, sans différence visible) ; <picture> sans boîte (.vt-pic de vitrine.css) */
    const phone = (img.getAttribute('srcset') || '').split(',').map(x => x.trim()).filter(x => /\s(?:480|800)w$/.test(x));
    if (phone.length === 2) {
      const pic = doc.createElement('picture'), source = doc.createElement('source');
      pic.className = 'vt-pic'; source.setAttribute('media', '(max-width:599px)'); source.setAttribute('srcset', phone.join(', ')); source.setAttribute('sizes', img.getAttribute('sizes') || '100vw');
      pic.appendChild(source); pic.appendChild(img); fig.appendChild(pic);
    } else fig.appendChild(img);
    return fig;
  }
  /* la carte jouée s’en va (classe is-out), la suivante vient du paquet (is-in) : animations de devine.css, jetons de
     motion-tokens.css ; « réduire les animations » : l’image change sur place */
  function show(id, anim) {
    cur = id; lock = true;
    resetChoices();
    const fig = figureOf(id, !anim), old = card.querySelector('.dv-fig');
    let done = false;
    const swap = () => {
      if (done) return; done = true;
      if (old) old.remove(); card.insertBefore(fig, verdict); lock = false;
      if (anim && !still()) { card.classList.remove('is-in'); void card.offsetWidth; card.classList.add('is-in'); }
    };
    if (anim && old && !still()) {
      old.classList.add('is-out');
      old.addEventListener('animationend', swap, { once: true });
      window.setTimeout(swap, 400);
    } else swap();
    deck.setAttribute('data-left', String(mode === 'day' ? Math.max(0, day.ids.length - day.r.length - 1) : 2));
    bar();
  }
  function preload(id) {
    if (!id || !byId[id]) return;
    const i = byId[id].node.querySelector('img'), p = new Image();
    p.decoding = 'async'; if (i.getAttribute('srcset')) { p.sizes = i.getAttribute('sizes') || ''; p.srcset = i.getAttribute('srcset'); } p.src = i.getAttribute('src');
  }
  /* trait entre la réponse et la bonne région (coordonnées de la carte, 5200 × 6000) */
  function drawLine(a, b) {
    const l = line && line.querySelector('line'), pa = pins.find(p => p.getAttribute('data-dv-pin') === a), pb = pins.find(p => p.getAttribute('data-dv-pin') === b);
    if (!l || !pa || !pb) return;
    l.setAttribute('x1', pa.getAttribute('data-x')); l.setAttribute('y1', pa.getAttribute('data-y'));
    l.setAttribute('x2', pb.getAttribute('data-x')); l.setAttribute('y2', pb.getAttribute('data-y'));
    line.classList.remove('is-on'); void line.getBoundingClientRect(); line.classList.add('is-on');
  }
  const top = el => el.getBoundingClientRect().top;
  const inView = el => { const r = el.getBoundingClientRect(); return r.top >= 60 && r.bottom <= (window.innerHeight || 800); };
  const reveal = el => { if (!inView(el)) window.scrollTo({ top: Math.max(0, top(el) + window.scrollY - 96), behavior: still() ? 'auto' : 'smooth' }); };
  function choose(region) {
    if (answered || lock || !cur || !NAME[region]) return;
    answered = true;
    const right = regionOf[cur], ok = region === right;
    let fresh = false;
    if (mode === 'day') {
      if (!dayDone()) { fresh = state.st.a.indexOf(cur) < 0; day.r.push(region); state = answerDay(state, today, dayN, day.ids, region, regionOf); save(state); renderAtlas(); }
    } else { free.seen++; if (ok) free.ok++; }
    const mark = (list, attr) => list.forEach(x => { const r = x.getAttribute(attr); x.disabled = true; x.classList.add(r === right ? 'is-right' : r === region ? 'is-wrong' : 'is-off'); });
    mark(opts, 'data-dv-opt'); mark(pins, 'data-dv-pin');
    opts.forEach(b => { const r = b.getAttribute('data-dv-opt'), sr = $('.dv-opt-sr', b); if (sr) sr.textContent = r === right ? ', ' + fill('dv-sr-bonne') : r === region ? ', ' + fill('dv-sr-ta') : ''; });
    if (!ok) drawLine(region, right);
    verdict.textContent = (ok ? '✓ ' + fill('dv-verdict-juste') : '✗ ' + fill('dv-verdict-rate')) + ', ' + NAME[right];
    verdict.className = 'dv-verdict ' + (ok ? 'is-ok' : 'is-ko'); verdict.hidden = false;
    const t = ok ? fill('dv-juste', { region: NAME[right] }) : fill('dv-rate', { region: NAME[right], choix: NAME[region] });
    const at = $('[data-dv-answer-t]'); at.textContent = t; at.className = 'dv-answer-t ' + (ok ? 'is-ok' : 'is-ko');
    const src = byId[cur].node;
    $('[data-dv-leg]').textContent = (src.querySelector('.dv-leg') || {}).textContent || '';
    $('[data-dv-tit]').textContent = (src.querySelector('.dv-tit') || {}).textContent || '';
    const tag = $('[data-dv-answer-tag]');
    if (tag) { const tg = tagOf(right); tag.textContent = tg; tag.hidden = !tg; tag.style.setProperty('--c', TINT[right] || ''); }
    const nw = $('[data-dv-answer-new]');
    if (nw) { nw.hidden = !fresh; if (fresh) nw.textContent = fill('dv-album-new'); }
    ficheLink.textContent = fill('dv-fiche', { region: NAME[right] });
    const fh = ficheOf(right); if (fh) ficheLink.setAttribute('href', fh);
    nextBtn.textContent = mode === 'day' && dayDone() ? fill('dv-voir') : fill('dv-suivante');
    answer.hidden = false;
    if (window.LKMotion && window.LKMotion.enter) window.LKMotion.enter([answer], { rise: 10, duration: 300 });
    bar();
    nextBtn.focus({ preventScroll: true });
    if (!inView(answer)) answer.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
    say(t);
    preload(mode === 'day' ? day.ids[day.r.length] : free.queue[free.queue.length - 1]);
  }
  function next() {
    if (mode === 'day') {
      if (dayDone()) { showResult(true); return; }
      show(day.ids[day.r.length], true);
      say(fill('dv-annonce', { i: num(day.r.length + 1), total: num(PER) }));
    } else {
      show(freeNext(), true);
      say(fill('dv-annonce-libre'));
    }
    reveal($('.dv-bar'));
    focusGame();
  }
  const focusGame = () => { const first = opts.find(b => !b.disabled); if (first) first.focus({ preventScroll: true }); };
  /* partie libre : tout le paquet mélangé, puis de nouveau, sans répéter la dernière image */
  function freeNext() {
    if (!free.queue.length) {
      const ids = shuffle(pool.map(x => x.id), Math.random);
      if (ids.length > 1 && ids[ids.length - 1] === free.last) { const t = ids[0]; ids[0] = ids[ids.length - 1]; ids[ids.length - 1] = t; }
      free.queue = ids;
    }
    free.last = free.queue.pop();
    return free.last;
  }

  /* ---------- résultat ---------- */
  let timer = 0;
  function countdown() {
    const el = $('[data-dv-countdown]', result); if (!el) return;
    window.clearTimeout(timer);
    if (result.hidden) return;
    const now = Date.now(), nb = $('[data-dv-new]', result);
    if (parisDate(now) !== today) { el.textContent = fill('dv-nouvelle'); if (nb) nb.hidden = false; return; }
    if (nb) nb.hidden = true;
    const left = Math.max(0, nextParisMidnight(now) - now), h = Math.floor(left / 3600000), m = Math.floor((left - h * 3600000) / 60000);
    el.textContent = h > 0 ? fill('dv-prochaine', { h: num(h), m: num(m) }) : fill('dv-prochaine-min', { m: num(Math.max(1, m)) });
    timer = window.setTimeout(countdown, Math.min(30000, left + 1000));
  }
  function showResult(fresh) {
    mode = 'day';
    const sc = score(day.ids, day.r, regionOf);
    board.hidden = true; result.hidden = false;
    $('[data-dv-res-k]', result).textContent = fill('dv-jour', { n: num(dayN) });
    $('[data-dv-res-score]', result).textContent = fill('dv-sur', { score: num(sc), total: num(PER) });
    $('[data-dv-res-msg]', result).textContent = fill('dv-res-' + Math.max(0, Math.min(5, Math.round(sc * 5 / PER))));
    const list = $('[data-dv-res-list]', result); list.textContent = '';
    day.ids.forEach((id, i) => {
      const r = regionOf[id], ok = day.r[i] === r;
      const li = doc.createElement('li'); li.className = 'dv-res-i ' + (ok ? 'is-ok' : 'is-ko');
      const img = byId[id].node.querySelector('img').cloneNode(false);
      img.setAttribute('loading', 'lazy'); img.setAttribute('sizes', '120px'); img.setAttribute('alt', '');
      const thumb = doc.createElement('span'); thumb.className = 'dv-res-img'; thumb.appendChild(img);
      const mark = doc.createElement('span'); mark.className = 'dv-res-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = ok ? '✓' : '✗';
      const txt = doc.createElement('span'); txt.className = 'dv-res-txt';
      const a = doc.createElement('a'); a.href = ficheOf(r) || '#'; a.setAttribute('data-dv-link-r', r); a.textContent = NAME[r]; a.setAttribute('translate', 'no');
      const n = doc.createElement('span'); n.className = 'dv-res-n'; n.textContent = num(i + 1);
      const v = doc.createElement('small'); v.textContent = ok ? fill('dv-verdict-juste') : fill('dv-res-ta', { verdict: fill('dv-verdict-rate'), choix: NAME[day.r[i]] || '' });
      txt.append(a, v); li.append(thumb, n, mark, txt); list.appendChild(li);
    });
    renderStats(sc);
    const canon = doc.querySelector('link[rel="canonical"]'), url = canon ? canon.getAttribute('href') : location.href.split('#')[0];
    $('[data-dv-share-txt]', result).textContent = shareText(fill('dv-partage-titre', { n: dayN, score: sc, total: PER }), day.ids, day.r, regionOf, url);
    countdown();
    if (fresh) {
      result.focus({ preventScroll: true });
      reveal(result);
      say(fill('dv-fin', { score: num(sc), total: num(PER) }) + ' ' + $('[data-dv-res-msg]', result).textContent);
      if (window.LKMotion && window.LKMotion.enter) window.LKMotion.enter($$('.dv-res-i', result), { stagger: 50, cap: 300, rise: 10 });
    }
  }
  /* ---------- v7.92 : statistiques, album, cycle ---------- */
  const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const setBar = (el, x) => { if (el) el.style.setProperty('--p', Math.round(Math.max(0, Math.min(1, x)) * 1000) / 10 + '%'); };
  function renderStats(todayScore) {
    const S = summary(state, today, PER);
    setText($('[data-dv-serie]', result), days(S.serie));
    setText($('[data-dv-serie-max]', result), days(S.serieMax));
    setText($('[data-dv-parties]', result), num(S.parties));
    setText($('[data-dv-reussite]', result), S.reussite === null ? '—' : pct(S.reussite));
    setText($('[data-dv-best]', result), S.best === null ? '—' : fill('dv-sur', { score: num(S.best), total: num(PER) }));
    setText($('[data-dv-album-n]', result), fill('dv-sur', { score: num(S.album.filter(id => byId[id]).length), total: num(pool.length) }));
    /* scores : une barre par score, la plus longue pleine */
    const most = Math.max(1, ...S.dist);
    $$('[data-dv-dist]', result).forEach(li => {
      const k = parseInt(li.getAttribute('data-dv-dist'), 10), n = S.dist[k] || 0;
      setText($('.dv-dist-k', li), fill('dv-sur', { score: num(k), total: num(PER) }));
      setText($('.dv-dist-v', li), num(n)); setBar($('.dv-dist-bar', li), n / most);
      li.classList.toggle('is-today', k === todayScore); li.classList.toggle('is-zero', !n);
    });
    /* régions : part de bonnes réponses */
    $$('[data-dv-rs]', result).forEach(li => {
      const g = S.regions[li.getAttribute('data-dv-rs')];
      setText($('.dv-rs-v', li), g && g[1] ? pct(g[0] / g[1]) : '—'); setText($('.dv-rs-c', li), g && g[1] ? num(g[0]) + '/' + num(g[1]) : '');
      setBar($('.dv-rs-bar', li), g && g[1] ? g[0] / g[1] : 0); li.classList.toggle('is-zero', !(g && g[1]));
    });
    /* sept derniers jours */
    const wk = $('[data-dv-week]', result);
    if (wk) {
      wk.textContent = '';
      S.week.forEach((w, i) => {
        const li = doc.createElement('li'), d = atNoon(w.d);
        li.className = 'dv-wk' + (w.s === null ? ' is-empty' : '') + (i === 6 ? ' is-today' : '');
        if (w.s !== null) li.style.setProperty('--s', String(w.s / PER));
        const a = doc.createElement('span'); a.className = 'dv-wk-d'; a.setAttribute('aria-hidden', 'true'); a.textContent = wdf ? wdf.format(d) : w.d.slice(5);
        const b = doc.createElement('span'); b.className = 'dv-wk-n'; b.setAttribute('aria-hidden', 'true'); b.textContent = ddf ? ddf.format(d) : '';
        const c = doc.createElement('span'); c.className = 'dv-wk-s'; c.setAttribute('aria-hidden', 'true'); c.textContent = w.s === null ? '·' : num(w.s);
        const sr = doc.createElement('span'); sr.className = 'sr-only'; const when = longf ? longf.format(d) : w.d;
        sr.textContent = w.s === null ? fill('dv-sem-vide', { w: when }) : fill('dv-sem-score', { w: when, score: num(w.s), total: num(PER) });
        li.append(a, b, c, sr); wk.appendChild(li);
      });
    }
    const dots = $('[data-dv-res-dots]', result);
    if (dots) Array.from(dots.children).forEach((li, i) => { li.className = i < day.r.length ? (day.r[i] === regionOf[day.ids[i]] ? 'is-ok' : 'is-ko') : ''; });
  }
  /* l’album, dans les fiches des régions : les images jouées remplacent le dos des cartes ; celles d’aujourd’hui sont marquées */
  function renderAtlas() {
    const seen = new Set(state.st.a.filter(id => byId[id])), todays = new Set(state.jour && state.jour.d === today ? state.jour.ids.slice(0, state.jour.r.length) : []);
    doc.querySelectorAll('[data-dv-slot]').forEach(li => {
      const id = li.getAttribute('data-dv-slot');
      if (seen.has(id) && !li.classList.contains('is-seen') && byId[id]) {
        const img = byId[id].node.querySelector('img').cloneNode(false);
        img.setAttribute('loading', 'lazy'); img.setAttribute('decoding', 'async'); img.setAttribute('sizes', '(max-width:599px) 28vw, 120px');
        li.textContent = ''; li.appendChild(img); li.classList.add('is-seen');
      }
      li.classList.toggle('is-new', todays.has(id));
    });
    doc.querySelectorAll('[data-dv-reg]').forEach(card => {
      const r = card.getAttribute('data-dv-reg'), total = card.querySelectorAll('[data-dv-slot]').length, n = card.querySelectorAll('[data-dv-slot].is-seen').length;
      setText(card.querySelector('[data-dv-pc-n]'), fill('dv-album-reg', { n: num(n), total: num(total) }));
      const g = state.st.g[r], okEl = card.querySelector('[data-dv-pc-ok]');
      if (okEl) { okEl.hidden = !(g && g[1]); if (g && g[1]) setText(okEl, fill('dv-reussite', { pct: pct(g[0] / g[1]) })); }
      card.classList.toggle('is-full', total > 0 && n === total);
    });
    const barT = doc.querySelector('[data-dv-albumbar-t]'), barI = doc.querySelector('[data-dv-albumbar-i]');
    if (barT) setText(barT, fill('dv-album', { n: num(seen.size), total: num(pool.length) }));
    setBar(barI, seen.size / pool.length);
  }
  /* le cycle des images : où en est le cycle aujourd’hui (aucune image ni région n’est montrée) */
  function renderCycle() {
    const box = doc.querySelector('[data-dv-cycle]'); if (!box) return;
    const c = cycleDay(today, DEBUT, pool.length, PER), cols = box.querySelectorAll('[data-dv-cday]');
    if (!c.L || cols.length !== c.L) return;
    cols.forEach((li, i) => { li.classList.toggle('is-past', i < c.k); li.classList.toggle('is-now', i === c.k); });
    const t = box.querySelector('[data-dv-cycle-n]'); if (t) { t.textContent = fill('dv-cycle', { n: num(c.k + 1), total: num(c.L) }); t.hidden = false; }
  }

  /* ---------- partage ---------- */
  async function copy(text) {
    try {
      if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard');
      await navigator.clipboard.writeText(text); say(fill('dv-copie')); return true;
    } catch (_) {
      const pre = $('[data-dv-share-txt]', result);
      try { const r = doc.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); if (doc.execCommand && doc.execCommand('copy')) { say(fill('dv-copie')); return true; } } catch (__) { /* le texte reste sélectionné */ }
      say(fill('dv-copie-ko')); return false;
    }
  }
  async function share() {
    const text = $('[data-dv-share-txt]', result).textContent;
    if (navigator.share && (!navigator.canShare || navigator.canShare({ text }))) {
      try { await navigator.share({ text }); say(fill('dv-partage-ok')); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    copy(text);
  }

  /* ---------- écoute ---------- */
  opts.forEach(b => b.addEventListener('click', () => choose(b.getAttribute('data-dv-opt'))));
  pins.forEach(p => p.addEventListener('click', () => choose(p.getAttribute('data-dv-pin'))));
  nextBtn.addEventListener('click', next);
  game.addEventListener('click', ev => {
    const t = ev.target.closest('button'); if (!t || !game.contains(t)) return;
    if (t.hasAttribute('data-dv-share')) share();
    else if (t.hasAttribute('data-dv-copy')) copy($('[data-dv-share-txt]', result).textContent);
    else if (t.hasAttribute('data-dv-free')) startFree();
    else if (t.hasAttribute('data-dv-back')) { if (dayDone()) showResult(true); }
    else if (t.hasAttribute('data-dv-new')) { setupDay(); start(true); }
  });
  function startFree() {
    mode = 'free'; result.hidden = true; board.hidden = false; window.clearTimeout(timer);
    show(freeNext(), false);
    reveal($('.dv-bar'));
    say(fill('dv-libre-annonce') + ' ' + fill('dv-annonce-libre'));
    focusGame();
  }
  function start(focus) {
    nojs.hidden = true;
    if (dayDone()) { showResult(false); if (focus) result.focus({ preventScroll: true }); say(fill('dv-deja')); return; }
    mode = 'day'; result.hidden = true; board.hidden = false;
    show(day.ids[day.r.length], false);
    deck.classList.add('is-dealt');
    if (focus) focusGame();
    say(fill('dv-annonce', { i: num(day.r.length + 1), total: num(PER) }));
  }
  /* page restée ouverte : le compte à rebours suit, et propose la nouvelle partie après minuit */
  doc.addEventListener('visibilitychange', () => { if (!doc.hidden && !result.hidden) countdown(); });
  setupDay();
  start(false);
  /* la page entière lue : album, cycle, et les liens du résultat montré avant (partie du jour déjà jouée) */
  whenReady(() => {
    renderAtlas(); renderCycle();
    doc.querySelectorAll('[data-dv-link-r]').forEach(a => { const h = ficheOf(a.getAttribute('data-dv-link-r')); if (h) a.setAttribute('href', h); });
  });
})(typeof window !== 'undefined' ? window : this);
