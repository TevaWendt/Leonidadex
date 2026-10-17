'use strict';
/* v7.93 (lot 8) : les quatre pages qui répondent à ce que les joueurs tapent sur Google, dans le gabarit des pages
   d’information (appelé par outils/gen-informations.cjs, qui passe ses briques : page(), hero(), sections, vitrine) :
   - prechargement.html : « gta 6 préchargement, preload date, taille go ps5 » ;
   - gta-6-pc.html : « gta 6 pc » ;
   - gta-6-vs-gta-5.html : « gta 6 vs gta 5, carte vs gta 5 » ;
   - vraies-voitures.html : « gta 6 vrai marque de voiture » (produite depuis vehicules-data.js).
   Contenu rédigé dans outils/informations-editorial.json (clés prechargement, pc, comparatif, vraiesVoitures) ; bandeaux dans
   outils/lot-c-visuals.cjs ; styles propres dans recherches.css (chargé seulement par ces pages). Rien d’inventé : chaque
   information porte son statut et sa source datée ; GTA V et les sorties PC d’avant sont des « repères de la série ».
   Le préchargement a deux états (données « etat » : avant | ouvert) : le lot 4 (jour J) bascule « etat » et remplit les
   champs laissés à null (heure, taille) quand Rockstar les annonce ; le générateur refuse « ouvert » tant qu’ils manquent. */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.resolve(__dirname, '..');

module.exports = function run(H) {
  const { page, hero, leoAside, S, VT, ED_ALL, frDate, acq, visuals, medias } = H;
  const esc = S.esc;
  const gta = t => esc(t).replace(/\bGTA (6|VI|V|IV)\b/g, 'GTA $1');/* « GTA VI » ne se coupe jamais en fin de ligne */
  const para = list => (list || []).map(p => '<p>' + gta(p) + '</p>').join('');
  const ext = (href, label) => '<a href="' + esc(href) + '" target="_blank" rel="noopener nofollow">' + esc(label) + ' <span aria-hidden="true">↗</span></a>';
  const dmy = iso => iso ? iso.split('-').reverse().join('/') : '';
  const SITE = 'https://www.leonidakit.com';
  const WEBSITE = { '@id': SITE + '/#website' };
  const VIDEOGAME = { '@type': 'VideoGame', name: 'Grand Theft Auto VI' };

  /* ---------- briques communes aux quatre pages ---------- */
  /* sources : {id: {url, title, publisher, publishedAt, consultedAt, statut}} ; liste numérotée en bas de page */
  const srcRef = (SRC, id) => { const s = SRC[id]; if (!s) throw Error('Source inconnue : ' + id); return '<a class="rc-ref" href="#src-' + esc(id) + '" aria-label="' + esc('Source : ' + s.title) + '">' + esc(s.short || 'source') + '</a>'; };
  const srcList = (SRC, ids) => '<ol class="ed-srcs rc-srcs">' + ids.map(id => { const s = SRC[id]; if (!s) throw Error('Source inconnue : ' + id);
    return '<li id="src-' + esc(id) + '" class="lk-reveal">' + S.pip(s.statut || 'officiel', true) + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow">' + esc(s.title) + '</a><span class="ed-src-meta">' + esc(s.publisher) + (s.publishedAt ? ' · publié le ' + esc(dmy(s.publishedAt)) : '') + ' · consulté le ' + esc(dmy(s.consultedAt)) + '</span>' + (s.claim ? '<p>' + gta(s.claim) + '</p>' : '') + '</li>'; }).join('') + '</ol>';
  const faqBlock = list => '<div class="faq">' + list.map(x => '<details class="lk-reveal"><summary>' + gta(x.q) + '</summary><div class="ans">' + gta(x.a) + (x.href ? ' <a href="' + esc(x.href) + '">' + esc(x.label) + '</a>' : '') + '</div></details>').join('') + '</div>';
  const faqLD = list => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a + (x.href ? ' ' + x.label + ' : ' + SITE + '/' + x.href : '') } })) });
  /* statut + source en pied d’un point : « Officiel · Rockstar Support, 18/08/2026 » */
  const stamp = (SRC, statut, id) => { const s = SRC[id]; return '<p class="rc-stamp">' + S.pip(statut, true) + srcRef(SRC, id) + '</p>'; };
  /* encadré « Ce qui n’est pas confirmé » : tuiles sombres à point d’interrogation (comme Ce qui est confirmé) */
  const openQs = items => '<ul class="vf-qs rc-qs vt-in" data-lk-reveal>' + items.map((x, i) => '<li class="vf-q" id="' + esc(x.id) + '" style="--i:' + i + '"><span class="vf-q-ico">' + S.icon(x.ico) + '<b class="vt-stamp" aria-hidden="true">?</b></span><h3>' + gta(x.t) + '</h3><p>' + gta(x.d) + '</p>' + (x.ou ? '<p class="rc-q-ou"><span>' + esc(x.ouLabel) + '</span> ' + x.ou + '</p>' : '') + '</li>').join('') + '</ul>';
  /* tickets des dates (12, 19, 20 novembre) avec compte à rebours en jours (vitrine.js) */
  const tickets = (list, SRC) => '<ol class="rc-tickets vt-in vt-in--deal" data-lk-reveal>' + list.map((t, i) => '<li class="rc-ticket' + (t.main ? ' rc-ticket--main' : '') + '" style="--i:' + i + '"><time datetime="' + esc(t.iso) + '">' + esc(frDate(t.iso)) + '</time><h3>' + gta(t.t) + '</h3><p>' + gta(t.d) + '</p><p class="rc-ticket-f">' + VT.cd(t.iso) + srcRef(SRC, t.src) + '</p></li>').join('') + '</ol>';
  /* étapes illustrées d’une console : {titre, source, steps:[{icon,t,d}]} */
  const howto = (c, SRC) => '<div class="rc-howto lk-reveal"><h3 class="rc-howto-t"><span class="ed-col-ico">' + S.icon(c.icon) + '</span>' + esc(c.titre) + '</h3><ol class="rc-steps">' + c.steps.map((s, i) => '<li class="rc-step"><span class="rc-step-n" aria-hidden="true">' + (i + 1) + '</span><div><h4>' + gta(s.t) + '</h4><p>' + gta(s.d) + '</p></div></li>').join('') + '</ol><p class="rc-stamp">' + S.pip('officiel', true) + srcRef(SRC, c.src) + '</p></div>';
  /* liste à cocher (sans script : simple liste) */
  const checklist = items => '<ul class="rc-check vt-in" data-lk-reveal>' + items.map((x, i) => '<li style="--i:' + i + '"><span class="rc-check-ico" aria-hidden="true">' + VT.SVG.yes + '</span><div><h3>' + gta(x.t) + '</h3><p>' + gta(x.d) + '</p></div></li>').join('') + '</ul>';

  const LDPage = (file, X, more) => Object.assign({ '@context': 'https://schema.org', '@type': 'WebPage', '@id': SITE + '/' + file + '#webpage', url: SITE + '/' + file, name: X.title, description: X.description, inLanguage: 'fr-FR', isPartOf: WEBSITE, datePublished: X.publishedAt, dateModified: X.checkedAt, about: VIDEOGAME }, more || {});
  const opts = (X, extra) => Object.assign({ cls: 'info-page--recherche', css: ['vitrine.css', 'recherches.css'], scripts: ['vitrine.js'], og: SITE + (visuals.pick(X.stack)[0].big || visuals.pick(X.stack)[0].src) }, extra || {});
  const build = (X, parts, extra) => page(X.file, X.title, X.description, hero({ eyebrow: X.hero.eyebrow, h1: X.h1.split('<br>').map(gta).join('<br>'), lede: X.hero.lede, actions: X.hero.actions, stack: X.stack, stackLabel: X.stackLabel }) + '<div class="ed-zone ed-zone--info">' + parts.join('\n') + '</div>', opts(X, extra));

  /* =============== 1. Préchargement : date, heure et taille =============== */
  {
    const X = ED_ALL.prechargement, SRC = X.sources;
    if (acq.game.preloadDate !== X.dates[0].iso) throw Error('prechargement : la date du préchargement diffère de outils/acquisitions.json');
    if (!['avant', 'ouvert'].includes(X.etat)) throw Error('prechargement : etat inconnu « ' + X.etat + ' » (avant | ouvert)');
    if (X.etat === 'ouvert') for (const k of ['heure', 'taillePs5', 'tailleXbox']) if (!X.ouvert[k]) throw Error('prechargement : état « ouvert » sans « ' + k + ' » : rien ne s’écrit qui ne soit pas annoncé');
    const E = X.etat === 'ouvert' ? X.ouvert : X.avant;
    let n = 0; const parts = [S.nav(X.nav, 'Sections de la page')];
    const sec = (o, body) => S.section({ ...o, num: ++n }, body);
    /* 1. les dates (tickets) + l’état du jour */
    const D = X.dates;
    parts.push(sec({ id: 'dates', kicker: E.kicker, title: E.title, icon: 'horloge', tone: 'paper2', lede: gta(E.lede) },
      '<div class="rc-state rc-state--' + esc(X.etat) + ' lk-reveal" data-lk-preload="' + esc(D[0].iso) + '"><p class="rc-state-k">' + esc(E.etatLabel) + '</p><p class="rc-state-t">' + gta(E.etatTexte) + '</p>' + (X.etat === 'ouvert' ? '<dl class="rc-state-dl"><div><dt>' + esc(X.ouvert.heureLabel) + '</dt><dd>' + esc(X.ouvert.heure) + '</dd></div><div><dt>' + esc(X.ouvert.taillePs5Label) + '</dt><dd>' + esc(X.ouvert.taillePs5) + '</dd></div><div><dt>' + esc(X.ouvert.tailleXboxLabel) + '</dt><dd>' + esc(X.ouvert.tailleXbox) + '</dd></div></dl>' : '') + '</div>'
      + tickets(D, SRC)));
    /* 2. comment précharger (PS5, Xbox), d’après les pages d’assistance officielles */
    const C = X.comment;
    parts.push(sec({ id: 'comment', kicker: C.kicker, title: C.title, icon: 'conduite', tone: 'paper', accent: 'coral', lede: gta(C.lede) },
      '<div class="rc-howtos">' + C.consoles.map(c => howto(c, SRC)).join('') + '</div><div class="ed-callout rc-callout"><p>' + gta(C.note) + '</p></div>'));
    /* 3. la boîte */
    const B = X.boite;
    parts.push(sec({ id: 'boite', kicker: B.kicker, title: B.title, icon: 'kit', tone: 'night', lede: gta(B.lede) },
      '<ul class="vt-cards vt-cards--3 vt-in vt-in--deal rc-cards" data-lk-reveal>' + B.points.map((p, i) => '<li style="--i:' + i + '"><div class="vt-card"><div class="vt-card-b"><span class="ed-col-ico rc-card-ico">' + S.icon(p.icon) + '</span><h3 class="vt-card-t">' + gta(p.t) + '</h3><p class="vt-card-d">' + gta(p.d) + '</p>' + stamp(SRC, 'officiel', p.src) + '</div></div></li>').join('') + '</ul>'
      + '<p class="rc-more"><a href="editions.html#boite">' + esc(B.lien) + '</a></p>'));
    /* 4. ce qui n’est pas confirmé, et où ce sera annoncé */
    const P = X.pasConfirme;
    parts.push(sec({ id: 'pas-confirme', kicker: P.kicker, title: P.title, icon: 'sablier', tone: 'paper2', accent: 'coral', lede: gta(P.lede) },
      openQs(P.items.map(x => ({ ...x, ouLabel: P.ouLabel, ou: x.ou ? x.ou.map(id => ext(SRC[id].url, SRC[id].short || SRC[id].publisher)).join(' · ') : null })))
      + '<div class="ed-callout rc-callout rc-callout--maj"><p>' + gta(P.maj) + '</p></div>'));
    /* 5. avant le 12 novembre : la liste */
    const L = X.liste;
    parts.push(sec({ id: 'avant', kicker: L.kicker, title: L.title, icon: 'liste', tone: 'paper', lede: gta(L.lede) }, checklist(L.items)));
    /* 6. FAQ + Léo ; 7. sources */
    parts.push(sec({ id: 'faq', kicker: X.faqKicker, title: X.faqTitle, icon: 'faq', tone: 'paper2' }, VT.faqGrid(faqBlock(X.faq), leoAside(X.leo, 'jason-and-lucia-13', 'Jason et Lucia face à face dans la lumière du soir, un hélicoptère et un hydroglisseur derrière eux, visuel officiel Rockstar Games'))));
    parts.push(sec({ id: 'sources', kicker: X.sourcesKicker, title: X.sourcesTitle, icon: 'lire', tone: 'paper', lede: gta(X.sourcesLede) }, srcList(SRC, Object.keys(SRC))));
    build(X, parts, { ld: [LDPage(X.file, X), faqLD(X.faq)] });
  }

  /* =============== 2. GTA VI sur PC : ce qu’on sait =============== */
  {
    const X = ED_ALL.pc, SRC = X.sources;
    let n = 0; const parts = [S.nav(X.nav, 'Sections de la page')];
    const sec = (o, body) => S.section({ ...o, num: ++n }, body);
    /* 1. ce que Rockstar a annoncé : trois cartes (consoles, pas de PC, où ça s’annoncera) */
    const O = X.officiel;
    const quotes = list => '<div class="rc-quotes">' + list.map(q => '<blockquote class="vt-quote lk-reveal" lang="' + esc(q.lang || 'en') + '"><p>' + esc(q.texte) + '</p><cite lang="fr">' + gta(q.qui) + ' · ' + srcRef(SRC, q.src) + '</cite></blockquote>').join('') + '</div>';
    parts.push(sec({ id: 'officiel', kicker: O.kicker, title: O.title, icon: 'statuts', tone: 'paper2', lede: gta(O.lede) },
      '<ul class="vt-cards vt-cards--3 vt-in vt-in--deal rc-cards" data-lk-reveal>' + O.points.map((p, i) => '<li style="--i:' + i + '"><div class="vt-card' + (p.main ? ' rc-card--main' : '') + '"><div class="vt-card-b"><span class="ed-col-ico rc-card-ico">' + S.icon(p.icon) + '</span><h3 class="vt-card-t">' + gta(p.t) + '</h3><p class="vt-card-d">' + gta(p.d) + '</p>' + stamp(SRC, p.statut || 'officiel', p.src) + '</div></div></li>').join('') + '</ul>'
      /* ce qu’a dit Take-Two (déclarations rapportées par la presse, pas des annonces) */
      + (O.dits ? '<h3 class="ed-h3">' + esc(O.ditTitre) + '</h3><p class="rc-lede2">' + gta(O.ditLede) + '</p>' + quotes(O.dits) : '')));
    /* 2. les précédents de la série : frise des sorties PC, avec l’écart calculé */
    const R = X.serie;
    const months = (a, b) => { const A = new Date(a + 'T12:00:00Z'), B = new Date(b + 'T12:00:00Z'); return Math.round((B - A) / (30.4375 * 864e5)); };
    const gap = m => m >= 24 ? X.serie.ans.replace('{n}', String(Math.round(m / 12))) : X.serie.mois.replace('{n}', String(m));
    const rows = R.items.map(x => ({ ...x, ecart: months(x.consoles, x.pc) }));
    const maxM = Math.max(...rows.map(r => r.ecart));
    parts.push(sec({ id: 'serie', kicker: R.kicker, title: R.title, icon: 'horloge', tone: 'paper', accent: 'coral', lede: gta(R.lede) },
      '<ol class="rc-serie vt-in" data-lk-reveal>' + rows.map((r, i) => '<li class="rc-serie-i" style="--i:' + i + ';--p:' + Math.max(4, Math.round(100 * r.ecart / maxM)) + '%"><h3 translate="no">' + esc(r.jeu) + '</h3><div class="rc-serie-dates"><span><b>' + esc(R.consolesLabel) + '</b> <time datetime="' + esc(r.consoles) + '">' + esc(frDate(r.consoles)) + '</time></span><span><b>' + esc(R.pcLabel) + '</b> <time datetime="' + esc(r.pc) + '">' + esc(frDate(r.pc)) + '</time></span></div><p class="rc-serie-gap"><i aria-hidden="true"></i><span>' + esc(gap(r.ecart)) + '</span></p><p class="rc-stamp">' + S.pip('serie', true) + srcRef(SRC, r.src) + '</p></li>').join('') + '</ol>'
      + '<div class="ed-callout rc-callout"><p>' + gta(R.note) + '</p></div>'));
    /* 3. l’encadré « arnaque » */
    const A = X.arnaque;
    parts.push(sec({ id: 'arnaques', kicker: A.kicker, title: A.title, icon: 'droits', tone: 'night', accent: 'coral', lede: gta(A.lede) },
      '<div class="rc-alert lk-reveal"><p class="rc-alert-t">' + gta(A.phrase) + '</p>' + para(A.p) + '<ul class="rc-alert-l">' + A.regles.map(r => '<li>' + gta(r) + '</li>').join('') + '</ul><p class="rc-alert-f">' + esc(A.officielLabel) + ' ' + A.officiel.map(id => ext(SRC[id].url, SRC[id].short || SRC[id].publisher)).join(' · ') + '</p>' + (A.srcs ? '<p class="rc-stamp">' + S.pip('officiel', true) + A.srcs.map(id => srcRef(SRC, id)).join(' · ') + '</p>' : '') + '</div>'));
    /* 4. où suivre l’annonce */
    const W = X.suivre;
    parts.push(sec({ id: 'suivre', kicker: W.kicker, title: W.title, icon: 'boussole', tone: 'paper2', lede: gta(W.lede) },
      '<ul class="rc-follow vt-in vt-in--deal" data-lk-reveal>' + W.items.map((x, i) => '<li style="--i:' + i + '"><a class="vt-card rc-follow-a" href="' + esc(x.href) + '"' + (/^https?:/.test(x.href) ? ' target="_blank" rel="noopener nofollow"' : '') + '><div class="vt-card-b"><p class="vt-card-k">' + esc(x.k) + '</p><h3 class="vt-card-t">' + esc(x.t) + '</h3><p class="vt-card-d">' + gta(x.d) + '</p><span class="vt-go">' + esc(x.go) + '</span></div></a></li>').join('') + '</ul>'));
    parts.push(sec({ id: 'faq', kicker: X.faqKicker, title: X.faqTitle, icon: 'faq', tone: 'paper' }, VT.faqGrid(faqBlock(X.faq), leoAside(X.leo, 'vice-city-10', 'Tours au bord de l’eau et bateaux dans la baie de Vice City, visuel officiel Rockstar Games'))));
    parts.push(sec({ id: 'sources', kicker: X.sourcesKicker, title: X.sourcesTitle, icon: 'lire', tone: 'paper2', lede: gta(X.sourcesLede) }, srcList(SRC, Object.keys(SRC))));
    build(X, parts, { ld: [LDPage(X.file, X), faqLD(X.faq)] });
  }

  /* =============== 3. GTA VI et GTA V : ce qui change =============== */
  {
    const X = ED_ALL.comparatif, SRC = X.sources;
    let n = 0; const parts = [S.nav(X.nav, 'Sections de la page')];
    const sec = (o, body) => S.section({ ...o, num: ++n }, body);
    /* 1. le tableau : une ligne par sujet, GTA VI (confirmé, source) face à GTA V (repère de la série), lien vers la page du site */
    const T = X.tableau;
    const cell = (c, cls) => '<td class="' + cls + '" data-l="' + esc(cls === 'rc-cmp-vi' ? T.colVI : T.colV) + '"><span class="rc-cmp-v">' + gta(c.v) + '</span>' + (c.note ? '<span class="rc-cmp-n">' + gta(c.note) + '</span>' : '') + '<span class="rc-cmp-s">' + S.pip(c.statut, true) + (c.src ? srcRef(SRC, c.src) : '') + '</span></td>';
    const table = '<div class="rc-cmp-wrap"><table class="rc-cmp"><caption class="sr-only">' + esc(T.caption) + '</caption><thead><tr><th scope="col">' + esc(T.colSujet) + '</th><th scope="col" class="rc-cmp-vi">' + esc(T.colVI) + '</th><th scope="col">' + esc(T.colV) + '</th><th scope="col">' + esc(T.colPage) + '</th></tr></thead><tbody>'
      + T.rows.map((r, i) => '<tr id="' + esc(r.id) + '"><th scope="row"><span class="rc-cmp-ico">' + S.icon(r.icon) + '</span>' + gta(r.sujet) + '</th>' + cell(r.vi, 'rc-cmp-vi') + cell(r.v, 'rc-cmp-v5') + '<td data-l="' + esc(T.colPage) + '"><a class="rc-cmp-link" href="' + esc(r.href) + '">' + esc(r.label) + '</a></td></tr>').join('') + '</tbody></table></div>';
    parts.push(sec({ id: 'tableau', kicker: T.kicker, title: T.title, icon: 'balance', tone: 'paper2', lede: gta(T.lede) }, table + '<p class="rc-legend">' + S.pip('officiel', true) + ' ' + esc(T.legOfficiel) + ' · ' + S.pip('vu', true) + ' ' + esc(T.legVu) + ' · ' + S.pip('serie', true) + ' ' + esc(T.legSerie) + ' · ' + S.pip('conf', true) + ' ' + esc(T.legConf) + '</p>'));
    /* 2. la carte, mot pour mot */
    const M = X.carte;
    parts.push(sec({ id: 'carte', kicker: M.kicker, title: M.title, icon: 'carte', tone: 'paper', accent: 'coral', lede: gta(M.lede) },
      '<div class="rc-quotes">' + M.citations.map(q => '<blockquote class="vt-quote lk-reveal" lang="' + esc(q.lang || 'en') + '"><p>' + esc(q.texte) + '</p><cite lang="fr">' + gta(q.qui) + ' · ' + srcRef(SRC, q.src) + '</cite></blockquote>').join('') + '</div>' + para(M.p) + '<p class="rc-more"><a href="carte.html">' + esc(M.lien) + '</a> · <a href="lieux.html">' + esc(M.lien2) + '</a></p>'));
    /* 3. ce qui est nouveau d’après les présentations officielles */
    const N = X.nouveau;
    parts.push(sec({ id: 'nouveau', kicker: N.kicker, title: N.title, icon: 'film', tone: 'night', lede: gta(N.lede) },
      '<ul class="vt-cards vt-cards--3 vt-in vt-in--deal rc-cards" data-lk-reveal>' + N.items.map((p, i) => '<li style="--i:' + i + '">' + VT.card({ href: p.href, media: p.media, alt: p.alt, title: p.t, text: p.d, go: N.go }, { sizes: '(max-width:719px) 92vw, 420px' }) + '</li>').join('') + '</ul>'
      + '<p class="rc-stamp rc-stamp--sec">' + S.pip('vu', true) + esc(N.statut) + ' · ' + N.src.map(id => srcRef(SRC, id)).join(' · ') + '</p>'));
    /* 4. ce qu’on ne peut pas encore comparer */
    const P = X.pasEncore;
    parts.push(sec({ id: 'pas-encore', kicker: P.kicker, title: P.title, icon: 'sablier', tone: 'paper2', accent: 'coral', lede: gta(P.lede) }, openQs(P.items)));
    parts.push(sec({ id: 'faq', kicker: X.faqKicker, title: X.faqTitle, icon: 'faq', tone: 'paper' }, VT.faqGrid(faqBlock(X.faq), leoAside(X.leo, 'leonida-keys-01', 'Route au-dessus de la mer dans les Leonida Keys, visuel officiel Rockstar Games'))));
    parts.push(sec({ id: 'sources', kicker: X.sourcesKicker, title: X.sourcesTitle, icon: 'lire', tone: 'paper2', lede: gta(X.sourcesLede) }, srcList(SRC, Object.keys(SRC))));
    build(X, parts, { ld: [LDPage(X.file, X), faqLD(X.faq)] });
  }

  /* =============== 4. Les vraies voitures derrière les véhicules (depuis vehicules-data.js) =============== */
  {
    const X = ED_ALL.vraiesVoitures;
    const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(root, 'vehicules-data.js'), 'utf8'), ctx);
    const V = ctx.window.LK_VEHICULES, CATS = ctx.window.LK_VEHICULES_CATS || {};
    const MQ = JSON.parse(fs.readFileSync(path.join(__dirname, 'marques.json'), 'utf8')).marques, evoque = Object.fromEntries(MQ.map(m => [m.name, m.evoque]));
    const UNKNOWN = 'Marque inconnue';
    const slug = s => S.fold(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const by = new Map(); for (const v of V) { const k = v.marque && v.marque !== UNKNOWN ? v.marque : UNKNOWN; if (!by.has(k)) by.set(k, []); by.get(k).push(v); }
    const brands = [...by.keys()].filter(k => k !== UNKNOWN).sort((a, b) => S.fold(a).localeCompare(S.fold(b)));
    const order = [...brands, ...(by.has(UNKNOWN) ? [UNKNOWN] : [])];
    const N = { vehicules: V.length, marques: brands.length, reels: V.filter(v => v.insp).length, officiel: V.filter(v => v.st === 'officiel').length, vu: V.filter(v => v.st === 'vu').length, comm: V.filter(v => v.st === 'comm').length, evoques: brands.filter(b => evoque[b]).length, inconnue: (by.get(UNKNOWN) || []).length };
    const fill = t => String(t).replace(/\{(\w+)\}/g, (m, k) => N[k] !== undefined ? String(N[k]) : m);
    const nomJeu = v => (v.marque && v.marque !== UNKNOWN ? v.marque + ' ' : '') + v.nom;
    let n = 0;
    const brandNav = X.nav.map(x => ({ ...x }));
    const parts = [S.nav(brandNav, 'Sections de la page')];
    const sec = (o, body) => S.section({ ...o, num: ++n }, body);
    /* 1. chiffres */
    const C = X.chiffres;
    parts.push(sec({ id: 'chiffres', kicker: C.kicker, title: C.title, icon: 'chiffres', tone: 'paper2', lede: gta(fill(C.lede)) },
      VT.figs([{ n: N.vehicules, label: C.vehicules }, { n: N.reels, label: C.reels, p: 100 * N.reels / N.vehicules }, { n: N.marques, label: C.marques }, { n: N.officiel, label: C.officiel, p: 100 * N.officiel / N.vehicules, accent: true }, { n: N.vu, label: C.vu, p: 100 * N.vu / N.vehicules }, { n: N.comm, label: C.comm, p: 100 * N.comm / N.vehicules }], { cls: 'rc-figs' })
      + '<div class="ed-callout rc-callout"><p>' + gta(fill(C.note)) + '</p></div>'));
    /* 2. par marque du jeu : chaque marque, son constructeur évoqué, ses modèles réels, un lien vers chaque fiche */
    const B = X.marquesSec;
    const line = v => '<li class="rc-veh"><a class="rc-veh-a" href="vehicules/' + esc(v.id) + '.html"><b translate="no">' + esc(v.nom) + '</b></a><span class="rc-veh-arrow" aria-hidden="true">→</span><span class="rc-veh-r">' + esc(v.insp || v.reelNom || B.nonIdentifie) + '</span>' + S.pip(v.st, true) + '</li>';
    const brandBlock = (k, i) => { const list = by.get(k).slice().sort((a, b) => S.fold(a.nom).localeCompare(S.fold(b.nom))), unknown = k === UNKNOWN, id = unknown ? 'marque-inconnue' : 'marque-' + slug(k);
      return '<section class="rc-brand lk-reveal" id="' + id + '" aria-labelledby="' + id + '-t"><div class="rc-brand-h"><span class="ed-brand-mono ed-brand-mono--' + ['amber', 'coral', 'night', 'ink'][i % 4] + '" aria-hidden="true">' + esc(unknown ? '?' : S.initials(k)) + '</span><div><h3 id="' + id + '-t"' + (unknown ? '' : ' translate="no"') + '>' + esc(unknown ? B.inconnueTitre : k) + '</h3><p class="rc-brand-ev">' + (unknown ? gta(B.inconnueTexte) : evoque[k] ? esc(evoque[k]) : esc(B.sansRapprochement)) + ' · <b>' + list.length + ' ' + esc(list.length > 1 ? B.vehicules : B.vehicule) + '</b></p></div></div>'
        + (list.length > B.repli ? '<details class="rc-brand-d"><summary>' + esc(B.voir.replace('{n}', String(list.length))) + '</summary><ul class="rc-vehs">' + list.map(line).join('') + '</ul></details>' : '<ul class="rc-vehs">' + list.map(line).join('') + '</ul>') + '</section>'; };
    const index = '<nav class="rc-brandidx" aria-label="' + esc(B.indexLabel) + '"><ul>' + order.map(k => '<li><a href="#' + (k === UNKNOWN ? 'marque-inconnue' : 'marque-' + slug(k)) + '"' + (k === UNKNOWN ? '' : ' translate="no"') + '>' + esc(k === UNKNOWN ? B.inconnueCourt : k) + ' <b>' + by.get(k).length + '</b></a></li>').join('') + '</ul></nav>';
    parts.push(sec({ id: 'marques', kicker: B.kicker.replace('{n}', String(N.marques)), title: B.title, icon: 'marques', tone: 'paper', accent: 'coral', lede: gta(fill(B.lede)) }, index + '<div class="rc-brands">' + order.map(brandBlock).join('') + '</div>'));
    /* 3. comment on identifie (statuts), jamais des partenaires */
    const Mth = X.methode;
    parts.push(sec({ id: 'methode', kicker: Mth.kicker, title: Mth.title, icon: 'loupe', tone: 'night', lede: gta(Mth.lede) },
      '<div class="ed-cols rc-method">' + Mth.cols.map(c => '<div class="ed-col lk-reveal"><h3>' + (c.statut ? S.pip(c.statut, true) : '') + esc(c.titre) + '</h3>' + para(c.p.map(fill)) + '</div>').join('') + '</div>'
      + '<p class="rc-more"><a href="verification.html#modeles">' + esc(Mth.lien) + '</a> · <a href="vehicules.html#marques">' + esc(Mth.lien2) + '</a> · <a href="atelier-3d.html">' + esc(Mth.lien3) + '</a></p>'));
    parts.push(sec({ id: 'faq', kicker: X.faqKicker, title: X.faqTitle, icon: 'faq', tone: 'paper2' }, VT.faqGrid(faqBlock(X.faq.map(q => ({ ...q, a: fill(q.a) }))), leoAside(X.leo, 'ultimate-edition-rideout-customs-03', 'Coupé jaune surélevé dans l’atelier Rideout Customs, visuel officiel Rockstar Games'))));
    const ld = Object.assign(LDPage(X.file, X, { '@type': 'CollectionPage' }), { mainEntity: { '@type': 'ItemList', name: X.title, numberOfItems: V.length, itemListOrder: 'https://schema.org/ItemListUnordered', itemListElement: order.flatMap(k => by.get(k)).map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: nomJeu(v), url: SITE + '/vehicules/' + v.id + '.html' })) } });
    build(X, parts, { ld: [ld, faqLD(X.faq.map(q => ({ ...q, a: fill(q.a) })))] });
    fs.writeFileSync(path.join(__dirname, 'vraies-voitures-chiffres.json'), JSON.stringify(N) + '\n');/* lus par les tests (nombres de la page = données) */
  }
  console.log('Pages v7.93 régénérées : prechargement.html, gta-6-pc.html, gta-6-vs-gta-5.html, vraies-voitures.html.');
};
