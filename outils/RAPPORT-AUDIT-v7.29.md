# Rapport d'audit de finition — v7.29 (24 septembre 2026)

Cette version réunit le patch ChatGPT « Finition 01 » et les corrections de l'audit sur la base v7.28. Aucune publication, aucun push, aucun changement Vercel n'a été fait.

## 1. Matrice des problèmes

| # | Page / état | Reproduction | Cause | Gravité | Correction | Fichier source | Statut |
|---|---|---|---|---|---|---|---|
| 1 | Toutes les pages avec « Continuer la visite », 900–1 180 px | ouvrir une fiche à 1 024 px : barre de défilement horizontale | éventail de 3 cartes à 36 % + décalage 6 % : dépasse le conteneur | P2 | cartes à 33 %, décalage 5 % | style.css (bloc v7.17) | corrigé, validé sur 741 combinaisons |
| 2 | En-tête, 821–1 300 px | à 1 280 px la marque touche le bord gauche | `.head-in{padding:16px 0}` annulait la marge du `.shell` ; en-tête élargi à 1 280 px pour l'ancien menu à 12 entrées | P2 | `padding-block:16px`, en-tête à 1 120 px comme le site | style.css | corrigé, mesuré (marge 24 px, 16 px sur mobile) |
| 3 | Calculateur, barre d'onglets ≥ 1 101 px | « Quoi acheter d'abord ? » coupé | `min-width:max-content` sur des cellules de grille | P2 | `min-width:0`, libellé sur deux lignes | calculateurs-workspace.css | corrigé |
| 4 | À propos, Contact, Mentions, tous écrans | bouton orange « menu » visible sur grand écran | `informations.css` stylait tous les `button` (dont le burger) et tous les `input` (dont Léo) | P2 | règles limitées à `main` | informations.css | corrigé |
| 5 | Menu Explorer et pied de page | « Vêtements » et « Vêtements et style » côte à côte ; 10 liens dont 6 vides | catégories vides listées comme les autres | P2 | champ `pending` dans acquisitions.json ; un seul lien « 6 catégories à confirmer » ; « Vêtements à l'unité » | outils/acquisitions.json, outils/site-shell.cjs | corrigé, régénéré |
| 6 | Calculateur (Ça vaut le coup, Mes achats, Budget, Ordre, Léo) | libellés « revenu additionnel », « horizon », « hypothèse », « attribution », « simulation », « disponible hors réserve » | patch écrit sans la règle éditoriale du site | P2 | ≈ 70 chaînes réécrites en mots simples, logique inchangée | calculateurs-workspace.js, calculateurs.js, calculateurs-scenario.js, calculateurs-engine.js, leo-core.js, leo-ui.js | corrigé, tests adaptés |
| 7 | Calculateur | « Partir de zéro » seulement au fond de « Mes calculs enregistrés » | placement | P3 | bouton texte dans la barre Simple / Pas à pas / Expert | calculateurs.html, calculateurs.js | corrigé |
| 8 | Mes achats | boutons « Ça vaut le coup ? / Ajouter » avant les champs | insertion après `#purchase-selection` | P3 | insérés en bas de la carte de saisie | calculateurs-workspace.js | corrigé |
| 9 | Tuto | texte du patch citant des libellés absents ; captures d'une version antérieure marquées « version précédente » | patch sans navigateur | P2 | texte aligné sur les libellés réels ; 24 captures refaites ; bandeau neutre | outils/tuto.json, outils/gen-tuto.cjs, img/tuto/*, outils/tuto-captures.json | corrigé |
| 10 | Menu mobile ouvert | bouton de fermeture rejeté sous la liste | ordre des éléments dans le flex | P3 | `order` sur burger et nav | style.css | corrigé |
| 11 | Contact | aucune destination fonctionnelle | donnée propriétaire absente | P2 | page honnête (prépare un texte, ne l'envoie pas) ; à activer avec une boîte confirmée | outils/site-informations.json | limite, non bloquante |
| 12 | Mentions | éditeur, responsable, téléphone hébergeur, Brevo « à compléter » | données propriétaire | P2 | champs prêts dans site-informations.json | — | limite |

Défauts constatés puis **non retenus** : `.c-scene-grid` (35 000 px de large) dépasse mais reste dans un conteneur `overflow:hidden` du hero du calculateur ; aucune barre de défilement.

## 2. Fichiers changés et raison

- **Style** : `style.css` (en-tête, éventail, ordre du menu mobile), `calculateurs-workspace.css` (onglets), `informations.css` (portée des règles).
- **Calculateur** : `calculateurs.html` (bouton Partir de zéro), `calculateurs.js`, `calculateurs-workspace.js`, `calculateurs-scenario.js`, `calculateurs-engine.js`, `calculateurs-catalogue.js` (du patch : alias), `calculateurs-data.js` (du patch : lieux non achetables).
- **Léo** : `leo-core.js`, `leo-ui.js`, `leo-index.json`, `leo-loader.js`, `leo.css`, `common.js` (empreintes).
- **Données et générateurs** : `outils/acquisitions.json` (`pending`, libellé), `outils/site-shell.cjs` (réécrit), `outils/tuto.json`, `outils/gen-tuto.cjs`, `outils/tuto-captures.json`, `outils/editorial.json` / `outils/leo-index-manifest.json` / `outils/site-informations.json` / `outils/gen-informations.cjs` / `outils/regenerer.cjs` / `outils/sync-site.cjs` / `outils/gen-leo.cjs` / `outils/gen-acquisitions.cjs` / `outils/gen-achats.cjs` (du patch).
- **Tests** : `outils/tests/audit-finition.test.cjs` (nouveau, du patch ; 2 regex adaptées), `outils/tests/calculateurs-engine.test.cjs` et `calculateurs-lot-b.test.cjs` (1 regex chacun), autres tests du patch.
- **Pages générées** : les 406 pages HTML (menu, pied de page, `?v=`), `search-index.js`, `acquisitions-data.js`, `sitemap.xml`, `tuto.html`, `achats.html`, `a-propos.html`, `contact.html`, `mentions-legales.html`, `contact.js`, `img/tuto/*.webp`.
- **Documentation** : `README.md`, `LISEZ-MOI-v7.29.txt`, `outils/CHANGEMENTS-v7.29.txt`, `outils/ETAT_AUDIT.md`, ce rapport, `outils/NOTICE_APPLICATION_AUDIT.md`.

## 3. Résultat par lot et preuves

Voir `outils/ETAT_AUDIT.md` (tableau des lots). Preuves : sorties de `node --test` (328/328), de `verifier.js` (0 erreur), balayage Playwright (741 combinaisons propres), captures du calculateur avant/après dans le dossier QA fourni à part (hors site).

## 4. Parcours testés

- Nouveau visiteur : accueil → mini-calculateur → calculateur → chaque onglet en Simple puis Expert (1 280 et 360 px).
- Joueur d'un seul outil : « Ça vaut le coup ? » depuis une session vide (achat libre 100 000 $, 200 000 $ en poche, 30 000 $ de côté) → réponse sans objectif ni activité ; comparaison avec un second achat ; « Mon objectif » sans temps quotidien → temps de jeu sans nombre de jours inventé ; « Mon budget » et « Quoi acheter d'abord ? » seuls (tests DOM du patch).
- Plan enregistré puis retour : sauvegarde v1–v3 lue, sauvegarde illisible conservée avant écriture, sauvegarde d'une version future non écrasée (tests DOM).
- Léo : trois phrases du prompt (voir ETAT_AUDIT).
- Commandes : `NODE_PATH=<deps>/node_modules SITE_ROOT=$PWD node --test outils/tests/*.test.cjs` ; `NODE_PATH=<deps>/node_modules node outils/regenerer.cjs && node outils/verifier.js` ; `PLAYWRIGHT_BROWSERS_PATH=… python3 outils/tuto-shots.py .`

## 5. Mesures de performance

Aucune mesure Lighthouse ni Web Vitals n'a été faite ; aucun score n'est annoncé. Poids : `search-index.js` inchangé en taille (mêmes entrées, libellés régénérés), `leo-index.json` ≈ 581 ko (comme le patch), aucun script ou service tiers ajouté.

## 6. Écarts ZIP / production

Non vérifiés depuis cet environnement (pas d'accès au site en ligne). À contrôler avant mise en ligne : la v7.28 n'est pas sur GitHub (dernière version poussée connue : v7.21), donc la v7.29 doit être appliquée sur la copie locale v7.28, puis le dossier complet poussé.

## 7. Limites éditoriales

Prix, revenus et conditions d'achat de GTA VI restent inconnus : tous les chiffres du calculateur sont des exemples ou des valeurs saisies par le joueur, et le site le dit. Données propriétaire manquantes : identité de l'éditeur, contact légal, boîte de contact, téléphone de l'hébergeur, conservation et désinscription Brevo.

## 8. Appliquer et revenir en arrière

Voir `outils/NOTICE_APPLICATION_AUDIT.md`. En résumé : sauvegarder le dossier v7.28, extraire l'archive « modifs » dans la racine en remplaçant les fichiers homonymes, ne rien supprimer ; pour revenir en arrière, restaurer la sauvegarde. Les données des visiteurs (navigateur) ne sont pas touchées.
