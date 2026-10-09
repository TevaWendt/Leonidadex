# Tatouages, retouches v7.77 : les zones « bras gauche », « bras droit » et « jambes » deviennent des planches de placement
# de tatoueur (silhouette face et dos à l'encre, zone hachurée en rouge) posées sur le plan de travail, comme les flashs.
import math
from .core import *
from . import tattoo2 as T2

ITEMS = dict(T2.ITEMS)


def chart(img, seed=1, extra=None):
    def b():
        T2.station()
        T2.paper_sheet(img, loc=(0.0, 0.02, 0.0), rot=math.radians(-3 + seed % 3 * 2.5), seed=seed, art=0.9)
        T2.pen((0.11, -0.12, 0.0), math.radians(20))
        T2.ink_caps((-0.17, -0.1, 0.0))
        cam((0.04, -0.34, 0.42), (0.0, 0.0, 0.0), 50, 5.6)
    return b


ITEMS.update({
    'gta5-zone-bras-gauche': chart('zone-bras-g.png', 11),
    'gta5-zone-bras-droit': chart('zone-bras-d.png', 12),
    'gta5-zone-jambes': chart('zone-jambes.png', 13),
})
