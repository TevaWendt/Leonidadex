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
  const waiting='Noch zu bestätigen';
  /* v7.50 (lot 3) : mêmes états vides que les fiches documentaires (modèle commun) : « Prix à venir », « Achat à confirmer »,
     « Emplacement à venir », coûts d’usage « mécanique non confirmée » ; le terrain est déduit du type et dit comme tel. */
  const terrain=x=>x.cat==='bateau'?'Wasser (aus dem Typ abgeleitet)':x.cat==='avion'||x.cat==='helicoptere'?'Luft (aus dem Typ abgeleitet)':'Straße (aus dem Typ abgeleitet)';
  const fields=[...(type==='vehicules'?[['Hersteller',x=>x.marque]]:[]),['Kategorie',x=>cats[x.cat]],['Status',x=>statuses[x.st]],['Quelle',x=>x.src],['Reale Inspiration',x=>x.insp||x.fam],...(type==='armes'?[['Trageweise',x=>x.slot==='longue'?'Langwaffe':'Handfeuerwaffe'],['Geschätzte Reichweite',x=>x.portee],['Munition',x=>x.mun],['Ultimate Edition',x=>x.ue?'Ja':'Nicht angegeben']]:[['Edition',x=>x.edition==='Pre-Order'?'Vorbestellerbonus':x.edition||'Standard']]),['Preis',()=>'Preis folgt'],['Kaufbar',()=>'Kauf noch unbestätigt'],[type==='armes'?'Wo man sie findet':'Wo man es findet',()=>'Ort folgt'],...(type==='armes'?[['Munitionskosten',()=>'Mechanik unbestätigt'],...['Schaden','Feuerrate','Präzision'].map(x=>[x,()=>waiting])]:[['Untergrund',terrain],['Laufende Kosten (Sprit, Wartung)',()=>'Mechanik unbestätigt'],...['Höchstgeschwindigkeit','Beschleunigung','Sitzplätze'].map(x=>[x,()=>waiting])])];
  /* v7.61 : le type affiché est un libellé (traduit), distinct de l'identifiant « type » des adresses */
  const typeLabel=type==='vehicules'?'Fahrzeuge':'armes';
  document.getElementById('cmp-type-lbl').textContent=type==='armes'?'Vergleich · Waffen':'Vergleich · Fahrzeuge';
  document.getElementById('cmp-back').href=type+'.html';
  const sw=document.getElementById('cmp-switch');sw.textContent=type==='armes'?'Zu den Fahrzeugen wechseln':'Zu den Waffen wechseln';sw.href='comparateur.html?type='+(type==='armes'?'vehicules':'armes');
  const pick=document.getElementById('cmp-pick'),table=document.getElementById('cmp-table');
  const selects=ids.map((id,k)=>{const s=document.createElement('select');s.setAttribute('aria-label','Spalte '+(k+1));s.add(new Option(type==='armes'?'Waffe wählen':'Fahrzeug wählen',''));list.slice().sort((a,b)=>name(a).localeCompare(name(b),'fr')).forEach(x=>s.add(new Option(name(x),x.id)));s.value=id;s.addEventListener('change',()=>{ids[k]=s.value;render();});pick.appendChild(s);return s;});
  function render(){
    selects.forEach((s,k)=>Array.from(s.options).forEach(o=>{o.disabled=!!o.value && ids.some((v,j)=>j!==k && v===o.value);}));
    table.replaceChildren();const caption=table.createCaption();caption.textContent=type==='armes'?'Vergleich der ausgewählten Waffen':'Vergleich der ausgewählten Fahrzeuge';
    const cols=ids.filter(Boolean).map(id=>byId.get(id));
    if(cols.length){const header=table.createTHead().insertRow();let c=document.createElement('th');c.scope='col';c.textContent='Kriterium';header.appendChild(c);cols.forEach(x=>{const th=document.createElement('th');th.scope='col';const a=document.createElement('a');a.href=type+'/'+x.id+'.html';a.textContent=name(x);th.appendChild(a);header.appendChild(th);});const body=table.createTBody();fields.forEach(([label,get])=>{const row=body.insertRow(),th=document.createElement('th');th.scope='row';th.textContent=label;row.appendChild(th);const vals=cols.map(x=>get(x)||'Nicht angegeben');const diff=new Set(vals).size>1;vals.forEach(v=>{const td=row.insertCell();td.textContent=v;if(diff)td.className='diff';});});}
    else table.createTBody().insertRow().insertCell().textContent='Wähle oben mindestens eine Seite.';
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
  document.getElementById('cmp-share').addEventListener('click',function(){window.LK.copy(location.href,this,'Link kopiert');});render();
})();
