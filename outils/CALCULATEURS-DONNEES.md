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
