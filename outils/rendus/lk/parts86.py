# Pièces de préparation (v7.77) en photo produit : fond studio courbe (cyclo) ou établi d'atelier, éclairage à boîtes à lumière.
# Jantes et pneus (ceux du coupé), kit de freins, turbo, V8 sur chandelle, boîte de vitesses, hélice, klaxons, électronique.
import bpy, bmesh, math, random, os
from mathutils import Vector, Matrix
from .core import *
from .core import _nodes
from . import assets as A
from . import car86 as K

HD2K = lambda h: '2k' if os.path.exists(f'{A.ROOT}/hdri/{h}_2k.hdr') else '1k'


# ------------------------------------------------------------------ décors
def cyclo(rgb=(0.035, 0.035, 0.038), rough=0.6, R=1.2, depth=6.0, width=10.0, height=4.0, name='cyclo'):
    """fond studio courbe : sol qui remonte en mur par un quart de cylindre (rayon R), face à la caméra (mur vers +y)"""
    bm = bmesh.new()
    prof = [(-depth + depth * i / 11, 0.0) for i in range(12)] + [(R * math.cos(-math.pi / 2 + (math.pi / 2) * i / 16), R + R * math.sin(-math.pi / 2 + (math.pi / 2) * i / 16)) for i in range(1, 17)] + [(R, R + height * i / 6) for i in range(1, 7)]
    rows = []
    for k in range(9):
        x = -width / 2 + width * k / 8
        rows.append([bm.verts.new((x, y, z)) for (y, z) in prof])
    for a, b in zip(rows, rows[1:]):
        for i in range(len(prof) - 1): bm.faces.new((a[i], b[i], b[i + 1], a[i + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm)
    for f in ob.data.polygons: f.use_smooth = True
    assign(ob, mat('fond', rgb, rough, bump={'scale': 30, 'strength': 0.02}))
    return ob


def product_studio(bg=(0.016, 0.016, 0.018), key=1.0, hdri_k=0.35, wall_y=1.7, expo=-0.5, warm=(1.0, 0.96, 0.92), rim_rgb=(0.9, 0.95, 1.0), rim_k=1.0, top=True):
    """studio produit : cyclo sombre (sol plat jusqu'à wall_y - 1,2 m), grande boîte à lumière au-dessus-devant, deux bandes
    latérales, contre-jour"""
    A.hdri('studio_small_09', hdri_k, res='2k', cam_rgb=(0.0, 0.0, 0.0), cam_k=1.0)
    bpy.context.scene.view_settings.exposure = expo
    cy = cyclo(bg); cy.location = (0, wall_y - 1.2, 0)
    if top: area('boite', (0.0, -0.9, 2.2), (0.0, 0.2, 0.0), 1.8, 230 * key, warm, size_y=1.2)
    area('bande_g', (-1.8, -0.6, 0.9), (0.0, 0.0, 0.25), 2.2, 120 * key, warm, size_y=0.35)
    area('bande_d', (1.8, -0.4, 1.0), (0.0, 0.0, 0.25), 2.2, 85 * key, warm, size_y=0.35)
    area('contre', (0.4, 1.4, 1.3), (0.0, 0.0, 0.25), 1.4, 170 * key * rim_k, rim_rgb, size_y=0.4)
    return cy


def workbench(surface='steel', hd='workshop', hdri_k=0.7, cam_k=0.7, expo=-0.3, key=1.0, rot=0.0):
    """plan de travail d'atelier (photo HDRI d'un vrai atelier, plateau scanné) pour les pièces mécaniques"""
    A.hdri(hd, hdri_k, rot=rot, res=HD2K(hd), cam_hdri_k=cam_k)
    bpy.context.scene.view_settings.exposure = expo
    top = grid('plateau', 6, 6, 2, 2)
    if surface == 'steel':
        def sfn(nt, p):
            v = tex_coord(nt, 'Object', (1.0, 40.0, 1.0)); n = noise(nt, v, 30, 6, 0.6)
            nt.links.new(ramp(nt, n.outputs['Fac'], [(0.3, (0.22,) * 3), (0.7, (0.38,) * 3)]), p.inputs['Roughness'])
        m = mat('inox_etabli', (0.5, 0.5, 0.52), 0.3, metal=1.0, aniso=0.5, rough_fn=sfn, bump={'scale': 900, 'strength': 0.04})
    elif surface == 'wood': m = A.pbr('wood_table_worn', 1.0, res='1k', coords='Object', val=0.6)
    elif surface == 'mat': m = mat('tapis', (0.012, 0.013, 0.014), 0.75, bump={'scale': 400, 'strength': 0.25})
    else: m = A.pbr('garage_floor', 0.4, res='2k', coords='Object', rough_mul=0.8)
    assign(top, m)
    area('lampe', (0.2, -0.6, 1.6), (0.0, 0.0, 0.0), 1.2, 260 * key, (1.0, 0.95, 0.88), size_y=0.6)
    area('contre', (-0.5, 1.4, 1.0), (0.0, 0.0, 0.1), 1.0, 120 * key, (0.85, 0.92, 1.0), size_y=0.3)
    return top


def pcam(target, dist=1.4, h=0.45, az=-20, lens=70, fstop=5.6):
    """caméra produit : az = angle autour de z depuis l'axe -y (0 = de face)"""
    a = math.radians(az)
    return cam((target[0] + math.sin(a) * dist, target[1] - math.cos(a) * dist, target[2] + h), target, lens, fstop)


def stand_up(ob, loc, face_az=0.0, tilt=0.0):
    """pose une roue/jante (axe y, face vers +y) debout, face tournée vers la caméra (-y) puis de face_az degrés"""
    ob.location = loc; ob.rotation_euler = (math.radians(tilt), 0, math.pi + math.radians(face_az))
    return ob


# ------------------------------------------------------------------ jantes et pneus
def wheel_product(rim_kind='star', face=None, lip=None, cap=None, tire=True, wall=None, width=0.225, R=0.205):
    root = empty('roue_produit')
    if tire:
        me, side = K.tire_data(width)
        t = bpy.data.objects.new('pneu', me); link(t); parent(t, root)
        if wall is not None:
            wb = K.wall_band(side, wall); parent(wb, root)
    r = K.rim(rim_kind, R, width - 0.03, face, lip, cap); parent(r, root)
    if not tire:
        # fût intérieur fermé vu de face : disque sombre au fond
        back = cyl('fond', R - 0.014, 0.004, 64, (0, -(width - 0.03) / 2 + 0.01, 0), (math.pi / 2, 0, 0)); assign(back, mat('fond_jante', (0.08, 0.08, 0.085), 0.5, metal=0.8)); parent(back, root)
    return root


def ring_y(name, r0, r1, y0, y1, seg=128):
    """anneau (section rectangulaire) d'axe y"""
    return K.lathe_y(name, [(r0, y0), (r1, y0), (r1, y1), (r0, y1), (r0, y0)], seg)


def joined(objs, name='groupe'):
    if len(objs) == 1: return objs[0]
    return join(objs, name)


# ------------------------------------------------------------------ freins
def M_cast_iron(): return mat('fonte', (0.07, 0.068, 0.066), 0.62, metal=0.85, bump={'scale': 500, 'strength': 0.12})
def M_disc():
    def dfn(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        r = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', X, X), math_node(nt, 'MULTIPLY', Z, Z)))
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.1; b.inputs['Distance'].default_value = 0.0004
        nt.links.new(math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', r, 3000.0)), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    return mat('disque', (0.3, 0.3, 0.31), 0.28, metal=1.0, aniso=0.6, base_fn=dfn)


def brake_kit(R=0.165, caliper=(0.5, 0.018, 0.014), hat=(0.03, 0.03, 0.033), drilled=True):
    """kit de freins : disque ventilé percé, bol anodisé, étrier monobloc à 6 pistons (sans marque)"""
    root = empty('kit_freins')
    t = 0.011; gap = 0.011; rin = 0.092
    plates = []
    for yy in (-(gap / 2 + t / 2), gap / 2 + t / 2):
        d = ring_y('piste', rin, R, yy - t / 2, yy + t / 2, 160); plates.append(d)
    if drilled:
        cs = []
        for i in range(36):
            a = i / 36 * math.tau; rr = R - 0.02 - 0.022 * (i % 3)
            cs.append(cyl('percage', 0.0042, 0.08, 16, (math.cos(a) * rr, 0, math.sin(a) * rr), (math.pi / 2, 0, 0)))
        cut = join(cs, 'percages')
        for d in plates:
            m = d.modifiers.new('p', 'BOOLEAN'); m.operation = 'DIFFERENCE'; m.object = cut; m.solver = 'EXACT'; apply_mods(d)
        bpy.data.objects.remove(cut)
    for d in plates:
        bevel(d, 0.0008, 1, angle=40); apply_mods(d); shade_auto(d, 35); assign(d, M_disc()); parent(d, root)
    for i in range(48):
        a = (i + 0.5) / 48 * math.tau
        vn = box('ailette', (0.052, gap + 0.002, 0.005), (math.cos(a) * (R - 0.036), 0, math.sin(a) * (R - 0.036)), 0.0); vn.rotation_euler = (0, -a + 0.35, 0)
        assign(vn, M_cast_iron()); parent(vn, root)
    bell = K.lathe_y('bol', [(rin + 0.006, -0.004), (rin + 0.006, 0.012), (0.082, 0.03), (0.075, 0.052), (0.035, 0.056), (0.035, 0.05), (0.07, 0.046), (0.076, 0.026), (rin - 0.004, 0.006), (rin - 0.004, -0.004)], 128)
    shade_auto(bell, 30); assign(bell, mat('bol', hat, 0.35, metal=0.7, coat=0.5, coat_rough=0.1)); parent(bell, root)
    for i in range(12):
        a = i / 12 * math.tau
        bo = cyl('vis', 0.0045, 0.008, 12, (math.cos(a) * (rin + 0.001), 0.012, math.sin(a) * (rin + 0.001)), (math.pi / 2, 0, 0), 0.001); assign(bo, M_chrome(0.15)); parent(bo, root)
    for i in range(5):
        a = i / 5 * math.tau + 0.3
        h = cyl('trou', 0.008, 0.01, 16, (math.cos(a) * 0.055, 0.053, math.sin(a) * 0.055), (math.pi / 2, 0, 0)); assign(h, mat('noir', (0.005, 0.005, 0.005), 0.8)); parent(h, root)
    # étrier : secteur annulaire enjambant le disque, fente pour le disque
    a0, a1 = math.radians(25), math.radians(95)
    ro, ri = R + 0.026, R - 0.062
    pts = [(ro * math.cos(a0 + (a1 - a0) * k / 16), ro * math.sin(a0 + (a1 - a0) * k / 16)) for k in range(17)]
    pts += [(ri * math.cos(a1 - (a1 - a0) * k / 16), ri * math.sin(a1 - (a1 - a0) * k / 16)) for k in range(17)]
    cal = K.prism_xz('etrier', K.fillet(pts, 0.016, 5), -0.052, 0.052)
    slot = K.prism_xz('fente', [(ri * 0.8 * math.cos(a0 - 0.2), ri * 0.8 * math.sin(a0 - 0.2)), ((R + 0.004) * 1.02 * math.cos(a0 - 0.2), (R + 0.004) * 1.02 * math.sin(a0 - 0.2)),
                                 ((R + 0.004) * math.cos((a0 + a1) / 2), (R + 0.004) * math.sin((a0 + a1) / 2)),
                                 ((R + 0.004) * 1.02 * math.cos(a1 + 0.2), (R + 0.004) * 1.02 * math.sin(a1 + 0.2)), (ri * 0.8 * math.cos(a1 + 0.2), ri * 0.8 * math.sin(a1 + 0.2))], -(gap / 2 + t + 0.003), gap / 2 + t + 0.003)
    boolean_cut(cal, [slot])
    bevel(cal, 0.012, 4, angle=30); apply_mods(cal); shade_auto(cal, 32)
    assign(cal, mat('etrier', caliper, 0.28, coat=1.0, coat_rough=0.04)); parent(cal, root)
    # plaquettes visibles dans la fente, purgeurs
    for sy in (-1, 1):
        pad = K.prism_xz('plaquette', K.fillet([(ri * 1.05 * math.cos(a0 + 0.08), ri * 1.05 * math.sin(a0 + 0.08)), (R * 0.99 * math.cos(a0 + 0.08), R * 0.99 * math.sin(a0 + 0.08)),
                                                (R * 0.99 * math.cos(a1 - 0.08), R * 0.99 * math.sin(a1 - 0.08)), (ri * 1.05 * math.cos(a1 - 0.08), ri * 1.05 * math.sin(a1 - 0.08))], 0.006, 3),
                         sy * (gap / 2 + t + 0.0005), sy * (gap / 2 + t + 0.0025))
        assign(pad, mat('garniture', (0.05, 0.045, 0.04), 0.8)); parent(pad, root)
    for k in (0.25, 0.75):
        a = a0 + (a1 - a0) * k
        nip = cyl('purgeur', 0.004, 0.014, 12, (math.cos(a) * (ro + 0.004), 0.03, math.sin(a) * (ro + 0.004)), (0, 0, 0)); nip.rotation_euler = (0, -a + math.pi / 2, 0); assign(nip, M_chrome(0.2)); parent(nip, root)
    return root


# ------------------------------------------------------------------ turbo
def volute(name, x0, rc0, rv0, rv1, turns=1.0, n=96, ring=24, outlet=0.08, outlet_dir=1):
    """carter en colimaçon d'axe x : tore dont la section grossit avec l'angle, prolongé par une sortie tangente"""
    bm = bmesh.new(); rows = []
    N = int(n * turns)
    for i in range(N + 1):
        th = turns * math.tau * i / N
        rv = rv0 + (rv1 - rv0) * (i / N) ** 1.2
        rc = rc0 + rv
        c = Vector((x0, rc * math.cos(th), rc * math.sin(th)))
        radial = Vector((0, math.cos(th), math.sin(th)))
        ax = Vector((1, 0, 0))
        rows.append([bm.verts.new(c + radial * math.cos(a) * rv + ax * math.sin(a) * rv * 0.72) for a in [k / ring * math.tau for k in range(ring)]])
    # sortie tangente
    th = turns * math.tau; rv = rv1; rc = rc0 + rv
    c = Vector((x0, rc * math.cos(th), rc * math.sin(th))); tdir = Vector((0, -math.sin(th), math.cos(th))) * outlet_dir
    radial = Vector((0, math.cos(th), math.sin(th))); ax = Vector((1, 0, 0))
    for k in range(1, 5):
        cc = c + tdir * outlet * k / 4
        rows.append([bm.verts.new(cc + (radial * math.cos(a) + ax * math.sin(a)) * rv) for a in [kk / ring * math.tau for kk in range(ring)]])
    for a, b in zip(rows, rows[1:]):
        for k in range(ring):
            j = (k + 1) % ring; bm.faces.new((a[k], a[j], b[j], b[k]))
    bm.faces.new(rows[0]); bm.faces.new(list(reversed(rows[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm)
    return ob, c + tdir * outlet, tdir


def M_cast_alu(): return mat('alu_fonderie', (0.3, 0.3, 0.31), 0.55, metal=0.85, bump={'scale': 700, 'strength': 0.35, 'detail': 5})
def M_machined(): return mat('alu_usine', (0.82, 0.82, 0.83), 0.18, metal=1.0, aniso=0.5)


def turbo():
    """turbocompresseur : carter de compresseur en alu de fonderie (entrée usinée, roue visible), carter central, carter de
    turbine en fonte, brides ; axe x"""
    root = empty('turbo')
    Al = M_cast_alu(); Fe = mat('fonte_turbine', (0.06, 0.05, 0.045), 0.7, metal=0.7, bump={'scale': 600, 'strength': 0.3, 'detail': 4})
    # compresseur
    vc, out_c, td = volute('volute_comp', 0.035, 0.07, 0.011, 0.05, 1.0, outlet=0.1)
    subsurf(vc, 1); apply_mods(vc); assign(vc, Al); parent(vc, root)
    back = K.lathe_y('flasque', [(0.0, -0.01), (0.12, -0.01), (0.125, 0.0), (0.12, 0.012), (0.0, 0.012)], 96); back.rotation_euler = (0, 0, math.pi / 2); assign(back, Al); parent(back, root)
    inlet = K.lathe_y('entree', [(0.052, 0.0), (0.06, 0.0), (0.064, 0.05), (0.07, 0.07), (0.07, 0.085), (0.062, 0.09), (0.054, 0.088), (0.05, 0.06), (0.048, 0.0)], 96)
    inlet.rotation_euler = (0, 0, -math.pi / 2); inlet.location = (0.05, 0, 0); assign(inlet, M_machined()); parent(inlet, root)
    nose = K.lathe_y('cone', [(0.0, 0.0), (0.03, 0.0), (0.012, 0.05), (0.0, 0.055)], 48); nose.rotation_euler = (0, 0, -math.pi / 2); nose.location = (0.06, 0, 0); assign(nose, M_machined()); parent(nose, root)
    for i in range(12):
        a = i / 12 * math.tau; full = i % 2 == 0
        bl = box('pale', (0.06 if full else 0.035, 0.002, 0.036), (0.0, 0, 0), 0.0)
        bl.location = (0.085 - (0.0 if full else 0.012), math.cos(a) * 0.03, math.sin(a) * 0.03); bl.rotation_euler = (a + math.pi / 2, math.radians(35), 0)
        assign(bl, M_machined()); parent(bl, root)
    fl = K.lathe_y('bride_sortie', [(0.046, -0.006), (0.058, -0.006), (0.058, 0.006), (0.046, 0.006), (0.046, -0.006)], 64)
    fl.matrix_world = Matrix.Translation(out_c) @ Vector((0, 1, 0)).rotation_difference(td).to_matrix().to_4x4(); assign(fl, M_machined()); parent(fl, root)
    # carter central
    chra = cyl('carter_central', 0.045, 0.07, 64, (-0.05, 0, 0), (0, math.pi / 2, 0), 0.006); assign(chra, mat('acier', (0.35, 0.35, 0.36), 0.35, metal=1.0)); parent(chra, root)
    oil = cyl('arrivee_huile', 0.012, 0.035, 24, (-0.05, 0, 0.06), (0, 0, 0), 0.002); assign(oil, M_machined()); parent(oil, root)
    drain = box('retour_huile', (0.04, 0.05, 0.012), (-0.05, 0, -0.052), 0.004); assign(drain, M_machined()); parent(drain, root)
    # turbine
    vt, out_t, tdt = volute('volute_turb', -0.125, 0.06, 0.011, 0.048, 1.0, outlet=0.06, outlet_dir=-1)
    subsurf(vt, 1); apply_mods(vt); assign(vt, Fe); parent(vt, root)
    flt = box('bride_entree', (0.1, 0.012, 0.09), (0, 0, 0), 0.006)
    flt.matrix_world = Matrix.Translation(out_t) @ Vector((0, 1, 0)).rotation_difference(tdt).to_matrix().to_4x4(); assign(flt, Fe); parent(flt, root)
    ex = K.lathe_y('sortie_echap', [(0.045, 0.0), (0.055, 0.0), (0.055, 0.04), (0.065, 0.045), (0.065, 0.058), (0.04, 0.058), (0.04, 0.0)], 96)
    ex.rotation_euler = (0, 0, math.pi / 2); ex.location = (-0.16, 0, 0); assign(ex, Fe); parent(ex, root)
    vb = K.lathe_y('collier', [(0.068, 0.0), (0.076, 0.0), (0.078, 0.012), (0.068, 0.012), (0.068, 0.0)], 96); vb.rotation_euler = (0, 0, math.pi / 2); vb.location = (-0.205, 0, 0); assign(vb, M_chrome(0.2)); parent(vb, root)
    return root


# ------------------------------------------------------------------ V8 sur chandelle
def rbox(name, size, loc, rot=(0, 0, 0), bev=0.01, m=None, par=None):
    b = box(name, size, loc, bev); b.rotation_euler = rot
    if m: assign(b, m)
    if par: parent(b, par)
    return b


def v8(block=(0.5, 0.03, 0.02), covers='chrome', headers='ceramic', stand=True):
    """V8 culbuté (générique) : bloc peint, culasses, couvre-culbuteurs chromés à ailettes, filtre à air rond chromé,
    collecteurs, poulies et courroie, allumeur et faisceau de bougies ; sur chandelle d'atelier rouge ; axe vilebrequin = x"""
    root = empty('v8')
    Mb = mat('bloc', block, 0.3, coat=0.7, coat_rough=0.12, bump={'scale': 220, 'strength': 0.08})
    Mc = M_chrome(0.05) if covers == 'chrome' else mat('noir_givre', (0.02, 0.02, 0.022), 0.7, bump={'scale': 900, 'strength': 0.5})
    Ma = M_cast_alu(); Mh = mat('ceramique', (0.6, 0.6, 0.6), 0.35, metal=1.0, bump={'scale': 700, 'strength': 0.08}) if headers == 'ceramic' else M_chrome(0.08)
    rbox('carter', (0.6, 0.44, 0.24), (0, 0, 0), bev=0.02, m=Mb, par=root)
    rbox('carter_huile', (0.48, 0.34, 0.14), (-0.03, 0, -0.18), bev=0.03, m=M_chrome(0.08), par=root)
    for sd in (-1, 1):
        a = sd * math.radians(45); d = Vector((0, math.sin(a), math.cos(a)))
        c0 = Vector((0, 0, 0.1)) + d * 0.12
        rbox('rangee', (0.58, 0.2, 0.22), tuple(c0), (-a, 0, 0), 0.015, Mb, root)
        c1 = c0 + d * 0.15
        rbox('culasse', (0.6, 0.21, 0.09), tuple(c1), (-a, 0, 0), 0.012, Ma, root)
        c2 = c1 + d * 0.075
        cv = rbox('couvre_culbuteurs', (0.56, 0.17, 0.065), tuple(c2), (-a, 0, 0), 0.028, Mc, root)
        for i in range(7):
            rbox('ailette', (0.012, 0.13, 0.02), tuple(c2 + d * 0.035 + Vector((-0.21 + i * 0.07, 0, 0))), (-a, 0, 0), 0.004, Mc, root)
        # collecteurs : 4 tubes par côté, des lumières d'échappement vers un collecteur bas et arrière
        side = Vector((0, sd, 0)); port_out = c1 + Vector((0, sd * 0.06, -0.06))
        for i, x in enumerate((-0.21, -0.07, 0.07, 0.21)):
            p0 = Vector((x, port_out.y, port_out.z)) + side * 0.04
            pts = [p0, p0 + side * 0.08 + Vector((0, 0, -0.03)), Vector((x * 0.6 - 0.05, sd * 0.36, -0.16)), Vector((-0.18, sd * 0.3, -0.27)), Vector((-0.3, sd * 0.26, -0.33))]
            t = curve_tube('collecteur', [(*p, 1.0) for p in pts], 0.019, 10, profile_seg=4); assign(t, Mh); parent(t, root)
            # fil de bougie
            pl = c1 + Vector((x + 0.03, 0, 0)) + side * 0.12 + Vector((0, 0, 0.02))
            w = curve_tube('fil', [(-0.31, 0, 0.33, 1), (-0.2, sd * 0.1, 0.4, 1), (x, sd * 0.24, 0.33, 1), (*pl, 1)], 0.0045, 10, profile_seg=3)
            assign(w, mat('fil_bougie', (0.55, 0.03, 0.02), 0.45, coat=0.3)); parent(w, root)
    rbox('admission', (0.52, 0.2, 0.1), (0, 0, 0.32), (0, 0, 0), 0.02, Ma, root)
    rbox('carbu', (0.13, 0.13, 0.08), (0.0, 0, 0.4), (0, 0, 0), 0.012, Ma, root)
    # filtre à air rond : fond, élément plissé, couvercle chromé, écrou papillon
    def pleat(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        ang = math_node(nt, 'ARCTAN2', Y, X)
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.9; b.inputs['Distance'].default_value = 0.004
        nt.links.new(math_node(nt, 'ABSOLUTE', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', ang, 90.0))), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    el = cyl('element', 0.17, 0.06, 128, (0.0, 0, 0.475), (0, 0, 0)); assign(el, mat('element', (0.75, 0.2, 0.08), 0.85, base_fn=pleat)); parent(el, root)
    lid = lathe('couvercle', [(0.0, 0.53), (0.12, 0.528), (0.185, 0.52), (0.19, 0.508), (0.18, 0.505), (0.0, 0.505)], 128); assign(lid, M_chrome(0.03)); parent(lid, root)
    pan = lathe('fond', [(0.0, 0.445), (0.19, 0.445), (0.19, 0.452), (0.0, 0.452)], 128); assign(pan, M_chrome(0.05)); parent(pan, root)
    wn = rbox('papillon', (0.07, 0.012, 0.03), (0, 0, 0.545), (0, 0, 0.4), 0.005, M_chrome(0.1), root)
    # avant : distribution, pompe à eau, poulies, alternateur, courroie
    rbox('distribution', (0.04, 0.3, 0.3), (0.32, 0, 0.0), (0, 0, 0), 0.02, Mb, root)
    for (pz, py, pr) in ((-0.08, 0.0, 0.085), (0.1, 0.0, 0.06), (0.17, 0.19, 0.04)):
        pu = cyl('poulie', pr, 0.03, 64, (0.36, py, pz), (0, math.pi / 2, 0), 0.004); assign(pu, M_chrome(0.15)); parent(pu, root)
    alt = cyl('alternateur', 0.07, 0.12, 48, (0.26, 0.19, 0.17), (0, math.pi / 2, 0), 0.01); assign(alt, Ma); parent(alt, root)
    belt = curve_tube('courroie', [(0.37, 0.0, -0.165, 1), (0.37, 0.085, -0.08, 1), (0.37, 0.23, 0.17, 1), (0.37, 0.19, 0.21, 1), (0.37, 0.06, 0.16, 1), (0.37, 0.0, 0.16, 1),
                                   (0.37, -0.06, 0.1, 1), (0.37, -0.085, -0.08, 1)], 0.006, 12, closed=True, profile_seg=2)
    assign(belt, M_rubber()); parent(belt, root)
    dist = cyl('allumeur', 0.035, 0.12, 32, (-0.31, 0, 0.3), (0, 0, 0), 0.006); assign(dist, mat('tete_allumeur', (0.02, 0.02, 0.022), 0.4, coat=0.5)); parent(dist, root)
    bell = lathe('cloche', [(0.0, 0.0), (0.24, 0.0), (0.2, 0.12), (0.12, 0.16), (0.0, 0.16)], 96); bell.rotation_euler = (0, -math.pi / 2, 0); bell.location = (-0.3, 0, -0.02); assign(bell, Ma); parent(bell, root)
    if stand:
        St = mat('chandelle', (0.55, 0.03, 0.02), 0.4, coat=0.4, coat_rough=0.2)
        rbox('poteau', (0.07, 0.07, 0.62), (-0.62, 0, -0.33), (0, 0, 0), 0.006, St, root)
        rbox('pied', (0.07, 0.9, 0.07), (-0.62, 0, -0.68), (0, 0, 0), 0.006, St, root)
        rbox('longeron', (0.95, 0.07, 0.07), (-0.2, 0, -0.68), (0, 0, 0), 0.006, St, root)
        rbox('tete', (0.12, 0.1, 0.1), (-0.55, 0, 0.0), (0, 0, 0), 0.008, St, root)
        for sz in (-1, 1):
            for sy in (-1, 1):
                rbox('bras', (0.2, 0.025, 0.025), (-0.42, sy * 0.1, sz * 0.1), (0, 0, sy * 0.4), 0.004, St, root)
        for (cx, cy) in ((-0.62, 0.42), (-0.62, -0.42), (0.25, 0.0)):
            wh = cyl('roulette', 0.04, 0.03, 32, (cx, cy, -0.75), (math.pi / 2, 0, 0), 0.005); assign(wh, M_rubber()); parent(wh, root)
    return root


# ------------------------------------------------------------------ pignons de boîte de vitesses
def gear(name, r, teeth, width, helix=0.22, bore=0.016):
    """pignon hélicoïdal d'axe y (dents trapézoïdales arrondies)"""
    mmod = 2 * r / teeth; ra = r + mmod * 0.95; rf = r - mmod * 1.2
    prof = []
    for i in range(teeth):
        a0 = i / teeth * math.tau; da = math.tau / teeth
        for (fr, rr) in ((0.0, rf), (0.18, rf), (0.34, ra), (0.66, ra), (0.82, rf)):
            prof.append((rr * math.cos(a0 + fr * da), rr * math.sin(a0 + fr * da)))
    bm = bmesh.new(); layers = []; K_ = 6
    for k in range(K_ + 1):
        y = -width / 2 + width * k / K_; tw = helix * (k / K_ - 0.5) * width / max(r, 0.03)
        ca, sa = math.cos(tw), math.sin(tw)
        layers.append([bm.verts.new((x * ca - z * sa, y, x * sa + z * ca)) for (x, z) in prof])
    n = len(prof)
    for a, b in zip(layers, layers[1:]):
        for i in range(n):
            j = (i + 1) % n; bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(layers[0]); bm.faces.new(list(reversed(layers[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm, smooth=False)
    hole = cyl('alesage', bore, width * 3, 48, (0, 0, 0), (math.pi / 2, 0, 0)); boolean_cut(ob, [hole])
    bevel(ob, 0.0012, 1, angle=30); apply_mods(ob); shade_auto(ob, 30)
    return ob


def M_steel_oil(): return mat('acier_huile', (0.56, 0.56, 0.58), 0.2, metal=1.0, aniso=0.35, coat=0.35, coat_rough=0.04)


def gearset():
    """deux arbres de boîte manuelle : arbre primaire et arbre intermédiaire, cinq paires de pignons hélicoïdaux, bagues de
    synchro en laiton, roulements ; axe des arbres = x"""
    root = empty('boite')
    S = M_steel_oil(); Br = mat('laiton', (0.72, 0.5, 0.22), 0.25, metal=1.0, bump={'scale': 900, 'strength': 0.05})
    C = 0.2; ws = 0.026
    rs = [0.042, 0.056, 0.07, 0.084, 0.098]
    xs = [-0.2, -0.11, -0.02, 0.07, 0.16]
    for i, (x, r) in enumerate(zip(xs, rs)):
        for (yc, rr, tz) in ((0.0, r, 0), (C, C - r, 1)):
            t = max(16, int(rr * 520))
            g = gear('pignon', rr, t, ws, 0.25 if tz == 0 else -0.25, 0.017)
            g.rotation_euler = (0, 0, math.pi / 2); g.location = (x, 0, yc); assign(g, S); parent(g, root)
        if i in (0, 2, 4):
            sy = K.lathe_y('synchro', [(0.03, -0.006), (0.044, -0.006), (0.046, 0.006), (0.03, 0.006), (0.03, -0.006)], 64)
            sy.rotation_euler = (0, 0, math.pi / 2); sy.location = (x + 0.035, 0, 0); assign(sy, Br); parent(sy, root)
    for zc in (0.0, C):
        sh = cyl('arbre', 0.017, 0.62, 48, (0.0, 0, zc), (0, math.pi / 2, 0), 0.003); assign(sh, S); parent(sh, root)
        for x in (-0.28, 0.26):
            be = K.lathe_y('roulement', [(0.017, -0.012), (0.045, -0.012), (0.045, 0.012), (0.017, 0.012), (0.017, -0.012)], 64)
            be.rotation_euler = (0, 0, math.pi / 2); be.location = (x, 0, zc); assign(be, mat('roulement', (0.75, 0.75, 0.76), 0.12, metal=1.0)); parent(be, root)
            seal = K.lathe_y('cage', [(0.024, -0.0125), (0.038, -0.0125), (0.038, 0.0125), (0.024, 0.0125), (0.024, -0.0125)], 64)
            seal.rotation_euler = (0, 0, math.pi / 2); seal.location = (x, 0, zc); assign(seal, mat('joint', (0.05, 0.05, 0.05), 0.5)); parent(seal, root)
    return root


# ------------------------------------------------------------------ hélices
def blade_mesh(name, R0, R1, chord, pitch, thick, skew=0.0, rake=0.0, ns=18, nu=14):
    """pale vrillée (axe de rotation y) : sections minces cambrées, corde chord(s), pas constant (pitch, m/tour)"""
    bm = bmesh.new(); top = []; bot = []
    for i in range(ns + 1):
        s = i / ns; r = R0 + (R1 - R0) * s
        c = chord(s); phi = math.atan2(pitch, math.tau * r)
        tdir = Vector((-1, 0, 0)); adir = Vector((0, 1, 0)); rdir = Vector((0, 0, 1))
        cdir = tdir * math.cos(phi) + adir * math.sin(phi); ndir = -tdir * math.sin(phi) + adir * math.cos(phi)
        rt, rb_ = [], []
        for j in range(nu + 1):
            u = -1 + 2 * j / nu
            th = thick(s) * max(0.0, 1 - u * u) ** 0.6
            camber = 0.04 * c * (1 - u * u)
            base = rdir * r + cdir * (u * c / 2 + skew * s * s) + adir * (rake * s)
            rt.append(bm.verts.new(base + ndir * (camber + th / 2)))
            rb_.append(bm.verts.new(base + ndir * (camber - th / 2)))
        top.append(rt); bot.append(rb_)
    for i in range(ns):
        for j in range(nu):
            bm.faces.new((top[i][j], top[i + 1][j], top[i + 1][j + 1], top[i][j + 1]))
            bm.faces.new((bot[i][j], bot[i][j + 1], bot[i + 1][j + 1], bot[i + 1][j]))
        bm.faces.new((top[i][0], bot[i][0], bot[i + 1][0], top[i + 1][0]))
        bm.faces.new((top[i][nu], top[i + 1][nu], bot[i + 1][nu], bot[i][nu]))
    bm.faces.new([top[ns][j] for j in range(nu + 1)] + [bot[ns][j] for j in range(nu, -1, -1)])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm); return ob


def boat_prop(R=0.17, blades=3, finish=None):
    """hélice de bateau en bronze poli : moyeu, trois pales larges vrillées, écrou ; axe y"""
    root = empty('helice_bateau')
    M = finish or mat('bronze', (0.78, 0.5, 0.3), 0.14, metal=1.0, bump={'scale': 1200, 'strength': 0.02})
    hub = K.lathe_y('moyeu', [(0.0, -0.075), (0.032, -0.075), (0.045, -0.04), (0.048, 0.03), (0.04, 0.06), (0.0, 0.065)], 64); assign(hub, M); parent(hub, root)
    for b in range(blades):
        bl = blade_mesh('pale', 0.035, R, lambda s: 0.03 + 0.15 * max(0.0, math.sin(math.pi * min(0.98, 0.12 + s * 0.86))) ** 0.7, 0.28, lambda s: 0.012 * (1 - 0.75 * s) + 0.002, skew=0.035, rake=0.012)
        subsurf(bl, 1); apply_mods(bl); assign(bl, M); bl.rotation_euler = (0, b / blades * math.tau, 0); parent(bl, root)
    nut = cyl('ecrou', 0.024, 0.03, 6, (0, -0.09, 0), (math.pi / 2, 0, 0), 0.003); assign(nut, M_chrome(0.12, (0.8, 0.78, 0.75))); parent(nut, root)
    return root


def air_prop(R=0.85):
    """hélice d'avion bipale en bois lamellé verni ; axe y"""
    root = empty('helice_avion')
    def wfn(nt, p):
        v = tex_coord(nt, 'Object', 1.0)
        w = nt.nodes.new('ShaderNodeTexWave'); w.wave_type = 'BANDS'; w.bands_direction = 'Y'; w.inputs['Scale'].default_value = 9.0; w.inputs['Distortion'].default_value = 2.5
        w.inputs['Detail'].default_value = 4; nt.links.new(v, w.inputs['Vector'])
        nt.links.new(ramp(nt, w.outputs['Fac'], [(0.0, (0.34, 0.16, 0.06)), (0.5, (0.5, 0.27, 0.11)), (1.0, (0.26, 0.11, 0.04))]), p.inputs['Base Color'])
    M = mat('bois_verni', (0.4, 0.2, 0.08), 0.35, coat=1.0, coat_rough=0.05, base_fn=wfn)
    for b in range(2):
        bl = blade_mesh('pale', 0.07, R, lambda s: 0.1 * (1 - 0.45 * s) * max(0.0, 1 - (max(0.0, s - 0.85) / 0.15) ** 2) ** 0.5 + 0.02, 1.4, lambda s: 0.03 * (1 - 0.7 * s) + 0.004)
        subsurf(bl, 1); apply_mods(bl); assign(bl, M); bl.rotation_euler = (0, b * math.pi, 0); parent(bl, root)
    hub = cyl('moyeu', 0.07, 0.11, 48, (0, 0, 0), (math.pi / 2, 0, 0), 0.01); assign(hub, M); parent(hub, root)
    tipm = mat('bord_laiton', (0.8, 0.6, 0.3), 0.2, metal=1.0)
    spin = K.lathe_y('cone', [(0.0, 0.14), (0.04, 0.12), (0.08, 0.06), (0.085, 0.0), (0.0, 0.0)], 48); spin.location = (0, 0.055, 0); assign(spin, M_chrome(0.1)); parent(spin, root)
    return root


# ------------------------------------------------------------------ avertisseurs
def trumpet(L=0.25, r0=0.009, r1=0.05, M=None, name='trompe'):
    prof = []
    for i in range(25):
        t = i / 24; x = L * t
        r = r0 + (r1 - r0) * (math.exp(4.2 * t) - 1) / (math.exp(4.2) - 1)
        prof.append((r, x))
    prof += [(r1 + 0.003, L), (r1 + 0.003, L - 0.004), (r1 - 0.002, L - 0.004)]
    ob = K.lathe_y(name, prof, 64); assign(ob, M or M_chrome(0.05)); return ob


def air_horns(n=2, lengths=(0.24, 0.3), M=None):
    root = empty('avertisseurs')
    for i in range(n):
        L = lengths[i % len(lengths)] if n <= len(lengths) else 0.16 + 0.05 * i
        tr = trumpet(L, M=M); tr.rotation_euler = (0, 0, -math.pi / 2); tr.location = (0.02, (i - (n - 1) / 2) * 0.085, 0.06); parent(tr, root)
        so = cyl('electrovanne', 0.026, 0.06, 32, (-0.02, (i - (n - 1) / 2) * 0.085, 0.06), (0, math.pi / 2, 0), 0.004); assign(so, M_polymer()); parent(so, root)
    bar = box('support', (0.04, 0.085 * n + 0.04, 0.012), (-0.02, 0, 0.022), 0.004); assign(bar, M_chrome(0.15)); parent(bar, root)
    comp = cyl('compresseur', 0.045, 0.1, 40, (-0.15, 0.0, 0.05), (0, 0, 0), 0.008); assign(comp, mat('compresseur', (0.02, 0.02, 0.022), 0.4, coat=0.5)); parent(comp, root)
    grille = cyl('grille', 0.038, 0.004, 32, (-0.15, 0.0, 0.101), (0, 0, 0)); assign(grille, K.M_grille()); parent(grille, root)
    hose = curve_tube('durite', [(-0.15, 0.04, 0.05, 1), (-0.1, 0.06, 0.03, 1), (-0.05, 0.0, 0.03, 1), (-0.02, 0.0, 0.05, 1)], 0.005, 12); assign(hose, M_rubber()); parent(hose, root)
    return root


# ------------------------------------------------------------------ plaques
def plate_obj(txt='LK 777', bg=(0.9, 0.9, 0.86), fg=(0.05, 0.08, 0.22), border=None, W_=0.305, H_=0.152):
    """plaque générique emboutie (aucun modèle réel) : tôle, bord en relief, caractères en relief ; face vers -y"""
    root = empty('plaque')
    pl = box('tole', (W_, 0.0016, H_), (0, 0, 0), 0.008); assign(pl, mat('tole', bg, 0.35, coat=0.6, coat_rough=0.12, bump={'scale': 1400, 'strength': 0.03})); parent(pl, root)
    fr = box('rebord', (W_ - 0.012, 0.003, H_ - 0.012), (0, -0.0006, 0), 0.006); inner = box('c', (W_ - 0.024, 0.02, H_ - 0.024), (0, 0, 0))
    boolean_cut(fr, [inner]); assign(fr, mat('rebord', border or fg, 0.3, metal=0.3, coat=0.6)); parent(fr, root)
    cu = bpy.data.curves.new('texte', 'FONT'); cu.body = txt; cu.size = H_ * 0.48; cu.extrude = 0.0016; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.bevel_depth = 0.0005
    cu.space_character = 1.08
    tx = bpy.data.objects.new('texte', cu); link(tx); tx.rotation_euler = (math.pi / 2, 0, 0); tx.location = (0, -0.0018, -0.004); assign(tx, mat('lettres', fg, 0.3, metal=0.2, coat=0.6)); parent(tx, root)
    for sx in (-1, 1):
        for sz in (1,):
            h = cyl('vis', 0.0055, 0.004, 24, (sx * W_ * 0.36, -0.002, sz * H_ * 0.36), (math.pi / 2, 0, 0), 0.0015); assign(h, M_chrome(0.15)); parent(h, root)
    return root


# ------------------------------------------------------------------ électronique et petits objets
def keyfob(loc=(0, 0, 0), rot=0.0, led=(1.0, 0.1, 0.05), buttons=3):
    root = empty('telecommande', loc, (0, 0, rot))
    b = box('boitier', (0.062, 0.034, 0.013), (0, 0, 0.0065), 0.006); assign(b, mat('plastique_tel', (0.018, 0.018, 0.02), 0.4, coat=0.3, bump={'scale': 2000, 'strength': 0.05})); parent(b, root)
    for i in range(buttons):
        bt = cyl('bouton', 0.0055, 0.003, 24, (-0.014 + i * 0.012, 0, 0.0135), (0, 0, 0), 0.0012); assign(bt, mat('caoutchouc_gris', (0.22, 0.22, 0.23), 0.6)); parent(bt, root)
    l = sphere('led', 0.0018, (0.022, 0.0, 0.013), seg=12, rings=6); assign(l, emission('led', led, 30.0)); parent(l, root)
    ring = curve_tube('anneau', [(-0.031 - 0.012 + 0.012 * math.cos(a), 0.012 * math.sin(a), 0.006, 1) for a in [i / 24 * math.tau for i in range(25)]], 0.0012, 4, kind='POLY'); assign(ring, M_chrome(0.15)); parent(ring, root)
    return root


def module_box(size=(0.11, 0.07, 0.028), loc=(0, 0, 0), rot=0.0, led=(1.0, 0.08, 0.04), led_k=25.0, wires=((0.75, 0.05, 0.03), (0.04, 0.04, 0.045), (0.9, 0.75, 0.05)), antenna=False, color=(0.02, 0.02, 0.022)):
    root = empty('module', loc, (0, 0, rot))
    b = box('boitier', size, (0, 0, size[2] / 2), 0.005); assign(b, mat('boitier', color, 0.45, coat=0.2, bump={'scale': 1800, 'strength': 0.06})); parent(b, root)
    l = sphere('led', 0.0026, (size[0] * 0.3, -size[1] * 0.25, size[2] + 0.001), seg=12, rings=6); assign(l, emission('led', led, led_k)); parent(l, root)
    for i, c in enumerate(wires):
        y = (i - (len(wires) - 1) / 2) * 0.007
        w = curve_tube('fil', [(size[0] / 2, y, 0.01, 1), (size[0] / 2 + 0.04, y * 1.5, 0.006, 1), (size[0] / 2 + 0.09, y * 3 + 0.01 * math.sin(i * 2.1), 0.004, 1), (size[0] / 2 + 0.16, y * 5 + 0.02 * math.sin(i), 0.004, 1)], 0.0018, 12, profile_seg=3)
        assign(w, mat('gaine', c, 0.45, coat=0.2)); parent(w, root)
    if antenna:
        an = cyl('antenne', 0.003, 0.09, 12, (-size[0] * 0.35, size[1] * 0.25, size[2] + 0.045), (0, 0, 0)); assign(an, M_polymer()); parent(an, root)
    return root


def siren(loc=(0, 0, 0), rot=0.0):
    root = empty('sirene', loc, (0, 0, rot))
    h = K.lathe_y('pavillon', [(0.0, -0.03), (0.035, -0.03), (0.038, 0.0), (0.045, 0.03), (0.058, 0.055), (0.06, 0.06), (0.052, 0.06), (0.0, 0.02)], 48)
    h.rotation_euler = (0, 0, 0); h.location = (0, 0, 0.065); assign(h, mat('sirene', (0.02, 0.02, 0.022), 0.4, coat=0.3)); parent(h, root)
    g = cyl('grille', 0.05, 0.002, 40, (0, 0.058, 0.065), (math.pi / 2, 0, 0)); assign(g, K.M_grille()); parent(g, root)
    br = box('patte', (0.03, 0.05, 0.004), (0, -0.02, 0.002), 0.002); assign(br, M_metal()); parent(br, root)
    st = box('equerre', (0.03, 0.004, 0.05), (0, -0.03, 0.03), 0.002); assign(st, M_metal()); parent(st, root)
    return root


def car_key(loc=(0, 0, 0), rot=0.0):
    root = empty('cle', loc, (0, 0, rot))
    head = box('tete', (0.035, 0.03, 0.009), (0, 0, 0.0045), 0.008); assign(head, M_polymer()); parent(head, root)
    bl = extrude2d('lame', [(0.017, -0.007), (0.075, -0.006), (0.08, 0.0), (0.075, 0.006), (0.017, 0.007)], 0.0022, 0.0004); bl.location = (0, 0, 0.004)
    assign(bl, mat('laiton_cle', (0.78, 0.66, 0.4), 0.22, metal=1.0)); parent(bl, root)
    return root


def clipboard_form(loc=(0, 0, 0), rot=0.0):
    """porte-documents scanné (Poly Haven) avec un formulaire vierge (lignes et cases, sans texte)"""
    r, obs = A.model('clipboard'); r.location = loc; r.rotation_euler = (0, 0, rot)
    def ffn(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        lines = math_node(nt, 'GREATER_THAN', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', Y, 260.0)), 0.97)
        cols = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', X, -0.07), math_node(nt, 'LESS_THAN', X, 0.08))
        hdr = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', Y, 0.1), math_node(nt, 'LESS_THAN', Y, 0.12))
        ink = math_node(nt, 'MAXIMUM', math_node(nt, 'MULTIPLY', lines, cols), hdr)
        nt.links.new(mix(nt, (0.86, 0.85, 0.8), (0.18, 0.2, 0.28), ink), p.inputs['Base Color'])
    paper = box('formulaire', (0.2, 0.27, 0.0006), (0, -0.02, 0.0), 0.0); paper.location = (0, -0.025, 0.0)
    assign(paper, mat('papier', (0.86, 0.85, 0.8), 0.85, base_fn=ffn)); parent(paper, r)
    bpy.context.view_layer.update()
    lo, hi = A.bbox([o for o in obs if o.type == 'MESH'])
    paper.location = (0, -0.03, hi.z - r.location.z - 0.012)
    return r


def laptop_ecu(loc=(0, 0, 0)):
    """mise au point du calculateur moteur : boîtier de calculateur ouvert (carte électronique scannée), câble, ordinateur
    portable scanné dont l'écran montre une cartographie (grille)"""
    root = empty('ems', loc)
    r, obs = A.model('classic_laptop'); r.location = (0.25, 0.2, 0); r.rotation_euler = (0, 0, math.radians(-20)); parent(r, root)
    scr = [o for o in obs if 'screen' in o.name]
    ecu = box('calculateur', (0.2, 0.15, 0.04), (-0.25, -0.05, 0.02), 0.006); assign(ecu, mat('alu_brosse', (0.7, 0.7, 0.72), 0.3, metal=1.0, aniso=0.6)); parent(ecu, root)
    for i in range(8):
        f = box('ailette', (0.2, 0.004, 0.012), (-0.25, -0.115 + i * 0.019, 0.046), 0.001); assign(f, mat('alu_brosse', (0.7, 0.7, 0.72), 0.3, metal=1.0, aniso=0.6)); parent(f, root)
    con = box('connecteur', (0.03, 0.09, 0.025), (-0.14, -0.05, 0.02), 0.004); assign(con, M_polymer()); parent(con, root)
    cb = curve_tube('cable', [(-0.125, -0.05, 0.02, 1), (-0.05, -0.1, 0.008, 1), (0.05, -0.02, 0.006, 1), (0.12, 0.1, 0.01, 1)], 0.004, 16); assign(cb, mat('cable', (0.03, 0.03, 0.035), 0.5)); parent(cb, root)
    return root, scr


def screen_map_material(rgb=(1.0, 0.62, 0.15), k=3.0):
    """écran : cartographie d'injection stylisée (grille et courbe en fil de fer), lueur ambrée"""
    m = bpy.data.materials.new('ecran'); nt = _nodes(m); N = nt.nodes; L = nt.links
    for n in list(N): N.remove(n)
    out = N.new('ShaderNodeOutputMaterial'); em = N.new('ShaderNodeEmission'); em.inputs['Strength'].default_value = k
    uv = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(uv.outputs['UV'], sep.inputs[0])
    X, Y = sep.outputs['X'], sep.outputs['Y']
    gx = math_node(nt, 'GREATER_THAN', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', X, 120.0)), 0.92)
    gy = math_node(nt, 'GREATER_THAN', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', math_node(nt, 'ADD', Y, math_node(nt, 'MULTIPLY', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', X, 9.0)), 0.06)), 120.0)), 0.92)
    g = math_node(nt, 'MAXIMUM', gx, gy)
    c = mix(nt, (0.01, 0.008, 0.004), tuple(rgb), g)
    L.new(c, em.inputs['Color']); L.new(em.outputs[0], out.inputs[0])
    return m


def charge_kit(loc=(0, 0, 0)):
    """« bombe » de véhicule stylisée : bloc emballé de film et de ruban, récepteur à antenne, télécommande à capot rouge"""
    root = empty('charge', loc)
    blk = box('bloc', (0.17, 0.09, 0.045), (0, 0, 0.0225), 0.012); assign(blk, mat('emballage', (0.06, 0.07, 0.035), 0.42, coat=0.7, coat_rough=0.12, bump={'scale': 120, 'strength': 0.3})); parent(blk, root)
    for x in (-0.05, 0.05):
        t = box('ruban', (0.022, 0.095, 0.05), (x, 0, 0.0225), 0.008); assign(t, mat('ruban', (0.012, 0.012, 0.014), 0.35, coat=0.4)); parent(t, root)
    rx = module_box((0.07, 0.05, 0.022), (0.0, 0.0, 0.045), 0.0, (1.0, 0.05, 0.03), 40.0, ((0.75, 0.05, 0.03), (0.04, 0.04, 0.045)), antenna=True); parent(rx, root)
    rc = empty('detonateur', (0.22, -0.12, 0), (0, 0, math.radians(25))); parent(rc, root)
    bx = box('boitier', (0.07, 0.11, 0.03), (0, 0, 0.015), 0.008); assign(bx, mat('boitier_noir', (0.02, 0.02, 0.022), 0.4, coat=0.4, bump={'scale': 1500, 'strength': 0.05})); parent(bx, rc)
    cap = box('capot', (0.03, 0.03, 0.012), (0, -0.025, 0.036), 0.004); cap.rotation_euler = (math.radians(-55), 0, 0); assign(cap, mat('capot_rouge', (0.6, 0.02, 0.02), 0.3, trans=0.4, coat=0.8)); parent(cap, rc)
    bt = cyl('bouton', 0.009, 0.006, 24, (0, -0.025, 0.032), (0, 0, 0), 0.002); assign(bt, mat('rouge', (0.6, 0.02, 0.02), 0.3, coat=0.8)); parent(bt, rc)
    an = cyl('antenne', 0.003, 0.12, 12, (0.02, 0.04, 0.09), (0, 0, 0)); assign(an, M_polymer()); parent(an, rc)
    return root


def armor_set(loc=(0, 0, 0)):
    """blindage : plaque d'acier usinée marquée d'impacts écrasés, verre feuilleté épais étoilé"""
    root = empty('blindage', loc)
    def imp(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        acc = None
        for (cx, cz, r) in ((-0.08, 0.06, 0.03), (0.07, -0.02, 0.026), (0.12, 0.08, 0.022)):
            d = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'POWER', math_node(nt, 'SUBTRACT', X, cx), 2.0), math_node(nt, 'POWER', math_node(nt, 'SUBTRACT', Z, cz), 2.0)))
            h = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MINIMUM', math_node(nt, 'DIVIDE', d, r), 1.0))
            acc = h if acc is None else math_node(nt, 'MAXIMUM', acc, h)
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 1.0; b.inputs['Distance'].default_value = 0.004; b.invert = True
        nt.links.new(math_node(nt, 'POWER', acc, 2.0), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
        nt.links.new(mix(nt, (0.11, 0.115, 0.12), (0.2, 0.2, 0.2), math_node(nt, 'GREATER_THAN', acc, 0.55)), p.inputs['Base Color'])
    pl = box('plaque', (0.42, 0.02, 0.3), (0, 0, 0.15), 0.004); pl.rotation_euler = (math.radians(-12), 0, 0); pl.location = (0, 0.03, 0.15)
    assign(pl, mat('acier_blinde', (0.11, 0.115, 0.12), 0.38, metal=1.0, base_fn=imp)); parent(pl, root)
    for k, (x, z) in enumerate(((-0.08, 0.06), (0.07, -0.02), (0.12, 0.08))):
        s = sphere('plomb', 0.012, (x, 0.0, 0.15 + z), (1.0, 0.35, 1.0), 16, 8); s.rotation_euler = (math.radians(-12), 0, 0)
        s.location = (x, 0.03 - 0.012 - 0.003 + 0.0, 0.15 + z * math.cos(math.radians(12)))
        assign(s, mat('plomb', (0.18, 0.18, 0.17), 0.6, metal=0.7, bump={'scale': 300, 'strength': 0.6})); parent(s, root)
    def crack(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        v = nt.nodes.new('ShaderNodeTexVoronoi'); v.feature = 'DISTANCE_TO_EDGE'; v.inputs['Scale'].default_value = 60.0
        cv = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(X, cv.inputs[0]); nt.links.new(Z, cv.inputs[1])
        nt.links.new(cv.outputs[0], v.inputs['Vector'])
        d = math_node(nt, 'SQRT', math_node(nt, 'ADD', math_node(nt, 'POWER', math_node(nt, 'SUBTRACT', X, 0.03), 2.0), math_node(nt, 'POWER', math_node(nt, 'SUBTRACT', Z, 0.11), 2.0)))
        near = math_node(nt, 'SUBTRACT', 1.0, math_node(nt, 'MINIMUM', math_node(nt, 'DIVIDE', d, 0.11), 1.0))
        lines = math_node(nt, 'MULTIPLY', math_node(nt, 'LESS_THAN', v.outputs['Distance'], 0.012), math_node(nt, 'POWER', near, 1.5))
        nt.links.new(mix(nt, (0.85, 0.9, 0.9), (1.0, 1.0, 1.0), lines), p.inputs['Base Color'])
        nt.links.new(math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', 1.0, lines), 1.0), p.inputs['Transmission Weight'])
        nt.links.new(math_node(nt, 'ADD', 0.02, math_node(nt, 'MULTIPLY', lines, 0.6)), p.inputs['Roughness'])
    gl = box('verre', (0.26, 0.045, 0.2), (0.24, -0.12, 0.1), 0.004); gl.rotation_euler = (math.radians(-8), 0, math.radians(-25))
    assign(gl, mat('verre_feuillete', (0.85, 0.92, 0.9), 0.02, trans=1.0, ior=1.5, base_fn=crack)); parent(gl, root)
    return root


def roll_cage(color=(0.02, 0.02, 0.022), loc=(0, 0, 0), rot=0.0):
    """arceau 6 points : arceau principal, demi-arceaux de pare-brise, entretoises, diagonale, platines soudées ; axe x = avant"""
    root = empty('arceau', loc, (0, 0, rot))
    M = mat('tube', color, 0.35, metal=0.5, coat=0.6, coat_rough=0.15, bump={'scale': 400, 'strength': 0.05})
    def tube(pts, r=0.02):
        t = curve_tube('tube', [(*p, 1.0) for p in pts], r, 16, profile_seg=6); assign(t, M); parent(t, root); return t
    W2 = 0.62; H = 1.05
    def hoop(x, w, h, rr=0.16):
        pts = [(x, -w, 0.0), (x, -w, h - rr), (x, -w + rr * 0.3, h - rr * 0.3), (x, -w + rr, h), (x, w - rr, h), (x, w - rr * 0.3, h - rr * 0.3), (x, w, h - rr), (x, w, 0.0)]
        return tube(pts)
    hoop(0.0, W2, H)
    for sd in (-1, 1):
        tube([(1.25, sd * (W2 - 0.04), 0.0), (1.1, sd * (W2 - 0.05), 0.45), (0.75, sd * (W2 - 0.08), 0.85), (0.35, sd * (W2 - 0.12), H - 0.02), (0.02, sd * (W2 - 0.16), H)])
        tube([(0.0, sd * W2, 0.42), (1.18, sd * (W2 - 0.04), 0.3)])
        tube([(0.0, sd * (W2 - 0.2), H - 0.03), (-0.9, sd * 0.5, 0.12)])
    tube([(0.0, -W2, 0.12), (0.0, W2 * 0.3, H - 0.25), (0.0, W2 - 0.1, H - 0.02)])
    tube([(0.0, -W2, 0.6), (0.0, W2, 0.6)])
    for (x, y) in ((0.0, -W2), (0.0, W2), (1.25, -(W2 - 0.04)), (1.25, W2 - 0.04), (-0.9, -0.5), (-0.9, 0.5)):
        pl = box('platine', (0.12, 0.12, 0.006), (x, y, 0.003), 0.004); assign(pl, M_metal()); parent(pl, root)
    return root


def cone_filter(loc=(0, 0, 0), rot=(0, 0, 0), rgb=(0.6, 0.04, 0.03)):
    root = empty('filtre_conique', loc, rot)
    def pleat(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        ang = math_node(nt, 'ARCTAN2', Z, X)
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 1.0; b.inputs['Distance'].default_value = 0.005
        nt.links.new(math_node(nt, 'ABSOLUTE', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', ang, 30.0))), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    c = K.lathe_y('cone', [(0.04, 0.0), (0.075, 0.02), (0.075, 0.12), (0.06, 0.16), (0.0, 0.16)], 96); assign(c, mat('coton', rgb, 0.8, base_fn=pleat)); parent(c, root)
    base = K.lathe_y('bague', [(0.035, -0.03), (0.042, -0.03), (0.044, 0.02), (0.035, 0.02)], 64); assign(base, M_polymer()); parent(base, root)
    cap = K.lathe_y('chapeau', [(0.0, 0.16), (0.062, 0.158), (0.064, 0.15), (0.0, 0.15)], 64); assign(cap, M_chrome(0.08)); parent(cap, root)
    cl = K.lathe_y('collier', [(0.043, -0.02), (0.047, -0.02), (0.047, -0.008), (0.043, -0.008)], 64); assign(cl, M_chrome(0.2)); parent(cl, root)
    return root


def spark_plug(loc=(0, 0, 0), rot=(0, 0, 0)):
    root = empty('bougie', loc, rot)
    ins = K.lathe_y('isolant', [(0.0, 0.03), (0.0055, 0.03), (0.0065, 0.035), (0.0065, 0.06), (0.0045, 0.065), (0.0045, 0.075), (0.0, 0.075)], 32)
    assign(ins, mat('ceramique_bougie', (0.85, 0.84, 0.8), 0.25, coat=0.6, sss=0.1)); parent(ins, root)
    hexn = cyl('six_pans', 0.0095, 0.012, 6, (0, 0.022, 0), (math.pi / 2, 0, 0), 0.001); assign(hexn, M_chrome(0.2, (0.75, 0.75, 0.73))); parent(hexn, root)
    th = K.lathe_y('filetage', [(0.0, 0.0), (0.006, 0.0), (0.0065, 0.016), (0.0, 0.016)], 32); assign(th, mat('filet', (0.6, 0.6, 0.6), 0.3, metal=1.0)); parent(th, root)
    tip = cyl('borne', 0.0028, 0.012, 16, (0, 0.08, 0), (math.pi / 2, 0, 0), 0.0005); assign(tip, M_chrome(0.2)); parent(tip, root)
    return root


def coilover(loc=(0, 0, 0), rot=(0, 0, 0), spring=(0.6, 0.04, 0.03), body=(0.15, 0.25, 0.75)):
    """amortisseur combiné fileté : corps anodisé, ressort hélicoïdal peint, coupelles, chape ; axe z"""
    root = empty('combine', loc, rot)
    A_ = mat('anodise', body, 0.3, metal=1.0, coat=0.4)
    bd = cyl('corps', 0.024, 0.22, 48, (0, 0, 0.13), (0, 0, 0), 0.003); assign(bd, A_); parent(bd, root)
    rod = cyl('tige', 0.008, 0.14, 24, (0, 0, 0.3), (0, 0, 0)); assign(rod, M_chrome(0.05)); parent(rod, root)
    pts = []; n = 7.5; R = 0.036
    for i in range(int(n * 24) + 1):
        a = i / 24 * math.tau; z = 0.07 + 0.24 * i / (n * 24)
        pts.append((R * math.cos(a), R * math.sin(a), z, 1.0))
    sp = curve_tube('ressort', pts, 0.0055, 64, kind='POLY', profile_seg=4); assign(sp, mat('ressort', spring, 0.3, coat=0.8, coat_rough=0.06)); parent(sp, root)
    for z in (0.065, 0.315):
        cp = cyl('coupelle', 0.045, 0.008, 48, (0, 0, z), (0, 0, 0), 0.002); assign(cp, A_); parent(cp, root)
    top = cyl('tete', 0.03, 0.03, 32, (0, 0, 0.38), (0, 0, 0), 0.004); assign(top, M_rubber()); parent(top, root)
    eye = cyl('chape', 0.016, 0.02, 32, (0, 0, 0.012), (math.pi / 2, 0, 0), 0.003); assign(eye, M_metal()); parent(eye, root)
    return root


def bov(loc=(0, 0, 0), rot=(0, 0, 0), rgb=(0.1, 0.25, 0.7)):
    root = empty('dechargeur', loc, rot)
    A_ = mat('anodise', rgb, 0.3, metal=1.0, coat=0.4)
    b = K.lathe_y('corps', [(0.0, 0.0), (0.03, 0.0), (0.032, 0.03), (0.024, 0.045), (0.024, 0.06), (0.0, 0.06)], 48)
    b.rotation_euler = (math.pi / 2, 0, 0); assign(b, A_); parent(b, root)
    pipe = cyl('entree', 0.016, 0.04, 32, (0.035, 0, 0.012), (0, math.pi / 2, 0), 0.002); assign(pipe, A_); parent(pipe, root)
    return root


def brake_pads(loc=(0, 0, 0), rot=0.0):
    root = empty('plaquettes', loc, (0, 0, rot))
    for k in (0, 1):
        sh = extrude2d('support', K.fillet([(-0.065, -0.025), (0.065, -0.025), (0.06, 0.03), (-0.06, 0.03)], 0.01, 3), 0.004, 0.0005); sh.location = (0, k * 0.075, 0.002)
        assign(sh, M_metal((0.3, 0.3, 0.32))); parent(sh, root)
        fr = extrude2d('garniture', K.fillet([(-0.058, -0.02), (0.058, -0.02), (0.054, 0.025), (-0.054, 0.025)], 0.008, 3), 0.01, 0.001); fr.location = (0, k * 0.075, 0.009)
        assign(fr, mat('garniture', (0.08, 0.075, 0.07), 0.85, bump={'scale': 900, 'strength': 0.3})); parent(fr, root)
    return root


def moto_set(loc=(0, 0, 0)):
    """pièces de moto : roue à rayons (pneu étroit), silencieux chromé, guidon avec poignées et rétroviseur rond"""
    root = empty('moto', loc)
    me, side = K.tire_data(0.12, 0.31, 0.25)
    t = bpy.data.objects.new('pneu_moto', me); link(t)
    wh = empty('roue_moto', (-0.25, 0.1, 0.31), (0, 0, math.radians(200))); parent(wh, root); parent(t, wh)
    ch = M_chrome(0.05)
    rimo = K.lathe_y('jante_moto', [(0.245, -0.045), (0.255, -0.05), (0.258, -0.045), (0.25, 0.0), (0.258, 0.045), (0.255, 0.05), (0.245, 0.045), (0.24, 0.0), (0.245, -0.045)], 128); assign(rimo, ch); parent(rimo, wh)
    hub = K.lathe_y('moyeu', [(0.0, -0.06), (0.05, -0.06), (0.055, -0.04), (0.035, -0.02), (0.035, 0.02), (0.055, 0.04), (0.05, 0.06), (0.0, 0.06)], 48); assign(hub, mat('moyeu', (0.6, 0.6, 0.62), 0.3, metal=1.0)); parent(hub, wh)
    for i in range(36):
        a = i / 36 * math.tau; s_ = 1 if i % 2 else -1
        s = curve_tube('rayon', [(math.cos(a + 0.15 * s_) * 0.05, s_ * 0.05, math.sin(a + 0.15 * s_) * 0.05, 1), (math.cos(a) * 0.243, 0.0, math.sin(a) * 0.243, 1)], 0.0017, 2, kind='POLY', profile_seg=2)
        assign(s, ch); parent(s, wh)
    disc = ring_y('disque', 0.06, 0.14, 0.064, 0.069, 96); assign(disc, M_disc()); parent(disc, wh)
    mf = K.lathe_y('silencieux', [(0.0, 0.0), (0.03, 0.0), (0.032, 0.05), (0.05, 0.1), (0.055, 0.45), (0.05, 0.5), (0.03, 0.52), (0.026, 0.56), (0.0, 0.56)], 64)
    mf.rotation_euler = (0, math.radians(-90), math.radians(-20)); mf.location = (0.15, -0.25, 0.058); assign(mf, ch); parent(mf, root)
    hs = box('pare_chaleur', (0.3, 0.004, 0.06), (0.32, -0.205, 0.105), 0.002); hs.rotation_euler = (0, 0, math.radians(15)); assign(hs, mat('alu_perce', (0.7, 0.7, 0.72), 0.3, metal=1.0)); parent(hs, root)
    bar = curve_tube('guidon', [(0.15, 0.25, 0.04, 1), (0.25, 0.2, 0.06, 1), (0.42, 0.18, 0.09, 1), (0.6, 0.2, 0.06, 1), (0.7, 0.25, 0.04, 1)], 0.011, 24, profile_seg=4)
    assign(bar, ch); parent(bar, root)
    for (x, y, z) in ((0.17, 0.245, 0.042), (0.68, 0.245, 0.042)):
        g = cyl('poignee', 0.016, 0.11, 32, (x, y, z), (0, math.pi / 2, math.radians(-25 if x < 0.4 else 25)), 0.004); assign(g, M_rubber()); parent(g, root)
    mr = cyl('retro', 0.05, 0.012, 48, (0.62, 0.32, 0.3), (math.radians(70), 0, 0), 0.004); assign(mr, ch); parent(mr, root)
    ms = curve_tube('tige_retro', [(0.6, 0.22, 0.07, 1), (0.61, 0.28, 0.2, 1), (0.62, 0.31, 0.27, 1)], 0.004, 8); assign(ms, ch); parent(ms, root)
    return root


def spray_gun(loc=(0, 0, 0), rot=0.0):
    """pistolet à peinture à godet supérieur (sans marque)"""
    root = empty('pistolet', loc, (0, 0, rot)); M = mat('alu_pistolet', (0.72, 0.72, 0.74), 0.22, metal=1.0)
    body = K.lathe_y('corps', [(0.0, -0.05), (0.018, -0.05), (0.022, -0.02), (0.02, 0.05), (0.014, 0.06), (0.0, 0.06)], 48); body.rotation_euler = (0, 0, -math.pi / 2); body.location = (0, 0, 0.17); assign(body, M); parent(body, root)
    cap = K.lathe_y('chapeau', [(0.0, 0.0), (0.024, 0.0), (0.024, 0.012), (0.008, 0.02), (0.0, 0.02)], 48); cap.rotation_euler = (0, 0, -math.pi / 2); cap.location = (0.06, 0, 0.17); assign(cap, M_chrome(0.15, (0.8, 0.62, 0.35))); parent(cap, root)
    for sd in (-1, 1):
        h = box('cornes', (0.008, 0.008, 0.02), (0.07, sd * 0.02, 0.17), 0.003); assign(h, M_chrome(0.15, (0.8, 0.62, 0.35))); parent(h, root)
    hd = box('poignee', (0.035, 0.028, 0.13), (-0.035, 0, 0.09), 0.012); hd.rotation_euler = (0, math.radians(18), 0); assign(hd, M); parent(hd, root)
    tr = curve_tube('gachette', [(0.0, 0, 0.165, 1), (0.02, 0, 0.12, 1), (0.01, 0, 0.07, 1)], 0.005, 12, profile_seg=3); assign(tr, M); parent(tr, root)
    cup = K.lathe_y('godet', [(0.0, 0.0), (0.012, 0.0), (0.04, 0.03), (0.042, 0.11), (0.036, 0.12), (0.0, 0.12)], 64); cup.rotation_euler = (math.pi / 2, 0, 0); cup.location = (0.0, 0, 0.19)
    assign(cup, mat('godet', (0.9, 0.9, 0.88), 0.25, trans=0.6, ior=1.45, coat=0.3)); parent(cup, root)
    paint_ = cyl('peinture', 0.036, 0.05, 48, (0.0, 0, 0.235), (0, 0, 0)); assign(paint_, mat('peinture_godet', (0.6, 0.02, 0.03), 0.2)); parent(paint_, root)
    hose = curve_tube('tuyau', [(-0.06, 0, 0.03, 1), (-0.1, 0.0, 0.0, 1), (-0.25, 0.1, 0.003, 1), (-0.45, 0.05, 0.004, 1)], 0.006, 16); assign(hose, mat('tuyau', (0.1, 0.12, 0.35), 0.45)); parent(hose, root)
    return root


def fan_deck(loc=(0, 0, 0), rot=0.0, n=16):
    """nuancier en éventail (lames de couleurs de carrosserie)"""
    root = empty('nuancier', loc, (0, 0, rot))
    cols = [(0.55, 0.02, 0.03), (0.75, 0.25, 0.02), (0.85, 0.65, 0.05), (0.1, 0.35, 0.1), (0.02, 0.2, 0.45), (0.02, 0.05, 0.25), (0.35, 0.05, 0.35), (0.85, 0.85, 0.86),
            (0.4, 0.41, 0.43), (0.03, 0.03, 0.035), (0.6, 0.45, 0.3), (0.1, 0.55, 0.6), (0.9, 0.3, 0.45), (0.25, 0.08, 0.04), (0.5, 0.6, 0.15), (0.15, 0.15, 0.4)]
    for i in range(n):
        a = math.radians(-50 + 100 * i / (n - 1))
        lam = box('lame', (0.045, 0.2, 0.0008), (0, 0, 0), 0.004)
        lam.location = (math.sin(a) * 0.1, math.cos(a) * 0.1 - 0.1, 0.001 + i * 0.0009); lam.rotation_euler = (0, 0, -a)
        assign(lam, K.M_car(cols[i % len(cols)], metal=0.5, rough=0.35, gaps=None, flakes=0.25)); parent(lam, root)
    piv = cyl('axe', 0.006, 0.02, 16, (0, -0.19, 0.008), (0, 0, 0)); assign(piv, M_chrome(0.2)); parent(piv, root)
    return root


def tape_roll(loc=(0, 0, 0), rgb=(0.82, 0.74, 0.5)):
    t = K.lathe_y('ruban_cache', [(0.038, -0.024), (0.06, -0.024), (0.06, 0.024), (0.038, 0.024), (0.038, -0.024)], 64)
    t.rotation_euler = (math.pi / 2, 0, 0); t.location = loc; assign(t, mat('papier_cache', rgb, 0.8, bump={'scale': 900, 'strength': 0.15})); return t


def bucket_seat(loc=(0, 0, 0), rot=0.0, rgb=(0.32, 0.03, 0.04)):
    """baquet sellerie « roulée-capitonnée » : assise et dossier à boudins, joues, appui-tête intégré ; face vers -x"""
    root = empty('baquet', loc, (0, 0, rot))
    def tuck(nt, p):
        X, Y, Z, _ = K.obj_xyz(nt)
        b = nt.nodes.new('ShaderNodeBump'); b.inputs['Strength'].default_value = 0.9; b.inputs['Distance'].default_value = 0.008
        nt.links.new(math_node(nt, 'ABSOLUTE', math_node(nt, 'SINE', math_node(nt, 'MULTIPLY', Y, 70.0))), b.inputs['Height']); nt.links.new(b.outputs['Normal'], p.inputs['Normal'])
    Ml = mat('cuir_capitonne', rgb, 0.45, coat=0.35, coat_rough=0.2, base_fn=tuck)
    Mside = M_leather(rgb, 0.5)
    seat = box('assise', (0.48, 0.42, 0.11), (0.0, 0, 0.32), 0.05); assign(seat, Ml); parent(seat, root)
    back = box('dossier', (0.12, 0.42, 0.62), (0.26, 0, 0.66), 0.05); back.rotation_euler = (0, math.radians(14), 0); assign(back, Ml); parent(back, root)
    for sd in (-1, 1):
        bo = box('joue', (0.14, 0.07, 0.6), (0.27, sd * 0.25, 0.64), 0.03); bo.rotation_euler = (0, math.radians(14), sd * math.radians(-6)); assign(bo, Mside); parent(bo, root)
        bs = box('joue_assise', (0.46, 0.07, 0.15), (0.0, sd * 0.25, 0.34), 0.03); assign(bs, Mside); parent(bs, root)
    hr = box('appui_tete', (0.1, 0.26, 0.18), (0.36, 0, 1.06), 0.05); hr.rotation_euler = (0, math.radians(14), 0); assign(hr, Ml); parent(hr, root)
    base = box('embase', (0.4, 0.36, 0.2), (0.02, 0, 0.16), 0.02); assign(base, M_polymer()); parent(base, root)
    for sd in (-1, 1):
        rl = box('glissiere', (0.5, 0.03, 0.03), (0.0, sd * 0.15, 0.03), 0.004); assign(rl, M_chrome(0.15)); parent(rl, root)
    return root


def chain_wheel(loc=(0, 0, 0), rot=(0, 0, 0), R=0.17):
    """volant chaîne chromé (sellerie de lowrider) : maillons alternés sur un cercle, moyeu et branches"""
    root = empty('volant_chaine', loc, rot)
    ch = M_chrome(0.04)
    n = 40
    for i in range(n):
        a = i / n * math.tau
        o = curve_tube('maillon', [(0.016 * math.cos(t), 0.009 * math.sin(t), 0, 1) for t in [k / 16 * math.tau for k in range(16)]], 0.0028, 2, closed=True, kind='POLY', profile_seg=2)
        o.location = (R * math.cos(a), R * math.sin(a), 0); o.rotation_euler = ((math.pi / 2) * (i % 2), 0, a + math.pi / 2)
        assign(o, ch); parent(o, root)
    hub = cyl('moyeu', 0.045, 0.03, 48, (0, 0, 0.0), (0, 0, 0), 0.006); assign(hub, ch); parent(hub, root)
    for k in range(3):
        a = k / 3 * math.tau + math.pi / 2
        sp = box('branche', (R - 0.03, 0.022, 0.008), (math.cos(a) * (R / 2), math.sin(a) * (R / 2), 0), 0.003); sp.rotation_euler = (0, 0, a); assign(sp, ch); parent(sp, root)
    return root


def tire_smoke(rgb=(1.0, 0.3, 0.75), origin=(-1.17, -0.85, 0.15), k=1.0, scale=1.0):
    """fumée de pneus colorée : volume (densité bruitée qui s'estompe) qui s'élève de la roue arrière et dérive vers l'arrière"""
    ob = box('fumee', (3.4 * scale, 2.6 * scale, 1.6 * scale), (origin[0] - 1.35 * scale, origin[1] - 0.6 * scale, origin[2] + 0.62 * scale), 0.0)
    m = bpy.data.materials.new('fumee'); nt = _nodes(m); N = nt.nodes; L = nt.links
    for n_ in list(N): N.remove(n_)
    out = N.new('ShaderNodeOutputMaterial'); pv = N.new('ShaderNodeVolumePrincipled')
    pv.inputs['Color'].default_value = (*rgb, 1); pv.inputs['Anisotropy'].default_value = 0.25
    tc = N.new('ShaderNodeTexCoord'); sep = N.new('ShaderNodeSeparateXYZ'); L.new(tc.outputs['Object'], sep.inputs[0])
    X, Y, Z = sep.outputs['X'], sep.outputs['Y'], sep.outputs['Z']
    no = N.new('ShaderNodeTexNoise'); no.inputs['Scale'].default_value = 2.2; no.inputs['Detail'].default_value = 8.0; no.inputs['Roughness'].default_value = 0.62; no.inputs['Distortion'].default_value = 0.6
    L.new(tc.outputs['Object'], no.inputs['Vector'])
    # panache : dense près de la roue (coin avant-bas de la boîte), plus diffus en arrière et en hauteur
    dx = math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', X, 1.35 * scale), 3.4 * scale)
    dz = math_node(nt, 'DIVIDE', math_node(nt, 'ADD', Z, 0.62 * scale), 1.6 * scale)
    dy = math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', Y, 0.6 * scale), 2.6 * scale)
    plume = math_node(nt, 'EXPONENT', math_node(nt, 'MULTIPLY', math_node(nt, 'ADD', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', math_node(nt, 'ABSOLUTE', dx), 1.6), math_node(nt, 'MULTIPLY', dz, 2.2)), math_node(nt, 'MULTIPLY', math_node(nt, 'ABSOLUTE', dy), 2.0)), -1.0))
    dens = math_node(nt, 'MULTIPLY', math_node(nt, 'MAXIMUM', math_node(nt, 'SUBTRACT', no.outputs['Fac'], 0.38), 0.0), plume)
    L.new(math_node(nt, 'MULTIPLY', dens, 14.0 * k), pv.inputs['Density'])
    L.new(pv.outputs[0], out.inputs['Volume'])
    ob.data.materials.append(m)
    return ob
