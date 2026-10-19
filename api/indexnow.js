'use strict';
/* v7.86 (référencement, avis demandé par Téva) : IndexNow — prévenir Bing (et les moteurs qui partagent IndexNow : Yandex,
   Seznam, Naver, Yep ; Yahoo et DuckDuckGo s'appuient en grande partie sur Bing) des pages nouvelles ou modifiées.
   Une tâche planifiée de Vercel (vercel.json → crons, chaque jour à 6 h UTC) appelle cette fonction ; elle lit le plan du site
   publié (sitemap.xml), garde les adresses dont la date « lastmod » est plus récente que le dernier envoi, et les transmet en un
   seul envoi à api.indexnow.org. Le dernier envoi est noté dans la base déjà reliée au projet (KV_REST_API_URL / TOKEN) ;
   sans base, la fonction envoie les adresses des deux derniers jours.
   Clé IndexNow : publique par conception, servie à la racine du site (/<clé>.txt). Protection : avec la variable CRON_SECRET
   (Vercel l'envoie alors à ses tâches planifiées), seule la tâche planifiée est acceptée ; sans elle, seul l'agent « vercel-cron »
   est accepté, et la base empêche deux envois en moins de 20 heures. Aucune donnée de visiteur n'est lue ni envoyée. */
const KEY = '0a923bd2f68183265c5d1b929dd16681';
const HOST = 'www.leonidakit.com', SITE = 'https://' + HOST;
const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10000, MAX_LOTS = 5, LOCK_S = 20 * 3600, TIMEOUT_MS = 15000;
const K_LAST = 'lk:indexnow:depuis', K_LOCK = 'lk:indexnow:verrou';

function reply(res, status, obj) { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.end(JSON.stringify(obj)); }
function kvOf(env) { const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL, token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN; return url && token && /^https:\/\//.test(url) ? { url: String(url).replace(/\/+$/, ''), token: String(token) } : null; }
async function kvRun(kv, fetchImpl, cmds) {
  const r = await fetchImpl(kv.url + '/pipeline', { method: 'POST', headers: { Authorization: 'Bearer ' + kv.token, 'Content-Type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw Error('kv ' + r.status); const j = await r.json(); if (!Array.isArray(j)) throw Error('kv');
  return j.map(x => { if (x && x.error) throw Error('kv ' + x.error); return x ? x.result : null; });
}
/* <url><loc>…</loc><lastmod>AAAA-MM-JJ</lastmod> … ; seules les adresses du site sont gardées */
function parseSitemap(xml) {
  const out = [];
  for (const m of String(xml).matchAll(/<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>(\d{4}-\d\d-\d\d)<\/lastmod>/g)) {
    const loc = m[1].replace(/&amp;/g, '&').trim();
    if (loc.startsWith(SITE + '/') || loc === SITE + '/') out.push({ loc, lastmod: m[2] });
  }
  return out;
}
function allowed(req, env) {
  const auth = String(req.headers?.authorization || ''), ua = String(req.headers?.['user-agent'] || '');
  if (env.CRON_SECRET) return auth === 'Bearer ' + env.CRON_SECRET;
  return /^vercel-cron\//.test(ua);
}
function createHandler(options = {}) {
  const env = options.env || process.env, fetchImpl = options.fetch || globalThis.fetch, clock = options.now || (() => Date.now());
  return async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return reply(res, 405, { ok: false, code: 'method' }); }
    if (!allowed(req, env)) return reply(res, 401, { ok: false, code: 'auth' });
    if (typeof fetchImpl !== 'function') return reply(res, 503, { ok: false, code: 'off' });
    const kv = kvOf(env), now = clock();
    let since = new Date(now - 2 * 86400000).toISOString().slice(0, 10);
    if (kv) {
      try {
        const [lock, last] = await kvRun(kv, fetchImpl, [['SET', K_LOCK, String(now), 'EX', String(LOCK_S), 'NX'], ['GET', K_LAST]]);
        if (lock !== 'OK') return reply(res, 429, { ok: false, code: 'deja' });
        if (/^\d{4}-\d\d-\d\d$/.test(String(last || ''))) since = String(last); else since = '0000-00-00';
      } catch (e) { console.error('indexnow: base indisponible, envoi des deux derniers jours'); }
    }
    const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const sm = await fetchImpl(SITE + '/sitemap.xml', { signal: ctl.signal, headers: { 'user-agent': 'leonidakit-indexnow' } });
      if (!sm.ok) return reply(res, 502, { ok: false, code: 'sitemap', status: sm.status });
      const all = parseSitemap(await sm.text());
      /* « depuis » : les pages datées du jour du dernier envoi sont renvoyées (une page peut avoir changé plus tard ce jour-là) */
      const fresh = all.filter(u => u.lastmod >= since).sort((a, b) => b.lastmod.localeCompare(a.lastmod) || a.loc.localeCompare(b.loc));
      if (!fresh.length) return reply(res, 200, { ok: true, envoyees: 0, depuis: since });
      /* v7.97 (lot C, 16 000 pages traduites d'un coup) : un envoi IndexNow accepte 10 000 adresses ; au-delà, les suivantes partent
         dans des envois à la suite (cinq au plus : un plan du site n'a pas plus de 50 000 adresses). Avant, seules les 10 000
         premières partaient et les autres, datées du même jour, n'étaient jamais envoyées. */
      let envoyees = 0, statut = 0;
      for (let i = 0; i < fresh.length && i < MAX_URLS * MAX_LOTS; i += MAX_URLS) {
        const lot = fresh.slice(i, i + MAX_URLS);
        const r = await fetchImpl(ENDPOINT, { method: 'POST', signal: ctl.signal, headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify({ host: HOST, key: KEY, keyLocation: SITE + '/' + KEY + '.txt', urlList: lot.map(u => u.loc) }) });
        if (r.status !== 200 && r.status !== 202) { console.error('indexnow: envoi refusé (' + r.status + ')'); return reply(res, 502, { ok: false, code: 'indexnow', status: r.status, envoyees }); }
        envoyees += lot.length; statut = r.status;
      }
      const newest = fresh[0].lastmod;
      if (kv) await kvRun(kv, fetchImpl, [['SET', K_LAST, newest]]).catch(() => console.error('indexnow: date du dernier envoi non notée'));
      return reply(res, 200, { ok: true, envoyees, depuis: since, jusqua: newest, statut });
    } catch (e) {
      return reply(res, 502, { ok: false, code: e && e.name === 'AbortError' ? 'delai' : 'reseau' });
    } finally { clearTimeout(timer); }
  };
}
module.exports = createHandler();
module.exports.createHandler = createHandler;
module.exports._test = { KEY, HOST, parseSitemap, allowed, kvOf };
