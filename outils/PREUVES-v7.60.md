# Preuves — v7.60 (langues : sélecteur « Changer la langue », version anglaise lot 1), 2 octobre 2026

Dépendances hors dépôt : jsdom, postcss, parse5, **acorn** (nouveau, lecture des scripts par `outils/langues.cjs`) et playwright,
dans un dossier `node_modules` à part (`NODE_PATH`). Aucune n'est publiée ; aucun `package.json`.

## 1. Tests automatisés

| Contrôle | Résultat |
|---|---|
| Suite Node (`node --test --test-concurrency=1 outils/tests/*.test.cjs`) | **677 / 677** (663 en v7.59 + 14 tests `langues.test.cjs`) |
| `node outils/langues.cjs --verifier en` | 0 texte sans traduction, 0 balise cassée, 0 conflit |
| `node outils/verifier.js` | 0 erreur (49 496 références, 421 pages dont les 6 pages anglaises) |
| `node outils/tests/leo-eval.cjs` | 512 / 512 (Léo inchangé) |
| `node outils/preuve-confidentialite.cjs` | 0 problème (aucun cookie, aucune ressource externe, clés « lk », formulaires connus) |
| `node outils/calculateur-inventaire.cjs` | 581 contrôles Expert, 47 communs, 0 erreur JS (inventaire régénéré : attribut `data-kicker`) |

La suite se lance **un fichier à la fois** (`--test-concurrency=1`) : `calculateurs-check-ultime.test.cjs` monte jusqu’à ≈ 3 Go
de mémoire ; en parallèle, le système de la machine de test arrête un fichier (SIGKILL), sans rapport avec le code.

## 2. Navigateur (Chromium, Playwright)

| Parcours | Résultat |
|---|---|
| `langues-browser.cjs` (nouveau) | **491 / 491** : barre de langue tout en haut, visible et sans débordement à 360, 390, 768, 1 280 et 1 440 px sur les 6 pages anglaises et 7 pages françaises (dont une fiche et un carnet) ; menu Français / English ; Échap ; clavier (Tab → Entrée → English) ; bandeau dans les deux sens ; `lk_lang_v1` écrit seulement après un clic ; Léo absent ; 9 outils × 3 modes × état rempli / vide, blocs dépliés, tiroir « My calculations » : aucun mot français visible (texte, `aria-label`, `title`, `placeholder`, texte des feuilles de style), aucun montant « 1 250 $ » ; « 1,500 » lu 1 500 ; 5 questions anglaises au hub |
| `calculateurs-browser.cjs` (français) | 278 / 278 |
| `calculateurs-parcours-browser.cjs` | 161 / 161 |
| `calculateurs-lot-b-browser.cjs` | 140 / 140 |
| `calculateurs-v2-browser.cjs` | 142 / 142 |
| `tuto-essayer-browser.cjs` | 22 / 22 |
| `carnets-browser.cjs` | 94 / 94 |
| `contact-browser.cjs` | tenu (envoi, repli, clavier, contraste, cibles) |

## 3. Relecture de l’anglais

- Tous les textes vus par `langues-browser.cjs` (`LK_LANGUES_TEXTES`, 1 700 textes différents) ont été relus par deux relecteurs
  indépendants (moitié chacun) avec le glossaire : 37 défauts signalés (phrases assemblées mal ordonnées, « earns more » au lieu
  de « earns the most », « For have $1,000,000 », « environ » et « j/sem » restés en français, typographie « ,? », libellés
  cités différemment du vrai bouton, « topic » au lieu de « reason », etc.) ; **36 sont corrigés** (le 37e, le compteur « 2547 » d’À propos écrit sans séparateur, est le même en français) et le parcours relancé.
- Repère automatique du français (`langues-helper.cjs`) : mots outils, vocabulaire du site, mots accentués, hors noms propres
  cités (adresse de Brevo, loi Informatique et Libertés, CNIL).

## 4. Le français n’a pas changé (hors ce qui est voulu)

- Comparaison des 415 pages françaises avec la v7.59, en retirant la barre de langue, les `hreflang` et les empreintes `?v=` :
  411 identiques à l’octet ; 4 différentes, comme prévu : `calculateurs.html` (attributs `data-kicker`, `data-desc`),
  `tuto.html` (attributs `data-capture`), `mentions-legales.html` (ligne « Langue », historique v7.60, date du 2 octobre),
  `a-propos.html` (compteur de tests).
- Textes du calculateur français changés : seulement les corrections listées dans `outils/CHANGEMENTS-v7.60.txt` § 4.

## 5. Captures

Dossier de contrôle (hors dépôt) : pages anglaises à 390 et 1 280 px, menus ouverts (anglais 1 280, français 390), bandeau,
calculateur anglais, captures du Tuto anglais (`img/tuto/en/`, prises par `python3 outils/tuto-shots.py . en`), rapports des
parcours, textes relus et rapports des relecteurs.
