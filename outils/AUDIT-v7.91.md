# Audit complet du site — assemblage v7.87.1 → v7.91 (15 octobre 2026)

Base auditée : la v7.87 du dépôt GitHub (commit `210850a62`) + les cinq travaux réunis (passe de qualité v7.87.1, lots 3, 5, 6 et 7
avec le lot 1 bis), régénérés une seule fois en six langues (fr, en, es, it, de, pt). Chaque constat : gravité (bloquant /
important / mineur), page(s), preuve, correction ou raison de ne pas corriger. Les contrôles cités sont dans
`outils/CHANGEMENTS-v7.87.1-a-v7.91.txt` (journaux dans le dossier de contrôle livré à part).

## 0. Fusion des cinq travaux (avant l'audit)

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 0.1 | important | `carte.html` et `collectibles.html` sont des pages écrites à la main (retouchées par `sync-site.cjs`) : la fusion automatique (règle « fichiers produits : version courante ») avait perdu deux changements du lot 1 bis (« 6 régions officielles » dans le compteur de la carte ; la phrase d'attente des collectibles). | comparaison à trois voies de chaque page à la main avec chaque travail (`fusion-page.py`) : 2 lignes perdues sur 7 pages × 5 travaux | reposées à la main ; `pt/carte.html`, `pt/collectibles.html`… régénérés |
| 0.2 | important | Chaque travail avait son propre « compteur de langues » dans ses tests (`['en','es','it','de']`, `hreflang… length 6`) : faux dès que le portugais existe. | suite Node : 4 échecs (v7871, v790 hreflang) | les tests lisent `outils/langues.json` |
| 0.3 | mineur | `editions.html` : la passe de qualité a mis la page en sections numérotées (`zone()`), le lot 3 y ajoutait le bloc « Où l'acheter » dans l'ancien gabarit. | conflit `outils/gen-actus.cjs` | `monetisation.cjs → zoneEditions()` : même contenu que `blocEditions()`, sous la forme d'un élément de zone (toujours vide : affiliation éteinte) |
| 0.4 | mineur | Mentions : le lot 5 décrivait le service worker dans le texte mais n'avait pas de ligne d'historique (les lots 6 et 7 en ont une). | `outils/site-informations.json` | ligne v7.89 ajoutée, traduite dans les cinq langues |
| 0.5 | mineur | `hors-ligne.html` (secours du service worker, noindex) recevait les balises de partage que la passe de qualité donne à toutes les pages noindex. | test v789 « hors connexion » | exclue comme `404.html` dans `sync-site.cjs` |
| 0.6 | mineur | Le kit presse était rendu après la page Presse : la page affichait « 789 Ko » pour une archive de 791 Ko. | test v788 | `gen-informations.cjs` relancé après `gen-presse.cjs` (ordre à garder : régénération → presse → partage → fin de chaîne) |

## 1. Langues (six langues, toutes les pages)

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 1.1 | bloquant (avant correction) | 521 textes des lots 3, 5, 6 et de la passe de qualité n'existaient pas en portugais (extraction : 2 343 textes sans traduction après la première régénération). | `node outils/langues.cjs pt --extraire` | cinq traducteurs en parallèle (`outils/livraison/traduction/`, consignes et glossaire du lot 7) : `outils/langues/pt/trad-251.json` à `trad-255.json`, 0 problème au contrôle ; pont de Léo `pt/_leo-pont.json` : 94 expressions ; `pt/code.json` : identifiants de `transfert.js` ; extraction à `{}` dans les cinq langues |
| 1.2 | important | `pt/verification.html` : kicker « À toi » rendu « Seu » (le tien) au lieu de « Sua vez » (à ton tour). | test v7871 « relecture des langues » | `verification.html::À toi` = « Sua vez » |
| 1.3 | mineur | `pt/editions.html` : kicker « Standard ou Ultimate » laissé tel quel ; c'est aussi du portugais (« ou » = ou), les noms des éditions ne se traduisent pas. | test v7871 | test adapté pour le portugais |
| 1.4 | mineur | « 6 régions » : la carte disait « confirmées » (compteur, description, Léo), l'accueil, Lieux et les fiches « officielles ». | lecture de `carte.html`, `outils/leo-knowledge.json` | « six régions officielles » partout, cinq traductions (`assemblage-v791.json`) |
| 1.5 | — | Aucun mot français dans les pages traduites, formats des nombres, dates et sommes de chaque langue. | `langues-pages-browser` 35/35 (toutes les pages des cinq langues), `langues-browser` 2 791/2 791 (calculateur, Léo, carte, formats), `audit-langues-browser` 161/161 (28 pages × 6 langues × 390 et 1 440 px) | — |
| 1.7 | important | « GTA 6 » / « GTA VI » se coupe encore en fin de ligne dans les titres et les questions hors du périmètre de la passe de qualité (missions, codes, trophées… : 25 pages en allemand et en espagnol, 33 en portugais, et les pages d'actualités en portugais : la mémoire de traduction normalise l'espace insécable, la traduction la perd). | test v7871 « relecture des langues » (pt/actus.html) ; balayage des h1/h2/h3/summary des six langues | `outils/insecables.cjs → insecablesTitres()` appliqué à toutes les pages (françaises par `sync-site.cjs`, traduites par `langues.cjs`) : « GTA 6 » insécable dans tous les titres et questions, six langues |
| 1.6 | — | Clés de mémoire en conflit : aucune (chaque travail a son fichier `v7xxx.json` ; l'assemblage a le sien, `assemblage-v791.json`). Les mémoires anglaise et allemande de Léo (`leo-pivot.json`) et les ponts es/it/pt ont été fusionnés entrée par entrée (fusion à trois voies, aucune perte). | diff des fichiers contre la base : ajouts seuls | — |

## 2. Référencement

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 2.1 | important | `atelier-3d.html` : description de 235 signes (249 en allemand, 227 en italien, 219 en espagnol, 217 en anglais) pour 155 au plus. | `audit-seo.py` (2 797 pages) | description réécrite (`outils/gen-atelier.cjs`) et traduite : 168 → 143–164 signes selon la langue, voir 2.3 |
| 2.2 | important | `pt/devine-le-lieu.html` : description de 161 signes (page nouvelle). | idem | phrase portugaise raccourcie (154) |
| 2.3 | mineur | 56 autres pages indexables ont une description de 156 à 164 signes (18 en français : carnets, demeures/jason-keys, armes/mustang-357, collectibles… ; le reste dans les traductions, plus longues que le français). Google tronque vers 155–160 : l'effet est une coupure en fin de phrase, pas une perte de sens. Corriger demande de réécrire chaque description dans ses six langues. | `audit-seo.py` | non corrigé ici ; liste dans le dossier de contrôle (`audit-seo.txt`) pour le lot 8, qui réécrit justement les pages pour Google. Les descriptions de l'Atelier 3D restent entre 158 et 164 signes en en/es/it/de : à raccourcir avec le lot 8 |
| 2.4 | mineur | Titres de `es/` et `pt/` `calculateurs.html` et `progression.html` : 73 à 77 signes (65 visés). | idem | traductions raccourcies (57 à 67) |
| 2.5 | — | Titres et descriptions présents et uniques par langue (les quatre pages « Fiche retirée » partagent les leurs : noindex), un seul `h1`, canonique = adresse, hreflang réciproques dans les six langues (`pt` compris, `x-default` = anglais), noindex cohérent avec les plans du site (aucune page indexable absente, aucune page noindex présente), JSON-LD valide partout, image de partage sur toutes les pages hors 404 et redirections, 0 lien interne mort (431 562 références vérifiées), 0 page orpheline. | `audit-seo.py`, `outils/verifier.js`, test v7871 | — |

## 3. Mise en page et alignements

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 3.1 | important | Textes sous 11 px : pastilles de statut des cartes de véhicules et d'armes (`veh-st`, `veh-ed`, `arm-slot`), de la carte (`tr-st`, `mp-kid-st`, compte des épingles `mk-dot i`, étiquettes `mk-lbl` aux petits zooms), des collectibles (`col-dash-st`, `col-fam-st`, `col-eyebrow`, `col-backup-fine`), des animaux (`ed-st`), des activités (`lkx-chip small`), des catalogues (`cg-media-l`, `cg-st`, `rk-gta6-k`), des cartes des sections (`lkx-card-tag`), de la légende des cartes des régions (`mo-map-cap`), de l'indication « angle suivant » des dessins (`ang-hint`). Signalées « connues » depuis la v7.85 (le contrôle des écrans n'en montre qu'une par page) ; la règle est 11 px au moins. | `ecrans-browser` : 159 signalements « petit » en français sur la v7.87, 47 en allemand | `font-size:max(11px,…)` dans `style.css`, `fiches.css`, `acquisitions.css`, `collectibles-brand.css`, `collectibles.css`, `animaux.css`, `monde.css`, `lk-sections.css`, `outils/templates/vehicules.html`, `vehicules-rares.html`, `armes.html` : 0 signalement « petit » en français, en allemand et en portugais |
| 3.2 | — | 0 débordement horizontal, 0 texte rogné à 16 largeurs en français (71 pages, 1 136 chargements), à 5 largeurs en allemand et en portugais (68 pages chacun) ; les autres signalements (rangées : 55, mots longs : 32, coquilles : 24, « cartes hors du conteneur » des galeries qui défilent : 37) sont exactement ceux de la base v7.87 (rapport de la v7.87 refait le même jour, comparé ligne à ligne : seuls les « petits textes » changent, en moins). | `ecrans-browser` fr / de / pt, `comparer-ecrans.py` (dossier de contrôle) | — |
| 3.3 | — | Les douze points de l'audit du 12 octobre (compte à rebours, montants, titres animés, bouton Expert, régions, dates insécables, espace de « Le monde de Leonida », ponctuation, repli sans script, collectibles, puces) sont tenus dans les six langues, à 390 et 1 440 px, avec une horloge simulée à sept dates (14 octobre, 2 novembre, 11 novembre 23:59:50, 12 novembre 00:00:05, 18 novembre 23:59:50, 19 novembre 00:00:05, 1er décembre ; Paris et Montréal). | `audit-langues-browser` 161/161 (28 pages, pages nouvelles comprises) | — |

## 4. Mouvement et effets

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 4.1 | — | Apparitions, survols, « réduire les animations » et sans script conformes sur les pages de la passe de qualité (324 chargements : 0 bloc caché, 0 non entré, 0 premier écran caché), le jeu (143 contrôles), le Mode compagnon (41) ; rien qui bouge sous la souris dans une carte qu'on lit (audit de clôture : 114 cartes survolées, 0 floue). | `v7871-browser`, `v790-browser`, `v789-browser`, `audit-site-browser` | — |

## 5. Latence

Banc `outils/tests/latence-browser.cjs` (lot 5) : Chromium, téléphone 390 px, 4G lente (150 ms, 1,6 Mbit/s), processeur ×4, à froid
(contexte neuf) et à chaud (seconde visite, service worker actif pour l'assemblage), v7.87 (A) et assemblage (B) en alternance, 4 tours,
médianes. Premier affichage (FCP) et page chargée (load), en ms :

| Page | A froid FCP / load | B froid FCP / load | A chaud FCP / load | B chaud FCP / load |
|---|---|---|---|---|
| index.html | 1 052 / 1 571 | 1 120 / 1 479 | 636 / 1 223 | 628 / 1 253 |
| carte.html | 1 136 / 2 318 | 1 080 / 2 206 | 416 / 1 954 | 448 / 1 847 |
| calculateurs.html | 1 176 / 2 289 | 1 172 / 2 228 | 676 / 2 204 | 668 / 1 983 |
| vehicules.html | 1 056 / 2 196 | 1 044 / 2 153 | 604 / 2 099 | 632 / 2 061 |
| vehicules/grotti-cheetah-classic.html | 936 / 1 544 | 948 / 1 565 | 332 / 1 005 | 520 / 1 067 |
| armes.html | 996 / 1 802 | 1 000 / 1 776 | 472 / 1 435 | 568 / 1 650 |
| lieux.html | 800 / 1 692 | 820 / 1 697 | 436 / 1 367 | 448 / 1 424 |
| missions.html | 1 112 / 1 799 | 1 176 / 1 897 | 520 / 1 593 | 540 / 1 362 |
| radios.html | 1 164 / 1 821 | 1 148 / 1 907 | 640 / 1 471 | 616 / 1 626 |
| actus.html | 1 032 / 1 720 | 972 / 1 534 | 496 / 1 306 | 500 / 1 020 |
| editions.html | 940 / 1 350 | 864 / 1 454 | 520 / 862 | 552 / 821 |
| progression.html | 956 / 1 990 | 1 080 / 2 141 | 560 / 1 107 | 524 / 1 052 |
| atelier-3d.html | 992 / 2 411 | 1 036 / 2 309 | 416 / 1 319 | 404 / 1 306 |
| a-propos.html | 1 124 / 1 541 | 980 / 1 945 | 596 / 1 404 | 524 / 1 261 |
| mentions-legales.html | 964 / 1 523 | 968 / 1 533 | 476 / 967 | 500 / 1 056 |
| de/index.html | 1 072 / 1 521 | 976 / 1 497 | 620 / 1 073 | 564 / 1 097 |

Écarts dans le bruit du banc (±100 ms, les deux sens) : aucune régression. Les octets « à froid » de B sont plus élevés
(+60 Ko, +240 Ko sur l'À propos) : c'est le service worker qui télécharge sa réserve après le chargement, pas la page (poids
des pages identique : a-propos.html 11,7 → 12,0 Ko compressés). Pages nouvelles (froid FCP / load, 2 tours) : presse.html
940–1 064 / 1 453–1 547 ; compagnon.html 828–892 / 1 465–1 483 ; devine-le-lieu.html 864–888 / 1 606–1 697 ; pt/index.html
1 024–1 212 / 1 568–1 593 ; pt/calculateurs.html 1 052–1 248 / 2 125–2 515 : au niveau des pages du même type (À propos,
Lieux, accueil, calculateur français). Service worker : sa version est réécrite à chaque synchronisation (`outils/appli.cjs`),
les anciens caches sont purgés à l'activation : aucune page périmée après un déploiement.

## 6. Accessibilité

`outils/tests/audit-axe-v791.cjs` (axe-core, WCAG 2.x A/AA, 35 pages × fr et de + 9 pages nouvelles en pt, 390 et 1 280 px) ; audit
de clôture : 11 660 contrastes vérifiés, 0 échec ; cibles de 24–44 px : 0 manquante ; Léo et le calculateur au clavier
(`langues-browser`, `audit-site-browser` « Fonctions 12/12 »).

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 6.1 | important | Barre « Changer la langue » (toutes les pages, depuis la v7.60) : `aria-label="Changer la langue (Français)"` ne contenait pas le texte visible « Changer la langue FR » (WCAG 2.5.3, « label in name » : un utilisateur de commande vocale ne peut pas nommer le bouton). | axe `label-content-name-mismatch` (serious) sur 158 cas | `outils/langues.cjs → langBar` : plus d'aria-label ; nom = texte visible + nom de la langue en texte masqué (« Changer la langue FR (Français) ») |
| 6.2 | important | Bouton « angle suivant » des dessins des fiches (`.ang-view`, v7.80) : `aria-label="Angle suivant"` contre le texte visible « Profil 1/4 Cliquer : angle suivant ». | axe, fiches véhicules et armes | `outils/angles-markup.cjs` : nom = contenu du bouton (angle, compteur, indication) ; test v780 adapté |
| 6.3 | important | Calculateur, bouton « Mes calculs 0 » : `aria-label` posé par `calculateurs-workspace.js` sans le texte visible. | axe, `#calc-saved-open` | le nom commence par le texte visible, puis le détail (calculs et plans enregistrés) |
| 6.4 | important | Carte, pastilles qui regroupent des lieux (« 180 Port Gellhorn ») : `aria-label` = nom seul. | axe, `carte.html` | `carte.js` : aria-label gardé seulement sans compte d'enfants (le nom vient du contenu sinon) |
| 6.5 | mineur | `collectibles.html` : `aria-label` sur un `div` sans rôle (interdit). | axe `aria-prohibited-attr` | `role="region"` |
| 6.6 | mineur | Cibles de moins de 24 × 24 px (WCAG 2.5.8) : les visages des personnages sur Lieux (empilés avec 8 px de recouvrement : 22 px restaient cliquables). | axe `target-size`, `lieux.html` 390 et 1 280 px | `monde.css` : recouvrement de 6 px (24 px cliquables) |
| 6.7 | mineur, non corrigé | Cibles signalées par axe mais couvertes par une exception de WCAG 2.5.8 ou propres à une carte : liens des sources dans leur liste (liens en ligne dans du texte, lignes serrées : 6 cas sur 4 pages), un lien du pied de page en allemand qui passe sur deux lignes (`de/videos/trailer-2.html` à 390 px), une épingle de région de la carte à 390 px recouverte par une voisine au zoom initial (les épingles font 25 px au moins ; pincer la carte les sépare). | axe `target-size` : 9 cas sur 316 chargements, aucune autre violation sérieuse ou critique | laissé tel quel (voir ci-contre) |

## 7. Fonctions

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 7.1 | important | Léo : « c'est quoi le mode compagnon ? » → « je n'ai pas cette réponse » alors que la page existe. | `leo-ask.cjs` (23 questions libres en français) | sujet `mode-compagnon` (10 formulations), traduit dans les cinq langues, ponts et pivots complétés (companion mode, Begleitmodus, modo compañero, modalità companion, modo companheiro) |
| 7.2 | important | Léo : « quelles voitures ont été confirmées ? » → les armes nommées. | idem (déjà signalé par le lot 7) | sujet `vehicules-confirmes` (statuts officiel / vu / communauté, sans chiffre qui se périme), cinq langues, ponts |
| 7.3 | mineur | Léo : « ça vaut le coup d'acheter le Kosatka ? » → « Tu voulais dire… ? » avec une coupe de cheveux (« coup » ≈ « coupe »). | idem (déjà signalé par le lot 7) | formulations « ça vaut le coup d'acheter… » sur le sujet `site-roi` ; ponts et pivots (is it worth buying, lohnt es sich, vale la pena…) |
| 7.4 | — | Calculateur (huit calculs, business plan, chaque mode, six langues : montants, mots reconnus), recherche du site, carte, carnets et progression (export, import, transfert), contact (motifs, dont « Presse ou partenariat »), mini-jeu, lecteurs au clic. | `langues-browser` 2 791, `audit-site-browser` Fonctions 12/12, `v789-browser`, `v790-browser`, `v788.test` | — |

## 8. Confidentialité et sécurité

| # | Gravité | Constat | Preuve | Correction |
|---|---|---|---|---|
| 8.1 | — | Aucun cookie (17 pages), aucune requête vers un autre site, aucun en-tête Set-Cookie ; preuve de confidentialité tenue ; Mentions à jour (service worker, écran allumé, transfert, jeu, portugais, kit presse ; « aucun lien d'affiliation » tant que `monetisation.json` est éteint) ; CSP de `vercel.json` identique à la v7.87 ; `api/` : `contact.js` (motif presse, validation inchangée), `ia.js` (portugais), `ia-achat.js` supprimé. | `audit-cookies.cjs`, `preuve-confidentialite.cjs`, diff de `vercel.json` | — |

## 9. Exactitude du contenu (revérifié le 15 octobre 2026)

| # | Constat | Source |
|---|---|---|
| 9.1 | Sortie le 19 novembre 2026 : inchangée. Le 13–14 octobre, la presse a repris les mots de Rob Nelson (Rockstar North) à Famitsu — le jeu « sortira à la date prévue » — : c'est l'entretien d'août déjà cité par le site (« aperçus de la presse »), pas une annonce nouvelle. | ixbt.games, KeenGamer (13–14/10/2026), OpenCritic |
| 9.2 | Aucune annonce officielle de Rockstar entre le 8 octobre (six stations de radio, dernière annonce du site) et le 15 octobre ; la presse spéculait sur une annonce « le 15 octobre » d'après le rythme habituel, sans confirmation. | Game Rant / OpenCritic (12/10/2026) |
| 9.3 | Préchargement le 12 novembre, bonus de précommande jusqu'au 20 novembre, éditions Standard (79,99 €) et Ultimate (99,99 €), version en boîte avec un code : inchangés depuis l'article d'assistance de Rockstar (18 août 2026) cité par `editions.html`. | `outils/actus/actus.json`, sources des pages |
| 9.4 | Jeu « Devine le lieu » : les 40 images sont celles que Rockstar range lui-même par région sur sa page des captures ; aucune donnée des fuites. | `outils/devine/devine.json`, génération qui refuse toute image mal rangée |

## 10. Ce qui reste (et pourquoi)

- Descriptions de 156 à 164 signes (§ 2.3) : à faire avec le lot 8, qui réécrit les pages pour Google.
- Léo, pages des radios : quatre questions du jeu de test échouent dans toutes les langues depuis la v7.87 (signalé par le lot 7, hors du seuil des tests) ; à reprendre avec la base de connaissances des radios.
- Discord et AdSense (plan de lancement) : rien à faire sans le lien d'invitation et l'identifiant `pub-…` de Téva.
- Pages des fiches sans contenu propre : toujours en `noindex, follow` (règle de la v7.86), elles reviennent dans le plan du site avec le jeu.
