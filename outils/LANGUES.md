# Langues du site (v7.60)

Le français reste la seule langue que l’on écrit. Chaque langue publiée est **générée** à partir des pages françaises finales,
dans son dossier (`/en/…`), par `outils/langues.cjs`, avec une mémoire de traduction (`outils/langues/<code>/*.json`).
Rien n’est traduit à la main dans une page générée : on corrige la mémoire (ou la source française), puis on régénère.

## Ce que voit le visiteur

- **Tout en haut de chaque page**, une barre sombre « Changer la langue » (globe + code de la langue). Un clic ouvre la liste
  des langues publiées ; la langue affichée est cochée. Fonctionne sans JavaScript (`<details>`), au clavier (Tab, Entrée,
  Échap) et sur mobile.
- Une page qui n’existe pas encore dans une langue mène à l’accueil de cette langue (« home page » sous le nom de la langue).
- **Bandeau de suggestion** (jamais de redirection) : si la langue du navigateur, ou la langue choisie avant, a une version
  de la page, un bandeau propose « Read in English » / « No thanks » (dans la langue proposée). Rien n’est enregistré tant
  qu’on ne clique pas ; un clic écrit une seule clé, `lk_lang_v1` (la langue choisie). Mentions : section stockage.
- Dans une page traduite, un lien vers une page encore en français porte un petit badge **FR** (liens de texte) et, pour les
  lecteurs d’écran, « (in French) » (tous ces liens, cartes comprises), plus `hreflang="fr"`.
- **Léo** ne répond qu’en français pour l’instant (`outils/langues.json` → `leo`) : il n’est pas chargé sur une page
  traduite. Les textes qui le présentent disent « French only for now ».
- Moteur de recherche : `canonical` et `og:url` en `/en/`, `hreflang` fr / en / x-default sur chaque paire de pages,
  `og:locale` en_US, `inLanguage` dans les données structurées, adresses anglaises ajoutées à `sitemap.xml`.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `outils/langues.json` | Langues (`publiee` ou `prevue`), dossier, locale, libellés du sélecteur et du bandeau, **pages traduites** de chaque langue, attributs, métas et champs JSON-LD à traduire, scripts partagés (jamais copiés) et scripts de données, clés JSON qui portent des identifiants (`jsonCode`). |
| `outils/langues.cjs` | Le générateur (appelé à la fin de `outils/sync-site.cjs`, donc par `node outils/regenerer.cjs`). |
| `outils/langues/<code>/_glossaire.md` | Règles et vocabulaire imposés à la traduction (mots que le code cherche, formats d’argent, statuts…). |
| `outils/langues/<code>/lot-*.json` | La mémoire : `"texte français": "traduction"`. |
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

## Commandes

```
node outils/regenerer.cjs                  # tout, langues comprises (« Langue en : 6 pages, 26 scripts traduits, 0 texte(s) sans traduction »)
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

## Traduire d’autres pages en anglais (lots 2 et 3)

1. Ajouter les pages à `langues[en].pages` dans `outils/langues.json` (par exemple les hubs, puis les listes et les fiches).
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

## Limites connues (v7.60)

- Lot 1 seulement : accueil, calculateur complet, Tuto, À propos, Contact, Mentions et confidentialité. Les autres pages
  restent en français (badge FR), la recherche du site cherche dans les noms français.
- Les emails d’alerte et les réponses du formulaire de contact restent en français.
- Les phrases « Rockstar n’a publié aucun prix » viennent des données (`outils/donnees-publiees.cjs`) : quand des prix seront
  publiés, leurs nouvelles phrases devront être traduites (l’extraction les signalera).
