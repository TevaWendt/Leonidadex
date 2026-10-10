/* v7.61 : pluriel selon la langue de la page : français n > 1 (« 0 coché », « 1,5 million ») ; anglais, espagnol n ≠ 1 (« 0 marcados ») */
var lkPluriel=function(n){return ((typeof document!=='undefined'&&document.documentElement&&document.documentElement.lang)||'fr').slice(0,2)==='fr'?n>1:n!==1;};
/* Leonidakit — catalogue.js (v7.42, lot 5 ; v7.43, lot 6 ; v7.54, lot 1 performance ; v7.56, lot 3 fiches et légendes)
   Listes dépliables des catalogues (Consommables, Coiffures, Tatouages, Tenues et accessoires, Personnalisation des
   véhicules et des armes) : la liste complète est écrite dans la page à la génération (lisible sans script) ; ce module
   ajoute la recherche, les filtres par catégorie, groupe et statut, le tri, le compteur de lignes, et l'ouverture de la
   boîte quand l'adresse vise une ligne (nourriture.html#consommables-sprunk) ou l'ancre Accessoires.
   Lot 6 : filtre de compatibilité par l'adresse (personnalisations.html#perso-vehicules=sport,
   #perso-armes=pistolet ou #perso-armes=girardi-es9) : la boîte s'ouvre sur les postes qui s'appliquent à cette
   catégorie ou à cette arme (attribut data-compat des lignes, libellés dans data-cat-tags de la boîte).
   Le suivi « Je l'ai » est fait par suivi.js.
   v7.56 (lot 3) :
   - UI-01 : « Fiche complète » ouvre une fiche paysage commune (<dialog class="cat-dlg">) : visuel, identité, statut et
     actions à gauche, faits et rubriques à droite (empilés sur téléphone). Le contenu documentaire (.cat-fiche-body) est
     déplacé depuis la ligne, jamais copié : les bonnes données restent attachées à la bonne ligne après filtre ou tri.
     Échap, le fond ou la croix referment ; le focus revient sur le déclencheur. Sans <dialog> (vieux navigateur) ou sans
     script, la boîte details de la ligne s'ouvre comme avant.
   - UI-02 : la légende en tête de liste filtre par statut (mêmes badges que les lignes et les fiches).
   - UI-03 : apparition verticale des lignes par le moteur commun LKMotion (classe lk-reveal : translation + opacité en
     cascade), pour la liste initiale, les lignes réaffichées par un filtre, un onglet (groupe) ou un lien, et un rappel
     court après un tri ; rien ne bouge en « réduire les animations », tout est visible sans script.
   - CONSO-01/02 : bouton « Description » propre à chaque ligne (familles data-cat-desc="fold"), dépliable et repliable au
     clavier, avec une apparition courte ; distinct de « Fiche complète ». */
(function () {
  'use strict';
  var lkPl = function (n) { return /^fr/.test(document.documentElement.lang || "fr") ? n > 1 : n !== 1; }; /* pluriel selon la langue de la page (français : n > 1) */
  const fold = s => String(s || '').replace(/ß/g,'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’]/g, "'").toLowerCase().trim();
  const boxes = Array.from(document.querySelectorAll('details.cat-box[data-catalogue]'));
  if (!boxes.length) return;
  const nf = new Intl.NumberFormat('fr-FR');
  const controllers = new Map();
  const motion = window.LKMotion || null;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const canAnimate = () => !reduced.matches && typeof Element.prototype.animate === 'function';

  /* ---------- apparitions (UI-03) ---------- */
  /* Entrée en cascade des lignes déjà visibles (après un tri) : rappel court, sans cacher la liste. */
  function cascade(rows) {
    if (!canAnimate() || document.hidden) return;
    const vh = window.innerHeight || 800; let i = 0;
    rows.forEach(r => {
      const b = r.getBoundingClientRect(); if (!(b.height > 0 && b.top < vh + 40 && b.bottom > -40)) return;
      if (r.contains(document.activeElement)) return;
      r.animate([{ opacity: .35, transform: 'translate3d(0,10px,0)' }, { opacity: 1, transform: 'none' }], { duration: 340, delay: Math.min(i * 30, 240), easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' });
      i++;
    });
  }
  /* Lignes révélées par un filtre, un onglet ou un lien : LKMotion rejoue leur entrée (cascade par vagues de 60 ms) ; celles
     hors de l'écran entreront en arrivant. */
  function reveal(rows) {
    if (!rows.length) return;
    if (motion) motion.observe(rows, { replay: true, initial: false }); else cascade(rows);
  }

  function setup(box) {
    const tools = box.querySelector('[data-cat-tools]'), tbody = box.querySelector('tbody');
    if (!tools || !tbody) return null;
    const rows = Array.from(tbody.querySelectorAll('tr.cat-row'));
    rows.forEach((r, i) => { r.dataset.i = String(i); });
    const q = tools.querySelector('[data-cat-q]'), fCat = tools.querySelector('[data-cat-f="cat"]'), fSt = tools.querySelector('[data-cat-f="st"]'), sort = tools.querySelector('[data-cat-sort]');
    const count = tools.querySelector('[data-cat-count]'), empty = box.querySelector('[data-cat-empty]'), chips = Array.from(tools.querySelectorAll('[data-cat-group]'));
    const keys = Array.from(box.querySelectorAll('[data-cat-key]'));
    const filterNote = box.querySelector('[data-cat-filter]'), filterLabel = box.querySelector('[data-cat-filter-label]');
    let tags = {}; try { tags = box.dataset.catTags ? JSON.parse(box.dataset.catTags) : {}; } catch (_) { tags = {}; }
    const state = { q: '', cat: '', st: '', group: '', tag: '', sort: 'statut', item: null, who: '' };
    /* v7.69 : « Ton véhicule » / « Ton arme » (bloc data-cat-pick juste avant la boîte) et « Pour qui ? » (Jason, Lucia) */
    const fam = box.dataset.catalogue, pick = document.querySelector('[data-cat-pick="' + fam + '"]');
    const items = new Map();
    if (pick) pick.querySelectorAll('datalist option[data-id]').forEach(o => items.set(o.dataset.id, { id: o.dataset.id, name: o.value, tag: o.dataset.tag || '', label: o.dataset.l || '', url: o.dataset.u || '', key: fold(o.value) }));
    const pickQ = pick && pick.querySelector('[data-cat-pick-q]'), pickCard = pick && pick.querySelector('[data-cat-pick-card]');
    const pickName = pick && pick.querySelector('[data-cat-pick-name]'), pickMeta = pick && pick.querySelector('[data-cat-pick-meta]'), pickFiche = pick && pick.querySelector('[data-cat-pick-fiche]'), pickAtelier = pick && pick.querySelector('[data-cat-pick-atelier]'); /* v7.81 */
    const whoBts = Array.from(tools.querySelectorAll('[data-cat-who]'));
    /* v7.54 (lot 1) : les lignes sont lues une fois (texte, catégorie, statut, compatibilité) ; filtrer ne déplace aucune
       ligne dans la page (seul un changement de tri réordonne, chaque tri n'est calculé qu'une fois) ; l'attente de 80 ms
       à la frappe est retirée : le résultat suit la saisie. */
    const meta = new Map(rows.map(r => [r, { q: r.dataset.q || '', cat: r.dataset.cat || '', group: r.dataset.group || '', st: r.dataset.st || '', compat: ' ' + (r.dataset.compat || '') + ' ', ids: r.dataset.ids ? ' ' + r.dataset.ids + ' ' : '', who: r.dataset.who || '' }]));
    /* une ligne va à ce modèle : sa liste d’armes nommées le cite, sinon sa catégorie (ou son identifiant) est dans la compatibilité */
    const fits = (m, it) => m.ids ? m.ids.indexOf(' ' + it.id + ' ') !== -1 : (m.compat.indexOf(' ' + it.tag + ' ') !== -1 || m.compat.indexOf(' ' + it.id + ' ') !== -1);
    const collator = new Intl.Collator('fr');
    const sortCache = new Map([['statut', rows]]);
    let lastSort = 'statut';
    /* v7.56 : les lignes entrent par le moteur commun (translation verticale + opacité). Boîte ouverte au chargement (ancre) :
       ce qui est déjà à l'écran est montré sans attente ; boîte fermée : aucune mesure (les lignes ne sont pas affichées, et
       mesurer 237 lignes avant la première peinture coûtait ~0,5 s de mise en page sur un processeur lent). */
    if (motion) { rows.forEach(r => r.classList.add('lk-reveal')); motion.observe(rows, { initial: box.open }); }
    /* v7.73 (lot 3, Téva : « on clique, ça apparaît directement ») : à l'ouverture de la liste, les lignes de l'écran entrent en
       cascade marquée (80 ms par ligne, 720 ms au plus) : le délai est posé ici avant que l'observateur commun ne les montre ;
       les lignes plus bas gardent leur entrée au défilement. Mouvement réduit : le moteur commun ne bouge rien. */
    if (motion && !reduced.matches) box.addEventListener('toggle', () => {
      if (!box.open) return;
      let i = 0;
      rows.forEach(r => { if (r.hidden || r.classList.contains('is-in')) return; r.style.setProperty('--lk-delay', Math.min(i * 80, 720) + 'ms'); r.dataset.lkStagger = '1'; i++; if (i >= 12) r.dataset.lkStagger = '0'; });
    });
    function apply(cause) {
      const needle = fold(state.q), tag = state.tag ? ' ' + state.tag + ' ' : '';
      let shown = 0; const revealed = [];
      rows.forEach(r => {
        const m = meta.get(r);
        const ok = (!needle || m.q.indexOf(needle) !== -1) && (!state.cat || m.cat === state.cat) && (!state.group || m.group === state.group) && (!state.st || m.st === state.st)
          && (!tag || m.compat.indexOf(tag) !== -1) && (!state.item || fits(m, state.item))
          && (!state.who || m.who === state.who || m.who === 'jason-lucia');
        if (r.hidden === ok) { r.hidden = !ok; if (ok) revealed.push(r); }
        if (ok) shown++;
      });
      if (filterNote) { filterNote.hidden = !(state.tag || state.item); if (filterLabel) filterLabel.textContent = state.item ? state.item.name : state.tag ? (tags[state.tag] || state.tag) : ''; }
      if (pickCard) {
        const was = !pickCard.hidden; pickCard.hidden = !state.item;
        if (state.item) {
          pickName.textContent = state.item.name;
          pickMeta.textContent = (state.item.label ? state.item.label + ' · ' : '') + nf.format(shown) + ' ' + (lkPluriel(shown) ? 'postes compatibles' : 'poste compatible');
          /* v7.73 : la fiche du modèle a sa section « Personnaliser » (tableau des postes, options, configuration) */
          if (pickFiche && state.item.url) pickFiche.setAttribute('href', state.item.url + '#personnaliser');
          if (pickAtelier) pickAtelier.setAttribute('href', 'atelier-3d.html?' + (fam === 'perso-armes' ? 'a=' : 'v=') + encodeURIComponent(state.item.id)); /* v7.81 : le modèle choisi s'ouvre dans l'Atelier 3D */
          if (!was && canAnimate()) pickCard.animate([{ opacity: 0, transform: 'translate3d(0,8px,0) scale(.98)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.7,.2,1)' });
        }
      }
      whoBts.forEach(b => b.setAttribute('aria-pressed', String((b.dataset.catWho || '') === state.who)));
      if (emptyPick) { const hit = !shown && needle.length >= 3 ? suggest(needle) : null; emptyPick.hidden = !hit; if (hit) { emptyPick.querySelector('button').textContent = 'Voir les postes pour ' + hit.name; emptyPick._hit = hit; } }
      let sorted = false;
      if (state.sort !== lastSort) {
        if (!sortCache.has(state.sort)) sortCache.set(state.sort, rows.slice().sort((a, b) => {
          if (state.sort === 'nom') return collator.compare(a.dataset.nom, b.dataset.nom);
          if (state.sort === 'cat') return (Number(a.dataset.ci) - Number(b.dataset.ci)) || (Number(a.dataset.i) - Number(b.dataset.i));
          if (state.sort === 'prix') { const pa = 'prix' in a.dataset ? Number(a.dataset.prix) : Infinity, pb = 'prix' in b.dataset ? Number(b.dataset.prix) : Infinity; return (pa - pb) || (Number(a.dataset.i) - Number(b.dataset.i)); }
          return Number(a.dataset.i) - Number(b.dataset.i);
        }));
        const fragment = document.createDocumentFragment();
        sortCache.get(state.sort).forEach(r => fragment.appendChild(r));
        tbody.appendChild(fragment);
        lastSort = state.sort; sorted = true;
      }
      if (count) count.textContent = shown === rows.length ? nf.format(rows.length) + ' lignes' : nf.format(shown) + (lkPluriel(shown)?' lignes':' ligne') + ' sur ' + nf.format(rows.length);
      if (empty) empty.hidden = shown > 0;
      chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.catGroup === state.group)));
      keys.forEach(k => k.setAttribute('aria-pressed', String(!!state.st && k.dataset.catKey === state.st)));
      box.classList.toggle('is-filtered', !!(needle || state.cat || state.st || state.group || state.tag || state.item || state.who));
      /* apparitions : lignes réaffichées (cascade d'entrée), ou rappel après un tri */
      if (cause !== 'init') { if (revealed.length) reveal(revealed); else if (sorted) cascade(rows.filter(r => !r.hidden)); }
    }
    function reset() { state.q = ''; state.cat = ''; state.st = ''; state.group = ''; state.tag = ''; state.item = null; state.who = ''; state.sort = 'statut'; if (q) q.value = ''; if (fCat) fCat.value = ''; if (fSt) fSt.value = ''; if (sort) sort.value = 'statut'; if (pickQ) pickQ.value = ''; apply(); }
    /* v7.69 : choisir un modèle (ou rien) : les autres filtres sont retirés, la boîte s’ouvre */
    function choose(item) {
      state.q = ''; state.cat = ''; state.st = ''; state.group = ''; state.tag = ''; state.item = item || null;
      if (q) q.value = ''; if (fCat) fCat.value = ''; if (fSt) fSt.value = ''; if (pickQ) pickQ.value = item ? item.name : '';
      if (item) box.open = true;
      apply('pick');
    }
    function exact(v) { const k = fold(v); if (!k) return null; for (const x of items.values()) if (x.key === k) return x; return null; }
    function suggest(k) { if (!items.size || k.length < 2) return null; let hit = null; for (const x of items.values()) { if (x.key === k) return x; if (!hit && x.key.indexOf(k) !== -1) hit = x; } return hit; }
    let emptyPick = null;
    if (items.size && empty) { emptyPick = document.createElement('span'); emptyPick.className = 'cat-empty-pick'; emptyPick.hidden = true; emptyPick.innerHTML = ' <button type="button" class="cat-reset"></button>'; empty.appendChild(emptyPick);
      emptyPick.querySelector('button').addEventListener('click', () => { if (emptyPick._hit) { choose(emptyPick._hit); if (pick) pick.scrollIntoView({ block: 'start', behavior: canAnimate() ? 'smooth' : 'auto' }); } }); }
    if (pick) {
      pick.hidden = false;
      if (pickQ) {
        pickQ.addEventListener('input', () => { const x = exact(pickQ.value); if (x) choose(x); else if (!pickQ.value.trim() && state.item) choose(null); });
        pickQ.addEventListener('change', () => { const x = exact(pickQ.value) || suggest(fold(pickQ.value)); if (x) choose(x); });
        pickQ.addEventListener('keydown', e => { if (e.key !== 'Enter') return; e.preventDefault(); const x = exact(pickQ.value) || suggest(fold(pickQ.value)); if (x) choose(x); });
      }
      const clear = pick.querySelector('[data-cat-pick-clear]');
      if (clear) clear.addEventListener('click', () => { choose(null); if (pickQ) pickQ.focus(); });
    }
    whoBts.forEach(b => b.addEventListener('click', () => { state.who = b.dataset.catWho || ''; apply(); }));
    if (q) q.addEventListener('input', () => { state.q = q.value; apply(); });
    if (fCat) fCat.addEventListener('change', () => { state.cat = fCat.value; if (state.cat) state.group = ''; apply(); });
    if (fSt) fSt.addEventListener('change', () => { state.st = fSt.value; apply(); });
    if (sort) sort.addEventListener('change', () => { state.sort = sort.value; apply(); });
    chips.forEach(c => c.addEventListener('click', () => { state.group = state.group === c.dataset.catGroup ? '' : c.dataset.catGroup; if (state.group) { state.cat = ''; if (fCat) fCat.value = ''; } apply(); }));
    /* v7.56 (UI-02) : un badge de la légende filtre par statut (un second clic retire le filtre) */
    keys.forEach(k => { k.disabled = false; k.addEventListener('click', () => { state.st = state.st === k.dataset.catKey ? '' : k.dataset.catKey; if (fSt) fSt.value = state.st; apply(); }); });
    tools.addEventListener('reset', e => { e.preventDefault(); reset(); });
    tools.addEventListener('submit', e => e.preventDefault());
    box.querySelectorAll('[data-cat-reset]').forEach(b => b.addEventListener('click', reset));
    tools.hidden = false;
    apply('init');
    /* v7.58 : #<famille>=<catégorie> ouvre la liste filtrée sur une catégorie du menu (Léo, liens partagés) ; #<famille>=<statut> sur un statut */
    return { box, rows, state, apply, reset, tags, items, choose, pick, setGroup(g) { state.group = g; state.cat = ''; if (fCat) fCat.value = ''; apply(); }, setTag(t) { reset(); state.tag = t; apply(); },
      setCat(c) { if (!fCat || !Array.from(fCat.options).some(o => o.value === c)) return false; reset(); fCat.value = c; state.cat = c; apply(); return true; },
      setStatus(st) { if (!fSt || !Array.from(fSt.options).some(o => o.value === st)) return false; reset(); fSt.value = st; state.st = st; apply(); return true; } };
  }
  boxes.forEach(box => { const c = setup(box); if (c) controllers.set(box, c); });

  /* ---------- descriptions repliées (CONSO-01, CONSO-02) ---------- */
  function toggleMore(bt, open) {
    const panel = document.getElementById(bt.getAttribute('aria-controls')); if (!panel) return;
    const on = open === undefined ? panel.hidden : open;
    const row = bt.closest('tr'), label = bt.querySelector('.cat-more-l');
    if (on) {
      panel.hidden = false; bt.setAttribute('aria-expanded', 'true'); if (row) row.classList.add('is-desc-open'); if (label) label.textContent = 'Masquer la description';
      if (canAnimate()) panel.animate([{ opacity: 0, transform: 'translate3d(0,-6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.7,.2,1)' });
    } else {
      const done = () => { panel.hidden = true; bt.setAttribute('aria-expanded', 'false'); if (row) row.classList.remove('is-desc-open'); if (label) label.textContent = 'Description'; };
      if (canAnimate()) { const a = panel.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate3d(0,-4px,0)' }], { duration: 160, easing: 'ease-out' }); a.onfinish = a.oncancel = done; } else done();
    }
  }
  document.addEventListener('click', e => {
    const bt = e.target.closest('[data-cat-more]'); if (!bt) return;
    e.preventDefault(); toggleMore(bt);
  });

  /* ---------- fiche paysage (UI-01) ---------- */
  const SHEET_OK = typeof HTMLDialogElement === 'function' && 'showModal' in HTMLDialogElement.prototype;
  let dlg = null, open = null; /* open : { row, body, home, trigger } */
  const FACTS = [['cat-c-eff', 'Effet'], ['cat-c-p6', 'GTA VI'], ['cat-c-pr', 'Repère de la série'], ['cat-c-ou', 'Où le trouver']];
  function el(tag, cls, html) { const n = document.createElement(tag); if (cls) n.className = cls; if (html !== undefined) n.innerHTML = html; return n; }
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = el('dialog', 'cat-dlg'); dlg.setAttribute('aria-labelledby', 'cat-dlg-title');
    dlg.innerHTML = '<div class="cat-dlg-in"><button type="button" class="cat-dlg-x" data-dlg-close aria-label="Fermer la fiche"><span aria-hidden="true">×</span></button><aside class="cat-dlg-side" data-dlg-side></aside><div class="cat-dlg-main" data-dlg-main></div></div>';
    document.body.appendChild(dlg);
    dlg.addEventListener('click', e => { if (e.target === dlg || e.target.closest('[data-dlg-close]')) closeSheet(); });
    dlg.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); });
    /* pas de verrou « overflow » sur la page (il change la largeur de la fenêtre et force une mise en page complète du document,
       ~30 ms sur ces pages longues) : la molette ou le doigt sur le fond ne font rien, les colonnes de la fiche défilent seules */
    const guard = e => { if (e.target === dlg) e.preventDefault(); };
    dlg.addEventListener('wheel', guard, { passive: false }); dlg.addEventListener('touchmove', guard, { passive: false });
    return dlg;
  }
  /* bouton « Je l'ai » de la fiche : relié au même stockage que la ligne (window.LKSuivi), mis à jour dans les deux sens */
  function ownControl(row) {
    const td = row.querySelector('td.cat-c-own'); if (!td) return null;
    const S = window.LKSuivi, fam = td.dataset.track, id = td.dataset.trackId;
    if (S && fam && id && S.FAMILIES[fam]) {
      const wrap = el('div', 'cat-dlg-own');
      const b = el('button', 'track-bt'); b.type = 'button'; b.innerHTML = '<span class="ck" aria-hidden="true"></span><span class="track-lbl">Je l’ai</span>';
      b.setAttribute('aria-label', 'Je l’ai : ' + (td.dataset.trackName || ''));
      const paint = () => { const on = S.has(fam, id); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.querySelector('.track-lbl').textContent = on ? 'Obtenu' : 'Je l’ai'; };
      b.addEventListener('click', e => { e.preventDefault(); S.toggle(fam, id); });
      const off = S.subscribe(f => { if (f === fam) paint(); }); paint();
      wrap.appendChild(b); const note = el('span', 'cat-dlg-own-n', 'Enregistré sur cet appareil, dans ton carnet.'); wrap.appendChild(note);
      wrap._off = off; return wrap;
    }
    const acq = td.querySelector('.cat-acq');
    if (acq) { const wrap = el('div', 'cat-dlg-own'); const c = acq.cloneNode(true); c.hidden = false; wrap.appendChild(c); const link = td.querySelector('.cat-acq-link'); if (link) wrap.appendChild(link.cloneNode(true)); return wrap; }
    return null;
  }
  function openSheet(row, trigger) {
    const details = row.querySelector('details.cat-fiche'), body = details && details.querySelector('.cat-fiche-body');
    if (!body) return false;
    if (open) closeSheet(true);
    const d = ensureDialog(), side = d.querySelector('[data-dlg-side]'), main = d.querySelector('[data-dlg-main]');
    side.replaceChildren(); main.replaceChildren();
    /* colonne de gauche : visuel, statut, catégorie, nom, description, repères et actions */
    /* v7.76 (lot C) : une illustration réalisée pour le site est dite comme telle, à son format (16/10) ; v7.77 : silhouette
       « teaser » en 960 × 600 (objet modelé en 3D, montré en ombre) */
    const img = row.querySelector('.cat-thumb img'), ico = row.querySelector('.cat-thumb--ico'), illus = !!row.querySelector('.cat-thumb--illus');
    const fig = el('figure', 'cat-dlg-media' + (img ? (illus ? ' cat-dlg-media--illus' : '') : ' cat-dlg-media--ico'));
    if (img) { const i = document.createElement('img'); i.src = img.dataset.big || img.src; i.alt = img.alt; i.decoding = 'async'; i.width = illus ? 960 : 1280; i.height = illus ? 600 : 720; fig.appendChild(i); const c = el('figcaption', 'cat-dlg-media-c', illus ? 'Illustration Leonidakit : silhouette dessinée pour le site en attendant le visuel officiel, pas une image du jeu' : 'Visuel officiel Rockstar Games'); fig.appendChild(c); }
    else if (ico) { fig.innerHTML = ico.innerHTML; const c = el('figcaption', 'cat-dlg-media-c', 'Pictogramme de la catégorie : pas un visuel de l’objet'); fig.appendChild(c); }
    side.appendChild(fig);
    const head = el('div', 'cat-dlg-head');
    const st = row.querySelector('.cat-c-st .ed-status'); if (st) head.appendChild(st.cloneNode(true));
    const cat = row.querySelector('.cat-cat'); if (cat) head.appendChild(cat.cloneNode(true));
    const who = row.querySelector('.cat-who'); if (who) head.appendChild(who.cloneNode(true));
    side.appendChild(head);
    const h = el('h2', 'cat-dlg-title'); h.id = 'cat-dlg-title'; h.textContent = (row.querySelector('.cat-nom') || row).textContent.trim(); side.appendChild(h);
    const more = row.querySelector('.cat-more'); if (more) { const c = more.cloneNode(true); c.hidden = false; c.removeAttribute('id'); c.className = 'cat-dlg-desc'; side.appendChild(c); }
    const metaP = row.querySelector('.cat-meta'); if (metaP) { const c = metaP.cloneNode(true); c.className = 'cat-dlg-meta'; side.appendChild(c); }
    const ownBox = ownControl(row); if (ownBox) side.appendChild(ownBox);
    /* colonne de droite : les faits de la ligne, puis les rubriques documentaires déplacées depuis la ligne */
    const facts = el('dl', 'cat-dlg-facts');
    FACTS.forEach(([cls, label]) => { const td = row.querySelector('td.' + cls); if (!td || !td.innerHTML.trim()) return; const w = el('div', 'cat-dlg-fact'); w.appendChild(el('dt', null, label)); const dd = el('dd'); dd.innerHTML = td.innerHTML; w.appendChild(dd); facts.appendChild(w); });
    main.appendChild(facts);
    const home = document.createComment('cat-fiche-body'); body.parentNode.insertBefore(home, body); main.appendChild(body);
    open = { row, body, home, trigger: trigger || (details.querySelector('summary')), own: ownBox };
    row.classList.add('is-sheet');
    try { d.showModal(); } catch (_) { main.replaceChildren(); home.parentNode.replaceChild(body, home); open = null; row.classList.remove('is-sheet'); return false; }
    d.scrollTop = 0; main.scrollTop = 0; side.scrollTop = 0;
    const x = d.querySelector('[data-dlg-close]'); if (x) x.focus({ preventScroll: true });
    if (canAnimate()) { d.animate([{ opacity: 0, transform: 'translate3d(0,16px,0) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.7,.2,1)' }); }
    return true;
  }
  function closeSheet(silent) {
    if (!open || !dlg) return;
    const o = open; open = null;
    const finish = () => {
      if (o.home && o.home.parentNode) o.home.parentNode.replaceChild(o.body, o.home);
      if (o.own && o.own._off) o.own._off();
      if (dlg.open) dlg.close();
      dlg.querySelector('[data-dlg-main]').replaceChildren(); dlg.querySelector('[data-dlg-side]').replaceChildren();
      o.row.classList.remove('is-sheet');
      if (!silent && o.trigger && o.trigger.isConnected) { try { o.trigger.focus({ preventScroll: false }); } catch (_) { /* rien */ } }
    };
    if (!silent && canAnimate()) { const a = dlg.animate([{ opacity: 1 }, { opacity: 0, transform: 'translate3d(0,8px,0)' }], { duration: 150, easing: 'ease-out' }); a.onfinish = a.oncancel = finish; } else finish();
  }
  function rowOf(el) { return el && el.closest ? el.closest('tr.cat-row') : null; }
  /* hauteur des bandeaux collants (en-tête du site + sous-navigation de la page) */
  /* hauteur des bandeaux collants au-dessus d'une ligne : en-tête du site, sous-navigation de la page, en-tête du tableau */
  function stickyHeight(row) { let h = 0; const parts = [document.querySelector('body>header'), document.querySelector('.ed-nav'), row && row.closest('table') && row.closest('table').querySelector('thead th')]; parts.forEach(n => { if (n && getComputedStyle(n).position === 'sticky') h += n.getBoundingClientRect().height; }); return h; }
  if (SHEET_OK) {
    document.addEventListener('click', e => {
      const sum = e.target.closest('summary[data-cat-sheet]');
      if (sum) { const row = rowOf(sum); if (row && !row.querySelector('details.cat-fiche').open) { e.preventDefault(); openSheet(row, sum); } return; }
      /* « Fiche complète » des cartes « En un regard » (Consommables) : la fiche de la ligne s'ouvre sans quitter la carte ;
         à la fermeture, le focus revient sur le lien. La ligne reste joignable par son adresse (#consommables-<id>). */
      const link = e.target.closest('a.cg-link[href^="#"]');
      if (link) { const row = document.getElementById(decodeURIComponent(link.getAttribute('href').slice(1))); if (row && row.matches('tr.cat-row') && openSheet(row, link)) e.preventDefault(); }
    });
    /* clavier : Entrée ou Espace sur « Fiche complète » (le summary est un bouton natif, le clic suit ; rien à ajouter) */
    window.addEventListener('pagehide', () => { if (open) closeSheet(true); });
  }
  window.LKCatalogue = { open: openSheet, close: closeSheet, controllers };

  /* Adresse avec une ancre : une ligne (ouvre la boîte, retire les filtres, met la ligne en évidence), l'ancre Accessoires,
     ou un filtre de compatibilité (#<famille>=<catégorie ou arme>, lot 6). */
  function openFromHash() {
    const id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
    document.querySelectorAll('tr.cat-row.is-target').forEach(r => r.classList.remove('is-target'));
    const m = id.match(/^([a-z0-9-]+)=([a-z0-9-]+)$/);
    if (m) {
      const box = document.getElementById('box-' + m[1]), c = box && controllers.get(box);
      if (!c) return;
      /* v7.69 : #perso-vehicules=<véhicule> ou #perso-armes=<arme> choisit ce modèle (lien « Personnaliser » de sa fiche) */
      if (c.items && c.items.has(m[2])) { c.choose(c.items.get(m[2])); box.open = true; requestAnimationFrame(() => { (c.pick || box).scrollIntoView({ block: 'start' }); }); return; }
      if (c.tags[m[2]]) c.setTag(m[2]); else if (!c.setCat(m[2]) && !c.setStatus(m[2])) c.reset();
      box.open = true;
      requestAnimationFrame(() => { box.scrollIntoView({ block: 'start' }); });
      return;
    }
    const el = document.getElementById(id); if (!el) return;
    const box = el.closest('details.cat-box'); if (!box) return;
    const c = controllers.get(box);
    if (el.matches('tr.cat-row')) {
      if (c) c.reset(); box.open = true; el.classList.add('is-target');
      /* la ligne visée passe sous l'en-tête et la sous-navigation collants, puis sa fiche s'ouvre (v7.54 du 30/09 ;
         v7.56 : en fiche paysage quand le navigateur le permet, sinon la boîte dépliable de la ligne). Le navigateur
         refait son propre défilement vers l'ancre à la fin du chargement : la position est reposée après « load ». */
      const place = () => { el.scrollIntoView({ block: 'start', behavior: 'instant' }); const stuck = stickyHeight(el); if (stuck > 0) window.scrollBy(0, -(stuck + 12)); };
      requestAnimationFrame(() => {
        place();
        if (document.readyState !== 'complete') window.addEventListener('load', () => setTimeout(place, 0), { once: true });
        const fiche = el.querySelector('details.cat-fiche');
        if (fiche && !(SHEET_OK && openSheet(el, fiche.querySelector('summary')))) fiche.open = true;
      });
      return;
    }
    if (el.matches('[data-cat-group]')) { box.open = true; if (c) c.setGroup(el.dataset.catGroup); requestAnimationFrame(() => { el.scrollIntoView({ block: 'center' }); }); }
  }
  openFromHash();
  window.addEventListener('hashchange', openFromHash);
  /* v7.70 : tableau des ateliers (personnalisations.html) : survoler ou atteindre une fiche allume son repère sur la carte */
  document.querySelectorAll('.ed-at-board').forEach(board => {
    const pins = Array.from(board.querySelectorAll('.lk-loc-pin[data-place]'));
    const hot = id => { pins.forEach(p => { p.classList.toggle('is-hot', !!id && p.getAttribute('data-place') === id); }); };
    board.querySelectorAll('.ed-at[data-atelier]').forEach(li => {
      const id = li.getAttribute('data-atelier');
      li.addEventListener('mouseenter', () => hot(id)); li.addEventListener('mouseleave', () => hot(null));
      li.addEventListener('focusin', () => hot(id)); li.addEventListener('focusout', () => hot(null));
    });
  });
})();
