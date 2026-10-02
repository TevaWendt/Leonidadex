# Quand Rockstar publie un chiffre — procédure (v7.59, check ultime, CALC-16)

Le jour où un prix, un gain ou une durée de GTA VI est publié et vérifié, il n'y a **qu'un endroit à écrire par chiffre**, puis une régénération. Tout le reste (fiches, hubs, page Achats, phrases « pas encore connu », calculateur, carnets, Léo) suit mécaniquement. Procédure écrite et répétée : `node outils/tests/repetition-generale.cjs` la rejoue de bout en bout sur une copie temporaire avec des valeurs fictives (46 vérifications : fiches, hubs, listes, phrases, calculateur, carnets, Léo, garde-fous) et prouve qu'aucune trace ne reste dans le dossier réel.

## 1. Le schéma unique d'une valeur chiffrée

Partout la même forme — un nombre nu est accepté mais reste « non confirmé » ; la forme complète est la règle :

```json
{ "value": 35000, "status": "official", "source": "https://www.rockstargames.com/…", "verifiedAt": "2026-11-20", "unit": "$" }
```

| Champ | Attendu | Règle |
|---|---|---|
| `value` | nombre ≥ 0, fini, ≤ 1 000 milliards | `null` = inconnu (jamais 0 pour « inconnu ») |
| `status` | `official` · `verified` · `estimated` · `manual` · `unverified` · `unknown` | `official` et `verified` **exigent** `source` et `verifiedAt` ; un statut inconnu devient `unverified` (jamais officiel par défaut) ; `unknown` annule la valeur |
| `source` | URL ou référence précise (entretien, page officielle, relevé daté) | affichée sur la fiche, dans Mes achats et par Léo |
| `verifiedAt` | `AAAA-MM-JJ` | affichée « vérifié le 20 novembre 2026 » |
| `unit` | `$` (dollars du jeu) | minutes pour les durées (`duration`, `prep`, `cooldown`), % pour `share` |

Lecteurs du schéma (tous alignés, testés par `outils/tests/donnees-publiees.test.cjs`) : `calculateurs-data.js` (exécution), `calculateurs-modele.js` (`V.published`, fiches documentaires, analyse), `outils/donnees-publiees.cjs` (générateurs, phrases, garde-fous).

## 2. Où écrire chaque chiffre (un seul endroit)

| Chiffre | Fichier | Clé | Exemple |
|---|---|---|---|
| Prix d'un **véhicule** | `outils/v-corrige.json` (entrée du véhicule) | `price` | `"price": { "value": 35000, "status": "official", "source": "…", "verifiedAt": "2026-11-20", "unit": "$" }` |
| Prix d'une **arme** | `armes-data.js` (ligne de l'arme) | `price` | idem, après `"id":"girardi-es9",` |
| Prix d'une **entreprise**, **demeure**, **planque** | `outils/editorial.json` (`businesses` / `residences` / `hideouts`) | `price` + `purchasable: true` si l'achat est confirmé | idem |
| **Activité** (gain, durée, frais…) | `calculateurs-activites.js` (`window.LK_ACTIVITIES`) | une entrée `{id, name, reward, cost, duration, prep, cooldown, share, investment, players, beginner, status, source, verifiedAt}` | `reward` et `duration` obligatoires pour que le calculateur s'en serve ; chaque champ accepte aussi la forme `{value, status, source, verifiedAt}` |
| Prix GTA VI d'une **ligne de liste** (consommable, coiffure, tatouage, tenue, personnalisation) | `outils/catalogues/*.json` | `prix_gta6` : `{ "valeur": 3, "statut": "officiel" ou "verified", "source": "…", "verifiedAt": "AAAA-MM-JJ" }` | colonne « GTA VI » de la liste, fiche complète, FAQ, Léo |

Ne jamais écrire dans : les pages HTML des fiches et hubs, `vehicules-data.js`, `calculateurs-catalogue.js`, `acquisitions-data.js`, `leo-index.json`, `leo/*.json` (générés).

## 3. Régénérer et vérifier (5 commandes)

```bash
node outils/donnees-publiees.cjs            # état lu : combien de prix / d'activités, erreurs de forme (code 1 si une valeur est mal formée)
node outils/regenerer.cjs                   # fiches, hubs, catalogue, phrases d'absence, FAQ JSON-LD, Léo (s'arrête sur une valeur mal formée)
node outils/verifier.js                     # cohérence du site
NODE_PATH=<deps> SITE_ROOT=$PWD node --test outils/tests/*.test.cjs   # suite complète
NODE_PATH=<deps> node outils/tests/leo-eval.cjs                        # Léo
```

Puis relire en 2 minutes : la fiche (puce « Prix publié », ligne « Prix en jeu », fiche documentaire avec source et date, encart calculateur), `calculateurs.html?tool=purchase&type=<type>&id=<id>&from=fiche` (prix de référence pré-rempli, provenance, « Remettre le prix du site »), et une question à Léo (« combien coûte X ? »).

## 4. Ce qui change tout seul (rien à toucher)

- **Fiches** : puce `Prix publié : 35 000 $ · Officiel`, ligne « Prix en jeu » (source, date), fiche documentaire (`Prix` avec statut, source en lien, « vérifié le … »), `data-prix` sur le bouton du carnet (`fiches.js` adapte la phrase de l'encart). Entreprises / demeures / planques : l'encart calculateur annonce le prix publié ou « achat confirmé, prix pas encore publié ».
- **Hubs et page Achats** : encarts (`site-shell.cjs`), cartes et statuts du hub « Tout ce qui s'achète », FAQ « Pourquoi il n'y a aucun prix ? », note d'introduction (`gen-achats.cjs`).
- **Phrases d'absence** : `calculateurs.html` (bandeau, tableau des activités, FAQ), `index.html` (aide du mini-calculateur), À propos (FAQ prix), hubs (FAQ demeures/planques, encart lieux), listes (consommables, style, personnalisations) — via `data-lk-donnees="clé"` et marqueurs `{donnees:clé}` remplacés par `outils/donnees-publiees.cjs` à la régénération ; le JSON-LD FAQ est reconstruit après.
- **Calculateur** : prix de référence pré-rempli à l'arrivée depuis une fiche ou le catalogue, provenance (statut en français, source, date) dans Mes achats (Simple et Expert), Ça vaut le coup ?, Comparer, Classer, le plan ; phrase du catalogue « N prix publiés sur T fiches » ; activités du site proposées avec l'étiquette « du site » dans Mes activités et Mon temps de jeu ; carnets, export et lien de partage portent l'identifiant de la fiche et le prix.
- **Léo** : « combien coûte X ? » répond avec le prix, le statut, la source et la date (véhicule, arme, entreprise, demeure, planque).

## 5. Ce qui demande une relecture (et comment la génération vous le dit)

- **Réponses rédigées de Léo** qui affirment une absence : les sujets de `outils/leo-knowledge.json` portent `"absence"` (`prix`, `prix:<type>`, `prix:<type>:<id>`, `activites`, `catalogue:<famille>`) et un `textKnown` prêt (avec `{prix}` / `{activites}` = phrases calculées). Le jour venu, `gen-leo.cjs` prend `textKnown` tout seul ; un sujet marqué sans `textKnown` **arrête** la génération en le nommant. Les 22 sujets marqués sont à relire une fois pour vérifier que le `textKnown` convient aux chiffres réels.
- **Phrases figées restantes** : `node outils/donnees-publiees.cjs --absences` liste toutes les phrases des sources qui affirment qu'un chiffre n'est pas publié, avec leur état (`mécanique` ou `à relire`). Relire la liste « à relire » : ce sont des faits sur une annonce précise (« aucun prix dans cette annonce », repères de la série, « ce qu'on ne fait pas ») qui restent vrais, ou des textes de contexte à ajuster à la main.
- **Textes d'exemples** (Tuto, exemples A/B/C du calculateur) restent des exemples : ne jamais y recopier un chiffre publié.

## 6. Interdits

- Aucun chiffre de GTA V / GTA Online dans un champ GTA VI (il va dans `prix_repere_serie`).
- Aucun prix d'édition en euros comme prix d'objet en dollars.
- Aucune valeur sans statut explicite si elle vient d'une source officielle : écrire `status` et `source`, sinon la génération la traite « non confirmée ».
- Ne pas modifier les clés de stockage `lk_*` / `lk-calculator-*` : les sauvegardes des joueurs restent lisibles (une activité du site modifiée est recalculée, les chiffres du joueur sont gardés).
