/* Généré depuis outils/sources/compagnon.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const LANG = (document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  const pl = n => /^fr/.test(document.documentElement.lang || 'fr') ? n > 1 : n !== 1;
  const nf = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
  const racine = () => { const m = /^\/([a-z]{2})\//.exec(location.pathname); return m && m[1] === LANG && LANG !== 'fr' ? '/' + LANG + '/' : '/'; };
  const swPossible = 'serviceWorker' in navigator && 'caches' in window && (location.protocol === 'https:' || /^(?:localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname));
  const taille = o => o >= 1048576 ? '{n} Mo'.replace('{n}', nf.format(o / 1048576)) : '{n} Ko'.replace('{n}', nf.format(Math.max(1, Math.round(o / 1024))));
  const quand = iso => { try { const d = new Date(iso); return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }) + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
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
      if (!swPossible) { dire('s-impossible', 'Seu navegador não guarda o site para jogar sem internet.', 'As páginas só abrem com internet. Já a transferência do seu acompanhamento funciona em qualquer lugar.'); if (bouton) bouton.closest('.cp-row').hidden = true; return; }
      if (enCours) return;
      const [fiche, r, pages] = await Promise.all([fichePack(), reglages(), pagesGardees()]);
      const n = pages.length;
      const deja = n ? (pl(n) ? '{n} páginas já guardadas neste aparelho.' : '{n} página já guardada neste aparelho.').replace('{n}', nf.format(n)) : 'Nenhuma página guardada neste aparelho por enquanto.';
      if ((r.refaire || []).indexOf(LANG === 'fr' ? 'fr' : LANG) !== -1) {
        dire('s-maj', 'Precisa atualizar', 'O site mudou desde a sua preparação: ela é refeita na sua próxima visita com internet, ou agora mesmo aqui.');
        if (bouton) bouton.textContent = 'Preparar para jogar sem internet';
      } else if (fiche) {
        dire('s-pret', 'Pronto para jogar sem internet', ('Preparado em {date}: {p} páginas e {f} arquivos ({t}).').replace('{date}', quand(fiche.date)).replace('{p}', nf.format(fiche.pages)).replace('{f}', nf.format(fiche.fichiers)).replace('{t}', taille(fiche.octets || 0)));
        if (bouton) bouton.textContent = 'Atualizar a preparação';
      } else {
        dire('s-vide', 'Ainda não está pronto sem internet', deja);
        if (bouton) bouton.textContent = 'Preparar para jogar sem internet';
      }
      if (bouton) bouton.disabled = !navigator.onLine;
      if (!navigator.onLine) detail.textContent = (detail.textContent ? detail.textContent + ' ' : '') + 'Conecte-se de novo para preparar.';
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
      dire('s-travail', 'Preparando…', 'Deixe esta página aberta: o mapa, seus cadernos, a calculadora e o Léo estão chegando ao seu aparelho.');
      try {
        const reg = await serviceWorkerPret();
        const sw = reg.active || navigator.serviceWorker.controller; if (!sw) throw new Error('sw-absent');
        const fiche = await new Promise((resolve, reject) => {
          const canal = new MessageChannel(); let dernier = 0;
          canal.port1.onmessage = e => {
            const m = e.data || {};
            if (m.type === 'pr-progres' || m.type === 'pr-etape') { const p = m.total ? Math.round(100 * m.fait / m.total) : 0; barre.value = p; texte.textContent = ('{f} de {t}').replace('{f}', nf.format(m.fait)).replace('{t}', nf.format(m.total)); if (p - dernier >= 50 || p === 100) { dernier = p; detail.textContent = ('Preparação: {p}%').replace('{p}', nf.format(p)); } }
            else if (m.type === 'pr-fin') resolve(m);
            else if (m.type === 'pr-erreur') reject(new Error(m.message || 'pr-erreur'));
          };
          sw.postMessage({ type: 'lk-preparer', langue: LANG === 'fr' ? 'fr' : LANG }, [canal.port2]);
        });
        barre.value = 100;
        try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) {  }
        enCours = false; await lire();
        texte.textContent = fiche.echecs ? (pl(fiche.echecs) ? '{n} arquivos não puderam ser guardados: refaça a preparação com uma internet melhor.' : '{n} arquivo não pôde ser guardado: refaça a preparação com uma internet melhor.').replace('{n}', nf.format(fiche.echecs)) : 'Pronto: você já pode desligar a internet.';
      } catch (e) {
        enCours = false; progres.hidden = true;
        dire('s-vide', 'A preparação não foi concluída', navigator.onLine ? 'A internet caiu no meio do caminho ou o navegador recusou. Tente de novo um pouco mais tarde.' : 'Conecte-se de novo para preparar.');
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
    if (li) { li.classList.add('is-ici'); const b = document.createElement('span'); b.className = 'cp-pf-ici'; b.textContent = 'Seu aparelho'; li.prepend(b); }
    let invite = null;
    const montrer = () => {
      if (standalone()) { msg.textContent = 'Você já está no app Leonidakit.'; ligne.hidden = true; return; }
      if (invite) { msg.textContent = 'Seu navegador pode instalar o Leonidakit agora mesmo.'; ligne.hidden = false; return; }
      ligne.hidden = true;
      msg.textContent = ios ? 'No iPhone e no iPad, a instalação é feita pelo botão Compartilhar do Safari.' : 'Seu navegador não oferece instalação direta aqui: siga o passo a passo do seu aparelho.';
    };
    window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); invite = e; montrer(); });
    window.addEventListener('appinstalled', () => { invite = null; ligne.hidden = true; msg.textContent = 'Pronto: o Leonidakit está na sua tela inicial.'; });
    if (bouton) bouton.addEventListener('click', async () => {
      if (!invite) return montrer();
      const e = invite; invite = null;
      try { await e.prompt(); const choix = await e.userChoice; msg.textContent = choix && choix.outcome === 'accepted' ? 'Pronto: o Leonidakit está na sua tela inicial.' : 'Instalação cancelada: você pode tentar de novo mais tarde pelo menu do seu navegador.'; }
      catch (err) { msg.textContent = 'O navegador não conseguiu abrir a instalação: use o menu dele.'; }
      ligne.hidden = true;
    });
    montrer();
  }
  const ecran = $('[data-cp-ecran]');
  if (ecran && 'wakeLock' in navigator && window.LKEcran) {
    const bouton = $('[data-cp-ecran-bouton]'), msg = $('[data-cp-ecran-msg]');
    const peindre = () => { const on = window.LKEcran.on(); bouton.setAttribute('aria-checked', on ? 'true' : 'false'); msg.textContent = on ? 'Ativado: a tela fica ligada enquanto uma página do site estiver aberta.' : 'Desativado: seu celular apaga a tela como de costume.'; };
    bouton.addEventListener('click', () => {
      const on = !window.LKEcran.on();
      try { if (on) localStorage.setItem('lk_ecran_v1', '1'); else localStorage.removeItem('lk_ecran_v1'); }
      catch (e) { msg.textContent = 'Seu navegador não permite guardar essa escolha.'; return; }
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
      for (const g of [groupe('Prontas para jogar', items.filter(x => x.prete)), groupe('Já abertas', items.filter(x => !x.prete))]) if (g) liste.append(g);
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
