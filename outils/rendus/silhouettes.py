# silhouettes.py famille[/id,id…] … [--out dossier] [--samples n] [--pct p] : silhouettes « teaser » de chaque élément
# (scène construite par les registres des familles, objets cachés en ombre noire, liseré, lumières ; fond du site)
import sys, os, time, importlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lk import core, toon
FAMS = {'consommables': 'lk.food3', 'coiffures': 'lk.hair', 'tatouages': 'lk.tattoo3', 'tenues': 'lk.clothes3', 'perso-vehicules': 'lk.cars4', 'perso-armes': 'lk.guns2'}
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tex')
# tatouages dessinés à plat : motif « flash » (image, rotation) et planches de placement
FLASH = {'vice-city-style-tatouages': ('palm', 3), 'gta5-smiley': ('smiley', 4), 'gta5-dague': ('dagger', 1), 'gta5-eye-catcher': ('eye', 5),
         'gta5-dope-skull': ('skull', 2), 'gta5-fresque-florale': ('flowers', 6), 'gta5-dragon-chinois': ('dragon', 7), 'gta5-families-kings': ('crown', 8),
         'gta5-family-is-forever': ('heart', 9), 'gta5-chamberlain': ('hood', 10)}
CHART = {'gta5-zone-bras-gauche': 'zone-bras-g.png', 'gta5-zone-bras-droit': 'zone-bras-d.png', 'gta5-zone-jambes': 'zone-jambes.png'}
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
def opt(k, d=None):
    return args[args.index(k) + 1] if k in args else d
OUT = opt('--out', os.path.join(os.getcwd(), 'silhouettes'))
SAMPLES = int(opt('--samples', '6'))
PCT = int(opt('--pct', '100'))
sel = [a for i, a in enumerate(args) if not a.startswith('--') and not (i > 0 and args[i - 1].startswith('--'))]
jobs = []
for s in sel:
    fam, _, ids = s.partition('/')
    mod = importlib.import_module(FAMS[fam])
    for i in (ids.split(',') if ids else list(mod.ITEMS)):
        jobs.append((fam, mod, i))
for fam, mod, i in jobs:
    t = time.time()
    try:
        os.makedirs(os.path.join(OUT, fam), exist_ok=True)
        dst = os.path.join(OUT, fam, i + '.png')
        if fam == 'tatouages' and i in FLASH:
            img, seed = FLASH[i]
            toon.flash_silhouette(os.path.join(TEX, 'tat-' + img + '.png'), dst, fam, -4 + seed % 3 * 3)
        elif fam == 'tatouages' and i in CHART:
            toon.chart_silhouette(os.path.join(TEX, CHART[i]), dst, fam)
        else:
            core.reset(SAMPLES, pct=PCT)
            mod.ITEMS[i]()
            sup = toon.prepare(fam, i, sil=True)
            toon.render_sil(dst, fam, sup, SAMPLES)
        print('OK', fam, i, round(time.time() - t, 1), 's', flush=True)
    except Exception as e:
        import traceback; traceback.print_exc()
        print('ERREUR', fam, i, e, flush=True)
