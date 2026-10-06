# Calculateur : lot 4 — business plan, compréhension des demandes, interface constante

Ce document accompagne le lot 4 du cahier « Même interface, intelligence renforcée ». Il n'est chargé par aucune page.

## Repères

- **Base** : GitHub `main`, commit `9fc0813c`. Lots déjà faits, chacun en commit local sur la branche `calc` : lot 1 `7570c739`, lot 2 `1710f7f9`, lot 3 `e7e44b63`.
- **Lot 4** : livré ici, au-dessus du lot 3. Il contient aussi les corrections de la relecture contradictoire des lots 3 et 4 (§ 8), faite par un relecteur indépendant après la mise au point.
- **Périmètre** (cahier § 15, lot 4) :
  - plans étape par étape, explications issues du moteur, recalculs après des événements réels ;
  - les trois modes et chaque outil branchés sur les mêmes calculs, sans changer leur présentation ;
  - Léo et la saisie en langage naturel, seulement parce qu'ils existent déjà ;
  - réponses dynamiques vérifiées dans les langues présentes, textes fixes et agencements gardés.
- **Hors périmètre** : aucune page hors calculateur modifiée à la main ; aucun texte fixe, contrôle, `id`/`class`, style ni agencement modifié ; aucune donnée du jeu.
- **Points ouverts traités** (lot 2 § 8, lot 3 § 9) :
  - barre « Que veux-tu calculer ? » : « 200.000 » lu 200, nombres en lettres, corrections et négations, « le plus grand montant = prix », valeurs retenues jamais redites ;
  - recalcul après une partie notée : dérive de la prévision, mission « une fois » refaite, achat de départ repayé, « prévu » d'une partie entière comparé à une partie plus courte ;
  - carnet : une entrée illisible effacée à la sauvegarde suivante ;
  - égalité des trois modes, vérifiée outil par outil dans la page.
- **Reportés au lot 5** (audit) : voir § 9.

## 1. Fichiers touchés

- `calculateurs-hub.js` : lecture des phrases ; `LKCalcHub.interpret` ajouté, sans effet sur la page.
- `calculateurs-plan.js` : mise à jour après une partie.
- `calculateurs-notebooks.js` : entrées illisibles gardées à part.
- Corrections de la relecture (§ 8) dans les fichiers du lot 3 : `calculateurs-engine.js` (remboursement « pour de bon »), `calculateurs-scenario.js` et `calculateurs-workspace.js` (phrases de Mon temps de jeu, Quoi acheter d'abord ?, Ça vaut le coup ? ; éditeur du point réel du plan).
- `outils/tests/calculateurs-lot4.test.cjs` : nouveau, 11 tests (T4-01 à T4-10, dont T4-04b).
- `outils/tests/calculateurs-lot3.test.cjs` : T3-12, T3-19 et T3-22 réécrits avec des valeurs calculées à la main ; T3-24 ajouté.
- `outils/langues/{en,es,it,de}/calculateur-lot4.json` : nouveaux, 35 phrases chacun et la liste `_scriptsJamais`, qui protège les morceaux de code de la traduction. `calculateur-lot3.json` en anglais, espagnol et italien : « Remboursement » ajouté.
- Ce rapport, le registre (§ 7) et le rapport du lot 3 (§ 11 et § 12).

## 2. Capacités ajoutées ou corrigées

1. **L4-1 — La barre « Que veux-tu calculer ? » comprend la phrase entière** (`interpret`, puis `route`).
   - **Nombres.**
     - « 200.000 » = 200 000 en français (avant : 200).
     - Nombres en lettres : « un million », « deux cent mille », « vingt-cinq mille », « quatre-vingt mille », « trois cent cinquante mille », « un million et demi », « un demi-million », « une heure », « une demi-heure », « deux heures et demie », « une heure et quart », « deux joueurs ». En anglais, espagnol, italien et allemand, un nombre composé en lettres (« twenty-five thousand ») n'est pas lu, plutôt que lu faux.
     - « 1h30 » = 90 min (avant : 60).
     - « milliard » (avant : non lu).
     - Un grand nombre sans unité (« 200 000 », « 1000000 ») ; une année (« 2026 ») n'en est pas un.
     - « 1 million 200 mille » = 1 200 000 ; « 3 millions et demi » = 3 500 000 ; « passer de 0 à … » (0 juste après « j'ai », « je pars de », « passer de », « je suis à » ; un autre petit nombre seulement s'il est suivi de « dollars » : « j'ai 2 voitures », « à 2 missions » ne sont pas de l'argent).
     - Une heure de la journée (« à 21h30 ») n'est pas une durée ; une durée « par semaine » n'est pas lue comme une durée par jour ; « 50 000 $ en une heure » est un gain par heure. *Lot 5 (seconde relecture) : cette règle ne couvrait ni « à 20 heures », ni « de 20 h à 22 h », ni « a las 9 h », et « en une heure par jour » devenait un gain par heure ; corrigé, voir `CALCULATEUR-LOT5.md` § 2.*
   - **Rôles.** Chaque montant prend le rôle des mots juste avant lui :
     - ce que tu as (« j'ai », « j'en ai », « je n'ai que », « je possède », « il me reste », « je suis à », « avec », « … en poche », « … en banque », « au départ », et un montant sans autre rôle dans la même phrase que « j'ai » : « j'ai 2 heures par jour et 100 000 $ ») ; jamais « j'ai besoin de », « j'ai perdu », « j'ai dépensé », « une dette de », ni un montant négatif ;
     - ce que tu vises (« je veux », « objectif », « atteindre », « arriver à », « il me faut », « besoin de »…) ;
     - ce qui te manque (« il me manque 800 000 $ ») ou ce que tu veux en plus (« 1 000 000 $ de plus ») : le but devient ton argent plus ce montant, seulement si ton argent est écrit, et c'est dit (« objectif = ton argent + ce qui te manque ») ;
     - ni argent, ni but, ni prix : un montant suivi de « de frais », « de dettes », « par mois », « par partie », « mis de côté »…
     - un prix (« à », « pour », « coûte », « prix »…) ;
     - un gain par heure (« … par heure », « de l'heure », « /h »).
     - Avant : le plus grand montant de la phrase devenait le prix ou le but, même quand c'était l'argent du joueur.
   - **Corrections et contradictions.**
     - Après un mot de correction (« non », « pardon », « plutôt », « en fait », « enfin »…), le montant suivant remplace le précédent, et c'est dit, à condition que rien d'autre que ces mots ne sépare les deux montants. « mais » n'est pas une correction (« j'ai 300 000 $ mais il me faut 1 million »).
     - « et non 50 000 $ », « pas 1 million » : ce montant est écarté, le précédent reste.
     - Deux montants pour la même chose sans correction : le dernier est gardé, et c'est dit.
   - **Négation.** « je n'ai rien », « je n'ai plus rien », « je pars de zéro » : 0 $, rempli et redit, jamais en silence.
   - **Joueurs, échéance, temps disponible.**
     - « je joue seul », « en solo », « 4 joueurs », « on joue à trois », « avec 2 amis » vont dans la case existante du nombre de joueurs. « Le seul achat » n'est pas lu comme « seul ». « Je ne joue pas en solo » n'est pas « solo » ; deux nombres différents (« solo ou à 4 joueurs ») : rien n'est rempli.
     - « d'ici 10 jours », « en 30 jours » vont dans l'échéance existante ; « en -3 jours » n'est pas lu.
     - « j'ai 3 heures » ouvre Mon temps de jeu ; « 45 minutes par jour » reste un temps par jour.
   - **Outil ouvert.**
     - Le business plan passe d'abord (« business plan », « un plan pour… », « d'ici / en / dans N jours »).
     - « m'offrir », « me payer », villa, yacht, jet… ouvrent Mes achats.
     - « million » ouvre Mon objectif, sauf si la phrase parle d'un prix ou d'un achat (« un bateau coûte 1,2 million » → Mes achats). « je ne comprends pas », « y compris » n'ouvrent plus Mes achats (le mot d'achat espagnol et italien « compr… » est limité à ses formes).
   - **Réponse de la barre.**
     - Les valeurs retenues sont redites : « ton argent est rempli (300 000 $) ».
     - « j'ai pris le montant corrigé » ; « deux montants pour ton argent : j'ai gardé le dernier ».
     - En, es, it et de : mêmes règles avec leurs mots (nombres, corrections, négation, joueurs, gain par heure, échéance). *Lot 5 : hors du français, la négation comptait aussi au milieu d'une proposition (« nothing to buy » donnait 0 $) ; corrigé, voir `CALCULATEUR-LOT5.md` § 2.*
2. **L4-2 — Business plan : recalcul après une partie notée.**
   - Une mission « une fois » faite pendant la partie est cochée « faite » ; l'achat de départ d'une mission faite est compté payé. Le recalcul égale alors un plan neuf initialisé dans le même état (§ 14, condition 4). Avant : la mission comptait encore, et l'achat de départ se repayait.
   - **Prévision de la partie.** Le plan repart de l'argent écrit à chaque mise à jour : la prévision se lit donc aux minutes jouées de cette partie. Avant, elle se lisait au temps cumulé depuis le début, ce qui dérivait dès la deuxième mise à jour.
   - **« Prévu » du bilan.** Il couvre le même temps que le « réel » (*lot 5 : en parcours avec un gain par heure, il disait « +0 $ » ; corrigé, voir `CALCULATEUR-LOT5.md` § 2*) : argent prévu à ces minutes − argent de départ + achats d'avant que le plan payait pendant ce temps. En parties, l'argent prévu part de l'argent après les achats d'avant-partie et ajoute le gain de la partie au prorata des minutes jouées. Avant : le gain d'une partie entière, même pour une partie plus courte. Un écart nul se dit « Pile comme prévu » (avant : « Tu es en avance », écart « +0 $ »).
   - **Courbe « Prévu ».** Elle part de ton argent actuel, au temps déjà joué : le dernier point réel tant qu'il n'a pas été retiré. Corriger la dernière partie avec l'éditeur du point réel fait repartir le plan de cet argent et de ce temps ; retirer un point ne change que l'historique, comme le dit son message.
3. **L4-3 — Carnets.** Une entrée illisible n'est plus effacée à la sauvegarde suivante.
   - Elle est copiée telle quelle dans `lk-calculator-notebooks-v3-illisibles`, en ajout à ce qui s'y trouve. Si l'appareil est trop plein pour cette copie, l'entrée reste telle quelle dans la clé principale (comme avant le lot 4), et l'enregistrement se fait quand même.
   - L'avertissement existant (« … laissé de côté ») reste vrai.
   - Même logique que la copie `-backup` d'un carnet entier illisible, déjà présente.
4. **L4-4 — Trois modes.** Simple, Pas à pas et Expert donnent la même réponse, texte et résumé, pour les 9 outils sur le même état (T4-06). Le moteur était déjà commun (`calculateurs-v749`) ; c'est maintenant vérifié dans la page.
5. **L4-5 — Langues présentes.** Les réponses de la barre sont traduites (`calculateur-lot4.json`). La lecture des phrases est vérifiée sur les copies générées en, es, it et de (T4-03). Les tests de langue existants (`langues.test.cjs`, aucune phrase française dans la réponse du hub) passent.
6. **L4-6 — Léo, non modifié.**
   - Léo appelle le même moteur. Son transfert vers le calculateur (`leo-link.js`) est déjà validé et testé (CALC-11 : demande validée, appliquée sans perte, retour vérifié).
   - Différence assumée : pour « 200.000 » seul, Léo demande l'unité (« Séparateur ambigu »). La barre du calculateur lit 200 000 $ et le redit. Aucune des deux ne garde une valeur en silence.

## 3. Matrice de couverture du lot 4

| Exigence (cahier) | Critère | Logique | Fichier | Test | Résultat (à la main) | Statut |
|---|---|---|---|---|---|---|
| Variantes locales de nombres | « 200.000 », lettres, 1h30, milliard | `toNumber`, `wordsToDigits`, `parseMinutesPerDay` | hub | T4-01, T4-03 | 200 000 ; 1 000 000 ; 90 min ; 1 000 000 000 | fait |
| Montants, durées, objectifs, préférences | rôles, joueurs, gain par heure, échéance | `interpret` | hub | T4-01 | 88 phrases (3 corpus) | fait |
| Reformulation → état équivalent | 9 façons de dire 200 000 / 1 000 000 | `interpret` | hub | T4-01 | un seul état | fait |
| Correction d'un montant | « non », « plutôt », « en fait »… | correction | hub | T4-01, T4-02, T4-03 | 300 000 retenu et dit | fait |
| Négation | « je n'ai rien » | `BROKE` | hub | T4-01, T4-02 | 0 $ dit | fait |
| Changement d'objectif, dernier calcul | phrase suivante | `route` | hub | T4-02 | but 2 000 000 ; durée seule changée | fait |
| Contradiction | deux montants, même rôle | `contradictions` | hub | T4-01, T4-02 | « j'ai gardé le dernier » | fait |
| Paramètres redits | valeurs retenues | `route`, `answer` | hub | T4-02 | « (300 000 $) » | fait |
| Recalcul après une partie | = plan neuf, même état | `logSession` | plan | T4-04 | mission « une fois » faite ; achat de départ payé | fait |
| Prévision sans dérive | prévu à « mins » | `logSession` | plan | T4-04 | partie 2 lue à 1 h, pas à 2 h | fait |
| Données gardées | entrée illisible | `load`, `persist` | carnets | T4-05 | gardée à part | fait |
| Trois modes | même réponse | — | page | T4-06 | 9 outils identiques | fait |
| Langues présentes | réponses dynamiques | dictionnaires | langues | T4-03, T4-08 ; `langues.test` | 0 texte sans traduction | fait |
| Rien de faux en silence | 43 phrases pièges (relecture) | `interpret`, `mentions`, `parseMinutesPerDay`, `parsePlayers` | hub | T4-07 | 43 justes (6 avant correction) | fait |
| Quatrième corpus neuf | 30 phrases écrites avant la mesure | `interpret`, `route` | hub | T4-07 | 30 justes (§ 4) | fait |
| Partie courte avec achat au départ | prévu = réel | `logSession` | plan | T4-04b | +50 000 $ et +50 000 $, « Pile comme prévu » | fait |
| Correction d'un point réel | le plan repart de la dernière partie corrigée | éditeur du point | plan | T4-09 | 300 000 $ à 1 h 40 | fait |
| Appareil plein | l'enregistrement réussit, rien n'est perdu | `persist` | carnets | T4-10 | entrée gardée dans la clé principale | fait |

## 4. Taux d'interprétation de la barre (mesuré)

Une phrase compte comme comprise quand l'outil ouvert et toutes les valeurs attendues (écrites à la main) sont justes. La mesure se fait sur la page, par la barre réelle. C'est une mesure sur trois corpus définis, pas une mesure générale d'intelligence ; la barre est un lecteur de règles, pas un modèle d'IA.

| Corpus | Base `9fc0813c` | Lot 4 |
|---|---|---|
| 1 — 43 phrases de développement | 24 (56 %) | 43 (100 %) |
| 2 — 20 phrases écrites après les premières règles | 5 (25 %) | 11 (55 %), puis 20 (100 %) après les règles générales qu'il a montrées |
| **3 — 25 phrases écrites après l'implémentation, mesurées sans y toucher** | **8 (32 %)** | **14 (56 %)** ; 25 (100 %) après les règles générales qu'il a montrées (il n'est alors plus neuf) |

**Mesure à retenir** : 56 % sur le corpus 3 neuf, contre 32 % pour la base. Elle contient l'exemple du cahier (« J'ai 200 000, je joue 45 minutes le soir, je suis solo et je veux atteindre un million… »), compris dès cette mesure. Le 100 % final porte sur des phrases qui ont servi à écrire les règles.

**Erreurs bloquantes du corpus 3, avant correction** (toutes corrigées ensuite par des règles générales, pas phrase par phrase) :
1. « Je suis à 120 000 $ » : l'argent n'était pas lu.
2. « passer de 0 à 500 000 $ » : 0 n'était pas un montant.
3. « 1 million 200 mille » : lu 1 000 000.
4. « m'offrir une villa à 1,8 M avec 1,5 M en banque » : Mon objectif au lieu de Mes achats.
5. « j'ai une heure devant moi » : Mon objectif au lieu de Mon temps de jeu.
6. « un plan pour acheter un yacht » : Mes achats au lieu du business plan.
7. « je n'ai plus rien » : pas lu comme 0 $.
8. « on joue à trois » : joueurs non lus.
9. « j'ai 2 heures par jour et 100 000 $ » : l'argent n'était pas lu.
10. « dans 15 jours » : pas le business plan.
11. « 3 millions et demi » : lu 3 000 000 et Mon objectif au lieu de Mes achats.

Les trois corpus sont dans T4-01 (non-régression).

**Relecture contradictoire et quatrième corpus (après la mise au point).** Le relecteur a écrit 28 phrases françaises nouvelles, choisies pour piéger la barre (faux positifs). Sur ces phrases, la base écrivait une valeur fausse pour 2, la barre du lot 4 pour 27 : chaque règle ajoutée pour comprendre plus de phrases lisait aussi de l'argent ou une correction là où il n'y en avait pas (§ 8). Après correction, les 43 phrases pièges (38 écrites par le relecteur, dont ces 28, et 5 ajoutées de la même famille) sont justes (T4-07).

Un quatrième corpus de 30 phrases a ensuite été écrit avant d'être passé, sans servir à régler les règles :

| Corpus | Base `9fc0813c` | Lot 4 corrigé |
|---|---|---|
| **4 — 30 phrases neuves, écrites avant la mesure** | **12 (40 %)** | **28 (93 %)** à la première mesure ; 30 (100 %) après une règle générale |

Des 2 échecs de la première mesure, l'un venait du script de mesure (une case inchangée mal relue) et l'autre était un vrai manque (« une heure et quart ») ; la règle des quarts d'heure a été ajoutée ensuite pour les cinq langues. **Mesure à retenir : 93 % sur le corpus 4 neuf, contre 40 % pour la base.** Ce corpus est désormais dans T4-07 (non-régression) ; il n'est donc plus neuf. *Lot 5 : ce corpus a été écrit par le même rédacteur que les règles. Deux corpus plus durs, écrits à l'aveugle par d'autres rédacteurs, sont mesurés dans `CALCULATEUR-LOT5.md` § 3.*

## 5. Scénarios avant / après

| Phrase | Avant | Après |
|---|---|---|
| « j'ai 200.000 $ et je vise 1.000.000 $ » | argent 200 $ | argent 200 000 $, but 1 000 000 $ |
| « j'ai 200 000 $, non 300 000 $, et je veux 1 million » | argent 200 000 $ | argent 300 000 $, « j'ai pris le montant corrigé » |
| « je n'ai rien et je veux 1 million » | argent inchangé (200 000 $ de l'exemple) | 0 $, dit |
| « J'ai 500 000 $, je veux acheter une voiture à 200 000 $ » | prix 500 000 $ | prix 200 000 $, argent 500 000 $ |
| « deux heures par jour, objectif un million » | rien rempli | 2 h par jour, but 1 000 000 $ |
| « un bateau coûte 1,2 million, j'ai 900 000 $ » | Mon objectif, but 1 200 000 $ | Mes achats, prix 1 200 000 $ |
| Plan : deuxième mise à jour d'une partie de 60 min | prévision lue à 2 h | lue à 1 h (même plan) |
| Plan : « Coup unique » fait pendant la partie | encore compté dans le plan | coché « faite », plan égal à un plan neuf |
| Carnet avec une entrée illisible, puis « Enregistrer » | entrée effacée | entrée gardée à part |
| « J'ai 300 000 $ mais il me faut 1 million » | lot 4 avant relecture : argent 1 000 000 $, « Bravo, tu as déjà assez d'argent » | argent 300 000 $, but 1 000 000 $ |
| « J'ai besoin de 500 000 $ pour acheter une villa » | lot 4 avant relecture : argent 500 000 $, « Oui, tu peux l'acheter » | prix 500 000 $, argent inchangé |
| « Je joue deux heures et demie par jour » | lot 4 avant relecture : 120 min | 150 min |
| Plan : partie de 30 min au rythme du plan, achat de 80 000 $ payé au départ | lot 4 avant relecture : prévu +90 000 $, « Tu as gagné moins que prévu » | prévu +50 000 $, réel +50 000 $, « Pile comme prévu » |
| Ça vaut le coup ? : nouvelle activité, scénario I sur 4 h 10 | lot 3 : « Remboursé après 4 h » et « Pas sur 4 h 10 » | « Remboursé après 4 h 15 » et « Pas sur 4 h 10 » |

## 6. Zones dynamiques dont le contenu change, phrases nouvelles

- **Barre « Que veux-tu calculer ? »** (`#calc-ask-out`, déjà présent) : valeurs entre parenthèses, notes de correction et de contradiction, échéance, joueurs, gain par heure. Les cases remplies sont les cases existantes de l'outil ouvert.
- **Business plan** :
  - valeurs « Prévu » et « Écart » du bilan existant ;
  - points de la courbe existante ;
  - état des missions et des achats de départ (radios existantes « Où j'en suis »).
- **Corrections de la relecture** : réponses de Ça vaut le coup ? (achat payable seulement après le temps d'usage, équilibre puis remboursement pour de bon), de Quoi acheter d'abord ? (tout payable tout de suite, achat payé avec le suivant, nombre d'ordres comparés), de Mon temps de jeu (ligne « Recherche complète » retirée, § 8) ; chiffre « Remboursé après » ; tableau « Avec ou sans cet achat ».
- **Phrases nouvelles** : `outils/langues/{en,es,it,de}/calculateur-lot4.json` ; 0 texte sans traduction en en, es, it, de (vérifié aussi par un contrôle à part des textes ajoutés depuis la base, qui a trouvé « Remboursement », § 8).

## 7. Preuves que l'interface est conservée

- **Cadre** (`outils/calculateur-cadre.cjs`) : identique à l'état figé avant le lot 1 (150 vues, 22 275 lignes, styles identiques).
- **Inventaire des textes fixes** (`outils/calculateur-inventaire.cjs --check`) : à jour, sans régénération.
- **Captures** : 108 vues (fr et de ; 1 280 et 390 px ; 9 outils ; 3 modes), cadre seul, identiques à la base ; 36 vues de référence identiques à la base (§ 11).
- **Hors calculateur** : empreintes `?v=` (pages, Léo, `leo.css`) et compteur automatique « tests automatisés écrits » de la page À propos (5 langues), de 828 à 840. Les dates du plan du site sont remises, sauf celles des pages qui changent.

## 8. Relecture du lot (audit, corrigé avant la recette)

1. Prévu du bilan : la minute d'achat d'un achat d'avant est comptée dans sa partie ; il faut la remettre en temps joué. Trouvé par `calculateurs-astra` (prévu 200 000 au lieu de 100 000) et corrigé.
2. « seul » lu partout (« le seul achat » → 1 joueur) ; « solo » en espagnol veut aussi dire « seulement » : motifs resserrés (« je joue seul », « en solo », « juego solo »).
3. Allemand : « … und habe 400.000 $ » (sans « ich ») n'était pas lu comme ton argent : ajouté.
4. Échéance : « plan-days » est le nombre de jours par semaine, pas une échéance ; la bonne case est « plan-deadline ».
5. Test des carnets rendu déterministe : le bouton « Enregistrer » est cliqué, l'entrée est cherchée dans la clé à part.

**Relecture contradictoire des lots 3 et 4** (relecteur indépendant, sondes et attendus écrits à la main, après la mise au point). 21 défauts confirmés, tous corrigés ici :

- **Barre de saisie** (lot 4) :
  - H1 : « mais » pris pour une correction ; « et non X » lu à l'envers. Retiré ; correction seulement quand rien d'autre ne sépare les deux montants ; « et non X » écarte X.
  - H2 : argent lu dans « j'ai besoin de », « j'ai perdu », « une dette de », « -50 000 $ », « avec 30 000 $ de frais », « j'ai 2 voitures », « 5 ou 6 heures ». Règles restreintes.
  - H3 : « je n'ai plus rien à acheter », « sans argent de côté » lus 0 $. Motifs ancrés.
  - H4 : « deux heures et demie » lu 120 min ; « vingt-cinq mille » lu 5 000 ; « 50 000 $ en une heure » lu comme 1 h par jour. Heures en lettres converties avant les demies ; nombres composés lus en entier en français, laissés de côté ailleurs.
  - H5 : « à 21h30 » lu comme 1 290 min. Les heures de la journée ne sont plus des durées.
  - H6 : « je ne comprends pas », « y compris » ouvraient Mes achats. Mot d'achat limité à ses formes.
  - H7 : « deux montants pour undefined ». Nom du rôle ajouté.
  - H8 : « je ne joue pas en solo, on est 4 » lu 1 joueur. Négation et ambiguïté traitées.
- **Business plan** (lot 4) :
  - P1 : « prévu » faux pour une partie courte avec un achat payé au départ. Prévision à partir de l'argent après ces achats.
  - P2 : courbe « Prévu » décalée après une correction du dernier point. La correction fait repartir le plan ; le rapport dit maintenant ce que fait un point retiré.
- **Carnets** (lot 4) : N1 : une grosse entrée illisible empêchait tout enregistrement. Copie à part dans son propre essai.
- **Lot 3** :
  - L1 : « Recherche complète » contredisait la note existante « Il en existe peut-être un encore meilleur ». Ligne retirée de l'écran ; la garantie reste dans le moteur (T3-07) et dans le rapport du lot 3.
  - L2 : « aucun de ces achats ne fait gagner plus vite » quand tout est payable tout de suite. Phrase seulement quand c'est vrai.
  - L3 : « Payé en même temps que le suivant… » sans attente. Seulement s'il y a eu une attente.
  - L4 : achat montré « payé après 2 h » sur 1 h d'usage. Colonne « pas acheté en 1 h », gain d'avant, phrase sans achat.
  - L5 : « Remboursé après 4 h » avec « Pas sur 4 h 10 ». Le remboursement est l'instant à partir duquel l'achat reste devant pour de bon (4 h 15), vérifié par T3-24 sur 300 cas avec une simulation écrite à part ; la fenêtre simulée se règle sur le gain en plus du gain d'avant. *Lot 5 (seconde relecture) : cette règle contredisait la réponse « Oui » quand l'achat était devant à la fin du temps d'usage, et montrait encore le premier passage quand la différence ne se stabilise pas ; règle revue, voir `CALCULATEUR-LOT5.md` § 2.*
  - L6 : « Remboursement » non traduit en anglais, espagnol et italien. Traduit ; l'outil de langues ne signale pas un mot isolé déjà présent ailleurs dans les traductions : un contrôle à part des textes ajoutés depuis la base l'a confirmé seul en cause.
  - L7 : « 4 ordres côte à côte » comptait « Rien avant la fin ». Plus compté.
  - L8 : le graphique avec / sans l'achat n'est pas dessiné quand le moment d'achat est inconnu (la base le dessinait comme si l'achat était payé au départ). Différence attendue : rien n'est inventé.
- **Tests** : T4-04 et T3-19 tiraient leurs attendus du code testé ; réécrits avec des valeurs calculées à la main (T4-04b ajouté pour P1).
- **Rapports** : affirmations corrigées (« deux heures et demie », « par semaine », courbe « Prévu », « 0 texte sans traduction » du lot 3).
- **Défauts déjà présents dans la base, corrigés ici** : « il me manque 800 000 $ » lu comme un but de 800 000 $ ; « 1 000 000 $ de plus » pas lu comme relatif ; « Tu es en avance » pour un écart nul.

## 9. Limites restantes

- **Barre de saisie.**
  - Un seul montant par rôle ; plusieurs prix dans une phrase (comparateur) ne remplissent rien d'autre que l'outil.
  - Les exclusions (« sans acheter de voiture ») ne sont pas lues. Une durée « par semaine » n'est pas convertie en durée par jour : rien n'est rempli.
  - Un montant « mis de côté », des « dépenses par partie » ou des « frais » ne sont pas reportés dans leurs cases (réserve, dépenses par partie) : ils sont seulement écartés de l'argent, du but et du prix.
  - « il me manque X » ou « X de plus » sans ton argent dans la phrase : rien n'est rempli.
  - Hors du français, un nombre composé en lettres (« twenty-five thousand ») n'est pas lu.
  - Un mot de rôle trop loin du montant (plus de 40 caractères) n'est pas vu.
  - La barre est un lecteur de règles : ses taux ne valent que pour les corpus mesurés (§ 4).
- **Léo** : non modifié (§ 2, L4-6).
- **Plan.** La mise à jour suit ce que le joueur écrit : argent, missions faites, achats cochés. Un achat d'avant en cours d'obtention n'est pas déduit du temps joué ; il reste à cocher dans « Où j'en suis ». Dans une partie, le « prévu » répartit le gain de la partie sur ses minutes (les gains des missions arrivent en réalité à leur fin).
- **Remboursement d'une nouvelle activité.** *Remplacé au lot 5.* Le lot 4 disait : « pour de bon » dans la fenêtre simulée, sinon le premier passage à l'équilibre. Ce repli montrait un remboursement pour un achat jamais remboursé, et la fenêtre n'était pas une garantie. Règle actuelle : `CALCULATEUR-LOT5.md` § 2.
- **Carnets.** Les entrées illisibles gardées à part ne sont pas montrées à l'écran, faute de zone existante ; elles restent dans le navigateur.

## 10. Migration des sauvegardes

- **Nouvelle clé** : `lk-calculator-notebooks-v3-illisibles`, écrite seulement s'il existe une entrée illisible et s'il reste de la place. Aucun schéma changé ; `modelVersion` 2 inchangé (voir lot 3 § 10).
- **Différences de résultat attendues — correction, pas régression** :
  - la barre remplit d'autres valeurs pour certaines phrases (§ 5) ;
  - à partir de la deuxième mise à jour, la prévision et le « prévu » du bilan changent ;
  - une mission « une fois » faite et l'achat de départ payé sortent du plan ;
  - « Remboursé après » d'une nouvelle activité peut être un peu plus tard qu'au lot 3 (instant où l'achat reste devant pour de bon ; au lot 5, jamais plus tard que le temps d'usage quand l'achat y est devant) ;
  - quelques phrases de Ça vaut le coup ?, Quoi acheter d'abord ? et Mon temps de jeu changent (§ 8, lot 3).

## 11. Recette de clôture

Le 6 octobre 2026, sur la branche `calc` : régénération complète, extraction des quatre langues, puis les contrôles ci-dessous. Moteur automatisé : Node 22 et jsdom, Chromium 141 piloté par Playwright pour les captures. Aucun appareil réel.

| Contrôle | Résultat |
|---|---|
| Suite `node --test outils/tests/*.test.cjs` | 922 réussis sur 922 (910 au lot 3, plus 11 tests T4 et T3-24) |
| Outil de langues (`--extraire en / es / it / de`) | 0 texte sans traduction ; contrôle à part des étiquettes : toutes traduites (« Options » s'écrit pareil en anglais et en allemand) |
| Causalité CALC-02 | 139 conformes sur 139, 0 écart |
| Inventaire (`--check`) | à jour |
| Cadre | identique : 150 vues, 22 275 lignes, styles identiques |
| 108 captures, cadre seul | identiques à la base, 0 erreur JavaScript |
| 36 captures de référence | 0 erreur JavaScript ; identiques à la base (voir ci-dessous) |
| Barre de saisie | 88 phrases des corpus 1 à 3, 43 pièges, 30 phrases du corpus 4 : toutes justes ; 25 pièges dans les autres langues : tous justes |
| Compteur « tests automatisés écrits » (À propos, 5 langues) | 828 → 840 |

**36 captures.** Avec l'outil de capture du lot 3, une vue différait (« Ça vaut le coup ? », Pas à pas, 390 px) : même artefact qu'au lot 3 (`CALCULATEUR-LOT3.md` § 11). La capture pleine page fait défiler la page, et le script du mode Pas à pas réécrit la ligne « Question 1 sur 3 » après qu'elle a été vidée. L'outil de capture fige maintenant ce rafraîchissement pendant la capture « neutre », pour la base comme pour le lot : 36 vues identiques entre la base et le lot 4.
