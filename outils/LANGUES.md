# Langues du site (v7.60, v7.61)

Le français reste la seule langue que l’on écrit. Chaque langue publiée est **générée** à partir des pages françaises finales,
dans son dossier (`/en/…`, `/es/…`), par `outils/langues.cjs`, avec une mémoire de traduction (`outils/langues/<code>/*.json`).
Rien n’est traduit à la main dans une page générée : on corrige la mémoire (ou la source française), puis on régénère.

| Langue | Dossier | Pages | Léo | Depuis |
|---|---|---|---|---|
| Français | `/` | toutes (source) | oui | — |
| English | `/en/` | 6 (accueil, calculateur, Tuto, À propos, Contact, Mentions) | non | v7.60 |
| Español | `/es/` | **toutes** (`"pages": "*"` : 403 pages, sous-dossiers compris) | **oui, en espagnol** | v7.61 |

## Ce que voit le visiteur

- **Tout en haut de chaque page**, une barre sombre « Changer la langue » / « Change language » / « Cambiar idioma » (globe +
  code de la langue). Un clic ouvre la liste des langues publiées ; la langue affichée est cochée. Fonctionne sans
  JavaScript (`<details>`), au clavier (Tab, Entrée, Échap) et sur mobile.
- Une page qui n’existe pas encore dans une langue mène à l’accueil de cette langue (« home page » sous le nom de la langue).
- **Bandeau de suggestion** (jamais de redirection) : si la langue du navigateur, ou la langue choisie avant, a une version
  de la page, un bandeau la propose dans cette langue (« Leer en español » / « No, gracias »…). Rien n’est enregistré tant
  qu’on ne clique pas ; un clic écrit une seule clé, `lk_lang_v1` (la langue choisie). Mentions : section stockage.
- Dans une page traduite, un lien vers une page encore en français porte un petit badge **FR** (liens de texte) et, pour les
  lecteurs d’écran, « (in French) » / « (en francés) » (tous ces liens, cartes comprises), plus `hreflang="fr"`.
- **Léo** répond dans les langues de `outils/langues.json` → `leo` (français, espagnol). Il n’est pas chargé sur une page
  d’une autre langue (anglais : les textes qui le présentent disent « French only for now »).
- Ce que le visiteur enregistre (garage, arsenal, carnets, calculs, progression) est **commun à toutes les langues** : mêmes
  clés du navigateur, mêmes identifiants. Un calcul enregistré en français s’ouvre en espagnol, et l’inverse.
- Moteur de recherche : `canonical` et `og:url` dans le dossier de la langue, `hreflang` de chaque version existante +
  x-default sur chaque page, `og:locale` (en_US, es_ES), `inLanguage` dans les données structurées, adresses traduites
  ajoutées à `sitemap.xml`.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `outils/langues.json` | Langues (`publiee` ou `prevue`), dossier, locale, libellés du sélecteur et du bandeau, **pages traduites** de chaque langue (`"*"` = toutes), attributs, métas et champs JSON-LD à traduire, scripts partagés et scripts de données, clés d’identifiants (`jsonCode`, `clesFigees`), données de page (`jsonPages`), langues de Léo (`leo`). |
| `outils/langues.cjs` | Le générateur (appelé à la fin de `outils/sync-site.cjs`, donc par `node outils/regenerer.cjs`). |
| `outils/leo-langues.cjs` | Léo dans une autre langue : index, morceaux et passages de la langue (appelé par le générateur). |
| `outils/langues/<code>/_glossaire.md` | Règles et vocabulaire imposés à la traduction (mots que le code cherche, formats d’argent, statuts…). |
| `outils/langues/<code>/lot-*.json` | La mémoire : `"texte français": "traduction"`. |
| `outils/langues/<code>/code.json` | Valeurs de code (`"fr-FR": "es-ES"`) et `_ignorer` (chaînes qui ressemblent à du français mais sont des identifiants). |
| `outils/langues/<code>/_leo-pont.json` | Pont de Léo : expressions de la langue → français (le cerveau de Léo reste français), mots vides. |
| `outils/langues/<code>/_a-traduire.json` | Écrit par `--extraire` : ce qui manque, avec l’endroit. |
| `img/tuto/<code>/`, `outils/tuto-captures-<code>.json` | Captures du Tuto prises dans le calculateur traduit. |

## Comment une page est traduite

1. Le générateur lit la page française **finie** (après `sync-site.cjs`), la découpe en **segments** : une phrase avec ses
   balises en ligne (`a`, `strong`, `em`, `span`, `code`, `br`…) devient une seule clé où les balises sont des repères
   numérotés : `"Écris le prix dans <1>Mes achats</1>."` → `"Escribe el precio en <1>Mis compras</1>."` (on peut déplacer les
   repères, jamais en ajouter ni en retirer : sinon la page n’est pas écrite et le test échoue).
2. Attributs lus (`title`, `alt`, `aria-label`, `placeholder`, `data-ask`, `data-desc`, `data-loc-*`…), `<title>`, métas, JSON-LD,
   et les **données de page** lues par un script (`<script type="application/json" id="lk-carnet-data">` des carnets :
   `jsonPages` dit quelles clés sont des textes, lesquelles sont des adresses, lesquelles ne bougent jamais).
3. Liens : une page traduite reste dans le dossier de la langue (`/es/vehicules/x.html`), une autre pointe vers la page
   française (`hreflang="fr"`, badge FR). Une page d’un sous-dossier (`vehicules/`, `armes/`, `lieux/`, `personnages/`,
   `entreprises/`, `demeures/`, `planques/`, `carnets/`) est rangée dans le même sous-dossier de la langue : un lien vers une page
   ou un script traduit garde son adresse relative, tout le reste (feuilles, images, données, pages non traduites) prend un
   `../` de plus.
4. Barre de langue, `hreflang`, et les nombres français des champs (`value="200 000"` → `200,000` / `200.000`).
5. Scripts : chaque script local de la page est lu jeton par jeton (acorn) ; seules les **chaînes** connues de la mémoire
   changent (le reste du code est identique, vérifié par le test). Les chaînes qui portent du HTML sont traduites zone par
   zone. Le script traduit est copié dans le dossier de la langue avec sa propre empreinte `?v=`. Les scripts de données
   (`vehicules-data.js`…) ne changent que pour les libellés nommés dans la mémoire ; `clesFigees` liste, par fichier, les clés
   dont la valeur est un identifiant (données de la carte : `id`, `c`, `img`…).
6. Une langue peut aussi traduire des scripts **partagés** (`traduireAussi`) : index de recherche (`search-index.js`,
   `search-lieux.js` : libellés traduits, mots recherchés de la langue ajoutés aux mots français), données de la carte
   (`carte-gtadb.js`). Les scripts chargés par un autre script (Léo, moteur du calculateur) sont listés dans `scriptsEnPlus`.

### Clés de la mémoire

- `"texte": "traduction"` — clé normalisée (espaces insécables → espace, `'` → `’`).
- `"texte": "="` — identique (nom propre, marque).
- `"fichier.js::texte": "…"` (ou `"carnets/garage.html::texte"`) — traduction propre à un fichier (un mot qui veut dire autre
  chose ailleurs, un mot court d’une page).
- `"fichier.js::texte": [{ "si": "expression", "texte": "…" }, { "texte": "…" }]` — **règle selon le code qui précède** la
  chaîne (80 caractères ; pour une valeur JSON, le nom de sa clé). Sert quand le même mot est un texte lu et un identifiant
  dans le même fichier (`joueurs` : unité affichée et nom d’un critère ; `armes` : libellé et type). Aucune règle vérifiée :
  la chaîne ne change pas. `"fichier.js::texte": []` : jamais traduit dans ce fichier.
- `"re:expression": "traduction avec {1} / {t1}"` (v7.61) — **phrase à trous** des données assemblées : `{1}` recopie le
  groupe, `{t1}` le traduit par la mémoire (« Regroupe 41 bâtiments repérés. », « Équivalent réel : X. »).
- `"_scriptsJamais": [ … ]` (v7.61) — mots traduits dans les pages mais qui, dans un script, sont des identifiants
  (« source », « fiche », « calcul »…) : une clé propre au fichier reste possible.
- **Phrases enchaînées** (v7.61) : un texte sans balise fait de plusieurs phrases, toutes connues une à une, se traduit phrase
  par phrase (descriptions des lieux de la carte).
- **Nombres qui bougent** : une entrée dont la traduction reprend ses nombres dans le même ordre sert aussi pour d’autres
  nombres (`<1>617</1><2>tests automatisés écrits</2>` traduit aussi `<1>640</1>…`). Une date écrite en lettres
  (« 1er octobre ») doit être retraduite quand elle change.
- Une phrase assemblée par le code se traduit morceau par morceau : le glossaire explique comment. Les pluriels passent par
  `LKCalcEngine.plural(n)` (français : n > 1 ; anglais et espagnol : n ≠ 1) ; un mot ou un adjectif accordé s’écrit en entier
  dans la source (`(n>1?' missions':' mission')`, `(n>1?' finies':' finie')`), jamais avec un `'s'` ajouté (« misións »).
- Argent : `LKCalcEngine.dollars(texte)` (« 1 250 $ » / « $1,250 » / « 1.250 $ ») ; dates : `LKCalcEngine.dateText(date,
  options)` (« 1 de diciembre de 2026 ») ; nombres saisis : `LKCalcEngine.parseLocalizedNumber` lit « 1,500 » en anglais,
  « 1.500 » et « 1,5 » en espagnol. Les textes ajoutés par une feuille de style (`content:`) viennent d’un attribut de la page
  (`attr(data-desc)`), traduit avec elle.

## Léo dans une autre langue (v7.61)

Le cerveau de Léo reste français : `outils/gen-leo.cjs` écrit `leo-index.json` et `leo/*.json` ; `outils/leo-langues.cjs` en
tire `<dossier>/leo-index.json` et `<dossier>/leo/*.json` pour chaque langue de `leo` autre que le français.

- Ce que Léo **affiche** (réponses, gabarits, libellés, preuves, catégories, noms) passe par la mémoire de la langue ; un
  texte absent est signalé comme une page (`--extraire`). Les noms traduits gardent le nom français en alias.
- Ce qui sert à **comprendre** reste français : la question du visiteur passe d’abord par le **pont** (`_leo-pont.json`,
  6 796 expressions espagnoles → françaises, la plus longue d’abord, « 200.000 $ » → « 200 000 $ », « ¿ ¡ » retirés) puis
  par l’analyse française habituelle. Les mots vides de la langue s’ajoutent au lexique.
- Les **passages** des pages viennent des pages de la langue et se cherchent avec la question d’origine.
- Les adresses mènent aux pages de la langue (`/es/…`) ; `leo-ui.js` charge l’index du dossier de son script, `leo-loader.js`
  retombe sur la racine pour un script non traduit (`leo-nlp.js`).
- Évaluation : `node outils/tests/leo-eval.cjs --langue es` (512 questions espagnoles, `outils/tests/leo-questions-es.json`).

## Commandes

```
node outils/regenerer.cjs                     # tout, langues comprises (« Langue es : 403 pages, 53 scripts traduits, 0 texte(s) sans traduction »)
node outils/langues.cjs es --extraire         # ce qui manque → outils/langues/es/_a-traduire.json
node outils/langues.cjs es --extraire --tout  # aussi chaque petite chaîne (« Oui », « jour ») pour un tri à la main
node outils/langues.cjs es --verifier         # 0 manque, 0 balise cassée, 0 conflit (code de sortie 1 sinon)
python3 outils/tuto-shots.py . es             # captures du Tuto espagnol (img/tuto/es, outils/tuto-captures-es.json)
node outils/tests/leo-eval.cjs --langue es    # Léo en espagnol
```

Tests :
- `outils/tests/langues.test.cjs` (dans la suite Node) : pour chaque langue publiée, dossier à jour, langue, liens, hreflang,
  aucun français visible (pages et données de page), scripts (seules des chaînes changent), formulaire de contact, badge FR,
  Tuto ; calculateur anglais et espagnol dans jsdom ; Léo présent ou absent selon `leo` ; bandeau et `lk_lang_v1`.
- `node outils/tests/langues-browser.cjs <dossier>` : barre de langue de 360 à 1 440 px (toutes les pages anglaises, un
  échantillon espagnol), clavier, bandeaux anglais et espagnol, chaque outil du calculateur dans chaque mode, état rempli et
  vide, dans chaque langue : aucun mot français visible, montants de la langue, nombres de la langue lus, questions du hub.
  Avec `LK_LANGUES_TEXTES=<fichier>`, il écrit aussi tous les textes vus, zone par zone, pour une relecture humaine.
- `node outils/tests/langues-pages-browser.cjs <dossier>` (v7.61) : **toutes** les pages de chaque langue dans Chromium
  (`LK_LANGUE=es` pour une seule langue) : aucune erreur JavaScript, aucune requête en échec, langue et barre, aucun mot
  français visible à 1 280 px, aucun débordement propre à la traduction à 390 px.
- Le repère du français (`outils/tests/langues-helper.cjs`, `frenchHits(texte, langue)`) connaît les mots que l’espagnol
  partage avec le français (« de », « la », « que », « sur », « tu »…) et ne compte que les accents propres au français ; en
  espagnol, deux accents dans un mot ou une finale -ité / -ée trahissent aussi le français.

## Traduire d’autres pages en anglais

1. Ajouter les pages à `langues[en].pages` dans `outils/langues.json` (ou `"*"` pour toutes, comme l’espagnol).
2. `node outils/regenerer.cjs`, puis `node outils/langues.cjs en --extraire` : traduire chaque entrée de `_a-traduire.json`
   dans un nouveau `lot-NN.json` (respecter `_glossaire.md`). Pour un site entier, reprendre les clés propres aux fichiers et
   les règles de l’espagnol (`lot-45`, `lot-46`, `lot-54` de `outils/langues/es/`) : les mêmes chaînes en ont besoin.
3. `node outils/langues.cjs en --extraire --tout` : trier les petites chaînes (texte → mémoire ; identifiant → `_ignorer`).
4. Régénérer, lancer `langues.test.cjs`, `langues-browser.cjs`, `langues-pages-browser.cjs`, relire.
   Les liens des pages déjà traduites vers ces pages passent tout seuls de la page française à la page anglaise.

## Ajouter une langue (italien, allemand, portugais…)

1. Dans `outils/langues.json`, la langue existe déjà en `prevue` (it, de, pt) : ajouter ses `libelles` (changer, accueil,
   offre, aller, rester, versFr) et sa liste `pages` (`"*"` pour tout le site, avec `traduireAussi` et `scriptsEnPlus` comme
   l’espagnol), puis passer `etat` à `publiee`.
2. Créer `outils/langues/<code>/` avec `_glossaire.md` (copier celui de l’espagnol et l’adapter : formats d’argent et de
   nombres de la langue, mots que le code cherche), `code.json` (`"fr-FR": "<locale>"`), puis la mémoire. Les clés propres
   aux fichiers et les règles de l’espagnol (`lot-45`, `lot-46`, `lot-54`) disent quelles chaînes de script demandent une
   règle.
3. Le moteur du calculateur lit `<html lang>` : vérifier `plural`, `dollars` et `parseLocalizedNumber` pour la nouvelle langue
   (anglais et espagnol sont codés ; une autre langue suit le format de sa locale) et les mots que le hub reconnaît
   (`calculateurs-hub.js`, `-workspace.js`, `-scenario.js`). Ajouter les mots vides de la langue à `frenchHits` si elle
   partage des mots avec le français.
4. Léo : ajouter la langue à `leo`, écrire son `_leo-pont.json` (expressions → français) et ses questions de test.
5. Régénérer, extraire, traduire, tester comme ci-dessus.

## Limites connues (v7.61)

- Anglais : 6 pages (la suite est le lot suivant). Espagnol : tout le site.
- Les emails d’alerte et les réponses du formulaire de contact restent en français.
- Les phrases « Rockstar n’a publié aucun prix » viennent des données (`outils/donnees-publiees.cjs`) : quand des prix seront
  publiés, leurs nouvelles phrases devront être traduites (l’extraction les signalera). De même pour chaque nouvelle fiche,
  nouveau lieu ou nouvelle question de Léo : `node outils/langues.cjs es --extraire` dit ce qui manque, la régénération garde
  le français à cet endroit en attendant.
- Les noms saisis par le visiteur (calculs, notes) ne sont jamais traduits.
- Léo espagnol : 511 questions sur 512 du jeu d’essai ; il comprend moins bien l’argot espagnol que l’argot français.
