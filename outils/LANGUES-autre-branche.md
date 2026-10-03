# Langues du site (v7.60 ; anglais complet en v7.61 ; allemand complet en v7.62)

Le français reste la seule langue que l’on écrit. Chaque langue publiée est **générée** à partir des pages françaises finales,
dans son dossier (`/en/…`), par `outils/langues.cjs`, avec une mémoire de traduction (`outils/langues/<code>/*.json`).
Rien n’est traduit à la main dans une page générée : on corrige la mémoire (ou la source française), puis on régénère.

## Ce que voit le visiteur

- **Tout en haut de chaque page**, une barre sombre « Changer la langue » (globe + code de la langue). Un clic ouvre la liste
  des langues publiées ; la langue affichée est cochée. Fonctionne sans JavaScript (`<details>`), au clavier (Tab, Entrée,
  Échap) et sur mobile.
- v7.61 : **toutes les pages** existent en anglais (`langues[en].pages = "*"` : chaque page française, sauf `exclure`) ;
  v7.62 : **et en allemand** (`/de/…`, même règle, Léo compris). Une page qui
  n’existerait pas dans une langue mènerait à l’accueil de cette langue (« home page » sous le nom de la langue).
- Page introuvable : le serveur renvoie `404.html` (français) pour toute adresse inconnue ; sous `/en/…`, `common.js` affiche la page
  introuvable anglaise (`/en/404.html`). Les liens de langue des deux pages 404 sont absolus.
- **Bandeau de suggestion** (jamais de redirection) : si la langue du navigateur, ou la langue choisie avant, a une version
  de la page, un bandeau propose « Read in English » / « No thanks » (dans la langue proposée). Rien n’est enregistré tant
  qu’on ne clique pas ; un clic écrit une seule clé, `lk_lang_v1` (la langue choisie). Mentions : section stockage.
- Dans une page traduite, un lien vers une page encore en français porte un petit badge **FR** (liens de texte) et, pour les
  lecteurs d’écran, « (in French) » (tous ces liens, cartes comprises), plus `hreflang="fr"`.
- **Léo** parle français, anglais et allemand (`outils/langues.json` → `leo: ["fr", "en", "de"]`) : sur une page traduite, il
  charge ses fichiers du dossier de la langue (voir « Léo dans une autre langue » plus bas).
- Moteur de recherche : `canonical` et `og:url` en `/en/`, `hreflang` fr / en / x-default sur chaque paire de pages,
  `og:locale` en_US, `inLanguage` dans les données structurées. Plan du site : chaque adresse française indexable de `sitemap.xml`
  et `sitemap-fiches.xml` a son adresse anglaise juste après (ni redirection, ni noindex, ni 404).

## Les fichiers

| Fichier | Rôle |
|---|---|
| `outils/langues.json` | Langues (`publiee` ou `prevue`), dossier, locale, libellés du sélecteur et du bandeau, **pages traduites** de chaque langue, attributs, métas et champs JSON-LD à traduire, scripts partagés (jamais copiés) et scripts de données, clés JSON qui portent des identifiants (`jsonCode`). |
| `outils/langues.cjs` | Le générateur (appelé à la fin de `outils/sync-site.cjs`, donc par `node outils/regenerer.cjs`). |
| `outils/langues/<code>/_glossaire.md` | Règles et vocabulaire imposés à la traduction (mots que le code cherche, formats d’argent, statuts…). |
| `outils/langues/<code>/lot-*.json`, `site-*.json`, `recherche-*.json`, `leo-*.json` | La mémoire : `"texte français": "traduction"` (v7.60 : lots 1–16 ; v7.61 : pages du site, chaînes de recherche, Léo). |
| `outils/langues/<code>/noms.json` | Noms propres, adresses et intitulés déjà anglais gardés tels quels (`"="`), relus en v7.61. |
| `outils/langues/<code>/motifs.json` | `_motifs` : phrases fabriquées par les générateurs, avec des trous `{1}` (fiches véhicules et armes, lieux de la carte, fils d’Ariane…). |
| `outils/langues/<code>/leo-pivot.json` | Léo : réécriture d’une question de la langue en français (`[expression, forme française]`). |
| `outils/langues/<code>/code.json` | Valeurs de code (`"fr-FR": "en-US"`) et `_ignorer` (chaînes qui ressemblent à du français mais sont des identifiants). |
| `outils/langues/<code>/_a-traduire.json` | Écrit par `--extraire` : ce qui manque, avec l’endroit. |
| `img/tuto/<code>/`, `outils/tuto-captures-<code>.json` | Captures du Tuto prises dans le calculateur traduit. |

## Comment une page est traduite

1. Le générateur lit la page française **finie** (après `sync-site.cjs`), la découpe en **segments** : une phrase avec ses
   balises en ligne (`a`, `strong`, `em`, `span`, `code`, `br`…) devient une seule clé où les balises sont des repères
   numérotés : `"Écris le prix dans <1>Mes achats</1>."` → `"Enter the price in <1>My purchases</1>."` (on peut déplacer les
   repères, jamais en ajouter ni en retirer : sinon la page n’est pas écrite et le test échoue).
2. Attributs lus (`title`, `alt`, `aria-label`, `placeholder`, `data-ask`, `data-desc`…), `<title>`, métas, JSON-LD.
3. Liens : une page traduite reste dans `/en/`, une autre pointe vers la page française (`../x.html`, `hreflang="fr"`, badge FR).
4. Barre de langue, `hreflang`, et les nombres français des champs (`value="200 000"` → `200,000`).
5. Scripts : chaque script local de la page est lu jeton par jeton (acorn) ; seules les **chaînes** connues de la mémoire
   changent (le reste du code est identique, vérifié par le test). Les chaînes qui portent du HTML sont traduites zone par
   zone. Le script traduit est copié dans `/en/` avec sa propre empreinte `?v=`. Les scripts de données
   (`vehicules-data.js`…) ne changent que pour les libellés nommés dans la mémoire.

### Clés de la mémoire

- `"texte": "traduction"` — clé normalisée (espaces insécables → espace, `'` → `’`).
- `"texte": "="` — identique (nom propre, marque).
- `"fichier.js::texte": "…"` — traduction propre à un fichier (un mot qui veut dire autre chose ailleurs).
- `"fichier.js::texte": [{ "si": "expression", "texte": "…" }, { "texte": "…" }]` — **règle selon le code qui précède** la
  chaîne (80 caractères ; pour une valeur JSON, le nom de sa clé). Sert quand le même mot est un texte lu et un identifiant
  dans le même fichier (`joueurs` : unité affichée et nom d’un critère). Aucune règle vérifiée : la chaîne ne change pas.
- **Nombres qui bougent** : une entrée dont la traduction reprend ses nombres dans le même ordre sert aussi pour d’autres
  nombres (`<1>617</1><2>tests automatisés écrits</2>` traduit aussi `<1>640</1>…`). Une date écrite en lettres
  (« 1er octobre ») doit être retraduite quand elle change.
- Une phrase assemblée par le code (`n + ' mission' + (pluriel ? 's' : '')`) se traduit morceau par morceau : le glossaire
  explique comment. Les pluriels passent par `LKCalcEngine.plural(n)` (français : n > 1 ; anglais : n ≠ 1) ; un adjectif
  accordé s’écrit en entier dans la source (`(n>1?' finies':' finie')`), jamais avec un `'s'` ajouté.
- Argent : `LKCalcEngine.dollars(texte)` (« 1 250 $ » / « $1,250 ») ; dates : `LKCalcEngine.dateText(date, options)` ;
  nombres saisis : `LKCalcEngine.parseLocalizedNumber` lit « 1,500 » en anglais. Les textes ajoutés par une feuille de style
  (`content:`) viennent d’un attribut de la page (`attr(data-desc)`), traduit avec elle.

### v7.61 : tout le site

- **Attributs lus** : en plus de `title`, `alt`, `aria-label`… les attributs de données affichés ou cherchés sont traduits
  (`data-l`, `data-loc-*`, `data-one`/`data-many`, `data-tip`, `data-mot`, `data-search`, `data-q`, `data-n`…) ; les chaînes de
  recherche sont écrites en anglais, en minuscules sans accents, comme le code les compare. `attributsJson` (`data-medias`,
  `data-cat-tags`) : JSON traduit valeur par valeur.
- **Données JSON posées dans une page** (`<script type="application/json">`, carnets) : chaque texte est traduit, sauf les clés
  d’identifiants (`jsonCode`, `jsonCodePages`), les adresses et le SVG.
- **Données structurées** (JSON-LD, `jsonld` dans `langues.json`) : `name`, `description`, `text`… et aussi `value`
  (inspiration réelle, catégorie), `featureList`, `browserRequirements`, `contactType`.
- **Adresses qui portent un texte** : titre d’une liste de repères (`carte.html#pins=…&t=Armureries`), recherche d’images ou
  Wikipédia (Wikipédia anglaise pour une page anglaise).
- **Identifiants protégés** : dans un script, une chaîne en minuscules sans espace (`divers`, `capot`, `calcul`) n’est jamais
  traduite, sauf par une entrée propre au fichier (`"carnets.js::calcul"`) ou une règle `si` : c’est presque toujours une clé de
  code (catégorie, famille, adresse).
- **Repérage des manques** : un petit texte sans accent (« Villes ») est signalé s’il contient un mot du lexique français de la
  mémoire (mots des textes français absents de toutes les traductions). Les adresses et chemins ne sont jamais signalés.
- **Trous de motif** faits de morceaux (« Concessions · Southside », « Fusil semi-automatique, Grassrivers 01 ») : morceau par
  morceau ; une phrase d’un paragraphe que la mémoire ne connaît pas mais qui est neutre (nom propre) est gardée telle quelle.
- **Pluriels et argent dans les scripts des pages** : `lkPl(n)` (français n > 1, anglais n ≠ 1), `lkDollars("1 250")`, adjectifs
  accordés écrits en entier (`' sélectionnés'` / `' sélectionné'`), phrases complètes plutôt que des morceaux collés (« Où la
  trouver : » / « Où le trouver : »).

### Léo dans une autre langue (v7.61)

- **Fichiers** : `en/leo-index.json` et `en/leo/*.json` sont générés depuis les fichiers français (`leoDonnees` dans
  `langues.json`) : les textes affichés (`cles`, arbres `texts`, `templates`, `suggestions`) sont traduits ; tout ce qui sert à
  reconnaître une question reste français (jetons `d`, `dq`, `dk`, `terms`, expressions `re`, vocabulaire des morceaux). Un nom
  de fiche traduit devient le nom affiché ; le nom français (`nameFr`) reste celui que Léo reconnaît, le nom traduit est aussi
  reconnu en entier (alias). Les passages des pages (`leo/passages.json`) sont lus à plat dans la mémoire (sans les balises).
  Les adresses restent celles du français ; `leo-ui.js` ajoute `/en` à l’affichage et charge le noyau et les morceaux de `/en/`.
- **Compréhension** : la question anglaise est d’abord réécrite en français (`leo-nlp.js` → `pivot`, table
  `outils/langues/en/leo-pivot.json`, ≈ 1 550 expressions écrites à la main + les libellés des catégories et des outils + une
  entrée identité pour chaque nom de fiche qui contient un mot de la table) : montants à l’américaine (« $200,000 » → « 200000 $ »),
  mots et expressions (« how much » → « combien », « where can i buy » → « ou acheter »). Puis tout le moteur français s’applique.
- **Scripts** : `leoScripts` (loader, UI, noyau, NLP, liens, moteur) sont copiés et traduits dans `/en/` comme les autres ; leurs
  adresses ne sont pas réécrites (Léo garde celles du français).
- **Mesure** : `node outils/tests/leo-eval.cjs --lang en` rejoue `outils/tests/leo-questions-en.json` (les 512 questions du jeu
  français, traduites et réécrites comme un joueur anglophone les tape : fautes, style SMS, abréviations) ; seuils : 95 % de
  bonnes réponses, 100 % des hors sujet refusés. `--questions=<fichier>` rejoue un autre jeu (par exemple des questions
  inédites, `outils/tests/leo-questions-en-inedites.json`).
- **Ajouter un mot** : une question anglaise mal comprise → ajouter l’expression et sa forme française dans `leo-pivot.json`
  (la forme française est celle que Léo comprend : relancer la même question en français pour vérifier), régénérer, relancer
  l’évaluation dans les deux langues.

### v7.62 : l’allemand

- **Mémoire** `outils/langues/de/` (≈ 21 000 entrées, même découpage que l’anglais, plus `site-43.json` pour les chaînes du code
  ajoutées en v7.62) ; glossaire `outils/langues/de/_glossaire.md` : tutoiement (« du »), « 1.250 $ » (point des milliers,
  dollar après), « 2,5 », « 19. November 2026 », guillemets „…“, durées « 1 h 30 min », mots que le code cherche.
- **Générateur** : guillemets de chaque langue (`QUOTES` : “ ” en anglais, „ “ en allemand, y compris une fin de valeur
  d’attribut faite seulement de ponctuation) ; pas de minuscule imposée à la traduction d’un trou en allemand (les noms gardent
  leur majuscule) ; découpage des phrases allemandes qui ne coupe pas « am 1. Oktober », « z. B. », « 2 Std. » ; chemins avec
  virgule (`photos/L832,ig.webp`) jamais signalés ; espaces de début et de fin gardés dans les données de Léo.
- **Code** (le français ne change pas) : montants « 1.250 $ » et saisie « 1.250,50 » (`calculateurs-engine.js` : `dollars`,
  `parseLocalizedNumber`), hub du calculateur en allemand (« Ich habe 200.000 $ und will 1 Million », « 2 Stunden am Tag »),
  mots allemands dans les expressions qui reconnaissent les libellés traduits (`calculateurs-workspace.js`,
  `calculateurs-scenario.js`, `calculateurs-motion.js`) ; **pluriels écrits en entier** (le code n’ajoute plus « s » :
  `(n > 1 ? ' jours' : ' jour')`, `plural(n, ' jour', ' jours')`, `data-mots`) ; **phrases à trous** au lieu de morceaux collés
  quand l’ordre des mots change (« Supprimer tes {n} marqueurs ? », « {n} sur {t} {mots} affichés », « Vider « {nom} » sur cet
  appareil ? », phrases « mon garage » / « mon arsenal » écrites en entier) ; « ß » lu « ss » dans les recherches.
- **Léo allemand** : table `outils/langues/de/leo-pivot.json` (≈ 5 600 expressions) ; `leo-nlp.js` → `pivotTable(liste, langue)` :
  en allemand, point des milliers retiré, virgule décimale gardée, « Std. »/« Stunden » → heures, « 12 mal 12 » → calcul hors
  sujet. Jeux : `outils/tests/leo-questions-de.json` (512) et `leo-questions-de-inedites.json` (140, jamais vus pendant le réglage).
- **Captures du Tuto** : `python3 outils/tuto-shots.py . de` → `img/tuto/de/`, `outils/tuto-captures-de.json`.
- **Tests** : `langues.test.cjs` et `langues-browser.cjs` couvrent chaque langue publiée (attentes par langue) ; sur une page
  allemande, ni français ni anglais restés (`langues-helper.cjs` → `englishHits`, exceptions relevées dans `EN_KEEP`).

## Commandes

```
node outils/regenerer.cjs                  # tout, langues comprises (« Langue en : 414 pages, 54 scripts traduits, 0 texte(s) sans traduction »)
node outils/langues.cjs                    # seulement les langues (pages, scripts, Léo, plan du site), sans régénérer le français
node outils/langues.cjs --extraire en      # ce qui manque → outils/langues/en/_a-traduire.json
node outils/langues.cjs --extraire en --tout   # aussi chaque petite chaîne (« Oui », « jour ») pour un tri à la main
node outils/langues.cjs --verifier en      # 0 manque, 0 balise cassée, 0 conflit (code de sortie 1 sinon)
python3 outils/tuto-shots.py . en          # captures du Tuto anglais (img/tuto/en, outils/tuto-captures-en.json)
```

Tests : `outils/tests/langues.test.cjs` (dans la suite Node) et, dans un navigateur,
`node outils/tests/langues-browser.cjs <dossier>` (barre de langue de 360 à 1 440 px, clavier, bandeau, chaque outil du
calculateur dans chaque mode, état rempli et vide : aucun mot français visible, y compris les textes posés par la feuille de
style, aucun montant « 1 250 $ », nombres anglais lus, questions du hub en anglais). Avec `LK_LANGUES_TEXTES=<fichier>`,
il écrit aussi tous les textes vus, zone par zone, pour une relecture humaine.

## Traduire de nouvelles pages ou de nouveaux textes

1. Depuis la v7.61, `langues[en].pages` vaut `"*"` : une nouvelle page française est traduite d’office (rien à ajouter).
2. `node outils/regenerer.cjs`, puis `node outils/langues.cjs --extraire en` : traduire chaque entrée de `_a-traduire.json`
   dans un nouveau `lot-NN.json` (respecter `_glossaire.md`).
3. `node outils/langues.cjs --extraire en --tout` : trier les petites chaînes (texte → mémoire ; identifiant → `_ignorer`).
4. Régénérer, lancer `langues.test.cjs`, `langues-browser.cjs` (ajouter les nouvelles pages à son échantillon), relire.
   Les liens des pages déjà traduites vers ces pages passent tout seuls de la page française à la page anglaise.

## Ajouter une langue (espagnol, italien, allemand, portugais…)

1. Dans `outils/langues.json`, la langue existe déjà en `prevue` (es, it, de, pt) : ajouter ses `libelles` (changer, accueil,
   offre, aller, rester, versFr) et sa liste `pages`, puis passer `etat` à `publiee`.
2. Créer `outils/langues/<code>/` avec `_glossaire.md` (copier celui de l’anglais et l’adapter : formats d’argent et de
   nombres de la langue, mots que le code cherche), `code.json` (`"fr-FR": "<locale>"`), puis la mémoire.
3. Le moteur du calculateur lit `<html lang>` : vérifier `plural`, `dollars` et `parseLocalizedNumber` pour la nouvelle langue
   (l’anglais est codé ; une autre langue suit le format de sa locale) et les mots que le hub reconnaît (`calculateurs-hub.js`).
4. Régénérer, extraire, traduire, tester comme ci-dessus.

## Limites connues (v7.62)

- Léo anglais et allemand comprennent leur langue par réécriture en français : une tournure absente de la table peut être mal comprise
  (comme une tournure française absente de ses questions) ; il le dit et propose les pages les plus proches.
- L’email d’alerte (« Get notified ») et la page de confirmation de Brevo sont écrits dans le compte Brevo, pas dans le site :
  ils restent en français tant qu’une version anglaise ou allemande n’existe pas chez Brevo (les pages le disent : « One email (in
  French) », « Eine E-Mail (auf Französisch) »). Le message que reçoit le site par le formulaire de contact reste en français (il est pour l’équipe du site).
- Les phrases « Rockstar n’a publié aucun prix » viennent des données (`outils/donnees-publiees.cjs`) : quand des prix seront
  publiés, leurs nouvelles phrases devront être traduites (l’extraction les signalera).
