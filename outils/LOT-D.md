# Lot D — accompagnement et acquisitions

Le site livré est statique : aucun build npm, compte ou service supplémentaire. Les pages générées et les images du Tuto sont déjà présentes. GitHub/Vercel doivent recevoir le contenu du ZIP à la racine, avec `vercel.json`. Les scripts `outils/` servent uniquement à la maintenance locale.

## Sources et données communes

- `acquisitions.json` conserve catégories, identifiants, conditions d’obtention, sources, dates de consultation, niveaux de preuve et médias existants.
- `gen-acquisitions.cjs` résout les références de `vehicules-data.js`, `armes-data.js`, `editorial.json` et `medias-officiels.json`, puis génère `acquisitions-data.js`, les trois hubs et le bloc Garages dans Planques.
- `calculateurs-data.js` et `progression-core.js` utilisent cette même projection. Aucun tarif n’est renseigné pour les nouveaux contenus. Une simulation requiert une hypothèse personnelle explicite.
- Niveau 1 : obtention ou personnalisation décrite officiellement. Un bonus d’édition ne prouve pas un achat séparé dans le jeu. Niveau 2 : apparition seulement. Niveau 3 : preuve insuffisante. Seul le niveau 1 peut devenir suivable.

## Ajouter un élément officiel

1. Vérifier une source officielle et enregistrer URL, titre, date de publication si connue, consultation et affirmation précise dans `sources`.
2. Ajouter l’élément dans `items` avec un identifiant stable, `category`, `sourceId`, `evidenceLevel`, `condition`, `description`, `verifiedAt` et `price: null` si inconnu. Référencer un objet existant avec `ref` au lieu de le recopier. Pour un libellé descriptif, conserver `nameKind: "official-description"`.
3. Activer `trackable` uniquement pour un contenu individuel dont l’obtention est documentée. `calculatorCompatible` permet sa simulation, toujours assortie de sa condition d’accès ; une collection sans pièces identifiables reste éditoriale. Un service n’est pas un commerce possédé.
4. Réutiliser les identifiants de médias dans `media`. Leur provenance et leurs formats restent dans `medias-officiels.json`. Ne jamais remplacer un inconnu par zéro.
5. Exécuter les générateurs ci-dessous, contrôler les routes et vérifier les pourcentages. Le compteur, le hub et le calculateur reprennent automatiquement la donnée commune.

Renommer un libellé ou déplacer un élément ne doit jamais changer son identifiant. Les références supprimées restent récupérables dans les sauvegardes mais sortent du calcul des pourcentages.

## Ajouter une catégorie

Ajouter dans `categories` un identifiant, un libellé, une route, un type compatible, une introduction, les limites et un texte d’état vide. Ajouter les éléments vérifiés dans `items`. La progression lit automatiquement la nouvelle catégorie ; sans élément suivable, elle affiche une attente, sans case ni pourcentage, et ne contribue pas au dénominateur global. Pour un nouveau type de calcul, compléter les libellés et la validation du filtre dans les modules existants, sans créer un second moteur.

Les catégories approuvées pour ce lot sont Bateaux, Vêtements et style, Personnalisations, avec les Garages dans Planques. Une autre catégorie doit faire l’objet d’une décision éditoriale préalable. Le générateur produit les hubs depuis les catégories ; Garages reste un bloc dans Planques. Contrôler le rendu et les liens contextuels de toute future catégorie approuvée.

## Régénérer

Depuis la racine, après les éventuels générateurs historiques :

```sh
node outils/gen-acquisitions.cjs   # hubs Bateaux, Style, Personnalisations, sections à confirmer, bloc Garages, acquisitions-data.js
node outils/gen-tuto.cjs           # tuto.html depuis outils/tuto.json et outils/tuto-captures.json
node outils/gen-achats.cjs         # achats.html (Tout ce qui s'achète)
node outils/sync-site.cjs          # menu (Tuto en 2e position), pieds de page, index de recherche, sitemap, empreintes
node outils/verifier.js
```

`sync-site.cjs` doit passer en dernier : il rétablit le Tuto et les liens de pied de page, complète la recherche et le sitemap, actualise le manifeste des médias et les versions des CSS/JS. Aucun générateur n’est requis sur Vercel.

Les textes des cinq hubs sont aussi présents dans `lore-gen.js`. Si celui-ci est relancé, relancer ensuite les trois commandes Lot D ci-dessus pour rétablir le bloc Garages et la navigation.

## Tuto et captures

`tuto.json` décrit les huit parcours réels, Mon plan compris. `gen-tuto.cjs` génère les chapitres, ancres, exemples pédagogiques et liens profonds. Les captures optimisées vivent dans `img/tuto/`, avec leurs dimensions et repères dans `tuto-captures.json`.

Après une modification visible du calculateur, refaire des captures de son interface dans un navigateur, avec des données pédagogiques et un stockage de test. Recadrer la vraie zone, dégager l’en-tête fixe, exporter en WebP et actualiser les dimensions et repères du manifeste. Ne pas simuler une interface en dessin. Les captures de vérification sans usage dans la page ne font pas partie du déploiement.

Les liens acceptent `tool`, `mode=simple|expert`, `from=tuto`, un `chapter` autorisé et `focus=carnets`. L’ancre `#atelier` reste l’entrée du calculateur ; le retour au Tuto conserve le chapitre. Les valeurs pédagogiques ne sont pas des prix GTA VI.

## Progression et sauvegardes

`progression-core.js` ajoute `lk_progression_v2` pour les nouveaux identifiants. Les clés historiques des véhicules, armes et lieux restent la source des cases existantes. Les deux bateaux documentés sont retirés du groupe général pour n’être comptés qu’une fois, sans déplacer leurs cases stockées.

L’export version 2 contient date, catégories, identifiants cochés et rubriques locales reconnues, dont les carnets/Mon plan. L’import valide d’abord le fichier, puis demande **Fusionner**, **Remplacer les rubriques présentes** ou **Annuler**. L’ancien format version 1 reste accepté et n’efface pas les catégories absentes de son contenu. Une rubrique corrompue conserve une copie de récupération avant écriture. Les écritures échouées sont annulées autant que le stockage le permet. Les références inconnues sont signalées, conservées et exclues des pourcentages.

## Tests

Tests du nouveau suivi sans dépendance :

```sh
node outils/gen-acquisitions.cjs   # hubs Bateaux, Style, Personnalisations, sections à confirmer, bloc Garages, acquisitions-data.js
node outils/gen-tuto.cjs           # tuto.html depuis outils/tuto.json et outils/tuto-captures.json
node outils/gen-achats.cjs         # achats.html (Tout ce qui s'achète)
node outils/sync-site.cjs          # menu (Tuto en 2e position), pieds de page, index de recherche, sitemap, empreintes
node outils/verifier.js
```

Suite de régression complète, avec `jsdom` et `postcss` installés dans un dossier de travail séparé :

```sh
node outils/gen-acquisitions.cjs   # hubs Bateaux, Style, Personnalisations, sections à confirmer, bloc Garages, acquisitions-data.js
node outils/gen-tuto.cjs           # tuto.html depuis outils/tuto.json et outils/tuto-captures.json
node outils/gen-achats.cjs         # achats.html (Tout ce qui s'achète)
node outils/sync-site.cjs          # menu (Tuto en 2e position), pieds de page, index de recherche, sitemap, empreintes
node outils/verifier.js
```

Vérifier également au navigateur les liens profonds après actualisation, le mode réduit, les sauvegardes existantes, l’import/export et les largeurs mobiles/desktop. L’en-tête dispose de douze liens complets, Tuto après Calculateur ; ne pas réduire les libellés ou comprimer la typographie pour une nouvelle entrée.


## Reprise Leonidakit (v7.27, 24 septembre 2026)

- Livraison ChatGPT arrivée tronquée (plafond de téléversement) : `progression-core.js`, `progression.js`, `progression.html`, `tuto.js`, `tuto.css`, `style.html` et `sitemap`/`search-index` ont été réécrits ici. `progression-core.js` suit l'API fixée par `outils/tests/lot-d-progression.test.cjs` (14 tests).
- Les 24 captures du Tuto (`img/tuto/*.webp`) sont prises sur le calculateur réel du site par `outils/tuto-shots.py` (Playwright), sans en-tête ni rails ; les zones « champs » et « réponse » du manifeste sont mesurées, pas dessinées à la main. Les textes de `outils/tuto.json` et des chapitres fixes de `gen-tuto.cjs` reprennent les libellés exacts du calculateur (« J'ai déjà », « Je veux avoir », « Je gagne à peu près »).
- Liste complète de ce qui s'achète : six catégories « à confirmer » ajoutées dans `outils/acquisitions.json` (`pending: true`, aucun item, aucun prix) : vêtements à l'unité, accessoires, tatouages, nourriture et consommables, munitions et équipement d'arme, logements et appartements. Le hub `achats.html` (généré par `gen-achats.cjs`) récapitule les 15 catégories avec trois statuts : recensé sur le site, montré par Rockstar, à confirmer. Dans Progression, une catégorie vide affiche « En attente du jeu » et ne compte pas dans le total.
- Menu : 12 entrées, mesurées avec la police Archivo chargée à 1 280, 1 320 et 1 440 px : 900 px, une ligne. Les sections achetables ne sont pas dans le menu (règle de l'en-tête) mais dans les pieds de page, le hub `achats.html`, Progression et l'index de recherche.
