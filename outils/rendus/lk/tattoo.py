# Tatouages : l'encre sous une vraie peau (avant-bras, mollet, dos, nuque, crâne rasé), dans un salon de tatouage la nuit
# (accoudoir de cuir noir, dermographe, godets d'encre, néon rose flou). Motifs traditionnels passés à l'encre (tex/tat-*-ink.png).
import bpy, bmesh, math, random, os
from mathutils import Vector
from .core import *
from . import hair as H

TEX = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'tex')
SKIN = [(0.56, 0.39, 0.3), (0.45, 0.3, 0.21), (0.33, 0.21, 0.13), (0.2, 0.12, 0.075), (0.1, 0.06, 0.038)]

def skin_ink(tone=1, decals=(), name='peau'):
    """peau (diffusion sous la surface, pores) + décalcomanies d'encre projetées dans l'espace de l'objet
    decals : [(fichier, centre (x, y, z), taille (sx, sy), rotation z, axe de projection 'Z'|'Y'|'X', opacité)]"""
    c = SKIN[tone]
    def fn(nt, p):
        v = tex_coord(nt, 'Object', 1.0); n = noise(nt, v, 40, 4, 0.5); n2 = noise(nt, v, 300, 3, 0.6); n3 = noise(nt, v, 9, 3, 0.5)
        base = ramp(nt, math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', n.outputs['Fac'], 0.7), math_node(nt, 'MULTIPLY', n2.outputs['Fac'], 0.3)),
                    [(0.3, tuple(x * 0.9 for x in c)), (0.55, c), (0.75, tuple(min(1, x * 1.06) for x in c))])
        red = ramp(nt, n3.outputs['Fac'], [(0.45, (1.0, 1.0, 1.0)), (0.75, (1.0, 0.86, 0.84))])
        base = mix(nt, base, red, 1.0, 'MULTIPLY')
        cur = base
        for (img, ctr, size, rot, axis, op) in decals:
            tc = nt.nodes.new('ShaderNodeTexCoord')
            sub = nt.nodes.new('ShaderNodeVectorMath'); sub.operation = 'SUBTRACT'; sub.inputs[1].default_value = ctr
            nt.links.new(tc.outputs['Object'], sub.inputs[0])
            sep = nt.nodes.new('ShaderNodeSeparateXYZ'); nt.links.new(sub.outputs['Vector'], sep.inputs[0])
            u_, v_ = {'Z': ('X', 'Y'), 'Y': ('X', 'Z'), 'X': ('Y', 'Z')}[axis]
            u0, v0 = sep.outputs[u_], sep.outputs[v_]
            cr, sr = math.cos(rot), math.sin(rot)
            u1 = math_node(nt, 'SUBTRACT', math_node(nt, 'MULTIPLY', u0, cr), math_node(nt, 'MULTIPLY', v0, sr))
            v1 = math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', u0, sr), math_node(nt, 'MULTIPLY', v0, cr))
            uu = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', u1, size[0]), 0.5); vv = math_node(nt, 'ADD', math_node(nt, 'DIVIDE', v1, size[1]), 0.5)
            comb = nt.nodes.new('ShaderNodeCombineXYZ'); nt.links.new(uu, comb.inputs[0]); nt.links.new(vv, comb.inputs[1])
            it = nt.nodes.new('ShaderNodeTexImage'); it.image = bpy.data.images.load(os.path.join(TEX, img), check_existing=True); it.extension = 'CLIP'; it.interpolation = 'Cubic'
            nt.links.new(comb.outputs[0], it.inputs['Vector'])
            inked = mix(nt, cur, it.outputs['Color'], 1.0, 'MULTIPLY')
            inked2 = mix(nt, inked, (0.0, 0.0, 0.0), 0.12)
            fac = math_node(nt, 'MULTIPLY', it.outputs['Alpha'], op)
            m2 = nt.nodes.new('ShaderNodeMix'); m2.data_type = 'RGBA'; nt.links.new(fac, m2.inputs[0]); nt.links.new(cur, m2.inputs[6]); nt.links.new(inked2, m2.inputs[7])
            cur = m2.outputs[2]
        nt.links.new(cur, p.inputs['Base Color'])
    def bfn(nt, vec):
        a = voronoi(nt, vec, 1100, 'F1').outputs['Distance']; w = noise(nt, vec, 160, 6, 0.7).outputs['Fac']
        return math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', a, 0.6), math_node(nt, 'MULTIPLY', w, 0.4))
    return mat(name, c, 0.46, sss=0.5, sss_radius=(1.0, 0.4, 0.25), sss_scale=0.005, spec=0.45, coat=0.18, coat_rough=0.32, base_fn=fn, bump={'kind': bfn, 'strength': 0.09})

def loft(name, sections, seg=64):
    """membre : sections elliptiques [(x, demi-largeur y, demi-épaisseur z, décalage z)]"""
    bm = bmesh.new(); rings = []
    for (x, ry, rz, dz) in sections:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg; ca, sa = math.cos(a), math.sin(a)
            bulge = 1 + 0.06 * max(0, sa) ** 2  # face supérieure un peu plus ronde (muscles)
            ring.append(bm.verts.new((x, ry * ca, dz + rz * sa * bulge)))
        rings.append(ring)
    for a_, b_ in zip(rings, rings[1:]):
        for i in range(seg): bm.faces.new((a_[i], a_[(i + 1) % seg], b_[(i + 1) % seg], b_[i]))
    for ring, flip in ((rings[0], True), (rings[-1], False)):
        ctr = bm.verts.new((ring[0].co.x, 0, sum(v.co.z for v in ring) / seg))
        for i in range(seg):
            f = (ring[i], ring[(i + 1) % seg], ctr); bm.faces.new(f if flip else f[::-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    ob = mesh_obj(name, bm); subsurf(ob, 1); return ob

def forearm(tone=1, decals=(), hairy=True, sleeve=False):
    """avant-bras posé, face interne vers le haut, du poignet (x=0) au coude (x=0.27)"""
    secs = [(-0.02, 0.028, 0.02, 0.0), (0.0, 0.03, 0.021, 0.0), (0.05, 0.034, 0.024, 0.001), (0.1, 0.038, 0.028, 0.003), (0.15, 0.043, 0.033, 0.005), (0.2, 0.046, 0.036, 0.006), (0.25, 0.045, 0.037, 0.006), (0.29, 0.043, 0.036, 0.005)]
    ob = loft('avantbras', secs); assign(ob, skin_ink(tone, decals))
    ob.location = (0, 0, 0.034)
    if hairy:
        strands = []; R = random.Random(5)
        for i in range(2600):
            x = R.uniform(0.0, 0.28); a = R.uniform(0.25, 2.9)
            ry = 0.03 + 0.016 * min(1, x / 0.2); rz = 0.021 + 0.015 * min(1, x / 0.2)
            p = Vector((x, ry * math.cos(a), 0.034 + 0.004 + rz * math.sin(a)))
            n_ = Vector((0, math.cos(a), math.sin(a))).normalized(); d = (Vector((-1, 0, 0)) * 0.8 + n_ * 0.35).normalized()
            L = R.uniform(0.004, 0.009); strands.append([p, p + d * L * 0.5 + n_ * 0.0006, p + d * L])
        H.hair_object('poils', strands, 0.75, 0.3, 0.35, (0.000022, 0.00001))
    return ob

def calf(tone=1, decals=()):
    secs = [(-0.02, 0.032, 0.03, 0.0), (0.0, 0.034, 0.032, 0.0), (0.08, 0.04, 0.038, 0.002), (0.16, 0.05, 0.05, 0.006), (0.24, 0.056, 0.058, 0.01), (0.31, 0.054, 0.054, 0.008), (0.37, 0.048, 0.048, 0.004)]
    ob = loft('mollet', secs); assign(ob, skin_ink(tone, decals)); ob.location = (0, 0, 0.05)
    return ob

def parlor(hd='neon_photostudio', bz=0.0):
    """salon de tatouage le soir : photo HDRI (néons rouge et bleu) floue au fond, accoudoir de cuir noir, film de protection"""
    from . import assets as A
    A.hdri(hd, 0.35, res='2k', cam_hdri_k=0.5, rot=200)
    bpy.context.scene.view_settings.exposure = -0.4
    arm = box('accoudoir', (1.4, 0.36, 0.06), (0.1, 0.0, bz - 0.03), 0.02)
    assign(arm, A.pbr('fabric_leather_02', 3.0, coords='Object', tint=(0.12, 0.11, 0.11), rough_mul=0.8, coat=0.2, coat_rough=0.3))
    film = grid('film', 0.5, 0.3, 4, 4); film.location = (0.14, 0, bz + 0.0005); assign(film, mat('papier', (0.85, 0.85, 0.86), 0.5, sss=0.2))
    table = box('table', (3, 2, 0.04), (0, 0, bz - 0.32)); assign(table, A.pbr('dark_wood', 2.0, coords='Object'))
    area('lampe', (0.0, -0.3, 0.55), (0.12, 0, 0.03), 0.4, 6, (1.0, 0.9, 0.8))
    area('contre_rose', (-0.4, 0.45, 0.2), (0.12, 0, 0.03), 0.3, 3.0, (1.0, 0.3, 0.45))
    area('contre_bleu', (0.6, 0.4, 0.2), (0.12, 0, 0.03), 0.3, 2.2, (0.35, 0.55, 1.0))
    area('debouchage', (0.45, -0.6, 0.15), (0.12, 0, 0.03), 0.6, 0.8, (0.8, 0.85, 1.0))

def tattoo_pen(loc=(0.0, 0.0, 0.0), rot=0.0):
    root = empty('dermographe', loc, (0, 0, rot))
    body_ = lathe('corps', [(0.0, 0.0), (0.0035, 0.0), (0.009, 0.012), (0.012, 0.05), (0.013, 0.1), (0.012, 0.13), (0.008, 0.14), (0.0, 0.14)], 48)
    body_.rotation_euler = (0, math.pi / 2, 0); body_.location = (0, 0, 0.013); assign(body_, mat('alu', (0.06, 0.06, 0.07), 0.3, metal=1.0)); parent(body_, root)
    grip = cyl('prise', 0.0125, 0.05, 48, (0.04, 0, 0.013), (0, math.pi / 2, 0), 0.002); assign(grip, M_rubber((0.02, 0.02, 0.025))); parent(grip, root)
    cable = curve_tube('cable', [(0.14, 0, 0.013, 1), (0.2, 0.03, 0.006, 1), (0.28, 0.0, 0.005, 1), (0.36, 0.06, 0.005, 1)], 0.0025, 12); assign(cable, M_rubber()); parent(cable, root)
    return root

def ink_caps(loc=(0, 0, 0), colors=((0.02, 0.02, 0.02), (0.5, 0.03, 0.04), (0.04, 0.3, 0.25))):
    root = empty('godets', loc)
    for i, c in enumerate(colors):
        cap = lathe('godet', [(0.0, 0.0), (0.006, 0.0), (0.0075, 0.012), (0.0068, 0.012), (0.0055, 0.002), (0.0, 0.002)], 32); cap.location = (i * 0.018, (i % 2) * 0.008, 0); assign(cap, M_plastic((0.85, 0.85, 0.85), 0.3)); parent(cap, root)
        ink = cyl('encre', 0.006, 0.002, 32, (i * 0.018, (i % 2) * 0.008, 0.009)); assign(ink, mat('encre', c, 0.05, coat=1.0)); parent(ink, root)
    return root

def arm_cam(target=(0.14, 0.0, 0.06), az=-62, el=40, dist=0.42, lens=85, fstop=3.5):
    a = math.radians(az); e = math.radians(el)
    pos = (target[0] + math.cos(a) * math.cos(e) * dist * -1 * 0 + math.sin(a) * math.cos(e) * dist, target[1] - math.cos(a) * math.cos(e) * dist, target[2] + math.sin(e) * dist)
    return cam(pos, target, lens, fstop)

# ------------------------------------------------------------------ registre
def motif(img, size=0.1, ctr=0.14, rot=0.0, tone=1, extra=None):
    def b():
        parlor(); dec = [(img, (ctr, 0.0, 0.0), (size, size * 0.75), rot + math.pi / 2, 'Z', 0.95)]
        forearm(tone, dec); tattoo_pen((0.02, 0.11, 0.0), 0.35); ink_caps((0.25, 0.12, 0.0))
        if extra: extra()
        arm_cam()
    return b

def removal():
    parlor()
    dec = [('tat-skull-ink.png', (0.15, 0.0, 0.0), (0.085, 0.064), math.pi / 2, 'Z', 0.45)]
    forearm(1, dec)
    # pièce à main du laser : corps blanc, embout, faisceau vert et point d'impact
    root = empty('laser', (0.15, -0.02, 0.16), (0, math.radians(35), math.radians(20)))
    bodyl = cyl('pièce', 0.016, 0.16, 48, (0, 0, 0.0), (0, 0, 0), 0.004); assign(bodyl, M_plastic((0.85, 0.86, 0.88), 0.25)); parent(bodyl, root)
    tip = cyl('embout', 0.009, 0.03, 32, (0, 0, -0.095), (0, 0, 0), 0.002); assign(tip, M_chrome(0.15)); parent(tip, root)
    ring = cyl('bague', 0.0165, 0.012, 48, (0, 0, -0.06), (0, 0, 0)); assign(ring, emission('led', (0.2, 1.0, 0.6), 6)); parent(ring, root)
    beam = cyl('faisceau', 0.0018, 0.11, 16, (0, 0, -0.16), (0, 0, 0)); assign(beam, emission('rayon', (0.3, 1.0, 0.5), 18)); beam.visible_shadow = False; parent(beam, root)
    spot = sphere('impact', 0.004, (0.14, 0.0, 0.058)); assign(spot, emission('impact', (0.6, 1.0, 0.7), 30))
    point('lueur', (0.14, 0.0, 0.07), 0.02, (0.4, 1.0, 0.6), 0.01)
    arm_cam()

def zone_arm(side='g'):
    def b():
        parlor()
        dec = [('tat-dagger-ink.png', (0.06, 0.0, 0.0), (0.075, 0.056), math.pi / 2 + 0.2, 'Z', 0.95), ('tat-flowers-ink.png', (0.15, 0.0, 0.0), (0.09, 0.068), math.pi / 2 - 0.1, 'Z', 0.95), ('tat-eye-ink.png', (0.235, 0.0, 0.0), (0.075, 0.056), math.pi / 2, 'Z', 0.9)]
        a = forearm(1 if side == 'g' else 2, dec)
        if side == 'd': a.scale = (1, -1, 1)
        arm_cam((0.15, 0.0, 0.05), -62 if side == 'g' else -118, 36)
    return b

def zone_leg():
    parlor()
    dec = [('tat-hood-ink.png', (0.24, 0.0, 0.0), (0.12, 0.09), math.pi / 2, 'Z', 0.95), ('tat-crown-ink.png', (0.1, 0.0, 0.0), (0.075, 0.056), math.pi / 2, 'Z', 0.9)]
    calf(2, dec); arm_cam((0.16, 0.0, 0.07), -60, 34, 0.75)

def zone_head():
    H.barber(); root, head = H.bust(1, (0.02, 0.02, 0.025))
    m = skin_ink(1, [('tat-skull-ink.png', (-0.01, 0.0, 0.05), (0.075, 0.056), 0.0, 'Y', 0.9)])
    assign(head, m)
    H.hair_object('ras', H.S_short(head, lambda p: 0.0006, 30000, 0.004, 4), 0.85, 0.2)
    cam((-0.05, -0.62, 0.12), (-0.01, 0, 0.02), 85, 7.1)

def zone_neck(vi=False):
    def b():
        H.barber(); root, head = H.bust(2 if vi else 4, (0.02, 0.02, 0.025))
        neck = [o for o in bpy.data.objects if o.name.startswith('cou')][0]
        img = 'tat-palm-ink.png' if vi else 'tat-heart-ink.png'
        assign(neck, skin_ink(2 if vi else 4, [(img, (0.0, 0.0, -0.075), (0.06, 0.045), 0.0, 'Y', 0.95)]))
        H.hair_object('cheveux', H.S_short(head, H.fade_len(0.012), 60000, 0.0025, 3, Vector((-0.25, 0, 0))), 0.95, 0.1)
        cam((0.12, -0.62, -0.06), (0.0, 0, -0.07), 85, 6.3)
    return b

def zone_back(vi=False):
    def b():
        H.barber(); root, head = H.bust(2 if vi else 1, (0.0, 0.0, 0.0), collar=False)
        torso = [o for o in bpy.data.objects if o.name.startswith('torse')][0]
        img = 'tat-palm-ink.png' if vi else 'tat-dragon-ink.png'
        assign(torso, skin_ink(2 if vi else 1, [(img, (0.0, 0.0, -0.25), (-0.22, 0.165), 0.0, 'X', 0.95)]))
        H.hair_object('cheveux', H.S_short(head, H.fade_len(0.015), 60000, 0.0025, 3, Vector((-0.25, 0, 0))), 0.8 if vi else 0.7, 0.3)
        cam((-1.1, -0.35, -0.05), (-0.03, 0, -0.2), 70, 7.1)
    return b

ITEMS = {
    'vice-city-style-tatouages': motif('tat-palm-ink.png', 0.105, 0.14, 0.0, 2),
    'gta5-smiley': motif('tat-smiley-ink.png', 0.085, 0.14, 0.0, 1),
    'gta5-dague': motif('tat-dagger-ink.png', 0.1, 0.14, 0.0, 1),
    'gta5-eye-catcher': motif('tat-eye-ink.png', 0.1, 0.14, 0.0, 3),
    'gta5-dope-skull': motif('tat-skull-ink.png', 0.095, 0.14, 0.0, 2),
    'gta5-fresque-florale': motif('tat-flowers-ink.png', 0.11, 0.14, 0.0, 0),
    'gta5-dragon-chinois': motif('tat-dragon-ink.png', 0.12, 0.15, 0.0, 1),
    'gta5-families-kings': motif('tat-crown-ink.png', 0.09, 0.14, 0.0, 4),
    'gta5-family-is-forever': motif('tat-heart-ink.png', 0.105, 0.14, 0.0, 3),
    'gta5-chamberlain': motif('tat-hood-ink.png', 0.11, 0.14, 0.0, 4),
    'gta5-retrait': removal,
    'gta5-zone-bras-gauche': zone_arm('g'),
    'gta5-zone-bras-droit': zone_arm('d'),
    'gta5-zone-jambes': zone_leg,
    'gta5-zone-tete': zone_head,
    'zone-visage-cou': zone_neck(True),
    'zone-torse-gta6': zone_back(True),
    'gta5-zone-torse': zone_back(False),
}
