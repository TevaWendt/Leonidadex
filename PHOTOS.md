# Photos des modèles réels

## Ce que ça fait

`photos-reelles.js` interroge l'API de Wikimedia Commons, ne retient que les
fichiers sous **licence libre réutilisable commercialement** (CC0, CC BY,
CC BY-SA, domaine public), télécharge la photo du modèle réel de chaque
véhicule et enregistre l'attribution exigée par la licence.

La photo s'affiche dans la section « Le modèle réel » de la fiche, sous une
légende qui précise auteur, licence, et que le véhicule photographié
n'est pas celui du jeu.

Les vignettes du hub ne changent pas : elles gardent les silhouettes, qui
représentent honnêtement le véhicule en jeu.

## Lancer

```
cd <racine du dépôt>
node photos-reelles.js
```

La base courante contient 295 inspirations renseignées. Le temps dépend de Wikimedia et des résultats disponibles.
Le script est repartable : relancé, il ne retélécharge que ce qui manque.

```
node photos-reelles.js --force              tout retélécharger
node photos-reelles.js grotti-cheetah-classic   un seul véhicule
```

## Ce qu'il produit

| Fichier | Rôle |
|---|---|
| `img/vehicules/<id>-reel.jpg` | la photo, largeur 1400 px |
| `credits-reels.json` | attribution par véhicule, lu par le site |
| `photos-a-revoir.txt` | véhicules sans photo libre trouvée |

Conservez les photos et `credits-reels.json` avec le projet. Le rapport `photos-a-revoir.txt` reste un outil de travail et n'est pas publié par le build. Vérifiez chaque photo retenue et son attribution avant publication, puis relancez `npm run build`.

## Corriger un choix

Le script prend la meilleure photo selon un score (taille, cadrage paysage,
nom du fichier proche du modèle). Il se trompera parfois.

Pour remplacer : déposez votre image en `img/vehicules/<id>-reel.jpg` et
corrigez l'entrée dans `credits-reels.json`. Relancez `npm run build` pour actualiser le manifeste des fichiers disponibles.

## Ce que le script refuse

- toute licence non libre, sans exception
- les images de moins de 800 px de large
- les formats portrait ou carrés
- les fichiers dont le nom évoque un logo, un intérieur, un détail, une épave
