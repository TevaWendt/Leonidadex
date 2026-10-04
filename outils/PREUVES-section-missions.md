# Preuves — section « Missions » (4 octobre 2026)

Base : zip main v7.65, régénéré tel quel (commit `72ef06c8` « base régénérée »). Changements :
`outils/CHANGEMENTS-section-missions.txt`.

## 1. Tests automatiques

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **716 tests, 716 réussis, 0 échec** (26 min ; 10 de plus qu’au départ, 706 : le test de la section) |
| `node --test outils/tests/section-missions.test.cjs` | 10 tests, 10 réussis |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (423 pages, 53 scripts traduits chacune) ; 0 conflit avec la mémoire et entre sections |
| `node outils/verifier.js` | aucune erreur : 237 485 références vérifiées dans 2 116 pages |
| `node outils/gen-leo.cjs --check` | à jour |
| `node outils/hubs-doublons.cjs` | aucune phrase du hub identique à une phrase des fiches |

## 2. Navigateur (Chromium)

| Contrôle | Résultat |
|---|---|
| `langues-pages-browser.cjs` (LK_PAGES = missions.html, missions/modele.html, index.html, a-propos.html), en, es, it, de, à 1 280 et 390 px | **28 contrôles passés, 0 échec** : aucune erreur JavaScript, aucune requête en échec, langue et barre de langue, aucun mot français visible (allemand : ni français ni anglais), aucun défilement horizontal propre à la traduction |
| Pages françaises missions.html et missions/modele.html à 1 280 et 390 px | 4 vues : aucune erreur JavaScript, aucune requête en échec, aucun défilement horizontal |
| Menu « Explorer » ouvert et pied de page, accueil français et allemand, à 1 280, 900 et 390 px | 12 vues : groupe « Jouer » / « Spiele » avec « Missions » / « Missionen », colonne du pied de page, aucun défilement horizontal |
| Captures relues | hub (histoire, quatre mécaniques, huit séquences, dont trois avec leur photogramme officiel, deux contenus de l’Édition Ultimate, guide vide, zone éditoriale, FAQ, sources), démonstration de fiche, mobile 390 px |

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
| section, `leo-questions-section-missions-<code>.json` | fr 11 / 11, en 10 / 10, es 10 / 10, it 10 / 10, de 10 / 10 |

Noyau `leo-index.json` : 317 334 octets (plafond 327 680).

Questions nouvelles essayées à la main :

| Question | Réponse |
|---|---|
| « combien de missions dans gta 6 ? » / « how many missions does gta 6 have » / « cuántas misiones tiene gta 6 » / « quante missioni ha gta 6 » / « wie viele missionen hat gta 6 » | question de la FAQ (nombre non publié, histoire en chapitres, 80 heures de Rob Nelson), dans les cinq langues |
| « où trouver la solution des missions ? », « c’est quoi la première mission de gta 6 ? » | même réponse, avec le lien vers la page |
| « comment débloquer une mission ? », « mission bloquée gta 6 » | question de la FAQ (l’argent gagné en dehors des missions) |
| « les missions de gta 6 sont-elles longues ? » | le calculateur « Mes activités » (comme au départ) : limite connue |

## 4. Référencement des pages nouvelles

10 pages (2 × 5 langues) : un seul h1, canonical, 6 liens hreflang (sauf la démonstration, en noindex), Open Graph,
données structurées (CollectionPage, FAQPage, BreadcrumbList), titre de 41 signes au plus, description de 151 signes au
plus. Plan du site : `sitemap.xml` 1 995 adresses (399 × 5), `sitemap-fiches.xml` 1 820 adresses (la démonstration n’y est
pas).

## 5. Ce qui change sur les pages existantes

Comparaison du texte de `<main>` des 424 pages françaises de la base : 1 page change, attendue — À propos (423 pages au
lieu de 421, recompté tout seul). Les 423 autres ne changent que par le menu et le pied de page (groupe « Jouer »).

## 6. Sources de la section (consultées le 4 octobre 2026)

21 sources, toutes listées avec leur date dans le LISEZ-MOI et en bas de missions.html. Officielles : site GTA VI, vidéos
officielles, Newswire de l’Extended Look, fiche Microsoft Store de l’Édition Ultimate, interview Famitsu de Rob Nelson
(traduction GTAVice.net), propos rapportés par Notebookcheck, GamesRadar+, PC Gamer, Dazed, SVG, GamingBible. Vu dans un
média : GameSpot, Insider Gaming, Engadget, GTA Wiki. Communautaires, citées comme telles : GamesRadar+ (bracelet de Lucia),
GTABase. À confirmer : TweakTown. Les pages ont été relevées par moteur de recherche, leur ouverture directe étant
bloquée depuis l’atelier ce jour-là. Aucune donnée tirée des fuites.

## 7. Archive

`Leonidakit-section-missions-modifs.zip` : un seul fichier de 25 Mo (sous la limite de 30 Mo) : les 2 166 fichiers ajoutés ou
changés depuis le zip main, aucun supprimé. Vérifiée en l’appliquant sur une copie propre du zip main : le résultat est
identique au dépôt final, fichier par fichier, sans fichier en trop.
