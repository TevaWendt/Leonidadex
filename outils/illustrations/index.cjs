'use strict';
/* Illustrations Leonidakit, v7.77 (demandes de Téva du 09/10/2026 : « n'implante pas les designs là où il y a déjà les vrais
   visuels » ; « un dessin qui reste dans le thème GTA 6 avec le branding du site », « style rétro Rockstar », « avoir la forme
   de l'objet » ; « plus silhouette, comme si on l'attend et qu'il va bientôt venir, en mode suspense »). Les dessins SVG de la
   v7.76 sont remplacés par des silhouettes « teaser », une par élément des catalogues Consommables, Vêtements et style
   (coiffures, tatouages, tenues) et Personnalisations (véhicules, armes) qui n'a pas de visuel officiel propre : chaque objet
   est modelé en 3D avec Blender, puis montré en ombre (liseré de lumière teinté de sa couleur, ses propres lumières, ombre
   portée) sur un fond aux couleurs du site ; scripts dans outils/rendus/. Aucune marque, aucun logo, aucune image du jeu.
   Deux fichiers WebP par élément dans img/illus/<famille>/ : <id>.webp (960 × 600, fiche ouverte et cartes « En un regard »)
   et <id>-p.webp (384 × 240, vignettes des listes). Les éléments qui ont leur visuel officiel le gardent (quatre de plus en
   v7.77 : Goodtime Gear, revolvers Hawk & Little Morgan, coiffure et costume du Pack Vintage de Jason) ; la barre fermée de
   chaque liste garde les visuels officiels de ses catégories. */
const fs = require('node:fs'), path = require('node:path');

const IDS = {
  consommables: ['cafe-du-matin', 'shake-proteine', 'barre-proteinee', 'chips-tortilla', 'sprunk', 'ecola', 'pisswasser', 'ps-and-qs', 'egochaser', 'meteorite',
    'burger-fast-food', 'repas-au-diner', 'hot-dog-de-stand', 'bleeder-burger-shot', 'fowl-burger', 'menu-cluckin-little', 'menu-cluckin-big', 'menu-cluckin-huge', 'menu-salade',
    'gilet-super-leger', 'gilet-leger', 'gilet-standard', 'gilet-lourd', 'gilet-super-lourd', 'gilet-gta6', 'kit-de-soin-ramasse', 'recuperation-automatique', 'kit-de-soin-gta6'],
  coiffures: ['coupe-a-la-planque', 'coupe-en-salon', 'couleur-des-cheveux', 'online-lentilles', 'online-maquillage', 'lucia-boucles', 'lucia-maquillage',
    'gta5-fade', 'gta5-shape-up', 'gta5-corn-rows', 'gta5-lo-fro', 'gta5-the-king-fresh', 'gta5-abstraction', 'gta5-lexington', 'gta5-clippered-cut', 'gta5-grown-out', 'gta5-slicker',
    'gta5-trailer-cut', 'gta5-mullet', 'gta5-clean-razor', 'gta5-coupes-social-club', 'gta5-rasage', 'gta5-barbe-de-trois-jours', 'gta5-bouc-complet', 'gta5-methodical',
    'gta5-full-spartan', 'gta5-grosse-moustache', 'gta5-the-gerry', 'gta5-barbes-de-depart', 'online-buzzcut', 'online-close-shave', 'online-faux-hawk', 'online-cornrows',
    'online-dreads', 'online-top-knot', 'online-shaggy-mullet', 'online-couettes', 'online-queue-de-cheval', 'online-coupe-courte', 'online-tresses', 'online-mullet-femme',
    'online-knotless-braids', 'online-baby-braids', 'online-light-stubble', 'online-balbo', 'online-goatee', 'online-curly', 'online-handlebar', 'online-sourcils-torse'],
  tatouages: ['vice-city-style-tatouages', 'zone-torse-gta6', 'zone-visage-cou', 'gta5-zone-torse', 'gta5-zone-tete', 'gta5-zone-bras-gauche', 'gta5-zone-bras-droit', 'gta5-zone-jambes',
    'gta5-smiley', 'gta5-dague', 'gta5-eye-catcher', 'gta5-dope-skull', 'gta5-fresque-florale', 'gta5-dragon-chinois', 'gta5-families-kings', 'gta5-family-is-forever', 'gta5-chamberlain', 'gta5-retrait'],
  tenues: ['milliers-de-tenues', 'tenues-gagnees-en-mission', 'vice-city-style-tenues', 'lucia-mini-robe-sequins', 'lucia-tenue-de-soiree',
    'bandana-de-braquage', 'gta5-hauts', 'gta5-pantalons', 'gta5-chaussures', 'gta5-tenues-completes', 'gta5-costumes-ponsonbys', 'gta5-chapeaux', 'gta5-lunettes', 'gta5-accessoires',
    'gta5-masques-vespucci', 'gta5-boutons-cologne-parfum'],
  'perso-vehicules': ['conversion-bennys', 'mods-performance-gta6', 'pare-chocs-avant', 'pare-chocs-arriere', 'jupes', 'aileron', 'capot', 'toit', 'calandre', 'ailes', 'echappement', 'arceau',
    'jantes-familles', 'couleur-jantes', 'pneus-flancs', 'pneus-pare-balles', 'fumee-pneus', 'pneus-faible-adherence', 'pay-n-spray', 'peinture-principale', 'peinture-secondaire', 'nacre',
    'cameleon', 'vitres-teintees', 'vitres-noir-pur', 'plaques', 'klaxons', 'klaxons-boucle', 'phares-xenon', 'phares-couleur', 'neons-disposition', 'neons-couleur', 'suspension-niveaux',
    'hydrauliques', 'moteur-ems', 'moteur-bennys', 'freins', 'transmission', 'turbo', 'blindage', 'interieur-bennys', 'livrees-serie', 'embleme-crew', 'alarme-traceur-gta6',
    'traceur-assurance', 'bombes', 'motos-conf', 'bateaux-avions-conf'],
  'perso-armes': ['plus-d-options', 'camouflages-mk2', 'teintes', 'teintes-mk2', 'chargeur-etendu', 'chargeur-tambour', 'chargeur-caisson', 'lunette',
    'viseur-holographique', 'lunettes-mk2', 'lunette-montee-pistolet', 'lunette-nocturne', 'lunette-thermique', 'silencieux', 'compensateur', 'freins-de-bouche', 'canon-lourd', 'poignee',
    'lampe-tactique', 'laser', 'munitions-tracantes', 'munitions-incendiaires', 'munitions-perforantes', 'munitions-creuses', 'munitions-blindees', 'munitions-explosives',
    'munitions-gta6-conf', 'conversion-mk2', 'casier-ammunation', 'armes-exclusives', 'casier-garage', 'melee-projectiles-conf']
};
const MAP = Object.fromEntries(Object.entries(IDS).map(([fam, ids]) => [fam, Object.fromEntries(ids.map(id => [id, true]))]));
const DIR = 'img/illus';
const W = 960, H = 600, PW = 384, PH = 240;
const has = (fam, id) => !!(MAP[fam] && MAP[fam][id]);
const src = (fam, id) => DIR + '/' + fam + '/' + id + '.webp';
const srcSmall = (fam, id) => DIR + '/' + fam + '/' + id + '-p.webp';

/* dimensions d'un fichier WebP (VP8, VP8L ou VP8X), sans dépendance */
function webpSize(file) {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
  const kind = b.toString('ascii', 12, 16);
  if (kind === 'VP8 ') return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff, bytes: b.length };
  if (kind === 'VP8L') { const v = b.readUInt32LE(21); return { w: (v & 0x3fff) + 1, h: ((v >> 14) & 0x3fff) + 1, bytes: b.length }; }
  if (kind === 'VP8X') return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3), bytes: b.length };
  return null;
}

/* les images sont des fichiers du dépôt (rendues hors du site) : rien à écrire ; on liste celles qui sont servies */
function write(root, families) {
  const out = [];
  for (const [fam, data] of Object.entries(families)) {
    if (!MAP[fam]) continue;
    for (const it of data.items) if (has(fam, it.id) && !it.media) out.push(src(fam, it.id), srcSmall(fam, it.id));
  }
  return out;
}

/* contrôle : chaque élément sans visuel officiel propre a ses deux images (aux bonnes dimensions), aucune image en trop,
   aucune illustration pour un élément qui a son visuel officiel */
function check(families, root = path.resolve(__dirname, '../..')) {
  const errors = [];
  for (const [fam, data] of Object.entries(families)) {
    if (!MAP[fam]) continue;
    const ids = new Set(data.items.map(it => it.id));
    for (const it of data.items) {
      if (it.media && has(fam, it.id)) errors.push('illustrations : « ' + it.id + ' » (' + fam + ') a son visuel officiel, pas d’illustration');
      if (!it.media && !has(fam, it.id)) errors.push('illustrations : « ' + it.id + ' » (' + fam + ') n’a ni visuel officiel ni illustration');
    }
    for (const id of Object.keys(MAP[fam])) {
      if (!ids.has(id)) { errors.push('illustrations : « ' + id + ' » (' + fam + ') ne correspond à aucun élément'); continue; }
      for (const [rel, w, h] of [[src(fam, id), W, H], [srcSmall(fam, id), PW, PH]]) {
        const f = path.join(root, rel);
        if (!fs.existsSync(f)) { errors.push('illustrations : fichier manquant ' + rel); continue; }
        const s = webpSize(f);
        if (!s || s.w !== w || s.h !== h) errors.push('illustrations : ' + rel + ' doit mesurer ' + w + ' × ' + h);
      }
    }
    const dir = path.join(root, DIR, fam);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) {
      const id = f.replace(/(-p)?\.webp$/, '');
      if (!f.endsWith('.webp') || !has(fam, id)) errors.push('illustrations : fichier en trop ' + DIR + '/' + fam + '/' + f);
    }
  }
  return errors;
}
module.exports = { IDS, MAP, DIR, W, H, PW, PH, has, src, srcSmall, webpSize, write, check };
