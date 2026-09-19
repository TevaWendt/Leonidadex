(function(){
  'use strict';
  const V = window.LK_VEHICULES || [], C = window.LK_VEHICULES_CATS || {};
  const par = Object.create(null); V.forEach(v => par[v.id] = v);
  const KEY = 'lk_classement';
  const liste = document.getElementById('cl-liste'), vide = document.getElementById('cl-vide');
  const sel = document.getElementById('cl-sel');
  let ordre = [];
  sel.replaceChildren(new Option('Ajouter un véhicule',''));
  V.slice().sort((a,b)=>((a.marque||'')+a.nom).localeCompare((b.marque||'')+b.nom,'fr')).forEach(v=>sel.add(new Option((v.marque && v.marque!=='Marque inconnue'?v.marque+' ':'')+v.nom,v.id)));

  function enregistre(){
    try { return [...new Set(JSON.parse(localStorage.getItem(KEY) || '[]'))].filter(id => Object.hasOwn(par,id)).slice(0,10); } catch(e){ return []; }
  }
  function partage(){
    const m = location.hash.match(/^#top=([\w,-]+)$/);
    return m ? [...new Set(m[1].split(','))].filter(id => Object.hasOwn(par,id)).slice(0, 10) : null;
  }
  /* Un lien partagé ne doit jamais effacer sans prévenir un classement déjà enregistré. */
  function appliquerPartage(){
    const p = partage(); if(!p || !p.length) return false;
    const mien = enregistre();
    const memes = mien.length === p.length && mien.every((x, i) => x === p[i]);
    if(mien.length && !memes && !confirm('Ce lien contient un autre classement. Remplacer le vôtre ?')){
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
      const nom = window.LK.esc((v.marque && v.marque!=='Marque inconnue' ? v.marque + ' ' : '') + v.nom);
      const img = v.thumb ? '<img src="' + v.thumb + '" alt="" loading="lazy"' + (/\.svg$/.test(v.thumb) ? ' class="cl-schema"' : '') + '>' : '';
      li.innerHTML = '<span class="cl-rang">' + (i+1) + '</span>' +
        '<span class="cl-img' + (img ? '' : ' cl-img--vide') + '">' + img + '</span>' +
        '<span class="cl-nom"><a href="vehicules/' + v.id + '.html">' + nom + '</a>' +
        '<em>' + (C[v.cat] || '') + '</em></span>' +
        '<span class="cl-actions">' +
          '<button type="button" data-up aria-label="Monter">↑</button>' +
          '<button type="button" data-down aria-label="Descendre">↓</button>' +
          '<button type="button" data-del aria-label="Retirer">×</button></span>';
      liste.appendChild(li);
    });
    /* le menu n'affiche plus ce qui est déjà classé */
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

  /* glisser-déposer */
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
    if(ordre.length >= 10){ this.textContent = 'Dix maximum'; setTimeout(() => this.textContent = 'Ajouter', 1400); return; }
    ordre.push(id); sel.value = ''; ecrire(); rendre();
  });
  document.getElementById('cl-raz').addEventListener('click', function(){
    if(ordre.length && !confirm('Vider votre classement ?')) return;
    ordre = []; ecrire(); rendre();
  });
  document.getElementById('cl-share').addEventListener('click', function(){
    if(!ordre.length) return;
    const url = location.origin + location.pathname + '#top=' + ordre.join(',');
    window.LK.copy(url,this,'Lien copié');
  });

  ordre = enregistre();
  rendre();
  appliquerPartage();
  /* lien collé alors que la page est déjà ouverte */
  window.addEventListener('hashchange', appliquerPartage);
})();
