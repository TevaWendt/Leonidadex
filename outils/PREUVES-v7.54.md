# Preuves de vérification — v7.54 (mission v7.48 → v7.52, revue de conformité v7.53, audits et restauration v7.54 ; 30 septembre 2026)

Ce document remplace `PREUVES-v7.53.md` (gardé comme trace de la revue) : toutes les vérifications ci-dessous ont été relancées
après la dernière correction de la v7.54 (audits et restauration du mode Expert).

Ce document dit ce qui a été vérifié, comment, et ce qui ne l’a pas été. Trois sortes de vérification sont séparées :

- **Automatique** : un script compare un résultat à une référence et compte les réussites et les échecs (tests `node`,
  vérificateur de liens, suites navigateur, audit, axe-core, contrôle des mots coupés). Les chiffres ci-dessous sont ceux
  de la dernière passe complète, lancée après la dernière correction (30 septembre 2026, passe lancée à 15 h 48).
- **Visuelle** : des captures d’écran réelles (Chromium, 1 280 et 390 px, plus 1 920 px pour l’accueil) regardées une à
  une ; ce que chaque capture montre et ce qui y a été contrôlé est listé en section 6.
- **Parcours utilisateur contrôlés** : des parcours complets rejoués dans un vrai navigateur (clics, saisies, clavier,
  retour arrière, rechargement, deux onglets), dont le résultat est vérifié à chaque étape. Ce sont des parcours scriptés :
  aucun test avec de vrais joueurs n’a été mené.

Rien n’est publié : la mise en ligne est une étape à part, faite par le propriétaire du site. Aucune de ces vérifications
n’a été faite sur le site en production.

## 1. Résumé

| Contrôle | Sorte | Résultat |
|---|---|---|
| Tests `node --test outils/tests/*.test.cjs` | automatique | **599 / 599** réussis, 0 échec |
| `node outils/verifier.js` (liens, images, srcset, CSS, galeries, données, sitemaps) | automatique | 0 erreur, 47 651 références vérifiées dans 415 pages |
| `gen-leo.cjs --check` (index de Léo à jour) | automatique | à jour (dernière régénération) |
| Carnets au navigateur (`carnets-browser.cjs`) | parcours | **94 / 94** réussis, 0 échec |
| Parcours du calculateur (`calculateurs-parcours-browser.cjs`) | parcours | **161 / 161** réussis, 0 échec |
| Calculateur lot B (`calculateurs-lot-b-browser.cjs`) | parcours | **140 / 140** réussis, 0 échec |
| Calculateur v2 (`calculateurs-v2-browser.cjs`) | parcours | **142 / 142** réussis, 0 échec |
| Calculateur, contrôles d’acceptation (`calculateurs-browser.cjs`) | parcours | **278 / 278** réussis, 0 échec |
| Léo (`leo-browser.cjs`) | parcours | tenu : 0 erreur console, 0 erreur de page, 0 débordement ; performance tenue (question tapée ≤ 132 ms, ouverture ≤ 3,2 s avec le processeur ralenti ×4) |
| Contact et Mentions (`contact-browser.cjs`) | parcours | tenu : 0 erreur console, 0 débordement, 0 contraste insuffisant (277 vérifiés), 0 nom vide, 0 petite cible ; envoi et repli vérifiés |
| Audit de clôture (`audit-site-browser.cjs --rapide`) | automatique | 26 pages, 182 chargements : 0 débordement, 0 grille décentrée, 0 texte coupé, 0 image étirée, 0 contenu resté caché, 0 cible < 24 px, 0 contraste insuffisant, 0 erreur console, 0 requête en échec |
| Accessibilité axe-core WCAG 2.0 / 2.1 / 2.2 A et AA (`accessibilite-perf-browser.cjs`) | automatique | 44 chargements (22 pages × 2 largeurs) : **0 violation**, 0 page avec erreur de script |
| Mots coupés au milieu (`mots-coupes-browser.cjs`) | automatique | 190 chargements (38 pages × 5 largeurs) : **0 mot coupé** |
| Zoom 200 % / 400 % et fenêtres basses (`zoom-hauteur-browser.cjs`) | automatique | **56 / 56** réussis (14 pages × 4 tailles), 0 échec |
| Tuto : « Essayer », formulaire et exemples (`tuto-essayer-browser.cjs`) | parcours | **22 / 22** réussis, 0 échec |
| Captures relues | visuelle | 85 captures : les 33 nouvelles (v7.54) ouvertes et regardées, les 52 reprises comparées pixel à pixel à la v7.53 (21 identiques, 31 qui ne diffèrent que par un contenu mouvant, relues en planche) ; 36 contrôles du texte affiché réussis, 0 en échec ; plus les 26 captures du Tuto |

## 2. Tests automatiques (`node --test`)

Commande : `NODE_PATH=<dépendances>/node_modules SITE_ROOT=$PWD node --test outils/tests/*.test.cjs`. Les références
numériques des tests de la mission sont écrites à la main (jamais recalculées par la fonction testée). Dans la passe de 15 h 48,
trois tests échouaient pour une raison de test, pas de site : deux attendaient une espace simple là où la typographie du site
met une insécable (« Munitions simulées : », « n’a pas de prix : »), un troisième attendait la situation du plan sans la clé
`players` ajoutée en v7.54. Les trois assertions ont été corrigées et la suite complète relancée sur les mêmes fichiers du site
(aucun fichier du site changé entre les deux) : c’est ce résultat qui est écrit ici et dans `tests-node.tap.txt`.

| Fichier | Réussis | Échecs |
|---|---|---|
| `a-propos-v744.test.cjs` | 8 | 0 |
| `audit-finition.test.cjs` | 32 | 0 |
| `calculateurs-astra.test.cjs` | 17 | 0 |
| `calculateurs-engine.test.cjs` | 55 | 0 |
| `calculateurs-ergonomie-v35.test.cjs` | 6 | 0 |
| `calculateurs-integration.test.cjs` | 22 | 0 |
| `calculateurs-liens-v749.test.cjs` | 8 | 0 |
| `calculateurs-lot-b.test.cjs` | 31 | 0 |
| `calculateurs-plan-ui-v749.test.cjs` | 10 | 0 |
| `calculateurs-plan-v34.test.cjs` | 15 | 0 |
| `calculateurs-v747.test.cjs` | 11 | 0 |
| `calculateurs-v749.test.cjs` | 24 | 0 |
| `carnets-core-v748.test.cjs` | 8 | 0 |
| `carnets-v751.test.cjs` | 15 | 0 |
| `catalogues-v742.test.cjs` | 13 | 0 |
| `catalogues-v743.test.cjs` | 12 | 0 |
| `catalogues-v750.test.cjs` | 10 | 0 |
| `collectibles-generator.test.cjs` | 18 | 0 |
| `collectibles-runtime.test.cjs` | 20 | 0 |
| `collectibles-tools.test.cjs` | 15 | 0 |
| `conformite-v753.test.cjs` | 13 | 0 |
| `conformite-v754.test.cjs` | 13 | 0 |
| `contact-v746.test.cjs` | 10 | 0 |
| `coverage.test.cjs` | 3 | 0 |
| `hubs-monde-v741.test.cjs` | 11 | 0 |
| `hubs-v740.test.cjs` | 8 | 0 |
| `leo-v745.test.cjs` | 15 | 0 |
| `leo.test.cjs` | 71 | 0 |
| `lot-d-progression.test.cjs` | 14 | 0 |
| `modele-v748.test.cjs` | 20 | 0 |
| `regression.test.cjs` | 54 | 0 |
| `scenario-v6-v748.test.cjs` | 6 | 0 |
| `suivi-v738.test.cjs` | 5 | 0 |
| `validation-v752.test.cjs` | 6 | 0 |
| **Total attribué** | **599** | **0** |

Ce que prouvent les tests ajoutés pendant la mission (détail : `outils/MATRICE-COUVERTURE.md`, sections 4 et 6) :

- `modele-v748`, `carnets-core-v748`, `scenario-v6-v748` (lot 1) : coût A/B et bascule, trésorerie exacte, coût inconnu
  jamais nul, prérequis partagé payé une fois, possession non refacturée, cycle et référence absente expliqués, réalisation
  comptée une fois, prévu ≠ possédé, migration v5 → v6 sans changer un résultat ;
- `calculateurs-v749`, `calculateurs-plan-ui-v749`, `calculateurs-liens-v749` (lot 2) : les huit outils et le business
  plan (un million : 7 répétitions, 240 min, point bas 25 000, 1 045 000), véhicule incompatible exclu, liens sûrs ;
- `catalogues-v750` (lot 3) : prix inconnu jamais gratuit, emplacement jamais inventé, souhait ≠ possession ;
- `carnets-v751` (lot 4) : 9 carnets, identifiants et comptes identiques partout, stocks, présentation publique sans donnée
  personnelle ;
- `validation-v752` (lot 5) : un critère changé (frais par tentative 5 000 → 8 000) change le résultat (1 045 000 →
  1 024 000), le point bas (25 000 → 22 000), l’explication, la courbe et les soldes des étapes sans changer leur ordre ;
  à 20 000 de frais, le plan choisi touche à la réserve, le dit avec la raison chiffrée (point bas 10 000) et aucun plan
  « faisable » n’est inventé en gardant la réserve ; somme des carnets = total de la progression (3 134) ; ancienne
  progression (fichier version 1) importée, conservée et comptée, référence inconnue gardée à part ; possession déclarée →
  « déjà possédé » au calculateur, prévision sans effet sur le stockage ; harmonisation ; noms de lieux en texte simple ;
- `conformite-v753` (revue) : coût d’usage non renseigné (comparaison ouverte, 0 écrit : 130 000 contre 160 000) ; panier
  vide ; prévu / commencé / fait (commencé ne crédite rien, ancienne sauvegarde = prévu) ; recherche d’ordre locale identique à
  l’exhaustif sur 200 cas tirés au sort ; recherche du site ; carte sans temps de trajet par défaut ; Léo et la possession ;
  sélection des listes → budget (prix inconnu, balise écartée) ; Tuto (textes, critères du registre, captures présentes) ; rendu ;
- `conformite-v754` (audits, restauration) : « Comparer des ordres selon le délai » (inverse, prix croissants, boutons) ; « Et si »
  en attente sans achat ; « Temps pour regagner le prix » ; comparateur à deux liens ; parcours sans partie : attendre la mission
  la plus rentable (cas de l’audit 25 min au lieu de 1 h 11 ; 0 plan sur 500 battu par un sous-ensemble) ; priorités sécurité et
  moins coûteux jamais sous la réserve, plan bloqué et expliqué ; munitions simulées comptées dans le plan (9 000 $ par tentative
  changent le temps et l’argent final) et missions à trop de joueurs écartées ; import complet dans la page ; envie facultative et
  repli « le moins cher » ; étiquette EXEMPLE et bandeau ; budget « incomplet » avec coût d’usage non confirmé ; prérequis retiré du
  panier ; tentatives ratées chiffrées dans Mon objectif et Mon temps de jeu ; fiches « sans objet » ; carnets (repères de la série,
  Collectibles → carnet, ligne visée) ; Léo (objectif, deux achats) ; le groupe écrit dans « Nous jouons à » survit à l’enregistrement.

## 3. Suites navigateur et parcours contrôlés

Chromium (Playwright), site servi en local avec les en-têtes de `vercel.json` (Content-Security-Policy comprise) ; le site
n’appelle aucun autre serveur pendant les contrôles. Chaque contrôle est compté ; les scripts ne s’arrêtent pas au premier échec.

| Suite | Contrôles | Ce qui est vérifié |
|---|---|---|
| `carnets-browser.cjs` | **94 / 94** réussis, 0 échec | 9 carnets : vues, possession, « Annuler », envies, recherche et filtres dans l’adresse, rechargement, retour arrière, deux onglets, fiches, stock et journal, arsenal, lieux et carte, propriétés, collectibles, garde-robe, tableau de bord, calculs et `?voir=`, envies classées, plan → garage une fois, possession → « déjà possédé », lecture seule sans stockage, téléphone, mouvement réduit, cibles tactiles |
| `calculateurs-parcours-browser.cjs` | **161 / 161** réussis, 0 échec | huit outils en Simple, Pas à pas et Expert, business plan, tiroir « Mes calculs enregistrés » (clavier, Échap, focus), renommer, dupliquer, supprimer / annuler, comparer, rechargement |
| `calculateurs-lot-b-browser.cjs` | **140 / 140** réussis, 0 échec | carnets du calculateur, rentabilité, panier d’achats, business plan, fiches, largeurs, relecture |
| `calculateurs-v2-browser.cjs` | **142 / 142** réussis, 0 échec | panneaux actifs et valeurs finies de 320 à 1 440 px, CSP, ressources |
| `calculateurs-browser.cjs` | **278 / 278** réussis, 0 échec | contrôles d’acceptation, impression, mouvement réduit, CSP |
| `leo-browser.cjs` | tenu : 0 erreur console, 0 erreur de page, 0 débordement ; performance tenue (question tapée ≤ 132 ms, ouverture ≤ 3,2 s avec le processeur ralenti ×4) | 7 largeurs, clavier (1 280 et 390 px), mouvement réduit, performance, lien vers Contact |
| `contact-browser.cjs` | tenu : 0 erreur console, 0 débordement, 0 contraste insuffisant (277 vérifiés), 0 nom vide, 0 petite cible ; envoi et repli vérifiés | 7 largeurs, noms accessibles, contrastes, clavier, envoi (faux Brevo local), repli |
| `tuto-essayer-browser.cjs` | **22 / 22** réussis, 0 échec | chaque « Essayer » du Tuto (bon outil, retour au chapitre, aucune erreur), formulaire de départ, exemples et exercices écrits dans le Tuto |
| `zoom-hauteur-browser.cjs` | **56 / 56** réussis (14 pages × 4 tailles), 0 échec | zoom 200 % (640 × 360) et 400 % (320 × 256), fenêtres 1 280 × 500 et 1 024 × 480 : débordement, en-tête collé, titre et focus visibles |

Parcours contrôlés pendant la mission (extraits des suites ci-dessus) :

- **Fiche → carnet → calculateur** : « Je le veux » sur une fiche véhicule, « Voir mon garage », l’envie est dans « Mes
  envies » ; « Je l’ai » la range et la retire des envies ; « Annuler » ; rechargement, retour arrière, deux onglets ;
  « Classer mes envies » ouvre « Quoi acheter d’abord ? » avec les véhicules ; celui qui est déjà au garage arrive « déjà
  possédé » et le calculateur le dit.
- **Plan → carnet** : dans le business plan, « Pendant cette partie, j’ai acheté » range le véhicule dans le garage une
  seule fois (même relevé rejoué : rien de plus) ; une prévision ne coche rien.
- **Stock** : ancienne case « obtenu » → « stock à renseigner » ; « J’en ai utilisé un » / « racheté un » = un événement
  chacun ; stock à zéro ne décoche rien.
- **Carnet → carte** : un lieu repéré depuis « Mes lieux repérés » est compté par la carte (même clé `lk_map_found`).
- **Calculateur** : les huit outils en Simple, Pas à pas et Expert, puis le business plan ; enregistrer, renommer,
  dupliquer, supprimer et annuler, comparer ; « Mes calculs et mes plans » ouvre la fiche d’un calcul (`?voir=`) ;
  impression ; mouvement réduit ; 320 à 1 440 px sans débordement ni valeur non finie.
- **Léo** : ouverture, question, suggestion, clavier (panneau latéral non modal, fenêtre modale sur téléphone), lien
  « Signaler » vers Contact prérempli.
- **Contact** : formulaire au clavier, erreur annoncée et focus sur le champ, envoi à la vraie fonction `api/contact.js`
  avec un faux Brevo local (aucun e-mail réel), repli « écris directement » si l’envoi échoue ; aucune clé transmise.

## 4. Audit de clôture, rendu sur plusieurs écrans

Audit de clôture (`outils/tests/audit-site-browser.cjs --rapide`) : 26 pages, 182 chargements : 0 débordement, 0 grille décentrée, 0 texte coupé, 0 image étirée, 0 contenu resté caché, 0 cible < 24 px, 0 contraste insuffisant, 0 erreur console, 0 requête en échec ; 11 157 contrastes vérifiés ; 8 492 cibles entre 24 et 44 px (recommandation, pas un défaut WCAG AA). Survol, apparitions au défilement (latences relevées), mouvement réduit et 12 fonctions contrôlées. Les deux défauts antérieurs relevés en v7.47 et v7.51 (repères de carte de 19 px, image d’accueil agrandie à 1 920 px) sont corrigés : 0 cible sous 24 px, 0 image étirée.

Largeurs contrôlées pendant la mission : 320, 360, 390, 768, 1 024, 1 280, 1 440 et 1 920 px selon les suites
(audit `--rapide` : 26 pages types, chacune aux sept largeurs 320, 390, 768, 1 024, 1 280, 1 440 et 1 920 ; calculateur : 320 à 1 440 ;
Léo et Contact : 320 à 1 920 ; mots coupés : 320 à 1 280).

## 5. Accessibilité et performances

**Accessibilité automatique** (axe-core 4.13, règles WCAG 2.0 / 2.1 / 2.2 niveaux A et AA) sur 22 pages à 1 280 et
390 px, avec un état de démonstration dans le stockage local (cartes des carnets affichées) : 44 chargements (22 pages × 2 largeurs) : **0 violation**, 0 page avec erreur de script. S’ajoutent, dans les
suites : zoom 200 % et 400 % et fenêtres basses (**56 / 56** réussis (14 pages × 4 tailles), 0 échec), noms accessibles de chaque champ et bouton (Contact), contrastes calculés (audit et Contact), cibles tactiles
d’au moins 24 px, ordre de tabulation, flèches dans les onglets des carnets, Échap et retour du focus dans les tiroirs,
mouvement réduit. Un outil automatique ne voit qu’une partie des défauts : aucun test n’a été fait avec un lecteur d’écran
réel (NVDA, VoiceOver, TalkBack).

**Performances mesurées** (serveur local **sans compression** : les octets sont un plafond haut ; aucun ralentissement
réseau ; LCP et CLS relevés par `PerformanceObserver` 1,2 s après le chargement) :

| Page | 1 280 px : Ko · req. · DCL · LCP · CLS | 390 px : Ko · req. · DCL · LCP · CLS |
|---|---|---|
| `/index.html` | 1017 · 21 · 284 ms · 372 ms · 0,001 | 747 · 15 · 213 ms · 196 ms · 0,03 |
| `/calculateurs.html` | 1866 · 36 · 519 ms · 436 ms · 0,025 | 1866 · 36 · 437 ms · 248 ms · 0,029 |
| `/vehicules.html` | 2170 · 18 · 1318 ms · 352 ms · 0,006 | 2170 · 18 · 1152 ms · 284 ms · 0,03 |
| `/vehicules/karin-sultan.html` | 874 · 16 · 218 ms · 192 ms · 0 | 874 · 16 · 209 ms · 168 ms · 0,006 |
| `/armes.html` | 862 · 21 · 306 ms · 312 ms · 0 | 862 · 21 · 372 ms · 256 ms · 0,015 |
| `/armes/girardi-es9.html` | 776 · 17 · 213 ms · 208 ms · 0 | 646 · 16 · 198 ms · 240 ms · 0 |
| `/style.html` | 1327 · 27 · 498 ms · 300 ms · 0 | 1327 · 27 · 488 ms · 196 ms · 0,037 |
| `/nourriture.html` | 1042 · 26 · 340 ms · 324 ms · 0 | 1042 · 26 · 320 ms · 196 ms · 0,037 |
| `/personnalisations.html` | 1338 · 27 · 438 ms · 264 ms · 0 | 1283 · 25 · 369 ms · 196 ms · 0,03 |
| `/achats.html` | 1084 · 21 · 178 ms · 908 ms · 0 | 738 · 19 · 181 ms · 180 ms · 0 |
| `/progression.html` | 1182 · 32 · 225 ms · 220 ms · 0,005 | 999 · 26 · 229 ms · 176 ms · 0 |
| `/carnets/garage.html` | 808 · 19 · 298 ms · 260 ms · 0,001 | 808 · 19 · 209 ms · 168 ms · 0,015 |
| `/carnets/arsenal.html` | 751 · 17 · 274 ms · 252 ms · 0,001 | 751 · 17 · 186 ms · 132 ms · 0,006 |
| `/carnets/garde-robe.html` | 765 · 17 · 192 ms · 272 ms · 0,001 | 765 · 17 · 194 ms · 752 ms · 0 |
| `/carnets/consommables.html` | 747 · 17 · 179 ms · 812 ms · 0,001 | 747 · 17 · 157 ms · 744 ms · 0 |
| `/carnets/personnalisations.html` | 785 · 17 · 169 ms · 168 ms · 0,001 | 785 · 17 · 199 ms · 160 ms · 0 |
| `/carnets/proprietes.html` | 779 · 19 · 177 ms · 244 ms · 0,001 | 779 · 19 · 168 ms · 748 ms · 0 |
| `/carnets/lieux.html` | 871 · 18 · 203 ms · 232 ms · 0,001 | 871 · 18 · 237 ms · 152 ms · 0,015 |
| `/carnets/collectibles.html` | 728 · 19 · 188 ms · 208 ms · 0,001 | 728 · 19 · 198 ms · 732 ms · 0,015 |
| `/carnets/calculs.html` | 707 · 17 · 172 ms · 268 ms · 0,001 | 707 · 17 · 188 ms · 148 ms · 0,015 |
| `/carte.html` | 1971 · 18 · 397 ms · 940 ms · 0 | 1971 · 18 · 372 ms · 860 ms · 0,036 |
| `/tuto.html` | 830 · 16 · 264 ms · 204 ms · 0 | 754 · 15 · 246 ms · 180 ms · 0,022 |

Lecture : les pages les plus lourdes, non compressées, sont Véhicules (2,1 Mo : données et vignettes des 302 véhicules),
la carte (2 Mo : fond de carte et 2 500 lieux) et le calculateur (1,8 Mo) ; les carnets pèsent de 0,7 à 0,9 Mo. Aucun
décalage de mise en page notable (CLS le plus haut : 0,037 ; seuil « bon » de Google : 0,1). Ces mesures ne remplacent pas
une mesure sur le site en ligne (compression de Vercel, cache, vrai réseau mobile).

## 6. Vérifications visuelles (captures relues)

Dossier `captures-v7.54/` (livré à part, hors fichiers du site). Les 33 captures nouvelles ont été ouvertes et regardées une à
une (les écrans corrigés en grand, les autres en planche) ; les 52 captures reprises de la v7.53 ont été comparées pixel à pixel à
celles de la v7.53 : 21 identiques, 31 qui ne diffèrent que par un contenu mouvant (photos tirées au sort, position de carte,
compteurs des carnets), relues en planche. Celles de la v7.54 portent en plus un contrôle du texte affiché (le script vérifie que les mots attendus sont bien à l’écran : `controles-textuels.txt`
dans le dossier des captures, 36 réussis, 0 en échec). Ce qui a été contrôlé :

| Capture | Ce qui a été regardé |
|---|---|
| `vetements-et-style-en-tete`, `-liste`, `-carnet-de-style` (1 280 / 390) | en-tête illustré, liste dépliée (vignettes, colonnes, « Prix à venir », « Obtenu » sans coupure), planches du carnet de style |
| `consommables-en-tete`, `consommables-en-un-regard` | pastilles de statut visibles, « Récupération de vie : à confirmer », repère de la série à part, « Xero Gas Station (2 lieux) » |
| `armes-hub`, `armes-ou-les-trouver`, `arme-fiche` | localisateur illustré (vignettes, repères numérotés, résumé « Emplacement à venir »), fiche documentaire |
| `vehicules-hub`, `vehicule-fiche` | liste, « Ajouter à mon garage », « Je le veux », « Voir mon garage », encart calculateur, schéma dit comme tel ; bandeau des marques rempli sous l’en-tête |
| `achats` (1 280 / 390) | pile verticale, visuel par catégorie, comptes, accès rapide, « Tout voir en grille » |
| `progression-tableau-de-bord` | neuf cartes, une ligne par famille au bon libellé, envies, stocks à renseigner, saisies à part |
| `carnet-garage`, `-envies`, `-vide`, `carnet-arsenal-stock`, `carnet-consommables-stock`, `carnet-garde-robe-envies`, `carnet-lieux-restants`, `carnet-calculs`, `carnet-collectibles-vide` | trois vues, tampons, état vide expliqué sans collection fictive, stock « à renseigner » / « épuisé (0) », envie de style, noms de lieux sans entité, calcul enregistré |
| `accueil-1920` | scène d’accueil non étirée sur grand écran |
| `carte-lieu-guillemets-1280` | « "Ambrosia Hills" » affiché sans « &quot; » |
| `tuto-ce-que-le-calcul-prend-en-compte`, captures du Tuto (`img/tuto/`, 26) | encart des critères, captures de la version finale avec l’exemple de chaque chapitre (réponse capturée comparée au texte du Tuto) |
| `consommables-comparaison-vers-budget`, `calculateur-budget-cinq-postes`, `vetements-et-style-adresses` | bouton vers le budget, cinq postes visibles, adresses en une colonne sur téléphone |
| `calculateur-ordre-comparer-des-ordres`, `calculateur-ordre-expert-et-si`, `calculateur-ordre-expert-panier-vide` (v7.54) | « Comparer des ordres selon le délai » (ordre saisi, inverse, prix croissants, meilleur trouvé ; « Appliquer l’ordre inverse », « Trier par prix croissant ») sous la réponse et au-dessus de « Ce qui compte » (chiffres clés avec « Modifier ») ; le bloc Expert entier (Et si · Comparer avec un calcul gardé · Comment est-ce calculé ? · Tous les chiffres) ; panier vide : « Et si » reste là et dit quoi écrire |
| `calculateur-comparer-sans-envie`, `calculateur-comparer-champs-envie` (v7.54) | « — pas notée » par défaut ; sans envie : « le moins cher à l’achat » avec la phrase qui dit pourquoi ; ligne « Temps pour regagner le prix » ; « Coût sur la durée » qui dit quoi écrire |
| `calculateur-objectif-exemples`, `calculateur-objectif-expert-cles`, `calculateur-objectif-expert-et-si` (v7.54) | « CALCULÉ AVEC LES EXEMPLES » au chargement ; chiffres clés avec « Modifier » ; bloc Expert complet de Mon objectif |
| `calculateur-plan-bloque-argent-de-cote`, `calculateur-plan-joueurs-et-preference`, `calculateur-plan-le-plus-vite-munitions` (v7.54) | plan bloqué (« Aucun plan ne garde tes 25 000 $ de côté… ») avec ses deux sorties ; « Nous jouons à (joueurs) », « Le moins coûteux sur tout le parcours » ; avec « Le plus vite possible » : le plan puise dans la réserve et le dit, munitions simulées (SIMULATION) dans les chiffres et dans « Ce qui ferait changer la réponse » |
| `comparateur-deux-liens`, `calculateurs-carte-ordre`, `collectibles-vers-carnet` (v7.54) | « Quel achat choisir ? » et « Lequel puis-je acheter ? » côte à côte ; carte 05 ; « Ouvrir mon carnet des collectibles » vers le carnet |
| `carnet-garde-robe-serie`, `arme-fiche-corps-a-corps` (v7.54) | « dont 68 repères de la série (GTA V, GTA Online)… » et badges « Repère de la série » ; batte : « Arme de mêlée : ni munitions, ni chargeur » |
| `calculateur-deja-possede-1280` (v7.53) | véhicule du garage arrivé « déjà possédé » (capture gardée de la v7.53, écran inchangé) |

Défaut trouvé par la relecture des captures de la v7.54, corrigé et recontrôlé : le groupe écrit dans « Nous jouons à » n’était pas
gardé à l’enregistrement (l’état de départ du scénario ne connaissait pas la clé ; les chiffres clés affichaient « 1 joueur » face à un
champ à 2) ; « 1 joueurs » ; « Au plus bas … en puisant dans l’argent de côté si tu en gardes » alors que 25 000 $ étaient gardés
(cas « Le plus vite ») ; plan bloqué qui parlait d’« une case à corriger » alors que rien ne manquait.
Défauts trouvés par la relecture des captures (lot 5 et revue) puis corrigés et recontrôlés : répartition du budget comptant des postes invisibles (44), catégories brutes dans la comparaison (45), « Changé en mode Expert : argent de côté » pour un champ du mode Simple (52), bandeau des marques de Véhicules resté une bande noire vide, défaut déjà dans la v7.47 (53), égalité de « Quel achat choisir ? » tranchée par l’ordre de la liste (54), lignes de tableau et figures pas encore apparues dans les captures hautes (55, outil de capture) ; noms de lieux en entités HTML (anomalie 25), pastilles
de statut invisibles (29), « Obten / u » et case de suivi sortie du tableau (30), lieux homonymes écrits deux fois (33).
Le contrôle automatique des mots coupés, écrit à cette occasion, a trouvé la grille « Les adresses » à trois colonnes
sur téléphone (31) et le tableau du Tuto (32).

## 6 bis. Revue de conformité : comment elle a été faite

Relecture ligne à ligne du cahier des charges par un vérificateur indépendant, qui n’avait pas fait le travail : 111
exigences rapprochées du code et des pages (pas des documents), avec des scripts et des contrôles au navigateur. Écarts
trouvés, revérifiés puis corrigés : anomalies 35 à 55 de `SUIVI-MISSION.md` (la v7.54 ajoute les anomalies 56 à 70). Deux points jugés conformes après examen
(phrases de catégorie « dans la série » ; absence de 4K, limite des sources). Recherche lourde : pire cas mesuré au
navigateur, processeur ralenti 4 fois, 390 px : 125 ms par saisie (business plan de 12 missions et 20 achats d’avant), 60 ms
(ordre de 12 achats) ; aucun calcul n’est assez long pour demander un bouton d’arrêt, et la réponse affichée est toujours
celle de la dernière saisie (calcul immédiat, sans file d’attente).

## 6 ter. Audits et restauration du mode Expert (v7.54) : comment c’est vérifié

- **Audit d’intégration** : le dépôt du propriétaire (`Leonidadex-main`, 30/09) a été comparé fichier par fichier à la v7.53
  (empreintes) : identique, sauf `calculateurs-tools.js` encore présent. Puis « ce dépôt + archive v7.54 − `calculateurs-tools.js` »
  a été reconstitué et comparé à la v7.54 : identique (voir le résumé de livraison).
- **Audit du cahier des charges** : 281 exigences, relues par un vérificateur indépendant en exécutant les calculs (scripts
  `b*.cjs` hors dépôt) : 195 conformes, 71 partielles, 8 non conformes, 7 invérifiables. Chaque écart corrigé a d’abord été reproduit
  ici (mêmes chiffres que l’audit : plan 1 h 11 / 25 min ; 171 plans sur 500 plus lents qu’un sous-ensemble, 0 après
  correction ; 541 000 avec ou sans munitions ; réserve 20 000 et point bas 10 000), puis vérifié après correction par `conformite-v754.test.cjs` et les captures ci-dessus.
- **Inventaire du mode Expert** : les huit outils de la v7.47 et de la v7.53 ont été ouverts au navigateur en mode Expert, à vide et
  remplis, et tous les titres, tableaux et boutons ont été relevés et comparés ligne à ligne. Ce qui manquait est revenu ; rien de ce
  que les lots avaient ajouté n’a été retiré (le relevé v7.53 est un sous-ensemble du relevé v7.54).
- **Mineurs de l’audit laissés en l’état** (dits, non corrigés) : voir la section 11.

## 7. Calculs contrôlés à la main

| Situation | Référence écrite à la main | Test |
|---|---|---|
| A 100 000 + 4 000 par partie / B 130 000 + 1 000 | égalité à 10 parties (140 000) ; à 15, A 160 000, B 145 000 | `modele-v748`, `calculateurs-v749` |
| 50 000 en poche, 10 000 gardés, achat 40 000 + 5 000 de frais | il manque 5 000 | `modele-v748`, `calculateurs-v749` |
| Un million (100 000, réserve 20 000, véhicule 60 000, arme 10 000, mission 150 000 − 5 000) | 7 répétitions, 240 min, point bas 25 000, 900 000 après 6, 1 045 000 après 7 | `calculateurs-v749`, `validation-v752` |
| Même plan, frais 8 000 | 1 024 000, point bas 22 000, mêmes étapes | `validation-v752` |
| Même plan, frais 20 000 | impossible en gardant 20 000 (il reste 10 000) ; plan choisi par la réserve, point bas 10 000 | `validation-v752` |
| Carnets | somme des carnets = 3 134 = total de « Tout mon suivi » | `validation-v752`, `carnets-v751` |
| A 100 000 + 4 000 par partie, B 130 000 sans coût d’usage écrit, 15 parties | comparaison ouverte ; B avec 0 écrit : 130 000 contre 160 000 | `conformite-v753` |
| Kamacho 150 000 (envie 5), Bati 801 50 000 (envie 3), 200 000 en poche | tous deux payables tout de suite : « le plus vite à avoir » à égalité, départagé par le rapport envie / prix (Bati 801) ; même gagnant et mêmes ex æquo dans tout ordre (300 listes tirées au sort) | `conformite-v753`, `calculateurs-engine` |
| Exemples du Tuto | 8 jours ; 16 h à 50 000 $/h ; 2 h pour regagner ; il manque 200 000 $ et 4 h ; 1 h 36 ; 30 000 $ disponibles ; il manque 20 000 $ | `tuto-essayer-browser` |
| Plan sans partie, cas de l’audit : Course éclair 140 000 − 5 000 en 5 min (attente 5), Livraison 35 000 à 25 % en 25 min, Casse 115 000 − 3 000 en 28 min (attente 15) ; 320 000 → 720 000 | 25 min (4 × Course éclair, la dernière sans attente) au lieu de 1 h 11 ; 200 plans tirés au sort (2 à 4 missions) : aucun plus lent qu’en retirant des missions (le tirage de l’audit, 500 plans, rejoué à part : 0 au lieu de 171) ; « Rapide » 20 000 en 5 min contre « Lente » 21 000 en 60 min, but 200 000 avec 10 000 : 50 min, Lente jamais utile | `conformite-v754` |
| 30 000 en poche, 20 000 gardés, mission à 20 000 de frais, priorité « sécurité » ou « le moins coûteux » | aucun plan ne garde la réserve : bloqué, raison chiffrée (il reste 10 000 utilisables) ; « le plus vite » : plan avec point bas 10 000, dit | `conformite-v754`, `validation-v752` |
| Munitions simulées 9 000 $ par tentative, mission 50 000 − 1 000 en 20 min, but 500 000 | plus de temps et moins d’argent à la fin qu’à 0 $ ; « Munitions simulées : 9 000 $ » écrit ; mission « à quatre » écartée quand on joue seul (même temps qu’avant) | `conformite-v754` |
| Kamacho 150 000 / Bati 801 50 000 sans envie, 200 000 en poche | pas de rapport envie / prix : réponse « le moins cher à l’achat » (Bati 801), dite comme un repli ; avec une envie notée, le rapport reprend | `conformite-v754` |
| Réserve et fréquence (A 100 000 + 4 000 / B 130 000 + 1 000) | 140 000 en poche : B payable avec 0 de côté, il manque 20 000 avec 30 000 gardés ; 30 h en parties d’une heure : B ; en parties de six heures (5 parties) : A à 120 000 contre 135 000 | `calculateurs-v749` |

## 8. Raccordements

Tableau complet catégorie → bouton → adresse du carnet → clé → source → fiches : `outils/CARNETS-CORRESPONDANCE.md`.
Contrôlés : chaque bouton « Voir mon… » mène à son carnet (et au bon filtre de famille) ; les anciennes ancres de
`progression.html` mènent à la carte du carnet ; fiches véhicules et armes (« Je le veux », « Voir mon garage / arsenal »,
« Est-ce que je peux l’acheter ? ») ; listes des catalogues ; carte ; collectibles ; Achats ; calculateur (`?tool=order`,
`?voir=`, achat fait → carnet, possession → « déjà possédé ») ; Léo ; Tuto ; accueil ; recherche interne ; menu.
Le vérificateur de liens contrôle toutes les adresses internes (0 erreur, 47 651 références vérifiées dans 415 pages).

## 9. Médias

Aucun média n’a été téléchargé pendant la mission (le réseau de l’atelier ne joint pas les sites de Rockstar) : tout vient
des visuels officiels déjà dans le dépôt (`img/officiel/`, crédits dans `outils/medias-officiels.json`) et des photos
GTADB (`photos/`, CC BY 4.0).

- Ajouté : `img/leonida-silhouette.svg` (lot 3), silhouette de Leonida partagée par les fiches (un seul téléchargement).
- Nouvelles associations de visuels existants : vignette par ligne dans les listes (42 lignes sur 237 ont un visuel
  officiel lié, les 195 autres un pictogramme de catégorie dit comme tel) ; cinq planches du carnet de style ; un visuel
  par catégorie de la page Achats ; trois visuels crédités en tête de chaque carnet ; photos officielles des véhicules
  dans le garage (54 véhicules ont une photo officielle, 248 un schéma dit comme tel) ; vignettes du localisateur.

## 10. Champs encore à venir (rien d’inventé)

Ce que Rockstar n’a pas publié reste affiché comme tel (« Prix à venir », « À confirmer », « Emplacement à venir ») :

| Données | Encore à venir |
|---|---|
| Véhicules (302) | prix, performances, capacités, coûts d’usage : aucun publié ; 10 officiels, 269 vus dans un média, 23 identifications communautaires |
| Armes (27) | prix, dégâts, cadence, capacité : aucun publié ; 5 officielles, 22 vues dans un média |
| Listes (237 lignes : tenues 30, coiffures 55, tatouages 24, consommables 30, modifs de véhicule 58, modifs d’arme 40) | prix GTA VI : 0 sur 237 ; effet chiffré GTA VI : 0 sur 237 (16 repères de la série écrits à part) ; lieu précis sur la carte : 43 lignes sur 237 |
| Contenus documentés (9) | prix : aucun publié |
| Lieux (2 547) | 1 085 noms réels ou supposés en attente du nom en jeu ; 817 bâtiments sans nom (« Bâtiment L… ») |
| Collectibles | aucune fiche publiée (catalogue vide tant que rien n’est vérifiable) |
| Calculateur | aucune mission, activité ou récompense officielle chiffrée : exemples fictifs signalés, chiffres du joueur |
| Entreprises et activités | stocks, plafonds de production, temps de production : aucune donnée publiée ; le plan n’en suppose aucun (à ajouter au modèle dès qu’ils seront connus) |

Dès qu’une source officielle publie un de ces champs : le saisir dans la donnée source (avec statut, source, date), puis
`node outils/regenerer.cjs`, `node outils/verifier.js` et les tests.

## 11. Limites de cette validation

- Médias : aucun visuel en 4K ; le plus grand visuel officiel du dépôt fait 1 280 px et les photos GTADB 960 px. Aucune source
  plus grande n’était accessible depuis l’atelier.
- Un seul moteur de navigateur (Chromium). Safari (iOS, macOS) et Firefox n’ont pas été testés ; aucun appareil réel.
- Réseau et serveur locaux : les performances en ligne (compression, cache, CDN, 4G) ne sont pas mesurées.
- Accessibilité : contrôle automatique et parcours au clavier ; pas de lecteur d’écran réel.
- Formulaire de contact : vérifié avec un faux Brevo local ; l’envoi réel dépend de la clé configurée dans Vercel, que
  cette mission n’a ni lue ni transmise.
- Aucune vérification sur le site en production : la publication est une étape à part.
- Mineurs relevés par l’audit du cahier des charges et laissés en l’état (le calculateur le dit là où ça compte) : solutions
  équivalentes « l’un ou l’autre » et rôle d’achat (remplace, débloque, améliore) sans effet dans le plan ; pas de case « ce que
  l’étape débloque », pas de plafond de production, pas d’objet obtenu par récompense, pas de coût par utilisation à l’écran ;
  besoin « chargement » sans saisie ; registre sans provenance par facteur ; « Effacer l’historique » sans confirmation ;
  « J’ai déjà » partagé entre les outils sans phrase qui le dit ; silhouettes de véhicules sans le mot « schéma » sur le badge ;
  une seule erreur d’adresse affichée à la fois ; une référence invalide fait rejeter toute une sauvegarde ; un lien partagé
  remplace le plan sans dire quelle valeur a changé ; le compteur animé change la phrase de réponse pendant 0,3 s ;
  localisateur « VCMM Train » relié à 7 concessions (relation signalée non confirmée).

## 12. Où sont les preuves

- Dans le dépôt (`outils/`, jamais publié) : ce fichier, `SUIVI-MISSION.md`, `MATRICE-COUVERTURE.md`,
  `CARNETS-CORRESPONDANCE.md`, les tests et scripts de contrôle (`outils/tests/`).
- Hors dépôt, livrés à part : `captures-v7.54/` (captures et `controles-textuels.txt`) et `rapports-v7.54/` (sorties des suites,
  `audit.json`, `accessibilite-perf.json`, `mots-coupes.json`, `zoom-hauteur.json`) ; le rapport d’audit du cahier des charges
  (`AUDIT-Leonidakit-v7.53.md` et ses annexes) a été remis à part le 30/09.
