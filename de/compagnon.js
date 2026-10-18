/* Généré depuis outils/sources/compagnon.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const LANG = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  const pl = n => /^fr/.test(document.documentElement.lang || 'fr') ? n > 1 : n !== 1;
  const nf = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 });
  const racine = () => { const m = /^\/([a-z]{2})\//.exec(location.pathname); return m && m[1] === LANG && LANG !== 'fr' ? '/' + LANG + '/' : '/'; };
  const swPossible = 'serviceWorker' in navigator && 'caches' in window && (location.protocol === 'https:' || /^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
  const taille = o => o >= 1048576 ? '{n} Mo'.replace('{n}', nf.format(o / 1048576)) : '{n} Ko'.replace('{n}', nf.format(Math.max(1, Math.round(o / 1024))));
  const quand = iso => { try { const d = new Date(iso); return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  $$('[data-cp-js]').forEach(el => { el.hidden = false; });
  async function nomsDeCaches(re) { try { return (await caches.keys()).filter(n => re.test(n)); } catch (e) { return []; } }
  async function fichePack() {
    for (const n of await nomsDeCaches(/^lk-[a-z0-9]+-pack$/)) {
      try { const r = await (await caches.open(n)).match('/__lk/pack-' + (LANG === 'fr' ? 'fr' : LANG) + '.json'); if (r) return await r.json(); } catch (e) {  }
    }
    return null;
  }
  async function reglages() { try { const r = await caches.match('/__lk/reglages.json', { cacheName: 'lk-reglages' }); return r ? await r.json() : {}; } catch (e) { return {}; } }
  const langueDe = p => { const m = /^\/([a-z]{2})\//.exec(p); return m && ['en', 'es', 'it', 'de', 'pt'].indexOf(m[1]) !== -1 ? m[1] : 'fr'; };
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
  $$('[data-cp-leo]').forEach(a => a.addEventListener('click', e => {
    if (!window.LKLeoLoader || typeof window.LKLeoLoader.open !== 'function') return;
    e.preventDefault(); window.LKLeoLoader.open();
  }));
  const etat = $('[data-cp-etat]');
  if (etat) {
    const titre = $('[data-cp-etat-titre]'), detail = $('[data-cp-etat-detail]'), bouton = $('[data-cp-preparer]');
    const progres = $('[data-cp-progres]'), barre = progres && $('progress', progres), texte = $('[data-cp-progres-txt]');
    let enCours = false;
    const dire = (cle, t, d) => { etat.dataset.cpEtat = cle; titre.textContent = t; detail.textContent = d || ''; };
    async function lire() {
      if (!swPossible) { dire('s-impossible', 'Dein Browser kann die Website nicht fürs Offline-Spielen speichern.', 'Die Seiten öffnen sich nur mit Netz. Die Übertragung deines Fortschritts klappt aber überall.'); if (bouton) bouton.closest('.cp-row').hidden = true; return; }
      if (enCours) return;
      const [fiche, r, pages] = await Promise.all([fichePack(), reglages(), pagesGardees()]);
      const n = pages.length;
      const deja = n ? (pl(n) ? '{n} Seiten schon auf diesem Gerät gespeichert.' : '{n} Seite schon auf diesem Gerät gespeichert.').replace('{n}', nf.format(n)) : 'Noch keine Seite auf diesem Gerät gespeichert.';
      if ((r.refaire || []).indexOf(LANG === 'fr' ? 'fr' : LANG) !== -1) {
        dire('s-maj', 'Aktualisierung nötig', 'Die Website hat sich seit deiner Vorbereitung geändert: Die Vorbereitung läuft bei deinem nächsten Besuch mit Netz neu, oder du startest sie gleich hier.');
        if (bouton) bouton.textContent = 'Für Offline-Spielen vorbereiten';
      } else if (fiche) {
        dire('s-pret', 'Bereit zum Offline-Spielen', ('Vorbereitet am {date}: {p} Seiten und {f} Dateien ({t}).').replace('{date}', quand(fiche.date)).replace('{p}', nf.format(fiche.pages)).replace('{f}', nf.format(fiche.fichiers)).replace('{t}', taille(fiche.octets || 0)));
        if (bouton) bouton.textContent = 'Vorbereitung aktualisieren';
      } else {
        dire('s-vide', 'Noch nicht offline bereit', deja);
        if (bouton) bouton.textContent = 'Für Offline-Spielen vorbereiten';
      }
      if (bouton) bouton.disabled = !navigator.onLine;
      if (!navigator.onLine) detail.textContent = (detail.textContent ? detail.textContent + ' ' : '') + 'Geh wieder online, um alles vorzubereiten.';
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
      dire('s-travail', 'Vorbereitung läuft…', 'Lass diese Seite offen: Die Karte, deine Tracker, der Rechner und Léo werden auf dein Gerät geladen.');
      try {
        const reg = await serviceWorkerPret();
        const sw = reg.active || navigator.serviceWorker.controller; if (!sw) throw new Error('sw-absent');
        const fiche = await new Promise((resolve, reject) => {
          const canal = new MessageChannel(); let dernier = 0;
          canal.port1.onmessage = e => {
            const m = e.data || {};
            if (m.type === 'pr-progres' || m.type === 'pr-etape') { const p = m.total ? Math.round(100 * m.fait / m.total) : 0; barre.value = p; texte.textContent = ('{f} von {t}').replace('{f}', nf.format(m.fait)).replace('{t}', nf.format(m.total)); if (p - dernier >= 50 || p === 100) { dernier = p; detail.textContent = ('Vorbereitung: {p} %').replace('{p}', nf.format(p)); } }
            else if (m.type === 'pr-fin') resolve(m);
            else if (m.type === 'pr-erreur') reject(new Error(m.message || 'pr-erreur'));
          };
          sw.postMessage({ type: 'lk-preparer', langue: LANG === 'fr' ? 'fr' : LANG }, [canal.port2]);
        });
        barre.value = 100;
        try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) {  }
        enCours = false; await lire();
        texte.textContent = fiche.echecs ? (pl(fiche.echecs) ? '{n} Dateien konnten nicht gespeichert werden: Starte die Vorbereitung mit besserem Netz neu.' : '{n} Datei konnte nicht gespeichert werden: Starte die Vorbereitung mit besserem Netz neu.').replace('{n}', nf.format(fiche.echecs)) : 'Alles bereit: Du kannst offline gehen.';
      } catch (e) {
        enCours = false; progres.hidden = true;
        dire('s-vide', 'Die Vorbereitung hat nicht geklappt', navigator.onLine ? 'Das Netz ist zwischendurch abgebrochen oder der Browser hat abgelehnt. Versuch es etwas später noch mal.' : 'Geh wieder online, um alles vorzubereiten.');
      } finally { enCours = false; bouton.disabled = !navigator.onLine; }
    }
    if (bouton) bouton.addEventListener('click', preparer);
    window.addEventListener('online', lire); window.addEventListener('offline', lire);
    lire();
  }
  const install = $('[data-cp-install]');
  if (install) {
    const ligne = $('[data-cp-installer-ligne]'), bouton = $('[data-cp-installer]'), msg = $('[data-cp-install-etat]');
    const standalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
    const ios = /iP(?:hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(navigator.userAgent);
    const ici = ios ? 'pf-ios' : android ? 'pf-android' : 'pf-pc';
    const li = $('[data-cp-pf="' + ici + '"]');
    if (li) { li.classList.add('is-ici'); const b = document.createElement('span'); b.className = 'cp-pf-ici'; b.textContent = 'Dein Gerät'; li.prepend(b); }
    let invite = null;
    const montrer = () => {
      if (standalone()) { msg.textContent = 'Du bist schon in der Leonidakit-App.'; ligne.hidden = true; return; }
      if (invite) { msg.textContent = 'Dein Browser kann Leonidakit sofort installieren.'; ligne.hidden = false; return; }
      ligne.hidden = true;
      msg.textContent = ios ? 'Auf iPhone und iPad installierst du die App über die Teilen-Taste in Safari.' : 'Dein Browser bietet hier keine direkte Installation an: Folge der Anleitung für dein Gerät.';
    };
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); invite = e; montrer(); });
    window.addEventListener('appinstalled', () => { invite = null; ligne.hidden = true; msg.textContent = 'Erledigt: Leonidakit ist auf deinem Home-Bildschirm.'; });
    if (bouton) bouton.addEventListener('click', async () => {
      if (!invite) return montrer();
      const e = invite; invite = null;
      try { await e.prompt(); const choix = await e.userChoice; msg.textContent = choix && choix.outcome === 'accepted' ? 'Erledigt: Leonidakit ist auf deinem Home-Bildschirm.' : 'Installation abgebrochen: Du kannst sie später über das Menü deines Browsers neu starten.'; }
      catch (err) { msg.textContent = 'Der Browser konnte die Installation nicht öffnen: Nutze sein Menü.'; }
      ligne.hidden = true;
    });
    montrer();
  }
  const ecran = $('[data-cp-ecran]');
  if (ecran && 'wakeLock' in navigator && window.LKEcran) {
    const bouton = $('[data-cp-ecran-bouton]'), msg = $('[data-cp-ecran-msg]');
    const peindre = () => { const on = window.LKEcran.on(); bouton.setAttribute('aria-checked', on ? 'true' : 'false'); msg.textContent = on ? 'Aktiviert: Der Bildschirm bleibt an, solange eine Seite der Website angezeigt wird.' : 'Deaktiviert: Dein Handy geht wie gewohnt in den Ruhemodus.'; };
    bouton.addEventListener('click', () => {
      const on = !window.LKEcran.on();
      try { if (on) localStorage.setItem('lk_ecran_v1', '1'); else localStorage.removeItem('lk_ecran_v1'); }
      catch (e) { msg.textContent = 'Dein Browser kann diese Wahl nicht speichern.'; return; }
      if (on) window.LKEcran.take(); else window.LKEcran.release();
      peindre();
    });
    ecran.hidden = false; peindre();
  }
  const liste = $('[data-hl-liste]');
  if (liste) {
    const vide = $('[data-hl-vide]'), retry = $('[data-hl-reessayer]');
    if (retry) { retry.hidden = false; retry.addEventListener('click', () => location.reload()); }
    const ordre = ['', 'carte.html', 'progression.html', 'calculateurs.html', 'compagnon.html'];
    const rang = p => { const i = ordre.indexOf(p.slice(racine().length)); return i === -1 ? ordre.length : i; };
    async function titreDe(item) {
      try {
        const r = await item.cache.match(item.req); if (!r || !r.body) return null;
        const lecteur = r.body.getReader(), dec = new TextDecoder(); let txt = '';
        while (txt.length < 24000) { const { done, value } = await lecteur.read(); if (done) break; txt += dec.decode(value, { stream: true }); if (txt.indexOf('</title>') !== -1) break; }
        try { lecteur.cancel(); } catch (e) {  }
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
      for (const g of [groupe('Bereit zum Spielen', items.filter(x => x.prete)), groupe('Schon geöffnet', items.filter(x => !x.prete))]) if (g) liste.append(g);
      if (window.LKMotion && window.LKMotion.enter) window.LKMotion.enter($$('li', liste));
    })();
  }
})();
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
