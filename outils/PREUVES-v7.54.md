# Preuves du lot 1 — v7.54 (1er octobre 2026)

Mission « corrections visuelles, fluidité et Léo », lot 1 : diagnostic, latence et socle de performance. Base : v7.53 (zip Leonidadex-main (7),
SHA-256 a650b62af33e46d976e867f68cb727d4feada62637cb7b4ee30bc43cf2750b8e). Matrice : `outils/MATRICE-FLUIDITE.md`. Changements :
`outils/CHANGEMENTS-v7.54.txt`. Les scripts de mesure et de recette (`qa/`) sont livrés dans le dossier de contrôle, hors dépôt.

## 1. Inventaire (PERF-01)

415 pages HTML publiables (32 à la racine dont 4 renvois, 302 fiches véhicules, 27 fiches armes + 4 renvois, 29 fiches du monde, 9 carnets).
Composants partagés par toutes les pages : `style.css` (224 Ko), `common.js` (35 Ko), `app.js` (29 Ko), `assets-manifest.js` (26 Ko), et avant ce lot
`search-index.js` (175 Ko, sur 414 pages). Léo : `leo-loader.js` (5 Ko) sur toutes les pages, le reste à l'ouverture.

| Page (base v7.53) | HTML | Scripts | Octets JS | Feuilles | Octets CSS | Images | SVG en ligne | Particularité |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| index.html | 33 Ko | 6 | 378 Ko | 2 | 240 Ko | 11 | 3 | recherche, bandeaux, mini-calculateur |
| vehicules.html | 1 473 Ko | 6 | 334 Ko | 3 | 261 Ko | 363 | 281 | 302 cartes, 248 schémas en ligne (810 Ko), `vehicules-data.js` 215 Ko |
| armes.html | 157 Ko | 8 | 312 Ko | 3 | 261 Ko | 9 | 97 | 27 cartes, zone éditoriale (blocs 05 et 06), constructeur d'équipement |
| carte.html | 277 Ko | 8 | 1 354 Ko | 2 | 240 Ko | 9 | 18 | `carte-gtadb.js` 981 Ko (2 547 lieux), 20 000 nœuds |
| calculateurs.html | 47 Ko | 25 | 1 269 Ko | 5 | 396 Ko | 5 | 20 | 25 scripts (moteur, scénario, plan, ateliers) |
| nourriture.html | 248 Ko | 13 | 363 Ko | 4 | 278 Ko | 8 | 125 | liste dépliable de 30 lignes avec fiches |
| style.html | 515 Ko | 13 | 363 Ko | 4 | 278 Ko | 56 | 219 | 109 lignes (3 familles) avec fiches — lot 3 |
| personnalisations.html | 513 Ko | 13 | 363 Ko | 4 | 278 Ko | 26 | 202 | 98 lignes (2 familles) — lot 3 |
| progression.html | 26 Ko | 12 | 484 Ko | 3 | 252 Ko | 15 | 2 | 14 cartes de carnets |
| fiche véhicule (vapid-stanier) | 64 Ko | 7 | 503 Ko | 2 | 239 Ko | 2 | 9 | galerie officielle, `vehicules-data.js` (215 Ko) pour les fiches liées |
| fiche arme (girardi-es9) | 30 Ko | 7 | 303 Ko | 2 | 239 Ko | 1 | 11 | galerie officielle |

Site en ligne (30 septembre 2026) : mêmes `style.css`, `app.js` et `vehicules.html` que la base ; seule l'empreinte de `common.js` diffère
(version de Léo) — la base est bien la référence.

### Causes identifiées (par ordre d'effet mesuré)

1. **Véhicules** : 248 schémas SVG dessinés en ligne dans la grille (810 Ko sur 1 478 Ko, ~15 000 nœuds) ; 302 cartes mises en page et peintes
   alors que le script en cache ensuite 254 ; `vehicules-data.js` (215 Ko) chargé pour le seul bandeau des marques ; à chaque frappe dans la
   recherche, les 302 cartes réinsérées dans la grille (`grid.appendChild` dans `trier()`), lecture du DOM (`h3`, `.veh-marque`) et re-normalisation
   du texte de chaque carte ; tri limité aux 48 premières cartes de l'ordre d'origine (bogue) ; double filtrage au chargement ; écouteur de clic
   global qui relisait le stockage après chaque clic.
2. **Toutes les pages** : `search-index.js` (175 Ko) téléchargé et évalué sur 414 pages pour une recherche rarement utilisée ; quatre
   IntersectionObserver et deux minuteries d'apparition par page ; blocs du premier écran cachés puis remontrés (clignotement titre / texte /
   images mesuré sur 9 pages sur 12 : de 0,2 s sur ordinateur à 3,4 s sur Véhicules mobile) ; filets de sécurité qui affichaient toute la page
   après 2,5 s (donc plus d'apparition au défilement ensuite) ; `will-change` posé sur tous les blocs pas encore apparus (couches GPU inutiles) ;
   rails latéraux : une mise en page forcée par bloc pleine largeur ; bouton Léo : jusqu'à 84 tests de recouvrement (`elementsFromPoint`) à chaque
   trame du défilement ; galerie des fiches : première image recréée (second décodage) ; aucun cache navigateur au-delà de la session pour les
   scripts et feuilles versionnés.
3. **Listes dépliables** : attente de 80 ms à la frappe puis réinsertion de toutes les lignes à chaque filtre.
4. **Non traité dans ce lot (mesuré, laissé aux lots concernés)** : pages `style.html` et `personnalisations.html` de 515 Ko (fiches complètes
   écrites dans chaque ligne — lot 3) ; `carte.html` : 981 Ko de données de lieux et 20 000 nœuds SVG, chargement 1,2 s à processeur ralenti,
   défilement et actions déjà fluides ; `calculateurs.html` : 25 scripts (1,27 Mo brut, ~300 Ko compressés), 1,4 s à processeur ralenti ; le
   découpage de ces scripts serait un chantier à part, sans lenteur perceptible mesurée sur les actions (100 à 140 ms à CPU ×4).

## 2. Méthode

- Serveur local statique (gzip niveau 6, ETag, mêmes en-têtes de cache que Vercel pour `img/`, `photos/`, `leo/`), Chromium 141 piloté par
  Playwright, processeur ralenti ×4, réseau simulé 10 Mbit/s avec 40 ms de latence, largeurs 1280 px (ordinateur) et 390 px (mobile, écran
  tactile émulé). Cache froid = nouveau contexte de navigation ; cache chaud = seconde navigation dans le même contexte. Trois répétitions,
  médianes. Même machine, même série avant puis après, aucune autre charge pendant les mesures.
- Chargement : DCL, FCP, LCP (observateur `largest-contentful-paint`, valeur 0 quand le navigateur n'en rapporte pas), durées CPU du navigateur
  (`Performance.getMetrics` : script, styles, mise en page), nœuds, octets transférés, requêtes, CLS.
- Actions : durée synchrone du gestionnaire (dispatch de l'événement) puis délai jusqu'à deux trames rendues (`requestAnimationFrame` ×2). Ce
  n'est ni l'INP ni la durée complète des transitions CSS.
- Défilement : 0 → 3 600 px par pas de 60 px à chaque trame, intervalles entre trames (médiane, p95, trames > 50 ms).
- Léo : délai entre le clic sur le bouton et le champ de question prêt (première ouverture : chargement des modules), puis délai de réponse à
  « Bonjour ».
- Clignotement : échantillonnage toutes les 50 ms, pendant 3,5 s, de l'opacité calculée de chaque bloc du premier écran ; un bloc « visible →
  transparent → visible » compte comme un clignotement.
- Limites : laboratoire Chromium uniquement (pas de Safari, Firefox, appareil physique, ni CDN Vercel) ; ces chiffres ne sont pas ceux de tous
  les visiteurs ; les écarts inférieurs à ~10 % entre avant et après sur les petites pages sont dans le bruit de mesure (trois répétitions).

## 3. Résultats avant / après


Conditions : CPU ×4, 10 Mbit/s, 40 ms, gzip niveau 6, 3 répétitions ; Chromium 141.0.7390.37 ; serveur local gzip/ETag ; largeurs 1280 et 390 px. Cache froid = nouveau contexte ; cache chaud = seconde navigation du même contexte. Médianes de 3 répétitions. Mesures de laboratoire : ni un score Lighthouse ni l’expérience réelle de tous les visiteurs.

Colonnes : DCL = fin de construction du DOM ; FCP = premier contenu peint ; LCP = plus grand contenu peint (0 = non rapporté par le navigateur) ; script / styles / mise en page = durées CPU (ms) du chargement ; nœuds = éléments du DOM ; transfert = octets réellement reçus (compressés) ; CLS = décalages de mise en page.

### Chargement — cache froid

| Page | Largeur | DCL ms | FCP ms | LCP ms | Script ms | Styles ms | Mise en page ms | Nœuds | Transfert Kio | Requêtes | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| index.html | 1280 | 829 → 867 | 756 → 724 | 1252 → 856 | 127 → 132 | 190 → 194 | 239 → 235 | 626 → 627 | 523 → 491 | 21 → 20 | 0 → 0 |
| vehicules.html | 1280 | 3657 → 2085 | 1708 → 696 | 1708 → 696 | 578 → 330 | 1307 → 581 | 876 → 530 | 18243 → 11201 | 417 → 313 | 18 → 33 | 0.005 → 0.005 |
| armes.html | 1280 | 1424 → 1380 | 808 → 844 | 808 → 844 | 182 → 177 | 389 → 422 | 466 → 469 | 2344 → 2344 | 292 → 257 | 21 → 19 | 0 → 0 |
| carte.html | 1280 | 1324 → 1470 | 688 → 716 | 688 → 716 | 337 → 401 | 297 → 332 | 373 → 389 | 20321 → 20322 | 490 → 459 | 18 → 17 | 0.025 → 0.025 |
| calculateurs.html | 1280 | 1407 → 1431 | 776 → 784 | 804 → 816 | 368 → 406 | 259 → 276 | 398 → 357 | 3483 → 3484 | 599 → 568 | 36 → 35 | 0.025 → 0.025 |
| nourriture.html | 1280 | 1329 → 1315 | 760 → 788 | 760 → 788 | 130 → 136 | 306 → 302 | 561 → 586 | 4685 → 4686 | 345 → 315 | 26 → 25 | 0 → 0 |
| progression.html | 1280 | 780 → 709 | 572 → 560 | 572 → 560 | 136 → 141 | 135 → 129 | 158 → 160 | 480 → 481 | 595 → 564 | 32 → 31 | 0.003 → 0.003 |
| vehicules/vapid-stanier.html | 1280 | 804 → 745 | 608 → 596 | 652 → 596 | 82 → 76 | 203 → 180 | 214 → 221 | 804 → 804 | 378 → 294 | 17 → 15 | 0 → 0.032 |
| armes/girardi-es9.html | 1280 | 705 → 657 | 544 → 604 | 544 → 824 | 81 → 74 | 181 → 151 | 213 → 199 | 544 → 544 | 187 → 152 | 16 → 14 | 0.044 → 0.044 |
| index.html | 390 | 823 → 755 | 584 → 568 | 584 → 568 | 129 → 76 | 185 → 171 | 224 → 208 | 570 → 571 | 251 → 220 | 15 → 14 | 0 → 0 |
| vehicules.html | 390 | 3317 → 1826 | 1580 → 592 | 1580 → 592 | 553 → 310 | 1186 → 508 | 710 → 472 | 18243 → 11201 | 417 → 304 | 18 → 25 | 0.030 → 0.030 |
| armes.html | 390 | 1393 → 1349 | 804 → 792 | 804 → 792 | 213 → 208 | 405 → 405 | 438 → 441 | 2344 → 2344 | 292 → 257 | 21 → 19 | 0.015 → 0.015 |
| carte.html | 390 | 1230 → 1186 | 648 → 624 | 648 → 624 | 335 → 317 | 261 → 248 | 343 → 319 | 20321 → 20322 | 490 → 459 | 18 → 17 | 0.037 → 0.037 |
| calculateurs.html | 390 | 1444 → 1501 | 704 → 732 | 736 → 764 | 401 → 418 | 288 → 268 | 357 → 359 | 3483 → 3484 | 599 → 568 | 36 → 35 | 0.030 → 0.030 |
| nourriture.html | 390 | 1303 → 1272 | 692 → 696 | 692 → 696 | 185 → 145 | 303 → 338 | 509 → 504 | 4685 → 4686 | 345 → 315 | 26 → 25 | 0.037 → 0.037 |
| progression.html | 390 | 772 → 678 | 520 → 508 | 520 → 508 | 149 → 102 | 142 → 120 | 135 → 143 | 480 → 481 | 411 → 379 | 26 → 25 | 0 → 0 |
| vehicules/vapid-stanier.html | 390 | 795 → 691 | 576 → 532 | 576 → 756 | 83 → 58 | 185 → 182 | 186 → 186 | 804 → 804 | 271 → 186 | 17 → 15 | 0 → 0 |
| armes/girardi-es9.html | 390 | 650 → 594 | 504 → 492 | 688 → 704 | 69 → 63 | 179 → 174 | 172 → 172 | 544 → 544 | 187 → 152 | 16 → 14 | 0 → 0 |

### Chargement — cache chaud

| Page | Largeur | DCL ms | FCP ms | LCP ms | Script ms | Styles ms | Mise en page ms | Nœuds | Transfert Kio | Requêtes | CLS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| index.html | 1280 | 418 → 374 | 408 → 440 | 408 → 1112 | 50 → 53 | 142 → 150 | 137 → 144 | 626 → 627 | 13 → 13 | 24 → 23 | 0 → 0 |
| vehicules.html | 1280 | 3292 → 1694 | 544 → 568 | 544 → 568 | 508 → 217 | 1276 → 543 | 649 → 468 | 18243 → 11201 | 149 → 76 | 25 → 79 | 0.005 → 0.005 |
| armes.html | 1280 | 892 → 869 | 540 → 560 | 540 → 560 | 109 → 115 | 310 → 305 | 245 → 244 | 2344 → 2344 | 34 → 33 | 22 → 20 | 0 → 0 |
| carte.html | 1280 | 1168 → 1094 | 416 → 516 | 416 → 516 | 350 → 323 | 245 → 287 | 286 → 295 | 20321 → 20322 | 96 → 96 | 18 → 17 | 0.025 → 0.025 |
| calculateurs.html | 1280 | 1047 → 1135 | 588 → 572 | 588 → 572 | 252 → 272 | 254 → 251 | 301 → 313 | 3483 → 3484 | 22 → 22 | 36 → 35 | 0.025 → 0.025 |
| nourriture.html | 1280 | 947 → 894 | 564 → 524 | 564 → 524 | 122 → 88 | 265 → 283 | 375 → 344 | 4685 → 4686 | 38 → 38 | 27 → 26 | 0 → 0 |
| progression.html | 1280 | 550 → 461 | 420 → 480 | 420 → 604 | 104 → 73 | 147 → 134 | 132 → 149 | 480 → 481 | 12 → 12 | 32 → 31 | 0.003 → 0.003 |
| vehicules/vapid-stanier.html | 1280 | 504 → 430 | 404 → 372 | 412 → 504 | 62 → 43 | 174 → 139 | 179 → 158 | 804 → 804 | 16 → 15 | 16 → 14 | 0.051 → 0.032 |
| armes/girardi-es9.html | 1280 | 472 → 472 | 360 → 380 | 360 → 380 | 45 → 46 | 164 → 129 | 155 → 174 | 544 → 544 | 12 → 11 | 15 → 13 | 0.046 → 0.044 |
| index.html | 390 | 357 → 396 | 292 → 356 | 292 → 464 | 39 → 49 | 135 → 150 | 97 → 123 | 570 → 571 | 13 → 13 | 18 → 17 | 0.018 → 0.015 |
| vehicules.html | 390 | 3093 → 1618 | 508 → 404 | 508 → 404 | 489 → 250 | 1125 → 513 | 590 → 422 | 18243 → 11201 | 149 → 76 | 21 → 44 | 0.030 → 0.030 |
| armes.html | 390 | 899 → 830 | 504 → 492 | 504 → 492 | 158 → 126 | 331 → 309 | 272 → 221 | 2344 → 2344 | 34 → 33 | 22 → 20 | 0.015 → 0.015 |
| carte.html | 390 | 1060 → 971 | 456 → 416 | 456 → 416 | 345 → 288 | 259 → 247 | 265 → 243 | 20321 → 20322 | 96 → 96 | 18 → 17 | 0.037 → 0.037 |
| calculateurs.html | 390 | 1099 → 1029 | 476 → 440 | 476 → 440 | 307 → 246 | 230 → 252 | 256 → 281 | 3483 → 3484 | 22 → 22 | 36 → 35 | 0.029 → 0.029 |
| nourriture.html | 390 | 940 → 883 | 508 → 492 | 508 → 492 | 136 → 99 | 293 → 316 | 342 → 352 | 4685 → 4686 | 38 → 38 | 27 → 26 | 0.037 → 0.037 |
| progression.html | 390 | 525 → 416 | 360 → 360 | 360 → 496 | 72 → 57 | 151 → 128 | 120 → 113 | 480 → 481 | 12 → 12 | 26 → 25 | 0 → 0 |
| vehicules/vapid-stanier.html | 390 | 452 → 374 | 328 → 368 | 480 → 484 | 62 → 35 | 169 → 145 | 129 → 134 | 804 → 804 | 16 → 15 | 16 → 14 | 0.042 → 0.006 |
| armes/girardi-es9.html | 390 | 441 → 377 | 328 → 372 | 464 → 480 | 58 → 37 | 172 → 156 | 130 → 129 | 544 → 544 | 12 → 11 | 15 → 13 | 0.037 → 0.006 |

### Résultat après une action (gestionnaire → deux trames rendues, ms)

| Page | Largeur | Action | Gestionnaire ms | Action → deux trames ms |
|---|---:|---|---:|---:|
| index.html | 1280 | siteSearch | 25 → 7.900 | 60 → 31 |
| vehicules.html | 1280 | search | 38.700 → 1.200 | 176 → 155 |
| vehicules.html | 1280 | clear | 22.500 → 5.400 | 216 → 298 |
| vehicules.html | 1280 | filter | 105.900 → 32.500 | 230 → 150 |
| vehicules.html | 1280 | resetFilter | 125.900 → 60.300 | 280 → 284 |
| vehicules.html | 1280 | sort | 28.500 → 21 | 249 → 210 |
| vehicules.html | 1280 | sortBack | 68.200 → 48.400 | 208 → 263 |
| vehicules.html | 1280 | plus | 17.500 → 0.300 | 345 → 147 |
| vehicules.html | 1280 | hover3 | 0 → 0 | 1906 → 1882 |
| armes.html | 1280 | search | 1.900 → 3.300 | 66 → 57 |
| armes.html | 1280 | clear | 5.300 → 3.900 | 90 → 91 |
| armes.html | 1280 | filter | 17.500 → 17.100 | 55 → 56 |
| armes.html | 1280 | resetFilter | 42.700 → 34.200 | 107 → 115 |
| armes.html | 1280 | sort | 33 → 5 | 149 → 112 |
| armes.html | 1280 | sortBack | 19.100 → 12.500 | 106 → 102 |
| armes.html | 1280 | plus | 0 → 0 | 33 → 54 |
| armes.html | 1280 | hover3 | 0 → 0 | 1879 → 1863 |
| carte.html | 1280 | mapSearch | 38.200 → 43.800 | 75 → 70 |
| carte.html | 1280 | mapZoom | 2.200 → 8.800 | 137 → 145 |
| carte.html | 1280 | mapReset | 13.600 → 4.900 | 86 → 80 |
| calculateurs.html | 1280 | calcTarget | 68.300 → 69.400 | 103 → 106 |
| calculateurs.html | 1280 | calcTab | 34.600 → 41.400 | 111 → 118 |
| calculateurs.html | 1280 | calcTabBack | 27.500 → 31.100 | 76 → 83 |
| nourriture.html | 1280 | listSearch | 0.100 → 0.300 | 123 → 34 |
| nourriture.html | 1280 | listClear | 0.200 → 0.100 | 217 → 154 |
| nourriture.html | 1280 | listOpenFiche | 0.700 → 0.200 | 66 → 82 |
| index.html | 390 | siteSearch | 23.300 → 5.400 | 39 → 25 |
| vehicules.html | 390 | search | 33.700 → 5 | 179 → 122 |
| vehicules.html | 390 | clear | 20.400 → 5.500 | 183 → 167 |
| vehicules.html | 390 | filter | 78.100 → 47.700 | 171 → 136 |
| vehicules.html | 390 | resetFilter | 74.100 → 32.700 | 185 → 161 |
| vehicules.html | 390 | sort | 33.600 → 29.600 | 193 → 231 |
| vehicules.html | 390 | sortBack | 32.900 → 36.400 | 156 → 186 |
| vehicules.html | 390 | plus | 21.600 → 1.100 | 318 → 146 |
| vehicules.html | 390 | hover3 | 0 → 0 | 1937 → 1878 |
| armes.html | 390 | search | 8.400 → 3.100 | 59 → 59 |
| armes.html | 390 | clear | 4 → 2.900 | 94 → 90 |
| armes.html | 390 | filter | 14.800 → 15.900 | 53 → 59 |
| armes.html | 390 | resetFilter | 29.300 → 17.900 | 90 → 71 |
| armes.html | 390 | sort | 23.700 → 2.100 | 107 → 101 |
| armes.html | 390 | sortBack | 11.400 → 18.100 | 75 → 82 |
| armes.html | 390 | plus | 0 → 0 | 16 → 17 |
| armes.html | 390 | hover3 | 0 → 0 | 1889 → 1880 |
| carte.html | 390 | mapSearch | 38.900 → 32.500 | 64 → 64 |
| carte.html | 390 | mapZoom | 8.100 → 8.600 | 73 → 69 |
| carte.html | 390 | mapReset | 6.300 → 3.400 | 33 → 28 |
| calculateurs.html | 390 | calcTarget | 68.200 → 67.200 | 106 → 108 |
| calculateurs.html | 390 | calcTab | 42 → 42.900 | 136 → 129 |
| calculateurs.html | 390 | calcTabBack | 29.700 → 36.400 | 85 → 93 |
| nourriture.html | 390 | listSearch | 0.100 → 1.700 | 125 → 52 |
| nourriture.html | 390 | listClear | 0 → 0.500 | 242 → 134 |
| nourriture.html | 390 | listOpenFiche | 0.100 → 0.100 | 59 → 63 |

### Défilement synthétique (0 → 3 600 px, intervalles entre trames, ms ; plus bas = mieux)

| Page | Largeur | Intervalle médian | p95 | Trames > 50 ms | Trame la plus longue |
|---|---:|---:|---:|---:|---:|
| index.html | 1280 | 20 → 20 | 33 → 29 | 0 → 0 | 50 → 42 |
| vehicules.html | 1280 | 19 → 20 | 56 → 40 | 3 → 1 | 100 → 95 |
| armes.html | 1280 | 17 → 17 | 23 → 19 | 0 → 0 | 38 → 19 |
| carte.html | 1280 | 17 → 17 | 19 → 21 | 0 → 0 | 20 → 22 |
| calculateurs.html | 1280 | 17 → 17 | 19 → 18 | 0 → 0 | 22 → 19 |
| nourriture.html | 1280 | 17 → 17 | 30 → 21 | 1 → 0 | 83 → 23 |
| progression.html | 1280 | 17 → 17 | 19 → 21 | 0 → 0 | 22 → 22 |
| vehicules/vapid-stanier.html | 1280 | 17 → 17 | 19 → 21 | 0 → 0 | 24 → 22 |
| armes/girardi-es9.html | 1280 | 17 → 17 | 20 → 21 | 0 → 0 | 22 → 23 |
| index.html | 390 | 17 → 17 | 21 → 21 | 0 → 0 | 22 → 22 |
| vehicules.html | 390 | 17 → 17 | 20 → 18 | 0 → 0 | 33 → 43 |
| armes.html | 390 | 17 → 17 | 34 → 18 | 0 → 0 | 44 → 28 |
| carte.html | 390 | 17 → 17 | 21 → 23 | 0 → 0 | 23 → 24 |
| calculateurs.html | 390 | 17 → 17 | 20 → 18 | 0 → 0 | 24 → 18 |
| nourriture.html | 390 | 16 → 17 | 22 → 22 | 1 → 0 | 102 → 23 |
| progression.html | 390 | 17 → 17 | 21 → 22 | 0 → 0 | 23 → 23 |
| vehicules/vapid-stanier.html | 390 | 17 → 17 | 21 → 21 | 0 → 0 | 22 → 22 |
| armes/girardi-es9.html | 390 | 17 → 17 | 20 → 21 | 0 → 0 | 21 → 21 |

### Léo (première ouverture, puis réponse à « Bonjour », ms)

| Page | Largeur | Ouverture | Réponse |
|---|---:|---:|---:|
| index.html | 1280 | 344 → 298 | 257 → 286 |
| vehicules.html | 1280 | 552 → 569 | 195 → 219 |
| armes.html | 1280 | 473 → 364 | 174 → 276 |
| index.html | 390 | 305 → 302 | 208 → 187 |
| vehicules.html | 390 | 1033 → 625 | 125 → 205 |
| armes.html | 390 | 443 → 389 | 181 → 177 |

Navigations : 108 avant, 108 après ; erreurs JavaScript : 0 avant, 0 après ; réponses HTTP en erreur (≥ 400) : 0 avant, 0 après ; requêtes interrompues par la navigation suivante (images différées encore en cours, sans effet sur la page) : 0 avant, 0 après.

## 4. Clignotement du premier écran

Détecteur `qa/flicker.cjs` : opacité calculée des blocs du premier écran échantillonnée toutes les 50 ms pendant 3,5 s, processeur ralenti ×4, 12 pages × 2 largeurs.

| Page | Base v7.53 — blocs visibles → cachés → visibles (durée cachée, 1280 / 390 px) | v7.54 |
|---|---|---|
| index.html | 0 / 0 | 0 / 0 |
| vehicules.html | 0 / 3 (titre, texte, pile d'images cachés 3,3 s → 3,7 s) | 0 / 0 |
| armes.html | 6 / 6 (titre, texte, chiffres : 1,0 s → 1,2 s ; 0,9 s → 1,1 s) | 0 / 0 |
| a-propos.html | 3 / 3 (0,5 s → 0,65 s) | 0 / 0 |
| progression.html | 3 / 3 (0,46 s → 0,67 s ; 0,32 s → 0,5 s) | 0 / 0 |
| nourriture.html | 7 / 6 (0,93 s → 1,27 s ; 0,99 s → 1,52 s) | 0 / 0 |
| calculateurs.html | 0 / 4 (0,67 s → 1,1 s) | 0 / 0 |
| carte.html | 4 / 3 (0,72 s → 1,26 s ; 0,71 s → 1,29 s) | 0 / 0 |
| vehicules/vapid-stanier.html | 0 / 3 (0,55 s → 0,71 s) | 0 / 0 |
| lieux/ambrosia.html | 0 / 0 | 0 / 0 |
| achats.html | 0 / 0 | 0 / 0 |
| tuto.html | 3 / 0 (0,84 s → 0,93 s) | 0 / 0 |

Cause : les scripts de fin de page cachaient l'en-tête déjà peint (cascade `lk-hero-item`, mots des titres, piles d'images) puis le remontraient ; corrigé par la détection « page déjà peinte » (`lk-hero-still`) et l'affichage sans transition des blocs du premier écran (`lk-instant`).

## 5. Recette navigateur et tests

- `qa/recette.cjs` (Chromium, 1280 et 390 px, 31 pages) : 416 contrôles, 0 échec sur la v7.54 ; la base v7.53 soumise à la même recette en échoue 67 (index téléchargé au chargement sur 56 combinaisons, `vehicules-data.js` chargé, schémas en ligne, focus après retrait de la dernière possession).
- Suite Node : `NODE_PATH=<deps>/node_modules SITE_ROOT=$PWD node --test outils/tests/*.test.cjs` → 595 / 595 (dont `performance-lot1.test.cjs`, 9 tests).
- `node outils/verifier.js` → 47 953 références vérifiées dans 415 pages, aucune erreur.
- Régénération : `node outils/regenerer.cjs` est idempotente (vérifié : zéro fichier modifié sur la base v7.53 régénérée).
- Non testé : Safari, Firefox, appareils physiques, déploiement Vercel réel.

## 6. Reproduire les mesures

Dépendances hors dépôt : `npm install playwright-core jsdom postcss` dans un dossier à part ; `QA_CHROMIUM` = chemin de Chromium. Depuis le dossier parent du site :

```
NODE_PATH=<deps>/node_modules node qa/perf.cjs before <base v7.53> 3
NODE_PATH=<deps>/node_modules node qa/perf.cjs after <site v7.54> 3
node qa/perf-report.cjs qa/out/before.json qa/out/after.json > mesures.md
NODE_PATH=<deps>/node_modules node qa/recette.cjs after <site v7.54>
NODE_PATH=<deps>/node_modules node qa/flicker.cjs <site v7.54>
```

Les scripts `qa/` sont livrés dans le dossier de contrôle (jamais dans le site).
