/* Leonidakit — Mode compagnon (v7.89, lot 5) : page compagnon.html et page hors connexion (hors-ligne.html).
   - Tuile Léo : ouvre l'assistant (leo-loader.js) au lieu de suivre son lien ;
   - « Prêt sans réseau » : lit les caches du site (Cache Storage, noms « lk-… ») pour dire ce qui est gardé, et demande au
     service worker (sw.js, message « lk-preparer ») de préparer les pages clés de la langue, avec une barre de progression ;
   - « Installer l'appli » : l'invite du navigateur (beforeinstallprompt) quand il en propose une, sinon la marche à suivre
     de l'appareil (iPhone et iPad : Partager → Sur l'écran d'accueil) ;
   - « Garder l'écran allumé » : API Wake Lock (common.js la reprend sur toutes les pages, clé lk_ecran_v1) ; cachée si le
     navigateur ne la connaît pas ;
   - page hors connexion : la liste des pages gardées sur l'appareil, dans la langue de la page.
   Rien n'est envoyé : les seules requêtes sont celles du service worker vers le site lui-même. */
(function () {
  'use strict';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const LANG = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  const pl = n => /^fr/.test(document.documentElement.lang || 'fr') ? n > 1 : n !== 1; /* pluriel selon la langue de la page */
  const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 });
  const racine = () => { const m = /^\/([a-z]{2})\//.exec(location.pathname); return m && m[1] === LANG && LANG !== 'fr' ? '/' + LANG + '/' : '/'; };
  const swPossible = 'serviceWorker' in navigator && 'caches' in window && (location.protocol === 'https:' || /^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
  const taille = o => o >= 1048576 ? '{n} Mo'.replace('{n}', nf.format(o / 1048576)) : '{n} Ko'.replace('{n}', nf.format(Math.max(1, Math.round(o / 1024))));
  const quand = iso => { try { const d = new Date(iso); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  $$('[data-cp-js]').forEach(el => { el.hidden = false; });

  /* ---------- caches du site (lus par la page, sans le service worker) ---------- */
  async function nomsDeCaches(re) { try { return (await caches.keys()).filter(n => re.test(n)); } catch (e) { return []; } }
  async function fichePack() {
    for (const n of await nomsDeCaches(/^lk-[a-z0-9]+-pack$/)) {
      try { const r = await (await caches.open(n)).match('/__lk/pack-' + (LANG === 'fr' ? 'fr' : LANG) + '.json'); if (r) return await r.json(); } catch (e) { /* cache illisible */ }
    }
    return null;
  }
  async function reglages() { try { const r = await caches.match('/__lk/reglages.json', { cacheName: 'lk-reglages' }); return r ? await r.json() : {}; } catch (e) { return {}; } }
  const langueDe = p => { const m = /^\/([a-z]{2})\//.exec(p); return m && ['en', 'es', 'it', 'de', 'pt'].indexOf(m[1]) !== -1 ? m[1] : 'fr'; };
  /* pages gardées (copies des pages vues et des pages préparées), dans la langue de la page */
  async function pagesGardees() {
    const vues = new Map();
    for (const n of await nomsDeCaches(/^lk-[a-z0-9]+-(?:pages|pack)$/)) {
      let c; try { c = await caches.open(n); } catch (e) { continue; }
      for (const req of await c.keys()) {
        const u = new URL(req.url); if (u.origin !== location.origin) continue;
        const p = u.pathname; if (!/(?:\.html|\/)$/.test(p) || /\/hors-ligne\.html$/.test(p) || langueDe(p) !== (LANG === 'fr' ? 'fr' : LANG)) continue;
        const prev = vues.get(p), prete = /-pack$/.test(n);
        if (!prev) vues.set(p, { p, prete, req, cache: c }); else if (prete) prev.prete = true;
      }
    }
    return [...vues.values()];
  }

  /* ---------- Léo depuis sa tuile ---------- */
  $$('[data-cp-leo]').forEach(a => a.addEventListener('click', e => {
    if (!window.LKLeoLoader || typeof window.LKLeoLoader.open !== 'function') return;
    e.preventDefault(); window.LKLeoLoader.open();
  }));

  /* ---------- prêt sans réseau ---------- */
  const etat = $('[data-cp-etat]');
  if (etat) {
    const titre = $('[data-cp-etat-titre]'), detail = $('[data-cp-etat-detail]'), bouton = $('[data-cp-preparer]');
    const progres = $('[data-cp-progres]'), barre = progres && $('progress', progres), texte = $('[data-cp-progres-txt]');
    let enCours = false;
    const dire = (cle, t, d) => { etat.dataset.cpEtat = cle; titre.textContent = t; detail.textContent = d || ''; };
    async function lire() {
      if (!swPossible) { dire('s-impossible', 'Tu navegador no guarda el sitio para jugar sin conexión.', 'Las páginas solo se abren con conexión. La transferencia de tu seguimiento, en cambio, funciona en todas partes.'); if (bouton) bouton.closest('.cp-row').hidden = true; return; }
      if (enCours) return;
      const [fiche, r, pages] = await Promise.all([fichePack(), reglages(), pagesGardees()]);
      const n = pages.length;
      const deja = n ? (pl(n) ? '{n} páginas ya guardadas en este dispositivo.' : '{n} página ya guardada en este dispositivo.').replace('{n}', nf.format(n)) : 'Ninguna página guardada en este dispositivo por ahora.';
      /* une préparation faite avec une version précédente du site reste en service jusqu'à la nouvelle : « à mettre à jour » */
      if ((r.refaire || []).indexOf(LANG === 'fr' ? 'fr' : LANG) !== -1) {
        dire('s-maj', 'Por actualizar', 'El sitio ha cambiado desde tu preparación: se rehace en tu próxima visita con conexión, o ahora mismo desde aquí.');
        if (bouton) bouton.textContent = 'Preparar para jugar sin conexión';
      } else if (fiche) {
        dire('s-pret', 'Listo para jugar sin conexión', ('Preparado el {date}: {p} páginas y {f} archivos ({t}).').replace('{date}', quand(fiche.date)).replace('{p}', nf.format(fiche.pages)).replace('{f}', nf.format(fiche.fichiers)).replace('{t}', taille(fiche.octets || 0)));
        if (bouton) bouton.textContent = 'Actualizar la preparación';
      } else {
        dire('s-vide', 'Aún no está listo sin conexión', deja);
        if (bouton) bouton.textContent = 'Preparar para jugar sin conexión';
      }
      if (bouton) bouton.disabled = !navigator.onLine;
      if (!navigator.onLine) detail.textContent = (detail.textContent ? detail.textContent + ' ' : '') + 'Vuelve a conectarte para preparar.';
    }
    async function serviceWorkerPret() {
      let reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const attente = new Promise((resolve, reject) => setTimeout(() => reject(new Error('sw-delai')), 20000));
      return Promise.race([navigator.serviceWorker.ready, attente]);
    }
    async function preparer() {
      if (enCours || !swPossible) return;
      enCours = true; bouton.disabled = true; progres.hidden = false; barre.value = 0; texte.textContent = '';
      dire('s-travail', 'Preparando…', 'Deja esta página abierta: el mapa, tus cuadernos, la calculadora y Léo están llegando a tu dispositivo.');
      try {
        const reg = await serviceWorkerPret();
        const sw = reg.active || navigator.serviceWorker.controller; if (!sw) throw new Error('sw-absent');
        const fiche = await new Promise((resolve, reject) => {
          const canal = new MessageChannel(); let dernier = 0;
          canal.port1.onmessage = e => {
            const m = e.data || {};
            if (m.type === 'pr-progres' || m.type === 'pr-etape') { const p = m.total ? Math.round(100 * m.fait / m.total) : 0; barre.value = p; texte.textContent = ('{f} de {t}').replace('{f}', nf.format(m.fait)).replace('{t}', nf.format(m.total)); if (p - dernier >= 50 || p === 100) { dernier = p; detail.textContent = ('Preparación: {p} %').replace('{p}', nf.format(p)); } }
            else if (m.type === 'pr-fin') resolve(m);
            else if (m.type === 'pr-erreur') reject(new Error(m.message || 'pr-erreur'));
          };
          sw.postMessage({ type: 'lk-preparer', langue: LANG === 'fr' ? 'fr' : LANG }, [canal.port2]);
        });
        barre.value = 100;
        try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { /* le navigateur décide */ }
        enCours = false; await lire();
        texte.textContent = fiche.echecs ? (pl(fiche.echecs) ? 'No se han podido guardar {n} archivos: repite la preparación con una conexión mejor.' : 'No se ha podido guardar {n} archivo: repite la preparación con una conexión mejor.').replace('{n}', nf.format(fiche.echecs)) : 'Listo: ya puedes cortar la conexión.';
      } catch (e) {
        enCours = false; progres.hidden = true;
        dire('s-vide', 'La preparación no se ha completado', navigator.onLine ? 'La conexión se ha cortado por el camino o el navegador se ha negado. Vuelve a intentarlo un poco más tarde.' : 'Vuelve a conectarte para preparar.');
      } finally { enCours = false; bouton.disabled = !navigator.onLine; }
    }
    if (bouton) bouton.addEventListener('click', preparer);
    window.addEventListener('online', lire); window.addEventListener('offline', lire);
    lire();
  }

  /* ---------- installer l'appli ---------- */
  const install = $('[data-cp-install]');
  if (install) {
    const ligne = $('[data-cp-installer-ligne]'), bouton = $('[data-cp-installer]'), msg = $('[data-cp-install-etat]');
    const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    const ios = /iP(?:hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(navigator.userAgent);
    const ici = ios ? 'pf-ios' : android ? 'pf-android' : 'pf-pc';
    const li = $('[data-cp-pf="' + ici + '"]');
    if (li) { li.classList.add('is-ici'); const b = document.createElement('span'); b.className = 'cp-pf-ici'; b.textContent = 'Tu dispositivo'; li.prepend(b); }
    let invite = null;
    const montrer = () => {
      if (standalone()) { msg.textContent = 'Ya estás en la app de Leonidakit.'; ligne.hidden = true; return; }
      if (invite) { msg.textContent = 'Tu navegador puede instalar Leonidakit ahora mismo.'; ligne.hidden = false; return; }
      ligne.hidden = true;
      msg.textContent = ios ? 'En iPhone y iPad, la instalación se hace desde el botón Compartir de Safari.' : 'Tu navegador no ofrece instalación directa aquí: sigue los pasos para tu dispositivo.';
    };
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); invite = e; montrer(); });
    window.addEventListener('appinstalled', () => { invite = null; ligne.hidden = true; msg.textContent = 'Listo: Leonidakit ya está en tu pantalla de inicio.'; });
    if (bouton) bouton.addEventListener('click', async () => {
      if (!invite) return montrer();
      const e = invite; invite = null;
      try { await e.prompt(); const choix = await e.userChoice; msg.textContent = choix && choix.outcome === 'accepted' ? 'Listo: Leonidakit ya está en tu pantalla de inicio.' : 'Instalación cancelada: puedes volver a lanzarla más tarde desde el menú de tu navegador.'; }
      catch (err) { msg.textContent = 'El navegador no ha podido abrir la instalación: usa su menú.'; }
      ligne.hidden = true;
    });
    montrer();
  }

  /* ---------- garder l'écran allumé ---------- */
  const ecran = $('[data-cp-ecran]');
  if (ecran && 'wakeLock' in navigator && window.LKEcran) {
    const bouton = $('[data-cp-ecran-bouton]'), msg = $('[data-cp-ecran-msg]');
    const peindre = () => { const on = window.LKEcran.on(); bouton.setAttribute('aria-checked', on ? 'true' : 'false'); msg.textContent = on ? 'Activado: la pantalla se queda encendida mientras se muestre una página del sitio.' : 'Desactivado: tu móvil entra en reposo como siempre.'; };
    bouton.addEventListener('click', () => {
      const on = !window.LKEcran.on();
      try { if (on) localStorage.setItem('lk_ecran_v1', '1'); else localStorage.removeItem('lk_ecran_v1'); }
      catch (e) { msg.textContent = 'Tu navegador no permite guardar esta elección.'; return; }
      if (on) window.LKEcran.take(); else window.LKEcran.release();
      peindre();
    });
    ecran.hidden = false; peindre();
  }

  /* ---------- page hors connexion : pages gardées ---------- */
  const liste = $('[data-hl-liste]');
  if (liste) {
    const vide = $('[data-hl-vide]'), retry = $('[data-hl-reessayer]');
    if (retry) { retry.hidden = false; retry.addEventListener('click', () => location.reload()); }
    const ordre = ['', 'carte.html', 'progression.html', 'calculateurs.html', 'compagnon.html'];
    const rang = p => { const i = ordre.indexOf(p.slice(racine().length)); return i === -1 ? ordre.length : i; };
    /* titre d'une page gardée : le début du fichier suffit (<title> est dans les premières lignes) */
    async function titreDe(item) {
      try {
        const r = await item.cache.match(item.req); if (!r || !r.body) return null;
        const lecteur = r.body.getReader(), dec = new TextDecoder(); let txt = '';
        while (txt.length < 24000) { const { done, value } = await lecteur.read(); if (done) break; txt += dec.decode(value, { stream: true }); if (txt.indexOf('</title>') !== -1) break; }
        try { lecteur.cancel(); } catch (e) { /* déjà fini */ }
        const m = /<title>([^<]*)<\/title>/.exec(txt); if (!m) return null;
        const t = document.createElement('textarea'); t.innerHTML = m[1]; return t.value.replace(/\s*\|\s*Leonidakit\s*$/, '').trim();
      } catch (e) { return null; }
    }
    (async () => {
      if (!swPossible) return;
      const pages = await pagesGardees();
      if (!pages.length) { if (vide) vide.hidden = false; return; }
      const items = await Promise.all(pages.slice(0, 120).map(async x => Object.assign(x, { titre: await titreDe(x) || x.p })));
      items.sort((a, b) => (b.prete - a.prete) || (rang(a.p) - rang(b.p)) || a.titre.localeCompare(b.titre, document.documentElement.lang || 'fr'));
      const groupe = (nom, l) => { if (!l.length) return null; const frag = document.createDocumentFragment(), h = document.createElement('h3'); h.textContent = nom; const ul = document.createElement('ul'); for (const x of l) { const li = document.createElement('li'), a = document.createElement('a'); a.href = x.p; a.textContent = x.titre; li.append(a); ul.append(li); } frag.append(h, ul); return frag; };
      liste.textContent = '';
      for (const g of [groupe('Listas para jugar', items.filter(x => x.prete)), groupe('Ya abiertas', items.filter(x => !x.prete))]) if (g) liste.append(g);
      if (window.LKMotion && window.LKMotion.enter) window.LKMotion.enter($$('li', liste));
    })();
  }
})();

/* v7.92 : la scène « console et téléphone » de compagnon.html : l'écran du téléphone suit l'étape qu'on lit (celle qui passe
   le milieu de l'écran). La position des étapes est mesurée au chargement et au redimensionnement ; pendant le défilement,
   une seule lecture de position par trame, et aucune écriture si l'étape ne change pas. Sans script, chaque étape montre son
   propre écran (compagnon.css). */
(function () {
  'use strict';
  var story = document.querySelector('[data-cp-story]'); if (!story) return;
  var steps = Array.prototype.slice.call(story.querySelectorAll('[data-cp-step]'));
  var screens = Array.prototype.slice.call(story.querySelectorAll('.cp-scene [data-cp-scr]'));
  if (!steps.length || !screens.length) return;
  var cur = steps[0].getAttribute('data-cp-step'), queued = false;
  function set(id) {
    if (id === cur) return; cur = id;
    screens.forEach(function (s) { s.classList.toggle('is-on', s.getAttribute('data-cp-scr') === id); });
    steps.forEach(function (st) { st.classList.toggle('is-on', st.getAttribute('data-cp-step') === id); });
  }
  /* la position des étapes est relue à chaque image (quatre mesures) : une étape qui change de taille, une image qui se
     charge plus haut ne décalent jamais l’écran montré */
  function update() {
    queued = false;
    var line = (window.innerHeight || 800) * 0.55, k = 0;
    for (var i = 0; i < steps.length; i++) if (steps[i].getBoundingClientRect().top <= line) k = i;
    set(steps[k].getAttribute('data-cp-step'));
  }
  var later = function () { if (!queued) { queued = true; window.requestAnimationFrame(update); } };
  window.addEventListener('scroll', later, { passive: true });
  window.addEventListener('resize', later);
  window.addEventListener('load', later);
  steps.forEach(function (st) { st.addEventListener('focusin', function () { set(st.getAttribute('data-cp-step')); }); });
  update();
})();
