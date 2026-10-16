# Matrice de la v7.92 — pages enrichies et Atelier 3D plus rapide (15/10/2026)

Base : assemblage v7.87.1 → v7.91 (commit 134e87c58). Chaque ligne : l’exigence, ce qui a été fait, comment c’est vérifié.

## Ce que Téva demande

| # | Demande | Fait | Vérifié |
|---|---|---|---|
| 1 | Éditions, Vidéos officielles, Actualités, Ce qui est confirmé : plus d’informations, de visuels, d’images, d’effets au survol et à l’apparition | briques communes (`outils/vitrine.cjs`, `vitrine.css`, `vitrine.js`) ; chaque page refaite (CHANGEMENTS § 2 à 5) : visuels officiels crédités, chiffres qui défilent, filtres, comptes à rebours, comparatif, salle de projection, bandes de photogrammes, frise illustrée, tableau de bord, encart Léo | captures 1 440 et 390 px relues ; `v792.test` (briques dans chaque langue, textes alternatifs) ; `v792-browser` (filtres, comptes à rebours, question à Léo) |
| 2 | Presse | captures agrandissables, identité visuelle (couleurs à copier, Archivo), formules de citation à copier, encart Léo | captures ; `v792-browser` (aucune erreur) |
| 3 | Mode compagnon | quatre écrans de téléphone qui suivent la lecture, ce qui est préparé, installation illustrée, schéma du transfert | captures 1 440 et 390 px ; `v792-browser` (écran = étape lue, 4 sur 4) ; `v792.test` |
| 4 | Devine le lieu | album, cartes postales des six régions, statistiques du résultat, série en jeu, devise et « nouvelle image », règles illustrées, cycle ; image de la partie en 800 px au téléphone, demandée en priorité | `v792.test` (fonctions pures, album rangé par région, cycle, aucune image du jeu hors du jeu) ; `v792-browser` (fr et de, 390 et 1 280 px ; image de la partie en 800 px) ; `v790.test` et `v790-browser` (jeu inchangé) |
| 5 | Optimiser encore l’Atelier 3D | programmes gardés, compilation parallèle, ombre fixe, pause hors de l’écran, rotation plafonnée, three.js réduit et préchargé, données en avance | mesures avant / après (CHANGEMENTS § 9 et § 13 : maquette dessinée 0,9 s plus tôt à froid au téléphone) ; rendu comparé pixel par pixel (6 scènes : 0 pixel différent dans la scène) ; `v792-browser` (aucune recompilation, rien hors de l’écran, export PNG) ; `v781.test` |
| 6 | « Sans oublier les consignes » | voir le tableau suivant | — |
| 7 | Renuméroter le lot 8 (v7.93) et le lot 4 (v7.94) | prompts reconstruits (`PROMPT-Lot8-v7.93-recherches-Google.md`, `PROMPT-Lot4-v7.94-jour-J.md`), mode d’emploi, pilotage, exigences (briques v7.92, images de 800 px au plus au téléphone), onglet « Le site, version par version » du Kit de lancement | relecture |

## Exigences de qualité

| Exigence | État | Preuve |
|---|---|---|
| Du tac au tac, mots simples, registre « tu » | tenue : textes courts, une idée par bloc | relecture |
| Charte : jetons de `style.css`, Archivo, gabarit des sections | tenue : `vitrine.css` ne prend que les jetons ; sections du moteur commun | relecture des feuilles |
| Visuels uniquement officiels, crédités, silhouette « teaser » | tenue : `outils/vitrine.cjs` refuse un visuel inconnu ou sans texte alternatif ; silhouette pour Vice City Styles | `v792.test` |
| Images : 480, 800 et 1 280 px, légères au téléphone | tenue : `<picture class="vt-pic">` (800 px au plus sous 600 px), aussi pour l’affiche des vidéos, la frise, les moments, la télévision du Mode compagnon et l’image de Devine le lieu ; plus aucune image de 1 280 px au téléphone sur les dix pages (v7.91 : jusqu’à 12 par page) | `v792.test` (structure dans chaque langue) ; `v792-browser` (aucune requête de 1 280 px à 390 px, densité 3) ; poids mesurés (CHANGEMENTS § 1) |
| Mouvement : un seul moteur, cascade ≤ 300 ms, cartes lues immobiles, mouvement réduit | tenue : `data-lk-reveal` + `LKMotion` ; `prefers-reduced-motion` coupe tout ; boucles limitées à quelques tours | captures en mouvement réduit ; `v792-browser` |
| Toutes les largeurs, aucun débordement | tenue : 10 pages × 6 langues × 320, 390, 768, 1 024, 1 440 px | balayage des débordements (300 chargements) ; écrans du socle (16 largeurs) ; audit de clôture |
| Latence | premier affichage −60 à +80 ms ; plus rapide : image de Devine le lieu −0,6 s, maquette de l’Atelier −0,9 s, DCL de l’Atelier −0,9 s, images des pages de vidéos 2,5 fois plus légères ; écart assumé : DOMContentLoaded +0,02 à 0,33 s et processeur +0,04 à 0,44 s au téléphone ralenti ×4 (pages deux fois plus longues), Atelier à chaud +70 ms au premier affichage | banc `latence-browser` (9 pages, 4 tours) et mesures ciblées (CHANGEMENTS § 13) |
| Référencement | inchangé : titres et descriptions non touchés ; dates du plan du site mises à jour pour les pages changées | `outils/sitemap-dates.json` |
| Accessibilité : boutons nommés, focus, dessins décoratifs `aria-hidden`, compteurs annoncés, cibles ≥ 24 px | tenue | `v792.test` ; audit de clôture ; écrans du socle |
| Rien d’inventé ; sources | tenue : faits des régions tirés de `outils/editorial.json`, comparatif d’après l’assistance de Rockstar | relecture |
| Aucun cookie, rien d’envoyé, clés `lk…` | tenu : Devine le lieu garde ses statistiques et son album dans la même clé ; Mentions mises à jour | `v792-browser` (aucun cookie, une clé) ; audit des cookies ; preuve de confidentialité |
| Six langues au même niveau | tenue : 234 à 236 textes par langue, extraction à `{}`, aucune entrée inutilisée | `langues.cjs --extraire` ; `langues.test` ; pages des langues dans le navigateur |
| Léo | tenue : nouvelles questions de la FAQ indexées ; questions posées depuis l’encart | `gen-leo --check` ; `v792-browser` |

## Contrôles de la version livrée

Voir la fin de `outils/CHANGEMENTS-v7.92.txt` (§ 12) : résultats des contrôles complets (`outils/livraison/verifier-tout.sh`), des contrôles navigateur de la v7.92 et de la v7.90 et du balayage des débordements.
