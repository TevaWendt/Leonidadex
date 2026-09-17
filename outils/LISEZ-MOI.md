# outils/ : chaîne de génération des véhicules

Ces fichiers ne servent pas au site en ligne. Ils permettent de régénérer les 302 fiches
véhicules, les 27 fiches armes, le hub, l'index de recherche, les compteurs et les sitemaps à partir de la
source `v-corrige.json`. Ils s'exécutent avec Node.js (aucune dépendance à installer),
**depuis la racine du dépôt** :

```
node outils/final.js         # v-corrige.json -> vehicules-data.js
node outils/gen.js           # fiches vehicules/, hub, index, sitemaps, compteurs
node outils/gen-armes.cjs    # armes-data.js -> fiches armes/, hub armes.html (cartes, filtres, sélecteurs, ItemList)
node outils/audit-final.js   # contrôles de cohérence (doit afficher six zéros)
node outils/lore-gen.js      # lieux, personnages, entreprises, medias.html, bloc accueil, puis resynchronisation
node outils/verifier.js      # liens, images, scripts : tout doit pointer vers un fichier existant
```

`gen.js` enchaîne automatiquement `sync-site.cjs`, qui synchronise les compteurs
de l'accueil, du hub et de la carte, l'index de recherche, `assets-manifest.js`,
les sitemaps et les métadonnées sociales de toutes les pages.

| Fichier | Rôle |
|---|---|
| `v-corrige.json` | source de vérité des 302 véhicules. Seul fichier à éditer pour corriger un véhicule. Le champ `medias` liste les visuels officiels (ids de `medias-officiels.json`). |
| `medias-officiels.json`, `armes-medias.json`, `medias-identifications.json` | registre des 148 visuels Rockstar (source, crédit, alt, variantes 480/1280), association aux 18 armes illustrées, et provenance des associations image / fiche ajoutées en v7.2 |
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
| `tests/` | 53 tests jsdom (voir README racine). Ils vérifient le code et le DOM, pas le rendu visuel. |
