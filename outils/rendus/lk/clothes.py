# Vêtements et style : mise à plat « catalogue de mode » sur béton ciré sombre, lumière de boutique la nuit et néons aux bords ;
# tissus physiques (velours du coton, tissage, sequins, cuir), imprimés sérigraphiés. Aucun logo, aucune marque.
import bpy, bmesh, math, random, os
from mathutils import Vector
from .core import *
from . import hair as H

TEX = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tex')

# ------------------------------------------------------------------ décor : table de stylisme vue de dessus
def flatlay(surface='beton', light=1.0):
    world_color((0.003, 0.003, 0.004), 1.0)
    t = box('plateau', (4, 4, 0.04), (0, 0, -0.02))
    if surface == 'beton':
        def cfn(nt, p):
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 3, 8, 0.65); n2 = noise(nt, v, 40, 4, 0.5)
            f = math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.8), math_node(nt, 'MULTIPLY', n2.outputs['Fac'], 0.2))
            nt.links.new(ramp(nt, f, [(0.25, (0.022, 0.022, 0.024)), (0.75, (0.06, 0.06, 0.064))]), p.inputs['Base Color'])
        assign(t, mat('beton', (0.04, 0.04, 0.04), 0.62, coat=0.25, coat_rough=0.3, base_fn=cfn, bump={'scale': 60, 'strength': 0.08}))
    else:
        assign(t, mat('bois', (0.05, 0.028, 0.016), 0.45, coat=0.4, coat_rough=0.2, bump={'scale': 100, 'strength': 0.05}))
    # néons hors champ qui teintent les bords, grande boîte au-dessus
    area('boite', (0.25, -0.35, 2.0), (0, 0, 0), 1.6, 120 * light, (1.0, 0.95, 0.9))
    area('rasante', (-1.4, -0.6, 0.5), (0, 0, 0), 0.8, 40 * light, (1.0, 0.82, 0.68))
    area('neon_rose', (1.3, 0.9, 0.35), (0, 0, 0), 0.6, 32 * light, (1.0, 0.22, 0.6))
    area('neon_cyan', (-1.2, 1.1, 0.35), (0, 0, 0), 0.6, 28 * light, (0.22, 0.78, 1.0))

def top_cam(target=(0, 0, 0), height=1.6, tilt=24, az=-12, lens=50, fstop=8.0):
    e = math.radians(90 - tilt); a = math.radians(az)
    pos = (target[0] + math.sin(a) * math.cos(e) * height, target[1] - math.cos(a) * math.cos(e) * height, target[2] + math.sin(e) * height)
    return cam(pos, target, lens, fstop)

# ------------------------------------------------------------------ tissus
def cotton(color, print_img=None, print_box=None, weave=1400, sheen=0.7):
    """jersey de coton (velouté), imprimé facultatif (image, (cx, cy, largeur, hauteur) en coordonnées objet)"""
    def fn(nt, p):
        base = (*color,)
        if not print_img:
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 30, 4, 0.5)
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, tuple(x * 0.92 for x in color)), (0.7, tuple(min(1, x * 1.05) for x in color))]), p.inputs['Base Color']); return
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        cx, cy, w, h = print_box
        uu = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', sep.outputs['X'], cx), w), 0.5)
        vv = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', sep.outputs['Y'], cy), h), 0.5)
        comb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(uu, comb.inputs[0]); nt.links.new(vv, comb.inputs[1])
        it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(os.path.join(TEX, print_img), check_existing=True); it.extension = 'CLIP'
        nt.links.new(comb.outputs[0], it.inputs['Vector'])
        m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; m2.inputs[6].default_value = (*color, 1)
        fac = math_node(nt, 'MULTIPLY', it.outputs['Alpha'], 0.92)
        nt.links.new(fac, m2.inputs[0]); nt.links.new(it.outputs['Color'], m2.inputs[7]); nt.links.new(m2.outputs[2], p.inputs['Base Color'])
    def bfn(nt, vec):
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = weave; wv.inputs['Distortion'].default_value = 0.5
        nt.links.new(vec, wv.inputs['Vector']); return wv.outputs['Fac']
    return mat('coton', color, 0.86, sheen=sheen, sheen_tint=(1, 1, 1), base_fn=fn, bump={'kind': bfn, 'strength': 0.12, 'dist': 0.0005})

def linen(color): return mat('lin', color, 0.82, sheen=0.4, bump={'scale': 600, 'strength': 0.22, 'detail': 4})
def wool(color): return mat('laine', color, 0.78, sheen=0.9, sheen_tint=(1, 1, 1), bump={'scale': 900, 'strength': 0.1, 'detail': 3})
def denim(color=(0.06, 0.1, 0.2)):
    def bfn(nt, vec):
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.bands_direction = 'DIAGONAL'; wv.inputs['Scale'].default_value = 900; nt.links.new(vec, wv.inputs['Vector']); return wv.outputs['Fac']
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 8, 6, 0.6)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, tuple(x * 0.8 for x in color)), (0.75, tuple(min(1, x * 1.35) for x in color))]), p.inputs['Base Color'])
    return mat('jean', color, 0.8, sheen=0.4, base_fn=fn, bump={'kind': bfn, 'strength': 0.25, 'dist': 0.0006})
def sequins(color=(0.6, 0.02, 0.04)):
    def bfn(nt, vec):
        v = voronoi(nt, vec, 520, 'F1'); return v.outputs['Distance']
    def fn(nt, p):
        v = voronoi(nt, tex_coord(nt, 'Object', 1.0), 520, 'F1')
        nt.links.new(ramp(nt, v.outputs['Color'], [(0.0, tuple(x * 0.5 for x in color)), (1.0, tuple(min(1, x * 1.6) for x in color))]), p.inputs['Base Color'])
    return mat('sequins', color, 0.18, metal=0.85, coat=0.4, coat_rough=0.1, base_fn=fn, bump={'kind': bfn, 'strength': 0.6})
def satin(color): return mat('satin', color, 0.3, sheen=0.4, aniso=0.6, coat=0.2, coat_rough=0.2)

# ------------------------------------------------------------------ pièces (contours à plat, en mètres)
def garment(name, outline, thick=0.012, m=None, wrinkle=0.006, seed=1, holes=()):
    ob = extrude2d(name, outline, thick, 0.0)
    rm = ob.modifiers.new('remesh', 'REMESH'); rm.mode = 'SMOOTH'; rm.octree_depth = 7; rm.use_smooth_shade = True
    displace(ob, wrinkle, 0.06, 'CLOUDS', 3, 0.5, 'GLOBAL')
    subsurf(ob, 1)
    ob.location.z = thick / 2 + 0.002
    if m: assign(ob, m)
    return ob

def tee_outline(w=0.25, h=0.36, sleeve=0.12):
    return [(0.0, h - 0.015), (0.06, h - 0.005), (0.11, h), (w * 0.72, h - 0.012), (w + sleeve * 0.85, h - 0.09), (w + sleeve, h - 0.2), (w + 0.01, h - 0.23), (w, h - 0.26), (w, -h),
            (-w, -h), (-w, h - 0.26), (-w - 0.01, h - 0.23), (-w - sleeve, h - 0.2), (-w - sleeve * 0.85, h - 0.09), (-w * 0.72, h - 0.012), (-0.11, h), (-0.06, h - 0.005)]

def tee(color, print_img=None, loc=(0, 0, 0), rot=0.0, scale=1.0, seed=1):
    o = garment('tshirt', [(x * scale, y * scale) for x, y in tee_outline()], 0.012, cotton(color, print_img, (0.0, 0.05 * scale, 0.26 * scale, 0.26 * scale * (56 / 68 if 'sunset' in (print_img or '') else 44 / 80))), 0.005, seed)
    col = curve_tube('col', [(0.11 * scale * math.cos(a), 0.36 * scale - 0.06 * scale * (1 - math.sin(a)) * 0.9, 0.0145, 1) for a in [math.pi * i / 16 for i in range(17)]], 0.006 * scale, 8); assign(col, cotton(tuple(x * 0.9 for x in color)))
    root = empty('tee', loc, (0, 0, rot)); parent(o, root); parent(col, root)
    return root

def jacket(color, loc=(0, 0, 0), rot=0.0, lapel=None, buttons=2, m=None, pocket=None):
    w, h = 0.27, 0.4
    outline = [(0.0, h - 0.04), (0.07, h), (0.2, h - 0.02), (w + 0.1, h - 0.12), (w + 0.17, -0.18), (w + 0.07, -0.2), (w + 0.03, h - 0.3), (w, -h), (0.02, -h - 0.03), (-0.02, -h - 0.03), (-w, -h),
               (-w - 0.03, h - 0.3), (-w - 0.07, -0.2), (-w - 0.17, -0.18), (-w - 0.1, h - 0.12), (-0.2, h - 0.02), (-0.07, h)]
    M_ = m or wool(color)
    root = empty('veste', loc, (0, 0, rot))
    parent(garment('veste', outline, 0.02, M_, 0.004), root)
    L_ = M_ if lapel is None else mat('revers', lapel, 0.4, sheen=0.3, coat=0.2)
    for sd in (-1, 1):
        lp = extrude2d('revers', [(sd * 0.0, h - 0.04), (sd * 0.075, h - 0.01), (sd * 0.14, h - 0.08), (sd * 0.1, h - 0.16), (sd * 0.13, h - 0.2), (sd * 0.02, -0.06)], 0.006, 0.002)
        lp.location.z = 0.024; assign(lp, L_); parent(lp, root)
        pk = box('poche', (0.13, 0.02, 0.004), (sd * 0.14, -0.2, 0.023), 0.002); assign(pk, M_); parent(pk, root)
    for i in range(buttons):
        b = cyl('bouton', 0.011, 0.005, 32, (0.03, -0.1 - i * 0.09, 0.024), (0, 0, 0), 0.002); assign(b, mat('bouton', (0.02, 0.02, 0.02), 0.25, coat=0.8)); parent(b, root)
    if pocket:
        ps = extrude2d('pochette', [(-0.03, 0.0), (0.0, 0.03), (0.03, 0.0), (0.035, -0.012), (-0.035, -0.012)], 0.004, 0.002); ps.location = (-0.15, h - 0.24, 0.026); assign(ps, satin(pocket)); parent(ps, root)
    return root

def pants(m, loc=(0, 0, 0), rot=0.0, short=False):
    L = 0.25 if short else 0.52
    outline = [(-0.2, 0.32), (0.2, 0.32), (0.22, 0.32 - L * 0.4), (0.21 if not short else 0.22, 0.32 - L), (0.03, 0.32 - L), (0.0, 0.12), (-0.03, 0.32 - L), (-0.21 if not short else -0.22, 0.32 - L), (-0.22, 0.32 - L * 0.4)]
    root = empty('pantalon', loc, (0, 0, rot))
    parent(garment('pantalon', outline, 0.018, m, 0.004), root)
    wb = box('ceinture', (0.4, 0.045, 0.006), (0, 0.3, 0.021), 0.003); assign(wb, m); parent(wb, root)
    btn = cyl('rivet', 0.008, 0.004, 24, (0.0, 0.3, 0.025)); assign(btn, M_chrome(0.2, (0.8, 0.65, 0.4))); parent(btn, root)
    return root

def folded(colors, mats=None, loc=(0, 0, 0), rot=0.0, w=0.3, d=0.24, h=0.035):
    root = empty('pile', loc, (0, 0, rot))
    for i, c in enumerate(colors):
        b = box('plie', (w, d, h), (0, 0, h / 2 + i * h * 0.96), 0.014)
        displace(b, 0.002, 0.05, 'CLOUDS', 2); assign(b, (mats[i] if mats else cotton(c))); b.rotation_euler = (0, 0, (i - 1) * 0.04); parent(b, root)
    top = curve_tube('encolure', [(0.06 * math.cos(a), 0.07 + 0.05 * math.sin(a), h * len(colors) + 0.002, 1) for a in [math.pi * i / 14 for i in range(15)]], 0.005, 6); assign(top, cotton(colors[-1])); parent(top, root)
    return root

def dress(m, loc=(0, 0, 0), rot=0.0, long=False):
    L = 0.95 if long else 0.48
    hem = 0.36 if long else 0.24
    outline = [(-0.05, 0.36), (-0.07, 0.28), (-0.13, 0.24), (-0.15, 0.1), (-0.12, -0.02), (-hem, -L + 0.36), (hem, -L + 0.36), (0.12, -0.02), (0.15, 0.1), (0.13, 0.24), (0.07, 0.28), (0.05, 0.36), (0.035, 0.3), (-0.035, 0.3)]
    root = empty('robe', loc, (0, 0, rot))
    parent(garment('robe', outline, 0.014, m, 0.004), root)
    for sd in (-1, 1):
        st = curve_tube('bretelle', [(sd * 0.04, 0.36, 0.016, 1), (sd * 0.08, 0.43, 0.012, 1), (sd * 0.1, 0.27, 0.016, 1)], 0.004, 8); assign(st, m); parent(st, root)
    return root

def sneaker(color=(0.85, 0.85, 0.86), accent=(0.75, 0.08, 0.1), loc=(0, 0, 0), rot=0.0, boot=False):
    root = empty('chaussure', loc, (0, 0, rot))
    sole_pts = [(0.15, 0.0), (0.145, 0.03), (0.12, 0.045), (0.05, 0.048), (-0.05, 0.04), (-0.12, 0.038), (-0.15, 0.025), (-0.155, 0.0), (-0.15, -0.025), (-0.12, -0.037), (-0.05, -0.036), (0.05, -0.044), (0.12, -0.042), (0.145, -0.028)]
    sole = extrude2d('semelle', sole_pts, 0.025, 0.006); sole.location.z = 0.0125; assign(sole, M_plastic((0.92, 0.92, 0.9) if not boot else (0.05, 0.035, 0.025), 0.5, 0.0)); parent(sole, root)
    # tige : sections le long du pied
    bm = bmesh.new(); rows = []; seg = 40
    for i in range(14):
        t = i / 13; x = 0.14 - 0.29 * t
        hw = 0.034 + 0.012 * math.sin(t * math.pi * 0.9); hh = (0.035 + 0.055 * min(1, t * 1.6)) if not boot else (0.035 + 0.06 * min(1, t * 1.6) + (0.11 if t > 0.62 else 0.11 * max(0, (t - 0.45) / 0.17)))
        row = []
        for j in range(seg):
            a = math.pi * j / (seg - 1)
            row.append(bm.verts.new((x, hw * math.cos(a), 0.024 + hh * math.sin(a) ** 0.8)))
        rows.append(row)
    for a_, b_ in zip(rows, rows[1:]):
        for j in range(seg - 1): bm.faces.new((a_[j], a_[j + 1], b_[j + 1], b_[j]))
    up = mesh_obj('tige', bm); solidify(up, 0.004, 0); subsurf(up, 1)
    assign(up, M_leather(color if not boot else (0.09, 0.05, 0.025), 0.45)); parent(up, root)
    if not boot:
        sw = curve_tube('virgule', [(0.06, -0.046, 0.04, 1), (-0.02, -0.05, 0.05, 1), (-0.09, -0.047, 0.06, 1)], 0.006, 12); assign(sw, M_leather(accent)); parent(sw, root)
        for k in range(5):
            x = 0.06 - k * 0.025
            la = curve_tube('lacet', [(x, -0.02, 0.083 + k * 0.004, 1), (x - 0.012, 0.02, 0.085 + k * 0.004, 1)], 0.0025, 4); assign(la, cotton((0.9, 0.9, 0.9))); parent(la, root)
    return root

def cap(color, loc=(0, 0, 0), rot=0.0):
    root = empty('casquette', loc, (0, 0, rot))
    dome = sphere('calotte', 0.095, (0, 0, 0.0), (1.0, 0.93, 0.68)); bm_cut = dome
    for v in dome.data.vertices:
        if v.co.z < 0: v.co.z = 0.0
    assign(dome, cotton(color, weave=900)); parent(dome, root)
    brim = extrude2d('visiere', [(0.06, -0.075), (0.12, -0.06), (0.16, 0.0), (0.12, 0.06), (0.06, 0.075), (0.08, 0.0)], 0.006, 0.003); brim.location = (0.02, 0, 0.004); brim.rotation_euler = (0, -0.12, 0); assign(brim, cotton(tuple(x * 0.8 for x in color))); parent(brim, root)
    btn = sphere('bouton', 0.008, (0, 0, 0.066)); assign(btn, cotton(color)); parent(btn, root)
    return root

def fedora(color, band=(0.02, 0.02, 0.022), loc=(0, 0, 0), rot=0.0):
    root = empty('feutre', loc, (0, 0, rot))
    crown = lathe('calotte', [(0.0, 0.11), (0.05, 0.112), (0.08, 0.1), (0.088, 0.06), (0.09, 0.0), (0.0, 0.0)], 96); crown.scale = (1.0, 0.82, 1.0)
    for v in crown.data.vertices:
        if v.co.z > 0.09: v.co.z -= 0.022 * math.exp(-(v.co.y ** 2) / 0.0008)
    assign(crown, wool(color)); parent(crown, root)
    brim = lathe('bord', [(0.088, 0.004), (0.16, 0.0), (0.172, 0.012), (0.17, 0.016), (0.155, 0.006), (0.088, 0.01)], 96); brim.scale = (1.0, 0.86, 1.0); assign(brim, wool(color)); parent(brim, root)
    bd = lathe('ruban', [(0.0905, 0.008), (0.0915, 0.008), (0.0915, 0.03), (0.0905, 0.03)], 96); bd.scale = (1.0, 0.82, 1.0); assign(bd, satin(band)); parent(bd, root)
    return root

def sunglasses(loc=(0, 0, 0), rot=0.0, frame=(0.015, 0.015, 0.017), lens=(0.02, 0.03, 0.04), aviator=False):
    root = empty('lunettes', loc, (0, 0, rot))
    for sd in (-1, 1):
        cx = sd * 0.036
        pts = [(cx + 0.028 * math.cos(a) * (1.05 if not aviator else 1.0), 0.022 * math.sin(a) * (1 if math.sin(a) > 0 else (1.15 if aviator else 0.95))) for a in [math.tau * i / 40 for i in range(40)]]
        rim = extrude2d('cercle', [(cx + 0.032 * math.cos(a), 0.026 * math.sin(a)) for a in [math.tau * i / 40 for i in range(40)]], 0.006, 0.002); rim.location.z = 0.012
        assign(rim, M_chrome(0.15, (0.8, 0.65, 0.35)) if aviator else mat('monture', frame, 0.3, coat=0.8)); parent(rim, root)
        ln = extrude2d('verre', pts, 0.003, 0.001); ln.location.z = 0.0135; assign(ln, mat('verre', lens, 0.02, coat=1.0, film=380 if aviator else 0)); parent(ln, root)
        tm = box('branche', (0.008, 0.14, 0.005), (sd * 0.07, 0.07, 0.006), 0.002); assign(tm, mat('monture', frame, 0.3, coat=0.8)); parent(tm, root)
    br = curve_tube('pont', [(-0.008, 0.012, 0.013, 1), (0.0, 0.016, 0.013, 1), (0.008, 0.012, 0.013, 1)], 0.0025, 6); assign(br, mat('monture', frame, 0.3)); parent(br, root)
    return root

def watch(loc=(0, 0, 0), rot=0.0):
    root = empty('montre', loc, (0, 0, rot))
    case = cyl('boitier', 0.021, 0.011, 64, (0, 0, 0.012), (0, 0, 0), 0.002); assign(case, M_chrome(0.08, (0.85, 0.7, 0.4))); parent(case, root)
    dial = cyl('cadran', 0.018, 0.002, 64, (0, 0, 0.0185)); assign(dial, mat('cadran', (0.02, 0.03, 0.06), 0.3, metal=0.6)); parent(dial, root)
    for i in range(12):
        a = i / 12 * math.tau; ix = box('index', (0.004, 0.0012, 0.0008), (0.014 * math.cos(a), 0.014 * math.sin(a), 0.0198), 0.0); ix.rotation_euler = (0, 0, a); assign(ix, M_chrome(0.1, (0.9, 0.8, 0.6))); parent(ix, root)
    for (L, a) in ((0.012, 1.0), (0.016, 2.6)):
        hd = box('aiguille', (L, 0.0012, 0.0006), (L / 2 * math.cos(a), L / 2 * math.sin(a), 0.0204), 0.0); hd.rotation_euler = (0, 0, a); assign(hd, M_chrome(0.1)); parent(hd, root)
    glass = cyl('verre', 0.019, 0.0015, 64, (0, 0, 0.0215)); assign(glass, M_glass((1, 1, 1))); parent(glass, root)
    for sd in (-1, 1):
        st = box('bracelet', (0.02, 0.09, 0.004), (0, sd * 0.065, 0.004), 0.002); assign(st, M_leather((0.12, 0.06, 0.03))); parent(st, root)
    return root

def bag(color=(0.12, 0.06, 0.03), loc=(0, 0, 0), rot=0.0):
    root = empty('sac', loc, (0, 0, rot))
    b = box('corps', (0.34, 0.12, 0.22), (0, 0, 0.11), 0.03); assign(b, M_leather(color, 0.42)); parent(b, root)
    hnd = curve_tube('anse', [(-0.1, 0.0, 0.215, 1), (-0.07, 0.0, 0.3, 1), (0.07, 0.0, 0.3, 1), (0.1, 0.0, 0.215, 1)], 0.007, 16); assign(hnd, M_leather(color)); parent(hnd, root)
    zp = box('fermeture', (0.3, 0.008, 0.004), (0, 0.0, 0.222), 0.001); assign(zp, M_chrome(0.15, (0.85, 0.7, 0.4))); parent(zp, root)
    return root

def perfume(loc=(0, 0, 0), liquid=(0.95, 0.6, 0.2)):
    root = empty('parfum', loc)
    bt = box('flacon', (0.07, 0.04, 0.09), (0, 0, 0.045), 0.008); assign(bt, M_glass((0.98, 0.98, 1.0))); parent(bt, root)
    lq = box('liquide', (0.058, 0.028, 0.06), (0, 0, 0.034), 0.006); assign(lq, mat('jus', liquid, 0.0, trans=1.0, ior=1.36)); parent(lq, root)
    cp = cyl('bouchon', 0.016, 0.03, 48, (0, 0, 0.105), (0, 0, 0), 0.003); assign(cp, M_chrome(0.06, (0.85, 0.7, 0.4))); parent(cp, root)
    return root

def cufflinks(loc=(0, 0, 0)):
    root = empty('boutons', loc)
    for k in range(2):
        c = cyl('tete', 0.009, 0.004, 48, (k * 0.035, 0, 0.012), (0, 0, 0), 0.0012); assign(c, M_chrome(0.06, (0.85, 0.7, 0.4))); parent(c, root)
        st = cyl('tige', 0.0018, 0.012, 16, (k * 0.035, 0, 0.005)); assign(st, M_chrome(0.1)); parent(st, root)
        ins = cyl('pierre', 0.006, 0.0015, 48, (k * 0.035, 0, 0.0145)); assign(ins, mat('onyx', (0.005, 0.005, 0.006), 0.05, coat=1.0)); parent(ins, root)
    return root

def bandana(loc=(0, 0, 0), rot=0.0):
    pts = [(-0.32, 0.12), (0.32, 0.12), (0.0, -0.26)]
    ob = extrude2d('bandana', pts, 0.006, 0.0)
    rm = ob.modifiers.new('remesh', 'REMESH'); rm.mode = 'SMOOTH'; rm.octree_depth = 7
    displace(ob, 0.008, 0.05, 'CLOUDS', 3, 0.5, 'GLOBAL'); subsurf(ob, 1)
    ob.location = (loc[0], loc[1], 0.006); ob.rotation_euler = (0, 0, rot)
    def fn(nt, p):
        tc = nt.nodes.new('ShaderNodeTexCoord'); mp = nt.nodes.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (2.2, 2.2, 1); nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(os.path.join(TEX, 'paisley.png'), check_existing=True); nt.links.new(mp.outputs['Vector'], it.inputs['Vector'])
        nt.links.new(it.outputs['Color'], p.inputs['Base Color'])
    assign(ob, mat('bandana', (0.6, 0.05, 0.06), 0.85, sheen=0.6, base_fn=fn, bump={'scale': 1400, 'strength': 0.1}))
    for sd in (-1, 1):
        k = curve_tube('noeud', [(loc[0] + sd * 0.3, loc[1] + 0.12, 0.012, 1), (loc[0] + sd * 0.38, loc[1] + 0.2, 0.01, 1), (loc[0] + sd * 0.42, loc[1] + 0.26, 0.008, 0.6)], 0.012, 8); assign(k, ob.data.materials[0])
    return ob

def gloves(loc=(0, 0, 0), rot=0.0, color=(0.015, 0.015, 0.016)):
    root = empty('gants', loc, (0, 0, rot))
    for k, (dx, dr) in enumerate(((0.0, 0.0), (0.06, 0.25))):
        palm = extrude2d('paume', [(-0.045, -0.06), (0.045, -0.06), (0.05, 0.04), (-0.05, 0.04)], 0.016, 0.006); palm.location = (dx, 0, 0.009); palm.rotation_euler = (0, 0, dr); assign(palm, M_leather(color, 0.5)); parent(palm, root)
        for f in range(4):
            fg = curve_tube('doigt', [(dx - 0.036 + f * 0.024, 0.04, 0.009, 1), (dx - 0.038 + f * 0.025, 0.1 - abs(f - 1.5) * 0.01, 0.009, 0.85)], 0.0095, 8); fg.rotation_euler = (0, 0, dr); assign(fg, M_leather(color, 0.5)); parent(fg, root)
    return root

def mask_on_head():
    """masque de caoutchouc (diable) posé sur une tête de mannequin, de face"""
    H.barber(); root, head = H.bust(1, (0.02, 0.02, 0.022))
    bm = bmesh.new(); seg, rings = 96, 64; grid = []
    for j in range(rings + 1):
        th = math.pi * (0.08 + 0.86 * j / rings); row = []
        for i in range(seg + 1):
            ph = -math.pi * 0.55 + math.pi * 1.1 * i / seg
            d = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
            r = H.head_radius((d.x, d.y, d.z)) + 0.008
            # traits exagérés du masque : arcades, pommettes, rictus
            r += 0.012 * math.exp(-((d.z - 0.32) ** 2) / 0.004) * math.exp(-((abs(d.y) - 0.35) ** 2) / 0.02) * max(0, d.x)
            r += 0.01 * math.exp(-((d.z + 0.08) ** 2) / 0.006) * math.exp(-((abs(d.y) - 0.5) ** 2) / 0.02) * max(0, d.x)
            row.append(bm.verts.new(d * r))
        grid.append(row)
    for a_, b_ in zip(grid, grid[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
    mk = mesh_obj('masque', bm); solidify(mk, 0.004, 0); subsurf(mk, 1)
    assign(mk, mat('latex', (0.32, 0.03, 0.05), 0.35, coat=0.5, coat_rough=0.25, sss=0.2, sss_radius=(1, 0.3, 0.2), sss_scale=0.004, bump={'scale': 300, 'strength': 0.15}))
    for sd in (-1, 1):
        hn = curve_tube('corne', [(0.02, sd * 0.045, 0.105, 1.0), (0.03, sd * 0.07, 0.14, 0.7), (0.0, sd * 0.085, 0.175, 0.35), (-0.025, sd * 0.08, 0.19, 0.05)], 0.016, 16)
        assign(hn, mat('corne', (0.08, 0.06, 0.05), 0.35, coat=0.4));
        eye = sphere('oeil', 0.013, (0.084, sd * 0.033, 0.016), (0.6, 1.2, 0.7)); assign(eye, mat('creux', (0.0, 0.0, 0.0), 0.9))
    mouth = sphere('bouche', 0.03, (0.093, 0.0, -0.058), (0.3, 1.2, 0.35)); assign(mouth, mat('creux', (0.0, 0.0, 0.0), 0.9))
    for i in range(8):
        tth = cyl('dent', 0.0035, 0.008, 12, (0.102, -0.021 + i * 0.006, -0.054), (0, 0, 0)); assign(tth, mat('dent', (0.85, 0.8, 0.65), 0.3))
    cam((0.95, -0.45, 0.05), (0.02, 0.0, 0.0), 85, 5.6)

def rack():
    """portant chromé chargé de chemises sur cintres"""
    world_color((0.003, 0.003, 0.004), 1.0)
    floor_ = box('sol', (6, 6, 0.04), (0, 0, -0.02)); assign(floor_, mat('beton', (0.03, 0.03, 0.033), 0.4, coat=0.5, coat_rough=0.1))
    wall = box('mur', (6, 0.05, 3), (0, 1.2, 1.4)); assign(wall, mat('mur', (0.02, 0.018, 0.022), 0.8))
    ch = M_chrome(0.08)
    bar = cyl('barre', 0.014, 1.5, 32, (0, 0, 1.55), (0, math.pi / 2, 0)); assign(bar, ch)
    for sd in (-1, 1):
        post = cyl('montant', 0.014, 1.55, 32, (sd * 0.75, 0, 0.775)); assign(post, ch)
        ft = cyl('pied', 0.014, 0.5, 32, (sd * 0.75, 0, 0.02), (math.pi / 2, 0, 0)); assign(ft, ch)
    cols = [(0.62, 0.62, 0.6), (0.05, 0.25, 0.22), (0.5, 0.12, 0.2), (0.03, 0.03, 0.035), (0.75, 0.55, 0.3), (0.1, 0.12, 0.3), (0.85, 0.75, 0.6), (0.3, 0.06, 0.05), (0.06, 0.4, 0.45), (0.4, 0.4, 0.42)]
    for i, c in enumerate(cols):
        x = -0.62 + i * 0.135
        hg = curve_tube('crochet', [(x, 0.0, 1.55, 1), (x, 0.01, 1.58, 1), (x, 0.0, 1.6, 1), (x, -0.012, 1.585, 1)], 0.003, 8); assign(hg, ch)
        sh = curve_tube('epaules', [(x, -0.2, 1.47, 1), (x, 0.0, 1.53, 1), (x, 0.2, 1.47, 1)], 0.006, 8); assign(sh, mat('cintre', (0.18, 0.09, 0.04), 0.4))
        shirt = garment('chemise', [(y * 1.0, z) for y, z in [(0.0, 0.0), (0.06, 0.01), (0.2, -0.03), (0.23, -0.25), (0.21, -0.75), (-0.21, -0.75), (-0.23, -0.25), (-0.2, -0.03), (-0.06, 0.01)]], 0.03, cotton(c), 0.012, i)
        shirt.rotation_euler = (math.pi / 2, 0, math.pi / 2); shirt.location = (x + 0.01 * (i % 2), 0.0, 1.53)
    area('spot', (0.6, -1.4, 2.6), (0, 0, 1.2), 1.2, 180, (1.0, 0.92, 0.85))
    area('rose', (-1.6, 0.5, 1.4), (0, 0, 1.2), 0.8, 60, (1.0, 0.2, 0.55))
    area('cyan', (1.6, 0.6, 1.4), (0, 0, 1.2), 0.8, 60, (0.2, 0.8, 1.0))
    neon('neon', [(-1.4, 1.15, 2.2), (1.4, 1.15, 2.2)], (1.0, 0.3, 0.6), 14, 0.015)
    cam((1.4, -1.9, 1.35), (0.0, 0.0, 1.15), 45, 5.6)

# ------------------------------------------------------------------ registre
def F(fn, cam_=None):
    def b():
        flatlay(); fn(); (cam_ or (lambda: top_cam()))()
    return b

ITEMS = {
    'milliers-de-tenues': rack,
    'tenues-gagnees-en-mission': F(lambda: (jacket((0.02, 0.022, 0.025), (0.0, 0.08, 0), -0.05, None, 3), gloves((0.42, -0.3, 0), 0.4), cap((-0.42, -0.32, 0), (0.02, 0.02, 0.022), 0.5), sunglasses((0.38, 0.32, 0), -0.3))),
    'vice-city-style-tenues': F(lambda: tee((0.92, 0.88, 0.8), 'print-sunset.png', (0, 0, 0), 0.06), lambda: top_cam((0, 0.02, 0), 1.45)),
    'goodtime-gear': F(lambda: tee((0.85, 0.66, 0.08), 'print-gator.png', (0, 0, 0), -0.05), lambda: top_cam((0, 0.02, 0), 1.45)),
    'jason-costume-lin-pastel': F(lambda: jacket((0.92, 0.66, 0.68), (0, 0, 0), 0.05, None, 2, linen((0.92, 0.66, 0.68)), (0.6, 0.85, 0.75)), lambda: top_cam((0, 0, 0), 1.55)),
    'lucia-mini-robe-sequins': F(lambda: dress(sequins((0.62, 0.02, 0.04)), (0, 0.05, 0), 0.05), lambda: top_cam((0, 0.05, 0), 1.35)),
    'lucia-tenue-de-soiree': F(lambda: dress(satin((0.03, 0.02, 0.06)), (0, 0.2, 0), 0.03, True), lambda: top_cam((0, -0.05, 0), 2.0)),
    'bandana-de-braquage': F(lambda: (bandana((0, 0.02, 0), 0.1), gloves((0.33, -0.28, 0), -0.5))),
    'gta5-hauts': F(lambda: (folded([(0.05, 0.12, 0.25), (0.62, 0.62, 0.6), (0.45, 0.06, 0.08)], None, (-0.18, 0.0, 0), 0.08), tee((0.04, 0.04, 0.045), None, (0.32, 0.05, 0), -0.25, 0.75))),
    'gta5-pantalons': F(lambda: (pants(denim(), (-0.2, 0.0, 0), 0.05), pants(cotton((0.55, 0.45, 0.3)), (0.32, 0.05, 0), -0.1, True))),
    'gta5-chaussures': F(lambda: (sneaker((0.88, 0.88, 0.88), (0.8, 0.08, 0.1), (-0.12, 0.05, 0), 0.4), sneaker((0.88, 0.88, 0.88), (0.8, 0.08, 0.1), (-0.02, -0.12, 0), 0.25), sneaker((0.1, 0.05, 0.025), None, (0.28, 0.08, 0), -0.3, True)), lambda: top_cam((0.06, 0, 0.04), 1.0, 40, -20, 60, 5.6)),
    'gta5-tenues-completes': F(lambda: (tee((0.04, 0.2, 0.18), None, (0, 0.3, 0), 0.0, 0.8), pants(denim(), (0, -0.15, 0), 0.0), sneaker((0.88, 0.88, 0.88), (0.05, 0.4, 0.4), (0.35, -0.42, 0), 0.6), cap((-0.36, 0.4, 0), (0.85, 0.82, 0.75), -0.6)), lambda: top_cam((0, 0.0, 0), 2.1)),
    'gta5-costumes-ponsonbys': F(lambda: (jacket((0.015, 0.015, 0.018), (0, 0, 0), 0.0, (0.01, 0.01, 0.012), 1, None, (0.9, 0.9, 0.92)), curve_tube('cravate', [(0.0, 0.33, 0.03, 1), (0.0, 0.1, 0.03, 1.2), (0.01, -0.12, 0.03, 1.5)], 0.016, 8) and None), lambda: top_cam((0, 0, 0), 1.55)),
    'gta5-chapeaux': F(lambda: (cap((0.75, 0.08, 0.1), (-0.17, 0.0, 0), 0.6), fedora((0.08, 0.07, 0.065), (0.02, 0.02, 0.022), (0.2, 0.02, 0), 0.0)), lambda: top_cam((0.0, 0.0, 0.03), 1.0, 38, -18, 60, 6.3)),
    'gta5-lunettes': F(lambda: (sunglasses((-0.1, 0.0, 0), 0.25), sunglasses((0.12, 0.02, 0), -0.2, (0.6, 0.45, 0.25), (0.15, 0.08, 0.04), True)), lambda: top_cam((0.0, 0.03, 0.0), 0.75, 30, -10, 70, 5.6)),
    'gta5-accessoires': F(lambda: (bag((0.12, 0.06, 0.03), (-0.12, 0.08, 0), 0.15), watch((0.22, -0.1, 0), 0.4)), lambda: top_cam((0.03, 0.0, 0.05), 1.15, 40, -15, 60, 5.6)),
    'gta5-masques-vespucci': mask_on_head,
    'gta5-boutons-cologne-parfum': F(lambda: (perfume((-0.05, 0.03, 0), (0.95, 0.55, 0.15)), cufflinks((0.08, -0.06, 0))), lambda: top_cam((0.0, 0.0, 0.04), 0.6, 40, -15, 85, 4.5)),
}
