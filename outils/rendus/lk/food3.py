# Consommables, retouches v7.77 : reprend lk.food2 et refait les éléments les moins crédibles (café, shaker, récupération,
# salade, trousses, gilets en toile nylon scannée, boîte de soins à l'endroit).
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
from .core import *
from .core import _nodes
from . import assets as A
from . import food2 as F2
from .food2 import set_scene, shot, HD2K

ITEMS = dict(F2.ITEMS)


def M_nylon(color, scale=14.0, name='nylon'):
    """toile nylon tissée (texture scannée Poly Haven « rough_linen », désaturée puis teintée) : grain de cordura"""
    m = A.pbr('rough_linen', scale, res='1k', coords='Object', sat=0.0, val=1.0, tint=tuple(min(1.0, c * 1.9) for c in color), rough_mul=0.9, rough_add=0.05,
              normal_k=1.6, sheen=0.12, spec=0.3, name=name)
    return m


def renylon(root, color, scale=14.0):
    """remplace la matière « cordura » procédurale d'un objet construit par food2 par la toile scannée"""
    M = M_nylon(color, scale)
    for o in [root] + list(root.children_recursive):
        if o.type in ('MESH', 'CURVE') and o.data.materials:
            for i, m in enumerate(o.data.materials):
                if m and m.name.startswith('cordura'): o.data.materials[i] = M
    return M


# ------------------------------------------------------------------ café du matin
def coffee_beans(n=14, loc=(0, 0, 0), seed=3, spread=0.06):
    R = random.Random(seed); root = empty('grains', loc)
    M = mat('grain', (0.12, 0.05, 0.02), 0.35, coat=0.6, coat_rough=0.2, bump={'scale': 900, 'strength': 0.15})
    for i in range(n):
        g = sphere('grain', 0.0062, (R.uniform(-spread, spread), R.uniform(-spread * 0.6, spread * 0.6), 0.003), (1.25, 0.95, 0.62), 20, 10)
        g.rotation_euler = (R.uniform(-0.3, 0.3), R.uniform(-0.3, 0.3), R.uniform(0, 3.14))
        cut = box('sillon', (0.02, 0.0012, 0.004), (g.location.x, g.location.y, g.location.z + 0.0039)); cut.rotation_euler = (0, 0, g.rotation_euler.z)
        boolean_cut(g, [cut]); assign(g, M); parent(g, root)
    return root


def it_coffee():
    def build():
        set_scene('comfy_cafe', 0.6, 0.7, rot=120, surface='wood', expo=-0.25, key=(-0.45, -0.25, 0.55), key_w=6, warm=(1.0, 0.88, 0.74),
                  rim=((1.0, 0.82, 0.6), (0.8, 0.9, 1.0)), rim_w=(2.5, 1.5))
        sc = lathe('soucoupe', [(0.0, 0.0), (0.05, 0.0), (0.054, 0.004), (0.075, 0.012), (0.078, 0.014), (0.075, 0.016), (0.052, 0.008), (0.0, 0.007)], 128)
        assign(sc, mat('porcelaine', (0.88, 0.85, 0.79), 0.1, coat=0.9, coat_rough=0.03, sss=0.15))
        F2.mug((0, 0, 0.007), 0.6)
        sp = box('cuillere', (0.1, 0.009, 0.0018), (0.035, -0.06, 0.015), 0.0008); sp.rotation_euler = (0, math.radians(-6), 0.35); assign(sp, M_chrome(0.12))
        bowl = sphere('cuilleron', 0.012, (-0.012, -0.075, 0.017), (1.4, 1.0, 0.3), 24, 12); assign(bowl, M_chrome(0.12))
        coffee_beans(16, (0.13, 0.03, 0.0), 5, 0.05)
        shot((0.01, 0.0, 0.05), 0.46, 0.27, -28, 70, 3.2)
    return build


# ------------------------------------------------------------------ shake protéiné
def shaker2(loc=(0, 0, 0)):
    root = empty('shaker', loc)
    body = lathe('gobelet', [(0.0, 0.0), (0.04, 0.0), (0.042, 0.004), (0.047, 0.175), (0.0, 0.175)], 96)
    solidify(body, 0.0022, -1); assign(body, mat('tritan', (0.95, 0.97, 0.98), 0.06, trans=1.0, ior=1.5)); parent(body, root)
    sh = lathe('shake', [(0.0, 0.0025), (0.0395, 0.0025), (0.043, 0.12), (0.0, 0.12)], 64)
    assign(sh, mat('shake', (0.16, 0.08, 0.04), 0.3, sss=0.5, sss_radius=(1, 0.6, 0.4), sss_scale=0.008)); parent(sh, root)
    fm = lathe('mousse', [(0.0, 0.12), (0.0432, 0.12), (0.0434, 0.128), (0.0, 0.131)], 64); displace(fm, 0.0008, 0.004, 'CLOUDS', 2)
    assign(fm, mat('mousse', (0.4, 0.27, 0.16), 0.7, sss=0.5)); parent(fm, root)
    for i in range(7):
        g = box('graduation', (0.0006, 0.014 if i % 2 == 0 else 0.008, 0.0007), (0.0472, 0.0, 0.035 + i * 0.018)); assign(g, mat('trait', (0.9, 0.9, 0.9), 0.4)); parent(g, root)
    lid = lathe('couvercle', [(0.0, 0.175), (0.05, 0.175), (0.051, 0.207), (0.044, 0.212), (0.0, 0.212)], 96); assign(lid, M_plastic((0.012, 0.012, 0.014), 0.32)); parent(lid, root)
    sp = cyl('bec', 0.013, 0.014, 32, (0.022, 0, 0.219), (0, 0, 0), 0.003); assign(sp, M_plastic((0.012, 0.012, 0.014), 0.32)); parent(sp, root)
    cap = box('clapet', (0.03, 0.026, 0.006), (0.004, 0, 0.215), 0.003); assign(cap, M_plastic((0.75, 0.2, 0.05), 0.35)); parent(cap, root)
    loop = curve_tube('anneau', [(-0.045, 0.0, 0.205, 1), (-0.07, 0.0, 0.21, 1), (-0.075, 0.0, 0.19, 1), (-0.05, 0.0, 0.185, 1)], 0.004, 12); assign(loop, M_plastic((0.012, 0.012, 0.014), 0.32)); parent(loop, root)
    return root


def protein_tub(loc=(0, 0, 0), rot=0.0):
    root = empty('pot', loc, (0, 0, rot))
    def lab(nt, p):
        X, Y, Z, _ = obj_xyz(nt)
        band = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', Z, 0.05), math_node(nt, 'LESS_THAN', Z, 0.13))
        stripe = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', Z, 0.112), math_node(nt, 'LESS_THAN', Z, 0.12))
        c = mix(nt, (0.02, 0.02, 0.022), (0.92, 0.9, 0.86), band); c = mix(nt, c, (0.85, 0.45, 0.05), stripe)
        nt.links.new(c, p.inputs['Base Color'])
    b = lathe('pot', [(0.0, 0.0), (0.072, 0.0), (0.075, 0.006), (0.075, 0.17), (0.0, 0.17)], 96); assign(b, mat('pot', (0.02, 0.02, 0.022), 0.3, coat=0.6, coat_rough=0.12, base_fn=lab)); parent(b, root)
    lid = lathe('couvercle', [(0.0, 0.17), (0.077, 0.17), (0.078, 0.195), (0.0, 0.196)], 96); assign(lid, M_plastic((0.02, 0.02, 0.022), 0.35)); parent(lid, root)
    return root


def obj_xyz(nt):
    tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
    return sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z'], tc


def it_shake():
    def build():
        set_scene('gym_01', 0.55, 0.65, rot=60, surface='rubber', expo=-0.15, key=(-0.4, -0.45, 0.55), key_w=9, warm=(1.0, 0.92, 0.84), rim=((1.0, 0.7, 0.45), (0.7, 0.85, 1.0)), rim_w=(4, 3))
        shaker2((0, 0.0, 0)); protein_tub((-0.15, 0.12, 0), 0.5); F2.scoop_powder((0.1, -0.06, 0.0), -0.6)
        shot((-0.02, 0.03, 0.1), 0.72, 0.16, -20, 60, 4.0)
    return build


# ------------------------------------------------------------------ récupération automatique (repos, soins légers)
def crepe_bandage(loc=(0, 0, 0), rot=0.0):
    root = empty('bande_crepe', loc, (0, 0, rot))
    def cr(nt, p):
        X, Y, Z, _ = obj_xyz(nt)
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.6; b.inputs['Distance'].default_value = 0.0008
        w = math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', X, 1400.0))
        nt.links.new(w, b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    M = mat('crepe', (0.83, 0.72, 0.58), 0.92, sheen=0.6, base_fn=cr)
    r_ = K_lathe_x('rouleau', [(0.0, -0.038), (0.031, -0.038), (0.033, -0.036), (0.033, 0.036), (0.031, 0.038), (0.0, 0.038)], 64); r_.location = (0, 0, 0.033); assign(r_, M); parent(r_, root)
    tail_ = grid('bout', 0.2, 0.076, 60, 12); tail_.location = (0.0, -0.11, 0.0015); tail_.rotation_euler = (0, 0, math.pi / 2)
    for v in tail_.data.vertices: v.co.z += 0.0012 * math.sin(v.co.x * 90)
    assign(tail_, M); parent(tail_, root)
    clip = box('agrafe', (0.012, 0.03, 0.002), (0.0, -0.205, 0.003), 0.001); assign(clip, M_chrome(0.3)); parent(clip, root)
    return root


def K_lathe_x(name, prof, seg=64):
    ob = lathe(name, prof, seg); ob.rotation_euler = (0, math.pi / 2, 0); return ob


def towel(loc=(0, 0, 0), rot=0.0, color=(0.75, 0.78, 0.8)):
    root = empty('serviette', loc, (0, 0, rot))
    M = A.pbr('terry_cloth', 9.0, res='1k', coords='Object', sat=0.0, tint=tuple(min(1, c * 1.2) for c in color), normal_k=1.4, sheen=0.5) if os.path.isdir(A.ROOT + '/tex/terry_cloth_1k') else mat('eponge', color, 0.95, sheen=0.7, bump={'scale': 900, 'strength': 0.5})
    for k in range(3):
        b = box('pli', (0.24, 0.16, 0.014), (0, 0, 0.007 + k * 0.014), 0.007); subsurf(b, 1); displace(b, 0.0012, 0.03, 'CLOUDS', 2); assign(b, M); parent(b, root)
    return root


def sports_bottle(loc=(0, 0, 0), rot=(0, 0, 0), liquid=(0.15, 0.55, 0.85)):
    root = empty('gourde', loc, rot)
    prof = [(0.0, 0.0), (0.032, 0.0), (0.035, 0.008), (0.035, 0.07), (0.03, 0.09), (0.035, 0.11), (0.035, 0.17), (0.03, 0.19), (0.0, 0.19)]
    b = lathe('pet', prof, 96); solidify(b, 0.0012, -1); assign(b, mat('pet', (0.97, 0.98, 1.0), 0.03, trans=1.0, ior=1.45)); parent(b, root)
    w = lathe('boisson', [(0.0, 0.003), (0.0335, 0.003), (0.0335, 0.068), (0.029, 0.09), (0.0335, 0.11), (0.0335, 0.15), (0.0, 0.15)], 64)
    assign(w, mat('boisson', liquid, 0.0, trans=1.0, ior=1.34)); parent(w, root)
    lb = lathe('etiquette', [(0.0357, 0.115), (0.0357, 0.165)], 96)
    def lfn(nt, p):
        X, Y, Z, _ = obj_xyz(nt)
        stripe = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', Z, 0.135), math_node(nt, 'LESS_THAN', Z, 0.148))
        nt.links.new(mix(nt, (0.92, 0.92, 0.9), (0.9, 0.35, 0.05), stripe), p.inputs['Base Color'])
    assign(lb, mat('etiquette', (0.92, 0.92, 0.9), 0.45, base_fn=lfn)); parent(lb, root)
    cap = lathe('bouchon_sport', [(0.0, 0.19), (0.022, 0.19), (0.022, 0.205), (0.011, 0.21), (0.009, 0.228), (0.0, 0.228)], 48); assign(cap, M_plastic((0.95, 0.4, 0.05), 0.3)); parent(cap, root)
    return root


def it_regen():
    def build():
        set_scene('hotel_room', 0.7, 0.75, rot=40, surface='wood', expo=-0.15, key=(-0.45, -0.3, 0.6), key_w=7, warm=(1.0, 0.92, 0.82), rim=((1.0, 0.85, 0.65), (0.75, 0.85, 1.0)), rim_w=(2.5, 2.0))
        towel((0.05, 0.1, 0.0), 0.25)
        sports_bottle((-0.15, 0.06, 0.0))
        crepe_bandage((0.07, -0.05, 0.0), 0.5)
        F2.plasters(3, (-0.07, -0.1, 0.0), 4)
        shot((-0.01, 0.0, 0.05), 0.62, 0.3, -18, 60, 4.5)
    return build


# ------------------------------------------------------------------ salade
def tomato_half(loc=(0, 0, 0), rot=(0, 0, 0), r=0.012):
    root = empty('tomate', loc, rot)
    s = sphere('tomate', r, (0, 0, 0), (1, 1, 0.92), 32, 16)
    cut = box('c', (0.05, 0.05, 0.05), (0, 0, 0.025)); boolean_cut(s, [cut])
    def tfn(nt, p):
        X, Y, Z, _ = obj_xyz(nt)
        rr = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', X, X), math_node(nt, 'MULTIPLY', Y, Y)))
        top = math_node(nt, 'GREATER_THAN', Z, -0.0015)
        ang = math_node(nt, 'ARCTAN2', Y, X)
        loc_ = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', ang, 3.0)), 0.2), math_node(nt, 'LESS_THAN', rr, r * 0.68))
        gel = math_node(nt, 'MULTIPLY', loc_, math_node(nt, 'GREATER_THAN', rr, r * 0.25))
        inner = mix(nt, (0.85, 0.12, 0.06), (0.95, 0.55, 0.25), gel)
        nt.links.new(mix(nt, (0.7, 0.04, 0.02), inner, top), p.inputs['Base Color'])
        nt.links.new(mix(nt, (0.0, 0.0, 0.0), (1.0, 1.0, 1.0), math_node(nt, 'MULTIPLY', top, 0.6)), p.inputs['Subsurface Weight'])
    assign(s, mat('tomate', (0.7, 0.04, 0.02), 0.12, coat=0.9, coat_rough=0.05, sss=0.4, sss_radius=(1, 0.3, 0.2), sss_scale=0.004, base_fn=tfn)); parent(s, root)
    return root


def cucumber(loc=(0, 0, 0), rot=(0, 0, 0), r=0.014):
    c = cyl('concombre', r, 0.004, 40, loc, rot, 0.0008)
    def cfn(nt, p):
        X, Y, Z, _ = obj_xyz(nt)
        rr = math_node(nt, 'DIVIDE', math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', X, X), math_node(nt, 'MULTIPLY', Y, Y))), r)
        ang = math_node(nt, 'ARCTAN2', Y, X)
        seeds = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', ang, 9.0)), 0.6), math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', rr, 0.25), math_node(nt, 'LESS_THAN', rr, 0.48)))
        c = ramp(nt, rr, [(0.0, (0.72, 0.8, 0.52)), (0.5, (0.78, 0.86, 0.6)), (0.86, (0.6, 0.76, 0.38)), (0.92, (0.06, 0.22, 0.04)), (1.0, (0.04, 0.15, 0.03))])
        nt.links.new(mix(nt, c, (0.88, 0.9, 0.75), seeds), p.inputs['Base Color'])
    assign(c, mat('concombre', (0.7, 0.8, 0.5), 0.2, sss=0.6, sss_radius=(0.6, 1, 0.5), sss_scale=0.004, coat=0.7, coat_rough=0.05, base_fn=cfn))
    return c


def salad2(loc=(0, 0, 0)):
    root = empty('salade', loc)
    bw = lathe('bol', [(0.0, 0.0), (0.05, 0.0), (0.052, 0.004), (0.1, 0.05), (0.104, 0.062), (0.1, 0.064), (0.096, 0.055), (0.048, 0.008), (0.0, 0.008)], 128)
    assign(bw, mat('gres_blanc', (0.88, 0.86, 0.82), 0.15, coat=0.8, coat_rough=0.05, bump={'scale': 300, 'strength': 0.04})); parent(bw, root)
    R = random.Random(6)
    for k in range(12):
        a = k / 12 * math.tau + R.uniform(-0.3, 0.3)
        pc = F2.leaf_piece(0.075, 0.055, 40 + k, droop=0.006); pc.location = (math.cos(a) * 0.025, math.sin(a) * 0.025, 0.02 + (k % 4) * 0.008)
        pc.rotation_euler = (R.uniform(-0.6, 0.6), R.uniform(-0.5, 0.5), a); parent(pc, root)
    for k in range(5):
        a = R.uniform(0, math.tau); rr = R.uniform(0.0, 0.05)
        th = tomato_half((math.cos(a) * rr, math.sin(a) * rr, 0.055 + R.uniform(0, 0.008)), (R.uniform(-0.5, 0.5), R.uniform(-0.5, 0.5), R.uniform(0, 3))); parent(th, root)
    for k in range(6):
        a = R.uniform(0, math.tau); rr = R.uniform(0.01, 0.06)
        cu = cucumber((math.cos(a) * rr, math.sin(a) * rr, 0.058), (R.uniform(-0.5, 0.5), R.uniform(-0.5, 0.5), 0)); parent(cu, root)
    for k in range(7):
        a = R.uniform(0, math.tau); rr = R.uniform(0.0, 0.05)
        cr = box('crouton', (0.013, 0.012, 0.011), (math.cos(a) * rr, math.sin(a) * rr, 0.06), 0.0025); cr.rotation_euler = (R.random(), R.random(), R.random()); displace(cr, 0.0012, 0.004, 'CLOUDS', 2)
        def kfn(nt, p):
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 300, 6, 0.6)
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (0.55, 0.32, 0.1)), (0.6, (0.82, 0.6, 0.3)), (0.8, (0.92, 0.78, 0.5))]), p.inputs['Base Color'])
        assign(cr, mat('crouton', (0.72, 0.48, 0.2), 0.7, base_fn=kfn, bump={'scale': 500, 'strength': 0.6})); parent(cr, root)
    for k in range(6):
        sh = box('copeau', (0.018, 0.009, 0.0008), (R.uniform(-0.04, 0.04), R.uniform(-0.04, 0.04), 0.067), 0.0004); sh.rotation_euler = (R.uniform(-0.5, 0.5), R.uniform(-0.4, 0.4), R.random() * 3)
        assign(sh, mat('parmesan', (0.9, 0.8, 0.55), 0.5, sss=0.4, sss_radius=(1, 0.9, 0.6), sss_scale=0.002)); parent(sh, root)
    return root


def it_salad():
    def build():
        set_scene('warm_restaurant_night', 0.5, 0.6, rot=60, surface='wood', expo=-0.25, **F2.WARM_RIMS)
        salad2((0, 0, 0))
        fk = box('fourchette', (0.17, 0.016, 0.003), (0.15, -0.06, 0.0015), 0.0012); fk.rotation_euler = (0, 0, math.radians(70)); assign(fk, M_chrome(0.12))
        sc = lathe('pot', [(0.0, 0.0), (0.024, 0.0), (0.026, 0.028), (0.0, 0.028)], 48); sc.location = (-0.15, -0.02, 0); assign(sc, mat('verre', (1, 1, 1), 0.02, trans=1.0, ior=1.5))
        sv = lathe('vinaigrette', [(0.0, 0.002), (0.023, 0.002), (0.024, 0.018), (0.0, 0.018)], 48); sv.location = (-0.15, -0.02, 0)
        assign(sv, mat('vinaigrette', (0.85, 0.62, 0.2), 0.05, trans=0.7, ior=1.47, sss=0.3))
        shot((0.0, 0.0, 0.05), 0.55, 0.3, -18, 65, 4.0)
    return build


# ------------------------------------------------------------------ gilets (toile nylon scannée) et trousses
def it_vest(level):
    base = F2.it_vest(level)
    def build():
        base()
        for o in list(bpy.data.objects):
            if o.name.startswith('gilet_porte'):
                renylon(o, F2.VEST[level], 16.0)
    return build


def it_ifak():
    def build():
        set_scene('gear_store', 0.5, 0.55, rot=0, surface='wood', expo=-0.25, rim=((0.6, 0.8, 1.0), (1.0, 0.85, 0.7)), rim_w=(2.5, 2.0))
        r = F2.ifak((0, 0, 0), 0.25)
        renylon(r, (0.45, 0.04, 0.03), 18.0)
        shot((0.0, 0.05, 0.03), 0.6, 0.32, -15, 60, 4.5)
    return build


def it_medbox():
    def build():
        set_scene('cobblestone_street_night', 0.7, 0.8, rot=150, surface='asphalt', expo=-0.2, key=(0.4, -0.2, 1.5), key_w=12, warm=(1.0, 0.75, 0.45),
                  rim=((1.0, 0.6, 0.3), (0.4, 0.6, 1.0)), rim_w=(4, 3))
        r, obs = A.model('medical_box'); r.rotation_euler = (0, 0, math.radians(155))
        shot((0.0, 0.0, 0.04), 1.1, 0.35, -15, 50, 4.0)
    return build


ITEMS.update({
    'cafe-du-matin': it_coffee(),
    'shake-proteine': it_shake(),
    'recuperation-automatique': it_regen(),
    'menu-salade': it_salad(),
    'kit-de-soin-ramasse': it_medbox(),
    'kit-de-soin-gta6': it_ifak(),
    **{k: it_vest(l) for k, l in (('gilet-super-leger', 1), ('gilet-leger', 2), ('gilet-standard', 3), ('gilet-lourd', 4), ('gilet-super-lourd', 5), ('gilet-gta6', 6))},
})


# ------------------------------------------------------------------ trousse individuelle (IFAK) : pochette et contenu étalé
def ifak_layout(loc=(0, 0, 0)):
    root = empty('ifak', loc)
    Mn = M_nylon((0.05, 0.06, 0.035), 18.0, 'nylon_trousse')
    po = box('pochette', (0.17, 0.11, 0.06), (-0.12, 0.08, 0.03), 0.02); subsurf(po, 2); displace(po, 0.0015, 0.04, 'CLOUDS', 2); assign(po, Mn); parent(po, root)
    zp = curve_tube('fermeture', [(-0.205, 0.08 + 0.055 * math.sin(a), 0.045 + 0.005 * math.cos(a), 1) for a in [-1.2 + 2.4 * k / 10 for k in range(11)]], 0.0025, 6, kind='POLY')
    zp.scale = (1, 1, 1); assign(zp, M_plastic((0.01, 0.01, 0.012), 0.3)); parent(zp, root)
    cross_bg = box('ecusson', (0.06, 0.06, 0.003), (-0.12, 0.08, 0.0615), 0.006); assign(cross_bg, mat('ecusson', (0.55, 0.03, 0.03), 0.8, bump={'scale': 2000, 'strength': 0.4})); parent(cross_bg, root)
    for (sx, sy) in ((0.036, 0.012), (0.012, 0.036)):
        c = box('croix', (sx, sy, 0.002), (-0.12, 0.08, 0.0635), 0.0008); assign(c, mat('blanc', (0.9, 0.9, 0.88), 0.8)); parent(c, root)
    for k in range(2):
        tab = box('tirette', (0.014, 0.008, 0.003), (-0.205, 0.04 + k * 0.08, 0.045), 0.001); assign(tab, M_plastic((0.6, 0.05, 0.03), 0.4)); parent(tab, root)
    # garrot tourniquet : sangle noire enroulée, tige de serrage, boucle
    st = curve_tube('garrot', [(0.02 + 0.045 * math.cos(a), 0.09 + 0.03 * math.sin(a), 0.012 + 0.002 * math.sin(a * 2), 1) for a in [k / 18 * math.tau for k in range(19)]], 0.0, 4, kind='POLY')
    st.data.bevel_depth = 0.0; st.data.extrude = 0.019; st.data.offset = 0.0
    bm = bmesh.new(); vs = []
    for k in range(37):
        a = k / 36 * math.tau; c = Vector((0.03 + 0.05 * math.cos(a), 0.1 + 0.03 * math.sin(a), 0.012))
        n_ = Vector((math.cos(a), math.sin(a), 0)).normalized()
        vs.append((bm.verts.new(c + Vector((0, 0, -0.011))), bm.verts.new(c + Vector((0, 0, 0.011))), bm.verts.new(c + Vector((0, 0, 0.011)) + n_ * 0.003), bm.verts.new(c + Vector((0, 0, -0.011)) + n_ * 0.003)))
    for a_, b_ in zip(vs, vs[1:]):
        for i in range(4):
            j = (i + 1) % 4; bm.faces.new((a_[i], a_[j], b_[j], b_[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    strap = mesh_obj('sangle', bm); assign(strap, mat('sangle', (0.012, 0.012, 0.014), 0.75, bump={'scale': 900, 'strength': 0.5})); parent(strap, root)
    bpy.data.objects.remove(st)
    rod = cyl('tige', 0.0055, 0.11, 24, (0.03, 0.1, 0.03), (0, math.pi / 2, 0.3), 0.002); assign(rod, M_plastic((0.02, 0.02, 0.022), 0.35)); parent(rod, root)
    clip = box('clip', (0.04, 0.018, 0.01), (0.075, 0.1, 0.026), 0.003); assign(clip, M_plastic((0.6, 0.05, 0.03), 0.35)); parent(clip, root)
    # pansement compressif sous vide (olive), rouleau de gaze, ciseaux à bout rond, gants nitrile
    pk = box('pansement_vide', (0.11, 0.075, 0.018), (0.16, -0.05, 0.009), 0.006); subsurf(pk, 1); displace(pk, 0.002, 0.012, 'CLOUDS', 3)
    assign(pk, mat('sachet', (0.18, 0.2, 0.1), 0.35, coat=0.8, coat_rough=0.12, bump={'scale': 160, 'strength': 0.25})); parent(pk, root)
    gz = cyl('gaze', 0.024, 0.065, 48, (0.0, -0.075, 0.024), (0, math.pi / 2, 0.2), 0.004); assign(gz, mat('gaze', (0.93, 0.92, 0.88), 0.95, sheen=0.5, bump={'scale': 1400, 'strength': 0.4})); parent(gz, root)
    for sd in (-1, 1):
        bl = box('lame', (0.09, 0.012, 0.002), (-0.12 + 0.03, -0.09 + sd * 0.004, 0.003), 0.001); bl.rotation_euler = (0, 0, sd * 0.06); assign(bl, M_chrome(0.15)); parent(bl, root)
        rng = curve_tube('anneau', [(-0.2 + 0.016 * math.cos(a), -0.09 + sd * 0.02 + 0.012 * math.sin(a), 0.003, 1) for a in [k / 20 * math.tau for k in range(21)]], 0.0035, 6, kind='POLY')
        assign(rng, M_plastic((0.9, 0.35, 0.03), 0.35)); parent(rng, root)
    gl = box('gants', (0.09, 0.06, 0.006), (0.15, 0.08, 0.003), 0.004); subsurf(gl, 1); displace(gl, 0.002, 0.015, 'CLOUDS', 2)
    assign(gl, mat('nitrile', (0.15, 0.3, 0.75), 0.45, coat=0.3, sss=0.2)); parent(gl, root)
    return root


def it_ifak():
    def build():
        set_scene('gear_store', 0.5, 0.55, rot=0, surface='wood', expo=-0.25, key=(-0.35, -0.4, 0.7), key_w=9, rim=((0.6, 0.8, 1.0), (1.0, 0.85, 0.7)), rim_w=(2.5, 2.0))
        ifak_layout((0, 0, 0))
        shot((0.0, 0.0, 0.02), 0.6, 0.42, -10, 50, 5.6)
    return build


ITEMS['kit-de-soin-gta6'] = it_ifak()


# ------------------------------------------------------------------ gilets : galon de bordure, points d'arrêt du MOLLE, velcro, boucles
def vest_details(level, color):
    t = {1: 0.008, 2: 0.016, 3: 0.022, 4: 0.03, 5: 0.034}[min(level, 5)]
    tr = F2.torso_r
    half, neck, z0, z1 = 0.86, 0.3, 0.07, 0.43
    def top(da): return z1 - (0.07 * (1 - (da / neck) ** 2) if da < neck else 0.0) - (0.1 * ((da - 0.55) / 0.31) ** 2 if da > 0.55 else 0.0)
    def P_(a, z, off=0.0): r = tr(a, z) + 0.004 + t + off; return (math.cos(a) * r, math.sin(a) * r, z)
    dark = tuple(c * 0.55 for c in color)
    Mb = M_nylon(dark, 22.0, 'galon')
    for a0 in (0.0, math.pi):
        pts = []
        for k in range(41): a = a0 - half + 2 * half * k / 40; pts.append((*P_(a, z0 + 0.003, -t * 0.5), 1.0))
        for k in range(1, 13): a = a0 + half; z = z0 + (top(half) - z0) * k / 12; pts.append((*P_(a, z, -t * 0.5), 1.0))
        for k in range(1, 41): a = a0 + half - 2 * half * k / 40; pts.append((*P_(a, top(abs(a - a0)) - 0.003, -t * 0.5), 1.0))
        for k in range(1, 12): a = a0 - half; z = top(half) - (top(half) - z0) * k / 12; pts.append((*P_(a, z, -t * 0.5), 1.0))
        bt = curve_tube('galon', pts, t * 0.5 + 0.003, 2, closed=True, kind='POLY', profile_seg=3); assign(bt, Mb)
    if level >= 2:
        # sangles MOLLE (2,5 cm) cousues sur le panneau avant, points d'arrêt par-dessus
        Mw = M_nylon(tuple(c * 0.8 for c in color), 30.0, 'sangle')
        for i in range(5 if level > 2 else 3):
            z = 0.1 + i * 0.03
            bm = bmesh.new(); ring = []
            for k in range(33):
                a = -0.56 + 1.12 * k / 32
                ring.append((bm.verts.new(P_(a, z - 0.0118, 0.0011)), bm.verts.new(P_(a, z + 0.0118, 0.0011))))
            for (l0, h0), (l1, h1) in zip(ring, ring[1:]): bm.faces.new((l0, l1, h1, h0))
            rb = mesh_obj('sangle_molle', bm); solidify(rb, 0.0017, 0); assign(rb, Mw)
        Mt = mat('arret', tuple(c * 0.35 for c in color), 0.8)
        for i in range(5 if level > 2 else 3):
            z = 0.1 + i * 0.03
            for k in range(8):
                a = -0.5 + k * 1.0 / 7
                x, y, zz = P_(a, z, 0.0029)
                tk = box('point_arret', (0.002, 0.004, 0.024), (x, y, zz), 0.0005); tk.rotation_euler = (0, 0, a); assign(tk, Mt)
    # panneau velcro (boucles) sur la poitrine, boucles de bretelles
    vx, vy, vz = P_(0.0, 0.285, 0.001)
    vel = box('velcro', (0.004, 0.19, 0.075), (vx, vy, vz), 0.002); assign(vel, mat('velcro', tuple(c * 0.9 for c in color), 0.95, sheen=0.6, bump={'scale': 2600, 'strength': 0.7, 'detail': 2}))
    for sd in (-1, 1):
        q = F2.torso_surface((0.0, sd * 0.1, 0.38), (0.55, 0.0, 0.83), 0.012 + t * 0.4)
        bk = box('boucle', (0.012, 0.045, 0.03), tuple(q), 0.004); bk.rotation_euler = (0, -0.6, 0); assign(bk, M_plastic((0.012, 0.012, 0.014), 0.35))


def it_vest(level):
    base = F2.it_vest(level)
    def build():
        base()
        for o in list(bpy.data.objects):
            if o.name.startswith('gilet_porte'):
                renylon(o, F2.VEST[level], 16.0)
        vest_details(level, F2.VEST[level])
        # nylon noir sur buste blanc : contraste plus franc (sinon la courbe AgX éclaircit le noir en gris)
        vs = bpy.context.scene.view_settings
        try: vs.look = 'AgX - High Contrast'
        except Exception: pass
        vs.exposure = vs.exposure - 0.15
        c = bpy.context.scene.camera
        if c:
            c.location = (1.38, -1.02, 0.46); look_at(c, (0.0, 0.0, 0.2)); c.data.dof.focus_distance = (Vector((0.0, 0.0, 0.2)) - c.location).length
    return build


ITEMS.update({k: it_vest(l) for k, l in (('gilet-super-leger', 1), ('gilet-leger', 2), ('gilet-standard', 3), ('gilet-lourd', 4), ('gilet-super-lourd', 5), ('gilet-gta6', 6))})
