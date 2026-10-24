# Rapport d’exécution v8.06 — corrections des deux audits du 23 octobre 2026

Base : dépôt GitHub `TevaWendt/Leonidadex`, commit `2a49067` (v8.05), identique au site en ligne et au commit audité par les deux
rapports. Travail en copie isolée ; rien n’a été poussé, déployé, envoyé (Contact, Brevo, IndexNow) ni consommé (IA).

Statuts : **corrigé et vérifié** · **déjà corrigé et vérifié** · **partiellement traité** · **non applicable (preuve)** ·
**non vérifié** · **reste à traiter** (avec la raison).

Les tests cités sont dans `outils/tests/v806-audit.test.cjs` sauf mention ; « Chromium » = captures et mesures Playwright du dossier
de contrôle (`captures/apres-*.png`, `apres-mesures.json`, et `avant-*` sur la v8.05 pour comparer).

## 1. Audit du code et du site publié (12 anomalies, 3 risques, 2 améliorations)

| ID | Statut | Cause confirmée | Fichiers changés | Preuve / test | Risque résiduel |
|---|---|---|---|---|---|
| CALC-001 | corrigé et vérifié | boucle de point fixe bornée à 24 tours, sans test de convergence ; `extra` fondé sur l’itération précédente | `outils/sources/calculateurs-scenario.js` (goalBase) → `calculateurs-scenario.js` et ses 5 copies traduites | test « CALC-001 » : 0/50/90/99 $ → 9/18/90/900 parties, capital final 1 000 $ ; 100, 101, 250 $ → inatteignable ; objectif déjà atteint ; réserve + dépense prévue ; deux missions par partie. Suites `calculateurs-*` rejouées (voir LISEZ-MOI) | faible : même résultat qu’avant quand la boucle convergeait (0 et 50 $ identiques) ; un gain net très petit donne un grand nombre de parties, toujours exact |
| CALC-004 | corrigé et vérifié | `calculation()` appelait `E.goal` avec objectif + réserve | `outils/sources/calculateurs.js` | test « CALC-004 » (statique) ; vérification jsdom par les suites du calculateur ; les cartes affichent maintenant 18 h avec 50 $ de dépenses par partie, comme « Ma réponse » | modéré : classement « le plus rapide » recalculé avec les mêmes paramètres que la réponse ; une activité inadmissible affiche « Pas possible » avec la raison du scénario |
| CALC-002 | corrigé et vérifié | parseur de repli sans séparateurs de milliers | `outils/sources/calculator-entry.js` | test « UX-02 / CALC-002 » (six accueils, sans moteur puis avec) ; Chromium 360 px : réponse « 8 h » sans geste | faible : chargement du moteur en tâche de bord après `load` (48 Ko compressés) ; désactivé avec Save-Data |
| CALC-003 | corrigé et vérifié | contrôle minCash avant/après l’achat de départ selon l’API | `outils/sources/calculateurs-engine.js` (goalMixed + contrat documenté) | test « CALC-003 » : 160 combinaisons, 0 divergence ; cas de l’audit admis | faible : contrat = argent détenu avant de payer frais et achat de départ (ce que goal, inverse, sessionPlan et missionPlan faisaient) |
| ARCH-01 | corrigé et vérifié | `body.slice(0, mid)` coupait une paire de substitution | `outils/sources/contact.js` | test « ARCH-01 / ARCH-02 » : 500 emoji, six langues, lien ≤ 1 800 et décodable, brouillon écrit | faible |
| ARCH-02 | corrigé et vérifié | comparaison du libellé traduit au lieu de la valeur | `outils/sources/contact.js` | même test : motif « Suggestion de contenu » restauré sur les six pages | nul : ancien brouillon à libellé encore reconnu |
| SEO-001 | corrigé et vérifié | adresse pré-échappée puis `esc()` une seconde fois | `outils/gen-pages-elements.cjs`, `outils/gen-pages-elements-b.cjs` | test « SEO-001 » : 0 `&amp;amp;` sur > 20 000 pages par élément ; les deux liens de `consommables/sprunk.html` identiques | faible |
| SEO-003 | corrigé et vérifié | aucun lien ordinaire vers les sept sommaires | `outils/gen-acquisitions.cjs` (indexLinks) | test « SEO-003 » : les 7 sommaires × 6 langues reçoivent un lien depuis style.html / personnalisations.html (pages atteignables depuis l’accueil) | faible |
| CONTENT-001 | corrigé et vérifié | textes d’état déduits de `items.length` seul | `outils/gen-collectibles.cjs` | test « CONTENT-001 » : aucune négation de collection, Wyman cité dans l’état et le résumé, six langues | faible : texte conditionné à la présence d’une famille `col-fam--confirme` dans le hub |
| I18N-01 | corrigé et vérifié | mémoire it/es/pt sans la précision | `outils/langues/{it,es,pt}/…` | test « I18N-01 » | nul ; aucune configuration Brevo touchée |
| SEO-002 | corrigé et vérifié | indicateurs constants des familles véhicules/armes | `outils/couverture-pages.cjs` | `node outils/couverture-pages.cjs --json` : véhicules 54 indexables sur 302 (248 noindex), armes 18 sur 27 (9) = les 257 écarts expliqués ; aucune directive changée | nul |
| UI-001 | corrigé et vérifié | liens concaténés sans séparation | `outils/sources/carte.js`, `outils/sources/carte-page.css` | test « UI-001 » ; Chromium 390 px : trois lignes de 40 px et plus, un lieu par ligne | faible |
| ARCH-R01 | partiellement traité (durci) | repli mémoire quand la base est en panne | `api/ia.js` | test « ARCH-R01 / ARCH-R02 » : base en panne → 503 « compteur », 0 appel amont | la configuration de production reste à vérifier par l’éditeur (Upstash relié : `etat` renvoie `base:true`) |
| ARCH-R02 | corrigé et vérifié | 18 s serveur > 15 s page, pas de délai sur la base | `api/ia.js` | test ; `TIMEOUT_MS=13000`, `KV_TIMEOUT_MS=2500` | un appel que le serveur abandonne peut être facturé par le fournisseur ; la limite de dépense de la Console reste le filet |
| ARCH-R03 | partiellement traité (durci) | autorisation par User-Agent sans secret | `api/indexnow.js` | test « ARCH-R03 » : production sans secret → 401 | l’éditeur doit vérifier que `CRON_SECRET` est défini dans Vercel (sinon la tâche du matin est refusée et le journal le dit) |
| ARCH-O01 | reste à traiter | — | — | voir PERF-01 | chantier de mesure à part |
| REC-SEO-01 | partiellement traité | gabarits traduits plus longs que le français | `outils/langues/*/elements/v797.json` | descriptions des 3 244 pages de lieux raccourcies dans les 5 langues : 751 → 126 descriptions > 160 signes sur les pages indexables (voir SEO-03) | 126 descriptions et 78 titres > 65 restent : relecture éditoriale, pas de coupe automatique |

## 2. Audit forensique intégral (31 anomalies)

| ID | Statut | Fichiers changés | Preuve / test | Remarque |
|---|---|---|---|---|
| NAV-01 | corrigé et vérifié | `outils/sources/style.css`, `outils/sources/app.js` | test « NAV-01 » ; Chromium 360×640, 390×664, 390×844, 412×915 avec bandeau de langue : dernier lien visible après défilement du menu, et au clavier | desktop (≥ 1 081 px) inchangé |
| UX-01 | corrigé et vérifié | `outils/sources/leo-loader.js`, `outils/sources/style.css` | test « UX-01 » ; Chromium : même coin sur 10 pages, mobile et desktop (mesures `apres-mesures.json`) | un cran de 70 px reste permis au-dessus d’un élément cliquable (résumé collant du calculateur) |
| UX-02 | corrigé et vérifié | voir CALC-002 | | |
| VIS-03 | corrigé et vérifié | `outils/sources/calculateurs.js`, mémoires `v806-audit.json` | test « VIS-03 » ; Chromium 360 px : chaque option ≤ largeur − 48 px | cadre du calculateur réinstantané |
| SEO-01 | reste à traiter (décision) | — | — | indexer 260 fiches véhicules « à confirmer » est un choix éditorial (voir § 4) |
| SEO-02 | non retenu | — | — | sitemap.xml (17,7 Mo, 17 088 URL) est sous les limites ; un index de sitemaps impose de resoumettre dans Search Console et Bing ; à faire le jour où le volume l’exige |
| SEO-03 | partiellement traité | mémoires `elements/v797.json` | gabarits traduits des descriptions des lieux de la carte raccourcis (EN, DE, IT, ES, PT) : pages indexables avec description > 160 signes : 751 → 126 (EN 617 → 17) ; titres > 65 : 78, inchangés | les 126 descriptions et 78 titres restants (allemand et italien surtout) demandent une relecture par page, pas une coupe automatique |
| SEO-04 | corrigé et vérifié | `outils/actus/actus.json`, mémoires | test « RED-01 / RED-02 / SEO-04 » | règle du suffixe « \| Leonidakit » laissée telle quelle (retiré seulement quand le titre dépasse 65 signes : documenté dans LANGUES.md) |
| SEO-05 | corrigé et vérifié | `outils/sync-site.cjs` | test « SEO-05 / SEO-06 / SEO-08 » | |
| SEO-06 | corrigé et vérifié | `outils/langues.cjs`, `outils/langues-elements.cjs`, `outils/tests/langues.test.cjs` | idem ; 0 page avec `<a aria-current="true"` sur les 26 731 | la langue courante devient cliquable (lien vers la page elle-même) : un clic enregistre la langue courante comme préférence, sans effet visible |
| SEO-07 | corrigé et vérifié | `vercel.json` | test « SEO-07 » ; à contrôler après mise en ligne : `curl -I https://www.leonidakit.com/calculateurs` → 308 puis 200 | `cleanUrls` non activé |
| SEO-08 | corrigé et vérifié | `calculateurs.html`, `collectibles.html` | idem | |
| PERF-01 | reste à traiter | — | — | minification réelle, chargement différé des modules du calculateur, découpe de carte-gtadb.js, scission de style.css : chantier à part avec Lighthouse avant/après (voir § 4) |
| PERF-02 | reste à traiter | — | — | hub Véhicules allégé : touche les filtres, les ancres et la recherche ; à faire avec PERF-01 |
| VIS-01 | reste à traiter (décision) | — | — | mettre le champ « Chercher » dans tous les en-têtes change la charte et la hauteur de l’en-tête mobile |
| VIS-02 | corrigé et vérifié | `outils/sources/radios.css` | test « VIS-02… » ; Chromium : « 2023, 1 morceau » | |
| VIS-04 | corrigé et vérifié | `outils/sources/style.css` | test | mouvement réduit : déjà `opacity:1` |
| RED-01 | corrigé et vérifié | `outils/langues/pt/v794.json` | test | |
| RED-02 | corrigé et vérifié | `outils/informations-editorial.json`, `outils/leo-knowledge.json`, mémoires | test | |
| RED-03 | partiellement traité | `index.html`, mémoires | « L’édition Standard » dans la FAQ | « l’édition Ultimate » après un article est du français correct : pas imposé en « Édition » partout (596 occurrences) |
| RED-04 | non applicable (preuve) | — | — | « 1 206 tests automatisés écrits » (appels `test(` comptés par sync-site.cjs) et « 1 296 tests réussis » (sous-tests exécutés) mesurent deux choses, chacune exacte et étiquetée ; la date « relue le 1er octobre » est celle de la vérification de la date de sortie (`acquisitions.json → game.checkedAt`) |
| TECH-01 | reste à traiter | — | — | suppression de 60 pages de redirection et de collectibles-motion.js : lot à part avec liste de suppressions (règle de livraison), tests `v791` à adapter |
| TECH-02 | corrigé et vérifié | `README.md` | commande complète ; suites lourdes signalées | |
| TECH-03 | plan (§ 5) | — | — | |
| SEC-01 | partiellement traité | `api/ia.js`, `api/contact.js` | test « SEC-01 / SEC-02 » | Turnstile non ajouté (compte Cloudflare, clés, CSP) ; e-mail d’alerte au plafond ajouté |
| SEC-02 | corrigé et vérifié | `api/ia.js` | test | définir `LK_IA_SEL` dans Vercel |
| A11Y-01 | corrigé et vérifié | `outils/catalogues.cjs`, `outils/gen-recherches.cjs`, `classement.css`, `compagnon.css`, `acquisitions.css`, `style.css`, `armes.html` | test | liens de sources : le titre de la source passe en `title` (description), le nom accessible redevient le texte visible « source 1 » (WCAG 2.5.3 satisfait sans nouvelle chaîne à traduire) ; les gris mesurés sur medias.html (#84838a, #ca6557) ne sont pas dans les feuilles : relevés pendant l’animation d’entrée (opacité en transition) |
| PWA-01 | reste à traiter | — | — | pt-BR dans lang/hreflang/sitemap touche langues.cjs, tests, Léo, api/ia.js ; captures du manifeste à produire |
| UX-04 | reste à traiter (décision) | — | — | « Atelier 3D » au menu et Progression dans un nouvel onglet sont des choix de l’éditeur |
| DATA-01 | partiellement traité | `outils/gen-pages-elements-b.cjs` | plus aucun lien visible vers `codes-de-triche/modele.html` | la page reste générée (aperçu du gabarit, noindex) |
| UX-05 | corrigé et vérifié | `outils/gen-tuto.cjs`, `outils/sources/tuto.js`, `outils/sources/tuto.css` | test « UX-05 » ; Chromium 390 px après 9 000 px de défilement : barre collante, « Chapitre N sur 16 » | |

## 3. Ce qui est conservé tel quel

Sauvegardes et carnets (clés, formats, migrations v5), les huit calculs et le business plan, les trois modes, la distinction des
données (officiel, vérifié, personnel, inconnu, simulation), noindex et sitemaps (aucune page basculée), `x-default` anglais,
canoniques et alternates, CSP et en-têtes, service worker, charte (jetons, animations, mouvement réduit), accordéon des hubs,
effacement du bouton Léo au défilement, URL de toutes les pages (les redirections 308 s’ajoutent, aucune ne change).

## 4. Décisions à prendre par l’éditeur (rien n’a été changé)

1. **SEO-01** : indexer dès maintenant les fiches véhicules qui ont une rédaction propre et un visuel (260 pages noindex aujourd’hui,
   au titre de « pas assez d’informations réelles »), ou garder noindex jusqu’au jour J. Avis : indexer celles qui ont un visuel
   officiel et le texte rédigé, garder noindex les autres ; la règle se paramètre dans `gen.js` (seuil de mots, visuel).
2. **VIS-01** : un seul en-tête avec le champ « Chercher » partout (icône seule au téléphone). Avis : oui, mais à faire avec une
   capture à 1 081–1 300 px avant de valider.
3. **UX-04** : garder « Atelier 3D (en construction) » dans le menu principal ? Garder Progression dans un nouvel onglet ?
4. **PERF-01 / PERF-02** : chantier performance (minification réelle, modules du calculateur différés, carte découpée, hub Véhicules
   allégé) avec Lighthouse mobile avant/après sur la production : lot à part, le plus utile après celui-ci.
5. **Variables Vercel à poser** : `LK_IA_SEL` (aléatoire), `CRON_SECRET` (si absent, IndexNow est refusé en production depuis cette
   version), `LK_ORIGINES` (seulement si une prévisualisation Vercel doit appeler l’IA ou le formulaire).

## 5. TECH-03 — plan (non exécuté)

Objectif : un seul exemplaire de chaque script, les textes dans un dictionnaire par langue (`lk-i18n-<code>.json`), au lieu de
61 scripts traduits par langue (≈ 18 Mo, cache navigateur non partagé). Étapes : (1) inventaire des scripts réellement différents
entre langues (`cmp`), les scripts identiques sortent du dossier de langue en premier (données : `carte-gtadb.js`,
`vehicules-data.js`, `search-*`) ; (2) `langues.cjs` produit, pour chaque script à textes, le dictionnaire des chaînes qu’il
traduit aujourd’hui (la mémoire existe déjà, par fichier) ; (3) un module `lk-i18n.js` chargé avant les scripts expose `t(fr)` ;
les scripts remplacent leurs chaînes par `t('…')` module par module, en commençant par les plus petits (contact.js, calculator-entry.js)
avec `langues.test.cjs` et `leo-eval` comme filet ; (4) les pages traduites chargent `/<script>.js` + `/<code>/lk-i18n.json`.
Gain estimé : 15 Mo de dépôt, un seul cache par script, une correction propagée sans régénérer cinq copies. Risque élevé si fait
d’un coup : un module par lot.

## 6. Limites de cette livraison

- Les 15 largeurs demandées par l’audit n’ont pas toutes été capturées : les corrections mobiles ont été vérifiées à 360, 390
  (deux hauteurs), 412 et 1 440 px ; les pages non touchées n’ont pas été recapturées.
- Aucun Lighthouse, Core Web Vital ni donnée Search Console : rien de tel n’est affirmé ici.
- Les suites `coverage`, `catalogues-v750`, `v786`, `v788` et `langues` ont été lancées avec 4 Go de tas (voir LISEZ-MOI) ; ce qui
  n’a pas pu être rejoué dans l’atelier est dit « non vérifié ».
- La configuration de production (Upstash, CRON_SECRET, LK_IA_SEL) n’est pas visible d’ici : à vérifier par l’éditeur.
