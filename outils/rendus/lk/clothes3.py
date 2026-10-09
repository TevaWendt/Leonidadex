# Vêtements et style — tenues, v7.77 (deuxième jet) : vêtements suspendus à des cintres (drapé, tissus scannés, cols,
# boutons, revers), robes sur buste de couture (paillettes, satin), portant de boutique ; les accessoires restent ceux
# de lk.clothes2.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
from .core import *
from .core import _nodes
from . import assets as A
from . import wear86 as W
from . import clothes2 as C2
from . import clothes as CL

TEX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tex') + os.sep
ITEMS = dict(C2.ITEMS)
POST = {'bloom': 0.06, 'grain': 0.016, 'vig': 0.24, 'ca': 0.3}
HD2K = lambda h: '2k' if os.path.exists(f'{A.ROOT}/hdri/{h}_2k.hdr') else '1k'


def boutique(hd='decor_shop', k=0.45, cam_k=0.5, rot=0.0, wall=(0.42, 0.4, 0.37), expo=-0.5, floor='wood_table_worn', key=520, rail=True, rail_z=1.62, wall_y=0.32):
    """mur de boutique (couleur unie, enduit), parquet, tringle chromée ; lumière rasante de côté pour révéler les plis"""
    A.hdri(hd, k, rot=rot, res=HD2K(hd), cam_hdri_k=cam_k)
    bpy.context.scene.view_settings.exposure = expo
    w = box('mur', (6, 0.05, 3.2), (0, wall_y, 0.6), 0.0); assign(w, mat('mur', wall, 0.85, bump={'scale': 35, 'strength': 0.12}))
    fl = grid('sol', 8, 8, 2, 2); assign(fl, A.pbr(floor, 1.0, res='1k', coords='Object', val=0.7))
    if rail:
        r = cyl('tringle', 0.012, 4.0, 32, (0, 0.0, rail_z), (0, math.pi / 2, 0)); assign(r, M_chrome(0.1))
        for x in (-1.6, 1.6):
            b = cyl('support', 0.008, wall_y, 16, (x, wall_y / 2, rail_z), (math.pi / 2, 0, 0)); assign(b, M_chrome(0.1))
    area('cle', (-2.4, -1.3, 2.1), (0, 0, 1.15), 1.3, key, (1.0, 0.95, 0.9))
    area('fill', (1.9, -1.7, 1.5), (0.3, 0, 1.1), 1.6, key * 0.22, (0.9, 0.95, 1.0))
    area('haut', (0.0, -0.6, 2.6), (0, 0, 1.2), 1.5, key * 0.25, (1.0, 0.97, 0.92))


def cam_front(target=(0, 0, 1.15), dist=2.6, az=8, h=0.1, lens=50, fstop=6.3):
    a = math.radians(az)
    return cam((target[0] + math.sin(a) * dist, target[1] - math.cos(a) * dist, target[2] + h), target, lens, fstop)


# ------------------------------------------------------------------ éléments
def it_rack():
    def b():
        boutique('decor_shop', wall=(0.36, 0.33, 0.3))
        R = random.Random(5)
        cols = [(0.05, 0.06, 0.1), (0.62, 0.6, 0.55), (0.35, 0.05, 0.06), (0.1, 0.25, 0.2), (0.75, 0.72, 0.68), (0.12, 0.12, 0.13), (0.5, 0.32, 0.18), (0.2, 0.3, 0.45),
                (0.7, 0.45, 0.5), (0.04, 0.04, 0.045)]
        for i, c in enumerate(cols):
            x = -1.05 + i * 0.235
            kind = i % 3
            if kind == 0: g = W.hang_tshirt(c, loc=(x, 0, 1.55), rot=math.radians(-62 + R.uniform(-6, 6)), seed=i + 10)
            elif kind == 1: g = W.hang_shirt(c, loc=(x, 0, 1.55), rot=math.radians(-62 + R.uniform(-6, 6)), seed=i + 10)
            else: g = W.hang_jacket(c, loc=(x, 0, 1.545), rot=math.radians(-62 + R.uniform(-6, 6)), seed=i + 10, shirt_col=(0.9, 0.9, 0.88), tie=(0.3, 0.03, 0.05))
        cam_front((0.0, 0, 1.2), 3.0, 24, 0.05, 45, 6.3)
        return POST
    return b


def it_tee_print():
    def b():
        boutique('decor_shop', wall=(0.12, 0.42, 0.42), key=600)
        W.hang_tshirt((0.035, 0.035, 0.04), decal=(TEX + 'tshirt_couchant.png', (0.0, -0.3), (0.27, 0.27)), loc=(0.0, 0, 1.55), seed=3)
        cam_front((0.0, 0, 1.22), 1.7, 6, 0.0, 50, 5.6)
        return POST
    return b


def it_hawaii():
    def b():
        boutique('decor_shop', wall=(0.85, 0.5, 0.52), key=600)
        W.hang_shirt(pattern=TEX + 'tropical_bleu.png', rep=4.0, loc=(-0.22, 0, 1.55), short=True, seed=5)
        W.hang_shirt(pattern=TEX + 'tropical_creme.png', rep=4.0, loc=(0.42, 0, 1.55), short=True, seed=7)
        cam_front((0.1, 0, 1.2), 2.0, 10, 0.0, 50, 5.6)
        return POST
    return b


def it_linen_suit():
    def b():
        boutique('decor_shop', wall=(0.82, 0.78, 0.7), key=560)
        W.hang_jacket((0.52, 0.66, 0.76), 'rough_linen', 10.0, 6, loc=(0.0, 0, 1.545), shirt_col=(0.93, 0.93, 0.9), tie=None)
        cam_front((0.0, 0, 1.2), 1.9, 8, 0.0, 50, 5.6)
        return POST
    return b


def it_suit_lux():
    def b():
        boutique('lythwood_lounge' if os.path.exists(A.ROOT + '/hdri/lythwood_lounge_2k.hdr') else 'decor_shop', wall=(0.16, 0.12, 0.1), key=520)
        W.hang_jacket((0.1, 0.1, 0.11), 'poly_wool_herringbone', 6.0, 8, loc=(-0.28, 0, 1.545), shirt_col=(0.93, 0.93, 0.9), tie=(0.32, 0.03, 0.06))
        W.hang_jacket((0.26, 0.22, 0.18), 'poly_wool_herringbone', 6.0, 9, loc=(0.42, 0, 1.545), rot=math.radians(-20), shirt_col=(0.75, 0.82, 0.9), tie=(0.05, 0.08, 0.2))
        cam_front((0.05, 0, 1.2), 2.2, 6, 0.0, 50, 5.6)
        return POST
    return b


def it_dress(kind):
    def b():
        boutique('decor_shop', wall=(0.2, 0.18, 0.22) if kind == 'sequins' else (0.5, 0.46, 0.43), key=560, rail=kind != 'sequins', rail_z=1.62)
        if kind != 'sequins':
            # Lucia choisit sa tenue : deux robes du soir sur la tringle (satin émeraude long, satin noir au genou)
            W.hang_dress(W.M_satin((0.012, 0.16, 0.1)), loc=(-0.3, 0, 1.6), rot=math.radians(4), seed=6, long=True)
            W.hang_dress(W.M_satin((0.012, 0.011, 0.014)), loc=(0.36, 0, 1.6), rot=math.radians(-6), seed=9, long=False)
            cam_front((0.02, 0, 0.92), 4.15, 10, 0.05, 50, 6.3)
            area('contre', (0.6, 1.0, 1.8), (0, 0, 1.1), 0.8, 260, (0.85, 0.9, 1.0))
            return POST
        f = W.dress_form((0.86, 0.84, 0.8)); f.location = (0.0, 0.0, 1.06)
        if kind == 'sequins':
            d, st = W.dress_shell('robe', 0.28, -0.46, 0.07, famp=0.008, seed=4); M = W.M_sequins((0.62, 0.05, 0.12))
        else:
            # robe longue « sirène » : ajustée jusqu'aux cuisses, puis évasée jusqu'au sol, satin vert émeraude, décolleté en V
            d, st = W.dress_shell('robe', 0.3, -1.0, 0.26, famp=0.02, seed=6, nfold=24, flare_from=-0.42, flare_pow=1.8, neckline=0.07); M = W.M_satin((0.012, 0.16, 0.1))
            belt = curve_tube('ceinture', [(math.cos(a) * (W.form_r(a, 0.06) + 0.012), math.sin(a) * (W.form_r(a, 0.06) + 0.012), 0.06, 1.0) for a in [k / 64 * math.tau for k in range(64)]], 0.007, 4, closed=True, kind='POLY', profile_seg=3)
            belt.location = (0.0, 0.0, 1.06); assign(belt, mat('ceinture_or', (0.8, 0.6, 0.25), 0.25, metal=1.0))
        d.location = f.location; assign(d, M)
        for s_ in st: s_.location = f.location; assign(s_, M)
        cam_front((0.0, 0, 0.92 if kind != 'sequins' else 1.08), 3.3 if kind != 'sequins' else 1.9, 12, 0.12, 50, 5.6)
        area('contre', (0.6, 1.0, 1.8), (0, 0, 1.1), 0.8, 260, (0.85, 0.9, 1.0))
        return POST
    return b


def it_field_jacket():
    def b():
        boutique('gear_store' if os.path.exists(A.ROOT + '/hdri/gear_store_2k.hdr') else 'decor_shop', wall=(0.22, 0.23, 0.2), key=520)
        W.hang_jacket((0.16, 0.18, 0.1), 'bi_stretch', 9.0, 3, loc=(-0.2, 0, 1.545), shirt_col=(0.05, 0.05, 0.05), tie=None, btn=(0.02, 0.02, 0.02))
        W.hang_tshirt((0.02, 0.02, 0.022), loc=(0.45, 0, 1.55), seed=9)
        cam_front((0.1, 0, 1.2), 2.1, 8, 0.0, 50, 5.6)
        return POST
    return b


def it_outfit():
    def b():
        boutique('decor_shop', wall=(0.3, 0.34, 0.38), key=560)
        W.hang_shirt((0.86, 0.86, 0.84), loc=(-0.3, 0, 1.55), seed=11)
        W.hang_jacket((0.07, 0.08, 0.12), 'denim_fabric_04', 7.0, 12, loc=(0.36, 0, 1.545), shirt_col=(0.9, 0.9, 0.88), tie=None, btn=(0.6, 0.55, 0.45))
        cam_front((0.05, 0, 1.2), 2.2, 8, 0.0, 50, 5.6)
        return POST
    return b


def shelf_scene(hd='decor_shop', wall=(0.4, 0.37, 0.33)):
    A.hdri(hd, 0.5, res=HD2K(hd), cam_hdri_k=0.55)
    bpy.context.scene.view_settings.exposure = -0.45
    sh = box('etagere', (1.6, 0.5, 0.04), (0, 0.1, -0.02), 0.004); assign(sh, A.pbr('wood_table_worn', 1.6, res='1k', coords='Object', coat=0.3, coat_rough=0.2, val=0.85))
    w = box('fond', (2.4, 0.04, 1.4), (0, 0.38, 0.5), 0.0); assign(w, mat('mur', wall, 0.85, bump={'scale': 35, 'strength': 0.12}))
    area('cle', (-0.9, -0.7, 0.9), (0, 0, 0.05), 0.8, 90, (1.0, 0.95, 0.9))
    area('fill', (0.9, -0.6, 0.6), (0, 0, 0.05), 0.8, 25, (0.9, 0.95, 1.0))
    area('haut', (0.0, -0.1, 1.2), (0, 0, 0.0), 1.0, 40, (1.0, 0.97, 0.92))


def it_tops():
    def b():
        shelf_scene()
        R = random.Random(3)
        for k, cols in enumerate(([(0.04, 0.06, 0.13), (0.62, 0.62, 0.6), (0.4, 0.05, 0.07)], [(0.08, 0.2, 0.16), (0.82, 0.8, 0.75), (0.03, 0.03, 0.035)])):
            for i, c in enumerate(cols):
                W.folded_tee(c, seed=k * 3 + i, loc=((k - 0.5) * 0.36, 0.05 + R.uniform(-0.005, 0.005), i * 0.033), rot=math.radians(R.uniform(-3, 3)))
        cam((0.05, -0.72, 0.42), (0.0, 0.06, 0.04), 50, 5.6)
        return POST
    return b


def it_pants():
    """deux jeans à plat (brut et délavé) sur un parquet, vue plongeante : ceinture, rivets, surpiqûres dorées"""
    def b():
        C2.scene('decor_shop', surface='wood', rims=False, key=(-1.5, -0.7, 0.95), key_w=110)
        W.jeans(None, 'denim_fabric_04', 5.0, seed=4, loc=(-0.2, 0.23, 0.0), rot=math.radians(-88), wrinkle=0.009)
        W.jeans((0.3, 0.42, 0.58), 'denim_fabric_05', 5.0, seed=7, loc=(-0.17, -0.22, 0.0), rot=math.radians(-93), wrinkle=0.009)
        W.jeans((0.42, 0.36, 0.24), 'bi_stretch', 9.0, seed=11, loc=(0.57, -0.01, 0.0), rot=math.radians(-84), W=0.4, L=0.52, wrinkle=0.008)   # short chino
        C2.top_cam((0.06, 0.0, 0.0), 2.5, 12, -4, 50, 8.0)
        return POST
    return b


def bandana2(loc=(0, 0, 0), rot=0.0):
    """bandana plié en triangle (imprimé cachemire du site), pointes nouées, tissu de coton scanné"""
    root = empty('bandana', loc, (0, 0, rot))
    tri = [(-0.3, 0.1), (0.3, 0.1), (0.0, -0.24)]
    b = W.fabric_piece('bandana', W.resample(tri, 0.02), 0.006, 0.02, 0.003, 0.004, 5, nfolds=10); 
    M = W.pattern_fabric(os.path.join(TEX, 'paisley.png'), 'cotton_jersey', 9.0, 3.2, 'xy'); assign(b, M); parent(b, root)
    for sd in (-1, 1):
        k = curve_tube('pointe', [(sd * 0.28, 0.1, 0.006, 1), (sd * 0.36, 0.15, 0.008, 1), (sd * 0.4, 0.22, 0.006, 0.7)], 0.011, 10, profile_seg=4); assign(k, M); parent(k, root)
    return root


def cap2(color, loc=(0, 0, 0), rot=0.0):
    """casquette six panneaux : calotte en sergé, coutures et œillets, bouton, visière incurvée"""
    root = empty('casquette', loc, (0, 0, rot))
    M = W.M_fabric_scan('bi_stretch', color, 12.0)
    dome = sphere('calotte', 0.095, (0, 0, 0.0), (1.05, 0.95, 0.72), 64, 32)
    for v in dome.data.vertices:
        if v.co.z < 0: v.co.z = 0.0
    assign(dome, M); parent(dome, root)
    th = tuple(min(1.0, c * 0.7 + 0.04) for c in color)
    for k in range(6):
        a = k / 6 * math.tau
        pts = [(math.cos(a) * 0.0965 * 1.05 * math.sin(t), math.sin(a) * 0.0965 * 0.95 * math.sin(t), 0.0965 * 0.72 * math.cos(t), 1.0) for t in [math.pi / 2 * (1 - i / 16) for i in range(17)]]
        sm_ = curve_tube('couture', pts, 0.0012, 2, kind='POLY', profile_seg=2); assign(sm_, mat('fil', th, 0.6)); parent(sm_, root)
        ey = cyl('oeillet', 0.003, 0.002, 12, (math.cos(a + 0.5) * 0.068, math.sin(a + 0.5) * 0.062, 0.045), (0, 0, 0)); ey.rotation_euler = (0.9, 0, a + 0.5 + math.pi / 2); assign(ey, mat('oeillet', th, 0.6)); parent(ey, root)
    btn = sphere('bouton', 0.008, (0, 0, 0.068), (1, 1, 0.55)); assign(btn, M); parent(btn, root)
    brim = W.fabric_piece('visiere', [(0.08 * math.cos(a), 0.085 * math.sin(a)) for a in [math.radians(-80 + 160 * i / 24) for i in range(25)]] + [(0.17 * math.cos(math.radians(80 - 160 * i / 24)) * 0.95 + 0.02, 0.09 * math.sin(math.radians(80 - 160 * i / 24))) for i in range(25)], 0.006, 0.012, 0.0025, 0.0005, 2, nfolds=2)
    for v in brim.data.vertices: v.co.z += -0.02 * (v.co.y / 0.09) ** 2 + 0.0
    brim.rotation_euler = (0, -0.12, 0); brim.location = (0.0, 0, 0.004); assign(brim, M); parent(brim, root)
    return root


def it_hats():
    def b():
        C2.scene('decor_shop', surface='wood')
        cap2((0.06, 0.08, 0.16), (-0.17, 0.0, 0), 0.6)
        CL.fedora((0.09, 0.075, 0.06), (0.02, 0.02, 0.022), (0.2, 0.03, 0), 0.0)
        cam((0.05, -0.8, 0.35), (0.0, 0.0, 0.07), 50, 5.0)
        return POST
    return b


def it_bandana():
    def b():
        C2.scene('decor_shop', surface='wood')
        bandana2((0.0, 0.02, 0.0), 0.08)
        CL.gloves((0.33, -0.26, 0), -0.5)
        C2.top_cam((0.04, -0.02, 0.0), 1.15, 32, -10, 50, 8.0)
        return POST
    return b


def add_scan_normal(m, aid, scale=6.0, strength=1.0):
    """ajoute à une matière existante le relief (carte normale) et la rugosité d'une matière scannée"""
    maps = A.tex_maps(aid, '1k'); nt = m.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    v = tex_coord(nt, 'Object', scale)
    if 'nor' in maps:
        it = N.new('ShaderNodeTexImage'); it.image = A._img(maps['nor'], True); it.projection = 'BOX'; it.projection_blend = 0.3; L.new(v, it.inputs['Vector'])
        nm = N.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = strength; L.new(it.outputs['Color'], nm.inputs['Color'])
        L.new(nm.outputs['Normal'], p.inputs['Normal'])
    if 'rough' in maps:
        it = N.new('ShaderNodeTexImage'); it.image = A._img(maps['rough'], True); it.projection = 'BOX'; it.projection_blend = 0.3; L.new(v, it.inputs['Vector'])
        L.new(it.outputs['Color'], p.inputs['Roughness'])
    return m


def it_shoes():
    base = C2.ITEMS['gta5-chaussures']
    def b():
        post = base()
        Mr = mat('semelle_caoutchouc', (0.9, 0.88, 0.84), 0.6, bump={'scale': 600, 'strength': 0.12, 'detail': 3})
        Mc = W.M_fabric_scan('bi_stretch', (0.05, 0.05, 0.055), 14.0, name='col_maille')
        done = set()
        for o in bpy.data.objects:
            if o.type not in ('MESH', 'CURVE'): continue
            for i, m in enumerate(o.data.materials):
                if m is None: continue
                if m.name.startswith('cuir') and m.name not in done:
                    add_scan_normal(m, 'leather_white', 7.0, 1.2); done.add(m.name)
                elif m.name.startswith('semelle'): o.data.materials[i] = Mr
                elif m.name.startswith('col'): o.data.materials[i] = Mc
        return post
    return b


ITEMS.update({
    'bandana-de-braquage': it_bandana(),
    'gta5-chapeaux': it_hats(),
    'gta5-chaussures': it_shoes(),
    'gta5-hauts': it_tops(),
    'gta5-pantalons': it_pants(),
    'milliers-de-tenues': it_rack(),
    'tenues-gagnees-en-mission': it_field_jacket(),
    'vice-city-style-tenues': it_hawaii(),
    'goodtime-gear': it_tee_print(),
    'jason-costume-lin-pastel': it_linen_suit(),
    'lucia-mini-robe-sequins': it_dress('sequins'),
    'lucia-tenue-de-soiree': it_dress('soiree'),
    'gta5-tenues-completes': it_outfit(),
    'gta5-costumes-ponsonbys': it_suit_lux(),
})
