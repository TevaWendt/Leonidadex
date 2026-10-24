'use strict';
/* LEONIDAKIT — gen-pages-elements-b.cjs (v7.96, lot B du prompt « Une page par élément »)
   Appelé par outils/gen-pages-elements.cjs, qui lui passe le gabarit (page, fin, prevNext), l’aperçu de carte (apercu), l’écriture
   avec empreinte (write) et l’index partagé (NEXT). Une page par élément pour les familles restantes, depuis les données du site
   et l’inventaire de outils/couverture-pages.cjs (adresses cibles, seuil d’indexation) :
   - les catalogues : coiffures/, tatouages/, tenues/, perso-vehicules/, perso-armes/ (outils/catalogues/<famille>.json) ;
   - les valeurs d’options des postes de personnalisation : options-vehicules/, options-armes/ (perso-options.json) ;
   - les marques de véhicules : marques/ (outils/marques.json et le champ marque de vehicules-data.js) ;
   - les types de munitions : munitions/ (champ mun de armes-data.js, libellés de hubs-editoriaux.json) ;
   - les éditions du jeu : editions/ (actus.json → editions, prix) ;
   - les achats et services sans fiche : achats/ (acquisitions.json) ;
   - les visuels officiels : visuels/ (medias-officiels.json), avec les pages du site qui les reprennent ;
   - les grands moments : moments/ (annonces datées de actus.json, moments des dossiers du monde de monde-dossiers.json) ;
   - un sommaire par famille (index.html).
   Règles : rien d’inventé (chaque phrase vient d’une donnée), statut dit sur chaque information, toute page est proposée aux
   moteurs (v7.96, Téva : INDEXER_TOUT de couverture-pages.cjs), aucune adresse existante ne change, une page n’est réécrite
   que si son contenu change. */
module.exports = function lotB(A) {
  const { fs, path, ROOT, INV, esc, SITE, FAM, nb, pick, cap, minuscule, court, titre, page, fin, prevNext, apercu, echellePour, write, NEXT, CAT, MED, GTA_BY_ID, SOURCES, PERSON, ST_CONSO, UNITS, money, repere, effetPhrase, lieuById, pageOfLieu, donneesLieu, affiche, slug, ce } = A;
  const { V, A: ARMES, MARQUES, MONDE, ACTUS, ACQ, OPTIONS } = INV.donnees;
  const HUBS = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/hubs-editoriaux.json'), 'utf8'));
  const { titleSeo } = require('./langues.cjs');
  const resume = [];
  const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
  const exists = f => fs.existsSync(path.join(ROOT, f));
  const frLong = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z')).replace(/^1 /, '1er ') : /^\d{4}-\d{2}$/.test(iso) ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso + '-15T12:00:00Z')) : iso;
  const frDate = iso => iso ? iso.split('-').reverse().join('/') : '';
  const lien = (href, label) => '<a href="../' + esc(href) + '">' + esc(label) + '</a>';
  const unknown = t => '<span class="unknown">' + esc(t) + '</span>';
  const pluriel = (n, un, des) => n > 1 ? nb(n) + ' ' + des : nb(n) + ' ' + un;
  const tableau = rows => '<table class="spec rise">\n      <tbody>\n' + rows.filter(Boolean).map(([k, v]) => '        <tr><th scope="row">' + esc(k) + '</th><td>' + v + '</td></tr>').join('\n') + '\n      </tbody>\n    </table>';
  const section = (id, h2, inner, cls = 'shell reveal') => '<section class="' + cls + '" id="' + id + '">\n  <h2 class="sec-h">' + esc(h2) + '</h2>\n' + inner + '\n</section>\n';
  /* v8.01 : une carte liée porte le visuel officiel de sa fiche quand il existe (c.media : vignette 480 px, chargée à la demande ;
     elements.css, .rel-art--img) : les pages des grands moments et des éditions montrent ce qu’elles relient */
  /* srcset d’un seul fichier et sizes de la vignette : sans cela, sync-site.cjs ajoute les 800 et 1 280 px et un téléphone
     chargerait une image de 800 px pour une vignette de 84 px */
  const relThumb = id => { const m = MED[id]; if (!m) return ''; const v = m.variants.find(x => x.w === 480) || m.variants[0]; const src = '../' + esc(v.src.replace(/^\//, '')); return '<span class="rel-art rel-art--img" aria-hidden="true"><img src="' + src + '" srcset="' + src + ' ' + v.w + 'w" sizes="84px" width="' + v.w + '" height="' + v.h + '" alt="" loading="lazy" decoding="async"></span>'; };
  const relCards = (h2, cards, id = 'lies') => cards.length ? '<section class="shell reveal" id="' + id + '">\n  <h2 class="rel-title">' + esc(h2) + '</h2>\n  <div class="rel-grid rise' + (cards.some(c => c.media && MED[c.media]) ? ' rel-grid--img' : '') + '">' + cards.map(c => '<a class="rel-card' + (c.media && MED[c.media] ? ' rel-card--img' : '') + '" href="' + esc(c.href) + '">' + (c.media ? relThumb(c.media) : '') + '<span class="rel-txt"><span class="rel-marque">' + esc(c.marque) + '</span><span class="rel-nom">' + esc(c.nom) + '</span></span></a>').join('') + '</div>\n</section>\n' : '';
  /* v8.01 : cartes à image d’un sommaire (grands moments) : visuel, date, titre ; grille pleine, la dernière rangée centrée (elements.css, .lc-cards) */
  const imageCards = (items, id = 'liste') => '<section class="shell reveal" id="' + id + '">\n  <ul class="lc-cards rise">' + items.map(x => { const m = x.media && MED[x.media]; const v = m && (m.variants.find(y => y.w === 480) || m.variants[0]); const src = v ? '../' + esc(v.src.replace(/^\//, '')) : ''; return '<li><a class="lc-card" href="' + esc(x.href) + '">' + (v ? '<span class="lc-card-m"><img src="' + src + '" srcset="' + src + ' ' + v.w + 'w" sizes="(max-width:480px) 92vw, (max-width:820px) 46vw, 300px" width="' + v.w + '" height="' + v.h + '" alt="" loading="lazy" decoding="async"></span>' : '<span class="lc-card-m lc-card-m--vide" aria-hidden="true"></span>') + '<span class="lc-card-b">' + (x.small ? '<small>' + esc(x.small) + '</small>' : '') + '<b>' + esc(x.nom) + '</b></span></a></li>'; }).join('') + '</ul>\n</section>\n';
  const liste = items => '<ul class="lc-list rise">' + items.map(x => '<li><a href="' + esc(x.href) + '">' + esc(x.nom) + '</a>' + (x.small ? '<small>' + esc(x.small) + '</small>' : '') + '</li>').join('') + '</ul>';
  /* visuel officiel : figure avec srcset 480 et 1 280, crédit, lien vers sa page et vers les crédits */
  const pageVisuel = id => 'visuels/' + slug(id) + '.html';
  function figureMedia(id, alt, opts = {}) {
    const m = MED[id]; if (!m) return '';
    const v480 = m.variants.find(x => x.w === 480) || m.variants[0], v1280 = m.variants.find(x => x.w === 1280);
    const src = v => '../' + v.src.replace(/^\//, '');
    return '<figure class="lc-capture' + (opts.cls ? ' ' + opts.cls : '') + '"><img src="' + esc(src(v480)) + '"' + (v1280 ? ' srcset="' + esc(src(v480)) + ' 480w, ' + esc(src(v1280)) + ' 1280w" sizes="' + (opts.sizes || '(max-width: 800px) 100vw, 440px') + '"' : '') + ' width="' + v480.w + '" height="' + v480.h + '" alt="' + esc(alt || m.alt || ('Visuel officiel de GTA VI : ' + (m.titre || id))) + '"' + (opts.lazy ? ' loading="lazy"' : ' fetchpriority="high"') + ' decoding="async"><figcaption>' + (opts.legende ? esc(opts.legende) + ' ' : '') + 'Visuel officiel ' + esc(m.credit || '© Rockstar Games, Take-Two Interactive') + '. <a href="../' + esc(pageVisuel(id)) + '">' + esc(m.titre || id) + '</a>, <a href="../medias.html#media-' + esc(id) + '">crédits</a>.</figcaption></figure>';
  }
  const imageDe = id => { const m = MED[id]; const v = m && (m.variants.find(x => x.w === 1280) || m.variants[0]); return v ? SITE + v.src.replace(/^\//, '') : null; };
  const srcLinks = ids => (ids || []).map(id => SOURCES[id]).filter(Boolean).map(s => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>' + (s.consultedAt ? ' <span class="unknown">(consulté le ' + esc(frDate(s.consultedAt)) + ')</span>' : '')).join('<br>');
  /* titre borné à 65 signes : le suffixe (catégorie) tombe d’abord, puis la parenthèse du nom ; v8.01 (référencement) : le nom
     lui-même n’est plus jamais coupé (c’est lui que tapent les joueurs, un titre un peu long vaut mieux qu’un nom tronqué) ;
     un nom qui contient déjà « GTA » (« Gilet pare-balles dans GTA VI ») ne reçoit pas le préfixe « GTA 6 : » (le titre disait
     « GTA 6 : … dans GTA 6 »), et un suffixe déjà contenu dans le nom n’est pas redit */
  const titreBorne = (base, suffixe) => { const pre = /\bGTA (?:VI|6)\b/.test(base) ? '' : 'GTA 6 : '; if (suffixe && base.toLowerCase().includes(suffixe.toLowerCase())) suffixe = ''; let t = pre + base + (suffixe ? ', ' + suffixe : ''); if (t.length > 65) t = pre + base; if (t.length > 65) t = pre + base.replace(/\s*\([^()]*\)$/, ''); return titre(t); };
  /* une phrase de données placée après un nom, entre parenthèses : minuscule initiale quand elle commence par un mot courant (article, pronom), jamais sur un nom propre */
  const debutMinuscule = t => t.replace(/^(Le|La|Les|L’|Un|Une|Des|Du|De|Ce|Cette|Ces|Il|Elle|Ils|Elles|On|Sur|Dans|D’après|Au|Aux|À|En|Deux|Trois|Quatre|Son|Sa|Ses|Pour|Avec|Sans|Comme|Première|Premier|Deuxième|Plusieurs|Quelques|Toute|Tout|Toutes|Tous)\b/, m => m.toLowerCase());
  /* v8.04 (référencement) : une description de page doit faire de 60 à 160 signes (outils/referencement.cjs) ; la première des
     propositions qui tient est gardée, sinon la première (le relevé de référencement la signale). texteSeul : une phrase du corps
     de page (échappée pour le HTML) redevient du texte, que page() échappe à son tour. */
  const descriptionBornee = props => props.find(d => d && d.length >= 60 && d.length <= 160) || props[0];
  const texteSeul = h => String(h || '').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const ST_LABEL = { officiel: 'Nommé ou décrit par Rockstar', vu: 'Vu dans un média officiel', comm: 'Identification communautaire', serie: 'Repère de la série', conf: 'À confirmer' };

  /* ====================================================================================================================
     1. CATALOGUES (coiffures, tatouages, tenues, personnalisation des véhicules et des armes)
     ==================================================================================================================== */
  const HUB = { coiffures: ['style.html#coiffures', 'Vêtements et style', 'fhero--style'], tatouages: ['style.html#tatouages', 'Vêtements et style', 'fhero--style'], tenues: ['style.html#tenues', 'Vêtements et style', 'fhero--style'], 'perso-vehicules': ['personnalisations.html#perso-vehicules', 'Personnalisations', 'fhero--perso'], 'perso-armes': ['personnalisations.html#perso-armes', 'Personnalisations', 'fhero--perso'] };
  /* catégories d’armes d’armes-data.js (LK_ARMES_CATS) : pluriel du site, singulier pour les cartes */
  const CATS_A_PL = { pistolet: 'pistolets', pompe: 'fusils à pompe', pm: 'pistolets-mitrailleurs', assaut: 'fusils d’assaut', precision: 'fusils de précision', mitrailleuse: 'mitrailleuses', melee: 'armes de mêlée', projectile: 'projectiles', speciale: 'armes spéciales' };
  const CATS_A = { pistolet: 'pistolet', pompe: 'fusil à pompe', pm: 'pistolet-mitrailleur', assaut: 'fusil d’assaut', precision: 'fusil de précision', mitrailleuse: 'mitrailleuse', melee: 'arme de mêlée', projectile: 'projectile', speciale: 'arme spéciale' };
  const CATS_V1 = { berline: 'berline', sport: 'sportive', supercar: 'supercar', muscle: 'muscle car', suv: 'SUV', pickup: 'pick-up', van: 'van', moto: 'moto', helicoptere: 'hélicoptère', avion: 'avion', bateau: 'bateau', service: 'véhicule de service', divers: 'véhicule divers' };
  const CATS_V = { berline: 'berlines', sport: 'sportives', supercar: 'supercars', muscle: 'muscle cars', suv: 'SUV', pickup: 'pick-up', van: 'vans', moto: 'motos', helicoptere: 'hélicoptères', avion: 'avions', bateau: 'bateaux', service: 'véhicules de service', divers: 'véhicules divers' };
  /* « One-Eyed Willie’s (Lake Leonida) » + note → « One-Eyed Willie’s (Lake Leonida, pas encore placé sur la carte) » : une seule parenthèse */
  const typeNote = (t, grise) => { if (!t.note) return esc(t.type); const m = t.type.match(/^(.*)\(([^()]*)\)$/); if (m) return esc(m[1]) + (grise ? unknown('(' + m[2] + ', ' + t.note + ')') : '(' + esc(m[2] + ', ' + t.note) + ')'); return esc(t.type) + ' ' + (grise ? unknown('(' + t.note + ')') : '(' + esc(t.note) + ')'); };
  const pageOption = (fam, poste, n) => 'options-' + fam.replace('perso-', '') + '/' + slug(poste) + '-' + slug(n) + '.html';
  function pageCatalogue(fam, it, i, ordre) {
    const C = CAT[fam], c = C.items.find(x => x.id === it.id), cat = C.categories.find(x => x.id === c.categorie) || { label: C.label }, file = it.cible, st = ST_CONSO[c.statut] || ST_CONSO.conf;
    const [hubHref, hubLabel, hero] = HUB[fam];
    const lieux = (c.ou_le_trouver || []).filter(o => o.lieu && lieuById.has(o.lieu)).map(o => lieuById.get(o.lieu)), types = (c.ou_le_trouver || []).filter(o => o.type);
    const nomLieu = l => { const twin = lieux.filter(x => x.nom === l.nom).length > 1; const d = twin ? donneesLieu(l) : null; return esc(affiche(l.nom)) + (twin && (d.groupe || d.comteNom) ? ' (' + esc(d.groupe ? d.groupe.n : d.comteNom) + ')' : ''); };
    const lienLieuC = l => '<a href="../' + esc(pageOfLieu(l)) + '">' + nomLieu(l) + '</a>';
    const qui = c.personnage ? PERSON[c.personnage] : null;
    /* v8.04 (jour J) : un prix GTA VI publié s’écrit comme dans la liste : prix, fourchette, statut (outils/fiche-doc.cjs, accessCell) */
    const prixVI = c.prix_gta6 && typeof c.prix_gta6.valeur === 'number' ? require('./fiche-doc.cjs').accessCell({ ...c, ou_le_trouver: [] }).price : (c.prix_gta6 && c.prix_gta6.statut === 'na' ? 'Ne s’achète pas' : 'À venir : aucun prix publié pour GTA VI');
    const opts = OPTIONS[fam] && OPTIONS[fam][c.id] ? OPTIONS[fam][c.id] : null;
    /* v7.97 : un identifiant de catégorie d’armes (« pompe », « assaut ») s’écrit avec son libellé (« fusils à pompe », « fusils d’assaut ») */
    const compat = c.compat && c.compat.vehicules ? c.compat.vehicules.map(k => CATS_V[k] || k) : c.compat && c.compat.armes ? c.compat.armes.map(id => { const a = ARMES.find(x => x.id === id); return a ? '<a href="../armes/' + esc(a.id) + '.html">' + esc(a.nom) + '</a>' : esc(CATS_A_PL[id] || id); }) : null;
    /* v8.04 (référencement) : les phrases du statut et de l’effet, écrites une fois, servent au texte et à la description */
    const phraseStatut = 'Statut : ' + (st[0].includes(' : ') ? minuscule(st[0]).replace(' : ', ' (') + ')' : minuscule(st[0])) + '.';
    const phraseEffet = c.effet && c.effet.texte ? effetPhrase(c.effet.texte) + (c.effet.valeur !== null && c.effet.valeur !== undefined && !c.effet.texte.includes(String(c.effet.valeur)) ? ' (' + esc(String(c.effet.valeur)) + (UNITS[c.effet.unite] || '') + (c.effet.jeu ? ', ' + esc(c.effet.jeu) : '') + ')' : c.effet.jeu && !c.effet.texte.includes(c.effet.jeu) ? ' (' + esc(c.effet.jeu) + ')' : '') + '.' : '';
    const texte = [esc(c.description), phraseStatut,
      phraseEffet,
      c.prix_repere_serie ? 'Repère de la série, ' + esc(repere(c.prix_repere_serie)) + (c.prix_repere_serie.note ? ' (' + esc(c.prix_repere_serie.note) + ')' : '') + ' ; ce n’est pas un prix de GTA VI.' : 'Aucun prix de la série n’est relevé pour cet élément.',
      lieux.length || types.length ? 'Où le trouver : ' + [...types.map(t => typeNote(t)), ...lieux.map(l => lienLieuC(l))].join(', ') + '.' : '',
      opts && opts.options && opts.options.length ? 'Options relevées dans ' + esc(opts.jeu || 'la série') + ' (' + pluriel(opts.options.length, 'valeur', 'valeurs') + ', une page chacune) : ' + opts.options.map(o => '<a href="../' + esc(pageOption(fam, c.id, o.n)) + '">' + esc(o.n) + '</a>' + (o.p !== undefined ? ' (' + esc(money(o.p)) + ')' : '')).join(', ') + '.' : '',
      compat ? (c.compat.vehicules ? 'Catégories de véhicules concernées : ' : 'Armes concernées : ') + compat.join(', ') + '.' : '',
      c.variantes && c.variantes.length ? 'Variantes : ' + esc(c.variantes.join(', ')) + '.' : '', qui ? 'Personnage lié : ' + (qui[1] ? '<a href="../' + qui[1] + '">' + esc(qui[0]) + '</a>' : esc(qui[0])) + '.' : '', c.notes ? esc(c.notes) : ''].filter(Boolean).join(' ');
    const identite = [['Catégorie', '<a href="../' + esc(hubHref) + '">' + esc(cat.label) + '</a>'], ['Statut', esc(st[0])],
      ['Effet', c.effet && c.effet.texte ? esc(c.effet.texte) + (c.effet.jeu && !c.effet.texte.includes(c.effet.jeu) ? ' ' + unknown('(' + c.effet.jeu + ')') : '') : unknown('Non publié')],
      ['Prix dans GTA VI', esc(prixVI)], ['Repère de la série', c.prix_repere_serie ? esc(repere(c.prix_repere_serie)) + (c.prix_repere_serie.note ? ' ' + unknown('(' + c.prix_repere_serie.note + ')') : '') : unknown('Pas de repère')],
      ['Où le trouver', lieux.length || types.length ? [...types.map(t => typeNote(t, true)), ...lieux.map(l => lienLieuC(l))].join(', ') : unknown('Emplacement à venir')],
      opts && opts.deblocage ? ['Déblocage repère', esc(opts.deblocage)] : null, opts && opts.note ? ['Note sur les options', esc(opts.note)] : null,
      compat ? [c.compat.vehicules ? 'Véhicules concernés' : 'Armes concernées', compat.join(', ')] : null,
      c.variantes && c.variantes.length ? ['Variantes', esc(c.variantes.join(', '))] : null, qui ? ['Pour qui', qui[1] ? '<a href="../' + qui[1] + '">' + esc(qui[0]) + '</a>' : esc(qui[0])] : null,
      c.lien ? ['Fiche liée', '<a href="../' + esc(c.lien.href) + '">' + esc(c.lien.label) + '</a>'] : null,
      ['Sources', srcLinks(c.sources) || unknown('Aucune source relevée')]];
    const art = c.media ? figureMedia(c.media) : '';
    const freres = ordre.filter(x => x.id !== it.id && C.items.find(y => y.id === x.id).categorie === c.categorie).slice(0, 8).map(f => { const y = C.items.find(z => z.id === f.id); return { href: path.basename(f.cible), marque: (ST_CONSO[y.statut] || ST_CONSO.conf)[0].split(' :')[0].split(' pour ')[0], nom: f.nom }; });
    const lieuxCarte = lieux.filter(l => typeof (GTA_BY_ID.get(l.id) || {}).x === 'number');
    const carte = lieuxCarte.length ? (() => { const pins = lieuxCarte.map(l => ({ x: GTA_BY_ID.get(l.id).x, y: GTA_BY_ID.get(l.id).y, n: affiche(l.nom), href: '../' + pageOfLieu(l), ici: true })); const cx = pins.reduce((a, p) => a + p.x, 0) / pins.length, cy = pins.reduce((a, p) => a + p.y, 0) / pins.length; const href = '../carte.html#pins=' + lieuxCarte.map(l => encodeURIComponent(l.id)).join(',') + '&t=' + encodeURIComponent(c.nom)/* v8.06 (audit SEO-001) : adresse brute, échappée une seule fois à chaque insertion dans un attribut (esc) ; « &amp;t= » était échappé deux fois par apercu() */; return apercu(cx, cy, pins, 'Aperçu de la carte de Leonida : lieux où ' + c.nom + ' a été vu', href, echellePour(pins, cx, cy)) + '<p class="fiche-txt"><a href="' + esc(href) + '">Voir ces lieux sur la carte</a> : ' + lieuxCarte.map(l => lienLieuC(l)).join(', ') + '.</p>'; })() : '';
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>')
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n'
      + '  <div class="fiche-col reveal">\n    <h2 class="sec-h">' + (lieuxCarte.length ? 'Sur la carte de Leonida' : 'Ce qui arrive avec le jeu') + '</h2>\n    ' + (carte || '<p class="fiche-txt">Prix dans GTA VI, effet chiffré et lieux : ces cases se remplissent avec le jeu, à partir du 19 novembre 2026. D’ici là, aucune valeur n’est inventée ; les repères de la série restent à part.</p>') + '\n  </div>\n</section>\n'
      + relCards('Autres ' + cat.label.toLowerCase(), freres, 'autres')
      + fin(file, '<a class="fiche-meth-a" href="../' + esc(hubHref.split('#')[0]) + '#' + esc(fam + '-' + c.id) + '">Sa ligne dans la liste</a>', { q: fam.startsWith('perso') ? 'Quel budget pour personnaliser ?' : 'Quel budget pour ton style ?', d: 'Écris ce que tu dépenses par partie : tu vois ce que ça pèse sur ton objectif.', params: 'tool=budget&amp;type=' + (fam.startsWith('perso') ? 'customization' : 'style') + '&amp;from=' + esc(fam), cta: 'Faire mon budget' })
      + prevNext(ordre, i, x => path.basename(x.cible), x => x.nom);
    const liens = (c.suivi === false ? '' : '<span class="lc-track" data-track="' + esc(fam) + '" data-track-id="' + esc(c.id) + '" data-track-name="' + esc(c.nom) + '"></span>') + '<a href="../' + esc(hubHref.split('#')[0]) + '#' + esc(fam + '-' + c.id) + '">Dans la liste</a>' + (c.lien ? '<a href="../' + esc(c.lien.href) + '">' + esc(cap(c.lien.label)) + '</a>' : '');
    /* v7.97 : la catégorie s’écrit comme dans la liste (« Coupes ») : un libellé connu de la mémoire de traduction, jamais une minuscule forcée */
    /* v8.01 : un nom qui dit déjà « dans GTA VI » (« Munitions spéciales dans GTA VI ») ne le redit pas */
    const nomGTA = /\bGTA (?:VI|6)\b/.test(c.nom) ? c.nom : c.nom + ' dans GTA VI';
    const lede = esc(nomGTA) + ' : ' + esc(cat.label) + ', ' + minuscule(st[0]).split(' :')[0] + '. ' + esc(c.description);
    /* v8.04 (référencement) : description de 60 à 160 signes, faite de phrases entières que la page écrit déjà (la mémoire de
       traduction les connaît). Avant, « nom (catégorie). description » trop long était coupé après le nom seul (« Conversion Mk II
       dans GTA VI (Conversion Mk II). », 48 signes). Ordre : 1. « nom (catégorie). description » coupé comme avant, quand il reste
       entre 60 et 160 signes (pages inchangées) ; 2. « nom. description » ; 3. « nom. statut. effet » ; 4. « nom. statut » ;
       5. la phrase de repli d’avant. */
    const repliCat = nomGTA + ' (' + cat.label + ') : ce qu’on en sait, statut, sources et éléments liés.';
    const description = descriptionBornee([court(nomGTA + ' (' + cat.label + '). ' + c.description, 155, repliCat), nomGTA + '. ' + c.description,
      [nomGTA + '.', texteSeul(phraseStatut), texteSeul(phraseEffet)].filter(Boolean).join(' '), nomGTA + '. ' + texteSeul(phraseStatut), repliCat]);
    return page({ file, nom: c.nom, titre: titreBorne(c.nom, cat.label), description, indexable: !!it.indexable, image: c.media ? imageDe(c.media) : null, kicker: C.label + ', ' + cat.label, lede, tags: [[st[0].split(' :')[0], st[1]], [cat.label, false], ...(qui ? [[qui[0], false]] : [])], liens, art, body, crumbs: [['Tout ce qui s’achète', 'achats.html'], [hubLabel, hubHref.split('#')[0]], [C.label, hubHref]], scripts: c.suivi === false ? [] : ['suivi.js'], heroClass: hero });
  }
  function pageSommaireCatalogue(fam) {
    const C = CAT[fam], f = FAM(fam), file = f.dossier + '/index.html', [hubHref, hubLabel, hero] = HUB[fam];
    const parCat = C.categories.map(cat => ({ cat, items: f.items.filter(it => C.items.find(c => c.id === it.id).categorie === cat.id) })).filter(x => x.items.length);
    const nSt = s => C.items.filter(c => c.statut === s).length;
    /* accord : coiffures et tenues au féminin, tatouages et postes au masculin */
    const G = { coiffures: ['coiffures', true], tatouages: ['tatouages', false], tenues: ['tenues et accessoires', false], 'perso-vehicules': ['postes de personnalisation des véhicules', false], 'perso-armes': ['postes de personnalisation des armes', false] }[fam];
    const fem = G[1], acc = (m, fm) => fem ? fm : m;
    const intro = nb(C.items.length) + ' ' + G[0] + ' sont ' + acc('relevés', 'relevées') + ' sur Leonidakit : ' + [['officiel', acc('nommés ou décrits', 'nommées ou décrites') + ' par Rockstar'], ['vu', acc('vus', 'vues') + ' dans un média officiel'], ['serie', 'repères de la série (GTA V, GTA Online)'], ['conf', 'à confirmer']].filter(([s]) => nSt(s)).map(([s, l]) => nb(nSt(s)) + ' ' + l).join(', ') + '. ' + acc('Chacun', 'Chacune') + ' a sa page : statut, effet, prix repère, où le trouver, sources. La liste dépliable reste dans <a href="../' + esc(hubHref) + '">' + esc(hubLabel) + '</a>.';
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + intro + '</p>')
      + '<section class="shell reveal" id="liste">\n' + parCat.map(({ cat, items }) => '  <h2 class="sec-h">' + esc(cat.label) + ' (' + items.length + ')</h2>\n  ' + liste(items.map(it => { const c = C.items.find(x => x.id === it.id); return { href: path.basename(it.cible), nom: it.nom, small: (ST_CONSO[c.statut] || ST_CONSO.conf)[0].split(' :')[0] }; }))).join('\n') + '\n</section>\n'
      + fin(file, '<a class="fiche-meth-a" href="../' + esc(hubHref) + '">La liste dépliable</a>', null);
    return page({ file, nom: C.label + ' de GTA VI', titre: titre('GTA 6 : ' + minuscule(C.label) + ', une page par élément'), description: court(nb(C.items.length) + ' ' + G[0] + ' de GTA VI, une page ' + acc('chacun', 'chacune') + ' : statut, effet, prix repère de la série, où le trouver dans Leonida et sources.'), indexable: true, kicker: hubLabel, lede: 'Une page par élément : statut, effet, prix repère, où le trouver, sources.', tags: [[nb(C.items.length) + ' ' + G[0].split(' ')[0], true], [nb(nSt('officiel')) + ' ' + acc('nommés', 'nommées') + ' par Rockstar', false]], liens: '<a href="../' + esc(hubHref) + '">La liste dépliable</a>', art: '', body, crumbs: [['Tout ce qui s’achète', 'achats.html'], [hubLabel, hubHref.split('#')[0]]], heroClass: hero, liste: f.items.map(it => [it.nom, it.cible]) });
  }
  for (const fam of ['coiffures', 'tatouages', 'tenues', 'perso-vehicules', 'perso-armes']) {
    const f = FAM(fam), ordre = f.items.slice();
    ordre.forEach((it, i) => { write(it.cible, pageCatalogue(fam, it, i, ordre)); NEXT.elements[fam + ':' + it.id] = it.cible; });
    write(f.dossier + '/index.html', pageSommaireCatalogue(fam));
    resume.push(nb(ordre.length) + ' ' + minuscule(CAT[fam].label));
  }

  /* ====================================================================================================================
     2. VALEURS D’OPTIONS (une page par valeur ; un sommaire par famille)
     ==================================================================================================================== */
  function pageOptionValeur(fam, posteId, o, v, i, ordre, famItems) {
    const C = CAT[fam], poste = C.items.find(x => x.id === posteId), pf = FAM(fam).items.find(x => x.id === posteId), file = pageOption(fam, posteId, v.n);
    const [hubHref, hubLabel, hero] = HUB[fam], kind = fam === 'perso-vehicules' ? 'véhicule' : 'arme';
    const prix = v.p !== undefined ? money(v.p) : v.pmin !== undefined ? 'de ' + money(v.pmin) + ' à ' + money(v.pmax) : null;
    const autres = o.options.filter(x => x.n !== v.n);
    const texte = ['« ' + esc(v.n) + ' » est une des ' + pluriel(o.options.length, 'valeur', 'valeurs') + ' du poste ' + lien(pf.cible, poste.nom) + ' (personnalisation ' + (kind === 'véhicule' ? 'des véhicules' : 'des armes') + ').',
      prix ? 'Repère de la série : ' + prix + ' dans ' + esc(o.jeu) + ' ; ce n’est pas un prix de GTA VI, qui n’a rien publié.' : 'Relevée dans ' + esc(o.jeu) + ' sans prix noté ; rien n’est publié pour GTA VI.',
      o.deblocage ? 'Déblocage repère : ' + esc(o.deblocage) + '.' : '', o.note ? 'Note : ' + esc(o.note) + '.' : '',
      v.swatch ? 'La pastille de couleur reprend la teinte relevée.' : '',
      autres.length ? 'Les autres valeurs du poste : ' + autres.map(x => '<a href="' + esc(path.basename(pageOption(fam, posteId, x.n))) + '">' + esc(x.n) + '</a>' + (x.p !== undefined ? ' (' + esc(money(x.p)) + ')' : '')).join(', ') + '.' : ''].filter(Boolean).join(' ');
    const identite = [['Poste', lien(pf.cible, poste.nom)], ['Catégorie', '<a href="../' + esc(hubHref) + '">' + esc((C.categories.find(c => c.id === poste.categorie) || {}).label || C.label) + '</a>'], ['Repère de la série', prix ? esc(prix) + ' ' + unknown('(' + o.jeu + ')') : unknown('prix non relevé dans ' + o.jeu)], ['Prix dans GTA VI', unknown('À venir : aucun prix publié')], o.deblocage ? ['Déblocage repère', esc(o.deblocage)] : null, v.swatch ? ['Teinte relevée', '<span class="lc-swatch" style="--sw:' + esc(v.swatch) + '" aria-hidden="true"></span> ' + esc(v.swatch)] : null, ['Sources', srcLinks(poste.sources) || unknown('celles du poste')]];
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>')
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Ce qui arrive avec le jeu</h2>\n    <p class="fiche-txt">Le prix de cette option dans GTA VI, et le fait même qu’elle existe dans le jeu, restent à confirmer : la page le dira dès que Rockstar aura publié. Le repère vient de ' + esc(o.jeu) + '.</p>\n  </div>\n</section>\n'
      + fin(file, '<a class="fiche-meth-a" href="index.html">Toutes les options</a>', null)
      + prevNext(ordre, i, x => path.basename(x.file), x => x.nom);
    return page({ file, nom: v.n, titre: titreBorne(v.n, 'option ' + minuscule(poste.nom)), description: court(v.n + ', valeur du poste ' + poste.nom + ' (personnalisation ' + (kind === 'véhicule' ? 'des véhicules' : 'des armes') + ' de GTA VI) : ' + (prix ? prix + ' dans ' + o.jeu + ', repère de la série' : 'relevée dans ' + o.jeu) + ', prix GTA VI à venir.', 155, v.n + ', valeur du poste ' + poste.nom + ' : option de personnalisation ' + (kind === 'véhicule' ? 'des véhicules' : 'des armes') + ' de GTA VI.'), indexable: false, image: null, kicker: 'Option, ' + poste.nom, lede: esc(v.n) + ' : une valeur du poste ' + esc(poste.nom) + ', ' + (prix ? 'repère ' + esc(prix) + ' dans ' + esc(o.jeu) : 'relevée dans ' + esc(o.jeu)) + '.', tags: [['Repère de la série', false], [poste.nom, false]], liens: lien(pf.cible, 'Le poste ' + poste.nom) + '<a href="../' + esc(hubHref) + '">' + esc(hubLabel) + '</a>', art: '', body, crumbs: [['Tout ce qui s’achète', 'achats.html'], [hubLabel, hubHref.split('#')[0]], [poste.nom, pf.cible]], heroClass: hero });
  }
  function pageSommaireOptions(fam) {
    const C = CAT[fam], f = FAM('options-' + fam), file = f.dossier + '/index.html', [hubHref, hubLabel, hero] = HUB[fam], kind = fam === 'perso-vehicules' ? 'véhicules' : 'armes';
    const postes = Object.entries(OPTIONS[fam]).filter(([, o]) => o.options && o.options.length);
    const intro = nb(f.items.length) + ' valeurs d’options sont relevées pour ' + nb(postes.length) + ' postes de personnalisation des ' + kind + ' : des repères de la série (GTA V, GTA Online), jamais des prix de GTA VI. Chaque valeur a sa page, chaque poste la sienne (' + lien(FAM(fam).dossier + '/index.html', 'sommaire des postes') + ').';
    const blocs = postes.map(([id, o]) => { const poste = C.items.find(x => x.id === id), pf = FAM(fam).items.find(x => x.id === id); return '  <h2 class="sec-h">' + lien(pf.cible, poste.nom) + ' (' + o.options.length + ', ' + esc(o.jeu) + ')</h2>\n  ' + liste(o.options.map(v => ({ href: path.basename(pageOption(fam, id, v.n)), nom: v.n, small: v.p !== undefined ? money(v.p) + ' dans ' + o.jeu : v.pmin !== undefined ? 'de ' + money(v.pmin) + ' à ' + money(v.pmax) + ' dans ' + o.jeu : 'prix non relevé' }))); }).join('\n');
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + intro + '</p>') + '<section class="shell reveal" id="postes">\n' + blocs + '\n</section>\n' + fin(file, '<a class="fiche-meth-a" href="../' + esc(hubHref) + '">La liste des postes</a>', null);
    return page({ file, nom: 'Options de personnalisation des ' + kind, titre: titre('GTA 6 : options de personnalisation des ' + kind), description: court(nb(f.items.length) + ' valeurs d’options pour ' + nb(postes.length) + ' postes de personnalisation des ' + kind + ' dans GTA VI, avec leur prix repère de GTA V ou GTA Online, une page chacune.'), indexable: true, kicker: hubLabel, lede: 'Chaque valeur d’option a sa page, avec son prix repère de la série ; rien n’est inventé pour GTA VI.', tags: [[nb(f.items.length) + ' valeurs', true], [nb(postes.length) + ' postes', false]], liens: '<a href="../' + esc(hubHref) + '">' + esc(hubLabel) + '</a>', art: '', body, crumbs: [['Tout ce qui s’achète', 'achats.html'], [hubLabel, hubHref.split('#')[0]]], heroClass: hero, liste: f.items.map(it => [it.nom + ' (' + ((C.items.find(x => x.id === it.suffixe) || {}).nom || it.suffixe) + ')', it.cible]) /* v8.00 : le nom du poste (« Suspension »), pas son identifiant (« suspension-niveaux ») */ });
  }
  for (const fam of ['perso-vehicules', 'perso-armes']) {
    const f = FAM('options-' + fam); const ordre = [];
    for (const [id, o] of Object.entries(OPTIONS[fam])) for (const v of (o.options || [])) ordre.push({ fam, id, o, v, nom: v.n, file: pageOption(fam, id, v.n) });
    ordre.forEach((x, i) => { write(x.file, pageOptionValeur(fam, x.id, x.o, x.v, i, ordre)); NEXT.elements['options-' + fam + ':' + x.id + '--' + slug(x.v.n)] = x.file; });
    for (const it of f.items) if (!NEXT.elements['options-' + fam + ':' + it.id]) NEXT.elements['options-' + fam + ':' + it.id] = it.cible;
    write(f.dossier + '/index.html', pageSommaireOptions(fam));
    resume.push(nb(ordre.length) + ' options ' + (fam === 'perso-vehicules' ? 'véhicules' : 'armes'));
  }

  /* ====================================================================================================================
     3. MARQUES DE VÉHICULES
     ==================================================================================================================== */
  const ST_V = { officiel: 'nommé par Rockstar', vu: 'vu sans nom communiqué', comm: 'identification communautaire' }, ST_V_PL = { officiel: 'nommés par Rockstar', vu: 'vus sans nom communiqué', comm: 'identifications communautaires' };
  function pageMarque(it, i, ordre) {
    const m = MARQUES.find(x => x.name === it.nom) || { name: it.nom, evoque: null }, file = it.cible;
    const vs = V.filter(v => v.marque === it.nom).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    const parCat = {}; for (const v of vs) parCat[v.cat] = (parCat[v.cat] || 0) + 1;
    const nSt = s => vs.filter(v => v.st === s).length;
    const ev = m.evoque ? m.evoque.replace(/^évoque /, '') : null;
    const texte = [esc(m.name) + ' est un constructeur fictif de GTA VI, comme toutes les marques de la série.',
      ev ? 'La communauté rapproche son style de ' + esc(ev) + ' : une observation faite sur le design' + (m.source === 'fiches' ? ', reprise des fiches de ses véhicules' : '') + ', jamais une licence ni une confirmation de Rockstar.' : 'Aucun constructeur réel n’a été rapproché de cette marque pour l’instant.',
      vs.length ? nb(vs.length) + ' véhicule' + (vs.length > 1 ? 's portent' : ' porte') + ' la marque sur Leonidakit : ' + Object.entries(parCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => nb(n) + ' ' + (n > 1 ? (CATS_V[c] || c) : (CATS_V1[c] || c))).join(', ') + '.' : 'Aucun véhicule de cette marque n’est encore repéré sur le site.',
      vs.length ? 'Statuts : ' + ['officiel', 'vu', 'comm'].filter(s => nSt(s)).map(s => nb(nSt(s)) + ' ' + (nSt(s) > 1 ? ST_V_PL[s] : ST_V[s])).join(', ') + '.' : '',
      vs.length ? 'Chaque véhicule a sa fiche : ' + vs.slice(0, 6).map(v => '<a href="../vehicules/' + esc(v.id) + '.html">' + esc(v.nom) + '</a>').join(', ') + (vs.length > 6 ? ' et ' + nb(vs.length - 6) + ' autres ci-dessous' : '') + '.' : ''].filter(Boolean).join(' ');
    const identite = [['Marque', esc(m.name)], ['Constructeur évoqué', ev ? esc(ev) + ' ' + unknown('(observation de la communauté)') : unknown('aucun rapprochement retenu')], ['Véhicules repérés', vs.length ? nb(vs.length) : unknown('aucun pour l’instant')], ...Object.entries(parCat).length ? [['Catégories', Object.entries(parCat).map(([c, n]) => esc(CATS_V[c] || c) + ' (' + n + ')').join(', ')]] : [], ['Source', 'Captures et trailers officiels, fiches de Leonidakit ; rapprochement : <a href="../vraies-voitures.html">Les vraies voitures</a>']];
    const cards = vs.map(v => ({ href: '../vehicules/' + v.id + '.html', marque: (CATS_V1[v.cat] || v.cat) + ', ' + ST_V[v.st], nom: v.nom }));
    const strip = vs.length ? '<div class="lc-strip rise" aria-hidden="true">' + vs.filter(v => v.thumb).slice(0, 4).map(v => '<img src="../' + esc(v.thumb.replace(/^\//, '')) + '" alt="" width="160" height="80" loading="lazy" decoding="async">').join('') + '</div>' : '';
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>' + strip)
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Ce que ça veut dire</h2>\n    <p class="fiche-txt">Une marque de GTA VI est un nom inventé par Rockstar. Le constructeur réel « évoqué » est ce que les joueurs reconnaissent dans les lignes d’un véhicule ; Rockstar n’a confirmé aucune équivalence. Les fiches disent, véhicule par véhicule, ce qui est nommé par Rockstar, vu dans un média ou identifié par la communauté.</p>\n  </div>\n</section>\n'
      + relCards(vs.length ? 'Les ' + pluriel(vs.length, 'véhicule', 'véhicules') + ' de la marque' : 'Véhicules', cards, 'vehicules')
      + fin(file, '<a class="fiche-meth-a" href="../vehicules.html#marques">Le mur des marques</a>', { q: 'Combien de temps pour t’offrir un véhicule de cette marque ?', d: 'Écris le prix que tu imagines, ton argent et ce que tu gagnes par partie : le calculateur te dit le temps qu’il faut.', params: 'tool=purchase&amp;type=vehicle&amp;from=marques', cta: 'Faire le calcul' })
      + prevNext(ordre, i, x => path.basename(x.cible), x => x.nom);
    return page({ file, nom: m.name, titre: titreBorne(m.name, 'marque de véhicules'), description: court(m.name + ', marque de véhicules de GTA VI : ' + (ev ? 'évoque ' + ev + ' (observation de la communauté), ' : '') + (vs.length ? nb(vs.length) + ' véhicule' + (vs.length > 1 ? 's' : '') + ' repéré' + (vs.length > 1 ? 's' : '') + ' avec leur fiche et leur statut.' : 'aucun véhicule repéré pour l’instant.')), indexable: !!it.indexable, image: null, kicker: 'Marque de véhicules' + (vs.length ? ', ' + pluriel(vs.length, 'véhicule', 'véhicules') : ''), lede: esc(m.name) + ' sur Leonidakit : ' + (ev ? 'évoque ' + esc(ev) + ', ' : '') + (vs.length ? nb(vs.length) + ' véhicule' + (vs.length > 1 ? 's' : '') + ' repéré' + (vs.length > 1 ? 's' : '') : 'aucun véhicule repéré pour l’instant') + '.', tags: [[vs.length ? pluriel(vs.length, 'véhicule', 'véhicules') : 'Aucun véhicule repéré', vs.length > 0], ...(ev ? [['Évoque ' + ev, false]] : [])], liens: '<a href="../vehicules.html#q=' + encodeURIComponent(m.name) + '">Filtrer le catalogue</a><a href="../vehicules.html#marques">Le mur des marques</a>', art: '', body, crumbs: [['Véhicules', 'vehicules.html'], ['Marques', 'marques/index.html']], heroClass: 'fhero--marque' });
  }
  function pageSommaireMarques(ordre) {
    const file = 'marques/index.html', nV = V.filter(v => v.marque && v.marque !== 'Marque inconnue').length;
    /* v8.04 (chiffres du site) : « 51 marques » comptait aussi une marque sans aucun véhicule repéré (Cheval, venue du mur des marques) ;
       la page Véhicules dit « 50 constructeurs » : les deux nombres sont maintenant dits ensemble. */
    const avecV = ordre.filter(it => V.some(v => v.marque === it.nom)), sansV = ordre.filter(it => !V.some(v => v.marque === it.nom)).map(it => it.nom);
    const cards = ordre.map(it => { const n = V.filter(v => v.marque === it.nom).length, m = MARQUES.find(x => x.name === it.nom); return { href: path.basename(it.cible), marque: (n ? pluriel(n, 'véhicule', 'véhicules') : 'aucun véhicule repéré') + (m && m.evoque ? ', ' + m.evoque : ''), nom: it.nom }; });
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + nb(ordre.length) + ' marques de véhicules ont leur page : ' + nb(avecV.length) + ' sont portées par au moins un des ' + nb(nV) + ' véhicules du site dont la marque est connue' + (sansV.length ? ', ' + (sansV.length > 1 ? nb(sansV.length) + ' n’ont encore aucun véhicule repéré (' + sansV.join(', ') + ')' : '« ' + sansV[0] + ' » n’a encore aucun véhicule repéré') : '') + '. Chaque marque a sa page : le constructeur réel que la communauté y voit (jamais une licence), ses véhicules et leur statut. Le <a href="../vehicules.html#marques">mur des marques</a> de la page Véhicules les filtre par lettre.</p>')
      + relCards('Les marques', cards, 'marques') + fin(file, '<a class="fiche-meth-a" href="../vraies-voitures.html">Les vraies voitures derrière chaque véhicule</a>', null);
    return page({ file, nom: 'Marques de véhicules de GTA VI', titre: titre('GTA 6 : toutes les marques de véhicules'), description: court('Les ' + nb(ordre.length) + ' marques de véhicules de GTA VI, une page chacune : constructeur réel évoqué d’après la communauté, véhicules repérés et leur statut.'), indexable: true, kicker: 'Véhicules', lede: 'Une page par marque : le constructeur évoqué, les véhicules repérés, leur statut.', tags: [[nb(ordre.length) + ' marques', true], [nb(nV) + ' véhicules de marque connue', false]], liens: '<a href="../vehicules.html#marques">Le mur des marques</a>', art: '', body, crumbs: [['Véhicules', 'vehicules.html']], heroClass: 'fhero--marque', liste: ordre.map(it => [it.nom, it.cible]) });
  }
  {
    const f = FAM('marques'), ordre = f.items.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    ordre.forEach((it, i) => { write(it.cible, pageMarque(it, i, ordre)); NEXT.elements['marques:' + it.id] = it.cible; });
    write('marques/index.html', pageSommaireMarques(ordre));
    resume.push(nb(ordre.length) + ' marques');
  }

  /* ====================================================================================================================
     4. TYPES DE MUNITIONS
     ==================================================================================================================== */
  const CAT_A = CATS_A;
  /* v8.04 (jour J, prompt 2) : prix publié d’une munition : outils/acquisitions.json, catégorie « munitions », même identifiant que la
     munition de outils/hubs-editoriaux.json ; lu comme le calculateur (outils/donnees-publiees.cjs) ; rien tant qu’aucun prix n’est écrit */
  const DPM = require('./donnees-publiees.cjs');
  const PRIX_MUN = new Map((JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/acquisitions.json'), 'utf8')).items || []).filter(x => x.category === 'munitions').map(x => [x.id, DPM.prixDe(x)]).filter(([, p]) => p));
  function pageMunition(it, i, ordre) {
    const file = it.cible, hub = HUBS.armes.munitions.items.find(x => x.nom === it.nom) || null, prix = hub && PRIX_MUN.get(hub.id) || null;
    const armes = ARMES.filter(a => a.mun === it.nom).sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    const texte = ['Les ' + minuscule(it.nom) + (hub ? ' servent aux ' + minuscule(hub.usage) + '.' : ' sont un type de munitions relevé sur les fiches d’armes.'),
      armes.length ? nb(armes.length) + ' arme' + (armes.length > 1 ? 's repérées les utilisent' : ' repérée les utilise') + ' sur Leonidakit : ' + armes.map(a => '<a href="../armes/' + esc(a.id) + '.html">' + esc(a.nom) + '</a>' + (a.fr ? ' (' + esc(minuscule(a.fr)) + ')' : '')).join(', ') + '.' : 'Aucune arme repérée ne les utilise pour l’instant.',
      prix ? DPM.phrasePrix(prix) + '. Capacité dans GTA VI : rien n’est publié par Rockstar ; les fiches gardent les repères de la série à part.' : 'Prix, capacité et achat dans GTA VI : rien n’est publié par Rockstar ; les fiches gardent les repères de la série à part.'].join(' ');
    const identite = [['Type', esc(it.nom)], ['Usage', hub ? esc(hub.usage) : unknown('non précisé')], ['Armes repérées', armes.length ? armes.map(a => '<a href="../armes/' + esc(a.id) + '.html">' + esc(a.nom) + '</a>').join(', ') : unknown('aucune')], ['Prix dans GTA VI', prix ? esc(DPM.fmt(prix.value) + ' ' + prix.unit + DPM.fourchette(prix) + ', ' + prix.label) : unknown('À venir : aucun prix publié')], ['Source', 'Fiches d’armes de Leonidakit (captures et trailers officiels)']];
    const cards = armes.map(a => ({ href: '../armes/' + a.id + '.html', marque: (CAT_A[a.cat] || a.cat) + ', ' + (ST_LABEL[a.st] || a.st).toLowerCase(), nom: a.nom }));
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>')
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Ce qui arrive avec le jeu</h2>\n    <p class="fiche-txt">Capacité des chargeurs, prix à l’Ammu-Nation, munitions trouvées sur les ennemis : ces cases se rempliront avec le jeu, à partir du 19 novembre 2026. Rien n’est inventé d’ici là.</p>\n  </div>\n</section>\n'
      + relCards('Les armes qui les utilisent', cards, 'armes')
      + fin(file, '<a class="fiche-meth-a" href="../armes.html#munitions">Les types de munitions sur la page Armurerie</a>', null)
      + prevNext(ordre, i, x => path.basename(x.cible), x => x.nom);
    const liens = (hub ? '<span class="lc-track" data-track="munitions" data-track-id="' + esc(hub.id) + '" data-track-name="' + esc(it.nom) + '"></span>' : '') + '<a href="../armes.html#munitions">Sur la page Armurerie</a>';
    return page({ file, nom: it.nom, titre: titreBorne(it.nom, 'type de munitions'), description: court(it.nom + ' dans GTA VI : ' + (hub ? minuscule(hub.usage) + ' ; ' : '') + (armes.length ? nb(armes.length) + ' arme' + (armes.length > 1 ? 's' : '') + ' repérée' + (armes.length > 1 ? 's' : '') + ' les utilise' + (armes.length > 1 ? 'nt' : '') + ' sur Leonidakit' : 'aucune arme repérée') + ' ; prix et capacité à venir.'), indexable: false, image: null, kicker: 'Type de munitions', lede: (hub ? 'Type de munitions de GTA VI : ' + esc(minuscule(hub.usage)) + '. ' : '') + (armes.length ? nb(armes.length) + ' arme' + (armes.length > 1 ? 's' : '') + ' repérée' + (armes.length > 1 ? 's' : '') + ' sur Leonidakit.' : ''), tags: [[armes.length ? pluriel(armes.length, 'arme', 'armes') : 'Aucune arme repérée', armes.length > 0]], liens, art: '', body, crumbs: [['Armurerie', 'armes.html'], ['Types de munitions', 'armes.html#munitions']], scripts: hub ? ['suivi.js'] : [], heroClass: 'fhero--arme' });
  }
  {
    const f = FAM('munitions'), ordre = f.items.slice();
    ordre.forEach((it, i) => { write(it.cible, pageMunition(it, i, ordre)); NEXT.elements['munitions:' + it.id] = it.cible; });
    const file = 'munitions/index.html';
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + nb(ordre.length) + ' types de munitions sont relevés sur les fiches d’armes de Leonidakit. Chaque type a sa page : son usage, les armes repérées qui l’utilisent ; prix et capacité restent à venir, rien n’est inventé. La page <a href="../armes.html#munitions">Armurerie</a> les présente avec le suivi « Mes munitions ».</p>')
      + relCards('Les types de munitions', ordre.map(it => ({ href: path.basename(it.cible), marque: pluriel(ARMES.filter(a => a.mun === it.nom).length, 'arme repérée', 'armes repérées'), nom: it.nom })), 'types') + fin(file, '<a class="fiche-meth-a" href="../armes.html#munitions">Sur la page Armurerie</a>', null);
    write(file, page({ file, nom: 'Types de munitions de GTA VI', titre: titre('GTA 6 : les types de munitions'), description: court('Les ' + nb(ordre.length) + ' types de munitions relevés dans GTA VI, une page chacun, avec les armes repérées qui les utilisent ; prix et capacité à venir.'), indexable: true, kicker: 'Armurerie', lede: 'Une page par type de munitions : usage et armes repérées ; prix à venir.', tags: [[nb(ordre.length) + ' types', true]], liens: '<a href="../armes.html#munitions">Sur la page Armurerie</a>', art: '', body, crumbs: [['Armurerie', 'armes.html']], heroClass: 'fhero--arme', liste: ordre.map(it => [it.nom, it.cible]) }));
    resume.push(nb(ordre.length) + ' munitions');
  }

  /* ====================================================================================================================
     5. ÉDITIONS DU JEU
     ==================================================================================================================== */
  const E = ACTUS.editions, PRIX = ACTUS.prix;
  const SRC_ACTUS = ACTUS.sources || {};
  const srcActus = ids => (ids || []).map(id => SRC_ACTUS[id]).filter(Boolean).map(s => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer"' + (s.lang === 'en' ? ' translate="no"' : '') + '>' + esc(s.title) + '</a>' + (s.consultedAt ? ' <span class="unknown">(consulté le ' + esc(frDate(s.consultedAt)) + ')</span>' : '')).join('<br>');
  function pageEdition(it, i, ordre) {
    const file = it.cible, id = it.id;
    /* v7.96 (contrôle) : un contenu sans fiche dans actus.json (« Goodtime Gear ») mène à sa page d’achat quand elle existe (acquisitions.json, légende du média), sinon n’est pas une carte (plus de « ../null ») */
    const acqFor = nom => ACQ.items.find(x => x.name === nom || (x.mediaCaption || '').includes('« ' + nom + ' »'));
    const hrefContenu = c => { if (c.href) return '../' + c.href; const a = acqFor(c.nom); const it = a && FAM('achats').items.find(x => x.id === a.id), p = it && (it.page || it.cible); return p && exists(p) ? '../' + p : null; };
    const contenus = E.contenus.map(c => ({ href: hrefContenu(c), marque: c.cat === 'vehicules' ? 'Véhicule' : c.cat === 'armes' ? 'Arme' : cap(c.cat || 'contenu'), nom: c.fr || c.nom, media: c.media || null })).filter(c => c.href);
    let nom, texte, identite, media, alt, cards = [], cardsTitre = '', lede, desc;
    if (id === 'standard' || id === 'ultimate') {
      const x = E[id], prix = E.prix && E.prix[id];
      nom = x.titre; media = x.media; alt = x.alt;
      texte = [esc(x.texte), (x.points || []).length ? 'Ce qu’elle comprend : ' + x.points.map(p => esc(minuscule(p))).join(' ; ') + '.' : '', prix ? 'Prix relevé : ' + esc(prix) + ' sur le ' + esc(E.prix.label) + ' ; chaque revendeur fixe le sien.' : '', id === 'ultimate' ? 'Les seize contenus en plus ont chacun leur fiche, listée plus bas. ' + esc(E.amelioration) : esc(E.amelioration), E.boite && E.boite.length ? 'En boîte : ' + E.boite.map(b => esc(b)).join(' ') : ''].filter(Boolean).join(' ');
      identite = [['Édition', esc(x.titre)], ['Prix relevé', prix ? esc(prix) + ' ' + unknown('(' + E.prix.label + ')') : unknown('non relevé')], ['Contenu', (x.points || []).map(esc).join('<br>')], id === 'ultimate' ? ['Contenus en plus', nb(E.contenus.length)] : ['Amélioration Ultimate', esc(E.amelioration)], ['Bonus de précommande', (E.bonus || []).map(b => '<a href="../' + esc(b.href) + '">' + esc(b.titre) + '</a>').join(', ')], ['Sources', srcActus(['rs-support-editions', E.prix && E.prix.src].filter(Boolean)) || unknown('assistance de Rockstar')]];
      if (id === 'ultimate') { cards = contenus; cardsTitre = 'Les seize contenus de l’Édition Ultimate'; }
      lede = esc(x.texte); desc = x.titre + ' de GTA VI : ' + minuscule(x.texte) + (prix ? ' Prix relevé : ' + prix + '.' : '');
    } else if (id === 'amelioration') {
      nom = it.nom; media = E.ultimate.media; alt = E.ultimate.alt;
      texte = [esc(E.amelioration), 'Elle donne les seize contenus de l’Édition Ultimate, découverts chapitre après chapitre dans l’histoire de Jason et Lucia ; chacun a sa fiche, listée plus bas.', E.prix && E.prix.standard && E.prix.ultimate ? 'Repère de prix : l’Édition Standard est relevée à ' + esc(E.prix.standard) + ' et l’Ultimate à ' + esc(E.prix.ultimate) + ' sur le ' + esc(E.prix.label) + ' ; le prix de l’amélioration seule n’est pas publié.' : '', E.boite && E.boite[2] ? esc(E.boite[2]) : ''].filter(Boolean).join(' ');
      identite = [['Ce que c’est', esc(E.amelioration)], ['Contenus en plus', nb(E.contenus.length)], ['Prix', unknown('non publié ; Standard ' + (E.prix ? E.prix.standard + ', Ultimate ' + E.prix.ultimate : ''))], ['Où', 'PlayStation Store, Microsoft Store (numérique)'], ['Sources', srcActus(['rs-support-editions']) || unknown('assistance de Rockstar')]];
      cards = contenus; cardsTitre = 'Les seize contenus de l’amélioration';
      lede = 'L’amélioration vers l’Édition Ultimate, achetée à part : les seize contenus en plus.'; desc = 'L’amélioration vers l’Édition Ultimate de GTA VI : ' + minuscule(E.amelioration);
    } else {
      const c = PRIX.collector || {}; nom = it.nom; media = E.collector.media; alt = 'Le coffret collector ' + E.collector.t + ', photo officielle';
      texte = [esc(E.collector.d), ...(c.intro || []).map(esc), c.st && c.st.length ? 'Prix : ' + c.st.map(s => esc(s.t) + ' (' + esc(minuscule(ST_LABEL[s.statut] || s.statut)) + ')').join(' ; ') + '.' : '', c.objets && c.objets.length ? 'Ce qu’il y a dans la boîte : ' + c.objets.map(o => esc(o.t) + (o.d ? ' (' + esc(debutMinuscule(o.d).replace(/\.$/, '')) + ')' : '')).join(' ; ') + '.' : ''].filter(Boolean).join(' ');
      identite = [['Nom', esc(E.collector.t)], ['Contenu', c.objets && c.objets.length ? nb(c.objets.length) + ' objets, sans le jeu' : 'Onze objets, sans le jeu'], ['Prix', c.st && c.st.length ? c.st.map(s => esc(s.t)).join('<br>') : esc(E.collector.d)], ['Où', 'Boutique Rockstar, édition limitée'], ['Sources', srcActus((c.st || []).map(s => s.src)) || unknown('boutique Rockstar')]];
      lede = esc(E.collector.d); desc = E.collector.t + ', le coffret collector de GTA VI : ' + minuscule(E.collector.d);
    }
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>')
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Les autres éditions</h2>\n    ' + liste(ordre.filter(x => x.id !== id).map(x => ({ href: path.basename(x.cible), nom: x.nom }))) + '\n    <p class="fiche-txt"><a href="../editions.html">Comparer les éditions</a>, <a href="../prix.html">les prix et le collector</a>.</p>\n  </div>\n</section>\n'
      + relCards(cardsTitre, cards, 'contenus')
      + fin(file, '<a class="fiche-meth-a" href="../editions.html">La page des éditions</a>', { q: 'Combien de temps de jeu pour rentabiliser ton édition ?', d: 'Écris ce que tu paies et ce que tu gagnes par partie : le calculateur te dit ce que ça pèse.', params: 'tool=budget&amp;type=edition&amp;from=editions', cta: 'Faire le calcul' })
      + prevNext(ordre, i, x => path.basename(x.cible), x => x.nom);
    return page({ file, nom, titre: id === 'collector' ? titre('GTA 6 : coffret collector The Goodtime State') : titreBorne(nom), description: court(desc, 155, (id === 'standard' || id === 'ultimate') ? nom + ' de GTA VI : contenu, prix relevés, bonus et sources.' : id === 'amelioration' ? 'L’amélioration vers l’Édition Ultimate de GTA VI : contenu, prix relevés et sources.' : 'Le coffret collector The Goodtime State de GTA VI : contenu, prix relevés et sources.' /* v8.01 : le nom du coffret dans la description (référencement) */), indexable: true, image: media ? imageDe(media) : null, kicker: 'Édition du jeu', lede, tags: [['Nommé par Rockstar', true], ...(E.prix && E.prix[id] ? [[E.prix[id], false]] : [])], liens: '<a href="../editions.html">Comparer les éditions</a><a href="../prix.html">Les prix</a>', art: media ? figureMedia(media, alt) : '', body, crumbs: [['Actualités', 'actus.html'], ['Éditions', 'editions.html']], heroClass: 'fhero--edition', css: ['actualite-fiches.css']/* v8.01 : cartes liées illustrées */ });
  }
  {
    const f = FAM('editions'), ordre = f.items.slice();
    ordre.forEach((it, i) => { write(it.cible, pageEdition(it, i, ordre)); NEXT.elements['editions:' + it.id] = it.cible; });
    resume.push(nb(ordre.length) + ' éditions');
  }

  /* ====================================================================================================================
     6. ACHATS ET SERVICES SANS FICHE (acquisitions.json)
     ==================================================================================================================== */
  const DPA = require('./donnees-publiees.cjs'); /* v8.04 (jour J) : prix publié d’un achat (outils/acquisitions.json) */
  const ACQ_MODE = { 'edition-bonus': 'livré avec une édition', 'preorder-bonus': 'bonus de précommande', purchase: 'achat dans le jeu', free: 'gratuit', mission: 'obtenu en mission' };
  const EVID = { 1: 'Nommé ou décrit par Rockstar', 2: 'Vu dans un média officiel', 3: 'Identification communautaire' };
  function pageAchat(it, i, ordre) {
    const x = ACQ.items.find(y => y.id === it.id), file = it.cible, cat = ACQ.categories.find(c => c.id === x.category) || {}, route = (cat.route || '/achats.html').replace(/^\//, '');
    const src = x.sourceId && ACQ.sources ? ACQ.sources[x.sourceId] : null;
    const media = (x.media || [])[0];
    const texte = [esc(x.description), 'Obtention : ' + esc(ACQ_MODE[x.acquisition] || x.acquisition) + (x.condition ? ' (' + esc(minuscule(x.condition)) + ')' : '') + '.', 'Statut : ' + esc(minuscule(EVID[x.evidenceLevel] || 'à confirmer')) + '.', x.price && typeof x.price === 'object' && DPA.prixDe(x) ? esc(DPA.phrasePrix(DPA.prixDe(x))) + '.' /* v8.04 (jour J) : prix publié au format (statut, fourchette, source, date) */ : x.price != null ? 'Prix relevé : ' + esc(money(x.price)) + '.' : 'Prix séparé dans GTA VI : non publié ; ce contenu vient avec une édition ou une précommande.', src ? 'Source : ' + (src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">' + esc(src.title || src.label || x.sourceId) + '</a>' : esc(src.title || src.label || x.sourceId)) + '.' : ''].filter(Boolean).join(' ');
    const identite = [['Nom', esc(x.name)], ['Catégorie', '<a href="../' + esc(route) + '">' + esc(cat.label || x.category) + '</a>'], ['Type', esc(x.kind || 'contenu')], ['Obtention', esc(ACQ_MODE[x.acquisition] || x.acquisition)], ['Condition', x.condition ? esc(x.condition) : unknown('non précisée')], ['Statut', esc(EVID[x.evidenceLevel] || 'À confirmer')], ['Prix dans GTA VI', x.price && typeof x.price === 'object' && DPA.prixDe(x) ? esc(DPA.fmt(DPA.prixDe(x).value) + ' ' + DPA.prixDe(x).unit + DPA.fourchette(DPA.prixDe(x)) + ', ' + DPA.prixDe(x).label) : x.price != null ? esc(money(x.price)) : unknown('non publié, lié à une édition')], ['Suivi', x.trackable ? 'Peut être coché dans Ma progression' : unknown('collection annoncée, détail des pièces à documenter')], ['Source', src ? (src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">' + esc(src.title || src.label || x.sourceId) + '</a>' : esc(src.title || src.label || x.sourceId)) : unknown('non précisée')]];
    const freres = ordre.filter(y => y.id !== it.id).map(y => { const z = ACQ.items.find(q => q.id === y.id); return { href: path.basename(y.cible), marque: ACQ_MODE[z.acquisition] || z.acquisition, nom: z.name }; });
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>')
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Ce qui arrive avec le jeu</h2>\n    <p class="fiche-txt">Le détail des pièces et un éventuel achat séparé ne sont pas publiés : la page le dira dès que Rockstar aura précisé. D’ici là, rien n’est inventé.</p>\n  </div>\n</section>\n'
      + relCards('Les autres contenus liés aux éditions', freres, 'autres')
      + fin(file, '<a class="fiche-meth-a" href="../' + esc(route.split('#')[0]) + '#' + esc(x.id) + '">Sa carte dans ' + esc(cat.label || 'la section') + '</a>', null)
      + prevNext(ordre, i, y => path.basename(y.cible), y => (ACQ.items.find(q => q.id === y.id) || {}).name || y.nom);
    return page({ file, nom: x.name, titre: titreBorne(x.name), description: court(x.name + ' dans GTA VI : ' + minuscule(x.description) + ' ' + cap(ACQ_MODE[x.acquisition] || x.acquisition) + '.'), indexable: true, image: media ? imageDe(media) : null, kicker: (cat.label || 'Achats') + ', ' + (ACQ_MODE[x.acquisition] || x.acquisition), lede: esc(x.description), tags: [[EVID[x.evidenceLevel] || 'À confirmer', x.evidenceLevel === 1], [cap(ACQ_MODE[x.acquisition] || x.acquisition), false]], liens: '<a href="../' + esc(route.split('#')[0]) + '#' + esc(x.id) + '">Sa carte dans ' + esc(cat.label || 'la section') + '</a><a href="../achats.html">Tout ce qui s’achète</a>', art: media ? figureMedia(media, x.name + ', visuel officiel') : '', body, crumbs: [['Tout ce qui s’achète', 'achats.html'], [cat.label || 'Section', route]], heroClass: 'fhero--conso' });
  }
  {
    const f = FAM('achats'), ordre = f.items.filter(it => it.cible && (!it.page || it.page === it.cible));
    ordre.forEach((it, i) => { write(it.cible, pageAchat(it, i, ordre)); NEXT.elements['achats:' + it.id] = it.cible; });
    for (const it of f.items) if (it.page && it.page !== it.cible) NEXT.elements['achats:' + it.id] = it.page;
    resume.push(nb(ordre.length) + ' achats');
  }

  /* ====================================================================================================================
     7. VISUELS OFFICIELS (medias-officiels.json), avec les pages du site qui les reprennent
     ==================================================================================================================== */
  const TYPE_COURT = { 'official-screenshot': 'capture officielle', 'official-artwork': 'illustration officielle', 'official-artwork-detail': 'détail d’illustration', 'official-trailer-frame': 'image de trailer', 'official-video-still': 'image de vidéo', 'official-video-frame-mirror': 'image de vidéo', 'official-product-photo': 'photo officielle' };
  const TYPE_MEDIA = { 'official-screenshot': 'capture officielle', 'official-artwork': 'illustration officielle', 'official-artwork-detail': 'détail d’une illustration officielle', 'official-trailer-frame': 'image tirée d’un trailer officiel', 'official-video-still': 'image tirée d’une vidéo officielle', 'official-video-frame-mirror': 'image tirée d’une vidéo officielle (copie miroir)', 'official-product-photo': 'photo officielle d’un produit' };
  const usages = (() => { /* pages françaises qui reprennent chaque visuel (img/officiel/<id>-…) : titres lus une fois */
    const out = new Map(); const skip = /^(en|es|it|de|pt|outils|node_modules|visuels|img|photos|leo|fonts|\.git)$/;
    const walk = d => { for (const x of fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })) { const rel = d ? d + '/' + x.name : x.name; if (x.isDirectory()) { if (!skip.test(x.name)) walk(rel); } else if (x.name.endsWith('.html') && !/^google/.test(x.name) && rel !== '404.html') { const h = read(rel); if (/http-equiv=["']refresh/i.test(h)) continue; if (rel === 'codes-de-triche/modele.html') continue; /* v8.06 (audit DATA-01) : la page de démonstration (codes fictifs, noindex) n’est reliée depuis aucune page visible */ /* v7.96 (contrôle) : une page lue au milieu de la chaîne peut être brute (titre « GTA VI … | Leonidakit » avant titleSeo, pas encore d’image de partage en tête) ou finie : le titre est lu tel que les moteurs le verront (titleSeo, idempotent) et seules les images du corps comptent, pour que la page du visuel ne change pas d’une chaîne à l’autre */ const t = (titleSeo(h).match(/<title>([^<]*)<\/title>/) || [])[1]; if (!t) continue; const ids = new Set(); for (const m of h.slice(h.indexOf('</head>')).matchAll(/img\/officiel\/([a-z0-9-]+?)-(?:480|800|1280)\.webp/g)) ids.add(m[1]); for (const id of ids) { if (!out.has(id)) out.set(id, []); out.get(id).push({ rel, titre: t.replace(/\s*\|\s*Leonidakit$/, '').replace(/&#39;/g, '’').replace(/&amp;/g, '&').replace(/[\u00a0\u202f]/g, ' ').replace(/\bGTA 6\b/g, 'GTA VI') /* les espaces insécables posées par sync-site ne comptent pas : contenu stable avant et après la synchronisation */ }); } } } };
    walk(''); return out;
  })();
  function pageVisuelOfficiel(it, i, ordre) {
    const m = MED[it.id], file = it.cible, v1280 = m.variants.find(x => x.w === 1280) || m.variants[m.variants.length - 1];
    const type = TYPE_MEDIA[m.mediaType] || 'image officielle', uses = (usages.get(m.id) || []).filter(u => !u.rel.startsWith('visuels/')).sort((a, b) => a.titre.localeCompare(b.titre, 'fr'));
    const hote = (m.source || '').replace(/^https?:\/\//, '').split('/')[0];
    const texte = [esc(m.titre || m.id) + ' est une ' + esc(type) + ' de GTA VI, publiée par Rockstar Games' + (hote ? ' (' + esc(hote) + ')' : '') + (m.via ? ', reprise via ' + esc(m.via) : '') + '.', m.alt ? 'Ce qu’elle montre : ' + esc(m.alt.replace(/\.?$/, '.')) : 'Aucune description n’a été rédigée pour cette image : son titre est celui du fichier officiel.', m.frameAt != null ? 'Image prise à ' + esc(String(m.frameAt)) + ' s de la vidéo' + (m.timePrecision ? ' (' + esc(m.timePrecision) + ')' : '') + '.' : '', m.recadrage ? 'Recadrage : ' + esc(m.recadrage) + '.' : '', 'Crédit : ' + esc(m.credit || '© Rockstar Games, Take-Two Interactive') + '. Leonidakit la reprend en ' + m.variants.map(v => v.w + ' px').join(' et ') + ', sans retouche.', uses.length ? 'Sur Leonidakit, elle illustre ' + pluriel(uses.length, 'page', 'pages') + ' : ' + uses.slice(0, 8).map(u => '<a href="../' + esc(u.rel) + '">' + esc(u.titre) + '</a>').join(', ') + (uses.length > 8 ? ' et ' + nb(uses.length - 8) + ' autres' : '') + '.' : 'Elle est listée dans les crédits du site.', m.consultedAt ? 'Page officielle consultée le ' + esc(frDate(m.consultedAt)) + '.' : ''].filter(Boolean).join(' ');
    const identite = [['Titre', esc(m.titre || m.id)], ['Type', esc(cap(type))], ['Source', m.source ? '<a href="' + esc(m.source) + '" target="_blank" rel="noopener noreferrer">' + esc(hote || m.source) + '</a>' : unknown('non précisée')], ['Crédit', esc(m.credit || '© Rockstar Games, Take-Two Interactive')], ['Tailles servies', m.variants.map(v => v.w + ' × ' + v.h + ' px').join(', ')], m.alt ? ['Description', esc(m.alt)] : null, ['Reprise sur', uses.length ? uses.map(u => '<a href="../' + esc(u.rel) + '">' + esc(u.titre) + '</a>').join('<br>') : unknown('les crédits seulement')], m.consultedAt ? ['Consulté le', esc(frDate(m.consultedAt))] : null];
    const voisins = [ordre[(i - 1 + ordre.length) % ordre.length], ordre[(i + 1) % ordre.length]].filter(x => x.id !== it.id);
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>')
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Droits et usage</h2>\n    <p class="fiche-txt">Cette image appartient à Rockstar Games et Take-Two Interactive. Leonidakit, site de fan indépendant, la montre pour documenter le jeu, avec son crédit et un lien vers la page officielle ; elle n’est ni vendue ni modifiée. Pour la réutiliser, passe par la source officielle.</p>\n  </div>\n</section>\n'
      + fin(file, '<a class="fiche-meth-a" href="../medias.html#media-' + esc(m.id) + '">Dans les crédits du site</a>', null)
      + prevNext(ordre, i, x => path.basename(x.cible), x => x.nom);
    /* v8.04 (référencement) : 60 à 160 signes, en phrases entières (déjà traduites) : 1. comme avant quand ça tient (titre, type,
       ce que montre l’image, reprises ; coupé sur une fin de phrase) ; 2. titre, type et ce que montre l’image ; 3. titre, type,
       crédit et reprises (la phrase des visuels sans description) ; 4. titre, type et crédit. Avant, une description trop longue
       était coupée après « Grassrivers 04, image officielle de GTA VI. » (43 signes). */
    const tete = (m.titre || m.id) + ', ' + type + ' de GTA VI', reprise = uses.length ? ' Reprise sur ' + pluriel(uses.length, 'page', 'pages') + ' de Leonidakit.' : '', montre = m.alt ? m.alt.replace(/\.?$/, '.') : '';
    const description = descriptionBornee([court(tete + (montre ? '. ' + montre : ', publiée par Rockstar Games et créditée.') + reprise), montre ? tete + '. ' + montre : '', tete + ', publiée par Rockstar Games et créditée.' + reprise, tete + ', publiée par Rockstar Games et créditée.']);
    return page({ file, nom: m.titre || m.id, titre: titreBorne(m.titre || m.id, TYPE_COURT[m.mediaType] || 'image officielle'), description, indexable: !!it.indexable, image: imageDe(m.id), kicker: cap(type), lede: m.alt ? esc(m.alt) : esc(cap(type)) + ' de GTA VI, publiée par Rockstar Games, créditée et reprise sans retouche.', tags: [['Visuel officiel', true], [cap(type).split(' ')[0], false]], liens: (m.source ? '<a href="' + esc(m.source) + '" target="_blank" rel="noopener noreferrer">Page officielle ↗</a>' : '') + '<a href="../medias.html#media-' + esc(m.id) + '">Les crédits</a>', art: figureMedia(m.id, m.alt, { sizes: '(max-width: 900px) 100vw, 440px' }), body, crumbs: [['Médias et crédits', 'medias.html'], ['Visuels officiels', 'visuels/index.html']], heroClass: 'fhero--visuel' });
  }
  {
    const f = FAM('visuels'), ordre = f.items.slice().sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
    ordre.forEach((it, i) => { write(it.cible, pageVisuelOfficiel(it, i, ordre)); NEXT.elements['visuels:' + it.id] = it.cible; });
    const TYPE_PL = { 'official-screenshot': 'Captures officielles', 'official-artwork': 'Illustrations officielles', 'official-artwork-detail': 'Détails d’illustrations officielles', 'official-trailer-frame': 'Images tirées de trailers officiels', 'official-video-still': 'Images tirées de vidéos officielles', 'official-video-frame-mirror': 'Images tirées de vidéos officielles, en copie miroir' /* v7.97 : jamais « (copies miroir) (4) » */, 'official-product-photo': 'Photos officielles de produits' };
    const file = 'visuels/index.html', parType = new Map(); for (const it of ordre) { const t = TYPE_PL[MED[it.id].mediaType] || 'Images officielles'; if (!parType.has(t)) parType.set(t, []); parType.get(t).push(it); }
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + nb(ordre.length) + ' visuels officiels de GTA VI sont repris sur Leonidakit, tous publiés par Rockstar Games et crédités. Chaque visuel a sa page : ce qu’il montre quand une description a été rédigée, sa source, ses tailles servies et les pages du site qui le reprennent. Les <a href="../medias.html">crédits</a> les montrent tous en vignettes.</p>')
      + '<section class="shell reveal" id="types">\n' + [...parType].map(([t, items]) => '  <h2 class="sec-h">' + esc(t) + ' (' + items.length + ')</h2>\n  ' + liste(items.map(it => ({ href: path.basename(it.cible), nom: it.nom, small: (usages.get(it.id) || []).filter(u => !u.rel.startsWith('visuels/')).length ? pluriel((usages.get(it.id) || []).filter(u => !u.rel.startsWith('visuels/')).length, 'page', 'pages') : 'crédits seulement' })))).join('\n') + '\n</section>\n'
      + fin(file, '<a class="fiche-meth-a" href="../medias.html">Médias et crédits</a>', null);
    write(file, page({ file, nom: 'Visuels officiels de GTA VI', titre: titre('GTA 6 : tous les visuels officiels repris'), description: court('Les ' + nb(ordre.length) + ' visuels officiels de GTA VI repris sur Leonidakit, une page chacun : ce qu’il montre, sa source, ses tailles et ses reprises.'), indexable: true, kicker: 'Médias et crédits', lede: 'Une page par visuel officiel : description, source, tailles servies, pages qui le reprennent.', tags: [[nb(ordre.length) + ' visuels', true], ['© Rockstar Games', false]], liens: '<a href="../medias.html">Les crédits en vignettes</a>', art: '', body, crumbs: [['Médias et crédits', 'medias.html']], heroClass: 'fhero--visuel', liste: ordre.map(it => [it.nom, it.cible]) }));
    resume.push(nb(ordre.length) + ' visuels');
  }

  /* ====================================================================================================================
     8. GRANDS MOMENTS : une page par annonce datée (actus.json), les moments des dossiers du monde sans annonce jumelle
     ==================================================================================================================== */
  const actusMod = require('./gen-actus.cjs'); const ctx = actusMod.load(ROOT);
  const JUMEAUX = { t1: 'trailer-1', t2: 'trailer-2', el: 'extended-look', presse: 'apercus-presse', famitsu: 'entretien-famitsu', radio: 'stations-radio', lancement: 'bande-annonce-lancement' };
  const TYPES_A = { video: 'vidéo', annonce: 'annonce', presse: 'presse', musique: 'musique', produit: 'produit dérivé', ...Object.fromEntries(Object.entries((ACTUS.actus && ACTUS.actus.types) || {}).filter(([k]) => !['video', 'annonce', 'presse', 'musique', 'produit'].includes(k)).map(([k, v]) => [k, minuscule(v)])) };
  const momentsMonde = Object.entries(MONDE.evenements);
  function pageMoment(x, i, ordre) {
    const file = x.file, e = x.annonce, mm = x.monde;
    const evs = e ? (e.evs || (e.ev ? [e.ev] : [])) : [x.id];
    const rev = evs.flatMap(ev => actusMod.revelations(ctx, [ev]));
    const vid = e && e.video ? ACTUS.videos.liste.find(v => v.id === e.video) : null;
    /* v8.01 : un moment sans affiche ni visuel propre prend le premier visuel officiel qu’il a apporté à une fiche (chrono des dossiers) */
    const revMedia = rev.find(r => r.media && MED[r.media]);
    const media = vid ? vid.affiche : (mm && mm.media) || (e && e.media) || (revMedia ? revMedia.media : null), alt = e && e.alt ? e.alt : (mm ? mm.titre + ', visuel officiel' : (revMedia ? (e ? e.titre : mm.titre) + ', visuel officiel' : ''));
    const iso = e ? e.iso : mm.iso, dateTxt = e && e.dateTexte ? e.dateTexte : frLong(iso);
    const titreM = e ? e.titre : mm.titre;
    const texte = [e ? esc(e.texte) : esc(mm.titre) + ' : un moment de la chronologie de GTA VI noté dans les dossiers du monde de Leonidakit' + (mm.date ? ', ' + esc(mm.date) : '') + '.', 'Date : ' + esc(dateTxt) + '.' + (e ? ' Type : ' + esc(TYPES_A[e.type] || e.type) + '. Statut : ' + esc(minuscule(ST_LABEL[e.statut] || e.statut)) + '.' : ''),
      vid ? 'La vidéo a sa page : ' + lien('videos/' + vid.id + '.html', vid.titre || vid.nom || 'la page de la vidéo') + '.' : '',
      rev.length ? 'Ce que ce moment a montré, fiche par fiche : ' + rev.slice(0, 10).map(r => lien(r.fiche.href, r.fiche.name) + (r.texte ? ' (' + esc(debutMinuscule(r.texte.replace(/\.$/, ''))) + ')' : '')).join(' ; ') + (rev.length > 10 ? ' ; et ' + (rev.length - 10 > 1 ? nb(rev.length - 10) + ' autres fiches, listées' : 'une autre fiche, listée') + ' plus bas' : '') + '.' : '',
      e && e.liens && e.liens.length ? 'Pour aller plus loin : ' + e.liens.map(l => lien(l.href, l.label)).join(', ') + '.' : ''].filter(Boolean).join(' ');
    const identite = [['Date', '<time datetime="' + esc(iso) + '">' + esc(dateTxt) + '</time>'], e ? ['Type', esc(cap(TYPES_A[e.type] || e.type))] : ['Dans les dossiers', esc(mm.date || frLong(iso))], ['Statut', esc(ST_LABEL[e ? e.statut : 'officiel'] || 'Nommé ou décrit par Rockstar')], vid ? ['Vidéo', lien('videos/' + vid.id + '.html', vid.titre || vid.nom || vid.id)] : null, rev.length ? ['Fiches concernées', nb(rev.length)] : null, e ? ['Sources', srcActus(e.sources) || unknown('voir la frise des Actualités')] : ['Source', 'Dossiers du monde de Leonidakit (captures et publications officielles)']];
    const cards = rev.map(r => ({ href: '../' + r.fiche.href, marque: r.fiche.kind + (r.statut ? ', ' + (ST_LABEL[r.statut] || r.statut).toLowerCase() : ''), nom: r.fiche.name, media: r.media || r.fiche.media || null }));
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + texte + '</p>')
      + '<section class="shell fiche-body">\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Identité</h2>\n    ' + tableau(identite) + '\n  </div>\n  <div class="fiche-col reveal">\n    <h2 class="sec-h">Avant et après</h2>\n    ' + liste([ordre[i - 1], ordre[i + 1]].filter(Boolean).map(y => ({ href: path.basename(y.file), nom: y.nom, small: frLong(y.iso) + (y === ordre[i - 1] ? ', juste avant' : ', juste après') }))) + '\n    <p class="fiche-txt"><a href="../actus.html#frise">Toute la frise des annonces</a>, <a href="index.html">tous les grands moments</a>.</p>\n  </div>\n</section>\n'
      + relCards('Les fiches que ce moment a fait avancer', cards, 'fiches')
      + fin(file, '<a class="fiche-meth-a" href="../actus.html' + (e ? '#ev-' + esc(e.id) : '') + '">Dans la frise des Actualités</a>', null)
      + prevNext(ordre, i, y => path.basename(y.file), y => y.nom);
    return page({ file, nom: titreM, titre: titreBorne(titreM, iso.slice(0, 4)), description: court(titreM + ', ' + dateTxt + ' : ' + (e ? (TYPES_A[e.type] || e.type) + ' de GTA VI, ' + minuscule(ST_LABEL[e.statut] || e.statut) : 'moment des dossiers du monde de GTA VI') + (rev.length ? ' ; ' + pluriel(rev.length, 'fiche concernée', 'fiches concernées') + ', ce que ce moment a montré fiche par fiche.' : '.')), indexable: !!iso, image: media ? imageDe(media) : null, kicker: 'Grand moment, ' + dateTxt, lede: e ? esc(e.texte) : esc(mm.titre) + ', ' + esc(dateTxt) + ' : ce que ce moment a montré, fiche par fiche.', tags: [[ST_LABEL[e ? e.statut : 'officiel'] || 'Officiel', true], [e ? cap(TYPES_A[e.type] || e.type) : 'Dossiers du monde', false], ...(rev.length ? [[pluriel(rev.length, 'fiche', 'fiches'), false]] : [])], liens: (vid ? lien('videos/' + vid.id + '.html', 'La vidéo') : '') + '<a href="../actus.html' + (e ? '#ev-' + esc(e.id) : '') + '">Dans la frise</a>', art: media ? figureMedia(media, alt) : '', body, crumbs: [['Actualités', 'actus.html'], ['Grands moments', 'moments/index.html']], heroClass: 'fhero--moment', css: ['actualite-fiches.css']/* v8.01 : cartes liées illustrées */ });
  }
  {
    const f = FAM('moments');
    const ordre = ACTUS.evenements.map(e => ({ id: e.id, nom: e.titre, iso: e.iso, annonce: e, monde: null, file: 'moments/' + slug(e.id) + '.html' }));
    for (const [k, mm] of momentsMonde) if (!JUMEAUX[k]) { const it = f.items.find(x => x.id === k); ordre.push({ id: k, nom: mm.titre, iso: mm.iso, annonce: null, monde: mm, file: it ? it.cible : 'moments/' + slug(mm.titre) + '.html' }); }
    ordre.sort((a, b) => a.iso.localeCompare(b.iso));
    ordre.forEach((x, i) => { write(x.file, pageMoment(x, i, ordre)); NEXT.elements['moments:' + x.id] = x.file; });
    for (const [k, a] of Object.entries(JUMEAUX)) NEXT.elements['moments:' + k] = 'moments/' + slug(a) + '.html';
    const file = 'moments/index.html';
    /* v8.04 (refonte F) : la période couverte se lit sur la frise (elle commence en 2022, avant le premier trailer) */
    const jour = iso => /^\d{4}-\d{2}-\d{2}$/.test(iso), debutM = ordre[0].iso, finM = ordre[ordre.length - 1].iso;
    const periode = (jour(debutM) ? 'du ' : 'de ') + frLong(debutM) + (jour(finM) ? ' au ' : ' à ') + frLong(finM);
    const body = section('essentiel', 'L’essentiel', '  <p class="fiche-txt rise">' + nb(ordre.length) + ' grands moments de GTA VI, ' + periode + ' : chaque annonce datée de la frise des Actualités et chaque moment des dossiers du monde a sa page, avec ce qu’il a montré fiche par fiche. La <a href="../actus.html#frise">frise</a> les garde dans l’ordre, avec leurs sources.</p>')
      /* v8.01 : chaque moment en carte à image (son affiche ou son visuel officiel), du plus récent au plus ancien */
      + imageCards(ordre.slice().reverse().map(x => { const e = x.annonce, mm = x.monde, vid = e && e.video ? ACTUS.videos.liste.find(v => v.id === e.video) : null; const evs = e ? (e.evs || (e.ev ? [e.ev] : [])) : [x.id]; const rm = evs.flatMap(ev => actusMod.revelations(ctx, [ev])).find(r => r.media && MED[r.media]); return { href: path.basename(x.file), nom: x.nom, small: frLong(x.iso) + (e ? ', ' + (TYPES_A[e.type] || e.type) : ', dossiers du monde'), media: vid ? vid.affiche : (mm && mm.media) || (e && e.media) || (rm ? rm.media : null) }; }), 'moments')
      + fin(file, '<a class="fiche-meth-a" href="../actus.html">Actualités et vidéos</a>', null);
    write(file, page({ file, nom: 'Les grands moments de GTA VI', titre: titre('GTA 6 : tous les grands moments, de ' + debutM.slice(0, 4) + ' à ' + finM.slice(0, 4)), description: court('Les ' + nb(ordre.length) + ' grands moments de GTA VI, une page chacun : date, ce que Rockstar a publié, les fiches que chaque annonce a fait avancer.'), indexable: true, kicker: 'Actualités', lede: 'Une page par annonce datée et par moment des dossiers du monde : date, statut, sources, fiches concernées.', tags: [[nb(ordre.length) + ' moments', true], [nb(ACTUS.evenements.length) + ' annonces', false]], liens: '<a href="../actus.html#frise">La frise</a>', art: '', body, crumbs: [['Actualités', 'actus.html']], heroClass: 'fhero--moment', liste: ordre.map(x => [x.nom, x.file]), css: ['actualite-fiches.css']/* v8.01 : sommaire en cartes à image */ }));
    resume.push(nb(ordre.length) + ' moments');
  }

  /* ====================================================================================================================
     9. INDEX POUR LA RECHERCHE ET LÉO (outils/elements-index.json) : marques, types de munitions, grands moments, éditions
     ==================================================================================================================== */
  {
    const fold = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const recherche = [], leo = [];
    const push = (l, k, u, s, row) => { recherche.push({ l, k, u: '/' + u, s: fold(s), w: 0 }); if (row) leo.push({ ...row, url: '/' + u }); };
    for (const it of FAM('marques').items) { const m = MARQUES.find(x => x.name === it.nom), vs = V.filter(v => v.marque === it.nom), ev = m && m.evoque ? m.evoque.replace(/^évoque /, '') : null; push(it.nom, 'Marque de véhicules', it.cible, [it.nom, ev, 'marque constructeur véhicules', ...vs.map(v => v.nom)].filter(Boolean).join(' '), { key: 'marque:' + it.id, id: it.id, kind: 'marque', name: it.nom, aliases: [] /* v8.00 : le constructeur réel rapproché (« Ferrari ») n’est pas un autre nom de la marque : « trouve-moi la Ferrari » doit mener aux véhicules qu’elle inspire, pas à la page de Grotti ; il reste dans la recherche du site et dans la fiche */, category: 'Marque de véhicules', proof: ev ? 'Marque fictive de GTA VI ; la communauté y voit ' + ev + ' (observation, jamais une licence). ' + nb(vs.length) + ' véhicule' + (vs.length > 1 ? 's repérés' : ' repéré') + ' sur le site.' : 'Marque fictive de GTA VI ; aucun constructeur réel rapproché. ' + nb(vs.length) + ' véhicule' + (vs.length > 1 ? 's repérés' : ' repéré') + ' sur le site.' }); }
    for (const it of FAM('munitions').items) { const hub = HUBS.armes.munitions.items.find(x => x.nom === it.nom), armes = ARMES.filter(a => a.mun === it.nom); push(it.nom, 'Type de munitions', it.cible, [it.nom, hub && hub.usage, 'munitions balles cartouches armurerie', ...armes.map(a => a.nom)].filter(Boolean).join(' '), null /* v7.97 : pas de fiche Léo pour un type de munitions (le lexique de Léo ramène « cartouches » à « munitions » ; l’Armurerie répond déjà) */); }
    for (const it of FAM('editions').items) push(it.nom, 'Édition du jeu', it.cible, [it.nom, 'édition standard ultimate collector précommande prix'].join(' '), null /* v7.97 : pas de fiche Léo pour une édition (« l’ultimate » détournait les questions sur le contenu de l’Ultimate et les véhicules ; les sujets Éditions répondent déjà) */);
    for (const it of FAM('moments').items) { const e = ACTUS.evenements.find(x => x.id === it.id), mm = MONDE.evenements[it.id], page = NEXT.elements['moments:' + it.id]; if (!page || (!e && !mm)) continue; if (it.doublonDe) continue; /* v8.00 : un moment qui porte le nom d’une édition (« Édition Ultimate », « Captures de l’Édition Ultimate ») reste un résultat de recherche sans fiche Léo : il répondait à « le contenu de l’Ultimate » ou « le Kamacho est-il dans l’Ultimate », que les sujets Éditions traitent */ const nomEdition = /[EÉ]dition (?:Ultimate|Standard)|^(?:Le )?Trailer \d/i.test(it.nom) /* et les deux trailers : « will there be a trailer 3 » ouvrait la fiche du Trailer 1 ; les sujets Vidéos et Trailer 3 de Léo y répondent */; push(it.nom, 'Grand moment', page, [it.nom, e ? e.texte : '', 'annonce trailer actualité moment'].join(' '), nomEdition ? null : { key: 'moment:' + it.id, id: it.id, kind: 'moment', name: it.nom, aliases: [], category: 'Grand moment', /* v7.97 : libellé fixe (traduit tel quel) ; la date est sur la page */ proof: e ? 'Annonce datée de la frise des Actualités ; ' + minuscule(ST_LABEL[e.statut] || e.statut) + '.' : 'Moment noté dans les dossiers du monde de Leonidakit.' }); }
    const out = { _note: 'v7.97 (lot C) : lignes de recherche (search-index.js) et de Léo (leo-index.json) pour les pages du lot B sans ligne jusque-là : marques, types de munitions, éditions, grands moments. Écrit par outils/gen-pages-elements-b.cjs.', recherche, leo };
    const f = path.join(ROOT, 'outils/elements-index.json'), txt = JSON.stringify(out, null, 1) + '\n';
    if (!exists('outils/elements-index.json') || read('outils/elements-index.json') !== txt) fs.writeFileSync(f, txt);
    resume.push(nb(recherche.length) + ' lignes de recherche');
  }

  return { resume: resume.join(', ') };
};
