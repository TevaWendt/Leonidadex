#!/usr/bin/env node
'use strict';
// Commande de maintenance, jamais une commande de build Vercel.
const {execFileSync}=require('node:child_process'),path=require('node:path'),root=path.resolve(__dirname,'..');
const steps=['gen-modele.cjs','final.js','gen.js','gen-armes.cjs','gen-armurerie.cjs','lore-gen.js','gen-missions.cjs'/* section missions */,'gen-activites.cjs'/* section activites */,'gen-radios.cjs'/* section radios */,'gen-actus.cjs'/* v7.87 : actualités, vidéos, éditions */,'gen-devine.cjs'/* v7.90 : jeu « Devine le lieu » */,'gen-jeux.cjs'/* v8.04 (lot L) : les jeux du site (jeux.html, La frise des annonces, Devine la station) */,'gen-animaux.cjs'/* section animaux */,'gen-codes.cjs'/* section codes */,'gen-trophees.cjs'/* section trophees */,'gen-online.cjs'/* section online */,'gen-pages-elements.cjs'/* v7.95 : une page par élément (lieux de la carte, quartiers et comtés, consommables), avant les listes et les carnets qui s’y relient */,'gen-acquisitions.cjs','gen-compagnon.cjs'/* v7.89 : Mode compagnon, page hors connexion */,'gen-informations.cjs','gen-tuto.cjs','gen-achats.cjs','gen-carnets.cjs','gen-atelier.cjs'/* v7.81 : Atelier 3D */,'sync-site.cjs','gen-leo.cjs','sync-site.cjs'];
/* v7.80 : tas V8 plafonné à 4 Go pour chaque étape : sans plafond, Node laisse le tas grossir jusqu'à 6 Go pendant la
   traduction des langues (gen.js → sync-site.cjs) et peut être tué par le système ; avec, il ramasse plus tôt (3,3 Go). */
const NODE_OPTS=['--max-old-space-size=4096'];
/* v8.04 : gen.js (fiches des véhicules avec carte, légende et configuration) et sync-site.cjs (et lore-gen.js, qui l'appelle),
   qui traduit maintenant 26 664 pages, épuisent un tas de 4 Go : 6 Go pour ces trois étapes (machine de 8 Go, rien d'autre ne
   doit tourner pendant la régénération). */
/* v8.06 : LK_TAS (Mo) remplace les 6 144 Mo des trois grosses étapes quand la machine a moins de mémoire (exemple : LK_TAS=5000 sur
   un atelier limité à 6 Go par processus ; V8 ramasse plus souvent, c'est un peu plus long). */
const BIG=Number(process.env.LK_TAS)>0?Math.round(Number(process.env.LK_TAS)):6144;
const optsFor=file=>/^(gen|sync-site|lore-gen)\./.test(file)?['--max-old-space-size='+BIG]:NODE_OPTS;
for(const file of steps)execFileSync(process.execPath,[...optsFor(file),path.join(__dirname,file)],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,[...NODE_OPTS,path.join(__dirname,'gen-leo.cjs'),'--check'],{cwd:root,stdio:'inherit'});
