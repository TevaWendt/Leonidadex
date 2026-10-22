'use strict';
/* v8.04 (lot I, Téva : « pas propre, manque de visuel, effet de vide à cause du manque d’info ») : le bloc « En lien » des
   fiches (monde, animaux, activités, missions, radios) et « Les autres stations », écrit par un seul moteur.
   - Une grille de cartes cliquables homogènes : vignette (visuel officiel déjà utilisé par le site pour cet élément, schéma
     du site pour un véhicule ou une arme sans visuel, silhouette de notre carte pour un lieu de la carte, plaque de la
     station), type puis nom ; jamais une image inventée.
   - Les familles ne font plus une rangée chacune : toutes les cartes partagent la grille, le type est écrit sur la carte.
   - Les rangées remplissent la largeur et s’équilibrent (aucune carte orpheline) : 5 cartes au plus par rangée sur
     ordinateur, 3 sur tablette, une liste sur téléphone ; une ou deux cartes deviennent de grandes cartes en largeur, avec
     l’accroche de l’élément. Le nombre de cartes par rangée est calculé ici (classes lk-rel-lN et lk-rel-mN, style.css).
   - Une seule apparition : la classe lk-reveal du moteur commun (common.js, LKMotion). Au survol et au focus, seule
     l’entrée réagit (cadre, ombre, image dans son cadre, chevron) ; la carte ne se déplace pas.
   Usage : const EL = require('./en-lien.cjs'); EL.block({ items: [EL.entity(...), EL.vehicle(id, '../'), …] }). */
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ROOT = path.resolve(__dirname, '..');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CHEV = '<svg class="lk-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
const PIN = '<svg class="lk-rel-pin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/></svg>';

let MED = null, VEH = null, ARM = null, AMED = null;
const med = () => MED || (MED = JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/medias-officiels.json'), 'utf8')));
function data(file, key) { const c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), c); return c.window[key] || []; }
const veh = () => VEH || (VEH = Object.fromEntries(data('vehicules-data.js', 'LK_VEHICULES').map(v => [v.id, v])));
const arm = () => ARM || (ARM = Object.fromEntries(data('armes-data.js', 'LK_ARMES').map(a => [a.id, a])));

/* ---------- vignettes ---------- */
/* m : entrée de medias-officiels.json (ou objet { variants }) ; sizes posé par block() selon la largeur réelle de la carte */
function photo(m) {
  if (!m || !m.variants || !m.variants[0]) return null;
  const a = m.variants[0], b = m.variants[1] && m.variants[1].w > a.w ? m.variants[1] : null, ss = u => u.replace(/,/g, '%2C');
  return { kind: 'photo', key: a.src, html: s => '<img src="' + a.src + '"' + (b ? ' srcset="' + ss(a.src) + ' ' + a.w + 'w, ' + ss(b.src) + ' ' + b.w + 'w" sizes="' + s + '"' : '') + ' width="' + a.w + '" height="' + a.h + '" alt="" loading="lazy" decoding="async">' };
}
const medias = ids => (ids || []).map(id => med()[id]).filter(Boolean);
const raw = (kind, html, key) => ({ kind, key: key || html, html: () => html });
/* vignettes possibles d’un élément, dans l’ordre de préférence : block() prend la première qui n’est pas déjà sur une autre
   carte du bloc (la région et la moto d’Ambrosia ne montrent plus la même capture) */
const figs = list => list.filter(Boolean);

/* ---------- éléments ---------- */
/* fiche du monde, d’activité ou de mission (outils/editorial*.json) : premier visuel officiel, sinon celui fourni (img) */
function entity(y, { href, kind, rel, img } = {}) {
  return { href, name: y.name, kind, rel, figs: figs([photo(img), ...medias(y.media).map(photo)]), desc: y.tagline || y.description || '', more: y.tagline && y.description ? y.description : '' };
}
/* véhicule : visuel officiel de sa fiche, sinon son schéma (img/schemas/<id>.svg, le même dessin que le hub) */
function vehicle(id, p) {
  const v = veh()[id]; if (!v) throw new Error('En lien : véhicule inconnu ' + id);
  const name = ((v.marque ? v.marque + ' ' : '') + v.nom).replace(/^Marque inconnue /, '');
  const schema = fs.existsSync(path.join(ROOT, 'img/schemas', id + '.svg')) ? raw('schema', '<img src="/img/schemas/' + esc(id) + '.svg" width="240" height="120" alt="" loading="lazy" decoding="async">') : null;
  return { href: p + 'vehicules/' + id + '.html', name, kind: 'Véhicule', rel: 'vehicles', figs: figs([...medias(v.medias).map(photo), schema]), desc: v.txt || '' };
}
/* arme : visuel officiel de sa fiche (outils/armes-medias.json), sinon son schéma (outils/armes-schemas.cjs) */
function weapon(id, p) {
  const a = arm()[id]; if (!a) throw new Error('En lien : arme inconnue ' + id);
  AMED = AMED || JSON.parse(fs.readFileSync(path.join(ROOT, 'outils/armes-medias.json'), 'utf8'));
  const svg = require('./armes-schemas.cjs').schema(id, 90);
  return { href: p + 'armes/' + id + '.html', name: a.nom, kind: 'Arme', rel: 'weapons', figs: figs([...medias(AMED[id]).map(photo), svg ? raw('schema', svg) : null]), desc: a.fr || '' };
}
/* lieu de notre carte : la silhouette de Leonida cadrée sur le lieu, avec son repère (même vignette que les cartes-lieux
   des hubs, outils/carte-vignette.cjs) ; demande le symbole de la carte une fois dans la page (block() le pose) */
function place(id, p, name) {
  let svg = null; try { svg = require('./carte-vignette.cjs').vignette(id); } catch (e) { svg = null; }
  return { href: p + 'carte.html#lieu=' + encodeURIComponent(id), name, kind: 'Sur la carte', rel: 'map', figs: figs([svg ? raw('map', svg) : null]), cta: 'Voir sur la carte', map: !!svg };
}

/* ---------- mise en page ---------- */
/* rangées équilibrées : n cartes, au plus max par rangée, les plus grandes rangées d’abord (7 → 4 + 3, 17 → 5 + 4 + 4 + 4) */
function rows(n, max) {
  const r = Math.ceil(n / max), base = Math.floor(n / r), extra = n % r, out = [];
  for (let i = 0; i < r; i++) for (let j = 0, k = base + (i < extra ? 1 : 0); j < k; j++) out.push(k);
  return out;
}
const DESK = 5, TAB = 3;
function card(it, o) {
  const fig = it.fig ? '<span class="lk-rel-fig lk-rel-fig--' + it.fig.kind + '">' + it.fig.html(o.sizes) + '</span>'
    : '<span class="lk-rel-fig lk-rel-fig--vide" aria-hidden="true">' + PIN + '</span>';
  const go = o.wide ? '<span class="lk-rel-go">' + esc(it.cta || 'Voir la fiche') + ' ' + CHEV + '</span>' : '<span class="lk-rel-go" aria-hidden="true">' + CHEV + '</span>';
  return '<a class="lk-rel-card lk-reveal' + (o.cls ? ' ' + o.cls : '') + '" href="' + esc(it.href) + '"' + (it.rel ? ' data-rel="' + esc(it.rel) + '"' : '') + '>' + fig
    /* le texte de la carte est un bloc : l’accroche et la présentation sont des paragraphes, que la traduction (outils/langues.cjs)
       prend phrase par phrase comme sur la fiche elle-même */
    + '<div class="lk-rel-txt"><span class="lk-rel-k">' + esc(it.kind) + '</span><span class="lk-rel-n"' + (it.nameNo ? ' translate="no"' : '') + '>' + esc(it.name) + '</span>'
    + (o.wide && it.desc ? '<p class="lk-rel-d">' + esc(it.desc) + '</p>' : '') + (o.solo && it.more ? '<p class="lk-rel-d lk-rel-d--more">' + esc(it.more) + '</p>' : '') + go + '</div></a>';
}
/* items : [{ href, name, kind, rel, figs (vignettes possibles) ou fig (imposée), desc, more, cta, nameNo }] ; title : titre du bloc (h2) */
function block({ title = 'En lien', items, cls = '' } = {}) {
  const list = (items || []).filter(Boolean); if (!list.length) return '';
  const seen = new Set(), uniq = list.filter(it => !seen.has(it.href) && seen.add(it.href)), n = uniq.length, wide = n <= 2;
  const used = new Set();
  /* les éléments qui ont le moins de vignettes possibles choisissent d’abord (la demeure de Cal n’a que la capture de Cal :
     elle la garde, et la carte de Cal prend son autre capture) */
  for (const it of uniq) if (it.fig !== undefined && it.fig) used.add(it.fig.key);
  for (const it of uniq.filter(x => x.fig === undefined).sort((a, b) => (a.figs || []).length - (b.figs || []).length)) {
    it.fig = (it.figs || []).find(f => !used.has(f.key)) || (it.figs || [])[0] || null; if (it.fig) used.add(it.fig.key);
  }
  const d = rows(n, DESK), t = rows(n, TAB);
  const cards = uniq.map((it, i) => card(it, wide
    ? { wide: true, solo: n === 1, sizes: '(max-width:599px) 40vw, ' + (n === 1 ? 520 : 380) + 'px' }
    : { cls: 'lk-rel-l' + d[i] + ' lk-rel-m' + t[i], sizes: '(max-width:599px) 120px, (max-width:1099px) ' + Math.round(100 / t[i]) + 'vw, ' + Math.round(1400 / d[i]) + 'px' })).join('');
  const defs = uniq.some(it => it.map) ? require('./carte-vignette.cjs').defs() : '';
  return '<div class="lore-related lk-rel lk-rel--' + (wide ? 'wide lk-rel--n' + n : 'grid') + (cls ? ' ' + cls : '') + '"><h2>' + esc(title) + '</h2>' + defs + '<div class="lk-rel-grid">' + cards + '</div></div>';
}

module.exports = { block, entity, vehicle, weapon, place, photo, medias, rows, raw, esc };
