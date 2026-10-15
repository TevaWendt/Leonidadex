# Glossaire et règles du portugais du Brésil — Leonidakit (v7.91)

Langue source : le français du site (tutoiement). Cible : **portugais du Brésil** (`pt-BR`), registre **« você »** (verbes à
la 3ᵉ personne : « Escreva », « Escolha », « Veja », « você tem », « seu carro » ; jamais « tu », jamais « o senhor »).
Phrases courtes et simples, mots de joueurs brésiliens (le site doit se lire comme un site brésilien écrit par des joueurs,
jamais comme une traduction mot à mot). Le site évite le jargon (pas de « ROI », de « capital », d’« amortização » dans
l’interface) : garder cet esprit. Vocabulaire du Brésil : « carro » (pas « viatura »), « celular », « computador » / « PC »,
« time », « tela », « baixar », « salvar », « pré-venda », « golpe » (braquage, comme la version brésilienne officielle de
GTA Online : « O Golpe de Cayo Perico »). Titres : majuscule au premier mot seulement (« Minhas compras », « O mundo de
Leonida »), sauf noms propres.

## Règles dures (le générateur et les tests en dépendent)

1. **Repères** `<1>…</1>`, `<2/>` : ce sont les balises HTML d’origine. Chacun reste, une seule fois, avec le même numéro. On
   peut les déplacer pour suivre l’ordre des mots portugais. Jamais en ajouter ni en retirer.
2. **Code dans un texte** (`" aria-label="`, `">`, `data-x="`, `{`, `=`, `\n`, barres obliques inverses, `{1}`) : recopié à
   l’octet près ; on ne traduit que les mots lus.
3. **Morceaux de phrase.** Beaucoup d’entrées de script sont des morceaux assemblés par le code (`'Il manque ' + money(x) +
   ' pour ' + name`). Traduire chaque morceau pour que la phrase portugaise assemblée se lise bien. Écrire la traduction
   **sans espace au début ni à la fin** : le générateur remet les espaces d’origine. Petits mots de liaison : `et` → `e`,
   `de` → `de`, `pour` → `para`, `avec` → `com`, `sur` → `sobre` / `em`, `ou` → `ou`, `dans` → `em`. Un morceau qui finit par
   « à » / « de » devant un nom posé par le code : `a` / `de` (pas de contraction possible, le nom vient après).
4. **Pluriel ajouté par le code** (`n + ' achat' + (n > 1 ? 's' : '')`) : traduire le singulier pour que le « s » ajouté reste
   juste (« compra » → « compras »). Si le mot portugais fait son pluriel autrement (« missão » → « missões », « mês » →
   « meses », « real » → « reais »), choisir un mot qui marche avec « s » (« tarefa », « vez » → éviter : « vezes ») ou le
   signaler dans `"_notes"`. Quand le code choisit entre deux formes écrites en entier, traduire chacune en entier.
5. **Argent** : le signe dollar se met **devant** le nombre, avec une espace : `200 000 $` → `$ 200.000` ; `1,5 million` →
   `1,5 milhão` ; `2 millions` → `2 milhões` ; `0 $` → `$ 0` ; `100 k $` → `$ 100 mil` ; `1,5 M $` → `$ 1,5 mi`. Séparateur des
   milliers : le **point dès 1 000** (`1 250` → `1.250`, `12 500` → `12.500`) ; décimales avec la **virgule** (`1,5`).
   Pourcentage collé : `100%`. Heures : `1 h 30`, `45 min`. Quand le morceau français ne contient que le signe autour d’un
   nombre posé par le code (`' $'`), le code place déjà le signe : écrire `"="` ou ne traduire que les mots.
6. **Ponctuation** : pas d’espace avant `: ; ? !` ; pas de `¿ ¡`. Guillemets « » → “ ” (le générateur les convertit de toute
   façon). Apostrophe ’ seulement dans les noms (Phil’s).
7. **À garder tels quels** (écrire `"="` quand tout le texte est un nom) : Leonidakit, Leonida, Léo, GTA VI, GTA 6, Grand Theft
   Auto, Rockstar Games, Take-Two Interactive, Vice City, Port Gellhorn, Grassrivers, Mount Kalaga, Ambrosia, Leonida Keys,
   Jason, Lucia, Brian Heder, Boobie, Cal, Dre’Quan, Real Dimez, Raul, les noms de marques et de modèles (Albany Emperor, Girardi
   ES9…), de boutiques, d’enseignes et de stations (Rideout Customs, Ammu-Nation, Flash FM…), les noms de lieux anglais de la
   carte (Ocean Beach, Water Tower, Parking Lot…), les noms de lois (LCEN, RGPD, CNIL), Vercel, Brevo, OVH. « Édition
   Ultimate » → « edição Ultimate ».
8. **Mots que le code cherche** — à employer exactement quand le français a l’idée (le calculateur lit les libellés) :
   - « argent mis de côté », « gardé de côté », « de côté » → **guardado** (« l’argent que je garde de côté » → « o dinheiro que
     deixo guardado »).
   - « par heure » → **por hora** ; « par jour » → **por dia** ; « par partie » → **por sessão** ; « jours par semaine » →
     **dias por semana** ; « temps de jeu par jour » → **tempo de jogo por dia** ; « joueurs » → **jogadores** ; « durée » →
     **duração** ; « durée de session » → **duração da sessão** ; « temps disponible » → **tempo disponível** ; « frais » →
     **gastos** ; « coûts » → **custos** ; « dépenses par partie » → **gastos por sessão** ; « il faut atteindre » → **é preciso
     chegar a** ; « prochaine partie » → **próxima sessão** ; « durée en heures » → **duração em horas** ; « tu t’en sers » →
     **você usa** ; « prix » → **preço** ; « coûte » → **custa**.
   - « J’ai déjà » → **Já tenho** ; « Je veux avoir » → **Quero ter** ; « Je gagne » en tête d’un libellé → **Ganho** ;
     « objectif » → **objetivo** ; « en plus » → **a mais** ; « argent que tu as » → **dinheiro que você tem** ; « argent
     disponible » → **dinheiro disponível** ; « pas assez d’argent » → **dinheiro insuficiente** / **não tem dinheiro
     suficiente**.
   - Messages d’erreur qui commencent par « Écris… / Dis… / Choisis… / Ajoute… / Note… » : commencer par **Escreva… / Diga… /
     Escolha… / Adicione… / Anote…**.
   - « Parcours à compléter » → **Percurso a completar**.
   - « TES CHIFFRES » → **SEUS NÚMEROS**.
   - « Achat « » (étiquette `'Achat « ' + nom + ' »'`) → **Compra “** et « » » → **”**.
   - « non enregistré(e)(s) » → contient **não salvo** ; « mémoire seulement » → contient **só na memória**.
   - « Terminé » (état d’une étape) → **Concluído**.
9. **Léo existe en portugais** : ne jamais écrire qu’il ne parle que français.
10. **Une clé qui n’est pas du texte** (identifiant, classe, nom de fichier, code de langue) : `"="`, et le dire dans `"_notes"`.

## Vocabulaire fixe

| Français | Português (Brasil) |
|---|---|
| Calculateur, le calculateur | Calculadora, a calculadora |
| Mon objectif | Meu objetivo |
| Mes achats | Minhas compras |
| Est-ce que je peux l’acheter ? | Posso comprar? |
| Mon temps de jeu | Meu tempo de jogo |
| Mon budget | Meu orçamento |
| Quoi acheter d’abord ? | O que comprar primeiro? |
| Ça vaut le coup ? | Vale a pena? |
| Mes activités | Minhas atividades |
| Quel achat choisir ? | Qual compra escolher? |
| Mon business plan | Meu plano de negócios |
| Mes calculs / Mes plans | Meus cálculos / Meus planos |
| les huit calculs | os oito cálculos |
| Simple / Pas à pas / Expert (modes) | Simples / Passo a passo / Avançado (« mode Expert » → « modo Avançado ») |
| réglages avancés | ajustes avançados |
| partie (de jeu) | sessão (« par partie » → « por sessão ») |
| heure de jeu / temps de jeu | hora de jogo / tempo de jogo |
| mission, activité, braquage | missão, atividade, golpe |
| récompense, frais, préparation, attente | recompensa, gastos, preparação, espera |
| ta part | sua parte |
| gain, gain net, gagné en plus | ganho, ganho líquido, ganho a mais |
| achat, achat libre, Mon achat libre | compra, compra livre, Minha compra livre |
| le prix que tu imagines | o preço que você imagina |
| remboursé, se rembourse | recuperado, se paga (« se paga em 3 h de jogo ») |
| coût d’usage | custo de uso |
| carburant, entretien, réparations, assurance, revente | combustível, manutenção, consertos, seguro, revenda |
| Mon envie, de 1 à 5 / Envie | Minha vontade, de 1 a 5 / Vontade |
| fiche (page d’un élément du site) | ficha (« Retour à la fiche » → « Voltar à ficha », « Voir la fiche » → « Ver a ficha ») |
| fiche de calcul / fiche du plan | ficha do cálculo / ficha do plano |
| carnet(s), Mes carnets | caderno(s), Meus cadernos |
| Mon garage, Mon arsenal, Ma garde-robe | Minha garagem, Meu arsenal, Meu guarda-roupa |
| Enregistrer ce calcul / le plan | Salvar este cálculo / Salvar o plano |
| Exporter, Importer, Partager, Copier | Exportar, Importar, Compartilhar, Copiar |
| Afficher plus de détails / Masquer | Mostrar mais detalhes / Ocultar |
| catalogue | catálogo |
| Tuto | Tutorial |
| Jouer, Explorer (menu) | Jogar, Explorar |
| Carte, Véhicules, Armurerie, Achats, Progression | Mapa, Veículos, Armaria, Compras, Progresso |
| Suivi de progression | Acompanhamento do progresso |
| Le monde, Lieux, Personnages, Gangs et factions | O mundo, Lugares, Personagens, Gangues e facções |
| Demeures, Planques, Entreprises, Animaux, Collectibles | Residências, Esconderijos, Empresas, Animais, Colecionáveis |
| Missions, Activités annexes, Radios et musique | Missões, Atividades paralelas, Rádios e música |
| Codes de triche, Trophées et succès | Códigos de trapaça, Troféus e conquistas |
| Atelier 3D | Ateliê 3D |
| L’actualité, Actualités, Vidéos officielles, Éditions | Novidades, Notícias, Vídeos oficiais, Edições |
| Ce qui est confirmé | O que está confirmado |
| S’équiper | Equipar-se |
| Le site, À propos, Contact, Médias et crédits, Mentions et confidentialité | O site, Sobre, Contato, Mídia e créditos, Aviso legal e privacidade |
| Tout ce qui s’achète | Tudo o que dá para comprar |
| Consommables, Vêtements et style, Personnalisations | Consumíveis, Roupas e estilo, Personalização |
| Nourriture, Tatouages, Coiffures, Tenues et accessoires | Comida, Tatuagens, Cortes de cabelo, Trajes e acessórios |
| Munitions et équipement, Logements et appartements, Bateaux | Munição e equipamento, Moradias e apartamentos, Barcos |
| Garages documentés | Garagens documentadas |
| Classement, Comparateur, Véhicules rares | Ranking, Comparador, Veículos raros |
| Constructeur d’équipement | Montador de equipamento |
| Comprendre les statuts | Entender os status |
| bande-annonce, trailer, captures, médias officiels | trailer, trailer, capturas, mídias oficiais |
| précommande, édition Standard / Ultimate, version en boîte | pré-venda, edição Standard / Ultimate, versão física (em caixa) |
| préchargement | pré-carregamento |
| comté, région, quartier, ville | condado, região, bairro, cidade |
| inspiration réelle, modèle réel | inspiração real, modelo real |
| à confirmer | a confirmar |
| compte à rebours | contagem regressiva |
| minuit, heure locale | meia-noite, horário local |

Véhicules au masculin (« o Emperor », « o carro ») ; une arme prend le genre de son type (« a pistola », « o fuzil », « a
escopeta », « a submetralhadora »). Fusil d’assaut → fuzil de assalto ; fusil à pompe → escopeta ; pistolet mitrailleur →
submetralhadora ; fusil de précision → rifle de precisão ; batte → taco ; couteau → faca ; cocktail Molotov → coquetel
molotov ; grenade → granada.

## Statuts

Officiel → Oficial · Vu dans un média → Visto na mídia · Identification communautaire → Identificação da comunidade ·
Repère de la série → Referência da série · À confirmer → A confirmar · Pas encore connu → Ainda não se sabe · Estimation →
Estimativa · Estimé → Estimado · Valeur personnelle → Valor pessoal · Non confirmé → Não confirmado · Mesuré et vérifié →
Medido e verificado · Mesuré → Medido · Ton chiffre → Seu número · À toi → Seu · Exemple → Exemplo · Simulation →
Simulação · Sans objet / Ne s’applique pas → Não se aplica · Pas encore écrit / À écrire → Ainda não escrito / A escrever ·
Prix à venir → Preço em breve · Achat à confirmer → Compra a confirmar · Mécanique non confirmée → Mecânica não confirmada ·
Autre jeu → Outro jogo · Encore à relever → Ainda a levantar · Données en cours de mise à jour → Dados em atualização.

## Page Mentions et confidentialité

éditeur → editor · hébergeur → provedor de hospedagem · responsable du traitement → controlador (responsável pelo tratamento)
· délégué à la protection des données → encarregado de proteção de dados · base légale → base legal · intérêt légitime →
interesse legítimo · consentement → consentimento · loi Informatique et Libertés → lei francesa de Informática e Liberdades
(loi Informatique et Libertés) · LCEN, CNIL, RGPD gardés (le RGPD peut être expliqué : « RGPD, o regulamento europeu de
proteção de dados ») · « la version française fait foi » → « a versão em francês prevalece ». Garder chaque date, adresse
et nombre.

## Dates

« 2 octobre 2026 » → « 2 de outubro de 2026 » ; « 1er octobre » → « 1º de outubro » ; « jeudi 19 novembre 2026 » →
« quinta-feira, 19 de novembro de 2026 » ; mois et jours en minuscules. Heures : « 20 h » → « 20h », « 21 h 30 » → « 21h30 ».

## Choix harmonisés (après la première vague de traduction)

- Catégories de véhicules : Sedãs · Esportivos · Superesportivos · SUVs e 4x4 · Picapes e off-road · Vans e utilitários ·
  Motos e quadriciclos · Barcos e jet skis · Serviço e emergência · Diversos.
- Fiches véhicules : rapprochement → comparação ; « (rapprochement communautaire) » → « (comparação da comunidade) » ;
  « Le rapprochement retenu pour ce véhicule est X » → « A comparação escolhida para este veículo é com o X » ; Fiche
  encyclopédique → Verbete da enciclopédia ; « Voir X en photo » → « Ver fotos do X » ; Précédent / Suivant → Anterior /
  Próximo ; Accueil → Início ; « Vu dans un support officiel, sans nom communiqué » → « Visto em material oficial, sem nome
  divulgado » ; Nom en jeu non communiqué → Nome no jogo não divulgado ; Nommé(s) par Rockstar → Nomeado(s) pela Rockstar ;
  Aperçu officiel → Aparição oficial ; Vus officiellement → Vistos oficialmente ; Communautaire → Da comunidade ;
  Inspiration : → Inspiração: ; Famille : → Tipo: ; Artworks officiels → Artes oficiais ; décapotable → conversível.
- Véhicules et armes : livrée → pintura ; chargeur → pente ; lunette → luneta ; viseur → mira ; crosse → coronha ; jante →
  roda ; Ferry → Balsa ; Kayak → Caiaque ; Bateau-taxi → Táxi aquático ; Monorail → Monotrilho ; dépanneuse → guincho ;
  camping-car → motorhome ; gyrophares → giroflex ; break → perua. Véhicules du jeu au masculin ; marques, motos, vraies
  picapes et vans réelles au féminin (« a Ford F-150 »).
- Suivi : suivi → acompanhamento (« Progresso » pour la page Progression) ; possédés → obtidos ; Envies → Lista de desejos ;
  lieux repérés → lugares descobertos ; Sauvegarde → Backup ; Fusionner / Remplacer → Mesclar / Substituir ; carte (vignette
  d’un élément) → cartão.
- Vêtements : tenue → traje ; costume → terno ; coiffure → corte de cabelo ; (homme) / (femme) → (masculino) / (feminino) ;
  bouc → cavanhaque.
- Divers : Bonus de précommande → Bônus de pré-venda ; Ne s’achète pas → Não está à venda ; fuites → vazamentos ; kit média
  → kit de imprensa ; « 1 connu sur 6 » → « 1 de 6 conhecido ».
- Mots-clés de recherche (listes en minuscules) : sans accents, sans cédille ni tilde (« colecao », « missoes »).
- Deuxième vague : « Je l’ai » → Tenho ; « Je le / la veux » → Quero ter ; « J’ai obtenu » → Obtive ; Mes envies → Minha lista
  de desejos ; kit de soin → kit médico ; « dans GTA VI » → « no GTA VI » ; « de GTA V » → « do GTA V » ; Keys → « as Keys » ;
  prix non relevé → preço não registrado ; Aperçu(e) (statut) → Avistado / Avistada ; Pack Vintage Vice City → Pacote
  Vintage Vice City ; L’État du bon temps → Estado da Curtição ; plan(s) de secours → plano(s) alternativo(s) ; but → meta ;
  programme (de missions) → cronograma ; panier → carrinho ; places (sièges) → lugares ; Supprimer → Excluir ; Modifier →
  Editar ; Paramètres → Configurações ; Signaler → Avisar ; couteau à cran d’arrêt → canivete ; queue de billard → taco de
  sinuca ; batte → taco de beisebol ; motif (arme) → estampa ; atelier de personnalisation → oficina ; Fusil à pompe →
  Escopeta ; arme de poing / longue → arma curta / longa ; catégories d’armes : Pistolas, Submetralhadoras, Fuzis de assalto,
  Rifles de precisão, Metralhadoras, Escopetas ; gang → gangue ; braquage → golpe (vol de magasin → assalto) ; receleur →
  receptador ; tenue → traje ; boutique → loja.
- Troisième passe (relecture des pages et du calculateur) : « remboursé (après) » → **se paga (após)**, « ne serait remboursé
  qu’après » → **só se pagaria depois de** (neutre : le nom posé avant peut être féminin, « esta compra », « a boate ») ;
  « En premier » → **Primeiro** ; recherche du site → **Buscar** (« Buscar no site », « Buscar na lista ») ; vue de côté
  d’une fiche → **Lateral** (onglet et étiquette) ; motards → **motoqueiros** partout.
- Pronoms enclitiques (« compará-los », « fazê-las ») : permis, le contrôle ne les prend plus pour de l’espagnol.
- Déjà traduits : les morceaux outils/langues/pt/trad-*.json font foi ; en cas de doute sur un libellé courant (bouton,
  statut, catégorie), cherche-le d’abord dedans (grep) et reprends la même traduction.
