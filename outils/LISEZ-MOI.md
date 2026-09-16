# outils/ : chaîne de génération des véhicules

Ces fichiers ne servent pas au site en ligne. Ils permettent de régénérer les 301 fiches
véhicules, le hub, l'index de recherche, les compteurs et les sitemaps à partir de la
source `v-corrige.json`. Ils s'exécutent avec Node.js (aucune dépendance à installer),
**depuis la racine du dépôt** :

```
node outils/final.js         # v-corrige.json -> vehicules-data.js
node outils/gen.js           # fiches vehicules/, hub, index, sitemaps, compteurs
node outils/audit-final.js   # contrôles de cohérence (doit afficher six zéros)
node outils/lore-gen.js      # lieux, personnages, entreprises + bloc accueil, puis resynchronisation
```

`gen.js` enchaîne automatiquement `sync-site.cjs`, qui synchronise les compteurs
de l'accueil, du hub et de la carte, l'index de recherche, `assets-manifest.js`,
les sitemaps et les métadonnées sociales de toutes les pages.

| Fichier | Rôle |
|---|---|
| `v-corrige.json` | source de vérité des 301 véhicules. Seul fichier à éditer pour corriger un véhicule. Le champ `medias` liste les visuels officiels (ids de `medias-officiels.json`). |
| `medias-officiels.json`, `armes-medias.json` | registre des 49 visuels Rockstar (source, crédit, variantes 480/1280) et association aux 4 armes illustrées |
| `editorial.json`, `lore-gen.js`, `lore-index.json` | textes des régions, personnages et entreprises ; générateur des pages correspondantes ; entrées ajoutées à la recherche |
| `redirections.json` | ancien identifiant -> nouvel identifiant (page de redirection générée) |
| `retraits.json` | fiches sorties de la base (page d'explication noindex générée) |
| `legacy-pages.json` | anciennes fiches conservées sans correspondance certaine |
| `templates/` | gabarits d'extraction pour la génération (pas des pages à publier) |
| `data/carte-gtadb-source.json` | source complète des bâtiments gtadb, avec toutes les références photo ; `carte-gtadb.js` en est dérivé (seules les photos présentes dans `photos/` sont conservées) |
| `credits-images.json` | crédits des visuels véhicules (`img/vehicules/`) |
| `images.js` | contrôle des visuels véhicules et de leurs crédits (`node outils/images.js`, puis `--ecrire`) |
| `photos-reelles.js`, `licenses.cjs`, `PHOTOS.md` | récupération optionnelle de photos de modèles réels sur Wikimedia Commons, licences libres uniquement |
| `croise.js`, `similarite.js` | contrôles éditoriaux (alertes lexicales, similarité des textes) |
| `landmarks-leonidakit.json` | export de référence des lieux, conservé pour la provenance |
