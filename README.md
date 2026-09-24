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
- Tests automatisés (moteur et régressions : démarrage de chaque page, recherche, garage, équipement, comparateur, classement, carte, import/export) : `npm install jsdom postcss` une fois dans un dossier à part, puis depuis la racine `NODE_PATH=<ce dossier>/node_modules SITE_ROOT=$PWD node --test outils/tests/*.test.cjs`. Tout doit être `ok`.
- Photos de la carte : le manifeste `assets-manifest.js` (chargé par toutes les pages) ne liste pas `photos/` ; les références photo sont filtrées à la génération de `carte-gtadb.js` (seuls les fichiers présents sont conservés). Pour ajouter des photos, déposer les WebP dans `photos/`, passer les références de `outils/data/carte-gtadb-source.json` en `.webp`, puis régénérer.
- Les visuels officiels Rockstar (`img/officiel/`) sont des médias promotionnels © Rockstar Games / Take-Two, tolérés pour un site de fans ; ils ne sont pas libres de droits.
- Pour corriger une arme, modifier `armes-data.js` (textes, statut, source) ou `outils/armes-medias.json` (aperçus officiels), puis `node outils/gen-armes.cjs`. Les schémas dessinés des 27 armes vivent dans `outils/armes-schemas.cjs` (un SVG par identifiant). Ne pas éditer les fiches `armes/` à la main : une régénération les écraserait.
- Schémas des véhicules : `outils/vehicules-schemas.cjs` dessine un profil par fiche (type de carrosserie choisi d'après l'inspiration réelle, proportions et détails propres à chaque véhicule). Ils remplacent les silhouettes par catégorie sur le hub et sur les fiches sans photo ; `node outils/gen.js` les régénère.
- Calculateur : `calculateurs.html` est un simulateur utilisable, écrit pour être compris par un enfant de 10 ans (sept questions : Mon objectif, Mes achats, Mon temps de jeu, Mon budget, Quoi acheter d’abord ?, Ça vaut le coup ?, Mes activités). Moteur dans `calculateurs-engine.js` (les seuls calculs), scénario commun et migrations dans `calculateurs-scenario.js`, carnets dans `calculateurs-notebooks.js`, interface dans `calculateurs.js` et `calculateurs-workspace.js` (achats, rentabilité, ordre, budget, Mon plan), animations dans `calculateurs-motion.css` / `calculateurs-motion.js` et graphiques dans `calculateurs-visuals.js`, exemples dans `calculateurs-data.js` (fictifs tant que Rockstar n’a rien publié), catalogue projeté par `outils/gen-calculateurs-catalogue.cjs` (lancé par `sync-site.cjs`). `calculateurs-hub.js` : la barre « Que veux-tu calculer ? » ouvre le bon calcul depuis une phrase et préremplit les cases. `calculateurs-simple.js` : couche « facile » sans aucun calcul (nombres écrits en mots « = 1 million $ », séparateurs de milliers, réglette d’objectif, aide « Je ne sais pas combien je gagne », mode « Pas à pas » une question à la fois, résumé collant sur téléphone). Documentation : `outils/CALCULATEUR-V2.md`.
- Textes propres à chaque fiche : `outils/redaction.cjs` rédige pour chaque véhicule et chaque arme des paragraphes à partir de ses seuls champs (catégorie, statut, source, inspiration, origine, édition, munitions), avec des tournures tirées au sort de façon déterministe. Les titres de sections varient aussi. Rien n'est inventé ; c'est ce qui différencie les 329 fiches pour Google.
- Collectibles : `outils/collectibles.json` (catalogue vide tant que Rockstar n'a rien publié de vérifiable, format décrit dans `outils/COLLECTIBLES.md` et `outils/collectibles.schema.json`), `node outils/gen-collectibles.cjs` régénère `collectibles-data.js`, les fiches et `sitemap-collectibles.xml` ; lancé automatiquement par `sync-site.cjs`. Le carnet (trouvés, favoris, notes, sorties, sauvegarde JSON) reste local au navigateur.
- Vignettes : `img/schemas/<id>.svg` (302 fichiers écrits par `gen.js`) servent au top 10 et aux véhicules rares ; `vehicules-data.js` porte pour chaque véhicule un champ `thumb` (photo officielle 480 px sinon schéma).
- Photos de la carte : `outils/data/carte-gtadb-source.json` doit référencer les fichiers WebP réellement présents (`photos/L…,ig.webp`). Une référence `.jpg` est considérée comme une photo absente et disparaît de `carte-gtadb.js` à la régénération (défaut corrigé en v7.2, protégé par un test).
- Aucune donnée issue de fuites. Crédit gtadb.org conservé sur la carte et dans les mentions légales.


## Calculateur : v7.27 (24 septembre 2026)

Le calculateur reste entièrement statique, gratuit et sans compte. Les sept calculs partagent `calculateurs-engine.js`. Les nombres déjà écrits sont des exemples. L’accueil utilise exactement le même moteur que la page complète.

- Guide technique : `outils/CALCULATEUR-V2.md` (formules, modèle de données, sauvegardes, mise à jour des données). Couverture du brief : `outils/CALCULATEUR-COUVERTURE.md`.
- Tests moteur sans dépendance : `node --test outils/tests/calculateurs-engine.test.cjs`.
- Parcours navigateur (Playwright + Chromium) : `node outils/tests/calculateurs-v2-browser.cjs` et `node outils/tests/calculateurs-browser.cjs`.
- Règle éditoriale : sur le calculateur, pas de jargon (capital, ROI, amortissement, trésorerie, hypothèse). On dit « J’ai déjà », « Je veux avoir », « Je gagne à peu près », « remboursé », « l’argent que je garde de côté ». Les mots techniques sont expliqués dans le lexique en bas de page.
- Lot D : `tuto.html` (généré par `outils/gen-tuto.cjs`), `achats.html` (`outils/gen-achats.cjs`), sections achetables (`outils/gen-acquisitions.cjs` depuis `outils/acquisitions.json`), progression v2 (`progression-core.js`, testé par `outils/tests/lot-d-progression.test.cjs`). Ordre de régénération : final.js, gen.js, gen-armes.cjs, lore-gen.js, gen-acquisitions.cjs, gen-tuto.cjs, gen-achats.cjs, sync-site.cjs, verifier.js. Détail : `outils/LOT-D.md`.
- Aucun build requis pour Vercel : conserver `index.html`, les dossiers et `vercel.json` à la racine du dépôt.

## Lot D : Tuto, sections achetables, progression v2 (v7.27)

- `tuto.html` est généré par `outils/gen-tuto.cjs` depuis `outils/tuto.json` (huit chapitres d’outils) et `outils/tuto-captures.json` (24 captures dans `img/tuto/`, refaites depuis le calculateur réel). Script `tuto.js`, style `tuto.css`.
- Les sections achetables viennent d’une seule source, `outils/acquisitions.json` : `outils/gen-acquisitions.cjs` écrit `acquisitions-data.js`, un hub par catégorie et le bloc Garages de `planques.html` ; `outils/gen-achats.cjs` écrit `achats.html` (Tout ce qui s’achète). Une catégorie `pending` est une section « à confirmer », vide et hors total.
- `progression-core.js` (`LKProgression.create`) : suivi commun, export / import versionné, migration sans réécriture. Tests : `outils/tests/lot-d-progression.test.cjs`.
- Ordre de régénération : `final.js`, `gen.js`, `gen-armes.cjs`, `lore-gen.js`, `gen-acquisitions.cjs`, `gen-tuto.cjs`, `gen-achats.cjs`, `sync-site.cjs`, puis `audit-final.js` et `verifier.js`.
