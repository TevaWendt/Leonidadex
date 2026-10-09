# Transforme les motifs vectoriels en « encre sous la peau » : blancs rendus à la peau, couleurs passées, ombrage au fouet
# le long des traits, bords légèrement diffusés, grain d'encre.
import numpy as np, sys, glob, os
from PIL import Image, ImageFilter
def ink(src, dst, sat=0.72, dark=0.82):
    im = Image.open(src).convert('RGBA'); a = np.asarray(im).astype(np.float32) / 255.0
    rgb, al = a[..., :3], a[..., 3]
    lum = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    mx, mn = rgb.max(-1), rgb.min(-1); satv = (mx - mn) / np.maximum(mx, 1e-4)
    line = (lum < 0.22) & (al > 0.5)
    white = (lum > 0.8) & (satv < 0.25)
    # couleurs : moins saturées, plus sombres
    grey = lum[..., None]
    col = (grey + (rgb - grey) * sat) * dark
    # ombrage le long des traits (distance approximée par dilatations successives)
    L = Image.fromarray((line * 255).astype(np.uint8)); dist = np.zeros(lum.shape, np.float32); cur = L
    for k in range(1, 15):
        cur = cur.filter(ImageFilter.MaxFilter(3)); m = np.asarray(cur) > 0
        dist[(dist == 0) & m & ~line] = k
    dist[dist == 0] = 15
    shade = np.clip(1 - dist / 15.0, 0, 1) ** 1.6 * 0.45
    col = col * (1 - shade[..., None])
    col[line] = np.array([0.045, 0.055, 0.055], np.float32)
    alpha = al.copy(); alpha[white] = 0.0
    # blancs : quelques reflets d'encre blanche seulement là où c'était très clair et entouré
    rng = np.random.default_rng(3); g = rng.normal(0, 1, alpha.shape).astype(np.float32)
    gi = Image.fromarray(((g * 0.5 + 0.5).clip(0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    alpha = np.clip(alpha * (0.88 + 0.12 * (np.asarray(gi) / 255.0)), 0, 1)
    out = np.dstack([np.clip(col, 0, 1), alpha])
    o = Image.fromarray((out * 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(1.1))
    o.save(dst)
for f in sorted(glob.glob(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tat-*.png'))):
    if f.endswith('-ink.png'): continue
    ink(f, f.replace('.png', '-ink.png'))
print('ok')
