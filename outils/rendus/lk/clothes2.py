# Vêtements et style v2 : photos de boutique et mises à plat avec des tissus scannés (jersey, lin, jean, satin, cuir,
# velours), vêtements suspendus aux plis tombants, piles pliées, accessoires (montre et lunettes scannées).
import bpy, bmesh, math, random, os
from mathutils import Vector
from .core import *
from . import assets as A
from . import clothes as CL

HD2K = lambda h: '2k' if os.path.exists(f'{A.ROOT}/hdri/{h}_2k.hdr') else '1k'
TEX = CL.TEX
MEAN = {'cotton_jersey': 0.68, 'rough_linen': 0.66, 'denim_fabric': 0.42, 'polar_fleece': 0.7, 'velour_velvet': 0.3, 'crepe_satin': 0.68, 'jersey_melange': 0.52,
        'fabric_leather_02': 0.32, 'leather_white': 0.56, 'brown_leather': 0.18}


def fabric(aid, color, scale=6.0, sheen=0.5, rough_mul=1.0, coat=0.0, keep_color=False, metal=None, normal_k=1.0):
    """tissu scanné recoloré : on garde le relief, les fibres et les variations, on impose la teinte"""
    if keep_color:
        return A.pbr(aid, scale, coords='Object', sheen=sheen, rough_mul=rough_mul, coat=coat, normal_k=normal_k)
    k = 1.0 / max(0.15, MEAN.get(aid, 0.6))
    return A.pbr(aid, scale, coords='Object', sat=0.0, val=k, tint=color, sheen=sheen, rough_mul=rough_mul, coat=coat, metal=metal, normal_k=normal_k)


def scene(hd='decor_shop', k=0.5, cam_k=0.6, rot=0.0, surface='wood', expo=-0.35, key=(0.3, -0.5, 1.6), key_w=60, rims=True):
    A.hdri(hd, k, rot=rot, res=HD2K(hd), cam_hdri_k=cam_k)
    bpy.context.scene.view_settings.exposure = expo
    fl = box('surface', (4, 4, 0.04), (0, 0, -0.02))
    if surface == 'wood':
        assign(fl, A.pbr('wood_table_worn', 1.4, coords='Object', coat=0.3, coat_rough=0.2, tint=(0.8, 0.75, 0.7)))
    elif surface == 'linen':
        assign(fl, fabric('rough_linen', (0.82, 0.8, 0.76), 2.0, 0.6))
    elif surface == 'concrete':
        assign(fl, A.pbr('smooth_concrete_floor', 1.0, coords='Object', sat=0.3))
    elif surface == 'leather':
        assign(fl, fabric('fabric_leather_02', (0.05, 0.045, 0.045), 3.0, 0.2, coat=0.2))
    elif surface == 'marble':
        assign(fl, A.pbr('marble_01', 1.2, coords='Object', coat=0.6, coat_rough=0.05))
    area('cle', key, (0, 0, 0), 1.4, key_w, (1.0, 0.94, 0.86))
    if rims:
        area('rose', (1.3, 0.9, 0.5), (0, 0, 0.1), 0.6, key_w * 0.22, (1.0, 0.35, 0.6))
        area('cyan', (-1.2, 1.1, 0.5), (0, 0, 0.1), 0.6, key_w * 0.2, (0.3, 0.75, 1.0))
    return fl


def top_cam(target=(0, 0, 0), height=1.6, tilt=24, az=-12, lens=50, fstop=8.0):
    return CL.top_cam(target, height, tilt, az, lens, fstop)


# ------------------------------------------------------------------ vêtement suspendu (plis tombants)
def hanging(name, outline, m, thick=0.03, folds=0.012, seed=1, voxel=0.006, rot_z=0.0, loc=(0, 0, 0)):
    """contour (x, z) d'un vêtement vu de face, haut en z = 0 ; plis verticaux de plus en plus profonds vers le bas"""
    ob = extrude2d(name, outline, thick, 0.0)
    ob.rotation_euler = (math.pi / 2, 0, 0)
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob], selected_editable_objects=[ob]):
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    rm = ob.modifiers.new('remesh', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = voxel; apply_mods(ob)
    R = random.Random(seed); ph = [R.random() * 6.28 for _ in range(6)]; zs = [v.co.z for v in ob.data.vertices]; zmin = min(zs)
    for v in ob.data.vertices:
        t = min(1.0, max(0.0, -v.co.z / max(0.01, -zmin)))
        amp = folds * (0.15 + 0.85 * t ** 1.2)
        x = v.co.x
        y = amp * (math.sin(x * 38 + ph[0]) * 0.55 + math.sin(x * 71 + ph[1] + v.co.z * 4) * 0.3 + math.sin(x * 17 + ph[2]) * 0.4)
        y += 0.002 * math.sin(v.co.z * 60 + x * 20 + ph[3])
        v.co.y += y
    for p in ob.data.polygons: p.use_smooth = True
    subsurf(ob, 1)
    ob.location = loc; ob.rotation_euler = (0, 0, rot_z)
    assign(ob, m)
    return ob


def hanger(x=0.0, y=0.0, z=0.0, rot=0.0, wood=True):
    root = empty('cintre', (x, y, z), (0, 0, rot))
    m = A.pbr('dark_wood', 8.0, coords='Object', coat=0.6, coat_rough=0.1) if wood else M_chrome(0.15)
    arm = curve_tube('bras', [(-0.21, 0, -0.06, 1), (-0.1, 0, -0.02, 1), (0.0, 0, 0.0, 1), (0.1, 0, -0.02, 1), (0.21, 0, -0.06, 1)], 0.008, 16, profile_seg=6); assign(arm, m); parent(arm, root)
    hook = curve_tube('crochet', [(0.0, 0, 0.0, 1), (0.0, 0, 0.05, 1), (0.012, 0, 0.075, 1), (0.03, 0, 0.065, 1), (0.026, 0, 0.05, 1)], 0.0022, 16); assign(hook, M_chrome(0.15)); parent(hook, root)
    return root


SHIRT = [(0.0, -0.01), (0.07, 0.0), (0.2, -0.04), (0.235, -0.12), (0.26, -0.55), (0.215, -0.56), (0.205, -0.2), (0.2, -0.78), (-0.2, -0.78), (-0.205, -0.2), (-0.215, -0.56), (-0.26, -0.55),
         (-0.235, -0.12), (-0.2, -0.04), (-0.07, 0.0)]
JACKET = [(0.0, -0.01), (0.075, 0.0), (0.215, -0.04), (0.25, -0.13), (0.275, -0.62), (0.225, -0.63), (0.218, -0.25), (0.215, -0.76), (0.02, -0.8), (-0.02, -0.8), (-0.215, -0.76),
          (-0.218, -0.25), (-0.225, -0.63), (-0.275, -0.62), (-0.25, -0.13), (-0.215, -0.04), (-0.075, 0.0)]
TROUSERS = [(-0.2, 0.0), (0.2, 0.0), (0.21, -0.35), (0.2, -1.0), (0.03, -1.0), (0.0, -0.3), (-0.03, -1.0), (-0.2, -1.0), (-0.21, -0.35)]
DRESS = [(-0.05, 0.0), (-0.07, -0.06), (-0.14, -0.1), (-0.15, -0.26), (-0.12, -0.38), (-0.2, -0.82), (0.2, -0.82), (0.12, -0.38), (0.15, -0.26), (0.14, -0.1), (0.07, -0.06), (0.05, 0.0), (0.03, -0.05), (-0.03, -0.05)]


def shirt_on_hanger(m, x=0.0, y=0.0, z=1.5, rot=0.0, seed=1, outline=SHIRT, thick=0.03, collar=None):
    root = empty('chemise_cintre', (x, y, z), (0, 0, rot))
    hg = hanger(); parent(hg, root)
    sh = hanging('chemise', outline, m, thick, 0.012, seed); sh.location = (0, 0, -0.005); parent(sh, root)
    col = curve_tube('col', [(0.075 * math.cos(a), -0.016 - 0.008 * math.sin(a), -0.02 - 0.03 * math.sin(a) ** 2, 1) for a in [math.pi * i / 16 for i in range(17)]], 0.009, 8)
    assign(col, collar or m); parent(col, root)
    return root


# ------------------------------------------------------------------ accessoires scannés
def scanned(aid, loc=(0, 0, 0), rot=(0, 0, 0), keep=None):
    r, obs = A.model(aid)
    if keep:
        for o in obs:
            if o.type == 'MESH' and not keep(o.name.split('.')[0]): bpy.data.objects.remove(o)
    r.location = loc; r.rotation_euler = rot
    return r


def spectacles(loc=(0, 0, 0), rot=(0, 0, 0), lens=(0.02, 0.025, 0.03)):
    r = scanned('round_spectacles', loc, rot)
    for o in r.children_recursive:
        if o.type != 'MESH': continue
        for i, m in enumerate(o.data.materials):
            if m and ('glass' in m.name.lower() or 'lens' in m.name.lower()):
                o.data.materials[i] = mat('verre_solaire', lens, 0.02, coat=1.0, trans=0.35, ior=1.5, film=350, film_ior=1.4)
    return r


# ------------------------------------------------------------------ masques
def hockey_mask(loc=(0, 0, 0), rot=(0, 0, 0)):
    """masque de gardien (coque blanche ajourée, sangles) : modèle générique"""
    from . import head2, hair as H
    head2.install()
    root = empty('masque_hockey', loc, rot)
    bm = bmesh.new(); seg, rings = 64, 56; grid = []
    for j in range(rings + 1):
        th = math.pi * (0.12 + 0.62 * j / rings); row = []
        for i in range(seg + 1):
            ph = -math.pi * 0.42 + math.pi * 0.84 * i / seg
            d = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
            r = H.head_radius((d.x, d.y, d.z)) + 0.012
            row.append(bm.verts.new(d * r))
        grid.append(row)
    for a_, b_ in zip(grid, grid[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
    mk = mesh_obj('coque', bm); solidify(mk, 0.004, 0)
    holes = []
    for sd in (-1, 1):
        holes.append(sphere('oeil', 0.018, (0.1, sd * 0.034, 0.0), (1.6, 1.1, 0.7)))
        for (dy, dz) in ((0.03, -0.035), (0.045, -0.05), (0.02, -0.07), (0.035, -0.085), (0.05, 0.035), (0.03, 0.06)):
            holes.append(cyl('trou', 0.0045, 0.06, 16, (0.1, sd * dy, dz), (0, math.pi / 2, 0)))
    for (dz) in (-0.05, -0.07, -0.09):
        holes.append(cyl('trou', 0.0045, 0.06, 16, (0.11, 0.0, dz), (0, math.pi / 2, 0)))
    apply_mods(mk)
    for h in holes:
        m_ = mk.modifiers.new('trou', 'BOOLEAN'); m_.operation = 'DIFFERENCE'; m_.object = h; m_.solver = 'EXACT'
    apply_mods(mk)
    for h in holes: bpy.data.objects.remove(h)
    mk.data.materials.clear(); subsurf(mk, 1)
    assign(mk, mat('coque', (0.82, 0.8, 0.74), 0.35, coat=0.4, coat_rough=0.2, sss=0.1, bump={'scale': 200, 'strength': 0.05})); parent(mk, root)
    for sd in (-1, 1):
        st = curve_tube('sangle', [(0.04, sd * 0.075, 0.03, 1), (-0.04, sd * 0.09, 0.03, 1), (-0.11, sd * 0.06, 0.03, 1)], 0.006, 12); assign(st, M_rubber()); parent(st, root)
    return root


# ------------------------------------------------------------------ vêtements portés par un buste de vitrine
def shell(m, z0=-0.02, z1=0.47, off=0.007, folds=0.004, seed=1, vopen=None, neck=0.07, name='vetement', na=140, nz=70, thick=0.0025):
    """coque de vêtement autour du buste : col rond (neck = demi-largeur) ou ouverture en V devant (vopen = (z_bas, demi-angle en haut)) ;
    plis plus marqués vers le bas"""
    from .food2 import torso_r
    R = random.Random(seed); ph = [R.random() * 6.28 for _ in range(6)]
    bm = bmesh.new(); grid_ = []
    for j in range(nz + 1):
        z = z0 + (z1 - z0) * j / nz
        if vopen is not None and z > vopen[0]:
            k = (z - vopen[0]) / (z1 - vopen[0]); phi0 = 0.02 + vopen[1] * k
        else:
            phi0 = 0.0
        row = []
        for i in range(na + 1):
            a = phi0 + (2 * math.pi - 2 * phi0) * i / na
            ztop = z1
            zz = z
            if vopen is None:   # encolure ronde
                da = abs(math.atan2(math.sin(a), math.cos(a)))
                dn = neck / 0.11
                if da < dn: zz = min(z, z1 - 0.045 * (1 - (da / dn) ** 2))
                dbk = abs(math.atan2(math.sin(a - math.pi), math.cos(a - math.pi)))
                if dbk < dn * 0.8: zz = min(zz, z1 - 0.015 * (1 - (dbk / (dn * 0.8)) ** 2))
            t = 1 - (zz - z0) / max(0.01, (z1 - z0))
            r = torso_r(a, min(zz, 0.44)) + off + (max(0.0, -0.12 - zz) * 0.12 if z0 < -0.2 else 0.0)
            if zz > 0.44:
                cap = (zz - 0.44) / 0.06; r *= math.sqrt(max(0.05, 1 - min(cap, 0.95) ** 2))
            r += folds * (0.25 + 0.75 * t) * (math.sin(a * 9 + ph[0] + zz * 6) * 0.5 + math.sin(a * 17 + ph[1]) * 0.25 + math.sin(a * 4 + ph[2]) * 0.4)
            row.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, zz)))
        grid_.append(row)
    for a_, b_ in zip(grid_, grid_[1:]):
        for i in range(na):
            bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
    if vopen is None:
        for a_, b_ in ((grid_[0], None),):
            pass
        for i in range(na):                      # referme la couture du dos (premier et dernier rang identiques)
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm); solidify(ob, thick, 0); subsurf(ob, 1); assign(ob, m)
    return ob


def sleeve(side, m, z_top=0.42, length=0.5, r0=0.055, r1=0.045, fwd=0.02, short=False, seed=1):
    """manche vide qui pend le long du buste (sans bras), légèrement aplatie"""
    from .food2 import torso_r
    y0 = side * (torso_r(math.pi / 2, 0.42) + 0.01)
    L = 0.16 if short else length
    pts = []
    for k in range(9):
        t = k / 8
        pts.append((fwd * t + 0.012 * math.sin(t * 3 + seed), side * (0.02 * (1 - t)) + y0 + side * (0.035 if short else 0.02) * t, z_top - L * t, 1.0 - 0.12 * t))
    sl = curve_tube('manche', pts, r0, 24, profile_seg=10)
    sl.data.bevel_mode = 'ROUND'; sl.data.use_fill_caps = False
    sl = to_mesh(sl)
    for v in sl.data.vertices:
        c = v.co
        v.co.y = y0 + (c.y - y0) * 0.8                  # légèrement aplatie contre le flanc
    solidify(sl, 0.0025, 0); subsurf(sl, 1); assign(sl, m)
    return sl


def M_print(color, img, fab='cotton_jersey', box=(0.0, 0.28, 0.26, 0.26)):
    """jersey teint + impression sérigraphiée sur le devant (projection de face, plan y-z)"""
    base = fabric(fab, color, 9.0, 0.5)
    nt = base.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    cy_, cz_, w, h = box
    uu = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', sep.outputs['Y'], cy_), w), 0.5)
    vv = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', sep.outputs['Z'], cz_), h), 0.5)
    comb = N.new('ShaderNodeCombineXYZ'); L.new(uu, comb.inputs[0]); L.new(vv, comb.inputs[1])
    it = N.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(os.path.join(TEX, img), check_existing=True); it.extension = 'CLIP'
    L.new(comb.outputs[0], it.inputs['Vector'])
    front = math_node(nt, 'GREATER_THAN', sep.outputs['X'], 0.0)
    fac = math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', it.outputs['Alpha'], front), 0.95)
    cur = p.inputs['Base Color'].links[0].from_socket
    mx = N.new('ShaderNodeMix'); mx.data_type = 'RGBA'; L.new(fac, mx.inputs[0]); L.new(cur, mx.inputs[6]); L.new(it.outputs['Color'], mx.inputs[7])
    L.new(mx.outputs[2], p.inputs['Base Color'])
    return base


def display(scene_hd='decor_shop', form=(0.035, 0.035, 0.038), hips=False):
    from .food2 import torso_form
    A.hdri(scene_hd, 0.55, res=HD2K(scene_hd), cam_hdri_k=0.6, rot=40)
    bpy.context.scene.view_settings.exposure = -0.35
    fl = grid('sol', 6, 6, 2, 2); fl.location = (0, 0, -0.93); assign(fl, A.pbr('smooth_concrete_floor', 1.0, coords='Object', sat=0.3, coat=0.3, coat_rough=0.2))
    torso_form(form, -0.42 if hips else -0.02)
    area('cle', (0.9, -0.8, 0.9), (0, 0, 0.2), 1.0, 40, (1.0, 0.92, 0.84))
    area('contre', (-0.8, 0.7, 0.6), (0, 0, 0.2), 0.6, 18, (0.5, 0.75, 1.0))
    area('rasant', (-1.0, -0.6, 0.3), (0, 0, 0.2), 0.6, 10, (1.0, 0.75, 0.55))


def it_worn(kind):
    def build():
        if kind == 'costume':
            display('lythwood_lounge')
            jk = mat('laine_peignee', (0.012, 0.012, 0.016), 0.6, sheen=0.25, sheen_tint=(0.8, 0.8, 0.9), bump={'scale': 1200, 'strength': 0.12, 'detail': 3})
            shell(CL.cotton((0.9, 0.9, 0.92)), 0.05, 0.47, 0.004, 0.001, 2, None, 0.06, 'chemise')
            shell(jk, -0.12, 0.47, 0.012, 0.004, 3, (0.12, 0.42), 0.07, 'veste', thick=0.004)
            for sd in (-1, 1): sleeve(sd, jk, 0.42, 0.55, 0.06, 0.05, 0.03, seed=sd)
            tie = curve_tube('cravate', [(0.135, 0.0, 0.45, 0.8), (0.142, 0.0, 0.33, 1.2), (0.145, 0.0, 0.2, 1.5), (0.14, 0.0, 0.12, 1.4)], 0.014, 12, profile_seg=4)
            tie.data.bevel_mode = 'ROUND'; tie.scale = (0.4, 1.0, 1.0); assign(tie, CL.satin((0.35, 0.03, 0.05)))
            for sd in (-1, 1):
                lp = curve_tube('revers', [(0.13, sd * 0.07, 0.46, 1), (0.145, sd * 0.06, 0.32, 1.4), (0.152, sd * 0.03, 0.17, 1.0), (0.15, sd * 0.005, 0.12, 0.6)], 0.012, 12, profile_seg=3)
                lp.data.bevel_mode = 'ROUND'; assign(lp, CL.satin((0.01, 0.01, 0.012)))
            ps = extrude2d('pochette', [(-0.025, 0.0), (0.0, 0.025), (0.025, 0.0), (0.03, -0.01), (-0.03, -0.01)], 0.004, 0.0015); ps.rotation_euler = (math.pi / 2, 0, math.pi / 2); ps.location = (0.135, 0.1, 0.33)
            assign(ps, CL.satin((0.9, 0.9, 0.92)))
            b = cyl('bouton', 0.011, 0.005, 32, (0.152, 0.0, 0.1), (0, math.pi / 2, 0), 0.002); assign(b, mat('corne', (0.02, 0.02, 0.02), 0.25, coat=0.8))
        elif kind == 'lin':
            display('hotel_room', (0.62, 0.6, 0.57))
            jk = fabric('rough_linen', (0.93, 0.68, 0.7), 6.0, 0.6)
            shell(fabric('cotton_jersey', (0.62, 0.85, 0.78), 8.0), 0.05, 0.47, 0.004, 0.001, 2, None, 0.06, 'tshirt')
            shell(jk, -0.12, 0.47, 0.012, 0.005, 4, (0.08, 0.45), 0.07, 'veste', thick=0.004)
            for sd in (-1, 1): sleeve(sd, jk, 0.42, 0.55, 0.06, 0.05, 0.03, seed=sd + 3)
            for sd in (-1, 1):
                lp = curve_tube('revers', [(0.13, sd * 0.075, 0.46, 1), (0.145, sd * 0.065, 0.3, 1.4), (0.15, sd * 0.02, 0.12, 0.9), (0.148, sd * 0.004, 0.08, 0.6)], 0.012, 12, profile_seg=3)
                lp.data.bevel_mode = 'ROUND'; assign(lp, jk)
        elif kind == 'sequins':
            display('decor_shop', (0.62, 0.6, 0.57), True)
            m = CL.sequins((0.62, 0.02, 0.04))
            shell(m, -0.38, 0.37, 0.006, 0.003, 5, None, 0.12, 'robe', thick=0.003)
            for sd in (-1, 1):
                st = curve_tube('bretelle', [(0.1, sd * 0.09, 0.37, 1), (0.05, sd * 0.1, 0.49, 1), (-0.05, sd * 0.1, 0.49, 1), (-0.1, sd * 0.09, 0.37, 1)], 0.004, 12); assign(st, m)
        elif kind == 'soiree':
            display('hotel_room', (0.62, 0.6, 0.57), True)
            m = CL.satin((0.05, 0.02, 0.1))
            shell(m, -0.42, 0.4, 0.007, 0.006, 6, None, 0.13, 'robe', thick=0.003)
            for sd in (-1, 1):
                st = curve_tube('bretelle', [(0.1, sd * 0.1, 0.4, 1), (0.04, sd * 0.11, 0.49, 1), (-0.04, sd * 0.11, 0.49, 1), (-0.1, sd * 0.1, 0.4, 1)], 0.004, 12); assign(st, m)
        elif kind in ('sunset', 'gator'):
            display('decor_shop', (0.62, 0.6, 0.57))
            img = 'print-sunset.png' if kind == 'sunset' else 'print-gator.png'
            col = (0.92, 0.88, 0.8) if kind == 'sunset' else (0.85, 0.66, 0.08)
            m = M_print(col, img, box=(0.0, 0.25, 0.3, 0.3 * (56 / 68 if kind == 'sunset' else 44 / 80)))
            shell(m, -0.02, 0.47, 0.007, 0.003, 7, None, 0.075, 'tshirt')
            for sd in (-1, 1): sleeve(sd, m, 0.43, 0.16, 0.062, 0.058, 0.0, short=True, seed=sd)
            rib = curve_tube('col', [(math.cos(a) * 0.072 + 0.0, math.sin(a) * 0.075, 0.47 - 0.04 * max(0, math.cos(a)) ** 2, 1) for a in [math.tau * i / 40 for i in range(41)]], 0.006, 12)
            assign(rib, fabric('cotton_jersey', col, 12.0))
        cam((1.25, -0.95, 0.42), (0.0, 0.0, 0.2 if kind not in ('sequins', 'soiree') else 0.05), 50 if kind not in ('sequins', 'soiree') else 40, 5.6)
    return build


# ------------------------------------------------------------------ baskets et piles pliées
def foot_hw(x, L=0.28):
    """demi-largeur de la semelle (x de 0 = talon à L = pointe)"""
    t = x / L
    if t < 0 or t > 1: return 0.0
    w = 0.036 + 0.012 * math.sin(min(1, t / 0.75) * math.pi * 0.85) - 0.005 * math.exp(-((t - 0.45) / 0.12) ** 2)
    if t > 0.85: w *= math.sqrt(max(0.0, 1 - ((t - 0.85) / 0.15) ** 2))
    if t < 0.12: w *= math.sqrt(max(0.0, 1 - ((0.12 - t) / 0.12) ** 2)) * 0.9 + 0.1 * (t / 0.12)
    return w


def sneaker2(upper=(0.85, 0.85, 0.84), accent=(0.75, 0.08, 0.1), sole=(0.92, 0.91, 0.88), loc=(0, 0, 0), rot=0.0, L=0.28, high=False, seed=1):
    """basket générique (sans marque) : semelle intermédiaire épaisse et talon, tige en cuir (champ de hauteur), col rembourré,
    laçage, empiècement latéral de couleur"""
    root = empty('basket', loc, (0, 0, rot))
    # semelle
    out = [(x, foot_hw(x, L) + 0.003) for x in [L * i / 40 for i in range(41)]]
    pts = out + [(x, -y) for (x, y) in reversed(out[1:-1])]
    so = extrude2d('semelle', [(x - L / 2, y) for x, y in pts], 0.03, 0.006); so.location.z = 0.015
    for v in so.data.vertices:
        t = (v.co.x + L / 2) / L
        if t > 0.75: v.co.z += 0.03 * ((t - 0.75) / 0.25) ** 2      # pointe relevée
    assign(so, mat('semelle', sole, 0.55, bump={'scale': 900, 'strength': 0.05})); parent(so, root)
    band = extrude2d('bande', [(x - L / 2, y * 1.002) for x, y in pts], 0.008, 0.002); band.location.z = 0.004; assign(band, mat('gomme', (0.04, 0.035, 0.03), 0.7)); parent(band, root)
    # tige : champ de hauteur au-dessus de l'empreinte ; bout bas et arrondi, cou-de-pied, ouverture du pied au talon
    bm = bmesh.new(); nx, ny = 84, 40; V = {}
    KT = [(0.0, 0.092), (0.2, 0.094), (0.36, 0.088), (0.62, 0.072), (0.85, 0.054), (1.0, 0.04)] if not high else \
         [(0.0, 0.17), (0.2, 0.172), (0.36, 0.15), (0.5, 0.1), (0.62, 0.078), (0.85, 0.056), (1.0, 0.042)]
    def top_z(t):
        for (t0, z0), (t1, z1) in zip(KT, KT[1:]):
            if t0 <= t <= t1:
                k = (t - t0) / (t1 - t0); k = k * k * (3 - 2 * k); return z0 + (z1 - z0) * k
        return KT[-1][1]
    base = 0.028
    def height(x, y):
        t = x / L; hw = foot_hw(x, L) or 1e-4; u = min(1.0, abs(y) / hw)
        return base + (top_z(t) - base) * max(0.0, 1 - u ** 2.4) ** 0.5
    oc, oa, ob = (0.235, 0.12, 0.6) if not high else (0.2, 0.13, 0.62)
    def inside(x, y):
        t = x / L; hw = foot_hw(x, L) or 1e-4
        return ((t - oc) / oa) ** 2 + (y / (ob * hw)) ** 2 < 1.0
    for i in range(nx + 1):
        x = L * (0.01 + 0.98 * i / nx); hw = foot_hw(x, L)
        for j in range(ny + 1):
            y = -hw + 2 * hw * j / ny
            V[(i, j)] = bm.verts.new((x - L / 2, y * 0.985, height(x, y)))
    for i in range(nx):
        for j in range(ny):
            q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            cx = sum(V[k].co.x for k in q) / 4 + L / 2; cy = sum(V[k].co.y for k in q) / 4
            if inside(cx, cy): continue
            bm.faces.new([V[k] for k in q])
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context='VERTS')
    up = mesh_obj('tige', bm); solidify(up, 0.003, 0); subsurf(up, 1)
    def ufn(nt, p, upper=upper, accent=accent):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        side = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', math_node(nt, 'ABSOLUTE', sep.outputs['Y']), 0.026),
                         math_node(nt, 'LESS_THAN', math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', sep.outputs['Z'], math_node(nt, 'ADD', 0.05, math_node(nt, 'MULTIPLY', sep.outputs['X'], -0.12)))), 0.011))
        heel = math_node(nt, 'MULTIPLY', math_node(nt, 'LESS_THAN', sep.outputs['X'], -L / 2 + 0.035), math_node(nt, 'GREATER_THAN', sep.outputs['Z'], 0.045))
        nt.links.new(mix(nt, upper, accent, math_node(nt, 'MAXIMUM', side, heel)), p.inputs['Base Color'])
    assign(up, mat('cuir', upper, 0.42, coat=0.2, coat_rough=0.3, base_fn=ufn, bump={'scale': 500, 'strength': 0.25, 'detail': 4})); parent(up, root)
    # ouverture : col rembourré, doublure et semelle intérieure sombres
    ring = []
    for k in range(48):
        a = k / 48 * math.tau
        t = oc + oa * 0.97 * math.cos(a); x = t * L; hw = foot_hw(x, L)
        y = ob * 0.97 * hw * math.sin(a)
        ring.append((x - L / 2, y * 0.985, height(x, y) + 0.003))
    Mcol = mat('col', (0.05, 0.05, 0.055), 0.6, sheen=0.4)
    collar = curve_tube('col', [(*p_, 1) for p_ in ring], 0.0075, 16, closed=True); assign(collar, Mcol); parent(collar, root)
    bm2 = bmesh.new(); top_r = [bm2.verts.new(p_) for p_ in ring]; bot_r = [bm2.verts.new((p_[0], p_[1], 0.036)) for p_ in ring]
    for k in range(48):
        k2 = (k + 1) % 48; bm2.faces.new((top_r[k], top_r[k2], bot_r[k2], bot_r[k]))
    bm2.faces.new(bot_r)
    bmesh.ops.recalc_face_normals(bm2, faces=bm2.faces)
    lin = mesh_obj('doublure', bm2); assign(lin, mat('doublure', (0.025, 0.025, 0.028), 0.85, sheen=0.3)); parent(lin, root)
    # languette rembourrée qui dépasse de l'ouverture
    tx = (oc + oa * 0.85) * L
    tg = extrude2d('languette', [(-0.03, -0.022), (0.03, -0.024), (0.034, 0.0), (0.03, 0.024), (-0.03, 0.022), (-0.036, 0.0)], 0.007, 0.003)
    tg.location = (tx - L / 2 + 0.012, 0.0, height(tx, 0.0) + 0.006); tg.rotation_euler = (0, math.radians(18), 0); assign(tg, mat('languette', upper, 0.5, sheen=0.3)); parent(tg, root)
    for k in range(5):
        x = L * (0.4 + 0.055 * k)
        hz = height(x, 0.0) + 0.002
        la = curve_tube('lacet', [(x - L / 2, -0.017, hz - 0.004, 1), (x - L / 2 + 0.004, 0.0, hz + 0.0025, 1), (x - L / 2, 0.017, hz - 0.004, 1)], 0.0022, 8)
        assign(la, CL.cotton((0.95, 0.95, 0.95) if upper[0] > 0.3 else (0.08, 0.06, 0.04))); parent(la, root)
        for sd in (-1, 1):
            ey = cyl('oeillet', 0.0028, 0.002, 12, (x - L / 2, sd * 0.018, height(x, sd * 0.018) + 0.0005), (0, 0, 0)); assign(ey, M_chrome(0.3, (0.3, 0.3, 0.32))); parent(ey, root)
    return root


def folded2(colors, mats, loc=(0, 0, 0), rot=0.0, w=0.3, d=0.24, h=0.035):
    root = empty('pile', loc, (0, 0, rot))
    for i, (c, m) in enumerate(zip(colors, mats)):
        b = box('plie', (w, d, h), (0, 0, h / 2 + i * h * 0.97), 0.012); subsurf(b, 2)
        for v in b.data.vertices:
            v.co.z -= 0.003 * (1 - (2 * v.co.x / w) ** 2) * (v.co.z > 0)
        displace(b, 0.0015, 0.04, 'CLOUDS', 2); assign(b, m); b.rotation_euler = (0, 0, (i - 1) * 0.03); parent(b, root)
        fold = box('pli', (w * 0.98, 0.004, h * 0.4), (0, d / 2 - 0.002, h * 0.7 + i * h * 0.97), 0.002); assign(fold, m); fold.rotation_euler = b.rotation_euler; parent(fold, root)
    return root


# ------------------------------------------------------------------ registre
def it_rack():
    def build():
        A.hdri('decor_shop', 0.55, res=HD2K('decor_shop'), cam_hdri_k=0.65, rot=40)
        bpy.context.scene.view_settings.exposure = -0.35
        fl = box('sol', (8, 8, 0.04), (0, 0, -0.02)); assign(fl, A.pbr('smooth_concrete_floor', 1.0, coords='Object', coat=0.4, coat_rough=0.15, sat=0.4))
        ch = M_chrome(0.1)
        bar = cyl('barre', 0.014, 1.6, 32, (0, 0, 1.62), (math.pi / 2, 0, 0)); assign(bar, ch)
        for sd in (-1, 1):
            post = cyl('montant', 0.014, 1.62, 32, (0, sd * 0.8, 0.81)); assign(post, ch)
            ft = cyl('pied', 0.014, 0.5, 32, (0, sd * 0.8, 0.02), (0, math.pi / 2, 0)); assign(ft, ch)
        cols = [(0.62, 0.62, 0.6), (0.05, 0.25, 0.22), (0.5, 0.12, 0.2), (0.03, 0.03, 0.035), (0.75, 0.55, 0.3), (0.1, 0.12, 0.3), (0.85, 0.75, 0.6), (0.3, 0.06, 0.05), (0.06, 0.4, 0.45),
                (0.4, 0.4, 0.42), (0.7, 0.35, 0.45), (0.12, 0.18, 0.1)]
        fabs = ['cotton_jersey', 'rough_linen', 'cotton_jersey', 'denim_fabric', 'rough_linen', 'cotton_jersey']
        for i, c in enumerate(cols):
            y = -0.68 + i * 0.122
            shirt_on_hanger(fabric(fabs[i % len(fabs)], c, 7.0), 0.0, y, 1.6, math.radians(90 + (3 if i % 2 else -3)), i)
        area('spot', (1.2, -1.2, 2.6), (0, 0, 1.2), 1.2, 180, (1.0, 0.92, 0.85))
        area('rose', (-1.6, 0.5, 1.4), (0, 0, 1.2), 0.8, 50, (1.0, 0.3, 0.55))
        area('cyan', (1.6, 1.2, 1.4), (0, 0, 1.2), 0.8, 45, (0.3, 0.75, 1.0))
        cam((1.75, -1.55, 1.35), (0.0, -0.05, 1.18), 40, 5.6)
    return build


def it_hanging(kind):
    def build():
        hd = {'lin': 'hotel_room', 'sequins': 'decor_shop', 'costume': 'lythwood_lounge'}[kind]
        A.hdri(hd, 0.55, res=HD2K(hd), cam_hdri_k=0.6, rot=30)
        bpy.context.scene.view_settings.exposure = -0.35
        wall = box('mur', (4, 0.05, 3), (0, 0.18, 1.4)); assign(wall, A.pbr('concrete_wall_008', 1.0, coords='Object', tint=(0.5, 0.48, 0.46)))
        rail = cyl('tringle', 0.012, 1.2, 32, (0, 0.05, 1.82), (0, math.pi / 2, 0)); assign(rail, M_chrome(0.12))
        if kind == 'lin':
            m = fabric('rough_linen', (0.93, 0.7, 0.72), 5.0, 0.6)
            r = shirt_on_hanger(m, 0.0, 0.05, 1.8, 0.0, 3, JACKET, 0.04, fabric('rough_linen', (0.95, 0.78, 0.8), 5.0, 0.6))
            tr = hanging('pantalon', [(x * 0.95, z * 0.82) for x, z in TROUSERS], fabric('rough_linen', (0.62, 0.85, 0.78), 5.0, 0.6), 0.03, 0.01, 7); tr.location = (0.36, 0.08, 1.74)
            hg = hanger(0.36, 0.08, 1.8);
            for sd in (-1, 1):
                lp = extrude2d('revers', [(0.0, 0.0), (sd * 0.07, 0.02), (sd * 0.13, -0.07), (sd * 0.1, -0.16), (sd * 0.12, -0.2), (sd * 0.02, -0.4)], 0.006, 0.002)
                lp.rotation_euler = (math.pi / 2, 0, 0); lp.location = (0.0, 0.05 - 0.025, 1.8 - 0.03); assign(lp, m)
            for i in range(2):
                b = cyl('bouton', 0.011, 0.005, 32, (0.02, 0.05 - 0.026, 1.8 - 0.45 - i * 0.09), (math.pi / 2, 0, 0), 0.002); assign(b, mat('nacre', (0.85, 0.82, 0.76), 0.2, coat=0.8, film=500))
            cam((0.55, -2.1, 1.35), (0.18, 0.05, 1.35), 50, 4.5)
        elif kind == 'sequins':
            m = CL.sequins((0.62, 0.02, 0.04))
            r = hanging('robe', DRESS, m, 0.03, 0.008, 5); r.location = (0, 0.05, 1.78)
            hg = hanger(0.0, 0.05, 1.8, 0.0, False)
            for sd in (-1, 1):
                st = curve_tube('bretelle', [(sd * 0.045, 0.05, 1.775, 1), (sd * 0.1, 0.05, 1.745, 1)], 0.003, 6); assign(st, m)
            cam((0.4, -1.8, 1.4), (0.0, 0.05, 1.38), 60, 4.0)
        else:
            m = CL.wool((0.012, 0.012, 0.015))
            r = shirt_on_hanger(m, 0.0, 0.05, 1.8, 0.0, 3, JACKET, 0.04, CL.wool((0.012, 0.012, 0.015)))
            shirt = hanging('chemise', [(-0.055, 0.0), (0.055, 0.0), (0.06, -0.38), (0.0, -0.42), (-0.06, -0.38)], CL.cotton((0.88, 0.88, 0.9)), 0.006, 0.0, 1); shirt.location = (0.0, 0.05 - 0.024, 1.78)
            tie = curve_tube('cravate', [(0.0, 0.05 - 0.03, 1.77, 1), (0.0, 0.05 - 0.032, 1.6, 1.2), (0.0, 0.05 - 0.03, 1.45, 1.5)], 0.016, 8); tie.data.bevel_mode = 'ROUND'; assign(tie, CL.satin((0.35, 0.03, 0.05)))
            for sd in (-1, 1):
                lp = extrude2d('revers', [(0.0, 0.0), (sd * 0.07, 0.02), (sd * 0.13, -0.07), (sd * 0.1, -0.16), (sd * 0.12, -0.2), (sd * 0.04, -0.38)], 0.006, 0.002)
                lp.rotation_euler = (math.pi / 2, 0, 0); lp.location = (0.0, 0.05 - 0.026, 1.8 - 0.03); assign(lp, CL.satin((0.01, 0.01, 0.012)))
            ps = extrude2d('pochette', [(-0.03, 0.0), (0.0, 0.03), (0.03, 0.0), (0.035, -0.012), (-0.035, -0.012)], 0.004, 0.002); ps.rotation_euler = (math.pi / 2, 0, 0); ps.location = (-0.14, 0.05 - 0.028, 1.58)
            assign(ps, CL.satin((0.9, 0.9, 0.92)))
            cam((0.45, -1.9, 1.42), (0.0, 0.05, 1.42), 55, 4.0)
        area('spot', (0.8, -1.5, 2.6), (0, 0, 1.4), 1.0, 90, (1.0, 0.92, 0.85))
        area('rose', (-1.2, -0.3, 1.6), (0, 0, 1.4), 0.6, 18, (1.0, 0.35, 0.6))
        area('cyan', (1.4, -0.2, 1.6), (0, 0, 1.4), 0.6, 15, (0.3, 0.75, 1.0))
    return build


def tee2(color, print_img=None, loc=(0, 0, 0), rot=0.0, scale=1.0, fab='cotton_jersey'):
    """t-shirt à plat : tissu scanné + impression (même projection que clothes.tee)"""
    o = CL.tee(color, print_img, loc, rot, scale)
    if print_img is None:
        for c in o.children:
            if c.type == 'MESH': assign(c, fabric(fab, color, 7.0))
    return o


def it_flat(fn, cam_=None, surface='wood', hd='studio_small_09'):
    def build():
        scene(hd, 0.6, 0.0, surface=surface, rims=True)
        fn()
        (cam_ or (lambda: top_cam()))()
    return build


def it_shelf(fn, cam_, hd='decor_shop'):
    def build():
        A.hdri(hd, 0.55, res=HD2K(hd), cam_hdri_k=0.65, rot=40)
        bpy.context.scene.view_settings.exposure = -0.35
        sh = box('etagere', (1.6, 0.5, 0.03), (0, 0.05, -0.015), 0.004); assign(sh, A.pbr('dark_wood', 3.0, coords='Object', coat=0.5, coat_rough=0.1))
        wall = box('fond', (2.0, 0.04, 1.2), (0, 0.32, 0.5)); assign(wall, A.pbr('concrete_wall_008', 1.0, coords='Object', tint=(0.45, 0.43, 0.42)))
        area('cle', (0.4, -0.8, 0.9), (0, 0, 0.05), 0.9, 30, (1.0, 0.93, 0.85))
        area('rose', (-0.9, -0.2, 0.5), (0, 0, 0.05), 0.5, 7, (1.0, 0.35, 0.6))
        area('cyan', (0.9, 0.0, 0.5), (0, 0, 0.05), 0.5, 6, (0.3, 0.75, 1.0))
        fn(); cam_()
    return build


def it_masks():
    def build():
        A.hdri('decor_shop', 0.5, res=HD2K('decor_shop'), cam_hdri_k=0.55, rot=40)
        bpy.context.scene.view_settings.exposure = -0.35
        from .guns2 import M_pegboard
        wall = box('panneau', (1.6, 0.03, 1.0), (0, 0.15, 0.5)); assign(wall, M_pegboard())
        hockey_mask((-0.32, 0.08, 0.5), (0, 0, math.radians(-90)))
        g = scanned('old_gas_mask', (0.0, 0.1, 0.12), (0, 0, math.radians(180)))
        dv = CL.mask_on_head
        # masque de diable : coque rouge seule (sans tête), cornes
        from . import head2, hair as H
        head2.install()
        root = empty('masque_diable', (0.32, 0.08, 0.5), (0, 0, math.radians(-90)))
        bm = bmesh.new(); seg, rings = 72, 60; grid = []
        for j in range(rings + 1):
            th = math.pi * (0.08 + 0.7 * j / rings); row = []
            for i in range(seg + 1):
                ph = -math.pi * 0.5 + math.pi * 1.0 * i / seg
                d = Vector((math.sin(th) * math.cos(ph), math.sin(th) * math.sin(ph), math.cos(th)))
                r = H.head_radius((d.x, d.y, d.z)) + 0.008
                r += 0.012 * math.exp(-((d.z - 0.32) ** 2) / 0.004) * math.exp(-((abs(d.y) - 0.35) ** 2) / 0.02) * max(0, d.x)
                row.append(bm.verts.new(d * r))
            grid.append(row)
        for a_, b_ in zip(grid, grid[1:]):
            for i in range(seg): bm.faces.new((a_[i], a_[i + 1], b_[i + 1], b_[i]))
        mk = mesh_obj('latex', bm); solidify(mk, 0.004, 0); subsurf(mk, 1); parent(mk, root)
        assign(mk, mat('latex', (0.32, 0.03, 0.05), 0.35, coat=0.5, coat_rough=0.25, sss=0.2, sss_radius=(1, 0.3, 0.2), sss_scale=0.004, bump={'scale': 300, 'strength': 0.15}))
        for sd in (-1, 1):
            hn = curve_tube('corne', [(0.02, sd * 0.045, 0.105, 1.0), (0.03, sd * 0.07, 0.14, 0.7), (0.0, sd * 0.085, 0.175, 0.35), (-0.025, sd * 0.08, 0.19, 0.05)], 0.016, 16)
            assign(hn, mat('corne', (0.08, 0.06, 0.05), 0.35, coat=0.4)); parent(hn, root)
        area('cle', (0.3, -1.2, 1.2), (0, 0.1, 0.45), 1.0, 45, (1.0, 0.93, 0.85))
        area('rose', (-1.0, -0.4, 0.6), (0, 0.1, 0.45), 0.5, 10, (1.0, 0.35, 0.6))
        area('cyan', (1.0, -0.3, 0.6), (0, 0.1, 0.45), 0.5, 9, (0.3, 0.75, 1.0))
        cam((0.0, -1.55, 0.5), (0.0, 0.1, 0.42), 50, 6.3)
    return build


def gold_chain(loc=(0, 0, 0), n=60, r=0.07, seed=1):
    root = empty('chaine', loc); R = random.Random(seed); g = M_chrome(0.12, (1.0, 0.76, 0.36))
    for i in range(n):
        a = i / n * math.tau; x = math.cos(a) * r * 1.2; y = math.sin(a) * r * 0.8
        lk = lathe('maillon', [(0.0035, -0.0012), (0.0055, -0.0012), (0.0055, 0.0012), (0.0035, 0.0012)], 16); lk.scale = (1.4, 1.0, 1.0)
        lk.location = (x, y, 0.0016); lk.rotation_euler = (math.pi / 2 if i % 2 else 0.25, 0, a + math.pi / 2); assign(lk, g); parent(lk, root)
    return root


ITEMS = {
    'milliers-de-tenues': it_rack(),
    'tenues-gagnees-en-mission': it_flat(lambda: (CL.jacket((0.02, 0.022, 0.025), (0.0, 0.08, 0), -0.05, None, 3, fabric('denim_fabric', (0.03, 0.035, 0.04), 6.0)),
                                                  CL.gloves((0.42, -0.3, 0), 0.4), CL.cap((-0.42, -0.32, 0), (0.02, 0.02, 0.022), 0.5), spectacles((0.4, 0.33, 0.0), (0, 0, -0.3))),
                                         lambda: top_cam((0, 0.0, 0), 1.9), 'concrete'),
    'vice-city-style-tenues': it_worn('sunset'),
    'goodtime-gear': it_worn('gator'),
    'jason-costume-lin-pastel': it_worn('lin'),
    'lucia-mini-robe-sequins': it_worn('sequins'),
    'lucia-tenue-de-soiree': it_worn('soiree'),
    'bandana-de-braquage': it_flat(lambda: (CL.bandana((0, 0.02, 0), 0.1), CL.gloves((0.33, -0.28, 0), -0.5)), None, 'leather'),
    'gta5-hauts': it_shelf(lambda: (folded2([(0.05, 0.12, 0.25), (0.62, 0.62, 0.6), (0.45, 0.06, 0.08)], [fabric('cotton_jersey', c, 7.0) for c in ((0.05, 0.12, 0.25), (0.62, 0.62, 0.6), (0.45, 0.06, 0.08))], (-0.2, 0.05, 0), 0.03),
                                    folded2([(0.06, 0.3, 0.25), (0.85, 0.75, 0.55), (0.03, 0.03, 0.035)], [fabric('cotton_jersey', c, 7.0) for c in ((0.06, 0.3, 0.25), (0.85, 0.75, 0.55), (0.03, 0.03, 0.035))], (0.18, 0.05, 0), -0.04)),
                           lambda: cam((0.1, -0.95, 0.42), (0.0, 0.05, 0.07), 50, 5.0)),
    'gta5-pantalons': it_shelf(lambda: (folded2([(0.06, 0.1, 0.2)] * 3, [fabric('denim_fabric', c, 5.0) for c in ((0.08, 0.14, 0.26), (0.05, 0.08, 0.16), (0.15, 0.22, 0.35))], (-0.2, 0.05, 0), 0.03, 0.32, 0.22, 0.04),
                                        folded2([(0.5, 0.4, 0.28)] * 3, [fabric('rough_linen', c, 6.0) for c in ((0.5, 0.42, 0.28), (0.12, 0.14, 0.1), (0.62, 0.58, 0.5))], (0.2, 0.05, 0), -0.03, 0.32, 0.22, 0.04)),
                               lambda: cam((0.1, -0.95, 0.42), (0.0, 0.05, 0.07), 50, 5.0)),
    'gta5-chaussures': it_shelf(lambda: (sneaker2((0.88, 0.88, 0.86), (0.75, 0.08, 0.1), (0.92, 0.91, 0.88), (-0.2, 0.06, 0), 0.5), sneaker2((0.88, 0.88, 0.86), (0.75, 0.08, 0.1), (0.92, 0.91, 0.88), (-0.06, -0.08, 0), 0.3),
                                         sneaker2((0.1, 0.06, 0.035), (0.05, 0.03, 0.02), (0.08, 0.05, 0.03), (0.22, 0.04, 0), -0.4, high=True)), lambda: cam((0.1, -0.85, 0.32), (0.0, 0.0, 0.06), 50, 5.0)),
    'gta5-tenues-completes': it_flat(lambda: (tee2((0.04, 0.2, 0.18), None, (0, 0.3, 0), 0.0, 0.8), CL.pants(fabric('denim_fabric', (0.06, 0.1, 0.2), 5.0), (0, -0.15, 0), 0.0),
                                              CL.sneaker((0.88, 0.88, 0.88), (0.05, 0.4, 0.4), (0.35, -0.42, 0), 0.6), CL.cap((-0.36, 0.4, 0), (0.85, 0.82, 0.75), -0.6)), lambda: top_cam((0, 0.0, 0), 2.1), 'wood'),
    'gta5-costumes-ponsonbys': it_worn('costume'),
    'gta5-chapeaux': it_shelf(lambda: (CL.cap((0.75, 0.08, 0.1), (-0.17, 0.0, 0), 0.6), CL.fedora((0.08, 0.07, 0.065), (0.02, 0.02, 0.022), (0.2, 0.02, 0), 0.0)), lambda: cam((0.05, -0.8, 0.35), (0.0, 0.0, 0.07), 50, 5.0)),
    'gta5-lunettes': it_shelf(lambda: (spectacles((-0.11, 0.0, 0.0), (0, 0, 0.3), (0.03, 0.02, 0.01)), CL.sunglasses((0.12, 0.02, 0), -0.2, (0.6, 0.45, 0.25), (0.15, 0.08, 0.04), True)),
                              lambda: cam((0.0, -0.45, 0.22), (0.0, 0.02, 0.01), 70, 4.0)),
    'gta5-accessoires': it_shelf(lambda: (CL.bag((0.12, 0.06, 0.03), (-0.17, 0.08, 0), 0.15), scanned('digital_wrist_watch', (0.16, -0.02, 0.0), (0, 0, 0.5)), CL.watch((0.27, -0.12, 0), 0.4), gold_chain((0.05, -0.14, 0.0), 50, 0.05)),
                                 lambda: cam((0.05, -0.75, 0.33), (0.03, 0.0, 0.04), 55, 4.5)),
    'gta5-masques-vespucci': it_masks(),
    'gta5-boutons-cologne-parfum': it_flat(lambda: (CL.perfume((-0.05, 0.03, 0), (0.95, 0.55, 0.15)), CL.cufflinks((0.08, -0.06, 0))), lambda: top_cam((0.0, 0.0, 0.04), 0.6, 40, -15, 85, 4.5), 'marble', 'lythwood_lounge'),
}
