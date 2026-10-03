# Preuves — v7.62 (langues : tout le site en anglais), 3 octobre 2026

Dépendances hors dépôt, comme en v7.61 : jsdom, postcss, parse5, acorn et playwright (`NODE_PATH`). Aucun `package.json`.

## 1. Tests automatisés

| Contrôle | Résultat |
|---|---|
| Suite Node (`node --test --test-concurrency=1 outils/tests/*.test.cjs`) | **686 / 686** (`langues.test.cjs` vérifie maintenant les 403 pages anglaises et les 403 espagnoles) |
| `node outils/langues.cjs en --verifier` | 0 texte sans traduction, 0 balise cassée, 0 conflit (403 pages, 50 scripts) |
| `node outils/langues.cjs es --verifier` | 0 texte sans traduction, 0 balise cassée, 0 conflit (403 pages, 53 scripts) |
| `node outils/verifier.js` | 0 erreur (132 094 références, 1 221 pages) |

## 2. Navigateur (Chromium, Playwright)

| Parcours | Résultat |
|---|---|
| `langues-pages-browser.cjs` | **les 403 pages anglaises et les 403 pages espagnoles** à 1 280 px : 0 erreur JavaScript, 0 requête en échec, langue et barre de langue justes, **aucun mot français visible** ; à 390 px : aucun débordement propre à la traduction |
| `langues-browser.cjs` | **1 225 / 1 225** : barre de langue de 360 à 1 440 px sur 13 pages anglaises et 13 espagnoles (fiches, carte, carnet, Progression, comparateur…), menu à trois langues, clavier, bandeaux, Léo absent en anglais et présent en espagnol ; calculateur anglais et espagnol : 9 outils × 3 modes × état rempli / vide, aucun mot français, montants de la langue, hub |
| Exploration anglaise (hors dépôt) | 12 pages (fiches, Vehicles, Armory, carte, carnets, Progress, Style, Consumables, Customization, Collectibles), 150 boutons, onglets, cases et listes cliqués, recherches tapées : aucun mot français, aucune erreur |
| `calculateurs-browser.cjs` (français) | 278 / 278 |
| `calculateurs-parcours-browser.cjs` | 161 / 161 |
| `calculateurs-lot-b-browser.cjs` | 140 / 140 |
| `calculateurs-v2-browser.cjs` | 142 / 142 |
| `carnets-browser.cjs` | 94 / 94 |
| `tuto-essayer-browser.cjs` | 22 / 22 |
| `contact-browser.cjs` | tenu |
| `leo-browser.cjs` | tenu |

## 3. Relecture de l’anglais

- 5 978 textes différents de 36 pages (accueil, Vehicles, Armory, carte, Places, Characters, Businesses, Residences,
  Safehouses, Style, Consumables, Customization, Shop, Housing, Boats, Collectibles, Media, Progress, Ranking, Rare
  vehicles, Comparison, fiches de véhicules, d’armes, de lieux, de personnages, d’entreprise, de demeure, de planque,
  carnets) relus par quatre relecteurs indépendants avec le glossaire : 99 défauts signalés, **99 corrigés** (dont un même
  objet nommé de deux façons selon l’endroit, ordre de mots, phrases calquées du français). Aucun mot français oublié,
  aucune erreur de format d’argent ou de ponctuation n’a été relevé.
- Contrôle automatique des termes traduits différemment seuls et dans une phrase : écarts gênants harmonisés (catégories,
  « View on the map », « Sidearm », « Customization », « The motel from Trailer 1 », « official images »).
- Le calculateur, le Tuto, À propos, Contact et Mentions anglais étaient déjà relus en v7.60.

## 4. Le français n’a pas changé

Comparaison des 418 pages françaises avec la v7.61, en retirant la barre de langue, les `hreflang` et les empreintes `?v=` :
417 identiques à l’octet ; 1 différente, comme prévu : `mentions-legales.html` (historique v7.62, date du 3 octobre).

## 5. Captures

Captures du Tuto anglais refaites (`python3 outils/tuto-shots.py . en`, `img/tuto/en/`).
