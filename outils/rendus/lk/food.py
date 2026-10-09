# Consommables : objets réalistes posés sur un comptoir de diner, la nuit (bois verni, néons flous au fond).
import bpy, bmesh, math, random
from mathutils import Vector
from .core import *

# ------------------------------------------------------------------ décor
def diner(top='wood', warm=(1.0, 0.82, 0.62)):
    world_color((0.004, 0.004, 0.008), 1.0)
    # plateau du comptoir : bois sombre verni
    t = box('comptoir', (3.0, 2.4, 0.04), (0, 0.1, -0.02))
    def wood_fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        n = noise(nt, v, 2.5, 6, 0.6, dist=3.0)
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'X'; wv.inputs['Scale'].default_value = 9.0; wv.inputs['Distortion'].default_value = 7.0; wv.inputs['Detail'].default_value = 4
        nt.links.new(v, wv.inputs['Vector'])
        c = ramp(nt, wv.outputs['Fac'], [(0.0, (0.035, 0.016, 0.008)), (0.55, (0.075, 0.036, 0.016)), (1.0, (0.11, 0.055, 0.025))])
        nt.links.new(c, p.inputs['Base Color'])
    assign(t, mat('bois', (0.06, 0.03, 0.015), 0.32, coat=0.85, coat_rough=0.06, base_fn=wood_fn, bump={'scale': 220, 'strength': 0.04}))
    # bord chromé du comptoir
    edge = cyl('bord', 0.012, 3.0, 32, (0, -1.1, -0.006), (0, math.pi / 2, 0)); assign(edge, M_chrome(0.12))
    # fond : mur sombre, enseignes néon et ampoules, rendus flous par la profondeur de champ
    wall = box('mur', (6, 0.05, 3), (0, 2.6, 1.0)); assign(wall, mat('mur', (0.012, 0.01, 0.014), 0.8))
    neon('neon1', [(-1.1, 2.4, 0.42), (-0.62, 2.4, 0.42)], (1.0, 0.18, 0.55), 40, 0.012)
    neon('neon2', [(-1.1, 2.4, 0.36), (-0.62, 2.4, 0.36)], (1.0, 0.18, 0.55), 30, 0.012)
    neon('neon3', [(0.55, 2.4, 0.5), (0.75, 2.4, 0.62), (0.95, 2.4, 0.5), (1.15, 2.4, 0.62)], (0.2, 0.85, 1.0), 40, 0.012)
    bokeh_lights([(-0.35, 2.3, 0.62, 0.02, (1.0, 0.75, 0.45), 60), (0.12, 2.3, 0.7, 0.018, (1.0, 0.7, 0.4), 60), (0.32, 2.3, 0.3, 0.015, (1.0, 0.55, 0.3), 50),
                  (-0.75, 2.3, 0.18, 0.016, (0.4, 0.9, 1.0), 40), (1.3, 2.3, 0.28, 0.02, (1.0, 0.3, 0.6), 50), (-1.45, 2.3, 0.6, 0.02, (1.0, 0.8, 0.5), 50)])
    # éclairage : grande boîte chaude (clé), contre-jours rose et cyan, débouchage froid
    area('cle', (-0.35, -0.45, 0.55), (0, 0, 0.04), 0.7, 9, warm)
    area('contre_rose', (-0.45, 0.45, 0.22), (0, 0, 0.05), 0.35, 3.5, (1.0, 0.25, 0.6))
    area('contre_cyan', (0.45, 0.42, 0.2), (0, 0, 0.05), 0.35, 3.0, (0.25, 0.8, 1.0))
    area('debouchage', (0.5, -0.6, 0.15), (0, 0, 0.04), 0.8, 1.2, (0.75, 0.82, 1.0))

def food_cam(target=(0, 0, 0.045), dist=0.5, height=0.17, az=-28, lens=95, fstop=2.8):
    a = math.radians(az)
    loc = (target[0] + math.sin(a) * dist, target[1] - math.cos(a) * dist, target[2] + height)
    return cam(loc, target, lens, fstop)

# ------------------------------------------------------------------ outils
def jitter_radial(ob, amp=0.002, freq=7, seed=1):
    R = random.Random(seed); ph = [R.random() * 6 for _ in range(3)]
    for v in ob.data.vertices:
        x, y, z = v.co; a = math.atan2(y, x); r = math.hypot(x, y)
        if r < 1e-6: continue
        k = math.sin(a * freq + ph[0]) * 0.5 + math.sin(a * freq * 2.3 + ph[1] + z * 40) * 0.3 + math.sin(a * freq * 4.7 + ph[2]) * 0.2
        s = (r + amp * k) / r; v.co.x *= s; v.co.y *= s

def color_by_z(nt, p, zlo, zhi, stops, noise_scale=40, noise_k=0.08):
    """couleur de base selon la hauteur (objet), légèrement bruitée"""
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = zlo; mr.inputs['From Max'].default_value = zhi
    nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
    n = noise(nt, tc.outputs['Object'], noise_scale, 4, 0.6)
    f = math_node(nt, 'ADD', mr.outputs['Result'], math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', n.outputs['Fac'], 0.5), noise_k))
    nt.links.new(ramp(nt, f, stops), p.inputs['Base Color'])

# ------------------------------------------------------------------ burger
def bun_bottom(r=0.057, h=0.022):
    ob = lathe('pain_bas', [(0, 0), (r * 0.8, 0.0004), (r * 0.95, 0.003), (r, h * 0.42), (r * 0.99, h * 0.82), (r * 0.95, h * 0.97), (r * 0.85, h), (0, h)], 96)
    subsurf(ob, 1); displace(ob, 0.0012, 0.004, 'CLOUDS', 2)
    def fn(nt, p):
        geo = nt.nodes.new('ShaderNodeNewGeometry'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(geo.outputs['Normal'], sep.inputs[0])
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 90, 6, 0.65)
        crumb = ramp(nt, n.outputs['Fac'], [(0.3, (0.62, 0.42, 0.22)), (0.7, (0.86, 0.68, 0.45))])
        crust = ramp(nt, n.outputs['Fac'], [(0.3, (0.42, 0.2, 0.07)), (0.7, (0.66, 0.38, 0.15))])
        f = math_node(nt, 'GREATER_THAN', sep.outputs['Z'], 0.75)
        nt.links.new(mix(nt, crust, crumb, f), p.inputs['Base Color'])
    assign(ob, mat('mie', (0.7, 0.5, 0.3), 0.6, sss=0.25, sss_radius=(1, 0.6, 0.3), sss_scale=0.004, sheen=0.3, base_fn=fn, bump={'kind': 'voronoi', 'scale': 260, 'strength': 0.35}))
    return ob

def bun_top(r=0.062, h=0.043, seeds=56, seed=5):
    prof = [(0, -0.0015), (r * 0.93, -0.0015), (r * 0.995, 0.002)]
    for i in range(1, 25):
        a = i / 24 * math.pi / 2
        prof.append((r * math.cos(a) ** 0.9 * (1 - 0.03 * math.sin(a * 2)), 0.002 + (h - 0.002) * math.sin(a) ** 0.72))
    ob = lathe('pain_haut', prof, 128); subsurf(ob, 1)
    R = random.Random(seed)
    for v in ob.data.vertices:
        x, y, z = v.co; v.co.x *= 1.0 + 0.02 * math.sin(math.atan2(y, x) * 2 + seed); v.co.z += 0.0015 * math.sin(x * 60 + seed) * (z / h)
    displace(ob, 0.0018, 0.028, 'CLOUDS', 3)
    def fn(nt, p):
        color_by_z(nt, p, 0.0, h, [(0.0, (0.86, 0.66, 0.42)), (0.12, (0.8, 0.52, 0.24)), (0.35, (0.68, 0.36, 0.12)), (0.75, (0.5, 0.23, 0.065)), (1.0, (0.44, 0.19, 0.05))], 18, 0.16)
    def rfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 70, 5, 0.6)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (0.32,) * 3), (0.7, (0.5,) * 3)]), p.inputs['Roughness'])
    def bumpf(nt, vec):
        a = noise(nt, vec, 320, 6, 0.65).outputs['Fac']; b = noise(nt, vec, 45, 3, 0.5).outputs['Fac']
        return math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', a, 0.6), math_node(nt, 'MULTIPLY', b, 0.4))
    assign(ob, mat('croute', (0.5, 0.25, 0.08), 0.4, coat=0.35, coat_rough=0.25, sss=0.15, sss_radius=(1, 0.55, 0.25), sss_scale=0.004, base_fn=fn, rough_fn=rfn, bump={'kind': bumpf, 'strength': 0.18}))
    bm = bmesh.new()
    for i in range(seeds):
        a = R.random() * math.tau; el = 0.55 + R.random() * 0.9
        cr = math.cos(el) ** 0.9 * r * (1 - 0.03 * math.sin(el * 2)); px, py = cr * math.cos(a), cr * math.sin(a); pz = 0.002 + (h - 0.002) * math.sin(el) ** 0.72 - 0.0003
        nrm = Vector((px / r * 0.9, py / r * 0.9, max(0.2, pz / h))).normalized()
        g = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1)
        q = nrm.to_track_quat('Z', 'Y'); spin = R.random() * math.tau; k = 0.85 + R.random() * 0.3
        for v in g['verts']:
            c = Vector((v.co.x * 0.0028 * k, v.co.y * 0.0015 * k, v.co.z * 0.0009)); c.rotate(Euler((0, 0, spin))); c.rotate(q); v.co = c + Vector((px, py, pz))
    s = mesh_obj('sesame', bm)
    def sfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 900, 2, 0.5)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (0.9, 0.8, 0.58)), (0.7, (0.97, 0.92, 0.78))]), p.inputs['Base Color'])
    assign(s, mat('sesame', (0.93, 0.85, 0.66), 0.38, sss=0.3, sss_radius=(1, 0.9, 0.6), sss_scale=0.001, base_fn=sfn))
    return [ob, s]

def patty(r=0.063, h=0.018, seed=3, crispy=False):
    ob = lathe('steak', [(0, 0), (r * 0.88, 0), (r * 0.98, h * 0.2), (r * 1.02, h * 0.55), (r * 0.97, h * 0.9), (r * 0.85, h), (0, h * 1.02)], 128)
    jitter_radial(ob, r * 0.05, 6, seed); subsurf(ob, 2)
    if crispy:
        displace(ob, 0.0022, 0.0035, 'CLOUDS', 3)
        def fn(nt, p): color_by_z(nt, p, 0, h, [(0.0, (0.5, 0.25, 0.06)), (0.5, (0.78, 0.48, 0.14)), (1.0, (0.62, 0.34, 0.09))], 120, 0.5)
        assign(ob, mat('panure', (0.7, 0.4, 0.1), 0.55, coat=0.3, coat_rough=0.3, sss=0.1, base_fn=fn, bump={'scale': 140, 'strength': 0.6, 'detail': 8}))
    else:
        displace(ob, 0.0026, 0.0045, 'CLOUDS', 4)
        def fn(nt, p):
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 120, 8, 0.7)
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.25, (0.05, 0.022, 0.012)), (0.55, (0.12, 0.055, 0.03)), (0.8, (0.2, 0.09, 0.045))]), p.inputs['Base Color'])
        assign(ob, mat('viande', (0.1, 0.05, 0.03), 0.42, coat=0.35, coat_rough=0.25, sss=0.08, sss_radius=(1, 0.3, 0.2), base_fn=fn, bump={'scale': 180, 'strength': 0.7, 'detail': 8}))
    return ob

def cheese(s=0.106, droop=0.016, rot=0.3):
    ob = grid('fromage', s, s, 48, 48)
    for v in ob.data.vertices:
        x, y = v.co.x, v.co.y
        # coins arrondis
        cx, cy = max(abs(x) - (s / 2 - 0.012), 0), max(abs(y) - (s / 2 - 0.012), 0)
        if cx > 0 and cy > 0:
            k = 0.012 / max(math.hypot(cx, cy), 1e-6)
            if k < 1: x = math.copysign(s / 2 - 0.012 + cx * k, x); y = math.copysign(s / 2 - 0.012 + cy * k, y); v.co.x, v.co.y = x, y
        rr = math.hypot(x, y); d = max(0.0, min(1.0, (rr - 0.048) / 0.028))
        v.co.z = -droop * (d * d * (3 - 2 * d)) * (rr / 0.07) - 0.001 * math.sin(x * 140) * d
    solidify(ob, 0.0024, 0); subsurf(ob, 1)
    ob.rotation_euler = (0, 0, rot)
    assign(ob, mat('cheddar', (0.98, 0.58, 0.1), 0.3, coat=0.35, coat_rough=0.2, sss=0.6, sss_radius=(1, 0.55, 0.15), sss_scale=0.003))
    return ob

def leaf(rmax=0.072, seed=9, ruffle=0.006, droop=0.004):
    R = random.Random(seed); ph = [R.random() * 6 for _ in range(6)]
    bm = bmesh.new(); seg, rings = 240, 22; rows = []
    def edge(a):
        return rmax * (0.84 + 0.1 * math.sin(a * 3 + ph[0]) + 0.06 * math.sin(a * 7 + ph[1]) + 0.04 * math.sin(a * 13 + ph[2]))
    for j in range(0, rings + 1):
        t = 0.08 + 0.92 * j / rings; row = []
        for i in range(seg):
            a = i / seg * math.tau; rr = edge(a) * t
            z = ruffle * t ** 2.2 * (math.sin(a * 17 + ph[3]) * 0.6 + math.sin(a * 31 + ph[4]) * 0.4) - droop * max(0.0, (rr - 0.056) / 0.02) ** 1.5
            row.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, z)))
        rows.append(row)
    for a_, b_ in zip(rows, rows[1:]):
        for i in range(seg):
            j = (i + 1) % seg; bm.faces.new((a_[i], a_[j], b_[j], b_[i]))
    ob = mesh_obj('feuille', bm); solidify(ob, 0.0007, 0)
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 55, 5, 0.6)
        vor = voronoi(nt, v, 90, 'DISTANCE_TO_EDGE')
        veins = ramp(nt, vor.outputs['Distance'], [(0.0, (0.85, 0.95, 0.6)), (0.06, (0.5, 0.72, 0.25)), (1.0, (0.42, 0.66, 0.18))])
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        rr = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', sep.outputs['X'], sep.outputs['X']), math_node(nt, 'MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])))
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.03; mr.inputs['From Max'].default_value = rmax; nt.links.new(rr, mr.inputs['Value'])
        f = math_node(nt, 'ADD', mr.outputs['Result'], math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.3))
        grad = ramp(nt, f, [(0.0, (0.72, 0.84, 0.42)), (0.55, (0.42, 0.66, 0.16)), (1.0, (0.24, 0.48, 0.06))])
        nt.links.new(mix(nt, grad, veins, 0.35, 'MULTIPLY'), p.inputs['Base Color'])
    assign(ob, mat('laitue', (0.4, 0.62, 0.15), 0.3, coat=0.6, coat_rough=0.1, sss=0.55, sss_radius=(0.4, 1.0, 0.3), sss_scale=0.002, base_fn=fn, bump={'scale': 260, 'strength': 0.2}))
    return ob

def lettuce(r0=0.032, r1=0.07, seed=9):
    a = leaf(r1, seed, 0.006, 0.006); b = leaf(r1 * 0.96, seed + 7, 0.007, 0.007)
    b.rotation_euler = (0, 0, 1.9); b.location.z = 0.0018
    return [a, b]

def tomato(r=0.032, loc=(0, 0, 0), rot=0.0):
    ob = cyl('tomate', r, 0.0055, 64, loc, (0, 0, rot)); subsurf(ob, 1)
    def fn(nt, p):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        rr = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', sep.outputs['X'], sep.outputs['X']), math_node(nt, 'MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])))
        ang = math_node(nt, 'ARCTAN2', sep.outputs['Y'], sep.outputs['X'])
        lobes = math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', ang, 4.0))
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0; mr.inputs['From Max'].default_value = r; nt.links.new(rr, mr.inputs['Value'])
        f = math_node(nt, 'ADD', mr.outputs['Result'], math_node(nt, 'MULTIPLY', lobes, 0.08))
        nt.links.new(ramp(nt, f, [(0.0, (0.75, 0.12, 0.06)), (0.25, (0.9, 0.35, 0.16)), (0.55, (0.95, 0.42, 0.18)), (0.82, (0.7, 0.07, 0.04)), (1.0, (0.55, 0.04, 0.03))]), p.inputs['Base Color'])
    assign(ob, mat('tomate', (0.8, 0.1, 0.05), 0.15, coat=0.8, coat_rough=0.05, sss=0.7, sss_radius=(1, 0.3, 0.2), sss_scale=0.004, base_fn=fn))
    return ob

def wrapper(size=0.36, color=(0.86, 0.82, 0.74), stripe=(0.55, 0.12, 0.08), seed=2):
    ob = grid('papier', size, size, 90, 90)
    R = random.Random(seed)
    for v in ob.data.vertices:
        x, y = v.co.x, v.co.y; rr = math.hypot(x, y)
        v.co.z = 0.0008 + max(0, (rr - size * 0.36) / (size * 0.2)) ** 2 * 0.004
    displace(ob, 0.004, 0.04, 'CLOUDS', 2, 0.0); subsurf(ob, 1)
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'DIAGONAL'; wv.inputs['Scale'].default_value = 7.0; wv.inputs['Distortion'].default_value = 0.6
        nt.links.new(v, wv.inputs['Vector'])
        band = ramp(nt, wv.outputs['Fac'], [(0.0, color), (0.86, color), (0.9, stripe), (1.0, stripe)])
        n = noise(nt, v, 30, 4, 0.6); grease = ramp(nt, n.outputs['Fac'], [(0.0, (0.7, 0.62, 0.48)), (0.62, (1, 1, 1)), (1.0, (1, 1, 1))])
        nt.links.new(mix(nt, band, grease, 1.0, 'MULTIPLY'), p.inputs['Base Color'])
    assign(ob, mat('emballage', color, 0.75, sss=0.2, sss_radius=(1, 0.9, 0.8), sss_scale=0.003, base_fn=fn, bump={'scale': 700, 'strength': 0.15}))
    ob.rotation_euler = (0, 0, 0.5)
    return ob

def burger(kind='classic', rot=-0.4):
    root = empty('burger'); z = 0.0
    def add(objs, hgt):
        nonlocal z
        for o in (objs if isinstance(objs, list) else [objs]):
            o.location.z += z; parent(o, root)
        z += hgt
    chick, dbl = kind == 'chicken', kind == 'double'
    add(bun_bottom(), 0.0215)
    add(patty(0.063, 0.018 if not chick else 0.021, 3, chick), 0.0172 if not chick else 0.021)
    if not chick: add(cheese(0.105, 0.013, 0.25), 0.0024)
    if dbl:
        add(patty(0.062, 0.018, 7), 0.0172); add(cheese(0.1, 0.014, 1.0), 0.0024)
    add([tomato(0.031, (-0.016, 0.01, 0), 0.2), tomato(0.03, (0.018, -0.009, 0), 1.2)], 0.0056)
    add(lettuce(0.03, 0.07), 0.0065)
    add(bun_top(0.062, 0.043, 50 if dbl else 58, 11 if dbl else 5), 0)
    root.rotation_euler = (0, 0, rot)
    return root, z + 0.043

# ------------------------------------------------------------------ registre
def it_burger(kind, paper_color, stripe, seed):
    def build():
        diner(); wp = wrapper(0.24, paper_color, stripe, seed)
        _, top = burger(kind)
        food_cam((0, 0, top * 0.45), 0.6, 0.11, -24, 85, 3.2)
    return build

ITEMS = {
    'burger-fast-food': it_burger('classic', (0.86, 0.82, 0.74), (0.55, 0.12, 0.08), 2),
    'bleeder-burger-shot': it_burger('double', (0.84, 0.8, 0.72), (0.32, 0.06, 0.04), 4),
    'fowl-burger': it_burger('chicken', (0.87, 0.83, 0.74), (0.62, 0.42, 0.08), 6),
}
