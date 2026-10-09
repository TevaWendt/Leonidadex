# Personnalisations des véhicules, v7.77 (troisième jet) : le coupé des années 80 « car86 » (surfaces de subdivision, pneus
# scannés, jantes usinées) photographié en studio sombre, de nuit ou à l'atelier, et les pièces de préparation en photo
# produit (« parts86 »). Aucun logo, aucune marque, aucune image du jeu.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
from .core import *
from .core import _nodes
from . import assets as A
from . import car86 as K
from . import parts86 as P
from . import stage86 as S
TEXDIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'tex')

POST = {'bloom': 0.1, 'grain': 0.014, 'vig': 0.22, 'ca': 0.4}
POST_NIGHT = {'bloom': 0.28, 'grain': 0.02, 'vig': 0.3, 'ca': 0.6}


def red(): return K.M_car((0.42, 0.008, 0.012), metal=0.35, rough=0.4)


# ------------------------------------------------------------------ pièces ajoutées à la carrosserie
def x_lip(b, sp, P_):
    path = K.outline(b, 1.70, 0.205, -80, 80, 60, off=0.0)
    s = K.sweep('lame_avant', path, K.rrect(-0.02, 0.085, -0.008, 0.008, 0.006, 2)); assign(s, carbon()); parent(s, sp)


def x_diffuser(b, sp, P_):
    d = box('diffuseur', (0.5, 1.3, 0.025), (K.X_R + 0.2, 0, 0.215), 0.006); d.rotation_euler = (0, math.radians(-7), 0); assign(d, carbon()); parent(d, sp)
    for i in range(7):
        f = box('ailette', (0.42, 0.006, 0.07), (K.X_R + 0.2, -0.45 + i * 0.15, 0.185), 0.002); f.rotation_euler = (0, math.radians(-7), 0); assign(f, carbon()); parent(f, sp)


def x_skirts(b, sp, P_):
    for sd in (-1, 1):
        path = []
        for i in range(30):
            x = 0.9 - 1.72 * i / 29
            loc, nrm = K.ray(b, (x, sd * 3.0, 0.24), (0, -sd, 0))
            if loc is not None: path.append((loc, Vector((0, sd, 0))))
        s = K.sweep('jupe', path, K.rrect(-0.02, 0.045, -0.045, 0.03, 0.012, 3)); assign(s, P_); parent(s, sp)
        st = K.sweep('jupe_bas', [(p + n * 0.03 + Vector((0, 0, -0.05)), n) for (p, n) in path], K.rrect(-0.03, 0.02, -0.006, 0.006, 0.004, 2)); assign(st, carbon()); parent(st, sp)


def x_wing(b, sp, P_, color=None):
    zc = K.ZD(-1.95) + 0.24
    prof = [(0.0, 0.0), (0.06, 0.018), (0.16, 0.022), (0.26, 0.012), (0.3, 0.0), (0.26, -0.004), (0.12, -0.008), (0.03, -0.006)]
    wing = extrude2d('aileron', [(-x, z) for (x, z) in prof], 1.56, 0.003); wing.rotation_euler = (math.pi / 2, math.radians(-6), 0); wing.location = (-1.82, 0, zc)
    assign(wing, color or P_); parent(wing, sp)
    for sd in (-1, 1):
        up = extrude2d('pied', [(-0.02, 0.0), (0.09, 0.0), (0.05, 0.25), (-0.04, 0.25)], 0.018, 0.004); up.rotation_euler = (math.pi / 2, 0, 0); up.location = (-1.86, sd * 0.55, K.ZD(-1.9) - 0.01)
        assign(up, K.M_trim(0.3)); parent(up, sp)
        ep = extrude2d('derive', [(0.0, -0.06), (0.36, -0.06), (0.36, 0.08), (0.1, 0.1), (0.0, 0.04)], 0.008, 0.003); ep.rotation_euler = (math.pi / 2, 0, 0); ep.location = (-2.12, sd * 0.785, zc)
        assign(ep, K.M_trim(0.3)); parent(ep, sp)


def x_hood_vents(b, sp, P_):
    for sd in (-1, 1):
        for i in range(7):
            x = 1.18 + i * 0.05; z = K.ZD(x) + 0.004
            sl = box('ouie_capot', (0.03, 0.3, 0.012), (x, sd * 0.42, z), 0.004)
            sl.rotation_euler = (0, -math.atan2(K.ZD(x + 0.02) - K.ZD(x - 0.02), 0.04) - math.radians(25), 0); assign(sl, K.M_trim(0.4)); parent(sl, sp)
        fr = box('cadre', (0.38, 0.34, 0.006), (1.33, sd * 0.42, K.ZD(1.33) - 0.0), 0.006); fr.rotation_euler = (0, -math.atan2(K.ZD(1.35) - K.ZD(1.31), 0.04), 0)
        assign(fr, mat('fond_ouie', (0.003, 0.003, 0.003), 0.8)); parent(fr, sp)


def x_roof_scoop(b, sp, P_):
    x0 = -0.2; z0 = K.ZR(x0)
    sc = box('ecope', (0.5, 0.42, 0.09), (x0, 0, z0 + 0.03), 0.04); sc.rotation_euler = (0, math.radians(-3), 0)
    cut = box('c', (0.2, 0.34, 0.07), (x0 + 0.24, 0, z0 + 0.04)); boolean_cut(sc, [cut])
    assign(sc, P_); parent(sc, sp)
    mouth = box('bouche', (0.02, 0.34, 0.06), (x0 + 0.17, 0, z0 + 0.04), 0.004); assign(mouth, K.M_grille()); parent(mouth, sp)
    for sd in (-1, 1):
        rail = box('barre', (0.62, 0.025, 0.02), (-0.28, sd * 0.45, K.ZR(-0.28) - 0.005), 0.006); assign(rail, K.M_trim(0.3)); parent(rail, sp)


def x_mesh_grille(b, sp, P_):
    path = K.outline(b, 1.70, 0.29, -30, 30, 24)
    p, n = K.on_path(path, 0.5)
    fr = K.inset_box('cadre_grille', p, n, (0.03, 0.94, 0.11), out=0.07, bev=0.012, m=M_chrome(0.08)); parent(fr, sp)
    g = K.inset_box('grille_chrome', p, n, (0.03, 0.9, 0.085), out=0.076, bev=0.006, m=honeycomb()); parent(g, sp)


def x_flares(b, sp, P_):
    """élargisseurs d'ailes rapportés : bandeau plat en plastique noir qui suit le passage de roue, rivets"""
    for xw in (K.AXF, K.AXR):
        for sd in (-1, 1):
            path = []
            for k in range(49):
                a = math.radians(-20 + 220 * k / 48)
                x = xw + math.cos(a) * (K.ARCH + 0.05); z = K.RT + math.sin(a) * (K.ARCH + 0.05)
                loc, nrm = K.ray(b, (x, sd * 3.0, z), (0, -sd, 0))
                if loc is None: continue
                c = Vector((xw + math.cos(a) * (K.ARCH + 0.03), loc.y, K.RT + math.sin(a) * (K.ARCH + 0.03)))
                path.append((c, Vector((math.cos(a), 0.0, math.sin(a)))))
            if len(path) < 4: continue
            bm = bmesh.new(); rows = []
            prof = [(-0.032, 0.0), (0.03, 0.0), (0.034, sd * 0.03), (0.02, sd * 0.05), (-0.032, sd * 0.045)]
            for (c, rdir) in path:
                rows.append([bm.verts.new(c + rdir * dr + Vector((0, dy, 0))) for (dr, dy) in prof])
            for r0, r1 in zip(rows, rows[1:]):
                for i in range(len(prof)):
                    j = (i + 1) % len(prof); bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
            bm.faces.new(rows[0]); bm.faces.new(list(reversed(rows[-1])))
            bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
            fo = mesh_obj('elargisseur', bm); bevel(fo, 0.006, 3, angle=30); apply_mods(fo); shade_auto(fo, 35)
            assign(fo, K.M_black_plastic()); parent(fo, sp)
            for i, (c, rdir) in enumerate(path):
                if i % 6 != 3: continue
                rv = sphere('rivet', 0.0065, tuple(c + rdir * 0.012 + Vector((0, sd * 0.051, 0))), (1, 0.5, 1), 12, 6); assign(rv, M_chrome(0.15)); parent(rv, sp)


def x_big_exhaust(b, sp, P_):
    for sd in (-1, 1):
        ex = cyl('sortie', 0.055, 0.16, 48, (K.X_R + 0.02, sd * 0.42, 0.22), (0, math.pi / 2, 0), 0.006); ex.scale = (1.0, 1.35, 1.0)
        assign(ex, titanium()); parent(ex, sp)
        ei = cyl('sortie_in', 0.048, 0.165, 48, (K.X_R + 0.02, sd * 0.42, 0.22), (0, math.pi / 2, 0)); ei.scale = (1.0, 1.35, 1.0); assign(ei, mat('suie', (0.005, 0.005, 0.005), 0.85)); parent(ei, sp)


def carbon():
    def cfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        ch = nt.nodes.new('ShaderNodeTexChecker'); ch.inputs['Scale'].default_value = 90.0; nt.links.new(v, ch.inputs['Vector'])
        w = nt.nodes.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.inputs['Scale'].default_value = 520.0; nt.links.new(v, w.inputs['Vector'])
        f = mix(nt, ch.outputs['Fac'], w.outputs['Fac'], 0.5)
        nt.links.new(ramp(nt, f, [(0.0, (0.006, 0.006, 0.007)), (1.0, (0.05, 0.052, 0.058))]), p.inputs['Base Color'])
    return mat('carbone', (0.02, 0.02, 0.022), 0.3, metal=0.3, coat=1.0, coat_rough=0.02, aniso=0.5, base_fn=cfn)


def titanium():
    def tfn(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        nt.links.new(ramp(nt, math_node(nt, 'MULTIPLY', math_node(nt, 'ADD', X, 2.25), 6.0), [(0.0, (0.55, 0.5, 0.45)), (0.4, (0.55, 0.35, 0.55)), (0.7, (0.25, 0.3, 0.6)), (1.0, (0.7, 0.6, 0.35))]), p.inputs['Base Color'])
    return mat('titane', (0.6, 0.5, 0.5), 0.15, metal=1.0, base_fn=tfn)


def honeycomb():
    def hfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        vo = voronoi(nt, v, 110.0); vo.inputs['Randomness'].default_value = 0.0
        e = nt.nodes.new('ShaderNodeTexVoronoi'); e.feature = 'DISTANCE_TO_EDGE'; e.inputs['Scale'].default_value = 110.0; e.inputs['Randomness'].default_value = 0.0; nt.links.new(v, e.inputs['Vector'])
        hole = math_node(nt, 'GREATER_THAN', e.outputs['Distance'], 0.16)
        nt.links.new(mix(nt, (0.6, 0.6, 0.62), (0.001, 0.001, 0.001), hole), p.inputs['Base Color'])
        nt.links.new(math_node(nt, 'SUBTRACT', 1.0, hole), p.inputs['Metallic'])
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 1.0; b.inputs['Distance'].default_value = 0.004
        nt.links.new(math_node(nt, 'SUBTRACT', 1.0, hole), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    return mat('nid_abeille', (0.8, 0.8, 0.8), 0.12, metal=1.0, base_fn=hfn)


def underglow(sp, rgb, k=60.0, floor_k=1.0):
    """néons de bas de caisse : tubes lumineux sous les bas de caisse et le bouclier, lumière colorée au sol"""
    for sd in (-1, 1):
        tb = cyl('neon', 0.011, 2.2, 16, (-0.15, sd * 0.74, 0.16), (0, math.pi / 2, 0)); assign(tb, emission('neon', rgb, k)); tb.visible_shadow = False; parent(tb, sp)
        L = area('lueur', (-0.15, sd * 0.86, 0.13), (-0.15, sd * 1.4, 0.0), 2.4, 180 * floor_k, rgb, size_y=0.12); parent(L, sp)
    for x in (1.95, -1.95):
        tb = cyl('neon', 0.011, 1.1, 16, (x, 0, 0.16), (math.pi / 2, 0, 0)); assign(tb, emission('neon', rgb, k)); tb.visible_shadow = False; parent(tb, sp)
        L = area('lueur', (x + (0.2 if x > 0 else -0.2), 0, 0.13), (x + (1.0 if x > 0 else -1.0), 0, 0.0), 1.2, 90 * floor_k, rgb, size_y=0.12); parent(L, sp)
    fill = area('dessous', (0.0, 0.0, 0.12), (0.0, 0.0, 0.0), 3.6, 260 * floor_k, rgb, size_y=1.4); parent(fill, sp)


def emblem_png(path=os.path.join(TEXDIR, 'embleme.png')):
    if os.path.exists(path): return path
    import subprocess
    svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="800" height="800">
<g fill="none" stroke="#111" stroke-width="18" stroke-linejoin="round">
<path d="M200 30 L360 120 L360 280 L200 370 L40 280 L40 120 Z" fill="#E8C14A"/>
<path d="M200 70 L320 140 L320 260 L200 330 L80 260 L80 140 Z" fill="#1A1A22"/>
<path d="M120 250 L200 110 L280 250 L240 250 L200 180 L160 250 Z" fill="#E8452C"/>
<path d="M150 285 L250 285" stroke="#E8C14A"/></g></svg>'''
    script = "const sharp=require('sharp');sharp(Buffer.from(process.argv[1])).png().toFile(process.argv[2]).then(()=>console.log('ok'))"
    subprocess.run(['node', '-e', script, svg, path], check=True)
    return path


def emblem_paint(P_, side=-1, x=0.12, z=0.56, size=0.34):
    """écusson d'équipe (dessin original) posé sur la portière"""
    img = emblem_png()
    nt = P_.node_tree; N = nt.nodes; L = nt.links; p = N.get('Principled BSDF')
    X, Y, Z, _ = K.obj_xyz(nt)
    uu = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', X, x), size * (1 if side < 0 else -1)), 0.5)
    vv = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', Z, z), size), 0.5)
    cb = N.new('ShaderNodeCombineXYZ'); L.new(uu, cb.inputs[0]); L.new(vv, cb.inputs[1])
    it = N.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(img, check_existing=True); it.extension = 'CLIP'; L.new(cb.outputs[0], it.inputs['Vector'])
    sd = math_node(nt, 'LESS_THAN', Y, -0.5) if side < 0 else math_node(nt, 'GREATER_THAN', Y, 0.5)
    fac = math_node(nt, 'MULTIPLY', it.outputs['Alpha'], sd)
    cur = p.inputs['Base Color'].links[0].from_socket if p.inputs['Base Color'].is_linked else tuple(p.inputs['Base Color'].default_value[:3])
    L.new(mix(nt, cur, it.outputs['Color'], fac), p.inputs['Base Color'])
    return P_


# ------------------------------------------------------------------ prises de vue de la voiture
def shot(stage='studio', view=(32, 9.5, 1.05, (0.1, 0, 0.55), 70, 8.0), paint=None, post=None, extra=None, after=None, **kw):
    def b():
        if stage == 'studio': S.studio()
        elif stage == 'studio_low': S.studio(key=0.8, expo=-0.75)
        elif stage == 'night': S.night('blue_lagoon_night', 0.9, rot=40, cam_k=0.7, expo=0.2, wet=0.7)
        elif stage == 'dusk': S.night('golden_bay', 0.8, rot=200, cam_k=0.85, expo=-0.3, wet=0.5)
        elif stage == 'rooftop': S.night('rooftop_night', 0.8, rot=60, cam_k=0.85, expo=-0.35, wet=0.35, floor='asphalt_floor')
        elif stage == 'tunnel': S.night('concrete_tunnel', 0.55, rot=90, cam_k=0.6, expo=0.0, wet=0.6)
        elif stage == 'workshop': S.workshop('garage', 0.75, rot=0, cam_k=0.8, expo=-0.35)
        elif stage == 'autoshop': S.workshop('autoshop_01', 0.6, rot=30, cam_k=0.75, expo=-0.4, key=0.6)
        P_ = paint() if paint else red()
        root, body_, sprung, wheels = K.coupe(P_, extra_body=extra, **kw)
        if after: after(root, body_, sprung, wheels, P_)
        az, d, h, tgt, lens, fs = view
        S.car_cam(az, d, h, tgt, lens, fs)
        return post or (POST_NIGHT if stage in ('night', 'tunnel', 'dusk') else POST)
    return b


def lowrider_after(root, b, sp, wh, P_):
    pass


def hop_after(root, b, sp, wh, P_):
    """hydrauliques : avant levé, arrière écrasé"""
    sp.rotation_euler = (0, math.radians(-5.5), 0); sp.location.z = 0.05
    for w in wh:
        if w.location.x > 0: w.location.z += 0.18


def smoke_after(rgb):
    def f(root, b, sp, wh, P_):
        P.tire_smoke(rgb, (K.AXR, -K.TRACK - 0.1, 0.12), 1.0, 1.0)
        P.tire_smoke(rgb, (K.AXR, K.TRACK + 0.1, 0.12), 0.6, 0.9)
        area('lueur_fumee', (-3.5, -3.0, 1.5), (-2.0, -0.5, 0.6), 3.0, 900, (1.0, 0.85, 0.9), size_y=1.0)
    return f


def neon_after(rgb, k=60.0):
    def f(root, b, sp, wh, P_):
        underglow(sp, rgb, k)
    return f


def paint_close(color, metal=0.55, rough=0.32, film=0.0, film_ior=1.6, view=(42, 2.9, 0.95, (1.35, -0.75, 0.6), 85, 5.6), stage='studio', **kw):
    return shot(stage, view, paint=lambda: K.M_car(color, metal=metal, rough=rough, film=film, film_ior=film_ior), **kw)


def speed_shapes(cols):
    """échantillons de peinture sur formes galbées (comme chez un carrossier) : nacre, caméléon"""
    def b():
        P.product_studio(key=1.1)
        for i, c in enumerate(cols):
            col, metal, rough, film = c
            m = K.M_car(col, metal=metal, rough=rough, film=film, film_ior=1.7, gaps=None)
            bm = bmesh.new(); rows = []
            for u in range(25):
                a = math.radians(-70 + 140 * u / 24)
                rows.append([bm.verts.new((math.sin(a) * 0.16, -math.cos(a) * 0.1 + 0.1, 0.02 + 0.22 * v / 12 + 0.04 * math.sin(math.pi * v / 12) * math.cos(a))) for v in range(13)])
            for aa, bb in zip(rows, rows[1:]):
                for v in range(12): bm.faces.new((aa[v], bb[v], bb[v + 1], aa[v + 1]))
            ob = mesh_obj('forme', bm); solidify(ob, 0.006); subsurf(ob, 2); apply_mods(ob)
            for f_ in ob.data.polygons: f_.use_smooth = True
            assign(ob, m); ob.location = ((i - (len(cols) - 1) / 2) * 0.36, 0.0 + abs(i - (len(cols) - 1) / 2) * 0.06, 0.0); ob.rotation_euler = (math.radians(-8), 0, math.radians((i - (len(cols) - 1) / 2) * -12))
            st = cyl('pied', 0.03, 0.02, 32, (ob.location.x, ob.location.y + 0.1, 0.01), (0, 0, 0), 0.004); assign(st, K.M_trim(0.3))
        P.pcam((0, 0.05, 0.14), 1.5, 0.28, 0, 60, 8.0)
        return POST
    return b


# ------------------------------------------------------------------ photos produit
def prod(build, cam_, stage='studio', **kw):
    def b():
        if stage == 'studio': P.product_studio(**kw)
        elif stage == 'bench': P.workbench('steel', 'workshop', **kw)
        elif stage == 'mat': P.workbench('mat', 'workshop', **kw)
        elif stage == 'floor': P.workbench('floor', 'garage', **kw)
        build()
        cam_()
        return POST
    return b


def wheels_row(kinds, tire=False, walls=None, R=0.205):
    def f():
        n = len(kinds)
        for i, kf in enumerate(kinds):
            kind, face = kf[0], kf[1]; lip = kf[2] if len(kf) > 2 else None
            w = P.wheel_product(kind, face, lip, tire=tire, wall=(walls[i] if walls else None), R=R)
            P.stand_up(w, ((i - (n - 1) / 2) * (0.5 if not tire else 0.68), abs(i - (n - 1) / 2) * 0.12, K.RT if tire else 0.222), face_az=(i - (n - 1) / 2) * 9)
    return f


def tires_stack():
    me, side = K.tire_data(0.225)
    walls = [None, (0.92, 0.92, 0.88), (0.75, 0.04, 0.03)]
    for i, wl in enumerate(walls):
        root = empty('pneu_' + str(i)); t = bpy.data.objects.new('pneu', me); link(t); parent(t, root)
        if wl is not None:
            wb = K.wall_band(side, wl, 0.222, 0.258 if i == 1 else 0.236); parent(wb, root)
        P.stand_up(root, ((i - 1) * 0.68, abs(i - 1) * 0.15, K.RT), face_az=(i - 1) * 14)


def bulletproof():
    """pneu « pare-balles » (roulage à plat) en coupe : un quart du pneu ôté laisse voir l'anneau de roulage en caoutchouc
    dur monté sur la jante ; à côté, une roue entière et deux douilles"""
    w = P.wheel_product('star', 'black', tire=True)
    P.stand_up(w, (-0.12, 0.0, K.RT), face_az=-28)
    bpy.context.view_layer.update()
    tire = [o for o in w.children_recursive if o.type == 'MESH' and o.data.materials and 'gomme' in o.data.materials[0].name][0]
    tire.data = tire.data.copy()
    tm = tire.data.materials[0]
    cut = box('coupe', (0.5, 0.5, 0.5), (0, 0, 0)); cut.matrix_world = tire.matrix_world @ Matrix.Translation((0.25 - 0.02, 0.0, 0.25 - 0.02))
    boolean_cut(tire, [cut])
    tire.data.materials.clear(); tire.data.materials.append(tm)
    for f_ in tire.data.polygons: f_.material_index = 0
    ins = P.ring_y('insert', 0.212, 0.262, -0.075, 0.075, 160)
    assign(ins, mat('insert', (0.035, 0.035, 0.04), 0.6, bump={'scale': 500, 'strength': 0.2})); ins.parent = tire.parent; ins.matrix_parent_inverse = tire.matrix_parent_inverse.copy()
    for k in range(24):
        a = k / 24 * math.tau
        rb = box('nervure', (0.012, 0.15, 0.02), (math.cos(a) * 0.268, 0.0, math.sin(a) * 0.268), 0.002); rb.rotation_euler = (0, -a, 0)
        assign(rb, ins.data.materials[0]); rb.parent = tire.parent; rb.matrix_parent_inverse = tire.matrix_parent_inverse.copy()
    for k, (x, y, r) in enumerate(((0.3, -0.18, 0.6), (0.38, -0.08, 2.1))):
        c = cyl('douille', 0.0045, 0.019, 24, (x, y, 0.0046), (0, math.pi / 2, r), 0.0006); assign(c, mat('laiton', (0.8, 0.6, 0.28), 0.25, metal=1.0))


def drift_tire():
    """pneus à faible adhérence : roue montée sur un pneu dur et lisse, traces de gomme brûlée sur le béton"""
    w = P.wheel_product('mesh', 'gunmetal', 'polished', tire=True)
    P.stand_up(w, (0.0, 0.05, K.RT), face_az=18)
    for o in w.children_recursive:
        if o.type == 'MESH' and o.data.materials and 'gomme' in o.data.materials[0].name:
            m = o.data.materials[0].copy(); p = m.node_tree.nodes.get('Principled BSDF')
            for l in list(p.inputs['Roughness'].links): m.node_tree.links.remove(l)
            p.inputs['Roughness'].default_value = 0.28; p.inputs['Coat Weight'].default_value = 0.4
            o.data.materials[0] = m
    for k in range(2):
        sk = grid('trace', 2.4, 0.26, 2, 2); sk.location = (-0.35 - 0.3 * k, -0.15 + 0.32 * k, 0.0006); sk.rotation_euler = (0, 0, math.radians(-22 + 14 * k))
        def fn(nt, p):
            X, Y, Z, _ = K.obj_xyz(nt)
            v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 7, 5, 0.65)
            edge = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'POWER', math_node(nt, 'DIVIDE', math_node(nt, 'ABSOLUTE', Y), 0.13), 2.0))
            fade = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'POWER', math_node(nt, 'DIVIDE', math_node(nt, 'ABSOLUTE', X), 1.2), 4.0))
            a = math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', math_node(nt, 'MAXIMUM', edge, 0.0), math_node(nt, 'MAXIMUM', fade, 0.0)), math_node(nt, 'ADD', 0.35, math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.65)))
            nt.links.new(math_node(nt, 'MULTIPLY', a, 0.85), p.inputs['Alpha'])
        m = mat('gomme_brulee', (0.008, 0.008, 0.008), 0.55, base_fn=fn)
        try: m.blend_method = 'HASHED'
        except Exception: pass
        assign(sk, m)


def plates_wall():
    designs = [('LK 777', (0.9, 0.9, 0.86), (0.05, 0.1, 0.35), None), ('VC 1986', (0.85, 0.66, 0.06), (0.02, 0.02, 0.025), None),
               ('PALM 86', (0.92, 0.92, 0.9), (0.55, 0.03, 0.05), (0.05, 0.3, 0.45)), ('LK 6', (0.02, 0.02, 0.025), (0.9, 0.75, 0.2), None)]
    wall = box('mur', (2.0, 0.04, 1.2), (0, 0.06, 0.6), 0.0)
    assign(wall, A.pbr('painted_concrete', 1.2, res='1k', coords='Object', val=0.5) if os.path.isdir(A.ROOT + '/tex/painted_concrete_1k') else mat('mur', (0.08, 0.085, 0.09), 0.8, bump={'scale': 60, 'strength': 0.2}))
    for i, (t, bg, fg, br) in enumerate(designs):
        p = P.plate_obj(t, bg, fg, br); p.location = ((i % 2 - 0.5) * 0.36, 0.035, 0.42 + (1 - i // 2) * 0.2); p.rotation_euler = (0, math.radians((-2, 3, 1.5, -3)[i]), 0)
    sh = box('etagere', (0.9, 0.12, 0.02), (0, -0.02, 0.24), 0.004); assign(sh, M_metal((0.3, 0.3, 0.32)))


def horns_pair():
    h = P.air_horns(2, (0.22, 0.3)); h.rotation_euler = (0, 0, math.radians(-25))


def horns_music():
    h = P.air_horns(5, (0.14, 0.18, 0.22, 0.26, 0.3), M=M_chrome(0.04)); h.rotation_euler = (0, 0, math.radians(-30))


def ems_set():
    root, scr = P.laptop_ecu()
    m = P.screen_map_material()
    for o in scr:
        o.data.materials.clear(); o.data.materials.append(m)
    r, obs = A.model('circuit_board'); r.scale = (0.4, 0.4, 0.4); r.location = (-0.27, -0.24, 0.0); r.rotation_euler = (0, 0, math.radians(12))


def alarm_set():
    P.siren((-0.22, 0.1, 0.0), math.radians(25))
    P.module_box((0.12, 0.075, 0.03), (0.04, 0.02, 0.0), math.radians(-10), (1.0, 0.08, 0.04), 30.0)
    P.keyfob((0.05, -0.16, 0.0), math.radians(20)); P.keyfob((0.17, -0.1, 0.0), math.radians(-35), (0.2, 0.5, 1.0), 2)


def tracker_set():
    P.clipboard_form((0.1, 0.12, 0.0), math.radians(-12))
    P.module_box((0.08, 0.05, 0.022), (-0.2, -0.06, 0.0), math.radians(20), (0.1, 1.0, 0.25), 30.0, wires=(), antenna=False)
    mag = cyl('aimant', 0.024, 0.008, 32, (-0.2, -0.06, -0.001), (0, 0, 0), 0.002); assign(mag, M_chrome(0.25))
    P.car_key((-0.12, -0.2, 0.0), math.radians(-30)); P.keyfob((-0.02, -0.22, 0.0), math.radians(10), (0.1, 1.0, 0.25), 2)


def cage():
    P.roll_cage((0.55, 0.03, 0.025), (0, 0, 0), math.radians(-30))


def perf_knoll():
    """mise à plat soignée des pièces de préparation, vue de dessus : filtre conique, déchargeur, combiné fileté, bougies,
    plaquettes, clés scannées"""
    P.cone_filter((-0.32, 0.12, 0.075), (math.pi / 2, 0, math.radians(90)))
    P.bov((0.0, 0.18, 0.03), (0, 0, 0))
    co = P.coilover((0.3, 0.05, 0.035), (0, math.radians(90), math.radians(90)))
    for i in range(4): P.spark_plug((-0.1 + i * 0.05, -0.05, 0.012), (0, math.radians(90), 0))
    P.brake_pads((0.18, -0.2, 0.0), math.radians(90))
    r, obs = A.model('combination_wrench'); r.location = (-0.33, -0.18, 0.0); r.rotation_euler = (0, 0, math.radians(90))
    r2, obs2 = A.model('combination_wrench'); r2.location = (-0.26, -0.18, 0.0); r2.rotation_euler = (0, 0, math.radians(90)); r2.scale = (0.85, 0.85, 0.85)
    t = P.turbo(); t.scale = (0.75, 0.75, 0.75); t.location = (0.04, -0.2, 0.09)


def spray_set():
    P.spray_gun((-0.12, 0.05, 0.0), math.radians(-35))
    P.fan_deck((0.17, -0.06, 0.0), math.radians(20))
    P.tape_roll((0.08, 0.17, 0.024))
    r, obs = A.model('spray_paint_bottles_02'); r.location = (-0.32, 0.18, 0.0); r.rotation_euler = (0, 0, math.radians(30))


def interior_set():
    P.bucket_seat((0.1, 0.05, 0.0), math.radians(200), (0.2, 0.012, 0.02))
    P.chain_wheel((-0.42, -0.25, 0.32), (math.radians(70), 0, math.radians(-25)))


def moto():
    P.moto_set((0.0, 0.0, 0.0))


def props():
    a = P.air_prop(0.85); a.location = (0.0, 0.5, 1.05); a.rotation_euler = (0, math.radians(70), 0)
    wall = box('mur', (4.0, 0.04, 2.6), (0, 0.6, 1.2), 0.0); assign(wall, mat('mur_hangar', (0.09, 0.1, 0.11), 0.75, bump={'scale': 40, 'strength': 0.15}))
    # hélice d'avion fixée au mur : arbre et platine
    Mf = mat('acier_noirci', (0.05, 0.05, 0.055), 0.35, metal=1.0)
    sh = cyl('fixation', 0.028, 0.08, 32, (0.0, 0.54, 1.05), (math.pi / 2, 0, 0), 0.004); assign(sh, Mf)
    pl = cyl('platine', 0.075, 0.012, 48, (0.0, 0.574, 1.05), (math.pi / 2, 0, 0), 0.003); assign(pl, Mf)
    for k in range(4):
        t_ = k / 4 * math.tau + math.pi / 4
        vs = cyl('vis', 0.007, 0.006, 12, (math.cos(t_) * 0.055, 0.566, 1.05 + math.sin(t_) * 0.055), (math.pi / 2, 0, 0), 0.002); assign(vs, M_chrome(0.2))
    # hélice de bateau sur son présentoir : arbre inox dans l'axe, colonne et socle derrière les pales
    b = P.boat_prop(0.17); b.location = (0.15, -0.25, 0.21); b.rotation_euler = (0, 0, math.radians(-30))
    ax = Vector((math.sin(math.radians(30)), math.cos(math.radians(30)), 0.0))
    p0 = Vector(b.location) + ax * 0.05; p1 = Vector(b.location) + ax * 0.2
    Mi = M_chrome(0.18, (0.8, 0.8, 0.82))
    rot_ax = Vector((0, 0, 1)).rotation_difference(ax).to_euler()
    shf = cyl('arbre', 0.011, (p1 - p0).length, 24, tuple((p0 + p1) / 2), tuple(rot_ax), 0.001); assign(shf, Mi)
    col = cyl('colonne', 0.012, p1.z - 0.02, 24, (p1.x, p1.y, (p1.z + 0.02) / 2), (0, 0, 0), 0.001); assign(col, Mi)
    st = box('socle', (0.15, 0.15, 0.02), (p1.x, p1.y, 0.01), 0.004); assign(st, mat('socle', (0.02, 0.02, 0.022), 0.4, coat=0.6, coat_rough=0.1))


def armor():
    P.armor_set((0.0, 0.0, 0.0))


def charge():
    P.charge_kit((0.0, 0.0, 0.0))


# ------------------------------------------------------------------ registre
F34 = (32, 9.5, 1.05, (0.1, 0, 0.55), 70, 8.0)
ITEMS = {
    'conversion-bennys': shot('autoshop', (28, 8.6, 0.75, (0.2, 0, 0.45), 60, 7.1), paint=lambda: K.M_car((0.22, 0.02, 0.12), metal=0.7, rough=0.3, two_tone=(0.75, 0.6, 0.25)), low=0.07, rim_kind='wire', wall=(0.92, 0.92, 0.88), roof='paint'),
    'mods-performance-gta6': prod(perf_knoll, lambda: P.pcam((-0.02, 0.0, 0.0), 0.02, 1.32, 0, 40, 9.0), 'mat'),
    'pare-chocs-avant': shot('studio', (24, 4.6, 0.55, (1.85, 0, 0.32), 70, 5.6), paint=lambda: K.M_car((0.85, 0.85, 0.87), metal=0.6, rough=0.3), extra=x_lip),
    'pare-chocs-arriere': shot('studio', (152, 4.6, 0.6, (-1.95, 0, 0.36), 70, 5.6), paint=lambda: K.M_car((0.04, 0.1, 0.3), metal=0.6, rough=0.3), extra=x_diffuser),
    'jupes': shot('studio', (92, 6.2, 0.38, (0.05, 0, 0.32), 50, 6.3), extra=x_skirts),
    'aileron': shot('studio', (148, 7.2, 1.9, (-1.4, 0, 0.8), 70, 7.1), paint=lambda: K.M_car((0.62, 0.36, 0.0), metal=0.35, rough=0.38), extra=lambda b, sp, P_: x_wing(b, sp, P_, carbon())),
    'capot': shot('studio', (22, 4.8, 2.2, (1.25, 0, 0.7), 60, 6.3), paint=lambda: K.M_car((0.03, 0.03, 0.035), metal=0.6, rough=0.32), extra=x_hood_vents),
    'toit': shot('studio', (58, 5.2, 2.6, (-0.25, 0, 1.0), 60, 6.3), paint=lambda: K.M_car((0.86, 0.86, 0.88), metal=0.6, rough=0.3), extra=x_roof_scoop),
    'calandre': shot('studio', (8, 4.0, 0.45, (2.05, 0, 0.32), 85, 4.5), extra=x_mesh_grille),
    'ailes': shot('studio', (48, 4.2, 0.75, (1.3, -0.9, 0.4), 70, 5.0), paint=lambda: K.M_car((0.04, 0.22, 0.1), metal=0.6, rough=0.3), extra=x_flares, rim_kind='deep', face='black', lip='polished'),
    'echappement': shot('studio', (148, 2.4, 0.22, (-2.12, -0.2, 0.24), 70, 3.2), paint=lambda: K.M_car((0.02, 0.02, 0.025), metal=0.6, rough=0.32), extra=x_big_exhaust),
    'arceau': prod(cage, lambda: P.pcam((0.2, 0.0, 0.5), 3.6, 1.4, -25, 45, 8.0), wall_y=2.4, key=1.6),
    'jantes-familles': prod(wheels_row([('star', 'silver'), ('dial', 'gunmetal'), ('mesh', 'gold', 'polished'), ('turbine', 'silver'), ('wire', 'chrome')]), lambda: P.pcam((0, 0.08, 0.21), 3.0, 0.3, 0, 50, 8.0), wall_y=1.9),
    'couleur-jantes': prod(wheels_row([('star', 'gold'), ('star', 'black'), ('star', 'white'), ('star', 'gunmetal'), ('star', 'chrome')]), lambda: P.pcam((0, 0.08, 0.21), 3.0, 0.3, 0, 50, 8.0), wall_y=1.9),
    'pneus-flancs': prod(tires_stack, lambda: P.pcam((0, 0.05, 0.3), 3.2, 0.45, 0, 50, 8.0), wall_y=1.9),
    'pneus-pare-balles': prod(bulletproof, lambda: P.pcam((0.08, 0.0, 0.25), 2.2, 0.35, -8, 55, 7.1), 'floor'),
    'fumee-pneus': shot('night', (205, 7.8, 0.9, (-0.9, 0, 0.6), 50, 6.3), paint=lambda: K.M_car((0.03, 0.03, 0.035), metal=0.6, rough=0.32), after=smoke_after((1.0, 0.35, 0.75)), tail_on=True),
    'pneus-faible-adherence': prod(drift_tire, lambda: P.pcam((0.0, 0.05, 0.25), 2.0, 0.3, 15, 50, 6.3), 'floor'),
    'pay-n-spray': prod(spray_set, lambda: P.pcam((0.0, 0.02, 0.08), 1.25, 0.45, -10, 55, 6.3), 'bench'),
    'peinture-principale': paint_close((0.42, 0.008, 0.012), 0.35, 0.4),
    'peinture-secondaire': shot('studio', F34, paint=lambda: K.M_car((0.75, 0.76, 0.78), metal=0.7, rough=0.3, two_tone=(0.06, 0.065, 0.075))),
    'nacre': paint_close((0.86, 0.85, 0.82), 0.3, 0.3, film=420, view=(38, 3.3, 1.25, (1.3, -0.6, 0.62), 70, 5.6)),
    'cameleon': paint_close((0.16, 0.06, 0.24), 0.85, 0.28, film=820, view=(30, 3.6, 1.45, (1.2, -0.45, 0.62), 70, 5.6)),
    'vitres-teintees': shot('dusk', (88, 5.4, 0.95, (-0.15, 0, 0.82), 70, 5.6), paint=lambda: K.M_car((0.85, 0.86, 0.88), metal=0.6, rough=0.3), tint=(0.25, 0.3, 0.35), trans=0.22),
    'vitres-noir-pur': shot('dusk', (92, 5.4, 0.95, (-0.15, 0, 0.82), 70, 5.6), paint=lambda: K.M_car((0.62, 0.012, 0.02), metal=0.4, rough=0.35), tint=(0.02, 0.02, 0.02), trans=0.0),
    'plaques': prod(plates_wall, lambda: P.pcam((0.0, 0.0, 0.5), 1.6, 0.0, 0, 70, 8.0), 'studio', wall_y=2.5),
    'klaxons': prod(horns_pair, lambda: P.pcam((0.0, 0.0, 0.06), 0.85, 0.3, -12, 60, 5.6), 'bench'),
    'klaxons-boucle': prod(horns_music, lambda: P.pcam((0.0, 0.0, 0.06), 1.0, 0.36, -15, 55, 5.6), 'bench'),
    'phares-xenon': shot('night', (12, 7.0, 0.7, (0.6, 0, 0.5), 60, 6.3), paint=lambda: K.M_car((0.04, 0.045, 0.055), metal=0.6, rough=0.3), popup=True, head_k=90.0, head_rgb=(0.8, 0.9, 1.0), park_k=4.0),
    'phares-couleur': shot('night', (-14, 7.0, 0.7, (0.6, 0, 0.5), 60, 6.3), paint=lambda: K.M_car((0.04, 0.045, 0.055), metal=0.6, rough=0.3), popup=True, head_k=14.0, head_rgb=(1.0, 0.12, 0.6), park_k=4.0),
    'neons-disposition': shot('tunnel', (90, 7.0, 0.55, (0.0, 0, 0.35), 50, 6.3), paint=lambda: K.M_car((0.03, 0.03, 0.035), metal=0.6, rough=0.32), after=neon_after((1.0, 0.2, 0.7))),
    'neons-couleur': shot('tunnel', (35, 8.0, 0.7, (0.1, 0, 0.4), 55, 6.3), paint=lambda: K.M_car((0.85, 0.86, 0.88), metal=0.6, rough=0.3), after=neon_after((0.15, 1.0, 0.7))),
    'suspension-niveaux': shot('studio', (90, 7.0, 0.42, (0.0, 0, 0.42), 55, 7.1), paint=lambda: K.M_car((0.86, 0.86, 0.88), metal=0.6, rough=0.3), low=0.075, rim_kind='mesh', face='gold', lip='polished'),
    'hydrauliques': shot('autoshop', (60, 8.0, 0.65, (0.1, 0, 0.6), 50, 7.1), paint=lambda: K.M_car((0.05, 0.12, 0.3), metal=0.7, rough=0.3), after=hop_after, rim_kind='wire', wall=(0.92, 0.92, 0.88)),
    'moteur-ems': prod(ems_set, lambda: P.pcam((0.0, 0.0, 0.12), 1.45, 0.55, -15, 50, 6.3), 'bench'),
    'moteur-bennys': prod(lambda: _v8(), lambda: P.pcam((0.0, 0.0, 0.85), 3.0, 1.1, -25, 50, 8.0), wall_y=2.6, key=1.4),
    'freins': prod(lambda: _brake(), lambda: P.pcam((0.0, 0.0, 0.17), 1.0, 0.1, -12, 70, 5.6)),
    'transmission': prod(lambda: _gears(), lambda: P.pcam((0.0, 0.1, 0.1), 1.35, 0.55, -18, 55, 7.1)),
    'turbo': prod(lambda: _turbo(), lambda: P.pcam((0.0, 0.0, 0.15), 0.9, 0.26, -14, 70, 8.0)),
    'blindage': prod(armor, lambda: P.pcam((0.05, 0.0, 0.16), 1.25, 0.3, -12, 60, 6.3), 'bench'),
    'interieur-bennys': prod(interior_set, lambda: P.pcam((-0.12, 0.0, 0.5), 2.6, 0.5, -20, 50, 7.1), wall_y=2.2, key=1.5),
    'livrees-serie': shot('studio', F34, paint=lambda: K.M_car((0.9, 0.9, 0.9), metal=0.4, rough=0.35, stripes=[((0.9, 0.12, 0.05), 0.03, 0.055), ((0.95, 0.45, 0.04), 0.06, 0.085), ((0.95, 0.75, 0.08), 0.09, 0.115)])),
    'embleme-crew': shot('studio', (86, 4.2, 0.75, (0.1, 0, 0.55), 60, 5.6), paint=lambda: emblem_paint(K.M_car((0.03, 0.03, 0.035), metal=0.6, rough=0.32), -1, 0.05, 0.6, 0.36)),
    'alarme-traceur-gta6': prod(alarm_set, lambda: P.pcam((-0.04, 0.0, 0.03), 1.0, 0.45, -15, 55, 5.6), 'mat'),
    'traceur-assurance': prod(tracker_set, lambda: P.pcam((-0.03, 0.0, 0.0), 0.8, 0.5, -12, 60, 5.6), 'mat'),
    'bombes': prod(charge, lambda: P.pcam((0.08, -0.04, 0.03), 0.75, 0.35, -15, 60, 5.6), 'mat'),
    'motos-conf': prod(moto, lambda: P.pcam((0.05, 0.0, 0.26), 1.7, 0.4, -12, 50, 7.1), 'floor'),
    'bateaux-avions-conf': prod(props, lambda: P.pcam((0.05, 0.15, 0.62), 3.4, 0.25, -10, 45, 8.0), wall_y=2.6, key=1.6),
}


def _v8():
    v = P.v8(block=(0.012, 0.012, 0.014)); v.location = (0, 0, 0.79); v.rotation_euler = (0, 0, math.radians(-62))


def _brake():
    k = P.brake_kit(); k.location = (0, 0, 0.172); k.rotation_euler = (0, 0, math.radians(200))
    st = box('socle', (0.2, 0.08, 0.01), (0, 0.03, 0.005), 0.003); assign(st, K.M_trim(0.4))


def _gears():
    g = P.gearset(); g.rotation_euler = (math.radians(90), 0, math.radians(-22)); g.location = (0, 0.0, 0.115)


def _turbo():
    t = P.turbo(); t.location = (0, 0, 0.165); t.rotation_euler = (0, 0, math.radians(-70))
