# English glossary and rules — Leonidakit (v7.60)

Source language: French (informal « tu »). Target: **US English**, informal "you", short plain sentences, words a gamer uses. The French site deliberately avoids jargon (no "ROI", no "capital", no "amortization" in the interface): keep that spirit.

## Hard rules (the generator and tests depend on them)

1. **Placeholders** `<1>…</1>`, `<2/>` are HTML tags of the original: keep every one, exactly once, same numbers. You may move them to fit English word order. Never add new ones.
2. **Code inside a text** (`" aria-label="`, `">`, `data-x="`, `{`, `=`, backslashes) is kept byte-for-byte; translate only the human words.
3. **Fragments.** Many script entries are pieces of a sentence assembled by code (the context shows the code around them: `'Il manque ' + money(x) + ' pour ' + name`). Translate each piece so the assembled English sentence reads naturally. Do not add or remove leading/trailing spaces: write the translation trimmed, the generator restores the original spacing. Single small words used as joiners (`et`, `de`, `pour`, `avec`, `sur`, `ou`, `dans`) translate to the English joiner that fits the context (`and`, `of`, `for`, `with`, `on`, `or`, `in`).
4. **Plural suffix appended by code** (`n + ' achat' + (n > 1 ? 's' : '')`): translate the singular (`purchase`) so the appended `s` still works. If the code appends something else (`'e'`, `'x'`, `'es'`), choose an English word that stays correct, and mention it in `"_notes"`.
5. **Money**: never write a dollar sign after a number. French `200 000 $` → `$200,000`; `1,5 million` → `1.5 million`; `100 000 $` → `$100,000`; `0 $` → `$0`. When the French fragment only contains the sign around a number built by code, the code already places it: translate the words only. Percent: `100 %` → `100%`. Hours stay `1 h 30`, `45 min`.
6. **Punctuation**: no space before `: ; ? !`. French quotes « » → “ ”. Apostrophe ’.
7. **Keep as is** (write `"="` as the translation when the whole text is a name): Leonidakit, Leonida, Léo, GTA VI, Grand Theft Auto, Rockstar Games, Take-Two Interactive, Vice City, Port Gellhorn, Grassrivers, Mount Kalaga, Ambrosia, Jason, Lucia, Brian Heder, Boobie, brand and vehicle/weapon names (Albany Emperor, Girardi ES9…), shop names (Rideout Customs, Ammu-Nation…), law names (LCEN, RGPD → GDPR, CNIL), Vercel, Brevo, OVH.
8. Words some code still looks for — **use them exactly when the French has the idea**:
   - « argent mis de côté », « gardé de côté », « de côté » → **set aside** (e.g. « l’argent que je garde de côté » → "money I set aside").
   - « par heure » → **per hour**; « par jour » → **per day**; « par partie » → **per session**; « jours par semaine » → **days per week**; « temps de jeu par jour » → **play time per day**; « joueurs » → **players**; « durée » → **duration**; « frais » → **fees**; « coûts » → **costs**; « dépenses par partie » → **expenses per session**; « il faut atteindre » → **you need to reach**; « prochaine partie » → **next session**.
   - « J’ai déjà » → **I already have**; « Je veux avoir » → **I want to have**; « Je gagne » at the start of a label → **I earn**; « objectif » → **goal**.
   - Error messages that start with « Écris… / Dis… / Choisis… / Ajoute… / Note… » must start with **Enter… / Tell… / Choose… / Add… / Note…**.
   - « Parcours à compléter » → **Path to complete**.
   - « TES CHIFFRES » → **YOUR NUMBERS**.
   - « Achat « » (event label `'Achat « ' + name + ' »'`) → **Purchase “** and « » » → **”**.
   - « non enregistré(e)(s) » → contains **not saved**; « mémoire seulement » → contains **memory only**.
   - « Terminé » (step state) → **Done**.

## Fixed vocabulary

| French | English |
|---|---|
| Calculateur | Calculator |
| Mon objectif | My goal |
| Mes achats | My purchases |
| Est-ce que je peux l’acheter ? | Can I buy it? |
| Mon temps de jeu | My play time |
| Mon budget | My budget |
| Quoi acheter d’abord ? | What should I buy first? |
| Ça vaut le coup ? | Is it worth it? |
| Mes activités | My activities |
| Quel achat choisir ? | Which purchase should I pick? |
| Mon business plan | My business plan |
| Mes calculs / Mes plans | My calculations / My plans |
| les huit calculs | the eight calculations |
| Simple / Pas à pas / Expert | Simple / Step by step / Expert |
| partie (of the game) | session |
| heure de jeu / temps de jeu | hour of play / play time |
| mission, activité, braquage | mission, activity, heist |
| récompense, frais, préparation, attente | reward, fees, prep, cooldown |
| ta part | your share |
| gain, gain net, gagné en plus | earnings, net earnings, extra earned |
| achat, achat libre, Mon achat libre | purchase, custom purchase, My custom purchase |
| le prix que tu imagines | the price you imagine |
| remboursé | paid back |
| coût d’usage | running cost |
| carburant, entretien, réparations, assurance, revente | fuel, maintenance, repairs, insurance, resale |
| Mon envie, de 1 à 5 / Envie | How much I want it (1 to 5) / Want score |
| fiche (an item page of the site) | page (« Retour à la fiche » → "Back to the page", « Voir la fiche » → "Open the page") |
| fiche de calcul / fiche du plan | calculation sheet / plan sheet |
| carnet(s), Mes carnets | tracker(s), My trackers |
| Mon garage, Mon arsenal | My garage, My arsenal |
| Enregistrer ce calcul / le plan | Save this calculation / Save the plan |
| Exporter, Importer, Partager | Export, Import, Share |
| Afficher plus de détails | Show more details |
| catalogue | catalog |
| Tuto | Tutorial |
| Carte, Véhicules, Armurerie, Achats, Progression | Map, Vehicles, Armory, Shop, Progress |
| Explorer (menu) | Explore |
| Le monde, Lieux, Personnages, Demeures, Planques, Entreprises, Collectibles | The world, Places, Characters, Residences, Safehouses, Businesses, Collectibles |
| S’équiper | Gear up |
| Le site, À propos, Contact, Médias et crédits, Mentions et confidentialité | The site, About, Contact, Media and credits, Legal and privacy |
| Tout ce qui s’achète | Everything you can buy |
| Consommables, Vêtements et style, Personnalisations | Consumables, Clothing and style, Customization |
| Munitions et équipement, Logements et appartements, Bateaux | Ammo and gear, Housing and apartments, Boats |
| Comprendre les statuts | Understanding statuses |

## Statuses

Officiel → Official · Vu dans un média → Seen in media · Identification communautaire → Community identification · Repère de la série → Series benchmark · À confirmer → To be confirmed · Pas encore connu → Not known yet · Estimation → Estimate · Estimé → Estimated · Valeur personnelle → Personal value · Non confirmé → Unconfirmed · Mesuré et vérifié → Measured and verified · Mesuré → Measured · Ton chiffre → Your number · À toi → Yours · Exemple → Example · Simulation → Simulation · Sans objet → Not applicable · Pas encore écrit / À écrire → Not written yet / To write · Prix à venir → Price to come · Achat à confirmer → Purchase to be confirmed · Mécanique non confirmée → Unconfirmed mechanic · Autre jeu → Other game.

## Legal page (Mentions et confidentialité)

éditeur → publisher · hébergeur → host · responsable du traitement → data controller · délégué à la protection des données → data protection officer · base légale → legal basis · intérêt légitime → legitimate interest · consentement → consent · loi Informatique et Libertés → French Data Protection Act (loi Informatique et Libertés) · LCEN keep the acronym · CNIL keep. Keep every date, address and number.

## Whole site (v7.61)

Same rules as above. Additional fixed vocabulary for hubs, lists, item pages, the map, trackers and search:

| French | English |
|---|---|
| fiche (page about one item) | page (« Voir la fiche » → "Open the page", « fiche véhicule » → "vehicle page") |
| hub / page de section | section page |
| liste dépliable | expandable list |
| carnet, carnets de progression | tracker, progress trackers (« Mon garage » → "My garage", « Mon arsenal » → "My arsenal", « Ma garde-robe » → "My wardrobe", « Mes consommables » → "My consumables", « Mes personnalisations » → "My customizations", « Mes propriétés » → "My properties", « Mes lieux » → "My places", « Mes collectibles » → "My collectibles", « Mes calculs » → "My calculations") |
| possédé / à obtenir / envie | owned / to get / wishlist (« Je l’ai » → "I have it", « J’en ai envie » → "I want it") |
| repéré (lieu, véhicule) | spotted |
| rapprochement (inspiration réelle) | match (« rapprochement communautaire » → "community match") |
| modèle réel, inspiration réelle | real-world model, real-world inspiration |
| Équivalent réel | Real-world equivalent |
| Nom en jeu inconnu à ce jour | In-game name not known yet |
| bâtiment, comté, ville, quartier | building, county, city, district |
| Comtés / Villes / Quartiers / Bâtiments / Transports / Nature / Lieu / Planques (catégories de la carte) | Counties / Cities / Districts / Buildings / Transport / Nature / Place / Safehouses |
| Voir sur la carte | See on the map |
| Personnages, Demeures, Planques, Entreprises, Lieux, Régions | Characters, Residences, Safehouses, Businesses, Places, Regions |
| Armurerie, Armes, Munitions, Équipement | Armory, Weapons, Ammo, Gear |
| Véhicules : Berlines, Voitures de sport, Supercars, Muscle cars, SUV et 4x4, Pickups et tout-terrain, Vans et cargos, Deux-roues et quads, Hélicoptères, Avions, Bateaux et jet-skis, Service et urgence, Divers | Sedans, Sports cars, Supercars, Muscle cars, SUVs and 4x4s, Pickups and off-roaders, Vans and cargo vans, Two-wheelers and quads, Helicopters, Planes, Boats and jet skis, Service and emergency, Misc. |
| Armes : Pistolets, Fusils à pompe, Pistolets-mitrailleurs, Fusils d’assaut, Précision, Mitrailleuses, Mêlée, Projectiles, Spéciales | Pistols, Shotguns, Submachine guns, Assault rifles, Precision rifles, Machine guns, Melee, Throwables, Special |
| Consommables, Vêtements et style, Coiffures, Tatouages, Tenues, Accessoires, Personnalisations, Logements, Garages | Consumables, Clothing and style, Hairstyles, Tattoos, Outfits, Accessories, Customization, Housing, Garages |
| Édition Standard / Édition Ultimate / précommande | Standard Edition / Ultimate Edition / pre-order |
| bande-annonce, trailer, capture officielle, visuel officiel | trailer, trailer, official screenshot, official image |
| Repère de la série (chiffre d’un autre GTA) | Series benchmark |
| marque inconnue | unknown brand |
| Ajouter à mon garage | Add to my garage |
| Comparer, Personnaliser | Compare, Customize |
| Classement | Ranking |

Search keywords (strings of lowercase words with no accents, used only for matching, e.g. « lexington (michael) coupe classique de michael : 40 $ en salon courant ») : translate into lowercase English keywords, keep every name, no accents, plain spaces, prices as "$40".

Numbers: keep every number of the French text, in the same order whenever the sentence allows (counts change from one update to the next and are matched automatically). « 1 250 » → "1,250", « 2,5 » → "2.5", « 20 % » → "20%", « 1 250 $ » → "$1,250", dates « 19 novembre 2026 » → "November 19, 2026", « 1er » → "1st" only in dates written out (« le 1er octobre » → "on October 1").
