# Leonidakit

Site compagnon GTA VI (carte, véhicules, armes, outils). HTML, CSS et JavaScript, sans framework.
Hébergé sur Vercel, qui publie tel quel le contenu de ce dépôt : **aucune commande de build**.

## Ce qu'il y a à la racine

| Élément | Rôle |
|---|---|
| `index.html`, `carte.html`, `vehicules.html`, `armes.html`, etc. | les pages du site (19 fichiers `.html`, dont `medias.html` : crédits des visuels officiels) |
| `style.css`, `fiches.css` | les styles |
| `app.js`, `common.js`, `fiches.js`, `carte.js`, `comparateur.js`, `classement.js`, `progression.js` | le code qui fait fonctionner les pages |
| `armes-data.js`, `vehicules-data.js`, `carte-gtadb.js`, `search-index.js`, `search-lieux.js`, `assets-manifest.js`, `progression-data.js` | les données lues par le site (`search-lieux.js` : les 2 500 lieux de la carte, chargé seulement à la première recherche) |
| `robots.txt`, `sitemap.xml`, `sitemap-fiches.xml`, `googleea0091a4822a39f7.html` | référencement Google |
| `vercel.json` | onze redirections d'anciennes adresses (dont les dossiers imbriqués par erreur `armes/armes/`, `personnages/personnages/`, `photos/photos/`, `img/officiel/officiel/`) et les en-têtes de sécurité (dont la Content-Security-Policy) et de cache. Pas de build. |
| `.vercelignore` | exclut `outils/` du déploiement : le dossier reste sur GitHub mais n'est jamais mis en ligne. |
| `armes/` | 27 fiches armes (plus 4 redirections d'anciens identifiants), générées depuis `armes-data.js` par `outils/gen-armes.cjs` |
| `vehicules/` | 314 fiches véhicules (302 actives, plus les redirections et retraits) |
| `lieux/`, `personnages/`, `entreprises/`, `demeures/`, `planques/` | 29 fiches générées depuis `outils/editorial.json` (régions, personnages, entreprises), avec hubs `lieux.html`, `personnages.html`, `entreprises.html` |
| `photos/` | 3 185 photos de la carte en WebP, 960 px max, qualité 82 (gtadb.org, CC BY 4.0). C'est la totalité de ce que le dépôt gtadb propose pour nos 2 474 bâtiments : les autres bâtiments n'ont pas de photo chez eux non plus. |
| `img/` | carte sociale et `img/officiel/` : 148 visuels officiels Rockstar en deux tailles (captures, artworks et photogrammes des trailers, recadrés sans bandes noires) (crédits dans `outils/medias-officiels.json`) |
| `outils/` | scripts de génération, données sources et tests automatisés (`outils/tests/`). Ne sert pas au site en ligne (exclu par `.vercelignore`). |

## Règles

- Ne jamais ajouter de `package.json` ni de commande de build sur Vercel : le site est servi tel quel.
- Pour corriger un véhicule, modifier `outils/v-corrige.json` puis régénérer (voir `outils/LISEZ-MOI.md`). Ne pas éditer les fiches à la main.
- Ordre de régénération : `node outils/final.js`, `node outils/gen.js`, `node outils/gen-armes.cjs`, `node outils/lore-gen.js`, puis `node outils/audit-final.js` et `node outils/verifier.js` (liens, images, srcset, galeries, JSON-LD, sitemaps).
- Tests automatisés (152 scénarios, dont 53 pour les collectibles et 43 pour les calculateurs : démarrage de chaque page, recherche, garage, équipement, comparateur, classement, carte, import/export) : `npm install jsdom postcss` une fois dans un dossier à part, puis depuis la racine `NODE_PATH=<ce dossier>/node_modules SITE_ROOT=$PWD node --test outils/tests/*.test.cjs`. Tout doit être `ok`.
- Photos de la carte : le manifeste `assets-manifest.js` (chargé par toutes les pages) ne liste pas `photos/` ; les références photo sont filtrées à la génération de `carte-gtadb.js` (seuls les fichiers présents sont conservés). Pour ajouter des photos, déposer les WebP dans `photos/`, passer les références de `outils/data/carte-gtadb-source.json` en `.webp`, puis régénérer.
- Les visuels officiels Rockstar (`img/officiel/`) sont des médias promotionnels © Rockstar Games / Take-Two, tolérés pour un site de fans ; ils ne sont pas libres de droits.
- Pour corriger une arme, modifier `armes-data.js` (textes, statut, source) ou `outils/armes-medias.json` (aperçus officiels), puis `node outils/gen-armes.cjs`. Les schémas dessinés des 27 armes vivent dans `outils/armes-schemas.cjs` (un SVG par identifiant). Ne pas éditer les fiches `armes/` à la main : une régénération les écraserait.
- Schémas des véhicules : `outils/vehicules-schemas.cjs` dessine un profil par fiche (type de carrosserie choisi d'après l'inspiration réelle, proportions et détails propres à chaque véhicule). Ils remplacent les silhouettes par catégorie sur le hub et sur les fiches sans photo ; `node outils/gen.js` les régénère.
- Calculateurs : `calculateurs.html` est un simulateur utilisable (objectif, activités, rentabilité, achats, budget, ordre d'achat) ; moteur dans `calculateurs-engine.js`, scénarios d'exemple dans `calculateurs-data.js` (fictifs tant que Rockstar n'a rien publié), catalogue projeté par `outils/gen-calculateurs-catalogue.cjs` (lancé par `sync-site.cjs`). Documentation dans `outils/CALCULATEURS-*.md`, 43 tests dédiés.
- Textes propres à chaque fiche : `outils/redaction.cjs` rédige pour chaque véhicule et chaque arme des paragraphes à partir de ses seuls champs (catégorie, statut, source, inspiration, origine, édition, munitions), avec des tournures tirées au sort de façon déterministe. Les titres de sections varient aussi. Rien n'est inventé ; c'est ce qui différencie les 329 fiches pour Google.
- Collectibles : `outils/collectibles.json` (catalogue vide tant que Rockstar n'a rien publié de vérifiable, format décrit dans `outils/COLLECTIBLES.md` et `outils/collectibles.schema.json`), `node outils/gen-collectibles.cjs` régénère `collectibles-data.js`, les fiches et `sitemap-collectibles.xml` ; lancé automatiquement par `sync-site.cjs`. Le carnet (trouvés, favoris, notes, sorties, sauvegarde JSON) reste local au navigateur.
- Vignettes : `img/schemas/<id>.svg` (302 fichiers écrits par `gen.js`) servent au top 10 et aux véhicules rares ; `vehicules-data.js` porte pour chaque véhicule un champ `thumb` (photo officielle 480 px sinon schéma).
- Photos de la carte : `outils/data/carte-gtadb-source.json` doit référencer les fichiers WebP réellement présents (`photos/L…,ig.webp`). Une référence `.jpg` est considérée comme une photo absente et disparaît de `carte-gtadb.js` à la régénération (défaut corrigé en v7.2, protégé par un test).
- Aucune donnée issue de fuites. Crédit gtadb.org conservé sur la carte et dans les mentions légales.
