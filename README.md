# Leonidakit

Site compagnon GTA VI en français, en HTML/CSS/JavaScript natifs. Cette copie corrigée conserve les URL, les illustrations et la carte existantes.

Commencer par **audit/rapport-final.md**. Le diagnostic antérieur aux corrections figure dans **audit/diagnostic-initial.md**. Les listes détaillées des routes et changements sont fournies dans le même dossier.

## Installer et vérifier

Node.js **24.15 ou plus récent dans la branche 24**, ou **22.22.2 ou plus récent dans la branche 22**. Audit exécuté sous Node 24.19.0. Aucun paquet tiers n'est chargé dans le navigateur ; jsdom et PostCSS servent aux tests et au contrôle de syntaxe.

```sh
npm ci --ignore-scripts
npm run lint
npm test
npm run build
npm run serve
```

L'aperçu est servi sur `http://localhost:8766`. Le build utilise uniquement les modules intégrés à Node ; il peut aussi être lancé avec `node build.js` sans installer les outils de test. `npm run lint` contrôle la syntaxe JS/CSS, ce n'est pas un type-check TypeScript. Les tests de comportement utilisent un DOM simulé : ils ne remplacent pas un contrôle visuel sur de vrais navigateurs et téléphones.

## Modifier les données

- `v-corrige.json` : source éditoriale des 301 véhicules. Ne pas modifier les sorties pour corriger un véhicule.
- `armes-data.js` : base des 23 armes. Les fiches armes existantes sont des sources HTML maintenues ; le build synchronise leurs métadonnées et les options du hub, sans générateur éditorial complet d'armes.
- `carte.js` : moteur et 37 lieux locaux ; `data/carte-gtadb-source.json` : 36 groupes et 2 474 bâtiments, enrichissements et références photo d'origine.
- `landmarks-leonidakit.json` : export de référence, conservé pour la provenance ; il n'alimente pas directement le moteur actuel.
- `redirections.json`, `retraits.json`, `legacy-pages.json` : décisions explicites concernant les anciennes URL.
- `templates/` : gabarits d'extraction de la génération, **pas des pages à publier ni des aperçus autonomes**.

Après une modification : `npm run build`, puis `npm test`. `final.js` produit la base navigateur ; `gen.js` régénère les véhicules ; `scripts/sync-site.cjs` synchronise liens, index, compteurs, assets et sitemaps. `scripts/inventory.cjs` produit un inventaire traçable ; ses alertes sur gabarits et archives doivent être interprétées comme telles.

Les champs `vues` du JSON source restent les déclarations éditoriales. Les sorties n'activent que les images réellement présentes. Déposer les visuels dans `img/vehicules/` selon `images.js`, compléter les crédits, lancer `node images.js`, puis `node images.js --ecrire` et reconstruire. Ne pas inventer de photographie, de statistique ou de provenance. Voir `PHOTOS.md` pour les photos de modèles réels ; contrôler manuellement la correspondance et les crédits des résultats Wikimedia avant publication.

## Déployer

Le dossier **dist/** est produit par `npm run build`. Il contient uniquement les fichiers publics. Pour Vercel : utiliser `vercel.json`, la commande `node build.js` et le répertoire de sortie `dist`. Sur un autre hébergeur, publier seulement le contenu de `dist` et transposer les six redirections HTTP, la page 404 et les en-têtes de `vercel.json`.

Aucun déploiement n'a été effectué pendant cet audit. Les réglages du compte Vercel et l'envoi réel de la newsletter restent à vérifier dans l'environnement de déploiement. L'adresse de contact et les informations de l'éditeur restent à compléter par le propriétaire.

## Historique et données personnelles

`archive/legacy/` conserve les anciens scripts et notes pour comprendre les décisions passées. Ils ne font pas partie de la chaîne courante et ne sont pas publiés. Les points d'entrée historiques à la racine renvoient vers la chaîne actuelle.

Les possessions, le classement, la carte et les dessins restent dans le stockage du navigateur. Exporter la carte avant d'effacer ce stockage ou de changer d'appareil. La newsletter soumet le formulaire existant au prestataire Brevo et présente sa réponse réelle.

Les crédits gtadb et la mention CC BY 4.0 sont conservés. Les photographies fournies ne sont pas de nouvelles illustrations originales de Leonidakit.
