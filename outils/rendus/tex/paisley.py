# Motif cachemire (bandana) : gouttes et pointillés blancs sur rouge, carreau répétable.
from PIL import Image, ImageDraw
import math, random, os
W = 512; im = Image.new('RGB', (W, W), (150, 18, 22)); d = ImageDraw.Draw(im); R = random.Random(4)
def drop(cx, cy, s, a):
    pts = []
    for i in range(40):
        t = i / 39 * math.tau; r = s * (0.55 + 0.45 * math.cos(t)) ; x = math.cos(t) * r; y = math.sin(t) * r * 0.6 + (s * 0.5 * (1 - math.cos(t)) ** 2 * 0.2 if t > math.pi else 0)
        xr = x * math.cos(a) - y * math.sin(a); yr = x * math.sin(a) + y * math.cos(a); pts.append((cx + xr, cy + yr))
    d.polygon(pts, outline=(245, 240, 235), width=4)
    d.ellipse((cx - s * 0.18, cy - s * 0.18, cx + s * 0.18, cy + s * 0.18), outline=(245, 240, 235), width=3)
for gx in range(0, W, 128):
    for gy in range(0, W, 128):
        drop(gx + 64, gy + 64, 46, (gx + gy) / 128 * 0.9)
        for k in range(8):
            a = k / 8 * math.tau; d.ellipse((gx + 64 + math.cos(a) * 58 - 3, gy + 64 + math.sin(a) * 58 - 3, gx + 64 + math.cos(a) * 58 + 3, gy + 64 + math.sin(a) * 58 + 3), fill=(245, 240, 235))
d.rectangle((0, 0, W - 1, W - 1), outline=(245, 240, 235), width=10)
im.save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'paisley.png'))
