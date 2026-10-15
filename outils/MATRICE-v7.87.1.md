# Matrice v7.87.1 — passe de qualité des v7.86 et v7.87

Demande de Téva du 12 octobre 2026 (« PROMPT-Passe-qualite-v7.86-v7.87 » et « PROMPT-Exigences-qualite ») : appliquer à tout
ce que les v7.86 et v7.87 ont ajouté ou modifié les exigences de qualité d’avant la v7.86, sans rien casser. Base : v7.87
(commit 210850a). Lot fait en parallèle des lots 3, 5, 6 et 7 : seul le périmètre des v7.86 et v7.87 est touché, l’archive
part à l’assemblage. Cette matrice est tenue dans le dépôt (jamais déployée : `outils/` est exclu par `.vercelignore`).

États : validé · hors périmètre (signalé, non corrigé).

Pages du périmètre (cinq langues) : `actus.html` (+ `actus.xml`), `videos.html`, `videos/trailer-1.html`,
`videos/trailer-2.html`, `videos/extended-look.html`, `editions.html`, `verification.html`, `radios.html` (section des six
stations), `radios/<station>.html` (six pages), fiches véhicules (302) et armes (27) (blocs de la v7.86), accueil (ligne du
jalon, dernière annonce), Mentions (mesure d’audience), Léo.

Outils de preuve (hors dépôt sauf les tests) : `outils/tests/v7871.test.cjs` (10 tests sans navigateur),
`outils/tests/v7871-browser.cjs` (Chromium : 3 largeurs × FR/DE × mouvement normal, réduit, sans script),
`outils/tests/ecrans-browser.cjs` (16 largeurs, pages du périmètre ajoutées), banc de latence (méthode des v7.54 et v7.85),
captures Playwright, audit d’accessibilité axe-core, évaluation de Léo (`outils/tests/leo-eval.cjs`).

## 1. Inventaire et état des lieux

| Id | Page | Exigence | Constat (v7.87) | Correction (v7.87.1) | Preuve | État |
|---|---|---|---|---|---|---|
| INV-01 | toutes les pages du périmètre | 10 : captures 390 / 768 / 1 280 px, FR et DE | Captures de la base regardées une à une : sections maison (`.ac-sec`, `.ac-frise`, `.ac-next`) sans numéro ni kicker ni fonds alternés, cartes posées les unes sous les autres (aspect « PowerPoint ») ; listes de 104 modèles en puces sans fin ; les stations écrivent leur nom deux fois ; « Ce qui est confirmé » en bandeaux pleine largeur ; chiffres « Personnaliser » des fiches sur deux rangées sur téléphone | voir 2 à 4 | Captures avant / après (390, 768, 1 280 px, FR et DE) | validé |
| INV-02 | actus, vidéos, éditions, verification, radios, fiche véhicule, fiche arme, accueil, Mentions | 5 : latence mesurée, comparée à des pages d’avant la v7.86 | Banc v7.85 → v7.87 (390 px, 4G lente, processeur ×4) : pages nouvelles dans la moyenne des pages de même type ; Radios 259 → 295 Ko et tâches longues 493 → 613 ms (stations de la v7.86) | voir LAT-* | Tableau de la section 5 | validé |
| INV-03 | `outils/MATRICE-v7.87.1.md` | 1 : une ligne par point | ouverte au début du lot, close à la fin | — | ce fichier | validé |

## 2. Mouvement et effets (moteur commun)

| Id | Page | Exigence | Constat (v7.87) | Correction (v7.87.1) | Preuve | État |
|---|---|---|---|---|---|---|
| MOV-01 | actus, vidéos, éditions | 3 : un seul moteur, cascade 35–60 ms, plafond 300 ms, 10–12 px | Blocs nouveaux sans entrée au défilement, ou `.rise` (18–26 px) | Chaque bloc nouveau porte `data-lk-reveal` (classe `ac-in`) : `common.js` (LKMotion, un seul IntersectionObserver) pose `is-in` avec `--lk-delay` (60 ms par élément, 300 ms au plus) ; `actus.css` joue une seule animation (`ac-rise` : `--c-rise` 10 px + opacité, durée et courbe des jetons) ; déjà à l’écran : `lk-settled`, rien ne bouge | `v7871.test.cjs` test 2 ; `v7871-browser.cjs` : 0 bloc non entré, 0 premier écran caché | validé |
| MOV-02 | actus.html | 3 : un moment de motion design par page de section | Frise statique | La frise se trace : point qui éclot (`ac-pop`), date qui glisse (+60 ms), carte qui monte (+100 ms), tronçon ambre qui se dessine jusqu’à l’annonce suivante (+240 ms, `--c-narrative`) | Captures « frise » début / milieu / fin et « réduire les animations » (`v7871-browser.cjs`) | validé |
| MOV-03 | vidéos | 3 : moment de la page | — | Planche de photogrammes : chaque moment monte, son minutage (badge) se pose ensuite (+380 ms) | Captures, test 2 | validé |
| MOV-04 | éditions | 3 : moment de la page | — | Les seize contenus de l’Ultimate « se déballent » : numéro d’ordre tamponné (`ac-stamp`, +140 ms) carte après carte | Captures, test 2 | validé |
| MOV-05 | radios.html (#stations) | 3 : moment de la page | Stations sans entrée | L’accord du poste : l’aiguille balaie le cadran jusqu’à la station, le nom s’allume, l’égaliseur saute une fois (`radios.css`, bloc v7.87.1) | Captures, test 2 | validé |
| MOV-06 | verification.html | 3 : entrées par le moteur commun | `lk-reveal` sans translation | translation des jetons (10 px) pour les points, rubriques, « jamais », niveaux et figures (`informations.css`) | test 2, captures | validé |
| MOV-07 | toutes | 3 : réduire les animations, sans script | — | Tout est visible tout de suite (aucune règle de mouvement hors de `prefers-reduced-motion: no-preference`, état caché seulement avec `.js`) ; survols : décalages coupés en mouvement réduit ; une carte qu’on lit ne bouge pas | `v7871-browser.cjs` : 324 chargements (19 pages, FR et DE, 390 / 768 / 1 280 px, mouvement normal, réduit, sans script) : 0 bloc caché, 0 premier écran caché, 0 bloc non entré, 0 erreur de script | validé |
| MOV-08 | radios.html | 3 : un seul observateur | `radios.js` garde un IntersectionObserver d’avant la v7.86 (lecture du poste) | non touché (hors périmètre, pas une entrée au défilement) | test 2 (toléré et nommé) | hors périmètre |

## 3. Charte et gabarit

| Id | Page | Exigence | Constat (v7.87) | Correction (v7.87.1) | Preuve | État |
|---|---|---|---|---|---|---|
| CH-01 | actus, vidéos (sommaire et pages), éditions | 2 : sections éditoriales du moteur commun, sous-navigation | Sections maison, sans numéro, kicker ni fonds alternés | `outils/gen-actus.cjs` : `zone()` → `S.section` (numéro, kicker, titre, icône, fond papier / papier 2 / nuit, accent ambre ou corail) et `S.nav` (sous-navigation collante dès quatre sections) ; FAQ et sources en sections ; icône « note » ajoutée à `outils/sections.cjs` | test 1 | validé |
| CH-02 | actus, vidéos, éditions, verification | 2 : puces « Explorer » en bas des pages de section | absentes | `outils/site-shell.cjs` : jeu de puces « L’actualité » (Actualités, Vidéos officielles, Éditions, Ce qui est confirmé, Radios et musique, Comprendre les statuts) | test 1, captures | validé |
| CH-03 | vidéos | 1 : « du tac au tac » | 104 puces d’affilée (Trailer 1) | au-delà de seize modèles : douze puces (ceux que Rockstar a nommés d’abord) et « Voir les N autres » à déplier, rien de perdu | test 3 | validé |
| CH-04 | éditions | 2 : pas d’aspect « PowerPoint » | numéros d’ordre écrits dans le texte, liens sur fond transparent | numéro par compteur CSS (rien à lire ni à traduire), cartes blanches ; boîte, préchargement et régions en trois colonnes du moteur commun avec leurs ancres | captures | validé |
| CH-05 | verification.html | 4 : grilles 3 → 2 → 1, dernière carte centrée | bandeaux pleine largeur | grilles centrées (trois colonnes, quatre pour les rubriques), « Ce qu’on n’utilise jamais » en deux colonnes | captures, `v7871-browser.cjs` (0 rangée inégale) | validé |
| CH-06 | radios.html, stations | 2 : rien d’inutile | nom de la station écrit deux fois | nom lu sur la plaque, titre gardé pour les lecteurs d’écran ; plaque plus basse sur téléphone | captures | validé |
| CH-07 | fiches véhicules et armes | 4 : alignements | trois chiffres « Personnaliser » sur deux rangées sur téléphone | grille de trois colonnes égales (`fiches.css`) | test 7, captures | validé |
| CH-08 | editions.html (anglais) | 1 : rien d’inutile | deux lignes presque identiques par contenu (« The ’95 Grotti Cheetah » / « ’95 Grotti Cheetah »), « hideout » contre « Compound » | en anglais, le nom officiel de Rockstar seul (`actus.css`) | relecture, captures | validé |

## 4. Alignements (16 largeurs, cinq langues)

| Id | Page | Exigence | Constat | Correction | Preuve | État |
|---|---|---|---|---|---|---|
| AL-01 | `outils/tests/ecrans-browser.cjs` | 4 : pages du périmètre au contrôle des écrans | trois pages de vidéo, deux stations et une fiche n’y étaient pas | ajoutées | rapport des écrans | validé |
| AL-02 | toutes | 4 : 16 largeurs + allemand | — | — | `ecrans-browser.cjs`, 67 pages × 16 largeurs : 0 débordement ; sur les 61 pages de la v7.87, signalements identiques (24 coquilles, 39 rangées, 21 coupes, 16 mots) et petits textes 154 → 134 ; pages du périmètre : aucun signalement ; allemand, 58 pages de la v7.87 × 5 largeurs : 10 / 7 / 5 identiques, petits textes 45 → 37 | validé |
| AL-03 | fiches, radios, actus, Mentions | 4 : rien sous 11 px | 10,9 px (renvois aux sources, légendes, étiquette de galerie, voisins), 9,6–10,6 px (angles du dessin, statuts, panneau « Personnaliser »), 10,2 px (intitulés du tableau des Mentions sur téléphone) | `max(11px, …)` dans `fiches.css`, `radios.css`, `actus.css`, `informations.css` | `v7871-browser.cjs` : chargements avec un texte sous 11 px : 54 → 0 | validé |
| AL-04 | fiches, radios, actus | 4 : cibles de 24 px au moins (44 px visés) | « Voir dans la liste » 103 × 16 px ; renvois 20–22 px | 44 px de haut sur téléphone, 24 px ailleurs ; renvois 24 px | `v7871-browser.cjs` : chargements avec une cible sous 24 px sur téléphone : 4 → 0 | validé |
| AL-05 | titres et questions du périmètre | 4 : aucun mot coupé au mauvais endroit | « GTA / 6 » en fin de ligne (FAQ des radios à 390 px, titre des Vidéos en allemand à 768 px, titre des radios sans script) | espace insécable dans les générateurs (`gen-radios`, `gen-actus`, `gen-informations`) et dans les valeurs de la mémoire des titres et questions (23 par langue ; jamais dans les titres `<title>`) | `v7871-browser.cjs` : « GTA 6 » coupés : 6 → 0 ; `v7871.test.cjs` test 11 (aucun titre ni question du périmètre, cinq langues) | validé |
| AL-06 | toutes | 4 : cartes d’une rangée à la même hauteur, boutons en bas | — | billets, moments, vidéos, éditions, bonus : corps en flex, lien en bas | `v7871-browser.cjs` : 0 rangée inégale | validé |

## 5. Latence

| Id | Page | Exigence | Constat | Correction | Preuve | État |
|---|---|---|---|---|---|---|
| LAT-01 | actus, vidéos, éditions, verification, radios | 5 : images hors écran différées, premier visuel prioritaire, tailles écrites | — | vérifié sur chaque image (test 6) ; aucun script ajouté ; un seul observateur | test 6 | validé |
| LAT-02 | pages du périmètre | 5 : aucune régression mesurée | — | — | banc v7.87 → v7.87.1 (390 px, 4G lente, processeur ×4, à froid et à chaud, alternance, 4 puis 8 chargements avec chauffe) : tableau dans `LISEZ-MOI-v7.87.1.txt` ; tous les écarts restent dans le bruit mesuré par un banc A/A (le même site servi deux fois : Radios 1,96 / 2,12 s, Flash FM 1,64 / 1,81 s au premier affichage) et sur les pages témoins non modifiées (Gangs, À propos : 0,1 à 0,4 s) ; poids +2 à 4 Ko au plus ; tâches longues en baisse sur Actualités, Trailer 1, Ce qui est confirmé | validé |

## 6. Référencement

| Id | Page | Exigence | Constat (v7.87) | Correction (v7.87.1) | Preuve | État |
|---|---|---|---|---|---|---|
| SEO-01 | périmètre, cinq langues | 6 : titres ≤ 65 avec « GTA 6 », descriptions ≤ 155 et uniques | descriptions trop longues : Trailer 1 et Trailer 2 (es), Vidéos (it), Radios (de) ; titre des Éditions (it) ; description de l’accueil | mémoires `v786` / `v787` corrigées, accueil réécrit | test 4 | validé |
| SEO-02 | fiches minces (noindex, follow) | 6 : og: et twitter: complets | pages en noindex privées d’image de partage et de carte Twitter | `outils/sync-site.cjs` : og/twitter pour toute page sauf redirections et 404 | test 7 | validé |
| SEO-03 | verification.html | 6 : image de partage de la page | image générique | visuel officiel de la page (`gen-informations.cjs`) | test 6 | validé |
| SEO-04 | radios/<station>.html | 6 : données structurées justes | WebPage sans sujet | WebPage + `about` (la station, partie de GTA VI) | test 5 | validé |
| SEO-05 | périmètre | 6 : BreadcrumbList, CollectionPage + ItemList, VideoObject, FAQPage, WebPage | — | vérifiées dans les cinq langues | test 5 | validé |
| SEO-06 | plan du site | 6 : images, dates réelles | — | images officielles et dates présentes pour chaque page du périmètre | test 4 | validé |
| SEO-07 | maillage | 6 : menu, pied de page, sommaires, recherche, Léo | — | puces « L’actualité » ajoutées (CH-02) | test 8 | validé |
| SEO-08 | hors périmètre | 6 : descriptions ≤ 155 | descriptions de 156 à 158 signes sur d’autres pages (atelier-3d, carnets, une fiche d’arme, mentions en espagnol) | non touché | relevé | hors périmètre |

## 7. Langues (relecture des quatre langues)

| Id | Page | Exigence | Constat | Correction | Preuve | État |
|---|---|---|---|---|---|---|
| LG-01 | actus, pages de vidéo | 9 : aucune phrase française restée | noms des fiches (« Les forces de l’ordre de Leonida »), armes et véhicules décrits (« Fusil à pompe », « Dakota décapotable ») restés en français : `translate="no"` dans `gen-actus.cjs` | noms traduits par la mémoire ; nom et statut séparés en segments (aucune phrase par combinaison) | relecture ; `v7871.test.cjs` test 11 (chaque nom comparé à sa traduction dans la mémoire, quatre langues) ; 0 texte sans traduction | validé |
| LG-02 | radios, actus | 9 : typographie de la langue | « Rockstar Newswire : … » et « (site officiel) » gardés en français dans des titres anglais | titres des trois sources en anglais (`outils/radios/radios.json`) | relecture | validé |
| LG-03 | extended-look | 9 : nombres justes | « 0:6 to 0:45 », « 6:0 to 6:42 » (zéro perdu) | entrées exactes dans les quatre langues | relecture | validé |
| LG-04 | fiches (en, es) | 9 : même libellé partout | « posts » / « puestos » pour les postes de personnalisation | « items » / « elementos », comme les titres déjà traduits | relecture | validé |
| LG-05 | toutes | 9 : même libellé partout | « N sources ouvertes » : trois traductions en anglais et en allemand | un seul libellé par langue | relecture | validé |
| LG-06 | verification.html | 9 : sens juste | kicker « À toi » rendu « Yours », « Tuyo », « Tuo », « Deins » | entrée propre à la page : « Your turn », « Te toca », « Tocca a te », « Du bist dran » | relecture | validé |
| LG-07 | actus, vidéos, éditions, radios, verification, fiches, Mentions | 9 : formulations naturelles, noms officiels | relecture des quatre langues (un relecteur par langue, extraits FR → langue de chaque page du périmètre) : noms de modèles déformés (« Vapid Stanier del 55 »), faux amis (« posts », « puestos », « aerodeslizador »), calques (« la Ultimate Edition », « anni 1980 », « lässt einen … überfallen »), sens (« would show up », « Free, she… ») | près de 200 entrées corrigées dans la mémoire (EN 81, ES 86, IT 67, DE 54 valeurs modifiées, dont les 23 titres et questions insécables par langue), chacune dans le fichier où la clé existait (aucun conflit) | relecture ; `langues.test.cjs` 42/42 | validé |
| LG-08 | périmètre | 9 : textes sans traduction | — | `outils/langues/<code>/v7871.json` (42 entrées par langue) | synchronisation : 0 texte sans traduction dans les quatre langues ; `_a-traduire.json` : `{}` | validé |

## 8. Léo

| Id | Page | Exigence | Constat | Correction | Preuve | État |
|---|---|---|---|---|---|---|
| LEO-01 | verification, vidéos, Mentions, limite de l’IA | 8 : Léo connaît chaque page | pas de sujet pour « Ce qui est confirmé » ni pour les vidéos officielles ; mesure d’audience et limite du jour non reliées | sujets `verification`, `videos-officielles` ; formulations ajoutées (`extended`, `cookies`, `ia-questions`, `radio`, `derniere-annonce`) ; ponts des quatre langues | `leo-questions-v7871-<code>.json` : 12/12 dans les cinq langues (réponse et lien justes) ; toutes les autres séries identiques à la base | validé |
| LEO-02 | radios | 8 : réponse et lien justes | séries des radios : 8/12 (fr) et 7/11 (en, es, it, de) | attentes renumérotées, règle de sortie de `leo-core.js` resserrée | 12/12 (fr) et 11/11 (en, es, it, de) | validé |

## 9. Contrôles complets

| Id | Contrôle | Résultat | État |
|---|---|---|---|
| CTL-01 | suite Node | 79 fichiers, 1 068 tests : 1 061 réussis ; 4 échecs dus à `api/ia-achat.js` (à supprimer depuis la v7.71, mêmes échecs sur la base), `coverage.test.cjs` arrêté faute de mémoire puis 3/3 seul, 2 défauts de ce lot corrigés (section-radios : aiguille en `left` ; v780 : libellé allemand) puis 46/46 sur les fichiers concernés | validé |
| CTL-02 | langues | `langues.test.cjs` 42/42 (relancé sur l’état final : 42/42) ; 0 texte sans traduction | validé |
| CTL-03 | vérificateur, confidentialité | 336 518 références, 2 311 pages, aucune erreur ; preuve de confidentialité : tout tenu sauf « fonctions serveur » (`api/ia-achat.js`, comme sur la base) | validé |
| CTL-04 | navigateur : pages des langues, langues | 28/28 ; 2 267/2 267 | validé |
| CTL-05 | écrans 16 largeurs, allemand 5 largeurs | voir AL-02 | validé |
| CTL-06 | audit de clôture, cookies | 26 pages, 182 chargements : 0 erreur console, 0 requête en échec, 0 contraste insuffisant (11 488), 12/12 fonctions ; cookies : aucun | validé |
| CTL-07 | accessibilité (axe-core, pages du périmètre) | 18 pages (dont 6 traduites), 390 et 1 280 px : légende des stations à 2,55:1 (v7.86) corrigée, 0 contraste insuffisant ensuite ; « label-content-name-mismatch » du sélecteur de langue (composant commun de la v7.61) : hors périmètre | validé |
| CTL-08 | contrôle navigateur du périmètre | `v7871-browser.cjs` : 324 chargements, tout à 0 ; lecteur 3/3 ; films des cinq moments (début, milieu, fin, mouvement réduit) | validé |

## 10. Hors périmètre, signalé

| Id | Constat | Pourquoi non corrigé ici |
|---|---|---|
| HP-01 | `api/ia-achat.js` toujours dans le dépôt alors que la v7.71 demandait de le supprimer : 4 tests et la preuve de confidentialité échouent (sur la base aussi) | une archive « modifs » ne peut pas supprimer un fichier : à supprimer à la main (LISEZ-MOI) |
| HP-02 | descriptions de 156 à 158 signes sur d’autres pages (atelier-3d, carnets, une fiche d’arme, Mentions en espagnol) | pages hors des v7.86 et v7.87 |
| HP-03 | « label-content-name-mismatch » (axe) sur le sélecteur de langue de toutes les pages | composant commun de la v7.61 |
| HP-04 | `outils/langues.cjs` : un nombre à zéro initial (« 06 ») perd son zéro quand il passe par un motif à nombres | seuls deux minutages du site étaient touchés : entrées exactes ajoutées ; la règle elle-même est commune à tous les lots |
| HP-05 | `radios.js` garde son IntersectionObserver (le poste de Leonida joue quand il est à l’écran, section radios d’avant la v7.86) | pas une entrée au défilement ; fichier hors périmètre |
| HP-06 | LCP du sommaire des vidéos bimodal (1,5 ou 2,4 s) dans les deux versions : quand les scripts passent avant le premier rendu, la première image de la pile (animée par Motion+, `lk-kb`) n’est pas comptée et c’est la deuxième, chargée plus tard, qui fait le LCP | moteur commun (`common.js`, `style.css`), même comportement sur la base ; à traiter dans un lot qui touche le moteur |
