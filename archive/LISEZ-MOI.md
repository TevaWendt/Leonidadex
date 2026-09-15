# Véhicules — correction complète des 192 fiches

## Ce que contient ce lot

Une **passe de correction** sur l'ensemble de la base véhicules, contrôlée
contre une base de référence de 296 entrées relevée le 13 septembre 2026.

| Correction | Nombre |
|---|---|
| Erreurs de constructeur | 19 |
| Inspirations réelles fausses ou imprécises | 149 |
| Catégories erronées | 15 |
| Textes réécrits (décrivaient la mauvaise voiture) | 17 |
| Doublon fusionné (Creado → Ganado) | 1 |
| Entrée issue d'une fuite, retirée (Alpha) | 1 |
| Véhicules d'édition signalés (nouveau champ) | 9 |

**194 → 192 véhicules.** La baisse est saine : un doublon supprimé, une entrée
non conforme retirée.

Les liens « Modèle réel » ont tous été recalculés sur les inspirations
corrigées. Avant ce lot, 149 d'entre eux envoyaient vers le mauvais véhicule.

## Nouveautés visibles

- **Filtre par origine du modèle** : américain (93), japonais (24), européen (35).
  Branché sur un axe de filtrage déjà présent dans `app.js`, aucune modification
  de ce fichier.
- **Badge d'édition** sur les cartes et les fiches : 8 véhicules exclusifs à
  l'édition Ultimate, 1 bonus de précommande, avec renvoi vers `vehicules-rares.html`.
- **Section « Et les autres ? »** en bas de la page véhicules : explique pourquoi
  la liste est plus courte que celle des concurrents, et pose le choix éditorial
  de ne pas relayer les fuites.
- **Les 192 fiches sont au format de dernière génération.** Avant ce lot, seules
  4 l'étaient : les 188 autres n'avaient ni bouton garage, ni galerie, ni données
  structurées `Vehicle`.

## Fichiers à remplacer

| Fichier | Rôle |
|---|---|
| `vehicules/` | les 192 fiches, remplacent les 139 précédentes |
| `vehicules.html` | grille, compteurs, filtres, section « Et les autres ? » |
| `vehicules-data.js` | source de vérité corrigée |
| `fiches.js` `fiches.css` | bouton modèle réel, repli si vignette absente |
| `search-index.js` | index remis à jour |
| `sitemap.xml` `sitemap-fiches.xml` | 192 URL de fiches |
| `final.js` `gen.js` | régénération, à garder dans le dépôt |
| `photos-reelles.js` `PHOTOS.md` | photos des modèles réels, optionnel |

Deux fichiers disparaissent : `vehicules/vapid-creado.html` et
`vehicules/albany-alpha.html`. Supprime-les sur GitHub, ils ne sont plus
référencés nulle part.

À supprimer aussi, sans rapport avec ce lot : les fichiers parasites
`vehicules/app.js`, `vehicules/style.css`, `vehicules/search-index.js`,
`vehicules/temp.txt`, `vehicules/vehicules.html`.

## Régénérer

```
node final.js   # recalcule liens, origines, index de recherche
node gen.js     # régénère la page, les 192 fiches et les sitemaps
```

## Ce qui reste

**139 véhicules manquants** face à la base de référence, principalement des
bateaux (25), des vans (16), des berlines (13) et des véhicules d'urgence (10).

Ils ne sont pas dans ce lot parce que la base de référence ne dit pas, dans sa
grille, lesquels viennent des fuites de 2022 et 2026. Cette information figure
sur les pages par classe, qu'il faut relever une par une. Tant qu'elle manque,
ajouter ces 139 véhicules reviendrait à publier de la donnée de fuite.
