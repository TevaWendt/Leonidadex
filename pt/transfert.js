/* Leonidakit — changer d'appareil (v7.89, lot 5), sur la page Mode compagnon et la page Progression.
   Ton suivi (le même que « Exporter mon suivi » : progression-core.js, exportData) passe d'un appareil à l'autre sans
   compte ni serveur :
   - lien de transfert : …/compagnon.html#transfert=1z<données> ; les données sont compressées (CompressionStream,
     « deflate-raw ») puis écrites en base64url après le signe # : le navigateur n'envoie jamais cette partie au serveur.
     Format 1 : « LKT1 », l'origine du site qui l'a créé, une somme de contrôle (CRC-32) et le suivi (JSON), une ligne chacun ;
     « 1j » : même chose sans compression, pour un navigateur sans CompressionStream ;
   - QR code de ce lien, dessiné dans la page (vendor/qrcode-generator.js, licence MIT, chargé à la demande) ; un suivi trop
     gros pour un QR code passe par le lien ou le fichier ;
   - fichier : export et import existants (progression-core.js), proposés aussi ici.
   À l'ouverture du lien, la page montre ce qui arrive (cases, calculs, plans) et propose fusionner, remplacer ou annuler
   (applyImport) ; puis l'adresse est nettoyée (history.replaceState). Refus propre d'un lien abîmé, trop long, d'une version
   plus récente ou créé sur une autre origine. Le codec (encoder, decoder…) sert aussi aux tests (Node). */
(function (global) {
  'use strict';
  const FORMAT = '1', MAGIE = 'LKT1';
  const LIMITE_LIEN = 60000;           /* caractères après « #transfert= » : au-delà, le fichier */
  const LIMITE_DONNEES = 4 * 1048576;  /* octets une fois décompressés : au-delà, refus (lien piégé ou abîmé) */
  const QR_VERSION_MAX = 30;           /* au-delà, un QR code dessiné sur un écran se scanne mal */
  const erreur = code => { const e = new Error(code); e.code = code; return e; };

  /* ---------- codec ---------- */
  const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(texte) { const b = new TextEncoder().encode(texte); let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8); return ((c ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0'); }
  function b64url(octets) { let s = ''; for (let i = 0; i < octets.length; i += 0x8000) s += String.fromCharCode.apply(null, octets.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function deb64url(t) {
    if (!/^[A-Za-z0-9_-]*$/.test(t) || t.length % 4 === 1) throw erreur('E_ABIME');
    let s; try { s = atob(t.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((t.length + 3) % 4)); } catch (e) { throw erreur('E_ABIME'); }
    const out = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i); return out;
  }
  const compression = () => typeof CompressionStream === 'function' && typeof DecompressionStream === 'function';
  async function lireFlux(flux, max) {
    const lecteur = flux.getReader(), morceaux = []; let total = 0;
    for (;;) { const { done, value } = await lecteur.read(); if (done) break; total += value.length; if (total > max) { try { await lecteur.cancel(); } catch (e) { /* déjà fermé */ } throw erreur('E_TAILLE'); } morceaux.push(value); }
    const out = new Uint8Array(total); let i = 0; for (const m of morceaux) { out.set(m, i); i += m.length; } return out;
  }
  async function encoder(suivi, origine) {
    const json = typeof suivi === 'string' ? suivi : JSON.stringify(suivi);
    const texte = MAGIE + '\n' + origine + '\n' + crc32(json) + '\n' + json, brut = new TextEncoder().encode(texte);
    if (!compression()) return { charge: FORMAT + 'j' + b64url(brut), octets: brut.length, compresse: false };
    const z = await lireFlux(new Blob([brut]).stream().pipeThrough(new CompressionStream('deflate-raw')), Infinity);
    return { charge: FORMAT + 'z' + b64url(z), octets: brut.length, compresse: true };
  }
  async function decoder(charge, origine) {
    if (typeof charge !== 'string' || charge.length < 3) throw erreur('E_ABIME');
    if (charge.length > LIMITE_LIEN) throw erreur('E_TAILLE');
    const v = charge[0], mode = charge[1];
    if (v !== FORMAT) throw erreur(/^[2-9]$/.test(v) ? 'E_VERSION' : 'E_ABIME');
    if (mode !== 'z' && mode !== 'j') throw erreur('E_ABIME');
    let octets = deb64url(charge.slice(2));
    if (mode === 'z') {
      if (typeof DecompressionStream !== 'function') throw erreur('E_NAVIGATEUR');
      try { octets = await lireFlux(new Blob([octets]).stream().pipeThrough(new DecompressionStream('deflate-raw')), LIMITE_DONNEES); }
      catch (e) { throw e && e.code === 'E_TAILLE' ? e : erreur('E_ABIME'); }
    } else if (octets.length > LIMITE_DONNEES) throw erreur('E_TAILLE');
    let texte; try { texte = new TextDecoder('utf-8', { fatal: true }).decode(octets); } catch (e) { throw erreur('E_ABIME'); }
    const a = texte.indexOf('\n'), b = texte.indexOf('\n', a + 1), c = texte.indexOf('\n', b + 1);
    if (a < 0 || b < 0 || c < 0) throw erreur('E_ABIME');
    const magie = texte.slice(0, a), venue = texte.slice(a + 1, b), somme = texte.slice(b + 1, c), json = texte.slice(c + 1);
    if (magie !== MAGIE) throw erreur(/^LKT[2-9]$/.test(magie) ? 'E_VERSION' : 'E_ABIME');
    if (crc32(json) !== somme) throw erreur('E_ABIME');
    if (venue !== origine) { const e = erreur('E_ORIGINE'); e.origine = venue; throw e; }
    return { json, origine: venue };
  }
  const chargeDe = hash => { const m = /^#transfert=([A-Za-z0-9_-]*)$/.exec(String(hash || '')); return m ? m[1] : (/^#transfert=/.test(String(hash || '')) ? '' : null); };
  const lienDe = (page, charge) => String(page).replace(/#.*$/, '') + '#transfert=' + charge;
  /* ce que porte un suivi : cases cochées (véhicules, armes, lieux, listes, contenus, collectibles, trophées), calculs et plans */
  function compter(rubriques) {
    let cases = 0, calculs = 0, plans = 0; const vrai = x => x === true || x === 1;
    for (const k of Object.keys(rubriques || {})) {
      let v; try { v = JSON.parse(rubriques[k]); } catch (e) { continue; }
      if (/^lk_own_/.test(k) || k === 'lk_map_found') { if (v && typeof v === 'object') cases += Object.keys(v).filter(id => vrai(v[id])).length; }
      else if (k === 'lk_progression_v2') { const c = v && v.checked; if (c && typeof c === 'object') cases += Object.keys(c).filter(id => vrai(c[id])).length; }
      else if (k === 'lk_collectibles_v1') { const f = v && v.found; if (f && typeof f === 'object') cases += Object.keys(f).filter(id => vrai(f[id])).length; }
      else if (k === 'lk-trophees-obtenus-v1') { if (Array.isArray(v)) cases += v.length; }
      else if (k === 'lk-calculator-notebooks-v3' && v && Array.isArray(v.entries)) for (const e of v.entries) { if (!e || typeof e.tool !== 'string') continue; if (e.tool === 'plan') plans++; else calculs++; }
    }
    return { cases, calculs, plans, rubriques: Object.keys(rubriques || {}).length };
  }
  /* QR code (SVG) d'un texte ; null s'il dépasse la version QR_VERSION_MAX */
  function qrSvg(texte, Q) {
    Q = Q || global.qrcode; if (typeof Q !== 'function') return null;
    for (const niveau of ['M', 'L']) {
      let q; try { q = Q(0, niveau); q.addData(texte); q.make(); } catch (e) { continue; }
      const n = q.getModuleCount(); if (n > 4 * QR_VERSION_MAX + 17) continue;
      const m = 4, w = n + 2 * m; let d = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n;) { if (!q.isDark(r, c)) { c++; continue; } let k = c; while (k < n && q.isDark(r, k)) k++; d += 'M' + (c + m) + ' ' + (r + m) + 'h' + (k - c) + 'v1h-' + (k - c) + 'z'; c = k; }
      return { svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + w + '" role="img" aria-label="QR code do link de transferência" shape-rendering="crispEdges"><rect width="' + w + '" height="' + w + '" fill="#fff"/><path d="' + d + '" fill="currentColor"/></svg>', modules: n, niveau };
    }
    return null;
  }
  const api = { FORMAT, MAGIE, LIMITE_LIEN, LIMITE_DONNEES, QR_VERSION_MAX, crc32, b64url, deb64url, encoder, decoder, chargeDe, lienDe, compter, qrSvg };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.LKTransfert = api;
  if (typeof document === 'undefined') return;

  /* ---------- page ---------- */
  const $ = (sel, root) => (root || document).querySelector(sel), $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const pl = n => /^fr/.test(document.documentElement.lang || 'fr') ? n > 1 : n !== 1; /* pluriel selon la langue de la page */
  const nf = n => new Intl.NumberFormat('pt-BR').format(n);
  const MESSAGES = {
    'E_ABIME': 'Este link de transferência está danificado ou incompleto: copie-o de novo por inteiro, ou use o arquivo.',
    'E_TAILLE': 'Este acompanhamento é grande demais para passar por um link: use o arquivo (“Exportar meu progresso” e depois “Importar um arquivo”).',
    'E_VERSION': 'Este link vem de uma versão mais recente do site: recarregue a página e depois abra o link de novo.',
    'E_ORIGINE': 'Este link foi criado em um endereço diferente deste site: abra-o onde você o criou, ou use o arquivo.',
    'E_NAVIGATEUR': 'Seu navegador não consegue ler este link: use o arquivo (“Exportar meu progresso” e depois “Importar um arquivo”).',
    'E_STOCKAGE': 'O armazenamento deste navegador está indisponível: seu acompanhamento não pode ser lido nem salvo aqui.'
  };
  const message = e => (e && e.code && MESSAGES[e.code]) || (e && e.message) || MESSAGES.E_ABIME;
  const NOMS = { lk_own_vehicules: 'Veículos marcados', lk_own_armes: 'Armas marcadas', lk_map_found: 'Lugares descobertos', lk_own_equipements: 'Equipamentos obtidos', lk_own_munitions: 'Tipos de munição obtidos', lk_own_consommables: 'Consumíveis provados', lk_own_coiffures: 'Cortes de cabelo experimentados', lk_own_tatouages: 'Tatuagens feitas', lk_own_tenues: 'Trajes e acessórios usados', 'lk_own_perso-vehicules': 'Modificações de veículo instaladas', 'lk_own_perso-armes': 'Modificações de arma instaladas', lk_progression_v2: 'Conteúdos documentados marcados', lk_collectibles_v1: 'Colecionáveis encontrados, favoritos e notas', 'lk-calculator-notebooks-v3': 'Cálculos e planos salvos', 'lk-calculator-v1': 'Cálculo em andamento', 'lk-calculator-favorites-v1': 'Fichas favoritas', lk_stock_v1: 'Estoques (consumíveis, munição)', lk_wish_v1: 'Lista de desejos', lk_journal_v1: 'Diário de conquistas' };
  function puces(n) {
    const l = [];
    if (n.cases) l.push((pl(n.cases) ? '{n} caixas marcadas' : '{n} caixa marcada').replace('{n}', nf(n.cases)));
    if (n.calculs) l.push((pl(n.calculs) ? '{n} cálculos' : '{n} cálculo').replace('{n}', nf(n.calculs)));
    if (n.plans) l.push((pl(n.plans) ? '{n} plans' : '{n} plan').replace('{n}', nf(n.plans)));
    l.push((pl(n.rubriques) ? '{n} seções no total' : '{n} seção no total').replace('{n}', nf(n.rubriques)));
    return l;
  }
  function ecrireResume(el, intro, n) {
    el.textContent = intro + ' ';
    puces(n).forEach((t, i) => { if (i) el.append(' · '); const b = document.createElement('b'); b.textContent = t; el.append(b); });
  }
  /* le suivi de cet appareil (progression-core.js et ses données, chargés à la demande sur la page compagnon) */
  let magasin = null;
  async function suivi() {
    if (magasin) return magasin;
    if (!global.LKProgression) {
      const L = global.LK; if (!L || !L.lazyScript) throw erreur('E_STOCKAGE');
      await Promise.all(['progression-data.js', 'acquisitions-data.js', 'collectibles-data.js'].map(n => L.lazyScript(n).catch(() => {})));
      await L.lazyScript('progression-core.js');
    }
    let storage = null; try { storage = global.localStorage; storage.setItem('lk_probe', '1'); storage.removeItem('lk_probe'); } catch (e) { throw erreur('E_STOCKAGE'); }
    magasin = global.LKProgression.create({ storage, acquisitions: global.LK_ACQUISITIONS, ids: global.LK_PROGRESS_IDS, collectibles: (global.LK_COLLECTIBLES && global.LK_COLLECTIBLES.items) || [] });
    return magasin;
  }
  const pageCompagnon = () => new URL('compagnon.html', location.href.replace(/[^/]*$/, '')).href;

  /* ---------- envoyer : lien, QR code, copier, partager, agrandir ---------- */
  const dialogue = $('[data-tr-dialogue]');
  if (dialogue) {
    $('[data-tr-fermer]', dialogue).addEventListener('click', () => dialogue.close());
    dialogue.addEventListener('click', e => { if (e.target === dialogue) dialogue.close(); });
  }
  $$('[data-tr-envoi]').forEach(box => {
    /* les commandes cachées sans script apparaissent avec lui (page Progression : pas de compagnon.js) */
    $$('[data-cp-js]', box).forEach(el => { el.hidden = false; });
    const creer = $('[data-tr-creer]', box), res = $('[data-tr-resultat]', box), resume = $('[data-tr-resume]', box), qr = $('[data-tr-qr]', box);
    const champ = $('[data-tr-lien]', box), copier = $('[data-tr-copier]', box), partager = $('[data-tr-partager]', box), agrandir = $('[data-tr-agrandir]', box), msg = $('[data-tr-msg]', box);
    let lien = '', dessin = null;
    if (!creer) return;
    creer.addEventListener('click', async () => {
      creer.disabled = true; msg.textContent = 'Preparando o link…';
      try {
        const s = await suivi(), out = s.exportData(), n = compter(out.data);
        if (!n.rubriques) { res.hidden = true; msg.textContent = 'Nada para transferir por enquanto: seu acompanhamento está vazio neste aparelho.'; return; }
        const { charge } = await encoder(out, location.origin);
        if (charge.length > LIMITE_LIEN) { res.hidden = true; msg.textContent = MESSAGES.E_TAILLE; return; }
        lien = lienDe(pageCompagnon(), charge); champ.value = lien;
        ecrireResume(resume, 'Este link leva:', n);
        dessin = null; qr.textContent = '';
        const trop = $('.cp-qr-trop', box); if (trop) trop.remove();
        try { if (!global.qrcode && global.LK && global.LK.lazyScript) await global.LK.lazyScript('qrcode-generator.js'); dessin = qrSvg(lien); } catch (e) { dessin = null; }
        if (dessin) qr.innerHTML = dessin.svg;
        else { const p = document.createElement('p'); p.className = 'cp-qr-trop'; p.textContent = 'Seu acompanhamento é grande demais para um QR code: copie o link, ou use o arquivo.'; qr.after(p); }
        if (agrandir) agrandir.hidden = !dessin || !dialogue || typeof dialogue.showModal !== 'function';
        if (partager) partager.hidden = typeof navigator.share !== 'function';
        res.hidden = false;
        if (global.LKMotion && global.LKMotion.enter) global.LKMotion.enter(Array.from(res.children));
        msg.textContent = 'Link pronto: abra-o no outro aparelho.';
      } catch (e) { res.hidden = true; msg.textContent = message(e); }
      finally { creer.disabled = false; }
    });
    if (copier) copier.addEventListener('click', () => { if (!lien) return; if (global.LK && global.LK.copy) global.LK.copy(lien, copier, 'Copiado'); else { champ.select(); } });
    if (champ) champ.addEventListener('focus', () => champ.select());
    if (partager) partager.addEventListener('click', () => { if (lien && navigator.share) navigator.share({ title: 'Leonidakit', text: 'Meu acompanhamento Leonidakit', url: lien }).catch(() => {}); });
    if (agrandir) agrandir.addEventListener('click', () => { if (!dessin || !dialogue) return; $('[data-tr-qr-grand]', dialogue).innerHTML = dessin.svg; dialogue.showModal(); });
  });

  /* ---------- recevoir : lien ouvert ou fichier choisi (page compagnon) ---------- */
  const zone = $('[data-tr-reception]');
  if (!zone) return;
  const apercu = $('[data-tr-apercu]', zone), detail = $('[data-tr-detail]', zone), rubriques = $('[data-tr-rubriques]', zone), problemes = $('[data-tr-problemes]', zone);
  const choix = $('[data-tr-choix]', zone), note = $('[data-tr-choix-note]', zone), msgRecu = $('[data-tr-recu-msg]', zone), suite = $('[data-tr-suite]', zone), titre = $('[data-tr-recu-titre]', zone);
  let plan = null;
  const nettoyer = () => { if (/^#transfert=/.test(location.hash)) try { history.replaceState(history.state, '', location.pathname + location.search); } catch (e) { /* adresse laissée */ } };
  function ouvrir() {
    zone.hidden = false; zone.removeAttribute('data-tr-etat'); choix.hidden = true; note.hidden = true; detail.hidden = true; suite.hidden = true; msgRecu.textContent = '';
    if (global.LKMotion && global.LKMotion.enter) global.LKMotion.enter([zone]);
    try { zone.scrollIntoView({ block: 'start', behavior: 'auto' }); titre.focus({ preventScroll: true }); } catch (e) { /* rien */ }
  }
  function refuser(texte) { plan = null; zone.dataset.trEtat = 'refus'; apercu.textContent = texte; choix.hidden = true; note.hidden = true; detail.hidden = true; }
  function montrer(p, viaFichier) {
    plan = p; const n = compter(p.rubrics);
    const date = p.exportedAt ? new Date(p.exportedAt) : null, jour = date && !isNaN(date) ? date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    ecrireResume(apercu, (viaFichier ? (jour ? 'Este arquivo contém seu acompanhamento de {date}:' : 'Este arquivo contém um acompanhamento Leonidakit:') : (jour ? 'Este link contém seu acompanhamento de {date}:' : 'Este link contém um acompanhamento Leonidakit:')).replace('{date}', jour), n);
    rubriques.textContent = ''; for (const k of Object.keys(p.rubrics)) { const li = document.createElement('li'); li.textContent = NOMS[k] || k; rubriques.append(li); }
    problemes.hidden = !p.issues.length; problemes.textContent = p.issues.length ? 'Bom saber: ' + p.issues.join(' · ') : '';
    detail.hidden = false; choix.hidden = false; note.hidden = false;
    msgRecu.textContent = 'Escolha: mesclar, substituir ou cancelar. Nada é salvo antes da sua escolha.';
  }
  async function recevoirLien(charge) {
    ouvrir(); apercu.textContent = 'Lendo o link…';
    try { const { json } = await decoder(charge, location.origin); const s = await suivi(); montrer(s.prepareImport(json), false); }
    catch (e) { refuser(message(e)); nettoyer(); }
  }
  [['[data-tr-fusionner]', 'merge'], ['[data-tr-remplacer]', 'replace']].forEach(([sel, mode]) => $(sel, zone).addEventListener('click', async () => {
    if (!plan) return;
    try {
      const s = await suivi(), r = s.applyImport(plan, mode), k = r.written.length;
      plan = null; choix.hidden = true; note.hidden = true; suite.hidden = false;
      msgRecu.textContent = (mode === 'merge' ? (pl(k) ? '{n} seções mescladas: seu acompanhamento está neste aparelho.' : '{n} seção mesclada: seu acompanhamento está neste aparelho.') : (pl(k) ? '{n} seções substituídas: seu acompanhamento está neste aparelho.' : '{n} seção substituída: seu acompanhamento está neste aparelho.')).replace('{n}', nf(k));
    } catch (e) { msgRecu.textContent = 'Importação cancelada: o armazenamento do navegador recusou a gravação. Nada foi alterado.'; }
    nettoyer();
  }));
  $('[data-tr-annuler]', zone).addEventListener('click', () => { plan = null; choix.hidden = true; note.hidden = true; detail.hidden = true; msgRecu.textContent = 'Nada foi modificado.'; nettoyer(); });

  /* fichier (export et import existants) */
  const exporter = $('[data-tr-exporter]'), fichier = $('[data-tr-fichier]'), msgFichier = $('[data-tr-fichier-msg]'), importer = $('[data-tr-importer]');
  /* un vrai bouton (atteignable au clavier) ouvre le choix du fichier */
  if (importer && fichier) importer.addEventListener('click', () => fichier.click());
  if (exporter) exporter.addEventListener('click', async () => {
    try {
      const out = (await suivi()).exportData(), n = Object.keys(out.data).length;
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' })); a.download = 'leonidakit-suivi-' + new Date().toISOString().slice(0, 10) + '.json'; document.body.appendChild(a); a.click(); a.remove();
      msgFichier.textContent = n ? (pl(n) ? '{n} seções exportadas (versão 2).' : '{n} seção exportada (versão 2).').replace('{n}', nf(n)) : 'Nada para exportar por enquanto.';
    } catch (e) { msgFichier.textContent = message(e); }
  });
  if (fichier) fichier.addEventListener('change', () => {
    const f = fichier.files && fichier.files[0]; if (!f) return;
    if (f.size > LIMITE_DONNEES) { msgFichier.textContent = 'Este arquivo é grande demais para um acompanhamento Leonidakit.'; fichier.value = ''; return; }
    const lecteur = new FileReader();
    lecteur.onload = async () => { ouvrir(); try { montrer((await suivi()).prepareImport(String(lecteur.result || '')), true); msgFichier.textContent = ''; } catch (e) { refuser(message(e)); } fichier.value = ''; };
    lecteur.onerror = () => { msgFichier.textContent = 'Não foi possível ler este arquivo.'; fichier.value = ''; };
    lecteur.readAsText(f);
  });

  const charge = chargeDe(location.hash);
  if (charge !== null) recevoirLien(charge);
  window.addEventListener('hashchange', () => { const c = chargeDe(location.hash); if (c !== null) recevoirLien(c); });
})(typeof window !== 'undefined' ? window : globalThis);
