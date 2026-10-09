# Planches de placement de tatoueur (v7.77) : silhouette à l'encre (face et dos), zone hachurée en rouge ; aucun texte.
import os, subprocess
OUT = os.path.dirname(os.path.abspath(__file__))

# demi-silhouette (x >= 0), de la tête aux pieds ; coordonnées sur 400 × 900, axe x centré à 0
HALF = [(0, 40), (22, 44), (34, 60), (36, 86), (30, 108), (20, 118), (20, 132), (58, 146), (82, 160), (92, 190), (98, 240), (108, 300), (118, 360), (124, 400),
        (128, 430), (118, 434), (106, 404), (96, 360), (84, 300), (76, 250), (70, 300), (68, 360), (72, 420), (66, 470), (60, 540), (62, 620), (56, 700), (52, 780),
        (58, 810), (60, 830), (30, 834), (28, 790), (26, 700), (20, 620), (14, 540), (8, 480), (0, 470)]

def path(pts, dx):
    full = [(x, y) for (x, y) in HALF] + [(-x, y) for (x, y) in reversed(HALF)]
    return 'M' + ' L'.join(f'{dx + x:.1f} {y:.1f}' for (x, y) in full) + 'Z'

ZONES = {
    'bras_g': [(56, 150), (84, 158), (94, 200), (100, 250), (110, 310), (120, 370), (126, 412), (106, 410), (96, 362), (84, 302), (76, 250), (66, 196)],
    'jambes': [(70, 470), (66, 540), (62, 620), (56, 700), (52, 790), (30, 792), (26, 700), (20, 620), (14, 540), (8, 480)],
}

def chart(zone, mirror=False, back=False):
    W, H = 900, 900
    ink = '#2B2420'; red = '#B3261E'
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">',
         f'<defs><pattern id="h" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="10" height="10" fill="{red}" fill-opacity="0.18"/><line x1="0" y1="0" x2="0" y2="10" stroke="{red}" stroke-width="3.2"/></pattern></defs>']
    for k, dx in enumerate((250, 650)):
        s.append(f'<path d="{path(HALF, dx)}" fill="none" stroke="{ink}" stroke-width="5" stroke-linejoin="round"/>')
        s.append(f'<circle cx="{dx}" cy="88" r="0" fill="none"/>')
        # détails : ligne médiane, clavicules (face) ou omoplates (dos)
        if k == 0:
            s.append(f'<path d="M{dx - 44} 160 q44 18 88 0" stroke="{ink}" stroke-width="3" fill="none"/><path d="M{dx} 250 L{dx} 300" stroke="{ink}" stroke-width="2.5"/>')
        else:
            s.append(f'<path d="M{dx - 50} 200 q20 40 0 70 M{dx + 50} 200 q-20 40 0 70" stroke="{ink}" stroke-width="3" fill="none"/><path d="M{dx} 160 L{dx} 420" stroke="{ink}" stroke-width="2.5"/>')
        pts = ZONES[zone]
        sides = [1] if zone != 'jambes' else [1, -1]
        for sd in sides:
            sg = (-sd if mirror else sd) * (1 if k == 0 else -1)
            d = 'M' + ' L'.join(f'{dx + sg * x:.1f} {y:.1f}' for (x, y) in pts) + 'Z'
            s.append(f'<path d="{d}" fill="url(#h)" stroke="{red}" stroke-width="4" stroke-linejoin="round"/>')
    # repères de cadrage de la planche
    for (x, y) in ((40, 40), (860, 40), (40, 860), (860, 860)):
        s.append(f'<path d="M{x - 14} {y} L{x + 14} {y} M{x} {y - 14} L{x} {y + 14}" stroke="{ink}" stroke-width="3"/>')
    s.append('</svg>')
    return ''.join(s)

def png(svg, name):
    p = os.path.join(OUT, name); sv = p[:-4] + '.svg'; open(sv, 'w').write(svg)
    script = "const sharp=require('sharp');sharp(process.argv[1]).resize(1200,1200).png().toFile(process.argv[2]).then(()=>console.log('ok'))"
    subprocess.run(['node', '-e', script, sv, p], check=True, stdout=subprocess.DEVNULL); return p

if __name__ == '__main__':
    print(png(chart('bras_g'), 'zone-bras-g.png'))
    print(png(chart('bras_g', mirror=True), 'zone-bras-d.png'))
    print(png(chart('jambes'), 'zone-jambes.png'))
