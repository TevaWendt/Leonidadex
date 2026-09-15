const fs=require('fs');
process.chdir(__dirname);
let V=JSON.parse(fs.readFileSync('v-corrige.json','utf8'));

/* ---------- lien vers le modèle réel, recalculé sur l'inspiration corrigée ---------- */
const cible=v=>{ const t=v.insp||v.fam; if(!t) return null;
  return t.replace(/;.*$/,'').split(/,| et | and /)[0]
   .replace(/\b(1st|2nd|3rd|4th|5th|first|second|third|fourth|fifth|generation|gen|late|early)\b/gi,'')
   .replace(/\b(premi[eè]re|deuxi[eè]me|troisi[eè]me|quatri[eè]me|cinqui[eè]me|sixi[eè]me|septi[eè]me|g[eé]n[eé]ration|anciennement|plusieurs variantes|depuis|pr[eé]par[eé]e?|livr[eé]e|avec des touches de|type|fa[cç]on)\b/gi,'')
   .replace(/\b(19|20)\d\d-(19|20)?\d\d\b/g,'')
   .replace(/\s{2,}/g,' ').replace(/\s+,/g,',').trim().replace(/[,\s]+$/,''); };
V.forEach(v=>{ if(Array.isArray(v.vues)){v.vuesDeclarees=v.vues;v.vues=v.vues.filter(view=>fs.existsSync('img/vehicules/'+v.id+'-'+view+'.jpg'));} const c=cible(v);
  if(c){ v.reel='https://www.google.com/search?tbm=isch&q='+encodeURIComponent(c); v.reelNom=c; }
  else { delete v.reel; delete v.reelNom; }
  v.search=[v.marque,v.nom,v.alias,v.insp||v.fam].filter(Boolean).join(' ')
    .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
});

/* ---------- origine du modèle réel ---------- */
const M={japonais:['toyota','nissan','honda','subaru','mitsubishi','mazda','yamaha','suzuki','kawasaki','lexus','datsun','isuzu','infiniti','acura','skyline','civic','corolla','camry','impreza','hilux','eclipse','ae86','crx'],
 europeen:['ferrari','lamborghini','porsche','bmw','mercedes','audi','bentley','aston','jaguar','land rover','range rover','bugatti','pagani','maserati','alfa','vespa','ducati','piaggio','volkswagen','rolls-royce','lotus','mclaren','italdesign','pininfarina','frauscher','azimut','riva','sunseeker','bavaria','adjutor','agusta','de havilland'],
 americain:['cadillac','buick','chevrolet','chevelle','ford','dodge','chrysler','lincoln','pontiac','oldsmobile','amc','jeep','gmc','shelby','winnebago','grumman','cigarette','chris-craft','bayliner','sea ray','harley','lenco','boeing','stearman','cessna','bell','learjet','sea-doo','sea doo','mercury','freightliner','crownline','contender','tesla','corvette','mustang','camaro','charger','challenger','silverado','tahoe','bronco','malibu','impala','firebird','navigator','durango','cutlass','cougar','bonneville','fairlane','f-150','f-250','f250','raptor','astro','safari','chieftain','javelin','riviera','eldorado','cullinan','sedan de ville','crescent','skater','chaparral','alumacraft','american']};
const LBL={americain:'Modèle américain',japonais:'Modèle japonais',europeen:'Modèle européen'};
V.forEach(v=>{ const t=(v.insp||v.fam||'').toLowerCase(); delete v.slot;
  for(const k of ['japonais','europeen','americain']) if(M[k].some(w=>t.includes(w))){ v.slot=k; break; } });

/* ---------- ordre ---------- */
const CATL={berline:'Berlines',sport:'Voitures de sport',supercar:'Supercars',muscle:'Muscle cars',
 suv:'SUV et 4x4',pickup:'Pickups et tout-terrain',van:'Vans et cargos',moto:'Deux-roues et quads',
 helicoptere:'Hélicoptères',avion:'Avions',bateau:'Bateaux et jet-skis',service:'Service et urgence',divers:'Divers'};
const ORDRE=Object.keys(CATL);
const tri=V.slice().sort((a,b)=>ORDRE.indexOf(a.cat)-ORDRE.indexOf(b.cat)
 ||(a.marque||'').localeCompare(b.marque||'','fr')||a.nom.localeCompare(b.nom,'fr'));

fs.writeFileSync('vehicules-data.js',
`/* ============================================================
   LEONIDAKIT — véhicules : sortie générée depuis v-corrige.json
     st      officiel / vu / comm
     insp    modèle réel, vérifié sur base de référence 13/09/2026
     edition Édition Ultimate ou bonus de précommande
     reel    lien vers le modèle réel, calculé par final.js
     slot    origine du modèle réel, sert au filtre
   Aucune donnée issue de fuites.
   ============================================================ */
window.LK_VEHICULES = `+JSON.stringify(tri)+';\nwindow.LK_VEHICULES_CATS = '+JSON.stringify(CATL)+';\n');

const n={}; V.forEach(v=>n[v.cat]=(n[v.cat]||0)+1);
const nSt={officiel:0,vu:0,comm:0}; V.forEach(v=>nSt[v.st]++);
const nSlot={}; V.forEach(v=>{if(v.slot)nSlot[v.slot]=(nSlot[v.slot]||0)+1;});
console.log('véhicules      : '+V.length);
console.log('liens modèle   : '+V.filter(v=>v.reel).length);
console.log('éditions       : '+V.filter(v=>v.edition).length);
console.log('statuts        : officiel '+nSt.officiel+' · vu '+nSt.vu+' · comm '+nSt.comm);
console.log('origine        : '+Object.entries(nSlot).map(([k,x])=>k+' '+x).join(' · ')+' · non classés '+V.filter(v=>!v.slot).length);
console.log('catégories     : '+ORDRE.map(c=>c+' '+(n[c]||0)).join(' · '));
