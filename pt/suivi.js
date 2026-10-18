/* Généré depuis outils/sources/suivi.js : modifie la source, pas ce fichier. */
(function () {
  'use strict';
  const LK = window.LK; if (!LK) return;
  const FAMILIES = {
    vehicules:   { key: 'lk_own_vehicules',   label: 'Minha garagem',      done: 'obtidos',  page: 'vehicules.html', anchor: 'garage' },
    armes:       { key: 'lk_own_armes',       label: 'Meu arsenal',     done: 'obtidas', page: 'armes.html',     anchor: 'arsenal' },
    equipements: { key: 'lk_own_equipements', label: 'Meu equipamento',  done: 'obtidos',   page: 'armes.html#equipements', anchor: 'equipements' },
    munitions:   { key: 'lk_own_munitions',   label: 'Minhas munições',   done: 'obtidos',   page: 'armes.html#munitions',   anchor: 'munitions' },
    lieux:       { key: 'lk_map_found',       label: 'Lugares descobertos',   done: 'descobertos',   page: 'carte.html',     anchor: 'lieux', bt: ['Marcar como descoberto', 'Identificado'] } ,
    consommables:{ key: 'lk_own_consommables',label: 'Meus consumíveis',done: 'provados',    page: 'nourriture.html#liste-consommables', anchor: 'consommables' },
    coiffures:   { key: 'lk_own_coiffures',   label: 'Meus cortes de cabelo',   done: 'experimentados',  page: 'style.html#coiffures', anchor: 'coiffures' },
    tatouages:   { key: 'lk_own_tatouages',   label: 'Minhas tatuagens',   done: 'feitas',     page: 'style.html#tatouages', anchor: 'tatouages' },
    tenues:      { key: 'lk_own_tenues',      label: 'Meu guarda-roupa',   done: 'feitas',   page: 'style.html#tenues',    anchor: 'tenues' },
    'perso-vehicules': { key: 'lk_own_perso-vehicules', label: 'Minhas modificações de veículo', done: 'instaladas', page: 'personnalisations.html#perso-vehicules', anchor: 'perso-vehicules' },
    'perso-armes':     { key: 'lk_own_perso-armes',     label: 'Minhas modificações de arma',      done: 'instaladas', page: 'personnalisations.html#perso-armes',     anchor: 'perso-armes' }
  };
  const ID = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,99}$/;
  const listeners = new Set();
  const read = f => FAMILIES[f] ? LK.read(FAMILIES[f].key, {}, LK.own) : {};
  const write = (f, o) => FAMILIES[f] ? LK.write(FAMILIES[f].key, o) : false;
  function emit(f) { listeners.forEach(fn => { try { fn(f); } catch (_) {  } }); }
  function has(f, id) { return !!read(f)[id]; }
  function set(f, id, on) {
    if (!FAMILIES[f] || !ID.test(id)) return false;
    const o = read(f); if (on) o[id] = 1; else delete o[id];
    const ok = write(f, o); if (ok) emit(f); return ok;
  }
  function toggle(f, id) { return set(f, id, !has(f, id)); }
  function count(f, ids) { const o = read(f); return (ids || Object.keys(o)).filter(id => o[id]).length; }
  function list(f, ids) { const o = read(f); return (ids || Object.keys(o)).filter(id => o[id]); }
  window.addEventListener('storage', e => { const f = Object.keys(FAMILIES).find(k => FAMILIES[k].key === e.key); if (f) emit(f); });
  function bind(root) {
    root = root || document;
    const items = Array.from(root.querySelectorAll('[data-track][data-track-id]'));
    const bars = Array.from(root.querySelectorAll('[data-track-bar]'));
    if (!items.length && !bars.length) return;
    const byFam = {};
    items.forEach(el => {
      const f = el.dataset.track, id = el.dataset.trackId;
      if (!FAMILIES[f] || !ID.test(id)) return;
      (byFam[f] = byFam[f] || []).push(id);
      if (el.querySelector('.track-bt')) return;
      const name = el.dataset.trackName || (el.querySelector('b, h3, strong') || el).textContent.trim();
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'track-bt'; b.dataset.trackFor = id;
      const lbl = FAMILIES[f].bt || ['Tenho', 'Obtido'];
      b.innerHTML = '<span class="ck" aria-hidden="true"></span><span class="track-lbl">' + lbl[0] + '</span>';
      b.setAttribute('aria-label', lbl[0] + ': ' + name); b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); toggle(f, id); });
      el.classList.add('has-track'); el.appendChild(b);
    });
    bars.forEach(bar => { const f = bar.dataset.trackBar; if (!byFam[f] && FAMILIES[f]) byFam[f] = byFam[f] || []; });
    function refresh() {
      Object.keys(byFam).forEach(f => {
        const o = read(f), ids = byFam[f];
        root.querySelectorAll('[data-track="' + f + '"][data-track-id]').forEach(el => {
          const on = !!o[el.dataset.trackId]; el.classList.toggle('is-own', on);
          const b = el.querySelector('.track-bt');
          if (b) { const lbl = FAMILIES[f].bt || ['Tenho', 'Obtido']; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.querySelector('.track-lbl').textContent = on ? lbl[1] : lbl[0]; }
        });
        const n = ids.length ? ids.filter(id => o[id]).length : count(f);
        root.querySelectorAll('[data-track-bar="' + f + '"]').forEach(bar => {
          const b = bar.querySelector('b'); if (b) b.textContent = n;
          const t = bar.querySelector('.own-total'); if (t && ids.length) t.textContent = ids.length;
          const p = bar.querySelector('progress'); if (p) { if (ids.length) p.max = ids.length; p.value = n; }
        });
      });
    }
    bars.forEach(bar => {
      const f = bar.dataset.trackBar, raz = bar.querySelector('[data-raz]');
      if (raz && !raz.dataset.bound) { raz.dataset.bound = '1'; raz.addEventListener('click', () => { if (!FAMILIES[f] || !confirm('Esvaziar “{nom}” neste aparelho?'.replace('{nom}', FAMILIES[f].label))) return; if (write(f, {})) emit(f); }); }
    });
    listeners.add(refresh); refresh();
  }
  window.LKSuivi = { FAMILIES, read, write, has, set, toggle, count, list, subscribe: fn => { if (typeof fn === 'function') listeners.add(fn); return () => listeners.delete(fn); }, bind };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => bind()); else bind();
})();
