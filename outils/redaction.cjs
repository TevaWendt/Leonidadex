/* ============================================================
   LEONIDAKIT — redaction.cjs : paragraphes propres à chaque fiche
   Chaque page véhicule ou arme reçoit deux ou trois paragraphes rédigés à partir de SES données
   (marque, catégorie, statut, source, inspiration, origine, édition, personnage, munitions…),
   avec des tournures tirées au sort de façon déterministe (le même identifiant donne toujours
   le même texte). Aucun fait n'est ajouté : seuls les champs de la fiche sont reformulés.
   ============================================================ */
'use strict';
const graine=s=>{let h=2166136261;for(const c of String(s)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;};
const tire=(id,sel,liste)=>liste[graine(id+'|'+sel)%liste.length];
const cap=s=>s?s.charAt(0).toUpperCase()+s.slice(1):s;
const lower=s=>String(s||'').toLowerCase();

/* ---------- catégories de véhicules : ce que le type fait dans un GTA (généralités de la série, pas des faits GTA VI) ---------- */
const CAT_VEH={
 berline:["Dans un GTA, la berline est la voiture du quotidien : celle qu’on prend au bord d’un trottoir pour traverser la ville sans se faire remarquer, et celle qu’on retrouve garée devant les maisons de banlieue.","Une berline, dans la série, c’est le véhicule qui ne se fait pas remarquer : quatre portes, un coffre, une allure de voiture de famille ou de flotte d’entreprise, ce qui en fait un choix discret pour circuler.","Les berlines forment le fond de la circulation de la série. Elles ne gagnent pas de course, mais elles sont partout, faciles à trouver et sans surprise à conduire."],
 sport:["Les voitures de sport de la série occupent le créneau entre la berline et la supercar : plus vives, plus basses, souvent deux portes, sans l’étiquette de prix des modèles d’exception.","Dans un GTA, la catégorie sport rassemble les coupés et cabriolets rapides que l’on croise dans les quartiers chics, faciles à emprunter et agréables à mener sur les routes côtières.","Une sportive, dans la série, promet de l’accélération et de la tenue de route sans exiger la fortune d’une supercar. C’est souvent le premier véhicule qu’on garde."],
 supercar:["Les supercars de la série sont les modèles d’exception : moteur central, ligne en coin, prix hors d’atteinte au début de l’aventure, et l’assurance de tourner toutes les têtes.","Dans un GTA, une supercar est un objectif autant qu’un véhicule : le genre de voiture qu’on regarde d’abord dans les rues de luxe avant de pouvoir se l’offrir.","La catégorie supercar réunit ce que la série fait de plus rapide et de plus cher. Ce sont les voitures des quartiers d’affaires et des parkings de casino."],
 muscle:["Les muscle cars de la série viennent de la même époque et du même pays : gros moteur à l’avant, propulsion, capot long, et une conduite plus brute que celle des sportives.","Dans un GTA, une muscle car, c’est de la puissance américaine à l’ancienne : rapide en ligne droite, joueuse en courbe, avec un son de moteur qu’on reconnaît de loin.","La catégorie muscle rassemble les américaines à gros moteur des années 60 et 70 et leurs héritières, un classique de la série depuis ses débuts."],
 suv:["Les SUV et 4x4 de la série montent haut sur leurs roues et encaissent les chemins de terre, ce qui compte dans un État où les routes goudronnées s’arrêtent vite.","Dans un GTA, un SUV sert à tout : transporter du monde, quitter la route, résister à un accrochage. Il sacrifie la vitesse pure à la polyvalence.","La catégorie SUV et 4x4 réunit les tout-terrain de luxe et les 4x4 rustiques, deux façons de sortir des routes de la série sans casser le véhicule."],
 pickup:["Les pick-up de la série ont une benne, une garde au sol généreuse et souvent quatre roues motrices. Ce sont les véhicules des campagnes, des chantiers et des marécages.","Dans un GTA, un pick-up, c’est l’utilitaire de l’arrière-pays : capable de suivre une piste, de porter une charge et d’encaisser les bosses sans broncher.","La catégorie pick-up et tout-terrain rassemble les camionnettes de travail et leurs versions préparées pour la boue et le sable."],
 van:["Les vans et camionnettes de la série servent à transporter, à livrer et, à l’occasion, à cacher ce qu’on ne veut pas montrer. Ils sont lents mais spacieux.","Dans un GTA, un van est rarement le véhicule qu’on choisit pour le plaisir, mais c’est celui dont on a besoin quand il faut de la place ou passer inaperçu au milieu des livraisons.","La catégorie vans et cargos réunit les fourgons, les minibus et les camping-cars, les véhicules à volume de la série."],
 moto:["Les deux-roues de la série se faufilent là où les voitures s’arrêtent : circulation dense, ruelles, chemins étroits. Ils vont vite, mais ils ne pardonnent pas les chutes.","Dans un GTA, une moto, c’est la vitesse et l’agilité au prix de la protection. Sportives, cruisers, enduros et scooters n’ont pas du tout le même usage.","La catégorie deux-roues et quads rassemble tout ce qui se conduit à califourchon : motos de route, engins tout-terrain et petits scooters de ville."],
 helicoptere:["Les hélicoptères de la série ouvrent la carte d’un coup : plus de routes, plus d’embouteillages, une vue sur tout l’État. Ils se pilotent avec précision et se trouvent rarement au bord de la rue.","Dans un GTA, l’hélicoptère est le véhicule des toits, des hôpitaux et de la police. Il raccourcit tous les trajets et impose une autre lecture de la carte.","La catégorie hélicoptères réunit les appareils légers, les modèles de transport et les versions de police ou d’attaque, chacun avec son emploi."],
 avion:["Les avions de la série demandent une piste ou une étendue d’eau et récompensent par des traversées de carte en quelques minutes. Ce sont les véhicules de l’aéroport et des hydrobases.","Dans un GTA, un avion, c’est le moyen le plus rapide de changer de région, à condition de trouver où décoller et où se poser.","La catégorie avions rassemble les appareils privés, les monomoteurs d’aérodrome, les hydravions et les gros porteurs de l’aéroport."],
 bateau:["Les bateaux de la série prennent tout leur sens dans un État de côtes, d’îles et de marais : ils relient ce que la route ne relie pas et ouvrent un terrain de jeu à part.","Dans un GTA, un bateau se choisit selon l’eau : coque rapide pour la mer, embarcation plate pour les marécages, scooter des mers pour la baie.","La catégorie bateaux rassemble les hors-bord, les yachts, les hydroglisseurs, les scooters des mers et les petites embarcations de pêche."],
 service:["Les véhicules de service de la série appartiennent à la ville : police, secours, transports en commun, entretien. On ne les achète pas, on les croise, et parfois on les emprunte.","Dans un GTA, un véhicule de service raconte le fonctionnement de la ville : les bus qui suivent leur ligne, les ambulances qui accourent, les patrouilles qui tournent.","La catégorie service et utilitaires réunit les véhicules d’État et d’entreprise : forces de l’ordre, secours, travaux, livraison, transport de passagers."],
 divers:["Les véhicules hors catégorie de la série vont du vélo au monorail : ce qui roule, flotte ou glisse sans entrer dans une case classique.","Dans un GTA, cette catégorie fourre-tout réunit les moyens de déplacement atypiques, souvent les plus surprenants à croiser.","La catégorie divers rassemble ce que la série propose en dehors des voitures, motos, bateaux et aéronefs : vélos, trottinettes, transports guidés."],
};
const ST_VEH={
 officiel:["Rockstar a publié son nom : c’est l’un des rares véhicules du jeu dont l’appellation est établie noir sur blanc.","Son nom vient directement de Rockstar, ce qui en fait une valeur sûre du catalogue : pas de rapprochement, pas d’hypothèse.","Le nom est officiel, publié par le studio lui-même. Sur cette fiche, seule l’inspiration réelle reste une lecture de la communauté."],
 vu:["Le véhicule apparaît dans un support publié par Rockstar, mais son nom n’a pas été communiqué : celui affiché ici est un rapprochement avec la série ou le modèle réel.","On l’a vu dans les visuels officiels, sans étiquette. Le nom retenu est provisoire et suivra la première mention du studio.","Aperçu officiellement, nommé par déduction : cette fiche garde le nom le plus probable et le changera dès que Rockstar en publiera un."],
 comm:["Ce véhicule vient d’un repérage communautaire, pas d’un visuel que nous avons pu recouper nous-mêmes. Il reste au catalogue avec cette réserve.","Signalé par la communauté, non confirmé par nos propres vérifications : la fiche existe pour ne rien perdre, avec un statut qui le dit clairement.","Statut non confirmé : le véhicule est cité par des joueurs, sans support officiel que nous ayons pu vérifier. Il sera confirmé ou retiré à la sortie."],
};
const SRC_VEH={
 "Premier trailer":["Il figure dans le premier trailer de décembre 2023, la toute première présentation publique du jeu.","Sa première apparition remonte au premier trailer, celui qui a révélé Leonida et Vice City.","C’est dans le premier trailer qu’on le repère, au milieu des plans de la ville et de la côte."],
 "Second trailer":["Il apparaît dans le second trailer de mai 2026, celui qui suit Jason et Lucia à travers l’État.","Le second trailer le montre, dans une séquence de l’histoire ou de la vie de Leonida.","On le voit dans le second trailer, au fil des plans de route, de mer ou de ville."],
 "Captures officielles":["Il est visible sur une ou plusieurs captures de la galerie officielle de rockstargames.com.","Les captures d’écran publiées par Rockstar le montrent, dans une scène de Leonida.","Il vient de la galerie de captures officielles, la source la plus précise pour identifier un modèle."],
 "Extended Look":["Il apparaît dans An Extended Look, la longue séquence de présentation publiée par Rockstar.","On le repère dans l’Extended Look, dans la circulation ou au bord d’une route de l’État.","C’est l’Extended Look, la présentation détaillée du jeu, qui le montre."],
 "Édition Ultimate":["Il fait partie des véhicules présentés avec l’édition Ultimate, une présentation qui nomme les modèles.","Il est mis en avant dans le matériel de l’édition Ultimate, avec son nom et ses visuels.","Sa présence vient de la page de l’édition Ultimate, où Rockstar détaille son contenu."],
 "Artworks officiels":["Il figure sur un artwork officiel, une illustration publiée par Rockstar.","On le trouve dans les artworks du jeu, dessiné plutôt que capturé en jeu.","Sa source est un artwork officiel, ce qui donne une vue nette mais stylisée du modèle."],
};
const ORIG_VEH={
 americain:["Son modèle réel est américain, ce qui colle à l’ambiance d’un État inspiré de la Floride.","L’inspiration est américaine : la série a toujours puisé dans les constructeurs de Détroit et leurs dérivés.","Modèle d’origine américaine, comme une bonne partie du parc de Leonida."],
 japonais:["Son modèle réel est japonais : la série reprend volontiers les sportives et berlines venues du Japon.","L’inspiration vient du Japon, une origine fréquente pour les modèles compacts et sportifs de la série.","Modèle d’origine japonaise, fidèle à une tradition de la série depuis les années 2000."],
 europeen:["Son modèle réel est européen, une origine que la série réserve souvent aux voitures de prestige et de sport.","L’inspiration est européenne : les constructeurs allemands, italiens et britanniques inspirent les modèles haut de gamme.","Modèle d’origine européenne, comme la plupart des berlines de luxe et des supercars de la série."],
};
const OUV_VEH=["Pour situer","En deux mots","Ce que dit la fiche","Le point","Fiche de route","Repères"];
const H2_VEH=[["Ce qu’il faut savoir","Le modèle réel","Dans la série, ce type de véhicule"],["L’essentiel","Le modèle qui l’inspire","À quoi sert ce genre de véhicule"],["Ce que montrent les visuels","Le rapprochement réel","Sa place dans un GTA"],["Présentation","D’où vient sa ligne","Ce type de véhicule, en jeu"]];

function vehicule(v,CATL){
  const id=v.id,cat=lower(CATL[v.cat]||v.cat),nom=(v.marque&&v.marque!=='Marque inconnue'?v.marque+' ':'')+v.nom;
  const h=tire(id,'h2',H2_VEH);
  /* paragraphe 1 : identité reformulée */
  const p1=[
    tire(id,'p1a',[`${nom} est un véhicule de la catégorie ${cat} recensé sur Leonidakit.`,`Sur Leonidakit, ${nom} est classé parmi les ${cat}.`,`${nom} appartient à la catégorie ${cat} du catalogue.`,`Catégorie ${cat} : voilà où ${nom} se range dans notre base.`]),
    tire(id,'p1b',ST_VEH[v.st]||ST_VEH.vu),
    v.src&&SRC_VEH[v.src]?tire(id,'p1c',SRC_VEH[v.src]):'',
    v.slot&&ORIG_VEH[v.slot]?tire(id,'p1d',ORIG_VEH[v.slot]):'',
    v.edition?tire(id,'p1e',[`Il est lié à l’édition ${v.edition==='Pre-Order'?'de précommande':v.edition} du jeu.`,`Rockstar l’associe à l’édition ${v.edition==='Pre-Order'?'de précommande':v.edition}.`]):'',
    v.perso?tire(id,'p1f',[`Il est associé à un personnage de l’histoire, ce qui explique sa présence dans les visuels.`,`Un personnage du jeu l’utilise dans les supports officiels.`]):'',
  ].filter(Boolean).join(' ');
  /* paragraphe 2 : catégorie dans la série */
  const p2=tire(id,'p2',CAT_VEH[v.cat]||CAT_VEH.divers);
  /* paragraphe 3 : ce qui se complète */
  const p3=tire(id,'p3',[`Prix, vitesse, accélération, emplacements de vente et options de personnalisation seront ajoutés à cette fiche après la sortie, à partir de relevés faits dans le jeu.`,`Cette fiche se complétera avec le jeu : prix d’achat, performances mesurées, concessions où le trouver, options chez Rideout Customs.`,`Ce qui manque encore (prix, performances, où l’acheter, ce qu’on peut modifier) viendra de relevés en jeu, pas d’estimations.`,`Les chiffres arrivent avec le 19 novembre 2026 : prix, vitesse de pointe, accélération, capacité et emplacements de vente, relevés dans le jeu.`]);
  return {h2:h,ouverture:tire(id,'ouv',OUV_VEH),p1,p2,p3};
}

/* ---------- armes ---------- */
const CAT_ARM={
 pistolet:["Dans la série, le pistolet est l’arme du début et de la discrétion : elle se range, se dégaine vite et suffit pour les premiers ennuis.","Une arme de poing, dans un GTA, ne gagne pas les grosses fusillades, mais elle est toujours là, en voiture comme à pied.","Les pistolets et revolvers de la série se distinguent par leur cadence, leur capacité et leur puissance : les petits calibres tirent vite, les gros revolvers frappent fort."],
 pompe:["Le fusil à pompe de la série règne à courte distance : dévastateur de près, inutile de loin.","Dans un GTA, un fusil à pompe sert dans les couloirs, les garages et les fusillades rapprochées, là où sa gerbe compte.","Les fusils à pompe et à canon double sont les armes de la proximité : peu de cartouches, beaucoup d’effet."],
 pm:["Les pistolets-mitrailleurs de la série tirent vite, se manient d’une main pour certains, et sont les armes de la conduite et des combats de rue.","Dans un GTA, un PM est le compromis entre le pistolet et le fusil : rapide, compact, gourmand en munitions.","La catégorie PM rassemble les petites armes automatiques, celles qu’on utilise depuis une voiture ou dans un club."],
 assaut:["Le fusil d’assaut de la série est l’arme polyvalente par excellence : bonne à toute distance, précise en visant, disponible dès que les affrontements s’intensifient.","Dans un GTA, un fusil d’assaut est celui qu’on garde en main pour les missions sérieuses : portée, cadence et chargeur généreux.","La catégorie assaut réunit les carabines et fusils automatiques, colonne vertébrale de l’arsenal des joueurs."],
 precision:["Le fusil de précision de la série impose la distance : un tir, une cible, du temps pour recharger.","Dans un GTA, un fusil à lunette change la façon d’aborder un lieu : on observe, on choisit, on frappe de loin.","La catégorie précision rassemble les fusils à verrou et semi-automatiques à lunette, les armes des toits et des collines."],
 mitrailleuse:["La mitrailleuse de la série arrose : cadence et chargeur énormes, précision médiocre, mobilité réduite.","Dans un GTA, une mitrailleuse est faite pour les situations où le nombre d’ennemis dépasse les munitions d’un fusil.","La catégorie mitrailleuses réunit les armes automatiques lourdes, à bande ou à boîte, pour tenir une position."],
 melee:["Les armes de mêlée de la série sont les plus anciennes du jeu : silencieuses, gratuites, brutales, et souvent trouvées sur place.","Dans un GTA, une arme de mêlée sert quand on veut faire du bruit sans tirer, ou quand on n’a rien d’autre sous la main.","La catégorie mêlée rassemble tout ce qui frappe ou tranche : battes, clubs, marteaux, couteaux."],
 projectile:["Les projectiles de la série se lancent : explosifs, incendiaires ou fumigènes, ils servent à contrôler une zone plutôt qu’une cible.","Dans un GTA, un projectile est une arme de situation : bloquer une rue, enflammer un véhicule, couvrir une fuite.","La catégorie projectiles réunit ce qu’on jette à la main, avec un temps de vol et un effet de zone."],
 speciale:["Les armes spéciales de la série sortent des catégories classiques : lanceurs, armes sous-marines, outils détournés.","Dans un GTA, une arme spéciale répond à un usage précis, souvent lié à un environnement ou à une mission.","La catégorie spéciales rassemble les armes rares ou atypiques, celles qu’on ne trouve pas au râtelier de base."],
};
const ST_ARM={
 officiel:["Son nom est publié par Rockstar : il s’agit d’une des rares armes du jeu dont l’appellation est établie.","Le nom vient du studio lui-même, lisible sur un support officiel.","Arme nommée officiellement : le rapprochement avec un modèle réel reste, lui, une lecture de la communauté."],
 vu:["L’arme apparaît dans un support publié par Rockstar, sans nom : celui affiché ici décrit son type et suivra la première mention officielle.","Aperçue dans les visuels officiels, sans étiquette : la fiche la désigne par son type et par son modèle réel probable.","On l’a vue, on ne l’a pas encore nommée : cette fiche garde une désignation descriptive."],
 comm:["Cette arme vient d’un repérage communautaire que nous n’avons pas pu recouper : elle reste au catalogue avec cette réserve.","Statut non confirmé : citée par des joueurs, sans support officiel vérifié de notre côté.","Signalée sans preuve vérifiable de notre côté : la fiche existe pour ne rien perdre, avec son statut."],
};
const SLOT_ARM={
 longue:["C’est une arme longue : dans le jeu, elle se porte dans le dos ou en main, et le nombre d’armes longues qu’on peut emporter est limité.","Arme longue, donc encombrante : elle prend l’une des deux places disponibles, dans le dos ou en main.","Elle se classe parmi les armes longues, celles qui se voient quand on les porte et qui ne se cachent pas."],
 poing:["C’est une arme de poing : discrète, rangée dans la ceinture, sans limite de place dans l’équipement.","Arme de poing, donc invisible une fois rangée et toujours disponible.","Elle se classe parmi les armes de poing, celles qu’on garde sur soi sans encombrer l’équipement."],
};
const H2_ARM=[["Ce que montrent les supports officiels","Ce type d’arme dans la série"],["Ce qu’on en sait","Le rôle de cette catégorie"],["Ce que disent les visuels","Sa place dans un GTA"],["Présentation","Dans la série"]];

function arme(a,CATL){
  const id=a.id,cat=lower(CATL[a.cat]||a.cat);
  const h=tire(id,'h2',H2_ARM);
  const p1=[
    tire(id,'p1a',[`${a.nom} est classé parmi les ${cat} du catalogue.`,`Sur Leonidakit, ${a.nom} appartient à la catégorie ${cat}.`,`Catégorie ${cat} : voilà où ${a.nom} se range dans notre base.`]),
    tire(id,'p1b',ST_ARM[a.st]||ST_ARM.vu),
    tire(id,'p1c',SLOT_ARM[a.slot]||[]),
    a.insp?tire(id,'p1d',[`Le rapprochement retenu est ${a.insp}, une lecture des visuels et non une information du studio.`,`Sa silhouette rappelle ${a.insp} : c’est l’inspiration réelle retenue, sans confirmation de Rockstar.`,`Le modèle réel le plus proche est ${a.insp}, d’après les images.`]):(a.fam?tire(id,'p1d',[`Il s’agit d’un objet du quotidien : ${lower(a.fam)}.`,`Sa famille : ${lower(a.fam)}.`]):''),
    a.mun?tire(id,'p1e',[`Elle utilise des ${lower(a.mun)}.`,`Côté munitions : ${lower(a.mun)}.`,`Munitions : ${lower(a.mun)}.`]):'',
    a.portee?tire(id,'p1f',[`Sa portée estimée est ${lower(a.portee)}.`,`Portée estimée : ${lower(a.portee)}.`]):'',
    a.ue?tire(id,'p1g',[`Elle est mise en avant dans le matériel de l’édition Ultimate.`,`L’édition Ultimate la présente ou en propose une version.`]):'',
  ].filter(Boolean).join(' ');
  const p2=tire(id,'p2',CAT_ARM[a.cat]||CAT_ARM.speciale);
  const p3=tire(id,'p3',[`Dégâts, cadence, précision, recul, prix chez Ammu-Nation et niveau de déblocage seront relevés dans le jeu et ajoutés à cette fiche.`,`Cette fiche se complétera à la sortie : statistiques de combat, prix, accessoires disponibles et où l’acheter.`,`Ce qui manque encore (dégâts, portée effective, prix, accessoires) viendra de relevés en jeu, jamais d’estimations.`]);
  return {h2:h,p1,p2,p3};
}
module.exports={vehicule,arme,tire};
