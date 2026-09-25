/* Généré par outils/gen-acquisitions.cjs depuis outils/acquisitions.json et les données canoniques existantes. */
window.LK_ACQUISITIONS = {
  "schemaVersion": 1,
  "verifiedAt": "2026-09-23",
  "game": {
    "name": "Grand Theft Auto VI",
    "releaseDate": "2026-11-19",
    "status": "Sortie annoncée",
    "checkedAt": "2026-09-24"
  },
  "sources": {
    "ultimate": {
      "url": "https://www.rockstargames.com/VI",
      "title": "Édition Ultime : présentation interactive",
      "publishedAt": null,
      "consultedAt": "2026-09-23",
      "context": "GTA VI, bonus de l’Édition Ultime",
      "claim": "Véhicules, garages, styles et personnalisations décrits comme contenus de cette édition. Leurs prix séparés en jeu ne sont pas publiés."
    },
    "vintage": {
      "url": "https://www.rockstargames.com/VI",
      "title": "Pack Vintage Vice City : présentation interactive",
      "publishedAt": null,
      "consultedAt": "2026-09-23",
      "context": "GTA VI, bonus de précommande",
      "claim": "La présentation décrit un véhicule et son garage, des tenues et coiffures, ainsi qu’un motif d’arme. Elle ne confirme pas leur achat séparé en jeu."
    },
    "preorder": {
      "url": "https://www.rockstargames.com/newswire/article/5171972o3ak5oa/pre-order-grand-theft-auto-vi-on-june-25",
      "title": "Pre-Order Grand Theft Auto VI on June 25",
      "publishedAt": "2026-06-24",
      "consultedAt": "2026-09-23",
      "context": "GTA VI, présentation des éditions",
      "claim": "Sortie annoncée le 19 novembre 2026 sur PS5 et Xbox Series X|S. Expérience solo. Le Pack Vintage accompagne les achats effectués avant le 20 novembre 2026."
    },
    "screenshots": {
      "url": "https://www.rockstargames.com/VI/media/screenshots",
      "title": "GTA VI : captures officielles",
      "publishedAt": null,
      "consultedAt": "2026-09-23",
      "context": "Galerie officielle GTA VI",
      "claim": "Les captures documentent l’apparence des contenus. Une image seule ne confirme ni un prix, ni la possibilité d’un achat."
    },
    "extended": {
      "url": "https://www.rockstargames.com/newswire/article/4k138k8okkk483/grand-theft-auto-vi-an-extended-look-now-playing",
      "title": "Grand Theft Auto VI: An Extended Look : Now Playing",
      "publishedAt": "2026-08-27",
      "consultedAt": "2026-09-23",
      "context": "Présentation officielle",
      "claim": "Annonce d’une présentation enregistrée dans le jeu sur PS5. Aucune liste d’achats n’est déduite de la seule annonce."
    }
  },
  "categories": [
    {
      "id": "boats",
      "label": "Bateaux",
      "route": "/bateaux.html",
      "type": "vehicle",
      "intro": "Kayak ou bateau à moteur : retrouve les embarcations dont Rockstar décrit l’obtention, puis les observations déjà recensées dans Véhicules.",
      "limit": "Les bonus ci-dessous sont liés à une édition. Leur achat séparé et leur prix dans le jeu ne sont pas confirmés.",
      "empty": "Aucun bateau avec une obtention officiellement documentée n’est encore disponible.",
      "menuOrder": 99
    },
    {
      "id": "style",
      "label": "Vêtements et style",
      "route": "/style.html",
      "type": "style",
      "intro": "Tenues, accessoires, tatouages et coiffures : tout ce qui change l’apparence de Jason et Lucia, avec les collections annoncées et les adresses déjà présentées par Rockstar.",
      "limit": "Les collections décrites ne constituent pas une liste de pièces achetables à l’unité. Les noms individuels, tarifs et conditions détaillées restent à documenter.",
      "empty": "En attente de données officielles pour les pièces individuelles. Les collections et services annoncés sont présentés ci-dessous, sans fausse fiche ni case à cocher.",
      "menu": true,
      "sections": [
        {
          "id": "tenues",
          "title": "Tenues",
          "status": "Collections annoncées",
          "text": "Les collections de l’Édition Ultime et du Pack Vintage Vice City décrivent des tenues pour les deux personnages (ci-dessous). Les pièces à l’unité, leurs noms et leurs prix ne sont pas publiés. La boutique Stock 305 est l’adresse de streetwear présentée par Rockstar.",
          "link": "/entreprises/stock-305.html",
          "linkLabel": "Voir Stock 305"
        },
        {
          "id": "accessoires",
          "title": "Accessoires",
          "status": "À confirmer",
          "text": "Lunettes, montres, bijoux, sacs, casquettes : les visuels officiels en montrent sur Jason et Lucia, mais aucun accessoire n’est nommé ni vendu séparément à ce jour. Rien n’est inventé ici : la liste se remplira avec des sources."
        },
        {
          "id": "tatouages",
          "title": "Tatouages",
          "status": "Adresse présentée",
          "text": "Electric Fang Tattoo, le salon de Stockyard présenté avec l’Édition Ultime, propose des créations sur les personnages. Les motifs, leur prix et les emplacements possibles restent à documenter. La collection « Style de Vice City » comprend des tatouages.",
          "link": "/entreprises/electric-fang.html",
          "linkLabel": "Voir Electric Fang Tattoo"
        },
        {
          "id": "coiffures",
          "title": "Coiffures",
          "status": "Adresse présentée",
          "text": "Sara’s Unisex Salon s’occupe des coiffures, de la barbe de Jason, du maquillage et des ongles. Le Pack Vintage Vice City décrit une coiffure rétro pour Jason et des cheveux bouclés pour Lucia. Tarifs non publiés.",
          "link": "/entreprises/saras-unisex-salon.html",
          "linkLabel": "Voir Sara’s Unisex Salon"
        }
      ],
      "menuOrder": 2
    },
    {
      "id": "customizations",
      "label": "Personnalisations",
      "route": "/personnalisations.html",
      "type": "customization",
      "intro": "Retrouve les modifications de véhicules et d’armes décrites par Rockstar, leurs conditions d’accès et les ateliers déjà présentés sur le site.",
      "limit": "Une modification esthétique ne prouve aucun gain de vitesse ou de revenu. Aucun prix ni effet chiffré n’est supposé.",
      "empty": "En attente de données officielles pour une personnalisation identifiable.",
      "menu": true,
      "menuOrder": 3
    },
    {
      "id": "garages",
      "label": "Garages documentés",
      "route": "/planques.html#garages",
      "type": "hideout",
      "intro": "Les garages décrits avec des bonus de véhicule sont présentés à part des repaires simplement montrés dans les médias.",
      "limit": "L’accès dépend du contenu annoncé. Aucun achat immobilier séparé, revenu locatif ou prix en jeu n’est confirmé.",
      "empty": "En attente de données officielles pour un garage identifiable.",
      "menuOrder": 99
    },
    {
      "id": "vetements",
      "label": "Vêtements à l’unité",
      "route": "/vetements.html",
      "type": "style",
      "intro": "Vêtements à l’unité : cette catégorie est prête à accueillir des pièces identifiées et leurs conditions d’obtention.",
      "limit": "Les collections annoncées sont dans « Vêtements et style ». Aucune pièce à l’unité avec un prix séparé vérifié n’est actuellement publiée ici.",
      "empty": "Aucune entrée individuelle vérifiée n’est publiée dans cette catégorie. Sa présence dans le menu ne confirme pas une possibilité d’achat dans GTA VI.",
      "alias": "/style.html#tenues",
      "menuOrder": 99
    },
    {
      "id": "accessoires",
      "label": "Accessoires",
      "route": "/accessoires.html",
      "type": "style",
      "intro": "Lunettes, montres, bijoux, sacs, casquettes : une catégorie à documenter, sans liste d’achats confirmée.",
      "limit": "Aucun accessoire individuel avec des conditions d’achat vérifiées n’est actuellement publié dans cette section.",
      "empty": "Aucune entrée individuelle vérifiée n’est publiée dans cette catégorie. Sa présence dans le menu ne confirme pas une possibilité d’achat dans GTA VI.",
      "alias": "/style.html#accessoires",
      "menuOrder": 99
    },
    {
      "id": "tatouages",
      "label": "Tatouages",
      "route": "/tatouages.html",
      "type": "style",
      "intro": "Tatouages : les motifs et leurs conditions d’accès restent à documenter dans ce catalogue.",
      "limit": "Les services de style annoncés sont présentés dans « Vêtements et style ». Aucun motif avec un prix vérifié n’est publié ici.",
      "empty": "Aucune entrée individuelle vérifiée n’est publiée dans cette catégorie. Sa présence dans le menu ne confirme pas une possibilité d’achat dans GTA VI.",
      "alias": "/style.html#tatouages",
      "menuOrder": 99
    },
    {
      "id": "nourriture",
      "label": "Consommables",
      "route": "/nourriture.html",
      "type": "consumable",
      "intro": "Manger, boire, se soigner : les consommables servent à récupérer de la vie et à tenir pendant une mission. Voici ce que l’on sait pour GTA VI, sans inventer de liste de produits ni de prix.",
      "limit": "Aucun article, prix ou effet chiffré n’est publié par Rockstar pour GTA VI. Les repères ci-dessous viennent des présentations officielles et des précédents jeux de la série.",
      "empty": "Pas encore d’article vérifié à cocher : dès qu’un consommable sera nommé officiellement avec ses conditions d’obtention, il apparaîtra ici.",
      "menu": true,
      "sections": [
        {
          "id": "a-quoi-ca-sert",
          "title": "À quoi ça sert",
          "status": "Repère de la série",
          "text": "Dans les précédents GTA, un snack, une boisson ou un repas rend de la vie ; un gilet pare-balles ajoute une protection. On les achète dans les supérettes, les distributeurs et les fast-foods, ou on les trouve sur place. C’est la même idée que le joueur attend dans GTA VI."
        },
        {
          "id": "ce-qui-est-montre",
          "title": "Ce qui est montré pour GTA VI",
          "status": "Présentations officielles",
          "text": "L’Extended Look du 27 août 2026 montre Jason et Lucia dans des restaurants et des commerces, qu’ils peuvent aussi braquer. D’après les comptes rendus de cette présentation, le personnage peut prendre ou perdre du poids selon ce qu’il mange et son activité physique, et sa condition physique joue sur ses capacités. Rockstar n’a publié ni liste d’articles, ni prix, ni chiffres d’effet."
        },
        {
          "id": "ou-en-trouver",
          "title": "Où on s’attend à en trouver",
          "status": "À confirmer",
          "text": "Fast-foods, supérettes, distributeurs automatiques, bars et stands de plage apparaissent dans les médias officiels de Vice City et des Keys. Voir une enseigne ne prouve pas qu’on peut y acheter quelque chose : chaque adresse sera ajoutée ici quand ce sera confirmé."
        },
        {
          "id": "et-le-calculateur",
          "title": "Et dans le calculateur ?",
          "status": "Conseil",
          "text": "Compte les consommables comme des petites dépenses régulières : dans « Mon budget », mets-les dans le poste « Consommables » avec le montant que tu imagines dépenser par partie. Le kit de soin et le gilet sont décrits dans l’Armurerie.",
          "link": "/calculateurs.html?tool=budget#atelier",
          "linkLabel": "Ouvrir Mon budget"
        }
      ],
      "menuOrder": 1
    },
    {
      "id": "munitions",
      "label": "Munitions et équipement",
      "route": "/munitions.html",
      "type": "ammo",
      "intro": "Munitions et équipement d’arme : articles, compatibilités et conditions d’acquisition restent à documenter.",
      "limit": "Les motifs et variantes d’armes documentés sont dans « Personnalisations ». Aucun prix de munition vérifié n’est publié dans ce catalogue.",
      "empty": "Aucune entrée individuelle vérifiée n’est publiée dans cette catégorie. Sa présence dans le menu ne confirme pas une possibilité d’achat dans GTA VI.",
      "alias": "/armes.html#munitions",
      "menuOrder": 99
    },
    {
      "id": "logements",
      "pending": true,
      "label": "Logements et appartements",
      "route": "/logements.html",
      "type": "housing",
      "intro": "Logements et appartements : les éventuels biens accessibles au joueur restent à distinguer des lieux montrés dans les médias.",
      "limit": "Les demeures des personnages sont dans « Demeures » et les garages documentés dans « Planques ». Aucune offre de logement à acheter avec un prix vérifié n’est publiée ici.",
      "empty": "Aucune entrée individuelle vérifiée n’est publiée dans cette catégorie. Sa présence dans le menu ne confirme pas une possibilité d’achat dans GTA VI.",
      "menuOrder": 99
    }
  ],
  "items": [
    {
      "id": "crest-kayak",
      "category": "boats",
      "ref": {
        "type": "vehicle",
        "id": "crest-kayak"
      },
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Bonus de l’Édition Ultime",
      "description": "Embarcation annoncée avec les véhicules de la planque de Jason.",
      "media": [
        "crest-kayak",
        "jason-s-safehouse-vehicles"
      ],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "vehicle",
      "name": "Crest Kayak",
      "url": "/vehicules/crest-kayak.html",
      "hubUrl": "/bateaux.html#crest-kayak",
      "images": [
        {
          "id": "crest-kayak",
          "titre": "Crest Kayak",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_03.0c9.qtpdi.tf..jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/crest-kayak-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/crest-kayak-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "jason-s-safehouse-vehicles",
          "titre": "Jason’s Safehouse Vehicles",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SAFEHOUSE_VEHICLES_01.0wv6pw3t-mky3.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/jason-s-safehouse-vehicles-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/jason-s-safehouse-vehicles-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        }
      ],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "shitzu-squalo",
      "category": "boats",
      "ref": {
        "type": "vehicle",
        "id": "shitzu-squalo"
      },
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Bonus de l’Édition Ultime",
      "description": "Bateau annoncé à Washington Beach avec une caisse d’armes. Son tarif séparé reste inconnu.",
      "media": [
        "shitzu-squalo-01",
        "shitzu-squalo-02",
        "shitzu-squalo-03",
        "shitzu-squalo-04"
      ],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "vehicle",
      "name": "Shitzu Squalo",
      "url": "/vehicules/shitzu-squalo.html",
      "hubUrl": "/bateaux.html#shitzu-squalo",
      "images": [
        {
          "id": "shitzu-squalo-01",
          "titre": "Shitzu Squalo 01",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SQUALO_01.0cim7hj58ypb1.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/shitzu-squalo-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/shitzu-squalo-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "shitzu-squalo-02",
          "titre": "Shitzu Squalo 02",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SQUALO_02.09qplkj.rjnk7.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/shitzu-squalo-02-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/shitzu-squalo-02-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "shitzu-squalo-03",
          "titre": "Shitzu Squalo 03",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SQUALO_03.0quncwrsw97j1.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/shitzu-squalo-03-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/shitzu-squalo-03-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "shitzu-squalo-04",
          "titre": "Shitzu Squalo 04",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SQUALO_04.00vlesedwtiuy.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/shitzu-squalo-04-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/shitzu-squalo-04-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        }
      ],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "style-vice-city",
      "category": "style",
      "name": "Style de Vice City",
      "kind": "collection",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Collection de l’Édition Ultime",
      "description": "Une sélection de tenues et de tatouages pour les deux protagonistes. Le détail des pièces n’est pas publié.",
      "media": [],
      "trackable": false,
      "calculatorCompatible": false,
      "price": null,
      "type": "style",
      "url": "/style.html#style-vice-city",
      "hubUrl": "/style.html#style-vice-city",
      "images": [],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "articles-du-bonheur",
      "category": "style",
      "name": "Les articles du bonheur",
      "kind": "collection",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Collection de l’Édition Ultime",
      "description": "Vêtements et accessoires inspirés de Macca the Gator. Le catalogue individuel reste à documenter.",
      "media": [],
      "trackable": false,
      "calculatorCompatible": false,
      "price": null,
      "type": "style",
      "url": "/style.html#articles-du-bonheur",
      "hubUrl": "/style.html#articles-du-bonheur",
      "images": [],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "vintage-tenues-coiffures",
      "category": "style",
      "name": "Tenues et coiffures",
      "kind": "collection",
      "sourceId": "vintage",
      "evidenceLevel": 1,
      "acquisition": "preorder-bonus",
      "condition": "Pack Vintage Vice City",
      "description": "Costume pastel en lin et coiffure rétro pour Jason ; mini-robe rouge à sequins et cheveux bouclés pour Lucia. Ces descriptions ne sont pas des noms de produits inventés.",
      "media": [],
      "trackable": false,
      "calculatorCompatible": false,
      "price": null,
      "type": "style",
      "url": "/style.html#vintage-tenues-coiffures",
      "hubUrl": "/style.html#vintage-tenues-coiffures",
      "images": [],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "ganado-retro-build",
      "category": "customizations",
      "name": "Modèle rétro pour le Ganado",
      "kind": "kit",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Kit de l’Édition Ultime · Vapid Ganado de Jason",
      "description": "Kit de modifications dédié au pick-up de Jason. Les performances et le coût séparé ne sont pas publiés.",
      "media": [
        "ganado-retro-build"
      ],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "customization",
      "url": "/personnalisations.html#ganado-retro-build",
      "hubUrl": "/personnalisations.html#ganado-retro-build",
      "images": [
        {
          "id": "ganado-retro-build",
          "titre": "Ganado Retro Build",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_VAPID_GANADO_RETRO_BUILD_01.062dgvkwdynw5.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/ganado-retro-build-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/ganado-retro-build-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        }
      ],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "vintage-weapon-pattern",
      "category": "customizations",
      "name": "Motif d’arme du Pack Vintage Vice City",
      "nameKind": "official-description",
      "kind": "pattern",
      "sourceId": "vintage",
      "evidenceLevel": 1,
      "acquisition": "preorder-bonus",
      "condition": "Pack Vintage Vice City · la plupart des armes",
      "description": "Motif tropical inspiré de la chemise de Tommy Vercetti. La compatibilité arme par arme n’est pas détaillée.",
      "media": [
        "vintage-vice-city-weapon-pattern-01"
      ],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "customization",
      "url": "/personnalisations.html#vintage-weapon-pattern",
      "hubUrl": "/personnalisations.html#vintage-weapon-pattern",
      "images": [
        {
          "id": "vintage-vice-city-weapon-pattern-01",
          "titre": "Vintage Vice City Weapon Pattern 01",
          "alt": "PM moderne à crosse rabattue et pistolet turquoise sur la banquette d’une voiture, près de billets.",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/VINTAGE_VICE_CITY_WEAPON_PATTERN_01.0gybtumgwdcoi.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/vintage-vice-city-weapon-pattern-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/vintage-vice-city-weapon-pattern-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        }
      ],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "garage-paradise",
      "category": "garages",
      "name": "Garage de Paradise",
      "nameKind": "official-description",
      "kind": "garage",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Édition Ultime · Watson Bay",
      "description": "Associé au Dominator Buggy : stationnement, casier d’armes et dépôt de biens destinés à un receleur.",
      "media": [],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "hideout",
      "url": "/planques.html#garage-paradise",
      "hubUrl": "/planques.html#garage-paradise",
      "images": [],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "garage-shore-court",
      "category": "garages",
      "name": "Garage de Shore Court",
      "nameKind": "official-description",
      "kind": "garage",
      "sourceId": "vintage",
      "evidenceLevel": 1,
      "acquisition": "preorder-bonus",
      "condition": "Pack Vintage Vice City · près d’Ocean Beach",
      "description": "Garage privé associé au Stanier : casier d’armes et dépôt de biens destinés à un receleur.",
      "media": [],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "hideout",
      "url": "/planques.html#garage-shore-court",
      "hubUrl": "/planques.html#garage-shore-court",
      "images": [],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    }
  ],
  "services": [
    {
      "ref": "saras-unisex-salon",
      "category": "style",
      "sourceId": "ultimate",
      "description": "Coiffures, pilosité faciale de Jason, maquillage et ongles de Lucia.",
      "media": [
        "sara-s-unisex-salon-01",
        "sara-s-unisex-salon-02",
        "sara-s-unisex-salon-03"
      ],
      "id": "saras-unisex-salon",
      "name": "Sara’s Unisex Salon",
      "url": "/entreprises/saras-unisex-salon.html",
      "images": [
        {
          "id": "sara-s-unisex-salon-01",
          "titre": "Sara’s Unisex Salon 01",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SARAS_SALON_01.0gn7dwlvcgz17.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/sara-s-unisex-salon-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/sara-s-unisex-salon-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "sara-s-unisex-salon-02",
          "titre": "Sara’s Unisex Salon 02",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SARAS_SALON_02.170lw.lgxdghm.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/sara-s-unisex-salon-02-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/sara-s-unisex-salon-02-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        },
        {
          "id": "sara-s-unisex-salon-03",
          "titre": "Sara’s Unisex Salon 03",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_SARAS_SALON_03.0w1t10_u0yv~b.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/sara-s-unisex-salon-03-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/sara-s-unisex-salon-03-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        }
      ],
      "condition": "Service de l’Édition Ultime · tarifs non publiés",
      "evidenceLevel": 1
    },
    {
      "ref": "stock-305",
      "category": "style",
      "sourceId": "ultimate",
      "description": "Boutique de streetwear proposant des looks pour Jason et Lucia.",
      "media": [
        "stock-305-clothing-store-01",
        "stock-305-clothing-store-03",
        "stock-305-clothing-store-04"
      ],
      "id": "stock-305",
      "name": "Stock 305",
      "url": "/entreprises/stock-305.html",
      "images": [
        {
          "id": "stock-305-clothing-store-01",
          "titre": "Stock 305 Clothing Store 01",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_STOCK_305_01.0vuq0m5_1j-17.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/stock-305-clothing-store-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/stock-305-clothing-store-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "stock-305-clothing-store-03",
          "titre": "Stock 305 Clothing Store 03",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_STOCK_305_03.00wltke54q_n0.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/stock-305-clothing-store-03-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/stock-305-clothing-store-03-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        },
        {
          "id": "stock-305-clothing-store-04",
          "titre": "Stock 305 Clothing Store 04",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_STOCK_305_04.0ipze9~3u6eok.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/stock-305-clothing-store-04-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/stock-305-clothing-store-04-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        }
      ],
      "condition": "Service de l’Édition Ultime · tarifs non publiés",
      "evidenceLevel": 1
    },
    {
      "ref": "electric-fang",
      "category": "style",
      "sourceId": "ultimate",
      "description": "Salon de tatouage de Stockyard, avec des créations du collectif FAILE. Aucune liste de tatouages individuels n’est publiée ici.",
      "media": [
        "electric-fang-tattoo-01",
        "electric-fang-tattoo-02",
        "electric-fang-tattoo-03",
        "electric-fang-tattoo-04"
      ],
      "id": "electric-fang",
      "name": "Electric Fang Tattoo",
      "url": "/entreprises/electric-fang.html",
      "images": [
        {
          "id": "electric-fang-tattoo-01",
          "titre": "Electric Fang Tattoo 01",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_ELECTRIC_FANG_01.04tsytu7qp2b-.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/electric-fang-tattoo-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/electric-fang-tattoo-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "electric-fang-tattoo-02",
          "titre": "Electric Fang Tattoo 02",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_ELECTRIC_FANG_02.0a0h59s0zvhgc.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/electric-fang-tattoo-02-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/electric-fang-tattoo-02-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        },
        {
          "id": "electric-fang-tattoo-03",
          "titre": "Electric Fang Tattoo 03",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_ELECTRIC_FANG_03.0wd4urd9xwy5..jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/electric-fang-tattoo-03-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/electric-fang-tattoo-03-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        },
        {
          "id": "electric-fang-tattoo-04",
          "titre": "Electric Fang Tattoo 04",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_ELECTRIC_FANG_04.0p0qga4w7y5yl.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/electric-fang-tattoo-04-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/electric-fang-tattoo-04-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        }
      ],
      "condition": "Service de l’Édition Ultime · tarifs non publiés",
      "evidenceLevel": 1
    },
    {
      "ref": "rideout-customs",
      "category": "customizations",
      "sourceId": "ultimate",
      "description": "Personnalisation de voitures classiques : intérieurs, jantes et style donk.",
      "media": [
        "rideout-customs-mod-shop-01",
        "ultimate-edition-rideout-customs-02",
        "ultimate-edition-rideout-customs-03"
      ],
      "id": "rideout-customs",
      "name": "Rideout Customs",
      "url": "/entreprises/rideout-customs.html",
      "images": [
        {
          "id": "rideout-customs-mod-shop-01",
          "titre": "Rideout Customs Mod Shop 01",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_RIDEOUT_CUSTOMS_01.065-ms8~k8vbq.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/rideout-customs-mod-shop-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/rideout-customs-mod-shop-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "ultimate-edition-rideout-customs-02",
          "titre": "Ultimate Edition Rideout Customs 02",
          "alt": "Habitacle rouge de la voiture présentée dans la série de captures Rideout Customs",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_RIDEOUT_CUSTOMS_02.0u9jg4xxbm_yd.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/ultimate-edition-rideout-customs-02-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/ultimate-edition-rideout-customs-02-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "ultimate-edition-rideout-customs-03",
          "titre": "Ultimate Edition Rideout Customs 03",
          "alt": "Coupé jaune surélevé dans l'atelier Rideout Customs, identifié comme une Albany Manana",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_RIDEOUT_CUSTOMS_03.0_n4oqh5f_ar4.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/ultimate-edition-rideout-customs-03-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/ultimate-edition-rideout-customs-03-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        }
      ],
      "condition": "Service de l’Édition Ultime · tarifs non publiés",
      "evidenceLevel": 1
    },
    {
      "ref": "one-eyed-willie",
      "category": "customizations",
      "sourceId": "ultimate",
      "description": "Atelier de Lake Leonida spécialisé dans le tout-terrain et la décoration peinte à la main.",
      "media": [
        "one-eyed-willie-s-mod-shop-01",
        "one-eyed-willie-s-mod-shop-02",
        "ultimate-edition-one-eyed-willie-03"
      ],
      "id": "one-eyed-willie",
      "name": "One-Eyed Willie’s",
      "url": "/entreprises/one-eyed-willie.html",
      "images": [
        {
          "id": "one-eyed-willie-s-mod-shop-01",
          "titre": "One-Eyed Willie’s Mod Shop 01",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_ONE_EYED_WILLIE_01.0n7-__or5f.b6.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/one-eyed-willie-s-mod-shop-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/one-eyed-willie-s-mod-shop-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        },
        {
          "id": "one-eyed-willie-s-mod-shop-02",
          "titre": "One-Eyed Willie’s Mod Shop 02",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_ONE_EYED_WILLIE_02.0dgnw_y_1bqao.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/one-eyed-willie-s-mod-shop-02-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/one-eyed-willie-s-mod-shop-02-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot"
        },
        {
          "id": "ultimate-edition-one-eyed-willie-03",
          "titre": "One-Eyed Willie 03",
          "alt": "Pick-up Canis vert dans l'atelier One-Eyed Willie de GTA VI.",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_ONE_EYED_WILLIE_03.0mhil16bnp3m2.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/ultimate-edition-one-eyed-willie-03-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/ultimate-edition-one-eyed-willie-03-1280.webp",
              "w": 1280,
              "h": 720
            }
          ]
        }
      ],
      "condition": "Service de l’Édition Ultime · tarifs non publiés",
      "evidenceLevel": 1
    }
  ],
  "weaponVariants": [
    {
      "id": "girardi-es9",
      "name": "Girardi ES9",
      "url": "/armes/girardi-es9.html"
    },
    {
      "id": "klose-k17",
      "name": "Klose K17",
      "url": "/armes/klose-k17.html"
    },
    {
      "id": "hawk-little-morgan",
      "name": "Hawk & Little Morgan",
      "url": "/armes/hawk-little-morgan.html"
    }
  ]
};
