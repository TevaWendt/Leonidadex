# Matrice de qualité de la v8.03 (calculateur, lot 2 : les réglages en plus)

Demande : prompt « Corriger le calculateur avant la sortie », lot 2 (points 3 à 9). Base : v8.02. Une ligne par exigence du
prompt et par point du document d’exigences touché. État : fait.

| Point | Constat (v8.02) | Ajout (v8.03) | Preuve | État |
|---|---|---|---|---|
| 3 Argent de Jason et Lucia | une seule caisse | réglage « argent commun » (défaut) ou « l’argent d’un seul personnage » ; mission jouée par l’autre écartée avec sa raison ; « Jouée par » dans le plan ; personnages publiés transmis (gen-missions → characters) | calculateurs-v803.test.cjs | fait |
| 4 Soin, revenu passif avec plafond, bonus | déclarés (MECHANICS), jamais calculés | branchés au calcul et ajoutés aux simulations réglables (« Mes hypothèses en plus ») ; plafond par partie (taux effectif, R9 inchangée) | valeurs calculées à la main dans les tests | fait |
| 5 Amendes, mort, arrestation | absentes | nouvelles dépenses simulées par partie (modèle : trois mécaniques non confirmées) | tests ; verification.html : 13 postes sans carte seule | fait |
| 6 Revenu passif hors ligne | compté seulement pendant le jeu | option du plan : pause du calendrier × taux, plafond par pause facultatif ; règle R13 du vérificateur | tests R13 | fait |
| 7 Revente | seulement Ça vaut le coup ? et Quel achat choisir ? | Mon objectif (« Je revends ce que je possède déjà ») et business plan (revente des achats d’avant après le but) | tests | fait |
| 8 Risque d’échec | affiché après coup, exclu du plan | option du plan : × (1 − k) pour une mission qui se refait, ÷ (1 − k) pour une mission faite une fois ; 10 sur 10 refusé | tests | fait |
| 9 Partage entre équipiers | nombre de joueurs informatif | option : part égale 100 ÷ joueurs (une part publiée n’est jamais remplacée) | tests | fait |
| Désactivés par défaut, résultats identiques | — | gabarits à valeur par défaut ; une sauvegarde v8.01 se relit sans « non enregistré » | reference-v801.cjs : 851 résultats, 0 écart | fait |
| Simple et Pas à pas identiques ; Expert : seulement les nouveaux réglages | — | composants et classes existants ; éléments masqués hors Expert | captures au pixel près : 36 vues sur 36 identiques en Simple et Pas à pas ; calculateurs-cadre.test.cjs : seulement des lignes ajoutées en Expert, six langues | fait |
| Le visuel existant ne bouge pas | — | CSS seulement ajouté en fin de feuille | lecture du diff | fait |
| « à confirmer », simulation | — | chaque valeur simulée est dite « simulation » dans « Ce qui compte » ; rien n’est une donnée de GTA VI | tests d’explication | fait |
| Tuto et Léo adaptés | — | 8 paragraphes du Tuto, 7 sujets de Léo, 10 questions de test par langue | leo-eval 512/512 ; traductions | fait |
| Six langues | — | 212 à 217 textes par langue (v803-calculateur.json) | langues.cjs --verifier : 0 manque, 0 repère cassé, 0 conflit | fait |
| Procédure du jour J | — | QUAND-ROCKSTAR-PUBLIE.md, CALCULATEURS-MOTEUR.md, CALCULATEURS-DONNEES.md | lecture | fait |
| 0 Liens, pages, référencement | — | régénération complète | verifier.js : 0 erreur (26 641 pages) ; referencement.cjs : 0 défaut bloquant | fait |
| Tests | — | — | 95 fichiers, 1 259 tests réussis, 0 échec | fait |
