# Preuves — trois sections nouvelles : Codes de triche, Trophées et succès, GTA Online (4 octobre 2026)

Base : l’assemblage des quatre sections (commit `0b886cf9`, étiquette `base-4-sections`, zip
`Leonidakit-4-sections-modifs.zip`). Ce qui a été fait : `LISEZ-MOI-3-sections.txt` ; détail : `outils/CHANGEMENTS-3-sections.txt`.

## 1. Tests automatiques (après régénération complète : `node outils/regenerer.cjs`, puis chaîne générateurs → synchronisation → Léo)

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **770 tests, 770 réussis, 0 échec** (19 min ; 27 de plus qu’avec les quatre sections, 743 : les tests des trois sections) |
| tests des sections (`section-codes`, `section-trophees`, `section-online`) | 9 / 9, 9 / 9, 9 / 9 — dont : un code de GTA VI non publié ni vérifié en jeu est refusé ; « cheat » trouvé par la recherche dans chaque langue ; la case « Obtenu » gardée après rechargement (clé lk-trophees-obtenus-v1), rien d’enregistré sur la page de démonstration ; la navigation propre à l’espace GTA Online (bandeau, sommaire, page en cours, couleur) sur chaque page de l’espace, dans les cinq langues ; le fil d’Ariane des pages de online/ part de « GTA Online » |
| tests des quatre sections déjà assemblées | Missions 10 / 10, Activités annexes 10 / 10, Radios et musique 9 / 9, Animaux 8 / 8 |
| empreintes des noms venus des fuites, sur tous les fichiers texte du dépôt (3 357) | aucune |
| sources des trois sections (22, 19 et 35 sources datées) | aucune source sur les fuites ; chaque fait a un statut (officiel, vu, communauté, à confirmer) |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (448 pages chacune ; 54, 53, 54 et 53 scripts traduits) ; 0 conflit entre les fichiers de traduction |
| `node outils/verifier.js` | aucune erreur : 280 471 références vérifiées dans 2 241 pages |
| `node outils/gen-leo.cjs --check` | à jour |
| `node outils/hubs-doublons.cjs` | aucune phrase d’un hub identique à une phrase de ses fiches |

## 2. Navigateur (Chromium)

| Contrôle | Résultat |
|---|---|
| `langues-pages-browser.cjs` sur les 7 pages nouvelles, en, es, it, de, à 1 280 et 390 px | **28 contrôles passés, 0 échec** : aucune erreur JavaScript, aucune requête en échec, langue de la page et barre « Changer la langue » justes, aucun mot français visible (allemand : ni français ni anglais), aucun défilement horizontal propre à la traduction |
| Les 7 pages françaises, à 1 280 et 390 px | aucune erreur JavaScript, aucune requête en échec, aucun défilement horizontal ; animations relues (séquence tapée touche par touche, carte « Activé », badge et éclat au déblocage, anneau qui se remplit, signal du réseau) ; avec « réduire les animations » : tout le contenu visible après défilement, les 76 touches des séquences affichées d’un coup, aucune animation en boucle |
| Pages allemandes `codes-de-triche.html`, `trophees/modele.html`, `online.html`, à 1 280 et 390 px | aucune erreur, aucun défilement horizontal ; textes entièrement en allemand |
| Menu « Explorer » ouvert et pied de page, accueil français et allemand, à 1 280, 900 et 390 px | 12 vues : « Jouer » / « Spiele » à six liens (Missions, Activités annexes, Radios et musique, Codes de triche, Trophées et succès, GTA Online — Missionen, Nebenaktivitäten, Radio und Musik, Cheatcodes, Trophäen und Erfolge, GTA Online) ; aucun défilement horizontal |

## 3. Léo

| Jeu de questions | Résultat (avant, avec les quatre sections, entre parenthèses) |
|---|---|
| français, 512 questions | 512 / 512 (512), hors sujet refusés 39 / 39, 0 réponse sans source |
| anglais | 511 / 512 (511) |
| espagnol | 512 / 512 (512) |
| italien | 512 / 512 (512) |
| allemand | 512 / 512 (512) |
| anglais, 140 questions inédites (mesure) | 112 / 140 (112) |
| allemand, 140 questions inédites (mesure) | 97 / 140 (97) |
| questions des trois sections, dans les cinq langues | Codes de triche 11 (fr) + 10, 7, 6, 6 ; Trophées et succès 10 + 9, 6, 6, 6 ; GTA Online 10 + 6, 5, 5, 5 : toutes justes |
| questions des quatre sections déjà assemblées, dans les cinq langues | Missions 11 + 4 × 10, Activités annexes 11 + 4 × 8, Radios et musique 12 + 4 × 11, Animaux 9 + 4 × 5 : toutes justes |

Noyau `leo-index.json` : 325 696 octets (plafond 327 680). Questions de départ demandées par les consignes, toutes justes :
« y a-t-il des codes de triche dans GTA 6 ? », « code argent infini gta 6 », « les codes désactivent-ils les trophées ? »,
« combien de trophées dans GTA 6 ? », « comment avoir le platine ? », « y a-t-il des trophées manquables ? », « y aura-t-il
un GTA Online pour GTA 6 ? », « GTA 6 online sortira quand ? », « mon personnage de GTA Online sera-t-il transféré ? ».

## 4. Référencement des pages nouvelles

35 pages (7 × 5 langues) : un seul h1, canonical, liens hreflang (sauf les deux démonstrations, en noindex et hors du plan
du site, de la recherche et de Léo), Open Graph, données structurées (CollectionPage, FAQPage, BreadcrumbList, ItemList),
titre de 51 signes au plus, description de 157 signes au plus. Plan du site : `sitemap.xml` 2 110 adresses (2 085 avant :
5 pages × 5 langues), `sitemap-fiches.xml` 1 905 adresses (1 895 avant : les deux pages de l’espace GTA Online × 5).

## 5. Ce qui change sur les pages existantes

Comparaison du texte de `<main>` des 444 pages françaises de l’assemblage des quatre sections : une seule page change, À
propos, par ses compteurs recalculés à chaque régénération (441 → 448 pages en ligne, 390 → 403 sujets dans la base de
Léo, 661 → 688 tests). Les 443 autres ne changent que par le menu et le pied de page (trois liens de plus dans « Jouer »).

## 6. Archive

`Leonidakit-3-sections-modifs.zip` : un seul fichier de 27 Mo (sous la limite de 30 Mo) : les 2 359 fichiers ajoutés ou
changés depuis l’assemblage des quatre sections, aucun supprimé. Vérifiée en l’appliquant sur une copie propre de
l’assemblage des quatre sections (commit `0b886cf9`) : le résultat est identique au dépôt final, fichier par fichier, sans
fichier en trop.
