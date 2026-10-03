# Glossaire et règles de l’italien — Leonidakit (v7.63)

Langue source : le français du site (tutoiement). Cible : **italien standard** (`it-IT`), **tu** (jamais « Lei »), phrases
courtes et simples, mots de joueur. Le site évite volontairement le jargon (pas de « ROI », pas de « capitale », pas
d’« ammortamento » dans l’interface) : garder cet esprit. Les titres suivent la règle italienne (majuscule au premier mot
seulement : « I miei acquisti », « Il mondo di Leonida »).

## Règles dures (le générateur et les tests en dépendent)

1. **Repères** `<1>…</1>`, `<2/>` : ce sont les balises HTML d’origine. Chacun reste, une seule fois, avec le même numéro. On
   peut les déplacer pour suivre l’ordre des mots italiens. Jamais en ajouter ni en retirer.
2. **Code dans un texte** (`" aria-label="`, `">`, `data-x="`, `{`, `=`, barres obliques inverses) : recopié à l’octet près ; on
   ne traduit que les mots lus.
3. **Morceaux de phrase.** Beaucoup d’entrées de script sont des morceaux assemblés par le code (le contexte montre le code
   autour : `'Il manque ' + money(x) + ' pour ' + name`). Traduire chaque morceau pour que la phrase italienne assemblée se lise
   bien. Écrire la traduction **sans espace au début ni à la fin** : le générateur remet les espaces d’origine. Les petits mots
   de liaison (`et`, `de`, `pour`, `avec`, `sur`, `ou`, `dans`) prennent le mot italien qui va dans ce contexte (`e`, `di`,
   `per`, `con`, `su`, `o`, `in`). Attention aux articles contractés (`di` + `il` = `del`…) : si le morceau suivant commence par
   un nom posé par le code, préférer une tournure qui marche avec n’importe quel nom (« per Kamacho », « di 3 partite »).
4. **Pluriel.** Le code choisit entre deux formes écrites en entier (`E.plural(n) ? ' missions' : ' mission'`,
   `plural(n, 'partie', 'parties')`) : traduire chaque forme en entier (« missioni » / « missione », « partite » /
   « partita »). En v7.63, plus aucun pluriel n’est formé en ajoutant « s » dans le code. Accorder l’adjectif ou le participe
   qui suit (« 2 risultati trovati »).
5. **Argent** : le signe dollar se met **après** le nombre, avec une espace : `200 000 $` → `200.000 $` ; `1,5 million` →
   `1,5 milioni` ; `0 $` → `0 $` ; `100 k $` → `100 k $` ; `1,5 M $` → `1,5 M $`. Séparateur des milliers : le point, **dès 1 000**
   (comme l’écrit le navigateur en italien) : `1 250` → `1.250`, `2 547` → `2.547`, `200 000` → `200.000` ; jamais dans une année
   (`2026`) ni dans un nom de modèle (`911`, `Streamer216`). Décimales
   avec la virgule : `1,5`. Pourcentage collé au nombre, comme l’écrit le navigateur en italien : `100%`. Heures : `1 h 30`, `45 min`. Quand le morceau français ne
   contient que le signe autour d’un nombre posé par le code, le code place déjà le signe : traduire seulement les mots.
6. **Ponctuation** : pas d’espace avant `: ; ? !`. Guillemets « » → “ ” (le générateur les convertit de toute façon).
   Apostrophe ’ des élisions italiennes (« l’auto », « dov’è ») gardée.
7. **À garder tels quels** (écrire `"="` quand tout le texte est un nom) : Leonidakit, Leonida, Léo, GTA VI, Grand Theft Auto,
   Rockstar Games, Take-Two Interactive, Vice City, Port Gellhorn, Grassrivers, Mount Kalaga, Ambrosia, Leonida Keys, Jason,
   Lucia, Brian Heder, Boobie, Cal, Dre’Quan, Real Dimez, les noms de marques et de modèles (Albany Emperor, Girardi ES9…), de
   boutiques et d’enseignes (Rideout Customs, Ammu-Nation…), les noms de lieux anglais de la carte (Ocean Beach, Water Tower,
   Parking Lot…), les noms de lois (LCEN, RGPD → GDPR, CNIL), Vercel, Brevo, OVH, Édition Ultimate → « Ultimate Edition »,
   Pack Vintage Vice City → « Pack Vintage Vice City ».
8. **Mots que le code cherche** — à employer exactement quand le français a l’idée :
   - « argent mis de côté », « gardé de côté », « de côté » → **da parte** (« l’argent que je garde de côté » → « i soldi che
     tengo da parte »).
   - « par heure » → **all’ora** ; « par jour » → **al giorno** ; « par partie » → **per partita** ; « jours par semaine » →
     **giorni a settimana** ; « temps de jeu par jour » → **tempo di gioco al giorno** ; « joueurs » → **giocatori** ; « durée »
     → **durata** ; « frais » → **spese** ; « coûts » → **costi** ; « dépenses par partie » → **spese per partita** ; « il faut
     atteindre » → **bisogna arrivare a** ; « prochaine partie » → **prossima partita**.
   - « J’ai déjà » → **Ho già** ; « Je veux avoir » → **Voglio avere** ; « Je gagne » en tête d’un libellé → **Guadagno** ;
     « objectif » → **obiettivo** ; « prix » → **prezzo** ; « durée de session », « temps disponible » → **durata della
     partita**, **tempo disponibile** ; « durée en heures » → **durata in ore** ; « tu t’en sers » → **lo usi**.
   - Messages d’erreur qui commencent par « Écris… / Dis… / Choisis… / Ajoute… / Note… » : commencer par **Scrivi… / Dimmi… /
     Scegli… / Aggiungi… / Annota…**.
   - « Parcours à compléter » → **Percorso da completare**.
   - « TES CHIFFRES » → **I TUOI NUMERI**.
   - « Achat « » (étiquette `'Achat « ' + nom + ' »'`) → **Acquisto “** et « » » → **”**.
   - « non enregistré(e)(s) » → contient **non salvat…** ; « mémoire seulement » → contient **solo in memoria**.
   - « Mission 1 » (étiquette d’une mission du plan) → **Missione 1**.
   - « Terminé » (état d’une étape) → **Fatto**.
9. **Léo existe en italien** : ne jamais écrire qu’il ne parle que français.

## Vocabulaire fixe

| Français | Italiano |
|---|---|
| Calculateur | Calcolatore |
| Mon objectif | Il mio obiettivo |
| Mes achats | I miei acquisti |
| Est-ce que je peux l’acheter ? | Posso comprarlo? |
| Mon temps de jeu | Il mio tempo di gioco |
| Mon budget | Il mio budget |
| Quoi acheter d’abord ? | Cosa compro prima? |
| Ça vaut le coup ? | Ne vale la pena? |
| Mes activités | Le mie attività |
| Quel achat choisir ? | Quale acquisto scelgo? |
| Mon business plan | Il mio business plan |
| Mes calculs / Mes plans | I miei calcoli / I miei piani |
| les huit calculs | gli otto calcoli |
| Simple / Pas à pas / Expert | Semplice / Passo passo / Esperto |
| partie (de jeu) | partita |
| heure de jeu / temps de jeu | ora di gioco / tempo di gioco |
| mission, activité, braquage | missione, attività, colpo |
| récompense, frais, préparation, attente | ricompensa, spese, preparazione, attesa |
| ta part | la tua parte |
| gain, gain net, gagné en plus | guadagno, guadagno netto, guadagnato in più |
| achat, achat libre, Mon achat libre | acquisto, acquisto libero, Il mio acquisto libero |
| le prix que tu imagines | il prezzo che immagini |
| remboursé, se rembourse | ripagato, si ripaga (« lo ripaghi in 3 h di gioco ») |
| coût d’usage | costo d’uso |
| carburant, entretien, réparations, assurance, revente | carburante, manutenzione, riparazioni, assicurazione, rivendita |
| Mon envie, de 1 à 5 / Envie | La mia voglia, da 1 a 5 / Voglia |
| fiche (page d’un élément du site) | scheda (« Retour à la fiche » → « Torna alla scheda », « Voir la fiche » → « Vedi la scheda ») |
| fiche de calcul / fiche du plan | scheda del calcolo / scheda del piano |
| carnet(s), Mes carnets | quaderno/i, I miei quaderni |
| Mon garage, Mon arsenal, Ma garde-robe | Il mio garage, Il mio arsenale, Il mio guardaroba |
| Mes lieux repérés / repéré | I miei luoghi scoperti / scoperto |
| Je le veux / Je la veux / Je l’ai / Mes envies | Lo voglio / La voglio / Ce l’ho / I miei desideri |
| Ajouter à mon garage / Dans mon garage / Pas encore dans mon garage | Aggiungi al mio garage / Nel mio garage / Non ancora nel mio garage |
| Enregistrer ce calcul / le plan | Salva questo calcolo / Salva il piano |
| Exporter, Importer, Partager | Esporta, Importa, Condividi |
| Afficher plus de détails | Mostra più dettagli |
| catalogue | catalogo |
| Tuto | Tutorial |
| Carte, Véhicules, Armurerie, Achats, Progression | Mappa, Veicoli, Armeria, Acquisti, Progressi |
| Suivi de progression | Monitoraggio dei progressi |
| Explorer (menu) | Esplora |
| Le monde, Lieux, Personnages, Demeures, Planques, Entreprises, Collectibles | Il mondo, Luoghi, Personaggi, Residenze, Rifugi, Attività commerciali, Collezionabili |
| S’équiper | Equipaggiarsi |
| Le site, À propos, Contact, Médias et crédits, Mentions et confidentialité | Il sito, Chi siamo, Contatti, Media e crediti, Note legali e privacy |
| Tout ce qui s’achète | Tutto ciò che si compra |
| Consommables, Vêtements et style, Personnalisations | Consumabili, Abbigliamento e stile, Personalizzazione |
| Nourriture, Tatouages, Coiffures, Tenues et accessoires | Cibo, Tatuaggi, Acconciature, Outfit e accessori |
| Munitions et équipement, Logements et appartements, Bateaux | Munizioni ed equipaggiamento, Case e appartamenti, Barche |
| Garages documentés | Garage documentati |
| Classement, Comparateur, Véhicules rares | Classifica, Comparatore, Veicoli rari |
| Comprendre les statuts | Capire gli stati |
| bande-annonce, trailer, captures, médias officiels | trailer, trailer, screenshot, media ufficiali (« Premier trailer » → « Trailer 1 », « Second trailer » → « Trailer 2 ») |
| précommande, édition Standard / Ultimate | preordine, Standard Edition / Ultimate Edition |
| comté, région, quartier, ville | contea, regione, quartiere, città |
| inspiration réelle / Équivalent réel | ispirazione reale / Equivalente reale |
| à confirmer | da confermare |
| Véhicule · …, Arme · …, Lieu recensé · … (catégorie de Léo) | Veicolo · …, Arma · …, Luogo censito · … (le code de Léo les cherche) |

Les véhicules sont masculins quand on parle du modèle (« il Kamacho », « il veicolo ») ; « l’auto » et « la moto » sont
féminins ; une arme prend le genre de son type (« la pistola », « il fucile »).

## Statuts

Officiel → Ufficiale · Vu dans un média → Visto in un media · Identification communautaire → Identificazione della community ·
Repère de la série → Riferimento della serie · À confirmer → Da confermare · Pas encore connu → Non ancora noto · Estimation →
Stima · Estimé → Stimato · Valeur personnelle → Valore personale · Non confirmé → Non confermato · Mesuré et vérifié →
Misurato e verificato · Mesuré → Misurato · Ton chiffre → Il tuo numero · À toi → Tuo · Exemple → Esempio · Simulation →
Simulazione · Sans objet → Non applicabile · Pas encore écrit / À écrire → Non ancora scritto / Da scrivere · Prix à venir →
Prezzo in arrivo · Emplacement à venir → Posizione in arrivo · Achat à confirmer → Acquisto da confermare · Mécanique non
confirmée → Meccanica non confermata · Autre jeu → Altro gioco · Nommé par Rockstar → Nominato da Rockstar · Vu dans un
support officiel → Visto in un media ufficiale.

## Page Mentions et confidentialité

éditeur → editore · hébergeur → hosting provider (fornitore di hosting) · responsable du traitement → titolare del
trattamento · délégué à la protection des données → responsabile della protezione dei dati · base légale → base giuridica ·
intérêt légitime → legittimo interesse · consentement → consenso · loi Informatique et Libertés → legge francese
« Informatique et Libertés » · LCEN, CNIL gardés, RGPD → GDPR · « la version française fait foi » → « fa fede la versione
francese ». Garder chaque date, adresse et nombre.

## Dates

« 2 octobre 2026 » → « 2 ottobre 2026 » ; « 1er octobre » → « 1° ottobre » ; mois et jours en minuscules. Dates chiffrées :
même ordre qu’en français (« 23/09/2026 »).

## Termes fixés pendant la traduction (v7.63)

| Français | Italiano |
|---|---|
| Officiel / Aperçu(e) / Supposé (statuts de la carte et des fiches) | Ufficiale / Avvistato (Avvistata) / Presunto |
| repéré (vu dans les médias officiels, placé sur la carte par le site : « 2 547 lieux repérés », « armureries repérées ») | individuato (« 2.547 luoghi individuati ») |
| repéré (coché par le visiteur : « Mes lieux repérés », « Marquer comme repéré ») | scoperto (« I miei luoghi scoperti », « Segna come scoperto ») |
| repère, marqueur (sur la carte) | segnaposto |
| onglet (du calculateur, d’une page) / onglet du navigateur | sezione / scheda del browser |
| carte (une carte affichée, pas la Carte du jeu) | riquadro |
| Accueil (fil d’Ariane, menu) | Home |
| atelier (espace de travail du calculateur) | area di lavoro |
| Entreprise / Entreprises | Attività commerciale / Attività commerciali |
| Chez Brian et Lori, Chez X | Casa di Brian e Lori, Casa di X |
| suivi (« Tout mon suivi », « Exporter mon suivi ») | i miei progressi (« Tutti i miei progressi », « Esporta i miei progressi ») |
| Je gagne à peu près | Guadagno più o meno |
| étape (d’un parcours, d’un plan) | tappa (« Tappa per tappa ») ; « Ta prochaine étape » → « Il tuo prossimo passo » |
| rang (niveau du joueur) | livello |
| stock, en stock, stock à renseigner | scorta, disponibili, scorta da indicare |
| J’en ai utilisé un / J’en ai racheté un | Ne ho usato uno / Ne ho ricomprato uno |
| constructeur d’équipement | configuratore di equipaggiamento |
| Pistolet-mitrailleur, PM / Pistolets-mitrailleurs | Mitraglietta / Mitragliette |
| Mêlée / Corps à corps | Mischia / Corpo a corpo |
| Projectiles (famille d’armes) | Armi da lancio (étiquette courte : « Da lancio ») |
| Arme de poing / Arme longue | Arma corta / Arma lunga |
| Précision, Spéciales (familles d’armes) | Precisione, Speciali |
| Fusil-harpon, Grenade fumigène, Queue de billard, Cocktail Molotov | Fucile ad arpione, Granata fumogena, Stecca da biliardo, Molotov |
| Famille : (type d’objet) | Tipo: |
| Signaler une mauvaise réponse | Segnala una risposta sbagliata |
| rapprochement communautaire / Communautaire (badge) | accostamento della community / Della community |
| Aperçu officiel (badge) | Avvistato ufficialmente |
| Fiche encyclopédique | Voce enciclopedica |
| Voir X en photo | Vedi X in foto |
| Précédent / Suivant (fiches véhicules ; armes : Precedente / Successiva) | Precedente / Successivo |
| Autres modèles japonais, américains… | Altri modelli giapponesi, americani… |
| l’édition Ultimate, l’Ultimate Edition | l’Ultimate Edition |
| X connu(s) sur 6 | 0 noti su 6, 1 noto su 6, 2 noti su 6 |
| catégories de véhicules : Berlines, Pickups et tout-terrain, Service et urgence, Bateaux et jet-skis, Divers | Berline, Pickup e fuoristrada, Servizio ed emergenza, Barche e moto d’acqua, Varie (les autres : reprendre les fiches déjà traduites) |
