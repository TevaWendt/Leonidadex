#!/usr/bin/env python3
# v7.88 : archive « modifs » d'une version. Usage : python3 outils/livraison/archive-modifs.py <version> <commit de base> [dossier de sortie]
# Tous les fichiers ajoutés ou modifiés entre la base et HEAD, en une ou plusieurs parties de moins de 28 Mio ; vérifie que
# base + archive(s) = HEAD. Lancer depuis la racine du dépôt, arbre de travail propre.
import os, subprocess, sys, zipfile, zlib, tempfile, shutil
ROOT = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()
ver, BASE = sys.argv[1], sys.argv[2]
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(ROOT, '..', 'livraisons'); os.makedirs(OUT, exist_ok=True)
LIMIT = 28 * 1024 * 1024; prefix = 'Leonidakit-v' + ver + '-modifs'
if subprocess.check_output(['git', 'status', '--porcelain'], cwd=ROOT, text=True).strip(): sys.exit('arbre de travail non propre')
# -z : chemins tels quels (accents compris, sans guillemets) ; --no-renames : un fichier renommé compte comme supprimé (ancien
# nom, dans la liste « à supprimer ») et ajouté (nouveau nom, dans l'archive)
git = lambda *a: [f for f in subprocess.check_output(['git', *a], cwd=ROOT).decode('utf-8').split('\0') if f]
files = git('diff', '-z', '--no-renames', '--name-only', '--diff-filter=AM', BASE, 'HEAD'); dele = git('diff', '-z', '--no-renames', '--name-only', '--diff-filter=D', BASE, 'HEAD')
print('fichiers :', len(files), '| à supprimer :', dele)
sizes = {f: os.path.getsize(os.path.join(ROOT, f)) for f in files}
est = lambda f: sizes[f] * (0.3 if f.endswith(('.html', '.js', '.css', '.json', '.txt', '.md', '.svg', '.xml')) else 1.0)
def split(n):
    parts, cur, acc, goal = [], [], 0, sum(est(f) for f in files) / n + 1
    for f in sorted(files):
        if cur and acc + est(f) > goal and len(parts) < n - 1: parts.append(cur); cur, acc = [], 0
        cur.append(f); acc += est(f)
    return parts + ([cur] if cur else [])
def write(path, fl):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for f in fl: z.write(os.path.join(ROOT, f), f)
n = 1
while True:
    parts = split(n); big = False
    for fl in parts:
        write(os.path.join(OUT, '_essai.zip'), fl); big |= os.path.getsize(os.path.join(OUT, '_essai.zip')) >= LIMIT
    os.remove(os.path.join(OUT, '_essai.zip'))
    if not big or n >= 6: break
    n += 1
names = []
for i, fl in enumerate(parts):
    name = prefix + ('.zip' if len(parts) == 1 else '-%d-sur-%d.zip' % (i + 1, len(parts))); path = os.path.join(OUT, name)
    write(path, fl)
    with zipfile.ZipFile(path) as z:
        assert z.testzip() is None and sorted(z.namelist()) == sorted(fl)
        for info in z.infolist():
            data = open(os.path.join(ROOT, info.filename), 'rb').read()
            assert zlib.crc32(data) & 0xffffffff == info.CRC and len(data) == info.file_size
    assert os.path.getsize(path) < LIMIT; names.append(name)
    print('%s : %d fichiers, %.2f Mio' % (name, len(fl), os.path.getsize(path) / 1048576))
tmp = tempfile.mkdtemp()
try:
    os.makedirs(tmp + '/base'); os.makedirs(tmp + '/head')
    subprocess.run('git archive %s | tar -x -C %s/base' % (BASE, tmp), shell=True, cwd=ROOT, check=True)
    subprocess.run('git archive HEAD | tar -x -C %s/head' % tmp, shell=True, cwd=ROOT, check=True)
    for d in dele: os.remove(os.path.join(tmp, 'base', d))
    for name in names:
        with zipfile.ZipFile(os.path.join(OUT, name)) as z: z.extractall(tmp + '/base')
    r = subprocess.run(['diff', '-rq', tmp + '/base', tmp + '/head'], capture_output=True, text=True)
    print('base + archive(s) = HEAD :', 'OUI' if r.returncode == 0 and not r.stdout else 'NON\n' + r.stdout[:2000])
finally:
    shutil.rmtree(tmp)
