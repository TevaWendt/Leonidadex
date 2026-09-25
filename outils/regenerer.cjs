#!/usr/bin/env node
'use strict';
// Commande de maintenance, jamais une commande de build Vercel.
const {execFileSync}=require('node:child_process'),path=require('node:path'),root=path.resolve(__dirname,'..');
const steps=['final.js','gen.js','gen-armes.cjs','lore-gen.js','gen-acquisitions.cjs','gen-informations.cjs','gen-tuto.cjs','gen-achats.cjs','sync-site.cjs','gen-leo.cjs','sync-site.cjs'];
for(const file of steps)execFileSync(process.execPath,[path.join(__dirname,file)],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,[path.join(__dirname,'gen-leo.cjs'),'--check'],{cwd:root,stdio:'inherit'});
