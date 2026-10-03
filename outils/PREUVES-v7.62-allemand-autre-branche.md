# Preuves — v7.62 (langues : tout le site et Léo en allemand), 3 octobre 2026

Dépendances hors dépôt : jsdom, postcss, parse5, acorn et playwright (Node), Pillow et playwright (Python, pour les captures
du Tuto), dans des dossiers à part (`NODE_PATH`). Aucune n'est publiée ; aucun `package.json`.

## 1. Tests automatisés

| Contrôle | Résultat |
|---|---|
| Suite Node (`node --test --test-concurrency=1 outils/tests/*.test.cjs`) | **693 / 693** (680 en v7.61 ; `langues.test.cjs` passe de 17 à 30 tests : chaque contrôle tourne pour l’anglais et pour l’allemand, plus « aucun anglais resté » sur les pages allemandes) |
| `node outils/regenerer.cjs` | « Langue en : 414 pages, 54 scripts traduits, 0 texte(s) sans traduction » ; « Langue de : 414 pages, 54 scripts traduits, 0 texte(s) sans traduction » |
| `node outils/langues.cjs --verifier en` et `--verifier de` | 0 texte sans traduction, 0 balise cassée, 0 conflit |
| `node outils/verifier.js` | 0 erreur : 133 196 références dans 1 243 pages (415 françaises + 414 anglaises + 414 allemandes), sitemaps compris |
| `node outils/tests/leo-eval.cjs` (français) | **512 / 512**, hors sujet 39 / 39, 0 réponse sans source |
| `leo-eval.cjs --lang en` | **501 / 512 (97,9 %)**, hors sujet 39 / 39 (inchangé) |
| `leo-eval.cjs --lang de` | **512 / 512**, hors sujet 39 / 39, 0 réponse sans source ; seuils (95 %, 100 %) tenus |
| `leo-eval.cjs --lang de --questions=outils/tests/leo-questions-de-inedites.json` | 96 / 140 (68,6 %) sur 140 questions allemandes jamais vues pendant le réglage (mesure, pas un seuil ; anglais : 111 / 140) |
| `node outils/preuve-confidentialite.cjs` | aucun cookie, aucune ressource externe ajoutée, clés `lk…` seulement (aucune clé nouvelle), toutes les affirmations des Mentions tenues |

## 2. Navigateur (Chromium, Playwright)

| Parcours | Résultat |
|---|---|
| `langues-browser.cjs` (anglais et allemand) | **3 652 / 3 652** : barre de langue (« Sprache ändern », menu Deutsch) de 360 à 1 440 px ; échantillon de pages × 5 largeurs sans débordement ; **chaque page anglaise et chaque page allemande** ouverte à 1 280 px ; états ouverts (Léo, carte, carnets remplis et vides, comparateur, progression, collectibles, listes filtrées, consommables, localisateur, recherche, page introuvable) ; calculateur 9 outils × 3 modes, rempli et vide, tiroir « Meine Berechnungen », hub en allemand ; sur les pages allemandes : aucun mot français, aucun texte anglais resté (hors titres de sources, noms de lieux réels et citations relevés un par un), montants « 1.250 $ », « 1.500 » lu 1 500, date « 1. Oktober 2026 », bandeau « Diese Seite gibt es auch auf Deutsch. », liens de Léo vers /de/ |
| `calculateurs-browser.cjs` · `calculateurs-parcours-browser.cjs` · `calculateurs-lot-b-browser.cjs` · `calculateurs-v2-browser.cjs` (français) | 278 / 278 · 161 / 161 · 140 / 140 · 142 / 142 |
| `tuto-essayer-browser.cjs` · `carnets-browser.cjs` · `contact-browser.cjs` · `leo-browser.cjs` · `calculateurs-check-ultime-browser.cjs` (français) | 22 / 22 · 94 / 94 · tenu · tenu · 1 120 / 1 120 |

## 3. Relecture de l’allemand

- **Mémoire** : chaque fichier contrôlé contre son équivalent anglais (mêmes clés, mêmes marques `<n>` et trous `{x}`, aucun
  « $ » devant un nombre, aucun guillemet « », chaînes de recherche sans umlaut ni ß).
- **Première passe** : 10 833 textes allemands différents vus dans le navigateur (toutes les pages, états ouverts, calculateur,
  Léo) relus par six relecteurs indépendants avec le glossaire : 234 défauts signalés.
- **Deuxième passe**, après corrections : les 2 023 textes changés et tout le calculateur et Léo, par deux autres relecteurs :
  86 défauts signalés (surtout grammaire après assemblage, libellés cités par le Tuto, unités de durée).
- **Corrections** : 281 dans la mémoire, le reste dans le code (pluriels écrits en entier, phrases à trous, durées « 1 h 30 min »,
  « 1 Mio. $ », guillemets d’une fin d’attribut) ; puis tout est régénéré, extrait (0 manque) et reparcouru dans le navigateur.
- **Léo** : 512 questions allemandes écrites comme un joueur les tape (fautes, style SMS, abréviations, umlauts écrits ou non),
  250 questions supplémentaires pour élargir la table, 140 questions inédites gardées hors du réglage.

## 4. Le français n’a pas changé (hors ce qui est voulu)

Comparaison des 415 pages françaises avec la v7.61, en retirant la barre de langue, les `hreflang` et les empreintes `?v=` :
396 identiques ; 19 différentes, comme prévu :
- 16 fiches véhicules : « second trailer de mai 2026 » → « de mai 2025 » (outils/redaction.cjs) ;
- `vehicules.html` et `armes.html` : attribut `data-mots` (pluriel du compteur, invisible) ;
- `mentions-legales.html` : entrée v7.62 de l’historique.
Les scripts du site changent seulement dans leur façon d’assembler les textes (phrases à trous, pluriels écrits en entier) :
le français affiché est le même, ce que vérifient les parcours français du § 2 et la suite Node.

## 5. Captures et rapports

Dossier de contrôle (hors dépôt) : pages allemandes et anglaises à 390 et 1 280 px, menus ouverts, Léo allemand, calculateur
allemand, captures du Tuto allemand (`img/tuto/de/`, prises par `python3 outils/tuto-shots.py . de`), rapports des parcours,
textes relus et rapports des relecteurs.
