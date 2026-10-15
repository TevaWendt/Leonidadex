# Matrice du lot 6 (v7.90) — jeu « Devine le lieu »

Base v7.87 (210850a). Chaque exigence du lot et de la charte qualité, la page concernée, ce qui a été fait et la preuve.
État : ✅ tenu et vérifié · ➖ sans objet pour ce lot (dit pourquoi). Journaux des contrôles : § 10.
Pages touchées : `devine-le-lieu.html` (nouvelle, cinq langues), `lieux.html` (encart), `lieux/*.html` (six fiches des
régions : un lien), `mentions-legales.html` (stockage, historique), `a-propos.html` (compteurs), menu et pied de page de
toutes les pages (source préparée, régénérée par l'assemblage).

## A. Le lot 6

| # | Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|---|
| A1 | Seules les images dont la région est établie par Rockstar (séries nommées par région, champ `source` vérifié) | jeu | 40 images des six séries de la page des captures de Rockstar (`outils/devine/devine.json` → `series`, `images`) ; `gen-devine.cjs` refuse une image hors de sa série (identifiant, fichier d'origine), d'une autre source, sans crédit, sans fichiers 480 / 1 280, ou une image de la série oubliée | `v790.test.cjs` tests 1 et 2 (refus provoqués : région, texte alternatif, source, image manquante) ; sortie de la génération | ✅ |
| A2 | Jamais de position précise inventée : on devine une région | jeu | Six repères, un par région, placés sur le repère de la carte interactive (`monde-cartes.cjs`, `carte-vignette.cjs`) ; texte « on devine une région, jamais un point précis » ; fond de carte dit communautaire | test 8 ; captures | ✅ |
| A3 | Les six régions et leurs fiches | jeu, Lieux | Les six régions de `lieux.html` (aucune autre région confirmée n'a d'images) ; chaque réponse et chaque ligne du résultat mène à la fiche | tests 7, 9, 10 ; navigateur : liens du résultat vers `lieux/*.html` | ✅ |
| A4 | Images créditées « Rockstar Games », textes alternatifs justes sans donner la réponse | jeu | Crédit sous l'image et dans la section des sources ; 40 textes alternatifs écrits pour le jeu, sans nom de lieu (contrôlé à la génération et dans les traductions) | génération (`le texte alternatif donne la réponse`) ; contrôle des traductions ; test 1 | ✅ |
| A5 | Page générée par `outils/gen-devine.cjs` branché dans `outils/regenerer.cjs`, données `outils/devine/…json`, `devine.js`, `devine.css`, charte des pages récentes | jeu | Générateur, données, script et feuille à part ; briques communes (`sections.cjs`, `lk-sections`, sous-navigation, puces) ; branché après `gen-actus.cjs` | test 8 ; `regenerer.cjs` | ✅ |
| A6 | Partie du jour : cinq images d'après la date de Paris, les mêmes pour tous, sans doublon ; partie libre ensuite | jeu | Tirage déterministe (FNV-1a + mulberry32) par cycles de 8 jours, ≤ 2 par région, rien de la veille ; date et minuit de Paris ; partie libre sans limite | tests 3 et 4 (trois ans de tirages, changements d'heure) ; vérification à chaque génération ; navigateur | ✅ |
| A7 | Boutons accessibles au clavier et carte aux régions cliquables | jeu | Six boutons (Entrée / Espace), six repères (cibles 44 px, `tabindex=-1` : les boutons portent le clavier, les repères doublent à la souris et au doigt) | navigateur : 2 réponses au clavier, 1 sur la carte, 2 aux boutons, fr/de, 390/1 280 | ✅ |
| A8 | Réponse : bonne région, titre officiel, source, lien vers la fiche | jeu | Région allumée sur la carte, verdict sur l'image, ce que montre l'image, titre officiel, légende, crédit Rockstar Games, lien « La fiche de … » | test 7 ; navigateur | ✅ |
| A9 | Score, série, meilleur score en `localStorage` (`lk_devine_v1`, versionnée), rien d'autre gardé ni envoyé | jeu, Mentions | `{ v: 1, jour, serie, best }` validé à la lecture, écrit à la première réponse ; aucune requête | tests 5, 7, 8 ; navigateur : une seule clé, écrite à la première réponse, aucune requête extérieure | ✅ |
| A10 | Partage en texte (une ligne par image ✅ / ❌, numéro du jour, adresse) par l'API de partage ou en copie | jeu | `navigator.share` (annulation ignorée) sinon copie ; bouton « Copier » ; adresse de la page de la langue | test 6 ; navigateur : texte et presse-papiers | ✅ |
| A11 | Sans script : règles, liste des régions avec liens | jeu | Message, quatre étapes des règles, six régions et leurs fiches, sources, questions | navigateur (contexte sans JavaScript) ; test 8 | ✅ |
| A12 | « Réduire les animations » ; chaque étape annoncée (`aria-live`) | jeu | Bloc `prefers-reduced-motion` de `devine.css` ; annonces : image, réponse, fin, partie déjà jouée, partie libre | navigateur : aucune animation en cours après une réponse ni sur l'image suivante ; annonces vérifiées à chaque étape | ✅ |
| A13 | Liens : menu « Jouer » et pied de page (préparés pour l'assemblage), Lieux, recherche, plan du site, Léo, données structurées simples | tout le site | `site-shell.cjs` ; encart de `lieux.html` et lien des fiches (`lore-gen.js`) ; `devine-index.json` → `search-index.js` ; `sitemap.xml` ; Léo (§ 8) ; WebPage + BreadcrumbList + FAQPage, aucun avis ni note | test 10 ; vérificateur de liens | ✅ |
| A14 | Traductions dans les quatre langues | jeu et pages touchées | `outils/langues/*/v790.json` (177 textes par langue), relus | extraction : 0 texte sans traduction ; `langues.test.cjs` ; test 9 (partie en allemand) | ✅ |
| A15 | Tests `v790.test.cjs` et contrôle navigateur (clavier et souris, 390 et 1 280, français et allemand) | — | 11 tests Node ; `v790-browser.cjs` | `v790.test.cjs` 11/11 ; navigateur 143/143 | ✅ |
| A16 | Ne toucher qu'au lot, fichiers à soi, archive pour l'assemblage | — | Ajouts dans des fichiers propres ; sources partagées modifiées à la marge (diff dans `outils/assemblage/lot6-devine.diff`) ; archive sans les pages qui ne changent que par le menu | liste de l'archive ; vérification base + archive + fin de chaîne = travail | ✅ |

## B. Charte qualité

### 1. L'esprit
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Du tac au tac : l'essentiel d'abord, le détail se déplie | jeu | Le jeu dans le premier écran (en-tête compact) ; règles, images et questions plus bas, questions repliables | captures 390 / 768 / 1 280 | ✅ |
| Site moderne dans la charte, pas « PowerPoint » | jeu | Jeu en deux colonnes, paquet de cartes, carte du site ; sections du moteur commun alternées papier / papier 2 / nuit | captures | ✅ |
| Contenu propre et sourcé, texte unique | jeu | Règles, provenance des images avec source datée, questions propres à la page | test 8 ; captures | ✅ |
| Rien d'inutile, pas de doublon ; même fonction, même nom | jeu | Un seul jeu, une seule clé ; « Partager » et « Copier » distincts ; donnée inutilisée retirée (`liens.fiche`) | relecture | ✅ |
| « Tu », phrases courtes, sans jargon ni superlatif | jeu, 5 langues | Textes courts ; glossaires des langues | relecture ; relecteur des traductions | ✅ |

### 2. Identité visuelle
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Jetons de `style.css` seulement | jeu | `devine.css` : couleurs et ombres par jetons (`color-mix` sur `--amber` / `--paper` pour les transparences) | `grep` : aucune couleur écrite à la main dans `devine.css` | ✅ |
| Archivo hébergée sur le site, mouvement de `motion-tokens.css` | jeu | Police du site ; durées et courbes des jetons (`--c-fast`, `--c-standard`, `--c-ease-*`) | page : `/fonts/archivo-latin.woff2` | ✅ |
| Gabarit : pile d'images, sections du moteur commun, sous-navigation collante, encart calculateur et puces | jeu | Sections `sections.cjs`, sous-navigation `ed-nav`, puces « Explorer ». Pas de pile d'images en en-tête : toute capture rangée par région est une réponse du jeu ; pas d'encart calculateur : sans rapport avec la page | captures ; test 8 | ✅ (deux briques écartées, raison dite) |
| Marges : contenu ≤ 1 400 px, mêmes bords | jeu | `shell` et sections du moteur | rapport des écrans : 24 « coquilles », toutes connues, identiques à la base, aucune sur les pages du lot | ✅ |
| Visuels officiels crédités, WebP 480 / 1 280 avec `srcset` | jeu | Images de `img/officiel/` (480 / 800 / 1 280), crédit Rockstar Games | génération (fichiers présents) ; test 8 | ✅ |

### 3. Mouvement et effets
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Un seul moteur (`LKMotion`) pour les apparitions | jeu | Sections en `.reveal` (common.js) ; le jeu n'utilise que des transitions CSS déclenchées par classes | relecture de `devine.js` (aucun observateur) | ✅ |
| Apparitions 10-12 px, cascade 35-60 ms plafonnée à 300 ms | jeu | Moteur commun | captures de défilement | ✅ |
| Survols : boutons réactifs, une carte lue ne bouge pas | jeu | Boutons des régions : ombre ; image et cartes du résultat immobiles | captures | ✅ |
| Un moment orchestré par page | jeu | La distribution de l'image (paquet), le verdict qui monte, le trait sur la carte, l'anneau de la bonne région | suites de captures début / milieu / fin | ✅ |
| `prefers-reduced-motion`, sans script tout visible, aucun faux délai | jeu | Bloc dédié ; sans script : contenu complet | navigateur (réduit, sans JavaScript) ; captures « rm » | ✅ |

### 4. Mise en page et alignement
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| 16 largeurs et 5 langues : aucun débordement, rien de rogné, aucun texte < 11 px | jeu, Lieux, fiches, Mentions | Grilles 3 → 2 → 1, libellés de la carte placés pour ne pas sortir (Port Gellhorn dessous, Grassrivers à gauche) | écrans 62 pages × 16 largeurs : 0 débordement, rapport identique à la base ligne à ligne ; allemand 59 × 5 : identique ; navigateur : aucun défilement horizontal à chaque étape | ✅ |
| Grilles alignées | jeu | Boutons de même hauteur ; résultat en 5 colonnes, rangées sous 900 px ; vignettes au même ratio | captures | ✅ |
| Cibles ≥ 24 px (44 sur téléphone) | jeu | Boutons des régions ≥ 44 px de haut ; repères de la carte 44 px | captures ; audit | ✅ |

### 5. Latence
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Mesure avant / après (390 px, 4G lente, CPU ×4, froid / chaud) sans régression | Lieux, fiche, Mentions, accueil, jeu | `outils/tests/v790-latence.cjs` | Médianes de 6 tours en alternance (10 pour les Mentions) : écarts de l'ordre de 2 % dans les deux sens, comme sur les pages témoins inchangées (Radios, Actualités) ; + 96 octets par page (menu) ; détail dans `outils/CHANGEMENTS-v7.90.txt` | ✅ |
| Rien de bloquant ; scripts non urgents tard ; images différées, première en priorité, tailles explicites | jeu | `devine.js` en fin de page, après le contenu (comme `radios.js`) ; images du jeu dans des `<template>` (aucune chargée avant d'être montrée) ; image suivante préchargée pendant la réponse ; `width` / `height` | relecture ; mesure | ✅ |
| Une page nouvelle pas plus lente que les pages de même type | jeu | Comparée à `radios.html` et `actus.html` | Premier rendu 3 600 ms (Radios 4 836, Actualités 3 788), DOMContentLoaded 3 922 (5 283, 4 204), processeur 2 186 (2 883, 2 401), plus grand élément 4 192 (4 836, 3 788 : un titre) | ✅ |

### 6. Référencement
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Titre avec « GTA 6 », description ≤ 155 unique par langue, un `h1`, canonique, hreflang ×5 + x-default, og / twitter, `max-image-preview:large` | jeu | Titre « Devine le lieu : le jeu du jour sur la carte de GTA 6 » ; descriptions 135-151 signes | test 8 ; audit | ✅ |
| Données structurées justes (BreadcrumbList, WebPage, FAQPage), aucun avis | jeu | Depuis le contenu visible | test 8 | ✅ |
| Plan du site, date réelle | jeu | `sitemap.xml`, `outils/sitemap-dates.json` | test 10 | ✅ |
| Maillage interne, aucun lien mort | tout | Menu, pied, Lieux, fiches, recherche, Léo | `verifier.js` : 340 952 références, 0 erreur | ✅ |

### 7. Accessibilité
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Clavier, focus visible, lien d'évitement, ordre logique | jeu | Focus déplacé sur « Image suivante » puis sur les régions ; résultat focalisé | navigateur | ✅ |
| Noms accessibles, `aria-live` | jeu | Boutons nommés ; région d'annonces | test 8 ; navigateur | ✅ |
| Contrastes AA | jeu | Jetons ; liens ambre sur la section nuit | audit : 0 contraste insuffisant sur 11 545 | ✅ |
| Textes alternatifs justes | jeu | Ce qu'on voit, « capture officielle de GTA VI », sans la réponse | génération ; traductions | ✅ |
| Aucune information par la seule couleur ; `lang` juste | jeu | ✓ / ✗ et texte ; `lang` de chaque langue | navigateur ; test 8 | ✅ |

### 8. Contenu, données et confidentialité
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Rien d'inventé, source datée, aucune fuite | jeu | Régions de Rockstar, page des captures consultée le 12/10/2026 ; FAQ « rien des fuites » | test 1 ; génération | ✅ |
| Aucun cookie, aucune ressource d'un autre site, stockage `lk…`, flux décrit dans les Mentions avant d'exister | jeu, Mentions | Une clé `lk_devine_v1` ; Mentions : liste du stockage et historique | audit des cookies : 17 pages, 0 cookie ; preuve de confidentialité : affirmations tenues ; navigateur | ✅ |
| Léo connaît la page dans toutes les langues | Léo | Deux sujets, suggestions, ponts des langues | test 11 : 7/7 questions dans chaque langue | ✅ |

### 9. Langues
| Exigence | Page | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Cinq langues au même niveau, typographie et glossaires | jeu et pages touchées | 177 textes par langue, relus ; nombres et pluriels par `Intl` | extraction 0 ; `langues.test.cjs` 42/42 ; navigateur : pages des langues 28/28, langues 2 267/2 267 ; test 9 | ✅ |

### 10. Preuves avant livraison
| Preuve | Résultat | État |
|---|---|---|
| Contrôles automatiques du socle | Suite Node 1 069 tests (4 échecs de la base dus à `api/ia-achat.js`, retiré : 23/23), langues 42/42, vérificateur 0 erreur, confidentialité tenue, pages des langues 28/28, langues 2 267/2 267, écrans, audit (0 erreur, 0 contraste, 12/12), cookies 0 ; jeu 11/11 et 143/143 | ✅ |
| Rapports d'écrans identiques ou meilleurs que la base | Identiques ligne à ligne (16 largeurs et allemand) ; la page nouvelle n'ajoute aucun signalement | ✅ |
| Latence avant / après | Aucune régression au-delà du bruit de mesure (± 2 %, mêmes écarts sur les pages témoins) ; page nouvelle au niveau des pages de même type | ✅ |
| Captures 390 / 768 / 1 280, français et allemand, regardées une à une | Jeu (premier écran, réponse, résultat, chaque section de la page), encart de Lieux, en-tête d'une fiche de région, Mentions : rien de rogné ni de débordant ; les pages entières capturées d'un bloc laissent des sections blanches (elles sont en `content-visibility:auto`, peintes à l'arrivée à l'écran) : vérifiées section par section | ✅ |
| Suites d'animation et « réduire les animations » | Réponse (début, milieu, fin : verdict, trait sur la carte, panneau) et image suivante (l'ancienne s'efface, la nouvelle est distribuée) ; en « réduire les animations », la réponse est posée d'un coup et l'image suivante remplace l'ancienne sur place | ✅ |
