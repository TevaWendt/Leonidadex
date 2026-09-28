'use strict';
/* v7.45 (lot 8) : aide pour les tests écrits avant le découpage de l'index de Léo. Depuis la v7.45, leo-index.json est un noyau
   (questions rédigées, lexique, gabarits, noms des petites familles) et les fiches sont dans leo/*.json, chargés à la demande.
   fullCore(root) rend un moteur avec tous les morceaux attachés (réponse synchrone possible) ; allItems(root) rend toutes les
   fiches (véhicules, armes, monde, lieux, catalogues) telles que le moteur les voit. */
const fs=require('node:fs'),path=require('node:path');
function fullCore(root){root=path.resolve(root);const read=f=>JSON.parse(fs.readFileSync(path.join(root,f),'utf8'));const data=read('leo-index.json');const core=require(path.join(root,'leo-core.js')).create(data,{load:async(name,file)=>read(file.slice(1))});for(const name of Object.keys(data.shards))core.attach(name,read(data.shards[name].file.slice(1)));return core;}
function allItems(root){return fullCore(root).items;}
module.exports={fullCore,allItems};
