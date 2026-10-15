'use strict';
/* v7.89 (lot 5) : Leonidakit installable comme une appli.
   - manifeste(code, tr) : le manifeste web d'une langue publiée (manifest.webmanifest à la racine pour le français,
     <dossier>/manifest.webmanifest pour les autres ; écrit par outils/langues.cjs pendant la génération de la langue, tr
     traduit un texte français avec la mémoire de traduction) ; ecrireManifesteFr(root) écrit celui du français ;
   - tete(html) : pose dans le <head> d'une page française le lien du manifeste et l'icône d'écran d'accueil d'Apple
     (outils/sync-site.cjs, toutes les pages) ; outils/langues.cjs remplace l'adresse du manifeste par celle de la langue ;
   - calculer(root) / tamponner(root) : VERSION (empreinte de la coquille), LANGUES et PACK que doit porter sw.js ; tamponner
     les écrit (outils/sync-site.cjs, en dernier, après les langues) ;
   - ICONES : les icônes de l'appli (img/app/, dessinées d'après le favicon du site : carré encre, soleil ambre, trois bandes ;
     rendues en PNG par outils/gen-icones-appli.cjs dans Chromium). */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');

/* textes français du manifeste (traduits par la mémoire, outils/langues/<code>/v789.json) */
const TEXTES = {
  description: 'La carte, tes carnets, le calculateur et Léo pour GTA VI, à garder ouverts à côté de ta console, même sans réseau.',
  raccourcis: [
    { name: 'Carte', url: 'carte.html', icone: 'carte' },
    { name: 'Calculateur', url: 'calculateurs.html', icone: 'calculateur' },
    { name: 'Progression', url: 'progression.html', icone: 'progression' },
    { name: 'Mode compagnon', url: 'compagnon.html', icone: 'compagnon' }
  ]
};
const COULEURS = { fond: '#FDFBF7', theme: '#FDFBF7' }; /* même valeur que la méta theme-color des pages */
const ICONES = [
  { src: '/img/app/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any', w: 192 },
  { src: '/img/app/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any', w: 512 },
  { src: '/img/app/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable', w: 512 }
];
const APPLE = { src: '/img/app/apple-touch-icon-180.png', w: 180 };
/* pages préparées pour jouer sans réseau (sw.js → PACK), relatives au dossier de la langue : l'accueil, la page compagnon et
   la page hors connexion, puis les quatre outils du joueur (carte, calculateur, progression et ses carnets) ; Léo est préparé
   à part par le service worker (ses fichiers, lus dans common.js et leo-loader.js) */
function pack(root = ROOT) {
  const carnets = fs.existsSync(path.join(root, 'carnets')) ? fs.readdirSync(path.join(root, 'carnets')).filter(f => f.endsWith('.html')).sort().map(f => 'carnets/' + f) : [];
  return ['', 'compagnon.html', 'hors-ligne.html', 'carte.html', 'calculateurs.html', 'progression.html', ...carnets];
}
function config(root = ROOT) { return JSON.parse(fs.readFileSync(path.join(root, 'outils/langues.json'), 'utf8')); }
function publiees(root = ROOT) { return config(root).langues.filter(l => l.etat === 'publiee'); }

function manifeste(code, tr = t => t, root = ROOT) {
  const l = config(root).langues.find(x => x.code === code); if (!l) throw new Error('Langue inconnue : ' + code);
  const base = l.dossier ? '/' + l.dossier + '/' : '/';
  const m = {
    id: base, name: 'Leonidakit', short_name: 'Leonidakit', description: tr(TEXTES.description),
    lang: l.locale || code, dir: 'ltr',
    start_url: base, scope: base, display: 'standalone',
    background_color: COULEURS.fond, theme_color: COULEURS.theme,
    categories: ['games', 'entertainment', 'utilities'],
    icons: ICONES.map(({ src, sizes, type, purpose }) => ({ src, sizes, type, purpose })),
    shortcuts: TEXTES.raccourcis.map(r => ({ name: tr(r.name), short_name: tr(r.name), url: base + r.url, icons: [{ src: '/img/app/raccourci-' + r.icone + '-96.png', sizes: '96x96', type: 'image/png' }] })),
    launch_handler: { client_mode: ['navigate-existing', 'auto'] },
    prefer_related_applications: false
  };
  return JSON.stringify(m, null, 1) + '\n';
}
function ecrireManifesteFr(root = ROOT) {
  const f = path.join(root, 'manifest.webmanifest'), s = manifeste('fr', t => t, root);
  if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== s) fs.writeFileSync(f, s);
}

/* <head> d'une page française : lien du manifeste et icône d'écran d'accueil (iPhone, iPad), juste après l'icône du site */
const LIGNES = '<link rel="manifest" href="/manifest.webmanifest">\n<link rel="apple-touch-icon" href="' + APPLE.src + '">';
function tete(html) {
  html = html.replace(/\n?<link rel="manifest" href="[^"]*">/g, '').replace(/\n?<link rel="apple-touch-icon" href="[^"]*">/g, '');
  if (/<link rel="icon"[^>]*>/.test(html)) return html.replace(/(<link rel="icon"[^>]*>)/, '$1\n' + LIGNES);
  return html.replace('</head>', LIGNES + '\n</head>');
}
/* page traduite : le manifeste de sa langue */
const manifesteDe = (html, dossier) => dossier ? html.replace(/(<link rel="manifest" href=")\/manifest\.webmanifest(")/, '$1/' + dossier + '/manifest.webmanifest$2') : html;

/* ---------- service worker ---------- */
/* Coquille : sw.js (sans ses lignes tamponnées), les manifestes, la page hors connexion de chaque langue et les fichiers
   qu'elle charge. Une nouvelle empreinte = un nouveau service worker, qui purge les anciens caches. Une page de contenu qui
   change ne change pas l'empreinte : les copies gardées restent (les pages passent par le réseau d'abord). */
function coquille(root = ROOT) {
  const langues = publiees(root), files = new Set(['sw.js']);
  for (const l of langues) {
    const d = l.dossier ? l.dossier + '/' : '';
    files.add(d + 'manifest.webmanifest');
    const page = d + 'hors-ligne.html'; if (!fs.existsSync(path.join(root, page))) continue;
    files.add(page);
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    for (const m of html.matchAll(/<(?:script|link)\b[^>]*\s(?:src|href)="([^"?#]+)(?:\?[^"]*)?"/g)) {
      const u = m[1]; if (/^(?:[a-z]+:|\/\/)/.test(u) || !/\.(?:css|js)$/.test(u)) continue;
      const rel = u.startsWith('/') ? u.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(page), u));
      if (fs.existsSync(path.join(root, rel))) files.add(rel);
    }
  }
  return [...files].filter(f => fs.existsSync(path.join(root, f))).sort();
}
const TAMPON = /^const (VERSION|LANGUES|PACK) = .*? \/\* outils\/appli\.cjs \*\/$/gm;
/* calculer(root) : ce que sw.js doit porter (sans rien écrire ; les tests comparent) ; tamponner(root) : l'écrit dans sw.js */
function calculer(root = ROOT) {
  const f = path.join(root, 'sw.js'); if (!fs.existsSync(f)) return null;
  const langues = publiees(root).filter(l => l.dossier).map(l => l.dossier), liste = pack(root);
  const cur = fs.readFileSync(f, 'utf8');
  const neutre = s => s.replace(TAMPON, 'const $1 = … /* outils/appli.cjs */');
  const h = crypto.createHash('sha256');
  for (const x of coquille(root)) h.update(x + '\n' + (x === 'sw.js' ? neutre(cur) : fs.readFileSync(path.join(root, x), 'utf8')) + '\n');
  h.update(JSON.stringify(langues) + JSON.stringify(liste));
  const version = h.digest('hex').slice(0, 12);
  const texte = cur.replace(TAMPON, (m, k) => 'const ' + k + ' = ' + (k === 'VERSION' ? "'" + version + "'" : JSON.stringify(k === 'LANGUES' ? langues : liste).replace(/","/g, '", "')) + '; /* outils/appli.cjs */');
  return { version, langues, pack: liste, texte, actuel: cur };
}
function tamponner(root = ROOT) {
  const r = calculer(root); if (!r) return null;
  if (r.texte !== r.actuel) fs.writeFileSync(path.join(root, 'sw.js'), r.texte);
  return { version: r.version, langues: r.langues, pack: r.pack };
}

module.exports = { TEXTES, COULEURS, ICONES, APPLE, LIGNES, pack, manifeste, ecrireManifesteFr, tete, manifesteDe, coquille, calculer, tamponner, publiees };
