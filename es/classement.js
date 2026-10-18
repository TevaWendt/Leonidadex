/* Généré depuis outils/sources/classement.js : modifie la source, pas ce fichier. */
(function(){
  'use strict';
  const V = window.LK_VEHICULES || [], C = window.LK_VEHICULES_CATS || {};
  const par = Object.create(null); V.forEach(v => par[v.id] = v);
  const KEY = 'lk_classement';
  const liste = document.getElementById('cl-liste'), vide = document.getElementById('cl-vide');
  const sel = document.getElementById('cl-sel'), count = document.getElementById('cl-count');
  let ordre = [];
  sel.replaceChildren(new Option('Añadir un vehículo',''));
  V.slice().sort((a,b)=>((a.marque||'')+a.nom).localeCompare((b.marque||'')+b.nom,'fr')).forEach(v=>sel.add(new Option((v.marque && v.marque!=='Marca desconocida'?v.marque+' ':'')+v.nom,v.id)));
  function enregistre(){
    try { return [...new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))].filter(id => Object.hasOwn(par,id)).slice(0,10); } catch(e){ return []; }
  }
  function partage(){
    const m = location.hash.match(/^#top=([\w,-]+)$/);
    return m ? [...new Set(m[1].split(','))].filter(id => Object.hasOwn(par,id)).slice(0, 10) : null;
  }
  function appliquerPartage(){
    const p = partage(); if(!p || !p.length) return false;
    const mien = enregistre();
    const memes = mien.length === p.length && mien.every((x, i) => x === p[i]);
    if(mien.length && !memes && !confirm('Este enlace contiene otra clasificación. ¿Sustituir la tuya?')){
      history.replaceState(null, '', location.pathname); return false;
    }
    ordre = p; ecrire(); history.replaceState(null, '', location.pathname); rendre(); return true;
  }
  function ecrire(){ window.LK.write(KEY,ordre); }
  function rendre(){
    liste.innerHTML = '';
    vide.style.display = ordre.length ? 'none' : 'block';
    ordre.forEach(function(id, i){
      const v = par[id]; if(!v) return;
      const li = document.createElement('li'); li.className = 'cl-item'; li.draggable = true; li.dataset.id = id;
      const nom = window.LK.esc((v.marque && v.marque!=='Marca desconocida' ? v.marque + ' ' : '') + v.nom);
      const img = v.thumb ? '<img src="' + v.thumb + '" alt="" loading="lazy"' + (/\.svg$/.test(v.thumb) ? ' class="cl-schema"' : '') + '>' : '';
      li.innerHTML = '<span class="cl-rang">' + (i+1) + '</span>' +
        '<span class="cl-img' + (img ? '' : ' cl-img--vide') + '">' + img + '</span>' +
        '<span class="cl-nom"><a href="vehicules/' + v.id + '.html">' + nom + '</a>' +
        '<em>' + (C[v.cat] || '') + '</em></span>' +
        '<span class="cl-actions">' +
          '<button type="button" data-up aria-label="Subir"><svg class="lk-chev lk-chev--up" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
          '<button type="button" data-down aria-label="Bajar"><svg class="lk-chev lk-chev--down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
          '<button type="button" data-del aria-label="Quitar">×</button></span>';
      liste.appendChild(li);
    });
    for(let i = ordre.length; i < 10; i++){
      const li = document.createElement('li'); li.className = 'cl-slot'; li.setAttribute('aria-hidden', 'true');
      li.innerHTML = '<span class="cl-rang">' + (i+1) + '</span><span class="cl-slot-txt">Puesto libre</span>';
      liste.appendChild(li);
    }
    if(count) count.textContent = ordre.length;
    document.querySelectorAll('[data-cl-add]').forEach(b => {
      const dedans = ordre.indexOf(b.dataset.clAdd) >= 0;
      b.disabled = dedans; b.classList.toggle('is-in', dedans);
      b.textContent = dedans ? 'Ya está en tu top 10' : 'Añadir a mi top 10';
    });
    Array.from(sel.options).forEach(o => { if(o.value) o.hidden = ordre.indexOf(o.value) >= 0; });
  }
  function deplacer(i, j){
    if(j < 0 || j >= ordre.length) return;
    const x = ordre.splice(i, 1)[0]; ordre.splice(j, 0, x); ecrire(); rendre();
  }
  liste.addEventListener('click', function(ev){
    const b = ev.target.closest('button'); if(!b) return;
    const li = b.closest('.cl-item'); const i = ordre.indexOf(li.dataset.id);
    const action=b.hasAttribute('data-up')?'up':b.hasAttribute('data-down')?'down':'del', id=li.dataset.id;
    if(b.hasAttribute('data-up')) deplacer(i, i-1);
    else if(b.hasAttribute('data-down')) deplacer(i, i+1);
    else if(b.hasAttribute('data-del')){ ordre.splice(i, 1); ecrire(); rendre(); }
    const retained=liste.querySelector('[data-id="'+id+'"] [data-'+action+']');
    (retained || liste.children[Math.min(i,ordre.length-1)]?.querySelector('[data-del]') || sel).focus();
  });
  let src = null;
  liste.addEventListener('dragstart', e => { const li = e.target.closest('.cl-item'); if(!li) return;
    src = li.dataset.id; li.classList.add('cl-drag'); e.dataTransfer.effectAllowed = 'move'; });
  liste.addEventListener('dragend', e => { const li = e.target.closest('.cl-item'); if(li) li.classList.remove('cl-drag'); src = null; });
  liste.addEventListener('dragover', e => { e.preventDefault();
    const li = e.target.closest('.cl-item'); if(!li || !src || li.dataset.id === src) return;
    const i = ordre.indexOf(src), j = ordre.indexOf(li.dataset.id);
    if(i<0 || j<0)return;
    ordre.splice(j, 0, ordre.splice(i, 1)[0]); ecrire();
    const moving=liste.querySelector('[data-id="'+src+'"]');
    liste.insertBefore(moving,i<j?li.nextSibling:li);
    Array.from(liste.children).forEach((item,k)=>item.querySelector('.cl-rang').textContent=k+1); });
  document.getElementById('cl-add').addEventListener('click', function(){
    const id = sel.value; if(!Object.hasOwn(par,id) || ordre.indexOf(id) >= 0) return;
    if(ordre.length >= 10){ this.textContent = 'Diez como máximo'; setTimeout(() => this.textContent = 'Añadir', 1400); return; }
    ordre.push(id); sel.value = ''; ecrire(); rendre();
  });
  document.querySelectorAll('[data-cl-add]').forEach(b => b.addEventListener('click', function(){
    const id = this.dataset.clAdd; if(!Object.hasOwn(par, id) || ordre.indexOf(id) >= 0) return;
    if(ordre.length >= 10){ const t = this.textContent; this.textContent = 'Diez como máximo'; setTimeout(() => { this.textContent = t; }, 1400); return; }
    ordre.push(id); ecrire(); rendre();
    const v = par[id]; window.LK.status('Añadido a tu top 10: ' + (v.marque && v.marque !== 'Marca desconocida' ? v.marque + ' ' : '') + v.nom + '.');
  }));
  document.getElementById('cl-raz').addEventListener('click', function(){
    if(ordre.length && !confirm('¿Vaciar tu clasificación?')) return;
    ordre = []; ecrire(); rendre();
  });
  document.getElementById('cl-share').addEventListener('click', function(){
    if(!ordre.length) return;
    const url = location.origin + location.pathname + '#top=' + ordre.join(',');
    window.LK.copy(url,this,'Enlace copiado');
  });
  ordre = enregistre();
  rendre();
  appliquerPartage();
  window.addEventListener('hashchange', appliquerPartage);
})();
(function () {
  const q = document.getElementById('cl-q'), sel = document.getElementById('cl-sel'), add = document.getElementById('cl-add');
  if (!q || !sel || !add) return;
  const all = Array.from(sel.options).map(o => ({ value: o.value, text: o.textContent, norm: o.textContent.replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'") }));
  function filtre() {
    const t = q.value.replace(/ß/g,'ss').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’‘]/g, "'").trim();
    const hits = t ? all.filter(o => o.norm.includes(t)) : all;
    sel.innerHTML = ''; hits.forEach(o => { const op = document.createElement('option'); op.value = o.value; op.textContent = o.text; sel.appendChild(op); });
    sel.size = t && hits.length ? Math.min(6, hits.length) : 0;
    add.textContent = t && hits.length ? 'Añadir ' + hits[0].text.replace(/\s*\(.*$/, '') : 'Añadir';
  }
  q.addEventListener('input', filtre);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); if (sel.options.length) { sel.selectedIndex = 0; add.click(); q.value = ''; filtre(); q.focus(); } } });
  sel.addEventListener('change', () => { add.textContent = 'Añadir ' + (sel.options[sel.selectedIndex] || { textContent: '' }).textContent.replace(/\s*\(.*$/, ''); });
})();
