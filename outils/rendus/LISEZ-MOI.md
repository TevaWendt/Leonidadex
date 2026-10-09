# Silhouettes des illustrations des catalogues (v7.77)

Les 191 illustrations de `img/illus/` sont des silhouettes « teaser » faites **hors du site** : chaque objet est modelé en
3D avec Blender (module Python `bpy` 5.2), puis montré en ombre noire, avec un liseré de lumière teinté de sa propre couleur,
ses lumières (néons, phares, faisceaux, écrans) qui percent et son ombre portée, sur un fond aux couleurs du site (dégradé,
lignes de balayage, soleil rétro). On devine la vraie forme ; le visuel officiel prendra sa place dès qu'il existera. Ce
dossier contient les scripts qui les produisent ; il n'est pas mis en ligne (`outils/` est exclu par `.vercelignore`).

## Contenu

- `silhouettes.py` : construit la scène de chaque élément et en fait la silhouette ; écrit `<sortie>/<famille>/<id>.png`
  (960 × 600). Exemple : `python silhouettes.py perso-vehicules/turbo,freins --out silhouettes` ; `--pct 50` pour un aperçu.
  Familles : `consommables`, `coiffures`, `tatouages`, `tenues`, `perso-vehicules`, `perso-armes`. Les motifs de tatouage
  « flash » et les planches de placement sont tracés à plat d'après les images de `tex/`.
- `lk/toon.py` : la mise en silhouette.
  - supports (sol, table, mur, papier d'emballage) changés en « attrape-ombres » : seule l'ombre portée reste ; le cadrage
    recule si le sujet dépasse du champ (même angle) ; les chevelures deviennent des masses (points → volume → maillage) ;
  - un rendu couleur rapide (Cycles) donne l'ombre portée, la couleur propre de l'objet au bord (teinte du liseré) et ses
    lumières ; des passes à 2× (normales ; profondeur et identifiants) donnent la silhouette exacte, le liseré de
    contre-jour et quelques traits de forme très discrets ; une passe des lumières et, pour les tatouages, une passe des
    motifs (qui brillent sous la peau) ; composition finale avec OpenCV ;
  - le même module contient aussi la mise en dessin « encre et aplats » essayée avant (fonction `compose`).
- `lk/` (autres modules) : la construction des scènes, une par famille, et les briques communes.
  - `core.py` (scène, matières, géométrie, lumières, caméra), `assets.py` (matières et objets scannés) ;
  - consommables : `food.py`, `food2.py`, `food3.py` (registre) ;
  - coiffures : `head2.py` (tête de mannequin), `hair.py` (mèches, barbes, registre) ;
  - tatouages : `tattoo.py`, `tattoo2.py`, `tattoo3.py` (registre) ;
  - tenues : `clothes.py`, `clothes2.py`, `wear86.py` (vêtements suspendus, pliés, robes), `clothes3.py` (registre) ;
  - personnalisation des véhicules : `car86.py` (coupé générique des années 80, roues), `stage86.py`, `parts86.py`
    (pièces), `cars4.py` (registre, écusson) ;
  - personnalisation des armes : `guns2.py` (registre).
- `fetch.py` : télécharge à la demande les ressources Poly Haven (domaine public, CC0) : objets et matières scannés,
  panoramas (`model:<id>@1k`, `tex:<id>@1k`, `hdri:<id>@2k`). Elles vont dans `ressources/` (ou dans le dossier donné par la
  variable d'environnement `LK_RESSOURCES`), jamais validé (`.gitignore`).
- `visage/` : maillage canonique du visage MediaPipe (Google, Apache 2.0, licence jointe), base de la tête de mannequin.
- `tex/` : générateurs des images utilisées (motifs « flash » de tatoueur, planches de placement, imprimés de tissus,
  cachemire) ; dessins originaux, aucun texte de marque. L'écusson, l'écran thermique et la gravure de crosse sont fabriqués
  au premier besoin.
- `vers-webp.cjs` : convertit les silhouettes en `img/illus/<famille>/<id>.webp` (960 × 600) et `<id>-p.webp` (384 × 240) :
  `node outils/rendus/vers-webp.cjs <dossier des silhouettes>`.

## Refaire une illustration

1. Installer Python 3.13 et, dans un environnement virtuel : `pip install bpy==5.2.* pillow numpy opencv-python-headless` ;
   Node.js avec `sharp` (`npm i sharp`, ou `NODE_PATH` vers un dossier `node_modules` qui le contient) ; `curl`.
2. Une seule fois, fabriquer les images de `tex/` : `node tex/tat2.cjs`, puis `python tex/ink.py`,
   `python tex/paisley.py`, `python tex/wear_svgs.py` et `python tex/zones_svg.py`.
3. `python outils/rendus/silhouettes.py <famille>/<id> --out /tmp/silhouettes` (les ressources Poly Haven sont téléchargées
   au premier besoin).
4. `node outils/rendus/vers-webp.cjs /tmp/silhouettes`, puis `node outils/regenerer.cjs` et les tests.

## Quand un vrai visuel arrive

Dès qu'un élément reçoit son visuel officiel (champ `media` dans `outils/catalogues/`), la liste le montre à la place de
la silhouette ; le contrôle de `outils/gen-acquisitions.cjs` demande alors de retirer l'élément de
`outils/illustrations/index.cjs` (`IDS`) et ses deux fichiers de `img/illus/`.

## Licences des ressources

- Poly Haven (https://polyhaven.com) : objets, matières et panoramas en CC0 (domaine public), aucune attribution requise ;
  crédit donné par courtoisie dans les Mentions du site.
- Maillage canonique du visage MediaPipe (Google, Apache 2.0) : `visage/LICENSE`.
- Tout le reste (géométrie procédurale, matières, motifs, imprimés, mise en silhouette) est créé pour le site.
