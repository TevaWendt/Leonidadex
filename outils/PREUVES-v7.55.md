# Preuves du lot 2 — v7.55 (1er octobre 2026)

Mission « corrections visuelles, fluidité et Léo », lot 2 : Arsenal (blocs 05 et 06), Progression, Planques, Collectibles.
Base : v7.54 (zip Leonidadex-main (7) = v7.53, SHA-256 a650b62af33e46d976e867f68cb727d4feada62637cb7b4ee30bc43cf2750b8e, + archive
modifs v7.54, `calculateurs-tools.js` supprimé). Matrice : `outils/MATRICE-FLUIDITE.md`. Changements : `outils/CHANGEMENTS-v7.55.txt`.
Les scripts de recette (`qa/`) sont livrés dans le dossier de contrôle, hors dépôt. Toutes les pages Internet citées ont été ouvertes
le 1er octobre 2026 ; leur URL et leur date figurent dans les données (`outils/hubs-editoriaux.json`, `outils/collectibles.json`).

## 1. Repérage réel des blocs (début du lot)

| Bloc du prompt | Emplacement réel | Générateur / données | Constat au navigateur (captures `captures/avant`) |
|---|---|---|---|
| « 05 — 6 changements » | `armes.html#combat` (section `ed ed--paper2 ed--coral`, `.ed-steps` de six `article.ed-step`) | `outils/hubs-editoriaux.json` → `armes.combat.items`, `outils/hubs-editoriaux.cjs`, `outils/sections.cjs` steps() | 3 cartes avec capture (dont deux ratios différents : 480 × 270 et 480 × 216), 3 cartes avec une icône ; hauteurs inégales ; aucune source ; « Changement de main » et « rangent leur arme automatiquement » sans fondement publié |
| « 06 » (carte) | `armes.html#carte` (localisateur `.lk-loc--hub`), même composant dans `vehicules.html#carte` et les 329 fiches (`#carte .lk-loc--single`) | `outils/localisateur.cjs` mapSvg(), `outils/carte-vignette.cjs` (silhouette RDP 30 unités) | Silhouette beige simplifiée, recadrée, sans routes ni noms ni eau : ne ressemble pas à `carte.html` (fond vert/bleu, routes, comtés, noms) |
| Cartes de Progression | `progression.html#suivi` (9 `article.cn-dcard` entre `carnets:debut/fin`) | `outils/gen-carnets.cjs`, `progression.js`, `carnets.css` | Aucune apparition (ni cascade ni fondu), les cartes sont là d'un bloc |
| Trois cartes de Planques | `planques.html#fiches` (`.lore-grid--n3`, 3 `a.lore-card.rise`) | `outils/lore-gen.js`, `style.css` | Image centrale plus courte (photogramme 1280 × 576 avec `height="216"`), titre, texte et « Voir la fiche » décalés de 54 px |
| « Méthode et sources » | `collectibles.html#methode-sources` (section statique écrite à la main : `details.lk-fold`, `.col-method`, `aside.col-sources`) | `outils/gen-collectibles.cjs` (ne touchait que `#col-review-date` et `#col-review-summary`) | Dépliant fermé, trois étiquettes maison, deux liens sans date de publication ; rien du format « Sources et statuts » des hubs (`demeures.html#sources`) |

## 2. Ce qui a été fait, et comment c'est prouvé

### VIS-01 — bloc 05

- Données : six items avec `statut`, `media` (registre `outils/medias-officiels.json`, crédit Rockstar Games), `alt`, `legende`, `texte`, `limite`, `source {label,url,publishedAt,consultedAt}`. Sources : GamingBolt 07/09/2026 et Dexerto 07/09/2026 (propos de Rob Nelson, Rockstar North, à TGG), Engadget 27/08/2026 (Extended Look), GTABoom 02/09/2026 (previews TGG / Kinda Funny), GTA Intel 29/09/2026 (dossier Game Informer), captures officielles Rockstar. Aucune donnée de fuite.
- Rendu : `sections.cjs` steps() (pastille, légende, limite, source), classe `ed-steps--sourced` ; `style.css` : cadre 16/9 commun, numéro sur l'image, limite et source calées en bas, survol selon la charte (ombre corail, anneau, image ×1,03), `prefers-reduced-motion` respecté ; `common.js` : `.ed-step` dans la cascade LKMotion.
- Preuves : test `hubs-v740` (6 visuels `loading="lazy"`, 6 statuts, 6 limites, 6 sources `https` + `rel="noopener nofollow"`, encadré → `#fiabilite`, anciennes formulations absentes) ; recette lot 2 § 1 : à 360/390/768/1024/1280/1440 px, 6 images chargées, ratio 1,78 ± 0,03, hauteurs égales par rangée, colonnes 3 / 2 / 1, survol sans déplacement ; captures `captures/apres/armes-combat-1280.png`, `-390.png`, `recette/combat-hover-1280.png`.

### VIS-02 — une seule base cartographique

- `outils/carte-reference.cjs` : `source()` lit le `<svg class="map-bg">` de `carte.html` ; `build()` retire `lyr-grid` et `lyr-key` (groupes imbriqués compris), les commentaires et l'indentation, ajoute `xmlns`, `<title>` et `<desc>` (« fond communautaire, non officiel ») ; `write()` écrit `img/leonida-carte.svg` si le contenu change ; `href()` versionne par SHA-256. Appelé par `gen.js`, `gen-armes.cjs`, `sync-site.cjs`.
- `outils/localisateur.cjs` : `<div class="lk-loc-stage"><img class="lk-loc-base" loading="lazy" …><svg class="lk-loc-svg" viewBox="0 0 5200 6000">repères</svg></div>` ; l'image en `object-fit:contain` et le SVG par son viewBox occupent la même boîte : géométrie identique, repères aux coordonnées de `carte.js` / `carte-gtadb-source.json`. Vue entière par défaut, repères agrandis (0,014 / 0,034 de la largeur).
- Preuves : test `carte-reference-lot2` (fichier = `build()` exact ; calques conservés / retirés ; mention « FOND PROVISOIRE » ; `carte.html` garde grille et légende ; 5 pages : viewBox entier, `img` versionnée, repères = points de la carte, aucun `<use>`, numéros du hub Véhicules sans recouvrement ; vignettes = même calque TERRES ; liens `#lieu=` / `#pins=` vers des lieux connus) ; test `catalogues-v750` (27 fiches) ; recette lot 2 § 2 : 4 pages × 2 largeurs (référence servie > 150 Ko, sans grille ni légende, superposée exactement aux repères), `carte.html#lieu=g-L1074` ouvre la fiche, `#pins=…&t=Armureries` liste les trois armureries et chacune ouvre sa fiche, `carte.html` intact ; captures `captures/apres/armes-carte-1280.png`, `vehicules-carte-1280.png`, `fiche-arme-carte-*`, `fiche-vehicule-carte-*`, `carte-stage-1280.png` (référence).
- Coût : +210 Ko la première fois qu'une carte de localisateur approche de l'écran, puis cache (`/img/(.*)` est déjà sous `Cache-Control` dans `vercel.json`) ; pas de téléchargement au chargement des pages (image différée) : transfert des fiches inchangé (292 Kio).

### VIS-03 — Progression

- `common.js` : `.cn-dcard` dans `GRID_CARDS` (cascade `lk-reveal--zoom`, délai 60 ms × rang, plafond 300 ms) et exclusion de leur figure du rideau d'image ; `style.css` : déplacement et transition d'entrée seulement tant que `lk-settled` n'est pas posée. `progression.js` et `carnets.css` inchangés.
- Preuves : test `visuel-lot2` (9 cartes `lk-reveal--zoom` + `is-in`, `--lk-delay` posé, aucune figure clip, compteurs remplis, total 302, « À documenter » immédiat sur Collectibles, survol de `carnets.css` intact) ; recette lot 2 § 3 : compteurs et 9 boutons écrits avant toute apparition, transition observée (opacités intermédiaires) puis 9 cartes visibles, coche dans un autre onglet → compteur « 1 » sans réapparition, réduction des mouvements → 9 cartes visibles ; capture `recette/progression-suivi-1280.png`.

### VIS-04 — Planques

- `style.css` : `.lore-card>img{height:auto;aspect-ratio:16/9;object-fit:cover}` (l'attribut `height` ne gouverne plus), `.lore-grid>.lore-card` en `grid-template-rows:subgrid;grid-row:span 6`, `.veh-body` en sous-grille de 5 rangées avec placement explicite (`veh-marque` 1, `h3` 2, `lore-cardtag` 3, `p` 4, `veh-go` 5) ; sans `@supports subgrid`, `.veh-go{margin-top:auto}`.
- Preuves : test `visuel-lot2` (règles présentes, structure des trois cartes, image 1280 × 576 bien présente) ; recette lot 2 § 4 : à 360/390/768/1024/1280/1440 px, images 16/9 de même hauteur, titres / accroches / textes / actions / bas de carte alignés à ± 1,5 px, pas de défilement horizontal ; grilles de Demeures, Lieux, Personnages et accueil alignées ; captures `captures/apres/planques-fiches-1280.png`, `-390.png`, `recette/planques-768.png`.

### CONT-01 — Collectibles

- `outils/collectibles.json` : bloc `veille` (revueAt 2026-10-01, lede, 5 faits `etat` {statut, titre, texte, src}, 3 colonnes `entree`, 8 `sources` {id, url, title, publishedAt, consultedAt, statut, claim}) ; `updatedAt` = date de revue. `gen-collectibles.cjs` : validation (dates réelles, URL HTTPS, statuts du site, chaque fait → une source, ≥ 3 sources), `renderMethode()` avec `sections.cjs` (section, pip, columns, sourceList) et les niveaux de `editorial-hubs.json`, bornes `COLLECTIBLES-METHODE` dans `collectibles.html` ; la veille est retirée de `collectibles-data.js`.
- Recherche (toutes consultées le 01/10/2026) : rockstargames.com/VI, /VI/an-extended-look, /VI/media/screenshots ; Notebookcheck 07/09/2026 (Rob Nelson à TGG) ; Game Informer 25/09 et 29/09/2026 ; GTA Intel 29/09/2026 ; GTABase (communautaire). Détail et pages écartées : `outils/RECHERCHE-COLLECTIBLES.md`.
- Preuves : test `visuel-lot2` (section nuit / corail, kicker, 4 niveaux identiques aux hubs, ≥ 4 faits avec pastille et renvoi `#src-…`, 3 colonnes, ≥ 6 sources `https` datées avec statut, Rockstar présent, revue 2026-10-01, résumé mis à jour, encadré, liens Tuto et contact, aucun nombre d'objets, catalogue à 0, veille absente des données publiques, ancien bloc absent) ; recette lot 2 § 5 (1280 / 390 : composition, titres clairs sur fond nuit, 8 liens, visible, sans débordement ; Demeures confirmé comme référence) ; capture `recette/collectibles-methode-1280.png` à comparer à `captures/avant/demeures-sources-1280.png`.

### Régression de la v7.54 (hors prompt, bloquante pour la publication)

- Constat : `qa/stuck.cjs` (animations actives, défilement complet, 30 pages × 1280 px) : v7.53 = 0 bloc invisible, v7.54 = 75 (10 cartes et 3 outils de l'accueil, cartes de Lieux / Planques / Demeures / Entreprises / Personnages, 9 de Collectibles, 12 de Véhicules rares, textes de 3 fiches). Cause : `LKMotion.show()` ne posait que `in` sur un bloc `rise` / `reveal`, même quand il portait aussi `lk-reveal` (opacité 0 tant que `is-in` manque) ; et `observe()` ignorait un bloc déjà vu qui recevait `lk-reveal` après coup. Les captures du lot 1 étaient prises en « réduire les animations » (où tout est forcé visible), d'où l'angle mort.
- Correction : `shown()` / `show()` / `observe()` de `common.js` (les deux classes sont posées ; un bloc déjà montré reste montré sans transition).
- Preuves : `qa/stuck.cjs` → 0 bloc sur 30 pages à 1280 et 390 px ; recette lot 2 § 0 (23 pages × 2 largeurs) ; test `visuel-lot2` (4 pages jsdom) ; recette du lot 1 rejouée : 416 / 416 ; détecteur de clignotement : 0 sur 12 pages × 2 largeurs.

## 3. Contrôles globaux

| Contrôle | Résultat |
|---|---|
| `node --test outils/tests/*.test.cjs` | 603 / 603 (lot 1 : 595 ; + 8 tests du lot 2) |
| `node outils/verifier.js` | 48 309 références, 0 erreur, 415 pages |
| `node outils/regenerer.cjs` deux fois | 0 fichier changé entre les deux passes |
| Recette lot 2 (`qa/recette-lot2.cjs`) | v7.55 : 248 contrôles, 0 échec ; v7.54 : 100 échecs (tous sur les points du lot ou la régression) |
| Recette lot 1 (`qa/recette.cjs`) rejouée sur la v7.55 | 416 / 416 |
| Clignotement (`qa/flicker.cjs`) | 0 sur 12 pages × 2 largeurs |
| Blocs invisibles (`qa/stuck.cjs`) | 0 sur 30 pages × 2 largeurs (v7.54 : 75) |

## 4. Mesures (qa/perf.cjs, CPU ×4, 10 Mbit/s + 40 ms, 3 répétitions, médianes ; détail `mesures/mesures-lot2.md`)

| Page (cache froid, 1280 px) | DCL v7.54 → v7.55 | Transfert Kio | Nœuds |
|---|---:|---:|---:|
| armes.html | 1 396 → 1 571 ms | 257 → 261 | 2 344 → 2 396 |
| vehicules.html | 2 154 → 2 107 ms | 313 → 315 | 11 201 → 11 202 |
| progression.html | 702 → 765 ms | 564 → 566 | 481 |
| planques.html | 835 → 800 ms | 229 → 231 | 698 |
| collectibles.html | 890 → 962 ms | 447 → 451 | 745 → 876 |
| fiche véhicule | 761 → 764 ms | 294 → 292 | 804 → 805 |
| fiche arme | 644 → 666 ms | 152 → 151 | 544 → 545 |

Lecture : les écarts (< 10 %, dans les deux sens) sont dans le bruit de trois répétitions ; le poids transféré au chargement ne bouge pas
(le fond de carte est différé, le bloc 05 ajoute 4 Ko de texte, Collectibles 131 nœuds). Les gains du lot 1 sont conservés (Véhicules
à 315 Kio au lieu de 1 478 avant le lot 1 ; index de recherche toujours différé : vérifié par la recette).

## 5. Limites et décisions

- Les vignettes 84 px des cartes-lieux gardent la silhouette (même calque de terres, couleurs du fond) : un fond détaillé n'y serait pas lisible et coûterait 210 Ko de rendu par vignette.
- Les textes du fond de carte sont rendus avec la police de secours du navigateur dans l'image (les polices externes ne se chargent pas dans une image SVG) : seuls les noms de comtés sont concernés, lisibles.
- Le tir sous l'eau et la benne de pick-up ne sont pas « documentés » mais écrits comme questions ouvertes : aucune page Rockstar ni média nommé ne les établit.
- Les mesures sont celles du laboratoire Chromium (ni Safari, ni Firefox, ni CDN Vercel). Rien n'a été publié.
