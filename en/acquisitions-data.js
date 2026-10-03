/* Généré par outils/gen-acquisitions.cjs depuis outils/acquisitions.json et les données canoniques existantes. */
window.LK_ACQUISITIONS = {
  "schemaVersion": 1,
  "verifiedAt": "2026-09-23",
  "game": {
    "name": "Grand Theft Auto VI",
    "releaseDate": "2026-11-19",
    "status": "Release announced",
    "checkedAt": "2026-10-01"
  },
  "sources": {
    "ultimate": {
      "url": "https://www.rockstargames.com/VI",
      "title": "Ultimate Edition: interactive presentation",
      "publishedAt": null,
      "consultedAt": "2026-09-23",
      "context": "GTA VI, Ultimate Edition bonus",
      "claim": "Vehicles, garages, styles and customizations described as content of this edition. Their separate in-game prices aren’t published."
    },
    "vintage": {
      "url": "https://www.rockstargames.com/VI",
      "title": "Vintage Vice City Pack: interactive presentation",
      "publishedAt": null,
      "consultedAt": "2026-09-23",
      "context": "GTA VI, pre-order bonus",
      "claim": "The showcase describes a vehicle and its garage, outfits and hairstyles, plus a weapon pattern. It doesn’t confirm you can buy them separately in the game."
    },
    "preorder": {
      "url": "https://www.rockstargames.com/newswire/article/5171972o3ak5oa/pre-order-grand-theft-auto-vi-on-june-25",
      "title": "Pre-Order Grand Theft Auto VI on June 25",
      "publishedAt": "2026-06-24",
      "consultedAt": "2026-09-23",
      "context": "GTA VI, editions overview",
      "claim": "Release announced for November 19, 2026 on PS5 and Xbox Series X|S. Single-player experience. The Vintage Pack comes with purchases made before November 20, 2026."
    },
    "screenshots": {
      "url": "https://www.rockstargames.com/VI/media/screenshots",
      "title": "GTA VI: official screenshots",
      "publishedAt": null,
      "consultedAt": "2026-09-23",
      "context": "Official GTA VI gallery",
      "claim": "The screenshots document what the content looks like. An image alone confirms neither a price nor that it can be bought."
    },
    "extended": {
      "url": "https://www.rockstargames.com/newswire/article/4k138k8okkk483/grand-theft-auto-vi-an-extended-look-now-playing",
      "title": "Grand Theft Auto VI: An Extended Look: Now Playing",
      "publishedAt": "2026-08-27",
      "consultedAt": "2026-09-23",
      "context": "Official presentation",
      "claim": "Announcement of a presentation recorded in the game on PS5. No shopping list is inferred from the announcement alone."
    }
  },
  "categories": [
    {
      "id": "boats",
      "label": "Boats",
      "route": "/en/bateaux.html",
      "type": "vehicle",
      "intro": "Kayak or motorboat: find the boats Rockstar explains how to get, then the sightings already listed in Vehicles.",
      "limit": "The bonuses below are tied to an edition. Whether you can buy them separately, and their in-game price, aren’t confirmed.",
      "empty": "No boat with an officially documented way to get it is available yet.",
      "menuOrder": 99,
      "description": "The boats Rockstar says how to get: the Crest Kayak and the Shitzu Squalo, Ultimate Edition bonuses linked to their Vehicles pages. Buying them separately and their in-game price aren’t confirmed. You can check them off and find the other boats in the Vehicles catalog."
    },
    {
      "id": "style",
      "label": "Clothing and style",
      "route": "/en/style.html",
      "type": "style",
      "intro": "Hairstyles, tattoos, outfits and accessories: everything that changes how Jason and Lucia look, in three expandable lists, with the announced collections and the shops Rockstar has shown.",
      "limit": "No GTA VI prices have been published: each row shows its status, and GTA V and GTA Online prices stay in their benchmark column. The collections described aren’t a list of items you can buy.",
      "empty": "Waiting for official data on individual items. The announced collections and services are shown below, with no fake pages or checkboxes.",
      "menu": true,
      "menuOrder": 2,
      "description": "Three expandable lists (hairstyles, tattoos, outfits and accessories) with status, effect, series benchmark price, location and a link to the map, plus the announced collections (Ultimate Edition, Vintage Vice City Pack) and the addresses of Stock 305, Sara’s Unisex Salon and Electric Fang Tattoo. No GTA VI prices. You can filter, sort and check off what you wear."
    },
    {
      "id": "customizations",
      "label": "Customization",
      "route": "/en/personnalisations.html",
      "type": "customization",
      "intro": "Everything you can customize on a vehicle or a weapon, item by item: what Rockstar has said or shown for GTA VI (Rideout Customs, One-Eyed Willie’s, the Ganado kit, engraved weapons, the Vintage pattern), and what the series already did, with its prices shown as benchmarks.",
      "limit": "A cosmetic mod doesn’t prove any gain in speed or income. No GTA VI price or numbered effect is assumed: a GTA V or GTA Online number stays in its own column.",
      "empty": "Waiting for official data on an identifiable customization.",
      "menu": true,
      "menuOrder": 3,
      "description": "Two expandable lists, vehicles and weapons, with each mod’s status, effect, series benchmark price, the workshop where you get it done and a link to the map. The Ganado kit and the Vintage pattern described by Rockstar are there to check off; every vehicle page and every weapon page links to its filtered list."
    },
    {
      "id": "garages",
      "label": "Documented garages",
      "route": "/en/planques.html#garages",
      "type": "hideout",
      "intro": "Garages described with vehicle bonuses are listed separately from hideouts that were only shown in the media.",
      "limit": "Access depends on the announced content. No separate property purchase, rental income or in-game price is confirmed.",
      "empty": "Waiting for official data on an identifiable garage.",
      "menuOrder": 99,
      "description": "The hideouts seen in media and the two garages described with the editions: Paradise in Watson Bay (Ultimate Edition) and Shore Court near Ocean Beach (Vintage Pack). Rockstar describes a weapon locker and a drop-off for a fence there; no separate property purchase, price or income is confirmed. You can check off the documented garages."
    },
    {
      "id": "vetements",
      "label": "Individual clothing items",
      "route": "/en/vetements.html",
      "type": "style",
      "intro": "Individual clothing items: this category is ready for identified items and how to get them.",
      "limit": "The announced collections are in “Clothing and style”. No individual item with a verified separate price is currently published here.",
      "empty": "No verified individual entry is published in this category. Its place in the menu doesn’t confirm that you can buy one in GTA VI.",
      "alias": "/en/style.html#tenues",
      "menuOrder": 99
    },
    {
      "id": "accessoires",
      "label": "Accessories",
      "route": "/en/accessoires.html",
      "type": "style",
      "intro": "Glasses, watches, jewelry, bags, caps: a category still to document, with no confirmed shopping list.",
      "limit": "No individual accessory with verified purchase conditions is currently published in this section.",
      "empty": "No verified individual entry is published in this category. Its place in the menu doesn’t confirm that you can buy one in GTA VI.",
      "alias": "/en/style.html#accessoires",
      "menuOrder": 99
    },
    {
      "id": "tatouages",
      "label": "Tattoos",
      "route": "/en/tatouages.html",
      "type": "style",
      "intro": "Tattoos: the designs and how to get them are still to be documented in this catalog.",
      "limit": "The announced style services are shown in “Clothing and style”. No design with a verified price is published here.",
      "empty": "No verified individual entry is published in this category. Its place in the menu doesn’t confirm that you can buy one in GTA VI.",
      "alias": "/en/style.html#tatouages",
      "menuOrder": 99
    },
    {
      "id": "nourriture",
      "label": "Consumables",
      "route": "/en/nourriture.html",
      "type": "consumable",
      "intro": "Eating, drinking, healing, protecting yourself: consumables help you get health back and hold out during a mission. Here’s the full list of what we know for GTA VI, along with what the series did before.",
      "limit": "Rockstar hasn’t published any prices or effect numbers for GTA VI: each row shows its status, and numbers from GTA V, GTA IV or San Andreas stay in their benchmark column.",
      "empty": "No verified item to check off yet: as soon as a consumable is officially named with how to get it, it’ll show up here.",
      "menu": true,
      "menuOrder": 1,
      "description": "Eat, drink, heal, protect yourself: a full expandable list (morning coffee, protein shake, Sprunk, beer at the bar, armor vests, kits…) with status, effect, series benchmark price, location and a link to the map. No GTA VI prices published. You can filter, sort and check off what you’ve tasted."
    },
    {
      "id": "munitions",
      "label": "Ammo and gear",
      "route": "/en/munitions.html",
      "type": "ammo",
      "intro": "Ammo and weapon gear: items, compatibility and how to get them are still to be documented.",
      "limit": "The documented weapon patterns and variants are in “Customization”. No verified ammo price is published in this catalog.",
      "empty": "No verified individual entry is published in this category. Its place in the menu doesn’t confirm that you can buy one in GTA VI.",
      "alias": "/en/armes.html#munitions",
      "menuOrder": 99
    },
    {
      "id": "logements",
      "pending": true,
      "label": "Housing and apartments",
      "route": "/en/logements.html",
      "type": "housing",
      "intro": "Housing and apartments: any properties the player might be able to get still have to be told apart from the places shown in the media.",
      "limit": "Character residences are in “Residences” and documented garages are in “Safehouses”. No home for sale with a verified price is listed here.",
      "empty": "No verified individual entry is published in this category. Its place in the menu doesn’t confirm that you can buy one in GTA VI.",
      "menuOrder": 99,
      "description": "The category is ready for property a player might buy. No housing offer with a verified price has been published: being in the menu doesn’t confirm you can buy it. The characters’ residences are in “Residences”, the documented garages in “Safehouses”."
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
      "condition": "Ultimate Edition bonus",
      "description": "A boat announced with the vehicles at Jason’s safehouse.",
      "media": [
        "crest-kayak",
        "jason-s-safehouse-vehicles"
      ],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "vehicle",
      "name": "Crest Kayak",
      "url": "/en/vehicules/crest-kayak.html",
      "hubUrl": "/en/bateaux.html#crest-kayak",
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
      "condition": "Ultimate Edition bonus",
      "description": "A boat announced at Washington Beach with a weapons crate. Its separate price is still unknown.",
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
      "url": "/en/vehicules/shitzu-squalo.html",
      "hubUrl": "/en/bateaux.html#shitzu-squalo",
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
      "name": "Vice City Style",
      "kind": "collection",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Ultimate Edition collection",
      "description": "A selection of outfits and tattoos for both protagonists. The item breakdown isn’t published.",
      "media": [
        "ultimate-edition-02"
      ],
      "trackable": false,
      "calculatorCompatible": false,
      "price": null,
      "type": "style",
      "url": "/en/style.html#style-vice-city",
      "hubUrl": "/en/style.html#style-vice-city",
      "images": [
        {
          "id": "ultimate-edition-02",
          "titre": "Ultimate Edition 02",
          "alt": "Jason and Lucia in front of the green coupe matched to a Kellison J4 in the Ultimate Edition artwork",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_02.0q-6.nrtf~jj0.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/ultimate-edition-02-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/ultimate-edition-02-1280.webp",
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
      "id": "articles-du-bonheur",
      "category": "style",
      "name": "Goodtime Gear",
      "kind": "collection",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Ultimate Edition collection",
      "description": "Clothing and accessories inspired by Macca the Gator. The individual catalog is still to be documented.",
      "media": [
        "goodtime-gear-01"
      ],
      "mediaCaption": "Official “Goodtime Gear” screenshot from the Ultimate Edition: Jason and Lucia wear the Macca the Gator outfits and caps from this collection.",
      "trackable": false,
      "calculatorCompatible": false,
      "price": null,
      "type": "style",
      "url": "/en/style.html#articles-du-bonheur",
      "hubUrl": "/en/style.html#articles-du-bonheur",
      "images": [
        {
          "id": "goodtime-gear-01",
          "titre": "Goodtime Gear",
          "alt": "Jason and Lucia in Vice City caps and T-shirts featuring Macca the Gator, in front of a mural of the alligator (official “Goodtime Gear” screenshot from the Ultimate Edition).",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_GOODTIME_GEAR_01.0t7de8dow381q.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/goodtime-gear-01-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/goodtime-gear-01-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot",
          "consultedAt": "2026-10-01"
        }
      ],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "vintage-tenues-coiffures",
      "category": "style",
      "name": "Outfits and hairstyles",
      "kind": "collection",
      "sourceId": "vintage",
      "evidenceLevel": 1,
      "acquisition": "preorder-bonus",
      "condition": "Vintage Vice City Pack",
      "description": "Pastel linen suit and retro hairstyle for Jason; red sequin mini dress and curly hair for Lucia. These descriptions aren’t made-up product names.",
      "media": [
        "vintage-vice-city-pack-exclusive-looks-03"
      ],
      "trackable": false,
      "calculatorCompatible": false,
      "price": null,
      "type": "style",
      "url": "/en/style.html#vintage-tenues-coiffures",
      "hubUrl": "/en/style.html#vintage-tenues-coiffures",
      "images": [
        {
          "id": "vintage-vice-city-pack-exclusive-looks-03",
          "titre": "Vintage Vice City Pack Exclusive Looks 03",
          "alt": "Jason holds a turquoise compact SMG with a palm-tree pattern in Vintage Vice City artwork.",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/VINTAGE_VICE_CITY_PACK_EXCLUSIVE_LOOKS_03.0au1tphsftqm5.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/vintage-vice-city-pack-exclusive-looks-03-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/vintage-vice-city-pack-exclusive-looks-03-1280.webp",
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
      "id": "ganado-retro-build",
      "category": "customizations",
      "name": "Retro model for the Ganado",
      "kind": "kit",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Ultimate Edition kit · Jason’s Vapid Ganado",
      "description": "Mod kit made for Jason’s pickup. Its performance and separate cost aren’t published.",
      "media": [
        "ganado-retro-build"
      ],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "customization",
      "url": "/en/personnalisations.html#ganado-retro-build",
      "hubUrl": "/en/personnalisations.html#ganado-retro-build",
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
      "name": "Vintage Vice City Pack weapon pattern",
      "nameKind": "official-description",
      "kind": "pattern",
      "sourceId": "vintage",
      "evidenceLevel": 1,
      "acquisition": "preorder-bonus",
      "condition": "Vintage Vice City Pack · most weapons",
      "description": "Tropical pattern inspired by Tommy Vercetti’s shirt. Gun-by-gun compatibility isn’t detailed.",
      "media": [
        "vintage-vice-city-weapon-pattern-01"
      ],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "customization",
      "url": "/en/personnalisations.html#vintage-weapon-pattern",
      "hubUrl": "/en/personnalisations.html#vintage-weapon-pattern",
      "images": [
        {
          "id": "vintage-vice-city-weapon-pattern-01",
          "titre": "Vintage Vice City Weapon Pattern 01",
          "alt": "Modern SMG with a folded stock and a turquoise pistol on a car’s bench seat, near some cash.",
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
      "name": "Paradise garage",
      "nameKind": "official-description",
      "kind": "garage",
      "sourceId": "ultimate",
      "evidenceLevel": 1,
      "acquisition": "edition-bonus",
      "condition": "Ultimate Edition · Watson Bay",
      "description": "Tied to the Dominator Buggy: parking, a weapon locker and a stash for goods to sell to a fence.",
      "media": [],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "hideout",
      "url": "/en/planques.html#garage-paradise",
      "hubUrl": "/en/planques.html#garage-paradise",
      "images": [],
      "source": "https://www.rockstargames.com/VI",
      "verifiedAt": "2026-09-23",
      "status": "official",
      "purchasable": null
    },
    {
      "id": "garage-shore-court",
      "category": "garages",
      "name": "Shore Court garage",
      "nameKind": "official-description",
      "kind": "garage",
      "sourceId": "vintage",
      "evidenceLevel": 1,
      "acquisition": "preorder-bonus",
      "condition": "Vintage Vice City Pack · near Ocean Beach",
      "description": "Private garage tied to the Stanier: a weapon locker and a stash for goods to sell to a fence.",
      "media": [],
      "trackable": true,
      "calculatorCompatible": true,
      "price": null,
      "type": "hideout",
      "url": "/en/planques.html#garage-shore-court",
      "hubUrl": "/en/planques.html#garage-shore-court",
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
      "description": "Hairstyles, Jason’s facial hair, Lucia’s makeup and nails.",
      "media": [
        "sara-s-unisex-salon-01",
        "sara-s-unisex-salon-02",
        "sara-s-unisex-salon-03"
      ],
      "id": "saras-unisex-salon",
      "name": "Sara’s Unisex Salon",
      "url": "/en/entreprises/saras-unisex-salon.html",
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
      "condition": "Ultimate Edition service · prices not published",
      "evidenceLevel": 1
    },
    {
      "ref": "stock-305",
      "category": "style",
      "sourceId": "ultimate",
      "description": "Streetwear store offering looks for Jason and Lucia.",
      "media": [
        "stock-305-clothing-store-01",
        "stock-305-clothing-store-02",
        "stock-305-clothing-store-03",
        "stock-305-clothing-store-04"
      ],
      "id": "stock-305",
      "name": "Stock 305",
      "url": "/en/entreprises/stock-305.html",
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
          "id": "stock-305-clothing-store-02",
          "titre": "Stock 305 Clothing Store 02",
          "alt": "Jason, in a gray denim jacket, leaning against a wall of colorful spray cans in the Stock 305 shop (official Ultimate Edition screenshot).",
          "source": "https://www.rockstargames.com/VI/media/screenshots",
          "original": "https://www.rockstargames.com/VI/_next/static/media/ULTIMATE_EDITION_STOCK_305_02.0va5ldrhsejht.jpg?akim=1&imdensity=1&imwidth=1920",
          "credit": "© Rockstar Games / Take-Two Interactive",
          "variants": [
            {
              "src": "/img/officiel/stock-305-clothing-store-02-480.webp",
              "w": 480,
              "h": 270
            },
            {
              "src": "/img/officiel/stock-305-clothing-store-02-1280.webp",
              "w": 1280,
              "h": 720
            }
          ],
          "mediaType": "official-screenshot",
          "consultedAt": "2026-10-01"
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
      "condition": "Ultimate Edition service · prices not published",
      "evidenceLevel": 1
    },
    {
      "ref": "electric-fang",
      "category": "style",
      "sourceId": "ultimate",
      "description": "Stockyard tattoo parlor, with designs by the FAILE collective. No list of individual tattoos is published here.",
      "media": [
        "electric-fang-tattoo-01",
        "electric-fang-tattoo-02",
        "electric-fang-tattoo-03",
        "electric-fang-tattoo-04"
      ],
      "id": "electric-fang",
      "name": "Electric Fang Tattoo",
      "url": "/en/entreprises/electric-fang.html",
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
      "condition": "Ultimate Edition service · prices not published",
      "evidenceLevel": 1
    },
    {
      "ref": "rideout-customs",
      "category": "customizations",
      "sourceId": "ultimate",
      "description": "Classic car customization: interiors, rims and donk style.",
      "media": [
        "rideout-customs-mod-shop-01",
        "ultimate-edition-rideout-customs-02",
        "ultimate-edition-rideout-customs-03"
      ],
      "id": "rideout-customs",
      "name": "Rideout Customs",
      "url": "/en/entreprises/rideout-customs.html",
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
          "titre": "Ultimate Edition, Rideout Customs 02",
          "alt": "Red interior of the car shown in the Rideout Customs screenshot series",
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
          "titre": "Ultimate Edition, Rideout Customs 03",
          "alt": "Raised yellow coupe in the Rideout Customs shop, identified as an Albany Manana",
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
      "condition": "Ultimate Edition service · prices not published",
      "evidenceLevel": 1
    },
    {
      "ref": "one-eyed-willie",
      "category": "customizations",
      "sourceId": "ultimate",
      "description": "Lake Leonida shop specializing in off-road builds and hand-painted designs.",
      "media": [
        "one-eyed-willie-s-mod-shop-01",
        "one-eyed-willie-s-mod-shop-02",
        "ultimate-edition-one-eyed-willie-03"
      ],
      "id": "one-eyed-willie",
      "name": "One-Eyed Willie’s",
      "url": "/en/entreprises/one-eyed-willie.html",
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
          "alt": "Green Canis pickup at One-Eyed Willie’s in GTA VI.",
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
      "condition": "Ultimate Edition service · prices not published",
      "evidenceLevel": 1
    }
  ],
  "weaponVariants": [
    {
      "id": "girardi-es9",
      "name": "Girardi ES9",
      "url": "/en/armes/girardi-es9.html"
    },
    {
      "id": "klose-k17",
      "name": "Klose K17",
      "url": "/en/armes/klose-k17.html"
    },
    {
      "id": "hawk-little-morgan",
      "name": "Hawk & Little Morgan",
      "url": "/en/armes/hawk-little-morgan.html"
    }
  ]
};
