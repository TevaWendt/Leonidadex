# Maintenir les collectibles

Le site reste entièrement statique. **Vercel publie les fichiers présents à la racine : aucune commande de build, aucun `package.json` et aucun service supplémentaire ne sont nécessaires.** Les commandes ci-dessous se lancent localement avant l'envoi sur GitHub.

## Situation éditoriale

Au 18 septembre 2026, le catalogue de production ne contient aucune catégorie ni aucun collectible suffisamment documenté. Les deux sources officielles consultées sont enregistrées dans `outils/collectibles.json`. La consultation de leur contenu textuel ne constitue pas une analyse image par image des bandes-annonces. Une capture d'ambiance ne suffit pas à établir une mécanique de collection.

`outils/fixtures/collectibles.example.json` est un **modèle technique fictif**, avec `published: false` et `status: "placeholder"`. Il ne représente pas un objet de GTA VI et n'est jamais chargé par le navigateur. Tout le dossier `outils/`, y compris les fixtures et tests, est déjà exclu du déploiement par `.vercelignore`.

## Ajouter ou corriger une vraie fiche

1. Vérifier l'existence de l'objet et la mécanique de collection dans des sources publiques. Consigner leurs URL et dates réelles de consultation.
2. Modifier uniquement la source éditoriale `outils/collectibles.json`. Partir du modèle, remplacer toutes les valeurs fictives, puis choisir un identifiant durable. Déclarer sa catégorie dans `categories` si elle est effectivement connue.
3. Laisser inconnus les champs non établis : omettre le champ ou utiliser `null` pour un texte, une image, des coordonnées ou un nombre ; utiliser `[]` pour une liste. Ne pas remplacer une inconnue par zéro, une coordonnée approximative, une récompense inventée ou un objet d'un autre GTA.
4. Choisir le statut, renseigner `sources` et `verifiedAt`, puis passer `published` à `true` lorsque la fiche doit être visible. Décider séparément de `trackable` et `seo.indexable`.
5. Lancer depuis la racine :

```sh
node outils/gen-collectibles.cjs
node outils/gen-collectibles.cjs --check
node --test outils/tests/collectibles-generator.test.cjs
```

6. Relire le hub et la fiche générée avec et sans JavaScript. Vérifier ses sources, son image, son lien carte éventuel, les textes protégés des spoilers et le rendu mobile.
7. Envoyer sur GitHub la source JSON **et tous les fichiers générés modifiés**. Vercel servira directement cette version. Éviter de changer `id` : il sert de clé au carnet des visiteurs. Si un `slug` public doit changer, prévoir une redirection dans `vercel.json` pour l'ancienne URL.

Le générateur recalcule en une commande :

- `collectibles-data.js`, avec les seuls objets publiés hors placeholders et leurs catégories utilisées ;
- les cartes HTML du hub, ses compteurs, son état vide et sa date éditoriale ;
- les fiches HTML dans `collectibles/` ;
- `sitemap-collectibles.xml` et les seules entrées collectibles de `sitemap.xml` / `sitemap-fiches.xml` ;
- les seules entrées de fiches collectibles dans `search-index.js`.

Il conserve les autres pages et les autres entrées d'index. Un retrait de publication supprime uniquement les anciennes fiches portant sa signature de génération. Il refuse d'écraser une fiche manuelle qui occupe le même chemin. Les anciens générateurs du site passent par `sync-site.cjs`, qui relance également cette génération à la fin de la synchronisation.

`--check` valide les données et signale les sorties manquantes/périmées, sans rien écrire. `--root DOSSIER` travaille sur une copie isolée du site ; `--source FICHIER` permet de tester une autre source. L'API CommonJS `require('./outils/gen-collectibles.cjs').generate({ root, source, check })` est disponible pour les tests.

## Format des données

Le schéma pour éditeurs est `outils/collectibles.schema.json` (JSON Schema 2020-12). La CLI effectue aussi les contrôles relationnels, les dates calendaires réelles et l'existence des images locales ; elle ne dépend d'aucune bibliothèque npm.

Le document contient `schemaVersion: 1`, `updatedAt` au format `YYYY-MM-DD`, `sources`, `categories` et `items`. Seuls `schemaVersion`, `updatedAt` et `items` sont obligatoires à la saisie. Une catégorie est `{ id, name, description }` ; sa description peut être absente ou `null`. Aucune catégorie fictive ne doit être ajoutée pour remplir un filtre vide.

Chaque objet accepte les champs suivants. Les champs optionnels absents sont normalisés dans les données publiques ; le navigateur reçoit donc une structure stable.

| Champ | Valeur / rôle |
| --- | --- |
| `id` | Obligatoire. Identifiant stable, minuscules, chiffres et tirets. Unique. |
| `slug` | Obligatoire. Même alphabet ; définit `/collectibles/slug.html`. Unique. |
| `name` | Obligatoire. Nom documenté, 200 caractères maximum. |
| `status` | Obligatoire : `confirmed`, `established`, `unconfirmed`, `placeholder`. |
| `category`, `subcategory` | Identifiant d'une catégorie déclarée / précision textuelle, ou `null`. |
| `summary`, `description` | Textes factuels, ou `null`. La description accepte des paragraphes séparés par une ligne vide. Le HTML est échappé. |
| `image` | Image principale locale, ou `null`. Voir format ci-dessous. |
| `gallery` | Liste de 0 à 30 images réelles et sourcées. |
| `region`, `zone`, `place` | Localisation documentée, ou `null`. `place` est protégé des spoilers. |
| `coordinates` | Emplacement précis, vérifié dans le repère de la carte, ou `null`. |
| `difficulty` | Libellé documenté, ou `null` ; pas d'estimation arbitraire. |
| `requirements` | Liste des conditions et prérequis connus. |
| `availability` | Conditions de disponibilité, ou `null`. |
| `reward` | Récompense documentée, ou `null`, protégée des spoilers. |
| `quantity` | Entier strictement positif ou `null` ; jamais un total supposé. |
| `order` | Entier positif ou zéro, ou `null` ; ordre de lecture/collection conseillé. |
| `tips`, `hints`, `notes` | Listes de conseils, indices progressifs et précisions éditoriales. |
| `sources` | Liste de sources de la fiche, distincte de la revue générale du catalogue. |
| `verifiedAt` | Date réelle de vérification, obligatoire pour une fiche publique. |
| `updatedAt` | Date de modification, sinon celle du catalogue. |
| `relatedIds` | Identifiants d'autres fiches existantes. Les références aux brouillons ne sont pas exposées. |
| `keywords` | Mots-clés documentés pour recherche et filtres. |
| `seo` | `{ indexable: false, description: null }` par défaut. Description courte de 320 caractères maximum. |
| `published` | `false` par défaut. Décision éditoriale de rendre la fiche publique. |
| `trackable` | `false` par défaut. Seulement une fiche publiée confirmée ou fortement établie. |

Une source a le format `{ label, url, kind, checkedAt }` : titre lisible, URL HTTP(S) absolue, `kind` parmi `official`, `community`, `press`, date ISO réelle. Les URL de script, protocoles non Web et identifiants de connexion dans une URL sont rejetés. Le générateur ne télécharge ni ne vérifie le contenu de ces URL : cette vérification reste éditoriale.

Une image est `{ src, alt, width, height, credit, sourceUrl }`. Elle doit déjà exister dans `img/` ou `photos/` au format WebP, PNG, JPEG ou AVIF. Ses dimensions sont explicites, son texte alternatif décrit réellement l'image, et son crédit/source sont obligatoires. Aucun visuel générique n'est fabriqué pour une fiche sans image. La galerie utilise le même format.

Les coordonnées sont `{ system: "leonidakit-v1", x, y, verified: true, sourceUrl }`, avec `0 ≤ x ≤ 5200` et `0 ≤ y ≤ 6000`. Il s'agit du repère propre à la carte existante, **pas** de latitude/longitude ni de coordonnées GTA interchangeables. Ne pas convertir automatiquement un repère communautaire différent. Une région connue ne justifie pas une coordonnée. Un objet non confirmé peut avoir un lieu précis documenté, mais reste exclu du suivi et de l'indexation. Un placeholder n'a jamais de coordonnées.

## Publication, confiance et indexation

| Statut | Sens | Suivi possible | Indexation possible |
| --- | --- | --- | --- |
| `confirmed` | Mécanique/objet confirmé par une source officielle citée. | Oui, si explicitement activé. | Oui, avec validation éditoriale et contenu substantiel. |
| `established` | Identification solidement établie par des preuves concordantes citées. | Oui, si explicitement activé. | Oui, avec validation éditoriale et contenu substantiel. |
| `unconfirmed` | Piste explicitement présentée comme hypothèse. | Non. | Non (`noindex, follow`). |
| `placeholder` | Brouillon ou modèle technique. | Non. | Aucune page, carte ni entrée d'index publique. |

`published: false` exclut toujours la fiche des fichiers publics, quel que soit son statut. Pour publier, il faut au moins une source et une date `verifiedAt`. `confirmed` nécessite une source de type `official`. Le statut `established` relève d'une vérification humaine de preuves concordantes, pas d'une simple présence d'URL.

`seo.indexable: true` est une **autorisation éditoriale**, jamais une garantie d'indexation Google. Le générateur conserve `noindex, follow` si la fiche reste trop pauvre. En plus du statut fiable et des sources datées, il exige soit :

- au moins 160 caractères de présentation distincte (résumé et description) **et** au moins deux informations concrètes parmi emplacement, coordonnées, récompense, prérequis, conseils, quantité, disponibilité ;
- soit une description factuelle détaillée d'au moins 600 caractères.

Ces garde-fous ne sont pas des objectifs de rédaction : ne jamais allonger artificiellement un texte pour les atteindre. Une fiche courte utile peut rester publique et consultable, avec `noindex`. Les fiches indexables seules sont incluses dans les sitemaps. Les fiches publiques restent accessibles dans la recherche interne, avec leur statut visible sur leur page.

Les titres, descriptions, canonical, balises sociales, fil d'Ariane et données structurées sont rendus en HTML. Les champs absents n'engendrent pas de sections vides. Le JavaScript ajoute le carnet et ses outils ; le contenu documentaire reste consultable sans lui.

## Des fiches utiles dès leur ouverture

La section **L’essentiel** affiche avant la grande image le statut et les informations disponibles : catégorie, région, disponibilité et nombre de prérequis documentés. Une liste de prérequis vide n'est jamais présentée comme la preuve qu'il n'en existe aucun. Catégorie et région renvoient directement vers le catalogue filtré avec `?category=ID` et `?region=NOM`.

Le sommaire ne contient que les rubriques réellement présentes. La zone précise, l'emplacement, la récompense, les conseils et la galerie restent dans des volets fermés par défaut. Chaque indice a son **propre volet numéroté**, pour demander progressivement plus d'aide. Les volets fonctionnent sans JavaScript ; l'option globale d'affichage des spoilers peut volontairement les ouvrir tous.

Les liens de zoom pointent toujours vers les véritables images locales du catalogue et restent utilisables sans JavaScript. `collectibles-help.js` peut les ouvrir en visionneuse avec leur texte alternatif et leur crédit. L'absence d'une image n'est pas compensée par un faux visuel. Les fichiers `collectibles-tools.css`, `collectibles-help.css`, puis les scripts correspondants sont chargés sur les fiches après les composants existants.

Le bouton **Ajouter à ma sortie** utilise `data-col-plan="ID"` et un retour d'état accessible. Il fonctionne sur une fiche sans avoir besoin d'y injecter le panneau complet des outils. Le lien « Voir ma sortie dans le carnet » rejoint `collectibles.html#col-tools`. Les liens précédent/suivant et les fiches liées restent des liens HTML ordinaires.

## Suivi et liens

Les fichiers `collectibles-core.js` et `collectibles.js` consomment `window.LK_COLLECTIBLES`. Le carnet utilise `lk_collectibles_v1` et l'événement `lk:collectibles-change`. L'API `window.LKCollectibles` centralise `getState`, `setFound`, `setFavorite`, `setNote`, `isTrackable`, `mapUrl`, `itemUrl` et `subscribe`.

Les outils complémentaires utilisent `lk_collectibles_tools_v1` et les méthodes `getToolsState`, `setToolsState`, `subscribeTools`. Leur format est `{ version: 1, savedViews: [{ id, name, query, createdAt }], plan: [id, ...] }` : au maximum **12 recherches enregistrées** et **30 étapes personnelles**. La sortie est une liste ordonnée par le visiteur, indépendante de son pourcentage de progression ; elle ne prétend calculer ni trajet optimal ni distance non documentée.

L'export JSON du carnet inclut facultativement ces outils dans `tools`. Les anciennes sauvegardes sans cette propriété restent compatibles ; elles n'imposent pas de supprimer les recherches ou la sortie courante. Les exportations de tableaux et l'impression sont proposés depuis le panneau `#col-tools`, à partir des données réellement présentes et des choix du visiteur.

Les imports sont validés intégralement avant écriture. Le candidat fusionné et les modifications ordinaires doivent rester dans les limites du format : 20 000 entrées par champ et 2 Mo pour l'enveloppe JSON exportable en UTF-8. Une opération qui dépasserait ces limites est refusée en conservant le carnet précédent. Un échec de la seconde écriture d'import déclenche la restauration de la première ; une impossibilité de restauration est signalée explicitement.

Les liens exacts vers la carte sont créés uniquement pour des coordonnées validées : `carte.html#collectible=ID`. Les objets sans coordonnées n'ont aucun marqueur de remplacement. Le suivi est local au navigateur ; il n'est relié à aucune sauvegarde Rockstar. Les IDs connus mais absents d'une nouvelle version du catalogue ne doivent pas devenir de nouveaux objets de progression.
