#!/usr/bin/env node
/* ============================================================
   LEONIDAKIT — photos des modèles réels
   Interroge l'API de Wikimedia Commons, ne retient que les
   fichiers sous licence libre, télécharge l'image et enregistre
   l'attribution exigée par la licence.

   Usage :  node photos-reelles.js            (tout ce qui manque)
            node photos-reelles.js --force    (retélécharge tout)
            node photos-reelles.js grotti-cheetah-classic   (un seul)

   Sortie :  img/vehicules/<id>-reel.jpg
             credits-reels.json
             photos-a-revoir.txt
   ============================================================ */
const fs = require('fs');
process.chdir(__dirname);
const path = require('path');
const https = require('https');

const API = 'https://commons.wikimedia.org/w/api.php';
const DOSSIER = path.join('img', 'vehicules');
const CREDITS = 'credits-reels.json';
const UA = 'Leonidakit/1.0 (https://www.leonidakit.com; contact@leonidakit.com)';

/* licences acceptées : tout ce qui autorise la réutilisation commerciale
   avec attribution. Tout le reste est écarté, sans exception. */
const estLibre = require('./scripts/licenses.cjs');

function get(url, redirects = 0) {
  if(redirects > 5)return Promise.reject(new Error('Trop de redirections'));
  const parsed = new URL(url);
  if(parsed.protocol !== 'https:')return Promise.reject(new Error('URL non HTTPS')); 
  return new Promise((ok, ko) => {
    https.get(url, { headers: { 'User-Agent': UA } }, r => {
      if (r.statusCode >= 300 && r.statusCode < 400 && r.headers.location)
        { r.resume(); return get(new URL(r.headers.location,url).href,redirects+1).then(ok,ko); }
      if (r.statusCode !== 200) return ko(new Error('HTTP ' + r.statusCode));
      let size=0; const buf = []; r.on('data', d => {size+=d.length;if(size>15*1024*1024){r.destroy(new Error('Fichier trop volumineux'));return;}buf.push(d);});r.on('error',ko); r.on('end', () => ok(Buffer.concat(buf)));
    }).on('error', ko).setTimeout(20000,function(){this.destroy(new Error('Délai dépassé'));});
  });
}
const getJSON = async u => JSON.parse((await get(u)).toString('utf8'));
const nettoie = s => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

/* recherche les fichiers correspondant au modèle réel */
async function chercher(terme) {
  const u = API + '?' + new URLSearchParams({
    action:'query', format:'json', origin:'*',
    generator:'search', gsrsearch:'filetype:bitmap ' + terme,
    gsrnamespace:'6', gsrlimit:'20',
    prop:'imageinfo', iiprop:'url|size|extmetadata',
    iiurlwidth:'1400'
  });
  const d = await getJSON(u);
  return Object.values((d.query && d.query.pages) || {});
}

/* choisit le meilleur fichier libre : paysage, grand, nom proche du modèle */
function choisir(pages, terme) {
  const mots = terme.toLowerCase().split(/\s+/).filter(m => m.length > 2);
  return pages.map(p => {
    const ii = (p.imageinfo || [])[0]; if (!ii) return null;
    const meta = ii.extmetadata || {};
    const licence = nettoie((meta.LicenseShortName || {}).value);
    if (!estLibre(licence)) return null;
    if (ii.width < 800) return null;
    const ratio = ii.width / ii.height;
    if (ratio < 1.1 || ratio > 2.4) return null;              /* on veut du paysage */
    const titre = p.title.toLowerCase();
    if (/logo|badge|emblem|interior|engine|wheel|dashboard|seat|crash|wreck/.test(titre)) return null;
    let score = mots.filter(m => titre.includes(m)).length * 10;
    score += Math.min(ii.width, 3000) / 500;
    if (/front|avant|3-?4|three.quarter/.test(titre)) score += 4;
    if (/side|profil/.test(titre)) score += 2;
    return {
      score, licence,
      url: ii.thumburl || ii.url,
      page: ii.descriptionurl,
      auteur: nettoie((meta.Artist || {}).value) || 'Auteur non précisé',
      licenceUrl: nettoie((meta.LicenseUrl || {}).value),
      fichier: p.title.replace(/^File:/, '')
    };
  }).filter(Boolean).sort((a, b) => b.score - a.score)[0] || null;
}

(async () => {
  global.window = {};
  eval(fs.readFileSync('vehicules-data.js', 'utf8'));
  const V = window.LK_VEHICULES;

  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const cibles = args.filter(a => !a.startsWith('--'));

  fs.mkdirSync(DOSSIER, { recursive: true });
  const credits = fs.existsSync(CREDITS) ? JSON.parse(fs.readFileSync(CREDITS, 'utf8')) : {};
  const revoir = [];

  const liste = V.filter(v => v.insp && (!cibles.length || cibles.includes(v.id)));
  console.log(liste.length + ' véhicules à traiter\n');

  let ok = 0, saute = 0, rate = 0;
  for (const v of liste) {
    const dest = path.join(DOSSIER, v.id + '-reel.jpg');
    if (!force && fs.existsSync(dest) && credits[v.id]) { saute++; continue; }
    try {
      const pages = await chercher(v.insp);
      const c = choisir(pages, v.insp);
      if (!c) { rate++; revoir.push(v.id + '\t' + v.insp + '\taucun fichier libre trouvé'); 
                console.log('  –  ' + v.id.padEnd(34) + v.insp); continue; }
      fs.writeFileSync(dest, await get(c.url));
      credits[v.id] = { fichier:c.fichier, auteur:c.auteur, licence:c.licence,
                        licenceUrl:c.licenceUrl, page:c.page, modele:v.insp };
      fs.writeFileSync(CREDITS, JSON.stringify(credits,null,1));
      ok++;
      console.log('  ok ' + v.id.padEnd(34) + c.licence.padEnd(14) + c.auteur.slice(0, 40));
      await new Promise(r => setTimeout(r, 350));   /* on reste poli avec Commons */
    } catch (e) {
      rate++; revoir.push(v.id + '\t' + v.insp + '\t' + e.message);
      console.log('  !! ' + v.id.padEnd(34) + e.message);
    }
  }

  fs.writeFileSync(CREDITS, JSON.stringify(credits, null, 1));
  fs.writeFileSync('photos-a-revoir.txt',
    'Véhicules sans photo libre trouvée automatiquement.\n' +
    'Pour en ajouter une à la main : déposer le fichier dans img/vehicules/<id>-reel.jpg\n' +
    'et ajouter l\'entrée correspondante dans credits-reels.json.\n\n' + revoir.join('\n') + '\n');

  console.log('\ntéléchargées ' + ok + ' · déjà présentes ' + saute + ' · sans résultat ' + rate);
  console.log('crédits écrits dans ' + CREDITS);
  if (rate) console.log('liste des manquantes dans photos-a-revoir.txt');
})();
