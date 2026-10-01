# Preuves — v7.58, lot 5 (Léo, vérification globale et livraison finale), 1er octobre 2026

Base : dépôt GitHub `TevaWendt/Leonidadex`, commit `2eb945f` (v7.56 + suppression du svg) + lot 4 (v7.57). « Avant » dans les mesures
= commit `2eb945f` servi en local ; « après » = v7.58. Environnement : Node 22.22, Chromium 141 (Playwright), serveur statique local,
CPU ralenti ×4 et réseau émulé 10 Mbit/s + 40 ms pour les mesures. Mesures de laboratoire, pas des visiteurs réels.

## 0. Décisions du lot 4 (LEGAL-01 → validé)

| Point | Décision écrite dans Mentions | Où |
|---|---|---|
| Responsable du traitement | « l’éditeur du site, personne physique (voir Éditeur), joignable à contact@… Son identité est connue de l’hébergeur (LCEN, art. 1-1 II) et t’est communiquée sur simple demande à cette adresse, notamment pour exercer tes droits. » | `#responsable`, `gen-informations.cjs` (`controllerNote`), `editorName` reste `null` |
| Messages de Contact | « 12 mois après le traitement de ta demande (réponse envoyée ou demande classée), puis les supprime (règle fixée le 1er octobre 2026) ; tu peux demander l’effacement avant. » | ligne `#donnees-contact`, `contactRetention` / `contactRetentionDecidedAt` |
| Tests | `contact-v746` (23 / 23), `conformite-v753` ; recette finale : `#responsable` visible sous les barres | |

## 1. LEO-01 — état de départ et manques (sonde `qa/leo-sonde.cjs`, 150 questions, 18 familles)

| Mesure de départ (commit `2eb945f`) | Résultat |
|---|---|
| Évaluation `leo-eval.cjs` (490 questions) | 485 / 490 (99 %), hors sujet 39 / 39, 0 sans source ; échecs : 4 suites de conversation, 1 question sur le prénom |
| Tests Node `leo.test.cjs` + `leo-v745.test.cjs` | 86 / 86 |
| Contrôle navigateur `leo-browser.cjs` (7 largeurs, clavier, mouvement réduit, CPU ×4) | tenu (typed ≤ 146 ms, suggestion 165 ms, ouverture min 615 ms à ×4) |
| Manques (détail dans `CHANGEMENTS-v7.58.txt` § A) | suites détournées par des lignes de catalogue ; sections nommées sans verbe ; « ouvre les tatouages / coiffures / la personnalisation des armes / les achats » ; « ouvre la fiche du Dinka Enduro » ; lien `#cat=helico` faux ; aucune aide liée à la page ; « c’est qui <inconnu> » → Léo se présente ; comparaison → calculateur sans prix ; pas de copie ; erreur de chargement sans suite |

## 2. LEO-02 / LEO-03 — après

| Contrôle | Résultat |
|---|---|
| Évaluation `leo-eval.cjs` | **512 / 512 (100 %)**, hors sujet 39 / 39, 0 réponse sans source (22 questions ajoutées : suites, sections, fiche nommée, comparaisons, aide ; 2 attentes mises à jour : « X ou Y » → comparaison factuelle avec la demande « Quel achat choisir ? » préparée ; « c’est qui teva » → introuvable vers Personnages) ; médiane 1,4 ms, p95 5 ms (jsdom) |
| Tests Node | `leo.test.cjs` + `leo-v745.test.cjs` : 86 / 86 (lot B adapté : deux fiches nommées reçoivent la comparaison factuelle **et** la demande `compare` avec les deux fiches ; noyau ≤ 320 Kio) |
| Sonde (18 familles) | a) Consommables, Style, Personnalisation, Collectibles, formulations naturelles : toutes vers la bonne page ou la bonne fiche ; b) 17 demandes « ouvre… » : page, ancre, vue filtrée ou fiche exacte ; c) aide sur Consommables, Véhicules, Calculateur : sujets de la page ; d) calculateur : 11 / 11 vers le bon outil ; e) comparaisons : factuelles, sans vainqueur ; f) statuts et sources présents ; g) vide → intro, inconnu → introuvable + page la plus proche, hors sujet → refus + Rockstar, triche → « rien d’annoncé » |
| Liens de Léo (recette finale) | 77 liens distincts renvoyés sur 42 questions × 4 pages : tous servis (200), ancres présentes, vues filtrées existantes (`#cat=`, `#famille=catégorie|statut|étiquette`), ateliers du calculateur présents |
| `gen-leo.cjs` | refuse une vue filtrée inexistante (vérifié en forçant `#cat=helico` : « Filtre absent ») ; 72 catégories, 331 sujets, aide par page validée (pages et sujets existants) ; `--check` identique à l’octet |
| Noyau | 310 670 octets (≤ 320 Kio), 85 Kio compressés (80 avant) ; 7 morceaux inchangés en taille |
| Latence `qa/leo-latence.cjs` (×4, 10 Mbit/s + 40 ms, 5 essais, médianes, 390 px) | ouverture 969 → 1 025 ms ; première question qui charge un morceau 680 → 762 ms ; même question 113 → 96 ms ; noyau seul 120 → 99 ms ; section nommée 310 → 102 ms ; 12 fichiers chargés, **0 rechargé** à la deuxième question |
| Contrôle navigateur `leo-browser.cjs` (après, machine au repos) | **tenu** : 0 erreur console, 0 erreur de page, 0 débordement sur 7 largeurs × 6 pages, clavier (390 : modal, Tab reste dedans ; 1 280 : non modal), Échap et focus de retour, mouvement réduit immédiat, questions tapées ≤ 194 ms et suggestion 234 ms à CPU ×4, lien « Signaler » → Contact prérempli |
| Copie | bouton présent sous chaque réponse ; le texte copié contient la réponse, le statut, les liens en adresses absolues et la source (recette finale) ; retour « Réponse copiée ✓ » et annonce `role=status` |
| Effacement, clavier | « Effacer » vide la conversation et `lk_leo_session_v2` ; Échap ferme, focus de retour sur `#leo-launch` ; à 390 px la fenêtre est modale et Tab reste dedans |
| Confidentialité | inchangée : aucun service distant, session dans l’onglet seulement, écrite après la première question (audit du lot 4 : Léo n’écrit qu’en `sessionStorage`) |

## 3. Vues filtrées des listes (`catalogue.js`, v7.58)

| Adresse | Effet vérifié (recette finale) |
|---|---|
| `nourriture.html#consommables=boissons` | liste ouverte, filtre Catégorie = Boissons, lignes d’une seule catégorie |
| `style.html#coiffures=officiel` | liste ouverte, filtre Statut = officiel, badge « officiel » de la légende pressé |
| `personnalisations.html#perso-armes=mitrailleuse` | étiquette de compatibilité (comportement du lot 6 conservé) |

## 4. FINAL-01 — mesures comparables au lot 1 (`qa/perf-final.cjs`, CPU ×4, 10 Mbit/s + 40 ms, cache froid puis chaud, 3 répétitions, médianes)

1280 px (avant → après) :

| Page | Transfert froid (Kio) | DCL froid (ms) | LCP froid (ms) | DCL chaud (ms) | CLS | Actions (ms) |
|---|---|---|---|---|---|---|
| index.html | 873 → 874 | 1 215 → 1 297 | 1 128 → 1 224 | 444 → 394 | 0,001 → 0,007 | Léo : ouverture 1 030 → 1 091, réponse 286 → 338 |
| vehicules.html | 1 314 → 1 315 | 2 843 → 2 629 | 1 108 → 1 060 | 2 005 → 1 947 | 0,006 → 0,079 (voir note) | recherche 473 → 511 ; filtre 647 → 617 ; tri 367 → 362 |
| armes.html | 714 → 715 | 1 904 → 2 231 | 1 964 → 1 328 | 1 289 → 1 018 | 0 → 0 | filtre 467 → 467 |
| carte.html | 1 827 → 1 828 | 2 122 → 2 236 | 1 024 → 1 208 | 1 028 → 1 373 | 0 → 0 | |
| calculateurs.html | 1 727 → 1 728 | 2 500 → 2 299 | 1 588 → 1 840 | 1 081 → 1 198 | 0,025 → 0,025 | saisie 316 → 304 |
| nourriture.html | 927 → 929 | 1 572 → 1 466 | 1 316 → 1 220 | 878 → 837 | 0 → 0 | fiche (mesure dans la page, 7 essais) 353 → 342 |
| style.html | 1 265 → 1 267 | 1 855 → 1 975 | 1 080 → 1 004 | 970 → 938 | 0 → 0 | |
| personnalisations.html | 1 267 → 1 269 | 1 608 → 1 642 | 952 → 1 012 | 820 → 882 | 0 → 0 | |
| progression.html | 1 043 → 1 044 | 1 195 → 1 158 | 1 048 → 1 060 | 436 → 365 | 0,005 → 0,005 | |
| vehicules/vapid-caracara-4x4.html | 569 → 569 | 996 → 1 025 | 916 → 916 | 483 → 442 | 0,05 → 0,05 | |
| armes/girardi-es9.html | 614 → 615 | 953 → 896 | 1 044 → 824 | 428 → 518 | 0 → 0 | |
| a-propos.html | 937 → 938 | 1 075 → 1 016 | 1 320 → 944 | 477 → 590 | 0 → 0 | |
| mentions-legales.html | 508 → 511 | 834 → 870 | 820 → 828 | 372 → 331 | 0 → 0 | |
| collectibles.html | 858 → 858 | 1 287 → 1 344 | 1 160 → 1 172 | 652 → 510 | 0,022 → 0,022 | |

390 px (avant → après) :

| Page | Transfert froid (Kio) | DCL froid (ms) | LCP froid (ms) | DCL chaud (ms) | CLS | Actions (ms) |
|---|---|---|---|---|---|---|
| index.html | 602 → 603 | 1 112 → 1 051 | 896 → 1 000 | 392 → 315 | 0 → 0 | Léo : ouverture 991 → 973, réponse 270 → 340 |
| vehicules.html | 1 277 → 1 278 | 2 425 → 2 447 | 920 → 976 | 1 564 → 1 671 | 0,033 → 0,033 | recherche 382 → 369 ; filtre 419 → 375 ; tri 315 → 323 |
| armes.html | 714 → 715 | 1 957 → 1 945 | 1 312 → 1 248 | 1 005 → 1 039 | 0,02 → 0,02 | filtre 384 → 422 |
| carte.html | 1 827 → 1 828 | 2 071 → 2 109 | 956 → 1 020 | 998 → 1 058 | 0 → 0 | |
| calculateurs.html | 1 727 → 1 728 | 2 486 → 2 403 | 1 620 → 1 576 | 1 057 → 1 008 | 0,026 → 0,026 | saisie 378 → 275 |
| nourriture.html | 927 → 929 | 1 824 → 1 688 | 1 384 → 1 200 | 931 → 842 | 0 → 0 | |
| style.html | 1 265 → 1 267 | 1 866 → 1 930 | 884 → 896 | 951 → 973 | 0 → 0 | |
| personnalisations.html | 1 212 → 1 213 | 1 754 → 1 720 | 872 → 848 | 978 → 847 | 0,033 → 0,033 | |
| progression.html | 859 → 860 | 1 164 → 1 212 | 1 184 → 1 168 | 414 → 387 | 0 → 0 | |
| vehicules/vapid-caracara-4x4.html | 521 → 522 | 945 → 1 023 | 760 → 864 | 371 → 384 | 0,005 → 0,005 | |
| armes/girardi-es9.html | 484 → 485 | 925 → 971 | 996 → 1 032 | 325 → 334 | 0,005 → 0,005 | |
| a-propos.html | 556 → 557 | 958 → 1 054 | 820 → 896 | 398 → 408 | 0,005 → 0,005 | |
| mentions-legales.html | 508 → 511 | 892 → 873 | 808 → 792 | 312 → 372 | 0 → 0 | |
| collectibles.html | 849 → 850 | 1 317 → 1 405 | 1 164 → 1 168 | 572 → 650 | 0,033 → 0,033 | |

Lecture : transferts identiques (+1 à +3 Kio : date de l’historique des Mentions, empreintes), nœuds identiques, aucun écart
hors du bruit de trois répétitions (−14 % à +9 % sur les temps, dans les deux sens, sur des pages dont le HTML n’a pas changé).
Les gains du lot 1 (Véhicules : DCL 3 657 → 2 085 ms en v7.54 dans les mêmes conditions) sont conservés : 2 629 ms ici avec un
catalogue de 302 cartes et le réseau émulé.

Note CLS Véhicules à 1 280 px : la valeur 0,079 est apparue 2 fois sur 6 **après** et 3 fois sur 6 **avant** (`qa` : mesure
répétée, ordre inversé) : décalage intermittent et préexistant des rails décoratifs des bords de page (`.lk-rails`, `common.js`),
recalés après le chargement des images de l’en-tête. Corrigé en v7.58 : les rails restent `visibility:hidden` jusqu’au chargement,
puis sont placés et montrés (6 / 6 mesures après correction : 0,006, dû au bouton de Léo, inchangé). Rails vérifiés visibles à
1 440 px après chargement.

## 5. FINAL-02 — recette fonctionnelle et visuelle (`qa/recette-finale.cjs`)

| Bloc | Contrôles | Résultat |
|---|---|---|
| 21 pages × 8 largeurs (360, 390, 768, 1024, 1079, 1081, 1280, 1440) | 0 erreur JS, `scrollWidth ≤ clientWidth`, en-tête présent, menu complet ou bouton de menu (seuils 1 080 et 820 px), aucune image chargée cassée, bouton Léo dans l’écran | 168 / 168 |
| Véhicules | recherche « vapid » réduit la grille ; filtre SUV → une seule catégorie et `#cat=suv` ; tri « Nom A → Z » (ordre physique) ; adresse partagée `#cat=pickup` ; « Afficher plus » ; case « Garage » → `lk_own_vehicules` et `aria-pressed` | 6 / 6 |
| Armurerie | filtre Pistolets ; constructeur d’équipement interactif | 2 / 2 |
| Carte, Calculateur | fond et repères, 0 erreur ; aucune clé du calculateur avant la saisie, `lk-calculator-v1` après | 3 / 3 |
| Listes | `#consommables=boissons`, `#coiffures=officiel` ; légende « repère de la série » filtre ; « Description » déplie ; « Fiche complète » ouvre la fiche avec le focus dedans ; Échap ferme, focus de retour | 6 / 6 |
| Style, Planques | carrousel : vue suivante ; trois collections sur une rangée ; images des cartes de Planques de même hauteur | 3 / 3 |
| Progression | deux véhicules cochés (clé historique) comptés, identiques après rechargement, clés `lk` seulement ; export proposé | 3 / 3 |
| À propos, Mentions | 44 éléments animés tous apparus, aucun prénom ; `#responsable` sous les barres (marge 150 → 170 px : la translation d’entrée de 20 px des sections faisait atterrir l’ancre 7 px sous la barre, trouvé par cette recette) | 2 / 2 |
| Léo | ouverture < 5 s (CPU normal) sur 4 pages ; 42 questions répondues ; 77 liens vérifiés ; copie ; effacement ; Échap | 9 / 9 |
| Mouvement réduit / sans script (À propos, Consommables, Progression, Armurerie) | tout visible, rien de décalé ; contenu lisible sans script | 8 / 8 |
| **Total** | | **214 / 214, 0 échec** (146 s) |

Recettes des lots précédents rejouées sur la v7.58 : lot 3 `recette-lot3.cjs` **227 / 227**, lot 4 `recette-lot4.cjs` **51 / 51**.
Contrôle navigateur de Léo `outils/tests/leo-browser.cjs` (7 largeurs 320 → 1 920, clavier à 1 280 et 390, mouvement réduit,
perf ×4, lien « Signaler » → Contact prérempli) : **tenu** (journal et captures `leo-browser/` du dossier de contrôle ; une image
interrompue par la navigation vers Contact — `ERR_ABORTED` — n’est plus comptée comme erreur du site).

## 6. Contrôles automatiques

| Contrôle | Résultat |
|---|---|
| `node outils/regenerer.cjs` (gen-leo `--check` compris) puis `node outils/verifier.js` | 48 355 références, 0 erreur, 415 pages |
| `node --test outils/tests/*.test.cjs` | 624 / 624 |
| `node outils/tests/leo-eval.cjs` | 512 / 512, seuils tenus |
| `node outils/preuve-confidentialite.cjs` | affirmations des Mentions tenues (aucun cookie, 0 tiers, CSP) |

## 7. Sources consultées (1er octobre 2026)

- https://www.rockstargames.com/VI — « Coming November 19, 2026 », PlayStation 5 et Xbox Series X|S : date de sortie revérifiée
  (`acquisitions.json` → `game.checkedAt` 2026-10-01).
- Pages du site relues pour les trois sujets d’aide : `vehicules.html` (puces, tri, barre de recherche, « Afficher plus », case
  Garage, « Comparer »), `armes.html` (constructeur d’équipement, classes, « Copier mon équipement », « Partager », puce « Mon
  arsenal »), `nourriture.html` / `style.html` / `personnalisations.html` (légende, boutons « Description », « Fiche complète », « Je l’ai »).

## 8. Limites et points ouverts

- Laboratoire seulement (Chromium, serveur local) ; Firefox, Safari et appareils réels non testés dans cet environnement : la
  fiche paysage (`<dialog>`), le presse-papiers (`navigator.clipboard`, repli `execCommand`) et `scroll-margin` sont des API
  largement prises en charge, mais non vérifiées ici sur ces navigateurs.
- L’ouverture de Léo coûte ≈ 1 s à CPU ×4 et 10 Mbit/s (≈ 560 Kio non compressés en local ; ≈ 170 Kio compressés chez Vercel) ; la
  première question qui touche un morceau ajoute 0,7 s dans le pire cas (question envoyée d’un coup, sans préchargement pendant la
  frappe). Réduire encore demanderait de découper le noyau (hors périmètre, documenté).
- Le bouton de Léo produit un décalage de 0,006 à son apparition (CLS total < 0,01) : laissé tel quel.
- Les aliases d’un seul mot des lignes de catalogue ne sont plus reconnus comme fiche : « blush » ou « street » seuls renvoient à la
  recherche ou à la section plutôt qu’à la ligne précise (choix assumé : ces mots détournaient des questions courantes).
