# Calculateur Leonidakit : couverture du brief « Calculateur Ultime » (v7.26, 24 septembre 2026)

Relecture du brief point par point. Trois états : **fait**, **partiel**, **manquant**. Les manques
liés à l'absence de données GTA VI (le jeu sort le 19 novembre 2026) sont notés « attend les données ».

| Brief | État | Où / pourquoi |
|---|---|---|
| §2 Périmètre : page, accueil, navigation, fiches, guides, comparateur | fait | `calculateurs.html`, `index.html`, menu « Calculateur » en premier, cartes sur 329 fiches, entreprises, demeures, comparateur, progression |
| §2 Carte : « préparer une session avec cette activité » | attend les données | aucune durée ni trajet exploitable ; rien d'inventé |
| §3 Diagnostic, benchmark sourcé, matrice de couverture | fait | dans `LeonidaKit_Rapport.md` (livraison du 21 septembre, 7 références datées) ; non repris dans le dépôt |
| §4 Trois niveaux sans perte de saisie | fait | Simple / Pas à pas / Expert ; mêmes cases, les valeurs restent |
| §4 Entrées par intention, pas de grille de cartes équivalentes | fait | 7 questions ; la première carte est mise en avant |
| §5 Objectif : montant manquant, plan, alternatives, temps actif / attente / calendrier, prochaine action, sensibilité | fait | « Mon objectif » : réponse en une phrase, 3 chemins, ±20 %, référence à comparer |
| §5 Préférences du joueur (peu de répétition, sessions courtes) | partiel | limite « même activité à la suite » et durée de session ; pas de préférence « moins d'attente » |
| §6 Objectif, rentabilité, rendement, session, achats, budget, ordre, scénarios, suivi | fait | 7 outils ; suivi = progression déclarée + carnet |
| §6 Acheter ou attendre | partiel | dans « Mes achats » : objectif si j'achète / si je n'achète pas ; pas d'« améliorer l'existant » |
| §6 Comparateur d'équipement | fait | valeurs brutes, unités, pas de note avec données manquantes |
| §6 Modules : bonus temporaires, revenus passifs, stockage | attend les données | aucun mécanisme GTA VI confirmé |
| §6 Coût d'une amélioration / nombre d'utilisations, seuil entre stratégies | manquant | faisable avec le moteur actuel ; non réalisé |
| §7 Contraintes réelles, pas de double comptage, heuristique déclarée | fait | moteur `calculateurs-engine.js`, 52 tests ; limite de recherche affichée dans « Pourquoi ce programme ? » |
| §8 Recherche tolérante, favoris, récents, filtres combinables avec compteur, chips, réinitialisation, tri séparé, état vide guidé | fait | onglet « Mes achats » |
| §8 Panneau de filtres mobile avec commande de fermeture | partiel | les filtres sont empilés, pas de panneau repliable |
| §9 Réponse en une phrase → décision → comparaison → explication | fait (v7.23, v7.25) | les 7 outils commencent par « MA RÉPONSE » en une phrase |
| §9 Graphiques avec unités, légende, alternative texte | fait | courbe de capital, courbe de remboursement, barres de budget, programme de session |
| §10 Accueil : promesse, appel principal, mini-calculateur relié au moteur, raccourcis, sans compte, mobile | fait | `calculator-entry.js` réutilise `calculateurs-engine.js` |
| §11 Cartes contextuelles avec contexte importé et retour à la fiche | fait | `fiches.js`, `lore-gen.js`, `comparateur.js`, `progression.html` |
| §12 Charte, signature, icônes, hiérarchie | fait (v7.22) | encre, corail, ambre, nuit de Vice City, 7 pictogrammes, sceau « LK plan de jeu » |
| §12 Cartes de partage (aperçu social par calcul) | manquant | pas d'infrastructure de rendu ; l'aperçu social reste celui de la page |
| §13 Animations : entrée, micro-interactions, mouvement réduit | fait (v7.26) | grammaire commune, parallaxe, apparitions, relief, compteurs, courbes tracées, jauges, néon, mouvement réduit |
| §14 Microcopy, libellés, unités, erreurs, FAQ, lexique | fait (v7.22) | mots simples, lexique, 8 questions |
| §15 Mobile : pouce, résumé fixe, tableaux, états complets | fait | résumé collant sur les 7 outils (v7.23), 320 à 1440 px sans débordement |
| §15 WCAG 2.2 AA vérifié en réel | partiel | clavier, focus, contrastes et mouvement réduit testés ; pas de lecteur d'écran |
| §16 Provenance, statuts, inconnu ≠ zéro, trois couches, versionnement, retour aux références | fait | `calculateurs-data.js`, `outils/CALCULATEURS-DONNEES.md`, « Remettre le vrai prix » |
| §17 Moteur : formules, cas limites, saisie française | fait | tests des 8 cas de référence du brief |
| §18 Stack conservée, aucune dépendance, validation aux frontières | fait | statique, Vercel inchangé |
| §18 Core Web Vitals mesurés avant / après | manquant | pas d'outil de mesure disponible ici ; à faire avec PageSpeed après mise en ligne |
| §19 Sans compte, favoris, récents, nommage, duplication, export / import versionné, lien borné, copie avec repli, fiche imprimable | fait | carnet, `#plan=`, impression |
| §20 Titre, description, H1, contenu, données structurées, URL conservée | fait | JSON-LD présent, `calculateurs.html` conservée |
| §21 Points de mesure sans service | fait | événements `lk:calculator` (open, tool_open, first_valid_result, save, share, compare, reference) ; aucune collecte |
| §22 Tests : moteur, parcours, rendu, mobiles, clavier, mouvement réduit | fait | 172 tests Node, 142 + 215 contrôles Chromium, `verifier.js` |
| §22 Safari, Firefox, appareils réels, lecteur d'écran | manquant | non disponibles ici |
| §24 Livraison : résumé, fichiers, matrice, tests, captures, documentation, benchmark | fait | ce fichier, `CHANGEMENTS-v7.2x.txt`, `CALCULATEUR-V2.md`, dossier de validation, rapport du 21 septembre |
| Exigence de Téva : utilisable par un enfant de 10 ans | à faire tester | tout est écrit pour ; seul un vrai test avec un enfant le prouvera |
