# Leonidakit — étape 1 terminée, relevé des treize classes restantes

Passe du 15 septembre 2026. Les treize pages de classe non encore relevées sur
GTA Base ont été lues une par une, et le relevé transversal des sources a été
fait dans le même mouvement, comme le prévoyait la méthode.

**261 véhicules avant, 300 après.** Six contrôles d'audit à zéro.

---

## Le compte

| | |
|---|---|
| ajoutés | 42 |
| retirés pour fuite | 3 |
| statuts relevés de communautaire à vu | 69 |
| sources vagues précisées | 9 |
| phrases réécrites | 37 |
| **total** | **300** |

Statuts : 9 nommés par Rockstar, 236 vus dans un support officiel,
55 identifications communautaires. Avant cette passe : 9, 125, 127.

---

## Les 42 ajouts

Sur les 29 annoncés, 25 ont été ajoutés et 4 sont tombés : GTA Base les donne
désormais en fuite. Les 16 autres ajouts sont des entrées apparues sur GTA Base
depuis la base de référence du 13 septembre, toutes marquées « NEW » sur leur
page de classe et toutes sourcées sur un support officiel.

**Utility (6)** Airtug, Caddy, F-Series dépanneuse, Forklift, S-Series,
Utility Truck
**Service (4)** Airport Bus, Amloco, Taxi Grand Caravan, Granger Taxi
**Motos (5)** Bati 801, Lectro, Pomazoom, GSX-R1000, BWs 125
**Avions (3)** Luxor, Nimbus, Streamer216
**Coupés (7)** Reatta décapotable, Eldorado 1959, FR36, Mark VIII, Classe CLE
cabriolet, Windsor, Zion Cabrio
**Commercial (4)** Biff, Kodiak / Topkick, Elf 250, Stockade
**Cycles (2)** Trottinette électrique, Race Bike
**Industrial (2)** Excavator, Tipper
**Hélicoptères (1)** Valkyrie
**Sports classics (1)** Kellison J4
**Sports (4)** Itali RSX, Neon, Penumbra FF, Raiden
**Super (2)** Emerus, Aventador

**Deux classes retrouvees hors plan.** Compacts et Military ne figuraient ni
parmi les dix classes declarees terminees ni parmi les treize restantes. Le
selecteur de GTA Base en compte vingt et une, le plan n'en couvrait que
dix-neuf. Military est vide. Compacts contenait la **Chevrolet Sonic**, vue
dans le premier trailer, absente de la base : ajoutee, ce qui fait 42.

---

## Trois fiches retirées

GTA Base a requalifié trois véhicules déjà en base : leur seule apparition
recensée est désormais une fuite. La règle 1 ne laisse pas le choix.

| identifiant | motif |
|---|---|
| `vapid-sadler` | fuite septembre 2022 |
| `hvy-mixer` | fuite septembre 2022 |
| `declasse-tornado` | fuite septembre 2022 |

Leurs URL étaient indexées. Plutôt que de laisser trois 404, `gen.js` génère
maintenant une page d'explication pour chaque identifiant listé dans
`releve/retraits.json` : canonique vers le hub, `noindex`, préservée du
nettoyage, texte qui dit pourquoi la fiche a disparu. Même mécanisme d'esprit
que `redirections.json`, mais sans cible puisqu'il n'y a pas d'équivalent.

Quatre autres entrées ont été écartées avant d'entrer en base, pour la même
raison : Mallard, Regina, Locust, Thrax. Elles figuraient encore comme « à
traiter » dans la référence du 13 septembre.

---

## 69 statuts relevés

C'est le gros du travail, et c'est plus que les 40 à 60 attendus. Les classes
non encore passées en revue étaient largement sous-évaluées : des dizaines
d'entrées marquées communautaires alors que GTA Base les donne dans un trailer,
une capture ou l'Extended Look.

Répartition : Sports 22, Berlines 9, Motos 8, Commercial 6, Service 6,
Hélicoptères 4, Sports classics 3, Super 3, Coupés 2, Cycles 2, Industrial 2,
Avions 1, Utility 1.

Neuf entrées déjà « vues » portaient la source vague « Média officiel de
Rockstar ». Elles pointent maintenant vers le support exact : Blimp, Dodo,
Duster, Mammatus, Shamal, Maverick, Sanchez, VCMM Train, Buzzard.

---

## 37 phrases réécrites, et pourquoi

C'est exactement le piège de l'audit précédent, et il s'est refermé : 36 fiches
dont le statut passait à « vu » gardaient un texte qui finissait par « Rockstar
ne l'a pas confirmée » ou « Aucune apparition officielle recensée ». Le tableau
aurait contredit le texte sur 36 pages.

L'audit les a toutes signalées. Chacune a reçu une phrase de fin différente,
qui dit le support exact plutôt que de nier son existence. Aucune formule n'est
reprise d'une fiche à l'autre.

Une trente-septième correction est un faux positif du contrôle : la Primo
disait « revendue pour rien une décennie plus tard », et le mot « rien » suivi
de « support » quelques mots plus loin déclenchait l'alerte. Tournure changée,
sens conservé.

---

## Deux corrections de fond

**Le Taxi n'avait pas de modèle réel.** `vapid-taxi` portait « Berline
américaine en livrée taxi » en inspiration et le statut communautaire. GTA Base
le donne comme Stanier Taxi sur base Ford Crown Victoria, dans le premier
trailer. Nom, constructeur, inspiration, statut, source et texte refaits.
L'identifiant ne bouge pas, règle 5.

**Deux tirets cadratins dans le gabarit.** `gen.js` écrivait « Ford Crown
Victoria — rapprochement communautaire » et « — anciennement » sur les fiches
concernées. La règle interdit le tiret cadratin dans les textes du site, et le
contrôle typographique ne regardait que les champs de données, pas le
générateur. Remplacés par des parenthèses sur les 299 fiches.

Restent les tirets des balises `<title>` et les tirets d'attente du compte à
rebours. Ce sont des séparateurs, pas de la prose, et toucher 299 titres en
pleine indexation serait plus risqué qu'utile.

---

## Contrôles

| contrôle | résultat |
|---|---|
| statut incohérent avec la source | 0 |
| texte contredisant le tableau | 0 |
| champ obligatoire vide | 0 |
| nom affiché en double | 0 |
| identifiant en double | 0 |
| phrase répétée d'une fiche à l'autre | 0 |
| tiret long, double espace | 0 |

`gen.js` vérifié idempotent sur trois exécutions successives, identique à
l'octet. Compteurs du hub cohérents : 9 / 236 / 55. 300 fiches sur disque plus
une redirection et trois pages de retrait, 300 URL dans chaque sitemap, index
de recherche à 363 entrées.

**Similarité entre fiches** : médiane du plus proche voisin à 44 %, pire paire
à 53 %. Un point de plus qu'au 14 septembre sur la médiane, ce qui est attendu :
42 fiches neuves partagent le même gabarit et n'ont pas encore d'images.

**Contrôle croisé des marques** : 19 écarts, le même nombre qu'avant cette
passe, tous légitimes. Un texte sur la Schafter V12 a le droit de parler de
Mercedes puisque Brabus prépare des Mercedes.

`releve/audit-final.js` a reçu « Artworks officiels » dans sa liste de sources
officielles. Sans cela, une entrée sourcée sur les artworks Rockstar mais
laissée en communautaire serait passée à travers le contrôle de statut.

---

## Ce qui reste

L'étape 1 est finie, les vingt et une classes sont relevées et
`reste-a-traiter.json` est vide. Les étapes 2 à 6 du plan
tiennent toujours, moins l'étape 2 qui vient d'être absorbée ici.

Le vrai chantier suivant, c'est l'étape 3, les images. 42 fiches neuves
s'ajoutent aux 261 qui n'en ont pas. La mention d'illustration provisoire
couvre maintenant 300 pages, et c'est le principal frein à la profondeur des
fiches.

Un point pour la prochaine passe : GTA Base bouge vite. Seize véhicules sont
apparus sur les pages de classe en deux jours, et quatre entrées ont changé de
source dans le même intervalle. Un relevé complet des classes déjà terminées
mériterait d'être refait avant la sortie, pour attraper les mêmes
requalifications ailleurs.
