# Matrice de qualité de la v7.99 (la carte complétée depuis gtadb)

Une ligne par point du document d’exigences de Téva qui concerne cette livraison : l’import des lieux de la base gtadb
(`outils/import-gtadb.cjs`), leurs pages dans les six langues, leur indexation, la carte, la recherche et Léo. Ce qui vaut pour
les lots A à C (MATRICE-v7.95.md à MATRICE-v7.97.md) vaut ici : même gabarit, mêmes générateurs, même moteur de traduction.
État : fait, ou à l’audit final (le contrôle complet et l’audit, écrans, latence, téléphone, se font une fois, à la fin des
livraisons : consigne de Téva).

| Point | Pages | Constat et correction | Preuve | État |
|---|---|---|---|---|
| 1 Mouvement, lisibilité, tactile | pages de lieux | Les pages nouvelles sont écrites par le gabarit des lieux (lot A) : rien d’ajouté. | contrôle des écrans | à l’audit final |
| 2 Visuels crédités | pages de lieux, carte | Captures et photos de lieux réels de gtadb, créditées comme les 3 185 déjà là (gtadb.org et ses contributeurs, CC BY 4.0). | lecture | fait |
| 3 Hauteurs réservées | carte, pages | Largeur et hauteur de chaque photo écrites dans les données, égales à celles du fichier (0 écart sur 3 946 photos). | contrôle des dimensions | fait |
| 4 Ne charger que l’utile, latence | carte | 744 points de plus dans `carte-gtadb.js` et `search-lieux.js` ; la carte groupe déjà les points par zoom. | latence (audit final) | à l’audit final |
| 4 Ne jamais réécrire sans utilité | site | Seules changent les pages dont un lieu, un nom, une position, une photo ou le nombre de lieux change. Une adresse publiée ne change jamais (`outils/lieux-adresses.json`) : 0 adresse changée. | archive « modifs » | fait |
| 5 Titre, description, un h1, canonical, hreflang, données structurées, plans du site | pages nouvelles | Mêmes générateurs que les 2 500 pages du lot A ; noms homonymes départagés par le quartier ou le repère. | `--verifier`, `verifier.js` | fait |
| 5 Page trop pauvre en noindex | pages de lieux | Consigne de 23 h 58 : 453 lieux nouveaux indexés, 291 bâtiments sans nom en noindex,follow ; livrés à part à la fin avec ce qui leur manque. | inventaire `couverture-pages.cjs` | fait |
| 5 IndexNow | sitemaps | Les adresses nouvelles partent avec les envois à la suite (v7.97). | — | fait |
| 6 Six langues, Léo | pages nouvelles | Pages dans les cinq langues ; extraction à 0 ×5 (`outils/langues/<code>/v799.json`) ; Léo connaît les lieux nouveaux (`leo/lieux.json`). | extraction, `gen-leo --check` | fait |
| 7 Aucune donnée inventée, très fiable | carte | Tout vient de gtadb ; règles de l’import vérifiées sur les lieux en place (0 écart) ; un nom inconnu reste inconnu, un nom incertain est marqué « nom supposé », une enseigne lue en partie n’est pas un nom ; repères sans position laissés hors carte ; doublons des points du site écartés. | `import-gtadb.cjs --controle` | fait |
| 8 Doublons | carte | Cinq repères qui sont déjà des points du site ne sont pas ajoutés. | lecture | fait |
| 9 Ce qui ne change jamais | site | Aucun cookie, CSP inchangée ; contenu éditorial inchangé (seuls le nombre de lieux et le nom d’un lieu renommé par la base). | diff | fait |
| 10 Contrôles et livraison | lot | Chaîne complète, extraction, vérification des pages, de Léo et des liens ; archive « modifs », rien n’est poussé. | journal de la chaîne | fait |
