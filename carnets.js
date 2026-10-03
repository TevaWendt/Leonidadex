/* LEONIDAKIT — page d’un carnet de progression (v7.51, lot 4).
   Une page par carnet (carnets/<id>.html) : « Mon garage », « Mon arsenal »… Les données publiques (noms, catégories,
   liens, vignettes) sont dans la page (#lk-carnet-data, écrit par outils/gen-carnets.cjs) ; ce que tu as coché est lu ici,
   dans ce navigateur, avec carnets-core.js et les clés de toujours (lk_own_<famille>, lk_map_found, lk_progression_v2,
   lk_collectibles_v1) : les fiches, la page Progression, la carte et le calculateur comptent exactement pareil.
   - trois vues : ce que tu as, tes envies (lk_wish_v1 : une envie n’est jamais une possession), ce qui reste ;
   - recherche, famille, catégorie, stock, tri, nombre de résultats ; la vue et les filtres vivent dans l’adresse (#vue=…),
     donc le retour arrière et le rechargement retrouvent la même page ;
   - stock des consommables et des munitions : une quantité n’est jamais devinée (« stock à renseigner ») ; « J’en ai
     utilisé un » passe par le journal des réalisations (applyEvent) : un même geste n’est jamais compté deux fois ;
   - un autre onglet qui change le suivi : la page relit tout, rien n’est écrasé ; stockage indisponible : lecture seule,
     et le message le dit (jamais de succès annoncé à tort).
   Tout passe par textContent ; seuls les pictogrammes et les schémas d’armes générés avec la page sont posés en HTML. */
(function () {
  'use strict';
  var app = document.querySelector('[data-cn-app]'), dataEl = document.getElementById('lk-carnet-data');
  if (!app || !dataEl) return;
  var D; try { D = JSON.parse(dataEl.textContent); } catch (e) { return; }
  var P = D.prefix || '../', doc = D.nature === 'document';
  function q(sel) { return app.querySelector(sel); }
  var E = {
    tabs: q('[data-cn-tabs]'), tools: q('[data-cn-tools]'), panel: q('#cn-panel'), list: q('[data-cn-list]'), empty: q('[data-cn-empty]'),
    more: q('[data-cn-more]'), count: q('[data-cn-count]'), reset: q('[data-cn-reset]'), calc: q('[data-cn-calc]'), q: q('[data-cn-q]'),
    fam: q('[data-cn-fam]'), cat: q('[data-cn-cat]'), sort: q('[data-cn-sort]'), stockf: q('[data-cn-stockf]'), orphans: q('[data-cn-orphans]'),
    orphanList: q('[data-cn-orphan-list]'), loading: q('[data-cn-loading]'), statusT: q('[data-cn-status-t]'), undo: q('[data-cn-undo]')
  };
  var nf = new Intl.NumberFormat('fr-FR');
  var reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  function fold(s) { return String(s || '').replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined && text !== null) n.textContent = text; return n; }
  function cap(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function uid() { return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }

  /* ---------- messages (zone d’état + « Annuler ») ---------- */
  var undoAction = null, sayTimer = null;
  function say(text, undo) {
    if (!E.statusT) return;
    E.statusT.textContent = text || '';
    undoAction = typeof undo === 'function' ? undo : null;
    if (E.undo) E.undo.hidden = !undoAction;
    E.statusT.parentNode.classList.toggle('is-on', !!text);
    clearTimeout(sayTimer);
    if (text && !undoAction) sayTimer = setTimeout(function () { if (E.statusT.textContent === text) { E.statusT.textContent = ''; E.statusT.parentNode.classList.remove('is-on'); } }, 6000);
  }
  if (E.undo) E.undo.addEventListener('click', function () { var fn = undoAction; undoAction = null; E.undo.hidden = true; if (fn) fn(); });

  /* ---------- stockage ---------- */
  var storage = null;
  try { storage = window.localStorage; var probe = 'lk_probe'; storage.setItem(probe, '1'); storage.removeItem(probe); } catch (e) { storage = null; }
  var K = window.LKCarnets, store = null;
  if (K && storage) store = K.create({ storage: storage, notice: function (m) { say(m); } });
  var readOnly = !store;
  var progStore = null;
  function prog() {
    if (progStore || !window.LKProgression || !storage) return progStore;
    try { progStore = window.LKProgression.create({ storage: storage, acquisitions: window.LK_ACQUISITIONS, ids: {}, collectibles: [], notice: function (m) { say(m); } }); } catch (e) { progStore = null; }
    return progStore;
  }

  /* ---------- éléments ---------- */
  var items = D.items || [];
  if (D.ext === 'lieux') {
    var L = window.LK_CARNET_LIEUX;
    items = L && Array.isArray(L.rows) ? L.rows.map(function (r) { var c = L.cats[r[2]] || ['Lieux', '#B5762A']; return { f: 'lieux', id: r[0], n: r[1], c: c[0], g: r[2], u: r[4] ? 'lieux/' + r[0] + '.html' : 'carte.html#lieu=' + encodeURIComponent(r[0]), x: r[4] ? 'fiche' : 'carte', col: c[1], k: r[3] >= 0 ? L.groups[r[3]] : '' }; }) : [];
  }
  var styles = D.styles || [];
  var index = {};
  items.concat(styles).forEach(function (it) { index[it.f + ':' + it.id] = it; it._q = fold(it.n + ' ' + it.c + ' ' + (it.k || '') + ' ' + ((D.meta[it.f] || {}).label || '')); });
  var multi = D.fams.length > 1;
  function meta(f) { return D.meta[f] || { label: 'Carnet de style', one: 'style', many: 'styles', done: 'gardé', doneP: 'gardés', wish: 'Garder' }; }

  /* ---------- lecture de l’état (une fois par affichage) ---------- */
  function ownedMap(f) { var out = {}; if (!store) return out; try { store.owned(f).forEach(function (id) { out[id] = true; }); } catch (e) { /* clé illisible : rien de coché */ } return out; }
  function snapshot() {
    var s = { own: {}, wish: {}, wishAt: {} };
    D.fams.forEach(function (f) { s.own[f] = ownedMap(f); });
    if (store) { try { store.wishes().forEach(function (w) { var k = w.famille + ':' + w.id; s.wish[k] = true; s.wishAt[k] = w.at || ''; }); } catch (e) { /* souhaits illisibles */ } }
    return s;
  }
  function isOwn(it, s) { return !!(s.own[it.f] && s.own[it.f][it.id]); }
  function stockOf(it) { if (!store || !meta(it.f).stock) return null; try { return store.stock(it.f, it.id); } catch (e) { return null; } }
  function stockKind(st) { if (!st || st.state === 'aucun') return ''; if (st.state === 'a-renseigner') return 'a-renseigner'; return st.qty > 0 ? 'en-stock' : 'epuise'; }

  /* ---------- écriture ---------- */
  function setOwn(it, on) {
    if (readOnly) return false;
    if (it.f === 'acquisitions') { var p = prog(); return p ? p.toggle(it.id, on) !== false : false; }
    if (it.f === 'collectibles') { return window.LKCollectibles && typeof window.LKCollectibles.setFound === 'function' ? window.LKCollectibles.setFound(it.id, on) !== false : false; }
    return store.setOwned(it.f, it.id, on);
  }
  function setWish(it, on) { if (readOnly) return false; try { return store.setWish(it.f, it.id, on, 'catalogue'); } catch (e) { return false; } }

  /* ---------- état de la page (adresse) ---------- */
  var VIEWS = Object.keys(D.vues), SLUG = { own: 'possedes', wish: 'envies', rest: 'restants', calcs: 'calculs', plans: 'plans' };
  var PAGE = 48;
  var state = { view: VIEWS[0], q: '', f: '', cat: '', sort: doc ? 'recent' : 'nom', stock: '', shown: PAGE };
  function readHash() {
    var h = location.hash.slice(1); if (!h || h.indexOf('=') < 0) return;
    var p; try { p = new URLSearchParams(h); } catch (e) { return; }
    /* Une nouvelle adresse remplace tout l’état : ce qu’elle ne précise pas revient à sa valeur de départ. */
    state.view = VIEWS[0]; state.q = ''; state.f = ''; state.cat = ''; state.sort = doc ? 'recent' : 'nom'; state.stock = ''; state.shown = PAGE;
    var v = p.get('vue'); VIEWS.forEach(function (k) { if (SLUG[k] === v) state.view = k; });
    if (p.has('q')) state.q = String(p.get('q')).slice(0, 80);
    if (p.has('f') && D.fams.indexOf(p.get('f')) >= 0) state.f = p.get('f');
    if (p.has('cat')) state.cat = String(p.get('cat')).slice(0, 80);
    if (p.has('tri') && E.sort && [].some.call(E.sort.options, function (o) { return o.value === p.get('tri'); })) state.sort = p.get('tri');
    if (p.has('stock') && ['a-renseigner', 'en-stock', 'epuise'].indexOf(p.get('stock')) >= 0) state.stock = p.get('stock');
  }
  function writeHash() {
    var p = new URLSearchParams();
    if (state.view !== VIEWS[0]) p.set('vue', SLUG[state.view]);
    if (state.q) p.set('q', state.q); if (state.f) p.set('f', state.f); if (state.cat) p.set('cat', state.cat);
    if (state.sort !== (doc ? 'recent' : 'nom')) p.set('tri', state.sort); if (state.stock) p.set('stock', state.stock);
    var s = p.toString(), next = location.pathname + location.search + (s ? '#' + s : '');
    if (next !== location.pathname + location.search + location.hash && history.replaceState) { try { history.replaceState(history.state, '', next); } catch (e) { /* adresse inchangée */ } }
  }

  /* ---------- listes par vue ---------- */
  function listFor(view, s) {
    if (view === 'own') return items.filter(function (it) { return isOwn(it, s); });
    if (view === 'wish') return items.concat(styles).filter(function (it) { return s.wish[it.f + ':' + it.id]; });
    return items.filter(function (it) { return !isOwn(it, s); });
  }
  function filtered(list) {
    var needle = fold(state.q.trim());
    return list.filter(function (it) {
      if (state.f && it.f !== state.f && !(it.f === 'styles' && state.f === 'tenues')) return false;
      if (state.cat && it.f + ':' + it.g !== state.cat) return false;
      if (needle && it._q.indexOf(needle) < 0) return false;
      if (state.stock) { if (!meta(it.f).stock) return false; if (stockKind(stockOf(it)) !== state.stock) return false; }
      return true;
    });
  }
  var coll = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
  function sorted(list, s) {
    var out = list.slice();
    if (state.sort === 'nom-desc') out.sort(function (a, b) { return coll.compare(b.n, a.n); });
    else if (state.sort === 'cat') out.sort(function (a, b) { return coll.compare(a.c, b.c) || coll.compare(a.n, b.n); });
    else if (state.sort === 'recent') out.sort(function (a, b) { var x = s.wishAt[a.f + ':' + a.id] || '', y = s.wishAt[b.f + ':' + b.id] || ''; return x < y ? 1 : x > y ? -1 : coll.compare(a.n, b.n); });
    else out.sort(function (a, b) { return coll.compare(a.n, b.n); });
    return out;
  }

  /* ---------- rendu d’une carte ---------- */
  function thumb(it) {
    var box = el('span', 'cn-thumb'), t = it.t;
    if (it.f === 'lieux') { box.classList.add('cn-thumb--dot'); var dot = el('i', 'cn-dot'); dot.style.setProperty('--dot', it.col || '#B5762A'); box.appendChild(dot); return box; }
    function ico(name) {
      box.className = 'cn-thumb cn-thumb--ico'; box.title = 'Pictogramme de la catégorie, pas un visuel de l’objet';
      if (t && t.dot) box.setAttribute('data-dot', t.dot);
      if (name && D.icons && D.icons[name]) box.innerHTML = '<svg class="cn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + D.icons[name] + '</svg>';
    }
    if (t && t.img) {
      var img = el('img'); img.src = P + t.img; img.alt = ''; img.loading = 'lazy'; img.decoding = 'async'; img.width = 160; img.height = 90;
      box.classList.add(/\.svg$/.test(t.img) ? 'cn-thumb--schema' : 'cn-thumb--photo');
      img.addEventListener('error', function () { img.remove(); ico(null); });
      box.appendChild(img); return box;
    }
    if (t && t.svg && D.art && D.art[it.id]) { box.classList.add('cn-thumb--schema'); box.innerHTML = '<svg viewBox="0 0 240 120" aria-hidden="true" focusable="false">' + D.art[it.id] + '</svg>'; return box; }
    ico(t && t.ico); return box;
  }
  function button(label, act, cls, aria) { var b = el('button', 'cn-act' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.setAttribute('data-cn-act', act); if (aria) b.setAttribute('aria-label', aria); if (readOnly) b.disabled = true; return b; }
  function ownLabel(it) { return it.f === 'lieux' ? 'Marquer comme repéré' : it.f === 'collectibles' ? 'Marquer comme trouvé' : 'Je l’ai'; }
  function linkWord(it) { return it.x === 'fiche' ? 'ouvrir la fiche' : it.x === 'carte' ? 'voir sur la carte' : 'voir dans la liste'; }
  function calcHref(it) { var c = meta(it.f).calc; return c ? P + 'calculateurs.html?tool=purchase&type=' + c + '&id=' + encodeURIComponent(it.id) + '&from=carnet#atelier' : null; }
  function card(it, s, i) {
    var key = it.f + ':' + it.id, own = isOwn(it, s), wish = !!s.wish[key], m = meta(it.f);
    var li = el('li', 'cn-card' + (own ? ' is-own' : '') + (wish ? ' is-wish' : '')); li.setAttribute('data-key', key); li.style.setProperty('--i', String(Math.min(i, 14)));
    li.appendChild(thumb(it));
    var body = el('div', 'cn-body');
    body.appendChild(el('p', 'cn-kicker', it.f === 'styles' || !multi || it.c === m.label ? it.c + (it.f === 'lieux' && it.k ? ' · ' + it.k : '') : m.label + ' · ' + it.c));
    var h = el('h3', 'cn-name');
    if (it.u) { var a = el('a', null, it.n); a.href = P + it.u; a.setAttribute('aria-label', it.n + ' : ' + linkWord(it)); h.appendChild(a); } else h.textContent = it.n;
    body.appendChild(h);
    var badges = el('p', 'cn-badges');
    if (own) badges.appendChild(el('span', 'cn-stamp', cap(m.done)));
    if (wish) badges.appendChild(el('span', 'cn-wishb', it.f === 'lieux' ? 'À visiter' : it.f === 'consommables' ? 'À essayer' : 'Envie'));
    if (it.sr) { var sb = el('span', 'cn-serieb', 'Repère de la série'); sb.title = 'Vu dans GTA V ou GTA Online, pas encore montré dans GTA VI : compté à part.'; badges.appendChild(sb); }
    if (it.f === 'collectibles' && window.LKCollectibles) { try { var cs = window.LKCollectibles.getState(); if (cs.favorites && cs.favorites[it.id]) badges.appendChild(el('span', 'cn-favb', 'Favori')); if (cs.notes && cs.notes[it.id]) body.appendChild(el('p', 'cn-note', cs.notes[it.id])); } catch (e) { /* carnet illisible */ } }
    if (badges.childNodes.length) body.appendChild(badges);
    if (own && m.stock) body.appendChild(stockBlock(it));
    var acts = el('div', 'cn-actions');
    if (it.f === 'styles') acts.appendChild(button('Retirer de mes envies', 'unwish', 'cn-act--ghost', 'Retirer « ' + it.n + ' » de mes envies'));
    else if (state.view === 'own') acts.appendChild(button('Retirer', 'unown', 'cn-act--ghost', 'Retirer « ' + it.n + ' » (' + D.titre + ')'));
    else {
      if (!own) acts.appendChild(button(ownLabel(it), 'own', 'cn-act--main', ownLabel(it) + ' : ' + it.n));
      if (D.vues.wish) {
        var w = button(wish ? (state.view === 'wish' ? 'Retirer de mes envies' : 'Dans mes envies') : m.wish, wish ? 'unwish' : 'wish', wish ? 'cn-act--ghost' : '', (wish ? 'Retirer « ' + it.n + ' » de mes envies' : m.wish + ' : ' + it.n));
        w.setAttribute('aria-pressed', String(wish)); acts.appendChild(w);
      }
    }
    var ch = !own && calcHref(it);
    if (ch && state.view !== 'own') { var c = el('a', 'cn-act cn-act--link', 'Combien de temps pour l’avoir ?'); c.href = ch; acts.appendChild(c); }
    if (it.f === 'lieux' && it.x === 'fiche') { var mp = el('a', 'cn-act cn-act--link', 'Voir sur la carte'); mp.href = P + 'carte.html#lieu=' + encodeURIComponent(it.id); acts.appendChild(mp); }
    body.appendChild(acts);
    li.appendChild(body);
    return li;
  }
  function stockBlock(it) {
    var st = stockOf(it) || { state: 'a-renseigner', qty: null }, kind = stockKind(st), idBase = 'cn-s-' + it.f + '-' + it.id;
    var box = el('div', 'cn-stock'); box.setAttribute('data-state', kind || 'a-renseigner');
    var line = el('p', 'cn-stock-state');
    line.appendChild(document.createTextNode('Stock : '));
    line.appendChild(el('b', null, kind === 'a-renseigner' || !kind ? 'à renseigner' : kind === 'epuise' ? 'épuisé (0)' : nf.format(st.qty) + ' en stock'));
    box.appendChild(line);
    var form = el('form', 'cn-stock-form'); form.setAttribute('data-cn-stock-form', it.f + ':' + it.id); form.noValidate = true;
    var lab = el('label', null, st.qty === null ? 'Combien il t’en reste' : 'Corriger la quantité'); lab.htmlFor = idBase;
    var inp = el('input'); inp.id = idBase; inp.type = 'number'; inp.min = '0'; inp.max = '1000000'; inp.step = '1'; inp.inputMode = 'numeric'; if (st.qty !== null) inp.value = String(st.qty); if (readOnly) inp.disabled = true;
    var sub = el('button', 'cn-act', 'Noter'); sub.type = 'submit'; if (readOnly) sub.disabled = true;
    form.appendChild(lab); form.appendChild(inp); form.appendChild(sub); box.appendChild(form);
    if (st.qty !== null) {
      var qk = el('div', 'cn-stock-q');
      qk.appendChild(button('J’en ai utilisé un', 'use', '', 'J’en ai utilisé un : ' + it.n));
      qk.appendChild(button('J’en ai racheté un', 'buy', '', 'J’en ai racheté un : ' + it.n));
      qk.appendChild(button('Oublier la quantité', 'forget', 'cn-act--ghost', 'Oublier la quantité de ' + it.n));
      box.appendChild(qk);
    } else box.appendChild(el('p', 'cn-stock-hint', 'Le site ne devine jamais une quantité : écris-la quand tu la connais.'));
    return box;
  }

  /* ---------- rendu de la page ---------- */
  var EMPTY_ART = '<svg viewBox="0 0 120 90" aria-hidden="true" focusable="false"><rect x="18" y="10" width="70" height="72" rx="6" fill="#FDFBF7" stroke="#1A1A1E" stroke-width="2.5"/><path d="M30 10v72" stroke="#1A1A1E" stroke-width="2"/><path d="M40 28h36M40 40h36M40 52h24" stroke="#DFD9CC" stroke-width="3" stroke-linecap="round"/><path d="M84 58l20-20 6 6-20 20-9 3z" fill="#F5A524" stroke="#1A1A1E" stroke-width="2.5" stroke-linejoin="round"/><circle cx="96" cy="20" r="7" fill="#E8452C" opacity=".85"/></svg>';
  function emptyState(view, filteredOut, s) {
    E.empty.replaceChildren();
    var art = el('span', 'cn-empty-art'); art.innerHTML = EMPTY_ART; E.empty.appendChild(art);
    var txt = el('div', 'cn-empty-t');
    if (filteredOut) {
      txt.appendChild(el('h3', null, 'Aucun résultat'));
      txt.appendChild(el('p', null, 'Rien ne correspond à ta recherche ou à tes filtres dans « ' + D.vues[view] + ' ».'));
      var r = el('button', 'cn-btn', 'Effacer la recherche et les filtres'); r.type = 'button'; r.setAttribute('data-cn-reset', ''); txt.appendChild(r);
    } else {
      var v = (D.vide && D.vide[view]) || ['Rien ici pour l’instant', ''];
      txt.appendChild(el('h3', null, v[0])); if (v[1]) txt.appendChild(el('p', null, v[1]));
      var row = el('p', 'cn-empty-links');
      if (view !== 'rest' && D.vues.rest && listFor('rest', s).length) { var b = el('button', 'cn-btn cn-btn--main', 'Voir « ' + D.vues.rest + ' »'); b.type = 'button'; b.setAttribute('data-cn-goto', 'rest'); row.appendChild(b); }
      if (D.cta && D.cta.href) { var a = el('a', 'cn-btn', D.cta.label); a.href = P + D.cta.href; row.appendChild(a); }
      if (doc) { var c = el('a', 'cn-btn cn-btn--main', 'Ouvrir le calculateur'); c.href = P + 'calculateurs.html#atelier'; row.replaceChildren(c); }
      if (row.childNodes.length) txt.appendChild(row);
    }
    E.empty.appendChild(txt);
  }
  function fillCats(list) {
    if (!E.cat) return;
    var seen = new Map();
    list.forEach(function (it) { var k = it.f + ':' + it.g; if (!seen.has(k)) seen.set(k, { label: (multi && it.f !== 'styles' && it.c !== meta(it.f).label ? meta(it.f).label + ' · ' : '') + it.c, n: 0 }); seen.get(k).n += 1; });
    var keys = Array.from(seen.keys()).sort(function (a, b) { return coll.compare(seen.get(a).label, seen.get(b).label); });
    if (state.cat && !seen.has(state.cat)) keys.unshift(state.cat);
    var opts = [el('option', null, doc ? 'Tous' : 'Toutes')]; opts[0].value = '';
    keys.forEach(function (k) { var o = el('option', null, seen.has(k) ? seen.get(k).label + ' (' + seen.get(k).n + ')' : k.split(':')[1] + ' (0)'); o.value = k; opts.push(o); });
    E.cat.replaceChildren.apply(E.cat, opts); E.cat.value = state.cat;
  }
  /* Libellé d’un compteur accordé au nombre (français : 0 et 1 au singulier ; anglais : 1 seulement). */
  /* v7.61 : français n > 1 ; anglais, espagnol n ≠ 1 (« 0 deseos ») */
  function plural(n, v) { var l = n.nextElementSibling, fr = (document.documentElement.lang || 'fr').slice(0, 2) === 'fr'; if (l && l.hasAttribute('data-one')) l.textContent = (fr ? v > 1 : v !== 1) ? l.getAttribute('data-many') : l.getAttribute('data-one'); }
  function headCounters(s) {
    var total = items.length, done = items.filter(function (it) { return isOwn(it, s); }).length;
    /* v7.54 : les repères de la série sont dits et comptés à part du total GTA VI. */
    var serie = items.filter(function (it) { return it.sr; }).length;
    document.querySelectorAll('[data-cn-serie]').forEach(function (n) { n.hidden = !serie; var b = n.querySelector('b'); if (b) b.textContent = nf.format(serie); });
    var wish = items.concat(styles).filter(function (it) { return s.wish[it.f + ':' + it.id]; }).length;
    function set(k, v) { document.querySelectorAll('[data-cn-n="' + k + '"]').forEach(function (n) { n.textContent = nf.format(v); plural(n, v); }); }
    set('done', done); set('total', total); set('wish', wish); set('rest', total - done);
    var pct = total ? Math.floor(done / total * 100) : 0;
    document.querySelectorAll('[data-cn-bar]').forEach(function (b) { b.style.width = (total ? done / total * 100 : 0) + '%'; });
    document.querySelectorAll('[data-cn-pct]').forEach(function (b) { b.textContent = !total ? '—' : done && pct < 1 ? 'moins de 1 %' : pct + ' %'; });
    var tn = { own: done, wish: wish, rest: total - done };
    VIEWS.forEach(function (v) { var n = app.querySelector('[data-cn-tabn="' + v + '"]'); if (n) n.textContent = nf.format(tn[v] || 0); });
  }
  function orphans(s) {
    if (!E.orphans) return;
    var rows = [];
    D.fams.forEach(function (f) { Object.keys(s.own[f] || {}).forEach(function (id) { if (!index[f + ':' + id]) rows.push({ f: f, id: id, kind: 'own' }); }); });
    Object.keys(s.wish).forEach(function (k) { var p = k.split(':'); if ((D.fams.indexOf(p[0]) >= 0 || (p[0] === 'styles' && styles.length)) && !index[k]) rows.push({ f: p[0], id: p[1], kind: 'wish' }); });
    E.orphans.hidden = !rows.length; E.orphanList.replaceChildren();
    rows.forEach(function (r) {
      var li = el('li'); li.appendChild(el('code', null, r.id)); li.appendChild(el('span', null, ' ' + meta(r.f).label + (r.kind === 'wish' ? ' · envie' : '')));
      if (r.f === 'collectibles') li.appendChild(el('span', 'cn-orphan-keep', ' · gardé tel quel'));
      else { var b = button('Retirer', r.kind === 'wish' ? 'orphan-unwish' : 'orphan-unown', 'cn-act--ghost', 'Retirer la saisie ' + r.id); b.setAttribute('data-f', r.f); b.setAttribute('data-id', r.id); li.appendChild(b); }
      E.orphanList.appendChild(li);
    });
  }
  function countText(n, total) {
    var f = state.f || (D.fams.length === 1 ? D.fams[0] : null), m = f ? meta(f) : { one: 'élément', many: 'éléments' };
    /* v7.62 : phrase entière avec trous (en allemand « Elemente: 3 von 10 angezeigt ») */
    return n === total ? nf.format(total) + ' ' + (total > 1 ? m.many : m.one) : '{n} sur {t} {mots} affichés'.replace('{n}', nf.format(n)).replace('{t}', nf.format(total)).replace('{mots}', total > 1 || n > 1 ? m.many : m.one);
  }
  function calcLink(list) {
    if (!E.calc) return;
    var ids = list.filter(function (it) { return meta(it.f).calc; });
    var type = ids.length ? meta(ids[0].f).calc : null;
    var same = ids.filter(function (it) { return meta(it.f).calc === type; }).slice(0, 12);
    E.calc.hidden = !(state.view === 'wish' && same.length >= 2);
    if (!E.calc.hidden) { E.calc.textContent = 'Classer mes envies dans le calculateur'; E.calc.href = P + 'calculateurs.html?tool=order&type=' + type + '&ids=' + same.map(function (it) { return encodeURIComponent(it.id); }).join(',') + '&from=carnet#atelier'; return; }
    /* v7.53 : envies sans fiche dans le calculateur (tenues, coiffures, tatouages, consommables, personnalisations) :
       elles partent dans « Mon budget » comme achats libres, prix à venir (jamais comptés à 0). Les styles gardés n’en sont pas. */
    var free = list.filter(function (it) { return !meta(it.f).calc && it.f !== 'styles' && it.f !== 'lieux' && it.f !== 'collectibles'; }).slice(0, 12);
    if (state.view === 'wish' && free.length) { E.calc.hidden = false; E.calc.textContent = 'Préparer ces envies dans mon budget'; E.calc.href = P + 'calculateurs.html?tool=budget&achats=' + encodeURIComponent(free.map(function (it) { return it.n; }).join('|')) + '&from=carnet#atelier'; }
  }
  function render(opts) {
    opts = opts || {};
    if (doc) { renderDocs(opts); return; }
    var s = snapshot();
    headCounters(s); orphans(s);
    VIEWS.forEach(function (v) { var t = document.getElementById('cn-tab-' + v); if (!t) return; var on = v === state.view; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    E.panel.setAttribute('aria-labelledby', 'cn-tab-' + state.view);
    var base = listFor(state.view, s); fillCats(base);
    var list = sorted(filtered(base), s);
    var focusKey = opts.focusKey || null, focusAct = opts.focusAct || null;
    E.list.replaceChildren();
    var frag = document.createDocumentFragment();
    list.slice(0, state.shown).forEach(function (it, i) { frag.appendChild(card(it, s, opts.animate ? i : 0)); });
    E.list.appendChild(frag);
    E.list.classList.toggle('is-anim', !!opts.animate && !reduce.matches);
    E.count.textContent = base.length ? countText(list.length, base.length) : '';
    var filtering = !!(state.q || state.cat || state.f || state.stock);
    if (E.reset) E.reset.hidden = !filtering;
    E.empty.hidden = list.length > 0;
    if (!list.length) emptyState(state.view, base.length > 0 && filtering, s);
    E.more.hidden = list.length <= state.shown;
    if (!E.more.hidden) E.more.textContent = 'Afficher la suite (' + nf.format(Math.min(PAGE, list.length - state.shown)) + ' de plus sur ' + nf.format(list.length - state.shown) + ')';
    calcLink(list);
    if (focusKey) {
      var target = E.list.querySelector('[data-key="' + (window.CSS && CSS.escape ? CSS.escape(focusKey) : focusKey) + '"]');
      var btn = target && (focusAct ? target.querySelector('[data-cn-act="' + focusAct + '"]') : null) || (target && target.querySelector('button, a'));
      if (!btn && typeof opts.focusIndex === 'number') { var next = E.list.children[Math.min(opts.focusIndex, E.list.children.length - 1)]; btn = next && next.querySelector('button, a'); }
      if (btn) btn.focus({ preventScroll: true }); else E.panel.focus({ preventScroll: true });
    }
    writeHash();
  }

  /* ---------- calculs et plans (lus dans le carnet du calculateur, jamais modifiés ici) ---------- */
  var TOOL = { goal: 'Mon objectif', activities: 'Mes activités', session: 'Mon temps de jeu', purchase: 'Mes achats', order: 'Quoi acheter d’abord ?', roi: 'Ça vaut le coup ?', budget: 'Mon budget', compare: 'Quel achat choisir ?', plan: 'Mon business plan' };
  function notebook() {
    if (!storage) return { entries: [], broken: false };
    try { var raw = storage.getItem('lk-calculator-notebooks-v3'); if (!raw) return { entries: [], broken: false }; var d = JSON.parse(raw); if (!d || d.version !== 3 || !Array.isArray(d.entries)) return { entries: [], broken: true };
      return { entries: d.entries.filter(function (e) { return e && typeof e.id === 'string' && typeof e.tool === 'string' && TOOL[e.tool]; }), broken: false }; }
    catch (e) { return { entries: [], broken: true }; }
  }
  var dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  function when(e) { var d = new Date(e.updatedAt || e.createdAt || ''); return isNaN(d.getTime()) ? 'date inconnue' : dateFmt.format(d); }
  function renderDocs(opts) {
    var nb = notebook(), all = nb.entries.map(function (e) { return { e: e, n: String(e.name || 'Mon calcul').slice(0, 100), c: TOOL[e.tool], g: e.tool, f: 'calculs', id: e.id, _q: fold((e.name || '') + ' ' + TOOL[e.tool] + ' ' + (e.summary || '')) }; });
    var calcs = all.filter(function (x) { return x.g !== 'plan'; }), plans = all.filter(function (x) { return x.g === 'plan'; });
    document.querySelectorAll('[data-cn-n="calcs"]').forEach(function (n) { n.textContent = nf.format(calcs.length); plural(n, calcs.length); });
    document.querySelectorAll('[data-cn-n="plans"]').forEach(function (n) { n.textContent = nf.format(plans.length); plural(n, plans.length); });
    [['calcs', calcs], ['plans', plans]].forEach(function (p) { var n = app.querySelector('[data-cn-tabn="' + p[0] + '"]'); if (n) n.textContent = nf.format(p[1].length); var t = document.getElementById('cn-tab-' + p[0]); if (t) { var on = p[0] === state.view; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; } });
    E.panel.setAttribute('aria-labelledby', 'cn-tab-' + state.view);
    var base = state.view === 'plans' ? plans : calcs;
    if (E.cat) {
      var tools = Array.from(new Set(base.map(function (x) { return x.g; })));
      var opts2 = [el('option', null, 'Tous')]; opts2[0].value = '';
      tools.forEach(function (tl) { var o = el('option', null, TOOL[tl]); o.value = 'calculs:' + tl; opts2.push(o); });
      E.cat.replaceChildren.apply(E.cat, opts2); E.cat.value = state.cat;
    }
    var needle = fold(state.q.trim());
    var list = base.filter(function (x) { return (!state.cat || 'calculs:' + x.g === state.cat) && (!needle || x._q.indexOf(needle) >= 0); });
    list.sort(function (a, b) { if (state.sort === 'nom') return coll.compare(a.n, b.n); if (state.sort === 'outil') return coll.compare(a.c, b.c) || coll.compare(a.n, b.n); var x = a.e.updatedAt || a.e.createdAt || '', y = b.e.updatedAt || b.e.createdAt || ''; return x < y ? 1 : x > y ? -1 : 0; });
    E.list.replaceChildren();
    list.slice(0, state.shown).forEach(function (x, i) {
      var li = el('li', 'cn-card cn-card--doc'); li.setAttribute('data-key', 'calculs:' + x.id); li.style.setProperty('--i', String(opts.animate ? Math.min(i, 14) : 0));
      var th = el('span', 'cn-thumb cn-thumb--doc'); th.appendChild(el('span', 'cn-doc-tool', x.g === 'plan' ? 'Plan' : 'Calcul')); li.appendChild(th);
      var body = el('div', 'cn-body');
      body.appendChild(el('p', 'cn-kicker', x.c + ' · ' + when(x.e)));
      body.appendChild(el('h3', 'cn-name', x.n));
      if (x.e.summary) body.appendChild(el('p', 'cn-summary', String(x.e.summary).slice(0, 280)));
      var acts = el('div', 'cn-actions'), a = el('a', 'cn-act cn-act--main', x.g === 'plan' ? 'Voir la fiche du plan' : 'Voir la fiche du calcul');
      a.href = P + 'calculateurs.html?voir=' + encodeURIComponent(x.id) + '#atelier'; acts.appendChild(a);
      body.appendChild(acts); li.appendChild(body); E.list.appendChild(li);
    });
    E.list.classList.toggle('is-anim', !!opts.animate && !reduce.matches);
    var word = state.view === 'plans' ? ['plan', 'plans'] : ['calcul', 'calculs'];
    E.count.textContent = base.length ? (list.length === base.length ? nf.format(base.length) + ' ' + (base.length > 1 ? word[1] : word[0]) : '{n} sur {t} {mots} affichés'.replace('{n}', nf.format(list.length)).replace('{t}', nf.format(base.length)).replace('{mots}', base.length > 1 ? word[1] : word[0])) : '';
    var filtering = !!(state.q || state.cat);
    if (E.reset) E.reset.hidden = !filtering;
    E.empty.hidden = list.length > 0;
    if (!list.length) emptyState(state.view, base.length > 0 && filtering, null);
    E.more.hidden = list.length <= state.shown;
    if (!E.more.hidden) E.more.textContent = 'Afficher la suite (' + nf.format(list.length - state.shown) + ' de plus)';
    if (nb.broken) say('Tes calculs enregistrés sont illisibles ici. Ouvre le calculateur : il garde une copie de secours et te dit quoi faire.');
    writeHash();
  }

  /* ---------- actions ---------- */
  function leave(li, then) {
    if (!li || reduce.matches) { then(); return; }
    li.classList.add('is-leaving');
    setTimeout(then, 180);
  }
  function restore(it, before) {
    var ok = true, s = snapshot();
    if (isOwn(it, s) !== before.own && it.f !== 'styles') ok = setOwn(it, before.own) && ok;
    if (!!s.wish[it.f + ':' + it.id] !== before.wish) ok = setWish(it, before.wish) && ok;
    say(ok ? 'Annulé : « ' + it.n + ' » est revenu comme avant.' : 'Impossible d’annuler : le stockage du navigateur a refusé l’écriture.');
    render({ focusKey: it.f + ':' + it.id });
  }
  function onAction(btn) {
    var act = btn.getAttribute('data-cn-act'), li = btn.closest('.cn-card');
    if (act === 'orphan-unown' || act === 'orphan-unwish') {
      var f = btn.getAttribute('data-f'), id = btn.getAttribute('data-id'), ok2 = false;
      if (act === 'orphan-unown') ok2 = f === 'acquisitions' ? !!(prog() && prog().toggle(id, false) !== false) : store.setOwned(f, id, false);
      else { try { ok2 = store.setWish(f, id, false); } catch (e) { ok2 = false; } }
      say(ok2 ? 'Saisie « ' + id + ' » retirée.' : 'Impossible de retirer cette saisie : le stockage du navigateur est indisponible.');
      render(); return;
    }
    if (!li) return;
    var key = li.getAttribute('data-key'), it = index[key]; if (!it) return;
    var s = snapshot(), before = { own: isOwn(it, s), wish: !!s.wish[key] }, m = meta(it.f);
    var idx = Array.prototype.indexOf.call(E.list.children, li);
    if (act === 'use' || act === 'buy' || act === 'forget') { stockAction(it, act); return; }
    var ok = true, msg = '';
    if (act === 'own') {
      ok = setOwn(it, true);
      if (ok && before.wish) ok = setWish(it, false);
      msg = '« ' + it.n + ' » : ' + m.done + '. ' + (before.wish ? 'Retiré de tes envies, ' : '') + 'rangé dans « ' + D.titre + ' ».';
    } else if (act === 'unown') { ok = setOwn(it, false); msg = '« ' + it.n + ' » retiré de « ' + D.titre + ' ».'; }
    else if (act === 'wish') { ok = setWish(it, true); msg = '« ' + it.n + ' » gardé dans tes envies. Ce n’est pas une possession : rien n’est coché.'; }
    else if (act === 'unwish') { ok = setWish(it, false); msg = '« ' + it.n + ' » retiré de tes envies.'; }
    else return;
    if (!ok) { say('Impossible d’enregistrer : le stockage du navigateur a refusé l’écriture. Rien n’a changé.'); render(); return false; }
    var stays = (act === 'wish' && state.view !== 'wish') || (act === 'unwish' && state.view !== 'wish');
    var done = function () { render({ focusKey: key, focusAct: act === 'wish' ? 'unwish' : act === 'unwish' ? 'wish' : null, focusIndex: idx }); say(msg, function () { restore(it, before); }); };
    if (stays) { done(); return false; }
    leave(li, done); return true;
  }
  function stockAction(it, act) {
    var st = stockOf(it), key = it.f + ':' + it.id;
    if (act === 'forget') { var ok0 = store.clearStock(it.f, it.id); say(ok0 ? 'Quantité oubliée : « ' + it.n + ' » reste ' + meta(it.f).done + ', stock à renseigner.' : 'Impossible d’enregistrer : le stockage du navigateur est indisponible.'); render({ focusKey: key }); return; }
    if (!st || st.qty === null) { say('Écris d’abord ta quantité : on ne retire jamais d’un nombre inventé.'); return; }
    if (act === 'use' && st.qty === 0) { say('Ton stock de « ' + it.n + ' » est déjà à zéro.'); return; }
    var r; try { r = store.applyEvent('carnet:' + key + ':' + uid(), [{ type: 'stock', famille: it.f, id: it.id, delta: act === 'use' ? -1 : 1 }]); } catch (e) { r = null; }
    var after = stockOf(it);
    if (!r || !r.applied || !after || after.qty === null) { say('Impossible d’enregistrer : le stockage du navigateur est indisponible.'); render({ focusKey: key }); return; }
    say((act === 'use' ? 'Un de moins' : 'Un de plus') + ' : ' + nf.format(after.qty) + ' en stock pour « ' + it.n + ' ».');
    render({ focusKey: key, focusAct: act });
  }
  function stockSubmit(form) {
    var key = form.getAttribute('data-cn-stock-form'), it = index[key]; if (!it) return;
    var inp = form.querySelector('input'), raw = String(inp.value).trim();
    if (!/^\d{1,7}$/.test(raw) || Number(raw) > 1000000) { say('Écris une quantité entière, 0 ou plus (1 000 000 au plus).'); inp.focus(); return; }
    var ok; try { ok = store.setStock(it.f, it.id, Number(raw)); } catch (e) { ok = false; }
    say(ok ? 'Stock noté : ' + nf.format(Number(raw)) + ' pour « ' + it.n + ' ».' : 'Impossible d’enregistrer : le stockage du navigateur est indisponible.');
    render({ focusKey: key, focusAct: 'use' });
  }
  function resetFilters() { state.q = ''; state.f = ''; state.cat = ''; state.stock = ''; state.shown = PAGE; if (E.q) E.q.value = ''; if (E.fam) E.fam.value = ''; if (E.stockf) E.stockf.value = ''; render(); if (E.q) E.q.focus(); }
  function setView(v, focusTab) { if (VIEWS.indexOf(v) < 0) return; state.view = v; state.cat = ''; state.shown = PAGE; render({ animate: true }); if (focusTab) { var t = document.getElementById('cn-tab-' + v); if (t) t.focus(); } }

  app.addEventListener('click', function (ev) {
    var t = ev.target.closest('button'); if (!t || !app.contains(t)) return;
    if (t.hasAttribute('data-cn-view')) { setView(t.getAttribute('data-cn-view'), false); return; }
    if (t.hasAttribute('data-cn-goto')) { setView(t.getAttribute('data-cn-goto'), true); return; }
    if (t.hasAttribute('data-cn-reset')) { resetFilters(); return; }
    if (t.hasAttribute('data-cn-more')) { var first = state.shown; state.shown += PAGE; render(); var n = E.list.children[first]; var f = n && n.querySelector('a, button'); if (f) f.focus(); return; }
    if (t.hasAttribute('data-cn-act') && !t.disabled) { t.disabled = true; var later = onAction(t); if (!later && document.contains(t) && !readOnly) t.disabled = false; }
  });
  app.addEventListener('submit', function (ev) { var f = ev.target.closest('[data-cn-stock-form]'); if (!f) return; ev.preventDefault(); stockSubmit(f); });
  /* Onglets au clavier : flèches, Début, Fin (motif ARIA). */
  if (E.tabs) E.tabs.addEventListener('keydown', function (ev) {
    var cur = ev.target.closest('[data-cn-view]'), i = VIEWS.indexOf(cur ? cur.getAttribute('data-cn-view') : state.view), n = null;
    if (ev.key === 'ArrowRight') n = VIEWS[(i + 1) % VIEWS.length]; else if (ev.key === 'ArrowLeft') n = VIEWS[(i - 1 + VIEWS.length) % VIEWS.length];
    else if (ev.key === 'Home') n = VIEWS[0]; else if (ev.key === 'End') n = VIEWS[VIEWS.length - 1];
    if (n) { ev.preventDefault(); setView(n, true); }
  });
  var qTimer = null;
  if (E.q) E.q.addEventListener('input', function () { clearTimeout(qTimer); qTimer = setTimeout(function () { state.q = E.q.value.slice(0, 80); state.shown = PAGE; render(); }, 120); });
  if (E.fam) E.fam.addEventListener('change', function () { state.f = E.fam.value; state.cat = ''; state.shown = PAGE; render(); });
  if (E.cat) E.cat.addEventListener('change', function () { state.cat = E.cat.value; state.shown = PAGE; render(); });
  if (E.sort) E.sort.addEventListener('change', function () { state.sort = E.sort.value; render(); });
  if (E.stockf) E.stockf.addEventListener('change', function () { state.stock = E.stockf.value; state.shown = PAGE; render(); });

  /* Un autre onglet (fiche, carte, calculateur, autre carnet) a changé le suivi : on relit, on n’écrase rien. */
  var WATCH = /^(lk_own_|lk_map_found$|lk_wish_v1$|lk_stock_v1$|lk_progression_v2$|lk_collectibles_v1$|lk-calculator-notebooks-v3$)/;
  window.addEventListener('storage', function (ev) {
    if (!ev.key || !WATCH.test(ev.key)) return;
    var a = document.activeElement, card = a && a.closest && a.closest('.cn-card');
    if (a && a.tagName === 'INPUT' && card) return; // une quantité en cours d’écriture n’est pas effacée
    render({ focusKey: card ? card.getAttribute('data-key') : null, focusAct: a && a.getAttribute ? a.getAttribute('data-cn-act') : null });
    say('Mis à jour : ton suivi a changé dans un autre onglet.');
  });
  window.addEventListener('pageshow', function (ev) { if (ev.persisted) render(); });
  window.addEventListener('hashchange', function () { var before = state.view; readHash(); if (E.q) E.q.value = state.q; if (E.fam) E.fam.value = state.f; if (E.sort) E.sort.value = state.sort; if (E.stockf) E.stockf.value = state.stock; render({ animate: before !== state.view }); });

  /* ---------- démarrage ---------- */
  readHash();
  if (E.q) E.q.value = state.q; if (E.fam) E.fam.value = state.f; if (E.sort) E.sort.value = state.sort; if (E.stockf) E.stockf.value = state.stock;
  if (E.loading) E.loading.hidden = true;
  if (E.tabs) E.tabs.hidden = false; if (E.tools) E.tools.hidden = false; E.panel.hidden = false;
  if (readOnly && !doc) say('Ce navigateur ne garde rien (stockage désactivé ou navigation privée stricte) : le carnet s’affiche, mais tes cases ne peuvent être ni lues ni enregistrées.');
  if (D.ext === 'lieux' && !items.length) say('La liste des lieux n’a pas pu être chargée. Recharge la page, ou ouvre la carte.');
  render({ animate: true });
  app.classList.add('is-ready');
}());
