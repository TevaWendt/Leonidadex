#!/usr/bin/env node
'use strict';
/* v8.04 (lot L, Téva : « ajouter d’autres jeux en rapport avec mon site, avec un système de progression pour les jeux ») :
   les jeux du site, depuis outils/jeux/jeux.json :
   - jeux.html : les trois jeux du jour (Devine le lieu, La frise des annonces, Devine la station) en affiches, le défi du
     jour et le tableau de progression commun (points, niveau, séries, badges, niveaux) ;
   - frise-des-annonces.html : les annonces datées de outils/actus/actus.json (même registre de sources que la page
     Actualités, outils/gen-actus.cjs), à remettre dans l’ordre ;
   - devine-la-station.html : les six stations présentées par Rockstar (outils/radios/radios.json) : animateurs, noms à
     l’antenne, styles, et les morceaux relevés par Game Informer dans les aperçus officiels (« Vu dans un média ») ;
   - outils/jeux-index.json : les entrées de la recherche du site (lu par outils/sync-site.cjs).
   Le bandeau de progression de devine-le-lieu.html vient d’ici (strip(), appelé par outils/gen-devine.cjs).
   Règle « rien d’inventé » : une annonce sans date, sans statut ou sans source, une station sans fiche, un morceau mal
   relevé arrêtent la génération. Les tirages du jour (jeux-core.js, fonctions pures LKJeux, chargées ici dans Node) sont
   vérifiés sur trois ans : nombre de questions, aucune en double, plafond par groupe (une annonce par jour de la frise,
   deux indices au plus par station), aucune question de la veille.
   Usage : node outils/gen-jeux.cjs   (appelé par outils/regenerer.cjs, après gen-devine.cjs) */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs');
const LKX = require('./lk-sections.cjs');
const VT = require('./vitrine.cjs');
const IL = require('./jeux-illus.cjs');
const esc = S.esc;
const SITE = 'https://www.leonidakit.com', DATA_FILE = 'outils/jeux/jeux.json';
const PAGES = { hub: 'jeux.html', frise: 'frise-des-annonces.html', station: 'devine-la-station.html' };
const PROGRESSION = PAGES.hub + '#progression';

function load(root = ROOT) {
  const read = f => fs.readFileSync(path.join(root, f), 'utf8');
  const J = JSON.parse(read(DATA_FILE)), VTX = JSON.parse(read('outils/vitrine.json')), D = JSON.parse(read('outils/devine/devine.json'));
  const ACT = require('./gen-actus.cjs').load(root);
  const ctx = {}; vm.runInNewContext(read('outils/sources/jeux-core.js'), ctx);
  return { J, VTX, D, A: ACT.A, MD: ACT.MD, MED: ACT.MED, SRC: ACT.SRC, R: ACT.R, G: ctx.LKJeux, read, root };
}
const slug = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const exists = (L, f) => fs.existsSync(path.join(L.root, f));

/* ---------- les annonces de la frise : celles de la page Actualités, avec leur statut et leur première source ---------- */
const TYPE_ICON = { video: 'film', annonce: 'liste', presse: 'lire', musique: 'note', produit: 'coffret' };
function eventsOf(L) {
  const { A, MD } = L;
  return A.evenements.map(e => {
    const evs = e.evs || (e.ev ? [e.ev] : []);
    const vid = e.video ? A.videos.liste.find(v => v.id === e.video) : null;
    const dossierMedia = evs.map(ev => MD.evenements[ev] && MD.evenements[ev].media).find(Boolean);
    const href = exists(L, 'moments/' + e.id + '.html') ? 'moments/' + e.id + '.html' : 'actus.html#ev-' + e.id;
    return { id: e.id, iso: e.iso, titre: e.titre, texte: e.texte, statut: e.statut, type: e.type, src: L.SRC[(e.sources || [])[0]] || null, href, media: vid ? vid.affiche : dossierMedia || e.media || null };
  }).sort((a, b) => (a.id < b.id ? -1 : 1));
}
/* ---------- les indices de la radio ---------- */
const SONGS = /^Entendus dans l’aperçu officiel, d’après Game Informer : (.+)\.$/;
function stationsOf(L) { return L.R.stations.map(s => ({ id: s.id, name: s.name, c: s.ton, tagline: s.tagline, description: s.description, hosts: s.hosts || [], facts: s.facts || [] })); }
function cluesOf(L, err = []) {
  const out = [];
  for (const s of stationsOf(L)) {
    for (const h of s.hosts) {
      if (!h.role) out.push({ id: 'host-' + slug(h.nom), g: s.id, t: 'host', v: h.nom, src: 'rs-radios' });
      const a = String(h.antenne || ''), low = h.nom.toLowerCase();
      if (a && a !== h.nom && !low.startsWith(a.toLowerCase())) out.push({ id: 'antenne-' + slug(a), g: s.id, t: 'antenne', v: a, src: 'rs-radios' });
    }
    out.push({ id: 'style-' + s.id, g: s.id, t: 'style', v: s.tagline, src: 'rs-radios', tr: true });
    const f = s.facts.find(x => /^Entendus dans l’aperçu officiel/.test(x));
    if (f) {
      const m = f.match(SONGS);
      if (!m) { err.push(s.id + ' : morceaux de Game Informer mal écrits'); continue; }
      const songs = [...m[1].matchAll(/«\s*([^»]+?)\s*»\s*\(([^()]+)\)/g)];
      if (!songs.length) err.push(s.id + ' : aucun morceau relevé dans « ' + f + ' »');
      for (const x of songs) out.push({ id: 'morceau-' + slug(x[1]), g: s.id, t: 'morceau', v: x[1], a: x[2].replace(/ (?:et|avec) /g, ', '), src: 'gi-radio-morceaux' });
    }
  }
  return out.sort((a, b) => (a.id < b.id ? -1 : 1));
}

/* ---------- contrôles : une donnée douteuse arrête la génération ---------- */
function check(L, opts = {}) {
  const { J, G, D, SRC } = L, err = [];
  if (J.cle !== 'lk_jeux_v1' || G.KEY !== J.cle) err.push('clé de stockage : lk_jeux_v1 dans les données et dans jeux-core.js');
  const P = J.points;
  if (!P || ![P.bonne, P.sansFaute, P.defi].every(n => Number.isInteger(n) && n > 0)) err.push('points : bonne, sansFaute, defi entiers');
  if (!Array.isArray(J.niveaux) || J.niveaux.length < 2 || J.niveaux[0].min !== 0 || J.niveaux.some((n, i) => !n.nom || (i && !(n.min > J.niveaux[i - 1].min)))) err.push('niveaux : du seuil 0 au plus haut, croissants, nommés');
  /* badges et défis : ceux que sait calculer jeux-core.js, ni plus ni moins */
  const BADGES = ['premier-pas', 'sans-faute', 'trois-du-jour', 'serie-3', 'serie-7', 'tour-de-leonida', 'album', 'archiviste', 'oreille-d-or', 'defis'];
  const DEFIS = ['trois', 'devine-4', 'frise-4', 'station-4', 'parfait', 'total-12'];
  if (JSON.stringify(J.badges.map(b => b.id).sort()) !== JSON.stringify(BADGES.slice().sort()) || J.badges.some(b => !b.nom || !b.cond)) err.push('badges : ' + BADGES.join(', '));
  if (JSON.stringify(J.defis.map(b => b.id).sort()) !== JSON.stringify(DEFIS.slice().sort()) || J.defis.some(b => !b.texte)) err.push('défis : ' + DEFIS.join(', '));
  const probe = G.summary({ v: 1 }, null, '2026-10-21', { pts: [1, 1, 1], lv: [0], badges: BADGES, defis: DEFIS });
  if (!Array.isArray(probe.badges) || DEFIS.some(id => typeof G.defiDone(id, probe.today) !== 'boolean')) err.push('jeux-core.js : badges ou défis non calculés');
  /* « 4 sur 5 », « 5 sur 5 » : les trois jeux posent cinq questions par partie */
  if (D.parPartie !== 5 || J.frise.parPartie !== 5 || J.station.parPartie !== 5) err.push('cinq questions par partie dans les trois jeux (textes des défis et des badges)');
  if (J.badges.find(b => b.id === 'tour-de-leonida') && D.series.length !== 6) err.push('« Tour de Leonida » : six régions dans Devine le lieu');
  for (const k of ['frise', 'station']) {
    const X = J[k];
    if (!/^\d{4}-\d\d-\d\d$/.test(X.debut || '')) err.push(k + ' : debut');
    if (!Number.isInteger(X.parGroupeMax) || X.parGroupeMax < 1) err.push(k + ' : parGroupeMax');
    if (X.page.desc.length > 155 || X.page.desc.length < 60) err.push(k + ' : description de 60 à 155 signes (' + X.page.desc.length + ')');
    if (!/GTA VI/.test(X.page.seoTitle)) err.push(k + ' : titre sans « GTA VI »');
    for (const m of ['g-jour', 'g-libre', 'g-num', 'g-points', 'g-verdict-juste', 'g-verdict-rate', 'g-juste', 'g-rate', 'g-suivante', 'g-voir', 'g-annonce', 'g-annonce-libre', 'g-fin', 'g-deja', 'g-res-0', 'g-res-1', 'g-res-2', 'g-res-3', 'g-res-4', 'g-res-5', 'g-jours-one', 'g-jours-other', 'g-sur', 'g-partage-titre', 'g-copie', 'g-copie-ko', 'g-partage-ok', 'g-prochaine', 'g-prochaine-min', 'g-nouvelle', 'g-libre-annonce', 'g-res-ta', 'g-serie', 'g-sem-score', 'g-sem-vide'])
      if (!X.msg[m]) err.push(k + ' : message absent ' + m);
  }
  for (const m of ['fr-avant', 'fr-entre', 'fr-apres', 'fr-trop-tot', 'fr-trop-tard', 'fr-lien', 'fr-ta-place']) if (!J.frise.msg[m]) err.push('frise : message absent ' + m);
  for (const m of ['st-sr-bonne', 'st-sr-ta', 'st-fiche']) if (!J.station.msg[m]) err.push('station : message absent ' + m);
  if (J.hub.desc.length > 155 || J.hub.desc.length < 60) err.push('jeux.html : description de 60 à 155 signes (' + J.hub.desc.length + ')');
  for (const g of J.jeux) { if (!exists(L, g.page) && g.id === 'devine') err.push('page absente : ' + g.page); if (!L.MED[g.media] || !g.alt) err.push('visuel ou texte alternatif : ' + g.id); }
  /* annonces */
  const E = eventsOf(L);
  for (const e of E) {
    const w = 'annonce ' + e.id;
    if (!/^\d{4}-\d\d-\d\d$/.test(e.iso || '')) err.push(w + ' : date');
    if (!['officiel', 'vu'].includes(e.statut)) err.push(w + ' : statut officiel ou vu');
    if (!e.titre || !e.texte) err.push(w + ' : titre ou texte');
    if (!e.src || !e.src.url || !e.src.title || !['officiel', 'vu'].includes(e.src.statut)) err.push(w + ' : première source absente ou sans statut');
    if (e.statut === 'officiel' && e.src && e.src.statut !== 'officiel') err.push(w + ' : annonce officielle dont la première source n’est pas officielle');
    if (e.media && !L.MED[e.media]) err.push(w + ' : visuel inconnu ' + e.media);
    if (!e.media && !TYPE_ICON[e.type]) err.push(w + ' : type inconnu ' + e.type);
    if (!/^moments\//.test(e.href) && !exists(L, 'actus.html')) err.push(w + ' : aucune page où lire l’annonce');
  }
  const per = J.frise.parPartie + 1;
  if (new Set(E.map(e => e.iso)).size < per * 2) err.push('frise : trop peu de jours différents');
  /* indices */
  const C = cluesOf(L, err), ST = stationsOf(L);
  if (ST.length < 4) err.push('radio : au moins quatre stations');
  for (const s of ST) {
    if (!s.name || !/^#[0-9A-Fa-f]{6}$/.test(s.c || '') || !s.tagline || !s.description) err.push('station ' + s.id + ' : nom, teinte, devise ou description');
    if (!exists(L, 'radios/' + s.id + '.html') && !opts.sansPages) err.push('station ' + s.id + ' : fiche radios/' + s.id + '.html absente');
    if (!C.some(x => x.g === s.id && x.t === 'host')) err.push('station ' + s.id + ' : aucun animateur');
  }
  for (const id of ['rs-radios', 'gi-radio-morceaux']) { const s = SRC[id]; if (!s || !s.url || !s.publisher || !/^\d{4}-\d\d-\d\d$/.test(s.publishedAt || '')) err.push('source ' + id + ' : adresse, éditeur et date'); }
  if (SRC['rs-radios'] && SRC['rs-radios'].statut !== 'officiel') err.push('rs-radios : statut officiel');
  if (SRC['gi-radio-morceaux'] && SRC['gi-radio-morceaux'].statut !== 'vu') err.push('gi-radio-morceaux : statut vu');
  const cid = new Set(); for (const x of C) { if (cid.has(x.id)) err.push('indice en double : ' + x.id); cid.add(x.id); if (!/^[a-z0-9-]{1,80}$/.test(x.id)) err.push('identifiant d’indice : ' + x.id); }
  /* tirages : trois ans à partir du jour n° 1 */
  if (!err.length) {
    const draws = [
      { id: 'frise', pool: E.map(e => ({ id: e.id, g: e.iso })), per: per, max: J.frise.parGroupeMax, debut: J.frise.debut },
      { id: 'station', pool: C.map(x => ({ id: x.id, g: x.g })), per: J.station.parPartie, max: J.station.parGroupeMax, debut: J.station.debut }
    ];
    for (const d of draws) {
      const pool = d.pool.slice().sort((a, b) => (a.id < b.id ? -1 : 1)), gOf = Object.fromEntries(pool.map(x => [x.id, x.g]));
      const start = G.dayIndex(d.debut), days = opts.days || 3 * 366;
      let prev = null;
      for (let k = -10; k < days; k++) {
        const iso = G.isoOfIndex(start + k), list = G.draw(pool, iso, { per: d.per, ref: d.debut, salt: d.id, max: d.max });
        if (list.length !== d.per || new Set(list).size !== list.length) { err.push(d.id + ' : tirage du ' + iso + ' : ' + list.length + ' questions, doublon ou manque'); break; }
        const n = {}; for (const id of list) n[gOf[id]] = (n[gOf[id]] || 0) + 1;
        if (Math.max(...Object.values(n)) > d.max) { err.push(d.id + ' : tirage du ' + iso + ' : plus de ' + d.max + ' question(s) d’un même groupe'); break; }
        if (prev && list.some(id => prev.includes(id))) { err.push(d.id + ' : tirage du ' + iso + ' : une question de la veille revient'); break; }
        prev = list;
      }
    }
  }
  if (err.length) throw new Error('Jeux du site (' + DATA_FILE + ') :\n- ' + err.join('\n- '));
  return { E, C, ST };
}

/* ---------- gabarit (en-tête, pied et scripts copiés d’a-propos.html, comme Devine le lieu) ---------- */
function chromeOf(s) {
  const pick = re => { const m = s.match(re); if (!m) throw new Error('gabarit introuvable : ' + re); return m[0]; };
  return { fav: pick(/<link rel="icon"[^>]*>/), header: pick(/<header>[\s\S]*?<\/header>/), footer: pick(/<footer>[\s\S]*?<\/footer>/),
    scripts: (s.match(/<script(?: type="lk\/lazy")? src="[^"]*"><\/script>/g) || []).filter(x => !/fiches\.js|vehicules-data\.js|armes-data\.js|lk-showcase\.js|carnets-core\.js/.test(x)).join('\n') };
}
const metaDesc = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length <= 160 ? t : t.slice(0, 157).replace(/\s+\S*$/, '') + '…'; };
const bc = items => '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) }) + '</script>';
const ogOf = (L, id) => { const m = L.MED[id]; return m ? (m.variants.find(x => x.w === 1280) || m.variants[0]).src : '/img/social-card.png'; };
const ICON_CHEV = '<svg class="lk-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

/* ---------- progression : textes, réglages, bandeau ---------- */
function confAttrs(L) {
  const { J, D } = L;
  return ' data-lkj-conf data-lkj-bareme="' + [J.points.bonne, J.points.sansFaute, J.points.defi].join(',') + '" data-lkj-lv="' + J.niveaux.map(n => n.min).join(',') + '" data-lkj-regions="' + D.series.length + '" data-lkj-per-frise="' + J.frise.parPartie + '" data-lkj-per-station="' + J.station.parPartie + '"';
}
function coreTemplate(L) {
  const { J } = L;
  return '<template id="lkj-core">' + Object.entries(J.msg).map(([k, t]) => '<p data-k="' + esc(k) + '">' + esc(t) + '</p>').join('')
    + J.niveaux.map((n, i) => '<p data-niveau data-id="' + i + '">' + esc(n.nom) + '</p>').join('')
    + J.badges.map(b => '<p data-badge data-id="' + esc(b.id) + '">' + esc(b.nom) + '</p>').join('')
    + J.defis.map(d => '<p data-defi data-id="' + esc(d.id) + '">' + esc(d.texte) + '</p>').join('') + '</template>';
}
const todayList = (L, prefix) => '<ul class="lkj-today" role="list">' + L.J.jeux.map(g => '<li data-lkj-today="' + esc(g.id) + '"><a class="lkj-today-a" href="' + prefix + esc(g.page) + '"><div class="lkj-today-n">' + esc(g.nom) + '</div><div class="lkj-today-s" data-lkj-state></div></a></li>').join('') + '</ul>';
/* le bandeau des pages de jeu (Devine le lieu compris) : niveau, points, parties du jour, lien vers le tableau */
function strip(L, o = {}) {
  if (typeof L === 'string' || !L) L = load(L || ROOT);
  const X = L.J.bandeau, prefix = o.prefix || '';
  return '<section class="shell lkj-strip" data-lkj-strip aria-labelledby="lkj-strip-t"' + confAttrs(L) + '><div class="lkj-strip-in">'
    + '<div class="lkj-strip-head"><span class="lkj-medal vt-stamp" data-lkj-on hidden aria-hidden="true"><b data-lkj-lvn></b></span><div class="lkj-strip-h"><h2 class="lkj-strip-t" id="lkj-strip-t">' + esc(X.titre) + '</h2>'
    + '<p class="lkj-strip-lv" data-lkj-on hidden><span data-lkj-lvt></span> <b data-lkj-name></b></p><p class="lkj-strip-d" data-lkj-nojs>' + esc(X.sansScript) + '</p></div></div>'
    + '<div class="lkj-strip-pts" data-lkj-on hidden><p class="lkj-strip-p"><b data-lkj-pts></b> <span data-lkj-next></span></p><span class="lkj-meter" aria-hidden="true"><i data-lkj-meter></i></span></div>'
    + '<div class="lkj-strip-today"><p class="lkj-strip-k">' + esc(X.aujourdhui) + '</p>' + todayList(L, prefix) + '</div>'
    + '<div class="lkj-strip-foot"><div class="lkj-strip-defi" data-lkj-defi data-lkj-on hidden><div class="lkj-strip-defi-k">' + esc(L.J.hub.progression.defi) + '</div><div class="lkj-strip-defi-t" data-lkj-defi-t></div><div class="lkj-strip-defi-s" data-lkj-defi-s></div></div>'
    + '<p class="lkj-strip-more"><a class="lkj-strip-a" href="' + prefix + PROGRESSION + '">' + esc(X.voir) + ICON_CHEV + '</a></p></div>'
    + '<p class="lkj-toast" data-lkj-toast role="status" hidden></p><p class="sr-only" data-lkj-plive aria-live="polite"></p>'
    + '</div>' + coreTemplate(L) + '</section>';
}

/* ---------- briques communes des deux nouveaux jeux ---------- */
function barHtml(X, per) {
  return '<div class="lkj-bar"><p class="lkj-mode" data-lkj-mode></p><ol class="lkj-dots" data-lkj-dots aria-hidden="true">' + '<li></li>'.repeat(per) + '</ol><p class="lkj-count" data-lkj-count></p><p class="lkj-streak" data-lkj-streak hidden></p><p class="lkj-points" data-lkj-points></p>'
    + '<button type="button" class="lkj-back-btn" data-lkj-back hidden>' + esc(X.resultat.retour) + '</button></div>';
}
function answerHtml(extra) {
  return '<div class="lkj-answer" data-lkj-answer hidden><p class="lkj-answer-t" data-lkj-answer-t></p>' + extra
    + '<div class="lkj-answer-act"><a class="lkj-link" data-lkj-link href="#" hidden></a><button type="button" class="lkx-btn" data-lkj-next></button></div></div>';
}
function resultHtml(X, per) {
  const R = X.resultat;
  const tile = (k, attr, note, cls) => '<div class="lkj-stat' + (cls ? ' ' + cls : '') + '"><dt>' + esc(k) + '</dt><dd class="lkj-stat-n" ' + attr + '></dd>' + (note ? '<dd class="lkj-stat-d">' + esc(note) + '</dd>' : '') + '</div>';
  return '<div class="lkj-result" data-lkj-result hidden tabindex="-1" aria-labelledby="lkj-res-t">'
    + '<div class="lkj-res-top"><div class="lkj-res-head"><p class="lkj-res-k" data-lkj-res-k></p><h3 class="lkj-res-t" id="lkj-res-t"><span class="sr-only">' + esc(R.titre) + ' : </span><span data-lkj-res-score></span></h3>'
    + '<ol class="lkj-res-dots" data-lkj-res-dots aria-hidden="true">' + '<li></li>'.repeat(per) + '</ol><p class="lkj-res-msg" data-lkj-res-msg></p><p class="lkj-res-pts" data-lkj-res-pts></p></div>'
    + '<dl class="lkj-stats">' + tile(R.serie, 'data-lkj-serie', R.serieNote, 'lkj-stat--hot') + tile(R.serieMax, 'data-lkj-serie-max') + tile(R.parties, 'data-lkj-parties') + tile(R.reussite, 'data-lkj-reussite') + tile(R.meilleur, 'data-lkj-best') + '</dl></div>'
    + '<div class="lkj-res-cols"><ol class="lkj-res-list" data-lkj-res-list></ol>'
    + '<section class="lkj-res-box" aria-labelledby="lkj-week-t"><h4 id="lkj-week-t">' + esc(R.semaine) + '</h4><ol class="lkj-week" data-lkj-week></ol></section></div>'
    + '<div class="lkj-share"><pre class="lkj-share-txt" data-lkj-share-txt></pre><div class="lkj-share-act"><button type="button" class="lkx-btn" data-lkj-share>' + esc(R.partage) + '</button><button type="button" class="lkx-btn lkx-btn--ghost lkj-noarrow" data-lkj-copy>' + esc(R.copier) + '</button></div><p class="lkj-share-n">' + esc(R.partageNote) + '</p></div>'
    + '<div class="lkj-res-foot"><p class="lkj-countdown" data-lkj-countdown></p><a class="lkj-res-prog" href="' + PROGRESSION + '">' + esc(R.progression) + '</a><button type="button" class="lkx-btn lkx-btn--night" data-lkj-new hidden>' + esc(R.jouer) + '</button><button type="button" class="lkx-btn lkx-btn--ghost" data-lkj-free>' + esc(R.libre) + '</button></div>'
    + '</div>';
}
const msgTemplate = X => '<template id="lkj-msg">' + Object.entries(X.msg).map(([k, t]) => '<p data-k="' + esc(k) + '">' + esc(t) + '</p>').join('') + '</template>';
function gameSection(L, key, play, pool) {
  const X = L.J[key], per = X.parPartie;
  return '<section class="shell lkj-game lkj-game--' + key + '" id="jeu" aria-labelledby="lkj-t" data-lkj-game="' + key + '" data-lkj-debut="' + esc(X.debut) + '" data-lkj-per="' + per + '" data-lkj-max="' + X.parGroupeMax + '">'
    + '<h2 class="sr-only" id="lkj-t">' + esc(X.page.label) + '</h2>'
    + '<div class="lkj-nojs" data-lkj-nojs><p>' + esc(X.page.sansScript) + '</p></div>'
    + '<div class="lkj-play" data-lkj-play hidden>' + barHtml(X, per) + play + '</div>'
    + resultHtml(X, per) + '<p class="sr-only" data-lkj-live aria-live="polite"></p>' + msgTemplate(X) + pool + '</section>';
}
function rulesSection(X, ills, num) {
  return S.section({ id: 'regles', num, kicker: X.regles.kicker, title: X.regles.titre, icon: 'boussole', tone: 'paper2', accent: 'coral' }, VT.steps(X.regles.etapes.map((e, i) => ({ title: e.titre, text: e.texte, ill: ills[i] })), { cls: 'lkj-steps' }));
}
function faqSection(L, X, num, fill = t => t) {
  const faq = '<div class="faq">' + X.faq.items.map(x => '<details data-lk-reveal><summary>' + esc(fill(x.q)) + '</summary><div class="ans">' + esc(fill(x.a)) + '</div></details>').join('') + '</div>';
  const A = L.VTX.aside;
  return S.section({ id: 'faq', num, kicker: X.faq.kicker, title: X.faq.titre, icon: 'faq', tone: 'paper' }, VT.faqGrid(faq,
    VT.aside({ title: A.titre, text: A.texte, asks: X.leo.suggestions.slice(0, 3), mail: { href: 'contact.html#ecrire', label: A.ecrire }, media: L.D.leo.media, alt: L.D.leo.alt })));
}
function explore(X) {
  return '<section class="shell reveal lkj-explore" aria-labelledby="lkj-explore-t"><h2 class="sec-h" id="lkj-explore-t">' + esc(X.explorer.titre) + '</h2><div class="lkx-links">'
    + X.explorer.liens.map(l => LKX.linkCard({ href: l.href, title: l.titre, text: l.texte, icon: LKX.ICO[l.icon] })).join('') + '</div></section>';
}

/* grands chiffres (même dessin que VT.figs, vitrine.css) : le nombre dans un bloc à part, pour que son libellé soit un texte
   à traduire une seule fois (outils/langues.cjs découpe aux éléments de bloc), quel que soit le nombre d’annonces ou
   d’indices ; .lkj-fig-n ne compte pas dans la mise en page (display:contents) */
function figsOf(list) {
  return '<ul class="vt-figs vt-in lkj-figs" data-lk-reveal>' + list.map((f, i) => '<li class="vt-fig' + (f.accent ? ' vt-fig--accent' : '') + '" style="--i:' + i + (typeof f.p === 'number' ? ';--p:' + Math.max(4, Math.min(100, Math.round(f.p))) + '%' : '') + '">'
    + '<div class="lkj-fig-n"><b data-lk-count>' + esc(f.n) + '</b></div><span>' + esc(f.label) + '</span>' + (typeof f.p === 'number' ? '<i aria-hidden="true"></i>' : '') + '</li>').join('') + '</ul>';
}

/* ---------- La frise des annonces ---------- */
function friseGame(L, E) {
  const X = L.J.frise, P = X.page;
  const play = '<div class="fr-grid"><div class="fr-left">'
    + '<div class="fr-card" data-fr-card><p class="lkj-verdict" data-lkj-verdict hidden></p></div>'
    + answerHtml('<div class="fr-src" data-fr-src></div>')
    + '</div><div class="fr-side" role="group" aria-labelledby="fr-q"><p class="fr-side-t">' + esc(P.frise) + '</p><p class="fr-q" id="fr-q">' + esc(P.question) + '</p><ol class="fr-list" data-fr-list></ol>'
    + '<div class="fr-hidden" hidden><div data-fr-ici>' + esc(P.ici) + '</div><div data-fr-depart>' + esc(P.depart) + '</div></div></div></div>';
  const item = e => '<div data-lkj-item="' + esc(e.id) + '" data-g="' + esc(e.iso) + '" data-iso="' + esc(e.iso) + '" data-href="' + esc(e.href) + '">'
    + (e.media ? VT.img(e.media, '', { sizes: '(max-width:999px) 92vw, 440px' }) : '<span class="fr-ev-ico" aria-hidden="true">' + S.icon(TYPE_ICON[e.type]) + '</span>')
    + '<h3 class="fr-ev-t">' + esc(e.titre) + '</h3><p class="fr-ev-x">' + esc(e.texte) + '</p>'
    + '<div class="fr-ev-src"><div class="fr-src-st">' + S.pip(e.statut, true) + '</div><div class="fr-src-k">' + esc(X.source) + '</div><div class="fr-src-a"><a href="' + esc(e.src.url) + '" target="_blank" rel="noopener nofollow"' + (e.src.lang === 'en' ? ' translate="no"' : '') + '>' + esc(e.src.title) + '</a></div></div></div>';
  return gameSection(L, 'frise', play, '<template id="lkj-pool">' + E.map(item).join('') + '</template>');
}
function friseSources(L, E) {
  const X = L.J.frise.annonces, per = L.J.frise.parPartie + 1, jours = Math.floor(E.length / per);
  const nOff = E.filter(e => e.statut === 'officiel').length;
  const fill = t => t.replace(/\{total\}/g, E.length).replace(/\{jours\}/g, jours);
  const figs = figsOf([{ n: E.length, label: X.total, accent: true }, { n: nOff, label: X.officielles, p: nOff / E.length * 100 }, { n: E.length - nOff, label: X.presse, p: (E.length - nOff) / E.length * 100 }]);
  return S.section({ id: 'annonces', num: 2, kicker: X.kicker, title: X.titre, icon: 'film', tone: 'night', accent: 'coral', lede: esc(X.lede) },
    figs + '<p class="lkj-src-p">' + esc(fill(X.p1)) + '</p><p class="lkj-src-p">' + esc(fill(X.p2)) + '</p><p class="lkj-src-p"><a href="actus.html#frise">' + esc(X.lienActus) + '</a></p>');
}
/* ---------- Devine la station ---------- */
function stationGame(L, C, ST) {
  const X = L.J.station, P = X.page, T = P.types;
  const opt = s => '<button type="button" class="st-opt" data-st-opt="' + esc(s.id) + '" style="--c:' + esc(s.c) + '"><span class="st-opt-dot" aria-hidden="true"></span><span class="st-opt-t" translate="no">' + esc(s.name) + '</span><span class="st-opt-mark" aria-hidden="true"></span><span class="st-opt-sr sr-only"></span></button>';
  const ticks = '<span class="st-scale" aria-hidden="true">' + '<i></i>'.repeat(ST.length * 4 + 1) + '</span>';
  const play = '<div class="st-grid"><div class="st-left">'
    + '<div class="st-card" data-st-card><p class="lkj-verdict" data-lkj-verdict hidden></p></div>'
    + '</div><div class="st-right"><p class="st-q" id="st-q">' + esc(P.question) + '</p>'
    + '<div class="st-dial" aria-hidden="true">' + ticks + '<span class="st-needle" data-st-needle></span></div>'
    + '<div class="st-opts" role="group" aria-labelledby="st-q">' + ST.map(opt).join('') + '</div>'
    + answerHtml('<div class="st-info" data-st-info></div><p class="st-src" data-st-src></p>')
    + '</div></div>';
  const item = x => '<div data-lkj-item="' + esc(x.id) + '" data-g="' + esc(x.g) + '" data-src="' + esc(x.src) + '"><p class="st-k">' + esc(T[x.t]) + '</p>'
    + '<p class="st-v' + (x.t === 'style' ? ' st-v--long' : '') + '"' + (x.tr ? '' : ' translate="no"') + '>' + esc(x.v) + '</p>' + (x.a ? '<p class="st-a" translate="no">' + esc(x.a) + '</p>' : '') + '</div>';
  const src = id => { const s = L.SRC[id]; return '<div data-st-src="' + esc(id) + '" data-iso="' + esc(s.publishedAt) + '"><div class="st-src-st">' + S.pip(s.statut, true) + '</div><div class="st-src-w"><a class="st-src-a" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow" translate="no">' + esc(s.publisher) + '</a><span class="st-src-d" data-st-date></span></div></div>'; };
  const data = '<template id="st-data">' + ST.map(s => '<div data-st-station="' + esc(s.id) + '" data-href="radios/' + esc(s.id) + '.html"><p class="st-i-tag">' + esc(s.tagline) + '</p><p class="st-i-d">' + esc(s.description) + '</p></div>').join('') + src('rs-radios') + src('gi-radio-morceaux') + '</template>';
  return gameSection(L, 'station', play, '<template id="lkj-pool">' + C.map(item).join('') + '</template>' + data);
}
function stationSources(L, C) {
  const X = L.J.station.stations, per = L.J.station.parPartie, jours = Math.floor(C.length / per);
  const nOff = C.filter(x => x.src === 'rs-radios').length;
  const fill = t => t.replace(/\{total\}/g, C.length).replace(/\{jours\}/g, jours);
  const figs = figsOf([{ n: C.length, label: X.total, accent: true }, { n: nOff, label: X.officiels, p: nOff / C.length * 100 }, { n: C.length - nOff, label: X.presse, p: (C.length - nOff) / C.length * 100 }]);
  const srcs = ['rs-radios', 'gi-radio-morceaux'].map(id => { const s = L.SRC[id]; return { id, url: s.url, title: s.title, lang: s.lang, publishedAt: s.publishedAt, consultedAt: s.consultedAt, statut: s.statut, claim: s.claim }; });
  return S.section({ id: 'stations', num: 2, kicker: X.kicker, title: X.titre, icon: 'note', tone: 'night', accent: 'coral', lede: esc(X.lede) },
    figs + '<p class="lkj-src-p">' + esc(fill(X.p1)) + '</p><p class="lkj-src-p">' + esc(fill(X.p2)) + '</p>' + S.sourceList(srcs) + '<p class="lkj-src-p"><a href="radios.html">' + esc(X.lienRadios) + '</a></p>');
}

/* ---------- jeux.html ---------- */
/* v8.05 (Téva : « faut que ça donne envie de cliquer et d’y jouer ») : les trois jeux d’abord, en affiches cliquables juste
   sous le titre (un seul lien par affiche, l’état du jour lu dans la progression), le défi du jour en bandeau, puis le
   tableau : carte de niveau et sa jauge, tableau des scores (une invitation à la première partie pour un nouveau
   visiteur), badges en médailles, les huit niveaux en route de Leonida. Crochets lus par jeux-core.js inchangés
   (data-lkj-today, -state, -defi, -defi-t, -defi-s, -badge, -badge-s, -lvl, -here, -min, -s-*, -pts, -meter…). */
const BADGE_ICON = { 'premier-pas': 'boussole', 'sans-faute': 'motif', 'trois-du-jour': 'liste', 'serie-3': 'horloge', 'serie-7': 'sablier', 'tour-de-leonida': 'carte', album: 'film', archiviste: 'lire', 'oreille-d-or': 'note', defis: 'statuts' };
const ICON_LOCK = '<svg class="lkj-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
const ICON_STAR = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>';
function board(L) {
  const { J } = L, X = J.hub.progression, F = X.premiere;
  const tile = (k, attr, note) => '<div class="lkj-score"><dt>' + esc(k) + '</dt><dd class="lkj-score-n" data-lkj-tick ' + attr + '></dd>' + (note ? '<dd class="lkj-score-d">' + esc(note) + '</dd>' : '') + '</div>';
  const panel = '<div class="lkj-panel"><div class="lkj-panel-top"><span class="lkj-medal lkj-medal--big" aria-hidden="true"><b data-lkj-lvn></b></span><div><p class="lkj-panel-k" data-lkj-lvt></p><p class="lkj-panel-name" data-lkj-name></p></div></div>'
    + '<p class="lkj-panel-pts" data-lkj-tick data-lkj-pts></p><span class="lkj-meter lkj-meter--big" aria-hidden="true"><i data-lkj-meter></i></span><p class="lkj-panel-next" data-lkj-next></p></div>';
  const first = '<div class="lkj-first" data-lkj-first hidden><span class="lkj-first-ico" aria-hidden="true">' + S.icon('manette') + '</span><div class="lkj-first-b"><p class="lkj-first-t">' + esc(F.titre) + '</p><p class="lkj-first-x">' + esc(F.texte) + '</p>'
    + '<p class="lkj-first-a"><a class="lkx-btn" href="#jeux">' + esc(F.lien) + '</a></p></div></div>';
  const scores = '<dl class="lkj-scores" data-lkj-played hidden>' + tile(X.parties, 'data-lkj-s-parties') + tile(X.bonnes, 'data-lkj-s-ok') + tile(X.serie, 'data-lkj-s-serie', X.serieNote) + tile(X.serieMax, 'data-lkj-s-max') + tile(X.defis, 'data-lkj-s-defis') + tile(X.sansFaute, 'data-lkj-s-parfait') + '</dl>';
  const badges = '<div class="lkj-badges-h"><h3 class="lkj-h3">' + esc(X.badges) + '</h3><p class="lkj-badges-n" data-lkj-on hidden data-lkj-badges-n></p></div><ul class="lkj-badges" data-lkj-badges role="list">'
    + J.badges.map(b => '<li class="lkj-badge" data-lkj-badge="' + esc(b.id) + '"><div class="lkj-badge-ico" aria-hidden="true">' + S.icon(BADGE_ICON[b.id]) + '<span class="lkj-badge-lock">' + ICON_LOCK + '</span></div><div class="lkj-badge-b"><div class="lkj-badge-t">' + esc(b.nom) + '</div><div class="lkj-badge-c">' + esc(b.cond) + '</div><div class="lkj-badge-s" data-lkj-badge-s></div></div></li>').join('') + '</ul>';
  const levels = '<h3 class="lkj-h3">' + esc(X.niveaux) + '</h3><ol class="lkj-levels" role="list">' + J.niveaux.map((n, i) => '<li class="lkj-lvl" data-lkj-lvl="' + i + '"><div class="lkj-lvl-n" aria-hidden="true">' + (i + 1) + '</div><div class="lkj-lvl-b"><div class="lkj-lvl-t">' + esc(n.nom) + '</div><div class="lkj-lvl-p" data-lkj-min="' + n.min + '"></div><div class="lkj-lvl-here" data-lkj-here hidden></div></div></li>').join('') + '</ol>';
  return '<div class="lkj-board" data-lkj-board' + confAttrs(L) + '><div class="lkj-nojs" data-lkj-nojs><p>' + esc(J.bandeau.sansScript) + '</p></div>'
    + '<div class="lkj-board-grid" data-lkj-on hidden>' + panel + '<div class="lkj-side">' + first + scores + '</div></div>' + badges + levels
    + '<p class="lkj-toast" data-lkj-toast role="status" hidden></p><p class="sr-only" data-lkj-plive aria-live="polite"></p>' + coreTemplate(L) + '</div>';
}
/* les affiches : l’image officielle remplit l’affiche, le titre et l’appel à jouer sur un dégradé de nuit ; une teinte par
   jeu (jeux.css, .lkj-pl--<id>) ; nom accessible « Jouer, <jeu> », description : état du jour, phrase, pastilles */
function hubGames(L) {
  const X = L.J.hub.jeux, per = { devine: L.D.parPartie, frise: L.J.frise.parPartie, station: L.J.station.parPartie };
  const poster = (g, i) => {
    const id = esc(g.id);
    return '<li class="lkj-pl lkj-pl--' + id + '" data-lkj-today="' + id + '" style="--i:' + i + '">'
      + '<a class="lkj-poster" href="' + esc(g.page) + '" data-lkj-card="' + id + '" aria-labelledby="lkj-go-' + id + ' lkj-pt-' + id + '" aria-describedby="lkj-ps-' + id + ' lkj-px-' + id + ' lkj-pc-' + id + '">'
      + '<div class="lkj-poster-m">' + VT.img(g.media, g.alt, { sizes: '(max-width:899px) 92vw, 420px', eager: i === 0 ? 'normal' : undefined }) + '</div>'
      + '<div class="lkj-poster-n" aria-hidden="true">0' + (i + 1) + '</div>'
      + '<div class="lkj-poster-b"><div class="lkj-poster-s" id="lkj-ps-' + id + '" data-lkj-state></div>'
      + '<h3 class="lkj-poster-t" id="lkj-pt-' + id + '">' + esc(g.nom) + '</h3><p class="lkj-poster-x" id="lkj-px-' + id + '">' + esc(g.texte) + '</p>'
      + '<ul class="lkj-chips" id="lkj-pc-' + id + '" role="list"><li>' + esc(X.questions.replace('{n}', per[g.id])) + '</li><li>' + esc(X.jour) + '</li><li>' + esc(X.libre) + '</li></ul>'
      + '<div class="lkj-poster-go" id="lkj-go-' + id + '"><span class="lkj-poster-ico" aria-hidden="true">' + LKX.ICO.play + '</span>' + esc(X.jouer) + '</div></div></a></li>';
  };
  const P = L.J.hub.progression;
  const quest = '<div class="lkj-quest" data-lkj-defi data-lkj-on hidden><span class="lkj-quest-ico" aria-hidden="true">' + ICON_STAR + '</span>'
    + '<div class="lkj-quest-b"><p class="lkj-quest-k">' + esc(P.defi) + '</p><p class="lkj-quest-t" data-lkj-defi-t></p>'
    + '<span class="lkj-meter lkj-quest-bar" aria-hidden="true"><i data-lkj-defi-bar></i></span><p class="lkj-quest-s" data-lkj-defi-s></p></div>'
    + '<p class="lkj-quest-pts" data-lkj-defi-pts aria-hidden="true"></p></div>';
  return '<section class="shell lkj-deck" id="jeux" aria-labelledby="lkj-jeux-t"><h2 class="sr-only" id="lkj-jeux-t">' + esc(X.titre) + '</h2>'
    + '<div class="lkj-deck-in"><ul class="lkj-posters vt-in vt-in--deal" data-lk-reveal role="list">' + L.J.jeux.map(poster).join('') + '</ul></div>' + quest + '</section>';
}
function hubPoints(L) {
  const X = L.J.hub.points, P = L.J.points;
  const fill = t => t.replace(/\{(bonne|sansFaute|defi)\}/g, (m, k) => P[k]);
  return S.section({ id: 'points', num: 2, kicker: X.kicker, title: X.titre, icon: 'chiffres', tone: 'paper' }, VT.steps(X.etapes.map((e, i) => ({ title: e.titre, text: fill(e.texte), ill: IL.POINTS[i] })), { cls: 'lkj-steps' }));
}

/* ---------- pages ---------- */
function page(L, o) {
  const C = chromeOf(L.read('a-propos.html')), P = o.P;
  const title = P.seoTitle + ' | Leonidakit', desc = metaDesc(P.desc), canonical = '/' + o.file;
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: P.title, description: desc, url: SITE + canonical, inLanguage: 'fr', dateModified: o.modified, about: { '@type': 'VideoGame', name: 'Grand Theft Auto VI' }, isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' } }) + '</script>';
  const crumbs = o.file === PAGES.hub ? [['Accueil', '/'], [P.label, canonical]] : [['Accueil', '/'], [L.J.hub.label, '/' + PAGES.hub], [P.label, canonical]];
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">
<link rel="canonical" href="${SITE}${canonical}">
${C.fav}
${bc(crumbs)}
${ld}
<link rel="stylesheet" href="style.css">
<link rel="stylesheet" href="motion-tokens.css">
<link rel="stylesheet" href="lk-sections.css">
<link rel="stylesheet" href="vitrine.css">
<link rel="stylesheet" href="jeux.css">
<meta property="og:image" content="${SITE}${ogOf(L, o.og)}">
<meta name="twitter:card" content="summary_large_image">
<meta property="og:url" content="${SITE}${canonical}">
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${C.header.replace(/ class="here"/g, '').replace(/ aria-current="page"/g, '')}

<main id="main" class="lore-page lkj-page lkj-page--${o.key}">
${o.body}
</main>

${C.footer}

${C.scripts}
<script src="vitrine.js"></script>
</body>
</html>
`;
}
const head = (P, cls) => `<section class="page-head shell lk-glow lkj-head${cls ? ' ' + cls : ''}">
  <div class="lkj-head-t"><p class="fiche-cat">${esc(P.kicker)}</p>
  <h1>${esc(P.title)}</h1></div>
  <div class="lkj-head-d"><p class="lede">${esc(P.lede)}</p>
  <p class="d-intro-note">${esc(P.note)}</p></div>
</section>`;
function friseHtml(L, R) {
  const X = L.J.frise, P = X.page, nav = S.nav(Object.entries(P.nav).map(([id, label]) => ({ href: '#' + id, label })), P.label);
  const body = head(P) + '\n' + friseGame(L, R.E) + '\n<script src="jeux-core.js" defer></script>\n<script src="frise.js" defer></script>\n' + strip(L) + '\n<div class="ed-zone ed-zone--jeux">\n' + nav + '\n'
    + rulesSection(X, IL.FRISE, 1) + '\n' + friseSources(L, R.E) + '\n' + faqSection(L, X, 3) + '\n</div>\n' + explore(X);
  const modified = R.E.map(e => e.iso).sort().pop();
  return page(L, { file: PAGES.frise, key: 'frise', P: { ...P, desc: P.desc }, body, og: 'annonce-extended-look', modified });
}
function stationHtml(L, R) {
  const X = L.J.station, P = X.page, nav = S.nav(Object.entries(P.nav).map(([id, label]) => ({ href: '#' + id, label })), P.label);
  const body = head(P) + '\n' + stationGame(L, R.C, R.ST) + '\n<script src="jeux-core.js" defer></script>\n<script src="station.js" defer></script>\n' + strip(L) + '\n<div class="ed-zone ed-zone--jeux">\n' + nav + '\n'
    + rulesSection(X, IL.STATION(R.ST.map(s => s.c)), 1) + '\n' + stationSources(L, R.C) + '\n' + faqSection(L, X, 3) + '\n</div>\n' + explore(X);
  return page(L, { file: PAGES.station, key: 'station', P, body, og: 'dre-quan-priest-04', modified: L.SRC['gi-radio-morceaux'].consultedAt });
}
function hubHtml(L, R) {
  const X = L.J.hub, nav = S.nav(Object.entries(X.nav).map(([id, label]) => ({ href: '#' + id, label })), X.label);
  const prog = S.section({ id: 'progression', num: 1, kicker: X.progression.kicker, title: X.progression.titre, icon: 'statuts', tone: 'paper', lede: esc(X.progression.lede) }, board(L));
  const body = head({ ...X, title: X.title }) + '\n' + hubGames(L) + '\n<script src="jeux-core.js" defer></script>\n<div class="ed-zone ed-zone--jeux">\n' + nav + '\n' + prog + '\n' + hubPoints(L) + '\n' + faqSection(L, X, 3) + '\n</div>\n' + explore(X);
  const modified = [R.E.map(e => e.iso).sort().pop(), L.SRC['gi-radio-morceaux'].consultedAt].sort().pop();
  return page(L, { file: PAGES.hub, key: 'hub', P: X, body, og: 'cover-art-officielle', modified });
}

/* ---------- recherche du site ---------- */
function indexEntries(L) {
  const n = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), J = L.J;
  return [
    { l: J.hub.title + ' : points, niveaux et badges', k: 'Jouer', u: '/' + PROGRESSION, s: n(J.hub.title + ' ' + J.hub.seoTitle + ' jeux jeu quiz progression points niveau niveaux badges defi du jour serie gta 6 gta vi'), w: 1 },
    { l: J.frise.page.title + ' : le jeu du jour', k: 'Jouer', u: '/' + PAGES.frise + '#jeu', s: n(J.frise.page.title + ' ' + J.frise.page.seoTitle + ' jeu quiz frise chronologie annonces dates ordre trailer actualites gta 6 gta vi'), w: 1 },
    { l: J.station.page.title + ' : le jeu du jour', k: 'Jouer', u: '/' + PAGES.station + '#jeu', s: n(J.station.page.title + ' ' + J.station.page.seoTitle + ' jeu quiz radio radios stations animateurs musique morceaux blind test gta 6 gta vi ' + L.R.stations.map(s => s.name).join(' ')), w: 1 }
  ];
}

function generate(root = ROOT) {
  const L = load(root), R = check(L);
  fs.writeFileSync(path.join(root, PAGES.hub), hubHtml(L, R));
  fs.writeFileSync(path.join(root, PAGES.frise), friseHtml(L, R));
  fs.writeFileSync(path.join(root, PAGES.station), stationHtml(L, R));
  fs.writeFileSync(path.join(root, 'outils/jeux-index.json'), JSON.stringify(indexEntries(L)));
  console.log('jeux : ' + R.E.length + ' annonces (frise), ' + R.C.length + ' indices sur ' + R.ST.length + ' stations, ' + L.J.badges.length + ' badges, ' + L.J.niveaux.length + ' niveaux ; tirages vérifiés sur trois ans');
}

module.exports = { generate, load, check, eventsOf, cluesOf, stationsOf, strip, indexEntries, DATA_FILE, PAGES };
if (require.main === module) generate();
