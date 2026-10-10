#!/usr/bin/env node
'use strict';
// Commande de maintenance, jamais une commande de build Vercel.
const {execFileSync}=require('node:child_process'),path=require('node:path'),root=path.resolve(__dirname,'..');
const steps=['gen-modele.cjs','final.js','gen.js','gen-armes.cjs','gen-armurerie.cjs','lore-gen.js','gen-missions.cjs'/* section missions */,'gen-activites.cjs'/* section activites */,'gen-radios.cjs'/* section radios */,'gen-animaux.cjs'/* section animaux */,'gen-codes.cjs'/* section codes */,'gen-trophees.cjs'/* section trophees */,'gen-online.cjs'/* section online */,'gen-acquisitions.cjs','gen-informations.cjs','gen-tuto.cjs','gen-achats.cjs','gen-carnets.cjs','sync-site.cjs','gen-leo.cjs','sync-site.cjs'];
/* v7.80 : tas V8 plafonné à 4 Go pour chaque étape : sans plafond, Node laisse le tas grossir jusqu'à 6 Go pendant la
   traduction des langues (gen.js → sync-site.cjs) et peut être tué par le système ; avec, il ramasse plus tôt (3,3 Go). */
const NODE_OPTS=['--max-old-space-size=4096'];
for(const file of steps)execFileSync(process.execPath,[...NODE_OPTS,path.join(__dirname,file)],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,[...NODE_OPTS,path.join(__dirname,'gen-leo.cjs'),'--check'],{cwd:root,stdio:'inherit'});
