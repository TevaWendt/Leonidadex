(function(){
  'use strict';
  const params=new URLSearchParams(location.search),type=params.get('type')==='vehicules'?'vehicules':'armes';
  const list=type==='vehicules'?window.LK_VEHICULES:window.LK_ARMES;
  const cats=type==='vehicules'?window.LK_VEHICULES_CATS:window.LK_ARMES_CATS;
  const byId=new Map(list.map(x=>[x.id,x]));
  const ids=[...new Set((params.get('ids')||'').split(','))].filter(id=>byId.has(id)).slice(0,3);
  while(ids.length<3)ids.push('');
  const statuses={officiel:'Nommé par Rockstar',vu:'Vu dans un support officiel',comm:'Identification communautaire'};
  const name=x=>(x.marque && x.marque!=='Marque inconnue'?x.marque+' ':'')+x.nom;
  const waiting='Donnée non encore publiée';
  const fields=[...(type==='vehicules'?[['Constructeur',x=>x.marque]]:[]),['Catégorie',x=>cats[x.cat]],['Statut',x=>statuses[x.st]],['Source',x=>x.src],['Inspiration réelle',x=>x.insp||x.fam],...(type==='armes'?[['Emplacement',x=>x.slot==='longue'?'Arme longue':'Arme de poing'],['Portée estimée',x=>x.portee],['Munitions',x=>x.mun],['Édition Ultimate',x=>x.ue?'Oui':'Non indiquée']]:[['Édition',x=>x.edition==='Pre-Order'?'Bonus de précommande':x.edition||'Standard']]),...(type==='armes'?['Dégâts','Cadence','Précision']:['Vitesse de pointe','Accélération','Prix']).map(x=>[x,()=>waiting])];
  document.getElementById('cmp-type-lbl').textContent='Comparateur · '+type;
  document.getElementById('cmp-back').href=type+'.html';
  const sw=document.getElementById('cmp-switch');sw.textContent=type==='armes'?'Passer aux véhicules':'Passer aux armes';sw.href='comparateur.html?type='+(type==='armes'?'vehicules':'armes');
  const pick=document.getElementById('cmp-pick'),table=document.getElementById('cmp-table');
  const selects=ids.map((id,k)=>{const s=document.createElement('select');s.setAttribute('aria-label','Colonne '+(k+1));s.add(new Option('Choisir un '+(type==='armes'?'arme':'véhicule'),''));list.slice().sort((a,b)=>name(a).localeCompare(name(b),'fr')).forEach(x=>s.add(new Option(name(x),x.id)));s.value=id;s.addEventListener('change',()=>{ids[k]=s.value;render();});pick.appendChild(s);return s;});
  function render(){
    selects.forEach((s,k)=>Array.from(s.options).forEach(o=>{o.disabled=!!o.value && ids.some((v,j)=>j!==k && v===o.value);}));
    table.replaceChildren();const caption=table.createCaption();caption.textContent='Comparaison des '+type+' sélectionnés';
    const cols=ids.filter(Boolean).map(id=>byId.get(id));
    if(cols.length){const header=table.createTHead().insertRow();let c=document.createElement('th');c.scope='col';c.textContent='Critère';header.appendChild(c);cols.forEach(x=>{const th=document.createElement('th');th.scope='col';const a=document.createElement('a');a.href=type+'/'+x.id+'.html';a.textContent=name(x);th.appendChild(a);header.appendChild(th);});const body=table.createTBody();fields.forEach(([label,get])=>{const row=body.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=label;row.appendChild(th);const vals=cols.map(x=>get(x)||'Non indiqué');const diff=new Set(vals).size>1;vals.forEach(v=>{const td=row.insertCell();td.textContent=v;if(diff)td.className='diff';});});}
    else table.createTBody().insertRow().insertCell().textContent='Choisis au moins une fiche ci-dessus.';
    const query=new URLSearchParams({type});if(ids.some(Boolean))query.set('ids',ids.filter(Boolean).join(','));history.replaceState(null,'','comparateur.html?'+query.toString());
  }
  document.getElementById('cmp-share').addEventListener('click',function(){window.LK.copy(location.href,this,'Lien copié');});render();
})();
