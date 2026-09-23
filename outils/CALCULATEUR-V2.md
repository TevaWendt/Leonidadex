# Calculateur Leonidakit : maintenance, version du 22 septembre 2026 (v7.25)

## Structure

Le site reste statique, en HTML/CSS/JavaScript, déployable sur Vercel sans compilation. Aucun compte, service payant ni requête distante n’est nécessaire au calcul. Les images proviennent des médias déjà présents et crédités dans les registres `outils/medias-officiels.json` et `outils/credits-images.json`.

- `calculateurs-data.js` adapte les sources canoniques, conserve les inconnues à `null` et expose trois exemples personnels.
- `calculateurs-engine.js` est le moteur pur utilisable dans le navigateur et sous Node. Unités : dollars, minutes, pourcentages ; modèles horaires en dollars/heure.
- `calculateurs.js` gère les formulaires, sept intentions, modes de détail, filtres, références, sauvegardes, exports et paramètres.
- `calculateurs-tools.js` expose les interfaces rentabilité, budget et ordre d’achat, en appelant le même moteur.
- `calculateurs-hub.js` reconnaît des intentions et des valeurs dans une question. C’est un routage par règles, pas un modèle d’IA.
- `calculator-entry.js` réutilise `goalContinuous` sur l’accueil ; `calculator-entry.css` présente les points d’entrée.

## Conventions et calculs

### Objectif continu

`goalContinuous({capital,target,hourly,dailyMinutes,reserve})` : cible **hors réserve**. Disponible = capital − réserve. Manque = max(0, cible − disponible). Temps en minutes = manque / revenu net horaire × 60. Le nombre de sessions est arrondi au-dessus. Le capital final total comprend la réserve. Revenu continu constant : ce modèle ne reproduit pas des missions payées uniquement à la fin.

Exemple pédagogique : capital 200 000, cible 1 000 000, revenu net 100 000/h, réserve 0 → manque 800 000, 8 heures. Avec 60 min/jour → 8 sessions quotidiennes.

### Activités et cycles

`activity` : net = reward × share / 100 − cost. Temps actif = duration + prep. Rendement long terme = net / (temps actif + cooldown) × 60. La préparation est répétée à chaque activité. Les coûts sont les frais personnels : ils ne sont pas répartis une seconde fois. Le nombre de joueurs est une contrainte personnelle de compatibilité, pas une règle GTA VI confirmée.

`goal` et `goalMixed` : cible **totale**, réserve incluse ; l’interface ajoute donc sa réserve à l’objectif avant l’appel. Le moteur conserve la réserve à chaque dépense. Les frais sont avancés, l’investissement est financé avant le début et les récompenses sont reçues en fin d’activité. Aucun cycle fractionnaire et aucune attente après la dernière activité. `activeMinutes + waitMinutes = totalMinutes`, hors nuits. La rotation suit l’ordre saisi et finance toutes ses mises au départ. Les délais dépassant la pause quotidienne compatible sont refusés explicitement ; aucune fausse date n’est affichée.

`inverse` : calcule les cycles complets dans une durée. S’il n’y a pas de cycle, aucun investissement n’est payé. Les pertes ne peuvent entamer la réserve.

### Plan de session

`sessionPlan({capital,reserve,minutes,activities,maxRepeat})` retourne un calendrier, les dépenses, gains, capitaux après étape, temps actif, attente et temps inutilisé. Le cooldown d’une activité peut être occupé par une autre activité. Les activités restent séquentielles. Un investissement n’est payé qu’à la première utilisation. `maxRepeat` limite les répétitions **consécutives**.

Recherche déterministe bornée, maximisant le capital final parmi les plans explorés : au maximum 12 activités proposées, 1 440 minutes, 256 réalisations et 24 états conservés à chaque profondeur. Le moteur peut préférer ne rien faire à une session déficitaire. `limited`, `limits` et `note` exposent les limites ; aucune garantie d’optimum global. L’interface propose les trois scénarios personnels, ce qui borne davantage le coût de calcul.

### Rentabilité, achats et budget

Investissement = achat + améliorations + frais initiaux. Bénéfice horaire = recettes − coûts récurrents. Bénéfice sur l’horizon = bénéfice horaire × heures − investissement. ROI = bénéfice sur l’horizon / investissement × 100 ; non applicable pour une mise nulle. Amortissement continu = investissement / bénéfice horaire positif. Exemple : 500 000 / 75 000/h = 6 h 40.

Achat : coût total = prix + équipement/frais complémentaires ; capital disponible = capital − réserve. Acheter/épargner compare le temps jusqu’à la cible avec et sans achat, selon des revenus continus personnels. Un achat plaisir n’est pas présenté comme un investissement rapportant automatiquement.

Ordre d’achat : deux séquences (ordre saisi et inverse), financement de chaque étape avec le capital réellement disponible. Le gain ajouté commence après l’achat. Le cumul suppose un mécanisme compatible choisi par l’utilisateur. Ce n’est pas une recherche exhaustive.

## Données et mise à jour

Les véhicules et armes conservent leurs identifiants canoniques. Les propriétés et entreprises proviennent du catalogue projeté par `outils/gen-calculateurs-catalogue.cjs`. `calculateurs-activites.js` ne contient aucune activité économique chiffrée validée dans cette livraison. Ne pas remplir ce manque avec GTA Online, une rumeur ou une estimation non qualifiée.

Un champ numérique sourcé peut prendre cette forme :

```js
price: {
  value: 125000, // exemple de schéma, pas une valeur GTA VI
  status: 'verified',
  source: 'URL ou protocole de mesure',
  verifiedAt: '2026-09-21',
  unit: '$'
}
```

Statuts exposés : officiel, mesuré/vérifié, estimation, personnel, inconnu et statuts d’identification existants. Une identification visuelle d’objet ne confirme pas son prix. Prix et performances inconnus ne deviennent jamais zéro et ne servent pas à un classement. Les unités/méthodes doivent être comparables. Les liens ne transportent que les identifiants, pas un prix recopié.

Le moteur n’active pas de bonus temporaires, revenus passifs, stockage ou mécaniques multijoueurs propres à GTA VI sans données documentées. Les parts et gains supplémentaires du mode personnel ne valent pas confirmation de ces mécanismes.

L’empreinte `dataVersion` est calculée à partir du catalogue et des activités. Une réouverture avec empreinte différente affiche un avertissement et conserve les hypothèses enregistrées. « Revenir au prix de référence » actualise explicitement le prix de la fiche choisie. Un prix personnel ne modifie jamais le catalogue.

## Sauvegardes et liens

Le JSON est en version 2 ; la version 1 précédente migre vers le modèle par cycles, avec réserve zéro et valeurs initiales pour les nouveaux champs. Les anciennes clés `lk-calculator-*-v1` sont conservées pour la compatibilité avec Progression ; leur contenu est versionné séparément.

- Brouillon courant ; jusqu’à 12 plans nommés ; 5 calculs récents ; 100 fiches favorites ; 3 objets comparés.
- Renommage, duplication, suppression, réinitialisation avec annulation.
- Référence d’objectif stockée séparément : la comparaison porte sur le temps de deux objectifs. Le lien et l’export du plan courant n’emportent pas cette référence locale séparée.
- Export/import JSON ≤ 40 000 octets ; URL `#plan=` ≤ 24 000 caractères. Texte, identifiants, tableaux, nombres finis et version sont validés. Les valeurs inconnues peuvent rester `null`.
- Les saisies hors limites ne remplacent pas une sauvegarde valide. Les paramètres de navigation et l’ancien lien partagé sont retirés après modification pour ne pas écraser un nouveau brouillon au rechargement.
- Stockage ou presse-papiers indisponible : message, export et copie de la barre d’adresse restent utilisables. Les noms et hypothèses font partie du lien partagé ; ne pas y saisir d’informations privées inutiles.
- Aucune synchronisation avec un compte GTA. La progression provient du capital renseigné par la personne.

## Points d’entrée et mesure

`?tool=goal&capital=...&target=...&hourly=...`, `?tool=session&minutes=30`, `?tool=purchase&type=vehicules&id=...`, `?tool=purchase&type=armes&ids=a,b`, `?tool=roi&type=business&id=...`. Les paramètres incorrects sont ignorés avec explication. Les fiches d’entreprises importent un contexte et des valeurs absentes, sans supposer leur exploitation possible.

Les événements locaux `leonidakit:calculator` exposent uniquement nom d’événement, outil et niveau de détail (`open`, `first_valid_result`, `tool_open`, `save`, `share`, `compare`, `reference`, `catalogue_open`). Aucun montant et aucun nom ne sont envoyés, aucun service de mesure n’est installé. Pour les exploiter, brancher ultérieurement un gestionnaire compatible avec les choix de confidentialité du site.

## Vérification et déploiement

```sh
node --test outils/tests/calculateurs-engine.test.cjs
node --test outils/tests/*.test.cjs
node outils/tests/calculateurs-v2-browser.cjs
node outils/verifier.js
```

Les tests DOM ont besoin de `jsdom`/`postcss` accessibles via `NODE_PATH` ; les parcours navigateur ont besoin de Playwright et de son Chromium. Ces dépendances de développement ne sont pas nécessaires au site ni à Vercel, et ne sont pas livrées dans l’archive.

Ne pas exécuter une génération générale pour publier ces fichiers déjà produits. Conserver les sources et générateurs pour les futures mises à jour. Vercel doit servir la racine contenant `index.html` ; pas de migration d’hébergeur ou de framework. Les contrôles locaux ne constituent ni un audit WCAG complet ni des mesures Core Web Vitals de visiteurs réels.

## v7.22 : couche « facile à utiliser »

Règle : un enfant de 10 ans doit pouvoir s'en servir. Concrètement :

- **Mots simples.** Les libellés du calculateur n'emploient plus capital, ROI, amortissement, trésorerie, hypothèse, scénario. Ils disent « J'ai déjà », « Je veux avoir », « Je gagne à peu près ($ par heure de jeu) », « Je joue chaque jour », « l'argent que je garde de côté », « remboursé ». Le lexique en bas de `calculateurs.html` traduit les mots techniques.
- **Réponse en une phrase.** `renderGoal` commence par `.calc-answer` : « Il te manque X $. En jouant Y par jour, tu y arrives en Z jours. » Les chiffres viennent du même résultat `E.goalContinuous` / `E.goal` qu'avant.
- **`calculateurs-simple.js`** (aucun calcul, tout par délégation d'événements, résiste au remontage de `#calc-panels`) :
  - écrit les grands nombres en mots sous chaque case en $ (`.lk-echo`, « = 1 million $ ») et ajoute les séparateurs de milliers quand la case perd le focus ; jamais sur une saisie décimale ni pendant la frappe ;
  - réglette d'objectif `#lk-goal-range` (10 000 à 10 000 000 $, échelle logarithmique) liée dans les deux sens à `f-goal-target` ;
  - aide « Je ne sais pas combien je gagne » : récompense ÷ minutes × 60, arrondi, puis écrit dans `f-goal-hourly` et passe le modèle en « continu » ;
  - mode **Pas à pas** (`data-mode="guided"`) : les quatre `.calc-step` du panneau objectif sont montrés un par un, « Question n sur 4 : … », barre de progression, boutons Retour / Suivant, Entrée = Suivant, dernier bouton = « Voir ma réponse ». Les valeurs sont les mêmes cases qu'en mode Simple, donc rien n'est perdu en changeant de mode ;
  - sur téléphone (≤ 700 px), résumé collant `.lk-sticky` (« 8 h de jeu · 8 jours · Voir ma réponse ») tant que `#goal-results` n'est pas visible.
- **Ordre des onglets** : `goal, purchase, session, budget, order, roi, activities`, du plus simple au plus avancé. Les flèches et Fin suivent cet ordre (tests mis à jour).
- **Puces de temps de jeu** `data-daily` (30 min, 1 h, 2 h, 3 h) : même mécanique que `data-target`.
- **Page** : question « Que veux-tu calculer ? » avant l'atelier, compte à rebours et tableau « Ce que rapporte chaque activité » remis (retirés par erreur dans la livraison précédente), sept cartes sans orpheline (`.lk-tool--lead` sur deux colonnes), FAQ au gabarit `.faq-sec` du site, lexique `.lk-glossary`. Sur mobile l'atelier passe avant la question (`order` en CSS).
- **Charte** : `calculateurs-brand.css` porte une couche `v7.22` (encre, corail, ambre, nuit de Vice City, textes ≥ 12,5 px, zones tactiles ≥ 42 px). Les couleurs prune / rose / cyan de la livraison précédente ont été remappées dans la charte.
- **Menu** : `sync-site.cjs` place « Calculateur » en premier sur toutes les pages et pose `aria-current="page"`.

## v7.23 : les sept outils en étapes, réponse en une phrase partout

- Chaque outil découpe ses cases en `.calc-step[data-step][data-question]` (aide `step(n, question, html)` dans `calculateurs.js` et `calculateurs-tools.js`). Le pas à pas de `calculateurs-simple.js` est générique : il lit les étapes de l'outil ouvert, garde la position par outil (`stepByTab`), déplace un seul en-tête et une seule barre Retour / Suivant, et masque dans la carte `.has-steps` les descriptions, notes, volets avancés et liens secondaires.
- Chaque rendu de résultat commence par `<p class="calc-answer" data-short="…">` : la phrase complète pour l'écran, le résumé court pour le bandeau collant mobile. Tous les résultats sont dans une carte `.calc-result` (sombre) ; `#order-results` en contient une suivie des deux cartes A / B.
- `Mes activités` : la question inverse (`inverse.minutes`, `inverse.selected`) est la carte principale ; le tableau reste dans `#activity-results` ; les éditeurs (`.calc-activity-editors`) sont dans `<details class="calc-activity-settings">`. Les identifiants des champs ne changent pas.
- Puces `data-inverse-minutes` et état `aria-pressed` des puces `data-session-minutes`.

## v7.25 : lot B (logique et connexions)

- `calculateurs-scenario.js` : scénario v3 (`assets` = achats partagés sous clé stable ; `purchase.key`, `roi.key`, `order.keys` les référencent ; `views` = mode par outil, y compris `guided`), `migrate`/`validate` v1 → v3, `evaluate(tool)`, `sensitivity`, `signature`, `metrics`. Aucun calcul en dehors de `calculateurs-engine.js`.
- `calculateurs-notebooks.js` : un carnet par outil et un carnet de plans, dans `localStorage`, versionnés ; suppression annulable.
- `calculateurs-workspace.js` : panneaux Ça vaut le coup, Mon budget, Quoi acheter d'abord et Mon plan ; décoration des autres panneaux (champs Expert `.b-expert`, résumé des réglages `.b-mode-summary`, étapes « C'est bon pour cette étape »). Les étapes numérotées (`step()`) rendent le pas à pas de `calculateurs-simple.js` disponible partout.
- Règle : quand un rendu resynchronise une case partagée, il ne la réécrit que si sa valeur diffère (les saisies françaises « 250 000,50 » sont conservées).
- Tests : `outils/tests/calculateurs-lot-b.test.cjs`, `calculateurs-lot-b-browser.cjs` (Playwright).
