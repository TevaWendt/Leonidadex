# English glossary and rules — Leonidakit (v7.60, v7.62: whole site)

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

## Whole site (v7.62)

Every page of the site now exists in English (catalogues, map, vehicle and weapon pages, characters, places, trackers…).
Léo is **not** available in English: never write that Léo answers in English; texts that present Léo stay as they are
(where the French says Léo answers, keep it; the English pages simply don't load him).

| French | English |
|---|---|
| fiche (véhicule, arme, lieu…) | page (« la fiche de l’Emperor » → "the Emperor page") |
| Voir la fiche / Retour à la fiche | Open the page / Back to the page |
| Nommé par Rockstar | Named by Rockstar |
| Vu dans un support officiel / Aperçu officiel / Aperçu | Seen in official media / Official sighting / Sighted |
| Identification communautaire / Rapprochement de la communauté / Communautaire | Community identification / Community match / Community |
| Supposé | Assumed |
| Inspiration réelle / Inspiration | Real-world inspiration / Inspiration |
| Équivalent réel | Real-world equivalent |
| Édition Ultimate / édition Standard / précommande / bonus de précommande | Ultimate Edition / Standard Edition / pre-order / pre-order bonus |
| Premier trailer / Second trailer / Trailer 1 / Trailer 2 | Trailer 1 / Trailer 2 (always this form) |
| Captures officielles / capture officielle / visuels officiels | Official screenshots / official screenshot / official artwork |
| Prix à venir / Emplacement à venir / Achat à confirmer | Price to come / Location to come / Purchase to be confirmed |
| Je le veux / Je la veux / Je l’ai / Mes envies / envie(s) | I want it / I want it / I have it / My wishlist / wish(es) |
| Ajouter à mon garage / Dans mon garage / Pas encore dans mon garage | Add to my garage / In my garage / Not in my garage yet |
| Mon garage, Mon arsenal, Ma garde-robe, Mes lieux repérés | My garage, My arsenal, My wardrobe, My spotted places |
| repéré (lieu) / Marquer comme repéré | spotted / Mark as spotted |
| possédé / obtenu / trouvé / goûté / posé (modif) / porté | owned / obtained / found / tasted / installed / worn |
| Carnet de style | Style notebook |
| Comparateur / Classement / Véhicules rares | Comparison / Ranking / Rare vehicles |
| Armurerie / Équipements / Munitions / Mêlée / Projectiles / Armes spéciales | Armory / Gear / Ammo / Melee / Throwables / Special weapons |
| Planques / Demeures / Entreprises / Lieux / Personnages / Collectibles | Safehouses / Residences / Businesses / Places / Characters / Collectibles |
| Consommables / Nourriture / Coiffures / Tatouages / Tenues / Accessoires | Consumables / Food / Hairstyles / Tattoos / Outfits / Accessories |
| Personnalisations / modif(s) | Customization / mod(s) |
| comté, région, quartier, ville, localité | county, region, neighborhood, city, town |
| la carte, un lieu, un bâtiment, une enseigne | the map, a place, a building, a storefront |
| Remarque : … / Type : … | Note: … / Type: … |
| Nom en jeu inconnu à ce jour. | In-game name unknown so far. |
| Bâtiment repéré dans les trailers et captures officielles. | Building spotted in the trailers and official screenshots. |
| les fuites (leaks) | the leaks |

Vehicle, weapon, brand, shop and English place names stay as they are. Real-world model names (« Cadillac Sedan de Ville
1977-1980 ») keep the model; translate only the French words around it (« Pontiac Bonneville fin des années 80 » → "late-80s
Pontiac Bonneville", « Mercedes-Benz Classe C » → "Mercedes-Benz C-Class").

Dates: « 2 octobre 2026 » → "October 2, 2026"; « 1er octobre » → "October 1"; « mai 2025 » → "May 2025".
Numbers: thousands with a comma (`2,547`), decimals with a point (`1.5`).
