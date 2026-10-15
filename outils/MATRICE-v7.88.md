# Matrice des exigences — lot 3 (v7.88) : images de partage, page Presse et kit presse, revenus en sommeil

Exigences de qualité de Leonidakit (prompt « Exigences de qualité », niveau d'avant la v7.86) appliquées à ce que le lot
touche : `presse.html` et ses quatre traductions, le kit `presse/`, les images de partage (`img/partage/`, balises des
28 grandes pages × 5 langues), le motif de contact (`contact.html`, `api/contact.js`), le bloc d'affiliation éteint
(`editions.html`, `mentions-legales.html`), le logo de l'organisation (`index.html`, pages d'informations), l'entrée
« Presse » du menu et du pied de page (toutes les pages), Léo et la recherche. Base : v7.87 (commit `210850a62`).

États : **validé** (fait et prouvé) · **sans objet** (le lot ne touche pas ce point).

## 1. L'esprit

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| « Du tac au tac » : l'essentiel d'abord | `presse.html` | Bandeau : ce que contient la page en une phrase, deux actions (« Télécharger le kit (ZIP) », « Écrire à l'éditeur ») ; sous-navigation collante vers les six sections ; le site en trois phrases à reprendre tel quel | Captures 390 / 768 / 1 280 px (FR, DE) | validé |
| Site moderne dans la charte, pas de « PowerPoint » | `presse.html` | Sections du moteur commun (kicker, numéro, icône, fonds papier / papier 2 / nuit alternés, accents ambre et corail), cartes du kit à aperçu 16/10, encadré ambre de l'archive | Captures | validé |
| Fiches remplies, texte unique | `presse.html` | Six sections rédigées pour la page (aucun texte repris d'une autre) ; chiffres réels ; trois règles de citation avec exemple | Test « textes tous affichés » ; les trois textes de « Citer une information » manquaient dans le code reçu : corrigé | validé |
| Rien d'inutile, pas de doublon | `presse.html`, menu | Une entrée « Presse » (groupe « Le site ») ; libellé de section « Contact » (et non « Écrire », déjà employé ailleurs dans un autre sens) | Mémoire de traduction sans conflit (`langues.cjs`) | validé |
| Registre « tu », phrases courtes, aucun jargon, aucun superlatif | `presse.html`, Léo | « Dis qui tu es… », « Cite la source de Rockstar » ; pas de chiffre invérifiable (chiffres comptés par script) ; ne dit pas « sans publicité » (emplacements réservés depuis la v7.71) ; « En bref », fait pour être collé dans un article, sans « tu » ni date qui se périme | Relecture des cinq langues (deux passes, la seconde par un relecteur qui n'avait pas écrit la page) | validé |

## 2. Identité visuelle

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Jetons de `style.css` | `informations.css` (`pr-*`), `actus.css` (`lk-aff-*`) | `--ink`, `--paper`, `--paper-2`, `--amber`, `--coral-text`, `--ink-soft`, `--shadow-soft` ; le blanc des cartes est celui des cartes d'informations existantes (`.info-illus li`) | Lecture des styles | validé |
| Police Archivo hébergée | images de partage, logo | Rendus depuis `fonts/archivo-latin*.woff2` du site ; logo tracé depuis la même police (pas de police externe, pas de texte dans le SVG) | `document.fonts.check` au rendu ; test « logos en tracés » | validé |
| Gabarit des pages : pile d'images officielles cliquables, sections du moteur commun, sous-navigation | `presse.html` | Bandeau `presse` de `outils/lot-c-visuals.cjs` (Real Dimez, Vice City), `S.section`, `S.nav` | Captures | validé |
| Marges et bords des sections | `presse.html` | Coquilles `.shell` du moteur commun | Contrôle d'écrans (« coquilles ») : rien de nouveau | validé |
| Visuels uniquement officiels et crédités | images de partage, bandeau, kit | 28 visuels de `outils/medias-officiels.json`, « © Rockstar Games » sur chaque image ; les captures du kit sont dites « en français », leurs visuels du jeu dits à Rockstar ; aucun visuel du jeu présenté comme celui du site | Planches des 140 images ; textes de la page et du LISEZ-MOI du kit | validé |

## 3. Mouvement et effets

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Un seul moteur (`common.js`, `LKMotion`) | `presse.html` | Paragraphes, chiffres, cartes du kit, règles et colonnes en `lk-reveal` : cascade du moteur commun ; aucun script ni observateur ajouté ; chiffres fixes, sans le compteur de `app.js` (qui écrivait « 2547 » sans séparateur) | Lecture du HTML ; aucun nouveau script | validé |
| Apparitions au défilement, cascade, premier écran immédiat | `presse.html` | Bandeau en cascade d'en-tête (moteur commun), cartes du kit en cascade à l'arrivée | Suite de captures début / milieu / fin (`kit-mouvement-*`) ; opacités finales 1 | validé |
| Survols : boutons réagissent, cartes lues immobiles | `pr-dl`, `pr-file` | Boutons de téléchargement : fond ambre au survol (poids passé à l'encre pour garder le contraste), focus visible ; les cartes du kit ne bougent pas | Styles | validé |
| `prefers-reduced-motion`, sans script tout visible | `presse.html` | Rien de caché à l'état final ; capture « réduire les animations » identique à l'état final | `kit-reduit-fin` ; opacités 1 | validé |

## 4. Mise en page et alignement

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| 16 largeurs, cinq langues, aucun débordement, aucun texte rogné ou sous 11 px | `presse.html` (+ toutes les pages pour le menu) | Grilles en `auto-fill` / `minmax(min(100%,…))`, boutons qui passent à la ligne | `ecrans-browser.cjs` (16 largeurs) et allemand (5 largeurs) : voir CONTRÔLES | validé |
| Grilles alignées, mêmes hauteurs, boutons en bas | kit | Cartes en colonne flex, boutons poussés en bas (`margin:auto 0 0`) ; aperçus tous en 16/10 (l'icône et la capture du téléphone agrandissaient leur carte : corrigé) ; six chiffres en 6 ou 3 + 3 colonnes (au lieu de 4 + 2) | Captures 1 280 / 768 / 390 | validé |
| Cibles tactiles ≥ 24 px (44 visés) | boutons du kit | `.pr-dl` 40 px de haut, bouton principal 46 px | Contrôle d'écrans (cibles) | validé |

## 5. Latence et performance

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Mesures avant / après, aucune régression | accueil, carte, éditions, contact, Mentions, À propos, accueil allemand | Seuls changements : quelques balises `<meta>` dans l'en-tête, un lien de menu, les empreintes `?v=`, deux règles CSS de survol ; aucun script, aucune feuille, aucune image ajoutés à ces pages | Banc HTTP/2 + brotli, téléphone 390 px, 4G lente, processeur ×4, froid et chaud, base et lot en alternance : mêmes requêtes, +40 à +970 octets de HTML ; LCP bimodal de l'À propos vérifié par un essai base contre base (même dispersion) ; écarts dans le bruit (voir CONTRÔLES) | validé |
| Page nouvelle pas plus lente que ses semblables | `presse.html` | Aucun script propre ; aperçus du kit en `loading="lazy"` avec `width` / `height` ; images de partage jamais chargées par une page (hors manifeste) | Presse : 214 Ko, 15 requêtes, LCP 1,6 s à froid ; À propos : 280 Ko, 17 requêtes, LCP 1,4–1,7 s | validé |
| Rien de bloquant ajouté, pas de double téléchargement | toutes | `img/partage/` et `presse/` hors de `assets-manifest.js` | Test v788 (manifeste) | validé |

## 6. Référencement

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| `og:` complets avec l'image de partage de la page | 28 pages × 5 langues | `og:image` (empreinte), `og:image:width`, `og:image:height`, `og:image:alt` (titre traduit) ; image d'avant en seconde | Test v788 (140 pages) | validé |
| Titre, description ≤ 155 signes unique, un seul `h1`, canonique, hreflang | `presse.html` ×5 | Titre « Presse et créateurs : parler de Leonidakit » (page sur le site, comme À propos et Contact : sans « GTA 6 ») ; descriptions de 149, 147, 141, 147 et 144 signes | Tests langues, v788 ; vérificateur | validé |
| Données structurées justes | `presse.html`, accueil, informations | WebPage + Organization identique à l'accueil + BreadcrumbList ; logo = icône carrée 512 × 512 | Test v788 (Organization identique sur trois pages) | validé |
| Plan du site : page indexable, date réelle, image officielle | `presse.html` ×5 | Dans `sitemap.xml` avec Real Dimez ; images de partage exclues du plan ; date de `es/carte.html` passée au 12 sans changement de contenu pendant le travail : remise au 7 octobre | Test v788 ; comparaison des empreintes avec la base | validé |
| Maillage interne | `presse.html` | Menu « Le site », pied de page, recherche (mots presse, journaliste, logo, youtubeur…), Léo (sujet « presse », passages de la page) ; aucun lien mort | Test v788 ; `verifier.js` | validé |

## 7. Accessibilité

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Clavier, focus visible, noms accessibles | kit, boutons | Chaque lien de téléchargement a pour nom l'intitulé du fichier puis son format et son poids (« Logo, pour fond clair SVG 3 Ko », `aria-labelledby`) ; `:focus-visible` ; aperçus décoratifs `alt=""` ; lien affilié : nouvel onglet annoncé (`data-newtab`, `title`) | Test v788 (chaque lien, son intitulé) ; audit de clôture | validé |
| Contrastes AA | `presse.html`, liens affiliés | Texte encre sur papier / ambre, papier sur nuit ; au survol, poids des téléchargements et détails des liens affiliés à l'encre (`--ink-soft` sur l'ambre : 3,3:1) | Audit de clôture (0 contraste insuffisant) | validé |
| Information pas portée par la seule couleur | « Ce qui se reprend » | Deux listes titrées « Oui, librement » / « Merci d'éviter » avec pictogrammes différents (coche / interdit) | Captures | validé |
| `lang` juste | `presse.html` ×5 | `lang` de chaque langue | Test v788 | validé |

## 8. Contenu, données et confidentialité

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Rien d'inventé | `presse.html`, images de partage, Léo | Chiffres comptés par script (« pages en ligne » sans redirections ni 404) ; titres des images = balises `<title>` réelles ; libellés réels du site (ligne « Source », « Sources de ce dossier », cinq statuts) ; « en principe » pour l'aperçu des réseaux, invérifiable avant la mise en ligne ; Léo dit 178 visuels (compté) au lieu de 148 ; sujet « aperçus de la presse » repris des Actualités | Tests v788 ; relecture | validé |
| Aucun cookie, aucune ressource d'un autre site | `presse.html`, affiliation | Kit servi par le site ; liens affiliés (éteints) = simples liens, ni script ni cookie | `preuve-confidentialite.cjs` ; audit des cookies | validé |
| Nouveau flux décrit dans les Mentions avant d'exister | affiliation | Aucun flux nouveau tant que c'est éteint ; à l'activation, les trois phrases des Mentions changent seules (deux ajoutées au code reçu, qui seraient restées fausses) | Test v788 (Mentions éteintes et activées) | validé |
| Léo connaît la page, dans toutes les langues, sans capter les questions sur le jeu | Léo | Sujet « presse » (formulations liées au site), sujet « aperçus de la presse », ponts des quatre langues ; « le logo de GTA 6 », « journaliste du jeu », « interview de Lucia »… ne mènent pas au sujet presse | Jeux section-presse 100 % ×5 ; listes « hors_presse » (test v788) ; jeux complets, inédites et sections identiques à la v7.87 dans les cinq langues (voir CONTRÔLES) | validé |

## 9. Langues

| Exigence | Page / composant | Ce qui a été fait | Preuve | État |
|---|---|---|---|---|
| Cinq langues au même niveau, aucune phrase française restée | `presse.html` ×5, menu, motif, Léo, images de partage, revenus activés | `outils/langues/<code>/v788.json` ; tailles en KB (et en MB) hors français ; chiffres au format de la langue ; guillemets de chaque langue ; noms officiels gardés ; textes des revenus activés déjà traduits | 0 texte sans traduction ×4 ; extraction revenus activés ; `langues-browser.cjs` | validé |

## 10. Preuves

Voir `outils/CHANGEMENTS-v7.88.txt`, section CONTRÔLES : contrôles du socle, rapports d'écrans comparés à la base,
latence avant / après, captures et suites de captures de la page Presse, planches des images de partage.
