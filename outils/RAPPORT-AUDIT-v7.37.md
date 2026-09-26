# Rapport d’audit final — v7.37 (26 septembre 2026)

Base auditée : zip `Leonidadex-main (10)` = v7.36, SHA-256 `3bc615ea22974debccf5092378e308efee639a6b3cd69b93e8b6104ef5e03428`, 4 444 fichiers dont 406 pages HTML. Mission : relire chaque page, chaque section et chaque mot ; vérifier alignements, animations et charte ; corriger chaque petite erreur ; optimiser le référencement sans changer les textes visibles. Aucune publication, aucun push, aucun changement Vercel n’a été fait depuis cet environnement.

## 1. Méthode

- Inventaire : 406 pages (32 à la racine, 314 fiches véhicules, 31 fiches armes, 29 fiches du monde), 37 053 références internes.
- Passage automatique (Chromium / Playwright, `audit.js` hors dépôt) sur chaque page : débordement horizontal, grilles (rangées incomplètes, 4 + 2, carte isolée à gauche), textes coupés, images cassées / déformées / agrandies, éléments restés invisibles après défilement (animations), identifiants doublés, liens vides, ordre des titres, cibles tactiles < 24 px, chevauchement d’éléments fixes, erreurs console et requêtes en échec. 155 pages représentatives × 390 et 1 280 px, puis les 31 pages de la racine × 320, 768, 1 024, 1 440 et 1 920 px ; second passage sur les 12 pages touchées après correction.
- Relecture des textes : extraction de tout le texte visible des 406 pages et des données (JSON, JS), recherche systématique des apostrophes droites, des espaces avant la ponctuation haute, des nombres non groupés, du « vous », des variantes de marque (« LeonidaKit », « Édition Ultime »), des contradictions entre fiche et inspiration (véhicules), des titres et descriptions hors gabarit.
- Fonctionnel : parcours au clavier et à la souris (Explorer, recherche, calculateur en Simple / Pas à pas / Expert, business plan, garage, comparateur, classement, carte, collectibles, Léo, import / export), mouvement réduit, impression.
- Tests : `node --test outils/tests/*.test.cjs` (373), `node outils/verifier.js`, `outils/tests/calculateurs-browser.cjs` (278), régénération complète comparée à la base (seuls les changements voulus et les empreintes `?v=` diffèrent).

## 2. Anomalies corrigées

| # | Gravité | Page / composant | Reproduction | Défaut | Cause | Correction |
|---|---|---|---|---|---|---|
| F01 | P1 | index.html, h1 | 1 280 px, JS actif | « VI » de « GTA VI » invisible | Motion+ enveloppe chaque mot dans un span ; le dégradé `background-clip:text` n’est plus peint dans le span | common.js : un élément à `background-clip:text` est traité comme un seul mot |
| F02 | P1 | 30 fiches du monde, visuel du bandeau | toute largeur | image cachée derrière son rideau | l’animation Motion+ remplaçait `loreWipe` | style.css : `.lore-fig.lk-hero-item` garde `loreWipe` (mouvement réduit : aucun rideau) |
| F03 | P2 | fiches du monde, blocs de texte | 1 280 px | textes décalés de 22 px hors gouttière | variante `lk-reveal--left` posée sans `lk-reveal` | common.js : variante seulement sur les blocs observés |
| F04 | P2 | calculateur, « À chaque question, son calcul » | ≥ 1 100 px | 9 cartes en 4 + 4 + 3 | carte 01 sur 2 colonnes | carte 01 sur 3 colonnes → 3 rangées pleines ; 700–1 100 px : rangées de 2 |
| F05 | P2 | armes.html, classement-vehicules.html | 1 280 px | 6 cartes en 4 + 2 | `auto-fit minmax(260px)` | `.feat-grid`, `.kit-grid`, `.kpis` en flex centré avec nombre de colonnes selon le nombre de cartes ; règles retirées des styles en ligne |
| F06 | P3 | armes.html, 16 équipements | 1 280 px | 5 + 5 + 5 + 1 | idem | 4 × 4 |
| F07 | P3 | bandeaux `.vstats` / `.kpis` | 390 px | 3 + 1, 2 + 2 + 1 à gauche | flex sans base | 2 colonnes sous 600 px, dernière ligne centrée |
| F08 | P2 | fiches du monde, « En lien » | 1 280 px | 5e bloc seul, 60 % de vide | grille 2 colonnes | dernier bloc impair sur toute la largeur |
| F09 | P3 | fiches, cartes voisines | 390 / 1 280 px | noms tronqués (« Elegy Retro C… ») | nowrap + ellipsis | deux lignes au plus |
| F10 | P2 | calculateur, tableau des activités | 1 280 px | colonne Statut trop étroite, puces sur 3 lignes | `table.spec th{width:44%}` sur les en-têtes de colonnes | largeurs corrigées, puces sur une ligne |
| F11 | P3 | tuto.html, sommaire | toutes | liens en corail au lieu de l’encre | sélecteur du lot C plus spécifique | tuto.css |
| F12 | P3 | calculateur, note « Ce sont tes chiffres à toi » | 390 px | retour à la ligne cassé | `display:flex` sur un paragraphe mixte | `display:block` |
| F13 | P3 | bouton Léo | 390 px, pages denses | recouvre la recherche / un onglet | aucune position libre → reste à l’origine | recherche élargie, mode compact, observation du DOM |
| F14 | P3 | cibles tactiles < 24 px (fil d’Ariane, sources, « Trouver mon calcul », poignées de l’arbre, champ de recherche de l’en-tête…) | 390 px | | | style.css : rembourrage / hauteur minimale |
| F15 | P3 | collectibles.html, outils de sortie | tactile | explication visible au survol seulement | | `@media(hover:none)` : explication visible |
| F16 | P2 | tout le site (5 638 occurrences) | | apostrophes droites et typographiques mélangées | données de dates différentes | `outils/typographie.cjs` + étape permanente de sync-site.cjs |
| F17 | P2 | tout le site (3 361 occurrences) | | « ? » ou « : » rejetés seuls en début de ligne, nombres non groupés | espaces sécables | espaces insécables avant ? ! ; : » et après «, avant $ et %, fine insécable dans les nombres ; recherches et Léo replient ces caractères |
| F18 | P3 | tuto (description), aria-label de Léo | | « LeonidaKit » | | « Leonidakit » |
| F19 | P3 | armes.html | | « sélectionne-en » | | « sélectionnes-en » |
| F20 | P3 | accueil, bandeau défilant | | « Calculateurs » | | « Calculateur » |
| F21 | P3 | carte.html, visuels des régions | 701–820 px | variante 480 px étirée à 674 px | `sizes` figé à 700 px | `sizes` aligné sur les colonnes réelles |
| F22 | P2 | catalogues | 320 px | une colonne de cartes de 140 px, 150 px de vide de chaque côté | règle de centrage v7.37 appliquée à une grille d’une seule colonne | centrage limité à 330–699 px |
| F23 | P3 | bouton Léo | 320 × 700 px | bouton monté au milieu de l’écran | recherche jusqu’à +350 px sans tenir compte de la hauteur | positions limitées à la moitié basse ; évite aussi la barre de filtres et « Mon garage » ; points de contrôle resserrés |
| F24 | P2 | carte.html, six régions | ≥ 1 400 px | 4 + 2 | `auto-fill minmax(280px)` | 3 colonnes ≥ 1 001 px, 2 colonnes 821–1 000 px |
| F25 | P2 | index.html, « L’État de Leonida » | ≥ 1 400 px | 4 + 2 | `auto-fit minmax(250px,320px)` | classe `lore-grid--n6` (lore-gen.js) + 3 colonnes |
| F26 | P2 | vehicules-rares.html | 1 024 px, ≥ 1 400 px | 5 équipements en 4 + 1, 8 véhicules en 5 + 3 | styles en ligne de la page ; `.rare-grid` en auto-fill | styles en ligne retirés ; `.rare-grid` en flex centré (fiches.css) |
| F27 | P2 | armes.html (règles d’inventaire), collectibles.html (visuels) | 901–1 100 px | 4 + 1 | auto-fill | 5 par rangée, 3 + 2 centrées, 2 + 2 + 1, 1 |
| F28 | P2 | progression.html, 9 catégories | 681 px et plus | 2+2+2+2+1, 4+4+1 | grille à 4 colonnes | `:has()` : 5, 6 ou 9 cartes → 3 colonnes ; carte impaire finale pleine largeur en 2 colonnes |
| F29 | P2 | menu « Explorer » (pages avec recherche dans l’en-tête) | ≥ 1 081 px | panneau rogné de 15 à 24 px à gauche | aligné à droite du mot « Explorer » | aligné sur la marge droite de l’en-tête |
| F30 | P3 | champs « Filtrer… » et « Chercher un lieu » | 320 px | champ de 16 px de haut dans une barre de 44 px | rembourrage porté par la barre | rembourrage porté par le champ |
| F31 | P3 | calculateur, « ☆ Enregistrer ce calcul » | ≤ 380 px | libellé coupé | nowrap | deux lignes autorisées |
| F32 | P3 | pages d’acquisitions, visuels des cartes | ≥ 1 280 px | variante 480 px affichée jusqu’à 685 px | `sizes` figé à 420 px | `sizes` 50vw (gen-acquisitions.cjs) |
| F33 | P3 | accueil, progression.html | | puce « En construction » à côté de « cochés dès maintenant » | | puce « Dès maintenant » |
| F34 | P3 | calculateur, « Que veux-tu calculer ? » | 901–1 180 px | questions empilées une par ligne, « 10 M $ » seul à la ligne | colonne des objectifs en largeur auto | objectifs sur leur propre rangée |

Texte et données (hors tableau) : 16 fiches véhicules dont le texte contredisait l’inspiration (Tailgater / A6, Vectre / Emperor, Carbonizzare, Itali GTO / 812 Superfast, Jugular / XE Project 8, Infernus Classic / Diablo, Cypher / M2, Dominator, Granger / Suburban, Contender / Tundra, Astron / Macan, Rancher, SuperVolito / EC145, Shamal / Learjet 45, Maverick / LongRanger, Seashark / GTX) ; registre « tu » sur Collectibles, classement, fiches et carte (« vous » subsistait) ; 23 messages du moteur du calculateur en mots simples ; « Édition Ultimate » et « Leonidakit » partout ; « munitions, consommables » ; « 2 547 lieux » sur la carte d’outil de l’accueil (disait « En construction » alors que la ligne d’état disait le contraire).

Référencement : titres « … | Leonidakit » sur 401 pages (18 disaient « — ») ; descriptions plafonnées à 158 caractères (51 dépassaient) ; canonique d’achats.html en www ; `max-image-preview:large` sur les 380 pages indexables ; @graph WebSite + SearchAction (`?q=` réellement pris en charge par app.js) + Organization + WebPage sur l’accueil ; WebApplication sur le calculateur ; FAQPage générée depuis les questions visibles (accueil, calculateur, achats) ; BreadcrumbList sur Tuto, Achats et les pages d’acquisitions ; h2 lisibles par les lecteurs d’écran devant les grilles des hubs ; police Archivo hébergée (`fonts/`, OFL), préchargée, `font-display:swap`, plus aucune requête vers Google Fonts (CSP mise à jour).

Défauts constatés puis **non retenus** : rangées de puces ou de boutons de largeurs différentes (fil d’Ariane, actions, « Autres liens ») — ce sont des lignes de boutons, pas des grilles de cartes ; cases à cocher de 17–20 px : toutes sont dans un `label` (la cible est le libellé entier) ; liens dans le fil d’un paragraphe (exception des liens en ligne) ; `.map-panel` et `.skip` signalés « invisibles » ou « hors écran » : c’est leur état fermé.

## 3. Fichiers changés et raison

- **Style** : `style.css` (police, rideau des fiches, grilles équilibrées, lore-body, cibles tactiles, Explorer, recherches, catalogues), `fiches.css` (.rare-grid), `calculateurs-brand.css` (lead sur 3 colonnes, tableau, note, bouton à 320 px), `tuto.css` (sommaire), `leo.css` (mode compact).
- **Scripts** : `common.js` (splitWords, variantes), `leo-loader.js` (placement), `app.js` (marquee, `?q=`, repli des accents), `calculateurs-engine.js` (messages), `calculateurs*.js`, `carte.js`, `classement.js`, `collectibles*.js`, `leo-ui.js` (registre, normalisation).
- **Générateurs et données** : `outils/typographie.cjs` (nouveau), `outils/sync-site.cjs` (fonts, preload, robots, FAQPage, compteur, typographie), `outils/gen.js`, `outils/gen-armes.cjs`, `outils/lore-gen.js`, `outils/gen-acquisitions.cjs`, `outils/gen-achats.cjs`, `outils/gen-tuto.cjs`, `outils/gen-informations.cjs`, `outils/gen-leo.cjs`, `outils/v-corrige.json`, `outils/editorial.json`, `outils/acquisitions.json`, `outils/leo-knowledge.json`, `outils/leo-editorial.json`, `outils/tuto.json`, `outils/medias-officiels.json`, autres JSON typographiés.
- **Pages écrites à la main** : `index.html`, `calculateurs.html`, `carte.html`, `armes.html`, `collectibles.html`, `progression.html`, `vehicules-rares.html`, `classement-vehicules.html`, `comparateur.html`, `404.html`, `outils/templates/*.html`.
- **Pages générées** : les 406 pages HTML (typographie, meta, FAQPage, fonts, empreintes `?v=`), `search-index.js`, `leo-index.json`, `sitemap*.xml`.
- **Nouveaux** : `fonts/archivo-latin.woff2`, `fonts/archivo-latin-ext.woff2`, `fonts/LICENCE-ARCHIVO.txt`, `outils/typographie.cjs`, `outils/CHANGEMENTS-v7.37.txt`, `LISEZ-MOI-v7.37.txt`, ce rapport.
- **Configuration** : `vercel.json` (CSP sans Google Fonts, cache des polices). **Tests** : `outils/tests/collectibles-generator.test.cjs` (une assertion adaptée à l’espace insécable). Rien à supprimer.

## 4. Vérifications effectuées

- `NODE_PATH=… SITE_ROOT=$PWD node --test outils/tests/*.test.cjs` : **373 / 373**.
- `node outils/regenerer.cjs` puis `node outils/verifier.js` : **0 erreur, 37 053 références, 406 pages** ; régénération reproductible (deuxième passage identique).
- `outils/tests/calculateurs-browser.cjs` : **278 / 278**. (`calculateurs-v2-browser.cjs` : 4 échecs et `calculateurs-lot-b-browser.cjs` : attente de `.b-save-state` — déjà en échec sur la v7.36, écrits pour une interface antérieure.)
- Audit automatique : 155 pages × 390 / 1 280 px puis 31 pages × 320 / 768 / 1 024 / 1 440 / 1 920 px : 0 débordement horizontal, 0 erreur console, 0 requête en échec, 0 image cassée, 0 élément resté invisible après défilement, 0 identifiant doublé, 0 saut de titre, grilles équilibrées (voir tableau), cibles tactiles restantes = liens en ligne et cases dans un `label`.
- Typographie : 0 apostrophe droite entre lettres et 0 espace sécable avant ? ! ; : » dans le texte visible des 406 pages ; le code (SVG `viewBox`, JSON de données) n’est pas touché (option `noThousands`, nœuds `script`/`style`/`pre`/`code` ignorés).
- Mouvement réduit (`prefers-reduced-motion`) : tout est visible sans animation sur accueil, fiche de région, calculateur, catalogue. Clavier : Explorer, recherche (flèches, Entrée, Échap), onglets du calculateur, Léo (ouverture, fermeture, retour du focus).
- Parcours fonctionnels : recherche → fiche ; garage (1/302 puis visible sur Progression) ; comparateur (3 véhicules) ; classement ; carte (filtres, distance, statut) ; collectibles (outils de sortie) ; calculateur Simple / Pas à pas / Expert, enregistrement, business plan, « Partir de zéro » ; Léo (« achète la région Leonida Keys », « trouve Vice City », « je veux acheter la maison de Jason », « C’est quoi l’édition Ultimate ? »).
- SEO : chaque page indexable a un titre unique ≤ 70 caractères hors marque, une description ≤ 158, une canonique www, un JSON-LD valide (analysé), pas d’Offer / Product (test de régression conservé) ; sitemap synchronisé ; `?q=` de la SearchAction ouvre la recherche préremplie.

## 5. Limites et points ouverts

- Données propriétaire toujours « à compléter » (`outils/site-informations.json`) : éditeur, responsable de publication, contact légal, boîte de contact, téléphone de l’hébergeur, modalités Brevo. Rien n’a été inventé.
- Lighthouse / Web Vitals non mesurés ; lecteur d’écran réel non testé (structure et libellés vérifiés dans le DOM seulement) ; production non comparée.
- Bouton Léo sur un téléphone de 320 px : sur un catalogue pleine largeur il n’existe aucune place libre ; il reste en bas à droite, replié sur son symbole.
- Les deux anciennes suites navigateur citées plus haut sont à réécrire ou à retirer.
- Léo : les 79 sujets et la FAQ ont été typographiés et passés en « tu » ; le fond des réponses anciennes n’a pas été relu phrase par phrase.

## 6. Appliquer et revenir en arrière

Sauvegarder le dossier v7.36, extraire l’archive « modifs » dans la racine en remplaçant les fichiers homonymes, ne rien supprimer, mettre en ligne. Pour revenir en arrière : restaurer la sauvegarde. Les données des visiteurs (navigateur) ne sont pas touchées : les clés de stockage n’ont pas changé.
