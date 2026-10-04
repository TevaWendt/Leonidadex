# Preuves — section « Animaux » (4 octobre 2026)

Base : zip main v7.65, régénéré tel quel (commit `72ef06c8` « base régénérée »). Changements :
`outils/CHANGEMENTS-section-animaux.txt`.

## 1. Tests automatiques

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **714 tests, 714 réussis, 0 échec** (26 min ; 8 de plus qu’au départ, 706 : le test de la section) |
| `node --test outils/tests/section-animaux.test.cjs` | 8 tests, 8 réussis |
| `node --test outils/tests/hubs-monde-v741.test.cjs` | 12 tests, 12 réussis (la zone de animaux.html est contrôlée comme celle des autres hubs du monde : 500 à 800 mots, sources, questions ouvertes, actions, FAQ) |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (429 pages, 53 scripts traduits chacune) ; 0 conflit avec la mémoire et entre sections |
| `node outils/verifier.js` | aucune erreur : 241 051 références vérifiées dans 2 146 pages |
| `node outils/gen-leo.cjs --check` | à jour |
| `node outils/hubs-doublons.cjs` | aucune phrase du hub identique à une phrase des fiches |

## 2. Navigateur (Chromium)

| Contrôle | Résultat |
|---|---|
| `langues-pages-browser.cjs` (LK_PAGES = animaux.html, les 7 fiches, lieux/grassrivers.html, index.html), en, es, it, de, à 1 280 et 390 px | **28 contrôles passés, 0 échec** : aucune erreur JavaScript, aucune requête en échec, langue et barre de langue, aucun mot français visible (allemand : ni français ni anglais), aucun défilement horizontal propre à la traduction |
| Pages françaises animaux.html et animaux/alligator.html à 1 280 et 390 px | aucune erreur JavaScript, aucune requête en échec, aucun défilement horizontal |
| Menu « Explorer » ouvert et pied de page, accueil français et allemand, à 1 280, 900 et 390 px | 12 vues : « Animaux » / « Tiere » dans « Le monde », entre Entreprises et Collectibles ; colonne « Explorer » du pied de page ; aucun défilement horizontal |
| Captures relues | hub (grille de sept fiches, zone éditoriale, encart du calculateur, FAQ, sources), fiche de l’alligator (gros plan crédité, « Statut et sources », visuels), « En lien » de Grassrivers, mobile 390 px |

## 3. Léo

| Jeu de questions | Résultat (départ v7.65 entre parenthèses) |
|---|---|
| français, 512 questions | 512 / 512 (512), hors sujet refusés 39 / 39, 0 réponse sans source |
| anglais | 511 / 512 (511) |
| espagnol | 511 / 512 (511) |
| italien | 512 / 512 (512) |
| allemand | 512 / 512 (512) |
| anglais, 140 questions inédites (mesure) | 112 / 140 (112) |
| allemand, 140 questions inédites (mesure) | 96 / 140 (96) |
| section, `leo-questions-section-animaux-<code>.json` | fr 9 / 9, en 5 / 5, es 5 / 5, it 5 / 5, de 5 / 5 |

Noyau `leo-index.json` : 318 145 octets (plafond 327 680).

Questions nouvelles essayées à la main :

| Question | Réponse |
|---|---|
| « quels animaux dans gta 6 ? », « hay perros en gta 6 » | sujet « animaux » réécrit (plus de 170 espèces, Michael Kane, lien vers la page) |
| « où voir des alligators ? », « are there alligators in gta 6 » | question de la FAQ (Grassrivers, texte officiel de la région) |
| « y a-t-il des dauphins ? », « ci sono delfini in gta 6 » | question de la FAQ sur la faune marine, ou la fiche Faune marine |
| « peut-on chasser le cerf ? » | question de la FAQ sur la chasse : aucun gibier nommé par Rockstar |
| « c’est quoi l’iguane vert ? », « raccoon gta 6 », « gibt es waschbären in gta 6 » | la fiche concernée (Iguane vert ; Puma, raton laveur et mammifères sauvages) |

## 4. Référencement des pages nouvelles

40 pages (8 × 5 langues) : un seul h1, canonical, 6 liens hreflang, Open Graph, données structurées (CollectionPage,
FAQPage, BreadcrumbList), titre de 49 signes au plus, description de 158 signes au plus. Plan du site : `sitemap.xml`
2 030 adresses (406 × 5), `sitemap-fiches.xml` 1 855 adresses (371 × 5).

## 5. Ce qui change sur les pages existantes

Comparaison du texte de `<main>` des 424 pages françaises de la base : 6 pages changent, toutes attendues — À propos (le
nombre de pages, recompté tout seul), Médias (« Utilisé sur » cite les fiches d’animaux qui reprennent des visuels
officiels), et quatre fiches de régions qui gagnent le groupe « Animaux » dans « En lien » (Grassrivers, Leonida Keys,
Mount Kalaga National Park, Vice City). Les 418 autres ne changent que par le menu et le pied de page.

## 6. Sources de la section (consultées le 4 octobre 2026)

14 sources, toutes listées avec leur date dans le LISEZ-MOI et en bas de animaux.html. Officielles : pages des régions
Grassrivers et Mount Kalaga, site GTA VI, captures et vidéos officielles, Newswire de l’Extended Look, fiche Microsoft Store
de l’Édition Ultimate, propos de Michael Kane (Game Informer, repris par Insider Gaming et Beebom) et de Rob Nelson
(GameSpot). Vu dans un média : TheWrap, Engadget. Communautaires, citées comme telles : GTABase, GTA Intel. Nouvelles
pages relevées le 4 octobre 2026 par moteur de recherche, leur ouverture directe étant bloquée depuis l’atelier ; les
pages déjà citées par le site gardent leur date. Aucune donnée tirée des fuites.

## 7. Archive

`Leonidakit-section-animaux-modifs.zip` : un seul fichier de 25 Mo (sous la limite de 30 Mo) : les 2 174 fichiers ajoutés ou
changés depuis le zip main, aucun supprimé. Vérifiée en l’appliquant sur une copie propre du zip main : le résultat est
identique au dépôt final, fichier par fichier, sans fichier en trop.
