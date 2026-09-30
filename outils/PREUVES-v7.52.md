# Preuves de vérification — v7.52 (fin de la mission v7.48 → v7.52, 29 septembre 2026)

Ce document dit ce qui a été vérifié, comment, et ce qui ne l’a pas été. Trois sortes de vérification sont séparées :

- **Automatique** : un script compare un résultat à une référence et compte les réussites et les échecs (tests `node`,
  vérificateur de liens, suites navigateur, audit, axe-core, contrôle des mots coupés). Les chiffres ci-dessous sont ceux
  de la dernière passe complète, lancée après la dernière correction (29 septembre 2026, passe lancée à 20:29).
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
| Tests `node --test outils/tests/*.test.cjs` | automatique | **573 / 573** réussis, 0 échec |
| `node outils/verifier.js` (liens, images, srcset, CSS, galeries, données, sitemaps) | automatique | 0 erreur, 47 710 références vérifiées dans 415 pages |
| `gen-leo.cjs --check` (index de Léo à jour) | automatique | à jour (dernière régénération) |
| Carnets au navigateur (`carnets-browser.cjs`) | parcours | **94 / 94** réussis, 0 échec |
| Parcours du calculateur (`calculateurs-parcours-browser.cjs`) | parcours | **161 / 161** réussis, 0 échec |
| Calculateur lot B (`calculateurs-lot-b-browser.cjs`) | parcours | **140 / 140** réussis, 0 échec |
| Calculateur v2 (`calculateurs-v2-browser.cjs`) | parcours | **142 / 142** réussis, 0 échec |
| Calculateur, contrôles d’acceptation (`calculateurs-browser.cjs`) | parcours | **278 / 278** réussis, 0 échec |
| Léo (`leo-browser.cjs`) | parcours | tenu : 0 erreur console, 0 erreur de page, 0 débordement ; performance tenue (question tapée ≤ 160 ms, ouverture ≤ 2,8 s avec le processeur ralenti ×4) |
| Contact et Mentions (`contact-browser.cjs`) | parcours | tenu : 0 erreur console, 0 débordement, 0 contraste insuffisant (277 vérifiés), 0 nom vide, 0 petite cible ; envoi et repli vérifiés |
| Audit de clôture (`audit-site-browser.cjs --rapide`) | automatique | 26 pages, 182 chargements : 0 débordement, 0 grille décentrée, 0 texte coupé, 0 image étirée, 0 contenu resté caché, 0 cible < 24 px, 0 contraste insuffisant, 0 erreur console, 0 requête en échec |
| Accessibilité axe-core WCAG 2.0 / 2.1 / 2.2 A et AA (`accessibilite-perf-browser.cjs`) | automatique | 44 chargements (22 pages × 2 largeurs) : **0 violation**, 0 page avec erreur de script |
| Mots coupés au milieu (`mots-coupes-browser.cjs`) | automatique | 190 chargements (38 pages × 5 largeurs) : **0 mot coupé** |
| Captures relues | visuelle | 45 captures, toutes ouvertes et regardées (section 6) |

## 2. Tests automatiques (`node --test`)

Commande : `NODE_PATH=<dépendances>/node_modules SITE_ROOT=$PWD node --test outils/tests/*.test.cjs`. Les références
numériques des tests de la mission sont écrites à la main (jamais recalculées par la fonction testée).

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
| **Total** | **573** | **0** |

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
  « déjà possédé » au calculateur, prévision sans effet sur le stockage ; harmonisation ; noms de lieux en texte simple.

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
| `leo-browser.cjs` | tenu : 0 erreur console, 0 erreur de page, 0 débordement ; performance tenue (question tapée ≤ 160 ms, ouverture ≤ 2,8 s avec le processeur ralenti ×4) | 7 largeurs, clavier (1 280 et 390 px), mouvement réduit, performance, lien vers Contact |
| `contact-browser.cjs` | tenu : 0 erreur console, 0 débordement, 0 contraste insuffisant (277 vérifiés), 0 nom vide, 0 petite cible ; envoi et repli vérifiés | 7 largeurs, noms accessibles, contrastes, clavier, envoi (faux Brevo local), repli |

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

Audit de clôture (`outils/tests/audit-site-browser.cjs --rapide`) : 26 pages, 182 chargements : 0 débordement, 0 grille décentrée, 0 texte coupé, 0 image étirée, 0 contenu resté caché, 0 cible < 24 px, 0 contraste insuffisant, 0 erreur console, 0 requête en échec ; 10 738 contrastes vérifiés ; 8 447 cibles entre 24 et 44 px (recommandation, pas un défaut WCAG AA). Survol, apparitions au défilement (latences relevées), mouvement réduit et 12 fonctions contrôlées. Les deux défauts antérieurs relevés en v7.47 et v7.51 (repères de carte de 19 px, image d’accueil agrandie à 1 920 px) sont corrigés : 0 cible sous 24 px, 0 image étirée. La passe complète précédente (même série, lancée avec les autres suites) avait relevé 1 élément encore invisible : un titre de `collectibles.html` à 1 440 px, pris pendant son apparition ; non reproduit (6 reprises ciblées du même défilement, puis cette seconde passe complète : 0). Aucune correction n’a été faite entre les deux passes.

Largeurs contrôlées pendant la mission : 320, 360, 390, 768, 1 024, 1 280, 1 440 et 1 920 px selon les suites
(audit `--rapide` : 26 pages types, chacune aux sept largeurs 320, 390, 768, 1 024, 1 280, 1 440 et 1 920 ; calculateur : 320 à 1 440 ;
Léo et Contact : 320 à 1 920 ; mots coupés : 320 à 1 280).

## 5. Accessibilité et performances

**Accessibilité automatique** (axe-core 4.13, règles WCAG 2.0 / 2.1 / 2.2 niveaux A et AA) sur 22 pages à 1 280 et
390 px, avec un état de démonstration dans le stockage local (cartes des carnets affichées) : 44 chargements (22 pages × 2 largeurs) : **0 violation**, 0 page avec erreur de script. S’ajoutent, dans les
suites : noms accessibles de chaque champ et bouton (Contact), contrastes calculés (audit et Contact), cibles tactiles
d’au moins 24 px, ordre de tabulation, flèches dans les onglets des carnets, Échap et retour du focus dans les tiroirs,
mouvement réduit. Un outil automatique ne voit qu’une partie des défauts : aucun test n’a été fait avec un lecteur d’écran
réel (NVDA, VoiceOver, TalkBack).

**Performances mesurées** (serveur local **sans compression** : les octets sont un plafond haut ; aucun ralentissement
réseau ; LCP et CLS relevés par `PerformanceObserver` 1,2 s après le chargement) :

| Page | 1 280 px : Ko · req. · DCL · LCP · CLS | 390 px : Ko · req. · DCL · LCP · CLS |
|---|---|---|
| `/index.html` | 1008 · 21 · 271 ms · 416 ms · 0,001 | 738 · 15 · 254 ms · 252 ms · 0,015 |
| `/calculateurs.html` | 1826 · 36 · 553 ms · 408 ms · 0,025 | 1826 · 36 · 470 ms · 276 ms · 0,029 |
| `/vehicules.html` | 2171 · 18 · 997 ms · 380 ms · 0 | 2171 · 18 · 756 ms · 244 ms · 0,03 |
| `/vehicules/karin-sultan.html` | 869 · 16 · 182 ms · 228 ms · 0 | 869 · 16 · 159 ms · 160 ms · 0,006 |
| `/armes.html` | 857 · 21 · 331 ms · 300 ms · 0 | 857 · 21 · 339 ms · 224 ms · 0,015 |
| `/armes/girardi-es9.html` | 771 · 17 · 159 ms · 232 ms · 0 | 642 · 16 · 167 ms · 164 ms · 0 |
| `/style.html` | 1321 · 27 · 533 ms · 280 ms · 0 | 1321 · 27 · 353 ms · 932 ms · 0,037 |
| `/nourriture.html` | 1036 · 26 · 442 ms · 280 ms · 0 | 1036 · 26 · 307 ms · 220 ms · 0,037 |
| `/personnalisations.html` | 1332 · 27 · 389 ms · 280 ms · 0 | 1277 · 25 · 338 ms · 172 ms · 0,03 |
| `/achats.html` | 1079 · 21 · 191 ms · 272 ms · 0 | 733 · 19 · 195 ms · 176 ms · 0 |
| `/progression.html` | 1177 · 32 · 186 ms · 232 ms · 0,005 | 994 · 26 · 221 ms · 196 ms · 0 |
| `/carnets/garage.html` | 803 · 19 · 152 ms · 216 ms · 0,001 | 803 · 19 · 165 ms · 132 ms · 0,015 |
| `/carnets/arsenal.html` | 745 · 17 · 147 ms · 192 ms · 0,001 | 745 · 17 · 150 ms · 692 ms · 0,006 |
| `/carnets/garde-robe.html` | 759 · 17 · 147 ms · 744 ms · 0,001 | 759 · 17 · 223 ms · 160 ms · 0,015 |
| `/carnets/consommables.html` | 741 · 17 · 174 ms · 256 ms · 0,001 | 741 · 17 · 217 ms · 148 ms · 0,006 |
| `/carnets/personnalisations.html` | 779 · 17 · 200 ms · 172 ms · 0,001 | 779 · 17 · 211 ms · 164 ms · 0,025 |
| `/carnets/proprietes.html` | 774 · 19 · 136 ms · 196 ms · 0,001 | 774 · 19 · 187 ms · 144 ms · 0 |
| `/carnets/lieux.html` | 865 · 18 · 221 ms · 204 ms · 0,001 | 865 · 18 · 219 ms · 152 ms · 0,015 |
| `/carnets/collectibles.html` | 723 · 19 · 134 ms · 180 ms · 0,001 | 723 · 19 · 143 ms · 132 ms · 0,015 |
| `/carnets/calculs.html` | 701 · 17 · 134 ms · 776 ms · 0,001 | 701 · 17 · 175 ms · 148 ms · 0,015 |
| `/carte.html` | 1965 · 18 · 363 ms · 268 ms · 0 | 1965 · 18 · 355 ms · 224 ms · 0,062 |
| `/tuto.html` | 790 · 16 · 192 ms · 172 ms · 0 | 717 · 15 · 245 ms · 184 ms · 0,022 |

Lecture : les pages les plus lourdes, non compressées, sont Véhicules (2,1 Mo : données et vignettes des 302 véhicules),
la carte (2 Mo : fond de carte et 2 500 lieux) et le calculateur (1,8 Mo) ; les carnets pèsent de 0,7 à 0,9 Mo. Aucun
décalage de mise en page notable (CLS le plus haut : 0,062 ; seuil « bon » de Google : 0,1). Ces mesures ne remplacent pas
une mesure sur le site en ligne (compression de Vercel, cache, vrai réseau mobile).

## 6. Vérifications visuelles (captures relues)

Dossier `captures-v7.52/` (livré à part, hors fichiers du site). Chaque capture a été ouverte et regardée ; ce qui a été
contrôlé :

| Capture | Ce qui a été regardé |
|---|---|
| `vetements-et-style-en-tete`, `-liste`, `-carnet-de-style` (1 280 / 390) | en-tête illustré, liste dépliée (vignettes, colonnes, « Prix à venir », « Obtenu » sans coupure), planches du carnet de style |
| `consommables-en-tete`, `consommables-en-un-regard` | pastilles de statut visibles, « Récupération de vie : à confirmer », repère de la série à part, « Xero Gas Station (2 lieux) » |
| `armes-hub`, `armes-ou-les-trouver`, `arme-fiche` | localisateur illustré (vignettes, repères numérotés, résumé « Emplacement à venir »), fiche documentaire |
| `vehicules-hub`, `vehicule-fiche` | liste, « Ajouter à mon garage », « Je le veux », « Voir mon garage », encart calculateur, schéma dit comme tel |
| `achats` (1 280 / 390) | pile verticale, visuel par catégorie, comptes, accès rapide, « Tout voir en grille » |
| `progression-tableau-de-bord` | neuf cartes, une ligne par famille au bon libellé, envies, stocks à renseigner, saisies à part |
| `carnet-garage`, `-envies`, `-vide`, `carnet-arsenal-stock`, `carnet-consommables-stock`, `carnet-garde-robe-envies`, `carnet-lieux-restants`, `carnet-calculs`, `carnet-collectibles-vide` | trois vues, tampons, état vide expliqué sans collection fictive, stock « à renseigner » / « épuisé (0) », envie de style, noms de lieux sans entité, calcul enregistré |
| `accueil-1920` | scène d’accueil non étirée sur grand écran |
| `carte-lieu-guillemets-1280` | « "Ambrosia Hills" » affiché sans « &quot; » |
| `calculateur-deja-possede-1280` | véhicule du garage arrivé « déjà possédé » : « Tu l’as déjà : rien à payer » et la phrase qui l’explique |

Défauts trouvés par cette relecture puis corrigés et recontrôlés : noms de lieux en entités HTML (anomalie 25), pastilles
de statut invisibles (29), « Obten / u » et case de suivi sortie du tableau (30), lieux homonymes écrits deux fois (33).
Le contrôle automatique des mots coupés, écrit à cette occasion, a trouvé la grille « Les adresses » à trois colonnes
sur téléphone (31) et le tableau du Tuto (32).

## 7. Calculs contrôlés à la main

| Situation | Référence écrite à la main | Test |
|---|---|---|
| A 100 000 + 4 000 par partie / B 130 000 + 1 000 | égalité à 10 parties (140 000) ; à 15, A 160 000, B 145 000 | `modele-v748`, `calculateurs-v749` |
| 50 000 en poche, 10 000 gardés, achat 40 000 + 5 000 de frais | il manque 5 000 | `modele-v748`, `calculateurs-v749` |
| Un million (100 000, réserve 20 000, véhicule 60 000, arme 10 000, mission 150 000 − 5 000) | 7 répétitions, 240 min, point bas 25 000, 900 000 après 6, 1 045 000 après 7 | `calculateurs-v749`, `validation-v752` |
| Même plan, frais 8 000 | 1 024 000, point bas 22 000, mêmes étapes | `validation-v752` |
| Même plan, frais 20 000 | impossible en gardant 20 000 (il reste 10 000) ; plan choisi par la réserve, point bas 10 000 | `validation-v752` |
| Carnets | somme des carnets = 3 134 = total de « Tout mon suivi » | `validation-v752`, `carnets-v751` |

## 8. Raccordements

Tableau complet catégorie → bouton → adresse du carnet → clé → source → fiches : `outils/CARNETS-CORRESPONDANCE.md`.
Contrôlés : chaque bouton « Voir mon… » mène à son carnet (et au bon filtre de famille) ; les anciennes ancres de
`progression.html` mènent à la carte du carnet ; fiches véhicules et armes (« Je le veux », « Voir mon garage / arsenal »,
« Est-ce que je peux l’acheter ? ») ; listes des catalogues ; carte ; collectibles ; Achats ; calculateur (`?tool=order`,
`?voir=`, achat fait → carnet, possession → « déjà possédé ») ; Léo ; Tuto ; accueil ; recherche interne ; menu.
Le vérificateur de liens contrôle toutes les adresses internes (0 erreur, 47 710 références vérifiées dans 415 pages).

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

Dès qu’une source officielle publie un de ces champs : le saisir dans la donnée source (avec statut, source, date), puis
`node outils/regenerer.cjs`, `node outils/verifier.js` et les tests.

## 11. Limites de cette validation

- Un seul moteur de navigateur (Chromium). Safari (iOS, macOS) et Firefox n’ont pas été testés ; aucun appareil réel.
- Réseau et serveur locaux : les performances en ligne (compression, cache, CDN, 4G) ne sont pas mesurées.
- Accessibilité : contrôle automatique et parcours au clavier ; pas de lecteur d’écran réel.
- Formulaire de contact : vérifié avec un faux Brevo local ; l’envoi réel dépend de la clé configurée dans Vercel, que
  cette mission n’a ni lue ni transmise.
- Aucune vérification sur le site en production : la publication est une étape à part.

## 12. Où sont les preuves

- Dans le dépôt (`outils/`, jamais publié) : ce fichier, `SUIVI-MISSION.md`, `MATRICE-COUVERTURE.md`,
  `CARNETS-CORRESPONDANCE.md`, les tests et scripts de contrôle (`outils/tests/`).
- Hors dépôt, livrés à part : `captures-v7.52/` (captures) et `rapports-v7.52/` (sorties des suites, `rapport.json` de
  l’audit, `accessibilite-perf.json`, `mots-coupes.json`).
