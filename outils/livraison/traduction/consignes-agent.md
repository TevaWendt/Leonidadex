# Consignes du traducteur portugais (Brésil) — Leonidakit, lot 7 (v7.91)

Tu traduis en **portugais du Brésil** des textes du site Leonidakit (site de fans de GTA VI, écrit en français, déjà publié en
anglais, espagnol, italien et allemand). Le résultat doit se lire comme un site brésilien écrit par des joueurs : naturel,
précis, phrases courtes, registre « você », jamais une traduction mot à mot.

## Avant de commencer

1. Lis en entier le glossaire : `outils/langues/pt/_glossaire.md` (chemin complet donné dans ta mission). Il s'impose : règles
   dures, vocabulaire fixe, statuts, argent (`$ 200.000`, `$ 1,5 milhão`), dates (`19 de novembro de 2026`).
2. Ne lance aucune autre commande que celles décrites ici (pas de régénération du site, pas de tests, pas de git).

## Ton travail, morceau par morceau

Chaque morceau `src-NNN.json` contient `"entrees"` : `{"n": numéro, "fr": texte français, "en": traduction anglaise, "es":
traduction espagnole}`. Seul le français fait foi ; l'anglais et l'espagnol, déjà relus, t'aident à comprendre un morceau
de phrase, un repère ou du code. **Ne recopie jamais l'espagnol** : pas de « el », « los », « coche », « -ción », « ¿ ».

1. Lis le morceau (Read).
2. Écris ta réponse `rep-NNN.json` (Write), un objet JSON : un numéro → la traduction :
   ```json
   { "_notes": "choix de vocabulaire à harmoniser (court)", "1": "…", "2": "=", "3": "…" }
   ```
   - Toutes les entrées, de 1 au dernier numéro, aucune oubliée. JSON valide : guillemets `\"` et barres obliques inverses
     `\\` échappés comme dans le morceau.
   - `"="` quand le texte reste identique (nom propre, marque, modèle, lieu anglais de la carte, sigle, nombre seul).
   - Garde à l'identique les repères `<1>…</1>`, `<2/>` (tu peux les déplacer), le code (`" aria-label="`, `">`, `{1}`, `\n`),
     tous les nombres (au format brésilien : `1 290 $` → `$ 1.290`, `12 500` → `12.500`, `1,5` reste `1,5`).
   - Pas d'espace au début ni à la fin d'une traduction (le site remet ceux du français).
   - Un morceau de phrase (« ), et », « pour », « Il manque ») se traduit pour que la phrase assemblée par le code se lise
     bien : regarde l'anglais et l'espagnol pour voir comment ils l'ont fait.
   - Une clé qui commence par `@meta::` est la description d'une page pour Google : 155 signes au plus.
3. Assemble et contrôle :
   ```bash
   python3 <racine>/outils/livraison/traduction/assembler.py <src-NNN.json> <rep-NNN.json> <trad-NNN.json>
   ```
   Corrige `rep-NNN.json` jusqu'à « 0 problème ». Une alerte de langue fausse (un nom propre comme « Le Monde », un mot
   portugais qui ressemble à du français) se lève en ajoutant `"_verifie": {"n": "raison"}` dans la réponse : seulement pour
   un vrai faux positif, jamais pour éviter de traduire.
4. Passe au morceau suivant.

Pour aller vite : lis le glossaire et ces consignes une seule fois ; écris chaque réponse en une fois (Write) ; pour corriger,
change seulement les numéros signalés (Edit), sans réécrire tout le fichier ; ne relis pas un morceau déjà traduit.

## Ton compte rendu final (court : 10 lignes au plus)

- les morceaux faits et leur résultat (« trad-163 : 0 problème ») ;
- les choix de vocabulaire nouveaux à harmoniser avec les autres traducteurs (terme français → terme portugais) ;
- tes doutes éventuels (entrée, numéro, raison).
N'écris rien d'autre : pas de récit des étapes.
