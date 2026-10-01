# Matrice de suivi — mission « corrections visuelles, fluidité et Léo » (5 lots)

Prompt maître : « LeonidaKit : corrections visuelles, fluidité et LEO en 5 lots » (reçu le 1er octobre 2026). Base de départ : zip
Leonidadex-main (7) = v7.53 (SHA-256 a650b62af33e46d976e867f68cb727d4feada62637cb7b4ee30bc43cf2750b8e), identique au site en
ligne à un cheveu près (seul l'empreinte de `common.js` liée à Léo diffère). Cette matrice est tenue dans le dépôt (jamais déployée :
`outils/` est exclu par `.vercelignore`) et mise à jour à la fin de chaque lot ; aucune ligne ne disparaît d'un lot à l'autre.

États : à faire · en cours · corrigé à vérifier · validé · bloqué.

## Lot 1 — diagnostic, latence et socle de performance (v7.54, 1er octobre 2026)

| Id | Demande | Page / composant réel | État | Modification | Vérification / blocage |
|---|---|---|---|---|---|
| PERF-01 | État initial mesuré, méthode reproductible, réseau/poids/JS/rendu séparés, froid/chaud | 415 pages ; communs `common.js`, `app.js`, `style.css`, `search-index.js`, `assets-manifest.js` ; pages mesurées : accueil, Véhicules, Armurerie, Carte, Calculateur, Consommables, Progression, une fiche véhicule, une fiche arme | validé | Inventaire (`outils/PREUVES-v7.54.md` § 1) ; harnais Playwright `qa/perf.cjs` (CPU ×4, 10 Mbit/s + 40 ms, gzip, 1280/390, froid/chaud, 3 répétitions), actions (recherche, filtres, tri, « Afficher plus », survol, carte, calculateur, listes, Léo), défilement synthétique | 108 navigations avant + 108 après, 0 erreur JS, 0 ressource manquante ; résultats § 3 des preuves ; limite : laboratoire Chromium, pas des visiteurs réels |
| PERF-02 | Latence Véhicules : arrivée, images, recherche, filtres, tris, fiches, comparaison | `vehicules.html` (gen.js, gabarit `outils/templates/vehicules.html`), `app.js`, `fiches.js`, `style.css` | validé | 248 schémas en ligne (810 Ko, ~15 000 nœuds) → fichiers `img/schemas/*.svg` en `<img loading="lazy">` (8 premières cartes tout de suite) ; cartes au-delà de 48 écrites masquées (`hidden`, feuille `<noscript>` sans script) ; `vehicules-data.js` (215 Ko) plus chargé par le hub ni par les 302 fiches, marques écrites dans la page (`data-marques`) ; cartes indexées une fois, recherche/filtre sans réinsertion, tri calculé une fois et limite d'affichage sur l'ordre trié (bogue du tri partiel corrigé) ; bandeau des marques mesuré une fois ; double filtrage au chargement retiré ; possessions/comparaison mises à jour sans parcourir la grille ; accordéon au survol conservé (décision du 28/09) | HTML 1 478 → 712 Ko ; nœuds au chargement 18 243 → 11 201 ; DCL cache froid 1280 px 3 657 → 2 085 ms (mobile 3 317 → 1 826), cache chaud 3 292 → 1 694 ms (mobile 3 093 → 1 618) ; LCP froid 1 708 → 696 ms (mobile 1 580 → 592) ; styles 1 307 → 581 ms, mise en page 876 → 530 ms ; transfert 417 → 313 Kio ; action « filtre » 106 → 44 ms, « Afficher plus » 18 → 2 ms ; recette Chromium (recherche, effacer, filtre, tri A→Z sur tout le catalogue, Afficher plus, garage, comparer, survol, liens #suv et #cat=…) : 0 échec ; test `performance-lot1` |
| PERF-03 | Latence Arsenal : mêmes blocs, scripts, images, animations, contenus longs | `armes.html` (même grille et même `app.js` que Véhicules), `catalogue.js` (listes), `suivi.js`, `localisateur.js` | validé | Même moteur de grille (aucune réinsertion, tri unique) ; `armes-data.js` plus chargé par le hub ni par les fiches (aucun script ne le lisait) ; listes dépliables (`catalogue.js`) : filtre sans déplacer les lignes, tri en cache, attente de 80 ms retirée ; constructeur d'équipement inchangé (dessins en ligne conservés : il les copie) | DCL cache froid 1280 px 1 424 → 1 380 ms (mobile 1 393 → 1 349), chaud 892 → 869 ms ; transfert 292 → 257 Kio ; action « tri » 33 → 13 ms, « filtre » 18 → 12 ms ; listes Consommables : recherche → résultat 123 → 53 ms ; recette (recherche, filtre, tri statut, équipement, arsenal, suivi) : 0 échec ; aucune animation ne retarde un filtre ou une fiche (actions → deux trames, preuves § 3) |
| PERF-04 | Causes communes : doublons, recalculs de mise en page, rendus inutiles, index, scripts bloquants, images, médias différés, composants lourds, cache | `outils/sync-site.cjs`, `common.js` (`LK.lazyScript`), `app.js`, `leo-loader.js`, `fiches.js`, `lk-showcase.js`, `vercel.json`, `style.css` | validé | Index de recherche (175 Ko) et lieux (374 Ko) déclarés en `<script type="lk/lazy">` sur les 415 pages et chargés à la première approche de la recherche ; données véhicules/armes retirées des pages qui ne les lisent pas ; en-tête déjà peint jamais caché puis remontré (`lk-hero-still`), premier écran sans transition (`lk-instant`) ; rails : lectures puis écritures (plus une mise en page par bloc) ; galerie des fiches : première image conservée (pas de second décodage) ; bouton Léo : plus de tests de recouvrement à chaque trame ; galerie épinglée : aucune écriture si la position n'a pas changé ; `will-change` limité à l'entrée ; cache Vercel : scripts et feuilles versionnés 7 jours, polices 1 an, pages toujours revalidées ; module mort `calculateurs-tools.js` retiré | Transfert accueil 523 → 491 Kio, fiche véhicule 378 → 294 Kio, fiche arme 187 → 152 Kio, Progression 595 → 564 Kio ; DCL cache chaud Progression 550 → 461 ms, fiche véhicule 504 → 430 ms ; clignotement du premier écran : 40 blocs → 0 (12 pages × 2 largeurs) ; recette : aucun `search-index.js` téléchargé avant la recherche sur 31 pages × 2 largeurs, recherche/lieux/`?q=`/touche « / » opérationnels ; `node outils/verifier.js` : 47 953 références, 0 erreur |
| PERF-05 | Animations et composants communs : mécanisme léger, contenus ajoutés/filtrés, `prefers-reduced-motion`, sans bloquer le contenu ni multiplier les écouteurs | `common.js` (`window.LKMotion`), `app.js` (`LK_reveal` conservé), `learning-motion.js`, `style.css` | validé | Un seul IntersectionObserver pour `.reveal` / `.rise` / `.lk-reveal` / `[data-lk-reveal]` ; premier écran montré dans la même tâche que la classe `js` (plus de clignotement ni d'attente) ; vagues de 60 ms plafonnées à 300 ms ; filet de sécurité limité à l'écran (l'ancien affichait toute la page après 2,5 s et supprimait les apparitions suivantes) ; `observe(nœuds, {replay})` pour les résultats filtrés, `enter(nœuds)` (cascade Web Animations) pour les lignes des lots 2 et 3 ; réduction des mouvements et impression : tout visible ; sans JavaScript : tout visible | Tests `performance-lot1` (API, premier écran, replay, feuilles) ; recette : rien de caché dans le premier écran sur 62 combinaisons, blocs sous l'écran qui attendent puis apparaissent, réduction des mouvements, impression |

## Lot 2 — Arsenal, cartes, Progression, Planques et Collectibles

| Id | Demande | Page / composant réel (repéré au lot 1) | État | Modification | Vérification / blocage |
|---|---|---|---|---|---|
| VIS-01 | Refaire le bloc « 05 — 6 changements » (six cartes, images, ratios, apparition) | `armes.html#combat` (zone éditoriale `outils/hubs-editoriaux.json` → `armes.combat.items`, `outils/hubs-editoriaux.cjs`) — à confirmer au navigateur au début du lot 2 | à faire | — | Prévu lot 2 |
| VIS-02 | Carte du bloc « 06 » cohérente avec la section Carte | `armes.html#carte` (`outils/carte-vignette.cjs`, `outils/localisateur.cjs`, `img/leonida-silhouette.svg`) vs `carte.html` (`.map-bg`) — à confirmer | à faire | — | Prévu lot 2 |
| VIS-03 | Apparition des cartes de Progression | `progression.html` (cartes `.cn-dcard` écrites par `outils/gen-carnets.cjs`, `progression.js`, `carnets.css`) ; mécanisme prêt : `LKMotion.observe` / `enter` | à faire | — | Prévu lot 2 |
| VIS-04 | Aligner les trois cartes de Planques | `planques.html#fiches` (`.lore-grid`, `outils/lore-gen.js`, `style.css`) | à faire | — | Prévu lot 2 |
| CONT-01 | Harmoniser « Méthode et sources » de Collectibles | `collectibles.html#methode-sources` ; références `demeures.html#sources`, `entreprises.html#sources`, `lieux.html#sources` (`outils/hubs-monde.cjs`, `outils/editorial-hubs.json`) | à faire | — | Prévu lot 2 (recherche Internet datée) |

## Lot 3 — Consommables, Vêtements et style, Personnalisation

| Id | Demande | Page / composant réel (repéré au lot 1) | État | Modification | Vérification / blocage |
|---|---|---|---|---|---|
| UI-01 | Fiches complètes en format paysage sur ordinateur | `details.cat-fiche` des six familles (`outils/catalogues.cjs`, `outils/fiche-doc.cjs`, `acquisitions.css`) : `nourriture.html`, `style.html` (coiffures 55, tatouages 24, tenues 30), `personnalisations.html` (véhicules 58, armes 40) | à faire | — | Prévu lot 3 |
| UI-02 | Légendes plus visibles et colorées | `.cat-legend`, `.pip`, `.ed-status`, `.doc-row` (`acquisitions.css`, `style.css`) | à faire | — | Prévu lot 3 |
| UI-03 | Apparitions verticales des lignes | `tr.cat-row` / `details.cat-fiche` ; mécanisme prêt : `LKMotion.enter` (cascade, lignes de tableau en opacité seule, focus respecté) | à faire | — | Prévu lot 3 |
| UI-04 | Calibrage rigoureux | mêmes pages, largeurs 360/390/768/1024/1280/1440 | à faire | — | Prévu lot 3 |
| CONSO-01 | Descriptions repliées par défaut | `nourriture.html` (`.cat-desc`, `consommables.js`, `catalogue.js`) | à faire | — | Prévu lot 3 |
| CONSO-02 | Révélation, couleur, alignement des descriptions | idem | à faire | — | Prévu lot 3 |
| CONSO-03 | Vérification explicite de la section Consommables | `nourriture.html` (30 lignes) | à faire | — | Prévu lot 3 |
| STYLE-01 | Bordure latérale de Tatouages | `style.html#tatouages` (cause à identifier au navigateur) | à faire | — | Prévu lot 3 |
| STYLE-02 | Toutes les listes et fiches de Vêtements et style | `style.html` (3 familles, 109 lignes) | à faire | — | Prévu lot 3 |
| STYLE-03 | Trois cartes « Adresses » en carrousels | `style.html#adresses` (`outils/catalogues/editorial.json`, `outils/gen-acquisitions.cjs`, médias `outils/medias-officiels.json`) | à faire | — | Prévu lot 3 |
| STYLE-04 | Visuel de « Les articles du bonheur » | `style.html#collections` (`outils/acquisitions.json`) | à faire | — | Prévu lot 3 |
| STYLE-05 | Troisième carte « Tenues et coiffure » | `style.html#collections` | à faire | — | Prévu lot 3 |
| PERSO-01 | Toutes les listes de Personnalisation | `personnalisations.html#perso-vehicules`, `#perso-armes` | à faire | — | Prévu lot 3 |
| PERSO-02 | Toutes les fiches de Personnalisation | `personnalisations.html` (`details.cat-fiche`) | à faire | — | Prévu lot 3 |

## Lot 4 — À propos, mentions légales et cookies

| Id | Demande | Page / composant réel (repéré au lot 1) | État | Modification | Vérification / blocage |
|---|---|---|---|---|---|
| ABOUT-01 | Retirer le prénom de la page À propos | `a-propos.html#qui` (généré par `outils/gen-informations.cjs`, données `outils/site-informations.json`) | à faire | — | Prévu lot 4 |
| ABOUT-02 | Animations et apparitions de la page À propos | `a-propos.html` (`lk-showcase.js`, `informations.css`, LKMotion) | à faire | — | Prévu lot 4 |
| LEGAL-01 | Examen des Mentions (sources CNIL, Service-Public, Légifrance) | `mentions-legales.html`, `contact.html`, `api/contact.js`, `outils/site-informations.json` | à faire | — | Prévu lot 4 |
| COOKIE-01 | Audit réel des cookies, traceurs et stockages | toutes pages ; formulaire Brevo de l'accueil ; `localStorage` / `sessionStorage` (`lk_*`) ; CSP dans `vercel.json` ; `outils/preuve-confidentialite.cjs` | à faire | — | Prévu lot 4 |
| COOKIE-02 | Décision et mise en œuvre proportionnée | selon COOKIE-01 | à faire | — | Prévu lot 4 |

## Lot 5 — Léo, vérification globale et livraison finale

| Id | Demande | Page / composant réel (repéré au lot 1) | État | Modification | Vérification / blocage |
|---|---|---|---|---|---|
| LEO-01 | Comprendre puis améliorer Léo | `leo-loader.js`, `leo-nlp.js`, `leo-core.js`, `leo-ui.js`, `leo-link.js`, `leo-calculator.js`, `leo-index.json`, `leo/*.json`, `outils/gen-leo.cjs`, `outils/leo-knowledge.json` | à faire | Lot 1 : ouverture inchangée (chaîne de scripts à la demande), placement du bouton allégé | Prévu lot 5 |
| LEO-02 | Capacités pratiques (a → h) | idem | à faire | — | Prévu lot 5 |
| LEO-02a | Recherche et navigation dans toutes les rubriques, formulations naturelles | `leo-nlp.js`, `leo-core.js`, `leo/catalogues.json` | à faire | — | Prévu lot 5 |
| LEO-02b | Liens et actions vers la bonne page, fiche ou vue filtrée, calculateur compris | `leo-link.js`, ancres des catalogues et du calculateur | à faire | — | Prévu lot 5 |
| LEO-02c | Aide contextuelle liée à la page | `leo-ui.js`, suggestions par page (`leo-index.json`) | à faire | — | Prévu lot 5 |
| LEO-02d | Accompagnement vers le bon outil du calculateur | `leo-calculator.js`, `calculateurs.html` (8 calculs + business plan) | à faire | — | Prévu lot 5 |
| LEO-02e | Comparaisons utiles avec provenance et limites | `leo-core.js`, `calculateurs.html?tool=compare` | à faire | — | Prévu lot 5 |
| LEO-02f | Réponses brèves, actionnables, statut et sources | `leo-core.js`, `leo-ui.js` | à faire | — | Prévu lot 5 |
| LEO-02g | Gestion claire des échecs | `leo-core.js`, `leo-ui.js`, `leo-loader.js` | à faire | — | Prévu lot 5 |
| LEO-02h | Confort : ouverture/fermeture, suggestions, effacement, copie, clavier, mobile, transparence sur le stockage | `leo-ui.js`, `leo.css`, `sessionStorage` `lk_leo_session_v2` | à faire | — | Prévu lot 5 |
| LEO-03 | Latence et fiabilité de Léo | idem + cache des morceaux `leo/*.json` | à faire | Lot 1 (mesure, CPU ×4) : première ouverture 300 à 570 ms (1 033 → 625 ms sur Véhicules mobile grâce à la page allégée), réponse « Bonjour » 180 à 290 ms ; bouton allégé au défilement | Prévu lot 5 |
| FINAL-01 | Reprise des mesures après tous les ajouts | même protocole que PERF-01 (`qa/perf.cjs`, livré dans le dossier de contrôle) | à faire | — | Prévu lot 5 |
| FINAL-02 | Recette fonctionnelle et visuelle (360 → 1440 px) | `qa/recette.cjs` à étendre | à faire | — | Prévu lot 5 |
| FINAL-03 | Clore la matrice | ce fichier | à faire | — | Prévu lot 5 |

## Transversal

| Id | Demande | État | Modification | Vérification |
|---|---|---|---|---|
| REPRISE-01 | Anticiper la perte de contexte : état de reprise après chaque lot | validé (lot 1) | Dossier de contrôle livré à part (prompt maître, matrice, preuves, mesures, captures, scripts, message de reprise) ; `LISEZ-MOI-v7.54.txt` ; ce fichier | À refaire à la fin de chaque lot |
