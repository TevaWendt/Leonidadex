# Matrice de qualité de la v8.04

Demandes : attachment.txt et 12 captures du 20 octobre 2026 (refonte de six pages, informations, Léo, audit), messages suivants
(chiffres du site, géolocalisation, jour J, ne rien faire d'inutile), et les ajouts du 21 octobre (10 captures). Base : v8.03.
Une ligne par demande et par exigence du document de qualité touchée. Détail et preuves : outils/RAPPORT-AUDIT-v8.04.md.

| Point | Constat | Correction | Preuve | État |
|---|---|---|---|---|
| prix.html, bande des objets | texte coupé | tapis de vignettes officielles en boucle, arrêt au survol, mouvement réduit à la main | écrans 16 largeurs ; mouvement | fait |
| prix.html, « Ce qu'il y a dans la boîte » | photos posées, sans entrée | déballage en cascade, bascule Galerie / Liste, fiche par objet | essai Chromium ; mouvement | fait |
| verification.html, tableau de bord | laid, sans survol, le clic n'ouvrait rien | listes d'objectifs, survol et focus, clic qui ouvre la carte dans un dialog accessible | essai Chromium ; v786, v7921 | fait |
| verification.html, « Confirmé » | bordures, trop classique | filtres par sujet, photo qui se développe, tampon ; 13 points, chacun avec sa source officielle et sa page | v786, v7921 | fait |
| verification.html, coûts d'usage | numérotation inutile, orphelins | panneau de prix à volets, 13 postes, texte du carburant corrigé | écrans ; v786 | fait |
| prechargement.html, frise | trait sur les points | tronçons sous les points, alignés à 2 px | écrans ; mouvement | fait |
| prechargement.html, quatre sections | aspect document | écrans de console, barre de chargement, boîte 3D, tableau de bord ; heure du 19 telle que chaque boutique la dit | écrans ; mouvement | fait |
| gta-6-pc.html, annonces et Take-Two | aspect Word | écran de choix de plateforme, citations alignées | écrans ; mouvement | fait |
| gta-6-pc.html, précédents | idée mal faite | course d'arcade, une piste par jeu | écrans ; mouvement | fait |
| videos.html, chiffres | barres plates | tableau des scores, chaque score mène au détail | écrans ; mouvement | fait |
| gta-6-vs-gta-5.html, tableau | aspect Excel | écran VERSUS, bascule au téléphone | écrans | fait |
| gta-6-vs-gta-5.html, carte | carrés vides | fond de carte du site, surface rapportée, curseur au clavier, rien d'inventé | écrans ; essai clavier | fait |
| gta-6-vs-gta-5.html, nouveautés | pas tactile | douze cartes entièrement cliquables | verifier | fait |
| Informations GTA VI au 20/10/2026 | 35 inexactes, 25 au statut à corriger, 20 invérifiables sur 311 lignes | corrigées, statuts selon la grille, invérifiables retirées ou dites | audit-v8.04/ ; rapport 7 | fait |
| Grille des statuts | presse notée « officiel » | Officiel = canaux propres ; presse = Vu dans un média ; fans = communautaire | contrôle croisé des registres | fait |
| Chiffres du site sur lui-même | 2 547 lieux, 4 429 pages, 12 catégories… | recalculés par sync-site | chiffres-site-v804 ; rapport 8 | fait |
| Géolocalisation | 26 « ? », lieux sans adresse | 1 894 adresses, 0 « ? », sans nouvel import (fuites) | rapport 8.3 | fait |
| Léo, six langues | en 95,7 %, de 94,0 % | 99 à 100 % dans chaque langue, aucune réponse dans une autre langue | leo-eval 512/512 ; jeux de questions | fait |
| Jour J | formats incomplets | statuts media et community, fourchettes, sources, munitions ; répétition à blanc ; prompt 2 ajusté | jour-j-v804 ; audit-v8.04/repetition | fait |
| Fiches armes et véhicules (21/10) | image et carte collées à gauche, vides | carte et légende qui mène aux lieux, aperçus animés | catalogues-v750 ; écrans | fait |
| Voir la configuration (21/10) | liste seulement | dessin du modèle et lien vers l'Atelier | v804-lot-m ; essai Chromium 21/21 | fait |
| « En lien », hubs, espacements (21/10) | liens isolés, vide, cartes serrées | cartes illustrées, 56 px avant la sous-navigation, cartes alignées | en-lien-v804 ; écrans | fait |
| collectibles.html (21/10) | brouillon, multicolore | album du collectionneur, un seul filet ambre | collectibles-esthetique ; écrans | fait |
| Jeux (21/10) | un seul jeu | deux jeux, progression commune | v804-jeux ; parties réelles | fait |
| Carte qui suit la molette (21/10) | sticky annulé | carte collante comme contact.html | essai Chromium | fait |
| Atelier 3D en construction (21/10) | non dit | menu, page, boutons | v804-lot-m | fait |
| Référencement | 28 avertissements | 0 défaut, 0 avertissement | referencement.cjs --tout | fait |
| Signes d'écriture automatique | — | aucun dans le texte visible | contrôle des 26 730 pages | fait |
| Six langues | — | 0 manque, 0 conflit | langues.cjs --verifier ×5 | fait |
| Liens et fiches | — | régénération complète | verifier.js 0 erreur | fait |
| Mouvement et mouvement réduit | — | moteur commun, rien ne bouge en réduit ; textes remontés à 11 px | v7871-browser (306 chargements) ; contrôle a11y | fait |
| Accessibilité | 4 contrastes sous AA | corrigés ; contrôle ciblé (noms, alt, contraste, focus) faute d’axe-core | rapport 12.5 | fait |
| Latence | — | aucune bibliothèque, chargements différés | latence-browser, rapport 12.7 (une hausse sous le seuil « bon », signalée) | fait |
| Tests | — | tests anciens mis à jour sur le contenu vérifié, rien d’affaibli | 101 fichiers, 1 296 réussis, 0 échec | fait |
