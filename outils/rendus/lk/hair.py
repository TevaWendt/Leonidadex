# Coiffures : buste de mannequin (tête sculptée, lisse, yeux clos) et vraie chevelure en mèches (rendu cheveux de Cycles),
# chez un barbier la nuit (fond sombre, ampoules de miroir floues, enseigne rouge et bleue diffuse).
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from .core import *

# ------------------------------------------------------------------ tête : union lisse d'ellipsoïdes vue depuis le centre
SHAPES = [  # (centre, rayons, douceur, inclinaison) — tête de mannequin : volumes justes, visage lisse
    ((-0.012, 0.0, 0.032), (0.099, 0.077, 0.097), 0.014, 0),    # crâne
    ((0.03, 0.0, -0.008), (0.078, 0.068, 0.085), 0.016, 0),     # visage (pommettes larges)
    ((0.02, 0.0, -0.058), (0.072, 0.06, 0.052), 0.016, 0),      # mâchoire
    ((0.07, 0.0, -0.09), (0.03, 0.028, 0.026), 0.012, 0),       # menton
    ((0.097, 0.0, -0.006), (0.024, 0.0105, 0.012), 0.008, -55), # arête du nez (inclinée)
    ((0.112, 0.0, -0.03), (0.012, 0.014, 0.011), 0.008, 0),     # bout du nez
    ((0.09, 0.0, -0.06), (0.012, 0.022, 0.014), 0.014, 0),      # lèvres (volume doux)
    ((-0.058, 0.0, 0.006), (0.05, 0.064, 0.056), 0.014, 0),     # occiput
    ((-0.006, 0.071, -0.006), (0.016, 0.011, 0.03), 0.003, 12), # oreille g
    ((-0.006, -0.071, -0.006), (0.016, 0.011, 0.03), 0.003, 12),# oreille d
]
def _ray_ell(d, c, r, pitch=0.0):
    # intersection du rayon t*d (t>0) avec l'ellipsoïde (c, r), inclinée de « pitch » degrés autour de y : plus grande racine
    if pitch:
        a = math.radians(pitch); ca, sa = math.cos(a), math.sin(a)
        d = (d[0] * ca - d[2] * sa, d[1], d[0] * sa + d[2] * ca); c = (c[0] * ca - c[2] * sa, c[1], c[0] * sa + c[2] * ca)
    ax, ay, az = d[0] / r[0], d[1] / r[1], d[2] / r[2]
    bx, by, bz = -c[0] / r[0], -c[1] / r[1], -c[2] / r[2]
    A = ax * ax + ay * ay + az * az; B = 2 * (ax * bx + ay * by + az * bz); C = bx * bx + by * by + bz * bz - 1
    disc = B * B - 4 * A * C
    if disc < 0: return 0.0
    return max(0.0, (-B + math.sqrt(disc)) / (2 * A))

def _smax(a, b, k):
    h = max(k - abs(a - b), 0.0) / k
    return max(a, b) + h * h * k * 0.25

def head_radius(d, k=None):
    """rayon de la tête dans la direction d : union lisse (quadratique) des formes"""
    r = 0.0
    for c, rr, kk, pt in SHAPES:
        r = _smax(r, _ray_ell(d, c, rr, pt), kk)
    return r

def head_mesh(name='tete', seg=128, rings=96):
    bm = bmesh.new()
    def V(th, ph):
        d = (math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)); r = head_radius(d)
        return bm.verts.new((d[0] * r, d[1] * r, d[2] * r))
    top = V(0.0, 0.0); bot = V(math.pi, 0.0)
    grid = [[V(math.pi * j / rings, 2 * math.pi * i / seg) for i in range(seg)] for j in range(1, rings)]
    for i in range(seg): bm.faces.new((top, grid[0][i], grid[0][(i + 1) % seg]))
    for a, b in zip(grid, grid[1:]):
        for i in range(seg): bm.faces.new((a[i], b[i], b[(i + 1) % seg], a[(i + 1) % seg]))
    for i in range(seg): bm.faces.new((bot, grid[-1][(i + 1) % seg], grid[-1][i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm)

SKIN = [(0.74, 0.56, 0.45), (0.62, 0.44, 0.33), (0.5, 0.34, 0.24), (0.36, 0.23, 0.16), (0.24, 0.15, 0.1), (0.15, 0.095, 0.065)]
def skin(tone=1):
    c = SKIN[tone]
    def bfn(nt, vec):
        a = noise(nt, vec, 2600, 3, 0.6).outputs['Fac']; return a
    def cfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 60, 4, 0.5)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, tuple(x * 0.93 for x in c)), (0.7, tuple(min(1, x * 1.05) for x in c))]), p.inputs['Base Color'])
    return mat('peau', c, 0.38, sss=0.25, sss_radius=(1.0, 0.4, 0.2), sss_scale=0.004, spec=0.5, coat=0.15, coat_rough=0.3, base_fn=cfn, bump={'kind': bfn, 'strength': 0.04})

def bust(tone=1, shirt=(0.05, 0.05, 0.055), collar=True):
    root = empty('buste')
    h = head_mesh(); assign(h, skin(tone)); parent(h, root)
    neck = lathe('cou', [(0.0, -0.03), (0.058, -0.03), (0.06, -0.075), (0.064, -0.105), (0.075, -0.13), (0.0, -0.14)], 64); neck.location = (-0.024, 0, 0); neck.rotation_euler = (0, math.radians(8), 0)
    assign(neck, skin(tone)); parent(neck, root)
    # épaules et haut du torse (t-shirt)
    bm = bmesh.new(); seg, rows = 64, 18; grid = []
    for j in range(rows + 1):
        t = j / rows; z0 = -0.112 - 0.3 * t
        e = min(1.0, t * 3.2); e = e * e * (3 - 2 * e)
        wx = 0.07 + 0.055 * e; wy = 0.074 + 0.15 * e
        row = []
        for i in range(seg):
            a = 2 * math.pi * i / seg; ca, sa = math.cos(a), math.sin(a)
            p = 2.6; rr = (abs(ca) ** p + abs(sa) ** p) ** (-1 / p)
            z = z0 - 0.02 * max(ca, 0.0) * (1 - e) - 0.045 * (abs(sa) ** 2.2) * e
            row.append(bm.verts.new((-0.026 + wx * ca * rr, wy * sa * rr, z)))
        grid.append(row)
    for a_, b_ in zip(grid, grid[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[(i + 1) % seg], b_[(i + 1) % seg], b_[i]))
    torso = mesh_obj('torse', bm); subsurf(torso, 1); parent(torso, root)
    assign(torso, M_fabric(shirt, 0.88, 0.5, 700, 0.15))
    if collar:
        col = curve_tube('col', [(-0.026 + 0.074 * math.cos(a), 0.076 * math.sin(a), -0.114 - 0.02 * max(math.cos(a), 0), 1) for a in [i / 48 * math.tau for i in range(48)]], 0.0045, 4, closed=True); assign(col, M_fabric(shirt, 0.85, 0.5, 900, 0.2)); parent(col, root)
    return root, h

# ------------------------------------------------------------------ chevelure en mèches (objet Curves rendu en cheveux)
def scalp_points(head, n, mask, seed=1):
    """points tirés sur la surface de la tête (pondérés par l'aire), gardés selon un masque 0..1"""
    me = head.data; R = random.Random(seed)
    tris = []; me.calc_loop_triangles()
    for t in me.loop_triangles:
        a, b, c = (me.vertices[i].co for i in t.vertices); area_ = ((b - a).cross(c - a)).length / 2
        tris.append((a.copy(), b.copy(), c.copy(), area_))
    tot = sum(t[3] for t in tris); cum = []; s = 0
    for t in tris: s += t[3]; cum.append(s)
    import bisect
    out = []; tries = 0
    while len(out) < n and tries < n * 30:
        tries += 1
        k = bisect.bisect_left(cum, R.random() * tot); a, b, c, _ = tris[min(k, len(tris) - 1)]
        u, v = R.random(), R.random()
        if u + v > 1: u, v = 1 - u, 1 - v
        p = a + (b - a) * u + (c - a) * v; nrm = ((b - a).cross(c - a)).normalized()
        if nrm.dot(p) < 0: nrm = -nrm
        m = mask(p)
        if m > 0 and R.random() < m: out.append((p, nrm, m))
    return out

def az(p): return math.degrees(math.atan2(p.y, p.x))

def hairline(p, front=0.052, temple=0.04, side=0.012, back=-0.072, nape_w=1.0):
    """hauteur de la lisière selon l'azimut (0° = front) ; la zone des oreilles est exclue"""
    a = abs(az(p))
    if a < 35: return front + (temple - front) * (a / 35)
    if a < 80: return temple + (side - temple) * ((a - 35) / 45)
    if a < 125: return side + (-0.035 - side) * ((a - 80) / 45)
    return -0.035 + (back + 0.035) * ((a - 125) / 55) * nape_w

def scalp_mask(p, soft=0.004, front=0.052, temple=0.04, side=0.012, back=-0.072):
    hl = hairline(p, front, temple, side, back)
    m = 1 / (1 + math.exp(-(p.z - hl) / soft))
    # pas de cheveux sur l'oreille
    if abs(p.y) > 0.062 and -0.04 < p.z < 0.03 and -0.03 < p.x < 0.03: m *= 0.0
    return m

def shell_project(q, off):
    d = q.normalized(); r = head_radius((d.x, d.y, d.z)); return d * (r + off)

def hair_object(name, strands, melanin=0.6, redness=0.3, rough=0.32, radius=(0.00005, 0.00002), tint=None, coat=0.1, random_color=0.15):
    c = bpy.data.hair_curves.new(name)
    sizes = [len(s) for s in strands]
    c.add_curves(sizes)
    flat = [x for s in strands for p in s for x in (p[0], p[1], p[2])]
    c.attributes['position'].data.foreach_set('vector', flat)
    rad = c.attributes.get('radius') or c.attributes.new('radius', 'FLOAT', 'POINT')
    rv = []
    for s in strands:
        n = len(s)
        for i in range(n):
            t = i / max(1, n - 1); rv.append(radius[0] + (radius[1] - radius[0]) * t)
    rad.data.foreach_set('value', rv)
    ob = bpy.data.objects.new(name, c); link(ob)
    m = bpy.data.materials.new('cheveux'); nt = m.node_tree if m.node_tree else None
    if nt is None: m.use_nodes = True; nt = m.node_tree
    N = nt.nodes
    for n_ in list(N): N.remove(n_)
    hb = N.new('ShaderNodeBsdfHairPrincipled')
    try: hb.parametrization = 'MELANIN'
    except Exception: pass
    hb.inputs['Melanin'].default_value = melanin; hb.inputs['Melanin Redness'].default_value = redness
    if tint is not None:
        hb.inputs['Tint'].default_value = (*tint, 1)
    hb.inputs['Roughness'].default_value = rough; hb.inputs['Coat'].default_value = coat
    hb.inputs['Random Color'].default_value = random_color; hb.inputs['Random Roughness'].default_value = 0.2
    out = N.new('ShaderNodeOutputMaterial'); nt.links.new(hb.outputs[0], out.inputs[0])
    c.materials.append(m)
    return ob

def tangent_dir(p, nrm, field):
    d = field(p); d = d - nrm * d.dot(nrm)
    return d.normalized() if d.length > 1e-6 else Vector((0, 0, 0))

def comb(p, nrm, field, length, steps=10, lift=0.003, layer=0.004, fall=None, R=None, wiggle=0.0):
    """mèche peignée : décolle de la racine puis suit le champ en restant à une hauteur donnée au-dessus du crâne ;
    passé la limite « fall », elle tombe (gravité)"""
    pts = [p.copy(), p + nrm * lift]; q = pts[-1].copy(); seg = length / steps; off = lift
    for i in range(steps):
        dq = q.normalized(); nn = dq
        d = tangent_dir(q, nn, field)
        if fall and fall(q): d = (d * 0.25 + Vector((0, 0, -1))).normalized()
        if wiggle and R: d = (d + Vector((R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-1, 1))) * wiggle).normalized()
        q = q + d * seg
        off = min(layer, off + layer * 0.35)
        if not (fall and fall(q)):
            q = shell_project(q, off)
        pts.append(q.copy())
    return pts

# ------------------------------------------------------------------ outils de coiffure
def lerpv(a, b, t): return a + (b - a) * t

def gather_path(p, nrm, G, layer, steps=10):
    """mèche peignée vers un point de ramassage G (queue, couette, chignon), en suivant le crâne"""
    pts = [p.copy()]
    for i in range(1, steps + 1):
        t = i / steps; q = lerpv(p, G, t)
        off = layer * min(1.0, t * 3) + 0.001
        q = shell_project(q, off) if t < 0.92 else lerpv(shell_project(q, off), G, (t - 0.92) / 0.08)
        pts.append(q)
    return pts

def tail(G, direction, length, n_pts, spread0, spread1, R, curl=0.0, curl_r=0.006, sway=0.0):
    """queue de cheval : faisceau qui part de G vers l'arrière, s'élargit puis tombe (courbe de Bézier)"""
    out_ = Vector((direction.x, direction.y, 0)); out_ = out_.normalized() if out_.length > 1e-4 else Vector((-1, 0, 0))
    P0 = G; P1 = G + out_ * 0.03 + Vector((0, 0, -0.01)); P2 = G + out_ * 0.04 + Vector((0, 0, -length * 0.45)); P3 = G + out_ * 0.03 + Vector((0, 0, -length))
    u = Vector((0, 0, 1)).cross(out_).normalized(); v = out_
    a = R.random() * math.tau; rr = math.sqrt(R.random())
    ph = R.random() * math.tau; out = []
    for i in range(1, n_pts + 1):
        t = i / n_pts; mt = 1 - t
        c = P0 * mt ** 3 + P1 * 3 * mt * mt * t + P2 * 3 * mt * t * t + P3 * t ** 3
        sp = spread0 + (spread1 - spread0) * math.sin(min(1.0, t * 1.3) * math.pi / 2)
        q = c + (u * math.cos(a) + v * math.sin(a)) * rr * sp
        if curl > 0: q += (u * math.cos(ph + t * curl) + v * math.sin(ph + t * curl)) * curl_r * min(1.0, t * 3)
        out.append(q)
    return out

def braid_tubes(path, r=0.0028, twists=None, name='tresse', mat_=None, root=None):
    """tresse à trois brins : trois tubes en hélice décalée autour du chemin"""
    if twists is None:
        L = sum((b - a).length for a, b in zip(path, path[1:])); twists = L / (r * 7)
    from mathutils import Vector as V
    # repère le long du chemin
    obs = []
    n = len(path)
    for k in range(3):
        pts = []
        up = V((0, 0, 1))
        for i, p in enumerate(path):
            t = i / (n - 1)
            tng = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
            u = tng.cross(up); u = u.normalized() if u.length > 1e-6 else tng.orthogonal().normalized(); w = tng.cross(u).normalized()
            a = t * twists * math.tau + k * math.tau / 3
            off = (u * math.cos(a) * 1.0 + w * math.sin(a) * 0.55) * r * 0.9
            taper = 0.55 if t > 0.97 else 1.0
            pts.append((*(p + off * taper), 1.0))
        ob = curve_tube(name, pts, r * 0.62, 3, kind='POLY', profile_seg=3)
        obs.append(ob)
    j = join(obs, name)
    if mat_: assign(j, mat_)
    if root: parent(j, root)
    return j

def hair_mesh_mat(color=(0.02, 0.014, 0.01), rough=0.42):
    """matière des tresses et locks (géométrie) : fibres anisotropes, reflets doux"""
    def bfn(nt, vec):
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'Z'; wv.inputs['Scale'].default_value = 900; wv.inputs['Distortion'].default_value = 2.0
        nt.links.new(vec, wv.inputs['Vector']); return wv.outputs['Fac']
    return mat('meche', color, rough + 0.1, sheen=0.25, sheen_tint=(0.9, 0.8, 0.7), aniso=0.5, coat=0.05, coat_rough=0.4, bump={'kind': bfn, 'strength': 0.35})

def melanin_for(color):
    return {'noir': (0.97, 0.1), 'brun': (0.82, 0.32), 'chatain': (0.62, 0.42), 'blond': (0.22, 0.55), 'roux': (0.45, 0.95), 'gris': (0.12, 0.05), 'platine': (0.06, 0.15)}[color]

def mel_rgb(color):
    return {'noir': (0.012, 0.009, 0.007), 'brun': (0.04, 0.022, 0.012), 'chatain': (0.09, 0.05, 0.025), 'blond': (0.42, 0.3, 0.16), 'roux': (0.3, 0.09, 0.03), 'gris': (0.32, 0.31, 0.3), 'platine': (0.6, 0.56, 0.5)}[color]

# zones du visage (barbe) sur la surface de la tête
def sm(x, a, b):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def zone_mustache(p): return sm(p.x, 0.078, 0.088) * (1 - sm(abs(p.y), 0.022, 0.03)) * sm(p.z, -0.0605, -0.0575) * (1 - sm(p.z, -0.047, -0.043))
def zone_chin(p): return sm(p.x, 0.035, 0.055) * (1 - sm(abs(p.y), 0.03, 0.04)) * (1 - sm(p.z, -0.086, -0.08))
def zone_soul(p): return sm(p.x, 0.08, 0.088) * (1 - sm(abs(p.y), 0.008, 0.012)) * (1 - sm(p.z, -0.081, -0.078)) * sm(p.z, -0.092, -0.088)
def zone_mouth(p): return sm(p.x, 0.08, 0.088) * (1 - sm(abs(p.y), 0.022, 0.028)) * sm(p.z, -0.081, -0.078) * (1 - sm(p.z, -0.059, -0.056))
def zone_jaw(p):
    face = sm(p.x, -0.004, 0.008)
    line = -0.022 - 0.55 * max(0.0, p.x - 0.012)          # ligne des joues : du bas de la patte au coin de la bouche
    below_cheek = 1 - sm(p.z, line - 0.009, line + 0.005)
    neck = sm(p.z, -0.135, -0.12)                        # s'arrête sous la mâchoire
    return face * below_cheek * neck * (1 - sm(p.x, 0.104, 0.11)) * (1 - zone_mouth(p))
def zone_sideburn(p): return sm(abs(p.y), 0.052, 0.06) * sm(p.x, -0.004, 0.004) * (1 - sm(p.x, 0.022, 0.03)) * sm(p.z, -0.036, -0.028) * (1 - sm(p.z, 0.012, 0.022))

def beard_strands(head, zones, L, dense=40000, seed=7, curl=0.0, droop=0.6, R=None):
    """barbe : poils couchés sur la peau, dirigés vers le bas (et vers les coins de la bouche pour la moustache) ;
    l'épaisseur de la barbe reste une fraction de sa longueur ; sous le menton, les longues barbes tombent"""
    R = R or random.Random(seed)
    def mask(p): return max(z(p) for z in zones)
    out = []
    for p, n, m in scalp_points(head, dense, mask, seed):
        Lp = (L(p) if callable(L) else L) * (0.75 + 0.5 * R.random()) * (0.55 + 0.45 * m)
        must = zone_mustache(p)
        side = 1.0 if p.y >= 0 else -1.0
        def field(q, must=must, side=side):
            if must > 0.3: return Vector((0.25, side * 0.55, -1.0))
            return Vector((0.18 + 0.2 * sm(q.x, 0.05, 0.09), -q.y * 1.5, -1.0))
        if Lp < 0.0025:
            t = field(p); t = (t - n * t.dot(n)).normalized()
            d = (n * 0.45 + t * 0.55).normalized(); out.append([p, p + d * Lp * 0.5, p + (d + t * 0.3).normalized() * Lp]); continue
        steps = max(4, min(12, int(Lp / 0.0018)))
        layer = min(0.012, Lp * (0.38 + 0.12 * droop)) * (0.6 + 0.6 * R.random())
        fall = (lambda q: q.z < -0.116 and q.x > 0.0) if Lp > 0.02 else None
        st = comb(p, n, field, Lp, steps, 0.0012, layer, fall, R, 0.08 + (0.25 if curl else 0.0))
        if curl:
            ph = R.random() * math.tau; u = n.orthogonal().normalized(); w = n.cross(u)
            st = [q + (u * math.cos(ph + i * curl * 0.35) + w * math.sin(ph + i * curl * 0.35)) * 0.0018 * min(1, i / 2) for i, q in enumerate(st)]
        out.append(st)
    return out

# ------------------------------------------------------------------ styles de coiffure
def S_short(head, L, dense=60000, soft=0.0025, seed=3, lean=Vector((-0.3, 0, 0.0)), front=0.052, back=-0.072, side=0.012, temple=0.04, rec=0.0):
    """cheveux courts (tondeuse, rasé, coupe nette, dégradé) : L(p) donne la longueur"""
    R = random.Random(seed); out = []
    for p, n, m in scalp_points(head, dense, lambda q: scalp_mask(q, soft, front + rec, temple + rec * 0.8, side, back), seed):
        Lp = L(p) * (0.8 + 0.4 * R.random())
        if Lp <= 0.0002: continue
        d = (n + lean * 0.6 + Vector((R.uniform(-0.15, 0.15), R.uniform(-0.15, 0.15), 0))).normalized()
        if Lp < 0.008: out.append([p, p + d * Lp * 0.5, p + (d + lean * 0.4).normalized() * Lp])
        else: out.append(comb(p, n, lambda q: lean + Vector((0, 0, 0.001)), Lp, 4, 0.002, min(0.006, Lp * 0.4), R=R, wiggle=0.15))
    return out

def fade_len(top, low=0.0006, start=-0.04, end=0.055):
    def L(p):
        t = sm(p.z, start, end)
        return low + (top - low) * t ** 1.6
    return L

def S_combed(head, field, length, dense=26000, layer=0.012, lift=0.004, seed=3, steps=10, fall_z=None, wig=0.12, mask=None, lenf=None):
    R = random.Random(seed); out = []
    fall = (lambda q: q.z < fall_z or (q.x < -0.09 and q.z < 0.0)) if fall_z is not None else None
    for p, n, m in scalp_points(head, dense, mask or (lambda q: scalp_mask(q, 0.003)), seed):
        Lp = (lenf(p) if lenf else length) * (0.8 + 0.4 * R.random())
        out.append(comb(p, n, field, Lp, steps, lift, layer * (0.6 + 0.6 * R.random()), fall, R, wig))
    return out

def S_curls(head, length=0.28, dense=9000, seed=9, curl_r=0.009, freq=26, layer=0.02, clumps=420):
    """longues boucles en anglaises : les mèches se regroupent en boucles (même hélice par groupe), qui tombent sur les épaules"""
    from mathutils.kdtree import KDTree
    R = random.Random(seed); out = []
    part = Vector((0.0, 0.012, 0.0))
    def field(q):
        side = 1 if q.y > part.y else -1
        return Vector((-0.4, side * 1.0, -0.6)) if q.z > 0.0 else Vector((-0.3, side * 0.4, -1.0))
    pts = scalp_points(head, dense, lambda q: scalp_mask(q, 0.003), seed)
    cl = pts[:clumps]; kd = KDTree(len(cl))
    for i, (p, n, m) in enumerate(cl): kd.insert(p, i)
    kd.balance()
    CP = [(R.random() * math.tau, curl_r * (0.75 + 0.6 * R.random()), length * (0.7 + 0.55 * R.random()), freq * (0.85 + 0.3 * R.random()), Vector((R.uniform(-1, 1), R.uniform(-1, 1), 0)) * 0.004) for _ in cl]
    for p, n, m in pts:
        _, ci, _ = kd.find(p); ph, rr, L2, fq, jit = CP[ci]
        base = comb(cl[ci][0] + (p - cl[ci][0]) * 0.35, n, field, 0.09, 7, 0.004, layer * 0.9, None, R, 0.05)
        q = base[-1]; out_dir = Vector((q.x, q.y, 0)).normalized() if Vector((q.x, q.y, 0)).length > 1e-4 else Vector((-1, 0, 0))
        u = out_dir; v = u.cross(Vector((0, 0, 1))); v = v.normalized() if v.length > 1e-6 else Vector((0, 1, 0))
        k = 30; pts_ = list(base); off = Vector((R.uniform(-1, 1), R.uniform(-1, 1), R.uniform(-1, 1))) * 0.0018
        for i in range(1, k + 1):
            t = i / k
            c = q + Vector((0, 0, -1)) * L2 * t + out_dir * (0.03 * math.sin(min(1.0, t * 1.5) * math.pi / 2) + 0.01) + jit * t
            c += (u * math.cos(ph + t * fq) + v * math.sin(ph + t * fq)) * rr * min(1.0, t * 3) + off * min(1.0, t * 4)
            pts_.append(c)
        out.append(pts_)
    return out

def S_afro(head, size=0.045, dense=16000, seed=5, curl=0.0055, top_extra=0.0, flat_top=None):
    R = random.Random(seed); out = []
    for p, n, m in scalp_points(head, dense, lambda q: scalp_mask(q, 0.004), seed):
        k = 0.55 + 0.45 * sm(p.z, -0.05, 0.06)
        L = size * k * (0.8 + 0.4 * R.random()) + top_extra * sm(p.z, 0.04, 0.1)
        axis = (n + Vector((0, 0, 0.35 if flat_top else 0.2))).normalized()
        u = axis.orthogonal().normalized(); v = axis.cross(u); ph = R.random() * 6.28; rr = curl * (0.6 + 0.8 * R.random())
        s_ = []; steps = 14
        for i in range(steps + 1):
            t = i / steps; c0 = p + axis * L * t
            if flat_top is not None and c0.z > flat_top: c0.z = flat_top + (c0.z - flat_top) * 0.15
            s_.append(c0 + (u * math.cos(ph + t * 20) + v * math.sin(ph + t * 20)) * rr * min(1, t * 4))
        out.append(s_)
    return out

def S_gathered(head, G_list, tail_len=0.22, dense=14000, seed=11, layer=0.006, spread=(0.006, 0.03), curl=0.0, tie=True, root=None, color='brun', bun=False):
    """ramassé : queue de cheval (un point), couettes (deux points), chignon (bun=True)"""
    R = random.Random(seed); out = []; Gs = [Vector(g) for g in G_list]
    for p, n, m in scalp_points(head, dense, lambda q: scalp_mask(q, 0.003), seed):
        G = min(Gs, key=lambda g: (g - p).length)
        path = gather_path(p, n, G, layer, 10)
        if bun:
            # enroulé en spirale autour d'une sphère au-dessus de G
            C = G + Vector((0.006, 0, 0.022)); rr = 0.022 * (0.75 + 0.3 * R.random()); a0 = R.random() * math.tau; tilt = R.uniform(-1, 1)
            for i in range(1, 16):
                t = i / 15; a = a0 + t * math.tau * 1.2; el = tilt * 0.9 * (1 - t) + R.uniform(-0.1, 0.1)
                path.append(C + Vector((math.cos(a) * math.cos(el), math.sin(a) * math.cos(el), math.sin(el))) * rr * (1 - 0.15 * t))
        else:
            dirn = (Vector((-0.25, 0, -1)) if abs(G.y) < 0.03 else Vector((-0.1, math.copysign(0.25, G.y), -1))).normalized()
            path += tail(G, dirn, tail_len * (0.8 + 0.3 * R.random()), 14, spread[0], spread[1], R, curl, 0.008, 0.035)
        out.append(path)
    if tie:
        for G in Gs:
            t_ = lathe('elastique', [(0.0075, -0.005), (0.0095, -0.004), (0.0095, 0.004), (0.0075, 0.005)], 32); t_.location = G + (Vector((0, 0, 0.022)) if bun else Vector((0, 0, 0)))
            t_.rotation_euler = (math.radians(90) if not bun else 0, 0, math.radians(90) if abs(G.y) < 0.03 else 0) if not bun else (0, 0, 0)
            assign(t_, mat('elastique', (0.02, 0.02, 0.022), 0.5)); t_.visible_shadow = True
            if root: parent(t_, root)
    return out

def arc_path(lat, th0=32, th1=212, n=46, off=0.003, wave=0.0, wave_k=3.0):
    """chemin collé au crâne du front à la nuque, décalé latéralement de « lat » (rangs de nattes)"""
    pts = []
    for i in range(n + 1):
        t = i / n; th = math.radians(th0 + (th1 - th0) * t)
        l = lat * (1 - 0.25 * math.sin(t * math.pi)) + (wave * math.sin(t * math.pi * wave_k) if wave else 0.0)
        d = Vector((math.cos(th), l, math.sin(th))).normalized()
        pts.append(shell_project(d * 0.1, off))
    return pts

def cornrows(head, rows=10, color='noir', zigzag=False, root=None):
    M_ = hair_mesh_mat(tuple(min(1, c * 1.3) for c in mel_rgb(color)), 0.38)
    for i in range(rows):
        t = (i + 0.5) / rows; lat = (t - 0.5) * 1.5
        path = arc_path(lat, 34 - abs(lat) * 8, 205 + abs(lat) * 6, 50, 0.0035, 0.06 if zigzag else 0.0, 4)
        braid_tubes(path, 0.0045, name='natte', mat_=M_, root=root)
    # cheveux ras entre les rangs (cuir chevelu visible)
    return S_short(head, lambda p: 0.0008, 30000, 0.003, 13)

def box_braids(head, n=60, length=0.32, r=0.0032, color='noir', seed=17, root=None, part_y=0.0, knotless=False):
    R = random.Random(seed); M_ = hair_mesh_mat(mel_rgb(color), 0.42)
    roots = scalp_points(head, n * 4, lambda q: scalp_mask(q, 0.003) * (0.4 if q.z < -0.02 else 1.0), seed)[:n]
    for p, nrm, m in roots:
        side = 1 if p.y >= part_y else -1
        field = lambda q, side=side: Vector((-0.5, side * 0.8, -0.7))
        top = comb(p, nrm, field, 0.07, 6, 0.004, 0.006, None, R, 0.05)
        q = top[-1]; outd = Vector((q.x, q.y, 0)).normalized() if Vector((q.x, q.y, 0)).length > 1e-4 else Vector((-1, 0, 0))
        hang = [q + Vector((0, 0, -1)) * length * (i / 10) * (0.85 + 0.3 * R.random()) + outd * (0.035 * math.sin(min(1.0, i / 4) * math.pi / 2)) for i in range(1, 11)]
        path = top + hang
        from . import head2 as _h2
        path = _h2.drape([path], r + 0.002)[0]
        braid_tubes(path, r * (0.7 if knotless else 1.0), name='tresse', mat_=M_, root=root)

def dreads(head, n=48, length=0.2, r=0.0055, color='noir', seed=19, root=None):
    R = random.Random(seed); M_ = hair_mesh_mat(mel_rgb(color), 0.6)
    roots = scalp_points(head, n * 4, lambda q: scalp_mask(q, 0.003), seed)[:n]
    for p, nrm, m in roots:
        top = comb(p, nrm, lambda q: Vector((-0.6, 0.0 if abs(q.y) < 0.02 else math.copysign(0.7, q.y), -0.5)), 0.05, 5, 0.005, 0.008, None, R, 0.1)
        q = top[-1]; outd = Vector((q.x, q.y, 0)).normalized() if Vector((q.x, q.y, 0)).length > 1e-4 else Vector((-1, 0, 0))
        L = length * (0.7 + 0.5 * R.random())
        pts = top + [q + Vector((0, 0, -1)) * L * (i / 8) + outd * 0.03 * math.sin(min(1.0, i / 3) * math.pi / 2) + Vector((R.uniform(-1, 1), R.uniform(-1, 1), 0)) * 0.004 for i in range(1, 9)]
        from . import head2 as _h2
        pts = _h2.drape([pts], r + 0.002)[0]
        rr = r * (0.8 + 0.4 * R.random())
        ob = curve_tube('lock', [(*q_, 1.0 if i < len(pts) - 1 else 0.6) for i, q_ in enumerate(pts)], rr, 4, kind='NURBS', profile_seg=4)
        displace_tex = None
        assign(ob, M_)
        if root: parent(ob, root)

# ------------------------------------------------------------------ décor et caméra
def barber(bz=-0.19, hd='billiard_hall'):
    """salon de barbier le soir : photo HDRI d'une salle (briques, suspensions) floue au fond, comptoir en bois sombre verni,
    lumière principale chaude, deux contre-jours colorés (rose, cyan) qui détachent les cheveux"""
    from . import assets as A
    A.hdri(hd, 0.3, res='1k', cam_hdri_k=0.45)
    bpy.context.scene.view_settings.exposure = -0.6
    top = box('comptoir', (2.6, 1.6, 0.04), (0.2, 0.1, bz - 0.02))
    assign(top, A.pbr('dark_wood', 2.5, coords='Object', coat=0.45, coat_rough=0.12, rough_mul=0.8))
    if bz >= -0.01:      # produits posés sur le comptoir : lumière de table, contre-jours discrets
        area('cle', (-0.3, -0.55, 0.6), (0, 0, 0.0), 0.8, 6, (1.0, 0.88, 0.75))
        area('contre_rose', (-0.5, 0.6, 0.35), (0, 0, 0.0), 0.4, 1.6, (1.0, 0.45, 0.6))
        area('contre_cyan', (0.6, 0.5, 0.3), (0, 0, 0.0), 0.4, 1.4, (0.45, 0.8, 1.0))
    else:
        area('cle', (0.35, -0.8, 0.55), (0, 0, 0.0), 0.7, 7, (1.0, 0.88, 0.75))
        area('contre_rose', (-0.65, 0.5, 0.3), (0, 0, 0.02), 0.4, 6, (1.0, 0.3, 0.55))
        area('contre_cyan', (-0.55, -0.55, 0.35), (0, 0, 0.02), 0.4, 5, (0.3, 0.75, 1.0))
    return top

def hair_cam(view='back34', lens=85, fstop=8.0, dist=1.25):
    if view == 'beard':
        tgt = Vector((0.04, 0.0, -0.045)); d = Vector((0.32, -1.0, 0.04)).normalized()
        area('liseré_barbe', (0.32, 0.35, -0.02), (0.06, 0, -0.07), 0.25, 3.5, (1.0, 0.85, 0.7))
        area('visage', (0.55, -0.45, 0.1), (0.06, 0, -0.05), 0.4, 4, (1.0, 0.9, 0.8))
        return cam(tuple(tgt + d * 0.95), tuple(tgt), 85, 7.1)
    tgt = Vector((-0.01, 0.0, -0.03))
    dirs = {'back34': (-0.72, -0.62, 0.22), 'side': (0.0, -1.0, 0.1), 'sideback': (-0.42, -1.0, 0.16), 'front34': (0.68, -0.68, 0.14), 'back': (-1.0, -0.12, 0.2), 'top34': (-0.5, -0.55, 0.5), 'long': (-0.7, -0.6, 0.1), 'tall': (-0.7, -0.62, 0.12),
            'longfront': (0.62, -0.72, 0.08), 'longside': (0.05, -1.0, 0.08), 'tallfront': (0.6, -0.72, 0.12), 'front': (0.9, -0.38, 0.12)}
    d = Vector(dirs[view]).normalized()
    if view in ('long', 'longfront', 'longside'): tgt = Vector((-0.03, 0.0, -0.13)); dist = 2.3
    if view in ('tall', 'tallfront'): tgt = Vector((-0.01, 0.0, 0.0)); dist = 1.4
    return cam(tuple(tgt + d * dist), tuple(tgt), lens, fstop)

# ------------------------------------------------------------------ styles composés
def S_mullet(head, top=0.03, back=0.17, color_wig=0.12, seed=21, shaggy=False):
    R = random.Random(seed)
    front = S_combed(head, lambda q: Vector((-0.5, 0, 0.2)) if q.z > 0.05 else Vector((-0.3, 0, -1)), top, 16000, 0.008, 0.003, seed, 6, None, 0.3 if shaggy else 0.15,
                     mask=lambda q: scalp_mask(q, 0.003) * (1 - sm(abs(az(q)), 115, 135)))
    backh = S_combed(head, lambda q: Vector((-0.6, 0, -1)), back, 9000, 0.01, 0.004, seed + 1, 10, -0.05, 0.25 if shaggy else 0.12,
                     mask=lambda q: scalp_mask(q, 0.003) * sm(abs(az(q)), 110, 130))
    return front + backh

def S_fauxhawk(head, L=0.055, seed=23):
    sides = S_short(head, fade_len(0.006, 0.0006, -0.04, 0.05), 50000, 0.0025, seed, Vector((-0.2, 0, 0)))
    def field(q): return Vector((0.15 if q.x > 0 else -0.25, -q.y * 8, 1.0))
    strip = S_combed(head, field, L, 9000, 0.004, 0.006, seed + 1, 6, None, 0.18,
                     mask=lambda q: scalp_mask(q, 0.003) * (1 - sm(abs(q.y), 0.016, 0.024)) * sm(q.z, 0.03, 0.05), lenf=lambda q: L * (0.6 + 0.4 * sm(q.z, 0.05, 0.11)))
    return [st for st in sides if not (abs(st[0].y) < 0.022 and st[0].z > 0.04)] + strip

def S_hightop(head, height=0.075, seed=25):
    sides = S_short(head, fade_len(0.004, 0.0005, -0.04, 0.045), 45000, 0.0025, seed, Vector((-0.2, 0, 0)))
    top = []
    R = random.Random(seed)
    for p, n, m in scalp_points(head, 14000, lambda q: scalp_mask(q, 0.003) * sm(q.z, 0.045, 0.06), seed):
        axis = Vector((n.x * 0.25, n.y * 0.25, 1.0)).normalized(); zt = 0.128 + height
        L = max(0.01, (zt - p.z) / max(axis.z, 0.3)); u = axis.orthogonal().normalized(); v = axis.cross(u); ph = R.random() * 6.28
        st = [p + axis * L * (i / 12) + (u * math.cos(ph + i * 1.6) + v * math.sin(ph + i * 1.6)) * 0.0035 * min(1, i / 3) for i in range(13)]
        top.append(st)
    return [st for st in sides if st[0].z < 0.05] + top

def S_lines(head, L=0.0035, seed=27):
    """tondeuse avec motifs rasés (lignes courbes sur les côtés)"""
    def cut(q):
        if abs(q.y) < 0.045: return 1.0
        for k in range(3):
            zc = 0.01 + k * 0.016 + 0.012 * math.sin(q.x * 40 + k)
            if abs(q.z - zc) < 0.0022: return 0.0
        return 1.0
    return [st for st in S_short(head, lambda p: L, 70000, 0.0018, seed, Vector((-0.15, 0, 0))) if cut(st[0]) > 0.5]

def S_sidepart(head, L=0.075, part=0.032, seed=29, layer=0.012, wet=False):
    def field(q):
        if q.y > part: return Vector((-0.35, 1.0, -0.5))
        return Vector((-0.55, -1.0, -0.15)) if q.z > 0.04 else Vector((-0.5, -0.4, -1.0))
    return S_combed(head, field, L, 24000, layer, 0.004, seed, 9, None, 0.08)

def S_slick(head, L=0.1, seed=31, layer=0.009, lift_front=0.0):
    def field(q): return Vector((-1.0, 0, -0.15 if q.z > 0.0 else -0.8))
    return S_combed(head, field, L, 26000, layer, 0.004 + lift_front, seed, 10, None, 0.06)

def S_pompadour(head, L=0.1, seed=33):
    R = random.Random(seed); out = []
    for p, n, m in scalp_points(head, 26000, lambda q: scalp_mask(q, 0.003), seed):
        front = sm(p.x, 0.0, 0.07)
        lay = 0.008 + 0.024 * front * sm(p.z, 0.03, 0.08)
        field = lambda q: Vector((-1.0, 0, 0.1))
        out.append(comb(p, n, field, L * (0.8 + 0.4 * R.random()), 10, 0.004 + 0.012 * front, lay, None, R, 0.06))
    return out

def S_bob(head, L=0.13, seed=35, fringe=True):
    def field(q):
        if q.x > 0.06 and fringe: return Vector((0.6, 0, -1.0))
        return Vector((-0.2, 0.9 if q.y > 0 else -0.9, -1.0))
    return S_combed(head, field, L, 22000, 0.012, 0.004, seed, 10, -0.01, 0.1)

def S_messy(head, L=0.08, seed=37, wig=0.35, dense=22000, rec=0.0):
    def field(q): return Vector((-0.6, 0.6 if q.y > 0 else -0.6, -0.6))
    return S_combed(head, field, L, dense, 0.014, 0.005, seed, 8, None, wig, mask=lambda q: scalp_mask(q, 0.004, 0.052 + rec, 0.04 + rec * 0.7))

def handlebar_strands(head, L=0.02, seed=39):
    R = random.Random(seed); out = []
    for p, n, m in scalp_points(head, 9000, zone_mustache, seed):
        side = 1 if p.y >= 0 else -1; far = sm(abs(p.y), 0.012, 0.026)
        q = p.copy(); s_ = [q.copy()]; d = (n * 0.4 + Vector((0, side * 1.0, -0.3))).normalized()
        steps = 8; Lp = L * (0.7 + 0.5 * R.random()) * (0.5 + far)
        for i in range(steps):
            t = (i + 1) / steps
            if far > 0.4 and t > 0.55: d = (d + Vector((0, -side * 0.25, 0.55))).normalized()
            q = q + d * (Lp / steps); s_.append(q.copy())
        out.append(s_)
    return out

# ------------------------------------------------------------------ objets (barbier) : produits et mobilier
def counter():
    return None

def P_clippers(loc=(0, 0, 0), rot=0.0):
    root = empty('tondeuse', loc, (0, 0, rot))
    bodyb = extrude2d('corps', [(-0.07, -0.016), (0.06, -0.02), (0.075, -0.012), (0.075, 0.012), (0.06, 0.02), (-0.07, 0.016), (-0.08, 0.0)], 0.034, 0.008)
    bodyb.location = (0, 0, 0.017); assign(bodyb, mat('tondeuse', (0.02, 0.02, 0.022), 0.25, coat=0.8, coat_rough=0.08)); parent(bodyb, root)
    blade = box('lame', (0.012, 0.046, 0.006), (0.082, 0, 0.012), 0.002); assign(blade, M_metal((0.75, 0.75, 0.77), 0.25)); parent(blade, root)
    for i in range(14):
        t_ = box('dent', (0.006, 0.0018, 0.004), (0.09, -0.021 + i * 0.0032, 0.011), 0.0006); assign(t_, M_metal((0.75, 0.75, 0.77), 0.25)); parent(t_, root)
    ring = box('bague', (0.012, 0.036, 0.036), (-0.055, 0, 0.017), 0.006); assign(ring, M_chrome(0.15, (0.85, 0.7, 0.4))); parent(ring, root)
    cord = curve_tube('cordon', [(-0.08, 0, 0.017, 1), (-0.14, 0.02, 0.006, 1), (-0.2, 0.08, 0.004, 1), (-0.26, 0.05, 0.004, 1)], 0.0035, 12); assign(cord, M_rubber()); parent(cord, root)
    return root

def P_scissors(loc=(0, 0, 0), rot=0.0):
    root = empty('ciseaux', loc, (0, 0, rot)); m_ = M_chrome(0.12)
    for sd in (-1, 1):
        bl = extrude2d('lame', [(0.0, 0.0), (0.11, sd * 0.004), (0.115, sd * 0.002), (0.0, -sd * 0.004)], 0.002, 0.0006); bl.location = (0, 0, 0.002 + (0.002 if sd > 0 else 0)); bl.rotation_euler = (0, 0, sd * 0.06); assign(bl, m_); parent(bl, root)
        rg = lathe('anneau', [(0.012, -0.002), (0.016, -0.002), (0.016, 0.002), (0.012, 0.002)], 32); rg.location = (-0.03, sd * 0.016, 0.003); assign(rg, m_); parent(rg, root)
        arm = curve_tube('bras', [(0.0, 0, 0.003, 1), (-0.018, sd * 0.01, 0.003, 1)], 0.002, 4); assign(arm, m_); parent(arm, root)
    return root

def P_comb(loc=(0, 0, 0), rot=0.0, color=(0.02, 0.02, 0.022)):
    root = empty('peigne', loc, (0, 0, rot)); m_ = M_plastic(color, 0.3)
    sp = box('dos', (0.15, 0.012, 0.003), (0, 0.012, 0.0015), 0.0012); assign(sp, m_); parent(sp, root)
    for i in range(40):
        t_ = box('dent', (0.0016, 0.022 if i < 18 else 0.017, 0.0026), (-0.072 + i * 0.0037, -0.006, 0.0013), 0.0005); assign(t_, m_); parent(t_, root)
    return root

def P_towel(loc=(0, 0, 0), rot=0.0, color=(0.8, 0.78, 0.74)):
    t_ = grid('serviette', 0.32, 0.22, 60, 40)
    for v in t_.data.vertices: v.co.z = 0.004 + 0.006 * math.sin(v.co.x * 25) * math.sin(v.co.y * 18) + (0.012 if abs(v.co.x) > 0.13 else 0) * (abs(v.co.x) - 0.13) * 20
    solidify(t_, 0.006, 0); place(t_, loc, (0, 0, rot)); assign(t_, M_fabric(color, 0.95, 1.0, 400, 0.6))
    return t_

def P_chair():
    """fauteuil de barbier classique : pied chromé, assise et dossier en cuir capitonné, accoudoirs"""
    root = empty('fauteuil'); ch = M_chrome(0.08); lea = M_leather((0.12, 0.012, 0.016), 0.38)
    base = lathe('pied', [(0.0, 0.0), (0.26, 0.0), (0.27, 0.02), (0.08, 0.05), (0.06, 0.3), (0.0, 0.3)], 96); assign(base, ch); parent(base, root)
    seat = box('assise', (0.5, 0.5, 0.12), (0, 0, 0.38), 0.05); assign(seat, lea); parent(seat, root)
    back = box('dossier', (0.12, 0.5, 0.62), (-0.26, 0, 0.72), 0.05); back.rotation_euler = (0, math.radians(-12), 0); assign(back, lea); parent(back, root)
    head = box('appui', (0.1, 0.26, 0.14), (-0.32, 0, 1.1), 0.04); assign(head, lea); parent(head, root)
    for sd in (-1, 1):
        arm = box('accoudoir', (0.5, 0.08, 0.05), (0.02, sd * 0.29, 0.56), 0.02); assign(arm, mat('bois', (0.12, 0.05, 0.02), 0.35, coat=0.7)); parent(arm, root)
        post = cyl('montant', 0.015, 0.16, 24, (0.18, sd * 0.29, 0.47)); assign(post, ch); parent(post, root)
        post2 = cyl('montant', 0.015, 0.16, 24, (-0.15, sd * 0.29, 0.47)); assign(post2, ch); parent(post2, root)
    foot = box('reposepied', (0.12, 0.42, 0.03), (0.42, 0, 0.18), 0.01); assign(foot, ch); parent(foot, root)
    for i in range(3):
        for j in range(3):
            b_ = sphere('capiton', 0.012, (-0.2 - 0.0, -0.16 + j * 0.16, 0.55 + i * 0.16), (0.6, 1, 1)); assign(b_, lea); parent(b_, root)
    return root

def P_bottles(colors, loc=(0, 0, 0)):
    root = empty('flacons', loc)
    for i, c in enumerate(colors):
        x = (i - (len(colors) - 1) / 2) * 0.07
        b_ = lathe('flacon', [(0, 0), (0.026, 0), (0.028, 0.004), (0.028, 0.11), (0.012, 0.13), (0.01, 0.15), (0, 0.15)], 64); b_.location = (x, 0.02 * (i % 2), 0)
        assign(b_, mat('flacon', c, 0.25, coat=0.6, coat_rough=0.1)); parent(b_, root)
        cap = cyl('bouchon', 0.011, 0.03, 32, (x, 0.02 * (i % 2), 0.165), (0, 0, 0), 0.003); assign(cap, mat('bouchon', (0.02, 0.02, 0.022), 0.3)); parent(cap, root)
    return root

def P_swatches(colors, loc=(0, 0, 0)):
    """mèches de cheveux colorées posées sur le comptoir (vraie fibre)"""
    out = []
    for k, (mel, red, tint) in enumerate(colors):
        R = random.Random(41 + k); strands = []
        x0 = loc[0] + (k - (len(colors) - 1) / 2) * 0.045
        for i in range(900):
            y0 = loc[1] - 0.09 + R.uniform(-0.006, 0.006); dx = R.uniform(-0.008, 0.008)
            strands.append([Vector((x0 + dx + 0.002 * math.sin(j * 0.6 + i), y0 + j * 0.02, loc[2] + 0.002 + R.uniform(0, 0.003))) for j in range(10)])
        out.append(hair_object('meche', strands, mel, red, 0.3, (0.00006, 0.00004), tint))
        clip = box('agrafe', (0.022, 0.014, 0.008), (x0, loc[1] - 0.095, loc[2] + 0.004), 0.003); assign(clip, M_chrome(0.15))
    return out

def P_lens_case(loc=(0, 0, 0)):
    root = empty('etui', loc)
    for sd, col in ((-1, (0.1, 0.5, 0.9)), (1, (0.2, 0.75, 0.3))):
        cup = lathe('godet', [(0.0, 0.0), (0.018, 0.0), (0.019, 0.016), (0.016, 0.016), (0.015, 0.003), (0.0, 0.003)], 64); cup.location = (0, sd * 0.024, 0); assign(cup, M_plastic((0.85, 0.85, 0.88), 0.2)); parent(cup, root)
        lens = lathe('lentille', [(0.0, 0.009), (0.007, 0.0085), (0.0135, 0.0068), (0.014, 0.0062), (0.0133, 0.0065), (0.0067, 0.008), (0.0, 0.0085)], 64); lens.location = (0, sd * 0.024, 0.004)
        assign(lens, mat('lentille', col, 0.05, trans=0.6, coat=1.0)); parent(lens, root)
        lid = cyl('couvercle', 0.0195, 0.008, 48, (0.05, sd * 0.03, 0.004), (0, 0, 0), 0.002); assign(lid, M_plastic(col, 0.3)); parent(lid, root)
    bridge = box('pont', (0.012, 0.03, 0.01), (0, 0, 0.005), 0.003); assign(bridge, M_plastic((0.85, 0.85, 0.88), 0.2)); parent(bridge, root)
    bottle = lathe('solution', [(0, 0), (0.022, 0), (0.024, 0.006), (0.024, 0.09), (0.01, 0.11), (0.008, 0.125), (0, 0.125)], 64); bottle.location = (-0.07, 0.06, 0); assign(bottle, mat('solution', (0.85, 0.88, 0.95), 0.2, coat=0.5)); parent(bottle, root)
    return root

def P_palette(loc=(0, 0, 0), colors=None):
    root = empty('palette', loc)
    case = box('boitier', (0.16, 0.1, 0.012), (0, 0, 0.006), 0.004); assign(case, mat('boitier', (0.015, 0.015, 0.018), 0.25, coat=0.9)); parent(case, root)
    colors = colors or [(0.55, 0.25, 0.2), (0.75, 0.45, 0.35), (0.35, 0.12, 0.25), (0.15, 0.08, 0.2), (0.85, 0.65, 0.5), (0.6, 0.15, 0.3), (0.2, 0.12, 0.1), (0.9, 0.7, 0.45)]
    for i, c in enumerate(colors):
        x = -0.06 + (i % 4) * 0.04; y = -0.022 + (i // 4) * 0.044
        pan = cyl('fard', 0.016, 0.004, 48, (x, y, 0.013)); assign(pan, mat('fard', c, 0.7, sheen=0.6, film=300 if i % 3 == 0 else 0)); parent(pan, root)
    return root

def P_lipstick(loc=(0, 0, 0), color=(0.55, 0.03, 0.05), rot=0.0):
    root = empty('rouge', loc, (0, 0, rot))
    tube_ = cyl('etui', 0.009, 0.05, 48, (0, 0, 0.025), (0, 0, 0), 0.002); assign(tube_, M_chrome(0.1, (0.85, 0.7, 0.4))); parent(tube_, root)
    stick = lathe('baton', [(0, 0.05), (0.0072, 0.05), (0.0072, 0.068), (0.004, 0.078), (0.0, 0.08)], 48); assign(stick, mat('rouge', color, 0.25, coat=0.6, sss=0.2)); parent(stick, root)
    return root

def P_brush(loc=(0, 0, 0), rot=0.0, tip=(0.12, 0.08, 0.06)):
    root = empty('pinceau', loc, (0, 0, rot))
    h = cyl('manche', 0.004, 0.14, 24, (0.07, 0, 0.005), (0, math.pi / 2, 0), 0.001); assign(h, mat('manche', (0.02, 0.02, 0.022), 0.3, coat=0.8)); parent(h, root)
    fer = cyl('virole', 0.005, 0.025, 24, (-0.012, 0, 0.005), (0, math.pi / 2, 0)); assign(fer, M_chrome(0.15)); parent(fer, root)
    br = sphere('poils', 0.009, (-0.034, 0, 0.006), (1.8, 0.8, 0.6)); assign(br, M_fabric(tip, 0.9, 1.0, 1200, 0.3)); parent(br, root)
    return root

def P_razor(loc=(0, 0, 0), rot=0.0):
    root = empty('rasoir', loc, (0, 0, rot))
    bl = extrude2d('lame', [(0.0, 0.0), (0.085, 0.0), (0.09, 0.012), (0.0, 0.016)], 0.0025, 0.0008); bl.location = (0, 0, 0.002); assign(bl, M_chrome(0.06)); parent(bl, root)
    hd = extrude2d('manche', [(-0.11, -0.004), (0.0, -0.002), (0.0, 0.016), (-0.11, 0.012)], 0.008, 0.002); hd.location = (-0.002, 0.0, 0.004); assign(hd, mat('ebene', (0.03, 0.015, 0.008), 0.25, coat=0.7)); parent(hd, root)
    return root

def P_shaving_bowl(loc=(0, 0, 0)):
    root = empty('bol', loc)
    bowl = lathe('bol', [(0.0, 0.0), (0.04, 0.0), (0.05, 0.03), (0.048, 0.032), (0.038, 0.004), (0.0, 0.004)], 64); assign(bowl, mat('faience', (0.9, 0.88, 0.84), 0.15, coat=0.6)); parent(bowl, root)
    foam = sphere('mousse', 0.044, (0, 0, 0.026), (1, 1, 0.45)); displace(foam, 0.004, 0.01, 'CLOUDS', 2); assign(foam, mat('mousse', (0.95, 0.95, 0.95), 0.6, sss=0.6, sss_radius=(1, 1, 1), sss_scale=0.004)); parent(foam, root)
    brush = empty('blaireau', (0.06, 0.03, 0.0)); parent(brush, root)
    hnd = lathe('manche', [(0.0, 0.0), (0.018, 0.0), (0.016, 0.03), (0.013, 0.05), (0.016, 0.06), (0.0, 0.06)], 48); hnd.location = (0.06, 0.03, 0); assign(hnd, mat('corne', (0.05, 0.03, 0.02), 0.2, coat=0.7)); parent(hnd, root)
    knot = sphere('soies', 0.02, (0.06, 0.03, 0.078), (1, 1, 1.15)); assign(knot, M_fabric((0.5, 0.42, 0.34), 0.9, 1.0, 1500, 0.4)); parent(knot, root)
    return root

def P_tweezers(loc=(0, 0, 0), rot=0.0):
    root = empty('pince', loc, (0, 0, rot))
    for sd in (-1, 1):
        a = extrude2d('branche', [(0.0, 0.0), (0.09, sd * 0.004), (0.09, sd * 0.0075), (0.0, sd * 0.004)], 0.004, 0.0008); a.location = (0, 0, 0.002); assign(a, M_chrome(0.12, (0.95, 0.75, 0.6))); parent(a, root)
    return root

def product_scene(kind):
    barber(0.0)
    if kind == 'planque':
        P_towel((0.0, 0.02, 0.0), 0.2); P_clippers((0.0, 0.0, 0.012), 0.5); P_comb((0.05, -0.1, 0.012), -0.3); P_scissors((-0.1, -0.05, 0.012), 1.1)
        cam((0.42, -0.42, 0.34), (0.0, -0.01, 0.02), 75, 4.5)
    elif kind == 'salon':
        ch = P_chair(); ch.scale = (0.32, 0.32, 0.32); ch.location = (0.05, 0.05, 0.0); ch.rotation_euler = (0, 0, math.radians(-30))
        cam((0.62, -0.62, 0.35), (0.04, 0.03, 0.18), 50, 5.6)
    elif kind == 'couleur':
        P_bottles([(0.45, 0.05, 0.1), (0.05, 0.1, 0.45), (0.85, 0.75, 0.6)], (0.06, 0.08, 0.0))
        P_swatches([(0.22, 0.55, None), (0.45, 0.95, None), (0.1, 0.2, (0.3, 0.45, 1.0)), (0.08, 0.2, (1.0, 0.35, 0.7))], (-0.05, -0.02, 0.0))
        bowl = lathe('bol', [(0.0, 0.0), (0.04, 0.0), (0.05, 0.035), (0.047, 0.036), (0.037, 0.004), (0.0, 0.004)], 64); bowl.location = (-0.14, 0.08, 0); assign(bowl, M_plastic((0.02, 0.02, 0.022), 0.3))
        P_brush((-0.08, 0.12, 0.0), 0.6, (0.9, 0.9, 0.9))
        cam((0.36, -0.42, 0.3), (-0.01, 0.02, 0.03), 70, 4.5)
    elif kind == 'lentilles':
        P_lens_case((0.0, 0.0, 0.0))
        cam((0.2, -0.24, 0.17), (-0.01, 0.01, 0.01), 85, 3.5)
    elif kind == 'maquillage':
        P_palette((0.0, 0.02, 0.0)); P_brush((0.06, -0.08, 0.0), -0.4); P_lipstick((-0.11, -0.04, 0.0), (0.55, 0.03, 0.05))
        cam((0.3, -0.34, 0.28), (-0.01, -0.01, 0.02), 75, 4.0)
    elif kind == 'lucia':
        P_lipstick((0.0, 0.0, 0.0), (0.62, 0.02, 0.06)); P_lipstick((0.04, 0.035, 0.0), (0.42, 0.05, 0.08), 0.5)
        pal = P_palette((-0.12, 0.05, 0.0), [(0.95, 0.75, 0.6), (0.8, 0.5, 0.42), (0.6, 0.25, 0.25), (0.25, 0.12, 0.12), (0.9, 0.6, 0.55), (0.55, 0.1, 0.15), (0.12, 0.06, 0.06), (0.95, 0.85, 0.7)])
        pal.rotation_euler = (0, 0, 0.3)
        P_brush((0.1, -0.05, 0.0), -0.9, (0.25, 0.15, 0.1))
        cam((0.26, -0.3, 0.2), (-0.03, 0.01, 0.03), 85, 3.5)
    elif kind == 'rasage':
        P_shaving_bowl((0.02, 0.05, 0.0)); P_razor((-0.05, -0.07, 0.0), 0.4); P_towel((0.12, -0.05, 0.0), -0.3, (0.92, 0.92, 0.9))
        cam((0.36, -0.4, 0.28), (0.0, 0.0, 0.03), 70, 4.5)
    elif kind == 'sourcils':
        P_tweezers((0.0, -0.02, 0.0), 0.3); P_comb((0.02, 0.06, 0.0), -0.2, (0.6, 0.45, 0.35)); P_brush((-0.08, -0.06, 0.0), 1.0, (0.3, 0.2, 0.12))
        cam((0.26, -0.3, 0.22), (-0.01, 0.0, 0.01), 85, 3.5)

# ------------------------------------------------------------------ registre
SH = {'anthracite': (0.03, 0.03, 0.035), 'noir': (0.01, 0.01, 0.012), 'marine': (0.02, 0.03, 0.065), 'olive': (0.04, 0.045, 0.022), 'bordeaux': (0.09, 0.012, 0.02),
      'ardoise': (0.05, 0.06, 0.072), 'jean': (0.035, 0.06, 0.11), 'blanc': (0.62, 0.62, 0.6), 'turquoise': (0.05, 0.2, 0.18), 'rose': (0.35, 0.09, 0.15), 'sable': (0.3, 0.24, 0.16)}

LONG = ('curls', 'ponytail', 'braids', 'dreads', 'pigtails')

def item(kind, tone=1, color='brun', shirt=None, view='back34', **kw):
    """tête d'école de coiffure (teinte chair, satinée) sur socle, vraie chevelure en mèches"""
    def b():
        from . import head2
        head2.install()
        long_ = kind in LONG or kw.get('long', False)
        root, head, bz = head2.mannequin(tone, shoulders=long_)
        barber(bz)
        mel, red = melanin_for(color); strands = []; beard = []
        k = kind
        if k == 'fade': strands = S_short(head, fade_len(kw.get('top', 0.022)), 70000, 0.0025, 3, Vector((-0.25, 0, 0)))
        elif k == 'buzz': strands = S_short(head, lambda p: kw.get('L', 0.004), 70000, kw.get('soft', 0.003), 4)
        elif k == 'bald': strands = S_short(head, lambda p: 0.0003, 40000, 0.004, 4)
        elif k == 'clipper': strands = S_short(head, lambda p: 0.006 + 0.01 * sm(p.z, 0.04, 0.09), 60000, 0.003, 5, Vector((-0.3, 0, 0)))
        elif k == 'afro': strands = S_afro(head, kw.get('size', 0.045), 16000, 5)
        elif k == 'hightop': strands = S_hightop(head, kw.get('height', 0.075))
        elif k == 'lines': strands = S_lines(head)
        elif k == 'curls': strands = S_curls(head, kw.get('length', 0.26))
        elif k == 'ponytail': strands = S_gathered(head, [(-0.104, 0.0, 0.03)], kw.get('tail', 0.24), 20000, 11, spread=(0.01, 0.028), root=root)
        elif k == 'pigtails': strands = S_gathered(head, [(-0.03, 0.075, 0.02), (-0.03, -0.075, 0.02)], kw.get('tail', 0.2), 18000, 12, spread=(0.008, 0.024), root=root)
        elif k == 'topknot': strands = S_gathered(head, [(-0.045, 0.0, 0.118)], 0.0, 18000, 13, root=root, bun=True)
        elif k == 'cornrows': strands = cornrows(head, kw.get('rows', 10), color, kw.get('zigzag', False), root)
        elif k == 'braids': box_braids(head, kw.get('n', 60), kw.get('length', 0.32), kw.get('r', 0.0032), color, root=root, knotless=kw.get('knotless', False)); strands = S_short(head, lambda p: 0.0008, 20000, 0.003, 14)
        elif k == 'dreads': dreads(head, kw.get('n', 48), kw.get('length', 0.2), color=color, root=root); strands = S_short(head, lambda p: 0.0015, 20000, 0.003, 15)
        elif k == 'mullet': strands = S_mullet(head, kw.get('top', 0.03), kw.get('back', 0.17), shaggy=kw.get('shaggy', False))
        elif k == 'fauxhawk': strands = S_fauxhawk(head)
        elif k == 'sidepart': strands = S_sidepart(head, kw.get('L', 0.075))
        elif k == 'slick': strands = S_slick(head, kw.get('L', 0.1))
        elif k == 'pompadour': strands = S_pompadour(head, kw.get('L', 0.1))
        elif k == 'bob': strands = S_bob(head, kw.get('L', 0.13))
        elif k == 'messy': strands = S_messy(head, kw.get('L', 0.08), wig=kw.get('wig', 0.35), dense=kw.get('dense', 22000), rec=kw.get('rec', 0.0))
        if kw.get('beard'):
            zones, L, curl = kw['beard']
            beard = beard_strands(head, zones, L, kw.get('beard_dense', 45000), 7, curl, kw.get('droop', 0.5))
        if kw.get('handlebar'):
            beard += handlebar_strands(head, kw['handlebar'])
        rough = kw.get('rough', 0.32); groups = []
        if long_ and strands: strands = head2.drape(strands)
        if strands:
            hair_object('cheveux', strands, mel, red, rough); groups.append((strands, mel_rgb(color)))
        if beard:
            bc = kw.get('beard_color', color); bm_, br_ = melanin_for(bc)
            hair_object('barbe', beard, bm_, br_, 0.4, (0.00006, 0.00003)); groups.append((beard, mel_rgb(bc)))
        head2.paint_scalp(head, groups)
        hair_cam(view)
    return b

def product(kind):
    def b(): product_scene(kind)
    return b

BEARD_FULL = [zone_jaw, zone_chin, zone_mustache, zone_sideburn]
def bl(chin, jaw, cheek=None, must=None):
    """longueur de barbe selon la zone (menton, mâchoire, joue, moustache)"""
    cheek = jaw * 0.6 if cheek is None else cheek; must = jaw * 0.8 if must is None else must
    return lambda p: cheek + (jaw - cheek) * sm(-p.z, 0.04, 0.075) + (chin - jaw) * sm(-p.z, 0.085, 0.105) * sm(p.x, 0.03, 0.065) + (must - cheek) * zone_mustache(p)

ITEMS = {
    'coupe-a-la-planque': product('planque'),
    'coupe-en-salon': product('salon'),
    'couleur-des-cheveux': product('couleur'),
    'online-lentilles': product('lentilles'),
    'online-maquillage': product('maquillage'),
    'lucia-maquillage': product('lucia'),
    'gta5-rasage': product('rasage'),
    'online-sourcils-torse': product('sourcils'),
    'jason-coiffure-retro': item('pompadour', 1, 'brun', 'rose', 'sideback', L=0.1),
    'lucia-boucles': item('curls', 2, 'brun', 'bordeaux', 'longfront', length=0.24),
    'gta5-fade': item('fade', 4, 'noir', 'olive', 'sideback', top=0.02),
    'gta5-shape-up': item('buzz', 4, 'noir', 'anthracite', 'front34', L=0.0045, soft=0.0012),
    'gta5-corn-rows': item('cornrows', 4, 'noir', 'olive', 'top34'),
    'gta5-lo-fro': item('afro', 4, 'noir', 'olive', 'tallfront', size=0.04),
    'gta5-the-king-fresh': item('hightop', 4, 'noir', 'jean', 'tallfront', height=0.075),
    'gta5-abstraction': item('lines', 4, 'noir', 'noir', 'side'),
    'gta5-lexington': item('sidepart', 1, 'chatain', 'marine', 'front34', L=0.075),
    'gta5-clippered-cut': item('clipper', 1, 'chatain', 'marine', 'front34'),
    'gta5-grown-out': item('messy', 0, 'chatain', 'ardoise', 'front34', L=0.08, wig=0.3),
    'gta5-slicker': item('slick', 1, 'brun', 'noir', 'sideback', L=0.1, rough=0.22),
    'gta5-trailer-cut': item('messy', 0, 'gris', 'sable', 'front34', L=0.05, wig=0.45, dense=12000, rec=0.025),
    'gta5-mullet': item('mullet', 0, 'chatain', 'sable', 'sideback', top=0.03, back=0.17),
    'gta5-clean-razor': item('bald', 0, 'brun', 'sable', 'front34'),
    'gta5-coupes-social-club': item('pompadour', 2, 'blond', 'anthracite', 'sideback', L=0.08),
    'online-buzzcut': item('buzz', 1, 'brun', 'turquoise', 'front34', L=0.003),
    'online-close-shave': item('buzz', 3, 'noir', 'bordeaux', 'front34', L=0.0012),
    'online-faux-hawk': item('fauxhawk', 1, 'roux', 'noir', 'front34'),
    'online-cornrows': item('cornrows', 5, 'noir', 'sable', 'top34', zigzag=True, rows=9),
    'online-dreads': item('dreads', 4, 'noir', 'bordeaux', 'longfront'),
    'online-top-knot': item('topknot', 2, 'brun', 'marine', 'side'),
    'online-shaggy-mullet': item('mullet', 0, 'blond', 'ardoise', 'sideback', top=0.04, back=0.15, shaggy=True),
    'online-couettes': item('pigtails', 1, 'chatain', 'rose', 'front'),
    'online-queue-de-cheval': item('ponytail', 0, 'roux', 'turquoise', 'longside'),
    'online-coupe-courte': item('bob', 2, 'noir', 'sable', 'front34', L=0.12),
    'online-tresses': item('braids', 3, 'brun', 'olive', 'longfront', n=46, length=0.3, r=0.004),
    'online-mullet-femme': item('mullet', 1, 'blond', 'rose', 'sideback', top=0.045, back=0.15, shaggy=True),
    'online-knotless-braids': item('braids', 4, 'noir', 'sable', 'longfront', n=70, length=0.38, r=0.0027, knotless=True),
    'online-baby-braids': item('braids', 5, 'noir', 'turquoise', 'longfront', n=110, length=0.2, r=0.0017),
    'gta5-barbe-de-trois-jours': item('sidepart', 1, 'brun', 'marine', 'beard', L=0.07, beard=(BEARD_FULL, 0.0016, 0.0), beard_dense=60000),
    'gta5-bouc-complet': item('sidepart', 1, 'brun', 'anthracite', 'beard', L=0.07, beard=([zone_chin, zone_mustache, zone_soul], 0.015, 0.0)),
    'gta5-methodical': item('fade', 4, 'noir', 'olive', 'beard', top=0.012, beard=(BEARD_FULL, bl(0.012, 0.009, 0.006, 0.008), 0.0), droop=0.3),
    'gta5-full-spartan': item('fade', 4, 'noir', 'olive', 'beard', top=0.012, beard=(BEARD_FULL, bl(0.045, 0.03, 0.012, 0.016), 0.0), droop=0.45),
    'gta5-grosse-moustache': item('messy', 0, 'gris', 'sable', 'beard', L=0.05, wig=0.4, dense=12000, rec=0.025, beard=([zone_mustache], 0.022, 0.0), droop=0.7),
    'gta5-the-gerry': item('messy', 0, 'gris', 'sable', 'beard', L=0.05, wig=0.4, dense=12000, rec=0.02, beard=([lambda p: zone_jaw(p) * (1 - zone_chin(p)), zone_sideburn, zone_mustache], bl(0.0, 0.014, 0.012, 0.016), 0.0)),
    'gta5-barbes-de-depart': item('clipper', 2, 'chatain', 'jean', 'beard', beard=(BEARD_FULL, bl(0.022, 0.016, 0.009, 0.012), 0.0)),
    'online-light-stubble': item('buzz', 2, 'noir', 'noir', 'beard', L=0.004, beard=(BEARD_FULL, 0.0009, 0.0), beard_dense=45000),
    'online-balbo': item('sidepart', 1, 'brun', 'bordeaux', 'beard', L=0.07, beard=([lambda p: zone_jaw(p) * sm(p.x, 0.035, 0.05), zone_chin, lambda p: zone_mustache(p) * (1 - sm(abs(p.y), 0.022, 0.026))], 0.012, 0.0)),
    'online-goatee': item('buzz', 3, 'noir', 'anthracite', 'beard', L=0.004, beard=([zone_chin, zone_mustache], 0.01, 0.0)),
    'online-curly': item('afro', 4, 'noir', 'turquoise', 'beard', size=0.035, beard=(BEARD_FULL, bl(0.03, 0.022, 0.012, 0.014), 22.0)),
    'online-handlebar': item('slick', 1, 'roux', 'marine', 'beard', L=0.09, handlebar=0.026, beard=(BEARD_FULL, 0.0012, 0.0), beard_dense=40000),
}
