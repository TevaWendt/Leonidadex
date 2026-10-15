# Matrice du lot 1 bis — corrections de l’audit du 12/10/2026 (14/10/2026)

Base : v7.87. Chaque ligne : l’exigence, où, ce qui a été fait, comment c’est vérifié. « Chromium » = `outils/tests/audit-langues-browser.cjs`
(20 pages clés × 5 langues × 390 et 1 440 px, horloge simulée), contrôlé d’abord sur la v7.87 (il y relève les défauts de l’audit).

| # | Exigence | Pages | Fait | Vérifié |
|---|---|---|---|---|
| 1 | Accueil après la sortie : « GTA VI est sorti » + deux liens, cinq langues | index.html (+4 langues) | `#clock-sorti`, jalon reformulé, passage en direct à minuit | Chromium : 19 nov. 00:00:05 et 1er déc., Paris et Montréal, liens `achats.html` / `calculateurs.html` dans la langue ; lot1bis.test |
| 2 | « minuit, heure locale » sous chaque compteur ; une seule constante | accueil, fiches, carte, armurerie, collectibles, calculateur | `window.LK_SORTIE` (sync-site ← acquisitions.json), `#clock-tz`, `.fcount-tz` | lot1bis.test (une seule date dans chaque app.js) ; Chromium : texte traduit, valeurs à 23:59:50 = 0 j 00 h 00 min 10 s |
| 3 | Montants du calculateur jamais coupés | calculateurs.html | `.c-number` nowrap, case qui passe dessous | Chromium avec animations : réponse (plus petit et plus grand montant), business plan, 5 langues, 390 et 1 440 px |
| 4 | Titre animé allemand qui sort de l’écran | progression.html (de) et tous les `.sec-h` animés | `.sec-h.lk-words{flex-wrap:wrap}` | Chromium : débordement 0 (de 390) ; captures |
| 5 | Libellés allemands des fiches | 302 fiches véhicules (de) | césure en plus de la colonne de la v7.86 | Chromium : recouvrement dt/dd 0 ; captures 768 et 1 280 |
| 6 | Six régions officielles partout | carte, accueil, Léo | compteur calculé (editorial.json), libellés | Chromium : compteurs = données, identiques dans les 5 langues |
| 7 | Bouton du mode Expert sur téléphone | calculateurs.html | boutons empilés sous 600 px, chacun à sa hauteur naturelle | Chromium : boutons d’étape mesurés (trois lignes au plus ; échoue sur la v7.87 en allemand et en italien), recouvrement 0 ; captures fr/de 390 et 768 |
| 8 | Titres de fin de page : année seule | armes, carte, progression, trophées, véhicules… | `text-wrap:balance`, l’année attachée au mois (« novembre 2026 », « 19, 2026 », « de 2026 »), une coupure gardée au milieu de la date | lot1bis.test (dates dans les 6 langues, aucun bloc insécable de plus de 16 signes) ; écrans à 320 px en fr, de, en, es, it (aucun titre qui déborde) ; captures en/de 390 |
| 9 | Espace au-dessus de « Le monde de Leonida » | index.html | `#monde{padding-top:58px}` | mesure Chromium (même écart que les autres sections) ; captures |
| 10 | Pas d’espace avant « : » hors du français | calculateurs.html | `html:lang(fr)` | lot1bis.test |
| 11 | Insécable entre nombre et devise | toutes les pages, calculateur | `outils/insecables.cjs`, `dollars(n, ' ')` | Chromium : aucun nombre coupé ; lot1bis.test (glossaire allemand) ; langues.test |
| 12 | Repli neutre sans script | index.html | `#clock` = « Sortie le jeudi 19 novembre 2026 », cases dans un modèle | lot1bis.test (HTML de chaque langue) |
| 13 | Collectibles : phrase au lieu de trois « 0 » | collectibles.html | `.col-dash[data-vide]` | Chromium et lot1bis.test, 5 langues |
| 14 | Puce seule sur sa ligne | achats, progression, véhicules, fiches, calculateur | `text-wrap:balance` sur les rangées | captures en 390 et 1 280 |
| — | Contrôle automatique à chaque livraison | — | `outils/tests/audit-langues-browser.cjs` | lancé sur la v7.87 (relève les défauts) puis sur ce lot : 107/107, calculateur 113/113 |

## Exigences de qualité touchées

| Exigence | État | Preuve |
|---|---|---|
| Charte (jetons de style.css, Archivo) | tenue : nouveaux styles en jetons (`--ink`, `--amber`, `--radius-s`, `--shadow-hard`, `--dur`, `--ease-out`) | relecture de style.css |
| Mouvement : `prefers-reduced-motion`, rien de caché à l’état final | tenue : boutons de sortie sans translation en mouvement réduit ; repli visible sans script | Chromium en « réduire les animations » ; lot1bis.test |
| Mise en page : aucun débordement, rien de rogné | tenue | Chromium (5 langues × 2 largeurs), écrans 16 largeurs (identiques à la v7.87), allemand 5 largeurs, anglais, espagnol, italien à 320 et 390 px (identiques à la v7.87) |
| Latence : aucune régression | tenue | banc 4G lente × processeur ×4, base / lot en alternance, 9 tours sur la carte, l’armurerie, une fiche et le calculateur (voir CHANGEMENTS) |
| Référencement : rien réécrit pour les moteurs ; plan du site daté par le contenu | tenue : les insécables ne changent pas l’empreinte de contenu | vérificateur ; langues.test |
| Accessibilité : noms, focus, aria | tenue : liens de sortie de 44 px, focus visible | audit navigateur |
| Langues : cinq langues au même niveau | tenue : 0 texte sans traduction | extraction ; langues.test ; Chromium |
| Rien d’inventé | tenue : Léo corrigé (cinq comtés réels de la carte, pas six) | relecture des données de la carte |
