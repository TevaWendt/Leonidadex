# Diagnostic initial du 15 septembre 2026

Diagnostic établi avant les corrections de code. Sources : ZIP fourni (1 094 fichiers), PROJECT_MEMORY.md et navigation réelle sur https://www.leonidakit.com/index.html. Les tests DOM simulés et HTTP en cours complètent ce relevé. Ce rapport ne certifie pas des mesures de performance ou une conformité réglementaire.

## Contexte reconstruit

Site compagnon GTA VI, utilitaire, français, HTML/CSS/JavaScript sans framework, publié sur Vercel. Préserver la carte maison et ses fonctions, les identifiants existants, les crédits gtadb, les illustrations originales, la séparation visuels du jeu / modèles réels. Le wiki, la 3D et le retour prématuré de Discord ont été abandonnés. Les données de gameplay absentes ne doivent pas être inventées.

La source `v-corrige.json` est à 301 véhicules (9 officiel / 269 vu / 23 comm). La sortie `vehicules-data.js` et le hub sont à 300 (9 / 236 / 55). L'accueil annonce 139 véhicules et 22 armes. La vraie base armes a 23 entrées. Le ZIP conserve cinq pages de retrait, des doublons de fichiers et d'anciennes fiches. La mémoire n'est donc pas une description exacte du déploiement. Elle explique le décalage : la dernière étape véhicules n'a pas été régénérée dans cette copie.

## Constats et corrections prévues

| ID | Sévérité / nature | Page / fichiers | Problème et cause | Impact | Preuve | Correction prévue |
|---|---|---|---|---|---|---|
| A01 | ÉLEVÉE / BUG CONFIRMÉ | final.js, audit-final.js, croise.js, images.js, gen.js | Chemins releve/ inexistants ; données placées à la racine | Génération/audits impossibles ; redirections ignorées | CODE, COMMANDE node final.js : ENOENT | Résolution depuis la racine réelle, une seule chaîne documentée |
| A02 | ÉLEVÉE / BUG CONFIRMÉ | vehicules-data.js, vehicules.html, recherche, sitemaps | Sorties à 300 alors que la source est à 301 ; 3 nouveaux et 2 retirés non synchronisés | Catalogue et statuts obsolètes | CODE, SITE, MÉMOIRE | Régénérer depuis la source actuelle et contrôler toutes les sorties |
| A03 | ÉLEVÉE / BUG CONFIRMÉ | gen.js, 300 fiches véhicules | CARTE extrait le premier bloc fiche-liens (modèle réel) du modèle Emperor | Liens du mauvais véhicule, reel-bt dupliqué, vrais liens carte perdus | CODE, inventaire HTML | Extraction limitée à la section carte ; modèle stable et tests |
| A04 | ÉLEVÉE / BUG CONFIRMÉ | app.js recherche globale | Saisie brute interpolée dans innerHTML quand aucun résultat | Injection de HTML et chemin DOM XSS | CODE | Échapper les données ou créer des nœuds texte ; test hostile local |
| A05 | ÉLEVÉE / BUG CONFIRMÉ | carte.js import/personnels | JSON importé et stocké sans schéma ; coordonnées injectées en HTML | Injection persistante et blocage de la carte | CODE | Validation complète avant toute écriture, limites et tests de rejet atomique |
| A06 | ÉLEVÉE / BUG CONFIRMÉ | carte.js renderList → M.goTo | Marqueur personnel transmis à openPanel prévu pour un point avec statut/catégorie | Erreur à l'ouverture depuis la liste personnelle | CODE | Centrage distinct et ouverture du panneau personnel |
| A07 | MOYENNE / BUG CONFIRMÉ | fiches.css | Accolade fermante inattendue | Règles CSS ignorées selon récupération du navigateur | TEST PostCSS | Corriger la règle et analyser toutes les CSS |
| A08 | ÉLEVÉE / BUG CONFIRMÉ | vehicules/vehicules.html | Copie du hub à un niveau incorrect | 340 références de navigation cassées dans ce document | TEST inventaire | Redirection vers le hub canonique ; conserver l'ancienne URL |
| A09 | MOYENNE / BUG CONFIRMÉ | galerie, métadonnées, vignettes | Aucun dossier img/ livré ; vues pourtant déclarées ; 94 références de galerie manquantes | 404, faux badges et OG cassés | CODE, TEST | Vérifier les assets réellement présents, repli honnête, aucun téléchargement inventé |
| A10 | MOYENNE / OPTIMISATION | carte-gtadb.js, carte.js | 4 281 références photo ne correspondent pas au disque | Requêtes 404 par ouverture de lieux sans photo | CODE, TEST | Manifeste des assets et chargement uniquement des photos disponibles |
| A11 | MOYENNE / BUG CONFIRMÉ | app.js filtres | Paramètres d'ancre concaténés dans sélecteurs CSS | Une ancre malformée interrompt le filtrage | CODE | Comparer les valeurs de dataset, réinitialiser/réappliquer sur hashchange |
| A12 | MOYENNE / BUG PROBABLE | app.js, fiches.js, armes.html | Filtrage réécrit l'ancre avant lecture garage/arsenal/équipement | Partages perdus au chargement | CODE | Préserver les ancres des autres modules ; tests de rechargement |
| A13 | MOYENNE / BUG CONFIRMÉ | classement-vehicules.html | Sélecteur statique de 139 entrées ; catégories véhicules non exportées | Nouveaux véhicules impossibles à ajouter et libellés internes exposés | CODE, SITE | Synchroniser sélecteur et dictionnaire depuis les données |
| A14 | MOYENNE / BUG CONFIRMÉ | app.js newsletter | Succès annoncé après 1,2 seconde sans réponse de Brevo | L'utilisateur croit être inscrit même en échec | CODE | Montrer la réponse réelle du prestataire, ne jamais simuler un succès |
| A15 | MOYENNE / BUG CONFIRMÉ | scripts de partage | Promesse du presse-papiers ignorée | « Copié » affiché après refus/absence de permission | CODE | Attendre la réussite et rendre l'échec explicite |
| A16 | MOYENNE / BUG CONFIRMÉ | 404.html | Deux q et deux suggest | Recherche de la page d'erreur partiellement inopérante | TEST HTML, CODE | Identifiants uniques et gestion de plusieurs recherches |
| A17 | MOYENNE / DETTE TECHNIQUE | build.js, fiches-gen.js, nouveaux.js, copies vehicules/*.js | Anciennes chaînes capables d'écraser les sorties modernes | Réintroduction de données obsolètes | CODE, MÉMOIRE | Archiver les outils historiques et offrir des points d'entrée compatibles |
| A18 | MOYENNE / BUG CONFIRMÉ | index.html, vehicules.html, vehicules-rares.html | Compteurs, listes officielles et textes de modèles non régénérés | Contradictions internes (139/192/300/301) | SITE, CODE | Synchroniser les blocs depuis les bases actuelles |
| A19 | MOYENNE / ACCESSIBILITÉ | fiches.js, app.js | Boutons imbriqués dans liens de cartes ; états filtres non exposés ; recherche sans relation ARIA complète | Navigation clavier/lecteur d'écran incohérente | CODE, DOM SITE | Cartes sémantiques, contrôles séparés et états accessibles |
| A20 | MOYENNE / BUG CONFIRMÉ | gen.js, légendes sans image | « Aucun visuel officiel publié » sur des véhicules marqués vus officiellement | Légende contredit le statut | CODE, MÉMOIRE | Dire que l'image n'est pas encore intégrée au site |
| A21 | MOYENNE / BUG PROBABLE | carte.js dessin, mesure, édition | Modes activables ensemble et événements qui se chevauchent | Clic de dessin/outil produisant d'autres actions | CODE | Modes mutuellement exclusifs et garde des événements |
| A22 | MOYENNE / DETTE TECHNIQUE | localStorage dans plusieurs scripts | JSON syntaxiquement valide mais de mauvais type accepté | Runtime cassé après import/stockage corrompu | CODE | Lecture typée, conservation des données inconnues et signalement |
| A23 | MOYENNE / DETTE TECHNIQUE | sitemaps, redirections, scripts publics | Sitemap regénéré avec la date courante ; sources internes dans racine publiée | Métadonnées trompeuses, déploiement trop large | CODE | Génération stable, sortie publique filtrée, configuration Vercel |
| A24 | MOYENNE / BUG CONFIRMÉ | images.js, photos-reelles.js | Crédits non bloquants malgré le contrat ; regex accepte le préfixe CC BY-NC | Attribution/licence non garantie par l'outil | CODE | Validation de crédit et correspondance exacte des licences |
| A25 | MOYENNE / FONCTIONNALITÉ INCOMPLÈTE | progression.html | Aperçu sans connexion aux possessions et lieux déjà sauvegardés | Page sans usage malgré les données disponibles | CODE, MÉMOIRE | Relier les suivis existants ; garder missions/succès en attente |
| A26 | MOYENNE / DÉCISION PRODUIT REQUISE | mentions-legales.html, contact.html, Brevo | Identité éditeur et configuration de services non documentées | Informations administratives incomplètes | CODE, MÉMOIRE | Rapporter les éléments à compléter sans inventer de coordonnées |
| A27 | FAIBLE / DÉCISION PRODUIT REQUISE | calculateurs.html, collectibles.html | Formules/objets de jeu non fournis | Fonctions dépendant de données futures | CODE, MÉMOIRE | Conserver l'attente explicite ; ne pas créer de chiffres fictifs |
| A28 | MOYENNE / NON VÉRIFIÉ | brute-ambulance, sources historiques | Contradiction de sources déjà signalée ; preuves originales absentes | Fiabilité factuelle non certifiable à partir des seuls libellés | MÉMOIRE, CODE | Conserver le choix actuel et signaler la vérification éditoriale restante |

Les 16 pages non atteignables ne sont pas toutes des bugs : 404, vérification Google, redirections et retraits sont intentionnels. Les anciennes fiches encore indexables exigent une décision fondée sur les modèles et l'historique avant redirection ou retrait.

## Limites initiales

Le navigateur distant accède à la production mais refuse l'adresse locale (ERR_BLOCKED_BY_CLIENT). Les tests locaux de comportement seront exécutés avec DOM simulé et les limites de rendu réel seront maintenues dans le rapport. Aucune inscription réelle ni publication n'est effectuée. Pas de framework, API applicative, base serveur ou authentification trouvés dans l'inventaire. Les secrets éventuels sont recherchés sans en afficher les valeurs.
