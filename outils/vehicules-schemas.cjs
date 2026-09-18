/* ============================================================
   LEONIDAKIT — vehicules-schemas.cjs : un schéma SVG par véhicule (vue de profil, avant à droite)
   Le type de carrosserie est choisi d'après l'inspiration réelle et la catégorie ; les proportions,
   la taille des roues, la hauteur de toit et les détails (aileron, barres de toit, gyrophare, bandes…)
   sont dérivés de chaque fiche, si bien que deux véhicules n'ont jamais le même dessin.
   viewBox 0 0 240 120, sol à y = 100. schema(vehicule, hauteurPx) renvoie la balise <svg>.
   ============================================================ */
'use strict';
const INK='#1A1A1E',HL='#FDFBF7';
const P=(d,o=1)=>`<path d="${d}" fill="${INK}"${o<1?` fill-opacity="${o}"`:''}/>`;
const H=(d,w=1.5,o=.55)=>`<path d="${d}" fill="none" stroke="${HL}" stroke-opacity="${o}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const G=(d,o=.22)=>`<path d="${d}" fill="${HL}" fill-opacity="${o}"/>`;       /* vitrage */
const R=(x,y,w,h,o=1)=>P(`M${x} ${y}h${w}v${h}h${-w}z`,o);
const C=(cx,cy,r,f=INK)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f}"/>`;
const HC=(cx,cy,r,w=1.5,o=.55)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${HL}" stroke-opacity="${o}" stroke-width="${w}"/>`;
const rnd=(n,d=1)=>Number(n.toFixed(d));
const hash=s=>{let h=2166136261;for(const c of s){h^=c.charCodeAt(0);h=Math.imul(h,16777619)>>>0;}return h;};
const jit=(seed,k,amp)=>((hash(seed+':'+k)%1000)/1000-.5)*2*amp;   /* variation déterministe dans [-amp, +amp] */

/* ---------- roues ---------- */
const wheel=(cx,cy,r,spokes=5)=>{let s=C(cx,cy,r)+HC(cx,cy,r*.62,1.6,.6)+C(cx,cy,r*.18,HL).replace('fill="'+HL+'"','fill="'+HL+'" fill-opacity=".6"');
  for(let i=0;i<spokes;i++){const a=i/spokes*Math.PI*2;s+=H(`M${rnd(cx+Math.cos(a)*r*.2)} ${rnd(cy+Math.sin(a)*r*.2)}L${rnd(cx+Math.cos(a)*r*.58)} ${rnd(cy+Math.sin(a)*r*.58)}`,1.4,.45);}
  return s;};
const knobby=(cx,cy,r)=>C(cx,cy,r)+HC(cx,cy,r*.55,1.6,.55)+H(Array.from({length:10},(_,i)=>{const a=i/10*Math.PI*2;return `M${rnd(cx+Math.cos(a)*r*.82)} ${rnd(cy+Math.sin(a)*r*.82)}L${rnd(cx+Math.cos(a)*r)} ${rnd(cy+Math.sin(a)*r)}`;}).join(''),2,.5);

/* ---------- voiture : géométrie par époque et par marque ----------
   o : {x0,x1,yb,yBelt,yRoof,roofA,roofB,yHood,hoodStart,style,wr,wa,wb,doors,era,brand,rim,extra:[]}
   era : classic50 | land70 | boxy80 | modern90 | modern | luxury | wedge   (forme du toit, des vitres et des feux)
   brand : signature de calandre et de phares (audi, bmw, mercedes, lexus, honda, toyota, chevrolet, ford, dodge, cadillac, lincoln, buick, pontiac, porsche, ferrari, lamborghini, jaguar, rolls, bentley, tesla, nissan, subaru, mitsubishi, vw, chrysler, generic) */
const RIMS={
  spoke:(cx,cy,r,n)=>{let s='';for(let i=0;i<n;i++){const a=i/n*Math.PI*2;s+=H(`M${rnd(cx+Math.cos(a)*r*.2)} ${rnd(cy+Math.sin(a)*r*.2)}L${rnd(cx+Math.cos(a)*r*.6)} ${rnd(cy+Math.sin(a)*r*.6)}`,1.5,.5);}return s;},
  split:(cx,cy,r,n)=>{let s='';for(let i=0;i<n;i++){const a=i/n*Math.PI*2,d=.09;s+=H(`M${rnd(cx+Math.cos(a-d)*r*.2)} ${rnd(cy+Math.sin(a-d)*r*.2)}L${rnd(cx+Math.cos(a-d)*r*.6)} ${rnd(cy+Math.sin(a-d)*r*.6)}M${rnd(cx+Math.cos(a+d)*r*.2)} ${rnd(cy+Math.sin(a+d)*r*.2)}L${rnd(cx+Math.cos(a+d)*r*.6)} ${rnd(cy+Math.sin(a+d)*r*.6)}`,1.1,.5);}return s;},
  mesh:(cx,cy,r)=>HC(cx,cy,r*.4,1,.45)+H(`M${cx-r*.5} ${cy}h${r}M${cx} ${cy-r*.5}v${r}M${cx-r*.36} ${cy-r*.36}L${cx+r*.36} ${cy+r*.36}M${cx+r*.36} ${cy-r*.36}L${cx-r*.36} ${cy+r*.36}`,1,.4),
  disc:(cx,cy,r)=>HC(cx,cy,r*.45,3,.35)+HC(cx,cy,r*.3,1,.4),
  steel:(cx,cy,r)=>HC(cx,cy,r*.5,4,.3)+`<circle cx="${cx}" cy="${cy}" r="${rnd(r*.28)}" fill="${HL}" fill-opacity=".45"/>`,
  wire:(cx,cy,r)=>{let s='';for(let i=0;i<14;i++){const a=i/14*Math.PI*2;s+=H(`M${rnd(cx+Math.cos(a)*r*.12)} ${rnd(cy+Math.sin(a)*r*.12)}L${rnd(cx+Math.cos(a+.5)*r*.62)} ${rnd(cy+Math.sin(a+.5)*r*.62)}`,.9,.45);}return s;}
};
const wheelR=(cx,cy,r,rim='spoke',n=5,white=false)=>C(cx,cy,r)+HC(cx,cy,r*.66,1.6,.6)+(white?HC(cx,cy,r*.86,2,.7):'')+C(cx,cy,r*.15,HL).replace('fill="'+HL+'"','fill="'+HL+'" fill-opacity=".55"')+(RIMS[rim]||RIMS.spoke)(cx,cy,r,n);

function grille(brand,x1,yHood,yb){const g=[];const top=yHood+7,bot=yb-8,mid=rnd((top+bot)/2);
  switch(brand){
    case 'audi':g.push(H(`M${x1-1} ${top}L${x1-1} ${bot-2}`,4,.45),H(`M${x1-3} ${top+4}h-3M${x1-3} ${top+8}h-3M${x1-3} ${top+12}h-3`,1,.5));break;
    case 'bmw':g.push(HC(x1-2,top+5,3,1.4,.6),HC(x1-2,top+12,3,1.4,.6));break;
    case 'mercedes':g.push(H(`M${x1-1} ${top}v${bot-top-4}`,3,.4),HC(x1-3,mid,3.2,1.2,.7),H(`M${x1-3} ${mid-3}v6M${x1-6} ${mid+1.5}L${x1} ${mid+1.5}`,1,.7));break;
    case 'lexus':g.push(H(`M${x1-1} ${top}L${x1-4} ${mid}L${x1-1} ${bot-2}`,2.4,.5));break;
    case 'honda':g.push(H(`M${x1-1} ${top+3}h-4`,3,.6),H(`M${x1-1} ${top+8}v${bot-top-10}`,2,.35));break;
    case 'toyota':g.push(H(`M${x1-1} ${mid}v${bot-mid-2}`,4,.4),H(`M${x1-1} ${top+3}h-3`,2,.5));break;
    case 'chevrolet':g.push(H(`M${x1-1} ${top+2}v5M${x1-1} ${top+10}v${bot-top-12}`,3,.45),H(`M${x1-4} ${top+8}h4`,2,.7));break;
    case 'ford':g.push(H(`M${x1-1} ${top+2}v${bot-top-4}`,3,.4),HC(x1-3,mid,2.4,1.2,.6));break;
    case 'dodge':g.push(H(`M${x1-1} ${top+2}v${bot-top-4}M${x1-5} ${mid}h5`,2.4,.5));break;
    case 'cadillac':g.push(H(`M${x1-1} ${top}v${bot-top}`,2,.5),H(`M${x1-4} ${top+2}v${bot-top-4}`,1,.4));break;
    case 'lincoln':g.push(H(`M${x1-1} ${top+3}h-6M${x1-1} ${top+7}h-6M${x1-1} ${top+11}h-6`,1.2,.5));break;
    case 'buick':g.push(H(`M${x1-1} ${top+2}v${bot-top-4}M${x1-3} ${top+3}v${bot-top-6}M${x1-5} ${top+4}v${bot-top-8}`,1,.45));break;
    case 'pontiac':g.push(H(`M${x1-1} ${top+2}v5M${x1-1} ${top+10}v5`,3,.5));break;
    case 'porsche':g.push(HC(x1-4,top+2,3.5,1.6,.7),H(`M${x1-2} ${bot-6}h-5`,2,.4));break;
    case 'ferrari':g.push(H(`M${x1-1} ${bot-8}h-8`,3,.4),H(`M${x1-3} ${top+1}h-6`,1.2,.5));break;
    case 'lamborghini':g.push(H(`M${x1-1} ${bot-9}L${x1-9} ${bot-9}L${x1-7} ${bot-4}L${x1-1} ${bot-4}Z`,1.2,.5));break;
    case 'jaguar':g.push(H(`M${x1-1} ${top+1}v${bot-top-2}`,4,.4),HC(x1-3,top+4,2,1,.6));break;
    case 'rolls':case 'bentley':g.push(H(`M${x1-1} ${top-1}v${bot-top+1}`,5,.5),H(`M${x1-3} ${top+1}v${bot-top-3}M${x1-5} ${top+1}v${bot-top-3}`,.9,.5));break;
    case 'tesla':g.push(H(`M${x1-2} ${top+3}h-8`,1.4,.4));break;
    case 'nissan':g.push(H(`M${x1-1} ${top+2}v${bot-top-4}`,2.6,.4),H(`M${x1-1} ${top+3}h-5`,1.4,.5));break;
    case 'subaru':case 'mitsubishi':g.push(H(`M${x1-1} ${top+2}v${bot-top-4}`,3,.4),H(`M${x1-2} ${top+6}h-5M${x1-2} ${top+10}h-5`,1.4,.5));break;
    case 'vw':g.push(H(`M${x1-1} ${top+3}h-5M${x1-1} ${top+7}h-5`,1.6,.5),HC(x1-3,top+5,1.5,1,.6));break;
    case 'chrysler':g.push(H(`M${x1-1} ${top+2}v${bot-top-4}`,2.4,.4),H(`M${x1-4} ${top+5}h3M${x1-4} ${top+9}h3M${x1-4} ${top+13}h3`,1.2,.5));break;
    default:g.push(H(`M${x1-1} ${top+3}v${bot-top-6}`,2,.35));
  }
  return g.join('');}

function car(o,seed){
  const {x0,x1,yb,yBelt,yRoof,roofA,roofB,yHood,hoodStart,style,wr,era='modern',brand='generic',rim='spoke'}=o;
  const yg=100,wa=o.wa,wb=o.wb,j=(k,a)=>jit(seed,k,a);
  const q=era==='classic50'?10:era==='land70'?3:era==='boxy80'?1:era==='modern90'?5:era==='luxury'?6:era==='wedge'?2:6; /* rayon des angles */
  let d;
  if(style==='cabrio'){
    d=`M${x0} ${yb}L${x0+3} ${yBelt}L${roofB-4} ${yBelt-2}L${roofB+2} ${yBelt-3}L${roofA-10} ${yBelt-3}L${roofA} ${yRoof+4}L${hoodStart} ${yBelt-1}L${hoodStart+6} ${yHood}L${x1-6} ${yHood+2}L${x1} ${yb-6}L${x1} ${yb}Z`;
  }else if(style==='wagon'||style==='suv'||style==='van'){
    const tail=style==='van'?x0+2:x0+6;
    d=`M${x0} ${yb}L${x0+1} ${yBelt+2}L${tail} ${yRoof+2}Q${tail+2} ${yRoof} ${tail+6} ${yRoof}L${roofA} ${yRoof}L${hoodStart} ${yBelt-2}L${hoodStart+5} ${yHood}L${x1-5} ${yHood+1}L${x1} ${yb-8}L${x1} ${yb}Z`;
  }else if(style==='hatch'){
    d=`M${x0} ${yb}L${x0+2} ${yBelt+3}L${roofB-6} ${yRoof+1}Q${roofB} ${yRoof} ${roofB+4} ${yRoof}L${roofA} ${yRoof}L${hoodStart} ${yBelt-2}L${hoodStart+6} ${yHood}L${x1-5} ${yHood+1}L${x1} ${yb-8}L${x1} ${yb}Z`;
  }else if(style==='fast'){
    d=`M${x0} ${yb}L${x0+2} ${yBelt+1}L${x0+12} ${yBelt-1}L${roofB} ${yRoof}L${roofA} ${yRoof}L${hoodStart} ${yBelt-3}L${hoodStart+8} ${yHood}L${x1-6} ${yHood+1}L${x1} ${yb-7}L${x1} ${yb}Z`;
  }else if(era==='classic50'){ /* ailes rondes, toit bombé */
    d=`M${x0} ${yb}L${x0+2} ${yBelt+3}Q${x0+4} ${yBelt-2} ${x0+14} ${yBelt-2}L${roofB+6} ${yBelt-2}Q${roofB} ${yBelt-4} ${roofB} ${yRoof+6}Q${roofB+2} ${yRoof} ${roofB+10} ${yRoof}L${roofA-6} ${yRoof}Q${roofA+2} ${yRoof} ${hoodStart} ${yBelt-2}Q${hoodStart+6} ${yHood+2} ${hoodStart+14} ${yHood+1}L${x1-8} ${yHood+1}Q${x1} ${yHood+2} ${x1} ${yb-8}L${x1} ${yb}Z`;
  }else if(era==='land70'){ /* long capot, long coffre, toit plat */
    d=`M${x0} ${yb}L${x0+1} ${yBelt+2}L${roofB+14} ${yBelt-1}L${roofB+4} ${yRoof+3}L${roofB} ${yRoof}L${roofA} ${yRoof}L${hoodStart-2} ${yBelt-1}L${hoodStart+4} ${yHood}L${x1-3} ${yHood}L${x1} ${yb-6}L${x1} ${yb}Z`;
  }else if(era==='boxy80'){ /* vitres droites, capot plat */
    d=`M${x0} ${yb}L${x0+2} ${yBelt+2}L${roofB+9} ${yBelt-1}L${roofB+2} ${yRoof+1}L${roofB} ${yRoof}L${roofA} ${yRoof}L${hoodStart+2} ${yBelt-2}L${hoodStart+6} ${yHood}L${x1-4} ${yHood}L${x1} ${yb-6}L${x1} ${yb}Z`;
  }else{ /* moderne : pare-brise couché, toit qui file vers le coffre */
    d=`M${x0} ${yb}L${x0+2} ${yBelt+1}L${roofB+10} ${yBelt-2}Q${roofB+2} ${yRoof+4} ${roofB-6} ${yRoof}L${roofA} ${yRoof}Q${hoodStart-2} ${yRoof+2} ${hoodStart+4} ${yBelt-2}L${hoodStart+10} ${yHood}L${x1-6} ${yHood+1}Q${x1} ${yHood+3} ${x1} ${yb-7}L${x1} ${yb}Z`;
  }
  let s=P(d);
  s+=`<circle cx="${wa}" cy="${yg-wr}" r="${wr+3}" fill="#FDFBF7" fill-opacity=".14"/><circle cx="${wb}" cy="${yg-wr}" r="${wr+3}" fill="#FDFBF7" fill-opacity=".14"/>`;
  /* vitrage : selon l'époque, une, deux ou trois vitres latérales et une lunette */
  const mid=rnd((roofA+roofB)/2+j('mid',4));
  if(style==='cabrio'){s+=G(`M${roofA+2} ${yRoof+6}L${hoodStart+4} ${yBelt}L${roofA+9} ${yBelt}Z`);}
  else if(style==='wagon'||style==='suv'||style==='van'){
    s+=G(`M${roofA+2} ${yRoof+3}L${hoodStart+5} ${yBelt}L${mid+2} ${yBelt}L${mid+2} ${yRoof+3}Z`)+G(`M${mid+6} ${yRoof+3}L${mid+6} ${yBelt}L${x0+10} ${yBelt}L${x0+10} ${yRoof+4}Z`);
    if(style!=='van')s+=H(`M${mid+4} ${yRoof+3}V${yBelt}`,1.2,.4);
  }else{
    const ws=era==='boxy80'||era==='land70'?2:era==='classic50'?3:5; /* inclinaison du montant avant */
    s+=G(`M${roofA+2} ${yRoof+3}L${hoodStart+ws} ${yBelt}L${mid+1} ${yBelt}L${mid+1} ${yRoof+3}Z`);
    if(o.doors===2)s+=G(`M${mid+5} ${yRoof+3}L${mid+5} ${yBelt}L${roofB+4} ${yBelt}L${roofB-1} ${yRoof+3}Z`);
    else{s+=G(`M${mid+5} ${yRoof+3}L${mid+5} ${yBelt}L${roofB+8} ${yBelt}L${roofB+1} ${yRoof+3}Z`);
      if(era==='luxury'||era==='land70')s+=G(`M${roofB+10} ${yBelt}L${roofB+3} ${yRoof+3}L${roofB-2} ${yRoof+4}L${roofB+2} ${yBelt}Z`,.16);}
    if(era==='land70'||o.vinyl)s+=H(`M${roofB+2} ${yRoof+1}L${mid+1} ${yRoof+1}`,2.2,.35); /* toit vinyle */
    if(era==='luxury')s+=H(`M${roofA+1} ${yRoof+2}Q${mid} ${yRoof} ${roofB+1} ${yRoof+2}`,1.2,.5);
  }
  /* lignes de caisse et poignées */
  s+=H(`M${mid+3} ${yBelt+3}V${yb-4}`,1.2,.35);
  if(o.doors!==2)s+=H(`M${roofB+6} ${yBelt+3}V${yb-4}`,1,.28);
  const hy=rnd(yBelt+4+j('hy',2));s+=H(`M${mid+6} ${hy}h${era==='classic50'?6:10}`,2,.45)+(o.doors!==2?H(`M${roofB+10} ${hy}h8`,2,.4):'');
  if(o.charline)s+=H(`M${x0+10} ${rnd(yBelt+9+j('cl',3))}L${x1-14} ${rnd(yBelt+7+j('cl2',3))}`,1.4,.4);
  if(o.skirt)s+=H(`M${wa+wr+4} ${yb-3}L${wb-wr-4} ${yb-3}`,2.2,.45);
  /* phares, feux, calandre, pare-chocs */
  const lightW=era==='classic50'?0:era==='modern'||era==='luxury'||era==='wedge'?7:5;
  if(era==='classic50')s+=HC(x1-5,yHood+7,3.2,1.6,.8)+HC(x0+5,yBelt+6,2.4,1.4,.7);
  else{s+=R(x1-lightW-1,yHood+3,lightW,era==='modern'||era==='luxury'?3:4).replace(INK,HL)+R(x0,yBelt+3,era==='modern'?5:3,era==='land70'?4:5).replace(INK,HL);}
  if(era==='modern'||era==='luxury'||era==='wedge')s+=H(`M${x1-lightW-2} ${yHood+4}h${lightW}`,1,.9);
  s+=grille(brand,x1,yHood,yb);
  if(era==='classic50'||era==='land70'||era==='boxy80')s+=H(`M${x1-1} ${yb-5}h-8M${x0+1} ${yb-5}h8`,2.6,.55); /* pare-chocs chromés */
  /* toit : antenne, aileron de requin, toit ouvrant, barres */
  if(o.fin)s+=P(`M${roofB+14} ${yRoof}l4 -4h6l-2 4z`);
  if(o.antenna)s+=H(`M${roofB+18} ${yRoof}l-3 -7`,1.2,.6);
  if(o.sunroof)s+=H(`M${mid-8} ${yRoof-1}h18`,1.6,.5);
  /* échappements */
  const ex=o.exhaust||1;for(let i=0;i<ex;i++)s+=P(`M${x0-4} ${yb-3-i*4}h6v3h-6z`);
  /* roues */
  s+=(o.knob?knobby(wa,yg-wr,wr)+knobby(wb,yg-wr,wr):wheelR(wa,yg-wr,wr,rim,o.spokes||5,era==='classic50')+wheelR(wb,yg-wr,wr,rim,o.spokes||5,era==='classic50'));
  /* accessoires */
  for(const e of o.extra||[]){
    if(e==='spoiler')s+=P(`M${x0+2} ${yBelt-6}h20v3h-16l-2 3h-2z`);
    if(e==='wing')s+=P(`M${x0-2} ${yBelt-11}h28v4h-24z`)+P(`M${x0+6} ${yBelt-7}h3v7h-3z`)+P(`M${x0+18} ${yBelt-7}h3v7h-3z`);
    if(e==='rack')s+=P(`M${roofA+4} ${yRoof-5}h${roofB-roofA-8}v3h-${roofB-roofA-8}z`)+P(`M${roofA+8} ${yRoof-2}h3v2h-3z`)+P(`M${roofB-11} ${yRoof-2}h3v2h-3z`);
    if(e==='lightbar')s+=P(`M${roofA+6} ${yRoof-6}h${Math.max(18,roofB-roofA-12)}v5h-${Math.max(18,roofB-roofA-12)}z`)+H(`M${roofA+8} ${yRoof-3}h5M${roofB-10} ${yRoof-3}h5`,2,.8);
    if(e==='taxi')s+=P(`M${mid-9} ${yRoof-7}h18v6h-18z`)+H(`M${mid-5} ${yRoof-4}h10`,1.6,.7);
    if(e==='stripe')s+=H(`M${x0+8} ${yBelt+8}L${x1-8} ${yBelt+8}`,3,.5);
    if(e==='hoodstripe')s+=H(`M${hoodStart+8} ${yHood+2}L${x1-10} ${yHood+3}`,3,.6);
    if(e==='scoop')s+=P(`M${hoodStart+14} ${yHood-4}h16l2 4h-20z`);
    if(e==='fins')s+=P(`M${x0-2} ${yBelt-6}L${x0+18} ${yBelt+1}L${x0+18} ${yBelt+4}L${x0-2} ${yBelt+2}Z`);
    if(e==='bullbar')s+=P(`M${x1} ${yHood+6}h6v${yb-yHood-10}h-6z`);
    if(e==='softtop')s+=P(`M${roofB-2} ${yBelt-3}h22v4h-22z`);
    if(e==='lift')s+=P(`M${x0+4} ${yb}h${x1-x0-8}v3h-${x1-x0-8}z`);
    if(e==='twotone')s+=H(`M${x0+6} ${yBelt+1}L${x1-10} ${yBelt+1}`,4,.3);
    if(e==='chrome')s+=H(`M${x0+6} ${yb-9}L${x1-8} ${yb-9}`,1.4,.55);
    if(e==='diffuser')s+=P(`M${x0} ${yb-3}h14l-2 3h-12z`);
    if(e==='plate')s+=R(x0+1,yb-8,3,4).replace(INK,HL).replace('/>',' fill-opacity=".5"/>');
  }
  return s;
}

/* ---------- pick-up, camions, bus ---------- */
function pickup(o,seed){const {x0,x1,yb,yBelt,yRoof,cabA,cabB,yHood,hoodStart,wr,wa,wb}=o,yg=100;
  let s=P(`M${x0} ${yb}L${x0} ${yBelt}L${cabB+2} ${yBelt}L${cabB+2} ${yRoof+2}Q${cabB+2} ${yRoof} ${cabB+6} ${yRoof}L${cabA} ${yRoof}L${hoodStart} ${yBelt-2}L${hoodStart+6} ${yHood}L${x1-5} ${yHood+1}L${x1} ${yb-8}L${x1} ${yb}Z`);
  s+=H(`M${x0+2} ${yBelt+2}L${cabB} ${yBelt+2}`,1.4,.4)+H(`M${x0+2} ${yBelt+10}L${cabB} ${yBelt+10}`,1.2,.3);
  s+=G(`M${cabA+2} ${yRoof+3}L${hoodStart+4} ${yBelt}L${cabB-2} ${yBelt}L${cabB-2} ${yRoof+3}Z`);
  if(o.crew)s+=H(`M${rnd((cabA+cabB)/2)} ${yRoof+3}V${yBelt}`,1.2,.45);
  s+=R(x1-6,yHood+4,5,4).replace(INK,HL)+R(x0,yBelt+3,3,5).replace(INK,HL);
  for(const e of o.extra||[]){
    if(e==='lightbar')s+=P(`M${cabA+4} ${yRoof-6}h${cabB-cabA-8}v5h-${cabB-cabA-8}z`);
    if(e==='bullbar')s+=P(`M${x1} ${yHood+6}h6v${yb-yHood-10}h-6z`);
    if(e==='rack')s+=P(`M${cabA+3} ${yRoof-5}h${cabB-cabA-6}v3h-${cabB-cabA-6}z`);
    if(e==='cover')s+=R(x0+1,yBelt-3,cabB-x0,3);
    if(e==='cage')s+=H(`M${x0+6} ${yBelt}L${x0+14} ${yRoof+2}L${cabA-2} ${yRoof+2}`,2.2,.7);
    if(e==='lift')s+=P(`M${x0+8} ${yb}h${x1-x0-16}v4h-${x1-x0-16}z`);
    if(e==='lights')s+=P(`M${cabA+6} ${yRoof-4}h${cabB-cabA-12}v3h-${cabB-cabA-12}z`)+H(`M${cabA+9} ${yRoof-2}h3M${cabA+16} ${yRoof-2}h3M${cabB-12} ${yRoof-2}h3`,1.6,.8);
  }
  s+=(o.knob?knobby(wa,yg-wr,wr)+knobby(wb,yg-wr,wr):wheel(wa,yg-wr,wr,o.spokes||5)+wheel(wb,yg-wr,wr,o.spokes||5));
  return s;}

function truck(o,seed){ /* camion à cabine avancée ou à capot : kind = box|flat|dump|tank|garbage|tow|semi|ambulance|mixer */
  const {kind,yb,wr,hood}=o,yg=100,x1=224,cabW=hood?34:30,cabX=x1-cabW-(hood?26:6);
  let s='';
  /* cabine */
  if(hood)s+=P(`M${cabX} ${yb}L${cabX} 40L${cabX+cabW-2} 40L${cabX+cabW+2} 56L${x1-2} 58L${x1} 66L${x1} ${yb}Z`)+G(`M${cabX+4} 44L${cabX+cabW-4} 44L${cabX+cabW-1} 56L${cabX+4} 56Z`);
  else s+=P(`M${cabX} ${yb}L${cabX} 36Q${cabX} 33 ${cabX+3} 33L${x1-3} 33Q${x1} 33 ${x1} 36L${x1} ${yb}Z`)+G(`M${cabX+4} 38L${x1-4} 38L${x1-4} 58L${cabX+4} 58Z`);
  s+=R(x1-5,72,4,5).replace(INK,HL);
  /* châssis et carrosserie arrière */
  const bx0=16,bx1=cabX-3;
  s+=R(bx0,86,x1-bx0-4,6);
  if(kind==='box')s+=P(`M${bx0} 88V38h${bx1-bx0}V88Z`)+H(`M${bx0+8} 44V82M${bx1-8} 44V82`,1.2,.35);
  if(kind==='flat')s+=R(bx0,80,bx1-bx0,6)+H(`M${bx0+4} 84h${bx1-bx0-8}`,1.2,.4);
  if(kind==='dump')s+=P(`M${bx0+4} 84L${bx0} 50L${bx1-2} 46L${bx1} 84Z`)+H(`M${bx0+10} 56L${bx1-8} 54`,1.4,.4);
  if(kind==='tank')s+=P(`M${bx0+2} 82Q${bx0+2} 44 ${bx0+22} 44L${bx1-18} 44Q${bx1} 44 ${bx1} 82Z`)+H(`M${bx0+14} 52h${bx1-bx0-28}`,1.4,.4);
  if(kind==='garbage')s+=P(`M${bx0} 86L${bx0+6} 42L${bx1-4} 40L${bx1} 86Z`)+P(`M${bx0-8} 60L${bx0+2} 48L${bx0+2} 86L${bx0-8} 86Z`);
  if(kind==='tow')s+=R(bx0+6,76,bx1-bx0-6,10)+P(`M${bx0+10} 76L${bx0+22} 46L${bx0+27} 46L${bx0+18} 76Z`)+H(`M${bx0+22} 47L${bx0+2} 70`,2,.7)+P(`M${bx0-4} 66h10v6h-10z`);
  if(kind==='semi')s+=P(`M${bx1-22} 74h20v10h-20z`);
  if(kind==='ambulance')s+=P(`M${bx0} 88V40h${bx1-bx0}V88Z`)+H(`M${rnd((bx0+bx1)/2)} 52v18M${rnd((bx0+bx1)/2)-9} 61h18`,4,.85)+P(`M${cabX+4} 30h${cabW-8}v4h-${cabW-8}z`);
  if(kind==='mixer')s+=P(`M${bx0+6} 84L${bx0+4} 56Q${bx0+20} 34 ${bx1-10} 40L${bx1} 84Z`)+H(`M${bx0+12} 56L${bx1-14} 48M${bx0+14} 68L${bx1-12} 62`,1.6,.4);
  if(kind==='forklift'){s='';return forklift(o);}
  if(o.extra&&o.extra.includes('lightbar'))s+=P(`M${cabX+4} ${hood?36:29}h${cabW-8}v5h-${cabW-8}z`);
  /* roues : deux ou trois essieux */
  const axles=o.axles||2;
  s+=wheel(x1-20,yg-wr,wr,6);
  if(axles>=2)s+=wheel(bx0+22,yg-wr,wr,6);
  if(axles>=3)s+=wheel(bx0+50,yg-wr,wr,6);
  return s;}

function bus(o,seed){const {kind,wr}=o,yg=100,x0=14,x1=226;
  let s=P(`M${x0} 88Q${x0} 30 ${x0+8} 30L${x1-8} 30Q${x1} 30 ${x1} 40L${x1} 88Z`);
  const n=kind==='coach'?6:kind==='school'?7:5;const w=(x1-x0-20)/n;
  for(let i=0;i<n;i++)s+=G(`M${rnd(x0+10+i*w+2)} ${kind==='coach'?40:38}h${rnd(w-4)}v${kind==='coach'?18:22}h-${rnd(w-4)}z`);
  if(kind!=='coach')s+=H(`M${x1-40} 62V88`,1.6,.5)+H(`M${x1-38} 66h-10v20`,1,.35);
  if(kind==='school')s+=P(`M${x1-14} 30h8v-6h-8z`)+P(`M${x0+6} 30h8v-6h-8z`);
  if(kind==='coach')s+=P(`M${x0+2} 62h${x1-x0-4}v4h-${x1-x0-4}z`,.5);
  if(kind==='shuttle')s+=P(`M${x0+10} 30h${x1-x0-20}v-4h-${x1-x0-20}z`);
  if(kind==='rv')s+=P(`M${x1-40} 30h30v-8h-30z`)+H(`M${x0+20} 70h60`,1.4,.4);
  s+=R(x1-4,70,3,6).replace(INK,HL)+R(x0,70,3,6).replace(INK,HL);
  s+=wheel(x1-36,yg-wr,wr,6)+wheel(x0+40,yg-wr,wr,6);
  if(kind==='coach')s+=wheel(x0+64,yg-wr,wr,6);
  return s;}

function forklift(o){const yg=100;let s=P('M60 88L60 60L96 60L100 44L136 44L140 60L150 60L150 88Z')+P('M104 46h30v-10h-30z')+P('M150 34h8v54h-8z')+P('M158 88h56v4h-56z')+P('M158 60h50v3h-50z',.6);
  s+=G('M104 48h28v12h-28z')+H('M100 44L100 30L140 30L140 44',2,.6);
  return s+wheel(76,yg-12,12,5)+wheel(140,yg-10,10,5);}

/* ---------- motos ---------- */
function moto(o,seed){const {kind,wr}=o,yg=100,y=yg-wr;
  let s='';
  if(kind==='sport'){s+=P('M62 78L74 52L118 44L172 52L178 64L150 70L112 76L84 84Z')+P('M112 44L150 40L160 46L146 52Z')+G('M154 40L176 44L178 52L160 48Z')+P('M148 70L166 70L172 84L152 86Z')+H('M84 60L120 54',1.4,.5)+P('M52 76h16v8h-16z');
    s+=H(`M166 52L182 ${y}`,4,.9)+H(`M60 82L78 ${y}`,3,.8)+wheel(70,y,wr,6)+wheel(184,y,wr,6);}
  if(kind==='naked'){s+=P('M66 78L80 58L130 50L160 58L168 66L140 72L112 76L86 84Z')+P('M108 52L134 46L146 52L134 58Z')+P('M150 68L166 70L170 82L152 84Z')+H('M148 46L160 40M160 40L172 44',2.2,.7)+P('M56 76h16v8h-16z');
    s+=H(`M164 60L184 ${y}`,4,.9)+H(`M64 82L74 ${y}`,3,.8)+wheel(70,y,wr,6)+wheel(184,y,wr,6);}
  if(kind==='dirt'){s+=P('M70 74L84 50L120 46L150 50L160 58L146 64L112 70L90 80Z')+P('M104 50L140 42L156 48L140 56Z')+P('M150 60L160 56L184 40L188 44L166 62Z')+H('M132 44L164 34',2.2,.7)+P('M58 70h18v6h-18z')+P('M110 70L134 70L138 86L114 86Z');
    s+=H(`M172 56L182 ${y}`,4,.9)+H(`M68 78L74 ${y}`,3,.8)+knobby(72,y,wr)+knobby(182,y,wr);}
  if(kind==='cruiser'){s+=P('M60 80L70 68L118 62L150 66L170 74L176 84L150 84L118 80L84 86Z')+P('M80 62L106 56L124 60L104 66Z')+P('M138 60L152 56L156 66L142 68Z')+H('M150 56L164 42L176 40',2.4,.7)+P('M46 78h20v8h-20z')+P('M116 78L146 78L150 90L120 90Z',.9)+H('M158 86h44',3.5,.75);
    s+=H(`M172 66L192 ${y}`,4,.9)+H(`M60 84L62 ${y}`,3,.8)+wheel(64,y,wr,8)+wheel(190,y,wr,8);}
  if(kind==='chopper'){s+=P('M62 82L74 70L120 64L146 68L160 76L164 84L140 84L112 82L86 88Z')+P('M86 64L110 58L126 62L106 68Z')+P('M136 64L148 60L152 70L138 72Z')+H('M148 60L190 30',3,.8)+H('M180 34L176 26M186 32L198 28',2,.7)+P('M50 80h18v8h-18z')+H('M158 84h30',3,.7);
    s+=H(`M174 60L210 ${y}`,3.5,.9)+H(`M62 84L60 ${y}`,3,.8)+wheel(62,y,wr+2,10)+wheel(208,y,wr-2,10);}
  if(kind==='scooter'){s+=P('M70 72L84 62L118 60L140 64L150 60L166 46L172 48L156 66L150 78L124 84L96 84L78 84Z')+P('M104 58L134 54L138 62L108 66Z')+H('M164 46L176 40M158 50L186 46',2,.7)+P('M60 74h20v6h-20z')+P('M96 84h44l-4 8h-36z',.9)+G('M150 52L166 46L170 56L156 64Z');
    s+=H(`M168 66L176 ${y}`,3.5,.9)+H(`M70 80L72 ${y}`,2.5,.8)+wheel(70,y,wr-2,6)+wheel(176,y,wr-2,6);}
  if(kind==='mobility'){s+=P('M60 84L64 74L146 72L152 84Z')+P('M64 60L112 60L116 74L60 74Z')+P('M60 48h44v14h-44z')+H('M62 60L58 70',2.4,.7)+P('M148 58L172 52L176 56L156 64L156 74L146 74Z')+H('M160 52L184 46',2,.6)+P('M120 74h18l-2 10h-14z',.9);
    s+=wheel(70,yg-8,8,4)+wheel(120,yg-8,8,4)+wheel(168,yg-8,8,4);}
  if(kind==='quad'){s+=P('M56 74L70 56L110 50L156 52L176 60L184 74L160 78L116 80L80 82Z')+P('M96 52L134 44L150 48L136 56Z')+H('M130 46L168 36',2.4,.7)+P('M108 66L146 66L150 80L112 82Z',.85)+P('M40 74h30v8h-30z')+P('M172 72h30v8h-30z');
    s+=knobby(68,yg-14,14)+knobby(186,yg-14,14);}
  if(kind==='utv'){s+=P('M44 82L54 66L84 60L138 54L170 58L190 66L196 82Z')+H('M80 60L96 30L150 26L176 56',3,.8)+H('M96 30L96 60M150 26L152 54',2,.6)+G('M100 34L148 30L150 52L102 56Z')+P('M104 60L140 58L142 74L108 76Z',.85);
    s+=knobby(62,yg-16,16)+knobby(178,yg-16,16);}
  if(kind==='swamp'){s+=P('M50 70L60 52L120 46L170 50L184 62L184 70Z')+H('M70 52L80 26L150 22L172 50',3,.8)+G('M84 30L148 26L152 48L86 52Z')+P('M100 40h30v10h-30z');
    s+=knobby(66,yg-22,22)+knobby(176,yg-22,22);}
  return s;}

function bike(o,seed){const {kind}=o,yg=100,r=kind==='bmx'?12:kind==='cruiser'?15:14,y=yg-r,a=64,b=176;
  let s=H(`M${a} ${y}L112 46L154 46L${b} ${y}M112 46L130 ${y-2}M154 46L128 ${y-2}M128 ${y-2}L${a} ${y}`,3,.85);
  s+=H(`M154 46L160 34M108 46L104 34`,3,.85)+P('M96 30h16v4h-16z')+P('M150 30h20v3h-20z');
  if(kind==='cruiser')s+=P('M94 28h20v5h-20z')+H('M150 30h22',3.5,.8)+P(`M${a-14} ${y-10}h32v3h-32z`,.5);
  if(kind==='bmx')s+=H('M150 30h18M150 30L150 26',2.5,.8)+H(`M120 ${y-4}h12`,2,.7);
  if(kind==='ebike')s+=P('M118 60L142 56L146 70L122 74Z')+P('M40 76h18v6h-18z');
  if(kind==='race')s+=H('M150 30q6 0 8 6q2 6 -4 8',2.5,.8);
  if(kind==='mtb')s+=H(`M154 46L160 30`,4,.9)+H(`M${b} ${y}L152 60`,3,.9);
  s+=C(128,y-2,4)+H(`M128 ${y-2}L120 ${y+6}M128 ${y-2}L136 ${y-10}`,2.5,.8)+HC(a,y,r,2.2,.9)+HC(b,y,r,2.2,.9)+HC(a,y,r-3,1,.35)+HC(b,y,r-3,1,.35);
  if(kind==='kick'){s=P('M60 86h120v6h-120z')+H('M176 86L182 30',3.5,.9)+P('M170 28h24v4h-24z')+C(60,94,6)+C(184,94,6)+HC(60,94,3,1.2,.6)+HC(184,94,3,1.2,.6);}
  return s;}

/* ---------- bateaux ---------- */
function boat(o,seed){const {kind,seed:sd}=o,x0=18,x1=224,yw=88;
  let s='';
  const hull=(yTop=64,bowY=52,sternY=58)=>P(`M${x0+6} ${sternY}L${x0} ${yw-10}Q${x0+6} ${yw} ${x0+16} ${yw}L${x1-30} ${yw}Q${x1-8} ${yw-2} ${x1} ${bowY+6}L${x1-6} ${bowY}L${x0+10} ${yTop}Z`);
  if(kind==='speed'){s+=hull(66,50,60)+P(`M${x0+40} 66L${x0+44} 50L${x0+120} 46L${x0+132} 66Z`)+G(`M${x0+48} 52L${x0+118} 48L${x0+124} 60L${x0+50} 62Z`)+H(`M${x0+14} 74L${x1-20} 70`,1.4,.4)+P(`M${x0+2} 64h12v6h-12z`);}
  if(kind==='cabin'){s+=hull(66,48,60)+P(`M${x0+30} 66L${x0+36} 38L${x0+110} 34L${x0+128} 52L${x0+140} 66Z`)+G(`M${x0+42} 42L${x0+106} 38L${x0+118} 52L${x0+46} 56Z`)+G(`M${x0+60} 60L${x0+130} 58L${x0+128} 66L${x0+60} 66Z`,.16)+P(`M${x0+60} 36h30v-6h-30z`)+H(`M${x0+16} 74L${x1-24} 70`,1.2,.35);}
  if(kind==='yacht'){s+=P(`M${x0+6} 56L${x0} ${yw-8}Q${x0+8} ${yw} ${x0+18} ${yw}L${x1-24} ${yw}Q${x1-4} ${yw-4} ${x1} 52L${x1-10} 48L${x0+10} 56Z`)+P(`M${x0+20} 56L${x0+24} 40L${x0+140} 34L${x0+160} 56Z`)+P(`M${x0+40} 40L${x0+44} 26L${x0+110} 22L${x0+124} 40Z`)+G(`M${x0+48} 30L${x0+106} 26L${x0+114} 36L${x0+50} 38Z`)+G(`M${x0+30} 46L${x0+136} 40L${x0+140} 50L${x0+32} 52Z`,.18)+H(`M${x0+70} 22L${x0+72} 12`,2,.7)+H(`M${x0+16} 72L${x1-30} 68`,1.2,.35);}
  if(kind==='sail'){s+=P(`M${x0+10} 62L${x0+4} ${yw-6}Q${x0+8} ${yw} ${x0+16} ${yw}L${x1-30} ${yw}Q${x1-8} ${yw-2} ${x1-2} 60L${x0+12} 62Z`)+H('M120 62L120 8',3,.9)+G('M122 12L200 60L122 60Z',.3)+G('M118 16L56 60L118 60Z',.24)+H('M120 8L200 60M120 8L56 60',1.2,.5)+P('M78 54h60v8h-60z');}
  if(kind==='console'){s+=hull(68,54,62)+P(`M${x0+78} 68L${x0+82} 44L${x0+112} 44L${x0+116} 68Z`)+G(`M${x0+84} 48L${x0+110} 48L${x0+112} 58L${x0+86} 58Z`)+H(`M${x0+80} 44L${x0+82} 34L${x0+114} 34L${x0+114} 44`,2,.7)+P(`M${x0+40} 62h${x0+30}v-4h-${x0+30}z`,.5)+P(`M${x0+2} 60h14v10h-14z`)+H(`M${x0+16} 76L${x1-20} 72`,1.2,.35);}
  if(kind==='rib'){s+=P(`M${x0+4} 62Q${x0} 72 ${x0+8} ${yw-6}L${x1-30} ${yw-4}Q${x1} ${yw-8} ${x1-4} 62Q${x1-14} 54 ${x1-30} 56L${x0+14} 58Q${x0+4} 58 ${x0+4} 62Z`)+H(`M${x0+10} 64Q${x1-16} 60 ${x1-6} 66`,6,.5)+P(`M${x0+88} 60L${x0+92} 42L${x0+118} 42L${x0+122} 60Z`)+G(`M${x0+94} 46L${x0+116} 46L${x0+118} 56L${x0+96} 56Z`)+P(`M${x0+6} 56h10v10h-10z`);}
  if(kind==='jetski'){s=P('M40 84Q30 84 36 74L60 62Q100 52 150 54L190 60Q206 66 214 80L214 86L60 88Q44 88 40 84Z')+P('M96 58L108 44L146 42L160 56Z')+H('M150 44L172 38M150 44L156 54',2.4,.7)+H('M56 80L200 78',1.4,.4)+P('M104 70h50l6 10h-56z',.85)+G('M108 60h30v6h-30z');}
  if(kind==='airboat'){s=P('M30 80L40 68L180 66L200 80Z')+P('M30 88h176v4h-176z',.7)+H('M50 70L48 50L170 48L172 66',1.4,.45)+P('M150 30h40v44h-40z',.9)+HC(170,52,17,2.4,.75)+H('M170 52L170 35M170 52L185 61M170 52L155 61',2.4,.7)+P('M104 66L108 50L128 50L132 66Z')+P('M108 44h22v6h-22z')+H('M60 66L70 54L100 52',2,.6);}
  if(kind==='kayak'){s=P('M18 74Q60 60 120 60Q180 60 222 74Q180 84 120 84Q60 84 18 74Z')+G('M96 66Q120 62 144 66Q120 76 96 66Z',.3)+H('M60 40L180 92',3,.85)+P('M52 34h14v10h-14z',.9)+P('M176 90h14v10h-14z',.9);}
  if(kind==='ship'){s+=P(`M${x0} 60L${x0+4} ${yw}L${x1-6} ${yw}L${x1} 56L${x0+8} 60Z`);for(let i=0;i<4;i++)s+=P(`M${x0+16+i*6} ${58-i*10}h${x1-x0-40-i*20}v10h-${x1-x0-40-i*20}z`);for(let k=0;k<3;k++)for(let i=0;i<10;i++)s+=G(`M${x0+24+i*16} ${52-k*10}h8v5h-8z`,.35);s+=P(`M${x0+40} 18h30v10h-30z`)+H(`M${x0+40} 34h${x1-x0-80}`,1,.35);}
  if(kind==='ferry'){s+=P(`M${x0} 64L${x0+6} ${yw}L${x1-6} ${yw}L${x1} 64Z`)+P(`M${x0+12} 64h${x1-x0-24}v-16h-${x1-x0-24}z`)+P(`M${x0+40} 48h${x1-x0-80}v-14h-${x1-x0-80}z`);for(let i=0;i<9;i++)s+=G(`M${x0+46+i*14} 38h8v6h-8z`,.35);s+=H(`M${x0+16} 58h${x1-x0-32}`,1.4,.4)+P(`M${x0+80} 34h20v-8h-20z`);}
  if(kind==='taxi'){s+=hull(66,52,60)+P(`M${x0+36} 66L${x0+40} 46L${x0+132} 44L${x0+140} 66Z`)+P(`M${x0+40} 46h${92}v-6h-${92}z`);for(let i=0;i<5;i++)s+=G(`M${x0+46+i*18} 50h12v10h-12z`,.28);}
  if(kind==='cat'){s+=P(`M${x0} 78L${x0+6} ${yw}L${x0+50} ${yw}L${x0+56} 78Z`)+P(`M${x1-56} 78L${x1-50} ${yw}L${x1-6} ${yw}L${x1} 78Z`)+P(`M${x0+2} 78L${x0+8} 62L${x1-8} 58L${x1-2} 78Z`)+P(`M${x0+30} 62L${x0+34} 38L${x1-40} 34L${x1-30} 58Z`)+G(`M${x0+40} 42L${x1-46} 38L${x1-40} 52L${x0+42} 54Z`)+P(`M${x0+70} 38h40v-8h-40z`);}
  /* ligne d'eau */
  s+=H(`M6 ${yw+4}Q60 ${yw} 120 ${yw+4}T234 ${yw+4}`,1.6,.35);
  return s;}

/* ---------- aéronefs ---------- */
function plane(o,seed){const {kind}=o;let s='';
  if(kind==='airliner'){s=P('M20 62Q26 52 60 50L190 50Q214 50 226 62Q214 72 190 72L60 72Q26 72 20 62Z')+P('M28 52L52 22L62 22L52 52Z')+P('M112 62L96 92L150 88L160 66Z',.9)+P('M104 74h36v6h-36z')+P('M112 80h14v8h-14z')+G('M196 54Q214 56 218 62L200 62Z',.3);for(let i=0;i<12;i++)s+=G(`M${68+i*10} 58h4v4h-4z`,.5);s+=H('M28 66h190',1,.3);}
  if(kind==='bizjet'){s=P('M30 64Q34 56 70 54L180 52Q212 52 226 64Q210 74 180 74L60 74Q34 74 30 64Z')+P('M36 56L56 30L66 30L58 56Z')+P('M40 30h26v4h-26z')+P('M70 46h34v6h-34z')+P('M120 66L104 86L140 84L146 68Z',.9)+G('M194 56Q210 58 214 64L196 64Z',.3);for(let i=0;i<6;i++)s+=G(`M${86+i*12} 60h5v4h-5z`,.5);}
  if(kind==='cessna'){s=P('M36 66Q40 56 80 56L190 54Q210 54 218 62Q206 70 180 70L80 70Q40 70 36 66Z')+P('M40 58L50 36L68 36L60 58Z')+P('M42 36h26v3h-26z')+P('M60 46h130v5h-130z')+G('M134 56L166 54L172 62L130 62Z',.3)+H('M216 62L224 50M216 62L224 74',3,.7)+H('M122 70L120 88M164 70L168 88',3,.75)+C(120,90,5)+C(168,90,5)+C(90,90,4);}
  if(kind==='seaplane'){s=plane({kind:'cessna'},seed).replace(/<circle[^>]*\/>/g,'').replace("H('M122 70L120 88M164 70L168 88',3,.75)",'')+P('M60 92h80v6h-80z')+P('M120 92h80v6h-80z')+H('M110 70L100 92M150 70L150 92M160 70L172 92',2.4,.7);}
  if(kind==='twin'){s=P('M34 66Q38 56 78 56L196 54Q214 54 220 62Q208 70 184 70L78 70Q38 70 34 66Z')+P('M38 58L46 34L66 34L58 58Z')+P('M40 34h30v3h-30z')+P('M56 46h140v5h-140z')+P('M96 46h18v-8h-18z')+P('M154 46h18v-8h-18z')+G('M140 56L172 54L178 62L136 62Z',.3);for(let i=0;i<6;i++)s+=G(`M${86+i*10} 60h4v4h-4z`,.5);s+=H('M120 70L118 88M170 70L172 88',3,.75)+C(118,90,5)+C(172,90,5);}
  if(kind==='biplane'){s=P('M50 70Q54 60 90 60L170 58Q200 58 210 66Q196 74 170 74L90 74Q54 74 50 70Z')+P('M52 62L58 44L74 44L68 62Z')+P('M40 46h164v5h-164z')+P('M56 30h150v5h-150z')+H('M80 35L84 46M130 35L134 46M180 35L184 46M84 35L130 46',2,.6)+P('M204 58h6v14h-6z')+H('M212 66L222 54M212 66L222 78',4,.7)+H('M110 74L108 90M150 74L152 90',3,.7)+C(108,92,5)+C(152,92,5);}
  if(kind==='blimp'){s=P('M20 60Q40 26 120 26Q200 26 226 60Q200 88 120 88Q40 88 20 60Z')+P('M22 52L34 36L38 60L34 84L22 68Z',.8)+P('M104 88h40l-6 10h-28z')+G('M108 90h30v6h-30z',.3)+H('M60 44Q120 34 180 44',1.6,.35);}
  return s;}

function heli(o,seed){const {kind}=o,s0='';
  let s='';
  if(kind==='light'){s=P('M70 70Q72 46 112 44L136 44Q160 46 166 66L150 74L90 76Z')+P('M40 60L72 58L72 66L40 68Z')+P('M40 56L44 44L50 44L48 60Z')+G('M116 48L152 50L158 62L118 64Z',.3)+H('M106 36L112 44',3,.8)+P('M40 34h150v3h-150z')+H('M80 76L84 90M150 74L146 90',3,.75)+P('M60 90h110v4h-110z');}
  if(kind==='medium'){s=P('M60 72Q62 42 110 40L150 40Q178 44 186 66L166 76L86 78Z')+P('M22 58L62 56L64 66L22 66Z')+P('M22 54L28 36L36 36L34 58Z')+P('M28 46h14v3h-14z')+G('M118 44L160 46L168 62L120 64Z',.3)+G('M92 48L114 46L116 64L94 64Z',.22)+P('M112 34h14v6h-14z')+P('M30 30h170v4h-170z')+H('M80 78L82 92M166 76L164 92',3,.75)+P('M64 92h120v4h-120z');}
  if(kind==='heavy'){s=P('M52 74Q54 40 108 38L156 38Q184 42 194 68L172 78L78 80Z')+P('M14 60L54 56L56 68L14 66Z')+P('M14 54L22 34L32 34L28 58Z')+P('M20 44h16v3h-16z')+G('M122 42L168 44L176 64L124 66Z',.3)+G('M88 46L118 44L120 66L90 66Z',.22)+P('M104 30h28v8h-28z')+P('M22 26h188v4h-188z')+H('M74 80L76 94M176 78L172 94',3,.75)+P('M56 94h136v4h-136z')+P('M150 76h30v6h-30z',.7);}
  if(kind==='frame'){s=P('M96 64Q98 44 122 44L150 44Q170 46 170 62L150 70L106 72Z')+G('M120 48L152 50L158 62L122 64Z',.3)+H('M40 66L98 62L98 70L40 70Z',2.4,.8)+H('M40 60L44 48L52 48',2.2,.7)+P('M40 44h150v3h-150z')+H('M112 36L120 44',3,.8)+H('M108 72L100 90L160 90L154 70',2.4,.75)+P('M70 90h100v4h-100z');}
  if(kind==='attack'){s=P('M74 70Q76 48 112 46L134 46Q158 48 164 64L150 74L92 76Z')+P('M36 62L76 58L76 66L36 68Z')+P('M36 58L40 46L48 46L46 62Z')+G('M116 50L150 52L156 62L118 64Z',.3)+P('M92 70h64v6h-64z')+P('M80 74h20v5h-20z')+P('M150 74h20v5h-20z')+P('M40 34h150v3h-150z')+H('M104 36L110 46',3,.8)+P('M64 90h110v4h-110z')+H('M84 76L86 90M150 74L148 90',3,.75);}
  return s;}

/* ---------- rail ---------- */
function rail(o,seed){const {kind}=o;let s='';
  if(kind==='monorail'){s=P('M20 62Q22 46 40 46L200 46Q220 46 222 62L222 74L20 74Z');for(let i=0;i<8;i++)s+=G(`M${34+i*22} 52h16v12h-16z`,.32);s+=P('M16 78h208v6h-208z')+P('M70 84h20v10h-20z')+P('M150 84h20v10h-20z')+P('M8 94h224v4h-224z',.5);}
  if(kind==='train'){s=P('M22 60L22 40L60 40L60 60Z')+P('M58 46Q60 36 80 36L200 36Q222 36 224 60L224 80L22 80Z')+G('M28 44h26v12h-26z',.32)+G('M70 42h120v10h-120z',.2)+P('M80 28h30v8h-30z')+P('M20 80h206v4h-206z')+wheel(52,90,9,4)+wheel(80,90,9,4)+wheel(160,90,9,4)+wheel(188,90,9,4)+H('M200 40L214 80',1.2,.3);}
  if(kind==='metro'){s=P('M20 74L20 44Q20 38 26 38L214 38Q222 38 224 46L224 74Z');for(let i=0;i<7;i++)s+=G(`M${34+i*26} 44h18v14h-18z`,.32);s+=H('M26 64h190',1.4,.4)+P('M96 66h40v8h-40z',.6)+P('M14 80h216v5h-216z')+wheel(48,92,7,4)+wheel(70,92,7,4)+wheel(170,92,7,4)+wheel(192,92,7,4);}
  return s;}

function excavator(){let s=P('M40 84h100v6h-100z')+P('M46 62L56 46L120 46L128 62L128 74L46 74Z')+G('M96 50h26v18h-26z',.3)+P('M60 84h70l-4 10h-62z')+H('M60 94h70',3,.6);
  s+=P('M128 58L176 26L184 34L140 64Z')+P('M182 30L214 60L206 66L176 38Z')+P('M204 62L220 66L216 90L202 86L200 72Z')+H('M150 46L170 60',3,.6);return s;}

/* ---------- choix du type et des paramètres ---------- */
const L=s=>String(s||'').toLowerCase();
const BRANDS=[['audi','audi'],['bmw','bmw'],['mercedes','mercedes'],['brabus','mercedes'],['lexus','lexus'],['honda','honda'],['acura','honda'],['toyota','toyota'],['chevrolet','chevrolet'],['chevy','chevrolet'],['corvette','chevrolet'],['ford','ford'],['shelby','ford'],['dodge','dodge'],['cadillac','cadillac'],['lincoln','lincoln'],['buick','buick'],['pontiac','pontiac'],['oldsmobile','buick'],['amc','pontiac'],['porsche','porsche'],['ferrari','ferrari'],['lamborghini','lamborghini'],['jaguar','jaguar'],['rolls','rolls'],['bentley','bentley'],['tesla','tesla'],['nissan','nissan'],['infiniti','nissan'],['subaru','subaru'],['mitsubishi','mitsubishi'],['eagle','mitsubishi'],['volkswagen','vw'],['chrysler','chrysler'],['mclaren','ferrari'],['italdesign','lamborghini'],['aston','jaguar'],['maserati','ferrari'],['cizeta','lamborghini'],['kellison','ford']];
const RIM_KINDS=['spoke','split','mesh','disc','wire','steel'];
function era(ins){
  const y=(ins.match(/\b(19[5-9]\d|20[0-2]\d)\b/)||[])[1];const n=y?+y:null;
  if(/années 50|1950|195\d|bel air|fairlane/.test(ins)||(n&&n<1965))return 'classic50';
  if(/années 60|années 70|196\d|197\d|land yacht|continental|imperial|de ville|riviera|eldorado 1959/.test(ins)||(n&&n<1982))return 'land70';
  if(/années 80|198\d|199[0-3]|e30|regal|skylark|lebaron|bonneville|crown victoria|fox|génération précédente/.test(ins)||(n&&n<1996))return 'boxy80';
  if(/199\d|xv30|q45|gs 300|première génération|deuxième génération|new edge|e63|e64|e92|930|964/.test(ins)||(n&&n<2010))return 'modern90';
  if(/rolls|bentley|wraith|cullinan|continental gt|brabus|escalade|navigator|jubilee|windsor|paragon|classe e allongée|lwb|s-class|panamera|taycan|mercedes|audi|bmw|lexus|infiniti|jaguar/.test(ins))return 'luxury';
  return 'modern';}
function brandOf(ins){for(const [k,b] of BRANDS)if(ins.includes(k))return b;return 'generic';}
function carParams(v,base){
  const seed=v.id,ins=L(v.insp)+' '+L(v.nom)+' '+L(v.marque);
  const j=(k,a)=>jit(seed,k,a),hv=hash(seed);
  const o=Object.assign({x0:22,x1:222,yb:88,yBelt:66,yRoof:44,roofA:150,roofB:80,yHood:60,hoodStart:172,style:'notch',wr:13,doors:4,extra:[]},base);
  o.era=base.era||era(ins);o.brand=brandOf(ins);o.rim=RIM_KINDS[hv%RIM_KINDS.length];o.spokes=5+(hv>>3)%5;
  /* proportions par époque */
  if(o.era==='classic50'){o.x0=Math.min(o.x0,18);o.x1=Math.max(o.x1,226);o.yRoof=Math.max(o.yRoof-2,40);o.wr=Math.min(o.wr,12.5);o.roofB=Math.max(o.roofB,84);o.extra.push('chrome');}
  if(o.era==='land70'){o.x0=14;o.x1=228;o.yRoof=Math.max(o.yRoof+2,46);o.roofB=Math.max(o.roofB,86);o.roofA=Math.min(o.roofA,144);o.hoodStart=Math.min(o.hoodStart+6,184);o.wr=Math.min(o.wr,12.5);o.extra.push('chrome');}
  if(o.era==='boxy80'){o.yRoof=Math.max(o.yRoof-1,42);o.hoodStart=o.hoodStart+2;o.extra.push('plate');}
  if(o.era==='modern'||o.era==='luxury'){o.wr=Math.max(o.wr,13.5);o.yBelt=Math.min(o.yBelt,65);o.fin=hv%2===0;o.antenna=!o.fin&&hv%5===0;o.charline=true;}
  if(o.era==='luxury'){o.x0=Math.min(o.x0,18);o.x1=Math.max(o.x1,224);o.sunroof=hv%3===0;o.exhaust=2;}
  if(o.era==='modern90'){o.antenna=hv%3===0;o.charline=hv%2===0;}
  if(o.era==='wedge'){o.skirt=true;o.exhaust=2;o.extra.push('diffuser');}
  /* variations propres à la fiche */
  o.wr=rnd(o.wr+j('wr',1.5),1);o.yRoof=rnd(o.yRoof+j('roof',3),1);o.roofA=rnd(o.roofA+j('ra',7),1);o.roofB=rnd(o.roofB+j('rb',7),1);o.yHood=rnd(o.yHood+j('hood',2.5),1);
  o.x0=rnd(o.x0+j('x0',4),1);o.x1=rnd(o.x1+j('x1',4),1);o.hoodStart=rnd(o.hoodStart+j('hs',5),1);
  o.wa=rnd(o.x0+30+j('wa',6),1);o.wb=rnd(o.x1-34+j('wb',6),1);
  if(hv%7===0)o.extra.push('twotone');if(hv%11===0)o.exhaust=2;if(hv%13===0)o.vinyl=true;
  if(/convertible|cabrio|spyder|roadster|reatta/.test(ins))o.style='cabrio';
  if(/police|pursuit|interceptor|ghost|sheriff|cruiser|lifeguard/.test(ins)&&!/beach/.test(ins))o.extra.push('lightbar');
  if(/\btaxi\b/.test(ins))o.extra.push('taxi');
  if(/gt-r|type r|\bsti\b|\bevo\b|\brs\d?\b|stingray|\bgto\b|senna|pista|jugular|hellfire|cobra|drafter|m3|m2|amg/.test(ins))o.extra.push('spoiler');
  if(/demon|cobra r|wrx sti|zentorno|veneno|senna|zerouno|sesto|project 8|superfast/.test(ins))o.extra.push('wing');
  if(/1959|eldorado|bel air|fairlane club|1956|1950/.test(ins))o.extra.push('fins');
  if(/challenger|trans am|firebird|chevelle|cutlass|mustang|camaro|javelin|charger|cougar/.test(ins))o.extra.push('hoodstripe');
  if(/demon|hellcat|srt|gt 500|cobra|1970 challenger|chevelle|super sport|impala ss/.test(ins))o.extra.push('scoop');
  if(/lowrider|donk|slamvan|rat rod/.test(ins))o.extra.push('lift');
  return o;}

function pick(v){
  const ins=L(v.insp)+' '+L(v.nom)+' '+L(v.id),cat=v.cat,seed=v.id,j=(k,a)=>jit(seed,k,a);
  const has=re=>re.test(ins);
  /* divers et rail */
  if(has(/monorail|apm/))return rail({kind:'monorail'},seed);
  if(has(/locomotive|genesis|ac4400|freight/))return rail({kind:'train'},seed);
  if(has(/metrorail|vcia-train|vcmm-train|train/))return rail({kind:'metro'},seed);
  if(has(/excavator|liebherr/))return excavator();
  if(has(/forklift|yale/))return forklift({});
  if(has(/airtug|clark ct/))return P('M40 84h150v6h-150z')+P('M60 70h60v-26h-60z')+G('M66 50h48v14h-48z',.3)+P('M120 62h70v22h-70z')+P('M124 44h20v18h-20z')+wheel(70,90,10,5)+wheel(170,90,10,5);
  if(has(/bmx/))return bike({kind:'bmx'},seed);
  if(has(/beach cruiser|vélo de plage/))return bike({kind:'cruiser'},seed);
  if(has(/e-bike|citibike|lombike/))return bike({kind:'ebike'},seed);
  if(has(/pinarello|race bike|endurex/))return bike({kind:'race'},seed);
  if(has(/rockshox|saracen|scorcher/))return bike({kind:'mtb'},seed);
  if(has(/bird one|electric-scooter|trottinette/))return bike({kind:'kick'},seed);
  /* aéronefs */
  if(cat==='avion'){
    if(has(/747|airliner|\bjet\b/))return plane({kind:'airliner'},seed);
    if(has(/learjet|citation/))return plane({kind:'bizjet'},seed);
    if(has(/beaver|dodo/))return plane({kind:'seaplane'},seed);
    if(has(/twin otter|streamer/))return plane({kind:'twin'},seed);
    if(has(/stearman|duster|biplan/))return plane({kind:'biplane'},seed);
    if(has(/blimp|goodyear/))return plane({kind:'blimp'},seed);
    return plane({kind:'cessna'},seed);}
  if(cat==='helicoptere'){
    if(has(/little bird|buzzard/))return heli({kind:has(/police|mh-6/)?'light':'attack'},seed);
    if(has(/s-300|hughes|sparrow/))return heli({kind:'frame'},seed);
    if(has(/uh-1|412|venom|valkyrie/))return heli({kind:'heavy'},seed);
    return heli({kind:'medium'},seed);}
  /* bateaux */
  if(cat==='bateau'){
    if(has(/airboat|hydroglisseur/))return boat({kind:'airboat'},seed);
    if(has(/kayak/))return boat({kind:'kayak'},seed);
    if(has(/sea-doo|sea doo|seashark|rxt|jetmax|jet ski/))return boat({kind:'jetski'},seed);
    if(has(/cruise|voyager|paquebot/))return boat({kind:'ship'},seed);
    if(has(/ferry/))return boat({kind:'ferry'},seed);
    if(has(/\btaxi\b/))return boat({kind:'taxi'},seed);
    if(has(/catamaran/))return boat({kind:'cat'},seed);
    if(has(/sail|voilier|cherubini|classic 20/))return boat({kind:'sail'},seed);
    if(has(/inflatable|dinghy|highfield|rb-s|rigid/))return boat({kind:'rib'},seed);
    if(has(/contender|steiger|fishing|pêche|longfin|crusader|\bbay\b|marquis/))return boat({kind:has(/marquis|adjutor/)?'yacht':'console'},seed);
    if(has(/lürssen|lurssen|azimut 85|de hoop|brion|riva 86|coral/))return boat({kind:'yacht'},seed);
    if(has(/sundancer|atlantis|frauscher|delmar|bavaria|crownline/))return boat({kind:'cabin'},seed);
    return boat({kind:'speed'},seed);}
  /* motos et engins */
  if(cat==='moto'){
    if(has(/mobility|maxima/))return moto({kind:'mobility',wr:8},seed);
    if(has(/vespa|zip|v-clic|agility|bws|scooter/))return moto({kind:'scooter',wr:11},seed);
    if(has(/xl 350|xr 500|ktm|yz450|enduro|sanchez|manchez|lifeguard|blazer/))return has(/lifeguard|blazer/)?moto({kind:'quad',wr:14},seed):moto({kind:'dirt',wr:14},seed);
    if(has(/chopper|fat bob|iron 883/))return moto({kind:'chopper',wr:12},seed);
    if(has(/night rod|road king/))return moto({kind:'cruiser',wr:13},seed);
    if(has(/streetfighter|brutale/))return moto({kind:'naked',wr:13},seed);
    return moto({kind:'sport',wr:13},seed);}
  if(has(/yfz|sportsman|polaris|quad/))return moto({kind:'quad',wr:14},seed);
  if(has(/maverick x3|can-am|utv/))return moto({kind:'utv',wr:16},seed);
  if(has(/swamp buggy/))return moto({kind:'swamp',wr:22},seed);
  /* camions, bus, services */
  if(has(/xcelsior|new flyer|airport-bus/))return bus({kind:'city',wr:11},seed);
  if(has(/mci|greyhound|autocar|coach/))return bus({kind:'coach',wr:11},seed);
  if(has(/school/))return bus({kind:'school',wr:11},seed);
  if(has(/fleetwood|winnebago|rexhall|pace arrow|southwind|rose air|moocher|journey/))return bus({kind:'rv',wr:11},seed);
  if(has(/shuttle/))return bus({kind:'shuttle',wr:11},seed);
  if(has(/ambulance/))return truck({kind:'ambulance',yb:84,wr:11,hood:false},seed);
  if(has(/\btow\b|dépanneuse|depanneuse/))return truck({kind:'tow',yb:84,wr:12,hood:true},seed);
  if(has(/packer|garbage|benne à ordures/))return truck({kind:'garbage',yb:84,wr:12,hood:true,axles:3},seed);
  if(has(/tipper|rubble|dump/))return truck({kind:'dump',yb:84,wr:13,hood:true,axles:3},seed);
  if(has(/mixer|béton/))return truck({kind:'mixer',yb:84,wr:13,hood:true,axles:3},seed);
  if(has(/flatbed|mtl-flatbed/))return truck({kind:'flat',yb:84,wr:12,hood:true,axles:3},seed);
  if(has(/peterbilt|kenworth|freightliner|tracteur|\bsemi\b|hauler|t800|\b9000\b|9200|s-series/))return truck({kind:'semi',yb:84,wr:13,hood:true,axles:has(/t800|biff/)?3:2},seed);
  if(has(/canter|\belf\b|kodiak|topkick|4700|silverado 6500|step van|boxville|benson|\bmule\b|utility|stockade|\briot\b|\bbear\b|lenco/))return truck({kind:has(/riot|bear|lenco|stockade/)?'ambulance':'box',yb:84,wr:11,hood:has(/4700|kodiak|topkick|6500|stockade|riot|bear/)},seed).replace(/M(\d+) 52v18M(\d+) 61h18/,'M$1 52v0');
  /* pick-up */
  if(cat==='pickup'||has(/pick-up|pickup|f-150|f-series|ram |ram 3500|silverado|c10|c\/k|s-10|hilux|tundra|ranger|super duty|dakota|raptor|ranchero|scrambler|sport trac|caracara/)){
    const o={x0:22,x1:222,yb:86,yBelt:62,yRoof:42,cabA:154,cabB:112,yHood:56,hoodStart:176,wr:14,extra:[]};
    if(has(/ranchero|cougar|sport trac|dakota/)){o.yRoof=46;o.yBelt=66;o.wr=12.5;o.cabB=104;}
    if(has(/crew|quad|f-150|raptor|3500|silverado|tundra|kamacho|crew chief/)){o.crew=true;o.cabB=96;}
    if(has(/raptor|6x6|caracara|kamacho|rebel|hilux/))o.extra.push('bullbar');
    if(has(/monster/)){o.wr=24;o.yb=70;o.yBelt=48;o.yRoof=28;o.yHood=42;o.knob=true;o.extra.push('lift');}
    if(has(/lifeguard|police/))o.extra.push('lightbar');
    if(has(/raptor|rebel|kamacho|caracara|hilux|sandking/))o.knob=true;
    if(has(/1953|1956|c10|des années 60/)){o.yRoof=40;o.cabB=110;o.hoodStart=170;o.wr=13;}
    o.wr=rnd(o.wr+jit(v.id,'wr',1.2),1);o.yRoof=rnd(o.yRoof+jit(v.id,'roof',2),1);o.wa=rnd(50+jit(v.id,'wa',5),1);o.wb=rnd(188+jit(v.id,'wb',4),1);o.spokes=5+(hash(v.id)%3);
    return pickup(o,seed);}
  /* voitures */
  let base={};
  if(cat==='supercar'||has(/lamborghini|mclaren|sf90|488|senna|zerouno|huracán|aventador|812|458|zagato|testarossa|512|diablo|cizeta|kellison/)){base={style:'fast',era:'wedge',yRoof:52,yBelt:70,yHood:66,roofA:132,roofB:70,x0:20,x1:224,wr:13.5,doors:2,extra:[]};}
  else if(cat==='sport'&&has(/911|cayman|corvette|viper|daytona|cr-x|ae86|eclipse|rc f|m2|m3|m6|rs5|continental gt|wraith|mark viii|cle|g35|e-tron|taycan|skyline|talon|sf90/)){base={style:has(/911|cayman|corvette c8|viper|skyline|cr-x/)?'fast':'notch',yRoof:48,yBelt:68,yHood:62,roofA:140,roofB:76,wr:13,doors:2,extra:[]};}
  else if(cat==='muscle'){base={style:has(/mustang|challenger|camaro|trans am|firebird|javelin|cougar/)?'fast':'notch',yRoof:47,yBelt:67,yHood:60,roofA:140,roofB:72,x0:18,x1:224,wr:13,doors:2,extra:[]};if(has(/continental|imperial|impala 1960|bel air|lowrider|1965/)){base.style='notch';base.roofB=64;base.wr=12;}}
  else if(cat==='suv'){base={style:'suv',yRoof:36,yBelt:62,yHood:54,roofA:158,roofB:34,hoodStart:180,x0:22,x1:222,wr:14,doors:4,extra:has(/wrangler|bronco|hummer|g-class|patrol|cherokee xj/)?['rack']:[]};if(has(/wrangler|bronco|hummer|h1|rubicon/)){base.knob=true;base.extra.push('bullbar');}if(has(/evoque|urus|macan|levante|q8|x5|cullinan|escalade|navigator/))base.yRoof=40;}
  else if(cat==='van'){base={style:'van',yRoof:34,yBelt:62,yHood:56,roofA:176,roofB:30,hoodStart:192,x0:20,x1:222,wr:12.5,doors:4,extra:[]};if(has(/ram|c\/k|bobcat|bison/)){return pick(Object.assign({},v,{cat:'pickup'}));}if(has(/sienna|town & country|caravan|voyager/)){base.style='wagon';base.yRoof=40;base.roofA=166;base.hoodStart=184;}}
  else if(cat==='berline'&&has(/wagon|station|town & country/)){base={style:'wagon',yRoof:44,yBelt:66,yHood:60,roofA:154,roofB:36,wr:12.5,doors:4,extra:['rack']};}
  else if(cat==='berline'&&has(/sonic|jetta|hatch/)){base={style:'hatch',yRoof:44,yBelt:66,yHood:60,roofA:150,roofB:62,wr:12.5,doors:4,extra:[]};}
  else if(cat==='service'&&has(/tahoe|suburban|navigator|explorer|expedition/)){base={style:'suv',yRoof:38,yBelt:62,yHood:54,roofA:158,roofB:34,hoodStart:180,wr:13.5,doors:4,extra:['lightbar']};if(has(/taxi/))base.extra=['taxi'];}
  else if(cat==='service'&&has(/caravan|town & country/)){base={style:'wagon',yRoof:40,yBelt:64,yHood:58,roofA:166,roofB:32,hoodStart:184,wr:12.5,doors:4,extra:['taxi']};}
  else if(has(/1950|1956|1959|1960|eldorado|bel air|fairlane|de ville 1977|continental|imperial/)){base={style:'notch',yRoof:46,yBelt:68,yHood:62,roofA:146,roofB:78,x0:16,x1:226,wr:12,doors:2,extra:[]};}
  else {base={style:'notch',yRoof:44,yBelt:66,yHood:60,roofA:148,roofB:76,wr:12.5,doors:4,extra:[]};if(has(/audi|bmw|mercedes|lexus|infiniti|rs7|brabus|300/))base.yRoof=46;}
  const o=carParams(v,base);
  if(o.style==='cabrio'&&!o.extra.includes('softtop'))o.extra.push('softtop');
  if(has(/rat rod|slamvan/)){o.style='notch';o.roofA=120;o.roofB=90;o.yRoof=50;o.extra.push('exhaust');}
  return car(o,seed);}

const HEADER=h=>`<svg class="veh-art veh-art--schema" viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="height:${h}px">`;
/* Variation propre à chaque fiche : proportions légèrement différentes (longueur, hauteur, décalage) et une ligne de livrée
   dont la position dépend du nom, pour que deux engins du même type restent reconnaissables l'un de l'autre. */
function vary(v,body){const seed=v.id;const sx=rnd(1+jit(seed,'sx',.06),3),sy=rnd(1+jit(seed,'sy',.04),3),tx=rnd(jit(seed,'tx',5),1);
  const y=rnd(58+jit(seed,'ly',14),1),x0=rnd(60+jit(seed,'lx',20),1),len=rnd(60+jit(seed,'ll',30),1);
  const accent=(hash(seed)%3===0)?'':H(`M${x0} ${y}h${len}`,2.2,.42);
  return `<g transform="translate(${tx} 0) scale(${sx} ${sy})" transform-origin="120 100">${body}${accent}</g>`;}
function schema(v,h=90){try{const body=pick(v);if(!body)return '';return HEADER(h)+vary(v,body)+H('M8 100h224',1.2,.25)+'</svg>';}catch(e){return '';}}
module.exports={schema};
