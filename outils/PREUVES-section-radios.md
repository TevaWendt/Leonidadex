# Preuves — section « Radios et musique » (4 octobre 2026)

Base : zip main v7.65, régénéré tel quel (commit `72ef06c8` « base régénérée »). Changements :
`outils/CHANGEMENTS-section-radios.txt`.

## 1. Tests automatiques

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **715 tests, 715 réussis, 0 échec** (26 min ; 9 de plus qu’au départ, 706 : le test de la section) |
| après le retrait de l’ancienne traduction de la réponse « radio » des quatre fichiers de mémoire : `langues.test.cjs` et `section-radios.test.cjs` | 51 tests, 51 réussis |
| `node --test outils/tests/section-radios.test.cjs` | 9 tests, 9 réussis (dont l’absence des noms de stations des fuites, vérifiée par empreintes sans les écrire, dans les pages, Léo en cinq langues, la mémoire de traduction et les documents) |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (423 pages, 53 scripts traduits chacune) ; 0 conflit avec la mémoire et entre sections |
| `node outils/verifier.js` | aucune erreur : 237 454 références vérifiées dans 2 116 pages |
| `node outils/gen-leo.cjs --check` | à jour |
| `node outils/hubs-doublons.cjs` | aucune phrase du hub identique à une phrase des fiches |

## 2. Navigateur (Chromium)

| Contrôle | Résultat |
|---|---|
| `langues-pages-browser.cjs` (LK_PAGES = radios.html, radios/gta-vi-the-album.html, index.html), en, es, it, de, à 1 280 et 390 px | **28 contrôles passés, 0 échec** : aucune erreur JavaScript, aucune requête en échec, langue et barre de langue, aucun mot français visible (allemand : ni français ni anglais ; titres et artistes gardés tels quels, ligne de l’écran du poste marquée « ne pas traduire »), aucun défilement horizontal propre à la traduction |
| Pages françaises radios.html et radios/gta-vi-the-album.html à 1 280 et 390 px, mouvement normal et réduit | aucune erreur JavaScript, aucune requête en échec, aucun défilement horizontal ; avec « réduire les animations », rien ne bouge et tout reste lisible |
| Menu « Explorer » ouvert et pied de page, accueil français et allemand, à 1 280, 900 et 390 px | 12 vues : groupe « Jouer » / « Spiele » avec « Radios et musique » / « Radio und Musik », colonne du pied de page, aucun défilement horizontal |
| Captures relues | hub (poste : présélections, cadran, molette, écran qui défile, égaliseur, morceaux en cascade ; album ; zone éditoriale ; FAQ ; sources), fiche de l’album, mobile 390 px |

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
| section, `leo-questions-section-radios-<code>.json` | fr 12 / 12, en 11 / 11, es 11 / 11, it 11 / 11, de 11 / 11 |

Noyau `leo-index.json` : 318 218 octets (plafond 327 680).

Questions nouvelles essayées à la main :

| Question | Réponse |
|---|---|
| « quelles radios dans gta 6 ? » / « what radio stations are in gta 6 » / « qué radios hay en gta 6 » / « quali radio ci sono in gta 6 » / « welche radiosender gibt es in gta 6 » | sujet « radio » réécrit : aucune station annoncée, l’album et la promesse de Rockstar, sans nom tiré des fuites |
| « qui chante dans le trailer 1 ? », « who sings in trailer 2 » | sujet « musique-trailer » (Tom Petty, Pointer Sisters, Extended Look) |
| « y aura-t-il V-Rock ? » | sujet « radio » : aucune station annoncée |
| « quand sort l’album de gta 6 ? » | la date de sortie du jeu, le 19 novembre 2026 (c’est aussi celle de l’album) |

## 4. Référencement des pages nouvelles

10 pages (2 × 5 langues) : un seul h1, canonical, 6 liens hreflang, Open Graph, données structurées (CollectionPage,
FAQPage, BreadcrumbList), titre de 38 signes au plus, description de 155 signes au plus. Plan du site : `sitemap.xml`
2 000 adresses (400 × 5), `sitemap-fiches.xml` 1 825 adresses (365 × 5).

## 5. Ce qui change sur les pages existantes

Comparaison du texte de `<main>` des 424 pages françaises de la base : 1 page change, attendue — À propos (le nombre de
pages, recompté tout seul). Les 423 autres ne changent que par le menu et le pied de page (groupe « Jouer »).

## 6. Sources de la section (consultées le 4 octobre 2026)

22 sources, toutes listées avec leur date dans le LISEZ-MOI et en bas de radios.html. Officielles (9) : vidéos officielles,
Newswire de l’Extended Look et de l’album, annonces de l’album reprises par Music Business Worldwide, Billboard,
GameSpot (« la prochaine évolution de la radio en jeu »), Louder, GameSpot (Trailer 2), Dazed. Vu dans un média (8) : NME,
PC Gamer, Game Rant (minutages), SVG, Music Ally, Kotaku, GamingBolt, RockstarINTEL. Communautaires, citées comme telles (4) :
TechRadar (vinyle épuisé), Consequence, GTA Wiki (V-Rock), Postmode. À confirmer (1) : GameSpot (station de DJ Khaled,
rumeur). Aucune donnée tirée des fuites : aucun nom de station, aucun morceau qu’une seule source mêlant des fuites
aurait relevé. Les pages ont été relevées par moteur de recherche, leur ouverture directe étant bloquée depuis l’atelier.

## 7. Archive

`Leonidakit-section-radios-modifs.zip` : un seul fichier de 25 Mo (sous la limite de 30 Mo) : les 2 164 fichiers ajoutés ou
changés depuis le zip main, aucun supprimé. Vérifiée en l’appliquant sur une copie propre du zip main : le résultat est
identique au dépôt final, fichier par fichier, sans fichier en trop.
