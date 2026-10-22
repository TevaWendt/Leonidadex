'use strict';
/* v7.93 (lot 8), revues en v7.94 (frise à stations, étapes dessinées, temps de téléchargement, frise datée, coupures de presse,
   surfaces comparées, liste à cocher) : les quatre pages qui répondent à ce que les joueurs tapent sur Google, dans le gabarit des pages
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
    const SITE = 'https://www.leonidakit.com';
  /* v8.04 : les nombres que ces pages disent du site ne sont plus écrits à la main : {vehicules} (fiches de vehicules-data.js),
     {lieux} (pages lieux-carte, les mêmes que lieux-carte/index.html) et {captures} (ceux qui ont une capture officielle),
     calculés ici depuis les données, au format français (la mémoire de traduction reconnaît les nombres) */
  const COUNTS = (() => {
    const cx = { window: {} }; vm.createContext(cx); vm.runInContext(fs.readFileSync(path.join(root, 'vehicules-data.js'), 'utf8'), cx);
    const INV = require('./couverture-pages.cjs'), LC = INV.FAMILLES.find(f => f.id === 'lieux-carte'), G = INV.donnees.GTA_BY_ID;
    if (!LC || !LC.items.length || !Array.isArray(cx.window.LK_VEHICULES)) throw Error('gen-recherches : données des véhicules ou des lieux introuvables');
    const fr = n => new Intl.NumberFormat('fr-FR').format(n), avecPage = LC.items.filter(l => l.page);
    return { vehicules: fr(cx.window.LK_VEHICULES.length), lieux: fr(avecPage.length), captures: fr(avecPage.filter(l => (G.get(l.id) || {}).img).length) };
  })();
  const fillN = t => { const s = String(t).replace(/\{(vehicules|lieux|captures)\}/g, (m, k) => COUNTS[k]); if (/\{[a-z]+\}/.test(s)) throw Error('gen-recherches : marqueur inconnu dans « ' + s + ' »'); return s; };
  const WEBSITE = { '@id': SITE + '/#website' };
  const VIDEOGAME = { '@type': 'VideoGame', name: 'Grand Theft Auto VI' };

  /* ---------- briques communes aux quatre pages ---------- */
  /* sources : {id: {url, title, publisher, publishedAt, consultedAt, statut}} ; liste numérotée en bas de page */
  const srcRef = (SRC, id) => { const s = SRC[id]; if (!s) throw Error('Source inconnue : ' + id); return '<a class="rc-ref" href="#src-' + esc(id) + '" aria-label="' + esc('Source : ' + s.title) + '">' + esc(s.short || 'source') + '</a>'; };
  const srcList = (SRC, ids) => '<ol class="ed-srcs rc-srcs">' + ids.map(id => { const s = SRC[id]; if (!s) throw Error('Source inconnue : ' + id);
    return '<li id="src-' + esc(id) + '" class="lk-reveal">' + S.pip(s.statut || 'officiel', true) + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow">' + esc(s.title) + '</a><span class="ed-src-meta">' + esc(s.publisher) + (s.publishedAt ? ', publié le ' + esc(frDate(s.publishedAt)) : '') + ', consulté le ' + esc(frDate(s.consultedAt)) + '</span>' + (s.claim ? '<p>' + gta(s.claim) + '</p>' : '') + '</li>'; }).join('') + '</ol>';
  const faqBlock = list => '<div class="faq">' + list.map(x => '<details class="lk-reveal"><summary>' + gta(x.q) + '</summary><div class="ans">' + gta(x.a) + (x.href ? ' <a href="' + esc(x.href) + '">' + esc(x.label) + '</a>' : '') + '</div></details>').join('') + '</div>';
  const faqLD = list => ({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: list.map(x => ({ '@type': 'Question', name: x.q, acceptedAnswer: { '@type': 'Answer', text: x.a + (x.href ? ' ' + x.label + ' : ' + SITE + '/' + x.href : '') } })) });
  /* statut + source en pied d’un point : « Officiel, Rockstar Support » */
  const stamp = (SRC, statut, id) => '<p class="rc-stamp">' + S.pip(statut, true) + srcRef(SRC, id) + '</p>';
  const links = (SRC, ids) => ids.map(id => ext(SRC[id].url, SRC[id].short || SRC[id].publisher)).join(', ');
  /* v8.04 : les questions ouvertes ne sont plus des tuiles sombres (openQs) : tableau de bord (Préchargement) et cartes-liens
     (GTA VI et GTA V), plus bas */
  /* points clés (vitrine.css, 16) : icône de la charte, titre, texte, statut et source */
  const points = (list, SRC, o = {}) => '<ul class="vt-points vt-in vt-in--deal" style="--n:' + (o.n || list.length) + '" data-lk-reveal>' + list.map((p, i) => '<li style="--i:' + i + '"><div class="vt-point' + (p.main ? ' rc-point--main' : '') + '"><span class="vt-point-ico">' + S.icon(p.icon) + '</span><h3>' + gta(p.t) + '</h3><p>' + gta(p.d) + '</p>' + (p.src ? stamp(SRC, p.statut || 'officiel', p.src) : '') + '</div></li>').join('') + '</ul>';
  /* coupures de presse : citations rapportées, en anglais, avec leur auteur, leur date et la source */
  const clips = (list, SRC) => '<div class="vt-clips">' + list.map(q => VT.clip({ text: q.texte, lang: q.lang, who: gta(q.qui), when: [q.ou, q.quand].filter(Boolean).join(', '), foot: srcRef(SRC, q.src) })).join('') + '</div>';
  /* dessins des étapes (vitrine.css, 7) : traits de la charte, jamais une capture d’écran ni un logo de console */
  const ILL = {
    store: '<svg viewBox="0 0 120 84" fill="none" stroke="#1A1A1E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M30 30h60l-6 44H36z" fill="#FDFBF7"/><path d="M44 30v-6a16 16 0 0 1 32 0v6"/><rect x="48" y="44" width="24" height="12" rx="3" fill="#F5A524"/><path d="M54 50h12"/><path d="M78 20l14-8 4 8-14 8z" fill="#E8452C"/><circle cx="92" cy="16" r="1.6" fill="#FDFBF7"/></svg>',
    tick: '<svg viewBox="0 0 120 84" fill="none" stroke="#1A1A1E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="18" y="18" width="84" height="48" rx="8" fill="#FDFBF7"/><rect x="28" y="30" width="20" height="20" rx="5" fill="#F5A524"/><path d="M33 40l5 5 8-10" stroke-width="3"/><path d="M58 34h34M58 46h22"/><rect x="28" y="56" width="64" height="4" rx="2" fill="#F4F0E7"/><rect x="28" y="56" width="22" height="4" rx="2" fill="#E8452C" stroke="none"/></svg>',
    rest: '<svg viewBox="0 0 120 84" fill="none" stroke="#1A1A1E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="44" width="80" height="22" rx="6" fill="#FDFBF7"/><circle cx="32" cy="55" r="3" fill="#F5A524"/><path d="M44 55h30"/><path d="M78 16a13 13 0 1 0 12 18 10 10 0 0 1-12-18z" fill="#F5A524"/><path d="M38 22h10l-10 10h10" stroke-width="2.2"/><path d="M54 12h7l-7 7h7" stroke-width="2"/></svg>',
    library: '<svg viewBox="0 0 120 84" fill="none" stroke="#1A1A1E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="22" y="18" width="24" height="24" rx="4" fill="#FDFBF7"/><rect x="52" y="18" width="24" height="24" rx="4" fill="#FDFBF7"/><rect x="22" y="48" width="24" height="24" rx="4" fill="#FDFBF7"/><rect x="52" y="48" width="24" height="24" rx="4" fill="#F5A524"/><path d="M64 54v10M59 60l5 5 5-5"/><rect x="82" y="18" width="18" height="54" rx="4" fill="#F4F0E7"/><path d="M91 28v6M91 40v6M91 52v6" stroke="#E8452C" stroke-width="3"/></svg>',
    code: '<svg viewBox="0 0 120 84" fill="none" stroke="#1A1A1E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="20" y="26" width="80" height="36" rx="6" fill="#FDFBF7"/><path d="M30 44h8M44 44h8M58 44h8M72 44h8M86 44h4" stroke-width="3.2" stroke="#F5A524"/><path d="M30 54h40" stroke="#1A1A1E" stroke-dasharray="4 4"/><path d="M92 18l6 6-6 6" stroke="#E8452C"/></svg>'
  };
  /* v8.01 : une mosaïque d’images titrée (vitrine.cjs → mosaic) : titre, phrase, tuiles-liens vers des pages du site */
  const mosaique = (M, cls) => '<div class="rc-mosaic' + (cls ? ' ' + cls : '') + '"><h3 class="ed-h3 rc-h3">' + gta(M.titre) + '</h3><p class="rc-lede2">' + gta(M.lede) + '</p>' + VT.mosaic(M.items.map(x => ({ ...x, title: fillN(x.title), text: x.text === undefined ? x.text : fillN(x.text), go: M.go })), { cls: 'rc-mosaic-l' }) + '</div>';
  /* v8.01 : la console dessinée (recherches.css, 9) : la vignette du jeu avec la jaquette officielle, une barre en attente qui
     respire, les deux dates ; tout est écrit en texte (traduit comme le reste), rien n’est une capture d’écran de console */
  const console_ = (A, size) => '<figure class="rc-console lk-reveal"><div class="rc-console-screen"><p class="rc-console-k">' + esc(A.kicker) + '</p><div class="rc-console-tile"><span class="rc-console-cover">' + VT.img('cover-art-officielle', 'La jaquette officielle de GTA VI, visuel officiel Rockstar Games', { sizes: '96px' }) + '</span><span class="rc-console-txt"><b>' + gta(A.label) + '</b><small>' + esc(A.sub) + '</small></span></div><div class="rc-console-bar' + (size ? ' rc-console-bar--on' : '') + '"><i aria-hidden="true"></i><span>' + esc(A.bar) + '</span></div><p class="rc-console-meta"><span>' + esc(size ? size : A.size) + '</span><span>' + esc(A.play) + '</span></p></div><div class="rc-console-base" aria-hidden="true"><i></i></div></figure>';
  /* v8.01 : vrai ou faux (recherches.css, 10) : ce qu’on propose (tampon « Faux ») face à ce qui existe (tampon « Officiel ») */
  const vraiFaux = VF => '<div class="rc-vf"><h3 class="ed-h3 rc-h3">' + gta(VF.titre) + '</h3><div class="rc-vf-grid">' + [['faux', VF.faux], ['vrai', VF.vrai]].map(([k, c], i) => '<div class="rc-vf-card rc-vf-card--' + k + ' lk-reveal" style="--i:' + i + '"><span class="rc-vf-stamp vt-stamp" aria-hidden="true">' + esc(c.stamp) + '</span><span class="sr-only">' + esc(c.stamp) + ' : </span><p class="rc-vf-k">' + esc(c.k) + '</p><p class="rc-vf-t">' + gta(c.t) + '</p><ul class="rc-vf-l">' + c.lines.map(l => '<li>' + gta(l) + '</li>').join('') + '</ul><p class="rc-vf-f">' + gta(c.foot) + '</p></div>').join('') + '</div></div>';
  /* v8.04 (refonte) : la marche à suivre d’une console, posée dans un écran de menu de console (panneau nuit, barre du haut,
     une ligne par étape : numéro, dessin, titre, texte) ; à l’entrée, l’écran s’allume puis les étapes s’allument dans l’ordre
     (recherches.css, « v8.04 refonte C ») ; le statut et la source en pied d’écran. Une suite réelle : les numéros servent. */
  const howto = (c, SRC, k) => '<div class="rc-os rc-os--' + k + '" data-lk-reveal>'
    + '<div class="rc-os-bar"><span class="rc-os-ico" aria-hidden="true">' + S.icon(c.icon) + '</span><h3 class="rc-os-t">' + esc(c.titre) + '</h3><span class="rc-os-led" aria-hidden="true"><i></i><i></i><i></i></span></div>'
    + '<ol class="rc-os-l">' + c.steps.map((s, i) => '<li class="rc-os-i" style="--i:' + i + '"><span class="rc-os-n" aria-hidden="true">' + (i + 1) + '</span><span class="rc-os-ill" aria-hidden="true">' + ILL[s.ill] + '</span><span class="rc-os-b"><b>' + gta(s.t) + '</b><span>' + gta(s.d) + '</span></span></li>').join('') + '</ol>'
    + '<p class="rc-stamp rc-os-f">' + S.pip('officiel', true) + srcRef(SRC, c.src) + '</p></div>';
  /* v8.04 : statut et source d’une carte-lien, écrits sans lien (un lien ne se met pas dans un autre) : « Vu dans un média,
     Famitsu, 28 août 2026 » ; la source elle-même reste dans la liste des sources en bas de page */
  const stText = (SRC, statut, id) => { const s = SRC[id]; if (!s) throw Error('Source inconnue : ' + id); return '<span class="rc-cardst">' + S.pip(statut, true) + '<span>' + esc(s.short || s.publisher) + (s.publishedAt ? ', ' + esc(frDate(s.publishedAt)) : '') + '</span></span>'; };
  /* v8.04 : dessins en traits de la charte (jamais un logo ni une capture de console) : consoles, PC, cadenas, voiture d’arcade,
     drapeaux, disque, horloge */
  const PIC = {
    console: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10h16a8 8 0 0 1 8 8v34H20z"/><path d="M20 52h24"/><path d="M28 18h8"/><circle cx="32" cy="44" r="2" fill="currentColor"/></svg>',
    manette: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22h28c6 0 10 5 11 11l2 11c1 5-5 8-9 4l-6-6H20l-6 6c-4 4-10 1-9-4l2-11c1-6 5-11 11-11z"/><path d="M20 30v8M16 34h8"/><circle cx="43" cy="31" r="2" fill="currentColor"/><circle cx="48" cy="36" r="2" fill="currentColor"/></svg>',
    pc: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="12" width="48" height="32" rx="4"/><path d="M26 54h12M32 44v10"/><path d="M16 20h12" opacity=".5"/></svg>',
    cadenas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="10" width="14" height="11" rx="2.5"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><path d="M12 14.5v3"/></svg>',
    auto: '<svg viewBox="0 0 40 20" shape-rendering="crispEdges" fill="currentColor"><path d="M8 4h16v2h4v2h6v2h2v6h-4v-2h-4v2H12v-2H8v2H4v-2H2v-6h2V8h4z"/><path d="M12 6h4v3h-6V8h2zM18 6h4v2h2v1h-6z" fill="#241740"/><rect x="8" y="14" width="4" height="4" fill="#1A1A1E"/><rect x="28" y="14" width="4" height="4" fill="#1A1A1E"/><rect x="34" y="10" width="2" height="2" fill="#FDFBF7"/></svg>',
    drapeau: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 21V4"/><path d="M6 4h12l-3 4 3 4H6"/></svg>',
    arrivee: '<svg viewBox="0 0 24 24" shape-rendering="crispEdges"><path d="M5 3h2v18H5z" fill="currentColor"/><path d="M7 4h4v3H7zM15 4h4v3h-4zM11 7h4v3h-4zM7 10h4v3H7zM15 10h4v3h-4z" fill="currentColor"/><path d="M11 4h4v3h-4zM7 7h4v3H7zM15 7h4v3h-4zM11 10h4v3h-4z" fill="currentColor" opacity=".25"/></svg>',
    disque: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><circle cx="24" cy="24" r="17"/><circle cx="24" cy="24" r="4"/><path d="M8 40 40 8" stroke-width="3.6"/></svg>'
  };
  /* v8.04 : une horloge dessinée (préchargement : minuit) ; les aiguilles tournent jusqu’à minuit à l’entrée (recherches.css) */
  const clock = () => '<svg class="rc-clock" viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" class="rc-clock-face"/>'
    + Array.from({ length: 12 }, (_, i) => { const a = i * Math.PI / 6, r1 = i % 3 ? 37 : 33, x1 = 50 + r1 * Math.sin(a), y1 = 50 - r1 * Math.cos(a), x2 = 50 + 40 * Math.sin(a), y2 = 50 - 40 * Math.cos(a); return '<path d="M' + x1.toFixed(1) + ' ' + y1.toFixed(1) + 'L' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" class="rc-clock-tick' + (i % 3 ? '' : ' is-q') + '"/>'; }).join('')
    + '<g class="rc-clock-h"><path d="M50 50V27"/></g><g class="rc-clock-m"><path d="M50 50V15"/></g><circle cx="50" cy="50" r="4.5" class="rc-clock-c"/></svg>';

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
    /* 1. l’état du jour, puis les trois dates sur une frise à stations (le trait se trace à l’entrée) */
    const D = X.dates;
    parts.push(sec({ id: 'dates', kicker: E.kicker, title: E.title, icon: 'horloge', tone: 'paper2', lede: gta(E.lede) },
      /* v8.01 : l’état du jour à gauche, la console dessinée à droite (la taille annoncée y remplace « pas encore annoncée ») */
      '<div class="rc-dates-grid"><div class="rc-state rc-state--' + esc(X.etat) + ' lk-reveal" data-lk-preload="' + esc(D[0].iso) + '"><p class="rc-state-k">' + esc(E.etatLabel) + '</p><p class="rc-state-t">' + gta(E.etatTexte) + '</p>' + (X.etat === 'ouvert' ? '<dl class="rc-state-dl"><div><dt>' + esc(X.ouvert.heureLabel) + '</dt><dd>' + esc(X.ouvert.heure) + '</dd></div><div><dt>' + esc(X.ouvert.taillePs5Label) + '</dt><dd>' + esc(X.ouvert.taillePs5) + '</dd></div><div><dt>' + esc(X.ouvert.tailleXboxLabel) + '</dt><dd>' + esc(X.ouvert.tailleXbox) + '</dd></div></dl>' : '') + '</div>'
      + console_(X.avant.anim, X.etat === 'ouvert' && X.ouvert.taillePs5 ? X.ouvert.taillePs5Label + ' : ' + X.ouvert.taillePs5 : null) + '</div>'
      + VT.rail(D.map(d => ({ iso: d.iso, date: frDate(d.iso), title: gta(d.t), text: gta(d.d), foot: VT.cd(d.iso) + srcRef(SRC, d.src), main: d.main })), { cls: 'rc-rail' })));
    /* 2. comment précharger (PS5, Xbox), d’après les pages d’assistance officielles : deux écrans de menu de console (v8.04) */
    const C = X.comment;
    parts.push(sec({ id: 'comment', kicker: C.kicker, title: C.title, icon: 'conduite', tone: 'paper', accent: 'coral', lede: gta(C.lede) },
      '<div class="rc-oss">' + C.consoles.map((c, i) => howto(c, SRC, i ? 'xbox' : 'ps')).join('') + '</div><div class="ed-callout rc-callout"><p>' + gta(C.note) + '</p></div>'));
    /* 3. le temps de téléchargement : calcul du visiteur (taille tapée, débit tapé) et repère de la série */
    const Tm = X.temps;
    parts.push(sec({ id: 'temps', kicker: Tm.kicker, title: Tm.title, icon: 'calcul', tone: 'night', lede: gta(Tm.lede) },
      VT.dlCalc(Tm.calc, X.etat === 'ouvert' && X.ouvert.taillePs5 ? { size: parseInt(X.ouvert.taillePs5, 10) } : {})
      + '<div class="rc-reperes lk-reveal"><p class="rc-reperes-k">' + S.pip('serie', true) + '</p><h3>' + esc(Tm.repereTitle) + '</h3>'
      + VT.figs(Tm.reperes.map(r => ({ n: r.n + ' ' + r.unit, label: r.label, accent: !!r.open })), { cls: 'rc-figs rc-figs--3' })
      + '<p class="rc-reperes-n">' + gta(Tm.repereNote) + ' ' + srcRef(SRC, 'gi-rdr2') + '</p></div>'));
    /* 4. la boîte (v8.04) : la jaquette officielle posée en boîte (face, tranche), qui s’ouvre à l’entrée : la carte du code glisse
       hors de la boîte, le disque barré se pose à côté (rien n’est une photo du produit : la jaquette officielle et des formes
       dessinées) ; les trois points à côté */
    const B = X.boite, Bs = B.scene;
    parts.push(sec({ id: 'boite', kicker: B.kicker, title: B.title, icon: 'kit', tone: 'paper2', lede: gta(B.lede) },
      '<div class="vt-split vt-split--top rc-boite"><div class="rc-box vt-tilt" data-lk-reveal data-vt-tilt="6"><div class="rc-box-3d"><span class="rc-box-face">' + VT.img('cover-art-officielle', 'La jaquette officielle de GTA VI : Jason et Lucia au centre, entourés de Boobie, Raul, un alligator et des scènes de Leonida, visuel officiel Rockstar Games', { sizes: '(max-width:899px) 62vw, 300px' }) + '</span><span class="rc-box-side" aria-hidden="true"></span></div>'
      + '<span class="rc-box-code" aria-hidden="true"><b>' + esc(Bs.code) + '</b><i class="rc-box-mask"></i></span><span class="rc-box-disc" aria-hidden="true">' + PIC.disque + '<b>' + esc(Bs.disque) + '</b></span></div>'
      + '<div>' + points(B.points, SRC, { n: 1 }) + '<p class="rc-more"><a href="editions.html#boite">' + esc(B.lien) + '</a></p></div></div>'));
    /* 5. ce qui n’est pas confirmé, et où ce sera annoncé (v8.04) : un tableau de bord de trois instruments : la jauge de stockage
       vide (« ? Go ») pour la taille, deux horloges qui tombent sur minuit pour les heures (ce que dit chaque source, rien de plus) */
    const P = X.pasConfirme;
    const instr = x => x.id === 'q-taille'
      ? '<div class="rc-gauge" aria-hidden="true"><b class="rc-gauge-n">? Go</b><span class="rc-gauge-bar">' + '<i></i>'.repeat(10) + '</span></div>'
      : '<div class="rc-clk" aria-hidden="true">' + clock() + '<b class="rc-clk-d">' + esc(x.jour) + '</b></div>';
    parts.push(sec({ id: 'pas-confirme', kicker: P.kicker, title: P.title, icon: 'sablier', tone: 'paper', accent: 'coral', lede: gta(P.lede) },
      '<ul class="rc-hud" data-lk-reveal>' + P.items.map((x, i) => '<li class="rc-hud-i' + (x.statut === 'officiel' ? ' is-known' : '') + '" id="' + esc(x.id) + '" style="--i:' + i + '">' + instr(x) + '<div class="rc-hud-b"><h3>' + gta(x.t) + '</h3><p>' + gta(x.d) + '</p>' + (x.statut ? '<p class="rc-stamp">' + S.pip(x.statut, true) + '</p>' : '') + (x.ou ? '<p class="rc-q-ou"><span>' + esc(P.ouLabel) + '</span> ' + links(SRC, x.ou) + '</p>' : '') + '</div></li>').join('') + '</ul>'
      + '<div class="ed-callout rc-callout rc-callout--maj"><p>' + gta(P.maj) + '</p></div>'));
    /* 6. avant le 12 novembre : la liste, à cocher, gardée sur l’appareil */
    const L = X.liste;
    parts.push(sec({ id: 'avant', kicker: L.kicker, title: L.title, icon: 'liste', tone: 'paper2', lede: gta(L.lede) }, VT.checklist(L.items.map(x => ({ title: gta(x.t), text: gta(x.d) })), 'preload', { done: gta(L.done) })
      + mosaique(L.mosaique)/* v8.01 : en attendant, les pages du site qui préparent la partie */));
    /* 7. FAQ + Léo ; 8. sources */
    parts.push(sec({ id: 'faq', kicker: X.faqKicker, title: X.faqTitle, icon: 'faq', tone: 'paper' }, VT.faqGrid(faqBlock(X.faq), leoAside(X.leo, 'jason-and-lucia-13', 'Jason et Lucia face à face dans la lumière du soir, un hélicoptère et un hydroglisseur derrière eux, visuel officiel Rockstar Games'))));
    parts.push(sec({ id: 'sources', kicker: X.sourcesKicker, title: X.sourcesTitle, icon: 'lire', tone: 'paper2', lede: gta(X.sourcesLede) }, srcList(SRC, Object.keys(SRC))));
    build(X, parts, { ld: [LDPage(X.file, X), faqLD(X.faq)] });
  }

  /* =============== 2. GTA VI sur PC : ce qu’on sait =============== */
  {
    const X = ED_ALL.pc, SRC = X.sources;
    let n = 0; const parts = [S.nav(X.nav, 'Sections de la page')];
    const sec = (o, body) => S.section({ ...o, num: ++n }, body);
    /* 1. ce que Rockstar a annoncé (v8.04) : un écran de sélection de plateforme (PS5 et Xbox Series allumées, PC verrouillé),
       les trois points alignés dessous ; ce que Take-Two a dit : deux transcriptions alignées */
    const O = X.officiel, Ec = O.ecran;
    const plat = '<div class="rc-plat" data-lk-reveal><div class="rc-plat-scr"><p class="rc-plat-k">' + esc(Ec.kicker) + '</p><ul class="rc-plat-l">'
      + Ec.items.map((p, i) => '<li class="rc-plat-i ' + (p.ferme ? 'is-locked' : 'is-on') + '" style="--i:' + i + '"><span class="rc-plat-ico" aria-hidden="true">' + PIC[p.pic] + (p.ferme ? '<span class="rc-plat-lock">' + PIC.cadenas + '</span>' : '') + '</span><b translate="no">' + esc(p.nom) + '</b><span class="rc-plat-s">' + esc(p.etat) + '</span></li>').join('') + '</ul></div>'
      + '<ul class="rc-plat-pts">' + O.points.map((p, i) => '<li class="rc-plat-pt' + (p.main ? ' is-main' : '') + '" style="--i:' + i + '"><span class="rc-plat-pt-ico" aria-hidden="true">' + S.icon(p.icon) + '</span><h3>' + gta(p.t) + '</h3><p>' + gta(p.d) + '</p>' + stamp(SRC, p.statut || 'officiel', p.src) + '</li>').join('') + '</ul></div>';
    parts.push(sec({ id: 'officiel', kicker: O.kicker, title: O.title, icon: 'statuts', tone: 'paper2', lede: gta(O.lede) },
      plat + (O.dits ? '<h3 class="ed-h3 rc-h3">' + esc(O.ditTitre) + '</h3><p class="rc-lede2">' + gta(O.ditLede) + '</p>' + clips(O.dits, SRC) : '')
      + mosaique(O.mosaique)/* v8.01 : le jeu annoncé, en images officielles */));
    /* 2. les précédents de la série (v8.04) : une course d’arcade : une piste par jeu, toutes partent de la sortie sur consoles ;
       la barre file jusqu’à la sortie sur PC (longueur = temps écoulé, un repère par année sur la piste), l’écart s’affiche en
       chiffres d’arcade ; GTA VI attend sur la ligne de départ. Les dates exactes sont écrites à côté de chaque piste. */
    const R = X.serie;
    const months = (a, b) => { const A = new Date(a + 'T12:00:00Z'), B = new Date(b + 'T12:00:00Z'); return Math.round((B - A) / (30.4375 * 864e5)); };
    const gap = m => m >= 24 ? R.ans.replace('{n}', String(Math.round(m / 12))) : R.mois.replace('{n}', String(m));
    const maxM = Math.max(...R.items.filter(x => x.pc).map(x => months(x.consoles, x.pc)));
    const lane = (x, i) => { const m = x.pc ? months(x.consoles, x.pc) : 0, p = x.pc ? Math.max(3, 100 * m / maxM) : 0, d = Math.round(420 + 880 * p / 100);
      return '<li class="rc-lane' + (x.pc ? '' : ' rc-lane--open') + '" style="--i:' + i + ';--p:' + p.toFixed(2) + '%;--d:' + d + 'ms">'
        + '<div class="rc-lane-h"><h3 translate="no">' + esc(x.jeu) + '</h3><p class="rc-lane-dates"><span><b>' + esc(R.consolesLabel) + '</b> <time datetime="' + esc(x.consoles) + '">' + esc(frDate(x.consoles)) + '</time></span><span><b>' + esc(R.pcLabel) + '</b> ' + (x.pc ? '<time datetime="' + esc(x.pc) + '">' + esc(frDate(x.pc)) + '</time>' : esc(R.openLabel)) + '</span></p><p class="rc-lane-f">' + S.pip(x.pc ? 'serie' : 'officiel', true) + srcRef(SRC, x.src) + '</p></div>'
        + '<div class="rc-lane-t"><span class="rc-lane-flag" aria-hidden="true">' + PIC.drapeau + '</span><span class="rc-lane-track" aria-hidden="true"><span class="rc-lane-run">' + (x.pc ? '<span class="rc-lane-end">' + PIC.arrivee + '</span>' : '') + '<span class="rc-lane-car">' + PIC.auto + '</span></span></span><b class="rc-lane-gap">' + esc(x.pc ? gap(m) : R.pcLabel + ' : ' + R.openLabel) + '</b></div></li>'; };
    parts.push(sec({ id: 'serie', kicker: R.kicker, title: R.title, icon: 'horloge', tone: 'paper', accent: 'coral', lede: gta(R.lede) },
      '<div class="rc-race" data-lk-reveal style="--yr:' + (1200 / maxM).toFixed(3) + '%"><div class="rc-race-hd"><span>' + esc(R.depart) + '</span><span>' + esc(R.echelle) + '</span><span>' + esc(R.arrivee) + '</span></div><ol class="rc-race-l">' + R.items.map(lane).join('') + '</ol></div>'
      + '<div class="ed-callout rc-callout"><p>' + gta(R.note) + (R.noteSrc ? ' ' + srcRef(SRC, R.noteSrc) : '') + '</p></div>'));
    /* 3. l’encadré « arnaque » */
    const A = X.arnaque;
    parts.push(sec({ id: 'arnaques', kicker: A.kicker, title: A.title, icon: 'droits', tone: 'night', accent: 'coral', lede: gta(A.lede) },
      '<div class="rc-alert lk-reveal"><p class="rc-alert-t">' + gta(A.phrase) + '</p>' + para(A.p) + '<ul class="rc-alert-l">' + A.regles.map(r => '<li>' + gta(r) + '</li>').join('') + '</ul><p class="rc-alert-f">' + esc(A.officielLabel) + ' ' + links(SRC, A.officiel) + '</p>' + (A.srcs ? '<p class="rc-stamp">' + S.pip('officiel', true) + A.srcs.map(id => srcRef(SRC, id)).join(', ') + (A.srcsVu ? '<span class="rc-stamp-sep" aria-hidden="true"></span>' + S.pip('vu', true) + A.srcsVu.map(id => srcRef(SRC, id)).join(', ') : '') + '</p>' : '') + '</div>'
      + vraiFaux(A.vraiFaux)/* v8.01 : la fausse page face à l’annonce officielle */));
    /* 4. où suivre l’annonce */
    const W = X.suivre;
    parts.push(sec({ id: 'suivre', kicker: W.kicker, title: W.title, icon: 'boussole', tone: 'paper2', lede: gta(W.lede) },
      /* v8.01 : chaque carte porte un visuel officiel (vitrine.cjs → card) */
      '<ul class="rc-follow vt-in vt-in--deal" data-lk-reveal>' + W.items.map((x, i) => '<li style="--i:' + i + '">' + VT.card({ href: x.href, media: x.media, alt: x.alt, kicker: x.k, title: x.t, text: x.d, go: x.go, cls: 'rc-follow-a', attrs: /^https?:/.test(x.href) ? ' target="_blank" rel="noopener nofollow"' : '' }, { sizes: '(max-width:719px) 84vw, 300px' }) + '</li>').join('') + '</ul>'));
    parts.push(sec({ id: 'faq', kicker: X.faqKicker, title: X.faqTitle, icon: 'faq', tone: 'paper' }, VT.faqGrid(faqBlock(X.faq), leoAside(X.leo, 'vice-city-10', 'Tours au bord de l’eau et bateaux dans la baie de Vice City, visuel officiel Rockstar Games'))));
    parts.push(sec({ id: 'sources', kicker: X.sourcesKicker, title: X.sourcesTitle, icon: 'lire', tone: 'paper2', lede: gta(X.sourcesLede) }, srcList(SRC, Object.keys(SRC))));
    build(X, parts, { ld: [LDPage(X.file, X), faqLD(X.faq)] });
  }

  /* =============== 3. GTA VI et GTA V : ce qui change =============== */
  {
    const X = ED_ALL.comparatif, SRC = X.sources;
    let n = 0; const parts = [S.nav(X.nav, 'Sections de la page')];
    const sec = (o, body) => S.section({ ...o, num: ++n }, body);
    /* 1. le tableau (v8.04) : un écran « VERSUS » : « VI » et « V » en très grand, le badge VS qui claque une fois ; chaque sujet est
       un duel (GTA VI d’un côté, GTA V de l’autre, le sujet, son icône et la page du site au centre). Dans la page, le sujet vient
       d’abord (lecteurs d’écran), puis GTA VI, puis GTA V ; au téléphone, un choix « Les deux, GTA VI, GTA V » (CSS seul). */
    const T = X.tableau;
    const side = (c, k, label) => '<div class="rc-vs-c rc-vs-c--' + k + '"><p class="rc-vs-v"><span class="rc-vs-tag">' + esc(label) + '<span class="sr-only"> : </span></span>' + gta(c.v) + '</p>' + (c.note ? '<p class="rc-vs-n">' + gta(c.note) + '</p>' : '') + '<p class="rc-vs-s">' + S.pip(c.statut, true) + (c.src ? srcRef(SRC, c.src) : '') + '</p></div>';
    const vs = '<div class="rc-vs"><div class="rc-vs-top" aria-hidden="true" data-lk-reveal><span class="rc-vs-big rc-vs-big--vi"></span><span class="rc-vs-badge"></span><span class="rc-vs-big rc-vs-big--v"></span></div>'
      + '<div class="rc-vs-heads" aria-hidden="true"><span class="rc-vs-h rc-vs-h--vi">' + esc(T.colVI) + '</span><span class="rc-vs-h rc-vs-h--v">' + esc(T.colV) + '</span></div>'
      + '<fieldset class="rc-vs-pick"><legend>' + esc(T.pick.label) + '</legend>' + [['deux', T.pick.deux], ['vi', T.pick.vi], ['v', T.pick.v]].map(([v, l], i) => '<label><input type="radio" name="rc-vs-pick" value="' + v + '"' + (i ? '' : ' checked') + '><span>' + esc(l) + '</span></label>').join('') + '</fieldset>'
      + '<ol class="rc-vs-l">' + T.rows.map((r, i) => '<li class="rc-vs-r" id="' + esc(r.id) + '" style="--i:' + i + '" data-lk-reveal><div class="rc-vs-mid"><span class="rc-vs-ico" aria-hidden="true">' + S.icon(r.icon) + '</span><h3>' + gta(r.sujet) + '</h3><a class="rc-vs-link" href="' + esc(r.href) + '">' + esc(r.label) + '</a></div>' + side(r.vi, 'vi', T.colVI) + side(r.v, 'v', T.colV) + '</li>').join('') + '</ol></div>';
    parts.push(sec({ id: 'tableau', kicker: T.kicker, title: T.title, icon: 'balance', tone: 'paper2', lede: gta(T.lede) }, vs + '<ul class="rc-legend"><li>' + S.pip('officiel', true) + ' ' + esc(T.legOfficiel) + '</li><li>' + S.pip('vu', true) + ' ' + esc(T.legVu) + '</li><li>' + S.pip('serie', true) + ' ' + esc(T.legSerie) + '</li><li>' + S.pip('conf', true) + ' ' + esc(T.legConf) + '</li></ul>'));
    /* 2. la carte, mot pour mot (v8.04) : les deux citations, alignées ; puis la proportion rapportée en superposition : le carré
       GTA VI porte le fond de carte du site (reconstruction communautaire, dite comme telle), le carré GTA V une trame de référence,
       à la moitié de la surface ; un curseur fait glisser GTA V sur GTA VI (vitrine.js). Aucune image de la carte de GTA V : on
       ne la dessine pas. */
    const M = X.carte, Ov = M.superpose;
    const ov = '<div class="rc-ov" data-rc-ov data-lk-reveal><div class="rc-ov-stage" style="--t:0">'
      + '<div class="rc-ov-vi"><img src="img/leonida-carte.svg" width="520" height="600" alt="' + esc(Ov.alt) + '" loading="lazy" decoding="async"><span class="rc-ov-l"><b translate="no">GTA VI</b><span>' + esc(Ov.vi) + '</span></span></div>'
      + '<div class="rc-ov-v5"><span class="rc-ov-l"><b translate="no">GTA V</b><span>' + esc(Ov.v) + '</span></span><span class="rc-ov-half">' + esc(Ov.moitie) + '</span></div></div>'
      + '<label class="rc-ov-ctl" hidden><span>' + esc(Ov.curseur) + '</span><input type="range" min="0" max="100" step="1" value="0" data-rc-ov-in></label>'
      + '<p class="rc-ov-cap">' + S.pip(Ov.statut, true) + ' ' + gta(Ov.caption) + '</p></div>';
    parts.push(sec({ id: 'carte', kicker: M.kicker, title: M.title, icon: 'carte', tone: 'paper', accent: 'coral', lede: gta(M.lede) },
      clips(M.citations, SRC) + '<div class="vt-split vt-split--top rc-carte"><div>' + para(M.p) + '</div>' + ov + '</div>'
      + '<p class="rc-more"><a href="carte.html">' + esc(M.lien) + '</a><a href="lieux.html">' + esc(M.lien2) + '</a></p>'
      + mosaique(M.regions)/* v8.01 : les six régions, une tuile chacune */));
    /* 3. ce qui est nouveau (v8.04) : six cartes-liens, chacune avec son statut et sa source écrits (sans lien imbriqué) ; à
       l’entrée, l’image se découvre et le badge « Nouveau » clignote une fois, comme un objet débloqué ; au clic, la carte s’enfonce */
    const N = X.nouveau;
    parts.push(sec({ id: 'nouveau', kicker: N.kicker, title: N.title, icon: 'film', tone: 'night', lede: gta(N.lede) },
      '<ul class="rc-new" data-lk-reveal>' + N.items.map((p, i) => '<li style="--i:' + i + '"><a class="rc-new-a" href="' + esc(p.href) + '"><span class="rc-new-m">' + VT.img(p.media, p.alt, { sizes: '(max-width:719px) 92vw, 420px' }) + '<span class="rc-new-badge">' + esc(N.badge) + '</span></span><span class="rc-new-b"><h3 class="rc-new-t">' + gta(p.t) + '</h3><span class="rc-new-d">' + gta(p.d) + '</span>' + stText(SRC, p.statut || 'vu', p.src) + '<span class="vt-go">' + esc(N.go) + '</span></span></a></li>').join('') + '</ul>'
      + '<p class="rc-stamp rc-stamp--sec">' + esc(N.srcLabel) + ' ' + [...new Set(N.items.map(p => p.src))].map(id => srcRef(SRC, id)).join(', ') + '</p>'));
    /* 4. ce qu’on ne peut pas encore comparer (v8.04) : six cartes-liens, chacune vers la page du site qui en parle */
    const P = X.pasEncore;
    parts.push(sec({ id: 'pas-encore', kicker: P.kicker, title: P.title, icon: 'sablier', tone: 'paper2', accent: 'coral', lede: gta(P.lede) },
      '<ul class="rc-qs2" data-lk-reveal>' + P.items.map((x, i) => '<li id="' + esc(x.id) + '" style="--i:' + i + '"><a class="rc-q2' + (x.media ? ' vt-has-bg' : '') + '" href="' + esc(x.href) + '">' + (x.media ? VT.bg(x.media, x.mediaAlt) : '') + '<span class="rc-q2-ico" aria-hidden="true">' + S.icon(x.ico) + '<b>?</b></span><h3>' + gta(x.t) + '</h3><span class="rc-q2-d">' + gta(fillN(x.d)) + '</span><span class="vt-go">' + esc(x.go) + '</span></a></li>').join('') + '</ul>'));
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
    const line = v => '<li class="rc-veh"><a class="rc-veh-a" href="vehicules/' + esc(v.id) + '.html"><b translate="no">' + esc(v.nom) + '</b></a><span class="rc-veh-arrow" aria-hidden="true">' + VT.SVG.next + '</span><span class="rc-veh-r">' + esc(v.insp || v.reelNom || B.nonIdentifie) + '</span>' + S.pip(v.st, true) + '</li>';
    const brandBlock = (k, i) => { const list = by.get(k).slice().sort((a, b) => S.fold(a.nom).localeCompare(S.fold(b.nom))), unknown = k === UNKNOWN, id = unknown ? 'marque-inconnue' : 'marque-' + slug(k);
      return '<section class="rc-brand lk-reveal" id="' + id + '" aria-labelledby="' + id + '-t"><div class="rc-brand-h"><span class="ed-brand-mono ed-brand-mono--' + ['amber', 'coral', 'night', 'ink'][i % 4] + '" aria-hidden="true">' + esc(unknown ? '?' : S.initials(k)) + '</span><div><h3 id="' + id + '-t"' + (unknown ? '' : ' translate="no"') + '>' + esc(unknown ? B.inconnueTitre : k) + '</h3><p class="rc-brand-ev">' + (unknown ? gta(B.inconnueTexte) : evoque[k] ? esc(evoque[k]) : esc(B.sansRapprochement)) + ', <b>' + list.length + ' ' + esc(list.length > 1 ? B.vehicules : B.vehicule) + '</b></p></div></div>'
        + (list.length > B.repli ? '<details class="rc-brand-d"><summary>' + esc(B.voir.replace('{n}', String(list.length))) + '</summary><ul class="rc-vehs">' + list.map(line).join('') + '</ul></details>' : '<ul class="rc-vehs">' + list.map(line).join('') + '</ul>') + '</section>'; };
    const index = '<nav class="rc-brandidx" aria-label="' + esc(B.indexLabel) + '"><ul>' + order.map(k => '<li><a href="#' + (k === UNKNOWN ? 'marque-inconnue' : 'marque-' + slug(k)) + '"' + (k === UNKNOWN ? '' : ' translate="no"') + '>' + esc(k === UNKNOWN ? B.inconnueCourt : k) + ' <b>' + by.get(k).length + '</b></a></li>').join('') + '</ul></nav>';
    parts.push(sec({ id: 'marques', kicker: B.kicker.replace('{n}', String(N.marques)), title: B.title, icon: 'marques', tone: 'paper', accent: 'coral', lede: gta(fill(B.lede)) }, index + '<div class="rc-brands">' + order.map(brandBlock).join('') + '</div>'));
    /* 3. comment on identifie (statuts), jamais des partenaires */
    const Mth = X.methode;
    parts.push(sec({ id: 'methode', kicker: Mth.kicker, title: Mth.title, icon: 'loupe', tone: 'night', lede: gta(Mth.lede) },
      '<div class="ed-cols rc-method">' + Mth.cols.map(c => '<div class="ed-col lk-reveal"><h3>' + (c.statut ? S.pip(c.statut, true) : '') + esc(c.titre) + '</h3>' + para(c.p.map(fill)) + '</div>').join('') + '</div>'
      + '<p class="rc-more"><a href="verification.html#modeles">' + esc(Mth.lien) + '</a><a href="vehicules.html#marques">' + esc(Mth.lien2) + '</a><a href="atelier-3d.html">' + esc(Mth.lien3) + '</a></p>'));
    parts.push(sec({ id: 'faq', kicker: X.faqKicker, title: X.faqTitle, icon: 'faq', tone: 'paper2' }, VT.faqGrid(faqBlock(X.faq.map(q => ({ ...q, a: fill(q.a) }))), leoAside(X.leo, 'ultimate-edition-rideout-customs-03', 'Coupé jaune surélevé dans l’atelier Rideout Customs, visuel officiel Rockstar Games'))));
    const ld = Object.assign(LDPage(X.file, X, { '@type': 'CollectionPage' }), { mainEntity: { '@type': 'ItemList', name: X.title, numberOfItems: V.length, itemListOrder: 'https://schema.org/ItemListUnordered', itemListElement: order.flatMap(k => by.get(k)).map((v, i) => ({ '@type': 'ListItem', position: i + 1, name: nomJeu(v), url: SITE + '/vehicules/' + v.id + '.html' })) } });
    build(X, parts, { ld: [ld, faqLD(X.faq.map(q => ({ ...q, a: fill(q.a) })))] });
    fs.writeFileSync(path.join(__dirname, 'vraies-voitures-chiffres.json'), JSON.stringify(N) + '\n');/* lus par les tests (nombres de la page = données) */
  }
  console.log('Pages v7.93 régénérées : prechargement.html, gta-6-pc.html, gta-6-vs-gta-5.html, vraies-voitures.html.');
};
