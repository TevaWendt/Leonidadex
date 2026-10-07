(function(){
  'use strict';
  const params=new URLSearchParams(location.search),type=params.get('type')==='vehicules'?'vehicules':'armes';
  const list=type==='vehicules'?window.LK_VEHICULES:window.LK_ARMES;
  const cats=type==='vehicules'?window.LK_VEHICULES_CATS:window.LK_ARMES_CATS;
  const byId=new Map(list.map(x=>[x.id,x]));
  const ids=[...new Set((params.get('ids')||'').split(','))].filter(id=>byId.has(id)).slice(0,3);
  while(ids.length<3)ids.push('');
  const statuses={officiel:'Von Rockstar benannt',vu:'In offiziellem Material gesehen',comm:'Community-Identifizierung'};
  const name=x=>(x.marque && x.marque!=='Unbekannte Marke'?x.marque+' ':'')+x.nom;
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const waiting='Noch zu bestätigen';
  /* v7.50 (lot 3) : mêmes états vides que les fiches documentaires (modèle commun) : « Prix à venir », « Achat à confirmer »,
     « Emplacement à venir », coûts d’usage « mécanique non confirmée » ; le terrain est déduit du type et dit comme tel. */
  const terrain=x=>x.cat==='bateau'?'Wasser (aus dem Typ abgeleitet)':x.cat==='avion'||x.cat==='helicoptere'?'Luft (aus dem Typ abgeleitet)':'Straße (aus dem Typ abgeleitet)';
  const edition=x=>x.edition==='Pre-Order'?'Vorbestellerbonus':x.edition==='Ultimate Edition'?'Ultimate Edition':x.edition||'Standard';
  /* v7.69 : critères rangés par thème (identité, achat, jeu) ; ce qui n'est pas encore publié est marqué comme tel */
  const groups=[
    ['Was wir wissen',[...(type==='vehicules'?[['Hersteller',x=>x.marque]]:[]),['Kategorie',x=>cats[x.cat]],['Status',x=>statuses[x.st]],['Quelle',x=>x.src],['Reale Inspiration',x=>x.insp||x.fam],...(type==='armes'?[['Trageweise',x=>x.slot==='longue'?'Langwaffe':'Handfeuerwaffe'],['Geschätzte Reichweite',x=>x.portee],['Munition',x=>x.mun],['Ultimate Edition',x=>x.ue?'Ja':'Nicht angegeben']]:[['Edition',edition]])]],
    ['Der Kauf',[['Preis',()=>'Preis folgt'],['Kaufbar',()=>'Kauf noch unbestätigt'],[type==='armes'?'Wo man sie findet':'Wo man es findet',()=>'Ort folgt']]],
    ['Im Spiel, nach dem 19. November 2026',type==='armes'?[['Munitionskosten',()=>'Mechanik unbestätigt'],...['Schaden','Feuerrate','Präzision'].map(x=>[x,()=>waiting])]:[['Untergrund',terrain],['Laufende Kosten (Sprit, Wartung)',()=>'Mechanik unbestätigt'],...['Höchstgeschwindigkeit','Beschleunigung','Sitzplätze'].map(x=>[x,()=>waiting])]]
  ];
  const PENDING=new Set(['Preis folgt','Kauf noch unbestätigt','Ort folgt','Mechanik unbestätigt',waiting]);
  /* comparaisons toutes prêtes : des familles réelles du catalogue (aucun classement, aucun chiffre) */
  const QUICK=type==='vehicules'?[['Ultimate Edition',['grotti-cheetah-classic','declasse-mamba-gt','schyster-deviant']],['Gelände',['vapid-dominator-buggy','canis-kamacho','vapid-riata-classic']],['Auf dem Wasser',['shitzu-squalo','speedophile-seashark','shitzu-tropic']],['Zweiräder',['dinka-enduro','maibatsu-manchez','maibatsu-sanchez']]]
    :[['Benannte Handfeuerwaffen',['girardi-es9','klose-k17','hawk-little-morgan']],['Gewehre',['carabine','fusil-assaut','fusil-pompe']],['Nahkampf',['batte','club-golf','couteau-cran']]];
  /* v7.61 : le type affiché est un libellé (traduit), distinct de l'identifiant « type » des adresses */
  document.getElementById('cmp-type-lbl').textContent=type==='armes'?'Vergleich · Waffen':'Vergleich · Fahrzeuge';
  document.getElementById('cmp-back').href=type+'.html';
  document.querySelectorAll('[data-cmp-type]').forEach(a=>{if(a.dataset.cmpType===type)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  const pick=document.getElementById('cmp-pick'),table=document.getElementById('cmp-table'),empty=document.getElementById('cmp-empty'),quick=document.getElementById('cmp-quick');
  const sorted=list.slice().sort((a,b)=>name(a).localeCompare(name(b),'fr'));
  const cardClass=x=>'veh-thumb veh-thumb--'+(type==='armes'?'arm veh-thumb--':'')+x.cat;

  /* illustration d'une fiche : photo officielle ou schéma du site (véhicules), silhouette de l'arme (armes) */
  function art(x,small){
    if(type==='vehicules'){
      const t=x.thumb||'';
      if(!t)return '';
      if(/\.svg$/.test(t))return '<img class="veh-art veh-art--schema" src="'+esc(t)+'" width="240" height="120" alt="" decoding="async">';
      return '<img class="'+(small?'':'cmp-photo')+'" src="'+esc(t)+'" width="480" height="270" alt="" loading="lazy" decoding="async">';
    }
    return (window.LK_ARMES_SCHEMAS||{})[x.id]||'';
  }
  const isPhoto=x=>type==='vehicules'&&x.thumb&&!/\.svg$/.test(x.thumb);

  /* les trois colonnes : construites une fois (le choix garde le focus), remplies à chaque changement */
  const slots=ids.map((id,k)=>{
    const card=document.createElement('article');card.className='cmp-slot';
    card.innerHTML='<div class="cmp-slot-art"><span class="cmp-slot-n" aria-hidden="true">'+(k+1)+'</span><span class="cmp-slot-img"></span></div><div class="cmp-slot-body"><p class="cmp-slot-cat"></p><h3 class="cmp-slot-name"></h3><p class="cmp-slot-st" hidden></p><p class="cmp-slot-hint" hidden></p><div class="cmp-slot-row"></div></div>';
    const s=document.createElement('select');s.setAttribute('aria-label','Spalte '+(k+1));
    s.add(new Option(type==='armes'?'Waffe wählen':'Fahrzeug wählen',''));
    sorted.forEach(x=>s.add(new Option(name(x),x.id)));
    s.value=id;
    s.addEventListener('change',()=>{ids[k]=s.value;card.classList.remove('is-new');void card.offsetWidth;if(s.value)card.classList.add('is-new');render();});
    const x=document.createElement('button');x.type='button';x.className='cmp-slot-x';x.textContent='×';
    x.addEventListener('click',()=>{ids[k]='';s.value='';render();s.focus();});
    const row=card.querySelector('.cmp-slot-row');row.append(s,x);
    pick.appendChild(card);
    return {card,s,x};
  });

  function paintSlot(slot,k){
    const x=ids[k]?byId.get(ids[k]):null,card=slot.card,artBox=card.querySelector('.cmp-slot-art'),img=card.querySelector('.cmp-slot-img');
    card.classList.toggle('is-empty',!x);
    artBox.className='cmp-slot-art'+(x?' '+cardClass(x)+(isPhoto(x)?' veh-thumb--photo':''):'');
    img.innerHTML=x?art(x,false):'<span class="cmp-slot-plus">+</span>';
    card.querySelector('.cmp-slot-cat').textContent=x?(cats[x.cat]||''):'Spalte '+(k+1);
    const h=card.querySelector('.cmp-slot-name');
    if(x)h.innerHTML='<a href="'+type+'/'+esc(x.id)+'.html">'+esc(name(x))+'</a>';
    else h.textContent=type==='armes'?'Waffe wählen':'Fahrzeug wählen';
    const st=card.querySelector('.cmp-slot-st');st.hidden=!x;
    if(x){st.className='cmp-slot-st cmp-slot-st--'+x.st;st.textContent=statuses[x.st]||'';}
    const hint=card.querySelector('.cmp-slot-hint');hint.hidden=!!x;
    if(!x)hint.textContent='Aus der Liste oder mit einem fertigen Vergleich.';
    slot.x.hidden=!x;
    if(x)slot.x.setAttribute('aria-label','Entfernen '+name(x));
  }

  function cell(v){return PENDING.has(v)?'<span class="cmp-wait">'+esc(v)+'</span>':esc(v);}
  function render(){
    slots.forEach((slot,k)=>{
      Array.from(slot.s.options).forEach(o=>{o.disabled=!!o.value && ids.some((v,j)=>j!==k && v===o.value);});
      if(slot.s.value!==ids[k])slot.s.value=ids[k];
      paintSlot(slot,k);
    });
    table.replaceChildren();const caption=table.createCaption();caption.textContent=type==='armes'?'Vergleich der ausgewählten Waffen':'Vergleich der ausgewählten Fahrzeuge';
    const cols=ids.filter(Boolean).map(id=>byId.get(id));
    empty.hidden=cols.length>0;
    const header=table.createTHead().insertRow();let c=document.createElement('th');c.scope='col';c.textContent='Kriterium';header.appendChild(c);
    if(cols.length)cols.forEach(x=>{const th=document.createElement('th');th.scope='col';th.innerHTML='<span class="cmp-col"><span class="cmp-col-art '+cardClass(x)+'">'+art(x,true)+'</span></span>';const a=document.createElement('a');a.href=type+'/'+x.id+'.html';a.textContent=name(x);th.firstChild.appendChild(a);header.appendChild(th);});
    else [1,2,3].forEach(n=>{const th=document.createElement('th');th.scope='col';th.className='cmp-ghost-h';th.textContent='Spalte '+n;header.appendChild(th);});
    const span=1+(cols.length||3);
    groups.forEach(([title,fields])=>{
      const body=table.createTBody(),g=body.insertRow();g.className='cmp-group';const gh=document.createElement('th');gh.scope='colgroup';gh.colSpan=span;gh.textContent=title;g.appendChild(gh);
      fields.forEach(([label,get])=>{
        const row=body.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=label;row.appendChild(th);
        if(!cols.length){for(let n=0;n<3;n++)row.insertCell().innerHTML='<span class="cmp-ghost"></span>';return;}
        const vals=cols.map(x=>get(x)||'Nicht angegeben');const diff=cols.length>1&&new Set(vals).size>1;
        vals.forEach(v=>{const td=row.insertCell();td.innerHTML=cell(v);if(diff)td.className='diff';});
      });
    });
    quick.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ids===ids.filter(Boolean).join(','))));
    const calculator = document.getElementById('cmp-calculator');
    const calculatorLink = document.getElementById('cmp-calculator-link');
    if (calculator && calculatorLink) {
      calculator.hidden = cols.length === 0;
      const calculatorQuery = new URLSearchParams({ tool: 'compare', type, ids: ids.filter(Boolean).join(','), from: 'comparateur' });
      calculatorLink.href = 'calculateurs.html?' + calculatorQuery.toString() + '#atelier';
      /* v7.54 : le lien « Lequel puis-je acheter ? » de la v7.47 (Mes achats, un achat à la fois) revient à côté de « Quel achat choisir ? ». */
      const purchaseLink = document.getElementById('cmp-purchase-link');
      if (purchaseLink) { const q = new URLSearchParams({ tool: 'purchase', type, ids: ids.filter(Boolean).join(','), from: 'comparateur' }); purchaseLink.href = 'calculateurs.html?' + q.toString() + '#atelier'; }
    }
    const query=new URLSearchParams({type});if(ids.some(Boolean))query.set('ids',ids.filter(Boolean).join(','));history.replaceState(null,'','comparateur.html?'+query.toString());
  }

  QUICK.forEach(([label,set])=>{
    const ok=set.filter(id=>byId.has(id));if(ok.length<2)return;
    const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.ids=ok.join(',');
    b.addEventListener('click',()=>{for(let k=0;k<3;k++)ids[k]=ok[k]||'';slots.forEach(s=>{s.card.classList.remove('is-new');void s.card.offsetWidth;s.card.classList.add('is-new');});render();});
    quick.appendChild(b);
  });
  document.getElementById('cmp-share').addEventListener('click',function(){window.LK.copy(location.href,this,'Link kopiert');});render();
})();
