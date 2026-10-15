#!/usr/bin/env python3
"""v7.91 — découpe ce qui reste à traduire en portugais (pt) en morceaux pour les traducteurs.

Usage : python3 outils/livraison/traduction/decouper.py <racine du dépôt> <dossier de sortie> <utilisees.json> [taille] [premier numéro]

- <utilisees.json> : liste des clés de la mémoire espagnole réellement employées par le site (calculée par
  outils/livraison/traduction/cles-utilisees.cjs es) : seul ce qui sert encore est traduit (la mémoire anglaise garde ~6 000
  entrées que le site n'emploie plus).
- Laisse de côté : ce que outils/langues/pt/*.json traduit déjà, les entrées de code (« fichier.js::… », « re:… », règles),
  les noms gardés tels quels dans les quatre langues (« = » partout : écrits d'office dans pt/noms-auto.json).
- Chaque morceau (src-NNN.json) : { "_source": fichiers de la mémoire anglaise, "entrees": [ {"n", "fr", "en", "es"} ] },
  regroupé par fichier d'origine de la mémoire anglaise (contexte voisin), 150 entrées par défaut.
"""
import json, glob, os, re, sys, collections

root, out = sys.argv[1], sys.argv[2]
used = json.load(open(sys.argv[3]))
used = used['used'] if isinstance(used, dict) else used
size = int(sys.argv[4]) if len(sys.argv) > 4 else 150
first = int(sys.argv[5]) if len(sys.argv) > 5 else 101
L = os.path.join(root, 'outils', 'langues')

def norm(s):
    s = re.sub(r'[    ]', ' ', s).replace("'", '’')
    return re.sub(r'\s+', ' ', s).strip()

def normkey(k):
    if k.startswith('re:'):
        return k
    if '::' in k:
        a, b = k.split('::', 1)
        return a + '::' + norm(b)
    return norm(k)

def load(code):
    m, src = {}, {}
    for f in sorted(glob.glob(os.path.join(L, code, '*.json'))):
        b = os.path.basename(f)
        if b.startswith('_') or b == 'leo-pivot.json':
            continue
        for k, v in json.load(open(f, encoding='utf-8')).items():
            if k.startswith('_'):
                continue
            nk = normkey(k)
            m[nk] = v
            src[nk] = b
    return m, src

mem = {c: load(c) for c in ('en', 'es', 'it', 'de', 'pt')}
es, en, pt = mem['es'][0], mem['en'][0], mem['pt'][0]
order = {}
groups = collections.OrderedDict()
auto = {}
skipped = collections.Counter()
for k in used:
    v = es.get(k)
    if k in pt:
        skipped['déjà traduit'] += 1; continue
    if k.startswith('re:') or ('::' in k and not k.startswith('@meta::')):
        skipped['code ou règle'] += 1; continue
    if not isinstance(v, str):
        skipped['règle'] += 1; continue
    if v == '=' and all(mem[c][0].get(k) == '=' for c in ('en', 'it', 'de')):
        auto[k] = '='; continue
    f = mem['en'][1].get(k) or ('es:' + mem['es'][1].get(k, '?'))
    groups.setdefault(f, []).append(k)

os.makedirs(out, exist_ok=True)
def keyfile(f):
    return (0 if not f.startswith('es:') else 1, f)
n = first
made = []
batch, srcs = [], []
def flush():
    global n, batch, srcs
    if not batch:
        return
    name = 'src-%03d.json' % n
    json.dump({'_source': sorted(set(srcs)), 'entrees': batch}, open(os.path.join(out, name), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    made.append((name, len(batch), sorted(set(srcs))))
    n += 1; batch, srcs = [], []
for f in sorted(groups, key=keyfile):
    for k in groups[f]:
        if k in ('fr-FR',):  # valeur de code (code.json), écrite à la main
            continue
        e = {'n': len(batch) + 1, 'fr': k}
        if isinstance(en.get(k), str): e['en'] = en.get(k)
        if isinstance(es.get(k), str): e['es'] = es.get(k)
        batch.append(e); srcs.append(f)
        if len(batch) >= size:
            flush()
flush()
json.dump(dict(sorted(auto.items())), open(os.path.join(out, 'noms-auto.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('morceaux :', len(made), '| entrées :', sum(x[1] for x in made), '| noms gardés d’office :', len(auto), '| laissés de côté :', dict(skipped))
json.dump([{'morceau': a, 'entrees': b, 'source': c} for a, b, c in made], open(os.path.join(out, '_index.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
