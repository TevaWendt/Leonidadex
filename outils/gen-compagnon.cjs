#!/usr/bin/env node
'use strict';
/* v7.89 (lot 5) : « Mode compagnon ». Écrit, depuis outils/compagnon.json :
   - compagnon.html : les quatre outils du joueur en grandes tuiles, l'état « prêt sans réseau » et le bouton qui prépare
     les pages clés (le service worker sw.js fait le travail), l'installation de l'appli, « Garder l'écran allumé », le
     transfert du suivi d'un appareil à l'autre (lien, QR code, fichier ; transfert.js) et les questions fréquentes ;
   - hors-ligne.html : la page que le service worker montre quand une page n'est pas gardée et que le réseau manque
     (noindex ; adresses absolues, comme 404.html : elle s'affiche à n'importe quelle adresse) ; elle liste les pages gardées ;
   - le bloc « Passer sur un autre appareil » de progression.html (entre les marqueurs transfert:debut / transfert:fin), avec
     le même bouton et le même composant que la page compagnon ;
   - manifest.webmanifest (le manifeste français, outils/appli.cjs ; ceux des autres langues sont écrits par outils/langues.cjs).
   La recherche du site lit la page elle-même (outils/sync-site.cjs : titre, description et mots du joueur).
   Le gabarit (en-tête, pied de page, scripts communs) est repris d'a-propos.html, comme les autres générateurs ; menu, pied de
   page, empreintes, langues et typographie sont posés ensuite par outils/sync-site.cjs.
   Usage : node outils/gen-compagnon.cjs   (appelé par outils/regenerer.cjs avant gen-informations.cjs) */
const fs = require('node:fs'), path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const S = require('./sections.cjs'), V = require('./lot-c-visuals.cjs');
const VT = require('./vitrine.cjs'), IL = require('./compagnon-illus.cjs'); /* v7.92 : briques des pages enrichies, dessins de la page */
const VTX = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/vitrine.json'), 'utf8'));
const esc = S.esc, SITE = 'https://www.leonidakit.com', DATA = 'outils/compagnon.json';

/* pictogrammes (24 × 24, trait du site ; la classe « ac » reçoit la couleur d'accent) */
const ICO = {
  carte: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle class="ac" cx="12" cy="10" r="2.4"/>',
  carnets: '<path d="M3.5 6.2l1.8 1.8 3.2-3.4M3.5 12.2l1.8 1.8 3.2-3.4M3.5 18.2l1.8 1.8 3.2-3.4"/><path class="ac" d="M11.5 6.5h9M11.5 12.5h9M11.5 18.5h6"/>',
  calcul: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect class="ac" x="8" y="6" width="8" height="3" rx=".6"/><path d="M8.5 13h1M12 13h1M15.5 13h1M8.5 17h1M12 17h1M15.5 17h1"/>',
  leo: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/><path class="ac" d="M10 7v5.5h4"/>',
  reseau: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.3a9.5 9.5 0 0 1 13 0M8.6 15.5a5 5 0 0 1 6.8 0"/><circle class="ac" cx="12" cy="19" r="1.4"/>',
  installer: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.2"/><path class="ac" d="M12 7v7M9 11.5l3 3 3-3"/><path d="M10.5 18.5h3"/>',
  transfert: '<rect x="2.5" y="5" width="7.5" height="14" rx="1.6"/><rect x="14" y="5" width="7.5" height="14" rx="1.6"/><path class="ac" d="M10.5 10h3M12 8.5l1.5 1.5-1.5 1.5M13.5 14h-3M12 12.5 10.5 14l1.5 1.5"/>',
  faq: S.ICONS.faq
};
const ico = (name, cls) => '<svg class="' + (cls || 'cp-ico') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICO[name] + '</svg>';
/* section du moteur commun (outils/sections.cjs) avec un pictogramme de cette page dans sa marque */
const sec = (opts, body, pictogramme) => { const html = S.section(opts, body); return pictogramme ? html.replace('</span></div><div class="ed-titles">', '</span>' + ico(pictogramme, 'ed-ico') + '</div><div class="ed-titles">') : html; };
const metaDesc = t => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (t.length > 155) throw new Error('description trop longue (' + t.length + ' signes) : ' + t); return t; };

function load(root = ROOT) {
  const D = JSON.parse(fs.readFileSync(path.join(root, DATA), 'utf8'));
  const MED = JSON.parse(fs.readFileSync(path.join(root, 'outils/medias-officiels.json'), 'utf8'));
  const err = [];
  for (const p of D.compagnon.pile) { if (!MED[p.media]) err.push('visuel inconnu : ' + p.media); if (!/visuel officiel Rockstar Games$/.test(p.alt)) err.push('texte alternatif sans crédit : ' + p.media); }
  for (const t of D.compagnon.tuiles.liste) { if (!ICO[t.icone]) err.push('pictogramme inconnu : ' + t.icone); if (!fs.existsSync(path.join(root, t.href.split('#')[0]))) err.push('page absente : ' + t.href); }
  for (const x of D.horsLigne.secours) if (!fs.existsSync(path.join(root, x.href)) && x.href !== 'compagnon.html') err.push('page absente : ' + x.href);
  if (err.length) throw new Error('Données de la page Mode compagnon :\n- ' + err.join('\n- '));
  return { D, MED };
}

/* gabarit d'a-propos.html : icône du site, en-tête, pied de page, scripts communs (sans ceux propres à la page) */
function chromeOf(s) {
  const pick = re => { const m = s.match(re); if (!m) throw new Error('gabarit introuvable : ' + re); return m[0]; };
  return {
    fav: pick(/<link rel="icon"[^>]*>/),
    header: pick(/<header>[\s\S]*?<\/header>/).replace(/ class="here" aria-current="page"| class="here"/g, ''),
    footer: pick(/<footer>[\s\S]*?<\/footer>/),
    scripts: (s.match(/<script(?: type="lk\/lazy")? src="[^"]*"><\/script>/g) || []).filter(x => !/lk-showcase\.js|lk-visionneuse\.js/.test(x)).map(x => x.replace(/\?v=[a-f0-9]+/, '')).join('\n')
  };
}
const absolu = html => html.replace(/(\s(?:href|src)=")(?!\/|#|[a-z]+:)([^"]+)"/g, '$1/$2"');
function page(C, { p, lang = 'fr', title, desc, canonical, canon, robots, ogImg, body, crumbs, ld = '', css = [], js = [], lazy = [], cls }) {
  const bc = crumbs ? '\n<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: crumbs.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it[0], item: SITE + it[1] })) }) + '</script>' : '';
  const scripts = (p === '/' ? absolu(C.scripts) : C.scripts) + lazy.map(f => '\n<script type="lk/lazy" src="' + p + f + '"></script>').join('') + js.map(f => '\n<script src="' + p + f + '"></script>').join('');
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(title)}</title>
<meta name="description" content="${esc(metaDesc(desc))}">${robots ? '\n<meta name="robots" content="' + robots + '">' : ''}
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(metaDesc(desc))}">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta name="theme-color" content="#FDFBF7">
<meta name="color-scheme" content="light">${canonical || canon ? '\n<link rel="canonical" href="' + SITE + (canonical || canon) + '">' : ''}
${C.fav}${bc}${ld ? '\n' + ld : ''}
<link rel="stylesheet" href="${p}style.css">
<link rel="stylesheet" href="${p}motion-tokens.css">
${css.map(f => '<link rel="stylesheet" href="' + p + f + '">').join('\n')}${canonical ? '\n<meta property="og:image" content="' + SITE + (ogImg || '/img/social-card.png') + '">\n<meta name="twitter:card" content="summary_large_image">\n<meta property="og:url" content="' + SITE + canonical + '">' : ''}
</head>
<body>

<a class="skip" href="#main">Aller au contenu</a>
<div class="sunset" aria-hidden="true"></div>

${p === '/' ? absolu(C.header) : C.header}

<main id="main" class="${cls}">
${body}
</main>
${p === '/' ? absolu(C.footer) : C.footer}

${scripts}
</body>
</html>
`;
}

/* ---------- briques communes aux deux pages qui envoient un suivi (compagnon, progression) ---------- */
/* Composant « envoyer » : bouton, puis résumé, QR code, lien, copier, partager, agrandir (transfert.js) */
function blocEnvoi(T, opts = {}) {
  const h = opts.h || 'h3';
  return `<div class="cp-envoi" data-tr-envoi>
  <${h} class="cp-h3">${esc(opts.titre || T.envoyerTitre)}</${h}>
  <p class="cp-txt">${opts.texteHtml || esc(T.envoyerTexte)}</p>
  <p class="cp-row" data-cp-js hidden><button type="button" class="cp-btn" data-tr-creer>${esc(T.bouton)}</button></p>
  <div class="cp-resultat" data-tr-resultat hidden>
    <p class="cp-resume" data-tr-resume></p>
    <div class="cp-qr" data-tr-qr></div>
    <label class="cp-champ"><span>Lien de transfert</span><input type="text" readonly data-tr-lien spellcheck="false" autocomplete="off"></label>
    <p class="cp-row"><button type="button" class="cp-btn cp-btn--ghost" data-tr-copier>Copier le lien</button><button type="button" class="cp-btn cp-btn--ghost" data-tr-partager hidden>Partager</button><button type="button" class="cp-btn cp-btn--ghost" data-tr-agrandir hidden>Agrandir le QR code</button></p>
    <p class="cp-note cp-note--prudence">${esc(T.prudence)}</p>
  </div>
  <p class="cp-msg" data-tr-msg aria-live="polite"></p>
  <noscript><p class="cp-note">Le transfert demande que ton navigateur lance les scripts du site.</p></noscript>
</div>`;
}
const dialogueQR = () => '<dialog class="cp-qr-dialog" data-tr-dialogue aria-label="QR code du lien de transfert"><div class="cp-qr-dialog-in"><div class="cp-qr cp-qr--grand" data-tr-qr-grand></div><p class="cp-note">Scanne-le avec l’appareil photo de l’autre appareil.</p><button type="button" class="cp-btn" data-tr-fermer>Fermer</button></div></dialog>';

/* ---------- compagnon.html ---------- */
function compagnonPage(ctx) {
  const { D, MED, C } = ctx, X = D.compagnon;
  const pile = V.stack(X.pile.map(x => { const m = MED[x.media]; return { src: m.variants[0].src, big: (m.variants.find(v => v.w === 1280) || m.variants[0]).src, alt: x.alt, caption: x.caption }; }), { label: X.pileLabel });
  /* v7.92 : moment de la page — la scène « console et téléphone » : la télévision montre le jeu (visuel officiel), le
     téléphone l'outil dont parle l'étape lue ; l'écran change au défilement (compagnon.js), sans script ou en « réduire les
     animations » chaque étape montre son propre écran. Les dessins n'ont aucun mot (outils/compagnon-illus.cjs). */
  /* la télévision : visuel officiel des briques (800 px au plus au téléphone), décoratif (la scène est aria-hidden) */
  const scene = '<div class="cp-scene" aria-hidden="true"><div class="cp-tv"><div class="cp-tv-screen">' + VT.img(X.tuiles.tele.media, '', { sizes: '(max-width:899px) 80vw, 520px' }) + '</div><span class="cp-tv-foot"></span></div>'
    + '<div class="cp-console"><span></span></div>'
    + '<div class="cp-phone"><div class="cp-phone-in">' + X.tuiles.liste.map((t, i) => '<div class="cp-scr' + (i ? '' : ' is-on') + '" data-cp-scr="' + esc(t.ecran) + '">' + IL.SCREENS[t.ecran] + '</div>').join('') + '</div></div></div>';
  const story = '<div class="cp-story-wrap" data-cp-story><div class="cp-story-stage">' + scene + '</div><ol class="cp-story">' + X.tuiles.liste.map((t, i) => '<li class="cp-story-i' + (i ? '' : ' is-on') + '" data-cp-step="' + esc(t.ecran) + '">'
    + '<div class="cp-story-mini" aria-hidden="true"><div class="cp-phone cp-phone--mini"><div class="cp-phone-in"><div class="cp-scr is-on">' + IL.SCREENS[t.ecran] + '</div></div></div></div>'
    + '<div class="cp-story-b"><p class="cp-story-k"><span class="cp-story-ico">' + ico(t.icone) + '</span><span class="cp-story-n">' + String(i + 1).padStart(2, '0') + '</span></p><h3 class="cp-story-t">' + esc(t.titre) + '</h3><p class="cp-story-d">' + esc(t.texte) + '</p>'
    + '<ul class="cp-story-p">' + t.points.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>'
    + '<a class="cp-btn" href="' + esc(t.href) + '"' + (t.leo ? ' data-cp-leo' : '') + '>' + esc(t.ouvrir) + '</a></div></li>').join('') + '</ol></div>';
  const R = X.reseau, I = X.installer, T = X.transfert;
  const reseau = `<div class="cp-etat" data-cp-etat="s-inconnu">
  <span class="cp-etat-ico" aria-hidden="true">${ico('reseau', 'cp-etat-svg')}</span>
  <div class="cp-etat-txt" aria-live="polite"><p class="cp-etat-t" data-cp-etat-titre>${esc(R.sansScript)}</p><p class="cp-etat-d" data-cp-etat-detail></p></div>
</div>
<h3 class="cp-h3 cp-prep-t">${esc(R.preparesTitre)}</h3>
<ul class="cp-prep vt-in" data-lk-reveal>${R.prepares.map((x, i) => '<li style="--i:' + i + '"><span class="cp-prep-ico">' + S.icon(x.ico) + '</span>' + esc(x.label) + '</li>').join('')}</ul>
<p class="cp-row" data-cp-js hidden><button type="button" class="cp-btn" data-cp-preparer>${esc(R.bouton)}</button></p>
<div class="cp-progres" data-cp-progres hidden><progress max="100" value="0" aria-label="${esc(R.bouton)}"></progress><span class="cp-progres-txt" data-cp-progres-txt></span></div>
<details class="cp-plus"><summary>${esc(R.plus)}</summary><div class="cp-plus-in">${R.detail.map(x => '<p>' + esc(x) + '</p>').join('')}</div></details>`;
  const installer = `<div class="cp-duo">
<div class="cp-bloc" data-cp-install data-lk-reveal>
  <h3 class="cp-h3">${ico('installer', 'cp-h3-ico')}${esc(I.comment)}</h3>
  <p class="cp-install-etat" data-cp-install-etat aria-live="polite"></p>
  <p class="cp-row" data-cp-installer-ligne hidden><button type="button" class="cp-btn" data-cp-installer>${esc(I.bouton)}</button></p>
  <ul class="cp-plateformes cp-pfs vt-in" data-lk-reveal>${[['pf-ios', 'ios', I.iphone], ['pf-android', 'android', I.android], ['pf-pc', 'pc', I.ordinateur]].map(([id, k, txt], i) => '<li data-cp-pf="' + id + '" style="--i:' + i + '"><span class="cp-pf-ill" aria-hidden="true">' + IL.INSTALL[k] + '</span><b class="cp-pf-t">' + esc(I.plateformes[k]) + '</b><span class="cp-pf-d">' + esc(txt) + '</span></li>').join('')}</ul>
</div>
<div class="cp-bloc cp-ecran" data-cp-ecran data-lk-reveal data-delay="60" hidden>
  <h3 class="cp-h3"><svg class="cp-h3-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle class="ac" cx="12" cy="12" r="4"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8"/></svg>${esc(I.ecranTitre)}</h3>
  <p class="cp-txt">${esc(I.ecranLede)}</p>
  <button type="button" class="cp-switch" role="switch" aria-checked="false" data-cp-ecran-bouton><span class="cp-switch-piste" aria-hidden="true"><span class="cp-switch-bille"></span></span><span class="cp-switch-l">${esc(I.ecranBouton)}</span></button>
  <p class="cp-msg" data-cp-ecran-msg aria-live="polite"></p>
  <p class="cp-note">${esc(I.ecranNote)}</p>
</div>
</div>`;
  const schema = '<figure class="cp-schema lk-reveal">' + IL.TRANSFERT + '<figcaption class="cp-schema-l"><span>' + esc(T.schema.de) + '</span><span>' + esc(T.schema.via) + '</span><span>' + esc(T.schema.vers) + '</span></figcaption><p class="cp-schema-n">' + esc(T.schema.note) + '</p></figure>';
  const transfert = schema + `<div class="cp-duo">
<div class="cp-bloc" data-lk-reveal>${blocEnvoi(T)}</div>
<div class="cp-bloc" data-lk-reveal data-delay="60">
  <h3 class="cp-h3">${esc(T.fichierTitre)}</h3>
  <p class="cp-txt">${esc(T.fichierTexte)}</p>
  <p class="cp-row" data-cp-js hidden><button type="button" class="cp-btn cp-btn--ghost" data-tr-exporter>${esc(T.exporter)}</button><button type="button" class="cp-btn cp-btn--ghost" data-tr-importer>${esc(T.importer)}</button><input type="file" id="tr-fichier" accept="application/json,.json" hidden data-tr-fichier></p>
  <p class="cp-msg" data-tr-fichier-msg aria-live="polite"></p>
</div>
</div>
<details class="cp-plus"><summary>${esc(T.plus)}</summary><div class="cp-plus-in">${T.detail.map(x => '<p>' + esc(x) + '</p>').join('')}</div></details>`;
  const reception = `<section class="shell cp-reception" id="reception" aria-labelledby="reception-t" data-tr-reception hidden>
<div class="cp-reception-in">
  <p class="ed-kicker">${esc(T.titre)}</p>
  <h2 class="cp-h2" id="reception-t" tabindex="-1" data-tr-recu-titre>${esc(T.receptionTitre)}</h2>
  <p class="cp-resume" data-tr-apercu></p>
  <details class="cp-plus" data-tr-detail hidden><summary>Voir le détail</summary><ul class="cp-rubriques" data-tr-rubriques></ul><p class="cp-note" data-tr-problemes hidden></p></details>
  <p class="cp-row" data-tr-choix hidden><button type="button" class="cp-btn" data-tr-fusionner>Fusionner avec mon suivi</button><button type="button" class="cp-btn cp-btn--ghost" data-tr-remplacer>Remplacer mon suivi par celui-ci</button><button type="button" class="cp-btn cp-btn--plain" data-tr-annuler>Annuler</button></p>
  <p class="cp-note" data-tr-choix-note hidden>« Fusionner » ajoute les cases reçues aux tiennes. « Remplacer » met le suivi reçu à la place du tien, rubrique par rubrique ; ce qu’il ne contient pas n’est pas touché.</p>
  <p class="cp-msg cp-msg--fort" data-tr-recu-msg aria-live="polite"></p>
  <p class="cp-row" data-tr-suite hidden><a class="cp-btn cp-btn--ghost" href="progression.html">Voir ma progression</a></p>
</div>
</section>`;
  const faq = VT.faqGrid('<div class="faq">' + X.faq.map(x => '<details data-lk-reveal><summary>' + esc(x.q) + '</summary><div class="ans">' + esc(x.a) + '</div></details>').join('') + '</div>',
    VT.aside({ title: VTX.aside.titre, text: VTX.aside.texte, asks: X.leo, mail: { href: 'contact.html#ecrire', label: VTX.aside.ecrire }, media: 'vice-city-03', alt: 'Vue aérienne de Vice City, visuel officiel Rockstar Games' }));
  const body = `<section class="page-head shell lk-glow"><div class="lk-head-grid"><div>
  <p class="fiche-cat">${esc(X.kicker)}</p>
  <h1>${esc(X.h1)}</h1>
  <p class="lede">${esc(X.lede)}</p>
  <p class="d-intro-note">${esc(X.note)}</p>
  <p class="cp-actions">${X.actions.map((a, i) => '<a class="cp-btn' + (i ? ' cp-btn--ghost' : '') + '" href="' + esc(a.href) + '">' + esc(a.label) + '</a>').join('')}</p>
</div>${pile}</div></section>
${reception}
<div class="ed-zone ed-zone--compagnon">
${S.nav(X.nav, X.navLabel)}
${S.section({ id: X.tuiles.id, num: 1, kicker: X.tuiles.kicker, title: X.tuiles.titre, icon: 'boussole', tone: 'paper', lede: esc(X.tuiles.lede), cls: 'cp-sec-story' }, story)}
${sec({ id: R.id, num: 2, kicker: R.kicker, title: R.titre, tone: 'paper2', accent: 'coral', lede: esc(R.lede) }, reseau, 'reseau')}
${sec({ id: I.id, num: 3, kicker: I.kicker, title: I.titre, tone: 'night', lede: esc(I.lede) }, installer, 'installer')}
${sec({ id: T.id, num: 4, kicker: T.kicker, title: T.titre, tone: 'paper2', accent: 'coral', lede: esc(T.lede) }, transfert, 'transfert')}
${S.section({ id: 'faq', num: 5, kicker: 'Questions fréquentes', title: 'Tes questions', icon: 'faq', tone: 'paper' }, faq)}
</div>
${dialogueQR()}`;
  const ld = '<script type="application/ld+json">' + JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebPage', name: X.h1, description: metaDesc(X.desc), url: SITE + '/compagnon.html', inLanguage: 'fr', isPartOf: { '@type': 'WebSite', name: 'Leonidakit', url: SITE + '/' } }) + '</script>';
  const og = MED[X.pile[0].media].variants.find(v => v.w === 1280) || MED[X.pile[0].media].variants[0];
  return page(C, { p: '', title: X.seoTitle + ' | Leonidakit', desc: X.desc, canonical: '/compagnon.html', ogImg: og.src, body, crumbs: [['Accueil', '/'], [X.label, '/compagnon.html']], ld, css: ['compagnon.css', 'vitrine.css'], lazy: ['progression-data.js', 'acquisitions-data.js', 'collectibles-data.js', 'progression-core.js', 'vendor/qrcode-generator.js'], js: ['compagnon.js', 'transfert.js', 'vitrine.js'], cls: 'cp-page' });
}

/* ---------- hors-ligne.html ---------- */
function horsLignePage(ctx) {
  const { D, C } = ctx, H = D.horsLigne;
  const body = `<section class="page-head shell lk-glow hl-tete"><div class="hl-tete-in">
  <p class="fiche-cat">${esc(H.kicker)}</p>
  <h1>${esc(H.h1)}</h1>
  <p class="lede">${esc(H.lede)}</p>
  <p class="cp-actions"><button type="button" class="cp-btn" data-hl-reessayer hidden>${esc(H.reessayer)}</button><a class="cp-btn cp-btn--ghost" href="compagnon.html#sans-reseau">${esc(H.lien)}</a></p>
</div></section>
<section class="shell hl-liste" aria-labelledby="hl-t">
  <h2 class="sec-h" id="hl-t">${esc(H.listeTitre)}</h2>
  <div class="hl-pages" data-hl-liste aria-live="polite">
    <p class="cp-txt">${esc(H.sansScript)}</p>
    <ul class="hl-secours">${H.secours.map(x => '<li><a href="' + esc(x.href) + '">' + esc(x.label) + '</a></li>').join('')}</ul>
  </div>
  <div class="hl-vide" data-hl-vide hidden><p class="cp-txt"><strong>${esc(H.vide)}</strong> ${esc(H.conseil)}</p></div>
</section>`;
  /* adresse canonique sans balises de partage (page noindex, comme comparateur.html) : le vérificateur et coverage.test l'exigent partout sauf sur 404.html */
  return absolu(page(C, { p: '/', title: H.title + ' | Leonidakit', desc: H.desc, robots: 'noindex, follow', canon: '/hors-ligne.html', body, css: ['compagnon.css'], js: ['compagnon.js'], cls: 'cp-page hl-page' }));
}

/* ---------- bloc de progression.html ---------- */
const DEBUT = '<!-- transfert:debut (outils/gen-compagnon.cjs) -->', FIN = '<!-- transfert:fin -->';
function progressionBloc(ctx, root) {
  const f = path.join(root, 'progression.html'), s = fs.readFileSync(f, 'utf8'), T = ctx.D.compagnon.transfert;
  const bloc = DEBUT + '\n<div class="cp-tr-progression">' + blocEnvoi(T, { titre: 'Passer sur un autre appareil', texteHtml: 'Un lien ou un QR code avec tout ton suivi : ouvre-le sur l’autre appareil, rien ne passe par le site. Tu peux aussi le faire depuis le <a href="compagnon.html#changer-d-appareil">Mode compagnon</a>.' }) + '</div>\n' + dialogueQR() + '\n' + FIN;
  let out = s;
  if (out.includes(DEBUT)) out = out.replace(new RegExp(DEBUT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]*?' + FIN), bloc);
  else { const at = out.indexOf('<p class="save-msg" id="save-msg"'); if (at < 0) throw new Error('progression.html : message de sauvegarde introuvable'); const end = out.indexOf('</p>', at) + 4; out = out.slice(0, end) + '\n' + bloc + out.slice(end); }
  if (!/href="(?:\.\.\/|\/)?compagnon\.css/.test(out)) out = out.replace(/(<link rel="stylesheet" href="carnets\.css[^>]*>)/, '$1\n<link rel="stylesheet" href="compagnon.css">');
  /* scripts du bloc, chargés à la demande : l'encodeur du QR code à la création d'un lien, transfert.js une fois la page
     chargée, quand le navigateur est libre (data-lk-idle, common.js) : il ne retarde ni l'affichage ni DOMContentLoaded */
  out = out.replace(/<script src="((?:\.\.\/|\/)?transfert\.js[^"]*)"><\/script>/, '<script type="lk/lazy" data-lk-idle src="$1"></script>');
  if (!/src="(?:\.\.\/|\/)?vendor\/qrcode-generator\.js/.test(out)) out = out.replace(/(<script src="progression\.js[^"]*"><\/script>)/, '$1\n<script type="lk/lazy" src="vendor/qrcode-generator.js"></script>\n<script type="lk/lazy" data-lk-idle src="transfert.js"></script>');
  if (out !== s) fs.writeFileSync(f, out);
}

function generate(root = ROOT) {
  const L = load(root);
  const ctx = { ...L, C: chromeOf(fs.readFileSync(path.join(root, 'a-propos.html'), 'utf8')) };
  fs.writeFileSync(path.join(root, 'compagnon.html'), compagnonPage(ctx));
  fs.writeFileSync(path.join(root, 'hors-ligne.html'), horsLignePage(ctx));
  progressionBloc(ctx, root);
  require('./appli.cjs').ecrireManifesteFr(root);
  console.log('compagnon : compagnon.html, hors-ligne.html, bloc de progression.html, manifeste français');
}
module.exports = { generate, load, blocEnvoi, DATA };
if (require.main === module) generate();
