# Collectibles GTA VI : recherche et choix UX

Vérification : 18 septembre 2026. Périmètre : collectibles uniquement.

## Résultat documentaire

Aucun collectible GTA VI suffisamment documenté pour une fiche factuelle n’a été retrouvé dans les sources accessibles consultées. Cela ne démontre pas l’absence de collectibles dans le jeu. Le catalogue livré contient donc zéro entrée publique, zéro catégorie supposée et zéro emplacement inventé.

| Source | Résultat de la vérification |
|---|---|
| [Rockstar Games — GTA VI](https://www.rockstargames.com/VI) | Aucun catalogue de collectibles dans le texte accessible de la page officielle. |
| [Rockstar — An Extended Look](https://www.rockstargames.com/VI/an-extended-look) | Page officielle du 27 août 2026 consultée ; aucun nom, total, emplacement ou récompense exploitable dans son texte. |
| [Vidéo officielle liée par Rockstar](https://www.youtube.com/watch?v=tJbzMqJGH4k) | URL vérifiée depuis Rockstar ; pas de transcription exploitable. La vidéo n’a pas été inspectée plan par plan. |
| [FullSweep — Hidden Packages Expected](https://fullsweepmap.com/location/co-hidden-packages-vc/) | La page mise à jour le 15 septembre qualifie elle-même son contenu de prédiction. Exclu du catalogue. |
| [FullSweep — Keys Expected](https://fullsweepmap.com/location/co-hidden-packages-keys/) | Hypothèse fondée sur les anciens jeux. Exclue du catalogue. |
| [Map-6 — Collectibles](https://map-6.com/en/guides/gta-6-collectibles-map) | Catégories attendues et quantités de substitution : ni noms ni nombres repris dans les données publiques. |

Aucune donnée issue d’une fuite n’est utilisée. Un objet aperçu dans un décor n’est pas identifié comme ramassable sans preuve supplémentaire. Aucun collectible n’ayant été retenu, aucune photographie d’objet, capture générique ou image générée ne remplit artificiellement le catalogue. Un éventuel visuel d’ambiance réutilise uniquement un média déjà présent dans le projet et reste séparé des fiches d’objets.

## Benchmark fonctionnel

Les textes et l’identité visuelle des références ne sont pas copiés. Les fonctionnalités documentées sont adaptées à la structure existante de Leonidakit.

| Référence vérifiée | Fonctions documentées | Adaptation retenue |
|---|---|---|
| [Dododex](https://www.dododex.com/) | Recherche d’objets/créatures, catégories, fiches, conseils, outils associés | Recherche par plusieurs champs, fiches conditionnelles, accès direct aux sources |
| [MapGenie GTA V — fiche officielle de l’éditeur](https://play.google.com/store/apps/details?id=io.mapgenie.gta5map) | Catégories, recherche, suivi des collectibles, plusieurs fonds cartographiques, synchronisation | Filtres combinés, recherche, trouvé/non trouvé, sauvegarde locale transférable |
| [RDR2Map — fiche officielle de l’éditeur](https://play.google.com/store/apps/details?id=io.mapgenie.rdr2map) | Recherche, catégories, notes personnelles et marquage trouvé | Notes et favoris, progression, accès fiche/carte dans les deux sens |

Limites : les sites MapGenie et IGN Maps n’ont pas pu être ouverts ; RDR2Map et GTA-5-Map étaient bloqués à la lecture automatisée. Le benchmark porte sur les fonctions documentées dans les fiches de leurs éditeurs, et ne prétend pas constituer un test de leurs interfaces connectées.

## Choix d’intégration

- Le site reste statique en HTML/CSS/JavaScript, avec publication directe sur Vercel et aucune dépendance de production.
- Un fichier source séparé nourrit catalogue, fiches, recherche et carte.
- Les catégories et les filtres apparaissent suivant les données réellement disponibles.
- Les inconnues restent nulles ; aucune coordonnée réelle approximative n’est transposée sur le fond de carte.
- Le nombre suivi représente les objets documentés pouvant être cochés, pas un pourcentage certifié de complétion du jeu.
- Les fiches pauvres ou non confirmées restent exclues de l’indexation ; les brouillons ne sont pas publiés.
- Les fixtures de vérification vivent dans outils/, dossier exclu du déploiement par .vercelignore.

Le document utilisateur transmis se termine au début du point 31. Les exigences présentes dans ce document ont servi de référence ; aucune suite manquante n’a été supposée.
