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
  /* encadré « Ce qui n’est pas confirmé » : tuiles sombres à point d’interrogation (comme Ce qui est confirmé) */
  /* v8.01 : un visuel officiel en fond de chaque question, assombri, qui s’éclaire au survol (vitrine.css, 31) */
  const openQs = items => '<ul class="vf-qs rc-qs vt-in" data-lk-reveal>' + items.map((x, i) => '<li class="vf-q' + (x.media ? ' vt-has-bg' : '') + '" id="' + esc(x.id) + '" style="--i:' + i + '">' + (x.media ? VT.bg(x.media, x.mediaAlt) : '') + '<span class="vf-q-ico">' + S.icon(x.ico) + '<b class="vt-stamp" aria-hidden="true">?</b></span><h3>' + gta(x.t) + '</h3><p>' + gta(x.d) + '</p>' + (x.ou ? '<p class="rc-q-ou"><span>' + esc(x.ouLabel) + '</span> ' + x.ou + '</p>' : '') + '</li>').join('') + '</ul>';
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
  const mosaique = (M, cls) => '<div class="rc-mosaic' + (cls ? ' ' + cls : '') + '"><h3 class="ed-h3 rc-h3">' + gta(M.titre) + '</h3><p class="rc-lede2">' + gta(M.lede) + '</p>' + VT.mosaic(M.items.map(x => ({ ...x, go: M.go })), { cls: 'rc-mosaic-l' }) + '</div>';
  /* v8.01 : la console dessinée (recherches.css, 9) : la vignette du jeu avec la jaquette officielle, une barre en attente qui
     respire, les deux dates ; tout est écrit en texte (traduit comme le reste), rien n’est une capture d’écran de console */
  const console_ = (A, size) => '<figure class="rc-console lk-reveal"><div class="rc-console-screen"><p class="rc-console-k">' + esc(A.kicker) + '</p><div class="rc-console-tile"><span class="rc-console-cover">' + VT.img('cover-art-officielle', 'La jaquette officielle de GTA VI, visuel officiel Rockstar Games', { sizes: '96px' }) + '</span><span class="rc-console-txt"><b>' + gta(A.label) + '</b><small>' + esc(A.sub) + '</small></span></div><div class="rc-console-bar' + (size ? ' rc-console-bar--on' : '') + '"><i aria-hidden="true"></i><span>' + esc(A.bar) + '</span></div><p class="rc-console-meta"><span>' + esc(size ? size : A.size) + '</span><span>' + esc(A.play) + '</span></p></div><div class="rc-console-base" aria-hidden="true"><i></i></div></figure>';
  /* v8.01 : vrai ou faux (recherches.css, 10) : ce qu’on propose (tampon « Faux ») face à ce qui existe (tampon « Officiel ») */
  const vraiFaux = VF => '<div class="rc-vf"><h3 class="ed-h3 rc-h3">' + gta(VF.titre) + '</h3><div class="rc-vf-grid">' + [['faux', VF.faux], ['vrai', VF.vrai]].map(([k, c], i) => '<div class="rc-vf-card rc-vf-card--' + k + ' lk-reveal" style="--i:' + i + '"><span class="rc-vf-stamp vt-stamp" aria-hidden="true">' + esc(c.stamp) + '</span><span class="sr-only">' + esc(c.stamp) + ' : </span><p class="rc-vf-k">' + esc(c.k) + '</p><p class="rc-vf-t">' + gta(c.t) + '</p><ul class="rc-vf-l">' + c.lines.map(l => '<li>' + gta(l) + '</li>').join('') + '</ul><p class="rc-vf-f">' + gta(c.foot) + '</p></div>').join('') + '</div></div>';
  /* la marche à suivre d’une console : titre, étapes illustrées (vitrine.css, 7), statut et source */
  const howto = (c, SRC) => '<div class="rc-howto"><h3 class="rc-howto-t"><span class="ed-col-ico">' + S.icon(c.icon) + '</span>' + esc(c.titre) + '</h3>' + VT.steps(c.steps.map(s => ({ title: s.t, text: s.d, ill: ILL[s.ill] })), { cls: 'rc-steps' }) + '<p class="rc-stamp">' + S.pip('officiel', true) + srcRef(SRC, c.src) + '</p></div>';

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
    /* 2. comment précharger (PS5, Xbox), d’après les pages d’assistance officielles : étapes dessinées */
    const C = X.comment;
    parts.push(sec({ id: 'comment', kicker: C.kicker, title: C.title, icon: 'conduite', tone: 'paper', accent: 'coral', lede: gta(C.lede) },
      '<div class="rc-howtos">' + C.consoles.map(c => howto(c, SRC)).join('') + '</div><div class="ed-callout rc-callout"><p>' + gta(C.note) + '</p></div>'));
    /* 3. le temps de téléchargement : calcul du visiteur (taille tapée, débit tapé) et repère de la série */
    const Tm = X.temps;
    parts.push(sec({ id: 'temps', kicker: Tm.kicker, title: Tm.title, icon: 'calcul', tone: 'night', lede: gta(Tm.lede) },
      VT.dlCalc(Tm.calc, X.etat === 'ouvert' && X.ouvert.taillePs5 ? { size: parseInt(X.ouvert.taillePs5, 10) } : {})
      + '<div class="rc-reperes lk-reveal"><p class="rc-reperes-k">' + S.pip('serie', true) + '</p><h3>' + esc(Tm.repereTitle) + '</h3>'
      + VT.figs(Tm.reperes.map(r => ({ n: r.n + ' ' + r.unit, label: r.label, accent: !!r.open })), { cls: 'rc-figs rc-figs--3' })
      + '<p class="rc-reperes-n">' + gta(Tm.repereNote) + ' ' + srcRef(SRC, 'gi-rdr2') + '</p></div>'));
    /* 4. la boîte : la jaquette officielle à côté des trois points */
    const B = X.boite;
    parts.push(sec({ id: 'boite', kicker: B.kicker, title: B.title, icon: 'kit', tone: 'paper2', lede: gta(B.lede) },
      '<div class="vt-split vt-split--top rc-boite"><figure class="rc-boite-fig lk-reveal" data-vt-tilt="6">' + VT.img('cover-art-officielle', 'La jaquette officielle de GTA VI : Jason et Lucia au centre, entourés de Boobie, Raul, un alligator et des scènes de Leonida, visuel officiel Rockstar Games', { sizes: '(max-width:899px) 70vw, 380px' }) + '<figcaption>' + esc(B.credit || 'Jaquette officielle, Rockstar Games') + '</figcaption></figure><div>' + points(B.points, SRC, { n: 1 }) + '<p class="rc-more"><a href="editions.html#boite">' + esc(B.lien) + '</a></p></div></div>'));
    /* 5. ce qui n’est pas confirmé, et où ce sera annoncé */
    const P = X.pasConfirme;
    parts.push(sec({ id: 'pas-confirme', kicker: P.kicker, title: P.title, icon: 'sablier', tone: 'paper', accent: 'coral', lede: gta(P.lede) },
      openQs(P.items.map(x => ({ ...x, ouLabel: P.ouLabel, ou: x.ou ? links(SRC, x.ou) : null })))
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
    /* 1. ce que Rockstar a annoncé : trois points ; ce que Take-Two a dit : deux coupures de presse */
    const O = X.officiel;
    parts.push(sec({ id: 'officiel', kicker: O.kicker, title: O.title, icon: 'statuts', tone: 'paper2', lede: gta(O.lede) },
      points(O.points, SRC) + (O.dits ? '<h3 class="ed-h3 rc-h3">' + esc(O.ditTitre) + '</h3><p class="rc-lede2">' + gta(O.ditLede) + '</p>' + clips(O.dits, SRC) : '')
      + mosaique(O.mosaique)/* v8.01 : le jeu annoncé, en images officielles */));
    /* 2. les précédents de la série : une frise datée, consoles puis PC, avec l’écart ; GTA VI reste une ligne ouverte */
    const R = X.serie;
    const months = (a, b) => { const A = new Date(a + 'T12:00:00Z'), B = new Date(b + 'T12:00:00Z'); return Math.round((B - A) / (30.4375 * 864e5)); };
    const gap = m => m >= 24 ? R.ans.replace('{n}', String(Math.round(m / 12))) : R.mois.replace('{n}', String(m));
    parts.push(sec({ id: 'serie', kicker: R.kicker, title: R.title, icon: 'horloge', tone: 'paper', accent: 'coral', lede: gta(R.lede) },
      VT.dated({ from: R.axe.from, to: R.axe.to, ticks: R.axe.ticks, aLabel: R.consolesLabel, bLabel: R.pcLabel, openLabel: R.openLabel,
        rows: R.items.map(x => ({ label: x.jeu, a: { iso: x.consoles, label: frDate(x.consoles) }, b: x.pc ? { iso: x.pc, label: frDate(x.pc) } : null, gap: x.pc ? gap(months(x.consoles, x.pc)) : '', foot: S.pip(x.pc ? 'serie' : 'officiel', true) + srcRef(SRC, x.src) })) })
      + '<div class="ed-callout rc-callout"><p>' + gta(R.note) + '</p></div>'));
    /* 3. l’encadré « arnaque » */
    const A = X.arnaque;
    parts.push(sec({ id: 'arnaques', kicker: A.kicker, title: A.title, icon: 'droits', tone: 'night', accent: 'coral', lede: gta(A.lede) },
      '<div class="rc-alert lk-reveal"><p class="rc-alert-t">' + gta(A.phrase) + '</p>' + para(A.p) + '<ul class="rc-alert-l">' + A.regles.map(r => '<li>' + gta(r) + '</li>').join('') + '</ul><p class="rc-alert-f">' + esc(A.officielLabel) + ' ' + links(SRC, A.officiel) + '</p>' + (A.srcs ? '<p class="rc-stamp">' + S.pip('officiel', true) + A.srcs.map(id => srcRef(SRC, id)).join(', ') + '</p>' : '') + '</div>'
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
    /* 1. le tableau : une ligne par sujet, GTA VI (confirmé, source) face à GTA V (repère de la série), lien vers la page du site */
    const T = X.tableau;
    const cell = (c, cls) => '<td class="' + cls + '" data-l="' + esc(cls === 'rc-cmp-vi' ? T.colVI : T.colV) + '"><span class="rc-cmp-v">' + gta(c.v) + '</span>' + (c.note ? '<span class="rc-cmp-n">' + gta(c.note) + '</span>' : '') + '<span class="rc-cmp-s">' + S.pip(c.statut, true) + (c.src ? srcRef(SRC, c.src) : '') + '</span></td>';
    const table = '<div class="rc-cmp-wrap"><table class="rc-cmp"><caption class="sr-only">' + esc(T.caption) + '</caption><thead><tr><th scope="col">' + esc(T.colSujet) + '</th><th scope="col" class="rc-cmp-vi">' + esc(T.colVI) + '</th><th scope="col">' + esc(T.colV) + '</th></tr></thead><tbody>'
      + T.rows.map(r => '<tr id="' + esc(r.id) + '"><th scope="row"><span class="rc-cmp-ico">' + S.icon(r.icon) + '</span><span class="rc-cmp-sub">' + gta(r.sujet) + '</span><a class="rc-cmp-link" href="' + esc(r.href) + '">' + esc(r.label) + '</a></th>' + cell(r.vi, 'rc-cmp-vi') + cell(r.v, 'rc-cmp-v5') + '</tr>').join('') + '</tbody></table></div>';
    parts.push(sec({ id: 'tableau', kicker: T.kicker, title: T.title, icon: 'balance', tone: 'paper2', lede: gta(T.lede) }, table + '<ul class="rc-legend"><li>' + S.pip('officiel', true) + ' ' + esc(T.legOfficiel) + '</li><li>' + S.pip('vu', true) + ' ' + esc(T.legVu) + '</li><li>' + S.pip('serie', true) + ' ' + esc(T.legSerie) + '</li><li>' + S.pip('conf', true) + ' ' + esc(T.legConf) + '</li></ul>'));
    /* 2. la carte, mot pour mot : les deux coupures, le rapport des deux cartes en surfaces, et ce que ça veut dire */
    const M = X.carte, Eh = M.echelle;
    parts.push(sec({ id: 'carte', kicker: M.kicker, title: M.title, icon: 'carte', tone: 'paper', accent: 'coral', lede: gta(M.lede) },
      clips(M.citations, SRC) + '<div class="vt-split vt-split--top rc-carte"><div>' + para(M.p) + '</div>' + VT.areas(Eh.a, Eh.b, S.pip(Eh.statut, true) + ' ' + gta(Eh.caption)) + '</div>'
      + '<p class="rc-more"><a href="carte.html">' + esc(M.lien) + '</a><a href="lieux.html">' + esc(M.lien2) + '</a></p>'
      + mosaique(M.regions)/* v8.01 : les six régions, une tuile chacune */));
    /* 3. ce qui est nouveau d’après les présentations officielles */
    const N = X.nouveau;
    parts.push(sec({ id: 'nouveau', kicker: N.kicker, title: N.title, icon: 'film', tone: 'night', lede: gta(N.lede) },
      '<ul class="vt-cards vt-cards--3 vt-in vt-in--deal rc-cards" data-lk-reveal>' + N.items.map((p, i) => '<li style="--i:' + i + '">' + VT.card({ href: p.href, media: p.media, alt: p.alt, title: p.t, text: p.d, go: N.go }, { sizes: '(max-width:719px) 92vw, 420px' }) + '</li>').join('') + '</ul>'
      + '<p class="rc-stamp rc-stamp--sec">' + S.pip('vu', true) + esc(N.statut) + ', ' + N.src.map(id => srcRef(SRC, id)).join(', ') + '</p>'));
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
