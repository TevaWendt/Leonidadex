'use strict';
/* v8.03 (calculateur, lot 2) : compare deux cadres (listes de lignes « profondeur balise#id.classes… ») et accepte seulement des AJOUTS cachés
   hors du mode Expert : chaque ligne ajoutée est dans un élément (elle-même ou un ancêtre) de classe b-expert ou b-expert-only, que
   calculateurs-workspace.css masque en Simple et en Pas à pas. Aucune ligne existante ne doit changer ni disparaître. */
function lcs(a, b) {
  const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = []; let i = 0, j = 0;
  while (i < n && j < m) { if (a[i] === b[j]) { ops.push(['=', i, j]); i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) { ops.push(['-', i, null]); i++; } else { ops.push(['+', null, j]); j++; } }
  while (i < n) ops.push(['-', i++, null]); while (j < m) ops.push(['+', null, j++]);
  return ops;
}
const depthOf = l => { const m = /^(\d+) /.exec(l); return m ? Number(m[1]) : -1; };
const expertHead = l => /^\d+ [a-z0-9-]+(?:#[^ .]+)?(?:\.[^ ]*)?/.test(l) && /\.(b-expert|b-expert-only)(?=[. ]|$)/.test((l.split(' ')[1] || ''));
function expertLines(lines) {
  /* pour chaque ligne : vrai si elle ou un ancêtre est un élément .b-expert / .b-expert-only (pile des profondeurs) */
  const stack = [], out = [];
  lines.forEach(l => {
    const d = depthOf(l);
    if (d < 0) { out.push(stack.length ? stack[stack.length - 1].expert : false); return; } /* ligne « options » d’une liste : même statut que son parent */
    while (stack.length && stack[stack.length - 1].depth >= d) stack.pop();
    const inherited = stack.length ? stack[stack.length - 1].expert : false, me = inherited || expertHead(l);
    stack.push({ depth: d, expert: me }); out.push(me);
  });
  return out;
}
function check(ref, now) {
  const ops = lcs(ref, now), ex = expertLines(now), bad = [], added = [];
  for (const [op, i, j] of ops) {
    if (op === '-') bad.push('retirée ou changée : ' + ref[i]);
    if (op === '+') { if (ex[j]) added.push(now[j]); else bad.push('ajoutée hors Expert : ' + now[j]); }
  }
  return { ok: !bad.length, bad, added };
}
module.exports = { check, lcs, expertLines };
