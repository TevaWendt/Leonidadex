const fs=require('fs');
process.chdir(__dirname);
const V=JSON.parse(fs.readFileSync('v-corrige.json','utf8'));
const MARQUES=['Chevrolet','Ford','Dodge','Chrysler','Cadillac','Buick','Pontiac','Oldsmobile','Lincoln','GMC','Jeep','AMC','Toyota','Nissan','Honda','Mazda','Subaru','Mitsubishi','Suzuki','Yamaha','Kawasaki','Lexus','Ferrari','Lamborghini','Porsche','BMW','Mercedes','Audi','Bentley','Aston','Jaguar','Bugatti','Pagani','Maserati','Alfa','Volkswagen','Rolls-Royce','Lotus','McLaren','Hummer','Ram','Harley','Ducati','Vespa','Polaris','Hennessey','Lenco','Fleetwood','Winnebago','Can-Am','KTM','Contender','Riva','Azimut','Sunseeker','Bavaria','Cessna','Boeing','Bell','Eurocopter','Piper','Rexhall','International','Freightliner','Peterbilt','Mack'];
const out=[];
V.forEach(v=>{
  const ref=((v.insp||'')+' '+(v.fam||'')+' '+v.nom+' '+(v.marque||'')).toLowerCase();
  const cites=MARQUES.filter(m=>new RegExp('\\b'+m.replace('-','\\-')+'\\b','i').test(v.txt));
  const orphelines=cites.filter(m=>!ref.includes(m.toLowerCase()));
  if(orphelines.length) out.push({id:v.id,insp:v.insp||v.fam,o:orphelines});
});
console.log('Fiches dont le texte cite une marque absente de l\'inspiration : '+out.length+'\n');
out.forEach(o=>console.log(o.id.padEnd(32)+' insp: '+String(o.insp).slice(0,42).padEnd(44)+' texte cite: '+o.o.join(', ')));
