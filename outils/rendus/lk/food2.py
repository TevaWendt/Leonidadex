# Consommables v2 : photos de produits réalistes (pains scannés, matières scannées, fonds photographiques HDRI flous).
# Chaque élément : un objet ou un plat posé sur une surface réelle, éclairage de studio + lumière de la salle.
import bpy, bmesh, math, random, os
from mathutils import Vector, Euler, Matrix
from .core import *
from . import assets as A
from . import food as F

HD2K = lambda h: '2k' if os.path.exists(f'{A.ROOT}/hdri/{h}_2k.hdr') else '1k'


def set_scene(hd='warm_bar', k=0.45, cam_k=0.55, rot=0.0, surface='wood', expo=-0.4, key=(-0.35, -0.5, 0.5), key_w=7.0,
              warm=(1.0, 0.85, 0.68), rim=((1.0, 0.3, 0.55), (0.3, 0.75, 1.0)), rim_w=(3.0, 2.6), size=(3.0, 2.4)):
    A.hdri(hd, k, rot=rot, res=HD2K(hd), cam_hdri_k=cam_k)
    bpy.context.scene.view_settings.exposure = expo
    top = box('surface', (size[0], size[1], 0.04), (0, 0.1, -0.02))
    if surface == 'wood':
        m = A.pbr('wood_table_worn', 1.6, coords='Object', coat=0.5, coat_rough=0.1, rough_mul=0.8, tint=(0.75, 0.7, 0.65))
    elif surface == 'dark':
        m = A.pbr('dark_wood', 2.2, coords='Object', coat=0.6, coat_rough=0.08, rough_mul=0.8)
    elif surface == 'steel':
        m = mat('inox', (0.6, 0.6, 0.62), 0.28, metal=1.0, aniso=0.6, bump={'scale': 900, 'strength': 0.03})
    elif surface == 'formica':
        def fn(nt, p):
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 260, 3, 0.5)
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.35, (0.62, 0.6, 0.55)), (0.65, (0.7, 0.68, 0.63))]), p.inputs['Base Color'])
        m = mat('formica', (0.65, 0.63, 0.58), 0.3, coat=0.3, coat_rough=0.15, base_fn=fn)
    elif surface == 'terrazzo':
        m = A.pbr('terrazzo_tiles', 1.2, coords='Object', coat=0.4, coat_rough=0.1, rough_mul=0.7)
    elif surface == 'asphalt':
        m = A.pbr('asphalt_floor', 1.0, coords='Object', bump_k=0.3)
    elif surface == 'concrete':
        m = A.pbr('smooth_concrete_floor', 1.0, coords='Object', rough_mul=0.9)
    elif surface == 'rubber':
        m = mat('caoutchouc', (0.025, 0.025, 0.027), 0.85, bump={'scale': 600, 'strength': 0.25, 'detail': 3})
    else:
        m = surface
    assign(top, m)
    area('cle', key, (0, 0, 0.04), 0.7, key_w, warm)
    if rim:
        area('contre_a', (-0.45, 0.45, 0.22), (0, 0, 0.05), 0.35, rim_w[0], rim[0])
        area('contre_b', (0.45, 0.42, 0.2), (0, 0, 0.05), 0.35, rim_w[1], rim[1])
    return top


def shot(target, dist=0.5, height=0.15, az=-28, lens=90, fstop=2.8):
    a = math.radians(az)
    loc = (target[0] + math.sin(a) * dist, target[1] - math.cos(a) * dist, target[2] + height)
    return cam(loc, target, lens, fstop)


# ------------------------------------------------------------------ pain scanné, coupé en deux
def M_crumb(toast=0.6):
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 110, 6, 0.65)
        vo = voronoi(nt, v, 420, 'F1')
        base = ramp(nt, n.outputs['Fac'], [(0.3, (0.78, 0.6, 0.36)), (0.7, (0.9, 0.76, 0.52))])
        toastc = ramp(nt, n.outputs['Fac'], [(0.3, (0.48, 0.26, 0.1)), (0.7, (0.66, 0.4, 0.17))])
        nt.links.new(mix(nt, base, toastc, toast), p.inputs['Base Color'])
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.55; b.inputs['Distance'].default_value = 0.0015
        nt.links.new(vo.outputs['Distance'], b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    return mat('mie', (0.85, 0.7, 0.45), 0.75, sss=0.2, sss_radius=(1, 0.7, 0.4), sss_scale=0.003, base_fn=fn)


_BUN = {}


def bun_halves(idx=1, cut=0.4, toast=0.55, res='2k'):
    """renvoie (bas, haut, h_bas, h_haut) : demi-pains scannés ; la coupe est bouchée par la mie (grillée)"""
    root, obs = A.model('hamburger_buns', res)
    keep = None
    for o in obs:
        if o.type == 'MESH' and o.name.startswith(f'hamburger_buns_0{idx}'): keep = o
    bpy.context.view_layer.update()
    me_src = keep.data; mw = keep.matrix_world.copy()
    crumb = M_crumb(toast)
    out = []
    for part in ('bas', 'haut'):
        bm = bmesh.new(); bm.from_mesh(me_src); bm.transform(mw)
        xs = [v.co.x for v in bm.verts]; ys = [v.co.y for v in bm.verts]; zs = [v.co.z for v in bm.verts]
        cx, cy, z0, z1 = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, min(zs), max(zs)
        bmesh.ops.translate(bm, verts=bm.verts, vec=(-cx, -cy, -z0))
        zc = (z1 - z0) * cut
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        r = bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(0, 0, zc), plane_no=(0, 0, 1), clear_outer=(part == 'bas'), clear_inner=(part == 'haut'))
        edges = [e for e in bm.edges if e.is_boundary]
        nf = bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=edges)['geom']
        nfaces = [f for f in nf if isinstance(f, bmesh.types.BMFace)]
        for f in nfaces: f.material_index = 1
        if part == 'haut':
            bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, -zc))
        me = bpy.data.meshes.new('pain_' + part); bm.to_mesh(me); bm.free()
        ob = bpy.data.objects.new('pain_' + part, me); link(ob)
        for m in me_src.materials: ob.data.materials.append(m)
        ob.data.materials.append(crumb)
        for p in ob.data.polygons: p.use_smooth = True
        out.append((ob, zc if part == 'bas' else (z1 - z0) - zc))
    for o in obs:
        bpy.data.objects.remove(o)
    bpy.data.objects.remove(root)
    return out[0][0], out[1][0], out[0][1], out[1][1]


def leaf2(rmax=0.07, seed=9, ruffle=0.007, droop=0.008, tint=(0.46, 0.62, 0.2)):
    """feuille de laitue : bord frisé irrégulier (bruit), nervures claires, translucide"""
    R = random.Random(seed); ph = [R.random() * 100 for _ in range(8)]
    bm = bmesh.new(); seg, rings = 260, 26; rows = []
    def nz(a, k):
        return sum(math.sin(a * f + ph[i]) / (1 + i * 0.6) for i, f in enumerate((3, 7, 13, 23, 37, 53)[:k]))
    def edge(a):
        return rmax * (0.86 + 0.05 * nz(a, 3))
    for j in range(rings + 1):
        t = 0.06 + 0.94 * j / rings; row = []
        for i in range(seg):
            a = i / seg * math.tau; rr = edge(a) * t
            frill = ruffle * t ** 3 * (0.6 * math.sin(a * 41 + ph[5] + 3 * math.sin(a * 5 + ph[6])) + 0.4 * math.sin(a * 67 + ph[7]))
            z = frill + 0.002 * t * nz(a * 1.3, 4) - droop * max(0.0, (rr - rmax * 0.72) / (rmax * 0.3)) ** 1.6
            row.append(bm.verts.new((math.cos(a) * rr, math.sin(a) * rr, z)))
        rows.append(row)
    for a_, b_ in zip(rows, rows[1:]):
        for i in range(seg):
            j = (i + 1) % seg; bm.faces.new((a_[i], a_[j], b_[j], b_[i]))
    ob = mesh_obj('feuille', bm); solidify(ob, 0.0006, 0)
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 40, 5, 0.6)
        vor = voronoi(nt, v, 70, 'DISTANCE_TO_EDGE')
        veins = ramp(nt, vor.outputs['Distance'], [(0.0, (0.92, 0.95, 0.7)), (0.05, (0.75, 0.85, 0.5)), (0.12, (1, 1, 1)), (1.0, (1, 1, 1))])
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        rr = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', sep.outputs['X'], sep.outputs['X']), math_node(nt, 'MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])))
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.02; mr.inputs['From Max'].default_value = rmax; nt.links.new(rr, mr.inputs['Value'])
        f = math_node(nt, 'ADD', mr.outputs['Result'], math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.35))
        c0 = tuple(min(1, x * 1.6) for x in tint); c1 = tint; c2 = tuple(x * 0.62 for x in tint)
        grad = ramp(nt, f, [(0.0, (0.86, 0.9, 0.62)), (0.35, c0), (0.7, c1), (1.0, c2)])
        nt.links.new(mix(nt, grad, veins, 1.0, 'MULTIPLY'), p.inputs['Base Color'])
    assign(ob, mat('laitue', tint, 0.38, coat=0.25, coat_rough=0.15, sss=0.6, sss_radius=(0.5, 1.0, 0.3), sss_scale=0.003, trans=0.0, base_fn=fn, bump={'scale': 300, 'strength': 0.15}))
    return ob


def leaf_piece(L=0.075, W=0.05, seed=1, tint=(0.46, 0.62, 0.2), droop=0.012):
    """morceau de feuille de laitue : contour irrégulier, grandes ondulations, bord qui retombe"""
    R = random.Random(seed); ph = [R.random() * 100 for _ in range(10)]
    nu, nv = 70, 46
    bm = bmesh.new(); grid_ = {}
    for i in range(nu + 1):
        u = i / nu
        for j in range(nv + 1):
            v = (j / nv - 0.5) * 2
            half = W / 2 * (math.sin(math.pi * min(1.0, u * 1.08)) ** 0.6) * (1 + 0.12 * math.sin(u * 9 + ph[0]) + 0.06 * math.sin(u * 23 + ph[1]))
            x = u * L; y = v * half
            edge = abs(v)
            z = 0.004 * math.sin(u * 11 + v * 3 + ph[2]) * u + 0.0025 * math.sin(v * 9 + u * 20 + ph[3]) * edge \
                + 0.0012 * math.sin(u * 47 + v * 13 + ph[4]) * edge ** 2 - droop * max(0.0, u - 0.55) ** 1.5 / 0.45 ** 1.5
            grid_[(i, j)] = bm.verts.new((x, y, z))
    for i in range(nu):
        for j in range(nv):
            bm.faces.new((grid_[(i, j)], grid_[(i + 1, j)], grid_[(i + 1, j + 1)], grid_[(i, j + 1)]))
    ob = mesh_obj('laitue', bm); solidify(ob, 0.0006, 0)
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 45, 5, 0.6)
        vor = voronoi(nt, v, 60, 'DISTANCE_TO_EDGE')
        veins = ramp(nt, vor.outputs['Distance'], [(0.0, (0.95, 0.97, 0.75)), (0.05, (0.8, 0.88, 0.55)), (0.12, (1, 1, 1)), (1.0, (1, 1, 1))])
        c0 = tuple(min(1, x * 1.7) for x in tint); c2 = tuple(x * 0.7 for x in tint)
        grad = ramp(nt, n.outputs['Fac'], [(0.25, c0), (0.55, tint), (0.8, c2)])
        nt.links.new(mix(nt, grad, veins, 1.0, 'MULTIPLY'), p.inputs['Base Color'])
    assign(ob, mat('laitue', tint, 0.4, coat=0.2, coat_rough=0.2, sss=0.6, sss_radius=(0.5, 1.0, 0.3), sss_scale=0.003, base_fn=fn, bump={'scale': 320, 'strength': 0.15}))
    return ob


def lettuce2(rmax=0.066, seed=9, n=4):
    R = random.Random(seed); out = []
    for k in range(n):
        a = k / n * math.tau + R.uniform(-0.4, 0.4)
        pc = leaf_piece(0.045 + rmax * 0.38 + R.uniform(0, 0.01), 0.042 + R.uniform(0, 0.014), seed * 10 + k, droop=0.007 + R.uniform(0, 0.006))
        pc.location = (math.cos(a) * 0.012, math.sin(a) * 0.012, 0.0008 * k); pc.rotation_euler = (0, 0, a)
        out.append(pc)
    return out


def cheese2(s=0.096, droop=0.02, rot=0.3, seed=4):
    R = random.Random(seed)
    ob = grid('fromage', s, s, 64, 64)
    ph = [R.random() * 6 for _ in range(4)]
    for v in ob.data.vertices:
        x, y = v.co.x, v.co.y
        cx, cy = max(abs(x) - (s / 2 - 0.01), 0), max(abs(y) - (s / 2 - 0.01), 0)
        if cx > 0 and cy > 0:
            k = 0.01 / max(math.hypot(cx, cy), 1e-6)
            if k < 1: x = math.copysign(s / 2 - 0.01 + cx * k, x); y = math.copysign(s / 2 - 0.01 + cy * k, y); v.co.x, v.co.y = x, y
        rr = math.hypot(x, y); d = max(0.0, min(1.0, (rr - 0.044) / 0.03))
        wav = 0.0025 * math.sin(math.atan2(y, x) * 5 + ph[0]) * d
        v.co.z = -droop * (d * d * (3 - 2 * d)) * (rr / 0.068) + wav
        # le fromage fondu se rétracte un peu vers le centre en tombant
        if d > 0: v.co.x *= 1 - 0.05 * d * d; v.co.y *= 1 - 0.05 * d * d
    solidify(ob, 0.0016, 0); subsurf(ob, 1)
    ob.rotation_euler = (0, 0, rot)
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 60, 3, 0.5)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (0.96, 0.5, 0.06)), (0.7, (1.0, 0.6, 0.12))]), p.inputs['Base Color'])
    assign(ob, mat('cheddar', (0.98, 0.55, 0.09), 0.25, coat=0.5, coat_rough=0.15, sss=0.7, sss_radius=(1, 0.5, 0.12), sss_scale=0.004, base_fn=fn, bump={'scale': 400, 'strength': 0.05}))
    return ob


def patty2(r=0.058, h=0.017, seed=3, crispy=False):
    ob = lathe('steak', [(0, 0), (r * 0.88, 0), (r * 0.98, h * 0.2), (r * 1.02, h * 0.55), (r * 0.97, h * 0.9), (r * 0.85, h), (0, h * 1.02)], 128)
    F.jitter_radial(ob, r * 0.06, 6, seed); subsurf(ob, 2)
    if crispy:
        displace(ob, 0.0028, 0.003, 'CLOUDS', 4)
        def fn(nt, p): F.color_by_z(nt, p, 0, h, [(0.0, (0.42, 0.2, 0.05)), (0.5, (0.72, 0.42, 0.12)), (1.0, (0.58, 0.3, 0.08))], 140, 0.6)
        assign(ob, mat('panure', (0.7, 0.4, 0.1), 0.6, coat=0.25, coat_rough=0.3, sss=0.1, base_fn=fn, bump={'scale': 160, 'strength': 0.8, 'detail': 8}))
    else:
        displace(ob, 0.003, 0.004, 'CLOUDS', 4)
        def fn(nt, p):
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 140, 10, 0.72)
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.25, (0.03, 0.016, 0.009)), (0.5, (0.085, 0.042, 0.02)), (0.72, (0.17, 0.085, 0.035)), (0.85, (0.24, 0.13, 0.055))]), p.inputs['Base Color'])
        assign(ob, mat('viande', (0.08, 0.04, 0.02), 0.5, coat=0.18, coat_rough=0.3, sss=0.05, sss_radius=(1, 0.3, 0.2), base_fn=fn, bump={'scale': 200, 'strength': 0.9, 'detail': 10}))
    return ob


def pickles(n=2, r=0.016, seed=5):
    R = random.Random(seed); out = []
    for i in range(n):
        ob = cyl('cornichon', r * (0.9 + 0.2 * R.random()), 0.003, 48); subsurf(ob, 1)
        ob.location = (R.uniform(-0.035, 0.035), R.uniform(-0.035, 0.035), 0.0015); ob.rotation_euler = (R.uniform(-0.1, 0.1), R.uniform(-0.1, 0.1), 0)
        def fn(nt, p, r=r):
            tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
            rr = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', sep.outputs['X'], sep.outputs['X']), math_node(nt, 'MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])))
            mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0; mr.inputs['From Max'].default_value = r; nt.links.new(rr, mr.inputs['Value'])
            nt.links.new(ramp(nt, mr.outputs['Result'], [(0.0, (0.55, 0.6, 0.25)), (0.45, (0.62, 0.66, 0.3)), (0.55, (0.4, 0.48, 0.14)), (0.85, (0.45, 0.52, 0.16)), (0.92, (0.12, 0.2, 0.04)), (1.0, (0.1, 0.17, 0.03))]), p.inputs['Base Color'])
        assign(ob, mat('cornichon', (0.4, 0.5, 0.15), 0.25, coat=0.5, sss=0.5, sss_radius=(0.6, 1, 0.3), sss_scale=0.003, base_fn=fn, bump={'scale': 300, 'strength': 0.1}))
        out.append(ob)
    return out


def sauce_drip(color=(0.6, 0.04, 0.02), loc=(0.05, 0, 0), rot=0.0, size=0.012, seed=1):
    ob = sphere('sauce', size, loc, (1.6, 1.0, 0.35), 24, 12); ob.rotation_euler = (0, 0, rot)
    displace(ob, 0.0012, 0.006, 'CLOUDS', 2)
    assign(ob, mat('sauce', color, 0.15, coat=0.7, coat_rough=0.05, sss=0.5, sss_radius=(1, 0.3, 0.2), sss_scale=0.002))
    return ob


def burger(kind='classic', rot=-0.4, idx=1):
    root = empty('burger'); z = 0.0
    bot, top, hb, ht = bun_halves(idx)
    def add(objs, hgt):
        nonlocal z
        for o in (objs if isinstance(objs, list) else [objs]):
            o.location.z += z; parent(o, root)
        z += hgt
    chick, dbl = kind == 'chicken', kind == 'double'
    add(bot, hb - 0.001)
    add(patty2(0.058, 0.017 if not chick else 0.021, 3, chick), 0.0165 if not chick else 0.02)
    if not chick: add(cheese2(0.104, 0.024, 0.25), 0.0018)
    if dbl:
        add(patty2(0.057, 0.017, 7), 0.0165); add(cheese2(0.094, 0.02, 1.0, 7), 0.0018)
    if not chick: add(pickles(2, 0.016, 5 + idx), 0.003)
    add([F.tomato(0.032, (-0.022, 0.012, 0), 0.2), F.tomato(0.031, (0.024, -0.016, 0), 1.2)], 0.0054)
    lt = lettuce2(0.064, 9 + idx); add(lt, 0.0055)
    top.location.z = z; parent(top, root)
    root.rotation_euler = (0, 0, rot)
    return root, z + ht


# ------------------------------------------------------------------ boissons
def label_mat(name, c1, c2, accent=(1, 1, 1), kind='swoosh', metal=0.0):
    """étiquette de canette sans texte ni logo : dégradé de deux couleurs et une vague claire"""
    def fn(nt, p):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        ang = math_node(nt, 'ARCTAN2', sep.outputs['Y'], sep.outputs['X'])
        mr = nt.nodes.new('ShaderNodeMapRange'); mr.inputs['From Min'].default_value = 0.0; mr.inputs['From Max'].default_value = 0.12; nt.links.new(sep.outputs['Z'], mr.inputs['Value'])
        grad = ramp(nt, mr.outputs['Result'], [(0.0, c2), (1.0, c1)])
        wave = math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', ang, 1.0)), 0.025), 0.06)
        d = math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', sep.outputs['Z'], wave))
        band = math_node(nt, 'LESS_THAN', d, 0.009 if kind == 'swoosh' else 0.004)
        band2 = math_node(nt, 'LESS_THAN', math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', sep.outputs['Z'], math_node(nt, 'ADD', wave, 0.018))), 0.0025)
        col = mix(nt, grad, accent, math_node(nt, 'MAXIMUM', band, band2))
        nt.links.new(col, p.inputs['Base Color'])
    return mat(name, c1, 0.22, metal=metal, coat=0.8, coat_rough=0.06, base_fn=fn)


def can(label, h=0.122, r=0.033, loc=(0, 0, 0), rot=(0, 0, 0), droplets=True, seed=1):
    """canette (profil réel) : fond bombé, corps étiqueté, épaulement et couvercle d'aluminium, languette"""
    root = empty('canette', loc, rot)
    alu = mat('alu', (0.8, 0.81, 0.83), 0.22, metal=1.0, aniso=0.5)
    prof = [(0.0, 0.004), (r * 0.62, 0.0), (r * 0.9, 0.002), (r, 0.012), (r, h - 0.014), (r * 0.82, h - 0.002), (r * 0.8, h), (r * 0.78, h + 0.0015), (r * 0.74, h + 0.0015), (r * 0.74, h - 0.002), (0.0, h - 0.0025)]
    body = lathe('corps', prof, 128); body.data.materials.append(label); body.data.materials.append(alu)
    for poly in body.data.polygons:
        z = poly.center.z
        poly.material_index = 0 if 0.014 < z < h - 0.016 else 1
    parent(body, root)
    tab = extrude2d('languette', [(-0.006, -0.004), (0.014, -0.006), (0.016, 0.0), (0.014, 0.006), (-0.006, 0.004)], 0.0008, 0.0003)
    tab.location = (0.002, 0, h - 0.0015); assign(tab, alu); parent(tab, root)
    if droplets:
        R = random.Random(seed); bm = bmesh.new()
        for i in range(260):
            a = R.random() * math.tau; z = R.uniform(0.02, h - 0.02); rr = R.uniform(0.0006, 0.0022) * (1.4 if R.random() < 0.1 else 1)
            g = bmesh.ops.create_uvsphere(bm, u_segments=8, v_segments=5, radius=rr)
            for v in g['verts']:
                v.co.z *= 1.25; v.co.x *= 0.45
                c = v.co.copy(); ca, sa = math.cos(a), math.sin(a)
                v.co = Vector((ca * (r + c.x) - sa * c.y, sa * (r + c.x) + ca * c.y, z + c.z))
        d = mesh_obj('gouttes', bm)
        # gouttes de condensation : reflets nets et étiquette visible au travers (sans réfraction piégée, qui noircissait)
        m = bpy.data.materials.new('eau'); m.use_nodes = True; nt = m.node_tree; N = nt.nodes
        for n_ in list(N): N.remove(n_)
        fr = N.new('ShaderNodeFresnel'); fr.inputs['IOR'].default_value = 1.33
        tr = N.new('ShaderNodeBsdfTransparent'); gl = N.new('ShaderNodeBsdfGlossy'); gl.inputs['Roughness'].default_value = 0.03
        mx = N.new('ShaderNodeMixShader'); nt.links.new(math_node(nt, 'ADD', fr.outputs[0], 0.12), mx.inputs[0])
        nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(gl.outputs[0], mx.inputs[2])
        o = N.new('ShaderNodeOutputMaterial'); nt.links.new(mx.outputs[0], o.inputs[0])
        assign(d, m); parent(d, root)
    return root


def bottle_glass(liquid=(0.35, 0.18, 0.02), loc=(0, 0, 0), h=0.24, label=None):
    root = empty('bouteille', loc)
    prof = [(0.0, 0.0), (0.03, 0.0), (0.032, 0.006), (0.032, h * 0.6), (0.026, h * 0.72), (0.0125, h * 0.86), (0.012, h * 0.97), (0.014, h), (0.0, h)]
    gl = lathe('verre', prof, 96); solidify(gl, 0.0025, -1); assign(gl, mat('verre_brun', (0.25, 0.12, 0.03), 0.02, trans=1.0, ior=1.5)); parent(gl, root)
    lq = lathe('liquide', [(0.0, 0.003), (0.029, 0.003), (0.029, h * 0.6), (0.023, h * 0.72), (0.0, h * 0.72)], 64); assign(lq, mat('biere', liquid, 0.05, trans=1.0, ior=1.34)); parent(lq, root)
    if label is not None:
        lb = lathe('etiquette', [(0.0322, h * 0.18), (0.0322, h * 0.5)], 96); assign(lb, label); parent(lb, root)
    cap = cyl('capsule', 0.0145, 0.006, 32, (0, 0, h + 0.002), (0, 0, 0), 0.001); assign(cap, mat('capsule', (0.75, 0.6, 0.2), 0.3, metal=1.0)); parent(cap, root)
    return root


def mug(loc=(0, 0, 0), rot=0.0, coffee=True):
    root = empty('tasse', loc, (0, 0, rot))
    def sp(nt, p):
        v = tex_coord(nt, 'Object', 1.0); vo = voronoi(nt, v, 900, 'F1')
        nt.links.new(ramp(nt, vo.outputs['Distance'], [(0.0, (0.25, 0.2, 0.16)), (0.08, (0.86, 0.82, 0.74)), (1.0, (0.86, 0.82, 0.74))]), p.inputs['Base Color'])
    cer = mat('faience', (0.86, 0.82, 0.74), 0.12, coat=0.8, coat_rough=0.05, base_fn=sp)
    body = lathe('tasse', [(0.0, 0.0), (0.03, 0.0), (0.034, 0.004), (0.041, 0.02), (0.042, 0.085), (0.044, 0.095), (0.04, 0.096), (0.036, 0.09), (0.035, 0.012), (0.0, 0.01)], 96)
    assign(body, cer); parent(body, root)
    hd = curve_tube('anse', [(0.04, 0, 0.078, 1), (0.068, 0, 0.074, 1), (0.072, 0, 0.042, 1), (0.04, 0, 0.026, 1)], 0.0075, 24, profile_seg=6); assign(hd, cer); parent(hd, root)
    if coffee:
        c = cyl('cafe', 0.0355, 0.004, 64, (0, 0, 0.08)); parent(c, root)
        def cf(nt, p):
            tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
            rr = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', sep.outputs['X'], sep.outputs['X']), math_node(nt, 'MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])))
            n = noise(nt, tc.outputs['Object'], 140, 4, 0.6)
            f = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', rr, 0.0355), math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.15))
            nt.links.new(ramp(nt, f, [(0.0, (0.02, 0.008, 0.003)), (0.85, (0.035, 0.015, 0.006)), (0.97, (0.22, 0.12, 0.06)), (1.1, (0.3, 0.17, 0.08))]), p.inputs['Base Color'])
        assign(c, mat('cafe', (0.03, 0.012, 0.005), 0.02, coat=1.0, coat_rough=0.0, base_fn=cf))
    return root


def shaker(loc=(0, 0, 0)):
    root = empty('shaker', loc)
    body = lathe('gobelet', [(0.0, 0.0), (0.04, 0.0), (0.043, 0.006), (0.046, 0.17), (0.0, 0.17)], 96)
    solidify(body, 0.0018, -1); assign(body, mat('plastique_givre', (0.92, 0.94, 0.96), 0.22, trans=0.95, ior=1.49)); parent(body, root)
    sh = lathe('shake', [(0.0, 0.002), (0.0405, 0.002), (0.043, 0.11), (0.0, 0.11)], 64)
    assign(sh, mat('shake', (0.18, 0.09, 0.045), 0.35, sss=0.6, sss_radius=(1, 0.6, 0.4), sss_scale=0.01)); parent(sh, root)
    foam = cyl('mousse', 0.0428, 0.006, 64, (0, 0, 0.113)); assign(foam, mat('mousse', (0.42, 0.28, 0.17), 0.6, sss=0.5)); parent(foam, root)
    lid = lathe('couvercle', [(0.0, 0.17), (0.049, 0.17), (0.05, 0.2), (0.042, 0.205), (0.0, 0.205)], 96); assign(lid, M_plastic((0.015, 0.015, 0.017), 0.35)); parent(lid, root)
    cap = box('bec', (0.03, 0.022, 0.016), (0.02, 0, 0.212), 0.006); assign(cap, M_plastic((0.015, 0.015, 0.017), 0.35)); parent(cap, root)
    for i in range(6):
        g = box('graduation', (0.0005, 0.012, 0.0006), (0.0462, 0, 0.03 + i * 0.022)); g.rotation_euler = (0, 0, 0); assign(g, mat('trait', (0.1, 0.1, 0.1), 0.5)); parent(g, root)
    return root


def scoop_powder(loc=(0, 0, 0), rot=0.0):
    root = empty('dose', loc, (0, 0, rot))
    cupm = M_plastic((0.9, 0.9, 0.9), 0.4)
    c = lathe('cuillere', [(0.0, 0.0), (0.024, 0.0), (0.028, 0.03), (0.026, 0.03), (0.022, 0.003), (0.0, 0.003)], 64); assign(c, cupm); parent(c, root)
    hd = box('manche', (0.07, 0.012, 0.004), (0.06, 0, 0.026), 0.002); assign(hd, cupm); parent(hd, root)
    pw = sphere('poudre', 0.026, (0, 0, 0.026), (1, 1, 0.5)); displace(pw, 0.003, 0.01, 'CLOUDS', 2)
    assign(pw, mat('poudre', (0.42, 0.3, 0.2), 0.95, sheen=0.5)); parent(pw, root)
    sp = sphere('tas', 0.03, (0.07, 0.04, 0.0), (1.4, 1, 0.12)); displace(sp, 0.002, 0.008, 'CLOUDS', 2); assign(sp, mat('poudre', (0.42, 0.3, 0.2), 0.95, sheen=0.5)); parent(sp, root)
    return root


# ------------------------------------------------------------------ en-cas
def wrapper_bar(outer=(0.1, 0.25, 0.75), accent=(0.95, 0.75, 0.1), bar=(0.2, 0.11, 0.05), loc=(0, 0, 0), rot=0.0, kind='proteine', L=0.13, W=0.04, H=0.018, seed=3):
    """barre dans son emballage déchiré : sachet métallisé froissé (impression couleur dehors, aluminium dedans),
    soudure crantée, bord arraché ; la barre dépasse"""
    root = empty('barre', loc, (0, 0, rot))
    R = random.Random(seed)
    # sachet : tube aplati, froissé (déplacements fins), bord ouvert irrégulier
    bm = bmesh.new(); nu, nv = 60, 48; rows = []
    x0, x1 = -L * 0.55, L * 0.08
    for i in range(nu + 1):
        t = i / nu; x = x0 + (x1 - x0) * t
        row = []
        for j in range(nv):
            a = j / nv * math.tau
            y = (W / 2 + 0.003) * math.cos(a); z = (H / 2 + 0.0025) * math.sin(a) + H / 2 + 0.001
            ss = 1.0 + 0.012 * math.sin(a * 2)
            # bout soudé : on pince le sachet
            pinch = max(0.0, (0.06 - t) / 0.06)
            z = H / 2 + 0.001 + (z - H / 2 - 0.001) * (1 - 0.92 * pinch)
            row.append(bm.verts.new((x, y * ss, z)))
        rows.append(row)
    for a_, b_ in zip(rows, rows[1:]):
        for j in range(nv): bm.faces.new((a_[j], a_[(j + 1) % nv], b_[(j + 1) % nv], b_[j]))
    sl = mesh_obj('sachet', bm)
    for v in sl.data.vertices:
        if v.co.x > x1 - 0.004: v.co.x += 0.006 * math.sin(v.co.y * 300 + v.co.z * 200) + 0.004 * R.random()
    solidify(sl, 0.0003, 0); displace(sl, 0.0011, 0.0035, 'CLOUDS', 3); displace(sl, 0.0006, 0.0012, 'CLOUDS', 2)
    def wfn(nt, p, outer=outer, accent=accent):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        st = math_node(nt, 'LESS_THAN', math_node(nt, 'ABSOLUTE', math_node(nt, 'SUBTRACT', sep.outputs['Y'], math_node(nt, 'MULTIPLY', sep.outputs['X'], 0.45))), 0.0055)
        nt.links.new(mix(nt, outer, accent, st), p.inputs['Base Color'])
    assign(sl, mat('emballage', outer, 0.18, metal=0.55, coat=0.7, coat_rough=0.06, base_fn=wfn)); parent(sl, root)
    seal = box('soudure', (0.01, W + 0.012, 0.0016), (x0 - 0.004, 0, H / 2 + 0.001), 0.0004)
    assign(seal, mat('soudure', outer, 0.25, metal=0.5, bump={'kind': 'noise', 'scale': 600, 'strength': 0.6})); parent(seal, root)
    # barre
    b = box('barre', (L * 0.62, W, H), (L * 0.12, 0, H / 2 + 0.001), 0.004); subsurf(b, 2); displace(b, 0.0008, 0.004, 'CLOUDS', 2)
    def bfn(nt, p, bar=bar, kind=kind):
        v = tex_coord(nt, 'Object', 1.0); vo = voronoi(nt, v, 260 if kind != 'chocolat' else 40, 'F1'); n = noise(nt, v, 90, 4, 0.6)
        lo = tuple(c * 0.55 for c in bar); hi = tuple(min(1, c * 1.6) for c in bar)
        nt.links.new(ramp(nt, math_node(nt, 'ADD', vo.outputs['Distance'], math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.3)), [(0.1, lo), (0.5, bar), (0.9, hi)]), p.inputs['Base Color'])
    assign(b, mat('barre', bar, 0.55, sss=0.2, sss_radius=(1, 0.6, 0.4), sss_scale=0.004, base_fn=bfn, bump={'kind': 'voronoi', 'scale': 260, 'strength': 0.5})); parent(b, root)
    return root


def chips(n=24, loc=(0, 0, 0), seed=7, spread=0.07, h=0.02):
    """chips de maïs : triangles bombés, bords irréguliers, cloques et sel"""
    root = empty('chips', loc); R = random.Random(seed)
    def cfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 120, 5, 0.6); vo = voronoi(nt, v, 500, 'F1')
        c = ramp(nt, n.outputs['Fac'], [(0.3, (0.82, 0.55, 0.14)), (0.55, (0.9, 0.66, 0.22)), (0.78, (0.62, 0.34, 0.08))])
        salt = math_node(nt, 'LESS_THAN', vo.outputs['Distance'], 0.08)
        nt.links.new(mix(nt, c, (0.95, 0.95, 0.92), salt), p.inputs['Base Color'])
    M = mat('chips', (0.85, 0.62, 0.25), 0.4, coat=0.2, coat_rough=0.3, sss=0.4, sss_radius=(1, 0.6, 0.3), sss_scale=0.0025, base_fn=cfn, bump={'scale': 260, 'strength': 0.55})
    for i in range(n):
        s_ = 0.028 + R.uniform(0, 0.012)
        pts = [(0.0, s_ * 0.66), (-s_ * 0.58, -s_ * 0.36), (s_ * 0.58, -s_ * 0.36)]
        t = extrude2d('chip', pts, 0.0026, 0.004); subsurf(t, 2)
        for v in t.data.vertices:
            v.co.z += 0.006 * (1 - (v.co.x ** 2 + v.co.y ** 2) / (s_ * s_)) + 0.0025 * math.sin(v.co.x * 110 + i) * math.cos(v.co.y * 90)
        displace(t, 0.0016, 0.003, 'CLOUDS', 3)
        a = R.uniform(0, math.tau); rr = spread * math.sqrt(R.random())
        t.location = (math.cos(a) * rr, math.sin(a) * rr, h * R.random() + 0.003); t.rotation_euler = (R.uniform(-0.6, 0.6), R.uniform(-0.6, 0.6), R.uniform(0, math.tau))
        assign(t, M); parent(t, root)
    return root


def basket(loc=(0, 0, 0), r=0.09, h=0.05, c1=(0.75, 0.06, 0.05), c2=(0.92, 0.9, 0.85)):
    root = empty('barquette', loc)
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        ch = nt.nodes.new('ShaderNodeTexChecker'); ch.inputs['Scale'].default_value = 30; ch.inputs['Color1'].default_value = (*c1, 1); ch.inputs['Color2'].default_value = (*c2, 1)
        nt.links.new(v, ch.inputs['Vector']); nt.links.new(ch.outputs['Color'], p.inputs['Base Color'])
    b = lathe('panier', [(0.0, 0.0), (r * 0.7, 0.0), (r, h), (r * 1.02, h + 0.002)], 96); solidify(b, 0.0012, 0)
    assign(b, mat('papier', c2, 0.8, sss=0.2, base_fn=fn, bump={'scale': 400, 'strength': 0.2})); parent(b, root)
    return root


def candies(n=26, loc=(0, 0, 0), seed=5, spread=0.08):
    root = empty('bonbons', loc); R = random.Random(seed)
    cols = [(0.8, 0.05, 0.05), (0.05, 0.45, 0.12), (0.95, 0.6, 0.05), (0.6, 0.05, 0.4), (0.05, 0.25, 0.7), (0.95, 0.85, 0.75)]
    for i in range(n):
        c = cols[i % len(cols)]; a = R.uniform(0, math.tau); rr = spread * math.sqrt(R.random())
        if i % 3 == 0:   # bonbon emballé (papillote)
            body = sphere('papillote', 0.009, (math.cos(a) * rr, math.sin(a) * rr, 0.008), (1.3, 1, 0.8)); body.rotation_euler = (0, 0, R.uniform(0, math.tau))
            assign(body, mat('cellophane', c, 0.08, trans=0.5, coat=1.0, coat_rough=0.02, ior=1.45)); parent(body, root)
            for sd in (-1, 1):
                tw = sphere('torsade', 0.006, (math.cos(a) * rr + sd * 0.014 * math.cos(body.rotation_euler.z), math.sin(a) * rr + sd * 0.014 * math.sin(body.rotation_euler.z), 0.008), (1.0, 0.5, 0.3))
                tw.rotation_euler = (0, 0, body.rotation_euler.z); displace(tw, 0.0015, 0.002, 'CLOUDS', 2); assign(tw, mat('cellophane', (0.9, 0.9, 0.9), 0.05, trans=0.8, coat=1.0)); parent(tw, root)
        else:
            b = sphere('bonbon', 0.0085, (math.cos(a) * rr, math.sin(a) * rr, 0.0075), (1, 1, 0.75 if i % 2 else 1.0))
            assign(b, mat('sucre', c, 0.06, trans=0.55, sss=0.6, sss_radius=tuple(max(0.1, x) for x in c), sss_scale=0.004, coat=1.0, coat_rough=0.02, ior=1.5)); parent(b, root)
    return root


def choc_bar(loc=(0, 0, 0), rot=0.0, molten=True):
    """tablette de chocolat noir cassée : carrés, cœur fondant qui coule"""
    root = empty('chocolat', loc, (0, 0, rot))
    choc = mat('chocolat', (0.045, 0.02, 0.012), 0.32, coat=0.4, coat_rough=0.15, sss=0.15, sss_radius=(1, 0.5, 0.3), sss_scale=0.003, bump={'scale': 900, 'strength': 0.04})
    car = mat('caramel', (0.55, 0.22, 0.04), 0.12, coat=0.9, coat_rough=0.02, sss=0.7, sss_radius=(1, 0.5, 0.2), sss_scale=0.006)
    for (dx, rot2, nsq) in ((-0.05, 0.0, 3), (0.045, 0.25, 2)):
        for i in range(nsq):
            for j in range(2):
                sq = box('carre', (0.028, 0.028, 0.012), (dx + (i - (nsq - 1) / 2) * 0.03, (j - 0.5) * 0.03, 0.006), 0.003)
                top = box('relief', (0.022, 0.022, 0.004), (dx + (i - (nsq - 1) / 2) * 0.03, (j - 0.5) * 0.03, 0.013), 0.0015)
                for o in (sq, top): assign(o, choc); parent(o, root)
    if molten:
        blob = sphere('coulure', 0.012, (0.0, 0.0, 0.006), (1.0, 2.2, 0.55)); displace(blob, 0.002, 0.008, 'CLOUDS', 2); assign(blob, car); parent(blob, root)
        drop = sphere('flaque', 0.015, (0.004, 0.012, 0.0005), (1.3, 1.6, 0.08)); assign(drop, car); parent(drop, root)
    for i in range(5):
        cr = sphere('eclat', 0.003, (random.uniform(-0.08, 0.08), random.uniform(-0.06, 0.06), 0.002), (1, 0.8, 0.5)); assign(cr, choc); parent(cr, root)
    return root


# ------------------------------------------------------------------ restauration rapide
def fries(n=40, loc=(0, 0, 0), seed=3, sleeve=None, h=0.09):
    root = empty('frites', loc); R = random.Random(seed)
    def ffn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 90, 4, 0.6)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (0.85, 0.52, 0.12)), (0.6, (0.95, 0.66, 0.2)), (0.85, (0.62, 0.32, 0.06))]), p.inputs['Base Color'])
    M = mat('frite', (0.9, 0.6, 0.18), 0.42, coat=0.35, coat_rough=0.25, sss=0.5, sss_radius=(1, 0.7, 0.3), sss_scale=0.003, base_fn=ffn, bump={'scale': 300, 'strength': 0.25})
    for i in range(n):
        L = R.uniform(0.06, h * 1.15)
        f = box('frite', (0.0105, 0.0105, L), (0, 0, 0), 0.0022); displace(f, 0.0008, 0.01, 'CLOUDS', 2)
        f.location = (R.uniform(-0.025, 0.025), R.uniform(-0.012, 0.012), L * 0.5 + R.uniform(0.0, 0.03)); f.rotation_euler = (R.uniform(-0.25, 0.25), R.uniform(-0.25, 0.25), R.uniform(0, 3))
        assign(f, M); parent(f, root)
    if sleeve:
        sv = lathe('cornet', [(0.0, 0.0), (0.032, 0.0), (0.045, 0.085)], 4); sv.scale = (1.0, 0.55, 1.0); sv.rotation_euler = (0, 0, math.pi / 4)
        solidify(sv, 0.0012, 0); assign(sv, mat('carton', sleeve, 0.6, coat=0.3, coat_rough=0.2)); parent(sv, root)
    return root


def drumstick(loc=(0, 0, 0), rot=(0, 0, 0), s=1.0, seed=1):
    """pilon de poulet frit : chair en goutte bosselée, panure épaisse et craquante (relief fort, tons dorés à brun),
    petit bout d'os ocre qui dépasse"""
    root = empty('pilon', loc, rot); root.scale = (s, s, s)
    R = random.Random(seed)
    meat = lathe('pane', [(0.0, 0.0), (0.019, 0.003), (0.029, 0.022), (0.031, 0.042), (0.026, 0.062), (0.016, 0.078), (0.009, 0.088), (0.0, 0.09)], 48)
    for v in meat.data.vertices:
        a_ = math.atan2(v.co.y, v.co.x); k = 1 + 0.08 * math.sin(a_ * 3 + seed) + 0.05 * math.sin(a_ * 5 + v.co.z * 60 + seed * 2)
        v.co.x *= k; v.co.y *= k * 0.92
    subsurf(meat, 2); meat.rotation_euler = (0, math.pi / 2, 0)
    displace(meat, 0.0035, 0.0025, 'CLOUDS', 4); displace(meat, 0.0018, 0.0012, 'CLOUDS', 2)
    def bfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 120, 8, 0.7); n2 = noise(nt, v, 25, 3, 0.5)
        f = math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.7), math_node(nt, 'MULTIPLY', n2.outputs['Fac'], 0.3))
        nt.links.new(ramp(nt, f, [(0.25, (0.3, 0.12, 0.03)), (0.45, (0.55, 0.28, 0.07)), (0.62, (0.74, 0.46, 0.14)), (0.8, (0.86, 0.62, 0.24))]), p.inputs['Base Color'])
    def rfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 200, 4, 0.6)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.35, (0.25,) * 3), (0.65, (0.65,) * 3)]), p.inputs['Roughness'])
    assign(meat, mat('panure', (0.7, 0.42, 0.12), 0.5, coat=0.25, coat_rough=0.3, sss=0.1, sss_radius=(1, 0.5, 0.2), sss_scale=0.003, base_fn=bfn, rough_fn=rfn,
                     bump={'scale': 420, 'strength': 0.7, 'detail': 10})); parent(meat, root)
    bone = lathe('os', [(0.0, 0.0), (0.0052, 0.0), (0.0046, 0.01), (0.0068, 0.016), (0.0062, 0.021), (0.0, 0.022)], 32); bone.rotation_euler = (0, math.pi / 2, 0); bone.location = (0.08, 0, 0)
    displace(bone, 0.0006, 0.004, 'CLOUDS', 2)
    assign(bone, mat('os', (0.45, 0.32, 0.2), 0.5, sss=0.3, bump={'scale': 300, 'strength': 0.2})); parent(bone, root)
    return root


def bucket(loc=(0, 0, 0), r=0.08, h=0.13, c1=(0.72, 0.06, 0.05), c2=(0.92, 0.9, 0.84)):
    root = empty('seau', loc)
    def fn(nt, p):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        ang = math_node(nt, 'ARCTAN2', sep.outputs['Y'], sep.outputs['X'])
        st = math_node(nt, 'GREATER_THAN', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', ang, 9.0)), 0.0)
        nt.links.new(mix(nt, c2, c1, st), p.inputs['Base Color'])
    b = lathe('seau', [(0.0, 0.0), (r * 0.8, 0.0), (r, h), (r * 1.03, h + 0.003)], 96); solidify(b, 0.0015, 0)
    assign(b, mat('carton', c2, 0.55, coat=0.4, coat_rough=0.15, base_fn=fn, bump={'scale': 300, 'strength': 0.08})); parent(b, root)
    return root


def cup(loc=(0, 0, 0), r=0.045, h=0.15, c=(0.72, 0.06, 0.05)):
    root = empty('gobelet', loc)
    b = lathe('gobelet', [(0.0, 0.0), (r * 0.72, 0.0), (r, h)], 96)
    def fn(nt, p):
        tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
        band = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', sep.outputs['Z'], h * 0.35), math_node(nt, 'LESS_THAN', sep.outputs['Z'], h * 0.62))
        nt.links.new(mix(nt, (0.92, 0.9, 0.86), c, band), p.inputs['Base Color'])
    assign(b, mat('gobelet', (0.92, 0.9, 0.86), 0.4, coat=0.5, coat_rough=0.12, base_fn=fn)); parent(b, root)
    lid = lathe('couvercle', [(0.0, h), (r + 0.003, h), (r + 0.004, h + 0.008), (r * 0.8, h + 0.012), (0.0, h + 0.013)], 96); assign(lid, mat('couvercle', (0.92, 0.92, 0.92), 0.25, trans=0.5)); parent(lid, root)
    st = cyl('paille', 0.0035, 0.14, 24, (0.008, 0, h + 0.06), (0.12, 0, 0)); assign(st, M_plastic((0.85, 0.15, 0.12), 0.3)); parent(st, root)
    return root


def plate(loc=(0, 0, 0), r=0.14):
    root = empty('assiette', loc)
    p_ = lathe('assiette', [(0.0, 0.0), (r * 0.62, 0.0), (r * 0.66, 0.008), (r * 0.98, 0.016), (r, 0.018), (r * 0.98, 0.02), (r * 0.66, 0.011), (0.0, 0.011)], 128)
    assign(p_, mat('porcelaine', (0.9, 0.88, 0.84), 0.08, coat=0.9, coat_rough=0.03, sss=0.2)); parent(p_, root)
    return root


def sausage_dog(loc=(0, 0, 0), rot=0.0):
    root = empty('hotdog', loc, (0, 0, rot))
    bun = box('pain', (0.17, 0.056, 0.04), (0, 0, 0.022), 0.02); subsurf(bun, 2); displace(bun, 0.002, 0.02, 'CLOUDS', 2)
    cut = box('fente', (0.2, 0.02, 0.04), (0, 0, 0.045), 0.008); boolean_cut(bun, [cut])
    def bfn(nt, p):
        F.color_by_z(nt, p, 0.0, 0.045, [(0.0, (0.86, 0.66, 0.4)), (0.4, (0.78, 0.48, 0.2)), (1.0, (0.62, 0.32, 0.1))], 30, 0.2)
    assign(bun, mat('pain', (0.75, 0.48, 0.22), 0.5, sss=0.3, sss_radius=(1, 0.6, 0.3), sss_scale=0.004, base_fn=bfn, bump={'scale': 300, 'strength': 0.2})); parent(bun, root)
    sau = lathe('saucisse', [(0.0, -0.1), (0.008, -0.099), (0.0125, -0.094), (0.0135, -0.08), (0.0135, 0.08), (0.0125, 0.094), (0.008, 0.099), (0.0, 0.1)], 48)
    sau.rotation_euler = (0, math.pi / 2, 0); sau.location = (0, 0, 0.038); subsurf(sau, 1)
    assign(sau, mat('saucisse', (0.42, 0.14, 0.06), 0.25, coat=0.6, coat_rough=0.1, sss=0.4, sss_radius=(1, 0.3, 0.2), sss_scale=0.004, bump={'scale': 200, 'strength': 0.1})); parent(sau, root)
    pts = [(-0.085 + i * 0.0085, 0.006 * math.sin(i * 1.3), 0.052, 1) for i in range(21)]
    mus = curve_tube('moutarde', pts, 0.0025, 24, profile_seg=6); assign(mus, mat('moutarde', (0.85, 0.6, 0.02), 0.2, coat=0.6, sss=0.5)); parent(mus, root)
    return root


def tray(loc=(0, 0, 0), L=0.22, W=0.09, c=(0.85, 0.82, 0.74)):
    t = box('barquette', (L, W, 0.03), (loc[0], loc[1], 0.015), 0.006)
    inner = box('creux', (L - 0.008, W - 0.008, 0.03), (loc[0], loc[1], 0.019), 0.004); boolean_cut(t, [inner])
    assign(t, F.M_paper(c) if hasattr(F, 'M_paper') else mat('carton', c, 0.8)); return t


def salad_bowl(loc=(0, 0, 0)):
    root = empty('salade', loc)
    bw = lathe('bol', [(0.0, 0.0), (0.06, 0.0), (0.095, 0.055), (0.097, 0.057)], 96); solidify(bw, 0.0015, 0)
    assign(bw, mat('pet', (0.95, 0.96, 0.97), 0.02, trans=1.0, ior=1.45)); parent(bw, root)
    R = random.Random(4)
    for k in range(9):
        a = k / 9 * math.tau + R.uniform(-0.3, 0.3)
        pc = leaf_piece(0.07, 0.05, 30 + k, droop=0.004); pc.location = (math.cos(a) * 0.01, math.sin(a) * 0.01, 0.012 + k * 0.004); pc.rotation_euler = (R.uniform(-0.5, 0.5), R.uniform(-0.4, 0.4), a)
        parent(pc, root)
    for k in range(5):
        a = R.uniform(0, math.tau); rr = R.uniform(0.01, 0.05)
        tm = sphere('tomate_cerise', 0.011, (math.cos(a) * rr, math.sin(a) * rr, 0.045 + R.uniform(0, 0.01))); assign(tm, mat('tomate', (0.75, 0.05, 0.03), 0.1, coat=0.9, sss=0.6, sss_radius=(1, 0.3, 0.2))); parent(tm, root)
    for k in range(5):
        a = R.uniform(0, math.tau); rr = R.uniform(0.01, 0.06)
        cu = cyl('concombre', 0.013, 0.004, 32, (math.cos(a) * rr, math.sin(a) * rr, 0.05), (R.uniform(-0.4, 0.4), R.uniform(-0.4, 0.4), 0))
        def cfn(nt, p):
            tc = nt.nodes.new('ShaderNodeTexCoord'); sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(tc.outputs['Object'], sep.inputs[0])
            rr_ = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', sep.outputs['X'], sep.outputs['X']), math_node(nt, 'MULTIPLY', sep.outputs['Y'], sep.outputs['Y'])))
            nt.links.new(ramp(nt, math_node(nt, 'DIVIDE', rr_, 0.013), [(0.0, (0.75, 0.82, 0.55)), (0.8, (0.62, 0.78, 0.4)), (0.9, (0.08, 0.25, 0.05)), (1.0, (0.05, 0.18, 0.03))]), p.inputs['Base Color'])
        assign(cu, mat('concombre', (0.6, 0.75, 0.4), 0.2, sss=0.6, sss_radius=(0.6, 1, 0.5), sss_scale=0.003, coat=0.6, base_fn=cfn)); parent(cu, root)
    for k in range(6):
        a = R.uniform(0, math.tau); rr = R.uniform(0.0, 0.05)
        cr = box('croûton', (0.012, 0.012, 0.011), (math.cos(a) * rr, math.sin(a) * rr, 0.052), 0.002); cr.rotation_euler = (R.random(), R.random(), R.random()); displace(cr, 0.001, 0.003, 'CLOUDS', 2)
        assign(cr, mat('crouton', (0.72, 0.48, 0.2), 0.6, bump={'scale': 400, 'strength': 0.5})); parent(cr, root)
    return root


# ------------------------------------------------------------------ gilets pare-balles
def vest(level=3, color=(0.03, 0.03, 0.032), loc=(0, 0, 0), rot=0.0, seed=1):
    """gilet porte-plaques posé à plat : panneau avant (épaisseur selon le niveau), bretelles, sangles MOLLE,
    poches à chargeurs, protections (cou, bas-ventre) au niveau 5"""
    root = empty('gilet', loc, (0, 0, rot))
    t = {1: 0.008, 2: 0.016, 3: 0.022, 4: 0.03, 5: 0.034}[min(level, 5)]
    def fab(nt, p, color=color):
        v = tex_coord(nt, 'Object', 1.0)
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = 1400; wv.inputs['Distortion'].default_value = 0.3; nt.links.new(v, wv.inputs['Vector'])
        wv2 = nt.nodes.new('ShaderNodeTexWave'); wv2.wave_type = 'BANDS'; wv2.bands_direction = 'Y'; wv2.inputs['Scale'].default_value = 1400; nt.links.new(v, wv2.inputs['Vector'])
        n = noise(nt, v, 25, 3, 0.5)
        c = ramp(nt, n.outputs['Fac'], [(0.3, tuple(x * 0.85 for x in color)), (0.7, tuple(min(1, x * 1.15) for x in color))])
        nt.links.new(c, p.inputs['Base Color'])
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.2; b.inputs['Distance'].default_value = 0.0004
        nt.links.new(math_node(nt, 'MULTIPLY', wv.outputs['Fac'], wv2.outputs['Fac']), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    F_ = mat('cordura', color, 0.82, sheen=0.25, base_fn=fab)
    W = 0.32; Hh = 0.38
    outline = [(-W / 2, -Hh / 2), (W / 2, -Hh / 2), (W / 2, Hh * 0.22), (W * 0.36, Hh * 0.36), (W * 0.3, Hh / 2), (W * 0.14, Hh / 2), (W * 0.1, Hh * 0.38), (0.0, Hh * 0.34),
               (-W * 0.1, Hh * 0.38), (-W * 0.14, Hh / 2), (-W * 0.3, Hh / 2), (-W * 0.36, Hh * 0.36), (-W / 2, Hh * 0.22)]
    pan = extrude2d('panneau', outline, t, min(0.006, t * 0.45)); pan.location = (0, 0, t / 2); subsurf(pan, 1); displace(pan, 0.0015, 0.05, 'CLOUDS', 2)
    assign(pan, F_); parent(pan, root)
    if level >= 2:
        for i in range(5 if level > 2 else 3):
            y = -Hh / 2 + 0.03 + i * 0.03
            st = box('molle', (W - 0.04, 0.025, 0.0025), (0, y, t + 0.0012), 0.0008); assign(st, F_); parent(st, root)
            for k in range(7):
                x = -W / 2 + 0.035 + k * (W - 0.07) / 6
                tk = box('point', (0.004, 0.025, 0.003), (x, y, t + 0.0015), 0.0006); assign(tk, mat('fil', tuple(c * 0.6 for c in color), 0.8)); parent(tk, root)
    if level >= 3:
        for i in range(3):
            x = -0.09 + i * 0.09
            pch = box('poche', (0.075, 0.12, 0.03 + 0.006 * (level - 3)), (x, -0.07, t + 0.017), 0.008); subsurf(pch, 1); displace(pch, 0.001, 0.03, 'CLOUDS', 2); assign(pch, F_); parent(pch, root)
            flap = box('rabat', (0.078, 0.04, 0.006), (x, -0.025, t + 0.034 + 0.006 * (level - 3)), 0.003); assign(flap, F_); parent(flap, root)
    for sd in (-1, 1):
        sh = box('bretelle', (0.06, 0.16, t * 0.8 + 0.006), (sd * W * 0.22, Hh / 2 + 0.06, (t * 0.8 + 0.006) / 2), 0.008); subsurf(sh, 1); assign(sh, F_); parent(sh, root)
        cb = box('ceinture', (0.12, 0.09, 0.012), (sd * (W / 2 + 0.055), -Hh / 2 + 0.07, 0.006), 0.004); assign(cb, F_); parent(cb, root)
        vel = box('scratch', (0.045, 0.07, 0.003), (sd * (W / 2 + 0.09), -Hh / 2 + 0.07, 0.013), 0.001); assign(vel, mat('scratch', tuple(c * 0.7 for c in color), 0.95, bump={'scale': 2500, 'strength': 0.6})); parent(vel, root)
    if level >= 4:
        for sd in (-1, 1):
            plate_ = box('plaque_laterale', (0.1, 0.14, 0.02), (sd * (W / 2 + 0.065), -0.02, 0.01), 0.008); subsurf(plate_, 1); assign(plate_, F_); parent(plate_, root)
    if level >= 5:
        col = box('col', (0.2, 0.05, 0.03), (0, Hh * 0.36 + 0.03, 0.02), 0.012); subsurf(col, 1); assign(col, F_); parent(col, root)
        grn = box('bas_ventre', (0.16, 0.12, 0.018), (0, -Hh / 2 - 0.06, 0.009), 0.01); subsurf(grn, 1); assign(grn, F_); parent(grn, root)
    patch = box('ecusson', (0.08, 0.05, 0.003), (0.0, Hh * 0.08, t + 0.0015), 0.002); assign(patch, mat('ecusson', (0.12, 0.12, 0.12) if level != 6 else (0.6, 0.6, 0.62), 0.9, bump={'scale': 2500, 'strength': 0.5})); parent(patch, root)
    return root


# ------------------------------------------------------------------ gilets portés par un buste de présentation
def torso_r(a, z):
    """rayon du buste (mannequin d'exposition, sans tête ni bras) dans la direction a (0 = devant) à la hauteur z"""
    zs = [(-0.42, 0.168, 0.115), (-0.3, 0.178, 0.12), (-0.16, 0.16, 0.112), (-0.02, 0.148, 0.108), (0.1, 0.15, 0.11), (0.22, 0.163, 0.122), (0.32, 0.182, 0.13), (0.4, 0.198, 0.125), (0.45, 0.2, 0.11), (0.49, 0.17, 0.085)]
    if z <= zs[0][0]: hy, hx = zs[0][1], zs[0][2]
    elif z >= zs[-1][0]: hy, hx = zs[-1][1], zs[-1][2]
    else:
        for (z0, y0, x0), (z1, y1, x1) in zip(zs, zs[1:]):
            if z0 <= z <= z1:
                t = (z - z0) / (z1 - z0); t = t * t * (3 - 2 * t); hy, hx = y0 + (y1 - y0) * t, x0 + (x1 - x0) * t; break
    ca, sa = math.cos(a), math.sin(a); p = 2.6
    return (abs(ca / hx) ** p + abs(sa / hy) ** p) ** (-1 / p)


def torso_rc(a, z):
    """rayon avec l'arrondi des épaules (0 au-dessus)"""
    cap = max(0.0, (z - 0.44) / 0.06)
    if cap >= 1: return 0.0
    return torso_r(a, z) * math.sqrt(max(0.0, 1 - cap ** 2)) * (1 - 0.15 * cap)


def torso_surface(origin, d, off=0.0):
    """point de la surface du buste sur le rayon origin + t·d (marche puis dichotomie)"""
    o = Vector(origin); d = Vector(d).normalized()
    def inside(p): return math.hypot(p.x, p.y) < torso_rc(math.atan2(p.y, p.x), p.z)
    t0, t1 = 0.0, 0.0
    for k in range(1, 200):
        t1 = k * 0.004
        if not inside(o + d * t1): break
        t0 = t1
    for _ in range(20):
        tm = (t0 + t1) / 2
        if inside(o + d * tm): t0 = tm
        else: t1 = tm
    return o + d * (t1 + off)


def torso_form(color=(0.03, 0.03, 0.032), z0=-0.02):
    root = empty('buste_expo')
    bm = bmesh.new(); seg = 96; rows = []
    n0 = int(round((0.44 - z0) / 0.01))
    zs = [z0 + i * 0.01 for i in range(n0 + 1)] + [0.45 + 0.05 * math.sin(k / 10 * math.pi / 2) for k in range(1, 11)]
    for z in zs:
        row = []
        for i in range(seg):
            a = i / seg * math.tau; r = torso_r(a, z)
            cap = max(0.0, (z - 0.44) / 0.06)
            r *= math.sqrt(max(0.0, 1 - cap ** 2)) * (1 - 0.15 * cap) if cap < 1 else 0.0
            row.append(bm.verts.new((math.cos(a) * r, math.sin(a) * r, z + 0.02 * cap ** 2 * 0)))
        rows.append(row)
    for a_, b_ in zip(rows, rows[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[(i + 1) % seg], b_[(i + 1) % seg], b_[i]))
    for row, flip in ((rows[0], True), (rows[-1], False)):
        c = bm.verts.new((0, 0, row[0].co.z))
        for i in range(seg):
            f = (row[i], row[(i + 1) % seg], c); bm.faces.new(f if flip else f[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    t = mesh_obj('buste', bm); subsurf(t, 1)
    assign(t, mat('buste', color, 0.45, coat=0.2, coat_rough=0.3, bump={'scale': 1500, 'strength': 0.02})); parent(t, root)
    neck = cyl('cou', 0.058, 0.09, 48, (0.0, 0, 0.5), (0, 0, 0), 0.012); assign(neck, t.data.materials[0]); parent(neck, root)
    pole = cyl('tige', 0.012, 0.93 + z0 + 0.02, 32, (0, 0, (z0 - 0.93) / 2)); assign(pole, M_chrome(0.12)); parent(pole, root)
    base = lathe('pied', [(0.0, 0.0), (0.16, 0.0), (0.165, 0.01), (0.03, 0.025), (0.0, 0.025)], 64); base.location = (0, 0, -0.93); assign(base, M_chrome(0.12)); parent(base, root)
    return root


def vest_worn(level=3, color=(0.03, 0.03, 0.032), seed=1):
    """gilet porte-plaques épousant le buste : panneau avant et arrière (épaisseur selon le niveau), bretelles,
    ceinture latérale, sangles MOLLE, poches à chargeurs ; col et protection basse au niveau 5"""
    root = empty('gilet_porte')
    t = {1: 0.008, 2: 0.016, 3: 0.022, 4: 0.03, 5: 0.034}[min(level, 5)]
    def fab(nt, p, color=color):
        v = tex_coord(nt, 'Object', 1.0)
        wv = nt.nodes.new('ShaderNodeTexWave'); wv.wave_type = 'BANDS'; wv.inputs['Scale'].default_value = 1500; wv.inputs['Distortion'].default_value = 0.3; nt.links.new(v, wv.inputs['Vector'])
        wv2 = nt.nodes.new('ShaderNodeTexWave'); wv2.wave_type = 'BANDS'; wv2.bands_direction = 'Z'; wv2.inputs['Scale'].default_value = 1500; nt.links.new(v, wv2.inputs['Vector'])
        n = noise(nt, v, 30, 3, 0.5)
        nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, tuple(x * 0.82 for x in color)), (0.7, tuple(min(1, x * 1.18) for x in color))]), p.inputs['Base Color'])
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.22; b.inputs['Distance'].default_value = 0.0004
        nt.links.new(math_node(nt, 'MULTIPLY', wv.outputs['Fac'], wv2.outputs['Fac']), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    F_ = mat('cordura', color, 0.8, sheen=0.3, base_fn=fab)
    def panel(front=True, z0=0.07, z1=0.43, half=0.86, neck=0.3, name='panneau', thick=t, topfn=None, a_skip=None):
        bm = bmesh.new(); na, nz = 90, 50; V0 = {}; V1 = {}
        a0 = 0.0 if front else math.pi
        def top(da):
            if topfn: return topfn(da)
            return z1 - (0.07 * (1 - (da / neck) ** 2) if da < neck else 0.0) - (0.1 * ((da - 0.55) / 0.31) ** 2 if da > 0.55 else 0.0)
        for i in range(na + 1):
            a = a0 - half + 2 * half * i / na; da = abs(a - a0); zt = top(da)
            for j in range(nz + 1):
                z = z0 + (zt - z0) * j / nz; r = torso_r(a, z) + 0.004
                V0[(i, j)] = bm.verts.new((math.cos(a) * r, math.sin(a) * r, z)); V1[(i, j)] = bm.verts.new((math.cos(a) * (r + thick), math.sin(a) * (r + thick), z))
        for i in range(na):
            for j in range(nz):
                q = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
                bm.faces.new([V1[k] for k in q]); bm.faces.new([V0[k] for k in reversed(q)])
        for i in range(na):
            for (j, flip) in ((0, False), (nz, True)):
                f = [V1[(i, j)], V1[(i + 1, j)], V0[(i + 1, j)], V0[(i, j)]]; bm.faces.new(f[::-1] if flip else f)
        for j in range(nz):
            for (i, flip) in ((0, True), (na, False)):
                f = [V1[(i, j)], V1[(i, j + 1)], V0[(i, j + 1)], V0[(i, j)]]; bm.faces.new(f[::-1] if flip else f)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        ob = mesh_obj(name, bm); subsurf(ob, 1); assign(ob, F_); parent(ob, root); return ob
    panel(True); panel(False)
    # ceinture latérale (cummerbund) et bretelles
    for sd in (-1, 1):
        cb = panel(True, 0.06, 0.2, 0.62, 0.0, 'ceinture', 0.008, topfn=lambda da: 0.2)
        cb.rotation_euler = (0, 0, sd * math.pi / 2)
    for sd in (-1, 1):
        y = sd * 0.1; pts = []
        for k in range(19):
            phi = math.pi * k / 18
            q = torso_surface((0.0, y, 0.38), (math.cos(phi), 0.0, math.sin(phi)), 0.004 + t * 0.5)
            pts.append((q.x, q.y, q.z, 1))
        st = curve_tube('bretelle', pts, 0.0, 24, profile_seg=1, kind='NURBS'); st.data.bevel_depth = 0.0; st.data.extrude = 0.0
        me_ = to_mesh(st)
        bm = bmesh.new(); vs = []
        for k in range(19):
            phi = math.pi * k / 18
            q = torso_surface((0.0, y, 0.38), (math.cos(phi), 0.0, math.sin(phi)), 0.003)
            n_ = (q - Vector((0.0, y, 0.38))).normalized()
            for w in (-0.025, 0.025):
                for h in (0.0, 0.007 + t * 0.4):
                    vs.append(bm.verts.new(q + Vector((0, w, 0)) + n_ * h))
        for k in range(18):
            b0 = k * 4; b1 = b0 + 4
            for (i0, i1) in ((0, 1), (1, 3), (3, 2), (2, 0)):
                bm.faces.new((vs[b0 + i0], vs[b1 + i0], vs[b1 + i1], vs[b0 + i1]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        sobj = mesh_obj('bretelle_m', bm); subsurf(sobj, 1); assign(sobj, F_); parent(sobj, root)
        bpy.data.objects.remove(me_)
    if level >= 2:
        for i in range(5 if level > 2 else 3):
            z = 0.1 + i * 0.03
            pts = [(math.cos(a) * (torso_r(a, z) + 0.004 + t + 0.0015), math.sin(a) * (torso_r(a, z) + 0.004 + t + 0.0015), z, 1) for a in [-0.55 + 1.1 * k / 24 for k in range(25)]]
            bd = curve_tube('molle', pts, 0.0012, 24, profile_seg=2); bd.data.bevel_mode = 'ROUND'; bd.scale = (1, 1, 1); bd.data.bevel_depth = 0.0012
            bd.data.extrude = 0.0115; assign(bd, F_); parent(bd, root)
    if level >= 3:
        for i in range(3):
            a = -0.34 + i * 0.34; z = 0.14; r = torso_r(a, z) + 0.004 + t
            pch = box('poche', (0.03 + 0.006 * (level - 3), 0.072, 0.115), (math.cos(a) * (r + 0.017), math.sin(a) * (r + 0.017), z), 0.008); pch.rotation_euler = (0, 0, a)
            subsurf(pch, 1); displace(pch, 0.0012, 0.03, 'CLOUDS', 2); assign(pch, F_); parent(pch, root)
            fl = box('rabat', (0.008, 0.075, 0.04), (math.cos(a) * (r + 0.034 + 0.006 * (level - 3)), math.sin(a) * (r + 0.034 + 0.006 * (level - 3)), z + 0.045), 0.003); fl.rotation_euler = (0, 0, a)
            assign(fl, F_); parent(fl, root)
    if level >= 4:
        for sd in (-1, 1):
            a = sd * 1.45; z = 0.14; r = torso_r(a, z) + 0.012
            sp = box('plaque_laterale', (0.02, 0.12, 0.15), (math.cos(a) * r, math.sin(a) * r, z), 0.008); sp.rotation_euler = (0, 0, a); subsurf(sp, 1); assign(sp, F_); parent(sp, root)
    if level >= 5:
        col = lathe('col', [(0.075, 0.0), (0.095, 0.0), (0.1, 0.05), (0.08, 0.06)], 64); col.location = (0, 0, 0.45); assign(col, F_); parent(col, root)
        gr = box('bas_ventre', (0.03, 0.17, 0.13), (torso_r(0, 0.0) + 0.012, 0, -0.04), 0.012); subsurf(gr, 1); assign(gr, F_); parent(gr, root)
    patch = box('ecusson', (0.004, 0.08, 0.05), (torso_r(0, 0.33) + 0.004 + t + 0.002, 0.0, 0.33), 0.002)
    assign(patch, mat('ecusson', (0.12, 0.12, 0.12) if level != 6 else (0.62, 0.62, 0.64), 0.9, bump={'scale': 2500, 'strength': 0.5})); parent(patch, root)
    return root


# ------------------------------------------------------------------ soins
def bandage_roll(loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('bande', loc, rot)
    r_ = cyl('rouleau', 0.03, 0.075, 64, (0, 0, 0.03), (math.pi / 2, 0, 0)); assign(r_, mat('bande', (0.82, 0.72, 0.6), 0.95, sheen=0.6, bump={'scale': 900, 'strength': 0.3})); parent(r_, root)
    tail_ = grid('bout', 0.16, 0.075, 40, 10); tail_.location = (0.11, 0, 0.002); displace(tail_, 0.0015, 0.04, 'CLOUDS', 2); assign(tail_, r_.data.materials[0]); parent(tail_, root)
    return root


def plasters(n=4, loc=(0, 0, 0), seed=2):
    root = empty('pansements', loc); R = random.Random(seed)
    for i in range(n):
        b = box('pansement', (0.072, 0.019, 0.0012), (R.uniform(-0.05, 0.05), R.uniform(-0.04, 0.04), 0.0006), 0.0009); b.rotation_euler = (0, 0, R.uniform(-1, 1))
        assign(b, mat('pansement', (0.78, 0.58, 0.45), 0.6, bump={'kind': 'voronoi', 'scale': 600, 'strength': 0.2})); parent(b, root)
        pad = box('compresse', (0.022, 0.014, 0.0015), (b.location.x, b.location.y, 0.0012), 0.0006); pad.rotation_euler = b.rotation_euler; assign(pad, mat('compresse', (0.92, 0.9, 0.86), 0.9)); parent(pad, root)
    return root


def water_bottle(loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('bouteille_eau', loc, rot)
    prof = [(0.0, 0.0), (0.03, 0.0), (0.033, 0.01)] + [(0.033 - 0.0015 * (i % 2), 0.01 + i * 0.012) for i in range(1, 14)] + [(0.03, 0.18), (0.015, 0.2), (0.013, 0.21), (0.0, 0.21)]
    b = lathe('pet', prof, 96); solidify(b, 0.0005, -1); assign(b, mat('pet', (0.97, 0.98, 1.0), 0.02, trans=1.0, ior=1.45)); parent(b, root)
    w = lathe('eau', [(0.0, 0.002), (0.031, 0.002), (0.031, 0.15), (0.0, 0.15)], 64); assign(w, mat('eau', (1, 1, 1), 0.0, trans=1.0, ior=1.33)); parent(w, root)
    cap = cyl('bouchon', 0.0145, 0.016, 48, (0, 0, 0.218), (0, 0, 0), 0.002); assign(cap, M_plastic((0.1, 0.3, 0.75), 0.3)); parent(cap, root)
    return root


def ifak(loc=(0, 0, 0), rot=0.0, color=(0.45, 0.04, 0.03)):
    """trousse individuelle de premiers secours (tactique) ouverte : garrot, compresse, ciseaux"""
    root = empty('ifak', loc, (0, 0, rot))
    fab = mat('cordura', color, 0.8, sheen=0.3, bump={'scale': 1400, 'strength': 0.2})
    base = box('trousse', (0.2, 0.13, 0.05), (0, 0, 0.025), 0.015); subsurf(base, 1); displace(base, 0.0015, 0.05, 'CLOUDS', 2); assign(base, fab); parent(base, root)
    lid = box('rabat', (0.2, 0.13, 0.01), (0, 0.13, 0.005), 0.01); subsurf(lid, 1); assign(lid, fab); parent(lid, root)
    cross = box('croix_h', (0.05, 0.016, 0.002), (0, 0.13, 0.0105)); assign(cross, mat('blanc', (0.9, 0.9, 0.9), 0.7)); parent(cross, root)
    cross2 = box('croix_v', (0.016, 0.05, 0.002), (0, 0.13, 0.0105)); assign(cross2, cross.data.materials[0]); parent(cross2, root)
    tq = curve_tube('garrot', [(-0.07, -0.02, 0.055, 1), (-0.02, -0.03, 0.06, 1), (0.04, -0.02, 0.058, 1), (0.08, 0.01, 0.055, 1)], 0.006, 16, profile_seg=4)
    tq.data.bevel_mode = 'ROUND'; assign(tq, mat('sangle', (0.02, 0.02, 0.022), 0.8, bump={'scale': 900, 'strength': 0.3})); parent(tq, root)
    wl = cyl('tige', 0.005, 0.08, 24, (0.0, -0.035, 0.066), (0, math.pi / 2, 0.3)); assign(wl, M_plastic((0.03, 0.03, 0.03), 0.4)); parent(wl, root)
    gz = cyl('compresse', 0.022, 0.06, 48, (0.05, 0.03, 0.05), (math.pi / 2, 0, 0)); assign(gz, mat('gaze', (0.92, 0.92, 0.9), 0.95, sheen=0.4)); parent(gz, root)
    return root


# ------------------------------------------------------------------ registre
WARM_RIMS = dict(rim=((1.0, 0.72, 0.45), (0.85, 0.9, 1.0)), rim_w=(3.5, 2.2))


def it_burger(kind, paper, stripe, seed, hd='aft_lounge', idx=1):
    def build():
        set_scene(hd, 0.45, 0.6, rot=40, surface='dark', **WARM_RIMS)
        F.wrapper(0.26, paper, stripe, seed)
        _, top = burger(kind, idx=idx)
        shot((0, 0, top * 0.45), 0.6, 0.1, -24, 85, 3.2)
    return build


def it_coffee():
    def build():
        set_scene('comfy_cafe', 0.6, 0.7, rot=120, surface='wood', expo=-0.2, key=(-0.5, -0.3, 0.45), key_w=5, warm=(1.0, 0.9, 0.78), rim=((1.0, 0.85, 0.6), (0.8, 0.9, 1.0)), rim_w=(2.5, 1.5))
        mug((0, 0, 0), 0.6)
        sp = box('cuillere', (0.12, 0.012, 0.002), (0.09, -0.06, 0.001), 0.001); sp.rotation_euler = (0, 0, 0.5); assign(sp, M_chrome(0.15))
        shot((0.0, 0.0, 0.05), 0.5, 0.15, -30, 85, 2.8)
    return build


def it_shake():
    def build():
        set_scene('gym_01', 0.5, 0.6, rot=60, surface='rubber', expo=-0.3, **WARM_RIMS)
        shaker((0, 0.02, 0)); scoop_powder((0.1, -0.06, 0.0), -0.6)
        shot((0.03, 0.0, 0.1), 0.62, 0.12, -22, 70, 3.2)
    return build


def it_bar(outer, accent, bar, kind='proteine', hd='gym_01', surface='rubber'):
    def build():
        set_scene(hd, 0.5, 0.6, rot=60, surface=surface, expo=-0.3, **WARM_RIMS)
        wrapper_bar(outer, accent, bar, (0, 0, 0), 0.4, kind)
        shot((0.0, 0.0, 0.01), 0.38, 0.16, -18, 85, 3.5)
    return build


def it_chips():
    def build():
        set_scene('hansaplatz', 0.5, 0.65, rot=30, surface='wood', expo=-0.3, **WARM_RIMS)
        bowl = lathe('bol', [(0.0, 0.0), (0.06, 0.0), (0.095, 0.05), (0.097, 0.052), (0.093, 0.052), (0.058, 0.004), (0.0, 0.004)], 96)
        assign(bowl, mat('gres', (0.06, 0.05, 0.045), 0.35, coat=0.6, coat_rough=0.1, bump={'kind': 'voronoi', 'scale': 300, 'strength': 0.05}))
        chips(30, (0, 0, 0.02), 7, 0.06, 0.04); chips(5, (0.14, -0.05, 0.0), 9, 0.04, 0.0)
        sal = lathe('salsa', [(0.0, 0.0), (0.03, 0.0), (0.035, 0.03), (0.0, 0.03)], 48); sal.location = (-0.13, 0.08, 0); assign(sal, mat('ramequin', (0.85, 0.82, 0.76), 0.2, coat=0.7))
        ss = cyl('sauce', 0.032, 0.004, 48, (-0.13, 0.08, 0.026)); displace(ss, 0.0015, 0.008, 'CLOUDS', 2); assign(ss, mat('salsa', (0.45, 0.06, 0.02), 0.2, coat=0.6, sss=0.6, bump={'scale': 200, 'strength': 0.4}))
        shot((0.02, 0.0, 0.035), 0.55, 0.2, -20, 70, 3.2)
    return build


def it_can(label, hd='cinema_lobby', angle=-22, extra=None):
    def build():
        set_scene(hd, 0.5, 0.65, rot=100, surface='steel', expo=-0.3, rim=((0.3, 0.75, 1.0), (1.0, 0.35, 0.6)), rim_w=(4, 3))
        can(label(), loc=(0, 0, 0), rot=(0, 0, 0.6))
        if extra: extra()
        shot((0.0, 0.0, 0.065), 0.5, 0.06, angle, 85, 3.2)
    return build


def ice(n=6, seed=3, spread=0.09):
    R = random.Random(seed)
    for i in range(n):
        a = R.uniform(0, math.tau); rr = R.uniform(0.05, spread)
        c = box('glacon', (0.022, 0.022, 0.02), (math.cos(a) * rr, math.sin(a) * rr, 0.01), 0.004); c.rotation_euler = (0, 0, R.random() * 3); displace(c, 0.0015, 0.01, 'CLOUDS', 2)
        assign(c, mat('glace', (0.95, 0.98, 1.0), 0.15, trans=1.0, ior=1.31))


def it_beer():
    def build():
        set_scene('warm_bar', 0.5, 0.6, rot=0, surface='dark', expo=-0.3, **WARM_RIMS)
        lab = label_mat('biere_canette', (0.85, 0.62, 0.15), (0.6, 0.38, 0.06), (0.55, 0.05, 0.04), 'band', 0.3)
        can(lab, h=0.168, loc=(-0.05, 0.03, 0), rot=(0, 0, 0.3), seed=4)
        gl = lathe('verre', [(0.0, 0.0), (0.03, 0.0), (0.033, 0.004), (0.04, 0.15), (0.0, 0.15)], 96); gl.location = (0.07, -0.02, 0)
        solidify(gl, 0.002, -1); assign(gl, mat('verre', (1, 1, 1), 0.0, trans=1.0, ior=1.5))
        bq = lathe('biere', [(0.0, 0.004), (0.031, 0.004), (0.038, 0.12), (0.0, 0.12)], 64); bq.location = (0.07, -0.02, 0); assign(bq, mat('biere', (0.55, 0.28, 0.02), 0.02, trans=1.0, ior=1.34))
        fm = lathe('mousse', [(0.0, 0.12), (0.038, 0.12), (0.0395, 0.14), (0.0, 0.142)], 64); fm.location = (0.07, -0.02, 0); displace(fm, 0.001, 0.004, 'CLOUDS', 2)
        assign(fm, mat('mousse', (0.92, 0.88, 0.8), 0.6, sss=0.8, sss_radius=(1, 1, 1), sss_scale=0.004))
        shot((0.01, 0.0, 0.075), 0.62, 0.05, -18, 70, 3.2)
    return build


def it_candy():
    def build():
        set_scene('cinema_lobby', 0.5, 0.65, rot=100, surface='steel', expo=-0.3, rim=((0.3, 0.75, 1.0), (1.0, 0.35, 0.6)), rim_w=(3, 2.5))
        bowl = lathe('coupelle', [(0.0, 0.0), (0.05, 0.0), (0.075, 0.04), (0.077, 0.042)], 96); solidify(bowl, 0.003, 0); assign(bowl, mat('verre', (1, 1, 1), 0.0, trans=1.0, ior=1.5))
        candies(20, (0, 0, 0.004), 5, 0.045); candies(9, (0.12, -0.05, 0.0), 8, 0.06)
        shot((0.04, -0.02, 0.02), 0.5, 0.22, -20, 70, 3.5)
    return build


def it_choc():
    def build():
        set_scene('warm_bar', 0.45, 0.6, rot=0, surface='dark', expo=-0.3, **WARM_RIMS)
        wrapper_bar((0.06, 0.03, 0.12), (0.7, 0.55, 0.15), (0.06, 0.03, 0.02), (-0.1, 0.08, 0), 0.3, 'chocolat')
        choc_bar((0.03, -0.02, 0), -0.2)
        shot((0.0, 0.0, 0.01), 0.42, 0.17, -15, 85, 3.5)
    return build


def it_diner_meal():
    def build():
        set_scene('aft_lounge', 0.45, 0.6, rot=40, surface='formica', **WARM_RIMS)
        plate((0, 0, 0), 0.14)
        root, top = burger('classic', idx=2); root.location = (-0.03, 0.02, 0.011); root.scale = (0.85, 0.85, 0.85)
        fr = fries(26, (0.08, -0.05, 0.012), 4, None, 0.06)
        for o in fr.children: o.rotation_euler = (math.radians(80), 0, o.rotation_euler.z); o.location.z = 0.006 + abs(o.location.z) * 0.1
        ram = lathe('ramequin', [(0.0, 0.0), (0.022, 0.0), (0.026, 0.025), (0.0, 0.025)], 64); ram.location = (0.1, 0.07, 0.011); assign(ram, mat('inox', (0.75, 0.75, 0.77), 0.2, metal=1.0))
        kp = cyl('ketchup', 0.023, 0.004, 48, (0.1, 0.07, 0.033)); assign(kp, mat('ketchup', (0.55, 0.03, 0.02), 0.08, coat=0.9, sss=0.6))
        gl = lathe('coupe', [(0.0, 0.0), (0.035, 0.0), (0.012, 0.012), (0.01, 0.08), (0.045, 0.2), (0.0, 0.2)], 96); gl.location = (-0.12, 0.22, 0); solidify(gl, 0.002, -1); assign(gl, mat('verre', (1, 1, 1), 0.0, trans=1.0, ior=1.5))
        ms = lathe('milkshake', [(0.0, 0.085), (0.012, 0.085), (0.042, 0.19), (0.0, 0.19)], 64); ms.location = (-0.12, 0.22, 0); assign(ms, mat('milkshake', (0.85, 0.45, 0.55), 0.5, sss=0.7, sss_radius=(1, 0.7, 0.7), sss_scale=0.01))
        cr = sphere('chantilly', 0.042, (-0.12, 0.22, 0.205), (1, 1, 0.6)); displace(cr, 0.004, 0.01, 'CLOUDS', 2); assign(cr, mat('creme', (0.95, 0.93, 0.9), 0.6, sss=0.8, sss_radius=(1, 1, 1), sss_scale=0.005))
        ch = sphere('cerise', 0.011, (-0.12, 0.22, 0.24)); assign(ch, mat('cerise', (0.5, 0.01, 0.03), 0.05, coat=1.0, sss=0.5))
        shot((0.0, 0.03, 0.05), 0.75, 0.25, -22, 70, 3.5)
    return build


def it_hotdog():
    def build():
        set_scene('cobblestone_street_night', 0.6, 0.7, rot=200, surface='wood', expo=-0.2, **WARM_RIMS)
        tray((0, 0, 0), 0.22, 0.09, (0.86, 0.83, 0.75)); sausage_dog((0, 0, 0.004), 0.0)
        shot((0.0, 0.0, 0.03), 0.48, 0.16, -25, 70, 3.2)
    return build


def it_cluckin(size):
    def build():
        set_scene('warm_restaurant_night', 0.45, 0.6, rot=60, surface='formica', **WARM_RIMS)
        R = random.Random(size)
        if size == 1:
            bx = box('boite', (0.14, 0.1, 0.06), (0, 0, 0.03), 0.004); inner = box('creux', (0.13, 0.09, 0.06), (0, 0, 0.034), 0.003); boolean_cut(bx, [inner])
            assign(bx, mat('carton', (0.78, 0.08, 0.06), 0.55, coat=0.3))
            drumstick((-0.035, -0.01, 0.035), (0.2, 0.1, 0.4), 0.9, 1); drumstick((0.02, 0.015, 0.04), (0.1, -0.2, 2.6), 0.85, 2)
            fries(18, (0.13, 0.02, 0.0), 2, (0.78, 0.08, 0.06), 0.08)
            shot((0.04, 0.0, 0.05), 0.55, 0.22, -20, 70, 3.5)
        else:
            n_b = 1 if size == 2 else 2
            for b_ in range(n_b):
                bx_, by_ = (-0.02 + b_ * 0.2, 0.02 + b_ * 0.06)
                bucket((bx_, by_, 0.0), 0.085 + 0.01 * (size - 2), 0.13 + 0.02 * (size - 2))
                for k in range(5 if size == 2 else 7):
                    a = k / 5 * math.tau + R.uniform(-0.3, 0.3)
                    drumstick((bx_ + math.cos(a) * 0.035, by_ + math.sin(a) * 0.035, 0.13 + 0.02 * (size - 2) + R.uniform(-0.01, 0.02)), (R.uniform(-0.6, 0.6), R.uniform(-0.9, -0.3), a), 0.9, k)
            for f_ in range(1 if size == 2 else 2):
                fries(18, (0.18 - f_ * 0.33, -0.1, 0.0), 3 + f_, (0.78, 0.08, 0.06), 0.08)
            for c_ in range(1 if size == 2 else 2):
                cup((-0.2 + c_ * 0.44, 0.14, 0.0), 0.045, 0.15)
            shot((0.0, 0.0, 0.09), 1.0 if size == 3 else 0.82, 0.3, -18, 60, 4.5)
    return build


def it_salad():
    def build():
        set_scene('warm_restaurant_night', 0.45, 0.6, rot=60, surface='formica', **WARM_RIMS)
        salad_bowl((0, 0, 0))
        sc = lathe('sauce', [(0.0, 0.0), (0.02, 0.0), (0.024, 0.022), (0.0, 0.022)], 48); sc.location = (0.13, -0.04, 0); assign(sc, mat('pot', (0.95, 0.95, 0.95), 0.2, trans=0.6))
        sv = cyl('vinaigrette', 0.021, 0.003, 48, (0.13, -0.04, 0.018)); assign(sv, mat('vinaigrette', (0.85, 0.75, 0.5), 0.1, coat=0.8, sss=0.5))
        shot((0.02, 0.0, 0.04), 0.55, 0.28, -20, 70, 3.5)
    return build


VEST = {1: (0.025, 0.025, 0.028), 2: (0.32, 0.26, 0.17), 3: (0.025, 0.025, 0.028), 4: (0.17, 0.19, 0.1), 5: (0.02, 0.02, 0.022), 6: (0.06, 0.08, 0.14)}


def it_vest(level):
    def build():
        A.hdri('gear_store', 0.5, res=HD2K('gear_store'), cam_hdri_k=0.55, rot=0)
        bpy.context.scene.view_settings.exposure = -0.3
        fl = grid('sol', 6, 6, 2, 2); fl.location = (0, 0, -0.93); assign(fl, A.pbr('smooth_concrete_floor', 1.0, coords='Object', sat=0.3, coat=0.3, coat_rough=0.2))
        torso_form((0.42, 0.4, 0.38) if level in (1, 3, 5) else (0.035, 0.035, 0.038))
        vest_worn(min(level, 5), VEST[level], level)
        area('cle', (0.9, -0.8, 0.9), (0, 0, 0.2), 1.0, 40, (1.0, 0.92, 0.84))
        area('contre', (-0.8, 0.7, 0.6), (0, 0, 0.2), 0.6, 18, (0.5, 0.75, 1.0))
        area('rasant', (-1.0, -0.6, 0.3), (0, 0, 0.2), 0.6, 10, (1.0, 0.75, 0.55))
        cam((1.15, -0.85, 0.42), (0.0, 0.0, 0.22), 55, 5.6)
    return build


def it_medbox():
    def build():
        set_scene('cobblestone_street_night', 0.7, 0.8, rot=150, surface='asphalt', expo=-0.2, key=(0.4, -0.2, 1.5), key_w=12, warm=(1.0, 0.75, 0.45), rim=((1.0, 0.6, 0.3), (0.4, 0.6, 1.0)), rim_w=(4, 3))
        r, obs = A.model('medical_box'); r.rotation_euler = (0, 0, math.radians(-25))
        shot((0.0, 0.0, 0.04), 1.1, 0.35, -15, 50, 4.0)
    return build


def it_regen():
    def build():
        set_scene('rooftop_night', 0.6, 0.8, rot=0, surface='concrete', expo=-0.2, key=(-0.3, -0.5, 0.6), key_w=5, warm=(1.0, 0.8, 0.6), rim=((1.0, 0.4, 0.6), (0.5, 0.6, 1.0)), rim_w=(3, 2.5))
        water_bottle((-0.08, 0.06, 0.0)); bandage_roll((0.06, 0.02, 0.0), (0, 0, 0.4)); plasters(4, (0.03, -0.09, 0.0))
        shot((0.0, 0.0, 0.05), 0.62, 0.18, -18, 70, 3.5)
    return build


def it_ifak():
    def build():
        set_scene('gear_store', 0.45, 0.5, rot=0, surface='wood', expo=-0.3, rim=((0.6, 0.8, 1.0), (1.0, 0.85, 0.7)), rim_w=(2.5, 2.0))
        ifak((0, 0, 0), 0.25)
        shot((0.0, 0.05, 0.03), 0.6, 0.32, -15, 60, 4.5)
    return build


ITEMS = {
    'cafe-du-matin': it_coffee(),
    'shake-proteine': it_shake(),
    'barre-proteinee': it_bar((0.08, 0.2, 0.62), (0.95, 0.75, 0.12), (0.32, 0.18, 0.08)),
    'chips-tortilla': it_chips(),
    'sprunk': it_can(lambda: label_mat('sprunk', (0.12, 0.6, 0.12), (0.02, 0.25, 0.05), (0.85, 1.0, 0.6))),
    'ecola': it_can(lambda: label_mat('ecola', (0.7, 0.03, 0.03), (0.35, 0.01, 0.01), (1.0, 0.95, 0.9)), angle=-35, extra=lambda: ice(6, 3)),
    'pisswasser': it_beer(),
    'ps-and-qs': it_candy(),
    'egochaser': it_bar((0.03, 0.03, 0.035), (0.95, 0.35, 0.05), (0.42, 0.26, 0.12), 'energie', 'cinema_lobby', 'steel'),
    'meteorite': it_choc(),
    'burger-fast-food': it_burger('classic', (0.86, 0.82, 0.74), (0.55, 0.12, 0.08), 2),
    'repas-au-diner': it_diner_meal(),
    'hot-dog-de-stand': it_hotdog(),
    'bleeder-burger-shot': it_burger('double', (0.84, 0.8, 0.72), (0.32, 0.06, 0.04), 4, idx=2),
    'fowl-burger': it_burger('chicken', (0.87, 0.83, 0.74), (0.62, 0.42, 0.08), 6, idx=3),
    'menu-cluckin-little': it_cluckin(1),
    'menu-cluckin-big': it_cluckin(2),
    'menu-cluckin-huge': it_cluckin(3),
    'menu-salade': it_salad(),
    'gilet-super-leger': it_vest(1),
    'gilet-leger': it_vest(2),
    'gilet-standard': it_vest(3),
    'gilet-lourd': it_vest(4),
    'gilet-super-lourd': it_vest(5),
    'gilet-gta6': it_vest(6),
    'kit-de-soin-ramasse': it_medbox(),
    'recuperation-automatique': it_regen(),
    'kit-de-soin-gta6': it_ifak(),
}
