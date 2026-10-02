# Preuves — v7.59, check ultime du calculateur (2 octobre 2026)

Base : dépôt GitHub `TevaWendt/Leonidadex`, commit `8c1ddd30` (v7.58, lot 5 ; identique au ZIP complet joint, SHA-256 `55d7dd5d…40be`).
« Avant » = v7.58 servie en local ; « après » = v7.59. Environnement : Node 22.22, jsdom 29.1, Chromium (Playwright 1.63), serveur
statique local, CPU ralenti ×4 pour la latence. Mesures de laboratoire, pas des visiteurs réels. Matrice : `outils/MATRICE-CHECK-ULTIME.md`.

## 1. Artefacts de départ (v7.58, vérifiés avant toute modification)

| Contrôle | Résultat |
|---|---|
| `node --test outils/tests/*.test.cjs` | 624 tests, 621 verts, **3 rouges** (`calculateurs-ergonomie-v35` : `CSS is not defined` sous jsdom — D-01) |
| `node outils/verifier.js` | 0 erreur (48 355 références, 415 pages) |
| `node outils/tests/leo-eval.cjs` | 512 / 512, hors sujet 39 / 39, 0 sans source |
| Matrice de causalité (table finale, `calculateur-causalite.cjs`) sur v7.58 | **130 / 139** : nom de l'achat sans effet sur la réponse (D-05), `CSS is not defined` sur les flèches de l'ordre (D-01), 4 lignes « Ça vaut le coup ? / nouvelle activité » où le chiffre du moteur n'est pas à l'écran (D-06), heures de jeu de « Quel achat choisir ? » sans effet (D-04), 2 champs « me fera gagner en plus » masqués (D-02) — journal `causalite-v758-script-final.log` |
| Contrôle navigateur (`calculateurs-check-ultime-browser.cjs`) sur v7.58 | 1 096 contrôles, **24 échecs** : boutons « Fiche ↗ » des cartes du catalogue de 15 à 21 px de haut (tactile) |

## 2. Résultats finaux (v7.59)

| Contrôle | Résultat |
|---|---|
| `node --test outils/tests/*.test.cjs` | **663 / 663** (624 → 663 : +39 tests ; 2 attentes existantes mises à jour, voir § 6) — `tests-final.log` |
| `node outils/verifier.js` | 0 erreur (48 355 références, 415 pages) |
| `node outils/tests/leo-eval.cjs` | 512 / 512, hors sujet 39 / 39, 0 sans source |
| `node outils/regenerer.cjs` | ok (≈ 34 s) ; `gen-leo.cjs --check` ok ; `calculateur-inventaire.cjs --check` : « Inventaire à jour » |
| Inventaire CALC-01 | 581 contrôles (Expert) sur 9 outils + 47 communs, 0 erreur JS, reproductible à l'octet |
| Matrice de causalité CALC-02 | **139 / 139** conformes, 0 écart — `causalite-final.log` |
| Propriétés du moteur | 12 propriétés × 3 000 cas, 12 / 12 |
| `calculateurs-check-ultime.test.cjs` | 15 / 15 ; `calculateurs-hub-leo.test.cjs` 3 / 3 ; `donnees-publiees.test.cjs` 8 / 8 |
| Navigateur, check ultime (`calculateurs-check-ultime-browser.cjs`) | **1 120 contrôles, 0 échec** (largeurs 360 / 390 / 700 / 701 / 1024 / 1440 × 9 outils × 3 modes, résumé collant, tactile, clavier, mouvement réduit, sans JS, stockage bloqué) — `final/check-ultime-browser.txt`, captures |
| Parcours Chromium existants | `calculateurs-parcours-browser` 161 / 161 ; `calculateurs-lot-b-browser` 140 / 140 ; `calculateurs-v2-browser` 142 / 142 ; `calculateurs-browser` 278 / 278 ; `carnets-browser` 94 / 94 ; `tuto-essayer-browser` 22 / 22 ; `leo-browser` tenu |
| Répétition générale (`repetition-generale.cjs`) | **46 / 46** ; empreinte du dossier réel identique avant / après ; aucun marqueur fictif dans la livraison — `repetition-generale.md` |

## 3. CALC-18 — latence à CPU ×4 (avant / après, 24 mesures chacune, trois séries alternées)

| Mesure (CPU ×4, Chromium headless) | v7.58 médiane | p90 | v7.59 médiane | p90 | Écart médiane |
|---|---|---|---|---|---|
| Ouverture → première réponse (navigation comprise) | 1 122 ms | 1 260 | 1 149 ms | 1 229 | +2,4 % |
| DOMContentLoaded | 924 ms | 1 052 | 949 ms | 1 010 | +2,7 % |
| Changement d'outil (→ Ça vaut le coup ?) | 63,8 ms | 71 | 72,5 ms | 90 | +8,7 ms |
| Saisie → réponse (Mon objectif) | 79 ms | 135 | 74 ms | 101 | −6,3 % |
| Business plan complet, Expert tout déplié | 206 ms | 235 | 196 ms | 252 | −5,0 % |

Lecture honnête : les écarts entre deux séries d'une même version vont jusqu'à 37 % (saisie → réponse : 67 puis 92 ms sur v7.58) ;
les différences avant / après sont du même ordre que ce bruit, sauf le changement d'outil (+9 ms à ×4, soit ≈ 2 ms réels : la
carte de l'achat affiche désormais sa provenance). Scripts du calculateur : +9,4 Kio (+1,3 %). Aucune régression constatée au-delà
du bruit de mesure ; les p90 d'ouverture et de DOMContentLoaded sont meilleurs après. Données : `latence/synthese.json`, `latence/v758*/`, `latence/v759*/`.

## 4. Captures (dossier de contrôle `captures/`, `CAPTURES.md`)

| | v7.58 | v7.59 |
|---|---|---|
| D-05 réponse de Mes achats | « Oui, tu peux l’acheter maintenant… » (achat nommé « Voiture témoin » jamais cité) | « Oui, tu peux acheter Voiture témoin maintenant… » |
| D-04 tableau de « Quel achat choisir ? » | 10 lignes, la case « heures de jeu » sans effet | 11 lignes : « Après 10 h de jeu, prix enlevé » |
| D-02 champ « me fera gagner en plus » du plan (`#plan-boost`) | masqué (`visible : false`) | visible |
| Boutons « Fiche ↗ » du catalogue | 15 px de haut | 28 px |
| Provenance d'un prix (Mes achats, Expert, fiche sans prix) | « Aucune source de prix disponible. On ne sait pas encore si ça s’achète : c’est ton essai à toi. » | « Aucune source de prix disponible. · Prix pas encore connu · Achat dans GTA VI non confirmé. » (même écriture dans Simple, Expert et le plan ; avec un prix publié : statut, source, « vérifié le … » — voir la répétition générale) |
| Plan Expert 360 / 1440, Mon temps de jeu 390, sans JavaScript | `final/browser/*.png` | |

## 5. CALC-13 → CALC-16 — ce que la répétition générale a prouvé (46 vérifications, copie temporaire, valeurs fictives)

Garde-fous : un prix « officiel » sans source ni date (fiche) et un `prix_gta6` écrit avec le statut « conf » (liste) arrêtent
`node outils/regenerer.cjs` ; un sujet Léo marqué `absence` sans `textKnown` arrête `gen-leo.cjs` en le nommant.
Fiches (puce, ligne « Prix en jeu », fiche documentaire avec source et date, `data-prix`, encart entreprise), hubs (bateaux : phrase
recalculée ; demeures : absence conservée), Achats (note, cartes, statuts, FAQ), listes (colonne GTA VI « 3 $ · Officiel », fiche
complète, section « À confirmer », FAQ), phrases de `calculateurs.html` / `index.html` / À propos et JSON-LD FAQ, calculateur
(prix de référence pré-rempli, provenance, « Remettre le prix du site », phrase du catalogue « 3 prix publiés sur 354 fiches (dont
3 officiels) », carte du catalogue, Simple et Expert, Ça vaut le coup ?, Comparer, Classer, Mes activités « · du site » et calcul
2 × 16 500 $, Mon temps de jeu), carnets, export, lien de partage, Léo (véhicule, arme, entreprise, ligne de liste, question
générale). Dossier réel : empreinte identique, aucun marqueur. Rapport : `repetition-generale.md`.

## 6. CALC-19 / CALC-20 — tests et diff

- Tests ajoutés : `calculateurs-proprietes.test.cjs` (12), `calculateurs-check-ultime.test.cjs` (15), `calculateurs-hub-leo.test.cjs` (3), `donnees-publiees.test.cjs` (8) = +38 tests Node, plus 1 test de l'intégration existante conservé (663 au total) ; scripts : `calculateurs-check-ultime-browser.cjs`, `repetition-generale.cjs`, `calculateur-inventaire.cjs`, `calculateur-causalite.cjs`, `check-ultime-helper.cjs`.
- Attentes existantes mises à jour (2, justifiées) : `calculateurs-integration` « manual purchase prices override… » attendait la date brute `2026-09-19` (désormais « vérifié le 19 septembre 2026 ») ; `calculateurs-parcours-browser.cjs` attendait « Oui, tu peux l’acheter maintenant » pour un achat nommé (désormais nommé, D-05 ; un achat libre encore sans nom garde « l’acheter »).
- Diff complet et justification : § 7. Aucune suppression. Aucune clé de stockage (`lk_*`, `lk-calculator-*`) ni format modifié (tests de migration et de carnets verts ; `calculateurs-check-ultime` « rien n'est écrit sans saisie »). Textes du site : identiques à l'octet aujourd'hui (comparaison page par page hors empreintes `?v=`), sauf le compteur de tests d'À propos (567 → 606 tests comptés par script) et les attributs `data-lk-donnees` de `calculateurs.html` / `index.html`.

## 7. Diff relatif à la v7.58 (archive « modifs »)

Fichiers sources modifiés (33), fichiers générés hors pages (13) et créés (17) : liste exacte dans `LISEZ-MOI-v7.59.txt` et `LISTE-FICHIERS-v7.59.txt` (dossier de contrôle). Pages HTML (397 sur 415) : empreintes `?v=` régénérées parce que
`common.js` (version de Léo), `calculateurs*.js`, `fiches.js`, `leo-core.js`, `calculateurs-brand.css` changent ; contenu identique hors
`calculateurs.html`, `index.html` (attributs) et `a-propos.html` (compteur). Justification par fichier :

| Fichier | Pourquoi |
|---|---|
| `calculateurs.js`, `calculateurs-workspace.js`, `calculateurs-scenario.js`, `calculateurs-hub.js`, `calculateurs-data.js`, `calculateurs-modele.js`, `calculateurs-brand.css` | défauts D-01 → D-09, provenance unique, schéma unique, phrase du catalogue, Fiche ↗ |
| `fiches.js`, `leo-calculator.js`, `leo-core.js` | D-03, D-10, D-11, D-12, encart des fiches, prix publié dans Léo |
| `outils/sync-site.cjs`, `outils/gen.js`, `outils/gen-armes.cjs`, `outils/lore-gen.js`, `outils/site-shell.cjs`, `outils/gen-achats.cjs`, `outils/gen-acquisitions.cjs`, `outils/gen-leo.cjs`, `outils/fiche-doc.cjs`, `outils/catalogues.cjs`, `outils/catalogues/schema.json` | textes d'absence reliés à la donnée, fiches et listes prêtes, garde-fous |
| `outils/acquisitions.json`, `outils/achats-editorial.json`, `outils/editorial-hubs.json`, `outils/informations-editorial.json`, `outils/catalogues/editorial.json` | marqueurs `{donnees:clé}` (texte rendu identique aujourd'hui) |
| `outils/leo-knowledge.json`, `outils/leo-editorial.json` | 22 sujets `absence` + `textKnown` ; gabarits `priceKnown` |
| `outils/tests/calculateurs-integration.test.cjs`, `outils/tests/calculateurs-parcours-browser.cjs` | 2 attentes mises à jour (§ 6) |
| `common.js`, `leo-ui.js`, `leo-loader.js`, `leo.css`, `leo-index.json`, `leo/*.json`, `outils/leo-index-manifest.json` | générés par `sync-site.cjs` / `gen-leo.cjs` (version de Léo, gabarits) |
| `README.md`, `outils/CALCULATEUR-V2.md`, `outils/CALCULATEURS-DONNEES.md` | documentation |
| Créés : `outils/calculateur-inventaire.cjs`, `outils/calculateur-causalite.cjs`, `outils/donnees-publiees.cjs`, `outils/CALCULATEUR-INVENTAIRE.md`, `outils/CALCULATEUR-CAUSALITE.md`, `outils/QUAND-ROCKSTAR-PUBLIE.md`, `outils/MATRICE-CHECK-ULTIME.md`, `outils/CHANGEMENTS-v7.59.txt`, `outils/PREUVES-v7.59.md`, `outils/tests/*` (6), `LISEZ-MOI-v7.59.txt` | livrables de la mission |
