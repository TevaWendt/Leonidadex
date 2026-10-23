/* Généré depuis outils/sources/jeux-core.js : modifie la source, pas ce fichier. */
(function (root) {
  'use strict';
  const DAY = 86400000;
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
  function nextParisMidnight(t) {
    const today = parisDate(t);
    let lo = t, hi = t + 26 * 3600000;
    while (hi - lo > 1000) { const mid = Math.floor((lo + hi) / 2); if (parisDate(mid) === today) lo = mid; else hi = mid; }
    return hi;
  }
  function hash(str) { let h = 2166136261; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function prng(seed) {
    let a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function shuffle(list, rnd) { for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)), x = list[i]; list[i] = list[j]; list[j] = x; } return list; }
  function rawCycle(pool, c, per, salt) {
    const L = Math.floor(pool.length / per);
    const rnd = prng(hash('lk-jeux|' + salt + '|' + c + '|' + pool.map(x => x.id).join(',')));
    const groups = new Map();
    for (const x of pool) { if (!groups.has(x.g)) groups.set(x.g, []); groups.get(x.g).push(x.id); }
    const keyed = [];
    for (const g of [...groups.keys()].sort()) {
      const list = shuffle(groups.get(g).slice(), rnd), u = rnd(), n = list.length;
      list.forEach((id, j) => keyed.push([(j + u) / n, rnd(), id]));
    }
    keyed.sort((a, b) => a[0] - b[0] || a[1] - b[1] || (a[2] < b[2] ? -1 : 1));
    const seq = keyed.map(x => x[2]), days = [];
    for (let d = 0; d < L; d++) days.push(seq.slice(d * per, d * per + per));
    return days;
  }
  function cycle(pool, c, per, salt, max) {
    const days = rawCycle(pool, c, per, salt), L = days.length;
    if (L < 2) return days;
    const used = new Set([].concat(...days)), rest = pool.map(x => x.id).filter(id => !used.has(id));
    const prev = new Set(rawCycle(pool, c - 1, per, salt)[L - 1]), hit = d => d.some(id => prev.has(id));
    if (hit(days[0])) for (let j = 1; j < L - 1; j++) if (!hit(days[j])) { const t = days[0]; days[0] = days[j]; days[j] = t; break; }
    if (hit(days[0])) {
      const gOf = {}; pool.forEach(x => { gOf[x.id] = x.g; });
      const cap = max || Infinity, count = (d, g, skip) => d.filter(id => id !== skip && gOf[id] === g).length;
      for (let i = 0; i < per; i++) {
        const x = days[0][i]; if (!prev.has(x)) continue;
        let done = false;
        for (let k = 0; k < rest.length && !done; k++) { const y = rest[k]; if (prev.has(y) || count(days[0], gOf[y], x) >= cap) continue; days[0][i] = y; rest[k] = x; done = true; }
        for (let j = 1; j < L - 1 && !done; j++) for (let k = 0; k < per && !done; k++) { const y = days[j][k]; if (prev.has(y) || count(days[0], gOf[y], x) >= cap || count(days[j], gOf[x], y) >= cap) continue; days[0][i] = y; days[j][k] = x; done = true; }
      }
    }
    return days;
  }
  function draw(pool, iso, opt) {
    const per = opt.per, L = Math.floor(pool.length / per);
    if (!L) return [];
    const D = dayIndex(iso) - dayIndex(opt.ref), c = Math.floor(D / L), k = D - c * L;
    return cycle(pool, c, per, opt.salt || '', opt.max)[k].slice();
  }
  const KEY = 'lk_jeux_v1', DEVINE = 'lk_devine_v1', MAXH = 60, GAMES = ['frise', 'station'];
  const okIso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
  const okId = s => typeof s === 'string' && /^[a-z0-9-]{1,80}$/.test(s);
  const okInt = n => Number.isInteger(n) && n >= 0 && n < 1e7;
  const obj = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const okChoice = c => (typeof c === 'number' && Number.isInteger(c) && c >= 0 && c < 100) || okId(c);
  function blankGame(per) { return { jour: null, serie: { d: null, n: 0 }, best: null, st: { p: 0, m: 0, d: new Array(per + 1).fill(0), h: [] } }; }
  function cleanGame(x, per) {
    const b = blankGame(per);
    if (!obj(x)) return b;
    const j = x.jour;
    if (obj(j) && okIso(j.d) && okInt(j.n) && Array.isArray(j.ids) && j.ids.length <= 12 && j.ids.every(okId) && Array.isArray(j.r) && Array.isArray(j.k) && j.r.length === j.k.length && j.k.length <= per && j.r.every(okChoice) && j.k.every(v => v === 0 || v === 1))
      b.jour = { d: j.d, n: j.n, ids: j.ids.slice(), r: j.r.slice(), k: j.k.slice() };
    if (obj(x.serie) && (x.serie.d === null || okIso(x.serie.d)) && okInt(x.serie.n)) b.serie = { d: x.serie.d, n: x.serie.n };
    if (Number.isInteger(x.best) && x.best >= 0 && x.best <= per) b.best = x.best;
    const st = x.st;
    if (obj(st)) {
      if (okInt(st.p)) b.st.p = st.p;
      if (okInt(st.m)) b.st.m = st.m;
      if (Array.isArray(st.d) && st.d.length === per + 1 && st.d.every(okInt)) b.st.d = st.d.slice();
      if (Array.isArray(st.h)) b.st.h = st.h.filter(e => Array.isArray(e) && e.length === 2 && okIso(e[0]) && Number.isInteger(e[1]) && e[1] >= 0 && e[1] <= per).slice(-MAXH);
    }
    return b;
  }
  function blank() { return { v: 1, g: {}, dc: 0, dd: null, gm: 0, b: [], lv: null }; }
  function clean(x, pers) {
    const b = blank();
    if (!obj(x) || x.v !== 1) return b;
    if (obj(x.g)) for (const id of GAMES) if (x.g[id] !== undefined) b.g[id] = cleanGame(x.g[id], (pers && pers[id]) || 5);
    if (okInt(x.dc)) b.dc = x.dc;
    if (x.dd === null || okIso(x.dd)) b.dd = x.dd === undefined ? null : x.dd;
    if (okInt(x.gm)) b.gm = x.gm;
    if (Array.isArray(x.b)) b.b = Array.from(new Set(x.b.filter(okId))).slice(0, 60);
    if (Number.isInteger(x.lv) && x.lv >= 0 && x.lv < 50) b.lv = x.lv;
    return b;
  }
  function answerGame(g, today, n, ids, choice, ok, per) {
    const s = cleanGame(JSON.parse(JSON.stringify(g || null)), per);
    if (!s.jour || s.jour.d !== today) s.jour = { d: today, n, ids: ids.slice(), r: [], k: [] };
    if (s.jour.k.length >= per) return s;
    s.jour.r.push(choice); s.jour.k.push(ok ? 1 : 0);
    if (s.jour.k.length === per) {
      const gap = s.serie.d ? dayIndex(today) - dayIndex(s.serie.d) : NaN;
      if (gap !== 0) s.serie = { d: today, n: gap === 1 ? s.serie.n + 1 : 1 };
      const sc = s.jour.k.reduce((a, v) => a + v, 0);
      s.best = s.best === null ? sc : Math.max(s.best, sc);
      const last = s.st.h[s.st.h.length - 1];
      if (!last || last[0] !== today) { s.st.p++; s.st.d[sc]++; s.st.h.push([today, sc]); if (s.st.h.length > MAXH) s.st.h = s.st.h.slice(-MAXH); }
      s.st.m = Math.max(s.st.m, s.serie.n);
    }
    return s;
  }
  function streak(serie, today) {
    const d = serie && serie.d; if (!d) return 0;
    const gap = dayIndex(today) - dayIndex(d);
    return gap === 0 || gap === 1 ? serie.n : 0;
  }
  function devineInfo(x, today) {
    const out = { per: 5, parties: 0, ok: 0, perfect: 0, days: [], today: { done: 0, total: 5, finished: false, score: null }, regions: 0, album: 0, serie: 0, serieMax: 0 };
    if (!obj(x) || x.v !== 1) return out;
    const st = obj(x.st) ? x.st : null;
    if (st && Array.isArray(st.d) && st.d.length >= 2 && st.d.every(okInt)) {
      out.per = st.d.length - 1;
      st.d.forEach((n, k) => { out.parties += n; out.ok += n * k; });
      out.perfect = st.d[out.per];
    }
    if (st && Array.isArray(st.h)) out.days = st.h.filter(e => Array.isArray(e) && okIso(e[0]) && Number.isInteger(e[1])).map(e => e[0]);
    if (st && obj(st.g)) out.regions = Object.keys(st.g).filter(k => Array.isArray(st.g[k]) && okInt(st.g[k][0]) && st.g[k][0] >= 1).length;
    if (st && Array.isArray(st.a)) out.album = new Set(st.a.filter(okId)).size;
    if (st && okInt(st.m)) out.serieMax = st.m;
    if (obj(x.serie)) out.serie = streak(x.serie, today);
    out.today.total = out.per;
    const j = x.jour;
    if (obj(j) && j.d === today && Array.isArray(j.ids) && Array.isArray(j.r)) {
      out.today.total = j.ids.length || out.per; out.today.done = Math.min(j.r.length, out.today.total);
      out.today.finished = out.today.done >= out.today.total;
      const e = st && Array.isArray(st.h) ? st.h.find(z => Array.isArray(z) && z[0] === today) : null;
      if (out.today.finished && e && Number.isInteger(e[1])) out.today.score = e[1];
    }
    return out;
  }
  function gameInfo(g, today, per) {
    const s = cleanGame(g, per), out = { per, parties: 0, ok: 0, perfect: 0, days: s.st.h.map(e => e[0]), today: { done: 0, total: per, finished: false, score: null }, serie: streak(s.serie, today), serieMax: s.st.m, best: s.best };
    s.st.d.forEach((n, k) => { out.parties += n; out.ok += n * k; });
    out.perfect = s.st.d[per];
    if (s.jour && s.jour.d === today) {
      out.today.done = s.jour.k.length; out.today.finished = out.today.done >= per;
      out.today.score = s.jour.k.reduce((a, v) => a + v, 0);
    }
    return out;
  }
  function runs(days, today) {
    const set = new Set(days.filter(okIso)), idx = [...set].map(dayIndex).sort((a, b) => a - b);
    let best = 0, cur = 0, prev = NaN;
    for (const i of idx) { cur = i === prev + 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = i; }
    const t = dayIndex(today);
    let start = set.has(today) ? t : set.has(isoOfIndex(t - 1)) ? t - 1 : NaN, now = 0;
    while (!isNaN(start) && set.has(isoOfIndex(start - now))) now++;
    return { now, best };
  }
  function defiOf(today, ids) { return ids.length ? ids[hash('lk-defi|' + today) % ids.length] : null; }
  function defiDone(id, T) {
    const all = [T.devine, T.frise, T.station];
    if (id === 'trois') return all.every(x => x.finished);
    if (id === 'devine-4') return T.devine.finished && T.devine.score !== null && T.devine.score >= T.devine.total - 1;
    if (id === 'frise-4') return T.frise.finished && T.frise.score >= T.frise.total - 1;
    if (id === 'station-4') return T.station.finished && T.station.score >= T.station.total - 1;
    if (id === 'parfait') return all.some(x => x.finished && x.score !== null && x.score === x.total);
    if (id === 'total-12') return all.reduce((a, x) => a + (x.finished && x.score !== null ? x.score : 0), 0) >= 12;
    return false;
  }
  function defiProgress(id, T) {
    if (!id || !T) return 0;
    if (defiDone(id, T)) return 1;
    const all = [T.devine, T.frise, T.station], part = x => (x.total ? Math.min(1, x.done / x.total) : 0);
    const four = x => (x.finished ? (x.score === null ? 0 : Math.min(1, x.score / Math.max(1, x.total - 1))) : part(x));
    let p = 0;
    if (id === 'trois') p = all.filter(x => x.finished).length / 3;
    else if (id === 'devine-4') p = four(T.devine);
    else if (id === 'frise-4') p = four(T.frise);
    else if (id === 'station-4') p = four(T.station);
    else if (id === 'parfait') p = Math.max.apply(null, all.map(x => (x.finished || (x.score !== null && x.score < x.done) ? 0 : part(x))));
    else if (id === 'total-12') p = all.reduce((a, x) => a + (x.score || 0), 0) / 12;
    return Math.max(0, Math.min(0.95, p));
  }
  function summary(store, dvRaw, today, conf) {
    const s = clean(store, conf.pers), pers = conf.pers || {};
    const dv = devineInfo(dvRaw, today), fr = gameInfo(s.g.frise, today, pers.frise || 5), sta = gameInfo(s.g.station, today, pers.station || 5);
    const G = { devine: dv, frise: fr, station: sta };
    const T = { devine: dv.today, frise: fr.today, station: sta.today };
    const defi = defiOf(today, conf.defis || []), defiOk = s.dd === today || (defi ? defiDone(defi, T) : false);
    const dc = s.dc + (defiOk && s.dd !== today ? 1 : 0);
    const ok = dv.ok + fr.ok + sta.ok, perfect = dv.perfect + fr.perfect + sta.perfect, parties = dv.parties + fr.parties + sta.parties;
    const [pb, ps, pd] = conf.pts || [10, 20, 50];
    const pts = pb * ok + ps * perfect + pd * dc;
    const lv = conf.lv || [0];
    let level = 0; lv.forEach((m, i) => { if (pts >= m) level = i; });
    const r = runs(dv.days.concat(fr.days, sta.days), today), serieMax = Math.max(s.gm, r.best, dv.serieMax, fr.serieMax, sta.serieMax);
    const all3 = dv.days.some(d => fr.days.includes(d) && sta.days.includes(d));
    const B = {
      'premier-pas': parties >= 1, 'sans-faute': perfect >= 1, 'trois-du-jour': all3, 'serie-3': serieMax >= 3, 'serie-7': serieMax >= 7,
      'tour-de-leonida': dv.regions >= (conf.regions || 6), album: dv.album >= 20, archiviste: fr.perfect >= 1, 'oreille-d-or': sta.perfect >= 1, defis: dc >= 5
    };
    const badges = (conf.badges || Object.keys(B)).filter(id => B[id] || s.b.indexOf(id) >= 0);
    return { pts, level, next: level + 1 < lv.length ? lv[level + 1] : null, floor: lv[level], ok, perfect, parties, serie: r.now, serieMax, dc, defi, defiOk, badges, games: G, today: T, store: s };
  }
  function shareText(head, ks, url) { return [head].concat(ks.map((v, i) => (i + 1) + ' ' + (v ? '✅' : '❌')), [url]).join('\n'); }
  const API = { KEY, DEVINE, GAMES, MAXH, dayIndex, isoOfIndex, parisDate, nextParisMidnight, hash, prng, shuffle, rawCycle, cycle, draw, blankGame, cleanGame, blank, clean, answerGame, streak, devineInfo, gameInfo, runs, defiOf, defiDone, summary, shareText, defiProgress };
  root.LKJeux = API;
  if (typeof document === 'undefined' || !document.querySelector) return;
  const doc = document;
  const reduced = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: true };
  const still = () => reduced.matches || typeof Element.prototype.animate !== 'function';
  const lang = (doc.documentElement.lang || 'fr').slice(0, 2);
  const nf = new Intl.NumberFormat(lang), plural = new Intl.PluralRules(lang), num = n => nf.format(n);
  let pf = null, wdf = null, ddf = null, longf = null, datef = null;
  try { pf = new Intl.NumberFormat(lang, { style: 'percent', maximumFractionDigits: 0 }); wdf = new Intl.DateTimeFormat(lang, { weekday: 'short', timeZone: 'UTC' }); ddf = new Intl.DateTimeFormat(lang, { day: 'numeric', timeZone: 'UTC' }); longf = new Intl.DateTimeFormat(lang, { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }); datef = new Intl.DateTimeFormat(lang, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }); } catch (_) {  }
  const pct = x => (pf ? pf.format(x) : String(Math.round(x * 100)));
  const atNoon = iso => new Date(iso + 'T12:00:00Z');
  const dateText = iso => (datef ? datef.format(atNoon(iso)) : iso);
  const readTpl = id => { const t = doc.getElementById(id), out = {}; if (t && 'content' in t) t.content.querySelectorAll('[data-k]').forEach(n => { out[n.getAttribute('data-k')] = n.textContent.replace(/\s+/g, ' ').trim(); }); return out; };
  const filler = M => (k, o) => (M[k] || '').replace(/\{(\w+)\}/g, (m, x) => (o && o[x] !== undefined ? String(o[x]) : m));
  const setText = (el, t) => { if (el && el.textContent !== t) el.textContent = t; };
  const setBar = (el, x) => { if (el) el.style.setProperty('--s', String(Math.round(Math.max(0, Math.min(1, x)) * 1000) / 1000)); };
  function readJSON(k) { try { const raw = localStorage.getItem(k); return raw === null ? null : JSON.parse(raw); } catch (_) { return null; } }
  function write(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (_) { return false;  } }
  const CORE = readTpl('lkj-core'), cf = filler(CORE);
  const confEl = doc.querySelector('[data-lkj-conf]');
  const nums = (el, a) => String((el && el.getAttribute(a)) || '').split(',').map(x => parseInt(x, 10)).filter(n => Number.isInteger(n));
  const ids = sel => Array.from(doc.querySelectorAll('#lkj-core')).flatMap(t => Array.from(t.content.querySelectorAll(sel)).map(n => n.getAttribute('data-id')));
  const CONF = {
    pts: nums(confEl, 'data-lkj-bareme'), lv: nums(confEl, 'data-lkj-lv'), regions: nums(confEl, 'data-lkj-regions')[0] || 6,
    pers: { frise: nums(confEl, 'data-lkj-per-frise')[0] || 5, station: nums(confEl, 'data-lkj-per-station')[0] || 5 },
    defis: ids('[data-defi]'), badges: ids('[data-badge]')
  };
  const coreTpl = doc.getElementById('lkj-core');
  const LVNAME = coreTpl && 'content' in coreTpl ? Array.from(coreTpl.content.querySelectorAll('[data-niveau]')).map(n => n.textContent.replace(/\s+/g, ' ').trim()) : [];
  const nameOf = (sel, id) => { const t = doc.getElementById('lkj-core'); const n = t && t.content.querySelector(sel + '[data-id="' + id + '"]'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : ''; };
  const ptsText = n => cf(plural.select(n) === 'one' ? 'lkj-pts-one' : 'lkj-pts-other', { n: num(n) });
  const daysText = n => cf(plural.select(n) === 'one' ? 'lkj-jours-one' : 'lkj-jours-other', { n: num(n) });
  const hasCore = !!confEl && CONF.lv.length > 0 && CONF.pts.length === 3;
  let last = null;
  function compute() { return summary(readJSON(KEY), readJSON(DEVINE), parisDate(Date.now()), CONF); }
  function todayState(t) { return t.finished ? (t.score === null ? cf('lkj-fini', { score: '…', total: num(t.total) }) : cf('lkj-fini', { score: num(t.score), total: num(t.total) })) : t.done ? cf('lkj-en-cours', { done: num(t.done), total: num(t.total) }) : cf('lkj-a-jouer'); }
  function render(S) {
    ticking++;
    doc.querySelectorAll('[data-lkj-nojs]').forEach(n => { if (n.closest('[data-lkj-strip],[data-lkj-board]')) n.hidden = true; });
    doc.querySelectorAll('[data-lkj-on]').forEach(n => { n.hidden = false; });
    const span = S.next === null ? 1 : (S.pts - S.floor) / (S.next - S.floor);
    doc.querySelectorAll('[data-lkj-lvn]').forEach(n => setText(n, num(S.level + 1)));
    doc.querySelectorAll('[data-lkj-lvt]').forEach(n => setText(n, cf('lkj-niveau', { n: num(S.level + 1), total: num(CONF.lv.length) })));
    doc.querySelectorAll('[data-lkj-name]').forEach(n => setText(n, LVNAME[S.level] || ''));
    doc.querySelectorAll('[data-lkj-pts]').forEach(n => put(n, S.pts, 'p'));
    doc.querySelectorAll('[data-lkj-next]').forEach(n => setText(n, S.next === null ? cf('lkj-max') : S.parties ? cf('lkj-prochain', { n: ptsText(S.next - S.pts), nom: LVNAME[S.level + 1] || '' }) : cf('lkj-vide')));
    doc.querySelectorAll('[data-lkj-meter]').forEach(n => setBar(n, span));
    doc.querySelectorAll('[data-lkj-min]').forEach(n => setText(n, ptsText(parseInt(n.getAttribute('data-lkj-min'), 10) || 0)));
    doc.querySelectorAll('[data-lkj-today]').forEach(li => {
      const t = S.today[li.getAttribute('data-lkj-today')]; if (!t) return;
      setText(li.querySelector('[data-lkj-state]'), todayState(t));
      li.classList.toggle('is-done', t.finished); li.classList.toggle('is-go', !t.finished && t.done > 0);
    });
    const st = (a, v) => doc.querySelectorAll('[' + a + ']').forEach(n => setText(n, v));
    const pt = (a, v, k) => doc.querySelectorAll('[' + a + ']').forEach(n => put(n, v, k));
    pt('data-lkj-s-parfait', S.perfect, 'n'); pt('data-lkj-s-parties', S.parties, 'n'); pt('data-lkj-s-ok', S.ok, 'n');
    pt('data-lkj-s-serie', S.serie, 'd'); pt('data-lkj-s-max', S.serieMax, 'd'); pt('data-lkj-s-defis', S.dc, 'n');
    doc.querySelectorAll('[data-lkj-first]').forEach(n => { n.hidden = S.parties > 0; });
    doc.querySelectorAll('[data-lkj-played]').forEach(n => { n.hidden = !(S.parties > 0); });
    doc.querySelectorAll('[data-lkj-defi]').forEach(box => {
      const id = S.defi;
      setText(box.querySelector('[data-lkj-defi-t]'), nameOf('[data-defi]', id));
      setText(box.querySelector('[data-lkj-defi-s]'), S.defiOk ? cf('lkj-defi-ok', { pts: ptsText(CONF.pts[2]) }) : cf('lkj-defi-ko', { pts: ptsText(CONF.pts[2]) }));
      box.classList.toggle('is-ok', S.defiOk);
      setBar(box.querySelector('[data-lkj-defi-bar]'), defiProgress(id, S.today));
      setText(box.querySelector('[data-lkj-defi-pts]'), '+' + ptsText(CONF.pts[2]));
    });
    doc.querySelectorAll('[data-lkj-badge]').forEach(li => {
      const on = S.badges.indexOf(li.getAttribute('data-lkj-badge')) >= 0;
      li.classList.toggle('is-on', on);
      setText(li.querySelector('[data-lkj-badge-s]'), on ? cf('lkj-obtenu') : cf('lkj-a-gagner'));
    });
    st('data-lkj-badges-n', cf('lkj-badges-n', { n: num(S.badges.length), total: num(CONF.badges.length) }));
    doc.querySelectorAll('[data-lkj-lvl]').forEach(li => {
      const i = parseInt(li.getAttribute('data-lkj-lvl'), 10);
      li.classList.toggle('is-past', i < S.level); li.classList.toggle('is-now', i === S.level);
      const here = li.querySelector('[data-lkj-here]'); if (here) { here.hidden = i !== S.level; setText(here, cf('lkj-ici')); }
    });
  }
  const FMT = { n: num, p: n => ptsText(n), d: n => daysText(n) };
  let ticking = 0;
  function put(el, v, k) { if (!el) return; el.lkjV = v; el.lkjK = k; setText(el, FMT[k](v)); }
  function intro() {
    const board = doc.querySelector('[data-lkj-board]'), IO = window.IntersectionObserver;
    const panel = board && board.querySelector('.lkj-panel');
    if (!panel || panel.offsetParent === null || still() || typeof IO !== 'function' || typeof window.requestAnimationFrame !== 'function') return;
    const ticks = Array.from(board.querySelectorAll('[data-lkj-tick]')).filter(n => n.lkjV > 0);
    board.classList.add('is-wait');
    ticks.forEach(n => setText(n, FMT[n.lkjK](0)));
    const finish = () => { obs.disconnect(); ticking++; board.classList.remove('is-wait'); ticks.forEach(n => setText(n, FMT[n.lkjK](n.lkjV))); };
    const run = () => {
      board.classList.remove('is-wait');
      const id = ++ticking, t0 = performance.now(), list = ticks.map(n => [n, n.lkjV]);
      const step = now => {
        if (id !== ticking) return;
        const p = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - p, 3);
        list.forEach(([n, v]) => setText(n, FMT[n.lkjK](p < 1 && n.lkjV === v ? Math.round(v * e) : n.lkjV)));
        if (p < 1) window.requestAnimationFrame(step);
      };
      window.requestAnimationFrame(step);
    };
    const obs = new IO(en => { if (!en.some(x => x.isIntersecting)) return; obs.disconnect(); run(); }, { threshold: 0.35 });
    obs.observe(panel);
    window.addEventListener('beforeprint', finish, { once: true });
    if (reduced.addEventListener) reduced.addEventListener('change', () => { if (reduced.matches) finish(); });
  }
  let toastTimer = 0;
  function toast(text) {
    const live = doc.querySelector('[data-lkj-live]') || doc.querySelector('[data-lkj-plive]');
    doc.querySelectorAll('[data-lkj-toast]').forEach(t => {
      t.textContent = text; t.hidden = false; t.classList.remove('is-in'); void t.offsetWidth; t.classList.add('is-in');
      window.clearTimeout(toastTimer); toastTimer = window.setTimeout(() => { t.hidden = true; }, 6000);
    });
    if (live) { live.textContent = ''; window.setTimeout(() => { live.textContent = text; }, 120); }
  }
  function touch() {
    if (!hasCore) return null;
    const today = parisDate(Date.now()), raw = readJSON(KEY), s = clean(raw, CONF.pers);
    const S = summary(s, readJSON(DEVINE), today, CONF);
    let changed = false;
    if (S.defiOk && s.dd !== today) { s.dc++; s.dd = today; changed = true; }
    if (S.serieMax > s.gm) { s.gm = S.serieMax; changed = true; }
    const fresh = S.badges.filter(b => s.b.indexOf(b) < 0);
    if (fresh.length) { s.b = s.b.concat(fresh); changed = true; }
    const up = s.lv !== null && S.level > s.lv;
    if (s.lv !== S.level) { s.lv = S.level; changed = true; }
    if (changed) write(KEY, s);
    const S2 = summary(s, readJSON(DEVINE), today, CONF);
    render(S2);
    const msgs = [];
    if (up) msgs.push(cf('lkj-niveau-new', { nom: LVNAME[S2.level] || '' }));
    fresh.forEach(b => msgs.push(cf('lkj-badge-new', { nom: nameOf('[data-badge]', b) })));
    if (msgs.length) toast(msgs.join(' '));
    last = S2;
    return S2;
  }
  function refresh() { if (!hasCore) return null; last = compute(); render(last); return last; }
  API.touch = touch; API.refresh = refresh; API.text = { ptsText, daysText, dateText, num, pct };
  doc.addEventListener('lk-jeux', () => { touch(); });
  window.addEventListener('storage', e => { if (e.key === KEY || e.key === DEVINE) refresh(); });
  if (hasCore) { const go = () => { refresh(); intro(); }; if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', go, { once: true }); else go(); }
  API.partie = function (cfg) {
    const game = doc.querySelector('[data-lkj-game="' + cfg.id + '"]');
    if (!game) return null;
    const $ = (sel, base) => (base || game).querySelector(sel), $$ = (sel, base) => Array.from((base || game).querySelectorAll(sel));
    const M = readTpl('lkj-msg'), f = filler(M);
    const tpl = doc.getElementById('lkj-pool');
    if (!tpl || !('content' in tpl)) return null;
    const POOL = Array.from(tpl.content.querySelectorAll('[data-lkj-item]')).map(n => ({ id: n.getAttribute('data-lkj-item'), g: n.getAttribute('data-g'), node: n })).sort((a, b) => (a.id < b.id ? -1 : 1));
    const pool = POOL.map(x => ({ id: x.id, g: x.g })), byId = Object.fromEntries(POOL.map(x => [x.id, x]));
    const PER = Math.max(1, parseInt(game.getAttribute('data-lkj-per'), 10) || 5), DEBUT = game.getAttribute('data-lkj-debut'), Q0 = cfg.q0 || 0;
    const MAX = parseInt(game.getAttribute('data-lkj-max'), 10) || 0;
    if (!okIso(DEBUT) || pool.length < PER + Q0) return null;
    const board = $('[data-lkj-play]'), nojs = $('[data-lkj-nojs]'), result = $('[data-lkj-result]'), live = $('[data-lkj-live]');
    const answerBox = $('[data-lkj-answer]'), nextBtn = $('[data-lkj-next]'), verdict = $('[data-lkj-verdict]');
    const days = n => f(plural.select(n) === 'one' ? 'g-jours-one' : 'g-jours-other', { n: num(n) });
    let sayTimer = 0;
    const say = text => { if (!live) return; window.clearTimeout(sayTimer); live.textContent = ''; sayTimer = window.setTimeout(() => { live.textContent = text; }, 80); };
    const loadStore = () => clean(readJSON(KEY), CONF.pers);
    let G = cleanGame(loadStore().g[cfg.id], PER);
    let today = '', dayN = 1, mode = 'day', answered = false, cur = null;
    const day = { ids: [], r: [], k: [] }, free = { ids: [], i: 0, seen: 0, ok: 0, marks: [] };
    const questions = () => day.ids.slice(Q0);
    function setupDay() {
      today = parisDate(Date.now()); dayN = Math.max(1, dayIndex(today) - dayIndex(DEBUT) + 1);
      const j = G.jour;
      if (j && j.d === today && j.ids.length === PER + Q0 && j.ids.every(id => byId[id])) { day.ids = j.ids.slice(); day.r = j.r.slice(); day.k = j.k.slice(); dayN = Math.max(1, j.n); }
      else { day.ids = draw(pool, today, { per: PER + Q0, ref: DEBUT, salt: cfg.id, max: MAX }); day.r = []; day.k = []; }
    }
    const dayDone = () => day.k.length >= PER;
    const score = () => day.k.reduce((a, v) => a + v, 0);
    function bar() {
      const isFree = mode === 'free';
      setText($('[data-lkj-mode]'), isFree ? f('g-libre') : f('g-jour', { n: num(dayN) }));
      const count = $('[data-lkj-count]');
      setText(count, f('g-num', { i: num(Math.min((isFree ? free.i - Q0 : day.k.length) + (answered ? 0 : 1), PER)), total: num(PER) }));
      setText($('[data-lkj-points]'), f('g-points', { score: num(isFree ? free.ok : score()), done: num(isFree ? free.seen : day.k.length) }));
      const dots = $('[data-lkj-dots]');
      dots.hidden = isFree;
      Array.from(dots.children).forEach((li, i) => { li.className = i < day.k.length ? (day.k[i] ? 'is-ok' : 'is-ko') : i === day.k.length && !answered ? 'is-now' : ''; });
      const back = $('[data-lkj-back]'); if (back) back.hidden = !isFree;
      const chip = $('[data-lkj-streak]');
      if (chip) { const sn = streak(G.serie, today); chip.hidden = isFree || sn < 1; if (!chip.hidden) setText(chip, f('g-serie', { n: days(sn) })); }
    }
    function ask(anim) {
      answered = false;
      cur = mode === 'day' ? questions()[day.k.length] : free.ids[free.i];
      answerBox.hidden = true; if (verdict) { verdict.hidden = true; verdict.className = 'lkj-verdict'; }
      cfg.show(cur, { mode, anim: !!anim && !still(), first: !anim });
      bar();
    }
    function roundCtx() { return mode === 'day' ? { mode, base: day.ids.slice(0, Q0), placed: questions().slice(0, day.k.length), marks: day.k.slice() } : { mode, base: free.ids.slice(0, Q0), placed: free.ids.slice(Q0, free.i), marks: free.marks.slice() }; }
    const inView = el => { const r = el.getBoundingClientRect(); return r.top >= 60 && r.bottom <= (window.innerHeight || 800); };
    const reveal = el => { if (el && !inView(el)) window.scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + window.scrollY - 96), behavior: still() ? 'auto' : 'smooth' }); };
    function answer(choice, ok) {
      if (answered || !cur || !okChoice(choice)) return false;
      answered = true;
      if (mode === 'day') {
        if (!dayDone()) {
          day.r.push(choice); day.k.push(ok ? 1 : 0);
          G = answerGame(G, today, dayN, day.ids, choice, ok, PER);
          const s = loadStore(); s.g[cfg.id] = G; write(KEY, s);
          touch();
        }
      } else { free.seen++; if (ok) free.ok++; free.marks.push(ok ? 1 : 0); free.i++; }
      const info = cfg.reveal(cur, choice, ok) || {};
      if (verdict) { verdict.textContent = (ok ? '✓ ' + f('g-verdict-juste') : '✗ ' + f('g-verdict-rate')); verdict.className = 'lkj-verdict ' + (ok ? 'is-ok' : 'is-ko'); verdict.hidden = false; }
      const at = $('[data-lkj-answer-t]'); at.textContent = info.text || ''; at.className = 'lkj-answer-t ' + (ok ? 'is-ok' : 'is-ko');
      const link = $('[data-lkj-link]'); if (link) { if (info.href) { link.href = info.href; link.textContent = info.link || ''; link.hidden = false; } else link.hidden = true; }
      const roundOver = mode === 'day' ? dayDone() : free.i >= free.ids.length;
      nextBtn.textContent = mode === 'day' && dayDone() ? f('g-voir') : f('g-suivante');
      nextBtn.setAttribute('data-round-over', roundOver ? '1' : '0');
      answerBox.hidden = false;
      if (window.LKMotion && window.LKMotion.enter) window.LKMotion.enter([answerBox], { rise: 10, duration: 300 });
      bar();
      nextBtn.focus({ preventScroll: true });
      if (!inView(answerBox)) answerBox.scrollIntoView({ block: 'nearest', behavior: still() ? 'auto' : 'smooth' });
      say(info.text || '');
      return true;
    }
    function next() {
      if (mode === 'day') {
        if (dayDone()) { showResult(true); return; }
        ask(true);
        say(f('g-annonce', { i: num(day.k.length + 1), total: num(PER) }));
      } else {
        if (free.i >= free.ids.length) newFree();
        ask(true);
        say(f('g-annonce-libre'));
      }
      reveal($('.lkj-bar'));
      if (cfg.focus) cfg.focus();
    }
    function newFree() {
      free.ids = cfg.free(PER + Q0); free.i = Q0; free.marks = [];
      cfg.reset(roundCtx());
    }
    let timer = 0;
    function countdown() {
      const el = $('[data-lkj-countdown]', result); if (!el) return;
      window.clearTimeout(timer);
      if (result.hidden) return;
      const now = Date.now(), nb = $('[data-lkj-new]', result);
      if (parisDate(now) !== today) { setText(el, f('g-nouvelle')); if (nb) nb.hidden = false; return; }
      if (nb) nb.hidden = true;
      const left = Math.max(0, nextParisMidnight(now) - now), h = Math.floor(left / 3600000), m = Math.floor((left - h * 3600000) / 60000);
      setText(el, h > 0 ? f('g-prochaine', { h: num(h), m: num(m) }) : f('g-prochaine-min', { m: num(Math.max(1, m)) }));
      timer = window.setTimeout(countdown, Math.min(30000, left + 1000));
    }
    function showResult(fresh) {
      mode = 'day';
      const sc = score();
      board.hidden = true; result.hidden = false;
      setText($('[data-lkj-res-k]', result), f('g-jour', { n: num(dayN) }));
      setText($('[data-lkj-res-score]', result), f('g-sur', { score: num(sc), total: num(PER) }));
      setText($('[data-lkj-res-msg]', result), f('g-res-' + Math.max(0, Math.min(5, Math.round(sc * 5 / PER)))));
      const pts = (CONF.pts[0] || 0) * sc + (sc === PER ? (CONF.pts[1] || 0) : 0);
      setText($('[data-lkj-res-pts]', result), pts ? cf('lkj-gagne', { pts: ptsText(pts) }) : cf('lkj-gagne-0'));
      const list = $('[data-lkj-res-list]', result); list.textContent = '';
      questions().forEach((id, i) => {
        const ok = !!day.k[i], row = cfg.row(id, day.r[i], ok, i, day.ids.slice()) || {};
        const li = doc.createElement('li'); li.className = 'lkj-res-i ' + (ok ? 'is-ok' : 'is-ko');
        const n = doc.createElement('span'); n.className = 'lkj-res-n'; n.textContent = num(i + 1);
        const mark = doc.createElement('span'); mark.className = 'lkj-res-mark'; mark.setAttribute('aria-hidden', 'true'); mark.textContent = ok ? '✓' : '✗';
        const txt = doc.createElement('span'); txt.className = 'lkj-res-txt';
        const a = doc.createElement('a'); a.href = row.href || '#'; a.textContent = row.title || ''; if (row.no) a.setAttribute('translate', 'no');
        const v = doc.createElement('small'); v.textContent = ok ? f('g-verdict-juste') + (row.note ? ', ' + row.note : '') : f('g-res-ta', { verdict: f('g-verdict-rate'), choix: row.choice || '' });
        txt.append(a, v); li.append(n, mark, txt); list.appendChild(li);
      });
      renderStats();
      const canon = doc.querySelector('link[rel="canonical"]'), url = canon ? canon.getAttribute('href') : location.href.split('#')[0];
      setText($('[data-lkj-share-txt]', result), shareText(f('g-partage-titre', { n: dayN, score: sc, total: PER }), day.k, url));
      countdown();
      if (fresh) {
        result.focus({ preventScroll: true });
        reveal(result);
        say(f('g-fin', { score: num(sc), total: num(PER) }) + ' ' + $('[data-lkj-res-msg]', result).textContent);
        if (window.LKMotion && window.LKMotion.enter) window.LKMotion.enter($$('.lkj-res-i', result), { stagger: 50, cap: 300, rise: 10 });
      }
    }
    function renderStats() {
      const g = gameInfo(G, today, PER), st = cleanGame(G, PER).st;
      setText($('[data-lkj-serie]', result), days(g.serie));
      setText($('[data-lkj-serie-max]', result), days(Math.max(g.serieMax, g.serie)));
      setText($('[data-lkj-parties]', result), num(g.parties));
      setText($('[data-lkj-reussite]', result), g.parties ? pct(g.ok / (g.parties * PER)) : '0');
      setText($('[data-lkj-best]', result), g.best === null ? f('g-sur', { score: num(0), total: num(PER) }) : f('g-sur', { score: num(g.best), total: num(PER) }));
      const wk = $('[data-lkj-week]', result);
      if (wk) {
        wk.textContent = '';
        const t = dayIndex(today);
        for (let k = 6; k >= 0; k--) {
          const d = isoOfIndex(t - k), e = st.h.find(x => x[0] === d), s = e ? e[1] : null, at = atNoon(d);
          const li = doc.createElement('li'); li.className = 'lkj-wk' + (s === null ? ' is-empty' : '') + (k === 0 ? ' is-today' : '');
          if (s !== null) li.style.setProperty('--s', String(s / PER));
          const a = doc.createElement('span'); a.className = 'lkj-wk-d'; a.setAttribute('aria-hidden', 'true'); a.textContent = wdf ? wdf.format(at) : d.slice(5);
          const b = doc.createElement('span'); b.className = 'lkj-wk-n'; b.setAttribute('aria-hidden', 'true'); b.textContent = ddf ? ddf.format(at) : '';
          const c = doc.createElement('span'); c.className = 'lkj-wk-s'; c.setAttribute('aria-hidden', 'true'); c.textContent = s === null ? '' : num(s);
          const sr = doc.createElement('span'); sr.className = 'sr-only'; const when = longf ? longf.format(at) : d;
          sr.textContent = s === null ? f('g-sem-vide', { w: when }) : f('g-sem-score', { w: when, score: num(s), total: num(PER) });
          li.append(a, b, c, sr); wk.appendChild(li);
        }
      }
      const dots = $('[data-lkj-res-dots]', result);
      if (dots) Array.from(dots.children).forEach((li, i) => { li.className = i < day.k.length ? (day.k[i] ? 'is-ok' : 'is-ko') : ''; });
    }
    async function copy(text) {
      try {
        if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error('clipboard');
        await navigator.clipboard.writeText(text); say(f('g-copie')); return true;
      } catch (_) {
        const pre = $('[data-lkj-share-txt]', result);
        try { const r = doc.createRange(); r.selectNodeContents(pre); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); if (doc.execCommand && doc.execCommand('copy')) { say(f('g-copie')); return true; } } catch (__) {  }
        say(f('g-copie-ko')); return false;
      }
    }
    async function share() {
      const text = $('[data-lkj-share-txt]', result).textContent;
      if (navigator.share && (!navigator.canShare || navigator.canShare({ text }))) {
        try { await navigator.share({ text }); say(f('g-partage-ok')); return; } catch (e) { if (e && e.name === 'AbortError') return; }
      }
      copy(text);
    }
    function startFree() {
      mode = 'free'; result.hidden = true; board.hidden = false; window.clearTimeout(timer);
      free.seen = 0; free.ok = 0; newFree(); ask(false);
      reveal($('.lkj-bar'));
      say(f('g-libre-annonce') + ' ' + f('g-annonce-libre'));
      if (cfg.focus) cfg.focus();
    }
    function start(focus) {
      if (nojs) nojs.hidden = true;
      if (dayDone()) { showResult(false); if (focus) result.focus({ preventScroll: true }); say(f('g-deja')); return; }
      mode = 'day'; result.hidden = true; board.hidden = false;
      cfg.reset(roundCtx());
      ask(false);
      if (focus && cfg.focus) cfg.focus();
      say(f('g-annonce', { i: num(day.k.length + 1), total: num(PER) }));
    }
    nextBtn.addEventListener('click', next);
    game.addEventListener('click', ev => {
      const t = ev.target.closest('button'); if (!t || !game.contains(t)) return;
      if (t.hasAttribute('data-lkj-share')) share();
      else if (t.hasAttribute('data-lkj-copy')) copy($('[data-lkj-share-txt]', result).textContent);
      else if (t.hasAttribute('data-lkj-free')) startFree();
      else if (t.hasAttribute('data-lkj-back')) { if (dayDone()) showResult(true); else { mode = 'day'; cfg.reset(roundCtx()); ask(false); if (cfg.focus) cfg.focus(); } }
      else if (t.hasAttribute('data-lkj-new')) { setupDay(); start(true); }
    });
    doc.addEventListener('visibilitychange', () => { if (!doc.hidden && !result.hidden) countdown(); });
    const api = { answer, f, M, byId, pool, PER, Q0, mode: () => mode, answered: () => answered, current: () => cur, ctx: roundCtx, today: () => today, dateText, num, say };
    if (cfg.init) cfg.init(api);
    setupDay();
    start(false);
    return api;
  };
})(typeof window !== 'undefined' ? window : this);
