/* Généré depuis outils/sources/perso-fiche.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  var sec = document.querySelector('section.pf[data-pf]'); if (!sec) return;
  var board = sec.querySelector('[data-pf-board]'); if (!board) return;
  var kind = sec.getAttribute('data-pf'), id = sec.getAttribute('data-pf-id'), cat = sec.getAttribute('data-pf-cat'), name = sec.getAttribute('data-pf-name') || '';
  var me = document.currentScript, base = me && me.src ? me.src.replace(/[^/]*$/, '') : '';
  var KEY = 'lk_perso_v1', SK = kind + ':' + id;
  var T = {
    titre: 'My configuration', ou: 'on this device', vide: 'No item chosen yet: tick “I’ll take it” on an item or an option.',
    un: '{n} item chosen', des: '{n} items chosen', total: 'Series benchmark: {t}', entre: 'from {a} to {b}', sans: '{n} without a recorded price',
    reset: 'Remove all', prends: 'I’ll take it', voir: 'See in the list', postes: '{n} items', poste: '1 item',
    p6: 'GTA VI price', rep: 'Series benchmark', pasRep: 'No benchmark', niveau: 'Level required', niveauVi: 'GTA VI: to be confirmed', effet: 'Effect',
    options: '{n} options', option: '1 option', couleurs: 'Colour families of the GTA V palette', couleursN: '{n} colour families',
    prixNon: 'price not recorded', honnete: 'Prices and unlocks come from GTA V or GTA Online, shown as benchmarks: Rockstar has published nothing for GTA VI.',
    charge: 'Loading the items…', echec: 'The items could not be loaded: open the customization list.', ouvrir: 'Expand all', fermer: 'Collapse all',
    voirConf: 'See my configuration', cacher: 'Hide the preview', apAlt: 'Preview of my configuration: {n}', apCharge: 'Loading the preview…',
    apEchec: 'The preview couldn’t be loaded: open your configuration in the 3D Workshop.', recapT: 'What you picked',
    recapVide: 'Nothing picked yet: the drawing shows the stock model. Tick “I’ll take it” or pick a color, and it changes right away.',
    pasVu: 'not visible on the drawing', choisis: 'pick a color family to see it',
    apNote: 'Drawing built on the model’s Leonidakit diagram, with only your choices: neither the game’s model nor its exact colors.',
    atelier: 'Open my configuration in the 3D Workshop', wip: 'Under construction', saut: 'See the preview'
  };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? String(v[k]) : m; }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $'; };
  var PIP = { officiel: 'Official', vu: 'Seen in media', comm: 'Community identification', serie: 'Series benchmark', conf: 'To be confirmed' };
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {  } }
  var all = load(KEY) || {}, mine = all[SK] || {};
  function persist() { all[SK] = mine; if (!Object.keys(mine).length) delete all[SK]; save(KEY, all); }
  var D = null, posts = [], byId = {};
  function fits(p) { return p.ids ? p.ids.indexOf(id) !== -1 : (p.compat.indexOf(cat) !== -1 || p.compat.indexOf(id) !== -1); }
  function priceOf(p, o) {
    if (o && (o.p !== undefined || o.pmin !== undefined)) return o.p !== undefined ? { a: o.p, b: o.p } : { a: o.pmin, b: o.pmax };
    if (p.repv) { if (p.repv.valeur !== undefined && p.repv.valeur !== null) return { a: p.repv.valeur, b: p.repv.valeur }; if (p.repv.min !== undefined) return { a: p.repv.min, b: p.repv.max }; }
    return null;
  }
  function swatch(sw) { return sw ? '<span class="pf-sw" style="background:' + esc(sw) + '" aria-hidden="true"></span>' : ''; }
  function optList(p) {
    var out = '';
    if (p.opts.length) out += '<ul class="pf-opt-list">' + p.opts.map(function (o, i) {
      var pr = o.p !== undefined ? money(o.p) : o.pmin !== undefined ? fill(T.entre, { a: money(o.pmin), b: money(o.pmax) }) : T.prixNon;
      var on = mine[p.id] && mine[p.id].o === i;
      return '<li><label class="pf-opt' + (on ? ' is-on' : '') + '"><input type="radio" name="pf-o-' + esc(p.id) + '" value="' + i + '" data-pf-opt="' + esc(p.id) + '"' + (on ? ' checked' : '') + '>' + swatch(o.sw) + '<span class="pf-opt-n">' + esc(o.n) + '</span><b class="pf-opt-p">' + esc(pr) + '</b></label></li>';
    }).join('') + '</ul>';
    if (p.couleurs) out += '<p class="pf-coul-t">' + esc(T.couleurs) + '</p><ul class="pf-coul">' + D[kind].couleurs.map(function (c, i) {
      var on = !!mine[p.id] && mine[p.id].c === i;
      return '<li class="pf-cl-li"><label class="pf-opt pf-opt--c' + (on ? ' is-on' : '') + '"><input type="radio" name="pf-c-' + esc(p.id) + '" value="' + i + '" data-pf-coul="' + esc(p.id) + '"' + (on ? ' checked' : '') + '>' + swatch(c.sw) + '<span class="pf-opt-n">' + esc(c.n) + '</span></label></li>';
    }).join('') + '</ul>';
    if (p.note) out += '<p class="pf-opt-note">' + esc(p.note) + '</p>';
    return out;
  }
  function post(p) {
    var n = p.opts.length, nc = p.couleurs ? D[kind].couleurs.length : 0, on = !!mine[p.id];
    var sum = n ? fill(n > 1 ? T.options : T.option, { n: n }) + (nc ? ', ' + fill(T.couleursN, { n: nc }) : '') : nc ? fill(T.couleursN, { n: nc }) : '';
    return '<li class="pf-post' + (on ? ' is-on' : '') + '" data-pf-post="' + esc(p.id) + '" data-st="' + esc(p.st) + '">'
      + '<div class="pf-post-h"><span class="pf-st pf-st--' + esc(p.st) + '">' + esc(p.stl || PIP[p.st] || p.st) + '</span><b class="pf-nom">' + esc(p.nom) + '</b></div>'
      + '<p class="pf-desc">' + esc(p.desc) + '</p>'
      + '<dl class="pf-facts">'
      + '<div class="pf-f pf-f--p6"><dt>' + esc(T.p6) + '</dt><dd>' + esc(p.p6) + (p.achat ? '<small>' + esc(p.achat) + '</small>' : '') + '</dd></div>'
      + '<div class="pf-f pf-f--rep"><dt>' + esc(T.rep) + '</dt><dd>' + (p.rep ? '<b>' + esc(p.rep.t) + '</b>' + (p.rep.note ? '<small>' + esc(p.rep.note) + '</small>' : '') : '<span class="pf-none">' + esc(T.pasRep) + '</span>') + '</dd></div>'
      + '<div class="pf-f pf-f--niv"><dt>' + esc(T.niveau) + '</dt><dd>' + esc(T.niveauVi) + (p.deb ? '<small>' + esc(p.deb) + '</small>' : '') + '</dd></div>'
      + (p.effet ? '<div class="pf-f pf-f--eff"><dt>' + esc(T.effet) + '</dt><dd>' + esc(p.effet) + '</dd></div>' : '')
      + '</dl>'
      + (sum ? '<details class="pf-opts"><summary><span class="pf-opts-sum">' + esc(sum) + '</span><span class="pf-chev" aria-hidden="true"></span></summary><div class="pf-opts-body">' + optList(p) + '</div></details>' : '')
      + '<div class="pf-acts"><label class="pf-take"><input type="checkbox" data-pf-take="' + esc(p.id) + '"' + (on ? ' checked' : '') + '> <span>' + esc(T.prends) + '</span></label><a class="pf-link" href="' + esc(base + p.url) + '">' + esc(T.voir) + '</a></div>'
      + '</li>';
  }
  function group(c, list, i) {
    return '<details class="pf-group" id="pf-' + esc(c.id) + '" style="--ch:' + (c.h || 38) + '"' + (i === 0 ? ' open' : '') + '>'
      + '<summary class="pf-g-sum">' + (c.img ? '<span class="pf-g-img" aria-hidden="true"><img src="' + esc(c.img.charAt(0) === '/' ? c.img : '/' + c.img) + '" alt="" loading="lazy" decoding="async"></span>' : '') + '<span class="pf-g-ico" aria-hidden="true">' + c.ico + '</span><span class="pf-g-t"><span>' + esc(c.label) + '</span><small>' + esc(list.length > 1 ? fill(T.postes, { n: list.length }) : T.poste) + '</small></span><span class="pf-chev" aria-hidden="true"></span></summary>'
      + '<ul class="pf-list">' + list.map(post).join('') + '</ul></details>';
  }
  function status() {
    var box = board.querySelector('[data-pf-config]'); if (!box) return;
    var ids = Object.keys(mine), a = 0, b = 0, sans = 0, priced = 0;
    ids.forEach(function (k) { var p = byId[k]; if (!p) return; var o = mine[k].o !== undefined && mine[k].o !== null ? p.opts[mine[k].o] : null; var pr = priceOf(p, o); if (!pr) { sans++; return; } priced++; a += pr.a; b += pr.b; });
    box.querySelector('[data-pf-n]').textContent = ids.length ? fill(ids.length > 1 ? T.des : T.un, { n: ids.length }) : T.vide;
    var t = a === b ? money(a) : fill(T.entre, { a: money(a), b: money(b) });
    box.querySelector('[data-pf-total]').textContent = !ids.length ? '' : priced ? fill(T.total, { t: t }) + (sans ? ', ' + fill(T.sans, { n: sans }) : '') : fill(T.sans, { n: sans });
    box.classList.toggle('is-on', ids.length > 0);
    sec.querySelectorAll('[data-pf-post]').forEach(function (li) { li.classList.toggle('is-on', !!mine[li.getAttribute('data-pf-post')]); });
    sec.querySelectorAll('.pf-opt').forEach(function (l) { l.classList.toggle('is-on', l.querySelector('input').checked); });
    apUpdate(true);
  }
  function render() {
    posts = D[kind].posts.filter(fits); byId = {}; posts.forEach(function (p) { byId[p.id] = p; });
    Object.keys(mine).forEach(function (k) { if (!byId[k]) delete mine[k]; });
    var cats = D[kind].cats.filter(function (c) { return posts.some(function (p) { return p.cat === c.id; }); });
    var html = '<p class="pf-honnete">' + esc(T.honnete) + '</p>'
      + '<div class="pf-config" data-pf-config><p class="pf-config-t">' + esc(T.titre) + ' <small>' + esc(T.ou) + '</small></p><p class="pf-config-n" role="status" aria-live="polite" data-pf-n></p><p class="pf-config-sum" data-pf-total></p><p class="pf-config-acts"><button type="button" class="pf-bt pf-bt--view" data-pf-view-b aria-expanded="false" aria-controls="pf-view">' + esc(T.voirConf) + '</button><button type="button" class="pf-bt" data-pf-reset>' + esc(T.reset) + '</button><button type="button" class="pf-bt pf-bt--ghost" data-pf-all="1">' + esc(T.ouvrir) + '</button></p>'
      + '<div class="pf-view" id="pf-view" data-pf-view hidden><div class="pf-stage" data-pf-stage tabindex="-1"></div><div class="pf-recap-col"><p class="pf-recap-t">' + esc(T.recapT) + '</p><ul class="pf-recap" data-pf-recap hidden></ul><p class="pf-recap-vide" data-pf-recap-vide>' + esc(T.recapVide) + '</p><p class="pf-view-note">' + esc(T.apNote) + '</p><p class="pf-atelier pf-view-go"><a class="pf-atelier-link" data-pf-go href="../atelier-3d.html?' + (kind === 'vehicules' ? 'v=' : 'a=') + encodeURIComponent(id) + '" aria-describedby="pf-wip-2">' + esc(T.atelier) + '</a><span class="pf-wip" id="pf-wip-2">' + esc(T.wip) + '</span></p></div></div></div>'
      + '<div class="pf-groups">' + cats.map(function (c, i) { return group(c, posts.filter(function (p) { return p.cat === c.id; }), i); }).join('') + '</div>'
      + '<button type="button" class="pf-jump" data-pf-jump hidden><span class="pf-jump-art" data-pf-jump-art aria-hidden="true"></span><span>' + esc(T.saut) + '</span></button>';
    board.innerHTML = html;
    board.classList.add('is-ready');
    status();
    var pref = null; try { pref = localStorage.getItem(VKEY); } catch (e) { pref = null; }
    if (pref === '1') apOpen(true, false);
    if (window.LKMotion) window.LKMotion.enter(board.querySelectorAll('.pf-group'), { stagger: 60, cap: 480, rise: 14 });
  }
  var W = {}; Object.keys({ gloss: 0, metal: 0, matte: 0, chrome: 0, nacre: 0, cameleon: 0, gold: 0, platinum: 0, xenon: 0, color: 0, all: 0, front: 0, back: 0, sides: 0, lip: 0, wing: 0, gt: 0, tt: 0, slick: 0, bike: 0, holo: 0, scope: 0, night: 0, thermal: 0, silencer: 0, comp: 0, heavy: 0, brake: 0, ext: 0, drum: 0, digital: 0, zebra: 0, geometric: 0, leopard: 0, brush: 0 }).forEach(function (k) { W[k] = k; });
  var VKEY = 'lk_perso_apercu', AP = { open: false, d: null, wait: false };
  var VIS = { paint: 1, finish: 1, pearl: 1, paint2: 1, rim: 1, rimSize: 1, tyres: 1, _smoke: 1, aileron: 1, _ail: 1, jupes: 1, capot: 1, toit: 1, bullbar: 1, exhaust: 1, arceau: 1, tint: 1, neon: 1, neonColor: 1, neonLayout: 1, susp: 1, lights: 1, lightColor: 1, _col: 1, camo: 1, engrave: 1, mag: 1, sight: 1, barrel: 1, grip: 1, lamp: 1, laser: 1 };
  var hex6 = function (c) { c = String(c || '').replace('#', ''); if (/^[0-9a-f]{3}$/i.test(c)) c = c.charAt(0) + c.charAt(0) + c.charAt(1) + c.charAt(1) + c.charAt(2) + c.charAt(2); return /^[0-9a-f]{6}$/i.test(c) ? c.toUpperCase() : null; };
  var hexes = function (sw) { return (String(sw || '').match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi) || []).map(hex6).filter(Boolean); };
  var keysOf = function (q) { return String(q || '').split('&').filter(Boolean).map(function (kv) { return kv.split('=')[0]; }); };
  function choice(p) {
    var m = mine[p.id]; if (!m) return null;
    return { o: m.o !== null && m.o !== undefined ? p.opts[m.o] || null : null, c: m.c !== null && m.c !== undefined ? D[kind].couleurs[m.c] || null : null };
  }
  function setup() {
    var s = {};
    var put = function (q) { String(q || '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) s[kv.slice(0, i)] = kv.slice(i + 1); }); };
    posts.forEach(function (p) {
      var ch = choice(p); if (!ch) return;
      put(p.ap);
      if (ch.o) { put(ch.o.ap); var hx = hexes(ch.o.sw); if (p.apw && hx.length) s[p.apw] = hx.join('.'); }
      if (ch.c && p.apc && hex6(ch.c.sw)) s[p.apc] = hex6(ch.c.sw);
    });
    return s;
  }
  function seen(p, ch) {
    var ks = keysOf(p.ap); if (ch.o) ks = ks.concat(keysOf(ch.o.ap)); if (ch.c && p.apc) ks.push(p.apc); if (ch.o && p.apw && hexes(ch.o.sw).length) ks.push(p.apw);
    return ks.some(function (k) { return VIS[k] === 1; });
  }
  function atelierHref(s) {
    var q = (kind === 'vehicules' ? 'v=' : 'a=') + encodeURIComponent(id);
    Object.keys(s).forEach(function (k) { if (k.charAt(0) !== '_') q += '&' + k + '=' + encodeURIComponent(String(s[k]).split('.')[0]); });
    return '../atelier-3d.html?' + q;
  }
  function bb(p) { var a = 1e9, b = 1e9, c = -1e9, e = -1e9; p.forEach(function (q) { a = Math.min(a, q[0]); b = Math.min(b, q[1]); c = Math.max(c, q[0]); e = Math.max(e, q[1]); }); return { x0: a, y0: b, x1: c, y1: e, w: c - a, h: e - b }; }
  function cut(poly, x) {
    var lo = null, hi = null;
    for (var i = 0; i < poly.length; i++) {
      var A = poly[i], B = poly[(i + 1) % poly.length]; if (A[0] === B[0] || (A[0] - x) * (B[0] - x) > 0) continue;
      var y = A[1] + (B[1] - A[1]) * (x - A[0]) / (B[0] - A[0]); if (lo === null || y < lo) lo = y; if (hi === null || y > hi) hi = y;
    }
    return lo === null ? null : [lo, hi];
  }
  var r1 = function (n) { return Math.round(n * 10) / 10; };
  var pts = function (p) { return p.map(function (q) { return r1(q[0]) + ',' + r1(q[1]); }).join(' '); };
  var mix = function (a, b, t) { var A = parseInt(a, 16), B = parseInt(b, 16), ch = function (k) { return Math.round(((A >> k) & 255) * (1 - t) + ((B >> k) & 255) * t); }; return ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1).toUpperCase(); };
  function el(n, a, inner) { var o = '<' + n; for (var k in a) if (a[k] !== null && a[k] !== undefined) o += ' ' + k + '="' + (typeof a[k] === 'number' ? r1(a[k]) : esc(a[k])) + '"'; return o + (inner === undefined ? '/>' : '>' + inner + '</' + n + '>'); }
  var INK = '#1A1A1E', STEEL = '#9A9CA3', DARK = '#26262C';
  function blurDefs(pre) { return el('filter', { id: pre + 'b1', x: '-50%', y: '-50%', width: '200%', height: '200%' }, el('feGaussianBlur', { stdDeviation: 2.2 })) + el('filter', { id: pre + 'b2', x: '-50%', y: '-50%', width: '200%', height: '200%' }, el('feGaussianBlur', { stdDeviation: 4 })); }
  function sheen(pre, finish, base, pearl) {
    if (finish === W.matte) return '';
    if (finish === W.cameleon) return el('linearGradient', { id: pre + 'hl', x1: 0, y1: 0, x2: 1, y2: 0 }, el('stop', { offset: 0, 'stop-color': '#' + mix(base, 'FFFFFF', 0.55), 'stop-opacity': 0.75 }) + el('stop', { offset: 0.5, 'stop-color': '#' + base, 'stop-opacity': 0 }) + el('stop', { offset: 1, 'stop-color': '#' + mix(base, '000000', 0.45), 'stop-opacity': 0.7 }));
    var c = finish === W.nacre && pearl ? '#' + pearl : '#FFFFFF', top = { gloss: 0.32, metal: 0.5, chrome: 0.75, nacre: 0.6 }[finish] || 0.3;
    return el('linearGradient', { id: pre + 'hl', x1: 0, y1: 0, x2: 0, y2: 1 }, el('stop', { offset: 0, 'stop-color': c, 'stop-opacity': top }) + el('stop', { offset: finish === W.metal ? 0.45 : 0.6, 'stop-color': c, 'stop-opacity': 0 }) + (finish === W.metal || finish === W.chrome ? el('stop', { offset: 1, 'stop-color': '#000000', 'stop-opacity': 0.22 }) : ''));
  }
  function drawV(d, s, pre, label) {
    var parts = d.parts || [], two = !!d.two, road = !two && !/^(boat|plane|heli|rail)$/.test(d.kind || '');
    var main = null, mA = 0; parts.forEach(function (p) { var b = bb(p); if (b.w * b.h > mA) { mA = b.w * b.h; main = p; } });
    var M = main ? bb(main) : { x0: 20, x1: 220, y0: 40, y1: 90, w: 200, h: 50 };
    var WH = (d.wheels || []).map(function (w) { return { x: w[0], y: w[1], r: w[2] }; }).sort(function (a, b) { return a.x - b.x; });
    var dR = s.rimSize === '2' && WH.length ? 5 : 0, dy = -dR + ({ '-2': 3.5, '-1': 1.8, '1': -4 }[s.susp] || 0);
    var ground = WH.length ? Math.max.apply(null, WH.map(function (w) { return w.y + w.r; })) : M.y1;
    var paint = s.paint || null, finish = s.finish || (paint ? W.gloss : W.matte);
    var base = finish === W.chrome ? mix(paint || '8A8C92', 'FFFFFF', 0.7) : paint || '2A2A31', sec2 = s.paint2 ? '#' + s.paint2 : INK;
    var topAt = function (x) { var c = cut(main || [], x); return c ? c[0] : M.y0; }, botAt = function (x) { var c = cut(main || [], x); return c ? c[1] : M.y1; };
    var defs = blurDefs(pre) + sheen(pre, finish, base, s.pearl), back = '', body = '', front = '';
    back += el('ellipse', { cx: (M.x0 + M.x1) / 2, cy: ground + 0.6, rx: M.w / 2 + 6, ry: 2.6, fill: INK, 'fill-opacity': 0.16 });
    if (s.neon && road) {
      var nc = '#' + (s.neonColor || 'F06AA8').split('.')[0], lay = s.neonLayout || W.all;
      var seg = { front: [M.x1 - 48, M.x1 - 6], back: [M.x0 + 6, M.x0 + 48], sides: [M.x0 + 16, M.x1 - 16], all: [M.x0 + 6, M.x1 - 6] };
      var use = { front: [W.front], back: [W.back], sides: [W.sides], fb: [W.front, W.back], fs: [W.front, W.sides], bs: [W.back, W.sides], all: [W.all] }[lay] || [W.all];
      use.forEach(function (k) { var a = seg[k][0], b = seg[k][1]; back += el('ellipse', { cx: (a + b) / 2, cy: ground - 0.5, rx: (b - a) / 2 + 8, ry: 4, fill: nc, 'fill-opacity': 0.55, filter: 'url(#' + pre + 'b2)' }) + el('rect', { x: a, y: ground - 4.2 + dy, width: b - a, height: 2.6, rx: 1.3, fill: nc, filter: 'url(#' + pre + 'b1)' }); });
    }
    if (s._smoke && WH.length) {
      var sc = s._smoke.split('.'), rw = WH[0];
      [[3, -5, 5.5], [11, -8.5, 7.5], [20, -6, 6.5]].forEach(function (q, i) { back += el('circle', { cx: rw.x - rw.r - q[0], cy: ground + q[1], r: q[2], fill: '#' + sc[i % sc.length], 'fill-opacity': 0.6, filter: 'url(#' + pre + 'b1)' }); });
    }
    parts.forEach(function (p) {
      var isMain = p === main;
      body += el('polygon', { points: pts(p), fill: isMain ? '#' + base : sec2, stroke: INK, 'stroke-width': 1.2, 'stroke-linejoin': 'round' });
      if (isMain && finish !== W.matte) body += el('polygon', { points: pts(p), fill: 'url(#' + pre + 'hl)' });
    });
    var tint = s.tint !== undefined ? Math.max(0, Math.min(100, +s.tint || 0)) : 18, glassC = '#' + mix('BCD3EA', '0B0C10', tint / 100);
    (d.glass || []).forEach(function (p) { body += el('polygon', { points: pts(p), fill: glassC, stroke: INK, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }); });
    if (road) {
      if (s.aileron) {
        var xr = M.x0 + 8, ty = topAt(xr), v = s._ail || W.wing, A2 = { fill: sec2, stroke: INK, 'stroke-width': 0.8 };
        var R = function (x, y, w, h) { return el('rect', Object.assign({ x: x, y: y, width: w, height: h, rx: 0.8 }, A2)); };
        body += v === W.lip ? R(xr - 7, ty - 2.4, 15, 2.6) : v === W.gt ? R(xr - 3, ty - 10.6, 1.8, 10.8) + R(xr + 7, ty - 10.6, 1.8, 10.8) + R(xr - 11, ty - 13, 27, 2.8) + R(xr - 12, ty - 15.6, 2.4, 7.6) : R(xr - 3, ty - 6.2, 1.6, 6.4) + R(xr + 5, ty - 6.2, 1.6, 6.4) + R(xr - 9, ty - 8, 21, 2.2);
      }
      if (s.jupes && WH.length > 1) { var ja = WH[0].x + WH[0].r + 1, jb = WH[WH.length - 1].x - WH[WH.length - 1].r - 1; if (jb - ja > 8) body += el('rect', { x: ja, y: botAt((ja + jb) / 2) - 3.4, width: jb - ja, height: 3.6, rx: 1, fill: sec2, stroke: INK, 'stroke-width': 0.8 }); }
      if (s.capot) { var xh = M.x1 - 30, th = topAt(xh); body += el('polygon', { points: pts([[xh - 8, th + 0.5], [xh - 5, th - 3], [xh + 6, th - 3], [xh + 8, th + 0.5]]), fill: sec2, stroke: INK, 'stroke-width': 0.8, 'stroke-linejoin': 'round' }); }
      if (s.toit) { var xc = (M.x0 + M.x1) / 2, tr = topAt(xc); body += el('rect', { x: xc - 16, y: tr - 3.8, width: 32, height: 1.8, rx: 0.9, fill: DARK }) + el('rect', { x: xc - 14, y: tr - 2.4, width: 1.6, height: 2.6, fill: DARK }) + el('rect', { x: xc + 12.4, y: tr - 2.4, width: 1.6, height: 2.6, fill: DARK }); }
      if (s.bullbar) { var xf = M.x1, yb = botAt(xf - 3), ht = (yb - topAt(xf - 3)) * 0.6; body += el('path', { d: 'M' + r1(xf - 1) + ' ' + r1(yb - 1) + 'H' + r1(xf + 3.5) + 'V' + r1(yb - ht) + 'H' + r1(xf - 1) + 'M' + r1(xf + 3.5) + ' ' + r1(yb - ht * 0.5) + 'H' + r1(xf - 1), fill: 'none', stroke: STEEL, 'stroke-width': 2.2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }
      if (s.exhaust) { var ye = botAt(M.x0 + 5) - 3.4; body += el('rect', { x: M.x0 - 4, y: ye, width: 8, height: 2.6, rx: 1.3, fill: STEEL, stroke: INK, 'stroke-width': 0.6 }) + el('circle', { cx: M.x0 - 3.6, cy: ye + 1.3, r: 0.9, fill: DARK }); }
      if (s.arceau && (d.glass || []).length) { var g0 = (d.glass || []).map(bb).sort(function (a, b) { return a.x0 - b.x0; })[0], xa = g0.x0 + g0.w * 0.4; body += el('path', { d: 'M' + r1(xa) + ' ' + r1(g0.y1 - 0.6) + 'V' + r1(g0.y0 + 1.2) + 'H' + r1(xa + g0.w * 0.25), fill: 'none', stroke: STEEL, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }); }
    }
    var lc = s.lights === W.xenon ? '#DFF4FF' : s.lights === W.color ? '#' + (s.lightColor || '38C7D4').split('.')[0] : '#FFF3D6', beam = s.lights === W.xenon || s.lights === W.color;
    (d.lights || []).forEach(function (L) {
      var isFront = L[0] + L[2] / 2 > (M.x0 + M.x1) / 2;
      if (isFront && beam && road) front += el('polygon', { points: pts([[L[0] + L[2], L[1]], [M.x1 + 24, L[1] - 5], [M.x1 + 24, L[1] + L[3] + 9], [L[0] + L[2], L[1] + L[3]]]), fill: lc, 'fill-opacity': 0.4, filter: 'url(#' + pre + 'b1)' });
      body += el('rect', { x: L[0], y: L[1], width: Math.max(1.6, L[2]), height: Math.max(1.6, L[3]), rx: 0.8, fill: isFront ? lc : '#E8452C', stroke: INK, 'stroke-width': 0.6 });
    });
    var rimC = s.rim ? s.rim : 'CFCBC2', k = two ? (d.kind === W.bike ? 0.84 : 0.62) : s.tyres === W.tt ? 0.5 : s.tyres === W.slick ? 0.7 : 0.6, wheels = '';
    WH.forEach(function (w) {
      var rr = w.r + dR, cy = w.y - dR, ri = rr * k, sp = '';
      for (var i = 0; i < 5; i++) { var an = (-90 + i * 72) * Math.PI / 180; sp += 'M' + r1(w.x + Math.cos(an) * rr * 0.16) + ' ' + r1(cy + Math.sin(an) * rr * 0.16) + 'L' + r1(w.x + Math.cos(an) * ri * 0.92) + ' ' + r1(cy + Math.sin(an) * ri * 0.92); }
      wheels += el('circle', { cx: w.x, cy: cy, r: rr, fill: '#141418', stroke: INK, 'stroke-width': 0.8 }) + el('circle', { cx: w.x, cy: cy, r: ri, fill: '#' + rimC, stroke: INK, 'stroke-width': 0.6 }) + el('path', { d: sp, stroke: '#' + mix(rimC, '000000', 0.45), 'stroke-width': r1(Math.max(0.6, rr * 0.08)), 'stroke-linecap': 'round', fill: 'none' }) + el('circle', { cx: w.x, cy: cy, r: rr * 0.15, fill: '#' + mix(rimC, '000000', 0.3) });
    });
    var x0 = M.x0, x1 = M.x1, y0 = M.y0; WH.forEach(function (w) { x0 = Math.min(x0, w.x - w.r); x1 = Math.max(x1, w.x + w.r); });
    parts.forEach(function (p) { var b = bb(p); x0 = Math.min(x0, b.x0); x1 = Math.max(x1, b.x1); y0 = Math.min(y0, b.y0); });
    var vb = [x0 - 30, y0 - 20, x1 - x0 + 60, ground - y0 + 30].map(r1).join(' ');
    return el('svg', { class: 'pf-art', viewBox: vb, xmlns: 'http://www.w3.org/2000/svg', role: label ? 'img' : null, 'aria-label': label || null, 'aria-hidden': label ? null : 'true', focusable: 'false' }, el('defs', {}, defs) + el('path', { d: 'M' + r1(x0 - 30) + ' ' + r1(ground + 0.6) + 'H' + r1(x1 + 30), stroke: INK, 'stroke-opacity': 0.22, 'stroke-width': 1 }) + back + el('g', { class: 'pf-art-hop' }, el('g', { transform: 'translate(0 ' + r1(dy) + ')' }, body + front)) + wheels);
  }
  var FINA = { black: '41424B', green: '3F6B35', army: '4B5A3C', orange: 'E8702A', lspd: '2F5FE0', pink: 'F06AA8', gold: 'D4A62A', platinum: 'D8DBE0', chrome: 'F0F0F0' };
  var CAMO = { woodland: ['#4a5a35', '#2f3a22', '#6b7246', '#1e2416'], tropical: ['#1f7a5a', '#f06aa8', '#2fb3a0', '#f5c542'], digital: ['#5a6b4e', '#3b4636', '#8a9a6e', '#232a20'], brush: ['#6b6f5a', '#3d4033', '#9a9878', '#24261e'], leopard: ['#d9a74a', '#2a1a0c', '#a8742c', '#e9c27a'], zebra: ['#f2f2ee', '#141414', '#141414', '#141414'], geometric: ['#3a4a5e', '#7a8c9e', '#1e2836', '#c3ccd6'] };
  function camoDefs(pre, kd) {
    var P = CAMO[kd]; if (!P) return '';
    var seed = 7, rnd = function () { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; }, g = el('rect', { width: 24, height: 24, fill: P[0] }), i;
    if (kd === W.digital) { for (var y = 0; y < 24; y += 4) for (var x = 0; x < 24; x += 4) { var r = rnd(); if (r < 0.62) g += el('rect', { x: x, y: y, width: 4, height: 4, fill: P[1 + Math.floor(r * 4.8) % 3] }); } }
    else if (kd === W.zebra) { for (i = 0; i < 4; i++) g += el('path', { d: 'M0 ' + (i * 6 + 1) + 'Q6 ' + (i * 6 - 2) + ' 12 ' + (i * 6 + 1) + 'T24 ' + (i * 6 + 1) + 'V' + (i * 6 + 3.4) + 'Q18 ' + (i * 6 + 6) + ' 12 ' + (i * 6 + 3.4) + 'T0 ' + (i * 6 + 3.4) + 'Z', fill: P[1] }); }
    else if (kd === W.geometric) { for (i = 0; i < 9; i++) { var gx = rnd() * 24, gy = rnd() * 24, gr = 3 + rnd() * 5; g += el('polygon', { points: pts([[gx, gy - gr], [gx + gr * 0.9, gy + gr * 0.6], [gx - gr * 0.9, gy + gr * 0.6]]), fill: P[1 + (i % 3)] }); } }
    else if (kd === W.leopard) { for (i = 0; i < 7; i++) g += el('ellipse', { cx: rnd() * 24, cy: rnd() * 24, rx: 1.6 + rnd() * 1.6, ry: 1.3 + rnd(), fill: P[2], stroke: P[1], 'stroke-width': 0.8, 'stroke-dasharray': '2 1.2' }); }
    else if (kd === W.brush) { for (i = 0; i < 6; i++) { var bx = rnd() * 24, by = rnd() * 24; g += el('path', { d: 'M' + r1(bx) + ' ' + r1(by) + 'q' + r1(5 - rnd() * 10) + ' ' + r1(5 - rnd() * 10) + ' ' + r1(8 - rnd() * 16) + ' ' + r1(4 - rnd() * 8), stroke: P[1 + (i % 3)], 'stroke-width': r1(1.6 + rnd() * 2), 'stroke-linecap': 'round', fill: 'none' }); } }
    else for (i = 0; i < 10; i++) g += el('ellipse', { cx: rnd() * 24, cy: rnd() * 24, rx: 2 + rnd() * 4, ry: 1.5 + rnd() * 3, fill: P[1 + (i % 3)] });
    return el('pattern', { id: pre + 'cm', width: 24, height: 24, patternUnits: 'userSpaceOnUse' }, g);
  }
  function drawA(d, s, pre, label) {
    var parts = d.parts || [], col = s._col ? s._col.split('.')[0] : FINA[s.finish] || '2A2A31', metal = s.finish === W.gold || s.finish === W.platinum || s.finish === W.chrome;
    var main = null, mA = 0, low = null, lowY = -1;
    parts.forEach(function (p) { var b = bb(p); if (b.w * b.h > mA) { mA = b.w * b.h; main = p; } if (b.y1 > lowY && b.w < 60) { lowY = b.y1; low = p; } });
    var mb = main ? bb(main) : { x0: 40, x1: 200, y0: 50, y1: 70, w: 160, h: 20 }, mz = d.muzzle || [mb.x1, (mb.y0 + mb.y1) / 2], mx = mz[0], my = mz[1], cx = (mb.x0 + mb.x1) / 2, lb = low ? bb(low) : null;
    var defs = blurDefs(pre) + camoDefs(pre, s.camo) + (metal ? sheen(pre, W.metal, col, '') : ''), body = '', acc = '';
    var A = { fill: '#24242A', stroke: INK, 'stroke-width': 0.7, 'stroke-linejoin': 'round' };
    var R = function (x, y, w, h, extra) { return el('rect', Object.assign({ x: x, y: y, width: w, height: h, rx: Math.min(1.2, h / 2) }, A, extra || {})); };
    parts.forEach(function (p) {
      var b = bb(p), grip = s.engrave && b.h > 25 && b.w < 40 && b.y1 > 90;
      body += el('polygon', { points: pts(p), fill: grip ? '#8A5A2B' : CAMO[s.camo] ? 'url(#' + pre + 'cm)' : '#' + col, stroke: INK, 'stroke-width': 1, 'stroke-linejoin': 'round' });
      if (metal && !grip) body += el('polygon', { points: pts(p), fill: 'url(#' + pre + 'hl)' });
    });
    if (lb && s.mag) { var lx = (lb.x0 + lb.x1) / 2; acc += s.mag === W.ext ? R(lx - Math.max(8, lb.w * 0.9) / 2, lb.y1 - 1, Math.max(8, lb.w * 0.9), 15) : s.mag === W.drum ? el('circle', Object.assign({ cx: lx, cy: lb.y1 + 4, r: 11 }, A)) : R(lx - 12, lb.y1 - 2, 24, 16); }
    if (s.sight) {
      var ys = mb.y0 - 2;
      if (s.sight === W.holo) acc += R(cx - 5.5, ys - 6, 11, 6) + el('rect', { x: cx - 3.5, y: ys - 4.6, width: 7, height: 3.2, fill: '#9FD7FF', 'fill-opacity': 0.8 });
      else { var lg = s.sight !== W.scope, sr = lg ? 4.2 : 3.4, sl = lg ? 44 : 34, yc = ys - sr - 3; acc += R(cx - 14, ys - 4, 4, 5) + R(cx + 10, ys - 4, 4, 5) + el('rect', Object.assign({ x: cx - sl / 2, y: yc - sr, width: sl, height: sr * 2, rx: sr }, A)); if (s.sight === W.night || s.sight === W.thermal) acc += el('rect', Object.assign({ x: cx + sl / 2 - 1, y: yc - sr - 1.6, width: 8, height: (sr + 1.6) * 2, rx: 1.4 }, A)) + el('circle', { cx: cx + sl / 2 + 7, cy: yc, r: sr * 0.7, fill: s.sight === W.night ? '#5BE08A' : '#F28C28' }); }
    }
    if (s.barrel === W.silencer) acc += R(mx, my - 4.4, 28, 8.8); else if (s.barrel === W.comp) acc += R(mx, my - 3.5, 9, 7); else if (s.barrel === W.heavy) acc += R(mx - 40, my - 3.6, 40, 7.2);
    else if (s.barrel === W.brake) acc += R(mx, my - 3.8, 10, 7.6) + el('path', { d: 'M' + r1(mx + 3) + ' ' + r1(my - 3.8) + 'v7.6M' + r1(mx + 5.5) + ' ' + r1(my - 3.8) + 'v7.6M' + r1(mx + 8) + ' ' + r1(my - 3.8) + 'v7.6', stroke: '#5C5A63', 'stroke-width': 1.1 });
    if (s.grip) acc += R(cx + 35.5, mb.y1 - 0.5, 5, 12.5);
    if (s.lamp) acc += R(mx - 28.5, my + 3.4, 9, 5.2) + el('circle', { cx: mx - 19.5, cy: my + 6, r: 2, fill: '#FFF3D6', filter: 'url(#' + pre + 'b1)' });
    var x1 = Math.max(mb.x1, mx) + 40, laser = '';
    if (s.laser) { acc += R(mx - 32.5, my + 4, 5, 4); laser = el('path', { d: 'M' + r1(mx - 27.5) + ' ' + r1(my + 6) + 'H' + r1(x1), stroke: '#FF2A3A', 'stroke-width': 0.9, 'stroke-opacity': 0.85 }); }
    var x0 = mb.x0, y0 = mb.y0, y1 = mb.y1; parts.forEach(function (p) { var b = bb(p); x0 = Math.min(x0, b.x0); y0 = Math.min(y0, b.y0); y1 = Math.max(y1, b.y1); });
    var vb = [x0 - 12, y0 - 22, x1 - x0 + 12, y1 - y0 + 42].map(r1).join(' ');
    return el('svg', { class: 'pf-art pf-art--a', viewBox: vb, xmlns: 'http://www.w3.org/2000/svg', role: label ? 'img' : null, 'aria-label': label || null, 'aria-hidden': label ? null : 'true', focusable: 'false' }, el('defs', {}, defs) + laser + el('g', { class: 'pf-art-hop' }, body + acc));
  }
  function recap(view) {
    var ul = view.querySelector('[data-pf-recap]'), none = view.querySelector('[data-pf-recap-vide]'), html = '';
    posts.forEach(function (p) {
      var ch = choice(p); if (!ch) return;
      var bits = []; if (ch.c) bits.push(ch.c.n); if (ch.o) bits.push(ch.o.n);
      var sw = ch.c ? ch.c.sw : ch.o && ch.o.sw ? ch.o.sw : null, vu = seen(p, ch), hint = !vu && p.apc && !ch.c ? T.choisis : !vu ? T.pasVu : '';
      html += '<li class="pf-rc' + (vu ? '' : ' is-off') + '">' + (sw ? swatch(sw) : '<span class="pf-sw pf-sw--none" aria-hidden="true"></span>') + '<span class="pf-rc-t"><b>' + esc(p.nom) + '</b>' + (bits.length ? '<span>' + esc(bits.join(', ')) + '</span>' : '') + (hint ? '<small>' + esc(hint) + '</small>' : '') + '</span></li>';
    });
    ul.innerHTML = html; ul.hidden = !html; none.hidden = !!html;
  }
  function apUpdate(hop) {
    if (!AP.open) return;
    var view = board.querySelector('[data-pf-view]'); if (!view) return;
    var s = setup(), go = view.querySelector('[data-pf-go]'); if (go) go.setAttribute('href', atelierHref(s));
    recap(view);
    if (!AP.d) return;
    var stage = view.querySelector('[data-pf-stage]'), draw = kind === 'vehicules' ? drawV : drawA;
    stage.innerHTML = draw(AP.d, s, 'pfv-', fill(T.apAlt, { n: name }));
    var mini = board.querySelector('[data-pf-jump-art]'); if (mini) mini.innerHTML = draw(AP.d, s, 'pfm-', '');
    if (hop) { stage.classList.remove('is-hop'); void stage.offsetWidth; stage.classList.add('is-hop'); }
  }
  function apOpen(on, save) {
    AP.open = on;
    var b = board.querySelector('[data-pf-view-b]'), view = board.querySelector('[data-pf-view]'), jump = board.querySelector('[data-pf-jump]');
    if (b) { b.setAttribute('aria-expanded', String(on)); b.textContent = on ? T.cacher : T.voirConf; }
    if (view) view.hidden = !on; if (jump) jump.hidden = !on;
    board.classList.toggle('is-view', on);
    if (save) { try { localStorage.setItem(VKEY, on ? '1' : '0'); } catch (e) {  } }
    if (!on || !view) return;
    apUpdate(false);
    if (AP.d || AP.wait) return;
    AP.wait = true;
    var stage = view.querySelector('[data-pf-stage]'); stage.innerHTML = '<p class="pf-stage-msg">' + esc(T.apCharge) + '</p>';
    var bad = function () { AP.wait = false; stage.innerHTML = '<p class="pf-stage-msg">' + esc(T.apEchec) + '</p>'; };
    try {
      fetch('/atelier/' + kind + '/' + encodeURIComponent(id) + '.json').then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); })
        .then(function (d) { AP.wait = false; AP.d = d; apUpdate(false); }).catch(bad);
    } catch (e) { bad(); }
  }
  board.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.matches) return;
    if (t.matches('[data-pf-take]')) { var pid = t.getAttribute('data-pf-take'); if (t.checked) { mine[pid] = mine[pid] || { o: null }; } else { delete mine[pid]; board.querySelectorAll('input[name="pf-o-' + pid + '"]:checked, input[name="pf-c-' + pid + '"]:checked').forEach(function (r) { r.checked = false; }); } persist(); status(); return; }
    if (t.matches('[data-pf-opt]')) { var oid = t.getAttribute('data-pf-opt'); mine[oid] = mine[oid] || {}; mine[oid].o = parseInt(t.value, 10); var cb = board.querySelector('[data-pf-take="' + oid + '"]'); if (cb) cb.checked = true; persist(); status(); return; }
    if (t.matches('[data-pf-coul]')) { var cid = t.getAttribute('data-pf-coul'); mine[cid] = mine[cid] || { o: null }; mine[cid].c = parseInt(t.value, 10); var cc = board.querySelector('[data-pf-take="' + cid + '"]'); if (cc) cc.checked = true; persist(); status(); }
  });
  board.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-pf-reset],[data-pf-all],[data-pf-view-b],[data-pf-jump]') : null; if (!b) return;
    if (b.hasAttribute('data-pf-reset')) { mine = {}; persist(); board.querySelectorAll('[data-pf-take],[data-pf-opt],[data-pf-coul]').forEach(function (i) { i.checked = false; }); status(); return; }
    if (b.hasAttribute('data-pf-view-b')) { apOpen(!AP.open, true); return; }
    if (b.hasAttribute('data-pf-jump')) {
      var st = board.querySelector('[data-pf-stage]'); if (!st) return;
      try { st.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }); } catch (err) { st.scrollIntoView(); }
      st.focus({ preventScroll: true }); return;
    }
    var open = b.getAttribute('data-pf-all') === '1';
    board.querySelectorAll('.pf-group').forEach(function (d) { d.open = open; });
    b.setAttribute('data-pf-all', open ? '0' : '1'); b.textContent = open ? T.fermer : T.ouvrir;
  });
  sec.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-pf-chip]') : null; if (!a) return;
    var g = document.getElementById('pf-' + a.getAttribute('data-pf-chip')); if (!g) { start(); return; }
    g.open = true;
    try { g.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); } catch (e) { g.scrollIntoView(); }
    var sum = g.querySelector('summary'); if (sum) sum.focus({ preventScroll: true });
  });
  var started = false;
  function start() {
    if (started) return; started = true;
    if (window.LK_PERSO) { D = window.LK_PERSO; render(); return; }
    var note = board.querySelector('.pf-nojs'); if (note) note.insertAdjacentHTML('beforebegin', '<p class="pf-charge" data-pf-charge>' + esc(T.charge) + '</p>');
    var s = document.createElement('script'); s.src = base + 'perso-data.js'; s.async = true;
    s.onload = function () { if (window.LK_PERSO) { D = window.LK_PERSO; render(); } else fail(); };
    s.onerror = fail;
    document.head.appendChild(s);
  }
  function fail() { var c = board.querySelector('[data-pf-charge]'); if (c) c.textContent = T.echec; }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { if (en.some(function (x) { return x.isIntersecting; })) { io.disconnect(); start(); } }, { rootMargin: '600px 0px' });
    io.observe(sec);
  } else start();
  if (location.hash === '#personnaliser') start();
})();
