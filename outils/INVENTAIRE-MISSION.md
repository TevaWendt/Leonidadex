# Inventaire de départ (v7.47) pour la mission v7.48 → v7.52

Relevé le 29/09/2026 sur la base exacte (dépôt `a843930` v7.46 + archive v7.47), par lecture du code, exécution des
générateurs et relevés Playwright / jsdom. Il sert de référence : ce qui existait, où, et ce qu’une refonte doit
préserver. Détail brut des relevés (hors dépôt) : dossier de contrôle de la mission.

## 1. Organisation réelle

- Site statique (HTML, CSS, JS sans framework), publié tel quel par Vercel ; `outils/` exclu du déploiement.
- Chaîne de génération : `node outils/regenerer.cjs` = `gen-modele.cjs` (v7.48) → `final.js` → `gen.js` (véhicules) →
  `gen-armes.cjs` → `gen-armurerie.cjs` → `lore-gen.js` (monde) → `gen-acquisitions.cjs` (sections achetables, listes) →
  `gen-informations.cjs` → `gen-tuto.cjs` → `gen-achats.cjs` → `sync-site.cjs` → `gen-leo.cjs` → `sync-site.cjs`, puis
  `gen-leo.cjs --check`. `sync-site.cjs` repasse sur les 406 pages (menu, pied de page, puces, encart calculateur, FAQPage,
  typographie, `srcset`, liens des piles d’images, empreintes `?v=`, sitemaps). Vérification : `node outils/verifier.js`.
- Une page se corrige par sa source (JSON, générateur), jamais à la main, sauf les pages écrites à la main :
  `calculateurs.html`, `armes.html` (hors zones marquées), `comparateur.html`, `classement-vehicules.html`,
  `vehicules-rares.html`, `progression.html` (cartes), `carte.html`, `collectibles.html`, `index.html`.

## 2. Calculateur (détail par outil : `outils/MATRICE-COUVERTURE.md`)

- Fichiers : `calculateurs-engine.js` (moteur pur, 27 fonctions), `calculateurs-scenario.js` (état, migrations,
  sélecteurs), `calculateurs-workspace.js` (achats, rentabilité, ordre, budget, comparaison, tiroir « Mes calculs »),
  `calculateurs.js` (objectif, activités, temps de jeu, adresse, sauvegarde), `calculateurs-plan.js` (business plan),
  `calculateurs-visuals.js` (graphiques), `calculateurs-simple.js` (Pas à pas, nombres en mots), `calculateurs-motion.js`,
  `calculateurs-hub.js` (« Que veux-tu calculer ? »), `calculateurs-notebooks.js` (enregistrements), `calculateurs-data.js`
  (adaptateur : catalogue de 354 entrées, prix tous inconnus ; activités publiées : aucune ; 3 exemples fictifs).
- Stockage : `lk-calculator-v1` (état, v5 → v6 au lot 1), `lk-calculator-notebooks-v3` (160 enregistrements),
  `lk-calc-folds-v1`, anciennes clés lues.
- Adresse : `?tool=`, `capital`, `target`, `hourly`, `minutes`, `mode`, `id`, `type`, `ids`, `from=tuto|leo`, `?leo=`,
  `#plan=`, `#saved-calcs`, `#saved-plans`, `?focus=carnets` (écarts : `outils/SUIVI-MISSION.md`, anomalies 1 à 7).
- Entrées depuis le site : accueil (mini-calculateur et 4 cartes), 15 encarts `ENTRY` (`site-shell.cjs`), actions
  « Pour toi » des hubs, fiches entreprises et demeures (`lore-gen.js`), cartes d’acquisition, fiches véhicules et armes
  (`fiches.js`), comparateur, Achats, Progression, Tuto (15 boutons « Essayer »), Léo (`?leo=`).

## 3. Catalogues et pages concernées par la mission

| Page | Source et générateur | Contenu actuel | Composants |
|---|---|---|---|
| `style.html` (Vêtements et style) | `outils/catalogues/{coiffures,tatouages,tenues}.json`, `catalogues/editorial.json`, `acquisitions.json` → `gen-acquisitions.cjs` | 109 lignes (55 + 24 + 30), 10 sections numérotées, 3 listes dépliables à 7 colonnes, adresses (3 cartes + 7 cartes-lieux), 3 collections sans image | `.lk-stack`, `.ed-nav`, `section.ed`, `C.listBox`, `.ed-place`, `.d-card` |
| `nourriture.html` (Consommables) | `catalogues/consommables.json` | 30 lignes (officiel 3, vu 6, série 19, à confirmer 2), effet chiffré seulement pour 13 lignes et toujours d’un autre jeu ; aucun prix GTA VI ; 18 cartes-lieux | idem |
| `armes.html` + `armes/*.html` (Armurerie) | `armes-data.js` (27 armes, 9 classes, sans prix ni statistiques), `hubs-editoriaux.json` → `gen-armes.cjs`, `gen-armurerie.cjs` | constructeur d’équipement (dos, main, poing, lien `#lo=`), catalogue filtrable, 16 équipements et 5 munitions suivis, 3 armureries sur la carte ; cartes en schéma SVG (test : jamais de photo sur une carte d’arme) ; 18 armes ont des captures officielles sur leur fiche | `.veh-card.arm-card`, `.lo-*`, `.ed-kit`, `.ed-ammo-item`, `.ed-place` |
| `vehicules.html` + `vehicules/*.html` (Véhicules) | `vehicules-data.js` (302, 13 catégories, sans prix ni performances ; 54 photos officielles, 248 schémas) → `gen.js` + `outils/templates/vehicules.html` | catalogue filtrable, mur de 50 marques, 13 cartes-lieux, fiches avec « Ce qui arrive avec le jeu » (performances, emplacements, prix en attente) | `.veh-card`, `.ed-place`, `.pending` |
| `achats.html` (Achats) | `acquisitions.json`, `achats-editorial.json` → `gen-achats.cjs` | 11 cartes de catégorie **sans visuel**, animation `lk-arrive` ; deux comptes trompeurs | `.ak-card.lk-arrive`, `<style>` en ligne |
| `personnalisations.html` | `catalogues/perso-{vehicules,armes}.json` | 58 + 40 lignes, 9 ateliers | `.ed-atelier` |

- **Sélecteurs de carte** : le composant « petites cartes au-dessus d’une mini-carte » est la carte-lieu `.ed-place`
  (`outils/sections.cjs` `places()` + `outils/carte-vignette.cjs`) : armes (3), véhicules (13), consommables (18),
  style (7), personnalisations (9 ateliers). Les fiches véhicules et armes ont en plus trois liens texte vers des lieux
  (constantes de `gen.js` et `gen-armes.cjs`). Aucune donnée ne dit où trouver un objet précis : un sélecteur
  objet → lieu ne peut montrer un repère que pour les lieux documentés (sinon « Emplacement à venir »).
- **Succession d’images** (Personnages, Lieux) : galerie épinglée « En images » `.lore-stack` des fiches du monde
  (`lore-gen.js`, `common.js`, `style.css`), pilotée par le défilement ; défaut : image suivante floutée alors qu’elle
  porte du texte.

## 4. Suivis et progression

| Famille | Clé | Entrées | Où l’on coche | Fiche par entrée |
|---|---|---|---|---|
| véhicules | `lk_own_vehicules` | 302 | fiches, hub, bateaux | `vehicules/<id>.html` |
| armes | `lk_own_armes` | 27 | fiches, hub | `armes/<id>.html` |
| équipements, munitions | `lk_own_equipements`, `lk_own_munitions` | 16, 5 | `armes.html` | aucune |
| lieux | `lk_map_found` | 2 547 | `carte.html` | 6 fiches régions, sinon `carte.html#lieu=` |
| consommables, coiffures, tatouages, tenues | `lk_own_<famille>` | 29, 55, 23, 30 | `nourriture.html`, `style.html` | ancre de ligne |
| perso-vehicules, perso-armes | `lk_own_perso-*` | 57, 39 | `personnalisations.html` | ancre de ligne |
| collectibles | `lk_collectibles_v1` | 0 publié | collectibles, carte | `/collectibles/<slug>.html` |
| acquisitions | `lk_progression_v2` (bateaux → `lk_own_vehicules`) | 6 | bateaux, personnalisations, garages | fiche ou ancre du hub |
| calculs | `lk-calculator-notebooks-v3` | 160 max | calculateur | tiroir « Mes calculs » |

- Tout est booléen aujourd’hui (`LK.own` refuse une autre valeur) : aucune quantité. Les boutons « Voir mon garage »,
  « Voir mon arsenal », « Voir mon suivi », « Ma progression »… mènent tous à `progression.html#<ancre>` (864 liens vers
  Progression, dont 780 dans le menu et le pied de page).
- `progression.html` : 14 cartes écrites à la main + cartes d’acquisition construites par `progression.js` ; export
  `leonidakit-suivi-AAAA-MM-JJ.json` (version 2, toutes les clés `lk_` / `lk-`), import fusion ou remplacement avec retour
  arrière et copies `lk_recovery_*`.

## 5. Charte et effets existants

- Jetons (`style.css`) : papier `#FDFBF7` / `#F4F0E7`, encre `#1A1A1E`, corail `#E8452C` (texte `#B93220`), ambre
  `#F5A524`, nuits `#2B1B4D` → `#8E2F4C`, largeur 1 400 px + gouttière fluide, rayons 12 / 8, ombres « dures » décalées,
  titres fluides ; `motion-tokens.css` (110 / 190 / 300 / 620 ms, 12 s d’ambiance, trois courbes). Police Archivo hébergée.
- Mouvement : règle « lisible avant tout » (v7.39) ; composants `lk-reveal` (apparitions), `lk-arrive` (arrivée pilotée
  par le défilement : Achats, Médias), `lk-showcase` (À propos), `.lk-stack` (piles d’images des bandeaux), galerie
  épinglée (fiches du monde), parallaxe des bandeaux, accordéon voulu des hubs Véhicules et Armurerie (décision du
  28/09/2026). Mouvement réduit : tout visible, rien ne bouge.
- Médias : 148 visuels officiels (480 et 1 280 px, © Rockstar Games, crédits `outils/medias-officiels.json`), 302 schémas
  de véhicules, 27 schémas d’armes (SVG en ligne), 3 185 photos gtadb (CC BY 4.0) utilisées seulement par la carte.

## 6. Tests de départ

463 tests `node --test` (moteur, scénario, carnets du calculateur, régressions des pages, catalogues, hubs, Léo,
Contact, progression) ; suites navigateur : `calculateurs-browser`, `calculateurs-v2-browser`, `calculateurs-lot-b-browser`,
`calculateurs-parcours-browser`, `audit-site-browser`, `leo-browser`, `contact-browser`. Structures verrouillées par les tests
et à adapter consciemment lors des refontes : tableau des listes à 7 colonnes, 11 cartes Achats, 3 cartes-lieux de
l’Armurerie, 14 cartes de Progression, cartes d’armes sans photo.
