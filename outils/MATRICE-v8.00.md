# Matrice de qualité de la v8.00 (contrôle complet, audit, corrections, archives des pages en noindex)

Le contrôle et l’audit demandés par Téva pour la fin des livraisons (« comme une relecture après un contrôle ») : une ligne
par point du document d’exigences, avec ce que le contrôle a trouvé, la correction, la preuve. État : fait.

| Point | Pages | Constat et correction | Preuve | État |
|---|---|---|---|---|
| 1.1 Un seul moteur de mouvement, cascade 35 à 60 ms, 300 ms au plus | site | Même moteur (LKMotion) ; cascade de 40 ms (60 auparavant), 300 ms au plus ; durée d’entrée commune (jeton `--lk-enter`, 0,34 s, courbe du site) au lieu de 0,45 à 0,6 s. | audit (latence des apparitions) | fait |
| 1.1 Décalage d’entrée 10 à 12 px | site | 12 px pour `.rise`, `.reveal` et `.lk-reveal` (26, 20 et 18 px auparavant). | lecture | fait |
| 1.2 Cartes immobiles au survol, pas de flou, d’échelle ni de 3D sur le texte | site | Inchangé ; audit : 0 texte flou, survol relevé sur 161 cartes. | audit | fait |
| 1.3 prefers-reduced-motion | site | Inchangé : tout visible, rien ne bouge. | audit (mouvement réduit) | fait |
| 3 Téléphone : rien ne sort de l’écran | site | Relevé à 320 et 390 px (1 000 pages françaises et allemandes) : tableaux « Identité », titres d’un seul long mot, encart à bouton, compte à rebours, frise, vignette ronde corrigés ; reste : bandeaux défilants, carte déplaçable et aperçus de carte, voulus. | relevé des débordements, écrans | fait |
| 3 Seize largeurs, cibles de 24 px, rien sous 11 px | site | Écrans aux seize largeurs (99 pages) et en allemand (96 pages) : 0 débordement, 0 cible trop petite, 0 texte trop petit. | ecrans-browser | fait |
| 4 Latence | site | Mesure au téléphone, 4G lente, processeur ×4 : premier affichage 1,3 à 1,7 s, plus grand élément 2,3 s au plus ; apparitions au défilement raccourcies. | mesure de latence, audit | fait |
| 5 Aucun lien cassé | site | verifier.js : 0 erreur sur 26 641 pages. | verifier.js | fait |
| 6 Six langues : aucun français visible | pages traduites | Défaut du moteur des pages par élément (morceau de règle inconnu laissé en français sans signalement) corrigé ; mémoire v800 ; relevé de toutes les pages traduites : 0 texte français. | relevé statique, langues.test.cjs, langues-pages-browser, langues-browser | fait |
| 6 Léo | site | Fiches qui détournaient des questions retirées de Léo (moments au nom d’une édition ou d’un trailer, constructeur réel comme autre nom d’une marque, lieu homonyme d’une autre fiche) ; évaluation 512/512. | leo-eval.cjs, tests Léo | fait |
| 7 Aucune donnée inventée | site | Corrections de forme seulement ; les données de la carte restent celles de gtadb. | diff | fait |
| 9 Ce qui ne change jamais | site | Aucun cookie (audit des cookies), CSP inchangée, Mentions tenues (preuve-confidentialite). | audit-cookies, preuve | fait |
| 10 Contrôles et livraison | lot | Suite de tests, tests des langues, navigateur, écrans, audit ; archive « modifs » ; archives des pages en noindex, avec A-COMPLETER.md. | journaux du contrôle | fait |
