# Glossaire et règles de l’espagnol — Leonidakit (v7.61)

Langue source : le français du site (tutoiement). Cible : **espagnol d’Espagne** (`es-ES`), **tuteo** (« tú », jamais « usted »),
phrases courtes et simples, mots de joueur. Le site évite volontairement le jargon (pas de « ROI », pas de « capital », pas
d’« amortización » dans l’interface) : garder cet esprit. Vocabulaire d’Espagne : « coche » (pas « carro » ni « auto »),
« ordenador », « móvil », « vale la pena ». Les titres suivent la règle espagnole (majuscule au premier mot seulement :
« Mis compras », « El mundo de Leonida »).

## Règles dures (le générateur et les tests en dépendent)

1. **Repères** `<1>…</1>`, `<2/>` : ce sont les balises HTML d’origine. Chacun reste, une seule fois, avec le même numéro. On
   peut les déplacer pour suivre l’ordre des mots espagnols. Jamais en ajouter ni en retirer.
2. **Code dans un texte** (`" aria-label="`, `">`, `data-x="`, `{`, `=`, barres obliques inverses) : recopié à l’octet près ; on
   ne traduit que les mots lus.
3. **Morceaux de phrase.** Beaucoup d’entrées de script sont des morceaux assemblés par le code (le contexte montre le code
   autour : `'Il manque ' + money(x) + ' pour ' + name`). Traduire chaque morceau pour que la phrase espagnole assemblée se lise
   bien. Écrire la traduction **sans espace au début ni à la fin** : le générateur remet les espaces d’origine. Les petits mots
   de liaison (`et`, `de`, `pour`, `avec`, `sur`, `ou`, `dans`) prennent le mot espagnol qui va dans ce contexte (`y`, `de`,
   `para`, `con`, `sobre`, `o`, `en`).
4. **Pluriel ajouté par le code** (`n + ' achat' + (n > 1 ? 's' : '')`) : traduire le singulier pour que le « s » ajouté reste
   juste (« compra » → « compras »). Si le mot espagnol fait son pluriel autrement (« misión » → « misiones », « mes » → « meses »),
   choisir un mot qui marche avec « s » ou le signaler dans `"_notes"`. Quand le code choisit entre deux formes écrites en entier
   (`E.plural(n) ? 'missions' : 'mission'`), traduire chaque forme en entier (« misiones » / « misión »).
5. **Argent** : le signe dollar se met **après** le nombre, avec une espace : `200 000 $` → `200.000 $` ; `1,5 million` →
   `1,5 millones` ; `0 $` → `0 $` ; `100 k $` → `100 k $` ; `1,5 M $` → `1,5 M $`. Séparateur des milliers : le point, **à partir
   de 10 000** (norme espagnole) : `1 250` → `1250`, `12 500` → `12.500`, `200 000` → `200.000`. Décimales avec la virgule :
   `1,5`. Pourcentage avec une espace : `100 %`. Heures : `1 h 30`, `45 min`. Quand le morceau français ne contient que le signe
   autour d’un nombre posé par le code, le code place déjà le signe : traduire seulement les mots.
6. **Ponctuation** : `¿…?` et `¡…!` (ouvrants obligatoires dans une phrase entière ; dans un morceau, l’ouvrant va dans le
   morceau qui commence la question). Pas d’espace avant `: ; ? !`. Guillemets « » → “ ” (le générateur les convertit de toute
   façon). Apostrophe ’ seulement dans les noms (Phil’s).
7. **À garder tels quels** (écrire `"="` quand tout le texte est un nom) : Leonidakit, Leonida, Léo, GTA VI, Grand Theft Auto,
   Rockstar Games, Take-Two Interactive, Vice City, Port Gellhorn, Grassrivers, Mount Kalaga, Ambrosia, Leonida Keys, Jason,
   Lucia, Brian Heder, Boobie, Cal, Dre’Quan, Real Dimez, les noms de marques et de modèles (Albany Emperor, Girardi ES9…), de
   boutiques et d’enseignes (Rideout Customs, Ammu-Nation…), les noms de lieux anglais de la carte (Ocean Beach, Water Tower,
   Parking Lot…), les noms de lois (LCEN, RGPD, CNIL), Vercel, Brevo, OVH, Édition Ultimate → « edición Ultimate ».
8. **Mots que le code cherche** — à employer exactement quand le français a l’idée :
   - « argent mis de côté », « gardé de côté », « de côté » → **apartado** (« l’argent que je garde de côté » → « el dinero que
     dejo apartado »).
   - « par heure » → **por hora** ; « par jour » → **por día** ; « par partie » → **por partida** ; « jours par semaine » →
     **días por semana** ; « temps de jeu par jour » → **tiempo de juego por día** ; « joueurs » → **jugadores** ; « durée » →
     **duración** ; « frais » → **gastos** ; « coûts » → **costes** ; « dépenses par partie » → **gastos por partida** ; « il
     faut atteindre » → **hay que llegar a** ; « prochaine partie » → **próxima partida**.
   - « J’ai déjà » → **Ya tengo** ; « Je veux avoir » → **Quiero tener** ; « Je gagne » en tête d’un libellé → **Gano** ;
     « objectif » → **objetivo**.
   - Messages d’erreur qui commencent par « Écris… / Dis… / Choisis… / Ajoute… / Note… » : commencer par **Escribe… / Dime… /
     Elige… / Añade… / Anota…**.
   - « Parcours à compléter » → **Recorrido por completar**.
   - « TES CHIFFRES » → **TUS CIFRAS**.
   - « Achat « » (étiquette `'Achat « ' + nom + ' »'`) → **Compra “** et « » » → **”**.
   - « non enregistré(e)(s) » → contient **no guardado** ; « mémoire seulement » → contient **solo en memoria**.
   - « Terminé » (état d’une étape) → **Hecho**.
9. **Léo existe en espagnol** : ne jamais écrire qu’il ne parle que français.

## Vocabulaire fixe

| Français | Español |
|---|---|
| Calculateur | Calculadora |
| Mon objectif | Mi objetivo |
| Mes achats | Mis compras |
| Est-ce que je peux l’acheter ? | ¿Puedo comprarlo? |
| Mon temps de jeu | Mi tiempo de juego |
| Mon budget | Mi presupuesto |
| Quoi acheter d’abord ? | ¿Qué compro primero? |
| Ça vaut le coup ? | ¿Vale la pena? |
| Mes activités | Mis actividades |
| Quel achat choisir ? | ¿Qué compra elijo? |
| Mon business plan | Mi plan de negocio |
| Mes calculs / Mes plans | Mis cálculos / Mis planes |
| les huit calculs | los ocho cálculos |
| Simple / Pas à pas / Expert | Simple / Paso a paso / Experto |
| partie (de jeu) | partida |
| heure de jeu / temps de jeu | hora de juego / tiempo de juego |
| mission, activité, braquage | misión, actividad, golpe |
| récompense, frais, préparation, attente | recompensa, gastos, preparación, espera |
| ta part | tu parte |
| gain, gain net, gagné en plus | ganancia, ganancia neta, ganado de más |
| achat, achat libre, Mon achat libre | compra, compra libre, Mi compra libre |
| le prix que tu imagines | el precio que imaginas |
| remboursé, se rembourse | recuperado, se recupera (« lo recuperas en 3 h de juego ») |
| coût d’usage | coste de uso |
| carburant, entretien, réparations, assurance, revente | combustible, mantenimiento, reparaciones, seguro, reventa |
| Mon envie, de 1 à 5 / Envie | Mis ganas, de 1 a 5 / Ganas |
| fiche (page d’un élément du site) | ficha (« Retour à la fiche » → « Volver a la ficha », « Voir la fiche » → « Ver la ficha ») |
| fiche de calcul / fiche du plan | ficha del cálculo / ficha del plan |
| carnet(s), Mes carnets | cuaderno(s), Mis cuadernos |
| Mon garage, Mon arsenal, Ma garde-robe | Mi garaje, Mi arsenal, Mi armario |
| Enregistrer ce calcul / le plan | Guardar este cálculo / Guardar el plan |
| Exporter, Importer, Partager | Exportar, Importar, Compartir |
| Afficher plus de détails | Mostrar más detalles |
| catalogue | catálogo |
| Tuto | Tutorial |
| Carte, Véhicules, Armurerie, Achats, Progression | Mapa, Vehículos, Armería, Compras, Progreso |
| Suivi de progression | Seguimiento del progreso |
| Explorer (menu) | Explorar |
| Le monde, Lieux, Personnages, Demeures, Planques, Entreprises, Collectibles | El mundo, Lugares, Personajes, Residencias, Escondites, Negocios, Coleccionables |
| S’équiper | Equiparse |
| Le site, À propos, Contact, Médias et crédits, Mentions et confidentialité | El sitio, Acerca de, Contacto, Medios y créditos, Aviso legal y privacidad |
| Tout ce qui s’achète | Todo lo que se compra |
| Consommables, Vêtements et style, Personnalisations | Consumibles, Ropa y estilo, Personalización |
| Nourriture, Tatouages, Coiffures, Tenues et accessoires | Comida, Tatuajes, Peinados, Atuendos y accesorios |
| Munitions et équipement, Logements et appartements, Bateaux | Munición y equipo, Viviendas y apartamentos, Barcos |
| Garages documentés | Garajes documentados |
| Classement, Comparateur, Véhicules rares | Clasificación, Comparador, Vehículos raros |
| Comprendre les statuts | Entender los estados |
| bande-annonce, trailer, captures, médias officiels | tráiler, tráiler, capturas, medios oficiales |
| précommande, édition Standard / Ultimate | reserva, edición Standard / Ultimate |
| comté, région, quartier, ville | condado, región, barrio, ciudad |
| inspiration réelle | inspiración real |
| à confirmer | por confirmar |

Les véhicules sont masculins (« el Emperor », « el coche ») ; une arme prend le genre de son type (« la pistola », « el
rifle », « la escopeta »).

## Statuts

Officiel → Oficial · Vu dans un média → Visto en un medio · Identification communautaire → Identificación de la comunidad ·
Repère de la série → Referencia de la saga · À confirmer → Por confirmar · Pas encore connu → Aún no se conoce · Estimation →
Estimación · Estimé → Estimado · Valeur personnelle → Valor personal · Non confirmé → No confirmado · Mesuré et vérifié →
Medido y verificado · Mesuré → Medido · Ton chiffre → Tu cifra · À toi → Tuyo · Exemple → Ejemplo · Simulation → Simulación ·
Sans objet → No aplica · Pas encore écrit / À écrire → Aún sin escribir / Por escribir · Prix à venir → Precio próximamente ·
Achat à confirmer → Compra por confirmar · Mécanique non confirmée → Mecánica no confirmada · Autre jeu → Otro juego.

## Page Mentions et confidentialité

éditeur → editor · hébergeur → proveedor de alojamiento · responsable du traitement → responsable del tratamiento · délégué à
la protection des données → delegado de protección de datos · base légale → base jurídica · intérêt légitime → interés
legítimo · consentement → consentimiento · loi Informatique et Libertés → ley francesa de Informática y Libertades (loi
Informatique et Libertés) · LCEN, CNIL, RGPD gardés · « la version française fait foi » → « la versión francesa prevalece ».
Garder chaque date, adresse et nombre.

## Dates

« 2 octobre 2026 » → « 2 de octubre de 2026 » ; « 1er octobre » → « 1 de octubre » ; mois et jours en minuscules.
