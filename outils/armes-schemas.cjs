/* ============================================================
   LEONIDAKIT — armes-schemas.cjs : un schéma SVG par arme (vue de profil, canon à droite)
   Silhouette sombre + quelques traits clairs, dans le style des silhouettes de véhicules.
   viewBox 0 0 240 120. schema(id, hauteurPx) renvoie la balise <svg>.
   Les schémas sont indicatifs : ils représentent le type d'arme identifié, pas un modèle exact.
   ============================================================ */
'use strict';
const INK='#1A1A1E',HL='#FDFBF7';
const P=(d,extra='')=>`<path d="${d}" fill="${INK}"${extra}/>`;
const H=(d,w=1.6)=>`<path d="${d}" fill="none" stroke="${HL}" stroke-opacity=".5" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
const C=(cx,cy,r,fill=INK)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
const HC=(cx,cy,r)=>`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${HL}" stroke-opacity=".5" stroke-width="1.6"/>`;

/* --- morceaux réutilisés --- */
const grip=(x,y,w=22,h=44,slant=8)=>P(`M${x} ${y} h${w} l${-slant} ${h} q-2 4 -6 4 h${-w+8} q-4 0 -3 -4 z`);
const guard=(x,y,w=22)=>H(`M${x} ${y} q0 14 ${w/2} 14 q${w/2} 0 ${w/2} -14`);
const scope=(x,y,len=70)=>P(`M${x} ${y} h${len} v10 h${-len} z`)+P(`M${x+6} ${y+10} h8 v6 h-8 z`)+P(`M${x+len-14} ${y+10} h8 v6 h-8 z`)+P(`M${x-6} ${y-2} h12 v14 h-12 z`)+P(`M${x+len-6} ${y-2} h12 v14 h-12 z`);
const curvedMag=(x,y,w=16,h=38)=>P(`M${x} ${y} h${w} q6 ${h*0.55} -4 ${h} h${-w} q-8 ${-h*0.45} 4 ${-h} z`);
const straightMag=(x,y,w=14,h=34)=>P(`M${x} ${y} h${w} l2 ${h} h${-w} z`);

const S={};

/* ------------------------------ PISTOLETS ------------------------------ */
S['girardi-es9']=P('M46 44 h132 l6 4 v12 h-84 v6 h-8 v-6 h-46 z')                       /* glissière Beretta avec dessus ouvert */
 +P('M92 48 h58 v-4 h-58 z')+P('M46 60 h60 v8 h-60 z')+grip(52,66,26,42,9)+guard(80,66,20)
 +H('M100 46 h48')+H('M62 56 h14')+C(70,90,2.4,HL);
S['klose-k17']=P('M52 46 h124 v16 h-124 z')+P('M52 62 h56 v8 h-56 z')+grip(56,68,24,40,6)            /* Glock : formes carrées */
 +P('M80 70 h22 v10 h-22 z','')+H('M60 54 h100',1.4)+H('M150 50 h20')+P('M176 50 h6 v8 h-6 z');
S['nipper-38']=P('M78 52 h92 v14 h-92 z')+P('M78 66 h40 v6 h-40 z')+grip(82,70,22,34,7)+guard(102,70,16)   /* compact, chien apparent */
 +P('M72 56 l6 -4 v10 z')+H('M90 59 h60',1.4)+C(94,86,2,HL);
S['hawk-little-morgan']=P('M44 60 h120 v14 h-120 z')+P('M164 60 h36 v10 h-36 z')          /* gros revolver, canon long à rail */
 +P('M92 52 h40 v30 h-40 z')+HC(112,67,9)+P('M58 74 h40 l-8 34 q-2 4 -6 4 h-22 q-4 0 -4 -4 z')+guard(84,74,18)
 +P('M42 54 l8 -6 v12 z')+H('M166 63 h32')+H('M50 66 h38');
S['pistolet-custom']=P('M50 46 h126 v14 h-126 z')+P('M50 60 h54 v8 h-54 z')+grip(56,68,24,40,10)+guard(82,68,20)    /* 1911 : chien à ergot, crosse droite */
 +P('M42 44 l10 -6 v12 z')+H('M60 53 h104',1.4)+H('M64 80 l-6 22',1.4)+P('M100 54 h60 v2 h-60 z','');
S['pistolet-auto']=P('M52 46 h124 v16 h-124 z')+P('M52 62 h56 v8 h-56 z')+grip(56,68,24,34,6)        /* Glock à sélecteur et chargeur long */
 +P('M60 102 h22 l-2 14 h-20 z')+P('M46 48 h8 v14 h-8 z')+P('M40 40 h6 v10 h-6 z')+guard(82,70,18)+H('M60 54 h100',1.4);
S['mustang-357']=P('M48 60 h124 v12 h-124 z')+P('M172 60 h30 v9 h-30 z')+P('M120 72 h82 v6 h-82 z')  /* Python : bande ventilée, sous-canon plein */
 +P('M94 52 h40 v30 h-40 z')+HC(114,67,9)+P('M60 74 h38 l-8 32 q-2 4 -6 4 h-22 q-4 0 -4 -4 z')+guard(86,74,16)
 +P('M46 54 l8 -6 v12 z')+H('M140 57 h56')+H('M146 60 v4 M158 60 v4 M170 60 v4 M182 60 v4');

/* ------------------------------ FUSILS À POMPE ------------------------------ */
S['fusil-double']=P('M14 54 q10 -4 22 -4 h62 v18 h-52 l-4 10 q-16 2 -28 0 q-4 -12 0 -24 z')                        /* crosse bois, deux canons juxtaposés */
 +P('M96 44 h132 v8 h-132 z')+P('M96 54 h132 v8 h-132 z')+P('M92 40 h30 v26 h-30 z')+P('M120 48 h40 v18 h-40 z')
 +guard(118,66,18)+P('M98 66 h20 l-4 12 h-14 z')+H('M100 58 h120',1.2)+H('M30 74 q24 -16 60 -18');
S['fusil-pompe']=P('M24 66 h26 l4 -10 h34 v20 h-64 z')+P('M50 56 h30 v34 h-30 z')                /* crosse synthétique à poignée, pompe striée */
 +P('M78 50 h150 v10 h-150 z')+P('M78 60 h132 v6 h-132 z')+P('M116 60 h36 v14 h-36 z')
 +P('M84 66 h16 l-4 14 h-12 z')+guard(100,66,14)+H('M122 63 v9 M130 63 v9 M138 63 v9 M146 63 v9')+P('M222 44 h4 v6 h-4 z')+P('M90 46 h6 v4 h-6 z');

/* ------------------------------ PISTOLETS-MITRAILLEURS ------------------------------ */
S['micro-smg']=P('M60 44 h110 v22 h-110 z')+P('M170 50 h26 v8 h-26 z')                     /* Mini Uzi : chargeur dans la poignée, crosse repliée sur le dessus */
 +P('M92 66 h24 l-2 40 h-22 z')+guard(116,66,16)+P('M60 40 h100 v4 h-100 z')+H('M70 55 h60',1.4)+H('M104 76 v22',1.4)+P('M56 46 h6 v14 h-6 z');
S['smg-compact']=P('M70 52 h96 v16 h-96 z')+P('M166 56 h20 v6 h-20 z')                     /* Škorpion : petit, chargeur droit devant la poignée, crosse fil repliée */
 +grip(74,68,18,30,6)+straightMag(104,68,12,26)+guard(92,68,14)+H('M74 46 h84 q6 0 6 6',1.8)+H('M78 60 h70',1.2)+P('M64 50 h8 v18 h-8 z');
S['smg']=P('M22 60 q6 -14 26 -14 h12 v22 h-12 q-20 0 -26 -14 z')+P('M56 50 h120 v18 h-120 z')  /* MP5 : garde-main, chargeur courbe, hausse tambour */
 +P('M176 54 h48 v8 h-48 z')+P('M130 46 h56 v6 h-56 z')+grip(70,68,20,32,7)+curvedMag(104,68,16,40)+guard(90,68,14)
 +C(122,49,5)+H('M60 59 h112',1.2)+H('M28 60 h28');
S['pm-tactique']=P('M60 52 h112 v16 h-112 z')+P('M172 56 h40 v8 h-40 z')                   /* PM moderne : rail, chargeur droit devant la poignée, crosse repliée sur le côté */
 +P('M56 46 h110 v6 h-110 z')+grip(68,68,20,32,6)+straightMag(106,68,12,34)+guard(90,68,14)
 +P('M52 54 h10 v40 h-10 z')+H('M60 60 h96',1.2)+H('M58 46 h12 M76 46 h12 M94 46 h12 M112 46 h12 M130 46 h12 M148 46 h12',1.4);

/* ------------------------------ FUSILS D'ASSAUT ------------------------------ */
S['carabine']=P('M8 54 h26 v22 h-26 z')+P('M34 58 h26 v10 h-26 z')                          /* M4 : crosse télescopique, poignée de transport, chargeur courbe */
 +P('M60 50 h96 v18 h-96 z')+P('M156 54 h40 v10 h-40 z')+P('M196 56 h34 v6 h-34 z')+P('M100 42 h36 v8 h-36 z')+P('M188 44 h6 v12 h-6 z')
 +grip(82,68,18,30,8)+curvedMag(116,68,16,38)+guard(100,68,14)+H('M12 58 h18',1.4)+H('M64 59 h36',1.2)+H('M160 57 h32',1.2)+P('M226 54 h6 v10 h-6 z');
S['fusil-assaut']=P('M8 52 h34 l6 8 v14 l-6 6 h-34 z')+P('M42 52 h100 v18 h-100 z')          /* AK : chargeur banane, tube à gaz, fût bois */
 +P('M142 50 h44 v14 h-44 z')+P('M186 54 h44 v6 h-44 z')+P('M150 44 h40 v6 h-40 z')+P('M110 44 h22 v6 h-22 z')
 +grip(80,70,18,30,10)+P('M112 70 h20 q10 22 -2 44 h-20 q-10 -22 2 -44 z')+guard(98,70,14)+H('M14 60 h20',1.4)+H('M46 60 h60',1.2)+H('M146 56 h36',1.2);

/* ------------------------------ PRÉCISION ------------------------------ */
S['fusil-precision']=P('M6 60 q10 -12 40 -14 h100 v14 h-52 l-6 14 h-40 l-6 -14 h-36 z')           /* fusil à verrou : monture longue, lunette, levier de culasse */
 +P('M146 54 h84 v8 h-84 z')+scope(72,36,70)+P('M118 60 q10 4 8 14 h-6 q2 -8 -4 -12 z')+guard(90,74,14)+H('M12 64 h30',1.4)+H('M150 57 h60',1.2);
S['fusil-semi-auto']=P('M6 58 h44 l4 -8 h96 v14 h-46 l-4 12 h-36 l-6 -12 h-52 z')            /* M1A : monture bois entière, chargeur boîte, lunette */
 +P('M150 52 h82 v8 h-82 z')+P('M216 48 h12 v16 h-12 z')+scope(80,34,64)+straightMag(104,76,14,28)+guard(92,76,12)
 +H('M12 63 h36',1.4)+H('M56 56 h40',1.2)+H('M154 55 h52',1.2);

/* ------------------------------ MITRAILLEUSE ------------------------------ */
S['mitrailleuse']=P('M6 54 h30 v22 h-30 z')+P('M36 50 h120 v22 h-120 z')                   /* M249 : boîte à bande, canon lourd, bipied */
 +P('M156 54 h74 v10 h-74 z')+P('M100 40 h30 v6 h-30 z')+P('M110 46 h10 v4 h-10 z')
 +grip(72,72,18,30,8)+P('M96 72 h44 v26 h-44 z')+guard(88,72,10)
 +P('M176 64 l-10 30 h4 l10 -30 z')+P('M186 64 l10 30 h-4 l-10 -30 z')+H('M40 60 h50',1.2)+H('M160 58 h60',1.2)+H('M100 84 h36',1.4);

/* ------------------------------ MÊLÉE ------------------------------ */
S['batte']=P('M20 66 q0 -8 12 -8 l190 -14 q10 0 10 8 q0 8 -10 8 l-190 14 q-12 0 -12 -8 z')     /* batte : manche fin, fût qui s'élargit */
 +P('M20 58 h14 v16 h-14 z')+H('M40 66 h40',1.4)+H('M150 58 h60',1.2);
S['couteau-cran']=P('M30 56 h90 v18 h-90 z')+P('M120 56 h64 q28 -2 34 10 q-14 8 -34 8 h-64 z')  /* cran d'arrêt : lame ouverte, bouton */
 +C(44,65,3,HL)+H('M56 65 h54',1.4)+H('M124 66 h60',1.2)+P('M112 52 h8 v4 h-8 z');
S['club-golf']=P('M40 34 h6 l14 60 q6 2 4 6 h-8 l-16 -64 z')                                      /* fer de golf : manche incliné, tête plate */
 +P('M46 88 l-6 20 q18 10 46 6 q10 -2 6 -8 q-14 -8 -34 -12 l-4 -8 z')+H('M50 42 l12 44',1.4)+H('M50 106 q16 6 34 4',1.2);
S['marteau']=P('M30 60 h130 v10 h-130 z')                                                             /* marteau de charpentier : tête à panne fendue */
 +P('M156 42 h30 v46 h-30 z')+P('M186 52 h18 v26 h-18 z')+P('M156 42 q-20 -4 -30 12 l8 6 q6 -10 22 -6 z')+P('M156 88 q-20 4 -30 -12 l8 -6 q6 10 22 6 z')
 +H('M40 65 h100',1.4)+H('M164 50 v30',1.2);
S['queue-billard']=P('M14 66 h214 q4 0 4 -2 v-2 q0 -2 -4 -2 h-214 q-6 0 -6 3 q0 3 6 3 z')             /* queue de billard : longue, fine, bout de cuir */
 +P('M14 57 h50 v12 h-50 z')+P('M226 60 h8 v6 h-8 z')+H('M20 63 h36',1.2)+H('M80 63 h130',1);

/* ------------------------------ PROJECTILES ------------------------------ */
S['molotov']=P('M60 78 q0 -20 22 -26 v-22 h20 v22 q22 6 22 26 v18 q0 8 -8 8 h-48 q-8 0 -8 -8 z')       /* bouteille, chiffon et flamme */
 +P('M92 30 h20 l14 -12 q6 -4 8 2 q-2 8 -10 12 h-32 z')+P('M134 12 q10 -12 4 -20 q10 8 6 20 q-4 8 -10 8 q-6 0 0 -8 z')
 +H('M70 74 q4 -12 16 -16',1.4)+H('M100 40 v34',1.2);
S['fumigene']=P('M76 36 h56 v68 q0 6 -6 6 h-44 q-6 0 -6 -6 z')                                        /* grenade fumigène : cylindre, cuillère, goupille */
 +P('M92 24 h24 v12 h-24 z')+P('M116 24 q26 0 30 40 h-6 q-4 -34 -24 -34 z')+HC(94,20,6)+H('M84 50 h40',1.4)+H('M84 62 h40 M84 74 h40',1.2)+H('M104 88 h0.1',3);
/* ------------------------------ SPÉCIALES ------------------------------ */
S['harpon']=P('M40 58 h130 v12 h-130 z')+P('M170 60 h50 v6 h-50 z')+P('M220 58 l12 5 l-12 5 z')      /* fusil-harpon : fût, sandows, flèche */
 +grip(48,70,20,30,8)+guard(70,70,14)+P('M170 52 q-10 -10 -16 -2 l16 4 z')+P('M170 76 q-10 10 -16 2 l16 -4 z')
 +H('M60 64 h100',1.2)+H('M150 50 l20 10 M150 78 l20 -10',1.4);
S['lance-grenades']=P('M14 56 h28 v18 h-28 z')+P('M42 52 h44 v26 h-44 z')                           /* MGL : gros barillet, canon court, poignée avant */
 +P('M86 44 h52 v42 h-52 z')+HC(112,65,14)+HC(112,65,6)+P('M138 56 h70 v14 h-70 z')+P('M208 54 h8 v18 h-8 z')
 +grip(58,78,18,30,8)+P('M160 70 h14 l-2 24 h-14 z')+guard(80,78,12)+H('M18 62 h20',1.4)+H('M142 60 h60',1.2);

const HEADER=(h)=>`<svg class="veh-art veh-art--schema" viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style="height:${h}px">`;
function schema(id,h=90){const body=S[id];if(!body)return '';return HEADER(h)+body+'</svg>';}
module.exports={schema,ids:Object.keys(S)};
