# Calculateur Leonidakit — livraison du 19 septembre 2026

## Périmètre

La page d’attente `calculateurs.html` devient un simulateur utilisable. Les autres pages du site, leurs styles, leurs fiches et leurs données restent inchangés. Seuls le sitemap, le README et le script de synchronisation reçoivent les raccordements nécessaires.

Le site reste entièrement statique, sans dépendance d’exécution, package.json, serveur applicatif ou commande de build. Les scripts et images restent locaux ; les règles CSP Vercel n’ont pas été assouplies.

## Outils livrés

1. Objectif universel, caps de 100 k à 10 M, capital personnalisé, sessions quotidiennes, taille du groupe, trois scénarios et alternance.
2. Comparaison d’activités : récompense, frais personnels, partage, préparation, attente, mise initiale, joueurs ; filtres et calcul inverse temps → gains.
3. Rentabilité : revenus bruts, coûts, bénéfice, ROI après investissement, seuil d’amortissement et courbe.
4. Achat libre ou depuis le catalogue ; coût en temps, part du capital, financement manquant et achat maintenant / épargne.
5. Comparaison de trois véhicules. Pas de classement sans données ; les champs absents restent inconnus.
6. Budget par poste, réserve distincte des dépenses et répartition visuelle.
7. Deux ordres d’achat comparés, avec financement progressif et modification hypothétique des revenus après chaque achat.
8. Favoris et calculs récents locaux, export/import JSON validé, URL partageable, navigation clavier, prise en compte du mouvement réduit.

Les trois scénarios initiaux sont **fictifs**. Le catalogue compte 347 fiches et ne fournit actuellement aucun prix exploitable. Les sources, dates et statuts futurs sont attachés aux valeurs. `calculateurs-activites.js` est volontairement vide. Une entreprise ou une demeure recensée ne devient pas, par déduction, un investissement achetable ou rémunérateur.

## Références consultées

Benchmark fonctionnel, sans reprise de code, de textes ni de présentation :

- [GTAWeb Toolkit](https://gtaweb.eu/gtao-toolkit) : distinction coûts, commissions et résultats ; suivi des délais.
- [OSRSPortal Birdhouse Calculator](https://osrsportal.com/birdhouse) : nombre de réalisations, sessions par jour et arrondis.
- [Path of Building](https://pathofbuilding.community/) : comparer deux configurations et leur coût d’opportunité.
- [Factorio Calculator](https://kirkmcdonald.github.io/calc.html) : unités, précision et combinaison de flux.
- [Overframe](https://overframe.gg/build/new/warframes/) : partir d’une recherche dans le catalogue pour créer une configuration.
- [Rockstar Games — GTA VI](https://www.rockstargames.com/VI) et [annonce officielle Take-Two](https://www.take2games.com/ir/news/rockstar-games-announces-pre-orders-grand-theft-auto-vi) : contexte du jeu. Les pages consultées ne fournissent pas de table de prix/revenus/durées permettant de renseigner les simulations comme officielles.

Les visuels utilisés existent déjà dans le projet : panorama de Vice City, vie nocturne et miniatures des catalogues. Crédits inchangés, pas de nouveaux médias externes ni de duplication. Les captures promotionnelles Rockstar ne sont pas présentées comme des images libres de droits.

## Formules et données

Voir `CALCULATEURS-MOTEUR.md` et `CALCULATEURS-DONNEES.md`. Les missions ne se fractionnent pas entre journées. L’attente de relance est supposée écoulée avant le jour suivant ; les calendriers incompatibles sont signalés. Le mélange suit une rotation explicite, sans se présenter comme un optimum global. Les graphiques sont des projections, pas une promesse de gains.

## Installation GitHub / Vercel

- Archive de mise à jour : extraire et copier son contenu à la racine du dépôt existant, en remplaçant les fichiers de même nom. Ne pas déposer le ZIP lui-même.
- Archive complète : extraire `Leonidadex-main/`, puis utiliser son contenu comme racine du dépôt.
- Vercel : Framework Preset **Other**, aucune commande de build, répertoire de sortie vide, racine du dépôt. La configuration existante `vercel.json` reste inchangée.
- Après publication, ouvrir `/calculateurs.html`. Les nouveaux scripts portent un paramètre de version pour éviter un ancien cache.
- Les modifications ont été préparées dans les fichiers ; aucun déploiement en production ni commit distant n’a été effectué.

Les anciens fichiers `CHANGEMENTS-v*.txt` et `LISEZ-MOI-v*.txt` ont été retirés de l’archive complète. Les sources, licences, crédits, générateurs et tests utiles sont conservés.

## Vérifications et limites

- **43 tests Node réussis** : 33 tests du moteur et 10 tests d’intégration. Cas zéro, valeurs négatives, données absentes, décimales, grands nombres, divisions par zéro, contraintes de groupe, imports et restauration après partage.
- **90 contrôles navigateur Chromium réussis** : six onglets, écrans de 1440, 390 et 320 px, navigation clavier, stockage, favoris, partage, export/import et mouvement réduit. Pas de débordement horizontal global, d’erreur JavaScript, de requête locale cassée ou de violation CSP détectée.
- Rendu réellement capturé et inspecté sur ordinateur et mobile. Les contrôles ont utilisé une police sans-serif de remplacement, les appels Google Fonts étant neutralisés pour un test local indépendant du réseau.
- Vérificateur du site : **28 234 références contrôlées dans 395 pages, zéro erreur**.
- La CSP servie pendant les essais est celle de `vercel.json`. Aucun changement de sécurité ou de configuration du déploiement n’a été nécessaire.

Commandes réexécutables :

```sh
node --test outils/tests/calculateurs-engine.test.cjs outils/tests/calculateurs-integration.test.cjs
node outils/verifier.js
# Playwright et un navigateur Chromium doivent être installés à part du dépôt :
NODE_PATH=<dependencies>/node_modules node outils/tests/calculateurs-browser.cjs
```

Le moteur ne reproduit pas des mécaniques GTA VI encore non documentées ; les résultats chiffrent les hypothèses saisies. La page en production n’a pas été modifiée. La validation porte sur le ZIP fourni et les fichiers livrés, pas sur une publication Vercel distante. Aucun score Core Web Vitals en conditions réelles n’est revendiqué.
