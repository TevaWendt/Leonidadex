# Lot E — Entretien de Léo

Léo fonctionne avec des règles locales. Les questions restent dans le navigateur ; aucun serveur conversationnel, compte, clé ou abonnement n’est nécessaire. Le projet livré est statique : les fichiers générés sont déjà prêts à être déployés.

## Où modifier un contenu

| Besoin | Source à modifier |
|---|---|
| Définition | `outils/leo-editorial.json`, tableau `definitions` : identifiant stable, titre, expressions reconnues et texte. La génération publie le même texte dans le glossaire visible du Tuto et dans Léo. |
| Réponse FAQ | Le chapitre visible du Tuto : `outils/gen-tuto.cjs` pour la FAQ et les carnets ; `outils/tuto.json` pour les chapitres d’outils. Dans `outils/leo-editorial.json`, `faq` associe expressions, question exacte ou sélecteur et ancre. La réponse est extraite du contenu visible, sans seconde copie manuelle. |
| Synonyme de catégorie | `outils/leo-editorial.json` → `categories[].terms`. Garder une route réellement existante. |
| Synonyme d’intention | `outils/leo-editorial.json` → `tools[].terms`. L’identifiant doit correspondre à un outil existant. Les règles des demandes mixtes et des nombres restent dans `leo-core.js` ; les synonymes servent aussi de reconnaissance de secours. Ajouter un cas significatif dans `outils/tests/leo.test.cjs`. |
| Nom, inspiration, photo, statut ou prix d’une fiche | Les données canoniques du site : véhicules, armes, catalogue, acquisitions, contenus éditoriaux ou carte. Ne pas modifier `leo-index.json` directement. Les inspirations existantes servent d’alias de recherche, sans devenir des noms officiels. |
| Date de sortie | Vérifier d’abord la source officielle, puis modifier `outils/acquisitions.json` → `game.releaseDate`, `game.checkedAt`, `game.status` et la source associée. Régénérer `acquisitions-data.js` avec le générateur du Lot D, puis Léo. Ne jamais avancer la date de vérification sans consultation réelle. |
| Route renommée | Modifier la route canonique et son générateur, conserver une redirection si nécessaire, puis mettre à jour les routes de catégories/FAQ si concernées. Régénérer l’index et vérifier les liens. |

L’index couvre les fiches et repères recensés, dont des identifications communautaires. Il ne transforme ni une inspiration en véhicule confirmé, ni un repère en localisation officielle, ni un prix absent en zéro.

## Générer et vérifier

Depuis la racine du projet, avec Node.js et les dépendances de développement du site disponibles (`jsdom` 26.1.0 utilisé pendant les vérifications) :

```sh
node outils/sync-site.cjs
node outils/gen-leo.cjs --check
node --test outils/tests/leo.test.cjs
node --test outils/tests/*.test.cjs
node outils/verifier.js
```

`sync-site.cjs` régénère le Tuto, synchronise les références du site, construit l’index Léo et actualise les versions de cache des scripts et styles. Il ne remplace pas les générateurs canoniques d’une catégorie : les lancer d’abord si ses données sources changent. Les empreintes de `outils/leo-index-manifest.json` permettent aux tests de refuser une projection oubliée après modification d’une source.

Les dépendances de développement ne sont pas nécessaires au fonctionnement des pages livrées et ne doivent pas être ajoutées à l’archive de déploiement. Aucun `npm run build` n’existe dans cette base statique.

## Contrat du calculateur

`leo-link.js` définit le contrat v1 : `tool`, `values`, `items` et `back`. Valeurs permises : capital, objectif, gain net horaire, réserve, prix personnel, durée de session, minutes par jour et nombre de joueurs. Les identifiants d’achats sont ceux de `LKCalcData.catalogue()`. Aucun message de conversation ne figure dans l’URL.

`leo-calculator.js` présente le choix de réception. `calculateurs.js` applique les paramètres au scénario existant via `LKCalcScenario`, puis utilise les carnets existants. Avant une fusion ou un nouveau calcul remplaçant un scénario, une copie doit être effectivement enregistrée dans les plans ; un échec bloque l’opération. Ne pas remplacer cette vérification par la seule présence d’une copie en mémoire.

Le schéma des scénarios et des carnets reste v3. L’état de progression n’est pas modifié. Pour faire évoluer le contrat Léo, augmenter sa version et traiter explicitement les anciens liens.

## Conversation et contrôles manuels

La clé `lk_leo_session_v1` utilise `sessionStorage` pour le retour à la conversation dans le même onglet. Limites : 32 messages, 600 caractères par question, expiration après 30 minutes sans activité. La commande Effacer supprime cet échange sans toucher aux calculs. La révision de l’index invalide les réponses mémorisées après une mise à jour éditoriale. Les préférences et sauvegardes du calculateur restent dans leurs clés existantes.

Après une évolution, vérifier au navigateur : nom exact et alias, question ambiguë, correction des champs, achat sans prix, nouveau/fusion/garder avec un scénario modifié, refus en cas de carnet non enregistrable, rafraîchissement, retour à la page d’origine, clavier, mobile et mouvement réduit. Tester aussi une réponse locale indisponible. Léo doit toujours laisser les autres outils utilisables.


## Reprise Leonidakit (v7.28)

- Version des fichiers de Léo calculée par `outils/sync-site.cjs` (bloc « Lot E »), plus de `lot-e-sync.cjs` ; le chargeur de `common.js` résout les chemins depuis l'emplacement de `common.js`.
- Textes en mots simples (règle du site : compréhensible par un enfant de 10 ans), palette dans la charte (ambre, corail, nuit de Vice City).
- Un nouveau calcul préparé par Léo garde les réglages par défaut (temps de jeu par jour) et laisse vides les faits inconnus (prix, gains) ; les activités à faire restent à cocher.
