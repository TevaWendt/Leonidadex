'use strict';
/* v7.40 (lot 3) : système de sections éditoriales des hubs (Véhicules, Armurerie, Achats ; réutilisable partout).
   Une section = un numéro et un kicker en mono, un titre Archivo 800, une ligne d'accent, une icône SVG dessinée dans
   la charte (trait encre, une couleur d'accent), un fond parmi trois (papier / papier-2 / nuit) et une composition
   propre à son contenu : grands chiffres avec micro-barres, mur de marques, cartes d'équipement avec suivi, bandeau
   de munitions, cartes numérotées avec capture officielle, cartes-lieux avec vignette de la carte.
   Le balisage sort d'ici, les styles sont dans style.css (bloc « v7.40 : sections éditoriales »), le comportement
   (filtre du mur de marques, sous-navigation collante) dans common.js. Aucun texte n'est écrit ici : les générateurs
   passent leurs données. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const carte = require('./carte-vignette.cjs');
const esc = x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');

/* ---------- icônes (24 × 24, trait courant ; la classe « ac » reçoit la couleur d'accent) ---------- */
const ICONS = {
  chiffres: '<path d="M4 20h16"/><rect x="5" y="11" width="3" height="7"/><rect x="10.5" y="6" width="3" height="12"/><rect class="ac" x="16" y="9" width="3" height="9"/>',
  marques: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><circle class="ac" cx="7.5" cy="7.5" r="1.6"/>',
  conduite: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="M3.2 11h5.8M15 11h5.8M12 15v5.8"/><circle class="ac" cx="12" cy="12" r="1.4"/>',
  nommes: '<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5 7 21l5-2.5 5 2.5-1.5-7.5"/><path class="ac" d="M12 6.4l.9 1.9 2.1.3-1.5 1.5.4 2.1-1.9-1-1.9 1 .4-2.1-1.5-1.5 2.1-.3z"/>',
  carte: '<path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle class="ac" cx="12" cy="10" r="2.4"/>',
  inventaire: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.5"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.5"/><rect class="ac" x="13.5" y="13.5" width="7" height="7" rx="1.5"/>',
  equipements: '<path d="M7 9V7a5 5 0 0 1 10 0v2"/><rect x="4.5" y="9" width="15" height="12" rx="3"/><path d="M9 15h6"/><path class="ac" d="M9.5 12.5h5v2h-5z"/>',
  munitions: '<path d="M6 21v-8.5a2 2 0 0 1 4 0V21z"/><path d="M14 21v-8.5a2 2 0 0 1 4 0V21z"/><path d="M8 10.5V6M16 10.5V6"/><path class="ac" d="M6 17h4v4H6zM14 17h4v4h-4z"/>',
  combat: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle class="ac" cx="12" cy="12" r="2"/>',
  lire: '<path d="M3 5.5A8 8 0 0 1 12 7a8 8 0 0 1 9-1.5v13A8 8 0 0 0 12 20a8 8 0 0 0-9-1.5z"/><path d="M12 7v13"/><circle class="ac" cx="7" cy="10.5" r="1.2"/>',
  faq: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z"/><path d="M10 8.2a2 2 0 1 1 3 1.7c-.8.5-1 .9-1 1.6"/><circle class="ac" cx="12" cy="13.6" r="1"/>',
  achats: '<path d="M5 8h14l-1 12H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/><circle class="ac" cx="9" cy="11.5" r="1.1"/><circle class="ac" cx="15" cy="11.5" r="1.1"/>',
  argent: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path class="ac" d="M5 9h2v2H5zM17 13h2v2h-2z"/>',
  statuts: '<path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z"/><path d="M9 12l2 2 4-4"/><circle class="ac" cx="12" cy="6.8" r="1"/>',
  calcul: '<rect x="5" y="3" width="14" height="18" rx="2"/><rect x="8" y="6" width="8" height="3" rx=".6"/><path d="M8.5 13h1M12 13h1M15.5 13h1M8.5 17h1M12 17h1"/><rect class="ac" x="15" y="16" width="2" height="2" rx=".5"/>',
  horloge: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
  ouvert: '<path d="M4 20V8l8-5 8 5v12"/><path d="M4 20h16"/><path d="M9 20v-6h6v6"/><circle class="ac" cx="12" cy="9.5" r="1.3"/>',
  boussole: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
  /* équipements et gadgets de l'Armurerie */
  'sac-a-dos': '<path d="M7 9V7a5 5 0 0 1 10 0v2"/><rect x="4.5" y="9" width="15" height="12" rx="3"/><path d="M9 15h6"/><path class="ac" d="M9.5 12.5h5v2h-5z"/>',
  'gilet-pare-balles': '<path d="M7 4l2.5 1.5L12 8l2.5-2.5L17 4l3 3-2 3v10H6V10L4 7z"/><path class="ac" d="M10 12h4v6h-4z"/>',
  'kit-de-soin': '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5h6v2"/><path class="ac" d="M11 11h2v2h2v2h-2v2h-2v-2H9v-2h2z"/>',
  antidouleurs: '<circle cx="9" cy="12" r="4.5"/><path d="M9 7.5v9"/><circle class="ac" cx="16.5" cy="14.5" r="2.6"/>',
  jumelles: '<circle cx="7" cy="15" r="3.5"/><circle cx="17" cy="15" r="3.5"/><path d="M8.5 6h7l1.5 6M7 6l-1.5 6"/><path d="M10.5 15h3"/><circle class="ac" cx="7" cy="15" r="1.2"/><circle class="ac" cx="17" cy="15" r="1.2"/>',
  'lampe-torche': '<path d="M4 8h9l3 3v4l-3 3H4z"/><path d="M13 8v10M20 12h1.5M19 8.5l1-1M19 15.5l1 1"/><path class="ac" d="M5 10h3v6H5z"/>',
  crochet: '<rect x="5" y="10" width="10" height="9" rx="2"/><path d="M7 10V7.5a3 3 0 0 1 6 0"/><path d="M14 21l6-6-2-2-6 6"/><circle class="ac" cx="10" cy="14.5" r="1.2"/>',
  reglette: '<path d="M10 3h4v14a2 2 0 0 1-4 0z"/><path d="M14 9h3l-3 2"/><path class="ac" d="M11 4h2v4h-2z"/>',
  'contournement-d-antidemarrage': '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/><rect class="ac" x="10" y="10" width="4" height="4" rx=".6"/>',
  'outil-de-decoupe': '<circle cx="9" cy="12" r="5.5"/><path d="M14.5 12h5.5v3h-5"/><path d="M9 6.5v11M3.5 12h11"/><circle class="ac" cx="9" cy="12" r="1.4"/>',
  brouilleur: '<path d="M12 19V9"/><circle cx="12" cy="7.5" r="1.8"/><path d="M8 4.5a6 6 0 0 0 0 6M16 4.5a6 6 0 0 1 0 6M5.5 2.5a9 9 0 0 0 0 10M18.5 2.5a9 9 0 0 1 0 10"/><path class="ac" d="M9.5 19h5v2h-5z"/>',
  'composeur-automatique': '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M9.5 8h1M12 8h1M14.5 8h1M9.5 11h1M12 11h1M14.5 11h1M9.5 14h1M12 14h1M14.5 14h1"/><rect class="ac" x="10" y="17" width="4" height="1.6" rx=".8"/>',
  'cle-usb': '<rect x="4" y="9" width="11" height="6" rx="1"/><path d="M15 10h5v4h-5"/><path class="ac" d="M16.5 11h1.2v.9h-1.2zM16.5 12.3h1.2v.9h-1.2z"/>',
  'serre-cables': '<rect x="3" y="11" width="6" height="5" rx="1"/><path d="M9 13.5h9a3 3 0 0 0 0-6H8"/><path d="M13 16.5l2-3 2 3"/><path class="ac" d="M4.5 12.5h3v2h-3z"/>',
  'sac-de-butin': '<rect x="3" y="9" width="18" height="10" rx="3"/><path d="M8 9V7.5a4 4 0 0 1 8 0V9"/><path d="M3 14h18"/><path class="ac" d="M10 11.5h4v5h-4z"/>',
  'pistolet-a-impulsion': '<path d="M4 9h9l4 2v3l-4 2H4z"/><path d="M6 16v4h3l1-4"/><path class="ac" d="M19 7.5l-2.6 4h2l-2 4 4.4-5.2h-2z"/>',
  /* cartes « Combat » sans capture officielle */
  passants: '<circle cx="8" cy="7" r="2.5"/><circle cx="16" cy="8" r="2"/><path d="M3.5 20v-4a4.5 4.5 0 0 1 9 0v4M13 20v-3.5a3 3 0 0 1 6 0V20"/><circle class="ac" cx="8" cy="7" r="1"/>',
  main: '<path d="M8 12V6a1.5 1.5 0 0 1 3 0v5M11 11V4.5a1.5 1.5 0 0 1 3 0V11M14 11V6a1.5 1.5 0 0 1 3 0v7"/><path d="M8 12l-2-2a1.6 1.6 0 0 0-2.3 2.2L8 17a6 6 0 0 0 9.5 1L20 13"/><circle class="ac" cx="12.5" cy="15.5" r="1.2"/>',
  eau: '<path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M6 10l9-6"/><path class="ac" d="M14 3.5l4-1-1 4z"/>',
  'drive-by': '<path d="M3 15l2-5h11l3 5v3H3z"/><circle cx="7" cy="18" r="1.8"/><circle cx="16" cy="18" r="1.8"/><path d="M13 10l2-4h4"/><path class="ac" d="M15.5 4.5h4v2h-4z"/>',
  personnalisation: '<path d="M20.5 7a4.5 4.5 0 0 1-6 4.2L7 18.7a2 2 0 0 1-2.8-2.8l7.5-7.5A4.5 4.5 0 0 1 17 2.5l-2.5 2.5 2 2 2.5-2.5c.3.8.5 1.6.5 2.5z"/><circle class="ac" cx="6" cy="18" r="1"/>',
  /* v7.41 (lot 4) : hubs du monde */
  film: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M3.5 8l2-4h13l2 4"/><path d="M7.5 4l2 4M12 4l2 4M16.5 4l2 4"/><path class="ac" d="M10 11.5v5l4.5-2.5z"/>',
  /* v7.46 (lot 9) : Contact et Mentions */
  enveloppe: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/><circle class="ac" cx="18" cy="16" r="1.4"/>',
  serveur: '<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/><circle class="ac" cx="8" cy="7" r="1.2"/><circle class="ac" cx="8" cy="17" r="1.2"/><path d="M12 7h5M12 17h5"/>',
  navigateur: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle class="ac" cx="6.5" cy="6.5" r=".9"/><circle cx="9.3" cy="6.5" r=".9"/><path d="M8 14h8M8 17h5"/>',
  balance: '<path d="M12 4v16M7 20h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0z"/><path class="ac" d="M19 7l-3 6a3 3 0 0 0 6 0z"/>',
  cookie: '<path d="M20 12.5A8 8 0 1 1 11.5 4a3 3 0 0 0 4 3.5 3 3 0 0 0 4.5 5z"/><circle class="ac" cx="9" cy="10" r="1.2"/><circle cx="14" cy="15" r="1.2"/><circle cx="8.5" cy="15.5" r="1"/>',
  accessibilite: '<circle class="ac" cx="12" cy="4.5" r="1.8"/><path d="M5 8.5l7 1.5 7-1.5M12 10v4.5M9 21l3-6.5 3 6.5"/>',
  droits: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/><path class="ac" d="M9 12l2 2 4-4.5"/>',
  copyright: '<circle cx="12" cy="12" r="8.5"/><path class="ac" d="M14.8 9.6a3.6 3.6 0 1 0 0 4.8"/>',
  envoi: '<path d="M21 3L10 14"/><path d="M21 3l-6.5 18-4.5-7-7-4.5z"/><circle class="ac" cx="10" cy="14" r="1.2"/>',
  loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/><circle cx="8.5" cy="9" r="1.6"/><circle cx="12.5" cy="9" r="1.6"/><path class="ac" d="M7.5 13.2c.8 1 1.9 1.5 3 1.5s2.2-.5 3-1.5v-1.4c-.8.7-1.9 1.1-3 1.1s-2.2-.4-3-1.1z"/>',
  sablier: '<path d="M6 3h12M6 21h12M7.5 3v3.5a4.5 4.5 0 0 0 2 3.7L12 12l2.5-1.8a4.5 4.5 0 0 0 2-3.7V3M7.5 21v-3.5a4.5 4.5 0 0 1 2-3.7L12 12l2.5 1.8a4.5 4.5 0 0 1 2 3.7V21"/><path class="ac" d="M9.5 19.5h5L12 15.5z"/>',
  /* v7.42 (lot 5) : catalogues (consommables, coiffures, tatouages, tenues et accessoires) */
  liste: '<path d="M8 6h12M8 12h12M8 18h12"/><circle class="ac" cx="4" cy="6" r="1.4"/><circle class="ac" cx="4" cy="12" r="1.4"/><circle class="ac" cx="4" cy="18" r="1.4"/>',
  boisson: '<path d="M7 3h10l-1 5.5a4 4 0 0 1-8 0z"/><path d="M12 12.5V20M8.5 20h7"/><path class="ac" d="M8.2 6h7.6l-.4 2.2H8.6z"/>',
  snack: '<rect x="3" y="8" width="18" height="8" rx="2"/><path d="M3 12h18"/><path class="ac" d="M7 10h2M11 10h2M15 10h2"/>',
  repas: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4.5"/><path d="M3 4.5v6M5 4.5v6M4 10.5V21M20 4.5c-1.5 1-2 3-2 5 0 1.5.7 2.5 2 3V21"/><circle class="ac" cx="12" cy="12" r="1.5"/>',
  coupe: '<circle cx="7" cy="7" r="2.6"/><circle cx="7" cy="17" r="2.6"/><path d="M9.2 8.5L20 16M9.2 15.5L20 8"/><circle class="ac" cx="13.5" cy="12" r="1.2"/>',
  barbe: '<path d="M6 8c0 6 2.5 10 6 10s6-4 6-10"/><path d="M6 8a6 6 0 0 1 12 0"/><path class="ac" d="M9 9.5h2M13 9.5h2"/><path d="M10 13.5c.6.6 1.2.9 2 .9s1.4-.3 2-.9"/>',
  couleur: '<path d="M12 3s-6 7-6 11.5a6 6 0 0 0 12 0C18 10 12 3 12 3z"/><path class="ac" d="M9.5 15a2.5 2.5 0 0 0 2.5 2.5"/>',
  maquillage: '<path d="M8 21V10l3-7 3 7v11z"/><path d="M8 14h6"/><path class="ac" d="M9 10h4l-2-4.5z"/><path d="M17 5l2 2-2 2-2-2z"/>',
  zone: '<circle cx="12" cy="5" r="2.5"/><path d="M8 21v-8.5a4 4 0 0 1 8 0V21"/><path d="M5 11l3 1M19 11l-3 1"/><circle class="ac" cx="12" cy="14" r="1.5"/>',
  motif: '<path d="M12 3l2.3 5.2 5.7.6-4.3 3.8 1.3 5.6L12 15.3 7 18.2l1.3-5.6L4 8.8l5.7-.6z"/><circle class="ac" cx="12" cy="11" r="1.4"/>',
  retrait: '<path d="M4 17l9-9 4 4-9 9H4z"/><path d="M11 10l4 4M4 21h16"/><path class="ac" d="M13 8l3-3 4 4-3 3z"/>',
  tenue: '<path d="M12 3a2 2 0 0 0 2 2 2 2 0 0 1-4 0"/><path d="M12 5 4 10v3l3-1v9h10v-9l3 1v-3z"/><path class="ac" d="M11 12h2v5h-2z"/>',
  haut: '<path d="M8 4l4 2 4-2 4 3-2 3-2-1v11H8V9L6 10 4 7z"/><path class="ac" d="M10.5 6.5L12 9l1.5-2.5"/>',
  bas: '<path d="M7 3h10l1 18h-5l-1-9-1 9H6z"/><path class="ac" d="M7 6h10"/>',
  chaussure: '<path d="M3 16c0-1 1-2 3-2h4l3-4h2l1 3c2 0 5 1 5 3v2H3z"/><path d="M3 18h18"/><path class="ac" d="M12 13l2 1M10 12l2 1"/>',
  lunettes: '<circle cx="7" cy="14" r="4"/><circle cx="17" cy="14" r="4"/><path d="M11 14h2M3 14l2-6h3M21 14l-2-6h-3"/><circle class="ac" cx="7" cy="14" r="1.3"/><circle class="ac" cx="17" cy="14" r="1.3"/>',
  chapeau: '<path d="M4 15h16M6 15v-2a6 6 0 0 1 12 0v2"/><path d="M2 15c2 2 5 3 10 3s8-1 10-3"/><path class="ac" d="M7 12h10"/>',
  bijou: '<path d="M7 4h10l4 5-9 12L3 9z"/><path d="M3 9h18M9 9l3 12 3-12M7 4l2 5M17 4l-2 5"/><circle class="ac" cx="12" cy="6.5" r="1"/>',
  masque: '<path d="M4 8c0-2 3.5-3 8-3s8 1 8 3v5c0 4-3.5 8-8 8s-8-4-8-8z"/><path d="M8 11h2.5M13.5 11H16"/><path class="ac" d="M9 15c1 1 2 1.5 3 1.5s2-.5 3-1.5"/>',
  etiquette: '<path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9-9-9z"/><path class="ac" d="M7 7h2v2H7z"/>',
  /* v7.43 (lot 6) : personnalisation des véhicules */
  kit: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M3 12h18M9 7V4.5h6V7"/><path class="ac" d="M10.5 15h3v3h-3z"/>',
  carrosserie: '<path d="M3 15l2-5.5A2 2 0 0 1 6.9 8h8.6l3.5 2.5H21v4.5H3z"/><circle cx="7" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/><path class="ac" d="M9 10.5h4"/>',
  jante: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/><circle class="ac" cx="12" cy="12" r="1.4"/>',
  peinture: '<path d="M4 6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M17 7h2.5v5H11v2"/><rect x="9.5" y="14" width="3" height="7" rx="1"/><path class="ac" d="M6.5 6.5h3"/>',
  vitre: '<path d="M4 17V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8z"/><path d="M4 17h16"/><path d="M8 7l-1 10M16 7l1 10"/><path class="ac" d="M9.5 10l6 0M9.5 13h6"/>',
  plaque: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 12h2M11 12h2M15 12h2"/><path class="ac" d="M5.5 9.5h2M16.5 9.5h2"/>',
  klaxon: '<path d="M4 10v4h4l6 4V6l-6 4z"/><path d="M17 9a4 4 0 0 1 0 6"/><path class="ac" d="M19.5 6.5a8 8 0 0 1 0 11"/>',
  phare: '<path d="M4 12a7 5 0 0 1 7-5h2v10h-2a7 5 0 0 1-7-5z"/><path d="M13 7c2 0 4 2.3 4 5s-2 5-4 5"/><path class="ac" d="M19 9l2-1M19 12h2.5M19 15l2 1"/>',
  neon: '<path d="M5 8h14"/><rect x="3" y="11" width="18" height="6" rx="3"/><path class="ac" d="M6 14h12"/><path d="M8 20l1-3M16 20l-1-3"/>',
  suspension: '<path d="M12 3v3M12 18v3M7 6h10M7 18h10"/><path d="M8 6l8 3-8 3 8 3-8 3"/><circle class="ac" cx="12" cy="12" r="1.2"/>',
  moteur: '<path d="M6 9h3V6h6v3h3v9H6z"/><path d="M3 12h3M18 12h3M9 18v2M15 18v2"/><path class="ac" d="M10 12h4v3h-4z"/>',
  frein: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2"/><path class="ac" d="M18.5 7.5a8.5 8.5 0 0 1 2 4.5"/>',
  transmission: '<circle cx="7" cy="6" r="2"/><circle cx="17" cy="6" r="2"/><circle cx="7" cy="18" r="2"/><path d="M7 8v8M7 12h10V8"/><circle class="ac" cx="17" cy="12" r="1.6"/>',
  turbo: '<circle cx="11" cy="13" r="6"/><circle cx="11" cy="13" r="2"/><path d="M17 13h4v-3h-2"/><path d="M11 7V4h3"/><path class="ac" d="M9.5 9.5a4 4 0 0 1 4.5 1"/>',
  blindage: '<path d="M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z"/><path d="M12 6.5v11"/><path class="ac" d="M8.5 10.5h7M9 13.5h6"/>',
  interieur: '<path d="M6 12V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6"/><path d="M4 12h16v4H4z"/><path d="M6 16v4M18 16v4"/><path class="ac" d="M9 8.5h6"/>',
  livree: '<path d="M4 7h16v10H4z"/><path d="M4 12h16"/><path class="ac" d="M6 9l3 6M11 9l3 6M16 9l2 4"/>',
  securite: '<rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7.5a4 4 0 0 1 8 0V10"/><circle class="ac" cx="12" cy="15" r="1.6"/><path d="M12 16.6V18"/>',
  /* v7.43 (lot 6) : personnalisation des armes */
  chargeur: '<path d="M8 3h8v12l-1.5 6h-5L8 15z"/><path d="M8 8h8M8 12h8"/><path class="ac" d="M10.5 5h3"/>',
  viseur: '<circle cx="12" cy="12" r="7"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/><circle cx="12" cy="12" r="2.5"/><circle class="ac" cx="12" cy="12" r=".9"/>',
  silencieux: '<rect x="3" y="9" width="12" height="6" rx="1.5"/><path d="M15 10.5h5v3h-5"/><path class="ac" d="M6 12h6"/>',
  poignee: '<path d="M6 4h9v5l-2 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10L6 9z"/><path class="ac" d="M9 12h3M9 15h3M9 18h3"/>',
  finition: '<path d="M12 3l1.8 5.2 5.2 1.8-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path class="ac" d="M18.5 16l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
  camouflage: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10c3-2 5 2 8 0s5-3 10-1M3 15c3-2 5 2 8 0s5-3 10-1"/><path class="ac" d="M7 6.5c1.5 0 2.5 1 4 1"/>',
  conversion: '<path d="M20.5 7a4.5 4.5 0 0 1-6 4.2L7 18.7a2 2 0 0 1-2.8-2.8l7.5-7.5A4.5 4.5 0 0 1 17 2.5l-2.5 2.5 2 2 2.5-2.5c.3.8.5 1.6.5 2.5z"/><path class="ac" d="M3 6h4M5 4v4"/>',
  casier: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M12 3v18M8 7h1.5M14.5 7H16"/><circle class="ac" cx="9.5" cy="13" r="1"/><circle class="ac" cx="14.5" cy="13" r="1"/>'
};
function icon(name, cls) {
  if (!ICONS[name]) throw Error('Icône inconnue : ' + name);
  return '<svg class="ed-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
}

/* ---------- section ---------- */
const TONES = { paper: 'ed--paper', paper2: 'ed--paper2', night: 'ed--night' };
/* opts : id, num, kicker, title, icon, lede (HTML déjà échappé/typographié), tone (paper|paper2|night), accent (amber|coral),
   cls (classes en plus), fam (marqueur de famille pour la sous-navigation). body : HTML de la composition. */
function section(opts, body) {
  if (!opts.id || !opts.title) throw Error('Section sans id ou sans titre');
  const tone = TONES[opts.tone || 'paper']; if (!tone) throw Error('Fond inconnu : ' + opts.tone);
  const accent = opts.accent === 'coral' ? ' ed--coral' : ' ed--amber';
  const cls = 'ed ' + tone + accent + (opts.cls ? ' ' + opts.cls : '') + (opts.reveal === false ? '' : ' reveal');
  return '<section class="' + cls + '" id="' + esc(opts.id) + '" aria-labelledby="' + esc(opts.id) + '-t"' + (opts.fam ? ' data-fam="' + esc(opts.fam) + '"' : '') + '>'
    + '<div class="shell ed-in"><div class="ed-head">'
    + '<div class="ed-mark">' + (opts.num ? '<span class="ed-num" aria-hidden="true">' + pad(opts.num) + '</span>' : '') + (opts.icon ? icon(opts.icon) : '') + '</div>'
    + '<div class="ed-titles">' + (opts.kicker ? '<p class="ed-kicker">' + esc(opts.kicker) + '</p>' : '')
    + '<h2 class="ed-title" id="' + esc(opts.id) + '-t">' + esc(opts.title) + '</h2>'
    + (opts.lede ? '<p class="ed-lede">' + opts.lede + '</p>' : '') + '</div></div>'
    + '<div class="ed-body">' + body + '</div></div></section>';
}

/* ---------- sous-navigation collante ---------- */
/* items : [{href, label, fam}] ; fam pose la couleur du marqueur (--ed-fam-<fam> dans style.css). */
function nav(items, label) {
  return '<nav class="ed-nav" aria-label="' + esc(label || 'Sections de la page') + '"><div class="shell ed-nav-in">'
    + items.map(x => '<a href="' + esc(x.href) + '"' + (x.fam ? ' data-fam="' + esc(x.fam) + '"' : '') + '><i class="ed-nav-dot" aria-hidden="true"></i>' + esc(x.label) + '</a>').join('')
    + '</div></nav>';
}

/* ---------- grands chiffres ---------- */
/* list : [{n, label}] ; la micro-barre montre la part de chaque chiffre par rapport au premier (le total). */
function figures(list) {
  const total = list[0] && list[0].n > 0 ? list[0].n : 1;
  return '<div class="ed-figs">' + list.map(f => {
    const p = Math.max(0, Math.min(100, Math.round(100 * f.n / total)));
    return '<div class="fig' + (f.n === 0 ? ' fig--zero' : '') + '"><b class="fig-n" data-count="' + f.n + '">' + f.n + '</b><span class="fig-l">' + esc(f.label) + '</span><span class="fig-bar" aria-hidden="true"><i style="width:' + p + '%"></i></span></div>';
  }).join('') + '</div>';
}

/* ---------- mur de marques ---------- */
const MONO = ['amber', 'coral', 'night', 'ink'];
function initials(name) {
  const words = name.split(/[\s&-]+/).filter(Boolean);
  return (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
}
const fold = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/* brands : [{name, evoque, n, href}] déjà triés. */
function brandWall(brands, opts = {}) {
  const letters = [...new Set(brands.map(b => fold(b.name)[0].toUpperCase()))].sort();
  const bar = '<div class="ed-brandbar" data-brandbar><label class="ed-brandsearch"><span class="sr-only">Chercher une marque</span>'
    + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>'
    + '<input type="search" placeholder="' + esc(opts.placeholder || 'Chercher une marque ou un constructeur évoqué') + '" autocomplete="off" data-brand-q></label>'
    + '<div class="ed-letters" role="group" aria-label="Filtrer par lettre"><button type="button" class="is-on" data-letter="">Toutes</button>'
    + letters.map(l => '<button type="button" data-letter="' + l + '">' + l + '</button>').join('') + '</div>'
    + '<p class="ed-brandcount" role="status" aria-live="polite" data-brand-count></p></div>';
  const tiles = brands.map((b, i) => {
    const tag = b.href ? 'a' : 'div';
    return '<' + tag + ' class="ed-brand"' + (b.href ? ' href="' + esc(b.href) + '"' : '') + ' data-letter="' + fold(b.name)[0].toUpperCase() + '" data-n="' + esc(fold(b.name + ' ' + (b.evoque || ''))) + '">'
      + '<span class="ed-brand-mono ed-brand-mono--' + MONO[i % MONO.length] + '" aria-hidden="true">' + esc(initials(b.name)) + '</span>'
      + '<span class="ed-brand-body"><b>' + esc(b.name) + '</b>' + (b.evoque ? '<span class="ed-brand-ev">' + esc(b.evoque) + '</span>' : '<span class="ed-brand-ev brand-ev--none">' + esc(opts.none || 'constructeur fictif, pas de rapprochement retenu') + '</span>')
      + (typeof b.n === 'number' ? '<span class="ed-brand-n">' + b.n + ' ' + (b.n > 1 ? 'véhicules' : 'véhicule') + (b.href ? ' <i aria-hidden="true">→</i>' : '') + '</span>' : '') + '</span></' + tag + '>';
  }).join('');
  return bar + '<div class="ed-brands" data-brands>' + tiles + '</div><p class="ed-brandempty" data-brand-empty hidden>Aucune marque ne correspond.</p>';
}

/* ---------- cartes d'équipement (suivi du lot 1) ---------- */
/* items : [{id, nom, usage, icon}] ; family : nom de famille data-track. */
function kits(items, family) {
  return '<div class="ed-kits">' + items.map(x => '<div class="ed-kit" data-track="' + esc(family) + '" data-track-id="' + esc(x.id) + '">'
    + '<span class="ed-kit-ico">' + icon(x.icon || x.id) + '</span><b>' + esc(x.nom) + '</b><span>' + esc(x.usage) + '</span></div>').join('') + '</div>';
}
/* ---------- bandeau de munitions ---------- */
/* items : [{id, nom, usage, dot}] ; dot : amber | coral | paper | amber2 | wine. */
function ammo(items, family) {
  return '<div class="ed-ammo">' + items.map(x => '<div class="ed-ammo-item" data-track="' + esc(family) + '" data-track-id="' + esc(x.id) + '" data-dot="' + esc(x.dot || 'amber') + '">'
    + '<i class="ed-dot" aria-hidden="true"></i><b>' + esc(x.nom) + '</b><span>' + esc(x.usage) + '</span></div>').join('') + '</div>';
}

/* ---------- cartes numérotées (Combat) ---------- */
let mediasCache = null;
function medias() { if (!mediasCache) mediasCache = JSON.parse(fs.readFileSync(path.join(root, 'outils/medias-officiels.json'), 'utf8')); return mediasCache; }
/* figure d'un visuel officiel (480 px, srcset 1280) ; alt : texte fourni, sinon celui du catalogue. */
function mediaFigure(id, alt, opts = {}) {
  const m = medias()[id]; if (!m) throw Error('Visuel officiel inconnu : ' + id);
  const small = m.variants.find(v => v.w === 480) || m.variants[0], big = m.variants.find(v => v.w === 1280);
  const text = alt || m.alt; if (!text) throw Error('Texte alternatif manquant pour le visuel ' + id);
  for (const v of [small, big]) if (v && !fs.existsSync(path.join(root, v.src.replace(/^\//, '')))) throw Error('Fichier absent : ' + v.src);
  const prefix = opts.prefix || '';
  return '<figure class="ed-media"><img src="' + prefix + small.src.replace(/^\//, '') + '"' + (big ? ' srcset="' + prefix + small.src.replace(/^\//, '') + ' 480w, ' + prefix + big.src.replace(/^\//, '') + ' 1280w" sizes="' + esc(opts.sizes || '(max-width:719px) 94vw, (max-width:1119px) 46vw, 456px') + '"' : '')
    + ' width="' + small.w + '" height="' + small.h + '" alt="' + esc(text) + '" loading="lazy" decoding="async"><figcaption>' + esc(opts.caption || 'Visuel officiel Rockstar Games') + '</figcaption></figure>';
}
/* items : [{titre, texte, media, alt, icon}]
   v7.55 (lot 2, VIS-01) : champs facultatifs statut (officiel | vu | comm | conf → pastille et libellé), legende (légende du
   visuel), limite (ce qui reste à confirmer) et source {label, url, publishedAt, consultedAt}. Quand tous les éléments ont un
   statut, la grille reçoit la classe ed-steps--sourced (cartes homogènes, source calée en bas). */
function steps(items, opts = {}) {
  const sourced = items.length > 0 && items.every(x => x.statut);
  return '<div class="ed-steps' + (sourced ? ' ed-steps--sourced' : '') + '">' + items.map((x, i) => '<article class="ed-step' + (x.media ? ' ed-step--media' : '') + (x.statut ? ' ed-step--' + esc(STATUS_LABEL[x.statut] ? x.statut : 'conf') : '') + '">'
    + '<span class="ed-step-n" aria-hidden="true">' + pad(i + 1) + '</span>'
    + (x.media ? mediaFigure(x.media, x.alt, { prefix: opts.prefix, caption: x.legende }) : '<span class="ed-step-ico">' + icon(x.icon) + '</span>')
    + (x.statut ? pip(x.statut, true) : '')
    + '<h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p>'
    + (x.limite ? '<p class="ed-step-limit"><strong>Limite.</strong> ' + esc(x.limite) + '</p>' : '')
    + (x.source ? '<p class="ed-step-src"><span class="ed-step-src-k">Source</span> <a href="' + esc(x.source.url) + '" target="_blank" rel="noopener nofollow">' + esc(x.source.label) + '</a>'
      + (x.source.consultedAt ? '<span class="ed-src-meta">consulté le ' + esc(frDate(x.source.consultedAt)) + '</span>' : '') + '</p>' : '')
    + '</article>').join('') + '</div>';
}

/* ---------- cartes-lieux ---------- */
/* groups : [{title, items:[{id, name, where}]}] ; un seul groupe sans titre = grille simple. */
function places(groups, opts = {}) {
  const prefix = opts.prefix || '';
  const card = p => '<a class="ed-place" href="' + prefix + 'carte.html#lieu=' + esc(p.id) + '">' + carte.vignette(p.id)
    + '<span class="ed-place-body"><b>' + esc(p.name) + '</b>' + (p.where ? '<span class="ed-place-where">' + esc(p.where) + '</span>' : '')
    + '<span class="veh-go">Voir sur la carte</span></span></a>';
  return groups.map(g => (g.title ? '<h3 class="ed-h3">' + esc(g.title) + '</h3>' : '') + '<div class="ed-places">' + g.items.map(card).join('') + '</div>').join('');
}

/* ---------- blocs de texte ---------- */
/* Colonnes de texte : cards : [{titre, liste:[…], p:[…], icon}] */
function columns(cards) {
  return '<div class="ed-cols' + (cards.length === 4 || cards.length === 5 ? ' ed-cols--' + cards.length : '') + '">' + cards.map(c => '<div class="ed-col">' + (c.icon ? '<span class="ed-col-ico">' + icon(c.icon) + '</span>' : '') + '<h3>' + esc(c.titre) + '</h3>'
    + (c.liste && c.liste.length ? '<ul>' + c.liste.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>' : '')
    + (c.p || []).map(p => '<p>' + esc(p) + '</p>').join('') + '</div>').join('') + '</div>';
}

/* ---------- v7.41 (lot 4) : compositions des hubs du monde ---------- */
/* v7.42 : « serie » = repère de la série (ce que GTA V, GTA Online, GTA IV ou San Andreas font, présenté comme tel). */
const STATUS_LABEL = { officiel: 'Officiel', vu: 'Vu dans un média', comm: 'Identification communautaire', serie: 'Repère de la série', conf: 'À confirmer' };
/* v7.56 (lot 3, UI-02) : la pastille avec libellé porte aussi la classe ed-status--<statut>, pour que les pages de section
   (Consommables, Vêtements et style, Personnalisation) la dessinent en badge coloré ; ailleurs, rien ne change. */
function pip(statut, withLabel) {
  const s = STATUS_LABEL[statut] ? statut : 'conf';
  const dot = '<span class="pip pip--' + s + '" aria-hidden="true"></span>';
  return withLabel ? '<span class="ed-status ed-status--' + s + '">' + dot + '<i class="ed-st">' + esc(STATUS_LABEL[s]) + '</i></span>' : dot;
}
/* Frise datée : items : [{date, titre, statut, texte, media, alt}] ; le visuel vient de outils/medias-officiels.json. */
function timeline(items, opts = {}) {
  return '<ol class="ed-tl">' + items.map(x => '<li class="ed-tl-item' + (x.media ? ' ed-tl-item--media' : '') + '">'
    + '<div class="ed-tl-when"><time>' + esc(x.date) + '</time>' + pip(x.statut, true) + '</div>'
    + '<div class="ed-tl-body"><h3>' + esc(x.titre) + '</h3><p>' + esc(x.texte) + '</p></div>'
    + (x.media ? mediaFigure(x.media, x.alt, { prefix: opts.prefix, sizes: '(max-width:700px) 100vw, 320px' }) : '') + '</li>').join('') + '</ol>';
}
/* Paires fiction ↔ réel : items : [{fiction, reel, src}] ; src renvoie à l'entrée #src-<id> du bloc Sources de la page. */
function pairs(items, sources = {}) {
  return '<div class="ed-pairs">' + items.map(x => {
    const s = x.src && sources[x.src];
    return '<div class="ed-pair"><span class="ed-pair-f">' + esc(x.fiction) + '</span><span class="ed-pair-arrow" aria-hidden="true">→</span>'
      + '<span class="ed-pair-r">' + esc(x.reel) + (s ? ' <a class="ed-pair-src" href="#src-' + esc(x.src) + '" aria-label="Source : ' + esc(s.title) + '">source</a>' : '') + '</span></div>';
  }).join('') + '</div>';
}
/* Questions ouvertes : items : [{q, etat}] */
function pending(items) {
  return '<div class="ed-open">' + items.map(x => '<div class="ed-open-item"><span class="ed-open-q" aria-hidden="true">?</span><h3>' + esc(x.q) + '</h3><p>' + esc(x.etat) + '</p></div>').join('') + '</div>';
}
/* Cartes d'action : items : [{k, t, d, href}] */
function actions(items) {
  return '<div class="ed-acts">' + items.map(x => '<a class="ed-act" href="' + esc(x.href) + '"><span class="ed-act-k">' + esc(x.k) + '</span><span class="ed-act-t">' + esc(x.t) + '</span><span class="ed-act-d">' + esc(x.d) + '</span><span class="veh-go">Ouvrir</span></a>').join('') + '</div>';
}
/* Sources : entries : [{id, url, title, publishedAt, consultedAt, statut, claim}] */
const frDate = iso => iso ? iso.split('-').reverse().join('/') : null;
function sourceList(entries) {
  return '<ol class="ed-srcs">' + entries.map(s => '<li id="src-' + esc(s.id) + '">' + pip(s.statut, true)
    + '<a class="ed-src-link" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow">' + esc(s.title) + '</a>'
    + '<span class="ed-src-meta">' + (s.publishedAt ? 'publié le ' + esc(frDate(s.publishedAt)) + ' · ' : '') + 'consulté le ' + esc(frDate(s.consultedAt)) + '</span>'
    + (s.claim ? '<p>' + esc(s.claim) + '</p>' : '') + '</li>').join('') + '</ol>';
}

module.exports = { esc, icon, ICONS, section, nav, figures, brandWall, kits, ammo, steps, mediaFigure, places, columns, defs: carte.defs, initials, fold, timeline, pairs, pending, actions, sourceList, pip, STATUS_LABEL };
