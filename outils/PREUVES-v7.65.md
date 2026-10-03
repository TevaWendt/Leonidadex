# Preuves v7.65 — section « Gangs et factions » (3 octobre 2026)

Base : v7.64 (commit `191a775f`). Changements : `outils/CHANGEMENTS-v7.65.txt`.

## 1. Tests automatiques

| Contrôle | Résultat |
|---|---|
| `node --test --test-concurrency=1 outils/tests/*.test.cjs` | **706 tests, 706 réussis, 0 échec** (26 min ; un test de plus qu’en v7.64 : le contrôle de hub du monde s’applique aussi à `gangs.html`) |
| après le dernier réglage (descriptions courtes de 8 pages traduites) : `langues`, `hubs-monde-v741`, `coverage`, `leo-v745` | 72 tests, 72 réussis |
| `node outils/langues.cjs <code> --extraire` (en, es, it, de) | 0 texte sans traduction dans chaque langue (421 pages, 53 scripts traduits chacune) |
| `node outils/verifier.js` | aucune erreur : 231 855 références vérifiées dans 2 106 pages |
| `node outils/gen-leo.cjs --check` | à jour |
| `node outils/hubs-doublons.cjs` | aucune phrase du hub identique à une phrase des fiches |

## 2. Navigateur (Chromium)

| Contrôle | Résultat |
|---|---|
| `langues-pages-browser.cjs` sur les 7 pages nouvelles et 10 pages modifiées (accueil, Ambrosia, Vice City, Jason, Lucia, commerce PTT YOUNGIN$, carte, Mentions, À propos, Médias), en, es, it, de, à 1 280 et 390 px | **28 contrôles passés, 0 échec** : aucune erreur JavaScript, aucune requête en échec, langue et barre de langue, aucun mot français visible (allemand : ni français ni anglais), aucun défilement horizontal propre à la traduction |
| Pages françaises (7 nouvelles, accueil, Ambrosia, Lucia) à 1 280 et 390 px | 20 vues : aucune erreur JavaScript, aucune requête en échec, aucun défilement horizontal |
| Captures relues | hub (grille de six fiches, zone éditoriale, sources), fiche Final Chapter MC (français, allemand), fiche des forces de l’ordre, accueil « Le monde de Leonida » en trois puis deux cartes, mobile 390 px |

## 3. Léo

| Jeu de questions | Résultat (v7.64 entre parenthèses) |
|---|---|
| français, 512 questions | 512 / 512 (512), hors sujet refusés 39 / 39, 0 réponse sans source |
| anglais | 511 / 512 (511) |
| espagnol | 511 / 512 (511) |
| italien | 512 / 512 (512) |
| allemand | 512 / 512 (512) |
| anglais, 140 questions inédites (mesure) | 112 / 140 (112) |
| allemand, 140 questions inédites (mesure) | 96 / 140 (96) |

Questions nouvelles essayées à la main, réponse attendue dans chaque langue :

| Question | Réponse |
|---|---|
| « quels gangs dans gta 6 ? » / « which gangs are in gta 6? » / « ¿qué bandas hay en gta 6? » / « quali gang ci sono in gta 6? » | FAQ du hub (Final Chapter MC, PTT Youngin$, San4San) ; en allemand, passage de la FAQ du hub |
| « peut-on attaquer les repaires de gangs ? » / « can you rob gang hideouts? » / « ¿se pueden asaltar las guaridas de bandas? » / « si possono saccheggiare i covi delle gang? » / « kann man gangverstecke ausrauben? » | FAQ du hub (Rob Nelson, Famitsu), dans les cinq langues |
| « comment marche la police dans gta 6 ? » / « how does the wanted level work? » / « ¿cómo funciona la policía? » / « come funziona la polizia? » / « wie funktioniert die polizei? » | sujet « police » mis à jour, lien vers la fiche des forces de l’ordre |
| « c’est quoi le final chapter mc ? », « san4san c’est quoi », « l’équipe de raul », « qui sont les ptt youngin ? » | réponse de la FAQ ou de la fiche ; San4San présenté comme identification des joueurs ; PTT YOUNGIN$ : commerce et gang |

## 4. Référencement des pages nouvelles

35 pages (7 × 5 langues) : un seul h1, canonical, 6 liens hreflang, Open Graph, données structurées (CollectionPage, FAQPage,
BreadcrumbList sur le hub), titre de 53 signes au plus (« GTA 6 »), description de 160 signes au plus (8 descriptions
traduites raccourcies pour la balise, `@meta::`). Plan du site : `sitemap.xml` 1 990 adresses (398 × 5), `sitemap-fiches.xml`
1 820 adresses.

## 5. Ce qui change sur les pages existantes

Comparaison du texte de `<main>` des 401 pages françaises modifiées avec la v7.64 : 16 pages changent, toutes attendues —
accueil (cinquième carte), À propos (421 pages), Médias (« Utilisé sur »), Mentions (historique v7.65), et 12 fiches qui
gagnent le groupe « Gangs et factions » dans « En lien » (Ambrosia, Vice City, Leonida Keys, Jason, Lucia, Cal, Raul, Brian,
maisons de Jason et de Brian, chantier de Brian, commerce PTT YOUNGIN$). Les 385 autres ne changent que par le menu et le
pied de page.

## 6. Sources de la section (consultées le 3 octobre 2026)

Officielles : site GTA VI, captures et vidéos Rockstar, Newswire de l’Extended Look, fiche Microsoft Store de l’Édition
Ultimate (« PTT YOUNGIN$ COMPOUND »), interview Famitsu de Rob Nelson (traduction GTAVice.net), propos à IGN (SVG).
Vu dans un média : résumé de l’Extended Look (Wikipedia, GTA Wiki). Communautaires, citées comme telles : GTA Wiki (Final
Chapter MC, San4San, comtés), GTABase (gangs, PTT Youngin$), GTA 6 Explained. Vérifié à l’image dans ce lot : écussons
« Final Chapter / 1982 / MC / Ambrosia » et panneau « Ambrosia County Sheriffs Office » (capture Ambrosia 01), écusson
« Enforcer » (Ambrosia 03), « Vice City Police » et « Vice City Police Dept » (capture Shitzu Squalo 04), tag « PTT » (capture
PTT YOUNGIN$).

## 7. Archive

`Leonidakit-v7.65-gangs-modifs.zip` (un seul fichier, sous la limite d’envoi de 30 Mio) : les 2 148 fichiers ajoutés ou
changés depuis la v7.64, aucun supprimé. Vérifiée en l’appliquant octet par octet sur l’archive (13) + v7.64 (ses deux
parties) : les 6 969 fichiers du dépôt v7.65 sont identiques, aucun fichier en trop.
