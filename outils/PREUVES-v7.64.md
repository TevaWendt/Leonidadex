# Preuves v7.64 — cinq langues réunies, Léo dans les cinq, référencement (3 octobre 2026)

Base : v7.60 (archive Leonidadex-main (13)) + série A (v7.61 espagnol, v7.62 anglais, v7.63 italien) + série B (v7.61 « tout
en anglais », v7.62 allemand). Changements : `outils/CHANGEMENTS-v7.64.txt` ; procédure : `outils/LANGUES.md`.

## 1. Tests automatiques

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **705 tests, 705 réussis, 0 échec** (37 min) |
| dont `langues.test.cjs` | 45 tests, 0 échec (quatre langues : dossier à jour, hreflang, aucun français visible — allemand : ni français ni anglais —, scripts, contact, badge FR, Tuto ; calculateurs anglais, espagnol, italien, allemand dans jsdom ; page introuvable de chaque langue ; Léo dans les cinq langues ; bandeau et `lk_lang_v1`) |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (414 pages, 53 scripts traduits chacune) |
| `node outils/tests/langues-pages-browser.cjs` (Chromium, chaque langue) | en, es, it, de : **7 contrôles passés, 0 échec** chacune — 404 pages par langue (les 10 redirections sont contrôlées par `langues.test.cjs`) à 1 280 px et 390 px : aucune erreur JavaScript, aucune requête en échec, `lang` et barre de langue, aucun mot français visible (allemand : ni français ni anglais), aucun défilement horizontal propre à la traduction |
| `node outils/tests/langues-browser.cjs` (Chromium) | **2 267 contrôles passés, 0 échec** : barre de langue de 360 à 1 440 px, bandeaux (anglais, espagnol, italien, allemand), chaque outil du calculateur dans chaque mode et chaque langue (aucun mot étranger, montants et nombres de la langue, questions du hub) |
| `node outils/gen-leo.cjs --check` | à jour |

## 2. Léo

| Jeu de questions | Résultat |
|---|---|
| français (`leo-questions.json`) | 512 / 512, hors sujet refusés 39 / 39, 0 réponse sans source |
| espagnol (`--langue es`) | 511 / 512 (« ¿el combustible es una mecánica del juego? » mène au bon passage de la page Véhicules, section Carburant et entretien, au lieu de la fiche sujet) |
| italien (`--langue it`) | 512 / 512 |
| anglais (`--langue en`) | **511 / 512** (série B : 501 / 512) — 18 expressions ajoutées à `outils/langues/en/leo-pivot.json` ; reste « split my 200k budget » (ordre des mots : Léo demande si 200 000 $ est ce que tu as ou ce que tu veux) |
| allemand (`--langue de`) | 512 / 512 |
| anglais, 140 questions inédites (mesure, pas un seuil) | 112 / 140 (série B : 111 / 140) |
| allemand, 140 questions inédites (mesure) | 96 / 140 (série B : 96 / 140) |

## 3. Référencement : audit de chaque page de chaque langue

Lecture de toutes les pages (`/`, `/en/`, `/es/`, `/it/`, `/de/` : 414 pages chacune, dont 391 indexables) :

| | fr | en | es | it | de |
|---|---|---|---|---|---|
| pages indexables avec titre, description, un seul h1, canonical, Open Graph, `twitter:card`, JSON-LD lisible, `alt` sur chaque image | 391 / 391 | 391 / 391 | 391 / 391 | 391 / 391 | 391 / 391 |
| titres en « GTA 6 » | 383 | 383 | 383 | 383 | 379 (+ 4 « GTA-6-… ») |
| titres de plus de 70 signes (avant : fr 6, en 4, es 7, it 8, de 9) | 0 | 0 | 2 (72, 74) | 0 | 0 |
| descriptions de plus de 160 signes (avant : fr 2, en 8, es 17, it 25, de 42) | 2 (164) | 0 | 0 | 0 | 0 |
| titres ou descriptions en double | 0 | 0 | 0 | 0 | 0 |
| hreflang sur une page non indexée (page introuvable, redirections) | 0 | 0 | 0 | 0 | 0 |

- Chaque page indexable porte 6 liens hreflang (fr, en, es, it, de, x-default → anglais), réciproques (vérifié par
  `langues.test.cjs` sur toutes les pages de chaque langue), et `og:locale:alternate` pour les quatre autres langues.
- `sitemap.xml` : 1 955 adresses (391 × 5), chacune avec ses 6 `xhtml:link`, `lastmod` et, pour 600 d'entre elles, l'image de
  partage propre à la page ; `sitemap-fiches.xml` : 1 790 adresses (358 × 5). Aucune adresse non indexable, aucun doublon
  (`coverage.test.cjs`, `outils/verifier.js`).
- Texte affiché : comparé page par page à la v7.63 (série A), le texte visible des 415 pages françaises ne change que par les
  corrections de la série B (« japonais », date du Trailer 2 : 2025, valeurs « 100 % d'armure », « 300 % de capacité »,
  « 50 % dans GTA Online » de Personnalisations), le nombre de tests (À propos) et l'historique des Mentions ; comparé à la
  série B, seuls À propos et Mentions changent. Animations, visuels, liens et boutons : mêmes scripts, mêmes feuilles, mêmes
  balises (le générateur ne touche qu'aux balises du `<head>`).

## 4. Fusion

- Lignes des scripts fusionnés présentes dans aucune des deux séries : 167, relues une à une ; une seule erreur trouvée
  (compteur de Progression, corrigé).
- Sorties comparées à la référence de chaque langue (série A pour l'espagnol, l'italien et l'anglais ; série B pour l'allemand)
  avant traduction des textes nouveaux : différences attendues seulement (textes nouveaux de l'autre série, hreflang, barre de
  langue, chemins des carnets) ; identifiants de code traduits par erreur (« lieu », « lieux », « tatouages », « de ») repérés et
  rendus au code.
- Captures du Tuto allemand reprises avec le calculateur fusionné : identiques aux anciennes à l'heure d'enregistrement près
  (anciennes gardées).

## 5. Archive

`Leonidakit-v7.64-partie-1-site.zip` (racine, pages françaises, `outils/`, `leo/`, `en/`, `es/`) et
`Leonidakit-v7.64-partie-2-langues.zip` (`it/`, `de/`, `img/`), sans fichier commun : 2 820 fichiers en tout = les 2 726 fichiers changés depuis la v7.60 + 94 fichiers
livrés par l'une des archives précédentes et identiques à la v7.60 aujourd'hui (une archive de l'autre série a pu les changer
chez toi : ils sont remis en place). Vérifié en appliquant les deux parties, octet par octet, sur sept états possibles du dépôt :
(13) seule ; (13) + série B ; (13) + « tout en anglais » puis espagnol ; (13) + série A ; (13) + A puis B ; (13) + B puis A ;
(13) + les cinq dans le désordre. Chaque fois, tous les fichiers du dépôt v7.64 sont identiques ; seuls fichiers en trop possibles :
`en/leo-nlp.js` et `de/leo-nlp.js` (série B, plus chargés : facultatif de les supprimer).
