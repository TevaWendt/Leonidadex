# Preuves — v7.57, lot 4 (À propos, mentions légales et cookies), 1er octobre 2026

Base : dépôt GitHub `TevaWendt/Leonidadex`, commit `2eb945f` « Delete img/leonida-silhouette.svg » (= v7.56 du lot 3 + la suppression
demandée ; 0 différence entre le commit `628c82d` et l'archive du lot 3). Environnement : Node 22.22, Chromium 141 (Playwright),
serveur statique local. Rien n'a été publié.

## 0. Artefacts

| Vérification | Résultat |
|---|---|
| Archive lot 3 (`LeonidaKit_v7.56_Lot3_Modifications.zip`, 429 fichiers) contre le commit `628c82d` | 0 différence |
| Commit `2eb945f` | = `628c82d` moins `img/leonida-silhouette.svg` (suppression demandée en v7.55, faite) |
| Tests du dépôt sur `2eb945f` tel quel | 624 / 624 |
| Travail ChatGPT du lot 4 (`LeonidaKit_v7.57_Lot4_Rapport.html`, `LeonidaKit_v7.57_Lot4_Modifications.zip`) | lu et comparé (mêmes conclusions de fond ; voir § 6), non appliqué |

## 1. ABOUT-01 — aucun prénom

| Contrôle | Résultat |
|---|---|
| `a-propos.html` : texte visible, `title`, `meta`, JSON-LD, `alt`, `aria-label`, `title=`, commentaires (HTML complet) | 0 occurrence (regex `/t[ée]va/i`) |
| Base de Léo : `leo-index.json`, `leo/*.json`, `outils/leo-knowledge.json` (texte **et** déclencheurs) | 0 occurrence ; avant : 3 déclencheurs servis en clair dans `leo-index.json` |
| Les 415 pages et les fichiers JS/JSON servis | 0 occurrence (seuls `outils/tests/*` — assertions négatives — et `outils/SUIVI-MISSION.md` — nom du dépôt GitHub — contiennent la chaîne ; `outils/` n'est pas déployé) |
| Section « Qui » | kicker « Le projet », signature « Un joueur, un site », « fait par un seul joueur, sur son temps libre », « Pas d'équipe, pas de société, pas de sponsor », renvois Mentions et Contact ; ancre `#qui`, carte « Aller à la page Contact » et mise en page inchangées (captures `avant/a-propos-qui.png` → `apres/lot4/a-propos-qui-1280.png`, `-390.png`) |
| Réponse de Léo « Qui est derrière Leonidakit ? » | même sens, aucun nom, renvoie à `/a-propos.html#qui` et `/contact.html` |
| Test | `a-propos-v744.test.cjs` : section sans prénom, signature, rédaction centrée sur le projet, Léo sans prénom |

## 2. ABOUT-02 — apparitions

| Contrôle (Chromium 1280 px sauf mention) | Avant (`2eb945f`) | Après (v7.57) |
|---|---|---|
| Éléments animés dans la page | 14 (9 sections `reveal`, 3 étapes, la pile de l'en-tête, la FAQ en bloc `rise`) | 44 (les 9 sections + 35 blocs `lk-reveal` : 9 colonnes, 5 niveaux, 8 figures, 3 cartes d'action, signature en entrée latérale, 5 questions de la FAQ une par une, 3 étapes, pile) |
| Mécanisme | LKMotion (lot 1) | LKMotion, mêmes règles de `style.css` (translation 18 px, opacité, 450 ms, vagues 60 ms plafonnées à 300 ms) ; aucune règle ni script propre à la page (vérifié : la feuille ne contient pas « a-propos ») |
| Blocs hors écran avant défilement | — | opacité 0 et translation 18 px ; ceux de l'écran visibles tout de suite |
| Défilement par pas de 500 px | — | le compte de blocs apparus monte à chaque pas ; 35 / 35 `is-in` et opacité 1 à la fin ; `--lk-delay` posés |
| `prefers-reduced-motion: reduce` | — | 0 bloc décalé, 0 bloc masqué (tout visible sans attendre) |
| Sans JavaScript | — | 35 / 35 visibles (pas de classe `js`) |
| 390 px (mobile, tactile) | — | 0 erreur JS, aucun débordement horizontal, 35 / 35 apparus après défilement |
| Erreurs JavaScript | 0 | 0 |

## 3. COOKIE-01 — audit réel (script `outils/audit-cookies.cjs`, résultat `audit-cookies-final.json` dans le dossier de contrôle)

Méthode : Chromium, contexte neuf par page (aucun état), toute requête vers un autre hôte que le site interceptée et journalisée
(jamais transmise), en-têtes `Set-Cookie` de toutes les réponses, puis relevé de `cookies`, `document.cookie`, `localStorage`,
`sessionStorage`, `indexedDB.databases()`, `caches.keys()`, `serviceWorker.getRegistrations()` **avant toute interaction** et
**après les usages principaux** de la page. 17 pages ; interactions : alerte de l'accueil remplie puis envoyée (après le relevé),
saisie du calculateur, clic sur la carte, recherche + possession dans Véhicules, Consommables (« Je l'ai », « Description »,
« Fiche complète », Échap), brouillon de Contact, clic dans Progression, Léo ouvert et interrogé sur trois pages.

Résultat global (après les correctifs de COOKIE-02) : **0 cookie, 0 en-tête `Set-Cookie`, 0 base IndexedDB, 0 cache, 0 service
worker, 0 requête vers un autre hôte avant une action, 0 clé de stockage avant une action sur les 17 pages**. Seule sortie :
`POST https://affd58b3.sibforms.com/serve/…` (Brevo) à l'envoi de l'alerte, après la case cochée et le clic « Me prévenir »
(formulaire HTML pur, autorisé par la CSP `form-action`). Aucune clé hors préfixe `lk`.

| Page | Avant interaction | Interaction | Après | Hôtes contactés |
|---|---|---|---|---|
| index.html | rien | alerte remplie, Léo interrogé, puis envoi | `sessionStorage lk_leo_session_v2` (session de Léo, effacée avec l'onglet) | site ; `affd58b3.sibforms.com` (POST à l'envoi seulement) |
| calculateurs.html | rien | saisie « 25000 » | `localStorage lk-calculator-v1` | site |
| carte.html | rien | clic | rien | site |
| vehicules.html | rien | recherche « vapid », possession, Léo | `sessionStorage lk_leo_session_v2` | site |
| armes.html | rien | — | rien | site |
| nourriture.html | rien | « Je l'ai », description, fiche, Léo | `localStorage lk_own_consommables`, `sessionStorage lk_leo_session_v2` | site |
| style.html, personnalisations.html, collectibles.html, tuto.html, a-propos.html, mentions-legales.html, achats.html | rien | — | rien | site |
| progression.html | rien | clic | rien (le marqueur v2 n'est plus posé à vide) | site |
| contact.html | rien | brouillon saisi | `localStorage lk_contact_draft_v1` | site |
| vehicules/vapid-caracara-4x4.html (fiche) | rien | — | rien (la sélection vide du comparateur n'est plus écrite) | site |
| carnets/garage.html | rien | — | rien | site |

Avant les correctifs (`audit-cookies.json`, même script) : `sessionStorage lk-calculator-selection-vehicules` / `-armes` écrit
(vide) à l'ouverture de toute fiche véhicule ou arme, et `localStorage lk_progression_v2` (marqueur `{version, migratedAt,
checked:{}}`) écrit au chargement de toute page de suivi, sans action. Tout le reste était déjà à zéro.

Inventaire statique (`outils/preuve-confidentialite.cjs`, 415 pages, 59 scripts, 17 feuilles) : aucun cookie (`document.cookie`,
`cookieStore`, `Set-Cookie`), 0 ressource d'un autre site, CSP `default-src 'self'` …, `form-action 'self' https://affd58b3.sibforms.com` ;
clés lues dans le code : `lk-calc-folds-v1`, `lk-calculator-notebooks-v3`, `lk-calculator-selection-*`, `lk-calculator-v1[-backup-*]`,
`lk_achats_vue`, `lk_collectibles_*` (5), `lk_contact_draft_v1`, `lk_leo_session_v2`, `lk_loc_*`, `lk_progression_v2`,
`lk_own_<famille>` (11 familles), `lk_recovery_*`, `lk_recovery_import_*`, `lk_probe` (test de disponibilité : écrit puis effacé
dans la même instruction, jamais conservé). Toutes servent une fonction déclenchée par le visiteur ; aucune ne part du navigateur.

## 4. COOKIE-02 et LEGAL-01 — vérifications

| Contrôle | Résultat |
|---|---|
| Décision | aucun bandeau (rien à accepter ni à refuser ; article 82, exemption « strictement nécessaire à un service expressément demandé ») ; stockages écrits seulement après une action |
| `progression-core.js` : navigateur vide → rechargement de `progression.html` | 0 clé écrite ; navigateur avec `lk_own_vehicules` existant → relu, conservé, marqueur v2 posé comme avant ; `summary().done` ≥ 1 (recette) ; tests `lot-d-progression` inchangés et verts |
| `fiches.js` : fiche ouverte sans sélection | 0 clé écrite ; sélection non vide → écrite comme avant ; effacement → clé supprimée seulement si elle existait |
| 6 pages (accueil, calculateur, progression, véhicules, nourriture, carnet) rechargées sans action | 0 clé, 0 cookie, aucun élément de bandeau |
| Mentions : texte | aucun téléphone ; aucun prénom ni identité inventée ; « personne physique », « article 1-1 », « consulté sur Légifrance le 1er octobre 2026 » ; « Responsable du traitement » ; Vercel (adresse postale, `privacy@vercel.com`) ; « SENDINBLUE SAS », « 498 019 298 », « Salneuve », « Haussmann » ; « 0 cookie », « 17 pages », « article 82 », « 2020-091 », « 2020-092 » ; « aucun bandeau », « rien à accepter ni à refuser » ; « Rien n'est écrit tant que tu n'as rien fait » |
| Mentions : liens | Légifrance (JORFTEXT000000801164), CNIL « que dit la loi » (page vérifiée le 1er octobre 2026 : existe, datée du 29/09/2020, cite l'article 82 et les textes du 17/09/2020), Vercel `legal/privacy-notice`, Brevo `legal/mentions-legales/` et `legal/privacypolicy/` |
| Ancres `#editeur`, `#hebergement`, `#confidentialite`, `#cookies`, `#responsable`, `#prestataires`, `#droits` | cible présente, titre entièrement visible sous l'en-tête et la barre de sections (les sous-ancres `h3`/`p`/`tr` reçoivent `scroll-margin-top:150px`) |
| 390 px | 0 erreur JS, aucun débordement horizontal |
| Affirmations des Mentions contre le code | `outils/preuve-confidentialite.cjs` : « Toutes les affirmations des Mentions sont tenues. » |
| Tests | `contact-v746.test.cjs` (Mentions : SENDINBLUE SAS, RCS, Responsable du traitement, Légifrance, aucune identité publiée), `conformite-v753`, `lot-d-progression`, `leo`, `leo-v745` |

## 5. Contrôles automatiques

| Contrôle | Résultat |
|---|---|
| `node outils/regenerer.cjs` puis `node outils/verifier.js` | 48 342 références, 0 erreur, 415 pages |
| `node --test outils/tests/*.test.cjs` | 624 / 624 (7 min 35) |
| `node outils/gen-leo.cjs --check` (dans `regenerer.cjs`) | sorties identiques à l'octet |
| Recette navigateur `qa/recette-lot4.cjs` (dossier de contrôle) | 51 contrôles, 0 échec (ABOUT-01 : 12 ; ABOUT-02 : 11 ; Mentions : 20 ; COOKIE-02 : 8) |
| `outils/audit-cookies.cjs` | voir § 3 |

## 6. Sources consultées (1er octobre 2026)

- Légifrance — loi n° 2004-575 du 21 juin 2004 (LCEN), art. 1-1 II, rédaction issue de la loi n° 2024-449 du 21 mai 2024, version
  en vigueur depuis le 9 novembre 2024 : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164/ — l'éditeur non professionnel
  peut ne tenir à la disposition du public que le nom et l'adresse de l'hébergeur, sous réserve de lui avoir communiqué ses
  éléments d'identification personnelle.
- Service-Public.fr — fiche F31228 « Quelles sont les mentions légales obligatoires sur un site internet ? » (vérifiée le
  31 juillet 2023) : s'adresse aux sites professionnels (articles 6 et 19 LCEN) ; non applicable ici, non citée dans la page.
- CNIL — « Cookies et autres traceurs : que dit la loi ? » (29 septembre 2020) : https://www.cnil.fr/fr/cookies-et-autres-traceurs/que-dit-la-loi
  — article 82 de la loi Informatique et Libertés ; lignes directrices n° 2020-091 et recommandation n° 2020-092 du 17 septembre 2020 ;
  l'exemption vaut aussi pour le stockage local strictement nécessaire à un service expressément demandé.
- RGPD, article 13 (informations à fournir à la collecte : identité et coordonnées du responsable du traitement, finalités, base
  légale, destinataires, durées ou critères, droits).
- Vercel — Privacy Notice du 1er juin 2026 : https://vercel.com/legal/privacy-notice — Vercel Inc., 440 N Barranca Avenue #4133,
  Covina, CA 91723, États-Unis ; privacy@vercel.com ; certification Data Privacy Framework ; aucun téléphone publié. L'ancien
  numéro (+1 559 288 7060) venait d'un dossier Privacy Shield inactif depuis 2022 : retiré.
- Brevo — mentions légales : https://www.brevo.com/fr/legal/mentions-legales/ (SENDINBLUE SAS, 17 rue de Salneuve, 75017 Paris, RCS Paris 498 019 298)
  et politique de confidentialité : https://www.brevo.com/fr/legal/privacypolicy/ (106 boulevard Haussmann, 75008 Paris ;
  conservation des coordonnées deux ans au plus).
- Travail ChatGPT (lot 4) : même diagnostic (prénom, bandeau inutile, téléphone Vercel, SENDINBLUE SAS, nom du responsable
  manquant) ; différences : son audit inventorie « 28 groupes de stockage » lus dans le code, le mien relève ce qui est réellement
  écrit dans un navigateur avant et après action et corrige les deux écritures au chargement ; ses animations de la page À propos
  passent par un réglage de 320 ms propre à la page, les miennes réutilisent la feuille commune sans réglage nouveau.

## 7. Limites et points ouverts

- Audit en laboratoire (Chromium, serveur local, parcours scriptés) : un parcours non couvert (import d'un fichier de sauvegarde,
  dessin sur la carte…) écrit ses clés `lk_*` au moment de l'action, comme documenté ; aucune de ces fonctions ne contacte un autre
  site (CSP `connect-src 'self'`). Firefox et Safari non testés ici.
- Le formulaire d'alerte envoie l'adresse e-mail à Brevo (page `sibforms.com`), qui applique ses propres règles une fois sur sa
  page : déjà dit dans Mentions ; le réglage « double opt-in » de ce compte Brevo n'est pas vérifiable depuis le code.
- Informations que la page ne donne pas parce qu'elles n'existent pas dans le code (à décider par l'éditeur, voir LISEZ-MOI) :
  nom du responsable du traitement (champ `editorName`, support déjà en place), durée maximale de conservation des messages de
  Contact.
