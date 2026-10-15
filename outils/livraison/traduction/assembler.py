#!/usr/bin/env python3
"""v7.91 — assemble la réponse d'un traducteur (rep-NNN.json : { "n": "traduction" }) en morceau de mémoire (trad-NNN.json :
{ "texte français": "traduction" }), puis le contrôle avec verifier.py.

Usage : python3 outils/livraison/traduction/assembler.py <src-NNN.json> <rep-NNN.json> <trad-NNN.json>

rep-NNN.json : { "_notes": "choix de vocabulaire", "_verifie": { "n": "raison" }, "1": "…", "2": "…", … } — une traduction par
numéro d'entrée du morceau (« = » : identique au français). Le traducteur n'écrit jamais les clés françaises : elles sont
reprises du morceau, à l'octet près.
"""
import json, os, subprocess, sys

src_p, rep_p, out_p = sys.argv[1:4]
src = json.load(open(src_p, encoding='utf-8'))
try:
    rep = json.load(open(rep_p, encoding='utf-8'))
except Exception as e:
    print('JSON illisible dans %s : %s' % (rep_p, e)); sys.exit(1)
entries = src['entrees']
by_n = {str(e['n']): e['fr'] for e in entries}
out, problems = {}, []
name = os.path.basename(out_p).replace('.json', '')
out['_note'] = 'v7.91 (lot 7, portugais du Brésil) : ' + name + ' — sources ' + ', '.join(src.get('_source', []))
if rep.get('_notes'):
    out['_notes'] = rep['_notes']
for k in rep:
    if k.startswith('_'):
        if k not in ('_notes', '_verifie'):
            problems.append('clé réservée inconnue : %r' % k)
        continue
    if k not in by_n:
        problems.append('numéro inconnu dans la réponse : %r' % k)
for n, fr in by_n.items():
    if n in rep:
        out[fr] = rep[n]
ver = rep.get('_verifie') or {}
if ver:
    out['_verifie'] = {by_n.get(str(n), '?' + str(n)): r for n, r in ver.items()}
json.dump(out, open(out_p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for p in problems:
    print(p)
r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'verifier.py'), src_p, out_p], capture_output=True, text=True)
lines = r.stdout.strip().splitlines()
# le verifier nomme les entrées par leur texte français : on ajoute le numéro pour retrouver la ligne dans rep-NNN.json
num = {v: k for k, v in by_n.items()}
for line in lines[:-1]:
    tag = next((n for fr, n in num.items() if line.startswith(repr(fr[:90]))), None)
    print(('n°%s ' % tag if tag else '') + line)
total = len(problems) + (int(lines[-1].split()[0]) if lines and lines[-1].split()[0].isdigit() else 1)
print('%d problème%s' % (total, '' if total < 2 else 's'))
sys.exit(1 if total else 0)
