# LeonidaKit — application de la v7.29 (audit de finition)

Date : 24 septembre 2026. Cette archive « modifs » contient le patch ChatGPT « Finition 01 » **et** les corrections de l'audit, cumulés. Elle remplace le patch seul : ne pas appliquer les deux l'un après l'autre.

## Base exacte

- Archive de départ : `Leonidadex-main (4)(1).zip` — v7.28 — SHA-256 `21b735f7969ed421edb1ac0d45fb9da724082c23c46a39a3bb679000bf321286`. Racine `Leonidadex-main/`. Aucun commit fourni.
- L'archive v7.29 contient uniquement les fichiers ajoutés ou modifiés depuis cette base (462 fichiers), à leurs chemins exacts depuis la racine. Aucun fichier n'est à supprimer.

## Appliquer

1. Garder une copie du dossier v7.28.
2. Extraire l'archive **dans** la racine du site (là où sont `index.html`, `vercel.json`, `outils/`), en remplaçant les fichiers homonymes.
3. Ne rien retirer : médias et fichiers inchangés restent nécessaires. Vercel continue à servir la racine telle quelle, sans build ni dépendance.
4. Contrôle rapide avant mise en ligne : ouvrir `calculateurs.html` (onglet « Ça vaut le coup ? »), `a-propos.html`, `contact.html` à 360 px et à 1 366 px.

## Vérifier (facultatif, dossier de dépendances hors du site)

```bash
NODE_PATH=/chemin/deps/node_modules node outils/regenerer.cjs
NODE_PATH=/chemin/deps/node_modules node outils/verifier.js
NODE_PATH=/chemin/deps/node_modules SITE_ROOT="$PWD" node --test outils/tests/*.test.cjs
```

Attendu : régénération identique, 0 erreur, 328 tests `ok`. Les captures du Tuto se refont avec `python3 outils/tuto-shots.py .` (Playwright + Pillow).

## Données à fournir avant de publier Contact et Mentions comme définitives

Dans `outils/site-informations.json` : identité/statut de l'éditeur, responsable de publication, contact légal, boîte de contact réellement confirmée (`contactVerified` à `true` seulement après test), téléphone de l'hébergeur, modalités de conservation et de désinscription Brevo. Puis `node outils/regenerer.cjs`.

## Revenir en arrière

Restaurer la copie v7.28. Les sauvegardes des visiteurs (calculs, carnets, favoris, progression) restent lisibles dans les deux sens : la v7.29 lit les formats v1 à v3 et ne les réécrit qu'après une copie datée.
