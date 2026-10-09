# Motifs originaux des vêtements (v7.77) : imprimé tropical rétro (hibiscus, feuilles de palmier) et visuel de t-shirt
# (soleil couchant à bandes, palmiers en ombre) ; aucun texte, aucune marque.
import math, random, subprocess, os, sys
OUT = os.path.dirname(os.path.abspath(__file__))

def png(svg, name, w, h):
    p = os.path.join(OUT, name); sv = p[:-4] + '.svg'
    open(sv, 'w').write(svg)
    script = "const sharp=require('sharp');sharp(process.argv[1]).resize(%d,%d).png().toFile(process.argv[2]).then(()=>console.log('ok'))" % (w, h)
    subprocess.run(['node', '-e', script, sv, p], check=True, stdout=subprocess.DEVNULL)
    return p

def hibiscus(cx, cy, r, rot, col, centre):
    petals = []
    for k in range(5):
        a = rot + k * 72
        petals.append(f'<ellipse cx="{cx + r * 0.55 * math.cos(math.radians(a)):.1f}" cy="{cy + r * 0.55 * math.sin(math.radians(a)):.1f}" rx="{r * 0.62:.1f}" ry="{r * 0.42:.1f}" transform="rotate({a:.1f} {cx + r * 0.55 * math.cos(math.radians(a)):.1f} {cy + r * 0.55 * math.sin(math.radians(a)):.1f})" fill="{col}"/>')
    return ''.join(petals) + f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r * 0.2:.1f}" fill="{centre}"/><path d="M{cx:.1f} {cy:.1f} L{cx + r * 0.9 * math.cos(math.radians(rot + 30)):.1f} {cy + r * 0.9 * math.sin(math.radians(rot + 30)):.1f}" stroke="#F6E27A" stroke-width="{r * 0.08:.1f}"/>'

def leaf(cx, cy, L, rot, col):
    pts = []
    s = f'<g transform="rotate({rot:.1f} {cx:.1f} {cy:.1f})">'
    s += f'<path d="M{cx:.1f} {cy:.1f} q{L * 0.5:.1f} {-L * 0.08:.1f} {L:.1f} 0" stroke="{col}" stroke-width="{L * 0.03:.1f}" fill="none"/>'
    for k in range(1, 9):
        x = cx + L * k / 9; w = L * 0.34 * math.sin(math.pi * k / 9)
        s += f'<path d="M{x:.1f} {cy - L * 0.01:.1f} q{L * 0.06:.1f} {-w * 0.6:.1f} {L * 0.13:.1f} {-w:.1f} q{-L * 0.04:.1f} {w * 0.5:.1f} {-L * 0.13:.1f} {w:.1f}Z" fill="{col}"/>'
        s += f'<path d="M{x:.1f} {cy + L * 0.01:.1f} q{L * 0.06:.1f} {w * 0.6:.1f} {L * 0.13:.1f} {w:.1f} q{-L * 0.04:.1f} {-w * 0.5:.1f} {-L * 0.13:.1f} {-w:.1f}Z" fill="{col}"/>'
    return s + '</g>'

def tropical(bg='#13394A', seed=4):
    R = random.Random(seed); W = 512
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}"><rect width="{W}" height="{W}" fill="{bg}"/>']
    items = []
    for i in range(18):
        items.append(('leaf', R.uniform(0, W), R.uniform(0, W), R.uniform(110, 175), R.uniform(0, 360), R.choice(['#2E8B57', '#3FA66B', '#1F6E4A', '#57B98A'])))
    for i in range(11):
        items.append(('flower', R.uniform(0, W), R.uniform(0, W), R.uniform(30, 50), R.uniform(0, 72), R.choice(['#F2668B', '#F7A23B', '#F9F1E1', '#E8475F'])))
    for kind, x, y, a, b, c in items:
        for dx in (-W, 0, W):
            for dy in (-W, 0, W):
                if kind == 'leaf': s.append(leaf(x + dx, y + dy, a, b, c))
                else: s.append(hibiscus(x + dx, y + dy, a, b, c, '#7A1F2B'))
    s.append('</svg>')
    return ''.join(s)

def sunset_print():
    W = 600
    s = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {W}" width="{W}" height="{W}">',
         '<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD15C"/><stop offset="0.55" stop-color="#FF6F61"/><stop offset="1" stop-color="#C2367A"/></linearGradient>',
         f'<clipPath id="c"><circle cx="300" cy="300" r="210"/></clipPath></defs>',
         '<g clip-path="url(#c)"><rect x="80" y="80" width="440" height="440" fill="url(#g)"/>']
    for k in range(7):
        y = 330 + k * 28; h = 6 + k * 2.2
        s.append(f'<rect x="80" y="{y}" width="440" height="{h:.1f}" fill="#1B1B2F"/>')
    s.append('</g>')
    # palmiers en ombre
    for (x, hgt, lean) in ((190, 300, -18), (420, 260, 14)):
        s.append(f'<path d="M{x} 520 q{lean} {-hgt * 0.5} {lean * 2} {-hgt}" stroke="#1B1B2F" stroke-width="14" fill="none"/>')
        tx, ty = x + lean * 2, 520 - hgt
        for a in range(0, 360, 45):
            ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
            s.append(f'<path d="M{tx} {ty} q{ca * 50 - sa * 20:.1f} {sa * 30 - 25:.1f} {ca * 95:.1f} {sa * 55 + 20:.1f}" stroke="#1B1B2F" stroke-width="12" fill="none" stroke-linecap="round"/>')
    s.append('<rect x="60" y="514" width="480" height="10" fill="#1B1B2F"/></svg>')
    return ''.join(s)

if __name__ == '__main__':
    print(png(tropical('#123B4C', 4), 'tropical_bleu.png', 1024, 1024))
    print(png(tropical('#F3D9C4', 7), 'tropical_creme.png', 1024, 1024))
    print(png(sunset_print(), 'tshirt_couchant.png', 1024, 1024))
