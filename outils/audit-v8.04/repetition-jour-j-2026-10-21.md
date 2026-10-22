# Répétition à blanc du jour J (prompt 2), 21 octobre 2026

Copie jetable : `$S/jourj/blanc` (copie de `/home/claude/jourj` sans les dossiers de langue, jamais livrée). Toutes les valeurs
sont FICTIVES et portent la marque `fictif-repetition-jourj` (adresses example de rockstargames.com, ign.com, gamespot.com,
gta.fandom.com) : elles vérifient les formats, pas GTA VI. Scripts : `blanc-injecter.py` (données), `blanc-run.sh`
(générateurs un par un), `repetition.sh` (phases 1 et 2), `repetition3.sh` (régénération complète `outils/regenerer.cjs`,
comme le jour J), `repetition-verifs.cjs` (fiches, calculateur, état, business plan, Léo), `leo-q.cjs` (questions à Léo).

## 1. Chaque donnée essayée, où elle est allée, ce qu’en font la fiche et le calculateur

| Donnée (statut) | Fichier et clé | Fiche | Calculateur / Léo |
|---|---|---|---|
| Mission d’histoire complète « Premier contrat » : récompense 25 000 $ (official), durée 15 min (verified), coût inconnu (null, unknown), ordre 1, chapitre 1, personnageJoue Jason et Lucia, repetable false, manquable false | `outils/missions/missions.json` → `missions` | missions/premier-contrat-repetition.html : « Récompense 25 000 $, Officiel » + adresse ; « Durée 15 min, Mesuré et vérifié » + relevé ; « Jouée avec Jason et Lucia » | activité `mission-premier-contrat-repetition` : une fois, ordre 1, chapitre 1, statut verified (le plus faible des deux) |
| Mission d’histoire à conditions « Gros coup » : récompense 400 000 $ (media, deux sources, fourchette 350 000 à 450 000, note), durée 45 min (estimated, 35 à 60), coût 10 000 $ (official), préparation 20 min (estimated), part 50 % (official), argent à avoir 150 000 $ (media, deux sources), rang 3 (community), après « Premier contrat » | idem, `deblocage.argentMinimum`, `deblocage.rang`, `deblocage.missions` | « 400 000 $ (de 350 000 à 450 000 $), Vu dans un média (selon les objectifs réussis) » + les deux adresses ; « 45 min (de 35 à 60 min), Estimation » ; « Argent à avoir 150 000 $, Vu dans un média, en poche, sans le dépenser » + sources ; « Rang demandé 3, Communautaire » + wiki | `minCash` 150 000, `minRank` 3, `requiresMissions`, `cost`, `share`, `prep`, fourchettes et sources dans `fieldMeta` ; statut estimated |
| Mission secondaire « Livraison » : 8 000 $ (community, 6 000 à 10 000), 10 min (comm), attente 5 min (estimated), repetable true | idem, type `secondaire` | « 8 000 $ (de 6 000 à 10 000 $), Communautaire » ; « Attente avant de la refaire 5 min, Estimation » | se refait ; statut community |
| Activité « Braquer un commerce » : gain 3 000 $ (estimated, 1 500 à 5 000, note), durée 5 min (estimated), attente 10 min (presse = media, deux sources) | `outils/activites/activites.json` → `rapporte` | « 3 000 $ (de 1 500 à 5 000 $), Estimation (selon le commerce) » ; « Attente avant de recommencer 10 min, Vu dans un média » ; « Sources des chiffres » | `activite-braquages-commerces` |
| Revenu passif « Stock 305 » : prix 250 000 $ (official) + purchasable ; revenu 2 000 $ (official) toutes les 48 min (official), plafond 20 000 $ (media, deux sources), condition | `outils/editorial.json` → `businesses` | « Prix publié : 250 000 $, Officiel, source : …, vérifié le 20 novembre 2026. » ; « Revenu publié : 2 000 $ toutes les 48 min de jeu, jusqu’à 20 000 $ en stock, Officiel. Condition : … » | `income` { 2 000, 48 min, plafond 20 000 } ; 2 500 $ par heure |
| Véhicule Albany Emperor 35 000 $ (official) | `outils/v-corrige.json` → `price` | puce « Prix publié : 35 000 $, Officiel », ligne « Prix en jeu », fiche documentaire avec source et date | prix de référence ; Léo : « 35 000 $ (Officiel, source : …, vérifié le 20 novembre 2026) » |
| Véhicule Albany Primo 22 000 $ (comm, 20 000 à 25 000) | idem | « Prix publié : 22 000 $ (de 20 000 à 25 000 $), Communautaire, source : … » | Léo : « 22 000 $ (Communautaire, de 20 000 à 25 000 $, source : …) » |
| Arme Girardi ES9 1 250 $ (media, deux sources, 1 000 à 1 500) | `armes-data.js` → `price` | « Prix publié : 1 250 $ (de 1 000 à 1 500 $), Vu dans un média, sources : A ; B, vérifié le … » | Léo : « 1 250 $ (Vu dans un média, de 1 000 à 1 500 $, sources : A ; B, vérifié le …) » |
| Munitions de pistolet 60 $ (estimated, une source, 50 à 80, note) | `outils/acquisitions.json` → une entrée `munitions` (ajout v8.04) | munitions/munitions-de-pistolet.html : « Prix dans GTA VI 60 $ (de 50 à 80 $), Estimation » et la phrase du prix avec la note | ligne de type « munition » du calculateur ; Léo répond avec le prix |
| Demeure « Chez Cal Hampton » 180 000 $ (verified) | `outils/editorial.json` → `residences` | « Prix publié : 180 000 $, Mesuré et vérifié, source : relevé en jeu, vérifié le … » | prix de référence |
| Planque « Le motel du premier trailer » 45 000 $ (media, 40 000 à 50 000) | `outils/editorial.json` → `hideouts` | « Prix publié : 45 000 $ (de 40 000 à 50 000 $), Vu dans un média, sources : A ; B » | Léo : prix, statut, fourchette, deux sources |
| Consommable café du matin 3 $ (officiel) ; tenue « Looks de Stock 305 » 120 $ (verified) ; coiffure en salon 45 $ (media, deux sources) ; tatouage bras 200 $ (comm, 150 à 250, note) ; personnalisation véhicule 900 $ (estimated) ; variante ES9 300 $ (presse) | `outils/catalogues/*.json` → `prix_gta6` | colonne GTA VI de la liste (« 45 $, Vu dans un média » + pastille), fiche complète (« Sources : A ; B, vérifié le … », « Note : selon la taille ») | Léo : « 45 $ (Vu dans un média, sources : A ; B, …) », « 200 $ (Communautaire, de 150 à 250 $, selon la taille, …) » |
| Règles d’argent : argent séparé (official), amende 500 $ (verified, 250 à 1 000), perte à la mort 10 % (media, deux sources), perte à l’arrestation 2 000 $ (community) | `calculateurs-activites.js` → `window.LK_CALC_REGLES` | « Mes hypothèses en plus » : « Déjà connu : … » | `rules()` avec statuts, fourchette, sources |

`node outils/donnees-publiees.cjs` : 0 erreur ; « Le site connaît 7 prix publiés (2 véhicules, 1 arme, 1 entreprise, 1 demeure,
1 planque, 1 munition ; 2 prix officiels) » ; 4 activités chiffrées ; une ligne chiffrée dans chacune des six listes.

## 2. Le business plan d’un début de partie (moteur du site, missions copiées comme le bouton « Ajouter cette mission » du business plan)

- Premier million depuis 0 $, rang 3 : atteint en 19 h 10 de jeu (1 150 min). « Premier contrat » à 0 min (ordre 1), puis
  livraisons et braquages répétés ; « Gros coup » (ordre 2) lancé à 190 min avec 154 000 $ en poche (150 000 demandés, non
  dépensés), il rapporte 200 000 $ (part de 50 %, frais 10 000 $) ; vérification indépendante du plan : juste.
- En parties de deux heures : atteint en 1 320 min. Sans rang écrit : « Gros coup » n’est pas lancé (la page demande le rang
  avant de calculer : « Écris ton rang… ») et le but est atteint en 1 345 min.
- Argent qui manque (« Gros coup » seule, 10 000 $ au départ) : « Il te faut encore 140 000 $ avant de pouvoir lancer « Gros coup
  (répétition fictive) » : elle demande d’avoir 150 000 $ en poche (cet argent n’est pas dépensé), tu en as 10 000 $. »
- Revenu passif : Stock 305 acheté avant le but (250 000 $, puis 2 500 $ par heure) : 1 425 min ; le même revenu en hypothèse
  (2 500 $ par heure, sans achat) : 1 090 min.
- `node outils/jour-j-controle.cjs` (ajout v8.04) donne ces résultats en une commande (phase 4, code final, données fictives
  régénérées) :
  - `--rang 3` : « But atteint en 19 h 10 de jeu, argent à la fin : 1 001 000 $ » ; étapes : « 0 min : fait « Premier contrat » »,
    « 15 min à 3 h 10 : répète « Livraison » × 12, « Braquer un commerce » × 11, argent ensuite : 154 000 $ », « 3 h 10 : fait
    « Gros coup » (une seule fois, avec au moins 150 000 $ en poche, non dépensés), argent ensuite : 344 000 $ », « 4 h 15 à 19 h 10 :
    répète … » ; « Missions de l’histoire dans l’ordre publié : oui » ; « Vérification indépendante du plan : juste » ; « Revenu
    passif « Stock 305 » (250 000 $, 2 500 $ par heure de jeu, plafond 20 000 $) : but en 23 h 45 en l’achetant, 19 h 10 sans lui » ;
    « « Gros coup » seule, depuis 0 $ : Il te faut encore 150 000 $ avant de pouvoir lancer « Gros coup » … tu en as 0 $ » ; code 0.
  - sans `--rang` : 22 h 25, et « Attention : « Gros coup » demande le rang 3 ; sans --rang, le plan la laisse de côté ».
  - `--rang 3 --partie 120` : « 22 h 00 de jeu, soit 11 parties de 120 min », une ligne par partie (« partie 3 : fait « Gros coup » ;
    répète … »).
  - `--depart 10000 --rang 3` : 18 h 55 ; « Il te faut encore 140 000 $ … tu en as 10 000 $ ».
  - Plus de douze missions et activités chiffrées : le plan en prend douze, comme la page (les missions de l’histoire dans l’ordre,
    puis les activités les plus rentables), et le dit.

## 3. Léo et le prix d’une fiche

Répond avec prix, statut, fourchette, sources et date : véhicules (Emperor, Primo), arme (« combien coûte le Girardi ES9 ? »),
planque (« combien coûte le motel du premier trailer ? »), munitions, coiffure, tatouage. Deux questions partent ailleurs (Léo,
pas les formats) : « combien coûte Stock 305 ? » reçoit le texte rédigé sur Stock 305 (édition Ultimate) et « prix de chez Cal
Hampton » renvoie au personnage Cal ; « combien coûte l’ES-9 ? » (avec un tiret) parle du prix du jeu. Le prix est bien dans
l’index de Léo (leo/monde.json) pour ces fiches.

## 4. Ce qui passait, ce qui bloquait, ce qui passe maintenant

Bloquait avant ces ajouts (v8.03) : un chiffre de deux médias (aucun statut : « verified » ou « official » auraient menti), un
chiffre de wiki dans les missions, les activités et les listes, toute fourchette ou note (`additionalProperties: false` du
schéma, champs ignorés ailleurs), une deuxième source, le prix d’une munition (aucune place ni affichage), la traduction du statut
d’un prix dans Léo (champ non traduit), plusieurs textes et phrases des fiches qui n’apparaissent qu’avec des données (sans
traduction). Passait déjà : prix officiels ou relevés d’un véhicule, d’une arme, d’une entreprise, d’une demeure, d’une planque,
missions et activités officielles, revenus, règles d’argent (v8.02, v8.03).

Passe maintenant : tout le tableau du § 1. Refusé comme il faut : la génération s’arrête (code 1) et dit pourquoi, en clair
(`rep/refus-*.txt` ; messages exacts) :

| Donnée mal écrite | Message |
|---|---|
| « media » avec une seule source (récompense d’une mission) | `Gros coup : recompenses.argent : « media » demande au moins deux sources concordantes (source et sources) ; avec une seule, le statut est « estimated »` |
| fourchette qui n’encadre pas la valeur | `… : la valeur (moyenne ou la plus courante) doit être entre min et max` |
| « community » sans source | `Livraison : recompenses.argent : une valeur « community » exige source et verifiedAt (AAAA-MM-JJ)` |
| « official » sans date | `Premier contrat : recompenses.argent : une valeur « official » exige source et verifiedAt (AAAA-MM-JJ)` |
| ligne de liste « media » à une source | `coiffures « Coupe en salon » : prix_gta6 : « media » demande au moins deux sources concordantes …` |
| munition inconnue | `Munition inconnue : <id> (identifiants de outils/hubs-editoriaux.json, armes.munitions.items ; pas de ref)` |
| véhicule « media » à une source | `véhicule « Primo » : « media » demande au moins deux sources concordantes …` |
| règle d’argent à fourchette inversée | `LK_CALC_REGLES.amende : fourchette : min doit être plus petit que max` |

## 5. Tests, traductions, régénération complète

Phase 4 (21 octobre, 07 h 24 à 09 h 42, code final ; `repetition4.sh`, `repetition4b.sh`, résultats dans `rep4/`) : copie neuve
de `/home/claude/jourj`, données fictives injectées, puis exactement les commandes du jour J.

- **Régénération complète** (`outils/regenerer.cjs`) : la première passe a été tuée par manque de mémoire (une autre tâche
  tournait en même temps : à lancer seule, 4 Go) ; la passe complète suivante va jusqu’au bout et s’arrête sur « Index Léo à
  régénérer : outils/leo-index-manifest.json » (les nouvelles fiches changent les compteurs des pages lues par Léo, comme en
  phase 3) ; **la passe d’après finit sans erreur (code 0)**. D’où la consigne du prompt : relancer une fois.
- `node outils/calculateur-inventaire.cjs` : « Inventaire écrit : 629 contrôles … 0 erreur(s) JS » (le test CALC-01 passe ensuite).
- `node outils/donnees-publiees.cjs` : code 0, aucune erreur de forme ; `jour-j-controle.cjs` : § 2 ; Léo : § 3 (la munition
  répond « Prix publié sur la fiche de la munition, avec sa source et sa date » au lieu de « collection annoncée »).
- **Traductions des pages produites** (`check-trad-pages.cjs` sur 28 pages : fiches, hubs, listes, calculateur, accueil, À
  propos) : 0 repère cassé, 0 conflit ; manques : seulement les textes fictifs (noms, résumés, notes, conditions, libellés de
  sources) et les manques d’aujourd’hui que cet outil ne sait pas juger (attributs `@content`, pages par élément), aucun autre ;
  l’extraction du site (`langues.cjs --extraire`) ne liste plus que des données fictives (22 textes en anglais, 25 à 26 ailleurs ;
  la phrase portugaise « Les missions de ce type déjà documentées… », seule autre, est ajoutée depuis). Le jour J, il ne restera à
  traduire que les textes des données (`jour-j-donnees.json`).
- **Référence v8.01** : 851 résultats, 0 écart, données publiées comprises (lecture « sans publication »).
- **Tests avec les données** (51 fichiers de `tests-liste.txt`, `SITE_ROOT` = copie) : tous passent, sauf un contrôle de
  `section-missions` qui supposait le fichier du calculateur sans activité publiée : corrigé (« aucune mission inventée », comme
  les autres), il passe avec et sans données.
- Marque `fictif-repetition-jourj` dans `/home/claude/jourj` : 0 fichier.

Ce que la répétition a fait corriger ou ajouter (tous des ajouts, rien ne change sans donnée) : accords des phrases comptées
(« 1 prix publié … avec sa source », jamais « 0 prix publié », dernière ligne « à confirmer » au singulier, plus de mention quand
il n’en reste aucune), « NaN $ » d’une page d’achat de munition (la munition n’a plus de page d’achat, sa fiche porte le prix),
preuve de Léo d’une munition, traduction de chaque phrase fabriquée autour des données (phrases comptées, réponses `textKnown`
et `statusKnown` de Léo, compte à rebours, fil d’Ariane d’une mission, listes d’adresses), tests « aucun chiffre inventé »
(listes, Léo, activités, missions), sortie de `jour-j-controle.cjs` (étapes résumées, rang manquant, revenu passif, parties,
douze missions au plus comme la page).

Sans données (`/home/claude/jourj`, pages pas encore régénérées) : 33 fichiers de tests passent, sauf 5 contrôles qui lisent des
pages régénérées (empreintes `?v=` et copies traduites des scripts, compteur d’À propos, projection de Léo) ; `check-trad-scripts`
sur les six scripts touchés : 0 manque, 0 conflit ; 224 pages : 0 nouveau manque, 0 repère cassé, 0 conflit (un manque
d’aujourd’hui résolu : « 1 arme » sur munitions/harpons.html) ; inventaire du calculateur à jour ; `calculateurs-check-ultime` 15 sur 16 (CALC-07 : empreinte posée par sync-site, copie non
régénérée), `v7871` 11 sur 11.

**Preuve avant/après sans donnée** (`avant-apres.sh`, `rep-avant-apres/`) : deux copies de `/home/claude/jourj`, l’une remise aux
sources de base (`$S/base-lot2`, empreintes de `base-outils.json` et `base-racine.json`), l’autre avec les ajouts v8.04, toutes deux
régénérées en entier, puis comparées fichier par fichier (repères de version `?v=` mis à part). Pages françaises : une seule
différence, le compteur de tests d’À propos (1 169 → 1 182, les 13 tests de `jour-j-v804`) ; Léo en français : les quatre gabarits
`priceSourcesLine` ajoutés ; langues : les copies traduites des scripts modifiés, les mêmes gabarits, et une différence non voulue
trouvée par cette preuve, l’entrée générique « 45 $ » de `v804-jour-j.json`, qui changeait les repères de la série d’aujourd’hui
(« from 20 $ to 450 $ » devenait « from $20 $ to $450 », « 4 965 $ » devenait « 4.965 $ » en allemand) : **retirée** (la case GTA VI
d’une liste porte toujours son statut, « 45 $, Vu dans un média », traduit par son motif). Après ce retrait, plus aucune
différence de page ne reste hors du compteur de tests (même analyse, aucune autre catégorie). Remarque : sans donnée aussi, la
première régénération complète d’une copie dont les pages ont bougé s’arrête sur « Index Léo à régénérer » ; c’est la même
consigne (relancer).
