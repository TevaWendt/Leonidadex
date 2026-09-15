# Leonidakit — audit, corrections et validation

**Copie corrigée du 15 septembre 2026. Aucun déploiement effectué.**

Le projet complet est livré avec ses sources, ses 355 pages publiques, ses assets, ses tests et sa chaîne de génération. Les 44 tests automatisés passent ; le contrôle HTTP local couvre les 1 075 fichiers publiables. Cela ne constitue pas une certification d'absence de bugs : le rendu de la copie corrigée dans un vrai navigateur, sur mobile et tablette, n'a pas pu être validé dans cet environnement.

## 1. État global et méthode de notation

**Avant : 54/100. Après : 80/100.** Moyenne arithmétique des dix sous-scores, arrondie. Ce sont des appréciations d'ingénierie fondées sur les constats et limites ci-dessous, pas des scores Lighthouse, une mesure Core Web Vitals ou un certificat WCAG.

| Domaine | Avant | Après | Justification et limite |
|---|---:|---:|---|
| Fonctionnel | 52 | 84 | Catalogue synchronisé, recherche, possessions, équipement, comparateur et carte testés. Services externes et données futures restent à valider. |
| Code | 45 | 86 | Syntaxe réparée, états invalides gérés, 44 tests incluant toutes les pages au démarrage. Pas de preuve formelle sur toutes les combinaisons d'état. |
| Architecture | 60 | 82 | HTML/CSS/JS conservés, une chaîne de build, sources et sorties séparées, outils historiques archivés. Gabarits par extraction et gros moteur de carte restent complexes. |
| UX/UI | 64 | 78 | Feedback fidèle, absence d'images annoncée honnêtement, statistiques cohérentes, progression utile. Rendu final réel non vérifié. |
| Responsive | 60 | 70 | Revue des media queries, tailles minimales et débordements des contrôles traités. Aucune certification sur appareils réels. |
| Performance | 55 | 73 | 4 281 références photo inexistantes retirées des sorties, chargements conditionnels, CSS réparée, cache photos configuré. 10 photos > 1 Mo et 2 547 marqueurs restent coûteux. |
| SEO | 48 | 84 | 334 URL canoniques valides, redirections, noindex des pages appropriées, OG existants, liens internes corrigés. Indexation Google réelle non vérifiée. |
| Accessibilité | 50 | 78 | Boutons séparés des liens, recherches clavier, états ARIA, focus, contraste textuel et titres de pied de page. Lecteurs d'écran et rendu réel non testés. |
| Sécurité | 48 | 82 | Injection HTML corrigée, imports validés, erreurs de stockage traitées, sortie publique filtrée, CSP préparée, audit npm sans vulnérabilité signalée. Configuration effective en production non déployée. |
| Maintenabilité | 55 | 87 | Installation reproductible, documentation actuelle, inventaires, tests et build identique sur trois répétitions. Génération éditoriale des armes encore partiellement manuelle. |

Les scores après restent volontairement limités par les éléments non testés. Les corrections ne rendent pas disponibles des données de gameplay absentes des pièces fournies.

## 2. Sources, contexte et contradictions

Les trois sources ont été utilisées selon la hiérarchie demandée : code actuel pour l'implémentation, site déployé pour le comportement observé, `PROJECT_MEMORY.md` pour les intentions et décisions historiques.

| Source | Travail réalisé | Preuve livrée |
|---|---|---|
| ZIP `Leonidadex-main (3).zip` | Extraction originale conservée ; travail sur une copie ; inventaire des 1 094 fichiers et contrôle automatisé des textes, liens, syntaxes, données et assets | `inventaire-original.csv`, `avant.json`, diagnostic initial |
| Site https://www.leonidakit.com/index.html | Requêtes HTTP sur les 355 pages et 12 ressources existantes ; navigation réelle et interactions sur les principaux parcours | `http-production.json`, sondes HTTP et journal ci-dessous |
| `PROJECT_MEMORY.md` | Reconstruction du positionnement, de la chaîne véhicules, des règles d'images, des anciennes décisions et du statut des fonctionnalités incomplètes | Présent chapitre, références aux sections 1 à 16 du document fourni |

Les **367 réponses existantes contrôlées en production correspondent exactement, par SHA-256, aux fichiers du ZIP original**. Un essai supplémentaire sur un visuel véhicule annoncé mais absent renvoie 404. La sonde d'une route inconnue renvoie bien une vraie 404. Les fichiers internes `gen.js` et `v-corrige.json` sont, eux, accessibles en production : ils sont exclus du nouveau dossier public.

Le projet est un compagnon utilitaire, sans compte utilisateur, et non un wiki. L'identité graphique, les silhouettes, les liens existants et la carte maison sont conservés. La mémoire décrit l'abandon du wiki et de la 3D ; ces idées n'ont pas été réintroduites. Discord reste une intention différée. Les données de missions, collectibles, statistiques, prix et formules ne sont pas inventées.

| Contradiction | Arbitrage appliqué |
|---|---|
| Mémoire à 301 véhicules, sortie déployée à 300, accueil à 139 | `v-corrige.json` contient réellement 301 entrées ; régénération depuis cette source. Les compteurs anciens ne sont pas retenus. |
| Mémoire annonçant des fichiers dans `releve/`, ZIP les plaçant à la racine | Résolution des chemins depuis l'emplacement réel des scripts. |
| 12 véhicules avec vues déclarées, aucun dossier d'images véhicules fourni | Déclarations source conservées ; aucune image fabriquée ; sorties activées uniquement si le fichier existe. |
| Mémoire à 364 entrées de recherche, ancien fichier à 363 | Index reconstruit depuis les sources actuelles, URL dédupliquées : 358 entrées. Pas de remplissage artificiel pour atteindre un ancien total. |
| Texte « rien publié » ou ancien modèle réel, mais statut/inspiration mis à jour | 22 descriptions corrigées ; seuls les champs `txt` sont modifiés dans la base véhicules. Détail avant/après dans `corrections-descriptions.csv`. |
| À propos excluant toute information non confirmée, alors que le site affiche des identifications communautaires | Texte aligné sur les statuts réels, sans présenter les rapprochements comme des confirmations Rockstar. |
| Trois anciennes fiches sans correspondance certaine | Contenu conservé, bannière historique et noindex ; pas de redirection arbitraire. |

Les supports originaux ne sont généralement désignés que par un libellé. Les descriptions corrigées expriment les choix de la base ; **l'identification factuelle indépendante de chaque véhicule et de chaque lieu reste NON VÉRIFIÉE**. Le conflit historique concernant Brute Ambulance reste signalé.

## 3. Cartographie complète

Le dépôt initial contient 355 HTML, 21 JS, 2 CSS, 5 JSON, 4 XML, 700 JPEG et des documents. Le site n'utilise aucun framework, bundler applicatif, hook React, service worker, base serveur, API interne, middleware ou système d'authentification. Leurs absences ont été constatées dans le dépôt fourni, sans présumer de services non inclus dans celui-ci.

La sortie corrigée contient **355 HTML, 13 JS, 2 CSS, 2 XML, robots.txt et 702 assets**, soit **1 075 fichiers / 109 313 602 octets**. Les 702 assets sont les 700 photos existantes et les deux formats de la carte sociale créée à partir de l'identité graphique. Il n'y a aucune nouvelle image de véhicule ou de jeu.

| Pages / routes | Composants et scripts | Données / assets | Interactions |
|---|---|---|---|
| `/`, `/index.html` | En-tête, recherche, outils, newsletter ; `app.js`, `common.js` | `search-index.js`, manifeste, silhouettes CSS/SVG | Suggestions, clavier, liens, formulaire Brevo |
| `/vehicules.html` | Catalogue, filtres, garage, comparaison ; `app.js`, `fiches.js` | 301 véhicules, 13 catégories, gabarit de hub | Recherche, tri, filtres combinés, possessions, partage |
| `/vehicules/<id>.html` : 301 actives | Galerie, identité, modèle réel, carte, fiches liées | `v-corrige.json` → `vehicules-data.js` → `gen.js` | Garage, comparaison, navigation, liens de lieux |
| `/armes.html` et 23 fiches `/armes/<id>.html` | Catalogue, arsenal, équipement, galerie | `armes-data.js`, illustrations SVG | Filtres, possessions, choix d'équipement, partage |
| `/carte.html` | Fond SVG, couches, marqueurs, recherche, panneaux, éditeur, dessin, mesure, aide | 37 points locaux + 36 groupes + 2 474 bâtiments ; 700 photos fournies | Zoom/déplacement, filtres, repérage, marqueurs personnels, dessins, mesure, export/import |
| `/comparateur.html` | Sélecteurs, tableau et partage ; `comparateur.js` | Bases véhicules/armes, paramètres `type` et `ids` | Jusqu'à trois colonnes, validation et déduplication |
| `/classement-vehicules.html` | Liste ordonnée ; `classement.js` | Véhicules et `lk_classement` | Ajout, déplacement, retrait, partage, dix places maximum |
| `/vehicules-rares.html` | Cartes et FAQ | Champs actuels de la base véhicules ; armes existantes | Liens de fiches et accordéons |
| `/progression.html` | Trois compteurs avec barres ; `progression.js` | `progression-data.js` et stockage local | Possessions véhicules, arsenal, lieux repérés |
| `/calculateurs.html`, `/collectibles.html` | Pages d'attente explicites | Données de gameplay absentes | Navigation disponible ; calculs et emplacements non simulés |
| `/a-propos.html`, `/contact.html`, `/mentions-legales.html` | Pages éditoriales et navigation | Texte du site, adresse annoncée, crédits | Liens et contact ; pas de backend contact fourni |
| `/404.html` | Deux recherches indépendantes et navigation | Index global et URLs absolues | Retour au site même depuis une URL imbriquée |
| Six anciennes URL | Redirections HTTP 308 et repli HTML | `redirections.json`, `vercel.json`, alias armes | Accès à la fiche ou au hub courant |
| Sept fiches retirées, trois fiches historiques, vérification Google | Documents explicites ; historique noindex | `retraits.json`, `legacy-pages.json` | Conservation des anciennes entrées sans les remettre au catalogue |

`cartographie-routes.csv` et `cartographie-routes.json` détaillent **chaque page**, ses scripts, ses données, ses assets, ses liens et ses interactions. `inventaire-fichiers.csv` décrit chaque fichier livré ; `changements-fichiers.csv` liste toutes les créations, modifications et suppressions de chemins.

Il n'y a pas de route serveur dynamique : les fiches sont générées en HTML statique. Les états dynamiques sont dans les paramètres et ancres : catégories, tri, recherche, garage/arsenal, équipement, comparaison, classement et sélection de lieu. Les identifiants historiques, notamment `ford-explorer-police` et `vapid-caracara-lifeguard`, restent stables.

La seule variable d'environnement actuelle référencée par le projet est `SITE_ROOT`, facultative pour les tests. `NOUVEAUX` appartient à l'ancien build archivé. Aucune variable secrète requise pour faire fonctionner le site statique n'a été trouvée.

Les dépendances externes sont Google Fonts pour Archivo, Brevo pour la newsletter, les liens Google Maps/recherche/Wikipedia, et Wikimedia Commons pour un outil de téléchargement optionnel. Aucune requête Wikimedia n'est nécessaire au fonctionnement du site livré.

## 4. Corrections appliquées et preuves

Le diagnostic initial a été écrit avant les modifications importantes. Les identifiants A01 à A28 renvoient à ce document. Les nouvelles observations de la seconde passe sont détaillées ensuite. Chaque ligne rassemble une correction avec ses fichiers, sa raison et sa validation ; les changements de fichiers générés sont également recensés individuellement dans le CSV.

| ID / zone | Fichiers principaux | Modification et raison | Validation |
|---|---|---|---|
| A01 — génération | `final.js`, `gen.js`, `audit-final.js`, `croise.js`, `images.js`, `similarite.js` | Chemins relatifs à `__dirname` ; suppression des dépendances à un `releve/` absent | Build et outils exécutés avec succès |
| A02/A18 — données et compteurs | `v-corrige.json`, `final.js`, `gen.js`, `scripts/sync-site.cjs`, HTML et index générés | 301 véhicules, 23 armes, statuts 9/269/23, chiffres du hub et listes synchronisés | Schémas/IDs/liens, tests catalogue, sortie de génération |
| A03 — mauvaises sections carte | `gen.js`, 301 fiches, ancienne Stanier LE | Vrais liens vers les lieux de carte ; suppression du bloc Cadillac copié et des IDs doubles | Contrôle des 355 HTML ; test Sultan et références de lieux |
| A04 — injection recherche | `app.js`, `common.js` | Échappement du texte et des attributs ; URLs de recherche encadrées | Entrée `<svg>` rendue comme texte, aucun nœud injecté |
| A05/A22 — données locales | `common.js`, `carte.js`, `fiches.js`, `classement.js` | Validation des types, coordonnées, IDs, longueurs et formes ; gestion des JSON corrompus | Tests stockage nul, import hostile, IDs spéciaux, limites |
| A06 — marqueurs personnels | `carte.js` | Centrage distinct de l'ouverture d'un lieu avec statut ; panneau personnel correct | Ouverture depuis la liste personnelle sans erreur |
| A07 — CSS invalide | `fiches.css` | Accolade/règle orpheline réparée | Analyse PostCSS et lint |
| A08 — hub imbriqué | `vehicules/vehicules.html`, `vercel.json` | Redirection vers `/vehicules.html` au lieu d'une copie avec liens relatifs cassés | Test des références ; HTTP 308 local |
| A09/A20 — galeries absentes | `gen.js`, `fiches.js`, `scripts/sync-site.cjs`, manifeste | Galerie sans requête vers une image inexistante, mention « à intégrer », OG de repli existant | Tous les assets statiques ; test galerie vide et démarrage de chaque fiche |
| A10 — photos de carte | `data/carte-gtadb-source.json`, `carte-gtadb.js`, `carte.js` | Source complète préservée ; 4 281 références inexistantes retirées de la sortie ; crédits conservés | Inventaire des chemins et tests de panneaux |
| A11/A12 — ancres et filtres | `app.js`, `fiches.js` | Comparaison de datasets au lieu de sélecteurs construits ; conservation des paramètres des autres modules ; relecture sur hashchange | Ancres malformées, partage garage, équipement, changement de catégorie |
| A13 — classement | `classement.js`, `classement-vehicules.html`, `final.js` | Options depuis les 301 entrées et catégories lisibles | Ajout du nouveau Ford Explorer Sport Trac ; anciennes options absentes |
| A14 — newsletter | `index.html`, `app.js` | Suppression de la confirmation simulée et de l'iframe invisible ; navigation vers la réponse réelle de Brevo | Validation locale du formulaire ; envoi réel NON TESTÉ |
| A15 — presse-papiers | `common.js`, pages de partage, `carte.js` | Attente de la promesse ; message d'échec et texte récupérable | Refus simulé sans annonce « copié » |
| A16 — 404 | `404.html`, `app.js`, synchronisation | IDs uniques, deux recherches gérées, scripts et styles accessibles depuis une URL imbriquée | Test sur `/unknown/nested/route` ; sonde 404 HTTP |
| A17 — outils historiques | `build.js`, `fiches-gen.js`, `nouveaux.js`, `archive/legacy/` | Une seule chaîne ; anciennes implémentations conservées hors publication | Build reproductible, historique présent dans le ZIP |
| A19 — interactions accessibles | `app.js`, `fiches.js`, HTML/CSS | Cartes `article` avec lien et boutons séparés ; relations ARIA des recherches ; états pressés et focus | Aucun bouton dans un lien sur les pages publiques ; tests clavier |
| A21 — carte | `carte.js` | Dessin, mesure et édition mutuellement exclusifs ; garde des événements ; capture relâchée | Tests des modes et dessin par événements de pointeur, annulation/rétablissement |
| A23 — publication et SEO | `scripts/build-site.cjs`, `vercel.json`, sitemaps | Liste des fichiers publics, redirections, CSP, autres en-têtes ; génération stable des sitemaps, sans fausse date de modification | HTTP local sur 1 080 requêtes, conformité statique des scripts, trois builds identiques |
| A24 — licences et images | `images.js`, `photos-reelles.js`, `scripts/licenses.cjs` | Crédits bloquants, conservation des vues déclarées, rejet explicite NC/ND, limites HTTP | Tests de licences, de non-perte des données et de refus sans crédit |
| A25 — progression | `progression.html`, `progression.js`, `progression-data.js` | Trois suivis branchés sur les données existantes, IDs inconnus ignorés | Possessions 1/301, arsenal 1/23, lieux 1/2547 dans le scénario de test |
| A26 — information | `mentions-legales.html`, `a-propos.html` | Crédits photo/gtadb et destination Brevo explicités ; politique éditoriale cohérente | Revue des textes ; identité/contact restent à compléter |
| A27 — pages futures | `calculateurs.html`, `collectibles.html` | Attente conservée ; noindex/follow en attendant le contenu | Absence du sitemap, navigation conservée |

Les items A26 à A28 ne sont pas déclarés entièrement résolus : voir les décisions restantes. La correction de la newsletter ne prouve ni l'existence de la boîte mail ni l'acceptation d'une inscription par Brevo.

### Deuxième passe obligatoire

Cette passe a repris le graphe des routes, les données, les fichiers non publiés, les assets, les scripts et les scénarios de régression après la première série de changements. Elle a conduit aux corrections supplémentaires suivantes.

| ID / sévérité / nature | Zone, cause et impact | Correction / fichier | Preuve |
|---|---|---|---|
| A29 / ÉLEVÉE / BUG CONFIRMÉ | Descriptions anciennes contredisant les champs de marque, inspiration ou statut ; l'ancien audit textuel en manquait plusieurs | 22 textes alignés dans `v-corrige.json` ; garde renforcée dans `audit-final.js` | CODE, SITE sur Sultan, comparaison avant/après, tests d'identité et audit final |
| A30 / MOYENNE / BUG CONFIRMÉ | Équipement : anciennes valeurs `pistolet-jason` etc. sans carte correspondante, vignette « Vide » malgré verdict valide | Sélecteurs reconstruits depuis les armes actives ; résolution du lien de chaque carte dans `app.js` | SITE : cas reproduit ; TEST : toutes les options ont une illustration |
| A31 / ÉLEVÉE / BUG CONFIRMÉ | Import annonçant le succès après une erreur de stockage ; risque de données partiellement remplacées | Prévalidation complète, écritures groupées avec restauration en cas d'échec, état appliqué après succès ; `common.js`, `carte.js` | TEST : panne sur le troisième stockage, deux écritures restaurées, état antérieur conservé |
| A32 / MOYENNE / BUG CONFIRMÉ | Ancres anciennes `#suv` effacées à l'initialisation | Lecture du filtre historique avant réécriture ; `app.js` | TEST : 27 SUV affichés |
| A33 / MOYENNE / BUG CONFIRMÉ | Classement sauvegardé dupliqué, focus perdu après déplacement, DOM remplacé pendant le drag | Déduplication/limite à dix, focus maintenu, déplacement des nœuds existants ; `classement.js` | TEST : liste sauvegardée et déplacement clavier ; drag natif réel NON TESTÉ |
| A34 / MOYENNE / BUG CONFIRMÉ | Une deuxième photo peut exister seule ; la première valeur absente était malgré tout chargée | Chargeur ignorant une source absente ; `carte.js` | TEST : panneau avec seconde photo seule et aucune requête invalide |
| A35 / MOYENNE / ACCESSIBILITÉ | Petit texte corail insuffisamment contrasté sur les fonds clairs | Variante textuelle #B93220, boutons concernés assombris ; CSS | Calcul : 3,82 → 5,74 sur #FDFBF7 ; contraste réel de tous les fonds NON VÉRIFIÉ |
| A36 / FAIBLE / BUG CONFIRMÉ | « japonais » pluralisé en « japonaiss » et titres de pied de page mal hiérarchisés | Pluriels explicites, titres h2 avec style conservé ; génération/CSS | CODE et contrôle des HTML |
| A37 / MOYENNE / BUG CONFIRMÉ | Compteurs de carte restant à zéro ou annonçant 11 catégories au lieu des 12 catégories définies | Compteurs initialisés/synchronisés ; `carte.js`, synchronisation | TEST : 2 547 points ; 12 catégories dans le HTML |

Le dernier contrôle public ne conserve que 19 alertes interprétées : **18 pages intentionnellement hors graphe de navigation** et l'absence volontaire de canonical sur la 404. Les 18 pages sont six redirections, sept retraits, trois anciennes fiches, la 404 et la vérification Google. Aucun lien interne, script, asset ou ID de carte inexistant n'est signalé dans la sortie publiée.

Les gabarits et archives ont aussi été inventoriés et analysés. Leur HTML d'origine conserve des liens relatifs et références historiques : ils servent à l'extraction et à la provenance, ne constituent pas des routes exécutables et ne sont pas copiés dans `dist`. Les scripts courants vérifient la sortie générée. Les sept groupes de photos identiques sont conservés car plusieurs lieux peuvent partager une image.

## 5. Fonctions complétées et fonctions préservées

La progression auparavant démonstrative affiche désormais les possessions du garage, celles de l'arsenal et les lieux repérés. Les liens vers les trois sections permettent d'agir sur ces données. Les missions, succès et collectibles ne sont pas comptés dans un faux pourcentage global.

L'équipement d'armes, les partages de filtres/garage, la sélection de comparaison et le classement sont reconnectés aux IDs actifs. La navigation vers la carte depuis les fiches est restaurée. L'import/export de carte conserve les trois ensembles : lieux repérés, marqueurs personnels et tracés.

La carte, ses couches, ses catégories, ses outils de dessin, ses trajets/mesures et ses crédits restent présents. Les améliorations ne reconstruisent pas la carte avec une autre bibliothèque. Les anciens contenus explicitement retirés dans les sources restent des pages d'explication ; les trois contenus ambigus restent consultables sous un statut historique.

## 6. Données, assets, performances, sécurité et SEO

**Données.** Aucun ID véhicule/arme/lieu dupliqué, parent de carte absent ou coordonnée non finie n'est détecté. Les 301 entrées et les 23 armes ont des routes réelles. Les 2 547 points et les références de recherche sont contrôlés. Les 22 changements éditoriaux ne modifient ni IDs, ni marques, ni inspirations, ni statuts de la base source.

**Assets.** Les 700 JPEG ont été lus et décodés avec Sharp (`metadata` puis `stats`) : zéro erreur. Ils totalisent 100 944 838 octets. Dix dépassent 1 Mo ; le plus lourd, `photos/L1544,rl.jpg`, atteint 5 447 973 octets pour 2 980 × 1 678 pixels. Les photos n'ont pas été recompressées : ce travail reste à mesurer sur une version de prévisualisation, puis à réaliser avec comparaison visuelle. Leur absence de corruption ne prouve ni leur exactitude géographique ni l'exhaustivité des droits. Les crédits fournis sont conservés.

Les différences de casse et chemins inexistants sont contrôlés sur le système Linux de travail. Il n'y a pas de visuel véhicule fourni : les 12 déclarations de vues sont conservées pour récupération ultérieure. Les liens du modèle réel restent utilisables, sans prétendre qu'une photo du jeu a été intégrée.

**Performance.** `carte-gtadb.js` passe de 952 326 à 831 627 octets, et de 102 709 à 88 124 octets après compression gzip locale de comparaison. Le gain principal est l'élimination des tentatives de chargement des photos inexistantes. Le hub reste proche de 42 Ko gzip malgré 301 véhicules. Certains fichiers augmentent avec les contrôles et l'index enrichi : les tailles complètes sont livrées dans `securite-donnees-performance.json`. Aucun gain chiffré de LCP/INP/CLS n'est revendiqué. La carte reste un moteur DOM conséquent ; le remplacement intégral par un autre rendu n'est pas justifié sans profilage réel.

**Sécurité.** La recherche par motifs a couvert 418 fichiers textuels du projet à ce stade, y compris les outils historiques. Aucun candidat de clé privée, token GitHub, clé AWS/OpenAI ou affectation de secret selon ces motifs n'a été trouvé. Les identifiants publics du formulaire Brevo et la vérification Google ne sont pas des secrets d'administration. Aucune rotation n'est prescrite sur cette seule base.

Le site n'a pas d'endpoint applicatif ni d'authentification dans le ZIP. L'analyse d'injections concerne surtout le DOM, les paramètres, les données importées et le stockage local. La CSP préparée n'autorise pas les scripts inline ; les scripts exécutables ont été externalisés. Les styles inline restent permis car ils font partie du rendu actuel. Les en-têtes et redirections ont été servis localement, mais leur application réelle par le compte Vercel est **NON VÉRIFIÉE**. Le stockage local groupé avec restauration réduit le risque d'import partiel ; il ne fournit pas les garanties transactionnelles d'une base de données en cas de panne complète du navigateur.

L'audit npm final rapporte **0 vulnérabilité connue**, sur 41 dépendances de développement transitives/directes. Les deux dépendances directes sont jsdom et PostCSS. Ce résultat dépend de la base d'avis consultée à la date du contrôle.

**SEO.** Titres, descriptions, canonical, H1, données structurées JSON, URLs de sitemap, liens internes et OG locaux sont analysés sur toutes les pages publiques. Les données structurées ne créent pas de notes, offres ni performances inventées. Le sitemap principal contient 334 URL : 301 véhicules, 23 armes, 10 pages racine. Le comparateur personnalisé, les calculateurs et collectibles en attente, les retraits et les anciennes fiches ne sont pas proposés à l'indexation. Les nouvelles métadonnées sociales pointent vers un fichier existant. Search Console, le résultat de crawl Google et l'éligibilité aux résultats enrichis restent **NON VÉRIFIÉS**.

La configuration Vercel suit la documentation officielle : [configuration du projet](https://vercel.com/docs/project-configuration). Sa prise en compte reste à contrôler au déploiement. Aucun réglage du compte distant n'a été modifié.

## 7. Tests exécutés et limites

| Commande / contrôle | Résultat réel |
|---|---|
| `node final.js` avant correction | Échec ENOENT sur un chemin `releve/` absent ; diagnostic A01 |
| Installation des outils puis `npm ci --ignore-scripts --no-fund --no-audit` | Réussie, 41 paquets après suppression de la dépendance de travail inutilisée |
| `npm run build` / `node build.js` | Réussite ; 301 fiches générées, audit de cohérence à zéro, sortie publique créée |
| `npm run lint` | 34 fichiers JS/CSS courants, zéro erreur de syntaxe ; archives inspectées séparément |
| `npm test` | **44 tests, 44 réussis, zéro échec, zéro ignoré**, environ 30 s au dernier passage |
| `node audit-final.js` (appelé par build) | Six familles de contrôles à zéro ; ce contrôle heuristique ne certifie pas chaque fait éditorial |
| `node images.js` | Exécution réussie ; 12 déclarations sans fichiers, zéro galerie véhicule disponible |
| `node croise.js` | 10 alertes lexicales restantes : comparaisons de marques ou usages du mot « international », examinés ; pas dix bugs automatiquement confirmés |
| `node similarite.js` | 304 fiches avec assez de contenu, voisin le plus proche médian 45 %, maximum 54 % ; mesure textuelle locale, pas un score Google |
| `node scripts/inventory.cjs dist …` | 355 pages, aucun lien/asset/script local manquant, aucun ID DOM dupliqué ; exceptions documentées |
| Contrôle HTTP local | **1 080 requêtes**, 1 075 fichiers publics, six 308, cinq sondes 404, zéro résultat inattendu ; CSP/nosniff présents |
| Trois répétitions de `node build.js` | Zéro différence SHA-256 sur les 1 075 fichiers publics entre les trois passages |
| `npm audit --json` | Zéro vulnérabilité signalée ; résultat JSON livré |
| Décodage des 700 JPEG | Zéro erreur ; inventaire taille/dimensions livré |
| Type-check TypeScript | **NON TESTÉ — projet JavaScript sans configuration ni types TypeScript ; aucun type-check n'a été inventé.** |

Les tests couvrent notamment saisies HTML hostiles, recherche accentuée et clavier, filtres/tri, ancres actuelles et anciennes, imports de garage, stockage corrompu, toutes les options d'équipement, comparaison, classement, presse-papiers refusé, newsletter, progression, import complet de carte, panne de stockage, marqueurs personnels, dessin, undo/redo, zoom, mesure, désactivation/réactivation de toutes les catégories et synchronisation d'images.

Un contrôle structurel traite toutes les pages, et un contrôle de démarrage exécute leurs scripts dans jsdom. Les API de rendu, minuteries, stockage, presse-papiers et réseau y sont simulées selon le scénario. Ces tests vérifient le code et le DOM ; **ils ne mesurent pas la mise en page, les animations, le geste tactile ni les performances d'un navigateur réel**.

Les premiers essais ont aussi produit des échecs : recherche imbriquée de la 404, import de carte, anciens fragments et erreurs de harnais (navigation jsdom non implémentée, canonical `/`, catégories d'armes). Les problèmes applicatifs ont été corrigés ; les attentes de test erronées ont été corrigées sans exclure les pages. Le dernier passage reste à 44/44.

### Journal du site déployé

| Parcours réel | Observation |
|---|---|
| Accueil, recherche « Sultan » | Suggestions disponibles ; compteurs anciens reproduits |
| Catalogue véhicules | Filtre Sultan, possession garage et sélection de comparaison actionnés ; données obsolètes constatées |
| Carte | Recherche Vice City, ouverture de lieu et repérage actionnés ; compteurs d'en-tête incorrects constatés |
| Armes / équipement | Ancienne option d'arme produisant « Vide » et verdict valide reproduite |
| Comparateur | Girardi ES9 choisi ; tableau effectivement rempli |
| Classement | Karin Sultan ajouté dans la liste locale du navigateur de test |
| Progression, calculateurs, collectibles | Pages ouvertes ; états démonstratifs/attente lus |
| Véhicules rares, contact, À propos, mentions légales | Contenus et destinations examinés ; coordonnées/configuration incomplètes visibles |
| Fiche Sultan, fiche Girardi ES9 | Texte, liens et galerie examinés ; capture d'écran de la fiche arme inspectée |
| 404 | Recherche du second champ sans résultat reproduite, alors que la première recherche est initialisée |

Le navigateur a signalé des erreurs de son extension de connexion ; ces messages ne sont pas attribués au site. Toutes les 355 pages ont été récupérées en HTTP, mais toutes leurs interactions n'ont pas été parcourues une par une dans un navigateur réel.

**NON TESTÉ — rendu de la copie corrigée dans le navigateur distant : l'accès local a été refusé avec ERR_BLOCKED_BY_CLIENT.** Les contrôles HTTP locaux ont été effectués séparément ; un serveur démarré dans une session précédente n'était plus joignable, puis le contrôle a été relancé avec le serveur créé et arrêté dans le même processus de test.

**NON TESTÉ — responsive réel mobile/tablette, Safari/Firefox, lecteurs d'écran, Lighthouse et Core Web Vitals, drag-and-drop natif final, envoi effectif Brevo, réception de mail, téléchargement Wikimedia, réglages DNS/Vercel et indexation Google.** Ces limites empêchent de déclarer une validation de production exhaustive.

## 8. Problèmes restants et décisions

| Priorité / qualification | Zone | Ce qui reste et pourquoi |
|---|---|---|
| ÉLEVÉE / DÉCISION PRODUIT REQUISE | Éditeur et contact | Fournir les informations exactes à afficher ; vérifier l'adresse actuellement annoncée comme en configuration. Aucun identifiant administratif ni destinataire fictif n'a été créé. |
| ÉLEVÉE / NON VÉRIFIÉ | Prévisualisation finale | Tester le ZIP déployé en prévisualisation sur de vrais navigateurs, puis contrôler mobile/tablette, clavier et CSP effective. Le présent environnement n'a pas permis ce rendu. |
| MOYENNE / NON TESTÉ | Newsletter | Vérifier une inscription avec une adresse de test appartenant au propriétaire et la réponse du formulaire. Aucun message ni abonnement réel n'a été envoyé. |
| MOYENNE / FONCTIONNALITÉ INCOMPLÈTE | Images véhicules/armes | Récupérer les visuels et attributions réellement disponibles ; le ZIP ne contient pas les images correspondant aux 12 déclarations. Les placeholders restent explicites. |
| MOYENNE / DÉCISION PRODUIT REQUISE | Anciennes Youga, Camper, Stanier LE | Choisir une correspondance documentée ou un retrait définitif. Les inspirations actuelles ne suffisent pas pour affirmer que ces pages sont des doublons exacts. |
| MOYENNE / NON VÉRIFIÉ | Faits et sources | Revoir Brute Ambulance et les preuves originales des identifications. Des libellés tels que « Extended Look » ne remplacent pas des liens/timecodes vérifiables. |
| MOYENNE / OPTIMISATION | Photos / carte | Optimiser visuellement les 10 photos > 1 Mo et profiler le moteur à 2 547 points sur téléphone. Aucun gain de fluidité mesuré n'est annoncé. |
| FAIBLE / FONCTIONNALITÉ INCOMPLÈTE | Calculateurs, collectibles, missions, succès | Formules et listes non fournies ; attendre des données vérifiées. Aucune mécanique arbitraire n'est développée. |
| FAIBLE / DETTE TECHNIQUE | Armes et gabarits | Les fiches armes restent maintenues en HTML ; une génération éditoriale complète pourra éviter les doubles saisies. La chaîne véhicules est stabilisée sans refonte générale. |

## 9. Fichiers et utilisation de la livraison

Le projet est dans le dossier `Leonidakit/` du ZIP. Lire `README.md`, puis `audit/rapport-final.md`. Le ZIP conserve les sources nécessaires, les 355 HTML, les 700 photos originales, les scripts, tests, gabarits, décisions de retrait/redirection et archives historiques.

`changements-fichiers.csv` liste chaque chemin modifié, créé ou retiré depuis le ZIP initial. Les déplacements vers `archive/legacy/` y figurent comme retrait de l'ancien chemin et création du nouveau ; ils ne sont pas des suppressions de contenu. Le seul fichier de travail inutile supprimé sans archivage est `armes/temp.txt`. Aucun asset photo fourni n'est supprimé.

L'archive exclut `node_modules`, `dist`, caches, journaux d'exécution et fichiers temporaires. Les comptes rendus de tests sont documentés ici et les résultats structurés utiles restent dans `audit/`. `dist` est reproductible avec `npm run build` et c'est le répertoire à publier. Les originaux joints par l'utilisateur restent inchangés.
