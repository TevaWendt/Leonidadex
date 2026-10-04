# Preuves — section « Activités annexes » (4 octobre 2026)

Base : zip main v7.65, régénéré tel quel (commit `72ef06c8` « base régénérée »). Changements :
`outils/CHANGEMENTS-section-activites.txt`.

## 1. Tests automatiques

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **716 tests, 716 réussis, 0 échec** (25 min ; 10 de plus qu’au départ, 706 : le test de la section) |
| `node --test outils/tests/section-activites.test.cjs` | 10 tests, 10 réussis |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (429 pages, 53 scripts traduits chacune) ; 0 conflit avec la mémoire et entre sections |
| `node outils/verifier.js` | aucune erreur : 241 776 références vérifiées dans 2 146 pages |
| `node outils/gen-leo.cjs --check` | à jour |
| `node outils/hubs-doublons.cjs` | aucune phrase du hub identique à une phrase des fiches |

## 2. Navigateur (Chromium)

| Contrôle | Résultat |
|---|---|
| `langues-pages-browser.cjs` (LK_PAGES = activites.html, les 7 fiches, index.html), en, es, it, de, à 1 280 et 390 px | **28 contrôles passés, 0 échec** : aucune erreur JavaScript, aucune requête en échec, langue et barre de langue, aucun mot français visible (allemand : ni français ni anglais), aucun défilement horizontal propre à la traduction |
| Pages françaises activites.html et activites/peche.html à 1 280 et 390 px | aucune erreur JavaScript, aucune requête en échec, aucun défilement horizontal |
| Menu « Explorer » ouvert et pied de page, accueil français et allemand, à 1 280, 900 et 390 px | 12 vues : groupe « Jouer » / « Spiele » avec « Activités annexes » / « Nebenaktivitäten », colonne du pied de page, aucun défilement horizontal |
| Captures relues | hub (sept fiches centrées, liste en trois familles et son filtre, « Ce que ça rapporte », zone éditoriale, FAQ, sources), fiche de la pêche (encart du calculateur, cases « Gain » et « Durée », sources), mobile 390 px |

## 3. Léo

| Jeu de questions | Résultat (départ v7.65 entre parenthèses) |
|---|---|
| français, 512 questions | 512 / 512 (512), hors sujet refusés 39 / 39, 0 réponse sans source |
| anglais | 511 / 512 (511) |
| espagnol | 512 / 512 (511) |
| italien | 512 / 512 (512) |
| allemand | 512 / 512 (512) |
| anglais, 140 questions inédites (mesure) | 112 / 140 (112) |
| allemand, 140 questions inédites (mesure) | 96 / 140 (96) |
| section, `leo-questions-section-activites-<code>.json` | fr 11 / 11, en 8 / 8, es 8 / 8, it 8 / 8, de 8 / 8 |

Noyau `leo-index.json` : 318 680 octets (plafond 327 680).

Questions nouvelles essayées à la main :

| Question | Réponse |
|---|---|
| « que faire dans gta 6 à part l’histoire ? », « what side activities are there » | question de la FAQ (la liste de Game Informer, lien vers la page) |
| « la pêche rapporte de l’argent ? », « peut-on aller pêcher ? », « se puede pescar en gta 6 », « kann man angeln in gta 6 » | question de la FAQ sur la pêche (Mount Kalaga, prises relâchées) |
| « où est la salle de sport ? » | fiche de la salle de sport, carte centrée sur l’Ajax Gym (repère des joueurs) |
| « où voler une voiture ? » | fiche du vol de voitures : aucune position validée sur la carte (exact) |
| « on peut faire du jet ski ? » | le sujet existant des bateaux (comme au départ) |

## 4. Référencement des pages nouvelles

40 pages (8 × 5 langues) : un seul h1, canonical, 6 liens hreflang, Open Graph, données structurées (CollectionPage,
FAQPage, BreadcrumbList), titre de 56 signes au plus, description de 157 signes au plus. Plan du site : `sitemap.xml`
2 030 adresses (406 × 5), `sitemap-fiches.xml` 1 855 adresses (371 × 5).

## 5. Ce qui change sur les pages existantes

Comparaison du texte de `<main>` des 424 pages françaises de la base : 1 page change, attendue — À propos (le nombre de
pages, recompté tout seul). Les 423 autres ne changent que par le menu et le pied de page (groupe « Jouer »).

## 6. Sources de la section (consultées le 4 octobre 2026)

31 sources, toutes listées avec leur date dans le LISEZ-MOI et en bas de activites.html. Officielles : site GTA VI (pages
des régions), vidéos et captures officielles, Newswire de l’Extended Look, fiche Microsoft Store de l’Édition Ultimate,
interview Famitsu de Rob Nelson, propos de Rob Nelson rapportés par la presse (Kotaku, GamesRadar+, Notebookcheck,
GameSpot, Beebom), dossier de Game Informer (22 sources). Vu dans un média (5) : GameSpot, GamesRadar+, Engadget, Game
Informer et GTA Wiki sur les vidéos. Communautaire, citée comme telle : gtadb.org (carte des joueurs). À confirmer (3) :
TweakTown, GTABase, RockstarINTEL. Les pages ont été
relevées par moteur de recherche, leur ouverture directe étant bloquée depuis l’atelier ce jour-là. Aucune donnée tirée
des fuites.

## 7. Archive

`Leonidakit-section-activites-modifs.zip` : un seul fichier de 25 Mo (sous la limite de 30 Mo) : les 2 191 fichiers ajoutés ou
changés depuis le zip main, aucun supprimé. Vérifiée en l’appliquant sur une copie propre du zip main : le résultat est
identique au dépôt final, fichier par fichier, sans fichier en trop.
