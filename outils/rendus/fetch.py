#!/usr/bin/env python3
"""Téléchargement des ressources CC0 de Poly Haven (HDRI, textures PBR, modèles) dans le dossier des ressources
(variable d'environnement LK_RESSOURCES, sinon outils/rendus/ressources).
Usage : fetch.py hdri:<id>[@2k] tex:<id>[@1k] model:<id>[@1k] …   (déjà présent = rien à faire)
Licence : tout le contenu de Poly Haven est CC0 (domaine public), sans obligation d'attribution."""
import json, os, subprocess, sys

ROOT = os.environ.get('LK_RESSOURCES') or os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ressources')
API = 'https://api.polyhaven.com/files/'


def curl(url, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        return dst
    tmp = dst + '.part'
    for attempt in range(3):
        r = subprocess.run(['curl', '-sSfL', '--retry', '2', '--max-time', '900', '-o', tmp, url])
        if r.returncode == 0:
            os.replace(tmp, dst)
            return dst
    raise SystemExit(f'échec : {url}')


def files(aid):
    p = f'{ROOT}/_api/{aid}.json'
    curl(API + aid, p)
    return json.load(open(p))


def hdri(aid, res='2k', fmt='hdr'):
    f = files(aid)['hdri'][res][fmt]
    return curl(f['url'], f'{ROOT}/hdri/{aid}_{res}.{fmt}')


def model(aid, res='1k'):
    f = files(aid)['blend'][res]['blend']
    d = f'{ROOT}/models/{aid}_{res}'
    main = curl(f['url'], f'{d}/{aid}_{res}.blend')
    for rel, inc in f.get('include', {}).items():
        curl(inc['url'], f'{d}/{rel}')
    return main


MAPS = {'Diffuse': 'diff', 'nor_gl': 'nor', 'Rough': 'rough', 'Displacement': 'disp', 'AO': 'ao', 'Metal': 'metal',
        'arm': 'arm', 'Opacity': 'alpha', 'Translucency': 'trans', 'Mask': 'mask', 'Bump': 'bump', 'Spec': 'spec'}


def texture(aid, res='1k'):
    fj = files(aid)
    out = {}
    for key, short in MAPS.items():
        if key not in fj or res not in fj[key]:
            continue
        fmts = fj[key][res]
        fmt = 'jpg' if 'jpg' in fmts else ('png' if 'png' in fmts else None)
        if not fmt:
            continue
        out[short] = curl(fmts[fmt]['url'], f'{ROOT}/tex/{aid}_{res}/{aid}_{short}_{res}.{fmt}')
    return out


if __name__ == '__main__':
    for spec in sys.argv[1:]:
        kind, _, rest = spec.partition(':')
        aid, _, res = rest.partition('@')
        fn = {'hdri': hdri, 'tex': texture, 'model': model}[kind]
        r = fn(aid, res) if res else fn(aid)
        print('OK', spec, r if isinstance(r, str) else ','.join(sorted(r)))
