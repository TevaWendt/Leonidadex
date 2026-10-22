# Données du calculateur

`calculateurs-data.js` expose `window.LKCalcData` :

- `catalogue()` projette à chaque appel les véhicules de `LK_VEHICULES`, les armes de `LK_ARMES` et les lieux, commerces et demeures du catalogue généré. Les identifiants et fiches du site sont conservés. Aucun véhicule ni aucune arme n'est recopié dans le catalogue généré.
- `activities()` lit une éventuelle table `window.LK_ACTIVITIES`. En son absence, il retourne `[]`. Une fiche commerciale, une planque ou une région ne devient pas une activité rémunératrice par déduction.
- `presets` contient trois **hypothèses pédagogiques** A/B/C, toutes `status: "manual"`. Ce ne sont pas des activités officielles de GTA VI.
- `meta` précise les unités : dollars de jeu, minutes et partage en pourcentage.

Charger, dans cet ordre, `vehicules-data.js`, `armes-data.js`, `calculateurs-catalogue.js`, `calculateurs-activites.js`, puis `calculateurs-data.js` avant l'interface. L'adaptateur fonctionne aussi avec des sources absentes, en renvoyant des collections vides.

## Source éditoriale et génération

Modifier les fiches dans `outils/editorial.json`, les références visuelles dans `outils/medias-officiels.json` et le mapping des armes dans `outils/armes-medias.json`, puis lancer :

```sh
node outils/gen-calculateurs-catalogue.cjs
```

Le générateur vérifie que les fiches locales existent et choisit une image locale existante. Il transmet les champs économiques présents dans la source sans inventer de valeur. Les pages `planques` ne sont pas dupliquées : leurs lieux déjà représentés restent accessibles dans leurs sections existantes.

## Inconnu, gratuit et provenance

`null` signifie **inconnu**. `0` est une valeur connue et ne doit pas être remplacé par un prix de démonstration. Les identifications `officiel`, `vu` ou `comm` de la source deviennent `official`, `observed` ou `community`. Ce niveau porte sur l'identification de l'objet, **pas sur son prix**. Les entrées éditoriales sans statut portent `source-listed` : reprise d'une source existante sans nouvelle vérification.

Chaque champ numérique expose `fieldMeta.<champ> = { status, source, verifiedAt, unit }`. Un nombre sans métadonnées reste `unverified`, même si l'objet porte `official`. Aucune date de vérification n'est créée à partir de la date de génération. Les liens de provenance éditoriaux sont conservés comme tels, sans attester que leur contenu a été vérifié pendant cette génération.

Exemple d'ajout futur dans **la source originale** d'un véhicule :

```js
economy: {
  price: {
    value: 35000,
    status: "verified",
    source: "URL précise ou référence de vérification en jeu",
    verifiedAt: "AAAA-MM-JJ",
    unit: "$"
  }
}
```

Cet exemple décrit le schéma, pas un vrai prix. L'adaptateur accepte aussi `price` ou `prix` à la racine, puis `economy.price` ou `economy.prix`, et des métadonnées dans `fieldMeta.price` ou `priceMeta`. Les champs absents restent `null`. Les performances (`speed`, `acceleration`, `seats`) suivent la même règle ; aucune valeur n'est déduite d'un modèle réel, d'une image ou de GTA Online. Les unités de performance doivent être explicitement documentées dans les métadonnées lorsqu'elles seront ajoutées.

## Ajouter des activités vérifiées

Le fichier déjà chargé `calculateurs-activites.js` déclare `window.LK_ACTIVITIES = []`. Compléter cette table, avec :

```js
{
  id: "identifiant-stable",
  name: "Nom exact sourcé",
  reward: null, cost: null, duration: null, prep: null,
  cooldown: null, share: null, investment: null, players: null,
  beginner: null, source: null, status: "unverified", verifiedAt: null,
  fieldMeta: {}
}
```

Durées et attente en **minutes** ; `share` vaut un pourcentage de la récompense brute. `players` est informatif et ne doit pas diviser une seconde fois une récompense dont la part personnelle est déjà appliquée. `cost` est le coût récurrent personnel ; `investment` le coût initial payé une seule fois. Les champs absents ne deviennent pas zéro. L'interface doit demander les hypothèses manquantes avant le calcul.

Les saisies utilisateur doivent rester locales au simulateur et ne jamais réécrire les données source. Tout prix remplacé localement doit porter la mention « hypothèse personnelle ».

Pour les véhicules, modifier `outils/v-corrige.json` puis régénérer avec les commandes habituelles ; ne pas éditer uniquement le dérivé `vehicules-data.js`. Pour les armes, `armes-data.js` est la source existante. Le générateur du catalogue du calculateur est aussi appelé au début de `outils/sync-site.cjs`. Les unités sont affichées telles que documentées : le ratio prix/vitesse est désactivé si la vitesse n’est pas explicitement en km/h.

## v7.59 (check ultime) — un seul schéma, lu partout, et des phrases qui suivent la donnée

- **Trois lecteurs alignés** (test `outils/tests/donnees-publiees.test.cjs`) : `calculateurs-data.js` (`numericField`, exécution), `calculateurs-modele.js` (`V.published`, fiches documentaires et analyse du scénario — `priceV` garde le vrai statut, jamais « officiel » par défaut), `outils/donnees-publiees.cjs` (`prixDe`, générateurs). Un nombre nu reste **non confirmé** ; `status: "unknown"` annule la valeur ; un statut inconnu devient non confirmé ; `official` / `verified` exigent `source` et `verifiedAt`, sinon la régénération s'arrête (`etat().errors`).
- **Phrases d'absence reliées à la donnée** : `outils/donnees-publiees.cjs` → `etat()` (prix connus par type, activités complètes, colonnes GTA VI des listes) et `phrases()` ; `sync-site.cjs` remplit `[data-lk-donnees="clé"]` (calculateurs.html, index.html) et les marqueurs `{donnees:clé}` des textes éditoriaux (`outils/acquisitions.json`, `achats-editorial.json`, `editorial-hubs.json`, `informations-editorial.json`, `catalogues/editorial.json`) avant de reconstruire le JSON-LD FAQ ; `gen-leo.cjs` les remplit dans les textes de Léo ; `calculateurs.js` calcule la phrase du catalogue à l'exécution ; `site-shell.cjs` et `gen-achats.cjs` calculent les encarts et cartes. `node outils/donnees-publiees.cjs --absences` liste ce qui reste figé.
- **Fiches** : `gen.js` / `gen-armes.cjs` posent la puce « Prix publié », la ligne « Prix en jeu » et `data-prix` sur le bouton du carnet ; `lore-gen.js` adapte l'encart calculateur ; `fiche-doc.cjs` affiche source (lien) et date ; les listes dépliables (`catalogues.cjs`, `fiche-doc.cjs`) affichent un `prix_gta6` publié (schéma `{valeur, statut officiel|verified, source, verifiedAt}` validé par `catalogues/schema.json`).
- **Léo** : `gen-leo.cjs` porte `price`, `priceStatus` (libellé français), `priceSource`, `priceVerifiedAt` ; `leo-core.js` répond « combien coûte X ? » avec le prix publié (fiche ou ligne de liste), avant une question rédigée ; les sujets de `leo-knowledge.json` qui affirment une absence portent `absence` + `textKnown`.
- **Procédure et répétition** : `outils/QUAND-ROCKSTAR-PUBLIE.md` ; `node outils/tests/repetition-generale.cjs` (copie temporaire, valeurs fictives, 46 vérifications, preuve d'absence de trace).

## v8.02 (calculateur, lot 1) — les ponts de données transmettent tout ce que le moteur sait utiliser

- **`activities()`** relit aussi : `requiresMissions` (missions à avoir faites, identifiants d’activités), `once` (mission faite une seule fois), `done` (déjà faite), `units` (points gagnés : XP, rang, réputation… ; posé seulement s’il est publié), `order`, `chapter`, `chapterTitle` (place dans l’histoire), `kind` (type de mission), `unlockText` (déblocage en mots), `minCash` (argent à avoir en poche pour la lancer, sans le dépenser ; posé seulement s’il est publié) et `minRank` (rang ou niveau demandé ; idem). Leurs métadonnées sont dans `fieldMeta.units`, `fieldMeta.minCash`, `fieldMeta.minRank`. Absents : `[]`, `false` ou `null` ; aucun 0 inventé.
- **`rules()`** (nouveau) lit `window.LK_CALC_REGLES` (déclaré dans `calculateurs-activites.js`) : `money` (`commun` ou `separe` : argent de Jason et Lucia), `fine` (amende), `death` et `arrest` (argent perdu à la mort, à l’arrestation ; `unit` `$` ou `%`). Tout vaut `null` (inconnu) au 20 octobre 2026.
- **`catalogue()`** : une fiche dont la source publie un revenu passif (`outils/editorial.json` → `revenu`) porte `income` = `{ amount, everyMinutes, cap, conditions, meta }`. La clé n’existe pas sans revenu publié, et ses métadonnées ne vont jamais dans `fieldMeta` : l’empreinte des données (`dataVersion`) ne change pas tant que rien n’est publié, donc aucun calcul enregistré n’affiche « les données du site ont changé ».
- **Ponts** : `outils/gen-missions.cjs` (`activitesDe`) transmet, en plus du gain et de la durée, `cost`, `prep`, `cooldown`, `share`, `investment`, `players`, `requiresMissions`, `requiresPurchaseIds`, `minCash`, `minRank`, `once`, `order`, `chapter`, `chapterTitle`, `kind`, `unlockText` ; `outils/gen-activites.cjs` (`activitesCalculateur` + `pont`) écrit désormais ses activités « activite-<id> » dans `calculateurs-activites.js` (avant, il décrivait sans écrire), sans toucher aux entrées « mission-* ». Chaque pont ne transmet que ce qui est publié.
- **Contrôles** : `outils/donnees-publiees.cjs` vérifie la forme de ces champs, que chaque mission demandée existe parmi les activités et chaque achat demandé parmi les fiches du catalogue, les règles d’argent (`verifierRegles`) et les revenus (`revenuDe`, `phraseRevenu`).
- **Tests** : `outils/tests/calculateurs-v802.test.cjs` ; référence v8.01 : `outils/tests/reference-v801.cjs`.

## v8.03 (calculateur, lot 2) — les réglages du joueur et les données qui les nourrissent

- **`activities()`** relit aussi `characters` (personnage avec qui se fait la mission : `jason`, `lucia` ou les deux), posé seulement s’il est publié (pont `outils/gen-missions.cjs` ← `personnageJoue` de `outils/missions/missions.json`). Il ne sert que lorsque le joueur compte l’argent d’un seul personnage.
- **`rules()`** (lot 1) est affiché dans « Mes hypothèses en plus » quand une règle est publiée (« Déjà connu : … », avec son statut ; une perte en % est chiffrée sur l’argent écrit) ; il ne change jamais le réglage du joueur.
- **`catalogue()` → `income`** (lot 1) : un revenu d’entreprise publié se reprend d’un clic (« Utiliser ce revenu ») dans le revenu passif simulé.
- **État sauvegardé** (aucune migration de format : `validate()` remplit les nouvelles cases avec leur valeur par défaut, une sauvegarde v8.01 se relit telle quelle et garde les mêmes résultats) : `analysis.simulations` gagne `amendes`, `mort`, `arrestation` ; `analysis.sim.soin` gagne `vieParPartie` et `prixUnitaire`, `analysis.sim` gagne `amendes` (`parPartie`, `prix`), `mort` et `arrestation` (`parPartie`, `perte`) ; `analysis.money` (`split` : `commun` ou `separe`, `perso` : `jason` ou `lucia`) ; `analysis.shareAuto` ; `goal.resaleOwned` ; `plan.useHypotheses`, `plan.offline` (`on`, `cap`), `plan.includeFailure`, `plan.resaleAfterGoal` ; chaque mission du plan `who` (`''`, `jason`, `lucia`, `deux`), chaque achat d’avant `resale`. Une valeur inattendue revient à sa valeur par défaut.
- **`outils/modele-donnees.json`** : mécaniques `amendes`, `mort`, `arrestation` (statut `unconfirmed`, rien de publié pour GTA VI) et champs `vieParPartie`, `prixUnitaire` de `soin` ; elles apparaissent dans « Les coûts d’usage, poste par poste » de verification.html.

## v8.04 (jour J, prompt 2) — les formats qui manquaient pour remplir le calculateur sans toucher au code

- **Deux statuts de plus pour une valeur chiffrée**, lus de la même façon par les trois lecteurs (`numericField`, `V.published`, `prixDe`) : `media` (alias `presse` : chiffre donné par des médias reconnus ; **deux sources concordantes au moins**, `source` + `sources`, sinon le chiffre est `estimated`) et `community` (alias `comm` : chiffre d’un wiki ou d’un site de la communauté). Tous deux exigent `source` et `verifiedAt`, comme `official` et `verified` ; dans le calcul, ils comptent comme une estimation (statuts `media` et `community` de `outils/modele-donnees.json`, `calcul: true`), jamais comme un chiffre officiel ; une mission prend le statut le plus faible de son gain et de sa durée (`unknown` < `unverified` < `community` < `estimated` < `media` < `verified` < `official`). Les anciens `vu` / `observed` (repéré dans une vidéo officielle) ne changent pas.
- **Fourchette, note, plusieurs sources** : `min`, `max` (même unité, `min` < `max`, `min` ≤ `value` ≤ `max`), `note` (300 signes au plus), `sources` (1 à 10 références) se posent dans `fieldMeta.<champ>` (catalogue, activités, règles), dans la valeur du modèle et dans `prixDe`, **seulement quand ils sont écrits et bien formés** ; le calcul garde `value`. Sans eux, la lecture est exactement celle de la v8.03 : l’empreinte des données (`dataVersion`) et les calculs enregistrés ne bougent pas.
- **Contrôles** (`outils/donnees-publiees.cjs` → `verifierExtras`, appelé par `verifierPrix`, `verifierActivite`, `verifierRegles`, `outils/gen-missions.cjs` et `outils/gen-activites.cjs` → `checkValue`, `outils/catalogues.cjs` pour `prix_gta6`, `outils/catalogues/schema.json`) : une fourchette mal formée, une note trop longue, une liste vide ou un « media » à une seule source arrêtent la génération avec un message en clair.
- **Affichage** : fiches des missions et des activités (« 400 000 $ (de 350 000 à 450 000 $), Vu dans un média (selon les objectifs réussis) », sources de chaque chiffre, ligne « Sources des chiffres » d’une activité), fiche documentaire (`fiche-doc.cjs` : « Sources : A ; B, vérifié le … » et la note), listes dépliables (prix avec fourchette, pastille selon le statut : Officiel, Vu dans un média, Identification communautaire, À confirmer), calculateur (libellés « Vu dans un média » et « Communautaire » dans Mes achats et les règles d’argent), Léo (`gen-leo.cjs` met la fourchette et la note dans `priceStatus`, plusieurs sources dans `priceSource` avec `priceSources` = leur nombre ; `leo-core.js` dit alors « sources : … » avec le gabarit `priceSourcesLine` ; `outils/leo-langues.cjs` traduit `priceStatus`).
- **Munitions** : le prix d’une munition s’écrit dans `outils/acquisitions.json`, catégorie `munitions` (type `ammo`), avec l’identifiant de la munition (`outils/hubs-editoriaux.json`, `armes.munitions.items`) ; `gen-acquisitions.cjs` refuse un identifiant inconnu, reprend le nom de la munition s’il manque et fait mener la ligne à `munitions/<id>.html` ; la fiche de la munition (`gen-pages-elements-b.cjs`) affiche le prix publié (ligne « Prix dans GTA VI » et phrase du prix) ; le calculateur le lit comme un achat de type « munition ».
- **Phrases comptées** (`outils/donnees-publiees.cjs` → `phrases()`, `gen-achats.cjs`, `site-shell.cjs`) : accord au singulier quand un seul prix ou une seule activité est publié, jamais « 0 prix publié », plus de mention des lignes « à confirmer » quand il n’en reste aucune ; traduites dans les cinq langues (`outils/langues/<code>/v804-jour-j.json`).
- **Contrôle du jour J** : `node outils/jour-j-controle.cjs --depart 0 --but 1000000 --rang <rang> [--partie 120]` (Node pur, n’écrit rien) dit ce que le site lit des données publiées et calcule le business plan d’un début de partie avec les missions du site (copiées comme le fait le business plan (« Ou reprendre une mission déjà écrite », puis « Ajouter cette mission » ; douze au plus, comme dans la page)), revenu passif compris, vérifié par `missionVerify`.
- **Tests** : `outils/tests/jour-j-v804.test.cjs` (statuts, fourchettes, sources, munitions, Léo, traductions des textes des scripts et des phrases comptées ; sans données, aucune clé nouvelle et résultats v8.01 identiques). Les tests écrits avant la sortie qui vérifiaient « aucun chiffre » vérifient « aucun chiffre inventé » (`outils/tests/jour-j-helper.cjs` : un chiffre n’y passe que publié au format) ; `outils/tests/reference-v801.cjs` compare le code à la v8.01 sur le site lu « sans publication » (`check-ultime-helper.cjs` → `siteData({ sansPublication: true })`), donc aussi le jour J.
