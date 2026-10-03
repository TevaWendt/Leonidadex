# Langues du site (v7.60 à v7.65)

Le français reste la seule langue que l’on écrit. Chaque langue publiée est **générée** à partir des pages françaises finales,
dans son dossier (`/en/…`, `/es/…`, `/it/…`, `/de/…`), par `outils/langues.cjs`, avec une mémoire de traduction
(`outils/langues/<code>/*.json`). Rien n’est traduit à la main dans une page générée : on corrige la mémoire (ou la source
française), puis on régénère.

| Langue | Dossier | Pages | Léo | Depuis |
|---|---|---|---|---|
| Français | `/` | toutes (source) | oui | — |
| English | `/en/` | **toutes** (`"pages": "*"` : 421 pages depuis la v7.65, page introuvable et redirections comprises) | **oui, en anglais** | v7.60 (6 pages), tout le site en v7.62, Léo en v7.64 |
| Español | `/es/` | **toutes** | **oui, en espagnol** | v7.61 |
| Italiano | `/it/` | **toutes** | **oui, en italien** | v7.63 |
| Deutsch | `/de/` | **toutes** | **oui, en allemand** | v7.64 (livrée à part en « v7.62 allemand », réunie ici) |

v7.64 : deux séries d’archives avaient été faites en parallèle à partir de la v7.60 (espagnol, anglais, italien d’un côté ;
anglais et allemand de l’autre). Elles partageaient les mêmes fichiers (common.js, outils/langues.json, outils/langues.cjs, les
pages françaises…) : appliquer l’une effaçait l’autre. La v7.64 les réunit : un seul générateur, une seule configuration, les
cinq langues et Léo dans les cinq. Les documents de l’autre série sont gardés sous un nom à part
(`LISEZ-MOI-v7.61-anglais-autre-branche.txt`, `outils/CHANGEMENTS-v7.62-allemand-autre-branche.txt`, `outils/LANGUES-autre-branche.md`…).

## Ce que voit le visiteur

- **Tout en haut de chaque page**, une barre sombre « Changer la langue » / « Change language » / « Cambiar idioma » /
  « Cambia lingua » / « Sprache ändern » (globe + code de la langue). Un clic ouvre la liste des cinq langues ; la langue
  affichée est cochée. Fonctionne sans JavaScript (`<details>`), au clavier (Tab, Entrée, Échap) et sur mobile.
- **Bandeau de suggestion** (jamais de redirection) : si la langue du navigateur, ou la langue choisie avant, a une version
  de la page, un bandeau la propose dans cette langue (« Leer en español » / « Leggi in italiano » / « Auf Deutsch lesen » /
  « No, grazie »…). Rien n’est enregistré tant qu’on ne clique pas ; un clic écrit une seule clé, `lk_lang_v1`.
- **Page introuvable** : le serveur renvoie la page 404 française pour toute adresse inconnue ; sous `/en/…`, `/es/…`,
  `/it/…` ou `/de/…`, `common.js` affiche la page introuvable de cette langue (`<dossier>/404.html`).
- Dans une page traduite, un lien vers une page encore en français porte un petit badge **FR** (liens de texte) et, pour les
  lecteurs d’écran, « (in French) » / « (en francés) » / « (in francese) » / « (auf Französisch) », plus `hreflang="fr"`.
- **Léo** répond dans les langues de `outils/langues.json` → `leo` : français, espagnol, italien, anglais, allemand.
- Ce que le visiteur enregistre (garage, arsenal, carnets, calculs, progression) est **commun à toutes les langues** : mêmes
  clés du navigateur, mêmes identifiants.
- Recherche dans les listes (véhicules, armes, catalogues, localisateur, marques) : les mots cherchés sont ceux de la langue
  de la page (attributs `data-search`, `data-q`, `data-loc-q`, `data-n`, `data-help-keywords` traduits).

## Référencement (v7.64)

Fait par le générateur, sur chaque page de chaque langue, sans toucher au texte affiché :

- `canonical` et `og:url` dans le dossier de la langue ; `<html lang>` ; `og:locale` de la langue et `og:locale:alternate`
  des autres versions ; `og:site_name` ; `inLanguage` dans les données structurées (JSON-LD traduit : noms, descriptions,
  fil d’Ariane, FAQ, liste des outils du calculateur).
- `hreflang` : chaque version liste toutes les versions de la page (fr, en, es, it, de) et elle-même ; **`x-default` vise la
  version anglaise** (visiteur dont la langue n’est pas publiée). Une page **non indexée** (page introuvable, redirections,
  `noindex`) n’a **aucun** hreflang (`placeAlternates`).
- **Titres** (`<title>`, `og:title`, `twitter:title`) : les joueurs cherchent « GTA 6 » bien plus que « GTA VI » : les titres
  écrivent « GTA 6 » (allemand : « GTA-6-Rechner ») ; la page elle-même (titre h1, textes, description) garde « GTA VI », les
  deux formes sont donc présentes. Un titre de plus de 65 signes perd le suffixe « | Leonidakit » (Google affiche déjà le nom
  du site à part). `titleSeo(html, false)` revient au titre d’origine : la mémoire garde les titres français d’origine.
- **Descriptions** : au plus ~155 signes dans chaque langue ; une description trop longue dans une langue a une version
  courte `"@meta::<description française>": "…"` dans la mémoire, qui ne vaut que pour la balise (le même texte affiché dans
  la page ne change pas).
- **Plan du site** (`sitemap.xml`, `sitemap-fiches.xml`) : chaque adresse française indexable et ses quatre versions, avec
  leurs `xhtml:link hreflang` (les mêmes que dans les pages), `lastmod` (date du jour où le contenu de la page a changé :
  `outils/sitemap-dates.json` garde l’empreinte de chaque page, les empreintes `?v=` des fichiers ne comptent pas) et l’image
  de partage propre à la page (`image:image`). `robots.txt` annonce `sitemap.xml`.

## Les fichiers

| Fichier | Rôle |
|---|---|
| `outils/langues.json` | Langues (`publiee` ou `prevue`), dossier, locale, libellés, pages (`"*"` = toutes, sauf `exclure`), attributs, métas et champs JSON-LD à traduire, `attributsJson` (`{ attribut : [clés] }` ou `{ attribut : "*" }`), `attributsCherches` (mots de recherche ramenés sans accent), scripts partagés et traduits (`traduireAussi`, `scriptsEnPlus`), clés d’identifiants (`jsonCode`, `clesFigees`), données de page (`jsonPages`), `motsCodeGardes` (allemand), langues de Léo (`leo`). |
| `outils/langues.cjs` | Le générateur (appelé à la fin de `outils/sync-site.cjs`, donc par `node outils/regenerer.cjs`). |
| `outils/leo-langues.cjs` | Léo dans une autre langue : index, morceaux et passages de la langue (appelé par le générateur). |
| `outils/langues/<code>/_glossaire.md` | Règles et vocabulaire imposés à la traduction. |
| `outils/langues/<code>/*.json` | La mémoire : `"texte français": "traduction"` (lot-*, site-*, leo-*, noms, motifs, recherche-*…). |
| `outils/langues/<code>/code.json` | Valeurs de code (`"fr-FR": "de-DE"`), `_ignorer` (chaînes qui ressemblent à du français mais sont des identifiants), règles « jamais traduit dans ce fichier » (`"leo-core.js::monde": []`). |
| `outils/langues/es|it/_leo-pont.json` | Pont de Léo (espagnol, italien) : expressions → français, mots vides. |
| `outils/langues/en|de/leo-pivot.json` | Table de réécriture de Léo (anglais, allemand) : `{"expressions": [[expression, français], …]}`. |
| `outils/sitemap-dates.json` | Empreinte et date de dernière modification de chaque adresse du plan du site. |
| `outils/langues/<code>/_a-traduire.json` | Écrit par `--extraire` : ce qui manque, avec l’endroit. |
| `img/tuto/<code>/`, `outils/tuto-captures-<code>.json` | Captures du Tuto prises dans le calculateur traduit. |

## Comment une page est traduite

1. Le générateur lit la page française **finie** (après `sync-site.cjs`), la découpe en **segments** : une phrase avec ses
   balises en ligne devient une seule clé où les balises sont des repères numérotés : `"Écris le prix dans <1>Mes achats</1>."`
   → `"Gib den Preis in <1>Meine Käufe</1> ein."` (on peut déplacer les repères, jamais en ajouter ni en retirer).
2. Recherche d’une traduction : entrée exacte (ou propre au fichier `fichier::texte`), nombres qui bougent, règles `re:`,
   puis phrase par phrase (`deep`), motifs à trous `_motifs` (`"Nom en jeu inconnu à ce jour. Équivalent réel : {1}."`), morceaux
   séparés par « · » ou « , » (`partsOf`). Un morceau français inconnu est signalé, le texte reste en français à sa place.
3. Attributs lus, `<title>`, métas, JSON-LD, attributs porteurs de JSON (`data-medias`, `data-cat-tags`), données de page
   (`jsonPages`), textes portés par une adresse (titre de la carte `#t=…`, recherche Wikipédia dans la langue).
4. Liens : une page traduite reste dans le dossier de la langue ; une autre pointe vers la page française (`hreflang="fr"`,
   badge FR). Les sous-dossiers sont reproduits dans la langue.
5. Barre de langue, référencement (voir plus haut), nombres français des champs (`value="200 000"`).
6. Scripts : chaque script local de la page est lu jeton par jeton (acorn) ; seules les **chaînes** connues de la mémoire
   changent. Jamais traduits : un code de langue (`'de'`, `'it'`), une clé de `clesFigees`, un nom de propriété entre
   guillemets, un mot de `_scriptsJamais` (sauf clé propre au fichier) ; en allemand (`motsCodeGardes`), tout mot en minuscules
   sans espace (`'divers'`) sauf clé propre au fichier.

### Clés de la mémoire

- `"texte": "traduction"` — clé normalisée (espaces insécables → espace, `'` → `’`) ; `"texte": "="` — identique.
- `"fichier.js::texte": "…"` — propre à un fichier ; `"fichier.js::texte": [{ "si": "expression", "texte": "…" }]` — règle
  selon le code qui précède ; `"fichier.js::texte": []` — jamais traduit dans ce fichier.
- `"re:expression": "… {1} / {t1}"` — phrase à trous (v7.61) ; `"_motifs": { "phrase {1}": "Satz {1}" }` — motif (v7.62).
- `"@meta::description française": "…"` — description raccourcie pour les moteurs de recherche (v7.64).
- `"_scriptsJamais"`, `"_ignorer"` — identifiants.
- Guillemets : « » français → “ ” (anglais, espagnol, italien) ou „ “ (allemand) ; « 20 % » avec espace en espagnol et en
  allemand, « 20% » collé en anglais et en italien.
- Nombres : une entrée dont la traduction reprend ses nombres sert aussi pour d’autres nombres ; un nombre sans séparateur
  (« 2547 ») peut être repris tel quel (allemand) ou au format de la langue (italien : « 2.547 », `"milliers": "toujours"`).
- Pluriels : jamais de `+ 's'` dans le code ; les deux formes sont écrites (`plural(n, ' partie', ' parties')`).

## Léo dans une autre langue

Le cerveau de Léo reste français : `outils/gen-leo.cjs` écrit `leo-index.json` et `leo/*.json` ; `outils/leo-langues.cjs` en
tire `<dossier>/leo-index.json` et `<dossier>/leo/*.json` pour chaque langue de `leo`.

- Ce que Léo **affiche** passe par la mémoire de la langue (mêmes recherches que les pages).
- Ce qui sert à **comprendre** reste français : la question passe d’abord par le **pont** (espagnol, italien :
  `_leo-pont.json`, appliqué par `leo-core.js`) ou par la **table de réécriture** (anglais, allemand : `leo-pivot.json`,
  appliquée par `leo-nlp.js` → `pivot`, complétée par les libellés des catégories et des outils). Un nom traduit est affiché et
  reconnu en entier ; le nom français reste celui que Léo reconnaît (`nameFr`), les jetons des noms traduits désignent aussi leur
  morceau.
- Les **passages** viennent des pages de la langue ; les adresses mènent aux pages de la langue.
- Évaluation : `node outils/tests/leo-eval.cjs --langue <code>` (512 questions par langue, `outils/tests/leo-questions-<code>.json` ;
  anglais et allemand ont aussi un jeu de questions inédites : `--questions=outils/tests/leo-questions-de-inedites.json`).

## Commandes

```
node outils/regenerer.cjs                     # tout, langues comprises (« Langue de : 421 pages, 53 scripts traduits, 0 texte(s) sans traduction »)
node outils/langues.cjs de --extraire         # ce qui manque → outils/langues/de/_a-traduire.json
node outils/langues.cjs de --verifier         # 0 manque, 0 balise cassée, 0 conflit (code de sortie 1 sinon)
python3 outils/tuto-shots.py . de             # captures du Tuto allemand (img/tuto/de, outils/tuto-captures-de.json)
node outils/tests/leo-eval.cjs --langue de    # Léo en allemand (fr, en, es, it de même)
```

Tests :
- `outils/tests/langues.test.cjs` (dans la suite Node) : pour chaque langue publiée, dossier à jour, langue, liens, hreflang
  (aucun sur une page non indexée, x-default anglais), og:locale:alternate, titres « GTA 6 », aucun français visible (allemand :
  ni français ni anglais), scripts (seules des chaînes changent), formulaire de contact, badge FR, Tuto ; calculateur anglais,
  espagnol, italien et allemand dans jsdom ; page introuvable de chaque langue ; Léo présent dans chaque langue de `leo` ;
  bandeau et `lk_lang_v1`.
- `node outils/tests/langues-browser.cjs <dossier>` : barre de langue de 360 à 1 440 px, bandeaux, chaque outil du calculateur
  dans chaque mode, dans chaque langue : aucun mot étranger visible, montants et nombres de la langue, questions du hub.
- `node outils/tests/langues-pages-browser.cjs <dossier>` : **toutes** les pages de chaque langue dans Chromium (`LK_LANGUE=de`
  pour une seule langue).
- `outils/tests/langues-helper.cjs` : `frenchHits(texte, langue)` (mots partagés avec l’espagnol, l’italien, l’allemand),
  `englishHits` (anglais resté sur une page allemande), `foreignHits(texte, langue)`.

## Une page ou un texte français nouveau

Les quatre langues traduisent tout le site : une page française nouvelle est générée dans `en/`, `es/`, `it/` et `de/` à la
régénération suivante. Ses textes encore inconnus restent en français à leur place, la régénération le dit et
`langues.test.cjs` échoue tant qu’ils manquent :

1. `node outils/langues.cjs en --extraire`, puis `es`, `it`, `de` : la liste est dans `outils/langues/<code>/_a-traduire.json`.
2. Traduire chaque entrée dans un fichier de la mémoire de la langue (respecter `_glossaire.md`) ; une date écrite en lettres
   se retraduit quand elle change.
3. Régénérer, relancer `langues.test.cjs` et `langues-pages-browser.cjs`.

Exemple (v7.65, section « Gangs et factions ») : sept pages nouvelles et le menu de toutes les pages ; environ 300 textes par
langue dans `outils/langues/<code>/lot-66.json`, puis les alias et réponses de Léo (extraction suivante, après `gen-leo.cjs`).
En allemand, un mot isolé en minuscules dans un script reste du code (`motsCodeGardes`) : pour le traduire dans un fichier de
données, écrire `fichier.js::mot` (`carte-gtadb.js::commerce` → « Einzelhandel ») ; les noms fabriqués de la carte
(« … (nom réel) », « Bâtiment L… ») se traduisent par des règles `re:` (comme en anglais, espagnol et italien).

## Ajouter une langue (portugais…)

1. Dans `outils/langues.json`, passer la langue (`pt`, déjà en `prevue`) à `publiee` avec ses `libelles` (changer, accueil,
   offre, aller, rester, versFr), `"pages": "*"`, `traduireAussi` et `scriptsEnPlus` comme l’espagnol.
2. Créer `outils/langues/<code>/` : `_glossaire.md`, `code.json`, la mémoire (les clés propres aux fichiers et les règles de
   `es/lot-45.json`, `it/lot-90.json`, `en/lot-27.json` disent quelles chaînes de script demandent une règle).
3. Moteur du calculateur (`plural`, `dollars`, `parseLocalizedNumber`), mots que le hub reconnaît (`calculateurs-hub.js`,
   `-workspace.js`, `-scenario.js`), `frenchHits` si la langue partage des mots avec le français.
4. Léo : ajouter la langue à `leo`, écrire son pont ou sa table de réécriture et ses questions de test.
5. Régénérer, extraire, traduire, tester.

## Limites connues (v7.64)

- Les emails d’alerte et les réponses du formulaire de contact restent en français.
- Les noms saisis par le visiteur (calculs, notes) ne sont jamais traduits.
- Léo : 512 questions sur 512 en français, italien et allemand ; 511 en espagnol (une réponse donne le bon passage de page au
  lieu de la fiche sujet) ; anglais : voir `outils/PREUVES-v7.64.md`.
- L’historique des Mentions garde les deux séries de versions livrées en parallèle (deux « v7.61 », deux « v7.62 ») ; la v7.64
  les explique.
