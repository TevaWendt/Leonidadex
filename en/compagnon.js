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
  const nf = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
  const racine = () => { const m = /^\/([a-z]{2})\//.exec(location.pathname); return m && m[1] === LANG && LANG !== 'fr' ? '/' + LANG + '/' : '/'; };
  const swPossible = 'serviceWorker' in navigator && 'caches' in window && (location.protocol === 'https:' || /^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
  const taille = o => o >= 1048576 ? '{n} Mo'.replace('{n}', nf.format(o / 1048576)) : '{n} Ko'.replace('{n}', nf.format(Math.max(1, Math.round(o / 1024))));
  const quand = iso => { try { const d = new Date(iso); return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
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
      if (!swPossible) { dire('s-impossible', 'Your browser can’t save the site for offline play.', 'Pages only open when you’re online. Transferring your tracking works everywhere, though.'); if (bouton) bouton.closest('.cp-row').hidden = true; return; }
      if (enCours) return;
      const [fiche, r, pages] = await Promise.all([fichePack(), reglages(), pagesGardees()]);
      const n = pages.length;
      const deja = n ? (pl(n) ? '{n} pages already saved on this device.' : '{n} page already saved on this device.').replace('{n}', nf.format(n)) : 'No pages saved on this device yet.';
      /* une préparation faite avec une version précédente du site reste en service jusqu'à la nouvelle : « à mettre à jour » */
      if ((r.refaire || []).indexOf(LANG === 'fr' ? 'fr' : LANG) !== -1) {
        dire('s-maj', 'Needs updating', 'The site has changed since your prep: it’ll be redone on your next visit online, or right away from here.');
        if (bouton) bouton.textContent = 'Get ready to play offline';
      } else if (fiche) {
        dire('s-pret', 'Ready to play offline', ('Prepared on {date}: {p} pages and {f} files ({t}).').replace('{date}', quand(fiche.date)).replace('{p}', nf.format(fiche.pages)).replace('{f}', nf.format(fiche.fichiers)).replace('{t}', taille(fiche.octets || 0)));
        if (bouton) bouton.textContent = 'Update the offline prep';
      } else {
        dire('s-vide', 'Not ready to play offline yet', deja);
        if (bouton) bouton.textContent = 'Get ready to play offline';
      }
      if (bouton) bouton.disabled = !navigator.onLine;
      if (!navigator.onLine) detail.textContent = (detail.textContent ? detail.textContent + ' ' : '') + 'Reconnect to get ready.';
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
      dire('s-travail', 'Preparing…', 'Keep this page open: the map, your trackers, the calculator and Léo are on their way to your device.');
      try {
        const reg = await serviceWorkerPret();
        const sw = reg.active || navigator.serviceWorker.controller; if (!sw) throw new Error('sw-absent');
        const fiche = await new Promise((resolve, reject) => {
          const canal = new MessageChannel(); let dernier = 0;
          canal.port1.onmessage = e => {
            const m = e.data || {};
            if (m.type === 'pr-progres' || m.type === 'pr-etape') { const p = m.total ? Math.round(100 * m.fait / m.total) : 0; barre.value = p; texte.textContent = ('{f} of {t}').replace('{f}', nf.format(m.fait)).replace('{t}', nf.format(m.total)); if (p - dernier >= 50 || p === 100) { dernier = p; detail.textContent = ('Preparing: {p}%').replace('{p}', nf.format(p)); } }
            else if (m.type === 'pr-fin') resolve(m);
            else if (m.type === 'pr-erreur') reject(new Error(m.message || 'pr-erreur'));
          };
          sw.postMessage({ type: 'lk-preparer', langue: LANG === 'fr' ? 'fr' : LANG }, [canal.port2]);
        });
        barre.value = 100;
        try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { /* le navigateur décide */ }
        enCours = false; await lire();
        texte.textContent = fiche.echecs ? (pl(fiche.echecs) ? '{n} files couldn’t be saved: start the prep again with a better connection.' : '{n} file couldn’t be saved: start the prep again with a better connection.').replace('{n}', nf.format(fiche.echecs)) : 'It’s ready: you can go offline.';
      } catch (e) {
        enCours = false; progres.hidden = true;
        dire('s-vide', 'The prep didn’t finish', navigator.onLine ? 'The network dropped partway, or the browser refused. Try again a bit later.' : 'Reconnect to get ready.');
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
    if (li) { li.classList.add('is-ici'); const b = document.createElement('span'); b.className = 'cp-pf-ici'; b.textContent = 'Your device'; li.prepend(b); }
    let invite = null;
    const montrer = () => {
      if (standalone()) { msg.textContent = 'You’re already in the Leonidakit app.'; ligne.hidden = true; return; }
      if (invite) { msg.textContent = 'Your browser can install Leonidakit right now.'; ligne.hidden = false; return; }
      ligne.hidden = true;
      msg.textContent = ios ? 'On iPhone and iPad, you install it from Safari’s Share button.' : 'Your browser doesn’t offer a direct install here: follow the steps for your device.';
    };
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); invite = e; montrer(); });
    window.addEventListener('appinstalled', () => { invite = null; ligne.hidden = true; msg.textContent = 'Done: Leonidakit is on your home screen.'; });
    if (bouton) bouton.addEventListener('click', async () => {
      if (!invite) return montrer();
      const e = invite; invite = null;
      try { await e.prompt(); const choix = await e.userChoice; msg.textContent = choix && choix.outcome === 'accepted' ? 'Done: Leonidakit is on your home screen.' : 'Install canceled: you can start it again later from your browser’s menu.'; }
      catch (err) { msg.textContent = 'The browser couldn’t start the install: use its menu instead.'; }
      ligne.hidden = true;
    });
    montrer();
  }

  /* ---------- garder l'écran allumé ---------- */
  const ecran = $('[data-cp-ecran]');
  if (ecran && 'wakeLock' in navigator && window.LKEcran) {
    const bouton = $('[data-cp-ecran-bouton]'), msg = $('[data-cp-ecran-msg]');
    const peindre = () => { const on = window.LKEcran.on(); bouton.setAttribute('aria-checked', on ? 'true' : 'false'); msg.textContent = on ? 'On: the screen stays on as long as a page of the site is showing.' : 'Off: your phone goes to sleep as usual.'; };
    bouton.addEventListener('click', () => {
      const on = !window.LKEcran.on();
      try { if (on) localStorage.setItem('lk_ecran_v1', '1'); else localStorage.removeItem('lk_ecran_v1'); }
      catch (e) { msg.textContent = 'Your browser won’t save this choice.'; return; }
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
      for (const g of [groupe('Ready to play', items.filter(x => x.prete)), groupe('Already opened', items.filter(x => !x.prete))]) if (g) liste.append(g);
      if (window.LKMotion && window.LKMotion.enter) window.LKMotion.enter($$('li', liste));
    })();
  }
})();
