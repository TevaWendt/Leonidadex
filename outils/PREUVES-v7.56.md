# Preuves — v7.56, lot 3 (Consommables, Vêtements et style, Personnalisation), 1er octobre 2026

Base : dépôt GitHub `TevaWendt/Leonidadex`, commit `0be6825` « LeonidaKit_v7.55_Lot2_Modifications » (13 h 30), identique au site en
ligne. Environnement : Node 22.22, Chromium 141 (Playwright), serveur statique local, pas de compression de production. Les mesures
sont des mesures de laboratoire, pas des mesures de visiteurs réels.

## 0. Artefacts et divergence constatée

| Vérification | Résultat |
|---|---|
| Archive lot 1 (`LeonidaKit_v7.54_Lot1_Modifications.zip`, 428 fichiers) contre le commit `0401d60` | 0 différence |
| Archive lot 2 (`LeonidaKit_v7.55_Lot2_Modifications.zip`, 431 fichiers) contre le commit `0be6825` | 0 différence ; `img/leonida-silhouette.svg` toujours présent (suppression à faire) |
| Site en ligne | `LISEZ-MOI-v7.54.txt` et `LISEZ-MOI-v7.55.txt` servis : le site = GitHub |
| Historique Git | `feb3127` « Leonidakit-v7.54-modifs » (30/09, 17 h, 454 fichiers) précède les lots 1 et 2 : deux v7.54 superposées ; 48 fichiers écrasés par les lots 1 et 2, 44 restés (liste dans `CHANGEMENTS-v7.56.txt` § 0) |
| Tests du dépôt sur le commit `0be6825` tel quel | 616 tests, **8 échecs** (À propos : chiffres ; Tuto : bloc de la v7.47 ; comparateur : liens ; fiches : « sans objet » ; carnets/collectibles ; chaîne Léo ; question bar du calculateur ; empreintes) |
| Après régénération complète (`node outils/regenerer.cjs`) | 616 tests, 4 échecs restants, tous dus aux quatre retouches de pages du 30/09 perdues → reposées (voir § 0 des changements) |
| Après les retouches et le lot 3 | **624 / 624 tests** (616 + 8 nouveaux de `catalogues-lot3`), `node outils/verifier.js` : 48 335 références, 0 erreur |

## 1. Inventaire des listes et des fiches (recette navigateur, Chromium 1280 px)

| Page | Famille | Lignes | Catégories | Statuts présents | Fiches paysage ouvertes et contrôlées |
|---|---|---|---|---|---|
| nourriture.html | consommables | 30 | 5 | officiel · vu · conf · serie | 30 fiches dans la page, 1 ouverte après tri + 1 depuis « En un regard » + 2 par ancre |
| style.html | coiffures | 55 | 4 | officiel · vu · conf · serie | 55 / 1 ouverte après tri |
| style.html | tatouages | 24 | 4 | officiel · vu · conf · serie | 24 / 1 ouverte après tri |
| style.html | tenues (et accessoires) | 30 | 10 | officiel · vu · serie | 30 / 1 ouverte après tri + 6 largeurs |
| personnalisations.html | perso-vehicules | 58 | 18 | officiel · vu · conf · serie | 58 / 1 après tri + 1 après filtre `sport` |
| personnalisations.html | perso-armes | 40 | 11 | officiel · vu · conf · serie | 40 / 1 après tri + 6 largeurs |
| **Total** | 6 listes | **237** | **52** | | **237 fiches** vérifiées structurellement (test `catalogues-lot3`), 14 ouvertes dans le navigateur |

Points d'entrée couverts : bouton « Fiche complète » de la ligne (liste initiale, après tri, après filtre, après filtre de compatibilité
par l'adresse), lien « Fiche complète » des 29 cartes « En un regard », ancre `#<famille>-<id>` au chargement et au changement
d'adresse, mode sans script (boîte `details` de la ligne), navigateur sans `<dialog>` (jsdom : repli `details`, rien n'est déplacé).

## 2. Contrôles automatiques

| Contrôle | Résultat |
|---|---|
| `node --test outils/tests/*.test.cjs` | 624 / 624 (dont `catalogues-lot3.test.cjs` : 8 tests — classes et règles des badges, 237 lignes/fiches, légende = statuts présents, descriptions repliées, jsdom : légende filtrante, description au clavier, repli sans dialog, tri ; carrousels : registre, fichiers, suivant/précédent/boucle/clavier/points ; Goodtime Gear ; grille des collections ; feuille et scripts) |
| Tests adaptés | `catalogues-v750` : 3 collections illustrées (était 2, STYLE-04) ; `conformite-v754` : port d'armes sourcé (lot 2) au lieu de « à confirmer » ; `regression` : étiquette « CALCULÉ AVEC LES EXEMPLES » (comportement du 30/09) |
| `node outils/verifier.js` | 0 erreur, 48 335 références, 415 pages |
| `node outils/gen-leo.cjs --check` (dans `regenerer.cjs`) | sorties identiques à l'octet |
| Recette navigateur `qa/recette-lot3.cjs` (dossier de contrôle) | **227 contrôles, 0 échec** : 6 listes (badges, fiches, actions, apparitions, légende, opacité, filtre par badge, vide, rejeu après effacement, tri, fiche après tri, Échap/croix/fond, focus), Consommables (description locale, clavier, distinction des deux boutons, cartes « En un regard », focus de retour), Personnalisation (filtre `sport`, fiche filtrée), carrousels (3 × 5 + clic, clavier, balayage, point, hauteur, 11 images servies), collections (1280 : trois de front ; 6 largeurs : colonnes, centrage, largeur, ordre), Tatouages (fond opaque, bords), ancres (`#consommables-sprunk` au chargement, `#consommables-ecola` au changement), 3 pages × 6 largeurs (défilement horizontal, débordements, fiche dans l'écran, une ou deux colonnes), réduction des mouvements (lignes, carrousel), sans script (descriptions, bouton, fiche, légende, vues empilées, aucune flèche) ; 0 erreur JavaScript sur toutes les pages et largeurs |

## 3. Mesures avant / après (Chromium, CPU ralenti ×4, cache désactivé, 3 répétitions, médianes ; avant = commit `0be6825` régénéré, après = v7.56)

1280 px :

| Page | HTML (Kio) | Transfert (Kio) | DOMContentLoaded (ms) | load (ms) | Recherche → 2 trames (ms) | Tri (ms) | Ouverture d'une fiche (ms) |
|---|---|---|---|---|---|---|---|
| nourriture.html | 246 → 261 | 900 → 927 | 1 460 → 1 278 | 1 656 → 1 585 | 213 → 137 | 207 → 214 | 241 → 358 (details → paysage) |
| style.html | 510 → 545 | 1 444 → 1 499 | 1 395 → 1 303 | 1 800 → 1 867 | 206 → 142 | 377 → 421 | 184 → 337 |
| personnalisations.html | 509 → 536 | 1 490 → 1 561 | 1 515 → 1 174 | 2 000 → 1 800 | 202 → 187 | 320 → 360 | 239 → 463 |

390 px :

| Page | DOMContentLoaded (ms) | load (ms) | Recherche (ms) | Tri (ms) | Ouverture d'une fiche (ms) |
|---|---|---|---|---|---|
| nourriture.html | 1 524 → 1 141 | 1 692 → 1 527 | 119 → 79 | 209 → 170 | 153 → 439 |
| style.html | 1 527 → 1 286 | 1 952 → 2 012 | 97 → 174 | 230 → 316 | 188 → 390 |
| personnalisations.html | 1 484 → 1 249 | 2 001 → 1 750 | 181 → 164 | 394 → 389 | 323 → 369 |

Lecture : les gains du lot 1 sont préservés et le chargement s'améliore un peu (les tableaux ne sont plus mesurés ligne à ligne avant
la première peinture ; une première version du lot le faisait et coûtait ~0,5 s à ×4 sur `style.html` — corrigée avant livraison :
`motion.observe(rows, {initial: box.open})`). Le poids HTML monte de 15 à 35 Kio (légende, boutons, carrousels ; le contenu des fiches
n'est pas dupliqué). L'ouverture d'une fiche passe de 150–320 ms (détail replié dans la cellule) à 340–460 ms à ×4 (≈ 70–190 ms à
vitesse normale) : une fiche paysage complète avec visuel 1 280 px ; environ 160 ms (×4) viennent de `showModal()` lui-même sur ces
pages de 8 000 à 16 000 nœuds, le reste de la mise en page de la fiche. Un verrou de défilement sur `<html>` (qui forçait une mise en
page complète, ~30 ms à ×1) a été écarté au profit d'un garde sur la molette. Le tri varie de −39 à +86 ms : le rappel visuel des lignes
déplace une mesure de mise en page dans le temps synchrone sans alourdir le total. Petits écarts (±50 ms) = bruit de mesure.

## 4. Vérifications visuelles (captures dans le dossier de contrôle)

- `avant/` : conso-box-top, conso-fiche (fiche portrait dans la colonne), conso-legend (pastilles discrètes), style-tatouages-section
  (rails des deux côtés), style-adresses (bouton « Voir les N autres vues »), style-collections (carte sans image, troisième isolée),
  conso-390.
- `apres/` : conso-1280 (légende, badges, actions), conso-dlg-1280 et conso-dlg-390 (fiche paysage et plein écran), style-tatouages-
  section (opaque), style-adresses (carrousels, vue 2 de Stock 305), style-collections-1280 et -900 (trois cartes ; deux + centrée),
  perso-1280, glance-1280, style-tenues-1024 / 1440, style-coiffures-1280, conso-390 ; `apres/recette/` : captures de la recette
  (fiches consommables/tatouages/perso-vehicules à 1280, fiche tenues à 390, trois pages à 390 et 768, adresses et collections).
- Contrastes des badges (texte sur fond) : encre/papier 16:1 ; encre/ambre 8,4:1 ; blanc/violet #7A5C8F 5,6:1 ; blanc/sarcelle
  #2F6F73 5,7:1 ; « à confirmer » encre sur papier 16:1. Aucun statut ne repose sur la couleur seule (pictogramme + libellé).
- Pixels de bord de la section Tatouages à 1280 px : avant (164, 53, 65) = rail corail ; après (246, 235, 232) = même teinte que la
  section Tenues voisine.

## 5. Sources consultées pour les médias (1er octobre 2026)

- https://www.rockstargames.com/VI/media/screenshots — section « Ultimate Edition Benefits » : « Stock 305 Clothing Store 01 à 04 »,
  « Sara's Unisex Salon 01 à 03 », « Electric Fang Tattoo 01 à 04 », « Goodtime Gear » (1 visuel). Originaux téléchargés :
  `ULTIMATE_EDITION_STOCK_305_02.0va5ldrhsejht.jpg` et `ULTIMATE_EDITION_GOODTIME_GEAR_01.0t7de8dow381q.jpg` (1 920 × 1 080),
  convertis en WebP 480 / 1 280 px (qualité 84), crédit « © Rockstar Games / Take-Two Interactive », URL d'origine conservée dans
  `outils/medias-officiels.json`. Médias promotionnels non libres de droits (règle du dépôt inchangée).
- Aucun prix, effet, lieu ou mécanique de jeu n'a été ajouté dans ce lot ; les données des catalogues (`outils/catalogues/*.json`)
  sont inchangées.

## 6. Limites et points ouverts

- Mesures de laboratoire (Chromium, serveur local, CPU ×4) ; Firefox, Safari et appareils réels non testés ici. La fiche paysage
  demande `<dialog>` (Chrome 37+, Firefox 98+, Safari 15.4+) ; en dessous, la boîte de la ligne s'ouvre. Les transformations sur
  `<tr>` (entrée verticale) sont ignorées par un vieux moteur : il reste le fondu.
- Les rails des bords de page restent visibles derrière les sections « papier » qui ne sont pas des listes (Rockstar, Collections,
  Pour toi) et sur les hubs : c'est leur dessin ; seul le cas des listes, signalé, est corrigé.
- `img/leonida-silhouette.svg` reste à supprimer sur GitHub (demandé en v7.55).
- Travail ChatGPT du lot 3 (rapport + archive) consulté pour comparaison, non appliqué : approche différente (contenu de fiche dupliqué
  dans la page, +63 à +159 Kio) ; sa découverte du visuel Goodtime Gear a été re-vérifiée à la source et refaite ici.
