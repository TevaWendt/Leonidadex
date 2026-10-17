# Matrice de la v7.93 — lot 8 : répondre à ce que les joueurs tapent sur Google (16/10/2026)

Base : v7.92 (commit 52ecaec29). Chaque ligne : l’exigence, ce qui a été fait, comment c’est vérifié.

## Ce que le lot demande

| # | Demande | Fait | Vérifié |
|---|---|---|---|
| 1 | Quatre pages nouvelles, cinq langues, gabarit des pages d’information, contenu propre, sourcé et daté | `prechargement.html`, `gta-6-pc.html`, `gta-6-vs-gta-5.html`, `vraies-voitures.html` (`outils/gen-recherches.cjs`, contenu `outils/informations-editorial.json`, bandeaux `outils/lot-c-visuals.cjs`, briques v7.92) ; chaque information avec statut et source datée (Rockstar, PlayStation, Xbox, Take-Two ; presse nommée pour les déclarations rapportées) | `v793.test` (pages dans chaque langue, données structurées, sources) ; relecture des sources en ligne le 16/10/2026 (deux vérifications indépendantes, détail CHANGEMENTS § 1) |
| 1a | Préchargement : date confirmée, marche à suivre PS5 et Xbox (sources officielles), boîte, ce qui n’est pas confirmé, FAQ ; état basculable le 12 novembre | données `etat: avant` / `ouvert` (heure, tailles à null, garde-fou), compte à rebours, `data-lk-preload` | `v793.test` (date = `acquisitions.json`, garde-fou) ; `v793-browser` (comptes à rebours écrits, état « avant ») |
| 1b | GTA 6 sur PC : consoles seulement, précédents étiquetés « repère de la série » datés et sourcés, encadré arnaque | trois cartes officielles, deux citations de Take-Two (presse), frise GTA V / RDR2 / RDR avec l’écart calculé et le billet du Newswire, encadré avec les boutiques officielles et la politique de Rockstar sur les clés | relecture ; `v793.test` (renvois de sources) |
| 1c | GTA 6 et GTA 5 : tableau du confirmé face à GTA V, carte mot pour mot avec la source, aucune supposition, liens vers les pages du site | neuf lignes, chaque case avec statut et source, citations en anglais (TGG rapportant Rob Nelson ; New York Times « the studio said »), « pas encore comparable » pour ce qui attend | relecture ; `v793.test` |
| 1d | Vraies voitures depuis `vehicules-data.js`, par marque, statut dit comme tel, nombres calculés, lien vers chaque fiche, `ItemList` ; marques réelles = inspiration, jamais partenaires | générateur depuis les données ; six chiffres ; 50 marques + non lues ; 302 lignes ; `CollectionPage` + `ItemList` ; section « jamais une marque partenaire » | `v793.test` (chiffres = données, 302 fiches existantes, une ancre par marque, ItemList complet, aucun « partenaire ») |
| 2 | Titres et descriptions des pages « titre à revoir » (+ éditions, vidéos) : « GTA 6 » en tête, 60 signes, description 155, mots de chaque langue | 14 pages reprises dans les sources (CHANGEMENTS § 2), traductions avec les mots des joueurs de chaque langue | `v793.test` (18 pages × 6 langues : « GTA 6 » en tête, ≤ 60, ≤ 155, uniques) |
| 3 | Sommaires sur les pages longues ; textes alternatifs ; image de partage de chaque page nouvelle | sommaire collant sur les quatre pages (intitulés en questions) et sur `achats.html` ; alt sur chaque visuel ; `outils/gen-partage.cjs` | `v793.test` (ancres, alt, og:image de partage dans chaque langue) |
| 4 | Maillage : éditions → préchargement, Ce qui est confirmé → PC, Véhicules et fiches → vraies voitures, accueil → GTA 6 et GTA 5, recherche, Léo, pied de page si cohérent, plan du site, IndexNow | tous faits (CHANGEMENTS § 3) ; pied de page et menu : groupe « L’actualité » | `v793.test` (liens entrants, menu, pied de page, recherche, Léo) ; `outils/verifier.js` (aucun lien mort) |
| 5 | Données structurées : WebPage/Article datés, BreadcrumbList, FAQPage visible seulement | WebPage ou CollectionPage avec `datePublished` / `dateModified`, BreadcrumbList, FAQPage = questions affichées | `v793.test` |
| 1e | Ajout demandé en cours de lot : bloc « Sites amis » sur À propos, liste vide prête, un site par ligne dans un fichier de données | `outils/sites-amis.json` (titre, phrase d’attente, `sites[]` : nom, url, mots) rendu en bas de « Contribuer » (`#sites-amis`) ; liste vide = phrase d’attente ; garde-fou nom + https | `v793.test` (bloc dans chaque langue, jamais une liste vide, https, garde-fou) ; captures 390 / 1 280 |
| 6 | Traductions `v793.json`, extraction à `{}` ; tests ; captures ; latence ; matrice ; LISEZ-MOI avec la liste Search Console | voir § ci-dessous et `LISEZ-MOI-v7.93.txt` | `langues.cjs --extraire` à `{}` ×5 ; `langues.test` |

## Exigences de qualité

| Exigence | État | Preuve |
|---|---|---|
| Du tac au tac, mots simples, registre « tu », rien d’inutile | tenue : l’essentiel en tête de chaque page (état du jour, trois cartes, tableau), détail en dessous, listes de plus de 20 véhicules repliées | relecture des captures |
| Charte : jetons de `style.css`, Archivo, gabarit des sections, pile d’images, sous-navigation collante | tenue : `recherches.css` n’écrit que des jetons (`--paper`, `--ink`, `--amber`, `--coral`, `--night`, `--radius`, ombres) ; sections de `outils/sections.cjs` ; `.lk-stack` | relecture de la feuille ; captures |
| Marges : même bord gauche et droit pour toutes les sections | tenue : `.shell` partout | contrôle « coquilles » de l’audit de clôture |
| Visuels uniquement officiels, crédités, 480 / 800 / 1 280 px, 800 au plus au téléphone | tenue : `outils/vitrine.cjs` (cartes du comparatif, encarts Léo), `.lk-stack` des bandeaux | `v792.test` (structure `<picture>`) ; `v793.test` (alt) |
| Mouvement : un seul moteur, cascade ≤ 300 ms, cartes lues immobiles, mouvement réduit, sans script tout visible | tenue : `lk-reveal` et `data-lk-reveal` + `vt-in` ; barres des écarts PC tracées à l’entrée ; `prefers-reduced-motion` coupe tout | `v793-browser` (tous les blocs entrés ; mouvement réduit : tout visible) ; captures en mouvement réduit |
| 16 largeurs et six langues, aucun débordement, aucun mot coupé, rien sous 11 px | tenue (75 pages × 16 largeurs, 72 pages allemandes × 5 : aucun débordement, aucun signal sur les pages du lot ; grille 2 × 2 des quatre cartes du hub Véhicules posée après l’audit) : grilles 5 → 3 → 2 → 1 (gestes), 3 → 2 → 1 (tickets, cartes), tableau en fiches sous 760 px, deux colonnes de marques → une | `ecrans-browser` (16 largeurs) et `ecrans-browser` allemand ; `v793-browser` (390 / 768 / 1 280, FR et DE, rien sous 11 px) |
| Cibles tactiles ≥ 24 px | tenue : liens des sources et des fiches sur 28 px au moins, boutons 34 à 46 px | relecture de la feuille |
| Latence : aucune régression, page nouvelle pas plus lente qu’une page du même type | mesurée (CHANGEMENTS § 7) : sept pages existantes v7.92 → v7.93, premier affichage de −100 à +60 ms, mêmes octets ; pages nouvelles face à `verification.html` (même gabarit) : premier affichage à froid 860 à 928 ms contre 924, égal à chaud ; vraies voitures (302 lignes) +0,25 s à froid, plus légère que le hub Véhicules | `outils/tests/latence-browser.cjs` (téléphone ×4, 4G lente, 4 tours, médianes) |
| Référencement : titre « GTA 6 » ≤ 60, description ≤ 155 unique, un h1, canonique, hreflang, og/twitter, max-image-preview, données structurées, plan du site daté, maillage | tenue (CHANGEMENTS § 1 à 3) | `v793.test` ; `outils/verifier.js` |
| Accessibilité : clavier, focus, noms accessibles, contrastes AA, alt, lang | tenue : liens nommés, focus visible sur les tuiles et replis, `lang="en"` sur les citations anglaises, couleurs des liens relevées sur les fonds de nuit | audit de clôture (axe) ; `v793.test` (alt) |
| Rien d’inventé, statut et source datée partout ; aucune fuite | tenue : chaque case, carte et ticket porte sa pastille et son renvoi ; « 252 véhicules » de GTA V (texte existant du hub Véhicules) non repris faute de source | relecture ; deux vérifications en ligne |
| Aucun cookie, aucun script externe, clés `lk…` | tenu : aucun script nouveau ; liens externes seulement | `v793-browser` (aucune requête externe, aucun cookie) ; preuve de confidentialité |
| Léo connaît chaque page, dans toutes les langues | tenu : cinq sujets nouveaux, onze relus, ponts des cinq langues | `gen-leo --check` ; `v793.test` (liens Léo dans chaque langue) |
| Six langues au même niveau | tenu : `v793.json` ×5, extraction à `{}` | `langues.cjs --extraire` ; `langues.test` ; pages des langues dans le navigateur |

## Réunion avec la v7.92.1 (17/10/2026)

| Exigence | Fait | Vérifié |
|---|---|---|
| Rien de l’une ni de l’autre ne se perd | sources réunies une à une, puis tout le site produit de nouveau (CHANGEMENTS § 9) | contrôle ligne à ligne : chaque ligne ajoutée par la v7.92.1 ou par le lot 8 est présente, sauf lignes produites et choix décrits ; tests `v7921` et `v793`, navigateur `v7921-browser` et `v793-browser` |
| Les deux parties se répondent | « L’actualité » à huit entrées ; Actualités → préchargement ; GTA 6 et GTA 5 → Prix et collector ; Éditions → Prix et collector ; quatre vidéos partout | `v7871.test` (puces), `v793.test` (maillage), relecture |
| Aucune erreur laissée | GTA V : 217 véhicules au lancement (Guinness World Records) au lieu de 252 sans source ; euros à l’anglaise ; une seule traduction de « Toutes les annonces » | relecture ; `langues.cjs --extraire` à `{}` ; aucun conflit de mémoire |
| Léo au moins aussi bon que la v7.92 | 353 sujets ; « jack a car » et « pattern » compris en anglais | tous les jeux de questions rejoués et comparés à la v7.92 (CHANGEMENTS § 9) ; `gen-leo --check` |
| Une synchronisation de plus ne change rien | chaîne complète, puis `sync-site` relancé | empreintes de tous les fichiers identiques avant et après |

## Contrôles de la version livrée

Voir la fin de `outils/CHANGEMENTS-v7.93.txt` (CONTRÔLES).
