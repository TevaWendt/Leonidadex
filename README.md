# Leonidakit

Site compagnon GTA VI (carte, véhicules, armes, outils). HTML, CSS et JavaScript, sans framework.
Hébergé sur Vercel, qui publie tel quel le contenu de ce dépôt : **aucune commande de build**.

## Ce qu'il y a à la racine

| Élément | Rôle |
|---|---|
| `index.html`, `carte.html`, `vehicules.html`, `armes.html`, etc. | les pages du site (15 fichiers `.html`) |
| `style.css`, `fiches.css` | les styles |
| `app.js`, `common.js`, `fiches.js`, `carte.js`, `comparateur.js`, `classement.js`, `progression.js` | le code qui fait fonctionner les pages |
| `armes-data.js`, `vehicules-data.js`, `carte-gtadb.js`, `search-index.js`, `assets-manifest.js`, `progression-data.js` | les données lues par le site |
| `robots.txt`, `sitemap.xml`, `sitemap-fiches.xml`, `googleea0091a4822a39f7.html` | référencement Google |
| `vercel.json` | six redirections d'anciennes adresses et deux en-têtes. Pas de build. |
| `armes/` | 27 fiches armes |
| `vehicules/` | 313 fiches véhicules (301 actives, plus les redirections et retraits) |
| `lieux/`, `personnages/`, `entreprises/` | 22 fiches générées depuis `outils/editorial.json` (régions, personnages, entreprises), avec hubs `lieux.html`, `personnages.html`, `entreprises.html` |
| `photos/` | 674 photos de la carte en WebP, 960 px max (gtadb.org, CC BY 4.0) |
| `img/` | carte sociale et `img/officiel/` : 49 visuels officiels Rockstar en deux tailles (crédits dans `outils/medias-officiels.json`) |
| `outils/` | scripts de génération des fiches véhicules et leurs données sources. Ne pas y toucher, ne sert pas au site en ligne. |

## Règles

- Ne jamais ajouter de `package.json` ni de commande de build sur Vercel : le site est servi tel quel.
- Pour corriger un véhicule, modifier `outils/v-corrige.json` puis régénérer (voir `outils/LISEZ-MOI.md`). Ne pas éditer les fiches à la main.
- Ordre de régénération : `node outils/final.js`, `node outils/gen.js`, `node outils/lore-gen.js`.
- Les visuels officiels Rockstar (`img/officiel/`) sont des médias promotionnels © Rockstar Games / Take-Two, tolérés pour un site de fans ; ils ne sont pas libres de droits.
- Les fiches armes sont des fichiers HTML maintenus à la main dans `armes/`, avec `armes-data.js` comme base.
- Aucune donnée issue de fuites. Crédit gtadb.org conservé sur la carte et dans les mentions légales.
