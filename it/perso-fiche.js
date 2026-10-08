/* v7.73 (lot 3, demande de Téva) : « Personnaliser ce véhicule » / « Personnaliser cette arme » sur chaque fiche.
   La section statique (outils/perso-fiche.cjs) donne le modèle, sa catégorie et ses ateliers ; ce script charge perso-data.js
   (window.LK_PERSO, écrit par outils/gen-acquisitions.cjs) quand la section approche de l'écran, puis dessine les postes qui
   s'appliquent au modèle, atelier par atelier : statut, prix GTA VI (à confirmer : Rockstar n'a rien publié), repère de la
   série (GTA V, GTA Online), déblocage repère, effet, sous-listes d'options (finitions, niveaux, couleurs).
   « Ma configuration » : on coche un poste ou une option, le total des repères s'additionne (jamais présenté comme un prix
   GTA VI), enregistré sur cet appareil (clé lk_perso_v1). Sans script : lien vers la liste filtrée sur le modèle. */
(function () {
  'use strict';
  var sec = document.querySelector('section.pf[data-pf]'); if (!sec) return;
  var board = sec.querySelector('[data-pf-board]'); if (!board) return;
  var kind = sec.getAttribute('data-pf'), id = sec.getAttribute('data-pf-id'), cat = sec.getAttribute('data-pf-cat'), name = sec.getAttribute('data-pf-name') || '';
  var me = document.currentScript, base = me && me.src ? me.src.replace(/[^/]*$/, '') : '';
  var KEY = 'lk_perso_v1', SK = kind + ':' + id;
  var T = {
    titre: 'La mia configurazione', ou: 'su questo dispositivo', vide: 'Nessuna voce scelta: spunta “La prendo” su una voce o un’opzione.',
    un: '{n} voce scelta', des: '{n} voci scelte', total: 'Riferimento della serie: {t}', entre: 'da {a} a {b}', sans: '{n} senza prezzo rilevato',
    reset: 'Rimuovi tutto', prends: 'La prendo', voir: 'Vedi nella lista', postes: '{n} voci', poste: '1 voce',
    p6: 'Prezzo GTA VI', rep: 'Riferimento della serie', pasRep: 'Nessun riferimento', niveau: 'Livello richiesto', niveauVi: 'GTA VI: da confermare', effet: 'Effetto',
    options: '{n} options', option: '1 option', couleurs: 'Famiglie di tinte della palette di GTA V', couleursN: '{n} famiglie di tinte',
    prixNon: 'prezzo non rilevato', honnete: 'Prezzi e sblocchi vengono da GTA V o da GTA Online, presentati come riferimenti: Rockstar non ha pubblicato nulla per GTA VI.',
    charge: 'Caricamento delle voci…', echec: 'Le voci non sono state caricate: apri la lista delle personalizzazioni.', ouvrir: 'Espandi tutto', fermer: 'Comprimi tutto'
  };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] !== undefined ? String(v[k]) : m; }); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var money = function (n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' $'; };
  var PIP = { officiel: 'Ufficiale', vu: 'Visto in un media', comm: 'Identificazione della community', serie: 'Riferimento della serie', conf: 'Da confermare' };
  function load(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* stockage indisponible */ } }
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
    if (p.couleurs) out += '<p class="pf-coul-t">' + esc(T.couleurs) + '</p><ul class="pf-coul">' + D[kind].couleurs.map(function (c) { return '<li>' + swatch(c.sw) + esc(c.n) + '</li>'; }).join('') + '</ul>';
    if (p.note) out += '<p class="pf-opt-note">' + esc(p.note) + '</p>';
    return out;
  }
  function post(p) {
    var n = p.opts.length, nc = p.couleurs ? D[kind].couleurs.length : 0, on = !!mine[p.id];
    var sum = n ? fill(n > 1 ? T.options : T.option, { n: n }) + (nc ? ' · ' + fill(T.couleursN, { n: nc }) : '') : nc ? fill(T.couleursN, { n: nc }) : '';
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
    /* rien de chiffré parmi les choix : seul le nombre de postes sans prix relevé est écrit (pas de « 0 $ ») */
    box.querySelector('[data-pf-total]').textContent = !ids.length ? '' : priced ? fill(T.total, { t: t }) + (sans ? ' · ' + fill(T.sans, { n: sans }) : '') : fill(T.sans, { n: sans });
    box.classList.toggle('is-on', ids.length > 0);
    sec.querySelectorAll('[data-pf-post]').forEach(function (li) { li.classList.toggle('is-on', !!mine[li.getAttribute('data-pf-post')]); });
    sec.querySelectorAll('.pf-opt').forEach(function (l) { l.classList.toggle('is-on', l.querySelector('input').checked); });
  }
  function render() {
    posts = D[kind].posts.filter(fits); byId = {}; posts.forEach(function (p) { byId[p.id] = p; });
    Object.keys(mine).forEach(function (k) { if (!byId[k]) delete mine[k]; });
    var cats = D[kind].cats.filter(function (c) { return posts.some(function (p) { return p.cat === c.id; }); });
    var html = '<p class="pf-honnete">' + esc(T.honnete) + '</p>'
      + '<div class="pf-config" data-pf-config><p class="pf-config-t">' + esc(T.titre) + ' <small>' + esc(T.ou) + '</small></p><p class="pf-config-n" role="status" aria-live="polite" data-pf-n></p><p class="pf-config-sum" data-pf-total></p><p class="pf-config-acts"><button type="button" class="pf-bt" data-pf-reset>' + esc(T.reset) + '</button><button type="button" class="pf-bt pf-bt--ghost" data-pf-all="1">' + esc(T.ouvrir) + '</button></p></div>'
      + '<div class="pf-groups">' + cats.map(function (c, i) { return group(c, posts.filter(function (p) { return p.cat === c.id; }), i); }).join('') + '</div>';
    board.innerHTML = html;
    board.classList.add('is-ready');
    status();
    if (window.LKMotion) window.LKMotion.enter(board.querySelectorAll('.pf-group'), { stagger: 60, cap: 480, rise: 14 });
  }
  board.addEventListener('change', function (e) {
    var t = e.target; if (!t || !t.matches) return;
    if (t.matches('[data-pf-take]')) { var pid = t.getAttribute('data-pf-take'); if (t.checked) { mine[pid] = mine[pid] || { o: null }; } else { delete mine[pid]; var r = board.querySelector('input[name="pf-o-' + pid + '"]:checked'); if (r) r.checked = false; } persist(); status(); return; }
    if (t.matches('[data-pf-opt]')) { var oid = t.getAttribute('data-pf-opt'); mine[oid] = { o: parseInt(t.value, 10) }; var cb = board.querySelector('[data-pf-take="' + oid + '"]'); if (cb) cb.checked = true; persist(); status(); }
  });
  board.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-pf-reset],[data-pf-all]') : null; if (!b) return;
    if (b.hasAttribute('data-pf-reset')) { mine = {}; persist(); board.querySelectorAll('[data-pf-take],[data-pf-opt]').forEach(function (i) { i.checked = false; }); status(); return; }
    var open = b.getAttribute('data-pf-all') === '1';
    board.querySelectorAll('.pf-group').forEach(function (d) { d.open = open; });
    b.setAttribute('data-pf-all', open ? '0' : '1'); b.textContent = open ? T.fermer : T.ouvrir;
  });
  /* les puces d'atelier de la section statique ouvrent leur groupe */
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
