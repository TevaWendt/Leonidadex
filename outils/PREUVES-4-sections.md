# Preuves — les quatre sections réunies (4 octobre 2026)

Base : zip main v7.65, régénéré tel quel (commit `72ef06c8` « base régénérée »). Sections réunies : Missions, Activités
annexes, Radios et musique, Animaux (preuves de chacune : `outils/PREUVES-section-<id>.md`). Ce qui a été réuni :
`LISEZ-MOI-4-sections.txt`.

## 1. Tests automatiques (après régénération complète de l’ensemble)

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **743 tests, 743 réussis, 0 échec** (17 min ; 37 de plus qu’au départ, 706 : les tests des quatre sections) |
| tests des sections (`section-missions`, `section-activites`, `section-radios`, `section-animaux`) | 10 / 10, 10 / 10, 9 / 9, 8 / 8 |
| après le retrait de l’ancienne traduction de la réponse « radio » (mémoire de traduction) : `langues.test.cjs` et `section-radios.test.cjs` | 51 tests, 51 réussis |
| empreintes des noms de stations venus des fuites, sur tous les fichiers texte du dépôt réuni (3 554) | aucune |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (441 pages, 53 scripts traduits chacune) ; 0 conflit entre les fichiers de traduction des sections |
| `node outils/verifier.js` | aucune erreur : 262 804 références vérifiées dans 2 206 pages |
| `node outils/gen-leo.cjs --check` | à jour |
| `node outils/hubs-doublons.cjs` | aucune phrase d’un hub identique à une phrase de ses fiches |

## 2. Navigateur (Chromium)

| Contrôle | Résultat |
|---|---|
| `langues-pages-browser.cjs` sur les 20 pages nouvelles, la fiche de Grassrivers, l’accueil et À propos, en, es, it, de, à 1 280 et 390 px | **28 contrôles passés, 0 échec** : aucune erreur JavaScript, aucune requête en échec, aucun mot français visible (allemand : ni français ni anglais), aucun défilement horizontal propre à la traduction |
| Menu « Explorer » ouvert et pied de page, accueil français et allemand, à 1 280, 900 et 390 px | 12 vues : « Jouer » / « Spiele » avec Missions, Activités annexes, Radios et musique ; « Animaux » / « Tiere » dans « Le monde » entre Entreprises et Collectibles ; colonnes du pied de page ; aucun défilement horizontal |

## 3. Léo (index réunissant les quatre sections)

| Jeu de questions | Résultat (départ v7.65 entre parenthèses) |
|---|---|
| français, 512 questions | 512 / 512 (512), hors sujet refusés 39 / 39, 0 réponse sans source |
| anglais | 511 / 512 (511) |
| espagnol | 512 / 512 (511) |
| italien | 512 / 512 (512) |
| allemand | 512 / 512 (512) |
| anglais, 140 questions inédites (mesure) | 112 / 140 (112) |
| allemand, 140 questions inédites (mesure) | 97 / 140 (96) |
| questions des sections, dans les cinq langues | Missions 11 + 4 × 10, Activités annexes 11 + 4 × 8, Radios et musique 12 + 4 × 11, Animaux 9 + 4 × 5 : toutes justes |

Noyau `leo-index.json` : 323 315 octets (plafond 327 680).

## 4. Référencement des pages nouvelles

100 pages (20 × 5 langues) : un seul h1, canonical, 6 liens hreflang (sauf la démonstration de fiche de mission, en
noindex), Open Graph, données structurées (CollectionPage, FAQPage, BreadcrumbList), titre de 56 signes au plus,
description de 158 signes au plus. Plan du site : `sitemap.xml` 2 085 adresses (417 × 5), `sitemap-fiches.xml` 1 895
adresses (379 × 5).

## 5. Ce qui change sur les pages existantes

Comparaison du texte de `<main>` des 424 pages françaises de la base : 6 pages changent, toutes attendues — À propos (le
nombre de pages, recompté tout seul), Médias (« Utilisé sur » cite les fiches d’animaux qui reprennent des visuels
officiels), et quatre fiches de régions qui gagnent le groupe « Animaux » dans « En lien » (Grassrivers, Leonida Keys,
Mount Kalaga National Park, Vice City). Les 418 autres ne changent que par le menu et le pied de page.

## 6. Archive

`Leonidakit-4-sections-modifs.zip` : un seul fichier de 27 Mo (sous la limite de 30 Mo) : les 2 347 fichiers ajoutés ou changés
depuis le zip main, aucun supprimé. Vérifiée en l’appliquant sur une copie propre du zip main : le résultat est identique
au dépôt final, fichier par fichier, sans fichier en trop.
