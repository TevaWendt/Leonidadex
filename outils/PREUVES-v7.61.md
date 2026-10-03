# Preuves — v7.61 (langues : tout le site et Léo en anglais), 2 octobre 2026

Dépendances hors dépôt : jsdom, postcss, parse5, acorn et playwright, dans un dossier `node_modules` à part (`NODE_PATH`).
Aucune n'est publiée ; aucun `package.json`.

## 1. Tests automatisés

| Contrôle | Résultat |
|---|---|
| Suite Node (`node --test --test-concurrency=1 outils/tests/*.test.cjs`) | **680 / 680** (677 en v7.60 ; `langues.test.cjs` passe de 14 à 17 tests et couvre maintenant tout le site et Léo) |
| `node outils/regenerer.cjs` | « Langue en : 414 pages, 54 scripts traduits, 0 texte(s) sans traduction » |
| `node outils/langues.cjs --verifier en` | 0 texte sans traduction, 0 balise cassée, 0 conflit |
| `node outils/verifier.js` | 0 erreur : 90 372 références dans 829 pages (415 françaises + 414 anglaises), sitemaps compris |
| `node outils/tests/leo-eval.cjs` (français) | **512 / 512**, hors sujet refusés 39 / 39, 0 réponse sans source |
| `node outils/tests/leo-eval.cjs --lang en` | **501 / 512 (97,9 %)**, hors sujet refusés 39 / 39, 0 réponse sans source ; seuils (95 %, 100 %) tenus |
| `leo-eval.cjs --lang en --questions=outils/tests/leo-questions-en-inedites.json` | 111 / 140 (79,3 %) sur 140 questions jamais vues pendant le réglage (mesure, pas un seuil ; les mêmes questions posées en français au Léo français : 47,9 %) |
| `node outils/preuve-confidentialite.cjs` | aucun cookie, aucune ressource externe ajoutée, clés `lk…` seulement (aucune clé nouvelle en v7.61), toutes les affirmations des Mentions tenues |

## 2. Navigateur (Chromium, Playwright)

| Parcours | Résultat |
|---|---|
| `langues-browser.cjs` | **1 664 / 1 664** : barre de langue de 360 à 1 440 px ; 17 pages anglaises × 5 largeurs sans débordement ; **chaque page anglaise** (414) ouverte à 1 280 px ; états ouverts : Léo (questions anglaises, réponses, liens `/en/`, retour du calculateur), carte (panneaux, fiches de lieux, filtres, mesures), carnets remplis et vides, comparateur, progression, collectibles, listes filtrées, consommables, localisateur, recherche du site, page introuvable sous `/en/` ; aucun mot français visible (texte, attributs lus, textes des feuilles de style), aucun « 1 250 $ » |
| Parcours complet des 414 pages anglaises (textes visibles ou non, SVG, `aria-label`, `title`, `alt`, `placeholder`, métas) | **0 texte repéré comme français**, 0 erreur JavaScript, 0 réponse HTTP en erreur |
| `leo-browser.cjs` (français) | contrôle tenu (Léo français inchangé) |
| `carnets-browser.cjs` | 94 / 94 |
| `calculateurs-browser.cjs` · `calculateurs-parcours-browser.cjs` · `tuto-essayer-browser.cjs` · `contact-browser.cjs` | 278 / 278 · 161 / 161 · 22 / 22 · tenu |

## 3. Relecture de l’anglais

- **Extraction** : chaque texte français des pages, des scripts, des attributs, du JSON posé dans les pages, du JSON-LD et des
  données de Léo a sa traduction (0 manque) ; les petits mots sans accent sont repérés par le lexique français de la mémoire.
- **Relecture humaine** : 7 523 textes anglais différents (pages, états ouverts, réponses de Léo) relus par deux relecteurs
  indépendants (moitié chacun), avec le glossaire : **39 défauts signalés, 39 corrigés** (français resté dans des noms gardés
  tels quels, ordre des mots, phrases assemblées, pluriels, un même élément nommé de deux façons, contresens « assumed name »,
  « opens the game »…) ; chaque correction est reportée dans les chaînes de recherche et les textes de Léo, puis tout est
  régénéré et revérifié. Après la relecture, le JSON-LD est aussi traduit pour `value`, `featureList`, `browserRequirements` et
  `contactType` (268 valeurs restaient en français dans les données structurées des fiches).
- **Léo** : les 512 questions du jeu français réécrites comme un joueur anglophone les tape (fautes, style SMS, abréviations,
  montants « $200k », « 1.5 million ») + 140 questions inédites.

## 4. Le français n’a pas changé (hors ce qui est voulu)

Comparaison des pages françaises avec la v7.60, en retirant la barre de langue, les `hreflang` et les empreintes `?v=` :
382 identiques ; 33 différentes, comme prévu :
- `vehicules/*.html` (30 fiches) : « Autres modèles japonaiss » → « Autres modèles japonais » ;
- `personnalisations.html` : la note « Repère de la série » de Blindage, Chargeur étendu et Canon lourd donne son chiffre
  (« jusqu’à 100 % d’armure dans GTA V ») au lieu de s’arrêter sur « jusqu’à — » ;
- `mentions-legales.html` (historique v7.61) et `a-propos.html` (compteur de tests).
Le comparateur et Léo corrigent aussi de petites fautes affichées par leurs scripts, dont la zone des lieux de la carte dans
les réponses de Léo (« Key Lento » au lieu de « key lento ») : liste dans `outils/CHANGEMENTS-v7.61.txt` § 5.

## 5. Captures et rapports

Dossier de contrôle (hors dépôt) : pages anglaises à 390 et 1 280 px, menus ouverts, Léo anglais, carte, carnets, comparateur,
page introuvable ; rapports des parcours ; rapports des deux relecteurs.
