const fs=require('fs'),path=require('path'),vm=require('vm'),postcss=require('postcss');
const root=path.resolve(__dirname,'..');let n=0,failed=0;
function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','dist','.git','archive'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory()){walk(p);continue;}try{if(/\.(?:c?js)$/.test(p)){new vm.Script(fs.readFileSync(p,'utf8'),{filename:p});n++;}else if(p.endsWith('.css')){postcss.parse(fs.readFileSync(p,'utf8'),{from:p});n++;}}catch(e){failed++;console.error(e.message);}}}
walk(root);console.log(n+' fichiers JS/CSS analysés ; '+failed+' erreur(s) de syntaxe.');if(failed)process.exitCode=1;
