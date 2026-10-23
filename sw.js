/* Leonidakit — service worker (v7.89, lot 5 : appli installable, mode compagnon).
   Même origine, portée « / », enregistré par common.js (https ou localhost seulement). Il garde sur l'appareil des copies des
   pages et des fichiers du site, pour que le site s'ouvre vite et marche sans réseau pour ce qui a déjà été vu, ou préparé
   depuis la page Mode compagnon. Il ne fait que des requêtes GET vers le site lui-même : jamais /api/…, jamais /_vercel/…,
   jamais une requête qui n'est pas un GET, jamais une autre origine (lecteurs YouTube et Spotify, par exemple). Rien n'est
   envoyé nulle part ; aucune donnée personnelle n'entre dans ces copies (les cases cochées restent dans le stockage du site).
   Stratégies :
   - pages (navigation) : réseau d'abord, avec un délai court : si le réseau tarde et qu'une copie existe, la copie répond et le
     réseau la met à jour en arrière-plan ; sans réseau : la copie, sinon la page « hors connexion » de la langue ;
   - fichiers versionnés (?v=… : feuilles de style, scripts) et polices : cache d'abord (une nouvelle version = une autre adresse) ;
   - images, données JSON et autres fichiers : la copie tout de suite, puis mise à jour en arrière-plan (stale-while-revalidate,
     au plus une fois par heure pour une même adresse), avec un plafond d'entrées : les plus anciennes sont retirées.
   Pour ne pas ralentir la page : là où le navigateur connaît les routes fixes (Chrome, Edge…), feuilles de style, scripts
   versionnés et polices sont lus dans les caches sans réveiller ce script ; les copies (page vue, ses fichiers, mises à jour)
   sont écrites quand la page s'est calmée, et les fichiers d'une page vue sont recopiés du cache du navigateur, sans réseau.
   VERSION (empreinte de la coquille), LANGUES (dossiers des langues publiées) et PACK (pages préparées pour jouer sans réseau)
   sont réécrits par outils/sync-site.cjs (outils/appli.cjs) : une coquille modifiée donne un nouveau service worker, dont les
   caches portent la nouvelle version ; à son activation, il reprend des anciens caches les copies encore utiles (pages vues,
   fichiers versionnés, images, données : même adresse, même contenu ; plafonds appliqués), puis les supprime. Une préparation
   « sans réseau » faite avec une version précédente reste en service et est refaite à la prochaine page ouverte avec du
   réseau (sauf en mode « économie de données ») : seuls les pages et les fichiers qui ont changé sont téléchargés, puis
   l'ancienne préparation est supprimée. */
'use strict';
const VERSION = '2755059396bf'; /* outils/appli.cjs */
const LANGUES = ["en", "es", "it", "de", "pt"]; /* outils/appli.cjs */
const PACK = ["", "compagnon.html", "hors-ligne.html", "carte.html", "calculateurs.html", "progression.html", "carnets/arsenal.html", "carnets/calculs.html", "carnets/collectibles.html", "carnets/consommables.html", "carnets/garage.html", "carnets/garde-robe.html", "carnets/lieux.html", "carnets/personnalisations.html", "carnets/proprietes.html"]; /* outils/appli.cjs */

const PREFIXE = 'lk-' + VERSION + '-';
const GENRES = ['coquille', 'fichiers', 'pages', 'images', 'donnees', 'pack'];
const CACHE = Object.fromEntries(GENRES.map(g => [g, PREFIXE + g]));
const REGLAGES = 'lk-reglages', REGLAGES_CLE = '/__lk/reglages.json';
const PLAFOND = { fichiers: 300, pages: 60, images: 150, donnees: 60 };
const DELAI = 3000;
const ORIGINE = self.location.origin;
const DU_SITE = /^lk-[a-z0-9]+-[a-z]+$/;
/* écritures en différé : rangées une à une dès que la page s'est calmée (CALME ms sans requête), au plus tard ATTENTE ms après
   (self.LK_CALME : réglage des tests, outils/tests/v789.test.cjs) ; images et données : une copie de moins d'une heure n'est
   pas redemandée */
const CALME = typeof self.LK_CALME === 'number' ? self.LK_CALME : 500, ATTENTE = 5000, FRAICHE = 3600 * 1000;

/* ---------- petites briques ---------- */
const langueDe = chemin => { const m = /^\/([a-z]{2})\//.exec(chemin); return m && LANGUES.includes(m[1]) ? m[1] : 'fr'; };
const racine = lg => lg && lg !== 'fr' ? '/' + lg + '/' : '/';
/* clé d'une page : adresse sans paramètres ni ancre ; « …/index.html » et « …/ » sont la même page */
function clePage(adresse) { const u = new URL(adresse, ORIGINE); let p = u.pathname; if (p.endsWith('/index.html')) p = p.slice(0, -10); return ORIGINE + p; }
const bonne = r => !!r && r.ok && (r.type === 'basic' || r.type === 'default');
const estHtml = r => /text\/html/i.test(r.headers.get('content-type') || '');
const exclue = chemin => /^\/(?:api|_vercel)\//.test(chemin) || chemin === '/sw.js';
/* fichier dont l'adresse change avec le contenu (empreinte ?v=) ou qui ne change pas (police) : une copie vaut l'original */
const immuable = adresse => { const u = new URL(adresse, ORIGINE); return u.pathname.startsWith('/fonts/') || (/\.(?:css|js|mjs|json)$/.test(u.pathname) && /(?:^|&)v=/.test(u.search.slice(1))); };
/* un fichier immuable déjà gardé sur l'appareil est relu sans réseau ; sinon, le réseau */
const obtenir = async (f, init) => (immuable(f) && await caches.match(f, { ignoreVary: true })) || fetch(f, Object.assign({ credentials: 'same-origin' }, init));
const economie = () => { try { return !!(self.navigator.connection && self.navigator.connection.saveData); } catch (e) { return false; } };

async function elaguer(c, plafond) { if (!plafond) return; const cles = await c.keys(); if (cles.length > plafond) await Promise.all(cles.slice(0, cles.length - plafond).map(k => c.delete(k))); }
/* file des écritures : une tâche à la fois, quand la page s'est calmée ; chaque cache rempli est élagué une fois la file vide */
let file = Promise.resolve(), enFile = 0, dernier = 0;
const aElaguer = new Map();
const pause = ms => new Promise(r => setTimeout(r, ms));
function plusTard(tache) {
  enFile++;
  const t = file.then(async () => {
    const debut = Date.now();
    while (Date.now() - dernier < CALME && Date.now() - debut < ATTENTE) await pause(Math.max(20, CALME - (Date.now() - dernier)));
    await tache();
  }).catch(() => {}).then(async () => {
    if (--enFile === 0 && aElaguer.size) { const l = [...aElaguer]; aElaguer.clear(); for (const [nom, plafond] of l) await elaguer(await caches.open(nom), plafond).catch(() => {}); }
  });
  file = t; return t;
}
async function ranger(nom, cle, reponse, plafond) { const c = await caches.open(nom); await c.put(cle, reponse); if (plafond) aElaguer.set(nom, plafond); }
async function reglages() { try { const r = await caches.match(REGLAGES_CLE, { cacheName: REGLAGES }); return r ? await r.json() : {}; } catch (e) { return {}; } }
async function ecrireReglages(valeur) { const c = await caches.open(REGLAGES); await c.put(REGLAGES_CLE, new Response(JSON.stringify(valeur), { headers: { 'Content-Type': 'application/json' } })); }
/* préparations d'une version précédente, gardées en service jusqu'à la nouvelle */
async function anciennesPreparations() { return (await caches.keys()).filter(n => DU_SITE.test(n) && n.endsWith('-pack') && n !== CACHE.pack); }

/* fichiers d'une page : feuilles de style, scripts (y compris ceux chargés à la demande, type « lk/lazy », sauf pour la
   coquille), police préchargée, manifeste et icône ; même origine seulement */
function ressources(html, base, paresseux = true) {
  const out = new Set();
  const ajouter = brut => { try { const u = new URL(String(brut).replace(/&amp;/g, '&'), base); if (u.origin === ORIGINE && !exclue(u.pathname)) out.add(u.pathname + u.search); } catch (e) { /* adresse illisible : ignorée */ } };
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const t = m[0], rel = (/\brel="([^"]*)"/i.exec(t) || [])[1] || '', href = (/\bhref="([^"]*)"/i.exec(t) || [])[1];
    if (!href) continue;
    if (/\bstylesheet\b/i.test(rel) || /\b(?:manifest|apple-touch-icon)\b/i.test(rel) || (/\bpreload\b/i.test(rel) && /\bas="(?:font|style|script)"/i.test(t))) ajouter(href);
  }
  for (const m of html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi)) if (paresseux || !/\btype="lk\/lazy"/i.test(m[0])) ajouter(m[1]);
  return [...out];
}
/* polices citées par une feuille de style (url(/fonts/…)) */
function polices(css, base) {
  const out = [];
  for (const m of css.matchAll(/url\(\s*['"]?([^'")]+\.woff2)['"]?\s*\)/g)) { try { const u = new URL(m[1], base); if (u.origin === ORIGINE) out.push(u.pathname + u.search); } catch (e) { /* ignorée */ } }
  return out;
}

/* ---------- la coquille : page « hors connexion » d'une langue et ses fichiers ---------- */
async function coquille(lg) {
  const adresse = racine(lg) + 'hors-ligne.html', c = await caches.open(CACHE.coquille);
  const page = await fetch(adresse, { cache: 'no-cache', credentials: 'same-origin' });
  if (!bonne(page)) throw new Error('page hors connexion indisponible (' + page.status + ')');
  const html = await page.clone().text();
  /* sans les scripts chargés à la demande (recherche du site…) : la coquille reste légère */
  const liste = ressources(html, new URL(adresse, ORIGINE), false);
  const reponses = await Promise.all(liste.map(f => fetch(f, { credentials: 'same-origin' }).then(r => [f, r])));
  for (const [f, r] of reponses) if (bonne(r)) {
    if (/\.css(?:\?|$)/.test(f)) for (const p of polices(await r.clone().text(), new URL(f, ORIGINE))) { const rp = await fetch(p).catch(() => null); if (bonne(rp)) await c.put(p, rp); }
    await c.put(f, r);
  }
  await c.put(clePage(adresse), page);
}
const coquillePrete = lg => caches.match(clePage(racine(lg) + 'hors-ligne.html'), { cacheName: CACHE.coquille, ignoreVary: true }).then(Boolean, () => false);

/* ---------- préparer pour jouer sans réseau : pages clés de la langue, leurs fichiers et Léo ---------- */
/* Léo : version et modules lus dans common.js et leo-loader.js de la langue (les mêmes adresses que celles que demande la page) */
async function fichiersDeLeo(liste) {
  const commun = liste.find(f => /\/common\.js(?:\?|$)/.test(f)); if (!commun) return [];
  const texte = await (await obtenir(commun)).text();
  const css = (/css\.href='([^']+leo\.css\?v=[\w-]+)'/.exec(texte) || [])[1], v = (/'leo-loader\.js\?v=([\w-]+)'/.exec(texte) || [])[1];
  if (!v) return [];
  const dossier = commun.replace(/[^/]*$/, ''), V = '?v=' + v, out = [dossier + 'leo-loader.js' + V];
  if (css) out.push(css);
  const chargeur = await obtenir(dossier + 'leo-loader.js' + V);
  if (!bonne(chargeur)) return out;
  for (const m of (await chargeur.text()).matchAll(/script\('([\w.-]+\.js)','\w+'(,true)?\)/g)) {
    let adresse = (m[2] || dossier === '/' ? '/' : dossier) + m[1] + V;
    if (!m[2] && dossier !== '/') { const essai = (await caches.match(adresse, { ignoreVary: true })) || await fetch(adresse, { method: 'HEAD', credentials: 'same-origin' }).catch(() => null); if (!essai || !essai.ok) adresse = '/' + m[1] + V; }
    out.push(adresse);
  }
  const index = await obtenir(dossier + 'leo-index.json' + V);
  if (bonne(index)) { out.push(dossier + 'leo-index.json' + V); try { for (const s of Object.values((await index.json()).shards || {})) if (s && s.file) out.push(s.file + V); } catch (e) { /* index illisible : Léo restera à moitié prêt */ } }
  return out;
}
let preparation = null;
async function preparer(lg, dire) {
  dire = dire || (() => {});
  const c = await caches.open(CACHE.pack), base = racine(lg), pages = PACK.map(p => base + p);
  const fichiers = new Set(); let fait = 0, octets = 0, reprises = 0, total = pages.length;
  dire({ type: 'pr-etape', etape: 'pages', fait, total });
  for (const p of pages) {
    const r = await fetch(p, { cache: 'no-cache', credentials: 'same-origin' });
    if (!bonne(r)) throw new Error(p + ' : ' + r.status);
    const html = await r.clone().text(); octets += html.length;
    for (const f of ressources(html, new URL(p, ORIGINE))) fichiers.add(f);
    await c.put(clePage(p), r);
    dire({ type: 'pr-progres', fait: ++fait, total });
  }
  for (const f of await fichiersDeLeo([...fichiers]).catch(() => [])) fichiers.add(f);
  const liste = [...fichiers]; total = pages.length + liste.length;
  dire({ type: 'pr-etape', etape: 'fichiers', fait, total });
  let echecs = 0;
  /* un fichier immuable déjà gardé sur l'appareil (cette préparation, une précédente, un fichier vu) est recopié sans réseau */
  const garder = async (f, r) => { const corps = await r.clone().arrayBuffer(); octets += corps.byteLength; await c.put(f, r); return corps; };
  for (let i = 0; i < liste.length; i += 4) {
    await Promise.all(liste.slice(i, i + 4).map(async f => {
      try {
        const copie = immuable(f) ? await caches.match(f, { ignoreVary: true }) : null;
        if (copie) { await garder(f, copie); reprises++; }
        else {
          const r = await fetch(f, { credentials: 'same-origin' });
          if (!bonne(r)) { echecs++; return; }
          const corps = await garder(f, r);
          if (/\.css(?:\?|$)/.test(f)) for (const p of polices(new TextDecoder().decode(corps), new URL(f, ORIGINE))) if (!fichiers.has(p)) { fichiers.add(p); const rp = (await caches.match(p, { ignoreVary: true })) || await fetch(p).catch(() => null); if (bonne(rp)) await garder(p, rp); }
        }
      } catch (e) { echecs++; }
      dire({ type: 'pr-progres', fait: ++fait, total });
    }));
  }
  const fiche = { langue: lg, date: new Date().toISOString(), version: VERSION, pages: pages.length, fichiers: fichiers.size, reprises, octets, echecs };
  await c.put('/__lk/pack-' + lg + '.json', new Response(JSON.stringify(fiche), { headers: { 'Content-Type': 'application/json' } }));
  return fiche;
}
function preparerUneFois(lg, dire) {
  if (preparation) return preparation.then(() => preparerUneFois(lg, dire));
  preparation = preparer(lg, dire).finally(() => { preparation = null; });
  return preparation;
}
/* après une préparation réussie : cette langue n'est plus à refaire ; quand plus aucune ne l'est, l'ancienne préparation part */
async function apresPreparation(lg) {
  const r = await reglages(), reste = (r.refaire || []).filter(x => x !== lg);
  await ecrireReglages(Object.assign({}, r, { refaire: reste }));
  if (!reste.length) for (const n of await anciennesPreparations()) await caches.delete(n);
}
/* fichiers immuables d'une page vue (feuilles de style, scripts, police), recopiés du cache du navigateur sans réseau
   (« only-if-cached ») : la page suivante les lit ici, et la page vue s'ouvre aussi sans réseau */
async function garderFichiers(html, base) {
  const c = await caches.open(CACHE.fichiers);
  for (const f of ressources(html, base)) {
    if (!immuable(f) || await caches.match(f, { ignoreVary: true })) continue;
    const r = await fetch(f, { cache: 'only-if-cached', mode: 'same-origin', credentials: 'same-origin' }).catch(() => null);
    if (bonne(r)) { await c.put(f, r); aElaguer.set(CACHE.fichiers, PLAFOND.fichiers); }
  }
}
/* à l'installation : la page qui a installé le service worker (et les autres fenêtres du site) gardée tout de suite, avec ses
   fichiers immuables, depuis le cache du navigateur et sans réseau : elle s'ouvre aussi sans réseau */
async function premieresPages(fenetres) {
  for (const f of fenetres) {
    try {
      const u = new URL(f.url); if (u.origin !== ORIGINE || exclue(u.pathname)) continue;
      const r = await fetch(u.pathname, { cache: 'only-if-cached', mode: 'same-origin', credentials: 'same-origin' }).catch(() => null);
      if (!bonne(r) || !estHtml(r)) continue;
      const html = await r.clone().text(), cle = clePage(u.href);
      await ranger(CACHE.pages, cle, r, PLAFOND.pages);
      await garderFichiers(html, new URL(cle));
    } catch (e) { /* page illisible : elle sera gardée à la prochaine visite */ }
  }
}
/* après une page vue avec du réseau : page « hors connexion » de sa langue, et préparation à refaire après une mise à jour */
async function apresVisite(lg) {
  if (!(await coquillePrete(lg))) await coquille(lg).catch(() => {});
  const attente = ((await reglages()).refaire || []).filter(x => x === 'fr' || LANGUES.includes(x));
  if (!attente.length || preparation || economie()) return;
  for (const x of attente) { try { await preparerUneFois(x); await apresPreparation(x); } catch (e) { /* refaite à la prochaine visite */ } }
}

/* ---------- cycle de vie ---------- */
/* routes fixes : feuilles de style et scripts versionnés, polices du site, lus directement dans les caches ; absents, ils
   viennent du réseau sans passer par ce script (garderFichiers les recopie ensuite). Navigateur sans routes fixes : le
   gestionnaire « fetch » fait la même chose (cache d'abord). */
function routes() {
  const ici = { hostname: self.location.hostname, port: self.location.port };
  const versionne = new URLPattern(Object.assign({ search: 'v=*' }, ici)), police = new URLPattern(Object.assign({ pathname: '/fonts/*' }, ici));
  return [
    { condition: { urlPattern: versionne, requestMethod: 'GET', requestDestination: 'script' }, source: 'cache' },
    { condition: { urlPattern: versionne, requestMethod: 'GET', requestDestination: 'style' }, source: 'cache' },
    { condition: { urlPattern: police, requestMethod: 'GET', requestDestination: 'font' }, source: 'cache' }
  ];
}
self.addEventListener('install', event => {
  try { if (typeof event.addRoutes === 'function') event.waitUntil(event.addRoutes(routes()).catch(() => {})); } catch (e) { /* routes inconnues : le gestionnaire fetch suffit */ }
  event.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    const langues = [...new Set(fenetres.map(f => langueDe(new URL(f.url).pathname)))];
    for (const lg of langues.length ? langues : ['fr']) await coquille(lg);
    await premieresPages(fenetres);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const anciens = (await caches.keys()).filter(n => DU_SITE.test(n) && !n.startsWith(PREFIXE));
    /* langues préparées avec une version précédente : à refaire */
    const r = await reglages(), refaire = new Set(r.refaire || []);
    for (const n of anciens.filter(x => x.endsWith('-pack'))) for (const k of await (await caches.open(n)).keys()) { const m = /\/__lk\/pack-([a-z]{2})\.json$/.exec(k.url); if (m) refaire.add(m[1]); }
    if (refaire.size) await ecrireReglages(Object.assign({}, r, { refaire: [...refaire] }));
    /* reprise des copies encore utiles (même adresse, même contenu), puis suppression des anciens caches ; la préparation
       précédente reste en service tant que la nouvelle n'est pas faite */
    for (const n of anciens) {
      const genre = n.slice(n.lastIndexOf('-') + 1);
      if (genre === 'pack' && refaire.size) continue;
      if (PLAFOND[genre]) {
        const de = await caches.open(n), vers = await caches.open(CACHE[genre]);
        for (const k of await de.keys()) if (!(await vers.match(k))) { const x = await de.match(k); if (x) await vers.put(k, x); }
        await elaguer(vers, PLAFOND[genre]);
      }
      await caches.delete(n);
    }
    if (self.registration.navigationPreload) await self.registration.navigationPreload.enable().catch(() => {});
    await self.clients.claim();
  })());
});

/* ---------- requêtes ---------- */
function page(event, url) {
  const cle = clePage(url.href), lg = langueDe(url.pathname);
  /* la copie n'est cherchée que si le réseau tarde ou échoue (clé exacte : adresse sans paramètres ni ancre) */
  let cp = null; const copie = () => cp || (cp = caches.match(cle, { ignoreVary: true }).catch(() => undefined));
  const reseau = Promise.resolve(event.preloadResponse).catch(() => undefined).then(pre => pre || fetch(event.request))
    .then(r => ({ r, double: bonne(r) && estHtml(r) ? r.clone() : null }));
  /* la copie de la page tout de suite (elle doit s'ouvrir sans réseau même si le réseau tombe aussitôt) ; une fois la page
     calmée : ses fichiers immuables, la page hors connexion de sa langue */
  const fond = reseau.then(async ({ double }) => {
    if (!double) return;
    const html = await double.clone().text();
    await ranger(CACHE.pages, cle, double, PLAFOND.pages);
    await plusTard(async () => { await garderFichiers(html, new URL(cle)); await apresVisite(lg); });
  }).catch(() => {});
  const reponse = new Promise(resolve => {
    let fini = false;
    const servir = r => { if (!fini && r) { fini = true; resolve(r); } };
    const minuteur = setTimeout(() => { copie().then(servir); }, DELAI);
    reseau.then(({ r }) => { clearTimeout(minuteur); servir(r); }, async () => {
      clearTimeout(minuteur);
      const c = await copie();
      const hors = c || await caches.match(clePage(racine(lg) + 'hors-ligne.html'), { ignoreVary: true }) || await caches.match(clePage('/hors-ligne.html'), { ignoreVary: true });
      servir(hors || new Response('Hors connexion', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }));
    });
  });
  return { reponse, fond };
}
function genre(requete, url) {
  const p = url.pathname;
  if (p.startsWith('/fonts/') || (/\.(?:css|js|mjs)$/.test(p) && /(?:^|[?&])v=/.test(url.search.slice(1)))) return 'fichier';
  if (requete.destination === 'image' || /\.(?:webp|avif|png|jpe?g|gif|svg|ico)$/i.test(p)) return 'image';
  if (/\.(?:json|webmanifest|css|js|mjs)$/.test(p)) return 'donnee';
  return null;
}
function cacheDabord(event, requete) {
  return caches.match(requete, { ignoreVary: true }).then(trouve => trouve || fetch(requete).then(r => {
    if (bonne(r)) { const double = r.clone(); event.waitUntil(plusTard(() => ranger(CACHE.fichiers, requete, double, PLAFOND.fichiers))); }
    return r;
  }));
}
/* âge d'une copie, d'après l'en-tête Date de la réponse gardée (inconnu : à mettre à jour) */
const age = r => { const d = Date.parse(r.headers.get('date') || ''); return isNaN(d) ? Infinity : Date.now() - d; };
function copiePuisMaj(event, requete, nom, plafond) {
  return caches.match(requete, { ignoreVary: true }).then(trouve => {
    if (trouve) {
      if (age(trouve) > FRAICHE) event.waitUntil(plusTard(() => fetch(requete).then(r => bonne(r) ? ranger(nom, requete, r, plafond) : null)));
      return trouve;
    }
    return fetch(requete).then(r => { if (bonne(r)) { const double = r.clone(); event.waitUntil(plusTard(() => ranger(nom, requete, double, plafond))); } return r; });
  });
}
self.addEventListener('fetch', event => {
  const requete = event.request;
  if (requete.method !== 'GET') return;
  let url; try { url = new URL(requete.url); } catch (e) { return; }
  if (url.origin !== ORIGINE || exclue(url.pathname) || requete.headers.has('range')) return;
  dernier = Date.now();
  if (requete.mode === 'navigate') { const { reponse, fond } = page(event, url); event.respondWith(reponse); event.waitUntil(fond); return; }
  const g = genre(requete, url);
  if (g === 'fichier') event.respondWith(cacheDabord(event, requete));
  else if (g === 'image') event.respondWith(copiePuisMaj(event, requete, CACHE.images, PLAFOND.images));
  else if (g === 'donnee') event.respondWith(copiePuisMaj(event, requete, CACHE.donnees, PLAFOND.donnees));
});

/* ---------- messages de la page Mode compagnon ---------- */
self.addEventListener('message', event => {
  const d = event.data || {}, port = event.ports && event.ports[0];
  const dire = m => { try { if (port) port.postMessage(m); } catch (e) { /* la page est partie */ } };
  if (d.type === 'lk-preparer') {
    const lg = d.langue === 'fr' || LANGUES.includes(d.langue) ? d.langue : 'fr';
    event.waitUntil(preparerUneFois(lg, dire).then(async fiche => { await apresPreparation(lg); dire(Object.assign({ type: 'pr-fin' }, fiche)); },
      e => dire({ type: 'pr-erreur', message: String(e && e.message || e) })));
  }
});
