# Quand Rockstar publie un chiffre — procédure (v7.59, check ultime, CALC-16 ; v8.02 : missions, activités, revenus, règles d’argent ; v8.03 : personnage joué, réglages du joueur ; v8.04 : statuts « media » et « community », fourchettes, plusieurs sources, prix des munitions)

Le jour où un prix, un gain ou une durée de GTA VI est publié et vérifié, il n'y a **qu'un endroit à écrire par chiffre**, puis une régénération. Tout le reste (fiches, hubs, page Achats, phrases « pas encore connu », calculateur, carnets, Léo) suit mécaniquement. Procédure écrite et répétée : `node outils/tests/repetition-generale.cjs` la rejoue de bout en bout sur une copie temporaire avec des valeurs fictives (46 vérifications : fiches, hubs, listes, phrases, calculateur, carnets, Léo, garde-fous) et prouve qu'aucune trace ne reste dans le dossier réel.

## 1. Le schéma unique d'une valeur chiffrée

Partout la même forme — un nombre nu est accepté mais reste « non confirmé » ; la forme complète est la règle :

```json
{ "value": 35000, "status": "official", "source": "https://www.rockstargames.com/…", "verifiedAt": "2026-11-20", "unit": "$" }
```

| Champ | Attendu | Règle |
|---|---|---|
| `value` | nombre ≥ 0, fini, ≤ 1 000 milliards | `null` = inconnu (jamais 0 pour « inconnu ») |
| `status` | `official` · `verified` · `media` (alias `presse`) · `estimated` · `community` (alias `comm`) · `manual` · `unverified` · `unknown` | `official`, `verified`, `media` et `community` **exigent** `source` et `verifiedAt` ; `media` exige en plus **deux** sources différentes (`source` + `sources`), sinon le chiffre est `estimated` ; un statut inconnu devient `unverified` (jamais officiel par défaut) ; `unknown` annule la valeur |
| `source` | URL ou référence précise (entretien, page officielle, relevé daté) | affichée sur la fiche, dans Mes achats et par Léo |
| `verifiedAt` | `AAAA-MM-JJ` | affichée « vérifié le 20 novembre 2026 » |
| `unit` | `$` (dollars du jeu) | minutes pour les durées (`duration`, `prep`, `cooldown`), % pour `share`, `rang` pour un rang ou un niveau demandé |
| `min`, `max` (v8.04, facultatifs) | deux nombres ≥ 0, même unité que `value`, `min` < `max`, `min` ≤ `value` ≤ `max` | la fourchette quand le chiffre varie (difficulté, butin au hasard) : `value` porte la moyenne ou le plus courant, **c’est lui que le calcul utilise** ; affichée « 45 000 $ (de 40 000 à 50 000 $) » sur la fiche, dans les listes et par Léo |
| `note` (v8.04, facultatif) | texte court (300 signes au plus) | pourquoi le chiffre varie ou ce qu’il compte (« selon les objectifs réussis ») ; affichée à côté du chiffre |
| `sources` (v8.04, facultatif) | liste de 1 à 10 adresses ou références | les autres sources du même chiffre (la première reste dans `source`) ; obligatoire pour `media` ; affichées « sources : A ; B » |

Exemple d’un chiffre donné par deux guides de médias qui disent la même chose, avec une fourchette :

```json
{ "value": 400000, "status": "media", "source": "https://www.ign.com/…", "sources": ["https://www.gamespot.com/…"], "verifiedAt": "2026-11-20", "unit": "$", "min": 350000, "max": 450000, "note": "selon les objectifs réussis" }
```

D’où vient le chiffre → quel statut (v8.04) :

| Source | Statut d’une valeur `{value…}` | Statut d’un `prix_gta6` (listes) | Ce que le calculateur en fait |
|---|---|---|---|
| Rockstar (site officiel, Newswire, manuel, texte en jeu) | `official` | `officiel` | chiffre officiel |
| Relevé fait en jeu par Téva | `verified` | `verified` | chiffre vérifié (« Mesuré ») |
| Deux guides de médias reconnus qui donnent le même chiffre | `media` + `source` + `sources` | `media` + `source` + `sources` | compté, affiché « Vu dans un média », jamais officiel |
| Un seul guide de médias, ou un chiffre déduit | `estimated` | `estimated` | compté, affiché « Estimation » |
| Wiki ou site de la communauté | `community` (ou `comm`) | `comm` (ou `community`) | compté, affiché « Communautaire », jamais officiel |
| Rien de publié | `value: null` + `status: "unknown"` | `valeur: null` + `statut: "conf"` | inconnu, jamais compté comme 0 |

Les anciens statuts `vu` et `observed` gardent leur sens (repéré dans une vidéo ou une capture officielle) : ils ne servent pas pour un chiffre de média. Dans le calcul, `media` et `community` comptent comme `estimated` (chiffres non confirmés) ; la mission prend le statut le plus faible de son gain et de sa durée.

Lecteurs du schéma (tous alignés, testés par `outils/tests/donnees-publiees.test.cjs` et, v8.04, `outils/tests/jour-j-v804.test.cjs`) : `calculateurs-data.js` (exécution), `calculateurs-modele.js` (`V.published`, fiches documentaires, analyse), `outils/donnees-publiees.cjs` (générateurs, phrases, garde-fous). `min`, `max`, `note` et `sources` n’existent dans ce que lit le calculateur que lorsqu’ils sont écrits : sans eux, rien ne change (ni l’empreinte des données, ni un calcul enregistré).

## 2. Où écrire chaque chiffre (un seul endroit)

| Chiffre | Fichier | Clé | Exemple |
|---|---|---|---|
| Prix d'un **véhicule** | `outils/v-corrige.json` (entrée du véhicule) | `price` | `"price": { "value": 35000, "status": "official", "source": "…", "verifiedAt": "2026-11-20", "unit": "$" }` |
| Prix d'une **arme** | `armes-data.js` (ligne de l'arme) | `price` | idem, après `"id":"girardi-es9",` |
| Prix d'une **entreprise**, **demeure**, **planque** | `outils/editorial.json` (`businesses` / `residences` / `hideouts`) | `price` + `purchasable: true` si l'achat est confirmé | idem |
| **Activité** (gain, durée, frais…) sans fiche sur le site | `calculateurs-activites.js` (`window.LK_ACTIVITIES`) | une entrée `{id, name, reward, cost, duration, prep, cooldown, share, investment, players, beginner, status, source, verifiedAt}`, en JSON strict (guillemets doubles, aucun commentaire ; le tableau reste à la fin du fichier, après `window.LK_CALC_REGLES`) ; v8.04 : un `id` qui ne commence ni par `activite-` ni par `mission-` (ces entrées-là sont réécrites par `gen-activites.cjs` et `gen-missions.cjs`) | `reward` et `duration` obligatoires pour que le calculateur s'en serve ; chaque champ accepte aussi la forme `{value, status, source, verifiedAt}` |
| Prix GTA VI d'une **ligne de liste** (consommable, coiffure, tatouage, tenue, personnalisation) | `outils/catalogues/*.json` | `prix_gta6` : `{ "valeur": 3, "statut": "officiel", "source": "…", "verifiedAt": "AAAA-MM-JJ" }` ; v8.04 : `statut` aussi `verified`, `media` (avec `sources`), `estimated` ou `comm`, et au besoin `min`, `max`, `note`, `sources` (§ 1) | colonne « GTA VI » de la liste (pastille selon le statut), fiche complète, FAQ, Léo |
| Prix d'une **munition** (v8.04) | `outils/acquisitions.json` → `items` | une entrée de la catégorie `munitions` : `{ "id": "munitions-de-pistolet", "category": "munitions", "sourceId": "<clé de sources>", "evidenceLevel": 1, "acquisition": "purchase", "condition": "Achat à l’Ammu-Nation", "description": "…", "media": [], "trackable": false, "calculatorCompatible": true, "price": { "value": …, "status": "official", "source": "…", "verifiedAt": "AAAA-MM-JJ", "unit": "$" } }` ; `id` = l’identifiant de la munition dans `outils/hubs-editoriaux.json` (`armes.munitions.items` : `munitions-de-pistolet`, `cartouches`, `munitions-de-fusil`, `munitions-lourdes`, `harpons`) ; `sourceId` = une clé de `sources` du même fichier (à ajouter si la source est nouvelle : `url`, `title`, `publishedAt`, `consultedAt`, `context`, `claim`) | calculateur (achat de type « munition », Mes achats), fiche `munitions/<id>.html` (ligne « Prix dans GTA VI » et phrase du prix), Léo ; un identifiant inconnu arrête `gen-acquisitions.cjs` |
| **Mission** (histoire, secondaire, braquage, rencontre) | `outils/missions/missions.json` (une entrée par mission dont le nom est publié ; format : son `_schema`) | `recompenses.argent` et `duree` (obligatoires pour le calculateur), puis, s’ils sont publiés : `cout`, `preparation`, `attente`, `part`, `investissement`, `joueurs`, `repetable`, `ordre`, `chapitre` (`numero`, `titre`), `deblocage` (`texte`, `missions`, `achats`, `argentMinimum`, `rang`), `personnageJoue` (v8.03 : `{ "value": ["jason"] \| ["lucia"] \| ["jason", "lucia"], "statut", "sources" }`) | `node outils/gen-missions.cjs` écrit l’activité « mission-<id> » dans `calculateurs-activites.js` (v8.02 : avec tous ces champs ; v8.03 : `characters`) |
| **Activité annexe** (pêche, chasse, courses…) | `outils/activites/activites.json` → `rapporte` | `gain` et `duree` (obligatoires pour le calculateur), puis `preparation`, `cout`, `attente`, `part`, `investissement`, `joueurs`, `achats`, `argentMinimum`, `rang` | `node outils/gen-activites.cjs` écrit l’activité « activite-<id> » (v8.02 : le pont écrit vraiment) |
| **Revenu passif** d’une entreprise, demeure ou planque | `outils/editorial.json` (`businesses` / `residences` / `hideouts`, même entrée que le prix) | `revenu` : `{ "montant": valeur publiée ($), "frequence": valeur publiée (min de jeu entre deux versements), "plafond": valeur publiée ($, stock maximum), "conditions": "texte" }` | catalogue du calculateur (`income`), encart calculateur de la fiche (« Revenu publié : … »), contrôle `donnees-publiees.cjs` |
| **Règles d’argent** : argent de Jason et Lucia, amende, argent perdu à la mort, à l’arrestation | `calculateurs-activites.js` → `window.LK_CALC_REGLES` | `argentPersonnages` (`value` : `"commun"` ou `"separe"`), `amende` (`unit` `$`), `perteMort`, `perteArrestation` (`unit` `$` pour un montant, `%` pour une part de l’argent en poche) | `LKCalcData.rules()` ; contrôle `donnees-publiees.cjs` (code 1 si une règle est mal formée) ; v8.03 : affiché dans « Mes hypothèses en plus » (« Déjà connu : … », avec son statut ; une perte en `%` est aussi chiffrée sur l’argent écrit), sans changer le réglage du joueur |

Ne jamais écrire dans : les pages HTML des fiches et hubs, `vehicules-data.js`, `calculateurs-catalogue.js`, `acquisitions-data.js`, `leo-index.json`, `leo/*.json` (générés).

### 2 quater. v8.04 : chaque donnée du prompt du jour J et sa place

| Donnée demandée | Fichier | Clé (format : § 1) |
|---|---|---|
| **Mission de l’histoire** : nom | `outils/missions/missions.json` → `missions` | `nom` (+ `id`, `type: "histoire"`, `resume`, `statut`, `statutNom` : `officiel` si Rockstar l’a nommée, `vu` si le nom vient d’un média) |
| chapitre, ordre | idem | `chapitre: { numero, titre, statut, sources }`, `ordre` (nombre) |
| personnage(s) | idem | `personnageJoue: { value: ["jason"] \| ["lucia"] \| ["jason", "lucia"], statut, sources }` (et `personnages` pour les liens vers les fiches) |
| lieu | idem | `lieux` (régions), `carte` (`[{ id, nom }]`, repères de la carte) |
| ce qui la débloque | idem | `deblocage: { texte, statut, sources, missions: [ids], achats: [ids de véhicules, armes, entreprises, demeures, planques], argentMinimum: {value…, unit "$"}, rang: {value…, unit "rang"} }` |
| coût pour la lancer | idem | `cout` (`$`, payé à chaque fois) |
| récompense en argent | idem | `recompenses.argent` (`$`, avec `min`, `max`, `note` si elle varie) |
| autres récompenses | idem | `recompenses.vehicules`, `recompenses.armes` (identifiants du site), `recompenses.proprietes`, `recompenses.deblocages` (textes) |
| durée moyenne | idem | `duree` (`min` ; fourchette `min`/`max` si elle varie) |
| manquable | idem | `manquable: { value: true \| false \| null, statut, sources }` |
| **Mission secondaire, quête annexe** | idem | mêmes champs, `type` `secondaire` (ou `braquage`, `rencontre`…), `repetable: { value: true }` si elle se refait pour de l’argent, `attente` (min) |
| **Activité qui rapporte** (gain, durée, préparation, coût, attente, partage, investissement, joueurs) | `outils/activites/activites.json` → l’activité → `rapporte` | `gain`, `duree`, `preparation`, `cout`, `attente`, `part` (%), `investissement`, `joueurs` (entier), `achats`, `argentMinimum`, `rang` |
| **Revenu passif** (montant, fréquence, plafond, conditions) | `outils/editorial.json` (`businesses`, `residences`, `hideouts`) | `revenu: { montant, frequence (min de jeu), plafond, conditions }` |
| **Prix** d’un véhicule | `outils/v-corrige.json` | `price` |
| d’une arme | `armes-data.js` | `price` |
| d’une munition | `outils/acquisitions.json` | une entrée `munitions` (tableau ci-dessus) |
| d’une entreprise, demeure (propriété), planque | `outils/editorial.json` | `price` + `purchasable: true` |
| d’un consommable, d’un vêtement (tenue), d’une coiffure, d’un tatouage, d’une personnalisation | `outils/catalogues/consommables.json`, `tenues.json`, `coiffures.json`, `tatouages.json`, `perso-vehicules.json`, `perso-armes.json` | `prix_gta6` |
| **Argent de Jason et Lucia** (commun ou séparé) | `calculateurs-activites.js` → `window.LK_CALC_REGLES` | `argentPersonnages` (`value` : `"commun"` ou `"separe"`) |
| argent perdu à la mort, à l’arrestation | idem | `perteMort`, `perteArrestation` (`unit` `$` ou `%`) |
| amendes | idem | `amende` (`$`) |

Une source nouvelle se déclare là où vit la donnée : `outils/missions/hub.json` → `sources` (missions), `outils/activites/hub.json` → `sources` (activités), `outils/acquisitions.json` → `sources` (munitions), `outils/catalogues/sources.json` (listes) ; l’adresse va aussi dans `source` (et `sources`) de la valeur, et la date de consultation dans `verifiedAt`. Le statut d’une source déclarée suit la grille du site : `officiel` (Rockstar), `vu` (média), `comm` (communauté).

### 2 bis. v8.02 : ce que le business plan sait faire de ces champs (rien à coder le jour J)

| Champ (source) | Dans le calculateur | Effet |
|---|---|---|
| `deblocage.missions` (mission), identifiants de missions | `requiresMissions` (« mission-<id> ») | la mission attend que les missions demandées soient faites ; une mission demandée doit se faire une seule fois (`repetable` non `true`) et avoir elle aussi son gain et sa durée, sinon elle n’est pas imposée (avertissement de `gen-missions.cjs`) |
| `deblocage.achats` (mission) ou `rapporte.achats` (activité), identifiants de véhicules, armes, entreprises, demeures, planques | `requiresPurchaseIds` | la mission attend que l’achat soit possédé ; copiée dans le plan, l’achat rejoint « Avant ton but » |
| `deblocage.argentMinimum` / `rapporte.argentMinimum` ($) | `minCash` | la mission ne se lance qu’avec cet argent **en poche** (il n’est pas dépensé ; l’argent gardé de côté compte) ; bloquée, le plan dit « Il te faut encore X $ avant de pouvoir lancer « … » » ; vérifié par la règle R11 |
| `deblocage.rang` / `rapporte.rang` (unit `rang`) | `minRank` | la mission demande ce rang ; le plan fait apparaître la case « Mon rang (ou niveau) dans le jeu » et la demande avant de calculer ; vérifié par la règle R12 |
| `repetable` (mission) | `once` | `false` : une seule fois (débloque la suite) ; `true` : elle se refait ; non publié : une seule fois pour l’histoire, les missions secondaires, les braquages et les rencontres. Une mission « une seule fois » n’entre pas dans les calculs qui répètent (Mon objectif, Mon temps de jeu, Mes activités) : elle se place dans le business plan |
| `ordre`, `chapitre` | `order`, `chapter`, `chapterTitle` | deux missions « une seule fois » prêtes en même temps passent dans l’ordre de l’histoire |
| `cout`, `preparation`, `attente`, `part`, `investissement`, `joueurs` | `cost`, `prep`, `cooldown`, `share`, `investment`, `players` | mêmes règles que les activités écrites à la main ; une valeur non publiée reste vide (`null`), jamais 0 |
| `deblocage.texte` | `unlockText` | gardé pour l’affichage et Léo |
| `revenu` (fiche) | `income` (`amount`, `everyMinutes`, `cap`, `conditions`) | annoncé sur la fiche ; v8.03 : listé dans « Mes hypothèses en plus » (« Revenus publiés : … ») avec un bouton « Utiliser ce revenu » qui le reprend dans le revenu passif simulé (par heure = montant × 60 ÷ minutes entre deux versements, stock maximum = plafond) |
| `personnageJoue` (mission, v8.03) | `characters` (`jason`, `lucia`) | seulement quand le joueur compte l’argent d’un seul personnage (« Mes hypothèses en plus ») : une mission jouée seulement avec l’autre est écartée de Mon objectif, Mon temps de jeu et Mes activités, avec la raison ; copiée dans le plan, elle prend « Jouée par » ; ligne « Jouée avec » sur la fiche de la mission |

### 2 ter. v8.03 : les réglages du joueur (rien à faire le jour J)

Les réglages du lot 2 (« Mes hypothèses en plus », mode Expert ; réglages du business plan) sont des **hypothèses du joueur**, tous
désactivés par défaut : soins, amendes, argent perdu à la mort et à l’arrestation (dépenses par partie), revenu passif avec stock
maximum (gain par heure), bonus sur les récompenses, partage à parts égales entre joueurs, argent d’un seul personnage, revente de ce
que le joueur possède (Mon objectif) ; dans le plan : reprendre ces hypothèses, tentatives ratées, revenu hors ligne entre deux
parties (règle R13), revente des achats d’avant après le but. Le jour J, il n’y a rien à coder : une règle publiée
(`LK_CALC_REGLES`) s’affiche à côté du réglage, un revenu publié (`revenu`) se reprend d’un clic, une mission dont `personnageJoue`
est publié est écartée ou gardée selon l’argent compté, et une part publiée par Rockstar n’est jamais remplacée par le partage
automatique. Rien de tout cela ne remplace la donnée : le joueur garde la main sur ses hypothèses.

Un champ non publié n’est simplement pas écrit : le pont ne transmet que ce qui existe, le moteur ne s’en sert que lorsqu’il existe (`outils/tests/calculateurs-v802.test.cjs` le prouve, et `outils/tests/reference-v801.cjs` prouve que, sans ces données, tous les résultats sont ceux de la v8.01).

## 3. Régénérer et vérifier

```bash
node outils/gen-missions.cjs                # missions : fiches + activités « mission-<id> » du calculateur (s’arrête sur une donnée mal formée)
node outils/gen-activites.cjs               # activités annexes : fiches + activités « activite-<id> » du calculateur
node outils/donnees-publiees.cjs            # état lu : combien de prix / d'activités, erreurs de forme (code 1 si une valeur est mal formée ; v8.02 : missions demandées et achats demandés connus, règles d’argent, revenus)
node outils/regenerer.cjs                   # fiches, hubs, catalogue, phrases d'absence, FAQ JSON-LD, Léo (s'arrête sur une valeur mal formée) ; v8.04 : quand de nouvelles fiches apparaissent (missions), la première passe peut s’arrêter sur « Index Léo à régénérer » (les compteurs de la page À propos ont bougé) : relancer une fois, la deuxième passe finit sans erreur
node outils/calculateur-inventaire.cjs      # v8.04 : refait outils/CALCULATEUR-INVENTAIRE.md (contrôlé par le test CALC-01) quand le catalogue du calculateur change
node outils/verifier.js                     # cohérence du site
NODE_PATH=<deps> SITE_ROOT=$PWD node --test outils/tests/*.test.cjs   # suite complète
NODE_PATH=<deps> node outils/tests/leo-eval.cjs                        # Léo
node outils/jour-j-controle.cjs --depart 0 --but 1000000 --rang <rang>   # v8.04 : état lu (prix par type et statut, listes, revenus, règles, missions) puis business plan d’un début de partie avec les missions du site, copiées comme le fait le business plan (« Ou reprendre une mission déjà écrite », puis « Ajouter cette mission » ; douze au plus, comme dans la page) : temps de jeu jusqu’au but, étapes (missions « une seule fois », répétitions résumées, achats), ordre de l’histoire, message de chaque mission qui demande de l’argent en poche (« Il te faut encore … $ »), rang manquant, revenu passif (but atteint en l’achetant ou sans lui), vérification indépendante du plan ; --partie 120 pour des parties de deux heures ; code 1 si quelque chose cloche
node outils/langues.cjs --extraire en       # v8.04 : textes nouveaux sans traduction (noms de missions, notes, conditions…) dans outils/langues/en/_a-traduire.json ; puis es, it, de, pt
```

Les textes propres aux données (noms de missions, résumés, notes, conditions, objectifs, libellés de sources) se traduisent comme des données : une entrée « texte français » : « traduction » par texte dans `outils/langues/<code>/jour-j-donnees.json` (en, es, it, de, pt), puis `node outils/langues.cjs --verifier <code>` jusqu’à 0 manque et une nouvelle régénération. Tout ce que les générateurs fabriquent autour de ces données est déjà traduit dans `outils/langues/<code>/v804-jour-j.json` : statut, fourchette, note, sources et date d’une valeur, phrases comptées (« 7 prix publiés sur 355 fiches… », « Le site connaît 4 activités… », colonnes « à confirmer » des listes, au singulier comme au pluriel), réponses de Léo qui changent quand un prix est publié (`textKnown`, `statusKnown`), compte à rebours, fil d’Ariane d’une fiche de mission, listes d’adresses « Sources des chiffres ».

Les tests acceptent un chiffre publié au format du § 1 (« aucun chiffre inventé » au lieu de « aucun chiffre ») : si un test échoue après le remplissage, c’est la donnée qu’on corrige, jamais le code ni le test.

Puis relire en 2 minutes : la fiche (puce « Prix publié », ligne « Prix en jeu », fiche documentaire avec source et date, encart calculateur), `calculateurs.html?tool=purchase&type=<type>&id=<id>&from=fiche` (prix de référence pré-rempli, provenance, « Remettre le prix du site »), et une question à Léo (« combien coûte X ? »).

## 4. Ce qui change tout seul (rien à toucher)

- **Fiches** : puce `Prix publié : 35 000 $ · Officiel`, ligne « Prix en jeu » (source, date), fiche documentaire (`Prix` avec statut, source en lien, « vérifié le … »), `data-prix` sur le bouton du carnet (`fiches.js` adapte la phrase de l'encart). Entreprises / demeures / planques : l'encart calculateur annonce le prix publié ou « achat confirmé, prix pas encore publié ».
- **Hubs et page Achats** : encarts (`site-shell.cjs`), cartes et statuts du hub « Tout ce qui s'achète », FAQ « Pourquoi il n'y a aucun prix ? », note d'introduction (`gen-achats.cjs`).
- **Phrases d'absence** : `calculateurs.html` (bandeau, tableau des activités, FAQ), `index.html` (aide du mini-calculateur), À propos (FAQ prix), hubs (FAQ demeures/planques, encart lieux), listes (consommables, style, personnalisations) — via `data-lk-donnees="clé"` et marqueurs `{donnees:clé}` remplacés par `outils/donnees-publiees.cjs` à la régénération ; le JSON-LD FAQ est reconstruit après.
- **Calculateur** : prix de référence pré-rempli à l'arrivée depuis une fiche ou le catalogue, provenance (statut en français, source, date) dans Mes achats (Simple et Expert), Ça vaut le coup ?, Comparer, Classer, le plan ; phrase du catalogue « N prix publiés sur T fiches » ; activités du site proposées avec l'étiquette « du site » dans Mes activités et Mon temps de jeu ; carnets, export et lien de partage portent l'identifiant de la fiche et le prix.
- **Léo** : « combien coûte X ? » répond avec le prix, le statut, la source et la date (véhicule, arme, entreprise, demeure, planque ; v8.04 : munition et ligne de liste, avec la fourchette, la note et toutes les sources).

## 5. Ce qui demande une relecture (et comment la génération vous le dit)

- **Réponses rédigées de Léo** qui affirment une absence : les sujets de `outils/leo-knowledge.json` portent `"absence"` (`prix`, `prix:<type>`, `prix:<type>:<id>`, `activites`, `catalogue:<famille>`) et un `textKnown` prêt (avec `{prix}` / `{activites}` = phrases calculées). Le jour venu, `gen-leo.cjs` prend `textKnown` tout seul ; un sujet marqué sans `textKnown` **arrête** la génération en le nommant. Les 22 sujets marqués sont à relire une fois pour vérifier que le `textKnown` convient aux chiffres réels.
- **Phrases figées restantes** : `node outils/donnees-publiees.cjs --absences` liste toutes les phrases des sources qui affirment qu'un chiffre n'est pas publié, avec leur état (`mécanique` ou `à relire`). Relire la liste « à relire » : ce sont des faits sur une annonce précise (« aucun prix dans cette annonce », repères de la série, « ce qu'on ne fait pas ») qui restent vrais, ou des textes de contexte à ajuster à la main.
- **Textes d'exemples** (Tuto, exemples A/B/C du calculateur) restent des exemples : ne jamais y recopier un chiffre publié.

## 6. Interdits

- Aucun chiffre de GTA V / GTA Online dans un champ GTA VI (il va dans `prix_repere_serie`).
- Aucun prix d'édition en euros comme prix d'objet en dollars.
- Aucune valeur sans statut explicite si elle vient d'une source officielle : écrire `status` et `source`, sinon la génération la traite « non confirmée ».
- Ne pas modifier les clés de stockage `lk_*` / `lk-calculator-*` : les sauvegardes des joueurs restent lisibles (une activité du site modifiée est recalculée, les chiffres du joueur sont gardés).
