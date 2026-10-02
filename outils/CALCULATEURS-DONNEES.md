# Données du calculateur

`calculateurs-data.js` expose `window.LKCalcData` :

- `catalogue()` projette à chaque appel les véhicules de `LK_VEHICULES`, les armes de `LK_ARMES` et les lieux, commerces et demeures du catalogue généré. Les identifiants et fiches du site sont conservés. Aucun véhicule ni aucune arme n'est recopié dans le catalogue généré.
- `activities()` lit une éventuelle table `window.LK_ACTIVITIES`. En son absence, il retourne `[]`. Une fiche commerciale, une planque ou une région ne devient pas une activité rémunératrice par déduction.
- `presets` contient trois **hypothèses pédagogiques** A/B/C, toutes `status: "manual"`. Ce ne sont pas des activités officielles de GTA VI.
- `meta` précise les unités : dollars de jeu, minutes et partage en pourcentage.

Charger, dans cet ordre, `vehicules-data.js`, `armes-data.js`, `calculateurs-catalogue.js`, `calculateurs-activites.js`, puis `calculateurs-data.js` avant l'interface. L'adaptateur fonctionne aussi avec des sources absentes, en renvoyant des collections vides.

## Source éditoriale et génération

Modifier les fiches dans `outils/editorial.json`, les références visuelles dans `outils/medias-officiels.json` et le mapping des armes dans `outils/armes-medias.json`, puis lancer :

```sh
node outils/gen-calculateurs-catalogue.cjs
```

Le générateur vérifie que les fiches locales existent et choisit une image locale existante. Il transmet les champs économiques présents dans la source sans inventer de valeur. Les pages `planques` ne sont pas dupliquées : leurs lieux déjà représentés restent accessibles dans leurs sections existantes.

## Inconnu, gratuit et provenance

`null` signifie **inconnu**. `0` est une valeur connue et ne doit pas être remplacé par un prix de démonstration. Les identifications `officiel`, `vu` ou `comm` de la source deviennent `official`, `observed` ou `community`. Ce niveau porte sur l'identification de l'objet, **pas sur son prix**. Les entrées éditoriales sans statut portent `source-listed` : reprise d'une source existante sans nouvelle vérification.

Chaque champ numérique expose `fieldMeta.<champ> = { status, source, verifiedAt, unit }`. Un nombre sans métadonnées reste `unverified`, même si l'objet porte `official`. Aucune date de vérification n'est créée à partir de la date de génération. Les liens de provenance éditoriaux sont conservés comme tels, sans attester que leur contenu a été vérifié pendant cette génération.

Exemple d'ajout futur dans **la source originale** d'un véhicule :

```js
economy: {
  price: {
    value: 35000,
    status: "verified",
    source: "URL précise ou référence de vérification en jeu",
    verifiedAt: "AAAA-MM-JJ",
    unit: "$"
  }
}
```

Cet exemple décrit le schéma, pas un vrai prix. L'adaptateur accepte aussi `price` ou `prix` à la racine, puis `economy.price` ou `economy.prix`, et des métadonnées dans `fieldMeta.price` ou `priceMeta`. Les champs absents restent `null`. Les performances (`speed`, `acceleration`, `seats`) suivent la même règle ; aucune valeur n'est déduite d'un modèle réel, d'une image ou de GTA Online. Les unités de performance doivent être explicitement documentées dans les métadonnées lorsqu'elles seront ajoutées.

## Ajouter des activités vérifiées

Le fichier déjà chargé `calculateurs-activites.js` déclare `window.LK_ACTIVITIES = []`. Compléter cette table, avec :

```js
{
  id: "identifiant-stable",
  name: "Nom exact sourcé",
  reward: null, cost: null, duration: null, prep: null,
  cooldown: null, share: null, investment: null, players: null,
  beginner: null, source: null, status: "unverified", verifiedAt: null,
  fieldMeta: {}
}
```

Durées et attente en **minutes** ; `share` vaut un pourcentage de la récompense brute. `players` est informatif et ne doit pas diviser une seconde fois une récompense dont la part personnelle est déjà appliquée. `cost` est le coût récurrent personnel ; `investment` le coût initial payé une seule fois. Les champs absents ne deviennent pas zéro. L'interface doit demander les hypothèses manquantes avant le calcul.

Les saisies utilisateur doivent rester locales au simulateur et ne jamais réécrire les données source. Tout prix remplacé localement doit porter la mention « hypothèse personnelle ».

Pour les véhicules, modifier `outils/v-corrige.json` puis régénérer avec les commandes habituelles ; ne pas éditer uniquement le dérivé `vehicules-data.js`. Pour les armes, `armes-data.js` est la source existante. Le générateur du catalogue du calculateur est aussi appelé au début de `outils/sync-site.cjs`. Les unités sont affichées telles que documentées : le ratio prix/vitesse est désactivé si la vitesse n’est pas explicitement en km/h.

## v7.59 (check ultime) — un seul schéma, lu partout, et des phrases qui suivent la donnée

- **Trois lecteurs alignés** (test `outils/tests/donnees-publiees.test.cjs`) : `calculateurs-data.js` (`numericField`, exécution), `calculateurs-modele.js` (`V.published`, fiches documentaires et analyse du scénario — `priceV` garde le vrai statut, jamais « officiel » par défaut), `outils/donnees-publiees.cjs` (`prixDe`, générateurs). Un nombre nu reste **non confirmé** ; `status: "unknown"` annule la valeur ; un statut inconnu devient non confirmé ; `official` / `verified` exigent `source` et `verifiedAt`, sinon la régénération s'arrête (`etat().errors`).
- **Phrases d'absence reliées à la donnée** : `outils/donnees-publiees.cjs` → `etat()` (prix connus par type, activités complètes, colonnes GTA VI des listes) et `phrases()` ; `sync-site.cjs` remplit `[data-lk-donnees="clé"]` (calculateurs.html, index.html) et les marqueurs `{donnees:clé}` des textes éditoriaux (`outils/acquisitions.json`, `achats-editorial.json`, `editorial-hubs.json`, `informations-editorial.json`, `catalogues/editorial.json`) avant de reconstruire le JSON-LD FAQ ; `gen-leo.cjs` les remplit dans les textes de Léo ; `calculateurs.js` calcule la phrase du catalogue à l'exécution ; `site-shell.cjs` et `gen-achats.cjs` calculent les encarts et cartes. `node outils/donnees-publiees.cjs --absences` liste ce qui reste figé.
- **Fiches** : `gen.js` / `gen-armes.cjs` posent la puce « Prix publié », la ligne « Prix en jeu » et `data-prix` sur le bouton du carnet ; `lore-gen.js` adapte l'encart calculateur ; `fiche-doc.cjs` affiche source (lien) et date ; les listes dépliables (`catalogues.cjs`, `fiche-doc.cjs`) affichent un `prix_gta6` publié (schéma `{valeur, statut officiel|verified, source, verifiedAt}` validé par `catalogues/schema.json`).
- **Léo** : `gen-leo.cjs` porte `price`, `priceStatus` (libellé français), `priceSource`, `priceVerifiedAt` ; `leo-core.js` répond « combien coûte X ? » avec le prix publié (fiche ou ligne de liste), avant une question rédigée ; les sujets de `leo-knowledge.json` qui affirment une absence portent `absence` + `textKnown`.
- **Procédure et répétition** : `outils/QUAND-ROCKSTAR-PUBLIE.md` ; `node outils/tests/repetition-generale.cjs` (copie temporaire, valeurs fictives, 46 vérifications, preuve d'absence de trace).
