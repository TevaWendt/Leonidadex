#!/usr/bin/env python3
# v7.99 : conversion des photos gtadb (JPEG, map/photos/6 du dépôt github.com/rolux/gtadb.org, CC BY 4.0) en WebP pour la carte
# et les pages des lieux, comme les photos déjà dans photos/ : 960 pixels au plus sur le grand côté, qualité 82.
# Usage : python3 outils/import-gtadb-photos.py <dossier map/photos/6> [liste] [--sortie <dossier>]
#   liste : outils/data/gtadb-photos-a-convertir.txt par défaut (écrite par outils/import-gtadb.cjs --ecrire), une photo par
#   ligne (« L924,ig ») ; sortie : photos/ par défaut. Une photo déjà convertie n'est pas refaite.
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
sortie = os.path.join(ROOT, 'photos')
if '--sortie' in args:
    i = args.index('--sortie')
    sortie = args[i + 1]
    del args[i:i + 2]
if not args:
    sys.exit('Usage : python3 outils/import-gtadb-photos.py <dossier map/photos/6> [liste] [--sortie <dossier>]')
src = args[0]
liste = args[1] if len(args) > 1 else os.path.join(ROOT, 'outils/data/gtadb-photos-a-convertir.txt')
noms = [l.strip() for l in open(liste, encoding='utf8') if l.strip()]
os.makedirs(sortie, exist_ok=True)
faites, absentes = 0, []
for nom in noms:
    jpg, webp = os.path.join(src, nom + '.jpg'), os.path.join(sortie, nom + '.webp')
    if os.path.exists(webp):
        continue
    if not os.path.exists(jpg):
        absentes.append(nom)
        continue
    im = Image.open(jpg).convert('RGB')
    w, h = im.size
    s = min(1, 960 / max(w, h))
    if s < 1:
        # arrondi comme Math.round d'outils/import-gtadb.cjs (largeur et hauteur écrites dans les données de la carte)
        im = im.resize((int(w * s + 0.5), int(h * s + 0.5)), Image.LANCZOS)
    im.save(webp, 'WEBP', quality=82, method=6)
    faites += 1
print('%d photo(s) converties dans %s ; %d absente(s) de gtadb%s' % (faites, sortie, len(absentes), (' : ' + ', '.join(absentes[:10])) if absentes else ''))
