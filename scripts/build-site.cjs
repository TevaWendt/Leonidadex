const fs=require('fs'),path=require('path'),{spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');process.chdir(root);
for(const file of ['final.js','gen.js','audit-final.js']){const r=spawnSync(process.execPath,[file],{stdio:'inherit'});if(r.status!==0)process.exit(r.status||1);}
const dest=path.join(root,'dist');fs.rmSync(dest,{recursive:true,force:true});fs.mkdirSync(dest);
const files=fs.readdirSync(root).filter(f=>f.endsWith('.html'));
files.push('style.css','fiches.css','app.js','common.js','fiches.js','armes-data.js','vehicules-data.js','search-index.js','carte.js','carte-gtadb.js','assets-manifest.js','comparateur.js','classement.js','progression.js','progression-data.js','robots.txt','sitemap.xml','sitemap-fiches.xml');
if(fs.existsSync('credits-reels.json'))files.push('credits-reels.json');
for(const f of files)fs.copyFileSync(f,path.join(dest,f));
for(const dir of ['vehicules','armes']){fs.mkdirSync(path.join(dest,dir));for(const f of fs.readdirSync(dir).filter(f=>f.endsWith('.html')))fs.copyFileSync(path.join(dir,f),path.join(dest,dir,f));}
for(const dir of ['photos','img'])if(fs.existsSync(dir))fs.cpSync(dir,path.join(dest,dir),{recursive:true});
console.log('Build terminé : dist/ contient uniquement les fichiers publics.');
